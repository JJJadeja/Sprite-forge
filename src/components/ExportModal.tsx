import React, { useState } from 'react';
import { Project, GameEngine } from '../types/sprite';
import { 
  downloadFile, 
  renderFrameToCanvas, 
  renderSpriteSheetToCanvas, 
  generateOBJ, 
  generateFBX,
  render3DTo8DirectionalSpriteSheet
} from '../utils/exporters';
import { 
  X, 
  Download, 
  FileImage, 
  Box, 
  Layers, 
  Sparkles, 
  Check, 
  Compass,
  FileCode,
  Sliders
} from 'lucide-react';

interface ExportModalProps {
  project: Project;
  onClose: () => void;
  onImportProject: (imported: Project) => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  project,
  onClose,
  onImportProject
}) => {
  const [selectedEngine, setSelectedEngine] = useState<GameEngine>(project.settings?.engine || 'unity');
  const [activeTab, setActiveTab] = useState<'2d' | '3d' | 'project'>('2d');

  // 2D Options
  const [scale2d, setScale2d] = useState<number>(4);
  const [sheetLayout, setSheetLayout] = useState<'horizontal' | 'grid'>('horizontal');
  const [sheetColumns, setSheetColumns] = useState<number>(4);
  const [transparentBg, setTransparentBg] = useState<boolean>(true);
  const [bgColor, setBgColor] = useState<string>('#090d16');

  // 3D Options
  const [rotResolution, setRotResolution] = useState<number>(64);
  const [isIsometric, setIsIsometric] = useState<boolean>(false);
  const [isExporting3DSheet, setIsExporting3DSheet] = useState<boolean>(false);

  // Status feedback
  const [exportedMessage, setExportedMessage] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setExportedMessage(msg);
    setTimeout(() => setExportedMessage(null), 3000);
  };

  // Export Single Frame PNG
  const handleExportSinglePNG = () => {
    const frame = project.frames[project.currentFrameIndex] || project.frames[0];
    const bg = transparentBg ? null : bgColor;
    const canvas = renderFrameToCanvas(frame, project.width, project.height, scale2d, bg);

    canvas.toBlob(blob => {
      if (blob) {
        const name = `${project.name.toLowerCase().replace(/\s+/g, '_')}_f${project.currentFrameIndex + 1}_${scale2d}x.png`;
        downloadFile(blob, name, 'image/png');
        showNotification(`Exported ${name}`);
      }
    });
  };

  // Export Full Sprite Sheet PNG
  const handleExportSpriteSheet = () => {
    const bg = transparentBg ? null : bgColor;
    const canvas = renderSpriteSheetToCanvas(
      project.frames,
      project.width,
      project.height,
      scale2d,
      sheetLayout,
      sheetColumns,
      bg
    );

    canvas.toBlob(blob => {
      if (blob) {
        const name = `${project.name.toLowerCase().replace(/\s+/g, '_')}_spritesheet_${scale2d}x.png`;
        downloadFile(blob, name, 'image/png');
        showNotification(`Exported ${name} (${project.frames.length} frames)`);
      }
    });
  };

  // Export OBJ + MTL
  const handleExportOBJ = () => {
    const assetName = project.name.replace(/[^a-zA-Z0-9_]/g, '') || 'SpriteAsset';
    const result = generateOBJ(project.voxels, assetName);

    // Download .obj
    downloadFile(result.obj, `${assetName}.obj`, 'text/plain');

    // Download accompanying .mtl material
    setTimeout(() => {
      downloadFile(result.mtl, `${assetName}.mtl`, 'text/plain');
    }, 300);

    showNotification(`Exported ${assetName}.obj and ${assetName}.mtl`);
  };

  // Export ASCII FBX 7.4
  const handleExportFBX = () => {
    const assetName = project.name.replace(/[^a-zA-Z0-9_]/g, '') || 'SpriteAsset';
    const fbxContent = generateFBX(project.voxels, assetName);
    downloadFile(fbxContent, `${assetName}.fbx`, 'application/octet-stream');
    showNotification(`Exported ${assetName}.fbx (Autodesk FBX 7.4)`);
  };

  // Export 8-Directional 3D-to-2D Sprite Sheet
  const handleExport3DToSpriteSheet = async () => {
    try {
      setIsExporting3DSheet(true);
      const canvas = await render3DTo8DirectionalSpriteSheet(
        project.voxels,
        rotResolution,
        isIsometric
      );

      canvas.toBlob(blob => {
        if (blob) {
          const name = `${project.name.toLowerCase().replace(/\s+/g, '_')}_8dir_spritesheet.png`;
          downloadFile(blob, name, 'image/png');
          showNotification(`Exported 8-directional 3D sprite sheet!`);
        }
        setIsExporting3DSheet(false);
      });
    } catch (err) {
      console.error(err);
      setIsExporting3DSheet(false);
    }
  };

  // Export Project JSON
  const handleExportProjectJSON = () => {
    const jsonStr = JSON.stringify(project, null, 2);
    const filename = `${project.name.toLowerCase().replace(/\s+/g, '_')}_backup.json`;
    downloadFile(jsonStr, filename, 'application/json');
    showNotification(`Project saved as ${filename}`);
  };

  // Import Project JSON
  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const parsed = JSON.parse(ev.target?.result as string);
        if (parsed && parsed.frames && parsed.frames.length > 0) {
          onImportProject(parsed);
          showNotification('Project loaded successfully!');
          onClose();
        } else {
          alert('Invalid SpriteForge project file format.');
        }
      } catch (err) {
        alert('Could not parse JSON file.');
      }
    };
    reader.readAsText(file);
  };

  // Engine Tips
  const engineTips: Record<GameEngine, { title: string; desc: string; guide: string }> = {
    unity: {
      title: 'Unity 2D & 3D Integration',
      desc: 'Use PNG Sprite Sheets with Sprite Mode: Multiple. Set Pixels Per Unit to 16 or 32, and Filter Mode to Point (no filter). For 3D, drag the FBX or OBJ directly into Assets/Models.',
      guide: 'Texture Type: Sprite (2D and UI) • Compression: None / High Quality'
    },
    unreal: {
      title: 'Unreal Engine 5 Integration',
      desc: 'Import FBX directly into UE5 Content Browser. Enable "Import Vertex Colors" and "Compute Normals". For 2D Paper2D sprites, set Mip Gen Settings to NoMipmaps and Texture Group to 2D Pixels.',
      guide: 'Paper2D Sprite Sheet Extraction • Vertex Color Shading supported'
    },
    godot: {
      title: 'Godot Engine 4 Integration',
      desc: 'Import Sprite Sheet PNG and use AnimatedSprite2D with SpriteFrames. Set Texture Filter to Nearest in project settings or inspector. For 3D, Godot imports OBJ with MTL automatically.',
      guide: 'Default Texture Filter: Nearest • Clean crisp pixels without blur'
    },
    gamemaker: {
      title: 'GameMaker Studio Integration',
      desc: 'Import horizontal strip PNG or grid sprite sheet directly into Sprites. Origin center-bottom for platformer characters.',
      guide: 'Native Strip Import • Pixel Art Interpolation Off'
    },
    pico8: {
      title: 'PICO-8 & Retro Consoles',
      desc: 'Palette is locked to 16 colors. Export 1x scale PNG to import directly with import_png or sprite grabber.',
      guide: 'Native 128x128 PICO-8 cart compatibility'
    },
    custom: {
      title: 'Generic Game Engine Support',
      desc: 'Standard PNG and FBX/OBJ files are compatible with all modern game engines including Bevy, Raylib, Phaser, Defold, and Love2D.',
      guide: 'Universal game assets'
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm select-none">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-sky-500/20 text-sky-400 border border-sky-500/30">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Export Game Assets</h2>
              <p className="text-xs text-slate-400">
                Optimized exports for all major 2D and 3D game engines
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Engine Selector Pills */}
        <div className="px-6 py-3 border-b border-slate-800/80 bg-slate-950/30 flex items-center gap-2 overflow-x-auto">
          <span className="text-xs text-slate-400 font-medium whitespace-nowrap">Target Engine:</span>
          {(['unity', 'unreal', 'godot', 'gamemaker', 'pico8', 'custom'] as GameEngine[]).map(eng => (
            <button
              key={eng}
              onClick={() => setSelectedEngine(eng)}
              className={`px-3 py-1 rounded-xl text-xs font-semibold capitalize whitespace-nowrap transition-all ${
                selectedEngine === eng
                  ? 'bg-sky-500 text-white shadow-md'
                  : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
              }`}
            >
              {eng}
            </button>
          ))}
        </div>

        {/* Engine Tip Notice */}
        <div className="mx-6 mt-3 p-3 rounded-2xl bg-slate-950 border border-slate-800/80 text-xs">
          <div className="font-semibold text-sky-400 mb-0.5">{engineTips[selectedEngine].title}</div>
          <div className="text-slate-300 text-[11px] leading-relaxed mb-1">
            {engineTips[selectedEngine].desc}
          </div>
          <div className="text-[10px] font-mono text-emerald-400">
            ★ {engineTips[selectedEngine].guide}
          </div>
        </div>

        {/* Mode Tabs */}
        <div className="flex items-center gap-2 px-6 pt-4">
          <button
            onClick={() => setActiveTab('2d')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${
              activeTab === '2d'
                ? 'bg-sky-500 text-white'
                : 'bg-slate-800/80 text-slate-400 hover:text-white'
            }`}
          >
            <FileImage className="w-4 h-4" />
            <span>2D Sprite Formats (PNG)</span>
          </button>

          <button
            onClick={() => setActiveTab('3d')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${
              activeTab === '3d'
                ? 'bg-sky-500 text-white'
                : 'bg-slate-800/80 text-slate-400 hover:text-white'
            }`}
          >
            <Box className="w-4 h-4" />
            <span>3D Models (FBX, OBJ)</span>
          </button>

          <button
            onClick={() => setActiveTab('project')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${
              activeTab === 'project'
                ? 'bg-sky-500 text-white'
                : 'bg-slate-800/80 text-slate-400 hover:text-white'
            }`}
          >
            <FileCode className="w-4 h-4" />
            <span>Project Backup</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {activeTab === '2d' && (
            <div className="space-y-4">
              {/* Scale Options */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-950 border border-slate-800/80">
                <div>
                  <div className="text-xs font-semibold text-slate-200">Pixel Scale Factor</div>
                  <div className="text-[11px] text-slate-400">Crisp nearest-neighbor upscaling</div>
                </div>

                <div className="flex items-center gap-1.5">
                  {[1, 2, 4, 8, 16].map(s => (
                    <button
                      key={s}
                      onClick={() => setScale2d(s)}
                      className={`w-9 h-8 rounded-xl font-mono text-xs font-bold transition-all ${
                        scale2d === s
                          ? 'bg-sky-500 text-white shadow-md'
                          : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {s}x
                    </button>
                  ))}
                </div>
              </div>

              {/* Background Options */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-950 border border-slate-800/80">
                <div>
                  <div className="text-xs font-semibold text-slate-200">Alpha Transparency</div>
                  <div className="text-[11px] text-slate-400">Leave background transparent or fill</div>
                </div>

                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={transparentBg}
                      onChange={e => setTransparentBg(e.target.checked)}
                      className="accent-sky-500 rounded"
                    />
                    <span>Transparent</span>
                  </label>

                  {!transparentBg && (
                    <input
                      type="color"
                      value={bgColor}
                      onChange={e => setBgColor(e.target.value)}
                      className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border border-slate-700"
                    />
                  )}
                </div>
              </div>

              {/* Action Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {/* Single Frame PNG */}
                <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/80 flex flex-col justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-white mb-1">Single Frame PNG</h3>
                    <p className="text-xs text-slate-400 mb-3">
                      Export current frame #{project.currentFrameIndex + 1} at ({project.width * scale2d}×{project.height * scale2d}px).
                    </p>
                  </div>
                  <button
                    onClick={handleExportSinglePNG}
                    className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-semibold text-xs shadow-lg active:scale-95 transition-all"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download Single PNG</span>
                  </button>
                </div>

                {/* Sprite Sheet PNG */}
                <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/80 flex flex-col justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-white mb-1">Sprite Sheet PNG</h3>
                    <p className="text-xs text-slate-400 mb-3">
                      All {project.frames.length} animation frames stitched into an engine-ready spritesheet.
                    </p>
                  </div>
                  <button
                    onClick={handleExportSpriteSheet}
                    className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-semibold text-xs shadow-lg active:scale-95 transition-all"
                  >
                    <Layers className="w-4 h-4" />
                    <span>Download Sprite Sheet</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === '3d' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Autodesk FBX 7.4 */}
                <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/80 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="text-sm font-bold text-white">Autodesk FBX 7.4</h3>
                      <span className="px-2 py-0.5 rounded-md bg-sky-500/20 text-sky-300 font-mono text-[10px]">.fbx</span>
                    </div>
                    <p className="text-xs text-slate-400 mb-3">
                      Standard industry 3D format for Unity, Unreal Engine 5, Blender, and Godot. Embedded vertex colors and normals.
                    </p>
                  </div>
                  <button
                    onClick={handleExportFBX}
                    className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-semibold text-xs shadow-lg active:scale-95 transition-all"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download FBX Model</span>
                  </button>
                </div>

                {/* Wavefront OBJ + MTL */}
                <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/80 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="text-sm font-bold text-white">Wavefront OBJ + MTL</h3>
                      <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 font-mono text-[10px]">.obj / .mtl</span>
                    </div>
                    <p className="text-xs text-slate-400 mb-3">
                      Includes face-culling optimization to strip hidden internal faces. Lightweight, universal compatibility.
                    </p>
                  </div>
                  <button
                    onClick={handleExportOBJ}
                    className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-white font-semibold text-xs shadow-lg active:scale-95 transition-all"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download OBJ + MTL</span>
                  </button>
                </div>
              </div>

              {/* 8-Directional 3D-to-2D Sprite Sheet Generator */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 to-indigo-950/50 border border-indigo-800/40">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-sky-400" />
                    <h3 className="text-sm font-bold text-white">8-Directional 3D-to-2D Sprite Sheet</h3>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300">
                    Game Dev Favorite
                  </span>
                </div>
                <p className="text-xs text-slate-300 mb-3">
                  Renders your 3D model automatically from 8 camera angles (0° to 315°) into a seamless 2D sprite sheet for top-down or isometric RPG games!
                </p>

                <div className="flex items-center gap-3 mb-3">
                  <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isIsometric}
                      onChange={e => setIsIsometric(e.target.checked)}
                      className="accent-indigo-500 rounded"
                    />
                    <span>Isometric Camera Angle (30°)</span>
                  </label>

                  <select
                    value={rotResolution}
                    onChange={e => setRotResolution(parseInt(e.target.value))}
                    className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-slate-200 text-xs outline-none"
                  >
                    <option value="32">32×32 per angle</option>
                    <option value="64">64×64 per angle</option>
                    <option value="128">128×128 per angle</option>
                  </select>
                </div>

                <button
                  disabled={isExporting3DSheet}
                  onClick={handleExport3DToSpriteSheet}
                  className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-semibold text-xs shadow-lg active:scale-95 disabled:opacity-50 transition-all"
                >
                  <Compass className="w-4 h-4" />
                  <span>{isExporting3DSheet ? 'Rendering 8 Angles...' : 'Render & Download 8-Dir Sprite Sheet'}</span>
                </button>
              </div>
            </div>
          )}

          {activeTab === 'project' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/80">
                <h3 className="text-sm font-bold text-white mb-1">Project Backup & Sharing</h3>
                <p className="text-xs text-slate-400 mb-4">
                  Export complete project including all 2D animation frames, layers, 3D voxels, and custom color palette to JSON. You can reload this file anytime offline.
                </p>

                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={handleExportProjectJSON}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-semibold text-xs shadow-lg transition-all"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download Project JSON</span>
                  </button>

                  <label className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-semibold text-xs cursor-pointer transition-all">
                    <FileCode className="w-4 h-4 text-emerald-400" />
                    <span>Import Project JSON</span>
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleImportFile}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer with Notification */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <div className="text-xs text-slate-400">
            {exportedMessage ? (
              <span className="text-emerald-400 font-medium flex items-center gap-1.5 animate-pulse">
                <Check className="w-4 h-4" />
                {exportedMessage}
              </span>
            ) : (
              <span>100% Offline Compatible • No Cloud Required</span>
            )}
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
