import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { Voxel, VoxelToolType, ToolSettings } from '../types/sprite';
import { 
  Plus, 
  Trash2, 
  Paintbrush, 
  Pipette, 
  RotateCw, 
  Layers, 
  Compass, 
  Sun,
  Eye,
  Minimize2,
  Box,
  Wand2,
  Camera
} from 'lucide-react';
import { CameraNavigator3D, ViewPreset } from './CameraNavigator3D';
import { useTouchGestures } from '../hooks/useTouchGestures';

interface ModelEditor3DProps {
  voxels: Voxel[];
  gridSize: number;
  activeColor: string;
  toolSettings: ToolSettings;
  onUpdateVoxels: (newVoxels: Voxel[]) => void;
  onColorPick: (color: string) => void;
  onExtrude2D: () => void;
}

export const ModelEditor3D: React.FC<ModelEditor3DProps> = ({
  voxels,
  gridSize,
  activeColor,
  toolSettings,
  onUpdateVoxels,
  onColorPick,
  onExtrude2D
}) => {
  const mountRef = useRef<HTMLDivElement>(null);

  // Tools
  const [activeVoxelTool, setActiveVoxelTool] = useState<VoxelToolType>('add');
  const [autoRotate, setAutoRotate] = useState<boolean>(false);
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [dockCollapsed, setDockCollapsed] = useState<boolean>(false);

  // Three.js internal references
  const threeRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    controls: OrbitControls;
    instancedMesh: THREE.InstancedMesh | null;
    gridHelper: THREE.GridHelper | null;
    ghostMesh: THREE.Mesh | null;
    raycaster: THREE.Raycaster;
    mouse: THREE.Vector2;
    plane: THREE.Mesh;
    isSoftwareGl: boolean;
    frameId: number;
    requestRender: () => void;
  } | null>(null);

  // Synchronize voxels state to mutable ref for pointer handlers
  const voxelsRef = useRef<Voxel[]>(voxels);
  useEffect(() => {
    voxelsRef.current = voxels;
  }, [voxels]);

  const activeColorRef = useRef<string>(activeColor);
  useEffect(() => {
    activeColorRef.current = activeColor;
  }, [activeColor]);

  const activeToolRef = useRef<VoxelToolType>(activeVoxelTool);
  useEffect(() => {
    activeToolRef.current = activeVoxelTool;
  }, [activeVoxelTool]);

  const toolSettingsRef = useRef<ToolSettings>(toolSettings);
  useEffect(() => {
    toolSettingsRef.current = toolSettings;
  }, [toolSettings]);

  // Three.js Scene Setup (Mount once)
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // Detect software WebGL per Three.js guidelines
    const isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x090d16);
    scene.fog = new THREE.Fog(0x090d16, 35, 90);

    const camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.1,
      200
    );
    camera.position.set(22, 18, 26);

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: true
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.appendChild(renderer.domElement);

    // OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.08;
    controls.target.set(0, 4, 0);
    controls.maxPolarAngle = Math.PI / 2 + 0.1; // Allow slight under-view but keep ground orientation
    controls.minDistance = 5;
    controls.maxDistance = 75;

    // RoomEnvironment Studio PMREM Reflection
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // 3-point Studio Lighting Rig
    const keyLight = new THREE.DirectionalLight(0xfffaed, 2.8);
    keyLight.position.set(15, 30, 20);
    keyLight.castShadow = !isSoftwareGl;
    if (keyLight.castShadow) {
      keyLight.shadow.mapSize.width = 1024;
      keyLight.shadow.mapSize.height = 1024;
      keyLight.shadow.camera.near = 1;
      keyLight.shadow.camera.far = 70;
      keyLight.shadow.bias = -0.0005;
      keyLight.shadow.normalBias = 0.02;
      const d = 20;
      keyLight.shadow.camera.left = -d;
      keyLight.shadow.camera.right = d;
      keyLight.shadow.camera.top = d;
      keyLight.shadow.camera.bottom = -d;
    }
    scene.add(keyLight);

    const fillLight = new THREE.HemisphereLight(0x93c5fd, 0x1e293b, 1.4);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 1.2);
    rimLight.position.set(-15, 12, -20);
    scene.add(rimLight);

    // Soft Contact Shadow Plane Grounding
    const shadowGeo = new THREE.PlaneGeometry(60, 60);
    const shadowMat = new THREE.ShadowMaterial({
      opacity: 0.35
    });
    const shadowPlane = new THREE.Mesh(shadowGeo, shadowMat);
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.position.y = -0.01;
    shadowPlane.receiveShadow = !isSoftwareGl;
    scene.add(shadowPlane);

    // Floor Grid Helper
    const gridHelper = new THREE.GridHelper(32, 32, 0x38bdf8, 0x1e293b);
    gridHelper.position.y = 0;
    scene.add(gridHelper);

    // Invisible Raycasting Ground Plane for placing initial voxels
    const planeGeo = new THREE.PlaneGeometry(100, 100);
    const planeMat = new THREE.MeshBasicMaterial({ visible: false });
    const groundHitPlane = new THREE.Mesh(planeGeo, planeMat);
    groundHitPlane.rotation.x = -Math.PI / 2;
    scene.add(groundHitPlane);

    // Ghost Preview Voxel (semi-transparent indicator)
    const ghostGeo = new THREE.BoxGeometry(1.02, 1.02, 1.02);
    const ghostMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.5,
      roughness: 0.2
    });
    const ghostMesh = new THREE.Mesh(ghostGeo, ghostMat);
    ghostMesh.visible = false;
    scene.add(ghostMesh);

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    // Render loop and requestRender helper
    let renderBusy = false;
    let renderDirty = false;
    let animFrameId = 0;

    const requestRender = () => {
      if (renderBusy) {
        renderDirty = true;
        return;
      }
      renderBusy = true;
      animFrameId = requestAnimationFrame(() => {
        renderDirty = false;
        controls.update();
        renderer.render(scene, camera);
        renderBusy = false;
        if (renderDirty) requestRender();
      });
    };

    controls.addEventListener('change', requestRender);

    threeRef.current = {
      scene,
      camera,
      renderer,
      controls,
      instancedMesh: null,
      gridHelper,
      ghostMesh,
      raycaster,
      mouse,
      plane: groundHitPlane,
      isSoftwareGl,
      frameId: animFrameId,
      requestRender
    };

    // Auto-rotate tick loop
    let tickId = 0;
    const tick = () => {
      if (autoRotate && threeRef.current) {
        threeRef.current.controls.autoRotate = true;
        threeRef.current.controls.autoRotateSpeed = 2.0;
        threeRef.current.requestRender();
      } else if (threeRef.current && threeRef.current.controls.autoRotate) {
        threeRef.current.controls.autoRotate = false;
      }
      tickId = requestAnimationFrame(tick);
    };
    tickId = requestAnimationFrame(tick);

    // Handle Window Resize
    const handleResize = () => {
      if (!container || !threeRef.current) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      threeRef.current.requestRender();
    };

    window.addEventListener('resize', handleResize);
    requestRender();

    return () => {
      cancelAnimationFrame(animFrameId);
      cancelAnimationFrame(tickId);
      window.removeEventListener('resize', handleResize);
      controls.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Sync autoRotate state with controls
  useEffect(() => {
    if (threeRef.current) {
      threeRef.current.controls.autoRotate = autoRotate;
      threeRef.current.requestRender();
    }
  }, [autoRotate]);

  // Sync showGrid state
  useEffect(() => {
    if (threeRef.current?.gridHelper) {
      threeRef.current.gridHelper.visible = showGrid;
      threeRef.current.requestRender();
    }
  }, [showGrid]);

  // Update Voxel InstancedMesh whenever voxels change
  useEffect(() => {
    if (!threeRef.current) return;
    const { scene, requestRender } = threeRef.current;

    // Remove existing instanced mesh
    if (threeRef.current.instancedMesh) {
      scene.remove(threeRef.current.instancedMesh);
      threeRef.current.instancedMesh.geometry.dispose();
      (threeRef.current.instancedMesh.material as THREE.Material).dispose();
      threeRef.current.instancedMesh = null;
    }

    if (voxels.length === 0) {
      requestRender();
      return;
    }

    const geo = new THREE.BoxGeometry(1, 1, 1);
    const mat = new THREE.MeshStandardMaterial({
      roughness: 0.35,
      metalness: 0.1
    });

    const mesh = new THREE.InstancedMesh(geo, mat, voxels.length);
    mesh.castShadow = !threeRef.current.isSoftwareGl;
    mesh.receiveShadow = !threeRef.current.isSoftwareGl;

    const matrix = new THREE.Matrix4();
    const color = new THREE.Color();

    // Center offset so the model is centered around (0, y, 0)
    const halfGrid = gridSize / 2;

    voxels.forEach((v, index) => {
      matrix.setPosition(v.x - halfGrid + 0.5, v.y + 0.5, v.z - halfGrid + 0.5);
      mesh.setMatrixAt(index, matrix);
      color.set(v.color);
      mesh.setColorAt(index, color);
    });

    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;

    scene.add(mesh);
    threeRef.current.instancedMesh = mesh;
    requestRender();
  }, [voxels, gridSize]);

  // Interactive Raycasting Handlers (Hover & Click)
  const getPointerIntersection = useCallback((clientX: number, clientY: number) => {
    if (!threeRef.current || !mountRef.current) return null;
    const rect = mountRef.current.getBoundingClientRect();
    const { raycaster, mouse, camera, instancedMesh, plane } = threeRef.current;

    mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);

    // Test intersections with existing voxels first
    if (instancedMesh) {
      const hits = raycaster.intersectObject(instancedMesh);
      if (hits.length > 0 && hits[0].instanceId !== undefined) {
        return {
          type: 'voxel' as const,
          hit: hits[0],
          instanceId: hits[0].instanceId
        };
      }
    }

    // Otherwise test intersection with ground plane
    const planeHits = raycaster.intersectObject(plane);
    if (planeHits.length > 0) {
      return {
        type: 'plane' as const,
        hit: planeHits[0],
        point: planeHits[0].point
      };
    }

    return null;
  }, []);

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!threeRef.current) return;
    const { ghostMesh, requestRender } = threeRef.current;
    if (!ghostMesh) return;

    const inter = getPointerIntersection(e.clientX, e.clientY);
    const halfGrid = gridSize / 2;

    if (!inter) {
      ghostMesh.visible = false;
      requestRender();
      return;
    }

    const tool = activeToolRef.current;
    if (tool === 'camera') {
      ghostMesh.visible = false;
      requestRender();
      return;
    }

    if (inter.type === 'voxel') {
      const targetVoxel = voxelsRef.current[inter.instanceId];
      if (!targetVoxel) {
        ghostMesh.visible = false;
        requestRender();
        return;
      }

      if (tool === 'erase' || tool === 'paint' || tool === 'picker') {
        // Highlight existing voxel
        ghostMesh.position.set(
          targetVoxel.x - halfGrid + 0.5,
          targetVoxel.y + 0.5,
          targetVoxel.z - halfGrid + 0.5
        );
        (ghostMesh.material as THREE.MeshStandardMaterial).color.set(
          tool === 'erase' ? 0xef4444 : tool === 'paint' ? activeColorRef.current : 0xfacc15
        );
        ghostMesh.visible = true;
      } else if (tool === 'add') {
        // Position on adjacent face based on hit normal
        const normal = inter.hit.face?.normal || new THREE.Vector3(0, 1, 0);
        const newX = targetVoxel.x + Math.round(normal.x);
        const newY = targetVoxel.y + Math.round(normal.y);
        const newZ = targetVoxel.z + Math.round(normal.z);

        if (newX >= 0 && newX < gridSize && newY >= 0 && newY < gridSize && newZ >= 0 && newZ < gridSize) {
          ghostMesh.position.set(
            newX - halfGrid + 0.5,
            newY + 0.5,
            newZ - halfGrid + 0.5
          );
          (ghostMesh.material as THREE.MeshStandardMaterial).color.set(activeColorRef.current);
          ghostMesh.visible = true;
        } else {
          ghostMesh.visible = false;
        }
      }
    } else if (inter.type === 'plane' && tool === 'add') {
      // Place voxel on ground
      const gx = Math.floor(inter.point.x + halfGrid);
      const gz = Math.floor(inter.point.z + halfGrid);
      if (gx >= 0 && gx < gridSize && gz >= 0 && gz < gridSize) {
        ghostMesh.position.set(
          gx - halfGrid + 0.5,
          0.5,
          gz - halfGrid + 0.5
        );
        (ghostMesh.material as THREE.MeshStandardMaterial).color.set(activeColorRef.current);
        ghostMesh.visible = true;
      } else {
        ghostMesh.visible = false;
      }
    } else {
      ghostMesh.visible = false;
    }

    requestRender();
  };

  const pointerDownPos = useRef<{ x: number; y: number } | null>(null);

  const handlePointerDown = (e: React.PointerEvent) => {
    // Only track on left mouse or single touch
    if (e.button !== 0) return;
    pointerDownPos.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!pointerDownPos.current) return;
    const dist = Math.hypot(e.clientX - pointerDownPos.current.x, e.clientY - pointerDownPos.current.y);
    pointerDownPos.current = null;

    // If user dragged more than 6px, treat as OrbitControls camera navigation, not a voxel edit
    if (dist > 6) return;

    const tool = activeToolRef.current;
    if (tool === 'camera') return;

    const inter = getPointerIntersection(e.clientX, e.clientY);
    if (!inter) return;

    const currentVoxels = [...voxelsRef.current];
    const halfGrid = gridSize / 2;
    const symmetry = toolSettingsRef.current;

    const addVoxelWithSymmetry = (x: number, y: number, z: number, color: string) => {
      const coords = [{ x, y, z }];
      if (symmetry.voxelSymmetryX) {
        coords.push({ x: gridSize - 1 - x, y, z });
      }
      if (symmetry.voxelSymmetryZ) {
        coords.push({ x, y, z: gridSize - 1 - z });
      }
      if (symmetry.voxelSymmetryX && symmetry.voxelSymmetryZ) {
        coords.push({ x: gridSize - 1 - x, y, z: gridSize - 1 - z });
      }

      for (const c of coords) {
        const existIdx = currentVoxels.findIndex(v => v.x === c.x && v.y === c.y && v.z === c.z);
        if (existIdx >= 0) {
          currentVoxels[existIdx] = { ...c, color };
        } else {
          currentVoxels.push({ ...c, color });
        }
      }
    };

    if (inter.type === 'voxel') {
      const targetVoxel = currentVoxels[inter.instanceId];
      if (!targetVoxel) return;

      if (tool === 'picker') {
        onColorPick(targetVoxel.color);
      } else if (tool === 'erase') {
        // Erase voxel (with symmetry)
        const toRemove = new Set<string>();
        toRemove.add(`${targetVoxel.x},${targetVoxel.y},${targetVoxel.z}`);
        if (symmetry.voxelSymmetryX) toRemove.add(`${gridSize - 1 - targetVoxel.x},${targetVoxel.y},${targetVoxel.z}`);
        if (symmetry.voxelSymmetryZ) toRemove.add(`${targetVoxel.x},${targetVoxel.y},${gridSize - 1 - targetVoxel.z}`);

        const remaining = currentVoxels.filter(v => !toRemove.has(`${v.x},${v.y},${v.z}`));
        onUpdateVoxels(remaining);
      } else if (tool === 'paint') {
        // Paint voxel
        addVoxelWithSymmetry(targetVoxel.x, targetVoxel.y, targetVoxel.z, activeColorRef.current);
        onUpdateVoxels(currentVoxels);
      } else if (tool === 'add') {
        const normal = inter.hit.face?.normal || new THREE.Vector3(0, 1, 0);
        const newX = targetVoxel.x + Math.round(normal.x);
        const newY = targetVoxel.y + Math.round(normal.y);
        const newZ = targetVoxel.z + Math.round(normal.z);

        if (newX >= 0 && newX < gridSize && newY >= 0 && newY < gridSize && newZ >= 0 && newZ < gridSize) {
          addVoxelWithSymmetry(newX, newY, newZ, activeColorRef.current);
          onUpdateVoxels(currentVoxels);
        }
      }
    } else if (inter.type === 'plane' && tool === 'add') {
      const gx = Math.floor(inter.point.x + halfGrid);
      const gz = Math.floor(inter.point.z + halfGrid);
      if (gx >= 0 && gx < gridSize && gz >= 0 && gz < gridSize) {
        addVoxelWithSymmetry(gx, 0, gz, activeColorRef.current);
        onUpdateVoxels(currentVoxels);
      }
    }
  };

  // 3D Camera Navigator programmatic controls
  const handleRotateCamera = useCallback((deltaAzimuth: number, deltaPolar: number) => {
    if (!threeRef.current) return;
    const { camera, controls, requestRender } = threeRef.current;
    const offset = new THREE.Vector3().copy(camera.position).sub(controls.target);
    const spherical = new THREE.Spherical().setFromVector3(offset);
    spherical.theta += deltaAzimuth;
    spherical.phi = Math.max(0.05, Math.min(Math.PI / 2 + 0.1, spherical.phi + deltaPolar));
    offset.setFromSpherical(spherical);
    camera.position.copy(controls.target).add(offset);
    camera.lookAt(controls.target);
    controls.update();
    requestRender();
  }, []);

  const handlePanCamera = useCallback((deltaX: number, deltaY: number) => {
    if (!threeRef.current) return;
    const { camera, controls, requestRender } = threeRef.current;
    const right = new THREE.Vector3();
    const up = new THREE.Vector3();
    camera.matrix.extractBasis(right, up, new THREE.Vector3());
    controls.target.addScaledVector(right, deltaX);
    camera.position.addScaledVector(right, deltaX);
    controls.target.addScaledVector(up, deltaY);
    camera.position.addScaledVector(up, deltaY);
    controls.update();
    requestRender();
  }, []);

  const handleZoomCamera = useCallback((delta: number) => {
    if (!threeRef.current) return;
    const { camera, controls, requestRender } = threeRef.current;
    const dir = new THREE.Vector3().subVectors(camera.position, controls.target);
    const dist = dir.length();
    const newDist = Math.max(controls.minDistance, Math.min(controls.maxDistance, dist - delta));
    dir.normalize().multiplyScalar(newDist);
    camera.position.copy(controls.target).add(dir);
    controls.update();
    requestRender();
  }, []);

  const handleResetCamera = useCallback(() => {
    if (!threeRef.current) return;
    const { camera, controls, requestRender } = threeRef.current;
    controls.target.set(0, 4, 0);
    camera.position.set(22, 18, 26);
    controls.update();
    requestRender();
  }, []);

  const handleSetViewPreset = useCallback((preset: ViewPreset) => {
    if (!threeRef.current) return;
    const { camera, controls, requestRender } = threeRef.current;
    const target = controls.target;
    const dist = 32;
    switch (preset) {
      case 'iso':
        camera.position.set(target.x + 22, target.y + 18, target.z + 26);
        break;
      case 'front':
        camera.position.set(target.x, target.y + 2, target.z + dist);
        break;
      case 'side':
        camera.position.set(target.x + dist, target.y + 2, target.z);
        break;
      case 'top':
        camera.position.set(target.x, target.y + dist, target.z + 0.001);
        break;
    }
    camera.lookAt(target);
    controls.update();
    requestRender();
  }, []);

  // Mobile pinch-to-zoom & two-finger pan integration for 3D camera
  useTouchGestures(mountRef, {
    onGestureStart: () => {
      // Abort active voxel placement when multi-touch starts
      pointerDownPos.current = null;
      if (threeRef.current?.ghostMesh) {
        threeRef.current.ghostMesh.visible = false;
        threeRef.current.requestRender();
      }
    },
    onPinchZoom: (ratio) => {
      // Pinch out (ratio > 1) -> zoom in; pinch in (ratio < 1) -> zoom out
      const zoomDelta = (ratio - 1) * 28;
      handleZoomCamera(zoomDelta);
    },
    onTwoFingerPan: (dx, dy) => {
      // 2-finger pan translations
      handlePanCamera(-dx * 0.05, dy * 0.05);
    }
  });

  // Quick 3D transformations
  const handleRotate90 = () => {
    const half = (gridSize - 1) / 2;
    const rotated = voxels.map(v => {
      // Rotate 90 degrees around Y axis
      const rx = v.z;
      const rz = gridSize - 1 - v.x;
      return { ...v, x: rx, z: rz };
    });
    onUpdateVoxels(rotated);
  };

  const handleClear = () => {
    if (confirm('Clear all voxels in 3D scene?')) {
      onUpdateVoxels([]);
    }
  };

  return (
    <div className="relative w-full h-full overflow-hidden bg-slate-950 select-none">
      {/* Three.js Isolated Canvas Mount */}
      <div
        ref={mountRef}
        className={`w-full h-full ${
          activeVoxelTool === 'camera' ? 'cursor-grab active:cursor-grabbing' : 'cursor-crosshair'
        }`}
        onPointerMove={handlePointerMove}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onPointerLeave={() => {
          if (threeRef.current?.ghostMesh) {
            threeRef.current.ghostMesh.visible = false;
            threeRef.current.requestRender();
          }
        }}
      />

      {/* On-Screen Touch & Mobile 3D Camera Navigator Controls */}
      <CameraNavigator3D
        onRotateCamera={handleRotateCamera}
        onPanCamera={handlePanCamera}
        onZoomCamera={handleZoomCamera}
        onResetCamera={handleResetCamera}
        onSetViewPreset={handleSetViewPreset}
        isInspectMode={activeVoxelTool === 'camera'}
        onToggleInspectMode={() => setActiveVoxelTool(prev => prev === 'camera' ? 'add' : 'camera')}
      />

      {/* Top Floating Spec Badge */}
      <div className="absolute top-4 left-4 z-10 pointer-events-none flex items-center gap-2">
        <div className="bg-slate-900/80 border border-slate-800/80 rounded-xl px-3 py-1.5 text-xs text-slate-300 font-mono flex items-center gap-2.5 backdrop-blur-md shadow-lg">
          <Box className="w-4 h-4 text-sky-400" />
          <span>Voxels: <strong className="text-white">{voxels.length}</strong></span>
          <span className="text-slate-600">|</span>
          <span>Grid: {gridSize}³</span>
          <span className="text-slate-600">|</span>
          <span className="text-emerald-400">PBR Studio</span>
        </div>
      </div>

      {/* Extrude 2D Sprite to 3D Button (Top-Right Callout) */}
      <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
        <button
          onClick={onExtrude2D}
          className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 sm:py-2 bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-500 hover:to-sky-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-sky-500/20 active:scale-95 transition-all"
        >
          <Wand2 className="w-4 h-4" />
          <span className="hidden sm:inline">Extrude 2D Sprite to 3D</span>
          <span className="sm:hidden text-[10px]">Extrude</span>
        </button>
      </div>

      {/* Three.js Skill Directive: Consolidated Ergonomic Bottom Dock (Zero Viewport Occlusion) */}
      <div
        className={`absolute bottom-4 left-1/2 -translate-x-1/2 z-20 transition-all duration-300 ease-out ${
          dockCollapsed ? 'translate-y-[calc(100%-28px)]' : 'translate-y-0'
        }`}
        style={{ maxWidth: 'min(940px, 94vw)', width: '100%' }}
      >
        {/* Collapse / Expand Toggle Button */}
        <div className="flex justify-center -mb-2">
          <button
            onClick={() => setDockCollapsed(!dockCollapsed)}
            className="px-3 py-1 bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 rounded-t-lg text-[11px] font-medium text-slate-400 hover:text-white flex items-center gap-1.5 shadow-md backdrop-blur-md"
          >
            <Minimize2 className={`w-3.5 h-3.5 transition-transform ${dockCollapsed ? 'rotate-180' : ''}`} />
            <span>{dockCollapsed ? '▴ Show 3D Tools' : '▾ Hide Controls'}</span>
          </button>
        </div>

        {/* Dock Body */}
        <div className="bg-slate-900/95 border border-slate-800 rounded-2xl p-2.5 shadow-2xl backdrop-blur-md flex flex-wrap items-center justify-between gap-3">
          {/* Voxel Tools */}
          <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-xl border border-slate-800/80">
            <button
              onClick={() => setActiveVoxelTool('add')}
              title="Add Voxel"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeVoxelTool === 'add'
                  ? 'bg-sky-500 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Plus className="w-4 h-4" />
              <span>Add</span>
            </button>

            <button
              onClick={() => setActiveVoxelTool('erase')}
              title="Erase / Carve Voxel"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeVoxelTool === 'erase'
                  ? 'bg-red-500 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Trash2 className="w-4 h-4" />
              <span>Erase</span>
            </button>

            <button
              onClick={() => setActiveVoxelTool('paint')}
              title="Paint Voxel"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeVoxelTool === 'paint'
                  ? 'bg-emerald-500 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Paintbrush className="w-4 h-4" />
              <span>Paint</span>
            </button>

            <button
              onClick={() => setActiveVoxelTool('picker')}
              title="Eyedropper Voxel Color"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeVoxelTool === 'picker'
                  ? 'bg-amber-500 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Pipette className="w-4 h-4" />
              <span>Picker</span>
            </button>

            <button
              onClick={() => setActiveVoxelTool('camera')}
              title="Camera Orbit / Pan Mode (Touch freely without modifying voxels)"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeVoxelTool === 'camera'
                  ? 'bg-purple-500 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Camera className="w-4 h-4" />
              <span>Camera</span>
            </button>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleRotate90}
              title="Rotate Model 90°"
              className="p-2 rounded-xl text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/50 transition-colors"
            >
              <RotateCw className="w-4 h-4" />
            </button>

            <button
              onClick={() => setAutoRotate(!autoRotate)}
              title="Turntable Auto-Rotate"
              className={`p-2 rounded-xl border transition-colors ${
                autoRotate
                  ? 'bg-sky-500/20 text-sky-400 border-sky-500/50'
                  : 'text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 border-slate-700/50'
              }`}
            >
              <Compass className="w-4 h-4" />
            </button>

            <button
              onClick={() => setShowGrid(!showGrid)}
              title="Toggle Floor Grid"
              className={`p-2 rounded-xl border transition-colors ${
                showGrid
                  ? 'bg-sky-500/20 text-sky-400 border-sky-500/50'
                  : 'text-slate-400 bg-slate-800/80 border-slate-700/50'
              }`}
            >
              <Eye className="w-4 h-4" />
            </button>

            <div className="h-6 w-px bg-slate-800 mx-1" />

            <button
              onClick={handleClear}
              title="Clear Scene"
              className="px-2.5 py-1.5 rounded-xl text-xs font-medium text-rose-400 hover:text-rose-300 bg-rose-950/30 hover:bg-rose-950/60 border border-rose-900/40 transition-colors"
            >
              Clear
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
