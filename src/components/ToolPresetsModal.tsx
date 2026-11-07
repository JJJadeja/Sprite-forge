import React, { useState, useEffect } from 'react';
import { ToolPreset, ToolSettings, ToolType } from '../types/sprite';
import { 
  loadSavedToolPresets, 
  saveUserToolPresets 
} from '../utils/brushShapes';
import { BrushShapeIcon } from './BrushShapeIcon';
import { 
  X, 
  Bookmark, 
  BookmarkPlus, 
  Trash2, 
  Check, 
  Search, 
  Sliders, 
  Pencil, 
  PaintBucket, 
  Eraser, 
  Pipette, 
  Grid2X2, 
  FlipHorizontal,
  Compass,
  Sparkles
} from 'lucide-react';

interface ToolPresetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTool: ToolType;
  currentSettings: ToolSettings;
  onApplyPreset: (preset: ToolPreset) => void;
}

export const ToolPresetsModal: React.FC<ToolPresetsModalProps> = ({
  isOpen,
  onClose,
  currentTool,
  currentSettings,
  onApplyPreset
}) => {
  const [presets, setPresets] = useState<ToolPreset[]>([]);
  const [newPresetName, setNewPresetName] = useState<string>('');
  const [filterTab, setFilterTab] = useState<'all' | 'custom' | 'builtin'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setPresets(loadSavedToolPresets());
      setNewPresetName(`${currentSettings.brushSize}px ${currentSettings.brushShape} ${currentTool}`);
      setFeedbackMsg(null);
    }
  }, [isOpen, currentTool, currentSettings.brushSize, currentSettings.brushShape]);

  if (!isOpen) return null;

  const handleSavePreset = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newPresetName.trim();
    if (!trimmed) return;

    const newPreset: ToolPreset = {
      id: `preset-${Date.now()}`,
      name: trimmed,
      tool: currentTool,
      brushSize: currentSettings.brushSize,
      brushShape: currentSettings.brushShape,
      opacity: currentSettings.opacity,
      symmetry: currentSettings.symmetry,
      symmetryAngle: currentSettings.symmetryAngle,
      symmetryRays: currentSettings.symmetryRays,
      ditherPattern: currentSettings.ditherPattern,
      mirrorAxis: currentSettings.mirrorAxis,
      stabilization: currentSettings.stabilization,
      stabilizationWeight: currentSettings.stabilizationWeight,
      pressureSensitivity: currentSettings.pressureSensitivity,
      pressureAffectsSize: currentSettings.pressureAffectsSize,
      pressureAffectsOpacity: currentSettings.pressureAffectsOpacity,
      snapToGrid: currentSettings.snapToGrid,
      createdAt: Date.now(),
      isBuiltIn: false
    };

    const updated = [newPreset, ...presets];
    setPresets(updated);
    saveUserToolPresets(updated);
    setNewPresetName('');
    setFeedbackMsg(`Saved preset "${newPreset.name}"!`);
    setTimeout(() => setFeedbackMsg(null), 3000);
  };

  const handleDeletePreset = (id: string, name: string) => {
    const updated = presets.filter(p => p.id !== id);
    setPresets(updated);
    saveUserToolPresets(updated);
    setFeedbackMsg(`Deleted preset "${name}"`);
    setTimeout(() => setFeedbackMsg(null), 2500);
  };

  const handleApply = (preset: ToolPreset) => {
    onApplyPreset(preset);
    setFeedbackMsg(`Applied "${preset.name}"`);
    setTimeout(() => {
      onClose();
    }, 350);
  };

  const filteredPresets = presets.filter(p => {
    if (filterTab === 'custom' && p.isBuiltIn) return false;
    if (filterTab === 'builtin' && !p.isBuiltIn) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return p.name.toLowerCase().includes(q) || p.tool.toLowerCase().includes(q) || p.brushShape.toLowerCase().includes(q);
    }
    return true;
  });

  const getToolIcon = (tool: ToolType) => {
    switch (tool) {
      case 'pencil': return <Pencil className="w-3.5 h-3.5 text-sky-400" />;
      case 'eraser': return <Eraser className="w-3.5 h-3.5 text-rose-400" />;
      case 'bucket': return <PaintBucket className="w-3.5 h-3.5 text-amber-400" />;
      case 'dither': return <Grid2X2 className="w-3.5 h-3.5 text-purple-400" />;
      case 'mirror': return <FlipHorizontal className="w-3.5 h-3.5 text-amber-400" />;
      case 'picker': return <Pipette className="w-3.5 h-3.5 text-emerald-400" />;
      default: return <Sliders className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-sm animate-fade-in select-none">
      <div 
        className="w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-2">
            <Bookmark className="w-5 h-5 text-sky-400" />
            <h3 className="font-bold text-sm text-white">Tool Configuration Presets</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Feedback message banner */}
        {feedbackMsg && (
          <div className="bg-sky-500/15 border-b border-sky-500/30 px-4 py-1.5 text-xs text-sky-300 flex items-center gap-2 font-medium">
            <Check className="w-3.5 h-3.5 text-sky-400 shrink-0" />
            <span>{feedbackMsg}</span>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Save Current Configuration Card */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 space-y-2.5">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
              <span className="flex items-center gap-1.5">
                <BookmarkPlus className="w-4 h-4 text-emerald-400" />
                <span>Save Current Tool Settings as Preset</span>
              </span>
              <span className="text-[10px] text-slate-500 font-mono">active state</span>
            </div>

            {/* Current Active Specs Breakdown */}
            <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-mono">
              <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-200 border border-slate-700/60 flex items-center gap-1">
                {getToolIcon(currentTool)}
                <span className="capitalize">{currentTool}</span>
              </span>
              <span className="px-2 py-0.5 rounded bg-sky-500/15 text-sky-300 border border-sky-500/30 font-bold">
                {currentSettings.brushSize}px
              </span>
              <span className="px-2 py-0.5 rounded bg-purple-500/15 text-purple-300 border border-purple-500/30 flex items-center gap-1 capitalize font-medium">
                <BrushShapeIcon shape={currentSettings.brushShape} className="w-3 h-3 text-purple-400" />
                <span>{currentSettings.brushShape}</span>
              </span>
              <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700/60">
                {Math.round(currentSettings.opacity * 100)}% opac
              </span>
              {currentSettings.symmetry !== 'none' && (
                <span className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1 capitalize">
                  {currentSettings.symmetry === 'radial' ? <Compass className="w-3 h-3" /> : <Sparkles className="w-3 h-3" />}
                  <span>{currentSettings.symmetry} {currentSettings.symmetryAngle ? `${currentSettings.symmetryAngle}°` : ''}</span>
                </span>
              )}
            </div>

            {/* Input & Save Form */}
            <form onSubmit={handleSavePreset} className="flex items-center gap-2 pt-1">
              <input
                type="text"
                placeholder="Name this tool preset..."
                value={newPresetName}
                onChange={e => setNewPresetName(e.target.value)}
                maxLength={32}
                className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
              />
              <button
                type="submit"
                disabled={!newPresetName.trim()}
                className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-md transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 shrink-0"
              >
                <BookmarkPlus className="w-3.5 h-3.5" />
                <span>Save</span>
              </button>
            </form>
          </div>

          {/* Preset Library Filters & Search */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              {/* Category tabs */}
              <div className="flex items-center gap-1 bg-slate-800/80 p-0.5 rounded-xl border border-slate-700/60 text-xs">
                {(['all', 'custom', 'builtin'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setFilterTab(tab)}
                    className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                      filterTab === tab
                        ? 'bg-sky-500 text-white font-bold shadow-xs'
                        : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                    }`}
                  >
                    {tab === 'all' ? 'All' : tab === 'custom' ? 'My Presets' : 'Built-In'}
                  </button>
                ))}
              </div>

              {/* Search input */}
              <div className="relative flex-1 max-w-[180px]">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Filter..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-2.5 py-1 bg-slate-800/60 border border-slate-700/60 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>

            {/* Presets List */}
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {filteredPresets.length === 0 ? (
                <div className="py-8 text-center text-slate-500 text-xs font-mono">
                  No presets match your search.
                </div>
              ) : (
                filteredPresets.map(preset => (
                  <div
                    key={preset.id}
                    onClick={() => handleApply(preset)}
                    className="p-2.5 rounded-xl bg-slate-800/40 hover:bg-slate-800/80 border border-slate-700/60 hover:border-sky-500/50 transition-all flex items-center justify-between gap-2 group cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="p-2 rounded-xl bg-slate-800 border border-slate-700/60 group-hover:border-sky-500/40 shrink-0">
                        {getToolIcon(preset.tool)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-xs text-white truncate">{preset.name}</span>
                          {preset.isBuiltIn && (
                            <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-slate-700 text-slate-300">built-in</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-slate-400 font-mono">
                          <span className="font-bold text-sky-400">{preset.brushSize}px</span>
                          <span>•</span>
                          <span className="capitalize flex items-center gap-0.5">
                            <BrushShapeIcon shape={preset.brushShape} className="w-2.5 h-2.5 text-purple-400" />
                            <span>{preset.brushShape}</span>
                          </span>
                          <span>•</span>
                          <span className="capitalize">{preset.tool}</span>
                          {preset.symmetry !== 'none' && (
                            <>
                              <span>•</span>
                              <span className="text-amber-400">{preset.symmetry}</span>
                            </>
                          )}
                          {preset.stabilization && (
                            <>
                              <span>•</span>
                              <span className="text-emerald-400 font-semibold">Smooth {preset.stabilizationWeight || 6}</span>
                            </>
                          )}
                          {preset.pressureSensitivity && (
                            <>
                              <span>•</span>
                              <span className="text-sky-400 font-semibold">Pressure</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => handleApply(preset)}
                        className="px-2.5 py-1 rounded-lg bg-sky-500/20 hover:bg-sky-500 text-sky-300 hover:text-white border border-sky-500/30 text-xs font-semibold transition-all active:scale-95"
                      >
                        Apply
                      </button>
                      {!preset.isBuiltIn && (
                        <button
                          onClick={() => handleDeletePreset(preset.id, preset.name)}
                          title="Delete Preset"
                          className="p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 border-t border-slate-800 bg-slate-900/80 flex items-center justify-between text-[11px] text-slate-400">
          <span>{presets.length} presets available</span>
          <button
            onClick={onClose}
            className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-medium transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
