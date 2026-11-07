import React, { useState } from 'react';
import { 
  ToolType, 
  ToolSettings, 
  SymmetryMode, 
  MirrorAxis,
  DitherType,
  BrushShape,
  SelectionArea,
  ToolPreset,
  CustomBrushPattern
} from '../types/sprite';
import { BRUSH_SHAPES, DEFAULT_CUSTOM_BRUSHES } from '../utils/brushShapes';
import { BrushShapeIcon } from './BrushShapeIcon';
import { ToolPresetsModal } from './ToolPresetsModal';
import { BrushLibrary } from './BrushLibrary';
import { LockTransparencyIcon } from './LockTransparencyIcon';
import { 
  FlipHorizontal, 
  FlipVertical, 
  Grid3X3, 
  Layers, 
  Sparkles, 
  Columns, 
  CircleDot,
  Square,
  Circle,
  Diamond,
  Scissors,
  Copy,
  ClipboardPaste,
  Trash2,
  Scan,
  X,
  Lock,
  Compass,
  RotateCw,
  Eye,
  EyeOff,
  Disc,
  Bookmark,
  ChevronDown,
  Shapes,
  Waves,
  Gauge,
  Activity,
  Paintbrush,
  Ghost,
  Magnet
} from 'lucide-react';

interface ToolSettingsBarProps {
  mode: '2d' | '3d';
  activeTool: ToolType;
  onSelectTool?: (tool: ToolType) => void;
  settings: ToolSettings;
  onUpdateSettings: (newSettings: Partial<ToolSettings>) => void;
  selection?: SelectionArea | null;
  hasClipboard?: boolean;
  onCut?: () => void;
  onCopy?: () => void;
  onPaste?: () => void;
  onDelete?: () => void;
  onSelectAll?: () => void;
  onDeselect?: () => void;
  isLayerLocked?: boolean;
  isTransparencyLocked?: boolean;
  onToggleLockTransparency?: () => void;
  activeLayerPixels?: string[];
  canvasWidth?: number;
  canvasHeight?: number;
  activeColor?: string;
}

export const ToolSettingsBar: React.FC<ToolSettingsBarProps> = ({
  mode,
  activeTool,
  onSelectTool,
  settings,
  onUpdateSettings,
  selection,
  hasClipboard,
  onCut,
  onCopy,
  onPaste,
  onDelete,
  onSelectAll,
  onDeselect,
  isLayerLocked,
  isTransparencyLocked,
  onToggleLockTransparency,
  activeLayerPixels,
  canvasWidth,
  canvasHeight,
  activeColor
}) => {
  const [isShapeMenuOpen, setIsShapeMenuOpen] = useState(false);
  const [isPresetsModalOpen, setIsPresetsModalOpen] = useState(false);
  const [isBrushLibraryOpen, setIsBrushLibraryOpen] = useState(false);
  const [isSmoothingMenuOpen, setIsSmoothingMenuOpen] = useState(false);
  const [isPressureMenuOpen, setIsPressureMenuOpen] = useState(false);
  const [liveTestPressure, setLiveTestPressure] = useState<number | null>(null);
  return (
    <div className="h-9 border-b border-slate-800/80 bg-slate-900/90 px-3 flex items-center justify-between gap-2 text-xs overflow-x-auto select-none backdrop-blur-sm transition-all duration-200">
      {/* Left side: Context-sensitive tool options */}
      <div className="flex items-center gap-2 transition-opacity duration-150">
        {mode === '2d' ? (
          activeTool === 'select' ? (
            /* Selection Tool Controls Bar */
            <div className="flex items-center gap-1.5 py-0.5">
              <span className="text-[10px] text-sky-400 font-bold px-1 bg-sky-500/10 rounded border border-sky-500/20">
                {selection 
                  ? `${Math.abs(selection.endX - selection.startX) + 1}×${Math.abs(selection.endY - selection.startY) + 1}px`
                  : 'Marquee'}
              </span>

              <div className="flex items-center gap-1 pl-1">
                {isLayerLocked && (
                  <span className="text-[10px] text-amber-400 font-bold px-1.5 py-0.5 bg-amber-500/15 rounded border border-amber-500/30 flex items-center gap-1">
                    <Lock className="w-2.5 h-2.5" />
                    <span>Locked</span>
                  </span>
                )}

                <button
                  onClick={onCut}
                  disabled={!selection || isLayerLocked}
                  title={isLayerLocked ? "Layer is locked (Cut disabled)" : "Cut Selection (Ctrl+X)"}
                  className="px-2 py-1 rounded-md flex items-center gap-1 font-medium transition-all text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-transparent disabled:cursor-not-allowed"
                >
                  <Scissors className="w-3.5 h-3.5 text-sky-400" />
                  <span className="text-[11px]">Cut</span>
                </button>

                <button
                  onClick={onCopy}
                  disabled={!selection}
                  title="Copy Selection (Ctrl+C)"
                  className="px-2 py-1 rounded-md flex items-center gap-1 font-medium transition-all text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-transparent"
                >
                  <Copy className="w-3.5 h-3.5 text-sky-400" />
                  <span className="text-[11px]">Copy</span>
                </button>

                <button
                  onClick={onPaste}
                  disabled={!hasClipboard || isLayerLocked}
                  title={isLayerLocked ? "Layer is locked (Paste disabled)" : "Paste (Ctrl+V)"}
                  className="px-2 py-1 rounded-md flex items-center gap-1 font-medium transition-all text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-transparent disabled:cursor-not-allowed"
                >
                  <ClipboardPaste className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-[11px]">Paste</span>
                </button>

                <button
                  onClick={onDelete}
                  disabled={!selection || isLayerLocked}
                  title={isLayerLocked ? "Layer is locked (Delete disabled)" : "Delete Selection (Del / Backspace)"}
                  className="px-2 py-1 rounded-md flex items-center gap-1 font-medium transition-all text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 disabled:opacity-40 disabled:hover:bg-transparent disabled:cursor-not-allowed"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span className="text-[11px]">Delete</span>
                </button>

                <div className="w-px h-4 bg-slate-800 mx-0.5" />

                <button
                  onClick={onSelectAll}
                  title="Select All (Ctrl+A)"
                  className="px-2 py-1 rounded-md flex items-center gap-1 font-medium transition-all text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  <Scan className="w-3.5 h-3.5" />
                  <span className="text-[11px] hidden sm:inline">Select All</span>
                </button>

                <div className="w-px h-4 bg-slate-800 mx-0.5" />

                {/* Snap to Grid for Selection */}
                <button
                  onClick={() => {
                    const nextSnap = !settings.snapToGrid;
                    onUpdateSettings({
                      snapToGrid: nextSnap,
                      ...(nextSnap && (!settings.gridSpacing || settings.gridSpacing <= 1) ? {
                        gridSpacing: 8,
                        gridVisible: true
                      } : {}),
                      ...(nextSnap && !settings.gridVisible ? { gridVisible: true } : {})
                    });
                  }}
                  title={
                    settings.snapToGrid
                      ? `Snap to Grid: ON (${settings.gridSpacing && settings.gridSpacing > 1 ? settings.gridSpacing : 8}px spacing - Shift+S)`
                      : 'Snap to Grid: OFF (Align selection to grid tiles - Shift+S)'
                  }
                  className={`px-1.5 py-1 rounded-md flex items-center gap-1 font-medium transition-all ${
                    settings.snapToGrid
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-xs'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Magnet className={`w-3.5 h-3.5 ${settings.snapToGrid ? 'text-emerald-400' : 'text-slate-400'}`} />
                  <span className="text-[11px] hidden sm:inline">Snap</span>
                </button>

                {selection && (
                  <button
                    onClick={onDeselect}
                    title="Deselect (Esc)"
                    className="p-1 rounded-md flex items-center gap-1 font-medium transition-all text-slate-400 hover:text-white hover:bg-slate-800"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ) : (
            <>
              {/* Brush Size (Numbers only) */}
              <div className="flex items-center gap-1 pr-2 border-r border-slate-800">
                <CircleDot className="w-3.5 h-3.5 text-slate-400 mr-0.5" />
                {[1, 2, 3, 4, 6].map(size => (
                  <button
                    key={size}
                    onClick={() => onUpdateSettings({ brushSize: size })}
                    title={`Size ${size}px`}
                    className={`w-5 h-5 rounded font-mono text-[11px] flex items-center justify-center transition-all ${
                      settings.brushSize === size
                        ? 'bg-sky-500 text-white font-bold shadow-sm'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>


            {/* Custom Brush Shapes Library */}
            <div className="relative flex items-center gap-1 pr-2 border-r border-slate-800">
              {/* Quick shape buttons */}
              {(['square', 'circle', 'diamond', 'cross', 'slash'] as BrushShape[]).map(shp => (
                <button
                  key={shp}
                  onClick={() => onUpdateSettings({ brushShape: shp })}
                  title={`${shp.toUpperCase()} Brush`}
                  className={`p-1 rounded-md transition-all ${
                    settings.brushShape === shp
                      ? 'bg-sky-500 text-white font-bold shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <BrushShapeIcon shape={shp} className="w-3.5 h-3.5" />
                </button>
              ))}

              {/* Active custom brush badge if active */}
              {settings.brushShape === 'custom' && (
                <button
                  onClick={() => setIsBrushLibraryOpen(true)}
                  title={`Custom Brush: ${settings.customBrushPattern?.name || 'Pattern'} (Click to manage)`}
                  className="px-1.5 py-1 rounded-md bg-purple-600 text-white font-bold shadow-sm flex items-center gap-1 text-[11px]"
                >
                  <BrushShapeIcon shape="custom" className="w-3.5 h-3.5 text-white" />
                  <span className="text-[10px] max-w-[65px] truncate hidden md:inline">
                    {settings.customBrushPattern?.name || 'Custom'}
                  </span>
                </button>
              )}

              {/* Library Dropdown Trigger Button */}
              <button
                onClick={() => setIsShapeMenuOpen(!isShapeMenuOpen)}
                title="Open Brush Shape Library"
                className={`px-1.5 py-1 rounded-md transition-all flex items-center gap-1 text-[11px] font-medium ${
                  isShapeMenuOpen || !['square', 'circle', 'diamond', 'cross', 'slash'].includes(settings.brushShape)
                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-xs'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <BrushShapeIcon shape={settings.brushShape} className="w-3.5 h-3.5 text-purple-400" />
                <span className="capitalize hidden xl:inline">
                  {settings.brushShape === 'custom' ? (settings.customBrushPattern?.name || 'Custom') : settings.brushShape}
                </span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {/* Brush Shape Library Dropdown Popover */}
              {isShapeMenuOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setIsShapeMenuOpen(false)} 
                  />
                  <div className="absolute top-8 left-0 z-50 w-64 bg-slate-900 border border-slate-700/80 rounded-2xl p-2.5 shadow-2xl backdrop-blur-2xl text-xs space-y-2 animate-fade-in">
                    <div className="flex items-center justify-between pb-1.5 border-b border-slate-800 text-[11px]">
                      <span className="font-bold text-white flex items-center gap-1.5">
                        <Shapes className="w-3.5 h-3.5 text-purple-400" />
                        <span>Brush Shape Library</span>
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">{BRUSH_SHAPES.length} shapes</span>
                    </div>

                    {/* Dedicated action to launch Brush Library modal */}
                    <button
                      onClick={() => {
                        setIsBrushLibraryOpen(true);
                        setIsShapeMenuOpen(false);
                      }}
                      className="w-full py-1.5 px-2 rounded-lg bg-gradient-to-r from-purple-600/30 to-pink-600/30 hover:from-purple-600/50 hover:to-pink-600/50 border border-purple-500/40 text-purple-200 hover:text-white flex items-center justify-between transition-all"
                    >
                      <span className="flex items-center gap-1.5 font-semibold text-[11px]">
                        <Paintbrush className="w-3.5 h-3.5 text-pink-400" />
                        <span>Open Brush Pattern Library</span>
                      </span>
                      <span className="text-[9px] font-mono bg-purple-500/30 px-1.5 py-0.2 rounded border border-purple-400/30">
                        Manage ↗
                      </span>
                    </button>

                    {/* Grouped by category */}
                    {(['basic', 'calligraphy', 'special'] as const).map(cat => {
                      const categoryShapes = BRUSH_SHAPES.filter(s => s.category === cat);
                      const catTitle = cat === 'basic' ? 'Basic Blocks' : cat === 'calligraphy' ? 'Chisels & Blades' : 'Special & Accents';

                      return (
                        <div key={cat} className="space-y-1">
                          <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider px-1">
                            {catTitle}
                          </div>
                          <div className="grid grid-cols-2 gap-1">
                            {categoryShapes.map(s => {
                              const isSelected = settings.brushShape === s.id;
                              return (
                                <button
                                  key={s.id}
                                  onClick={() => {
                                    if (s.id === 'custom') {
                                      if (!settings.customBrushPattern && DEFAULT_CUSTOM_BRUSHES[0]) {
                                        onUpdateSettings({ 
                                          brushShape: 'custom', 
                                          customBrushPattern: DEFAULT_CUSTOM_BRUSHES[0] 
                                        });
                                      } else {
                                        onUpdateSettings({ brushShape: 'custom' });
                                      }
                                    } else {
                                      onUpdateSettings({ brushShape: s.id });
                                    }
                                    setIsShapeMenuOpen(false);
                                  }}
                                  className={`p-1.5 rounded-lg flex items-center gap-2 text-left transition-all ${
                                    isSelected
                                      ? 'bg-purple-500 text-white font-bold shadow-sm'
                                      : 'bg-slate-800/60 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/40'
                                  }`}
                                  title={s.description}
                                >
                                  <BrushShapeIcon shape={s.id} className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-white' : 'text-purple-400'}`} />
                                  <div className="truncate">
                                    <div className="text-[11px] leading-tight truncate">{s.shortLabel}</div>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            {/* Dedicated Brush Library Button */}
            <div className="flex items-center gap-1 pr-2 border-r border-slate-800">
              <button
                onClick={() => setIsBrushLibraryOpen(true)}
                title="Brush Library (Custom Pixel Art Stamps & Patterns)"
                className={`px-2 py-1 rounded-md border flex items-center gap-1.5 transition-all active:scale-95 text-[11px] font-medium ${
                  settings.brushShape === 'custom'
                    ? 'bg-purple-600/30 text-purple-200 border-purple-500/50 shadow-xs'
                    : 'bg-slate-800/80 hover:bg-slate-800 border-slate-700/60 text-slate-300 hover:text-white'
                }`}
              >
                <Paintbrush className="w-3.5 h-3.5 text-purple-400" />
                <span className="hidden sm:inline">Brush Library</span>
                {settings.brushShape === 'custom' && (
                  <span className="text-[9px] font-mono bg-purple-500/30 text-purple-300 px-1 py-0.2 rounded border border-purple-500/40">
                    Active
                  </span>
                )}
              </button>
            </div>

            {/* Tool Presets Button */}
            <div className="flex items-center gap-1 pr-2 border-r border-slate-800">
              <button
                onClick={() => setIsPresetsModalOpen(true)}
                title="Tool Configuration Presets (Save & Load)"
                className="px-2 py-1 rounded-md bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 text-slate-300 hover:text-white flex items-center gap-1.5 transition-all active:scale-95 text-[11px] font-medium"
              >
                <Bookmark className="w-3.5 h-3.5 text-sky-400" />
                <span className="hidden sm:inline">Presets</span>
              </button>
            </div>

            {/* Lock Transparency Button */}
            {onToggleLockTransparency && (
              <div className="flex items-center gap-1 pr-2 border-r border-slate-800">
                <button
                  onClick={onToggleLockTransparency}
                  title={
                    isTransparencyLocked
                      ? "Lock Transparency: ON (Paint brush only modifies existing pixels, protecting transparent background)"
                      : "Lock Transparency: OFF (Click to protect transparent pixels)"
                  }
                  className={`px-2 py-1 rounded-md border flex items-center gap-1.5 transition-all active:scale-95 text-[11px] font-medium ${
                    isTransparencyLocked
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-xs'
                      : 'bg-slate-800/80 hover:bg-slate-800 border-slate-700/60 text-slate-400 hover:text-white'
                  }`}
                >
                  <LockTransparencyIcon locked={isTransparencyLocked} className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Lock Trans.</span>
                  {isTransparencyLocked && (
                    <span className="text-[9px] font-mono bg-amber-500/30 text-amber-200 px-1 py-0.2 rounded border border-amber-500/40">
                      ON
                    </span>
                  )}
                </button>
              </div>
            )}

            {/* Stroke Stabilization / Smoothing Toggle & Controls */}
            {(activeTool === 'pencil' || activeTool === 'eraser' || activeTool === 'dither' || activeTool === 'mirror') && (
              <div className="relative flex items-center gap-1 pr-2 border-r border-slate-800">
                <button
                  onClick={() => onUpdateSettings({ stabilization: !settings.stabilization })}
                  title={settings.stabilization ? 'Stroke Stabilization: ON (Smooths out jittery pencil strokes with lazy-rope filter)' : 'Stroke Stabilization: OFF (Click to smooth out jittery strokes)'}
                  className={`px-2 py-1 rounded-md flex items-center gap-1.5 transition-all active:scale-95 text-[11px] font-medium ${
                    settings.stabilization
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-xs'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800 border border-transparent'
                  }`}
                >
                  <Waves className={`w-3.5 h-3.5 ${settings.stabilization ? 'text-emerald-400' : 'text-slate-400'}`} />
                  <span className="hidden sm:inline">Stabilizer</span>
                  <span className="sm:hidden">Smooth</span>
                  {settings.stabilization && (
                    <span className="text-[10px] font-mono text-emerald-300 font-bold bg-emerald-500/25 px-1 py-0.2 rounded border border-emerald-500/30">
                      {settings.stabilizationWeight || 6}
                    </span>
                  )}
                </button>

                {/* Stabilization Settings Popover Trigger */}
                <div className="relative">
                  <button
                    onClick={() => setIsSmoothingMenuOpen(!isSmoothingMenuOpen)}
                    title="Adjust Stroke Stabilization Strength"
                    className={`p-1 rounded transition-colors ${
                      isSmoothingMenuOpen 
                        ? 'bg-slate-800 text-white' 
                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <ChevronDown className="w-3 h-3" />
                  </button>

                  {isSmoothingMenuOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setIsSmoothingMenuOpen(false)} />
                      <div className="absolute top-8 left-0 z-50 w-60 bg-slate-900 border border-slate-700/80 rounded-2xl p-3 shadow-2xl backdrop-blur-2xl text-xs space-y-2.5 animate-fade-in">
                        <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
                          <span className="font-bold text-white flex items-center gap-1.5 text-[11px]">
                            <Waves className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Stroke Stabilization</span>
                          </span>
                          <button
                            onClick={() => onUpdateSettings({ stabilization: !settings.stabilization })}
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border transition-all ${
                              settings.stabilization
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                : 'bg-slate-800 text-slate-400 border-slate-700'
                            }`}
                          >
                            {settings.stabilization ? 'ENABLED' : 'DISABLED'}
                          </button>
                        </div>

                        <p className="text-[10px] text-slate-400 leading-tight">
                          Dampens hand tremors and smooths out jittery pencil strokes in real time using a responsive subpixel lazy-rope filter.
                        </p>

                        {/* Quick Presets */}
                        <div className="space-y-1">
                          <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Presets</div>
                          <div className="grid grid-cols-3 gap-1">
                            {[
                              { label: 'Light', val: 3, hint: 'Agile' },
                              { label: 'Balanced', val: 7, hint: 'Standard' },
                              { label: 'Strong', val: 14, hint: 'Ultra-Smooth' }
                            ].map(p => (
                              <button
                                key={p.val}
                                onClick={() => {
                                  onUpdateSettings({ 
                                    stabilization: true,
                                    stabilizationWeight: p.val 
                                  });
                                }}
                                className={`py-1.5 px-1 rounded-lg text-center transition-all ${
                                  settings.stabilization && (settings.stabilizationWeight || 6) === p.val
                                    ? 'bg-emerald-500 text-slate-950 font-bold shadow-xs'
                                    : 'bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-700'
                                }`}
                              >
                                <div className="text-[11px] font-bold leading-tight">{p.label}</div>
                                <div className="text-[9px] opacity-75 font-mono">{p.val}</div>
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Fine Slider */}
                        <div className="space-y-1.5 pt-1.5 border-t border-slate-800">
                          <div className="flex items-center justify-between text-[10px] text-slate-300">
                            <span className="font-semibold">Smoothing Strength</span>
                            <span className="font-mono font-bold text-emerald-400 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">
                              {settings.stabilizationWeight || 6} / 20
                            </span>
                          </div>
                          <input
                            type="range"
                            min="1"
                            max="20"
                            step="1"
                            value={settings.stabilizationWeight || 6}
                            onChange={e => onUpdateSettings({ 
                              stabilization: true,
                              stabilizationWeight: Number(e.target.value) 
                            })}
                            className="w-full accent-emerald-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                          />
                          <div className="flex justify-between text-[9px] text-slate-500 font-mono">
                            <span>1 (Light)</span>
                            <span>10 (Balanced)</span>
                            <span>20 (Maximum)</span>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Shape Snapping Controls (Rectangle, Circle, Line) */}
            {(activeTool === 'rect' || activeTool === 'circle' || activeTool === 'line') && (
              <div className="flex items-center gap-1.5 pr-2 border-r border-slate-800">
                <button
                  onClick={() => {
                    const nextSnap = !settings.snapToGrid;
                    onUpdateSettings({
                      snapToGrid: nextSnap,
                      ...(nextSnap && (!settings.gridSpacing || settings.gridSpacing <= 1) ? {
                        gridSpacing: 8,
                        gridVisible: true
                      } : {}),
                      ...(nextSnap && !settings.gridVisible ? { gridVisible: true } : {})
                    });
                  }}
                  title={
                    settings.snapToGrid
                      ? `Snap to Grid: ON (${settings.gridSpacing && settings.gridSpacing > 1 ? settings.gridSpacing : 8}px spacing - Shift+S)`
                      : 'Snap to Grid: OFF (Align shapes perfectly to grid spacing - Shift+S)'
                  }
                  className={`px-2 py-1 rounded-md flex items-center gap-1.5 transition-all active:scale-95 text-[11px] font-medium ${
                    settings.snapToGrid
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-xs'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800 border border-transparent'
                  }`}
                >
                  <Magnet className={`w-3.5 h-3.5 ${settings.snapToGrid ? 'text-emerald-400' : 'text-slate-400'}`} />
                  <span>Snap to Grid</span>
                  {settings.snapToGrid && (
                    <span className="text-[10px] font-mono text-emerald-300 font-bold bg-emerald-500/25 px-1 py-0.2 rounded border border-emerald-500/30">
                      {settings.gridSpacing && settings.gridSpacing > 1 ? `${settings.gridSpacing}px` : '8px'}
                    </span>
                  )}
                </button>

                {/* Quick grid size selector for snapping */}
                {settings.snapToGrid && (
                  <div className="flex items-center gap-0.5 bg-slate-800/80 p-0.5 rounded-md border border-slate-700/60">
                    {[2, 4, 8, 16, 32].map(sp => (
                      <button
                        key={sp}
                        onClick={() => onUpdateSettings({ gridSpacing: sp, gridVisible: true })}
                        title={`Snap shapes to ${sp}px grid`}
                        className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold transition-all ${
                          (settings.gridSpacing ?? 1) === sp
                            ? 'bg-emerald-500 text-slate-950 font-black shadow-xs'
                            : 'text-slate-400 hover:text-white hover:bg-slate-700'
                        }`}
                      >
                        {sp}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Pressure Sensitivity Toggle & Controls */}
            {(activeTool === 'pencil' || activeTool === 'eraser' || activeTool === 'dither' || activeTool === 'mirror') && (
              <div className="relative flex items-center gap-1 pr-2 border-r border-slate-800">
                <button
                  onClick={() => onUpdateSettings({ pressureSensitivity: !settings.pressureSensitivity })}
                  title={
                    settings.pressureSensitivity
                      ? 'Pressure Sensitivity: ON (Stylus/Touch dynamic size & opacity)'
                      : 'Pressure Sensitivity: OFF (Click to enable stylus force/pressure)'
                  }
                  className={`px-2 py-1 rounded-md flex items-center gap-1.5 transition-all active:scale-95 text-[11px] font-medium ${
                    settings.pressureSensitivity
                      ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 shadow-xs'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800 border border-transparent'
                  }`}
                >
                  <Gauge className={`w-3.5 h-3.5 ${settings.pressureSensitivity ? 'text-sky-400' : 'text-slate-400'}`} />
                  <span>Pressure</span>
                  {settings.pressureSensitivity && (
                    <span className="text-[10px] font-mono text-sky-300 font-bold bg-sky-500/20 px-1 py-0.2 rounded border border-sky-500/30">
                      ON
                    </span>
                  )}
                </button>

                {/* Pressure Settings Popover Trigger */}
                {settings.pressureSensitivity && (
                  <div className="relative">
                    <button
                      onClick={() => setIsPressureMenuOpen(!isPressureMenuOpen)}
                      title="Adjust Pressure Sensitivity Settings"
                      className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800"
                    >
                      <ChevronDown className="w-3 h-3" />
                    </button>

                    {isPressureMenuOpen && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setIsPressureMenuOpen(false)} />
                        <div className="absolute top-8 left-0 z-50 w-64 bg-slate-900 border border-slate-700/80 rounded-2xl p-3 shadow-2xl backdrop-blur-2xl text-xs space-y-2.5 animate-scale-fade">
                          <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
                            <span className="font-bold text-white flex items-center gap-1.5 text-[11px]">
                              <Gauge className="w-3.5 h-3.5 text-sky-400" />
                              <span>Stylus Pressure Controls</span>
                            </span>
                            <span className="text-[10px] font-mono font-bold text-sky-400">
                              Enabled
                            </span>
                          </div>

                          {/* Dynamic Targets Checkboxes */}
                          <div className="space-y-1.5">
                            <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Modulation Targets</div>

                            <label className="flex items-center justify-between p-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-800 border border-slate-700/50 cursor-pointer transition-colors">
                              <span className="text-slate-200 text-[11px]">Dynamic Brush Size</span>
                              <input
                                type="checkbox"
                                checked={settings.pressureAffectsSize !== false}
                                onChange={e => onUpdateSettings({ pressureAffectsSize: e.target.checked })}
                                className="w-3.5 h-3.5 accent-sky-500 rounded cursor-pointer"
                              />
                            </label>

                            <label className="flex items-center justify-between p-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-800 border border-slate-700/50 cursor-pointer transition-colors">
                              <span className="text-slate-200 text-[11px]">Dynamic Stroke Opacity</span>
                              <input
                                type="checkbox"
                                checked={settings.pressureAffectsOpacity !== false}
                                onChange={e => onUpdateSettings({ pressureAffectsOpacity: e.target.checked })}
                                className="w-3.5 h-3.5 accent-sky-500 rounded cursor-pointer"
                              />
                            </label>
                          </div>

                          {/* Interactive Pressure Sensor Test Pad */}
                          <div className="pt-2 border-t border-slate-800 space-y-1.5">
                            <div className="flex items-center justify-between text-[10px] text-slate-400">
                              <span className="flex items-center gap-1">
                                <Activity className="w-3 h-3 text-sky-400" />
                                <span>Stylus / Pen Test Pad</span>
                              </span>
                              <span className="font-mono text-sky-300 font-bold">
                                {liveTestPressure !== null ? `${Math.round(liveTestPressure * 100)}%` : 'Press below'}
                              </span>
                            </div>

                            <div
                              onPointerDown={e => {
                                const p = e.pressure > 0 ? e.pressure : 0.5;
                                setLiveTestPressure(p);
                              }}
                              onPointerMove={e => {
                                if (e.buttons > 0) {
                                  const p = e.pressure > 0 ? e.pressure : 0.5;
                                  setLiveTestPressure(p);
                                }
                              }}
                              onPointerUp={() => setLiveTestPressure(null)}
                              onPointerLeave={() => setLiveTestPressure(null)}
                              className="h-10 rounded-xl bg-slate-950 border border-dashed border-slate-700/80 hover:border-sky-500/50 flex flex-col items-center justify-center cursor-crosshair select-none relative overflow-hidden"
                            >
                              {liveTestPressure !== null && (
                                <div
                                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-sky-500/20 via-sky-500/40 to-sky-400/60 transition-all duration-75"
                                  style={{ width: `${Math.round(liveTestPressure * 100)}%` }}
                                />
                              )}
                              <span className="relative z-10 text-[10px] text-slate-400 font-medium pointer-events-none">
                                {liveTestPressure !== null
                                  ? `Detected: ${(liveTestPressure * 100).toFixed(0)}% force`
                                  : 'Press pen/stylus here to test force'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Mirror Tool Axis Selector */}
            {activeTool === 'mirror' ? (
              <div className="flex items-center gap-1 pr-2 border-r border-slate-800 bg-amber-500/10 px-1.5 py-0.5 rounded-lg border border-amber-500/20">
                <span className="text-[10px] text-amber-400 font-bold px-0.5">Axis:</span>
                <button
                  onClick={() => onUpdateSettings({ mirrorAxis: 'horizontal' })}
                  title="Horizontal Mirror (Left-Right reflection)"
                  className={`p-1 rounded-md flex items-center gap-1 transition-all ${
                    settings.mirrorAxis === 'horizontal'
                      ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <FlipHorizontal className="w-3.5 h-3.5" />
                  <span className="text-[10px] hidden sm:inline">Horiz</span>
                </button>
                <button
                  onClick={() => onUpdateSettings({ mirrorAxis: 'vertical' })}
                  title="Vertical Mirror (Top-Bottom reflection)"
                  className={`p-1 rounded-md flex items-center gap-1 transition-all ${
                    settings.mirrorAxis === 'vertical'
                      ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <FlipVertical className="w-3.5 h-3.5" />
                  <span className="text-[10px] hidden sm:inline">Vert</span>
                </button>
                <button
                  onClick={() => onUpdateSettings({ mirrorAxis: 'both' })}
                  title="Dual Mirror (4-Way reflection)"
                  className={`p-1 rounded-md flex items-center gap-1 transition-all ${
                    settings.mirrorAxis === 'both'
                      ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span className="text-[10px] hidden sm:inline">Dual</span>
                </button>
              </div>
            ) : (
              /* Symmetry Controls (Icon only for other tools) */
              <div className="flex items-center gap-1 pr-2 border-r border-slate-800">
                <button
                  onClick={() => {
                    const next: Record<SymmetryMode, SymmetryMode> = {
                      none: 'horizontal',
                      horizontal: 'vertical',
                      vertical: 'quad',
                      quad: 'radial',
                      radial: 'none'
                    };
                    onUpdateSettings({ symmetry: next[settings.symmetry] });
                  }}
                  className={`p-1 rounded-md transition-colors flex items-center gap-1 ${
                    settings.symmetry !== 'none'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                  title={`Symmetry: ${settings.symmetry.toUpperCase()} (Click to cycle)`}
                >
                  {settings.symmetry === 'horizontal' ? (
                    <FlipHorizontal className="w-3.5 h-3.5 text-amber-400" />
                  ) : settings.symmetry === 'vertical' ? (
                    <FlipVertical className="w-3.5 h-3.5 text-amber-400" />
                  ) : settings.symmetry === 'quad' ? (
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  ) : settings.symmetry === 'radial' ? (
                    <Compass className="w-3.5 h-3.5 text-sky-400" />
                  ) : (
                    <FlipHorizontal className="w-3.5 h-3.5 opacity-40" />
                  )}
                  {settings.symmetry !== 'none' && (
                    <span className="text-[10px] font-bold capitalize hidden sm:inline">
                      {settings.symmetry}
                    </span>
                  )}
                </button>

                {/* Rotatable Guide Angle Controls (when symmetry active) */}
                {settings.symmetry !== 'none' && (
                  <div className="flex items-center gap-1 bg-slate-800/80 px-1 py-0.5 rounded border border-slate-700/60">
                    <button
                      onClick={() => {
                        const cur = settings.symmetryAngle || 0;
                        const nextAngle = (cur + 15) % 360;
                        onUpdateSettings({ symmetryAngle: nextAngle });
                      }}
                      title={`Rotate Symmetry Guide (+15°). Current: ${settings.symmetryAngle || 0}°`}
                      className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[10px] font-mono font-bold text-sky-400 hover:text-white hover:bg-slate-700 transition-colors"
                    >
                      <RotateCw className="w-2.5 h-2.5 text-amber-400" />
                      <span>{settings.symmetryAngle || 0}°</span>
                    </button>

                    {(settings.symmetryAngle || 0) !== 0 && (
                      <button
                        onClick={() => onUpdateSettings({ symmetryAngle: 0 })}
                        title="Reset Guide Angle to 0°"
                        className="px-1 py-0.5 rounded text-[9px] font-mono text-slate-400 hover:text-white hover:bg-slate-700"
                      >
                        Reset
                      </button>
                    )}

                    {/* Radial Rays selector if radial */}
                    {settings.symmetry === 'radial' && (
                      <div className="flex items-center gap-0.5 border-l border-slate-700 pl-1">
                        {[4, 6, 8, 12].map(r => (
                          <button
                            key={r}
                            onClick={() => onUpdateSettings({ symmetryRays: r })}
                            title={`${r} Radial Rays`}
                            className={`px-1 py-0.2 rounded text-[9px] font-mono font-bold ${
                              (settings.symmetryRays || 8) === r
                                ? 'bg-sky-500 text-white'
                                : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            {r}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Toggle Guide Overlay Visibility */}
                    <button
                      onClick={() => onUpdateSettings({ symmetryGuideVisible: settings.symmetryGuideVisible === false })}
                      title={settings.symmetryGuideVisible === false ? 'Show Symmetry Guide Overlay' : 'Hide Symmetry Guide Overlay'}
                      className={`p-0.5 rounded text-[10px] ${
                        settings.symmetryGuideVisible !== false
                          ? 'text-sky-400 hover:text-sky-300'
                          : 'text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      {settings.symmetryGuideVisible !== false ? (
                        <Eye className="w-3 h-3" />
                      ) : (
                        <EyeOff className="w-3 h-3" />
                      )}
                    </button>

                    {/* Toggle Concentric Rings */}
                    <button
                      onClick={() => onUpdateSettings({ symmetryGuideRings: settings.symmetryGuideRings === false })}
                      title={settings.symmetryGuideRings === false ? 'Show Radial Guide Rings' : 'Hide Radial Guide Rings'}
                      className={`p-0.5 rounded text-[10px] ${
                        settings.symmetryGuideRings !== false
                          ? 'text-sky-400 hover:text-sky-300'
                          : 'text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      <Disc className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Dither pattern selector (when dither tool is selected) */}
            {activeTool === 'dither' && (
              <div className="flex items-center gap-1 pr-2 border-r border-slate-800">
                {(['checker', 'light', 'dense', 'bayer'] as DitherType[]).map(pat => (
                  <button
                    key={pat}
                    onClick={() => onUpdateSettings({ ditherPattern: pat })}
                    title={`Dither: ${pat}`}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-mono capitalize transition-colors ${
                      settings.ditherPattern === pat
                        ? 'bg-sky-500 text-white font-bold'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    {pat[0].toUpperCase()}
                  </button>
                ))}
              </div>
            )}
          </>
        )) : (
          /* 3D Context Controls */
          <div className="flex items-center gap-1 pr-2 border-r border-slate-800">
            <button
              onClick={() => onUpdateSettings({ voxelSymmetryX: !settings.voxelSymmetryX })}
              title="Mirror X Axis"
              className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors ${
                settings.voxelSymmetryX
                  ? 'bg-sky-500 text-white font-bold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              X-Sym
            </button>
            <button
              onClick={() => onUpdateSettings({ voxelSymmetryZ: !settings.voxelSymmetryZ })}
              title="Mirror Z Axis"
              className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors ${
                settings.voxelSymmetryZ
                  ? 'bg-sky-500 text-white font-bold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              Z-Sym
            </button>
          </div>
        )}
      </div>

      {/* Right side: Viewport & Grid Controls */}
      <div className="flex items-center gap-1.5 shrink-0">
        {mode === '2d' && (
          <>
            {/* Onion Skinning Toggle */}
            <button
              onClick={() => onUpdateSettings({ onionSkin: !settings.onionSkin })}
              className={`p-1 rounded-md transition-colors ${
                settings.onionSkin
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-xs'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
              title={
                settings.onionSkin
                  ? 'Onion Skin: ON (Previous frame ghosted beneath active layer)'
                  : 'Onion Skin: OFF (Click to toggle onion skinning)'
              }
            >
              <Ghost className="w-3.5 h-3.5" />
            </button>

            <div className="w-px h-4 bg-slate-800/80 mx-0.5" />

            {/* Grid Visibility Toggle Button */}
            <button
              onClick={() => onUpdateSettings({ gridVisible: !settings.gridVisible })}
              className={`px-1.5 py-1 rounded-md transition-all flex items-center gap-1 text-[11px] font-medium ${
                settings.gridVisible
                  ? 'bg-sky-500/20 text-sky-400 border border-sky-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
              title={settings.gridVisible ? 'Hide Grid' : 'Show Grid'}
            >
              <Grid3X3 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Grid</span>
            </button>

            {/* Snap to Grid Global Toggle Button */}
            <button
              onClick={() => {
                const nextSnap = !settings.snapToGrid;
                onUpdateSettings({
                  snapToGrid: nextSnap,
                  ...(nextSnap && (!settings.gridSpacing || settings.gridSpacing <= 1) ? {
                    gridSpacing: 8,
                    gridVisible: true
                  } : {}),
                  ...(nextSnap && !settings.gridVisible ? { gridVisible: true } : {})
                });
              }}
              className={`px-1.5 py-1 rounded-md transition-all flex items-center gap-1 text-[11px] font-medium ${
                settings.snapToGrid
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-xs'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
              title={
                settings.snapToGrid
                  ? `Snap to Grid: ON (${settings.gridSpacing && settings.gridSpacing > 1 ? settings.gridSpacing : 8}px spacing - Shift+S)`
                  : 'Snap to Grid: OFF (Click to snap shapes to grid - Shift+S)'
              }
            >
              <Magnet className={`w-3.5 h-3.5 ${settings.snapToGrid ? 'text-emerald-400' : 'text-slate-400'}`} />
              <span className="hidden sm:inline">Snap</span>
            </button>

            {/* Grid Spacing Slider Control */}
            <div 
              className="flex items-center gap-1 bg-slate-800/60 px-2 py-0.5 rounded-md border border-slate-700/60"
              title={`Grid Spacing: ${settings.gridSpacing ?? 1}px`}
            >
              <span className="text-[10px] text-slate-400 font-medium hidden md:inline">Space:</span>
              <input
                type="range"
                min="1"
                max="32"
                step="1"
                value={settings.gridSpacing ?? 1}
                onChange={(e) => {
                  const val = Math.max(1, parseInt(e.target.value, 10) || 1);
                  onUpdateSettings({ 
                    gridSpacing: val,
                    gridVisible: true 
                  });
                }}
                className="w-14 sm:w-16 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-sky-500"
              />
              <span className="text-[10px] font-mono font-bold text-sky-400 min-w-[24px] text-right">
                {settings.gridSpacing ?? 1}px
              </span>

              {/* Quick Spacing Preset Pills */}
              <div className="hidden lg:flex items-center gap-0.5 ml-0.5 border-l border-slate-700/60 pl-1">
                {[1, 4, 8, 16, 32].map(px => (
                  <button
                    key={px}
                    onClick={() => onUpdateSettings({ gridSpacing: px, gridVisible: true })}
                    title={`Set grid to ${px}px spacing`}
                    className={`px-1 py-0.5 rounded text-[9px] font-mono font-bold transition-all ${
                      (settings.gridSpacing ?? 1) === px
                        ? 'bg-sky-500 text-white font-bold'
                        : 'text-slate-400 hover:text-white hover:bg-slate-700'
                    }`}
                  >
                    {px}
                  </button>
                ))}
              </div>
            </div>

            {/* Grid Opacity Slider Control */}
            <div 
              className="flex items-center gap-1 bg-slate-800/60 px-2 py-0.5 rounded-md border border-slate-700/60"
              title={`Grid Opacity: ${Math.round((settings.gridOpacity ?? 0.25) * 100)}%`}
            >
              <span className="text-[10px] text-slate-400 font-medium hidden md:inline">Opacity:</span>
              <input
                type="range"
                min="0.05"
                max="1"
                step="0.05"
                value={settings.gridOpacity ?? 0.25}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  onUpdateSettings({ 
                    gridOpacity: val,
                    gridVisible: true 
                  });
                }}
                className="w-14 sm:w-16 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-sky-500"
              />
              <span className="text-[10px] font-mono font-bold text-sky-400 min-w-[28px] text-right">
                {Math.round((settings.gridOpacity ?? 0.25) * 100)}%
              </span>
            </div>

            {/* Tile 16x16 Grid Toggle */}
            <button
              onClick={() => onUpdateSettings({ tileGridVisible: !settings.tileGridVisible })}
              className={`p-1 rounded-md transition-colors ${
                settings.tileGridVisible
                  ? 'bg-slate-800 text-amber-400 border border-slate-700'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
              title="Tile Grid (16x16 boundaries)"
            >
              <Columns className="w-3.5 h-3.5" />
            </button>
          </>
        )}
      </div>

      {/* Tool Presets Modal */}
      <ToolPresetsModal
        isOpen={isPresetsModalOpen}
        onClose={() => setIsPresetsModalOpen(false)}
        currentTool={activeTool}
        currentSettings={settings}
        onApplyPreset={(preset) => {
          if (onSelectTool && preset.tool) {
            onSelectTool(preset.tool);
          }
          onUpdateSettings({
            brushSize: preset.brushSize,
            brushShape: preset.brushShape,
            opacity: preset.opacity,
            symmetry: preset.symmetry,
            symmetryAngle: preset.symmetryAngle,
            symmetryRays: preset.symmetryRays,
            ditherPattern: preset.ditherPattern,
            mirrorAxis: preset.mirrorAxis,
            ...(preset.customBrushPattern !== undefined && {
              customBrushPattern: preset.customBrushPattern
            }),
            ...(preset.stabilization !== undefined && {
              stabilization: preset.stabilization,
              stabilizationWeight: preset.stabilizationWeight ?? settings.stabilizationWeight
            }),
            ...(preset.pressureSensitivity !== undefined && {
              pressureSensitivity: preset.pressureSensitivity,
              pressureAffectsSize: preset.pressureAffectsSize ?? settings.pressureAffectsSize,
              pressureAffectsOpacity: preset.pressureAffectsOpacity ?? settings.pressureAffectsOpacity
            })
          });
        }}
      />

      {/* Brush Pattern Library Modal */}
      <BrushLibrary
        isOpen={isBrushLibraryOpen}
        onClose={() => setIsBrushLibraryOpen(false)}
        currentCustomBrush={settings.customBrushPattern}
        onSelectBrush={(brush) => {
          onUpdateSettings({
            brushShape: 'custom',
            customBrushPattern: brush
          });
        }}
        selection={selection}
        activeLayerPixels={activeLayerPixels}
        canvasWidth={canvasWidth}
        canvasHeight={canvasHeight}
        activeColor={activeColor}
      />
    </div>
  );
};
