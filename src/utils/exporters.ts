import * as THREE from 'three';
import { Frame, Layer, Voxel } from '../types/sprite';
import { mapBlendModeToCompositeOperation } from './blendModes';

// Helper to trigger browser file download
export function downloadFile(content: Blob | string, filename: string, mimeType: string) {
  const blob = typeof content === 'string' ? new Blob([content], { type: mimeType }) : content;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Composite layers for a frame into an offscreen canvas
export function renderFrameToCanvas(
  frame: Frame,
  width: number,
  height: number,
  scale: number = 1,
  backgroundColor: string | null = null
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  if (backgroundColor) {
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  // Draw each visible layer bottom to top with proper blend mode compositing
  let renderedCount = 0;
  for (const layer of frame.layers) {
    if (!layer.visible || layer.opacity <= 0) continue;

    const layerCanvas = document.createElement('canvas');
    layerCanvas.width = width * scale;
    layerCanvas.height = height * scale;
    const lCtx = layerCanvas.getContext('2d');
    if (!lCtx) continue;
    lCtx.imageSmoothingEnabled = false;

    let hasPixels = false;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const color = layer.pixels[y * width + x];
        if (color && color.trim() !== '') {
          hasPixels = true;
          lCtx.fillStyle = color;
          lCtx.fillRect(x * scale, y * scale, scale, scale);
        }
      }
    }
    if (!hasPixels) continue;

    ctx.save();
    ctx.globalAlpha = typeof layer.opacity === 'number' ? Math.max(0, Math.min(1, layer.opacity)) : 1.0;
    const compositeOp = (renderedCount === 0 || !layer.blendMode)
      ? 'source-over'
      : mapBlendModeToCompositeOperation(layer.blendMode);
    ctx.globalCompositeOperation = compositeOp;
    ctx.drawImage(layerCanvas, 0, 0);
    ctx.restore();
    renderedCount++;
  }

  return canvas;
}

// Generate Sprite Sheet (Grid or Horizontal Strip)
export function renderSpriteSheetToCanvas(
  frames: Frame[],
  width: number,
  height: number,
  scale: number = 1,
  layout: 'horizontal' | 'grid' = 'horizontal',
  columns: number = 4,
  backgroundColor: string | null = null
): HTMLCanvasElement {
  const count = frames.length;
  if (count === 0) {
    return document.createElement('canvas');
  }

  const cols = layout === 'horizontal' ? count : Math.min(count, Math.max(1, columns));
  const rows = layout === 'horizontal' ? 1 : Math.ceil(count / cols);

  const canvas = document.createElement('canvas');
  canvas.width = cols * width * scale;
  canvas.height = rows * height * scale;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  if (backgroundColor) {
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  frames.forEach((frame, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    const frameCanvas = renderFrameToCanvas(frame, width, height, scale, null);
    ctx.drawImage(frameCanvas, col * width * scale, row * height * scale);
  });

  return canvas;
}

// Voxel helper: convert voxels array to spatial map
export function createVoxelMap(voxels: Voxel[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const v of voxels) {
    map.set(`${v.x},${v.y},${v.z}`, v.color);
  }
  return map;
}

// -------------------------------------------------------------
// OBJ EXPORTER with Face Culling (Culls hidden internal faces!)
// -------------------------------------------------------------
export interface ObjExportResult {
  obj: string;
  mtl: string;
}

export function generateOBJ(voxels: Voxel[], assetName: string = 'SpriteAsset'): ObjExportResult {
  const voxelMap = createVoxelMap(voxels);
  const colorToMatName = new Map<string, string>();
  const materials: { name: string; hex: string }[] = [];

  let matCounter = 1;
  const getMatName = (hex: string) => {
    if (!colorToMatName.has(hex)) {
      const name = `Mat_${matCounter++}_${hex.replace('#', '')}`;
      colorToMatName.set(hex, name);
      materials.push({ name, hex });
    }
    return colorToMatName.get(hex)!;
  };

  const facesDefinitions: {
    dir: [number, number, number]; // normal direction
    verts: [number, number, number][]; // 4 vertices
    norm: [number, number, number];
  }[] = [
    // Front (+Z)
    {
      dir: [0, 0, 1],
      verts: [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]],
      norm: [0, 0, 1]
    },
    // Back (-Z)
    {
      dir: [0, 0, -1],
      verts: [[1, 0, 0], [0, 0, 0], [0, 1, 0], [1, 1, 0]],
      norm: [0, 0, -1]
    },
    // Right (+X)
    {
      dir: [1, 0, 0],
      verts: [[1, 0, 1], [1, 0, 0], [1, 1, 0], [1, 1, 1]],
      norm: [1, 0, 0]
    },
    // Left (-X)
    {
      dir: [-1, 0, 0],
      verts: [[0, 0, 0], [0, 0, 1], [0, 1, 1], [0, 1, 0]],
      norm: [-1, 0, 0]
    },
    // Top (+Y)
    {
      dir: [0, 1, 0],
      verts: [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]],
      norm: [0, 1, 0]
    },
    // Bottom (-Y)
    {
      dir: [0, -1, 0],
      verts: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]],
      norm: [0, -1, 0]
    }
  ];

  // Find center of voxels for centered pivot
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  let minZ = Infinity, maxZ = -Infinity;

  if (voxels.length === 0) {
    minX = maxX = minY = maxY = minZ = maxZ = 0;
  } else {
    for (const v of voxels) {
      if (v.x < minX) minX = v.x;
      if (v.x > maxX) maxX = v.x;
      if (v.y < minY) minY = v.y;
      if (v.y > maxY) maxY = v.y;
      if (v.z < minZ) minZ = v.z;
      if (v.z > maxZ) maxZ = v.z;
    }
  }

  const centerX = (minX + maxX + 1) / 2;
  const centerY = minY; // Pivot at bottom-center so object sits flush on ground!
  const centerZ = (minZ + maxZ + 1) / 2;

  let vertexIndex = 1;
  const verticesStr: string[] = [];
  const normalsStr: string[] = [
    'vn 0.0 0.0 1.0',
    'vn 0.0 0.0 -1.0',
    'vn 1.0 0.0 0.0',
    'vn -1.0 0.0 0.0',
    'vn 0.0 1.0 0.0',
    'vn 0.0 -1.0 0.0'
  ];

  const objLines: string[] = [
    `# SpriteForge 3D OBJ Exporter`,
    `# Created for Game Engines (Unity, Unreal, Godot, Blender)`,
    `mtllib ${assetName}.mtl`,
    `o ${assetName}`
  ];

  // Group faces by material
  const materialFaces = new Map<string, string[]>();

  for (const voxel of voxels) {
    const matName = getMatName(voxel.color);
    if (!materialFaces.has(matName)) {
      materialFaces.set(matName, []);
    }
    const faceList = materialFaces.get(matName)!;

    for (let f = 0; f < facesDefinitions.length; f++) {
      const faceDef = facesDefinitions[f];
      const neighborKey = `${voxel.x + faceDef.dir[0]},${voxel.y + faceDef.dir[1]},${voxel.z + faceDef.dir[2]}`;
      
      // Face culling: if neighbor voxel exists, skip this face!
      if (voxelMap.has(neighborKey)) continue;

      // Add 4 vertices
      const vIndices: number[] = [];
      for (const [vx, vy, vz] of faceDef.verts) {
        const px = (voxel.x + vx - centerX) * 0.1;
        const py = (voxel.y + vy - centerY) * 0.1;
        const pz = (voxel.z + vz - centerZ) * 0.1;
        verticesStr.push(`v ${px.toFixed(4)} ${py.toFixed(4)} ${pz.toFixed(4)}`);
        vIndices.push(vertexIndex++);
      }

      const normalIdx = f + 1;
      // In OBJ, face indices are 1-based: f v1//vn v2//vn v3//vn v4//vn
      faceList.push(`f ${vIndices[0]}//${normalIdx} ${vIndices[1]}//${normalIdx} ${vIndices[2]}//${normalIdx} ${vIndices[3]}//${normalIdx}`);
    }
  }

  // Combine OBJ lines
  objLines.push(...verticesStr);
  objLines.push(...normalsStr);

  for (const [matName, faces] of materialFaces.entries()) {
    objLines.push(`usemtl ${matName}`);
    objLines.push(...faces);
  }

  // Generate MTL file
  const mtlLines: string[] = [
    `# SpriteForge Material Library`,
    `# Standard Diffuse / Specular Colors`
  ];

  for (const mat of materials) {
    const color = new THREE.Color(mat.hex);
    mtlLines.push(`newmtl ${mat.name}`);
    mtlLines.push(`Ka 0.2000 0.2000 0.2000`);
    mtlLines.push(`Kd ${color.r.toFixed(4)} ${color.g.toFixed(4)} ${color.b.toFixed(4)}`);
    mtlLines.push(`Ks 0.1000 0.1000 0.1000`);
    mtlLines.push(`Ns 32.0000`);
    mtlLines.push(`d 1.0000`);
    mtlLines.push(`illum 2`);
    mtlLines.push('');
  }

  return {
    obj: objLines.join('\n'),
    mtl: mtlLines.join('\n')
  };
}

// -------------------------------------------------------------
// ASCII FBX 7.4 EXPORTER
// Standard FBX format compatible with Unity, Unreal Engine, Blender, Godot
// -------------------------------------------------------------
export function generateFBX(voxels: Voxel[], assetName: string = 'SpriteAsset'): string {
  const voxelMap = createVoxelMap(voxels);

  // Calculate bounding box and pivot
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  let minZ = Infinity, maxZ = -Infinity;

  if (voxels.length === 0) {
    minX = maxX = minY = maxY = minZ = maxZ = 0;
  } else {
    for (const v of voxels) {
      if (v.x < minX) minX = v.x;
      if (v.x > maxX) maxX = v.x;
      if (v.y < minY) minY = v.y;
      if (v.y > maxY) maxY = v.y;
      if (v.z < minZ) minZ = v.z;
      if (v.z > maxZ) maxZ = v.z;
    }
  }

  const centerX = (minX + maxX + 1) / 2;
  const centerY = minY;
  const centerZ = (minZ + maxZ + 1) / 2;

  const vertices: number[] = [];
  const polygonVertexIndices: number[] = [];
  const normals: number[] = [];
  const colors: number[] = []; // RGBA per vertex

  const faces = [
    // Front (+Z)
    {
      dir: [0, 0, 1],
      verts: [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]],
      norm: [0, 0, 1]
    },
    // Back (-Z)
    {
      dir: [0, 0, -1],
      verts: [[1, 0, 0], [0, 0, 0], [0, 1, 0], [1, 1, 0]],
      norm: [0, 0, -1]
    },
    // Right (+X)
    {
      dir: [1, 0, 0],
      verts: [[1, 0, 1], [1, 0, 0], [1, 1, 0], [1, 1, 1]],
      norm: [1, 0, 0]
    },
    // Left (-X)
    {
      dir: [-1, 0, 0],
      verts: [[0, 0, 0], [0, 0, 1], [0, 1, 1], [0, 1, 0]],
      norm: [-1, 0, 0]
    },
    // Top (+Y)
    {
      dir: [0, 1, 0],
      verts: [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]],
      norm: [0, 1, 0]
    },
    // Bottom (-Y)
    {
      dir: [0, -1, 0],
      verts: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]],
      norm: [0, -1, 0]
    }
  ];

  let vCount = 0;

  for (const voxel of voxels) {
    const c = new THREE.Color(voxel.color);

    for (const f of faces) {
      const neighborKey = `${voxel.x + f.dir[0]},${voxel.y + f.dir[1]},${voxel.z + f.dir[2]}`;
      if (voxelMap.has(neighborKey)) continue; // Cull face

      const startIdx = vCount;
      // Add 4 vertices for quad face
      for (let i = 0; i < 4; i++) {
        const [vx, vy, vz] = f.verts[i];
        // Unity/Unreal scale: 1 voxel = 10cm (0.1m)
        vertices.push(
          Number(((voxel.x + vx - centerX) * 0.1).toFixed(4)),
          Number(((voxel.y + vy - centerY) * 0.1).toFixed(4)),
          Number(((voxel.z + vz - centerZ) * 0.1).toFixed(4))
        );
        normals.push(f.norm[0], f.norm[1], f.norm[2]);
        colors.push(
          Number(c.r.toFixed(4)), 
          Number(c.g.toFixed(4)), 
          Number(c.b.toFixed(4)), 
          1.0
        );
      }

      // In FBX: quad polygon indices are [v0, v1, v2, ^v3] where ^v3 is (-v3 - 1)
      polygonVertexIndices.push(startIdx, startIdx + 1, startIdx + 2, -(startIdx + 3) - 1);
      vCount += 4;
    }
  }

  const modelId = 10000001;
  const geomId = 20000001;
  const matId = 30000001;

  // Format array chunks for readable FBX text output
  const formatArray = (arr: number[]) => {
    return arr.join(',');
  };

  const fbxContent = `; FBX 7.4.0 project file
; Created by SpriteForge 2D & 3D Game Asset Studio
; Compatible with Unity, Unreal Engine, Godot, Blender

FBXHeaderExtension:  {
\tFBXHeaderVersion: 1003
\tFBXVersion: 7400
\tCreator: "SpriteForge Studio"
}

GlobalSettings:  {
\tVersion: 1000
\tProperties70:  {
\t\tP: "UpAxis", "int", "Integer", "",1
\t\tP: "UpAxisSign", "int", "Integer", "",1
\t\tP: "FrontAxis", "int", "Integer", "",2
\t\tP: "FrontAxisSign", "int", "Integer", "",1
\t\tP: "CoordAxis", "int", "Integer", "",0
\t\tP: "CoordAxisSign", "int", "Integer", "",1
\t\tP: "UnitScaleFactor", "double", "Number", "",100.0
\t}
}

Documents:  {
\tCount: 1
\tDocument: 10000000, "", "Scene" {
\t\tProperties70:  {
\t\t\tP: "SourceObject", "object", "", ""
\t\t}
\t\tRootNode: 0
\t}
}

Definitions:  {
\tVersion: 100
\tCount: 4
\tObjectType: "GlobalSettings" {
\t\tCount: 1
\t}
\tObjectType: "Model" {
\t\tCount: 1
\t}
\tObjectType: "Geometry" {
\t\tCount: 1
\t}
\tObjectType: "Material" {
\t\tCount: 1
\t}
}

Objects:  {
\tGeometry: ${geomId}, "Geometry::${assetName}_geo", "Mesh" {
\t\tVertices: *${vertices.length} {
\t\t\ta: ${formatArray(vertices)}
\t\t}
\t\tPolygonVertexIndex: *${polygonVertexIndices.length} {
\t\t\ta: ${formatArray(polygonVertexIndices)}
\t\t}
\t\tGeometryVersion: 124
\t\tLayerElementNormal: 0 {
\t\t\tVersion: 101
\t\t\tName: ""
\t\t\tMappingInformationType: "ByPolygonVertex"
\t\t\tReferenceInformationType: "Direct"
\t\t\tNormals: *${normals.length} {
\t\t\t\ta: ${formatArray(normals)}
\t\t\t}
\t\t}
\t\tLayerElementColor: 0 {
\t\t\tVersion: 101
\t\t\tName: "Col"
\t\t\tMappingInformationType: "ByPolygonVertex"
\t\t\tReferenceInformationType: "Direct"
\t\t\tColors: *${colors.length} {
\t\t\t\ta: ${formatArray(colors)}
\t\t\t}
\t\t}
\t\tLayer: 0 {
\t\t\tVersion: 100
\t\t\tLayerElement:  {
\t\t\t\tType: "LayerElementNormal"
\t\t\t\tTypedIndex: 0
\t\t\t}
\t\t\tLayerElement:  {
\t\t\t\tType: "LayerElementColor"
\t\t\t\tTypedIndex: 0
\t\t\t}
\t\t}
\t}

\tModel: ${modelId}, "Model::${assetName}", "Mesh" {
\t\tVersion: 232
\t\tProperties70:  {
\t\t\tP: "ScalingMax", "Vector3D", "Vector", "",0,0,0
\t\t\tP: "DefaultAttributeIndex", "int", "Integer", "",0
\t\t\tP: "Lcl Translation", "Lcl Translation", "", "A",0,0,0
\t\t\tP: "Lcl Rotation", "Lcl Rotation", "", "A",0,0,0
\t\t\tP: "Lcl Scaling", "Lcl Scaling", "", "A",1,1,1
\t\t}
\t\tShading: T
\t\tCulling: "CullingOff"
\t}

\tMaterial: ${matId}, "Material::${assetName}_mat", "" {
\t\tVersion: 102
\t\tShadingModel: "phong"
\t\tMultiLayer: 0
\t\tProperties70:  {
\t\t\tP: "DiffuseColor", "Color", "", "A",0.8,0.8,0.8
\t\t\tP: "AmbientColor", "Color", "", "A",0.2,0.2,0.2
\t\t\tP: "SpecularColor", "Color", "", "A",0.2,0.2,0.2
\t\t\tP: "Shininess", "double", "Number", "",20
\t\t}
\t}
}

Connections:  {
\tC: "OO", ${geomId}, ${modelId}
\tC: "OO", ${matId}, ${modelId}
\tC: "OO", ${modelId}, 0
}
`;

  return fbxContent;
}

// -------------------------------------------------------------
// 3D Turntable / 8-Directional Sprite Sheet Renderer
// Game devs love rendering their 3D models into 8-directional 2D sprite sheets!
// -------------------------------------------------------------
export async function render3DTo8DirectionalSpriteSheet(
  voxels: Voxel[],
  frameResolution: number = 64,
  isometric: boolean = false
): Promise<HTMLCanvasElement> {
  const canvas = document.createElement('canvas');
  canvas.width = frameResolution * 8;
  canvas.height = frameResolution;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  if (voxels.length === 0) {
    return canvas;
  }

  // Set up offscreen WebGL scene
  const offscreenCanvas = document.createElement('canvas');
  offscreenCanvas.width = frameResolution;
  offscreenCanvas.height = frameResolution;

  const renderer = new THREE.WebGLRenderer({
    canvas: offscreenCanvas,
    alpha: true,
    antialias: false,
    preserveDrawingBuffer: true
  });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setSize(frameResolution, frameResolution);

  const scene = new THREE.Scene();

  // Setup voxel mesh
  const geom = new THREE.BoxGeometry(1, 1, 1);
  const material = new THREE.MeshStandardMaterial({
    roughness: 0.35,
    metalness: 0.1
  });

  const instancedMesh = new THREE.InstancedMesh(geom, material, voxels.length);
  const matrix = new THREE.Matrix4();
  const color = new THREE.Color();

  // Center calculation
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  let minZ = Infinity, maxZ = -Infinity;

  for (const v of voxels) {
    if (v.x < minX) minX = v.x;
    if (v.x > maxX) maxX = v.x;
    if (v.y < minY) minY = v.y;
    if (v.y > maxY) maxY = v.y;
    if (v.z < minZ) minZ = v.z;
    if (v.z > maxZ) maxZ = v.z;
  }

  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const cz = (minZ + maxZ) / 2;
  const size = Math.max(maxX - minX + 1, maxY - minY + 1, maxZ - minZ + 1, 4);

  voxels.forEach((v, i) => {
    matrix.setPosition(v.x - cx, v.y - cy, v.z - cz);
    instancedMesh.setMatrixAt(i, matrix);
    color.set(v.color);
    instancedMesh.setColorAt(i, color);
  });
  instancedMesh.instanceMatrix.needsUpdate = true;
  if (instancedMesh.instanceColor) instancedMesh.instanceColor.needsUpdate = true;
  scene.add(instancedMesh);

  // Lighting
  const keyLight = new THREE.DirectionalLight(0xfff3e0, 2.4);
  keyLight.position.set(15, 25, 20);
  scene.add(keyLight);

  const fillLight = new THREE.HemisphereLight(0x93c5fd, 0x334155, 1.6);
  scene.add(fillLight);

  // Orthographic camera for clean sprite look
  const frustum = size * 1.4;
  const camera = new THREE.OrthographicCamera(
    -frustum / 2, frustum / 2,
    frustum / 2, -frustum / 2,
    0.1, 200
  );

  const elevationAngle = isometric ? Math.PI / 6 : Math.PI / 12; // 30 deg or 15 deg
  const distance = 40;

  // 8 directions (0 to 7) around Y axis: 0°, 45°, 90°, 135°, 180°, 225°, 270°, 315°
  for (let i = 0; i < 8; i++) {
    const yaw = (i * Math.PI) / 4;
    const x = Math.sin(yaw) * Math.cos(elevationAngle) * distance;
    const y = Math.sin(elevationAngle) * distance;
    const z = Math.cos(yaw) * Math.cos(elevationAngle) * distance;

    camera.position.set(x, y, z);
    camera.lookAt(0, 0, 0);

    renderer.render(scene, camera);
    ctx.drawImage(offscreenCanvas, i * frameResolution, 0);
  }

  // Cleanup WebGL
  geom.dispose();
  material.dispose();
  renderer.dispose();

  return canvas;
}
