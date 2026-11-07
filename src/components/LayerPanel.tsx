import React, { useState } from 'react';
import { Layer, BlendMode } from '../types/sprite';
import { 
  Plus, 
  Trash2, 
  Copy, 
  Eye, 
  EyeOff, 
  Lock, 
  Unlock, 
  ChevronUp, 
  ChevronDown, 
  Combine,
  Layers as LayersIcon,
  FlipHorizontal,
  FlipVertical,
  Eraser,
  SunMoon,
  ShieldCheck,
  ShieldAlert,
  Sparkles
} from 'lucide-react';
import { LayerOpacitySlider } from './LayerOpacitySlider';
import { BLEND_MODES } from '../utils/blendModes';
import { LockTransparencyIcon } from './LockTransparencyIcon';

interface LayerPanelProps {
  layers: Layer[];
  activeLayerId: string;
  width: number;
  height: number;
  onSelectLayer: (id: string) => void;
  onAddLayer: () => void;
  onDuplicateLayer: (id: string) => void;
  onDeleteLayer: (id: string) => void;
  onMergeDown: (id: string) => void;
  onMoveLayer: (id: string, direction: 'up' | 'down') => void;
  onUpdateLayer: (id: string, updates: Partial<Layer>) => void;
  onClose?: () => void;
}

export const LayerPanel: React.FC<LayerPanelProps> = ({
  layers,
  activeLayerId,
  width,
  height,
  onSelectLayer,
  onAddLayer,
  onDuplicateLayer,
  onDeleteLayer,
  onMergeDown,
  onMoveLayer,
  onUpdateLayer,
  onClose
}) => {
  const activeLayer = layers.find(l => l.id === activeLayerId) || layers[0];
  const activeIndex = layers.findIndex(l => l.id === activeLayerId);

  // Flip active layer horizontally
  const handleFlipHorizontal = () => {
    if (!activeLayer || activeLayer.locked) return;
    const flipped = new Array(width * height).fill('');
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        flipped[y * width + (width - 1 - x)] = activeLayer.pixels[y * width + x] || '';
      }
    }
    onUpdateLayer(activeLayer.id, { pixels: flipped });
  };

  // Flip active layer vertically
  const handleFlipVertical = () => {
    if (!activeLayer || activeLayer.locked) return;
    const flipped = new Array(width * height).fill('');
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        flipped[(height - 1 - y) * width + x] = activeLayer.pixels[y * width + x] || '';
      }
    }
    onUpdateLayer(activeLayer.id, { pixels: flipped });
  };

  // Invert active layer colors
  const handleInvertColors = () => {
    if (!activeLayer || activeLayer.locked) return;
    const inverted = activeLayer.pixels.map(color => {
      if (!color || color.trim() === '') return '';
      // Simple hex color inversion #RRGGBB
      const hex = color.replace('#', '');
      if (hex.length === 6) {
        const r = (255 - parseInt(hex.substring(0, 2), 16)).toString(16).padStart(2, '0');
        const g = (255 - parseInt(hex.substring(2, 4), 16)).toString(16).padStart(2, '0');
        const b = (255 - parseInt(hex.substring(4, 6), 16)).toString(16).padStart(2, '0');
        return `#${r}${g}${b}`;
      }
      return color;
    });
    onUpdateLayer(activeLayer.id, { pixels: inverted });
  };

  // Clear layer content
  const handleClearLayer = () => {
    if (!activeLayer || activeLayer.locked) return;
    if (confirm(`Clear all content on layer "${activeLayer.name}"?`)) {
      onUpdateLayer(activeLayer.id, { pixels: new Array(width * height).fill('') });
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 border-l border-slate-800 w-full sm:w-80 select-none text-xs">
      {/* Panel Header */}
      <div className="flex items-center justify-between p-3 border-b border-slate-800">
        <div className="flex items-center gap-2 font-semibold text-slate-200">
          <LayersIcon className="w-4 h-4 text-sky-400" />
          <span>Layers</span>
          <span className="text-slate-500 font-mono text-[10px]">({layers.length})</span>
        </div>

        {/* Layer Actions */}
        <div className="flex items-center gap-1">
          {onClose && (
            <button
              onClick={onClose}
              className="px-2 py-1 rounded-lg text-sky-400 hover:text-white bg-slate-800 font-medium text-xs mr-1"
            >
              Done
            </button>
          )}
          <button
            onClick={onAddLayer}
            title="Add Layer"
            className="p-1.5 rounded-lg text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => onDuplicateLayer(activeLayerId)}
            title="Duplicate Layer"
            className="p-1.5 rounded-lg text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => onMergeDown(activeLayerId)}
            disabled={activeIndex <= 0 || activeLayer?.locked}
            title={activeLayer?.locked ? "Cannot merge down on locked layer" : "Merge Down"}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:pointer-events-none transition-colors"
          >
            <Combine className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => onDeleteLayer(activeLayerId)}
            disabled={layers.length <= 1 || activeLayer?.locked}
            title={activeLayer?.locked ? "Cannot delete locked layer" : "Delete Layer"}
            className="p-1.5 rounded-lg text-rose-400 hover:text-rose-300 bg-rose-950/40 hover:bg-rose-950/80 disabled:opacity-30 disabled:pointer-events-none transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Advanced Layer Properties */}
      {activeLayer && (
        <div className="p-3 border-b border-slate-800/80 bg-slate-950/50 space-y-2.5">
          {/* Locked Layer Notice Banner */}
          {activeLayer.locked && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl px-2.5 py-1.5 flex items-center justify-between gap-2 text-amber-300">
              <div className="flex items-center gap-1.5 min-w-0">
                <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="text-[11px] font-semibold truncate">Layer is locked (editing disabled)</span>
              </div>
              <button
                onClick={() => onUpdateLayer(activeLayer.id, { locked: false })}
                className="px-2 py-0.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/40 text-[10px] font-bold transition-all shrink-0 active:scale-95"
              >
                Unlock
              </button>
            </div>
          )}

          {/* Interactive Layer Opacity Slider & Overlays */}
          <div className="pt-0.5 pb-1">
            <LayerOpacitySlider
              opacity={typeof activeLayer.opacity === 'number' ? activeLayer.opacity : 1}
              layerName={activeLayer.name}
              onChange={newOpacity => onUpdateLayer(activeLayer.id, { opacity: newOpacity })}
            />
          </div>

          {/* Blend Mode Selector */}
          <div className="space-y-1.5 pt-0.5">
            <div className="flex items-center justify-between gap-2">
              <span className={`font-medium text-[11px] ${activeLayer.locked ? 'text-slate-500' : 'text-slate-400'}`}>
                Blend Mode
              </span>
              <select
                value={activeLayer.blendMode || 'normal'}
                disabled={activeLayer.locked}
                onChange={e => onUpdateLayer(activeLayer.id, { blendMode: e.target.value as BlendMode })}
                className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-slate-200 text-[11px] outline-none focus:border-sky-500 disabled:opacity-40 disabled:cursor-not-allowed font-medium"
              >
                <optgroup label="Standard">
                  <option value="normal">Normal</option>
                </optgroup>
                <optgroup label="Darken (Shadows)">
                  <option value="multiply">Multiply</option>
                  <option value="darken">Darken</option>
                  <option value="color-burn">Color Burn</option>
                </optgroup>
                <optgroup label="Lighten (Highlights)">
                  <option value="screen">Screen</option>
                  <option value="lighten">Lighten</option>
                  <option value="color-dodge">Color Dodge</option>
                </optgroup>
                <optgroup label="Contrast & Lighting">
                  <option value="overlay">Overlay</option>
                  <option value="soft-light">Soft Light</option>
                  <option value="hard-light">Hard Light</option>
                </optgroup>
                <optgroup label="Inversion & FX">
                  <option value="difference">Difference</option>
                  <option value="exclusion">Exclusion</option>
                </optgroup>
              </select>
            </div>

            {/* Quick Blend Mode Chips */}
            <div className="grid grid-cols-4 gap-1">
              {(['normal', 'multiply', 'screen', 'overlay'] as BlendMode[]).map(bm => {
                const isSelected = (activeLayer.blendMode || 'normal') === bm;
                const info = BLEND_MODES.find(m => m.id === bm);
                return (
                  <button
                    key={bm}
                    type="button"
                    disabled={activeLayer.locked}
                    onClick={() => onUpdateLayer(activeLayer.id, { blendMode: bm })}
                    title={info?.description}
                    className={`py-1 rounded text-[10px] font-mono font-bold capitalize transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                      isSelected
                        ? 'bg-purple-600 text-white shadow-xs ring-1 ring-purple-400'
                        : 'bg-slate-800/80 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700/60'
                    }`}
                  >
                    {info?.label || bm}
                  </button>
                );
              })}
            </div>

            {/* Mode Description */}
            {(() => {
              const info = BLEND_MODES.find(m => m.id === (activeLayer.blendMode || 'normal'));
              if (!info || info.id === 'normal') return null;
              return (
                <div className="text-[10px] text-slate-400 leading-tight italic pt-0.5">
                  {info.description}
                </div>
              );
            })()}
          </div>

          {/* Lock Transparency Toggle & Quick Transforms */}
          <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-1">
            {/* Lock Transparency Button */}
            <button
              onClick={() => onUpdateLayer(activeLayer.id, { alphaLocked: !activeLayer.alphaLocked })}
              disabled={activeLayer.locked}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                activeLayer.alphaLocked
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-xs'
                  : 'bg-slate-800/80 text-slate-400 border-slate-700/60 hover:text-white hover:bg-slate-800'
              }`}
              title={
                activeLayer.locked 
                  ? "Layer is locked" 
                  : activeLayer.alphaLocked
                  ? "Lock Transparency: ON (Paint brush only modifies existing pixels, protecting transparent background)"
                  : "Lock Transparency: OFF (Click to protect transparent pixels when adding shading or textures)"
              }
            >
              <LockTransparencyIcon locked={activeLayer.alphaLocked} />
              <span>Lock Transparency</span>
              {activeLayer.alphaLocked && (
                <span className="text-[9px] font-mono bg-amber-500/30 text-amber-200 px-1 py-0.2 rounded border border-amber-500/40">
                  ON
                </span>
              )}
            </button>

            {/* Quick Transforms */}
            <div className="flex items-center gap-1">
              <button
                onClick={handleFlipHorizontal}
                disabled={activeLayer.locked}
                title={activeLayer.locked ? "Layer is locked" : "Flip Layer Horizontally"}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <FlipHorizontal className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleFlipVertical}
                disabled={activeLayer.locked}
                title={activeLayer.locked ? "Layer is locked" : "Flip Layer Vertically"}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <FlipVertical className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleInvertColors}
                disabled={activeLayer.locked}
                title={activeLayer.locked ? "Layer is locked" : "Invert Colors"}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <SunMoon className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleClearLayer}
                disabled={activeLayer.locked}
                title={activeLayer.locked ? "Layer is locked" : "Clear Layer Pixels"}
                className="p-1.5 rounded-lg text-rose-400 hover:text-rose-300 bg-slate-800 hover:bg-rose-950/40 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <Eraser className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Layers List (Top to Bottom rendering order) */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {[...layers].reverse().map((layer, revIdx) => {
          const actualIdx = layers.length - 1 - revIdx;
          const isSelected = layer.id === activeLayerId;

          return (
            <div
              key={layer.id}
              onClick={() => onSelectLayer(layer.id)}
              className={`flex items-center gap-2 p-2 rounded-xl border transition-all cursor-pointer ${
                isSelected
                  ? layer.locked
                    ? 'bg-amber-500/10 border-amber-500/40 shadow-sm'
                    : 'bg-sky-500/15 border-sky-500/50 shadow-sm'
                  : layer.locked
                    ? 'bg-slate-900/60 border-amber-500/20 hover:border-amber-500/35'
                    : 'bg-slate-800/40 border-slate-800/80 hover:bg-slate-800/80 hover:border-slate-700'
              }`}
            >
              {/* Visibility Toggle */}
              <button
                onClick={e => {
                  e.stopPropagation();
                  onUpdateLayer(layer.id, { visible: !layer.visible });
                }}
                className={`p-1.5 rounded-lg transition-colors ${
                  layer.visible ? 'text-slate-300 hover:text-white hover:bg-slate-800' : 'text-slate-600 hover:text-slate-400'
                }`}
                title={layer.visible ? 'Hide Layer' : 'Show Layer'}
              >
                {layer.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              </button>

              {/* Visual Lock/Unlock Toggle Indicator Icon */}
              <button
                onClick={e => {
                  e.stopPropagation();
                  onUpdateLayer(layer.id, { locked: !layer.locked });
                }}
                className={`p-1.5 rounded-lg transition-all flex items-center justify-center ${
                  layer.locked
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-xs hover:bg-amber-500/30'
                    : 'text-slate-500 hover:text-slate-200 hover:bg-slate-800 border border-transparent'
                }`}
                title={layer.locked ? 'Layer is Locked (Click to unlock)' : 'Lock Layer (Prevent editing)'}
              >
                {layer.locked ? (
                  <Lock className="w-3.5 h-3.5 text-amber-400" />
                ) : (
                  <Unlock className="w-3.5 h-3.5" />
                )}
              </button>

              {/* Lock Transparency quick toggle button on layer row */}
              <button
                type="button"
                disabled={layer.locked}
                onClick={e => {
                  e.stopPropagation();
                  onUpdateLayer(layer.id, { alphaLocked: !layer.alphaLocked });
                }}
                className={`p-1.5 rounded-lg transition-all flex items-center justify-center disabled:opacity-20 ${
                  layer.alphaLocked
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-xs hover:bg-amber-500/30'
                    : 'text-slate-500 hover:text-slate-200 hover:bg-slate-800 border border-transparent'
                }`}
                title={
                  layer.locked
                    ? 'Layer is locked'
                    : layer.alphaLocked
                    ? 'Lock Transparency: ON (Transparent pixels protected - Click to unlock)'
                    : 'Lock Transparency: OFF (Click to lock transparency)'
                }
              >
                <LockTransparencyIcon locked={layer.alphaLocked} className="w-3.5 h-3.5" />
              </button>

              {/* Layer Name / Renaming */}
              <input
                type="text"
                value={layer.name}
                onClick={e => e.stopPropagation()}
                onChange={e => onUpdateLayer(layer.id, { name: e.target.value })}
                disabled={layer.locked}
                className={`flex-1 bg-transparent border-0 font-medium text-xs focus:ring-0 focus:outline-none truncate ${
                  layer.locked ? 'text-slate-400 cursor-default' : 'text-slate-200'
                }`}
                title={layer.locked ? `${layer.name} (Locked)` : 'Click to rename'}
              />

              {/* Prominent Locked Badge */}
              {layer.locked && (
                <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30 flex-shrink-0 flex items-center gap-1">
                  <Lock className="w-2.5 h-2.5 text-amber-400" />
                  <span>Locked</span>
                </span>
              )}

              {/* Opacity indicator if layer is partially transparent for overlays */}
              {typeof layer.opacity === 'number' && layer.opacity < 1 && (
                <button
                  type="button"
                  onClick={e => {
                    e.stopPropagation();
                    onSelectLayer(layer.id);
                  }}
                  title={`Layer Opacity: ${Math.round(layer.opacity * 100)}% (Click to adjust overlay)`}
                  className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border border-sky-500/30 flex-shrink-0 cursor-pointer transition-colors"
                >
                  {Math.round(layer.opacity * 100)}%
                </button>
              )}

              {/* Blend Mode indicator badge */}
              {layer.blendMode && layer.blendMode !== 'normal' && (() => {
                const info = BLEND_MODES.find(m => m.id === layer.blendMode);
                return (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectLayer(layer.id);
                    }}
                    title={`Blend Mode: ${info?.label || layer.blendMode} - ${info?.description || ''}`}
                    className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase border flex-shrink-0 transition-transform hover:scale-105 cursor-pointer ${
                      info?.colorClass || 'bg-purple-500/15 text-purple-300 border-purple-500/30'
                    }`}
                  >
                    {info?.badge || layer.blendMode.slice(0, 4)}
                  </button>
                );
              })()}

              {/* Reorder Buttons */}
              <div className="flex items-center gap-0.5">
                <button
                  disabled={actualIdx >= layers.length - 1 || layer.locked}
                  onClick={e => {
                    e.stopPropagation();
                    onMoveLayer(layer.id, 'up');
                  }}
                  className="p-1 rounded text-slate-400 hover:text-white disabled:opacity-20"
                  title={layer.locked ? "Layer is locked" : "Move Up"}
                >
                  <ChevronUp className="w-3 h-3" />
                </button>
                <button
                  disabled={actualIdx <= 0 || layer.locked}
                  onClick={e => {
                    e.stopPropagation();
                    onMoveLayer(layer.id, 'down');
                  }}
                  className="p-1 rounded text-slate-400 hover:text-white disabled:opacity-20"
                  title={layer.locked ? "Layer is locked" : "Move Down"}
                >
                  <ChevronDown className="w-3 h-3" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
