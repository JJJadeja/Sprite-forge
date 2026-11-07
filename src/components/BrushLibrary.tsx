import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  CustomBrushPattern, 
  CustomBrushOffset, 
  SelectionArea 
} from '../types/sprite';
import { 
  DEFAULT_CUSTOM_BRUSHES, 
  loadSavedCustomBrushes, 
  saveUserCustomBrushes, 
  createBrushPatternFromSelection 
} from '../utils/brushShapes';
import { 
  Paintbrush, 
  X, 
  Plus, 
  Trash2, 
  Copy, 
  Download, 
  Upload, 
  Crop, 
  RotateCw, 
  Eraser, 
  Check, 
  Sparkles, 
  Layers, 
  Maximize2, 
  Sliders,
  Palette,
  Search,
  Info
} from 'lucide-react';

interface BrushLibraryProps {
  isOpen: boolean;
  onClose: () => void;
  currentCustomBrush?: CustomBrushPattern | null;
  onSelectBrush: (brush: CustomBrushPattern) => void;
  selection?: SelectionArea | null;
  activeLayerPixels?: string[];
  canvasWidth?: number;
  canvasHeight?: number;
  activeColor?: string;
}

type TabType = 'gallery' | 'editor';

export const BrushLibrary: React.FC<BrushLibraryProps> = ({
  isOpen,
  onClose,
  currentCustomBrush,
  onSelectBrush,
  selection,
  activeLayerPixels,
  canvasWidth = 32,
  canvasHeight = 32,
  activeColor = '#38bdf8'
}) => {
  // Brush lists
  const [userBrushes, setUserBrushes] = useState<CustomBrushPattern[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>('gallery');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'custom' | 'builtin'>('all');

  // Mini-editor state
  const [editorGridSize, setEditorGridSize] = useState<number>(5); // 3, 5, 7, 9
  const [editorPixels, setEditorPixels] = useState<{ [key: string]: string }>({}); // "x,y": color
  const [editorName, setEditorName] = useState('My Custom Brush');
  const [editorUseOriginalColors, setEditorUseOriginalColors] = useState(false);
  const [editorPenColor, setEditorPenColor] = useState<string>(activeColor || '#38bdf8');
  const [isErasing, setIsErasing] = useState(false);
  const [isMouseDown, setIsMouseDown] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Hidden file input for import
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load custom brushes on mount or when modal opens
  useEffect(() => {
    if (isOpen) {
      setUserBrushes(loadSavedCustomBrushes());
    }
  }, [isOpen]);

  // Combined brushes list
  const allBrushes = useMemo(() => {
    return [...userBrushes, ...DEFAULT_CUSTOM_BRUSHES];
  }, [userBrushes]);

  // Filtered brushes
  const filteredBrushes = useMemo(() => {
    return allBrushes.filter(b => {
      if (categoryFilter === 'custom' && b.isBuiltIn) return false;
      if (categoryFilter === 'builtin' && !b.isBuiltIn) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return b.name.toLowerCase().includes(q) || (b.category && b.category.toLowerCase().includes(q));
      }
      return true;
    });
  }, [allBrushes, categoryFilter, searchQuery]);

  if (!isOpen) return null;

  // Initialize editor with empty grid of current size
  const handleClearEditor = () => {
    setEditorPixels({});
  };

  // Rotate editor grid 90 deg clockwise
  const handleRotateEditor = () => {
    const half = Math.floor(editorGridSize / 2);
    const newPixels: { [key: string]: string } = {};

    Object.entries(editorPixels).forEach(([key, color]) => {
      const [xStr, yStr] = key.split(',');
      const x = parseInt(xStr, 10);
      const y = parseInt(yStr, 10);
      // rotation in 0-indexed coords
      const nx = editorGridSize - 1 - y;
      const ny = x;
      newPixels[`${nx},${ny}`] = color;
    });

    setEditorPixels(newPixels);
  };

  // Invert editor grid
  const handleInvertEditor = () => {
    const newPixels: { [key: string]: string } = {};
    for (let y = 0; y < editorGridSize; y++) {
      for (let x = 0; x < editorGridSize; x++) {
        const key = `${x},${y}`;
        if (!editorPixels[key]) {
          newPixels[key] = editorPenColor;
        }
      }
    }
    setEditorPixels(newPixels);
  };

  // Load an existing brush into the interactive matrix editor
  const handleLoadBrushToEditor = (brush: CustomBrushPattern) => {
    const maxDim = Math.max(brush.width, brush.height);
    const targetSize = maxDim <= 3 ? 3 : maxDim <= 5 ? 5 : maxDim <= 7 ? 7 : 9;
    setEditorGridSize(targetSize);
    setEditorName(`${brush.name} (Copy)`);
    setEditorUseOriginalColors(Boolean(brush.useOriginalColors));

    const half = Math.floor(targetSize / 2);
    const newPixels: { [key: string]: string } = {};

    brush.offsets.forEach(off => {
      const gx = off.dx + half;
      const gy = off.dy + half;
      if (gx >= 0 && gx < targetSize && gy >= 0 && gy < targetSize) {
        newPixels[`${gx},${gy}`] = off.color || editorPenColor;
      }
    });

    setEditorPixels(newPixels);
    setActiveTab('editor');
  };

  // Toggle or paint pixel in editor grid
  const handlePaintCell = (x: number, y: number) => {
    const key = `${x},${y}`;
    setEditorPixels(prev => {
      const next = { ...prev };
      if (isErasing) {
        delete next[key];
      } else {
        next[key] = editorPenColor;
      }
      return next;
    });
  };

  // Save current editor pattern as a custom brush
  const handleSaveEditorPattern = () => {
    const half = Math.floor(editorGridSize / 2);
    const offsets: CustomBrushOffset[] = [];

    Object.entries(editorPixels).forEach(([key, color]) => {
      const [xStr, yStr] = key.split(',');
      const gx = parseInt(xStr, 10);
      const gy = parseInt(yStr, 10);
      offsets.push({
        dx: gx - half,
        dy: gy - half,
        color: editorUseOriginalColors ? color : undefined
      });
    });

    if (offsets.length === 0) {
      alert('Cannot save an empty pattern. Click cells in the grid to draw pattern pixels first.');
      return;
    }

    const newPattern: CustomBrushPattern = {
      id: `custom_brush_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: editorName.trim() || `Pattern ${editorGridSize}x${editorGridSize}`,
      width: editorGridSize,
      height: editorGridSize,
      offsets,
      category: 'custom',
      useOriginalColors: editorUseOriginalColors,
      createdAt: Date.now(),
      isBuiltIn: false
    };

    const updated = [newPattern, ...userBrushes];
    setUserBrushes(updated);
    saveUserCustomBrushes(updated);

    // Apply immediately to tool settings
    onSelectBrush(newPattern);

    setSaveSuccessMsg(`Saved and activated "${newPattern.name}"!`);
    setTimeout(() => setSaveSuccessMsg(null), 3000);
  };

  // Capture selection from canvas
  const handleCaptureSelection = () => {
    if (!selection) {
      alert('No canvas selection found. Use the Marquee Selection tool on the canvas to select an area first, then click Capture.');
      return;
    }

    if (!activeLayerPixels || activeLayerPixels.length === 0) {
      alert('No active layer pixels available to capture.');
      return;
    }

    const selW = Math.abs(selection.endX - selection.startX) + 1;
    const selH = Math.abs(selection.endY - selection.startY) + 1;

    const pattern = createBrushPatternFromSelection(
      selection,
      activeLayerPixels,
      canvasWidth,
      `Stamp ${selW}x${selH}`
    );

    if (!pattern) {
      alert('Selection contains no painted pixels to create a brush pattern.');
      return;
    }

    const updated = [pattern, ...userBrushes];
    setUserBrushes(updated);
    saveUserCustomBrushes(updated);

    onSelectBrush(pattern);
    setSaveSuccessMsg(`Captured ${pattern.offsets.length} pixels into "${pattern.name}"!`);
    setTimeout(() => setSaveSuccessMsg(null), 3000);
  };

  // Delete a user brush
  const handleDeleteBrush = (brushId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this custom brush?')) return;

    const updated = userBrushes.filter(b => b.id !== brushId);
    setUserBrushes(updated);
    saveUserCustomBrushes(updated);
  };

  // Duplicate a brush
  const handleDuplicateBrush = (brush: CustomBrushPattern, e: React.MouseEvent) => {
    e.stopPropagation();
    const copy: CustomBrushPattern = {
      ...brush,
      id: `custom_brush_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: `${brush.name} (Copy)`,
      isBuiltIn: false,
      createdAt: Date.now()
    };

    const updated = [copy, ...userBrushes];
    setUserBrushes(updated);
    saveUserCustomBrushes(updated);
  };

  // Export custom brushes as JSON
  const handleExportBrushes = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(userBrushes, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `pixel_studio_brushes_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Import brushes from JSON file
  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const parsed = JSON.parse(ev.target?.result as string);
        if (!Array.isArray(parsed)) {
          alert('Invalid brush file format: Expected an array of brush patterns.');
          return;
        }

        const validBrushes: CustomBrushPattern[] = parsed.filter(item => 
          item && item.id && item.name && Array.isArray(item.offsets)
        );

        if (validBrushes.length === 0) {
          alert('No valid brush patterns found in file.');
          return;
        }

        // Merge with existing avoiding duplicate IDs
        const existingIds = new Set(userBrushes.map(b => b.id));
        const newToAdd = validBrushes.map(b => ({
          ...b,
          id: existingIds.has(b.id) ? `custom_brush_${Date.now()}_${Math.random().toString(36).substring(2, 7)}` : b.id,
          isBuiltIn: false
        }));

        const merged = [...newToAdd, ...userBrushes];
        setUserBrushes(merged);
        saveUserCustomBrushes(merged);
        alert(`Successfully imported ${newToAdd.length} brush patterns!`);
      } catch (err) {
        alert('Failed to parse brush JSON file.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Helper to render mini pixel art preview
  const renderPatternPreview = (brush: CustomBrushPattern, size = 48) => {
    const maxDim = Math.max(brush.width, brush.height, 3);
    const cellSize = Math.floor((size - 4) / maxDim);
    const half = Math.floor(maxDim / 2);

    return (
      <div 
        className="relative bg-slate-950/80 rounded border border-slate-700/60 overflow-hidden flex items-center justify-center"
        style={{ width: `${size}px`, height: `${size}px` }}
      >
        {/* Subtle checkerboard */}
        <div 
          className="absolute inset-0 opacity-15"
          style={{
            backgroundImage: `linear-gradient(45deg, #475569 25%, transparent 25%), 
                              linear-gradient(-45deg, #475569 25%, transparent 25%), 
                              linear-gradient(45deg, transparent 75%, #475569 75%), 
                              linear-gradient(-45deg, transparent 75%, #475569 75%)`,
            backgroundSize: '8px 8px',
            backgroundPosition: '0 0, 0 4px, 4px -4px, -4px 0px'
          }}
        />
        
        {/* Render pixels */}
        <div 
          className="relative"
          style={{ 
            width: `${maxDim * cellSize}px`, 
            height: `${maxDim * cellSize}px` 
          }}
        >
          {brush.offsets.map((off, idx) => {
            const px = (off.dx + half) * cellSize;
            const py = (off.dy + half) * cellSize;
            const fill = brush.useOriginalColors && off.color ? off.color : '#a855f7';

            return (
              <div
                key={idx}
                className="absolute shadow-xs"
                style={{
                  left: `${px}px`,
                  top: `${py}px`,
                  width: `${cellSize}px`,
                  height: `${cellSize}px`,
                  backgroundColor: fill
                }}
              />
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in">
      <div 
        className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
        onMouseUp={() => setIsMouseDown(false)}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
              <Paintbrush className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-wide">Custom Brush Pattern Library</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  {allBrushes.length} Patterns
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Design custom pixel stamps, capture patterns from canvas selections, or use procedural textures.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Close Brush Library"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Success toast notification */}
        {saveSuccessMsg && (
          <div className="bg-emerald-500/20 border-b border-emerald-500/40 text-emerald-300 px-5 py-2 text-xs flex items-center gap-2 animate-fade-in">
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{saveSuccessMsg}</span>
          </div>
        )}

        {/* Sub-bar / Mode Tabs */}
        <div className="px-5 py-2.5 border-b border-slate-800/80 bg-slate-900/60 flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Navigation Tabs */}
          <div className="flex items-center gap-1 bg-slate-950/60 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveTab('gallery')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
                activeTab === 'gallery'
                  ? 'bg-purple-600 text-white shadow-sm font-semibold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Pattern Gallery</span>
            </button>
            <button
              onClick={() => setActiveTab('editor')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
                activeTab === 'editor'
                  ? 'bg-purple-600 text-white shadow-sm font-semibold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Matrix Stamp Designer</span>
            </button>
          </div>

          {/* Quick Capture from Canvas Selection */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleCaptureSelection}
              disabled={!selection}
              title={
                selection
                  ? `Capture ${Math.abs(selection.endX - selection.startX) + 1}x${Math.abs(selection.endY - selection.startY) + 1} canvas selection as stamp`
                  : 'Make a selection on canvas with Marquee tool to capture'
              }
              className={`px-3 py-1.5 rounded-lg font-medium text-xs flex items-center gap-1.5 transition-all ${
                selection
                  ? 'bg-sky-500 hover:bg-sky-400 text-white shadow-sm active:scale-95 cursor-pointer'
                  : 'bg-slate-800/50 text-slate-500 border border-slate-800 cursor-not-allowed'
              }`}
            >
              <Crop className="w-3.5 h-3.5" />
              <span>Capture Canvas Selection</span>
              {selection && (
                <span className="font-mono text-[10px] bg-sky-950/60 px-1.5 py-0.2 rounded border border-sky-400/40">
                  {Math.abs(selection.endX - selection.startX) + 1}×{Math.abs(selection.endY - selection.startY) + 1}
                </span>
              )}
            </button>

            {/* Import / Export Buttons */}
            <div className="flex items-center gap-1 pl-2 border-l border-slate-800">
              <button
                onClick={handleExportBrushes}
                disabled={userBrushes.length === 0}
                title="Export your custom brushes to JSON"
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors disabled:opacity-40"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                title="Import brush pack JSON"
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
              >
                <Upload className="w-3.5 h-3.5" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleImportFile}
                className="hidden"
              />
            </div>
          </div>
        </div>

        {/* Tab 1: Gallery View */}
        {activeTab === 'gallery' && (
          <div className="flex-1 flex flex-col p-5 overflow-hidden">
            {/* Gallery Filters & Search */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-1.5">
                {(['all', 'custom', 'builtin'] as const).map(cat => (
                  <button
                    key={cat}
                    onClick={() => setCategoryFilter(cat)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium capitalize transition-colors ${
                      categoryFilter === cat
                        ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                        : 'bg-slate-800/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                    }`}
                  >
                    {cat === 'all' ? 'All Patterns' : cat === 'custom' ? `Custom (${userBrushes.length})` : 'Built-in (6)'}
                  </button>
                ))}
              </div>

              <div className="relative w-64">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search brushes..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-950/70 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-purple-500 transition-colors"
                />
              </div>
            </div>

            {/* Pattern Cards Grid */}
            <div className="flex-1 overflow-y-auto pr-1 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {filteredBrushes.map(brush => {
                const isSelected = currentCustomBrush?.id === brush.id;

                return (
                  <div
                    key={brush.id}
                    onClick={() => onSelectBrush(brush)}
                    className={`group relative p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'bg-purple-950/30 border-purple-500 shadow-md ring-1 ring-purple-500'
                        : 'bg-slate-950/40 hover:bg-slate-800/40 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Mini Thumbnail */}
                      {renderPatternPreview(brush, 56)}

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <h3 className="font-semibold text-xs text-white truncate" title={brush.name}>
                            {brush.name}
                          </h3>
                          {brush.isBuiltIn ? (
                            <span className="text-[9px] px-1.5 py-0.2 rounded font-mono bg-slate-800 text-slate-400">
                              Built-in
                            </span>
                          ) : (
                            <span className="text-[9px] px-1.5 py-0.2 rounded font-mono bg-purple-500/20 text-purple-300 border border-purple-500/30">
                              Custom
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400">
                          <span className="font-mono">{brush.width}×{brush.height}</span>
                          <span>•</span>
                          <span>{brush.offsets.length} px</span>
                          {brush.useOriginalColors && (
                            <>
                              <span>•</span>
                              <span className="text-amber-400 font-medium">Color Stamp</span>
                            </>
                          )}
                        </div>

                        <p className="text-[10px] text-slate-500 mt-1 line-clamp-1">
                          {brush.category || 'Pixel pattern'}
                        </p>
                      </div>
                    </div>

                    {/* Action Bar */}
                    <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          onSelectBrush(brush);
                        }}
                        className={`px-2.5 py-1 rounded text-[11px] font-medium transition-all ${
                          isSelected
                            ? 'bg-purple-600 text-white font-bold'
                            : 'bg-slate-800 hover:bg-purple-600/30 text-purple-300 hover:text-white'
                        }`}
                      >
                        {isSelected ? 'Active Brush' : 'Select'}
                      </button>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            handleLoadBrushToEditor(brush);
                          }}
                          title="Edit in Matrix Designer"
                          className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                        >
                          <Sliders className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={e => handleDuplicateBrush(brush, e)}
                          title="Duplicate pattern"
                          className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        {!brush.isBuiltIn && (
                          <button
                            onClick={e => handleDeleteBrush(brush.id, e)}
                            title="Delete pattern"
                            className="p-1 rounded text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {filteredBrushes.length === 0 && (
                <div className="col-span-full py-12 flex flex-col items-center justify-center text-center text-slate-500">
                  <Paintbrush className="w-10 h-10 mb-2 opacity-30 text-purple-400" />
                  <p className="text-sm font-medium text-slate-400">No brush patterns found</p>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm">
                    Switch to the Matrix Stamp Designer to draw a new pattern or clear search filters.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Matrix Stamp Designer */}
        {activeTab === 'editor' && (
          <div className="flex-1 flex flex-col md:flex-row p-5 gap-6 overflow-y-auto">
            {/* Interactive Grid Canvas */}
            <div className="flex-1 flex flex-col items-center justify-center bg-slate-950/60 p-6 rounded-2xl border border-slate-800/80">
              <div className="mb-4 flex items-center justify-between w-full max-w-xs text-xs">
                <span className="text-slate-400 font-medium">Design Grid Matrix</span>
                <span className="font-mono text-purple-400 font-bold bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                  {editorGridSize}×{editorGridSize} Matrix
                </span>
              </div>

              {/* Matrix Grid */}
              <div 
                className="select-none bg-slate-900 border-2 border-slate-700/80 rounded-xl p-2 shadow-inner inline-grid gap-1 touch-none"
                style={{
                  gridTemplateColumns: `repeat(${editorGridSize}, minmax(0, 1fr))`
                }}
                onMouseDown={() => setIsMouseDown(true)}
                onMouseLeave={() => setIsMouseDown(false)}
              >
                {Array.from({ length: editorGridSize }).map((_, y) => (
                  <React.Fragment key={y}>
                    {Array.from({ length: editorGridSize }).map((_, x) => {
                      const key = `${x},${y}`;
                      const isPainted = Boolean(editorPixels[key]);
                      const cellColor = editorPixels[key] || 'transparent';
                      const isCenter = x === Math.floor(editorGridSize / 2) && y === Math.floor(editorGridSize / 2);

                      return (
                        <div
                          key={key}
                          onMouseDown={() => handlePaintCell(x, y)}
                          onMouseEnter={() => {
                            if (isMouseDown) handlePaintCell(x, y);
                          }}
                          className={`w-9 h-9 sm:w-11 sm:h-11 rounded-md border cursor-pointer transition-transform active:scale-95 flex items-center justify-center relative ${
                            isPainted
                              ? 'border-purple-400 shadow-md ring-1 ring-purple-400/40'
                              : isCenter
                              ? 'border-purple-500/40 bg-purple-950/20 hover:bg-slate-800'
                              : 'border-slate-800/80 bg-slate-950/80 hover:bg-slate-800'
                          }`}
                          style={{
                            backgroundColor: isPainted ? cellColor : undefined
                          }}
                        >
                          {/* Anchor dot for center pixel */}
                          {isCenter && !isPainted && (
                            <div className="w-1.5 h-1.5 rounded-full bg-purple-400/60" />
                          )}
                        </div>
                      );
                    })}
                  </React.Fragment>
                ))}
              </div>

              {/* Grid helpers */}
              <div className="mt-4 flex items-center gap-2 text-slate-500 text-[11px]">
                <Info className="w-3.5 h-3.5" />
                <span>Center dot indicates cursor crosshair anchor</span>
              </div>
            </div>

            {/* Editor Sidebar Controls */}
            <div className="w-full md:w-80 flex flex-col justify-between space-y-4">
              <div className="space-y-4">
                {/* Pattern Name */}
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-400 font-medium">Brush Pattern Name</label>
                  <input
                    type="text"
                    value={editorName}
                    onChange={e => setEditorName(e.target.value)}
                    placeholder="Enter pattern name..."
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-950/80 border border-slate-800 text-xs text-white focus:outline-hidden focus:border-purple-500 transition-colors"
                  />
                </div>

                {/* Grid Size Selection */}
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-400 font-medium">Matrix Size</label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[3, 5, 7, 9].map(sz => (
                      <button
                        key={sz}
                        onClick={() => {
                          setEditorGridSize(sz);
                          handleClearEditor();
                        }}
                        className={`py-1.5 rounded-lg text-xs font-mono font-bold transition-colors ${
                          editorGridSize === sz
                            ? 'bg-purple-600 text-white shadow-sm'
                            : 'bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800'
                        }`}
                      >
                        {sz}×{sz}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Draw Mode / Eraser / Color */}
                <div className="space-y-2 pt-2 border-t border-slate-800">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 font-medium">Draw Mode</span>
                    <button
                      onClick={() => setIsErasing(!isErasing)}
                      className={`px-2 py-0.5 rounded text-[11px] font-medium flex items-center gap-1 transition-colors ${
                        isErasing
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      <Eraser className="w-3 h-3" />
                      <span>{isErasing ? 'Eraser Mode' : 'Pen Mode'}</span>
                    </button>
                  </div>

                  {/* Stamp Color Picker */}
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={editorPenColor}
                      onChange={e => {
                        setEditorPenColor(e.target.value);
                        setIsErasing(false);
                      }}
                      className="w-8 h-8 rounded-lg bg-transparent border border-slate-700 cursor-pointer"
                    />
                    <div className="flex-1 flex gap-1.5">
                      {['#38bdf8', '#a855f7', '#ec4899', '#22c55e', '#eab308', '#ffffff'].map(c => (
                        <button
                          key={c}
                          onClick={() => {
                            setEditorPenColor(c);
                            setIsErasing(false);
                          }}
                          className={`w-6 h-6 rounded-md border transition-transform hover:scale-110 ${
                            editorPenColor.toLowerCase() === c.toLowerCase() && !isErasing
                              ? 'border-white scale-105 shadow-sm'
                              : 'border-slate-800'
                          }`}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Original Colors vs Monochrome Toggle */}
                <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80 space-y-1.5">
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300 font-medium">
                    <input
                      type="checkbox"
                      checked={editorUseOriginalColors}
                      onChange={e => setEditorUseOriginalColors(e.target.checked)}
                      className="rounded accent-purple-500 w-4 h-4 cursor-pointer"
                    />
                    <span>Preserve Multi-Color Stamp</span>
                  </label>
                  <p className="text-[10px] text-slate-400 leading-tight">
                    When enabled, the brush will paint using each pixel's exact color rather than tinting with the active tool color.
                  </p>
                </div>

                {/* Grid Transformation Quick Actions */}
                <div className="grid grid-cols-3 gap-1.5 text-xs">
                  <button
                    onClick={handleRotateEditor}
                    className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white flex items-center justify-center gap-1 transition-colors"
                  >
                    <RotateCw className="w-3 h-3" />
                    <span>Rotate</span>
                  </button>
                  <button
                    onClick={handleInvertEditor}
                    className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white flex items-center justify-center gap-1 transition-colors"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Invert</span>
                  </button>
                  <button
                    onClick={handleClearEditor}
                    className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white flex items-center justify-center gap-1 transition-colors"
                  >
                    <Eraser className="w-3 h-3" />
                    <span>Clear</span>
                  </button>
                </div>
              </div>

              {/* Bottom Save Action */}
              <div className="pt-4 border-t border-slate-800 space-y-2">
                <button
                  onClick={handleSaveEditorPattern}
                  className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 active:scale-95 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-lg transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <span>Save & Activate Brush Pattern</span>
                </button>
                <div className="text-[10px] text-slate-400 text-center">
                  Saved brushes automatically persist across sessions in local storage.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer / Status bar */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span>Active Brush:</span>
            <span className="font-semibold text-white">
              {currentCustomBrush ? currentCustomBrush.name : 'Default Procedural Shape'}
            </span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-medium transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
