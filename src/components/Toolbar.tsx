import React, { useState } from 'react';
import { 
  Pencil, 
  Eraser, 
  PaintBucket, 
  Pipette, 
  Minus, 
  Square, 
  Circle, 
  Diamond, 
  Scan, 
  Grid2X2, 
  Palette,
  ChevronLeft,
  X,
  Sliders,
  Sparkles,
  FlipHorizontal,
  FlipVertical,
  Scissors,
  Copy,
  ClipboardPaste,
  Trash2,
  Lock,
  Plus,
  Compass,
  RotateCw,
  Ghost,
  Magnet
} from 'lucide-react';
import { ToolType, LayoutSettings, ToolSettings, SymmetryMode, MirrorAxis, DitherType, BrushShape, SelectionArea } from '../types/sprite';
import { PRESET_PALETTES } from '../utils/palettes';
import { BRUSH_SHAPES, DEFAULT_CUSTOM_BRUSHES } from '../utils/brushShapes';
import { BrushShapeIcon } from './BrushShapeIcon';
import { 
  sortColorsByHue, 
  sortColorsBySaturation, 
  sortColorsByBrightness, 
  generateComplementaryPalette,
  getComplementaryColor
} from '../utils/colorUtils';

interface ToolbarProps {
  activeTool: ToolType;
  onSelectTool: (tool: ToolType) => void;
  activeColor: string;
  secondaryColor: string;
  onSelectColor: (color: string) => void;
  onSwapColors: () => void;
  palette: string[];
  onSelectPalettePreset: (colors: string[]) => void;
  onUpdatePalette?: (colors: string[]) => void;
  layoutSettings: LayoutSettings;
  toolSettings: ToolSettings;
  onUpdateToolSettings: (settings: Partial<ToolSettings>) => void;
  mode: '2d' | '3d';
  onHideToolbar?: () => void;
  selection?: SelectionArea | null;
  hasClipboard?: boolean;
  onCut?: () => void;
  onCopy?: () => void;
  onPaste?: () => void;
  onDelete?: () => void;
  onSelectAll?: () => void;
  onDeselect?: () => void;
  isLayerLocked?: boolean;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  activeTool,
  onSelectTool,
  activeColor,
  secondaryColor,
  onSelectColor,
  onSwapColors,
  palette,
  onSelectPalettePreset,
  onUpdatePalette,
  layoutSettings,
  toolSettings,
  onUpdateToolSettings,
  mode,
  onHideToolbar,
  selection,
  hasClipboard,
  onCut,
  onCopy,
  onPaste,
  onDelete,
  onSelectAll,
  onDeselect,
  isLayerLocked
}) => {
  // Flyout popover for the active or tapped tool
  const [openFlyout, setOpenFlyout] = useState<ToolType | 'palette' | 'onionSkin' | null>(null);
  const [activeSort, setActiveSort] = useState<'hue' | 'sat' | 'bri' | null>(null);

  // Icon only tools list - NO text description
  const tools: { type: ToolType; icon: React.ReactNode; label: string }[] = [
    { type: 'pencil', icon: <Pencil className="w-5 h-5" />, label: 'Pencil' },
    { type: 'mirror', icon: <FlipHorizontal className="w-5 h-5" />, label: 'Mirror Brush' },
    { type: 'eraser', icon: <Eraser className="w-5 h-5" />, label: 'Eraser' },
    { type: 'bucket', icon: <PaintBucket className="w-5 h-5" />, label: 'Paint Bucket' },
    { type: 'picker', icon: <Pipette className="w-5 h-5" />, label: 'Color Picker' },
    { type: 'line', icon: <Minus className="w-5 h-5" />, label: 'Line' },
    { type: 'rect', icon: <Square className="w-5 h-5" />, label: 'Rectangle' },
    { type: 'circle', icon: <Circle className="w-5 h-5" />, label: 'Circle' },
    { type: 'select', icon: <Scan className="w-5 h-5" />, label: 'Marquee' },
    { type: 'dither', icon: <Grid2X2 className="w-5 h-5" />, label: 'Dither Brush' }
  ];

  const isBottom = layoutSettings.toolbarPosition === 'bottom';

  // Handle clicking a tool: always select it, and toggle its specific settings card!
  const handleToolClick = (toolType: ToolType) => {
    onSelectTool(toolType);
    if (openFlyout === toolType) {
      setOpenFlyout(null);
    } else {
      setOpenFlyout(toolType);
    }
  };

  return (
    <>
      <aside
        className={`z-30 flex relative ${
          isBottom
            ? 'flex-row items-center justify-between w-full border-t border-slate-800 bg-slate-900/95 px-2 py-1.5'
            : 'flex-col justify-between h-full border-slate-800 bg-slate-900/95 py-2 px-1 w-12 sm:w-14'
        } ${
          layoutSettings.toolbarPosition === 'left' ? 'border-r' : ''
        } ${
          layoutSettings.toolbarPosition === 'right' ? 'border-l' : ''
        } backdrop-blur-md select-none transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]`}
      >
        {/* Hide Toolbar Trigger Button */}
        {onHideToolbar && !isBottom && (
          <button
            onClick={onHideToolbar}
            title="Hide Toolbar (Maximize Canvas)"
            className="w-full flex items-center justify-center py-1 text-slate-500 hover:text-white rounded hover:bg-slate-800 mb-1 transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
        )}

        {/* 2D Tools List - Pure Icon Only */}
        {mode === '2d' ? (
          <div
            className={`flex ${
              isBottom
                ? 'flex-row items-center gap-1 overflow-x-auto py-0.5'
                : 'flex-col items-center gap-1 overflow-y-auto max-h-[calc(100vh-170px)]'
            }`}
          >
            {tools.map(tool => {
              const isActive = activeTool === tool.type;
              const isFlyoutOpen = openFlyout === tool.type;

              return (
                <div key={tool.type} className="relative">
                  <button
                    onClick={() => handleToolClick(tool.type)}
                    title={`${tool.label} (Tap to adjust settings)`}
                    className={`relative p-2 rounded-xl transition-all flex items-center justify-center ${
                      isActive
                        ? 'bg-sky-500 text-white shadow-md scale-105'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 active:scale-95'
                    }`}
                  >
                    {tool.icon}
                    {isActive && (
                      <span className="absolute bottom-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-white shadow" />
                    )}
                    {isFlyoutOpen && (
                      <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-400 border border-slate-900 shadow animate-pulse" />
                    )}
                  </button>
                </div>
              );
            })}

            {/* Divider */}
            <div className={`${isBottom ? 'w-px h-6 bg-slate-800/80 mx-0.5' : 'w-6 h-px bg-slate-800/80 my-1'}`} />

            {/* Onion Skin Toggle Button */}
            <div className="relative">
              <button
                onClick={() => onUpdateToolSettings({ onionSkin: !toolSettings.onionSkin })}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setOpenFlyout(openFlyout === 'onionSkin' ? null : 'onionSkin');
                }}
                title={
                  toolSettings.onionSkin
                    ? 'Onion Skin: ON (Ghosted previous frame beneath active layer - Right-click for settings)'
                    : 'Onion Skin: OFF (Click to display ghosted previous frame beneath active layer)'
                }
                className={`relative p-2 rounded-xl transition-all flex items-center justify-center ${
                  toolSettings.onionSkin
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/50 shadow-md scale-105'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 active:scale-95'
                }`}
              >
                <Ghost className="w-5 h-5" />
                {toolSettings.onionSkin && (
                  <span className="absolute bottom-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-amber-400 shadow animate-pulse" />
                )}
                {openFlyout === 'onionSkin' && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-400 border border-slate-900 shadow animate-pulse" />
                )}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1 text-xs text-slate-400 font-mono py-2">
            <span className="p-1.5 bg-slate-800/80 rounded-lg text-sky-400 text-[10px] font-bold">3D</span>
          </div>
        )}

        {/* Color Swatch & Palette Section */}
        <div
          className={`flex ${
            isBottom
              ? 'flex-row items-center gap-2'
              : 'flex-col items-center gap-2 mt-auto pt-1 border-t border-slate-800/80'
          }`}
        >
          {/* Active & Secondary Color Swatches */}
          <div className="relative w-8 h-8">
            <div
              onClick={onSwapColors}
              title="Swap Colors"
              className="absolute bottom-0 right-0 w-5 h-5 rounded-md border-2 border-slate-700 cursor-pointer shadow-md active:scale-90 transition-transform"
              style={{ backgroundColor: secondaryColor }}
            />
            <label
              title="Primary Color"
              className="absolute top-0 left-0 w-5 h-5 rounded-md border-2 border-white cursor-pointer shadow-lg active:scale-90 transition-transform overflow-hidden"
              style={{ backgroundColor: activeColor }}
            >
              <input
                type="color"
                value={activeColor}
                onChange={e => onSelectColor(e.target.value)}
                className="opacity-0 w-full h-full cursor-pointer"
              />
            </label>
          </div>

          {/* Palette Selector Trigger */}
          <button
            onClick={() => setOpenFlyout(openFlyout === 'palette' ? null : 'palette')}
            title="Color Palette Presets"
            className={`p-1.5 rounded-xl transition-colors ${
              openFlyout === 'palette'
                ? 'bg-amber-500 text-slate-950 font-bold shadow'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Palette className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* FIXED VIEWPORT SETTINGS POPOVER (Never clipped by overflow!) */}
      {openFlyout !== null && (
        <>
          {/* Backdrop to close when tapping outside */}
          <div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[1px] transition-opacity animate-scale-fade"
            onClick={() => setOpenFlyout(null)}
          />

          {/* Floating Settings Card */}
          <div
            className="fixed z-50 bg-slate-900/98 border border-slate-700/80 rounded-2xl p-4 shadow-2xl backdrop-blur-2xl text-xs text-slate-200 transition-all max-w-[90vw] w-72 bottom-16 left-3 right-3 sm:bottom-auto sm:right-auto sm:left-16 sm:top-14 animate-scale-fade"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-sky-400" />
                <span className="font-bold text-sm text-white capitalize">
                  {openFlyout === 'palette'
                    ? 'Color Palette'
                    : openFlyout === 'onionSkin'
                    ? 'Onion Skin Settings'
                    : `${openFlyout} Settings`}
                </span>
              </div>
              <button
                onClick={() => setOpenFlyout(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Onion Skin Settings Flyout */}
            {openFlyout === 'onionSkin' && (
              <div className="space-y-3.5">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <Ghost className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-semibold text-slate-200">Onion Skinning</span>
                  </div>
                  <button
                    onClick={() => onUpdateToolSettings({ onionSkin: !toolSettings.onionSkin })}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                      toolSettings.onionSkin
                        ? 'bg-amber-500 text-slate-950 shadow-sm'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {toolSettings.onionSkin ? 'ACTIVE' : 'INACTIVE'}
                  </button>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-slate-300">
                    <span className="font-medium">Ghost Opacity</span>
                    <span className="font-mono text-amber-400 font-bold">
                      {Math.round((toolSettings.onionSkinOpacity ?? 0.5) * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="1.0"
                    step="0.05"
                    value={toolSettings.onionSkinOpacity ?? 0.5}
                    onChange={(e) => onUpdateToolSettings({ onionSkinOpacity: parseFloat(e.target.value) })}
                    className="w-full accent-amber-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                    <span>10% (Faint)</span>
                    <span>100% (Solid)</span>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 text-[11px] text-slate-400 leading-relaxed">
                  Renders a translucent ghost of the previous frame directly beneath the active layer to guide fluid animation timing and spacing.
                </div>
              </div>
            )}

            {/* Pencil Settings */}
            {openFlyout === 'pencil' && (
              <div className="space-y-3.5">
                {/* Brush Size */}
                <div>
                  <div className="text-[11px] text-slate-400 font-medium mb-1.5 flex items-center justify-between">
                    <span>Brush Size</span>
                    <span className="font-mono text-white font-bold bg-slate-800 px-2 py-0.5 rounded">
                      {toolSettings.brushSize}px
                    </span>
                  </div>
                  <div className="grid grid-cols-6 gap-1">
                    {[1, 2, 3, 4, 6, 8].map(sz => (
                      <button
                        key={sz}
                        onClick={() => onUpdateToolSettings({ brushSize: sz })}
                        className={`py-1.5 rounded-lg font-mono text-xs font-bold transition-all ${
                          toolSettings.brushSize === sz
                            ? 'bg-sky-500 text-white shadow-md scale-105'
                            : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
                        }`}
                      >
                        {sz}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Brush Shape Library */}
                <div>
                  <div className="text-[11px] text-slate-400 font-medium mb-1.5 flex items-center justify-between">
                    <span>Brush Shape ({BRUSH_SHAPES.length})</span>
                    <span className="font-mono text-purple-400 font-bold capitalize bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded text-[10px] flex items-center gap-1">
                      <BrushShapeIcon shape={toolSettings.brushShape} className="w-3 h-3 text-purple-400" />
                      <span>{toolSettings.brushShape}</span>
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-1 max-h-32 overflow-y-auto pr-0.5">
                    {BRUSH_SHAPES.map(shp => {
                      const isSelected = toolSettings.brushShape === shp.id;
                      return (
                        <button
                          key={shp.id}
                          onClick={() => {
                            if (shp.id === 'custom' && !toolSettings.customBrushPattern && DEFAULT_CUSTOM_BRUSHES[0]) {
                              onUpdateToolSettings({ 
                                brushShape: 'custom', 
                                customBrushPattern: DEFAULT_CUSTOM_BRUSHES[0] 
                              });
                            } else {
                              onUpdateToolSettings({ brushShape: shp.id });
                            }
                          }}
                          title={`${shp.label} - ${shp.description}`}
                          className={`py-1.5 px-1 rounded-lg text-[10px] font-semibold flex flex-col items-center justify-center gap-1 transition-all ${
                            isSelected
                              ? 'bg-purple-500 text-white shadow-md font-bold'
                              : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700'
                          }`}
                        >
                          <BrushShapeIcon shape={shp.id} className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-purple-400'}`} />
                          <span className="truncate max-w-[50px] text-[9px] leading-tight">{shp.shortLabel}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Mirror Symmetry */}
                <div>
                  <div className="text-[11px] text-slate-400 font-medium mb-1.5 flex items-center justify-between">
                    <span>Symmetry Guide & Mode</span>
                    <span className="font-mono text-amber-400 font-bold capitalize bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/30 text-[10px]">
                      {toolSettings.symmetry}
                    </span>
                  </div>
                  <div className="grid grid-cols-5 gap-1 mb-2">
                    {[
                      { id: 'none', label: 'Off' },
                      { id: 'horizontal', label: 'Horiz' },
                      { id: 'vertical', label: 'Vert' },
                      { id: 'quad', label: 'Quad' },
                      { id: 'radial', label: 'Radial' }
                    ].map(sym => (
                      <button
                        key={sym.id}
                        onClick={() => onUpdateToolSettings({ symmetry: sym.id as SymmetryMode })}
                        className={`py-1.5 rounded-lg text-xs font-semibold transition-all ${
                          toolSettings.symmetry === sym.id
                            ? 'bg-amber-500 text-slate-950 font-bold shadow'
                            : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
                        }`}
                      >
                        {sym.label}
                      </button>
                    ))}
                  </div>

                  {toolSettings.symmetry !== 'none' && (
                    <div className="space-y-2 p-2 bg-slate-950/50 rounded-xl border border-slate-800/80 text-[11px]">
                      {/* Guide Rotation Angle */}
                      <div>
                        <div className="flex items-center justify-between text-slate-400 mb-1">
                          <span className="flex items-center gap-1">
                            <RotateCw className="w-3 h-3 text-sky-400" />
                            <span>Guide Rotation</span>
                          </span>
                          <span className="font-mono text-sky-400 font-bold">
                            {toolSettings.symmetryAngle || 0}°
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="360"
                          step="5"
                          value={toolSettings.symmetryAngle || 0}
                          onChange={e => onUpdateToolSettings({ symmetryAngle: parseInt(e.target.value, 10) })}
                          className="w-full accent-sky-500 cursor-pointer h-1.5 bg-slate-700 rounded-lg appearance-none"
                        />
                        <div className="flex items-center justify-between mt-1 gap-1">
                          {[0, 15, 30, 45, 90, 180].map(deg => (
                            <button
                              key={deg}
                              onClick={() => onUpdateToolSettings({ symmetryAngle: deg })}
                              className={`px-1.5 py-0.5 rounded text-[9px] font-mono ${
                                (toolSettings.symmetryAngle || 0) === deg
                                  ? 'bg-sky-500 text-white font-bold'
                                  : 'bg-slate-800 text-slate-400 hover:text-white'
                              }`}
                            >
                              {deg}°
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Radial Rays if radial */}
                      {toolSettings.symmetry === 'radial' && (
                        <div>
                          <div className="text-slate-400 mb-1">Radial Spokes / Rays</div>
                          <div className="grid grid-cols-4 gap-1">
                            {[4, 6, 8, 12].map(r => (
                              <button
                                key={r}
                                onClick={() => onUpdateToolSettings({ symmetryRays: r })}
                                className={`py-1 rounded text-[10px] font-mono font-bold ${
                                  (toolSettings.symmetryRays || 8) === r
                                    ? 'bg-sky-500 text-white'
                                    : 'bg-slate-800 text-slate-400 hover:text-white'
                                }`}
                              >
                                {r} Rays
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Guide overlay & rings toggles */}
                      <div className="flex items-center justify-between pt-1 border-t border-slate-800">
                        <label className="flex items-center gap-1.5 cursor-pointer text-slate-300">
                          <input
                            type="checkbox"
                            checked={toolSettings.symmetryGuideVisible !== false}
                            onChange={e => onUpdateToolSettings({ symmetryGuideVisible: e.target.checked })}
                            className="rounded accent-sky-500 cursor-pointer"
                          />
                          <span>Visual Guide</span>
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer text-slate-300">
                          <input
                            type="checkbox"
                            checked={toolSettings.symmetryGuideRings !== false}
                            onChange={e => onUpdateToolSettings({ symmetryGuideRings: e.target.checked })}
                            className="rounded accent-sky-500 cursor-pointer"
                          />
                          <span>Radial Rings</span>
                        </label>
                      </div>
                    </div>
                  )}
                </div>

                {/* Opacity Slider */}
                <div>
                  <div className="text-[11px] text-slate-400 font-medium mb-1.5 flex items-center justify-between">
                    <span>Stroke Opacity</span>
                    <span className="font-mono text-white font-bold">
                      {Math.round(toolSettings.opacity * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="1"
                    step="0.05"
                    value={toolSettings.opacity}
                    onChange={e => onUpdateToolSettings({ opacity: parseFloat(e.target.value) })}
                    className="w-full accent-sky-500 cursor-pointer"
                  />
                </div>
              </div>
            )}

            {/* Mirror Settings */}
            {openFlyout === 'mirror' && (
              <div className="space-y-3.5">
                {/* Mirror Axis */}
                <div>
                  <div className="text-[11px] text-slate-400 font-medium mb-1.5 flex items-center justify-between">
                    <span>Mirror Reflection Axis</span>
                    <span className="font-mono text-amber-400 font-bold capitalize bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
                      {toolSettings.mirrorAxis === 'both' ? 'Dual (4-Way)' : `${toolSettings.mirrorAxis}`}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { id: 'horizontal', label: 'Horiz', icon: <FlipHorizontal className="w-3.5 h-3.5" /> },
                      { id: 'vertical', label: 'Vert', icon: <FlipVertical className="w-3.5 h-3.5" /> },
                      { id: 'both', label: 'Dual', icon: <Sparkles className="w-3.5 h-3.5" /> }
                    ].map(axis => (
                      <button
                        key={axis.id}
                        onClick={() => onUpdateToolSettings({ mirrorAxis: axis.id as MirrorAxis })}
                        className={`py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                          toolSettings.mirrorAxis === axis.id
                            ? 'bg-amber-500 text-slate-950 font-bold shadow-md'
                            : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
                        }`}
                      >
                        {axis.icon}
                        <span>{axis.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Brush Size */}
                <div>
                  <div className="text-[11px] text-slate-400 font-medium mb-1.5 flex items-center justify-between">
                    <span>Brush Size</span>
                    <span className="font-mono text-white font-bold bg-slate-800 px-2 py-0.5 rounded">
                      {toolSettings.brushSize}px
                    </span>
                  </div>
                  <div className="grid grid-cols-6 gap-1">
                    {[1, 2, 3, 4, 6, 8].map(sz => (
                      <button
                        key={sz}
                        onClick={() => onUpdateToolSettings({ brushSize: sz })}
                        className={`py-1.5 rounded-lg font-mono text-xs font-bold transition-all ${
                          toolSettings.brushSize === sz
                            ? 'bg-sky-500 text-white shadow-md scale-105'
                            : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
                        }`}
                      >
                        {sz}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Brush Shape */}
                <div>
                  <div className="text-[11px] text-slate-400 font-medium mb-1.5 flex items-center justify-between">
                    <span>Brush Shape</span>
                    <span className="font-mono text-white font-bold capitalize bg-slate-800 px-2 py-0.5 rounded">
                      {toolSettings.brushShape}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { id: 'square', label: 'Square', icon: <Square className="w-3.5 h-3.5" /> },
                      { id: 'circle', label: 'Circle', icon: <Circle className="w-3.5 h-3.5" /> },
                      { id: 'diamond', label: 'Diamond', icon: <Diamond className="w-3.5 h-3.5" /> }
                    ].map(shp => (
                      <button
                        key={shp.id}
                        onClick={() => onUpdateToolSettings({ brushShape: shp.id as BrushShape })}
                        className={`py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                          toolSettings.brushShape === shp.id
                            ? 'bg-sky-500 text-white shadow-md'
                            : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
                        }`}
                      >
                        {shp.icon}
                        <span>{shp.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Opacity Slider */}
                <div>
                  <div className="text-[11px] text-slate-400 font-medium mb-1.5 flex items-center justify-between">
                    <span>Stroke Opacity</span>
                    <span className="font-mono text-white font-bold">
                      {Math.round(toolSettings.opacity * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="1"
                    step="0.05"
                    value={toolSettings.opacity}
                    onChange={e => onUpdateToolSettings({ opacity: parseFloat(e.target.value) })}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                </div>
              </div>
            )}

            {/* Eraser Settings */}
            {openFlyout === 'eraser' && (
              <div className="space-y-3.5">
                <div>
                  <div className="text-[11px] text-slate-400 font-medium mb-1.5 flex items-center justify-between">
                    <span>Eraser Size</span>
                    <span className="font-mono text-white font-bold bg-slate-800 px-2 py-0.5 rounded">
                      {toolSettings.brushSize}px
                    </span>
                  </div>
                  <div className="grid grid-cols-6 gap-1">
                    {[1, 2, 3, 4, 6, 8].map(sz => (
                      <button
                        key={sz}
                        onClick={() => onUpdateToolSettings({ brushSize: sz })}
                        className={`py-1.5 rounded-lg font-mono text-xs font-bold transition-all ${
                          toolSettings.brushSize === sz
                            ? 'bg-red-500 text-white shadow-md scale-105'
                            : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
                        }`}
                      >
                        {sz}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Eraser Shape */}
                <div>
                  <div className="text-[11px] text-slate-400 font-medium mb-1.5 flex items-center justify-between">
                    <span>Eraser Shape</span>
                    <span className="font-mono text-white font-bold capitalize bg-slate-800 px-2 py-0.5 rounded">
                      {toolSettings.brushShape}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { id: 'square', label: 'Square', icon: <Square className="w-3.5 h-3.5" /> },
                      { id: 'circle', label: 'Circle', icon: <Circle className="w-3.5 h-3.5" /> },
                      { id: 'diamond', label: 'Diamond', icon: <Diamond className="w-3.5 h-3.5" /> }
                    ].map(shp => (
                      <button
                        key={shp.id}
                        onClick={() => onUpdateToolSettings({ brushShape: shp.id as BrushShape })}
                        className={`py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                          toolSettings.brushShape === shp.id
                            ? 'bg-red-500 text-white shadow-md'
                            : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
                        }`}
                      >
                        {shp.icon}
                        <span>{shp.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Dither Tool Settings */}
            {openFlyout === 'dither' && (
              <div className="space-y-3">
                <div className="text-[11px] text-slate-400 font-medium mb-1.5">Dither Matrix Pattern</div>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { id: 'checker', label: 'Checker (50%)' },
                    { id: 'light', label: 'Light (25%)' },
                    { id: 'dense', label: 'Dense (75%)' },
                    { id: 'bayer', label: 'Bayer 4×4' }
                  ].map(pat => (
                    <button
                      key={pat.id}
                      onClick={() => onUpdateToolSettings({ ditherPattern: pat.id as DitherType })}
                      className={`p-2 rounded-xl text-left text-xs font-medium transition-all ${
                        toolSettings.ditherPattern === pat.id
                          ? 'bg-sky-500 text-white shadow'
                          : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
                      }`}
                    >
                      {pat.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Shapes: Line / Rect / Circle */}
            {(openFlyout === 'line' || openFlyout === 'rect' || openFlyout === 'circle') && (
              <div className="space-y-3">
                <div className="text-[11px] text-slate-400 font-medium mb-1.5 flex items-center justify-between">
                  <span>Line Thickness</span>
                  <span className="font-mono text-white font-bold bg-slate-800 px-2 py-0.5 rounded">
                    {toolSettings.brushSize}px
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {[1, 2, 3, 4].map(sz => (
                    <button
                      key={sz}
                      onClick={() => onUpdateToolSettings({ brushSize: sz })}
                      className={`py-1.5 rounded-lg font-mono text-xs font-bold transition-all ${
                        toolSettings.brushSize === sz
                          ? 'bg-sky-500 text-white shadow'
                          : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
                      }`}
                    >
                      {sz}px
                    </button>
                  ))}
                </div>

                {/* Snap to Grid Toggle in Flyout */}
                <div className="pt-2 border-t border-slate-800/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-300 font-medium flex items-center gap-1.5">
                      <Magnet className={`w-3.5 h-3.5 ${toolSettings.snapToGrid ? 'text-emerald-400' : 'text-slate-400'}`} />
                      <span>Snap to Grid</span>
                    </span>
                    <button
                      onClick={() => {
                        const nextSnap = !toolSettings.snapToGrid;
                        onUpdateToolSettings({
                          snapToGrid: nextSnap,
                          ...(nextSnap && (!toolSettings.gridSpacing || toolSettings.gridSpacing <= 1) ? {
                            gridSpacing: 8,
                            gridVisible: true
                          } : {}),
                          ...(nextSnap && !toolSettings.gridVisible ? { gridVisible: true } : {})
                        });
                      }}
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-all ${
                        toolSettings.snapToGrid
                          ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/40'
                          : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {toolSettings.snapToGrid ? 'ON' : 'OFF'}
                    </button>
                  </div>

                  {toolSettings.snapToGrid && (
                    <div className="space-y-1">
                      <div className="text-[10px] text-slate-400 flex justify-between">
                        <span>Grid Spacing</span>
                        <span className="font-mono text-emerald-300 font-bold">
                          {toolSettings.gridSpacing && toolSettings.gridSpacing > 1 ? `${toolSettings.gridSpacing}px` : '8px'}
                        </span>
                      </div>
                      <div className="grid grid-cols-5 gap-1">
                        {[2, 4, 8, 16, 32].map(sp => (
                          <button
                            key={sp}
                            onClick={() => onUpdateToolSettings({ gridSpacing: sp, gridVisible: true })}
                            className={`py-1 rounded text-[10px] font-mono font-bold transition-all ${
                              (toolSettings.gridSpacing ?? 1) === sp
                                ? 'bg-emerald-500 text-slate-950 font-black'
                                : 'bg-slate-800 text-slate-400 hover:text-white'
                            }`}
                          >
                            {sp}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Paint Bucket Settings */}
            {openFlyout === 'bucket' && (
              <div className="space-y-2">
                <div className="text-xs text-slate-300 leading-relaxed">
                  Fills contiguous matching pixels with the active color.
                </div>
                <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
                  <div
                    className="w-5 h-5 rounded-md border border-slate-600 shadow"
                    style={{ backgroundColor: activeColor }}
                  />
                  <span className="font-mono text-xs text-white">{activeColor}</span>
                </div>
              </div>
            )}

            {/* Picker Settings */}
            {openFlyout === 'picker' && (
              <div className="space-y-2">
                <div className="text-xs text-slate-400">Current Sample Color</div>
                <div className="flex items-center gap-2.5 p-2 bg-slate-800/80 rounded-xl">
                  <div
                    className="w-8 h-8 rounded-lg border border-slate-600 shadow"
                    style={{ backgroundColor: activeColor }}
                  />
                  <div>
                    <span className="font-mono text-xs font-bold text-white block">{activeColor}</span>
                    <span className="text-[10px] text-slate-400">Tap anywhere on canvas to sample</span>
                  </div>
                </div>
              </div>
            )}

            {/* Select Tool Settings */}
            {openFlyout === 'select' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-400 font-medium">Marquee Selection</span>
                  {selection ? (
                    <span className="text-[10px] font-mono text-sky-400 bg-sky-500/10 px-1.5 py-0.5 rounded border border-sky-500/20 font-bold">
                      {Math.abs(selection.endX - selection.startX) + 1}×{Math.abs(selection.endY - selection.startY) + 1}px
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-500 italic">None</span>
                  )}
                </div>

                <div className="text-xs text-slate-300 leading-relaxed">
                  Drag across pixels to marquee select a region. Use operations below:
                </div>

                <div className="grid grid-cols-2 gap-1.5 pt-1">
                  <button
                    onClick={onCut}
                    disabled={!selection || isLayerLocked}
                    title={isLayerLocked ? "Layer is locked" : "Cut Selection"}
                    className="p-2 rounded-xl flex items-center justify-between text-xs font-medium bg-slate-800 text-slate-200 hover:text-white hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-slate-800 disabled:cursor-not-allowed transition-all"
                  >
                    <span className="flex items-center gap-1.5">
                      <Scissors className="w-3.5 h-3.5 text-sky-400" />
                      <span>Cut</span>
                    </span>
                    <kbd className="text-[9px] text-slate-400 font-mono">^X</kbd>
                  </button>

                  <button
                    onClick={onCopy}
                    disabled={!selection}
                    className="p-2 rounded-xl flex items-center justify-between text-xs font-medium bg-slate-800 text-slate-200 hover:text-white hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-slate-800 transition-all"
                  >
                    <span className="flex items-center gap-1.5">
                      <Copy className="w-3.5 h-3.5 text-sky-400" />
                      <span>Copy</span>
                    </span>
                    <kbd className="text-[9px] text-slate-400 font-mono">^C</kbd>
                  </button>

                  <button
                    onClick={onPaste}
                    disabled={!hasClipboard || isLayerLocked}
                    title={isLayerLocked ? "Layer is locked" : "Paste"}
                    className="p-2 rounded-xl flex items-center justify-between text-xs font-medium bg-slate-800 text-slate-200 hover:text-white hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-slate-800 disabled:cursor-not-allowed transition-all"
                  >
                    <span className="flex items-center gap-1.5">
                      <ClipboardPaste className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Paste</span>
                    </span>
                    <kbd className="text-[9px] text-slate-400 font-mono">^V</kbd>
                  </button>

                  <button
                    onClick={onDelete}
                    disabled={!selection || isLayerLocked}
                    title={isLayerLocked ? "Layer is locked" : "Delete Selection"}
                    className="p-2 rounded-xl flex items-center justify-between text-xs font-medium bg-rose-950/30 border border-rose-500/20 text-rose-300 hover:text-rose-100 hover:bg-rose-900/50 disabled:opacity-40 disabled:hover:bg-rose-950/30 disabled:cursor-not-allowed transition-all"
                  >
                    <span className="flex items-center gap-1.5">
                      <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                      <span>Delete</span>
                    </span>
                    <kbd className="text-[9px] text-rose-400/80 font-mono">Del</kbd>
                  </button>
                </div>

                <div className="flex items-center gap-1.5 pt-1">
                  <button
                    onClick={onSelectAll}
                    className="flex-1 py-1.5 px-2 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center gap-1 transition-all"
                  >
                    <Scan className="w-3.5 h-3.5" />
                    <span>Select All (^A)</span>
                  </button>

                  {selection && (
                    <button
                      onClick={onDeselect}
                      className="py-1.5 px-2.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center gap-1 transition-all"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Deselect</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Palette Flyout */}
            {openFlyout === 'palette' && (() => {
              const compColor = getComplementaryColor(activeColor);
              const isColorInPalette = palette.some(c => c.toLowerCase() === activeColor.toLowerCase());

              return (
                <div className="space-y-3">
                  {/* Auto-generate Complementary Palette Button */}
                  <div>
                    <button
                      onClick={() => {
                        const newPalette = generateComplementaryPalette(activeColor);
                        setActiveSort(null);
                        if (onUpdatePalette) {
                          onUpdatePalette(newPalette);
                        } else {
                          onSelectPalettePreset(newPalette);
                        }
                      }}
                      title={`Generate rich 16-color complementary palette based on ${activeColor}`}
                      className="w-full py-2 px-2.5 rounded-xl bg-gradient-to-r from-amber-500/15 via-sky-500/15 to-purple-500/15 border border-amber-500/40 hover:border-amber-400 text-amber-200 hover:text-white font-semibold text-xs flex items-center justify-between transition-all shadow-sm active:scale-98 group cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <div className="flex items-center -space-x-1.5 shrink-0">
                          <div 
                            className="w-4 h-4 rounded-full border border-white/90 shadow-md z-10" 
                            style={{ backgroundColor: activeColor }}
                            title={`Primary Color: ${activeColor}`}
                          />
                          <div 
                            className="w-4 h-4 rounded-full border border-white/60 shadow-md" 
                            style={{ backgroundColor: compColor }}
                            title={`Complementary: ${compColor}`}
                          />
                        </div>
                        <div className="flex flex-col text-left">
                          <span className="font-semibold text-white leading-tight">Auto Complementary</span>
                          <span className="text-[10px] text-amber-300/80 font-mono font-normal">Harmony for {activeColor.toUpperCase()}</span>
                        </div>
                      </div>
                      <Sparkles className="w-4 h-4 text-amber-400 group-hover:rotate-12 group-hover:scale-110 transition-transform shrink-0" />
                    </button>
                  </div>

                  {/* Preset Palettes */}
                  <div>
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-300 mb-1.5">
                      <span>Preset Palettes</span>
                      <span className="text-slate-500 font-mono text-[10px]">{PRESET_PALETTES.length} presets</span>
                    </div>
                    <div className="space-y-1 max-h-32 overflow-y-auto pr-1">
                      {PRESET_PALETTES.map(preset => (
                        <button
                          key={preset.id}
                          onClick={() => {
                            setActiveSort(null);
                            onSelectPalettePreset(preset.colors);
                            setOpenFlyout(null);
                          }}
                          className="w-full text-left p-1.5 rounded-lg hover:bg-slate-800 transition-colors flex items-center justify-between group"
                        >
                          <div className="text-xs font-medium text-slate-200 group-hover:text-white truncate max-w-[130px]">
                            {preset.name}
                          </div>
                          <div className="flex -space-x-1">
                            {preset.colors.slice(0, 4).map((c, i) => (
                              <div
                                key={i}
                                className="w-3.5 h-3.5 rounded-full border border-slate-800 shadow"
                                style={{ backgroundColor: c }}
                              />
                            ))}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Current Palette Grid & Sorting */}
                  <div className="pt-2 border-t border-slate-800 space-y-2">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400 font-medium">Palette ({palette.length})</span>
                      {/* Sort buttons: Hue, Saturation, Brightness */}
                      <div className="flex items-center gap-1 bg-slate-800/80 p-0.5 rounded-lg border border-slate-700/60">
                        <button
                          onClick={() => {
                            const sorted = sortColorsByHue(palette);
                            setActiveSort('hue');
                            if (onUpdatePalette) onUpdatePalette(sorted);
                            else onSelectPalettePreset(sorted);
                          }}
                          title="Sort palette by Hue (Color spectrum)"
                          className={`px-1.5 py-0.5 rounded text-[10px] font-semibold transition-all ${
                            activeSort === 'hue'
                              ? 'bg-sky-500 text-white shadow-xs'
                              : 'text-slate-300 hover:text-white hover:bg-slate-700'
                          }`}
                        >
                          Hue
                        </button>
                        <button
                          onClick={() => {
                            const sorted = sortColorsBySaturation(palette);
                            setActiveSort('sat');
                            if (onUpdatePalette) onUpdatePalette(sorted);
                            else onSelectPalettePreset(sorted);
                          }}
                          title="Sort palette by Saturation (Vibrancy)"
                          className={`px-1.5 py-0.5 rounded text-[10px] font-semibold transition-all ${
                            activeSort === 'sat'
                              ? 'bg-sky-500 text-white shadow-xs'
                              : 'text-slate-300 hover:text-white hover:bg-slate-700'
                          }`}
                        >
                          Sat
                        </button>
                        <button
                          onClick={() => {
                            const sorted = sortColorsByBrightness(palette);
                            setActiveSort('bri');
                            if (onUpdatePalette) onUpdatePalette(sorted);
                            else onSelectPalettePreset(sorted);
                          }}
                          title="Sort palette by Brightness (Luminance)"
                          className={`px-1.5 py-0.5 rounded text-[10px] font-semibold transition-all ${
                            activeSort === 'bri'
                              ? 'bg-sky-500 text-white shadow-xs'
                              : 'text-slate-300 hover:text-white hover:bg-slate-700'
                          }`}
                        >
                          Bri
                        </button>
                      </div>
                    </div>

                    {/* Quick Add current color if not in palette */}
                    {!isColorInPalette && (
                      <button
                        onClick={() => {
                          const updated = [...palette, activeColor];
                          if (onUpdatePalette) onUpdatePalette(updated);
                          else onSelectPalettePreset(updated);
                        }}
                        title={`Add active color (${activeColor}) to palette`}
                        className="w-full py-1 px-2 rounded-lg bg-slate-800/80 hover:bg-slate-800 border border-slate-700 text-sky-400 hover:text-sky-300 text-[11px] font-medium flex items-center justify-center gap-1.5 transition-all"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add {activeColor.toUpperCase()} to Palette</span>
                      </button>
                    )}

                    <div className="grid grid-cols-8 gap-1 max-h-36 overflow-y-auto p-1 bg-slate-950/40 rounded-xl border border-slate-800/60">
                      {palette.map((color, index) => (
                        <button
                          key={index}
                          onClick={() => {
                            onSelectColor(color);
                            setOpenFlyout(null);
                          }}
                          className={`w-6 h-6 rounded border hover:scale-125 transition-transform shadow-xs ${
                            color.toLowerCase() === activeColor.toLowerCase()
                              ? 'border-white scale-110 shadow-md ring-1 ring-sky-400'
                              : 'border-slate-700/60'
                          }`}
                          style={{ backgroundColor: color }}
                          title={color}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </>
      )}
    </>
  );
};
