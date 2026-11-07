/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Project, 
  ToolType, 
  ToolSettings, 
  LayoutSettings, 
  Layer, 
  Frame, 
  Voxel,
  SelectionArea,
  SpriteClipboard 
} from './types/sprite';
import { 
  loadCurrentProject, 
  saveCurrentProject, 
  getAllProjectsList,
  extrude2DTo3DVoxels 
} from './utils/storage';
import { DEFAULT_PALETTE } from './utils/palettes';
import { Header } from './components/Header';
import { Toolbar } from './components/Toolbar';
import { ToolSettingsBar } from './components/ToolSettingsBar';
import { SpriteEditor2D } from './components/SpriteEditor2D';
import { ModelEditor3D } from './components/ModelEditor3D';
import { LayerPanel } from './components/LayerPanel';
import { Timeline } from './components/Timeline';
import { PreviewPanel } from './components/PreviewPanel';
import { ExportModal } from './components/ExportModal';
import { TouchGesturesModal } from './components/TouchGesturesModal';
import { Dashboard } from './components/Dashboard';
import { MobileFrame } from './components/MobileFrame';
import { ApkBundleModal } from './components/ApkBundleModal';
import { blendPixelColors } from './utils/blendModes';
import { 
  Paintbrush, 
  FolderKanban, 
  Layers as LayersIcon, 
  Film, 
  Download,
  X,
  PanelLeft,
  Cloud
} from 'lucide-react';
import { useAutoBackup } from './hooks/useAutoBackup';

export default function App() {
  // Navigation View: Default to 'editor' so the editor canvas is immediately visible
  const [currentView, setCurrentView] = useState<'editor' | 'dashboard'>('editor');
  const [dashboardTab, setDashboardTab] = useState<'gallery' | 'backups'>('gallery');
  const [isFrameView, setIsFrameView] = useState<boolean>(false);

  // Mobile Bottom Sheet Dialogs
  const [showMobileLayers, setShowMobileLayers] = useState<boolean>(false);
  const [showMobileTimeline, setShowMobileTimeline] = useState<boolean>(false);

  // Projects Library State
  const [projectsList, setProjectsList] = useState<Project[]>(() => getAllProjectsList());

  // Main Active Project State
  const [project, setProject] = useState<Project>(() => {
    const list = getAllProjectsList();
    return list[0] || loadCurrentProject();
  });

  const [mode, setMode] = useState<'2d' | '3d'>('2d');
  const [lastSavedTime, setLastSavedTime] = useState<number | null>(Date.now());

  // Screen width state for responsive drawer behavior
  const [isMobileScreen, setIsMobileScreen] = useState<boolean>(() => {
    if (typeof window !== 'undefined') return window.innerWidth < 1024;
    return false;
  });

  useEffect(() => {
    const handleResize = () => {
      setIsMobileScreen(window.innerWidth < 1024);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Tool & Palette Settings
  const [activeTool, setActiveTool] = useState<ToolType>('pencil');
  const [activeColor, setActiveColor] = useState<string>('#ffffff');
  const [secondaryColor, setSecondaryColor] = useState<string>('#000000');

  const [toolSettings, setToolSettings] = useState<ToolSettings>({
    brushSize: 1,
    brushShape: 'square',
    opacity: 1,
    symmetry: 'none',
    symmetryAngle: 0,
    symmetryRays: 8,
    symmetryGuideVisible: true,
    symmetryGuideRings: true,
    mirrorAxis: 'horizontal',
    ditherPattern: 'checker',
    stabilization: false,
    stabilizationWeight: 6,
    pressureSensitivity: false,
    pressureAffectsSize: true,
    pressureAffectsOpacity: true,
    gridVisible: true,
    gridColor: 'rgba(255, 255, 255, 0.12)',
    gridOpacity: 0.25,
    gridSpacing: 1,
    snapToGrid: false,
    tileGridVisible: false,
    tileGridSize: 16,
    onionSkin: false,
    onionSkinOpacity: 0.5,
    activeColor: '#ffffff',
    secondaryColor: '#000000',
    touchSensitivity: 1,
    haptics: true,
    voxelSymmetryX: false,
    voxelSymmetryY: false,
    voxelSymmetryZ: false
  });

  // Layout Preferences
  const [layoutSettings, setLayoutSettings] = useState<LayoutSettings>({
    toolbarPosition: 'left',
    compactMode: false,
    zenMode: false,
    theme: 'dark',
    showTouchGesturesGuide: false,
    activeTab: '2d'
  });

  // Modals
  const [isExportOpen, setIsExportOpen] = useState<boolean>(false);
  const [isGesturesGuideOpen, setIsGesturesGuideOpen] = useState<boolean>(false);
  const [isApkModalOpen, setIsApkModalOpen] = useState<boolean>(false);

  // Toolbar visibility (Collapsible for maximum canvas space!)
  const [isToolbarHidden, setIsToolbarHidden] = useState<boolean>(false);

  // Selection & Clipboard state
  const [selection, setSelection] = useState<SelectionArea | null>(null);
  const [clipboard, setClipboard] = useState<SpriteClipboard | null>(null);
  const [floatingPaste, setFloatingPaste] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
    pixels: string[];
  } | null>(null);


  // Undo / Redo History Stack (up to 30 entries)
  const historyStack = useRef<Project[]>([project]);
  const historyIndex = useRef<number>(0);

  // Refresh projects library from local storage
  const handleRefreshProjects = useCallback(() => {
    const updatedList = getAllProjectsList();
    setProjectsList(updatedList);
  }, []);

  // Background Cloud-Synced Auto-Backup Hook
  const autoBackup = useAutoBackup({
    project,
    onBackupSuccess: () => {
      handleRefreshProjects();
    }
  });

  // Sync active colors into toolSettings
  useEffect(() => {
    setToolSettings(prev => ({ ...prev, activeColor, secondaryColor }));
  }, [activeColor, secondaryColor]);

  // Debounced Auto-Saving to LocalStorage
  const saveTimeout = useRef<number | null>(null);
  const triggerAutoSave = useCallback((updatedProject: Project) => {
    if (saveTimeout.current) {
      window.clearTimeout(saveTimeout.current);
    }
    saveTimeout.current = window.setTimeout(() => {
      saveCurrentProject(updatedProject);
      setLastSavedTime(Date.now());
      handleRefreshProjects();
    }, 500);
  }, [handleRefreshProjects]);

  // Push new state to history
  const pushHistory = useCallback((newProject: Project) => {
    const currentHist = historyStack.current.slice(0, historyIndex.current + 1);
    currentHist.push(JSON.parse(JSON.stringify(newProject)));
    if (currentHist.length > 30) currentHist.shift();

    historyStack.current = currentHist;
    historyIndex.current = currentHist.length - 1;

    setProject(newProject);
    triggerAutoSave(newProject);
  }, [triggerAutoSave]);

  // Selection from Dashboard -> Switch to Editor Studio
  const handleSelectProjectFromDashboard = (selected: Project) => {
    setProject(selected);
    historyStack.current = [selected];
    historyIndex.current = 0;
    if (selected.voxels.length > 0 && selected.frames.length === 1 && selected.frames[0].layers[0].pixels.every(p => !p)) {
      setMode('3d');
    } else {
      setMode('2d');
    }
    setCurrentView('editor');
  };

  // Undo Handler
  const handleUndo = useCallback(() => {
    if (historyIndex.current > 0) {
      historyIndex.current -= 1;
      const prev = JSON.parse(JSON.stringify(historyStack.current[historyIndex.current]));
      setProject(prev);
      triggerAutoSave(prev);
    }
  }, [triggerAutoSave]);

  // Redo Handler
  const handleRedo = useCallback(() => {
    if (historyIndex.current < historyStack.current.length - 1) {
      historyIndex.current += 1;
      const next = JSON.parse(JSON.stringify(historyStack.current[historyIndex.current]));
      setProject(next);
      triggerAutoSave(next);
    }
  }, [triggerAutoSave]);

  // Live pixel update while drawing (ultra-fast 60fps, no history cloning)
  const handleLiveLayerPixels = useCallback((layerId: string, newPixels: string[]) => {
    setProject(prev => {
      const frames = [...prev.frames];
      const currentFrame = { ...frames[prev.currentFrameIndex] };
      const layers = currentFrame.layers.map(layer => {
        if (layer.id === layerId) {
          return { ...layer, pixels: newPixels };
        }
        return layer;
      });
      currentFrame.layers = layers;
      frames[prev.currentFrameIndex] = currentFrame;
      return { ...prev, frames };
    });
  }, []);

  // Stroke commit on pointer release (single push to undo history and autosave)
  const handleCommitLayerPixels = useCallback((layerId: string, newPixels: string[]) => {
    setProject(prev => {
      const frames = [...prev.frames];
      const currentFrame = { ...frames[prev.currentFrameIndex] };
      const layers = currentFrame.layers.map(layer => {
        if (layer.id === layerId) {
          return { ...layer, pixels: newPixels };
        }
        return layer;
      });
      currentFrame.layers = layers;
      frames[prev.currentFrameIndex] = currentFrame;
      const updated = { ...prev, frames };
      pushHistory(updated);
      return updated;
    });
  }, [pushHistory]);

  const handleUpdateLayerPixels = (layerId: string, newPixels: string[]) => {
    handleCommitLayerPixels(layerId, newPixels);
  };

  // Selection & Clipboard Actions
  const handleCopy = useCallback(() => {
    const curFrame = project.frames[project.currentFrameIndex] || project.frames[0];
    const actLayer = curFrame?.layers.find(l => l.id === project.activeLayerId) || curFrame?.layers[0];
    if (!selection || !actLayer) return;

    const minX = Math.max(0, Math.min(selection.startX, selection.endX));
    const maxX = Math.min(project.width - 1, Math.max(selection.startX, selection.endX));
    const minY = Math.max(0, Math.min(selection.startY, selection.endY));
    const maxY = Math.min(project.height - 1, Math.max(selection.startY, selection.endY));
    const selW = maxX - minX + 1;
    const selH = maxY - minY + 1;
    if (selW <= 0 || selH <= 0) return;

    const pixels: string[] = new Array(selW * selH).fill('');
    for (let y = 0; y < selH; y++) {
      for (let x = 0; x < selW; x++) {
        const srcIdx = (minY + y) * project.width + (minX + x);
        pixels[y * selW + x] = actLayer.pixels[srcIdx] || '';
      }
    }
    setClipboard({ width: selW, height: selH, pixels });
  }, [project, selection]);

  const handleCut = useCallback(() => {
    const curFrame = project.frames[project.currentFrameIndex] || project.frames[0];
    const actLayer = curFrame?.layers.find(l => l.id === project.activeLayerId) || curFrame?.layers[0];
    if (!selection || !actLayer || actLayer.locked) return;

    const minX = Math.max(0, Math.min(selection.startX, selection.endX));
    const maxX = Math.min(project.width - 1, Math.max(selection.startX, selection.endX));
    const minY = Math.max(0, Math.min(selection.startY, selection.endY));
    const maxY = Math.min(project.height - 1, Math.max(selection.startY, selection.endY));
    const selW = maxX - minX + 1;
    const selH = maxY - minY + 1;
    if (selW <= 0 || selH <= 0) return;

    const pixels: string[] = new Array(selW * selH).fill('');
    const newPixels = [...actLayer.pixels];
    for (let y = 0; y < selH; y++) {
      for (let x = 0; x < selW; x++) {
        const srcIdx = (minY + y) * project.width + (minX + x);
        pixels[y * selW + x] = actLayer.pixels[srcIdx] || '';
        newPixels[srcIdx] = '';
      }
    }
    setClipboard({ width: selW, height: selH, pixels });
    handleCommitLayerPixels(actLayer.id, newPixels);
  }, [project, selection, handleCommitLayerPixels]);

  const handleDelete = useCallback(() => {
    const curFrame = project.frames[project.currentFrameIndex] || project.frames[0];
    const actLayer = curFrame?.layers.find(l => l.id === project.activeLayerId) || curFrame?.layers[0];
    if (!selection || !actLayer || actLayer.locked) return;

    const minX = Math.max(0, Math.min(selection.startX, selection.endX));
    const maxX = Math.min(project.width - 1, Math.max(selection.startX, selection.endX));
    const minY = Math.max(0, Math.min(selection.startY, selection.endY));
    const maxY = Math.min(project.height - 1, Math.max(selection.startY, selection.endY));

    const newPixels = [...actLayer.pixels];
    let changed = false;
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const idx = y * project.width + x;
        if (newPixels[idx]) {
          newPixels[idx] = '';
          changed = true;
        }
      }
    }
    if (changed) {
      handleCommitLayerPixels(actLayer.id, newPixels);
    }
  }, [project, selection, handleCommitLayerPixels]);

  const handlePaste = useCallback(() => {
    if (!clipboard) return;
    const posX = selection ? Math.min(selection.startX, selection.endX) : Math.max(0, Math.floor((project.width - clipboard.width) / 2));
    const posY = selection ? Math.min(selection.startY, selection.endY) : Math.max(0, Math.floor((project.height - clipboard.height) / 2));

    setFloatingPaste({
      x: posX,
      y: posY,
      width: clipboard.width,
      height: clipboard.height,
      pixels: [...clipboard.pixels]
    });
  }, [clipboard, selection, project.width, project.height]);

  const handleCommitFloatingPaste = useCallback(() => {
    const curFrame = project.frames[project.currentFrameIndex] || project.frames[0];
    const actLayer = curFrame?.layers.find(l => l.id === project.activeLayerId) || curFrame?.layers[0];
    if (!floatingPaste || !actLayer || actLayer.locked) return;

    const newPixels = [...actLayer.pixels];
    for (let py = 0; py < floatingPaste.height; py++) {
      for (let px = 0; px < floatingPaste.width; px++) {
        const color = floatingPaste.pixels[py * floatingPaste.width + px];
        if (color) {
          const destX = floatingPaste.x + px;
          const destY = floatingPaste.y + py;
          if (destX >= 0 && destX < project.width && destY >= 0 && destY < project.height) {
            newPixels[destY * project.width + destX] = color;
          }
        }
      }
    }
    handleCommitLayerPixels(actLayer.id, newPixels);
    setSelection({
      startX: Math.max(0, floatingPaste.x),
      startY: Math.max(0, floatingPaste.y),
      endX: Math.min(project.width - 1, floatingPaste.x + floatingPaste.width - 1),
      endY: Math.min(project.height - 1, floatingPaste.y + floatingPaste.height - 1)
    });
    setFloatingPaste(null);
  }, [floatingPaste, project, handleCommitLayerPixels]);

  const handleSelectAll = useCallback(() => {
    setSelection({
      startX: 0,
      startY: 0,
      endX: project.width - 1,
      endY: project.height - 1
    });
    setActiveTool('select');
  }, [project.width, project.height]);

  const handleDeselect = useCallback(() => {
    setSelection(null);
    setFloatingPaste(null);
  }, []);

  // Keyboard Shortcuts Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        handleCopy();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'x') {
        e.preventDefault();
        handleCut();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
        e.preventDefault();
        handlePaste();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        handleSelectAll();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selection) {
          e.preventDefault();
          handleDelete();
        }
      } else if (e.key === 'Escape') {
        if (floatingPaste) {
          e.preventDefault();
          setFloatingPaste(null);
        } else if (selection) {
          e.preventDefault();
          handleDeselect();
        }
      } else if (e.key === 'Enter') {
        if (floatingPaste) {
          e.preventDefault();
          handleCommitFloatingPaste();
        }
      } else if (e.key === 'Tab') {
        e.preventDefault();
        setMode(m => (m === '2d' ? '3d' : '2d'));
      } else if (e.key.toLowerCase() === 'b') {
        setActiveTool('pencil');
      } else if (e.key.toLowerCase() === 'e') {
        setActiveTool('eraser');
      } else if (e.key.toLowerCase() === 'g') {
        setActiveTool('bucket');
      } else if (e.key.toLowerCase() === 'i') {
        setActiveTool('picker');
      } else if (e.key.toLowerCase() === 'l') {
        setActiveTool('line');
      } else if (e.key.toLowerCase() === 'u') {
        setActiveTool('rect');
      } else if (e.key.toLowerCase() === 'c') {
        setActiveTool('circle');
      } else if (e.shiftKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        setToolSettings(prev => {
          const nextSnap = !prev.snapToGrid;
          return {
            ...prev,
            snapToGrid: nextSnap,
            ...(nextSnap && (!prev.gridSpacing || prev.gridSpacing <= 1) ? { gridSpacing: 8, gridVisible: true } : {}),
            ...(nextSnap && !prev.gridVisible ? { gridVisible: true } : {})
          };
        });
      } else if (e.key.toLowerCase() === 's') {
        setActiveTool('select');
      } else if (e.key.toLowerCase() === 'm') {
        setActiveTool('mirror');
      } else if (e.key.toLowerCase() === 'd') {
        setActiveTool('dither');
      } else if (e.key.toLowerCase() === 'x') {
        setActiveColor(prev => {
          const next = secondaryColor;
          setSecondaryColor(prev);
          return next;
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    handleUndo, 
    handleRedo, 
    handleCopy, 
    handleCut, 
    handlePaste, 
    handleDelete, 
    handleSelectAll, 
    handleDeselect, 
    handleCommitFloatingPaste, 
    selection, 
    floatingPaste, 
    secondaryColor
  ]);

  // Project Updaters
  const handleUpdateProjectName = (name: string) => {
    const updated = { ...project, name };
    setProject(updated);
    triggerAutoSave(updated);
  };


  const handleUpdateLayer = (layerId: string, updates: Partial<Layer>) => {
    const frames = [...project.frames];
    const currentFrame = { ...frames[project.currentFrameIndex] };
    currentFrame.layers = currentFrame.layers.map(layer => {
      if (layer.id === layerId) {
        return { ...layer, ...updates };
      }
      return layer;
    });
    frames[project.currentFrameIndex] = currentFrame;
    pushHistory({ ...project, frames });
  };

  const handleAddLayer = () => {
    const frames = [...project.frames];
    const currentFrame = { ...frames[project.currentFrameIndex] };
    const newLayerId = 'layer-' + Date.now();
    const newLayer: Layer = {
      id: newLayerId,
      name: `Layer ${currentFrame.layers.length + 1}`,
      visible: true,
      locked: false,
      opacity: 1,
      blendMode: 'normal',
      pixels: new Array(project.width * project.height).fill('')
    };

    currentFrame.layers = [...currentFrame.layers, newLayer];
    frames[project.currentFrameIndex] = currentFrame;

    pushHistory({
      ...project,
      frames,
      activeLayerId: newLayerId
    });
  };

  const handleDuplicateLayer = (layerId: string) => {
    const frames = [...project.frames];
    const currentFrame = { ...frames[project.currentFrameIndex] };
    const targetIdx = currentFrame.layers.findIndex(l => l.id === layerId);
    if (targetIdx < 0) return;

    const source = currentFrame.layers[targetIdx];
    const newLayerId = 'layer-' + Date.now();
    const dup: Layer = {
      ...source,
      id: newLayerId,
      name: `${source.name} (Copy)`,
      pixels: [...source.pixels]
    };

    currentFrame.layers.splice(targetIdx + 1, 0, dup);
    frames[project.currentFrameIndex] = currentFrame;

    pushHistory({
      ...project,
      frames,
      activeLayerId: newLayerId
    });
  };

  const handleDeleteLayer = (layerId: string) => {
    const frames = [...project.frames];
    const currentFrame = { ...frames[project.currentFrameIndex] };
    if (currentFrame.layers.length <= 1) return;

    currentFrame.layers = currentFrame.layers.filter(l => l.id !== layerId);
    frames[project.currentFrameIndex] = currentFrame;

    pushHistory({
      ...project,
      frames,
      activeLayerId: currentFrame.layers[0]?.id || ''
    });
  };

  const handleMergeDown = (layerId: string) => {
    const frames = [...project.frames];
    const currentFrame = { ...frames[project.currentFrameIndex] };
    const idx = currentFrame.layers.findIndex(l => l.id === layerId);
    if (idx <= 0) return;

    const top = currentFrame.layers[idx];
    const bottom = currentFrame.layers[idx - 1];

    const mergedPixels = [...bottom.pixels];
    const topOpacity = typeof top.opacity === 'number' ? top.opacity : 1.0;
    for (let i = 0; i < top.pixels.length; i++) {
      if (top.pixels[i]) {
        mergedPixels[i] = blendPixelColors(
          bottom.pixels[i],
          top.pixels[i],
          top.blendMode || 'normal',
          topOpacity
        );
      }
    }

    const mergedLayer: Layer = {
      ...bottom,
      pixels: mergedPixels
    };

    currentFrame.layers.splice(idx - 1, 2, mergedLayer);
    frames[project.currentFrameIndex] = currentFrame;

    pushHistory({
      ...project,
      frames,
      activeLayerId: mergedLayer.id
    });
  };

  const handleMoveLayer = (layerId: string, direction: 'up' | 'down') => {
    const frames = [...project.frames];
    const currentFrame = { ...frames[project.currentFrameIndex] };
    const idx = currentFrame.layers.findIndex(l => l.id === layerId);
    if (idx < 0) return;

    const targetIdx = direction === 'up' ? idx + 1 : idx - 1;
    if (targetIdx < 0 || targetIdx >= currentFrame.layers.length) return;

    const temp = currentFrame.layers[idx];
    currentFrame.layers[idx] = currentFrame.layers[targetIdx];
    currentFrame.layers[targetIdx] = temp;

    frames[project.currentFrameIndex] = currentFrame;
    pushHistory({ ...project, frames });
  };

  // Timeline Handlers
  const handleSelectFrame = (index: number) => {
    setProject(p => ({ ...p, currentFrameIndex: index }));
  };

  const handleAddFrame = () => {
    const newFrameId = 'frame-' + Date.now();
    const blankLayers: Layer[] = project.frames[0].layers.map((l, i) => ({
      ...l,
      id: `layer-${Date.now()}-${i}`,
      pixels: new Array(project.width * project.height).fill('')
    }));

    const newFrame: Frame = {
      id: newFrameId,
      name: `Frame ${project.frames.length + 1}`,
      durationMs: 150,
      layers: blankLayers
    };

    const frames = [...project.frames, newFrame];
    pushHistory({
      ...project,
      frames,
      currentFrameIndex: frames.length - 1
    });
  };

  const handleDuplicateFrame = (index: number) => {
    const source = project.frames[index];
    const newFrameId = 'frame-' + Date.now();
    const dupLayers: Layer[] = source.layers.map((l, i) => ({
      ...l,
      id: `layer-${Date.now()}-${i}`,
      pixels: [...l.pixels]
    }));

    const newFrame: Frame = {
      ...source,
      id: newFrameId,
      name: `${source.name} (Copy)`,
      layers: dupLayers
    };

    const frames = [...project.frames];
    frames.splice(index + 1, 0, newFrame);

    pushHistory({
      ...project,
      frames,
      currentFrameIndex: index + 1
    });
  };

  const handleDeleteFrame = (index: number) => {
    if (project.frames.length <= 1) return;
    const frames = project.frames.filter((_, i) => i !== index);
    const newIdx = Math.min(index, frames.length - 1);
    pushHistory({
      ...project,
      frames,
      currentFrameIndex: newIdx
    });
  };

  const handleUpdateFrameDuration = (index: number, durationMs: number) => {
    const frames = [...project.frames];
    frames[index] = { ...frames[index], durationMs };
    pushHistory({ ...project, frames });
  };

  const handleUpdatePalette = useCallback((colors: string[]) => {
    setProject(prev => {
      const updated = { ...prev, palette: colors };
      triggerAutoSave(updated);
      return updated;
    });
  }, [triggerAutoSave]);

  const handleAddMorphFrames = useCallback((newFrames: Frame[], insertAfterIndex?: number) => {
    setProject(prev => {
      const frames = [...prev.frames];
      const insertAt = typeof insertAfterIndex === 'number' ? insertAfterIndex + 1 : frames.length;
      frames.splice(insertAt, 0, ...newFrames);
      const updated = {
        ...prev,
        frames,
        currentFrameIndex: Math.min(insertAt, frames.length - 1)
      };
      pushHistory(updated);
      return updated;
    });
  }, [pushHistory]);

  // 3D Voxel Updaters
  const handleUpdateVoxels = (newVoxels: Voxel[]) => {
    pushHistory({
      ...project,
      voxels: newVoxels
    });
  };

  // Extrude 2D Sprite to 3D Voxel Model
  const handleExtrude2D = () => {
    const currentFrame = project.frames[project.currentFrameIndex] || project.frames[0];
    const extruded = extrude2DTo3DVoxels(currentFrame, project.width, project.height, 3);
    pushHistory({
      ...project,
      voxels: extruded
    });
    setMode('3d');
  };

  const currentFrame = project.frames[project.currentFrameIndex] || project.frames[0];
  const previousFrame = project.currentFrameIndex > 0 ? project.frames[project.currentFrameIndex - 1] : undefined;
  const nextFrame = project.currentFrameIndex < project.frames.length - 1 ? project.frames[project.currentFrameIndex + 1] : undefined;
  const activeLayer = currentFrame?.layers.find(l => l.id === project.activeLayerId) || currentFrame?.layers[0];
  const isLayerLocked = Boolean(activeLayer?.locked);

  const handleUnlockActiveLayer = useCallback(() => {
    if (activeLayer) {
      handleUpdateLayer(activeLayer.id, { locked: false });
    }
  }, [activeLayer, handleUpdateLayer]);

  return (
    <MobileFrame
      isFrameView={isFrameView}
      onToggleFrameView={() => setIsFrameView(!isFrameView)}
    >
      {currentView === 'dashboard' ? (
        /* Native Android Creation & Selection Dashboard */
        <Dashboard
          projects={projectsList}
          activeProjectId={project.id}
          onSelectProject={handleSelectProjectFromDashboard}
          onRefreshProjects={handleRefreshProjects}
          onOpenGesturesGuide={() => setIsGesturesGuideOpen(true)}
          onOpenApkBundle={() => setIsApkModalOpen(true)}
          isFrameView={isFrameView}
          onToggleFrameView={() => setIsFrameView(!isFrameView)}
          initialTab={dashboardTab}
          onTabChange={setDashboardTab}
        />
      ) : (
        /* Native Android Studio Editor (2D / 3D) */
        <div className="flex flex-col w-full h-[100dvh] overflow-hidden bg-slate-950 text-slate-100 select-none">
          {/* Header with Back to Dashboard button */}
          <Header
            project={project}
            onUpdateProjectName={handleUpdateProjectName}
            canUndo={historyIndex.current > 0}
            canRedo={historyIndex.current < historyStack.current.length - 1}
            onUndo={handleUndo}
            onRedo={handleRedo}
            onOpenExport={() => setIsExportOpen(true)}
            onOpenApkBundle={() => setIsApkModalOpen(true)}
            onOpenGesturesGuide={() => setIsGesturesGuideOpen(true)}
            onBackToDashboard={() => {
              handleRefreshProjects();
              setDashboardTab('gallery');
              setCurrentView('dashboard');
            }}
            onOpenBackups={() => {
              handleRefreshProjects();
              setDashboardTab('backups');
              setCurrentView('dashboard');
            }}
            isBackingUp={autoBackup.isBackingUp}
            isToolbarHidden={isToolbarHidden}
            onToggleToolbar={() => setIsToolbarHidden(!isToolbarHidden)}
          />

          {/* Subtle Auto-Backup Notification Toast */}
          {autoBackup.recentNotification && (
            <div className="absolute top-14 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/95 border border-emerald-500/50 text-emerald-300 text-xs font-semibold shadow-2xl backdrop-blur-md animate-fade-in pointer-events-none">
              <Cloud className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              <span>{autoBackup.recentNotification}</span>
            </div>
          )}

          {/* Context-Sensitive Tool Settings Bar - Animated entry/exit */}
          <div
            className={`w-full overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] will-change-[max-height,transform,opacity] ${
              isToolbarHidden
                ? 'max-h-0 opacity-0 -translate-y-2 pointer-events-none'
                : 'max-h-16 opacity-100 translate-y-0'
            }`}
            aria-hidden={isToolbarHidden}
          >
            <ToolSettingsBar
              mode={mode}
              activeTool={activeTool}
              onSelectTool={setActiveTool}
              settings={toolSettings}
              onUpdateSettings={updates => setToolSettings(prev => ({ ...prev, ...updates }))}
              selection={selection}
              hasClipboard={Boolean(clipboard)}
              onCut={handleCut}
              onCopy={handleCopy}
              onPaste={handlePaste}
              onDelete={handleDelete}
              onSelectAll={handleSelectAll}
              onDeselect={handleDeselect}
              isLayerLocked={isLayerLocked}
              isTransparencyLocked={Boolean(activeLayer?.alphaLocked)}
              onToggleLockTransparency={() => {
                if (activeLayer) {
                  handleUpdateLayer(activeLayer.id, { alphaLocked: !activeLayer.alphaLocked });
                }
              }}
              activeLayerPixels={activeLayer?.pixels}
              canvasWidth={project.width}
              canvasHeight={project.height}
              activeColor={activeColor}
            />
          </div>

          {/* Main Studio Body - Canvas gets full remaining space! */}
          <div className="flex-1 flex overflow-hidden relative">
            {/* Docked Toolbar (Left) - Animated entry/exit */}
            {layoutSettings.toolbarPosition === 'left' && (
              <div
                className={`h-full overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] will-change-[width,max-width,transform,opacity] shrink-0 z-30 ${
                  isToolbarHidden || layoutSettings.zenMode
                    ? 'w-0 max-w-0 opacity-0 -translate-x-full pointer-events-none'
                    : 'w-12 sm:w-14 max-w-[3.5rem] opacity-100 translate-x-0'
                }`}
                aria-hidden={isToolbarHidden || layoutSettings.zenMode}
              >
                <Toolbar
                  activeTool={activeTool}
                  onSelectTool={setActiveTool}
                  activeColor={activeColor}
                  secondaryColor={secondaryColor}
                  onSelectColor={setActiveColor}
                  onSwapColors={() => {
                    setActiveColor(secondaryColor);
                    setSecondaryColor(activeColor);
                  }}
                  palette={project.palette}
                  onSelectPalettePreset={colors => {
                    setProject(p => ({ ...p, palette: colors }));
                    setActiveColor(colors[0]);
                  }}
                  onUpdatePalette={handleUpdatePalette}
                  layoutSettings={layoutSettings}
                  toolSettings={toolSettings}
                  onUpdateToolSettings={updates => setToolSettings(prev => ({ ...prev, ...updates }))}
                  mode={mode}
                  onHideToolbar={() => setIsToolbarHidden(true)}
                  selection={selection}
                  hasClipboard={Boolean(clipboard)}
                  onCut={handleCut}
                  onCopy={handleCopy}
                  onPaste={handlePaste}
                  onDelete={handleDelete}
                  onSelectAll={handleSelectAll}
                  onDeselect={handleDeselect}
                  isLayerLocked={isLayerLocked}
                />
              </div>
            )}

            {/* Floating button to reveal toolbar when hidden */}
            <button
              onClick={() => setIsToolbarHidden(false)}
              title="Show Toolbar"
              aria-label="Show Toolbar"
              className={`absolute top-3 left-3 z-30 p-2.5 rounded-2xl bg-slate-900/90 border border-slate-700/80 text-sky-400 shadow-2xl backdrop-blur-md active:scale-95 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                isToolbarHidden && !layoutSettings.zenMode
                  ? 'opacity-100 scale-100 pointer-events-auto'
                  : 'opacity-0 scale-75 pointer-events-none'
              }`}
            >
              <PanelLeft className="w-5 h-5" />
            </button>

            {/* Central Viewport Area (2D Sprite or 3D Voxel) */}
            <main className="flex-1 relative overflow-hidden bg-slate-950 flex flex-col w-full h-full">
              {mode === '2d' ? (
                <SpriteEditor2D
                  frames={project.frames}
                  currentFrameIndex={project.currentFrameIndex}
                  currentFrame={currentFrame}
                  previousFrame={previousFrame}
                  nextFrame={nextFrame}
                  width={project.width}
                  height={project.height}
                  activeLayerId={project.activeLayerId || currentFrame.layers[0]?.id}
                  activeTool={activeTool}
                  toolSettings={toolSettings}
                  onUpdateLayerPixels={handleUpdateLayerPixels}
                  onLiveLayerPixels={handleLiveLayerPixels}
                  onCommitLayerPixels={handleCommitLayerPixels}
                  onColorPick={setActiveColor}
                  onUndo={handleUndo}
                  onRedo={handleRedo}
                  onShowGestureGuide={() => setIsGesturesGuideOpen(true)}
                  selection={selection}
                  onSetSelection={setSelection}
                  clipboard={clipboard}
                  onCopy={handleCopy}
                  onCut={handleCut}
                  onPaste={handlePaste}
                  onDelete={handleDelete}
                  onSelectAll={handleSelectAll}
                  onDeselect={handleDeselect}
                  floatingPaste={floatingPaste}
                  onSetFloatingPaste={setFloatingPaste}
                  onCommitFloatingPaste={handleCommitFloatingPaste}
                  onUnlockActiveLayer={handleUnlockActiveLayer}
                  onAddMorphFrames={handleAddMorphFrames}
                  onDuplicateFrame={handleDuplicateFrame}
                  onUpdateToolSettings={updates => setToolSettings(prev => ({ ...prev, ...updates }))}
                />
              ) : (
                <ModelEditor3D
                  voxels={project.voxels}
                  gridSize={project.voxelGridSize || 24}
                  activeColor={activeColor}
                  toolSettings={toolSettings}
                  onUpdateVoxels={handleUpdateVoxels}
                  onColorPick={setActiveColor}
                  onExtrude2D={handleExtrude2D}
                />
              )}

              {/* Floating Real-Time Preview Panel (2D Mode) */}
              {mode === '2d' && !layoutSettings.zenMode && (
                <PreviewPanel
                  frames={project.frames}
                  width={project.width}
                  height={project.height}
                  currentFrameIndex={project.currentFrameIndex}
                />
              )}
            </main>

            {/* Docked Toolbar (Right) - Animated entry/exit */}
            {layoutSettings.toolbarPosition === 'right' && (
              <div
                className={`h-full overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] will-change-[width,max-width,transform,opacity] shrink-0 z-30 ${
                  isToolbarHidden || layoutSettings.zenMode
                    ? 'w-0 max-w-0 opacity-0 translate-x-full pointer-events-none'
                    : 'w-12 sm:w-14 max-w-[3.5rem] opacity-100 translate-x-0'
                }`}
                aria-hidden={isToolbarHidden || layoutSettings.zenMode}
              >
                <Toolbar
                  activeTool={activeTool}
                  onSelectTool={setActiveTool}
                  activeColor={activeColor}
                  secondaryColor={secondaryColor}
                  onSelectColor={setActiveColor}
                  onSwapColors={() => {
                    setActiveColor(secondaryColor);
                    setSecondaryColor(activeColor);
                  }}
                  palette={project.palette}
                  onSelectPalettePreset={colors => {
                    setProject(p => ({ ...p, palette: colors }));
                    setActiveColor(colors[0]);
                  }}
                  onUpdatePalette={handleUpdatePalette}
                  layoutSettings={layoutSettings}
                  toolSettings={toolSettings}
                  onUpdateToolSettings={updates => setToolSettings(prev => ({ ...prev, ...updates }))}
                  mode={mode}
                  onHideToolbar={() => setIsToolbarHidden(true)}
                  selection={selection}
                  hasClipboard={Boolean(clipboard)}
                  onCut={handleCut}
                  onCopy={handleCopy}
                  onPaste={handlePaste}
                  onDelete={handleDelete}
                  onSelectAll={handleSelectAll}
                  onDeselect={handleDeselect}
                  isLayerLocked={isLayerLocked}
                />
              </div>
            )}

            {/* Desktop Docked Layer Panel (ONLY on wide screens >= 1024px) */}
            {!isMobileScreen && mode === '2d' && !layoutSettings.zenMode && (
              <LayerPanel
                layers={currentFrame.layers}
                activeLayerId={project.activeLayerId || currentFrame.layers[0]?.id}
                width={project.width}
                height={project.height}
                onSelectLayer={id => setProject(p => ({ ...p, activeLayerId: id }))}
                onAddLayer={handleAddLayer}
                onDuplicateLayer={handleDuplicateLayer}
                onDeleteLayer={handleDeleteLayer}
                onMergeDown={handleMergeDown}
                onMoveLayer={handleMoveLayer}
                onUpdateLayer={handleUpdateLayer}
              />
            )}
          </div>

          {/* Docked Toolbar (Bottom) - Animated entry/exit */}
          {layoutSettings.toolbarPosition === 'bottom' && (
            <div
              className={`w-full overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] will-change-[max-height,transform,opacity] shrink-0 z-30 ${
                isToolbarHidden || layoutSettings.zenMode
                  ? 'max-h-0 opacity-0 translate-y-full pointer-events-none'
                  : 'max-h-20 opacity-100 translate-y-0'
              }`}
              aria-hidden={isToolbarHidden || layoutSettings.zenMode}
            >
              <Toolbar
                activeTool={activeTool}
                onSelectTool={setActiveTool}
                activeColor={activeColor}
                secondaryColor={secondaryColor}
                onSelectColor={setActiveColor}
                onSwapColors={() => {
                  setActiveColor(secondaryColor);
                  setSecondaryColor(activeColor);
                }}
                palette={project.palette}
                onSelectPalettePreset={colors => {
                  setProject(p => ({ ...p, palette: colors }));
                  setActiveColor(colors[0]);
                }}
                onUpdatePalette={handleUpdatePalette}
                layoutSettings={layoutSettings}
                toolSettings={toolSettings}
                onUpdateToolSettings={updates => setToolSettings(prev => ({ ...prev, ...updates }))}
                mode={mode}
                onHideToolbar={() => setIsToolbarHidden(true)}
                selection={selection}
                hasClipboard={Boolean(clipboard)}
                onCut={handleCut}
                onCopy={handleCopy}
                onPaste={handlePaste}
                onDelete={handleDelete}
                onSelectAll={handleSelectAll}
                onDeselect={handleDeselect}
                isLayerLocked={isLayerLocked}
              />
            </div>
          )}


          {/* Desktop Timeline (ONLY on wide screens >= 1024px) */}
          {!isMobileScreen && mode === '2d' && !layoutSettings.zenMode && (
            <Timeline
              frames={project.frames}
              currentFrameIndex={project.currentFrameIndex}
              width={project.width}
              height={project.height}
              onSelectFrame={handleSelectFrame}
              onAddFrame={handleAddFrame}
              onDuplicateFrame={handleDuplicateFrame}
              onDeleteFrame={handleDeleteFrame}
              onUpdateFrameDuration={handleUpdateFrameDuration}
            />
          )}

          {/* Mobile Slide-Up Bottom Sheet for Layers */}
          {isMobileScreen && showMobileLayers && (
            <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end justify-center">
              <div className="bg-slate-900 border-t border-slate-700 rounded-t-3xl w-full max-h-[75vh] flex flex-col shadow-2xl overflow-hidden">
                <LayerPanel
                  layers={currentFrame.layers}
                  activeLayerId={project.activeLayerId || currentFrame.layers[0]?.id}
                  width={project.width}
                  height={project.height}
                  onSelectLayer={id => setProject(p => ({ ...p, activeLayerId: id }))}
                  onAddLayer={handleAddLayer}
                  onDuplicateLayer={handleDuplicateLayer}
                  onDeleteLayer={handleDeleteLayer}
                  onMergeDown={handleMergeDown}
                  onMoveLayer={handleMoveLayer}
                  onUpdateLayer={handleUpdateLayer}
                  onClose={() => setShowMobileLayers(false)}
                />
              </div>
            </div>
          )}

          {/* Mobile Slide-Up Bottom Sheet for Timeline */}
          {isMobileScreen && showMobileTimeline && (
            <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end justify-center">
              <div className="bg-slate-900 border-t border-slate-700 rounded-t-3xl w-full p-2 flex flex-col shadow-2xl">
                <div className="flex items-center justify-between px-3 py-2 border-b border-slate-800">
                  <span className="font-semibold text-xs text-white">Animation Timeline</span>
                  <button
                    onClick={() => setShowMobileTimeline(false)}
                    className="p-1 rounded-lg text-slate-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <Timeline
                  frames={project.frames}
                  currentFrameIndex={project.currentFrameIndex}
                  width={project.width}
                  height={project.height}
                  onSelectFrame={handleSelectFrame}
                  onAddFrame={handleAddFrame}
                  onDuplicateFrame={handleDuplicateFrame}
                  onDeleteFrame={handleDeleteFrame}
                  onUpdateFrameDuration={handleUpdateFrameDuration}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Native Android Mobile Bottom Navigation Bar (ALWAYS Visible on Mobile) */}
      <nav className="h-14 bg-slate-900 border-t border-slate-800/80 flex items-center justify-around px-2 z-40 select-none shadow-2xl flex-shrink-0">
        {/* Editor Tab */}
        <button
          onClick={() => setCurrentView('editor')}
          className={`flex flex-col items-center justify-center gap-1 py-1 px-3 rounded-xl transition-all ${
            currentView === 'editor'
              ? 'text-sky-400 font-bold scale-105'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Paintbrush className="w-4 h-4" />
          <span className="text-[10px]">Editor</span>
        </button>

        {/* Dashboard / Assets Tab */}
        <button
          onClick={() => {
            handleRefreshProjects();
            setCurrentView('dashboard');
          }}
          className={`flex flex-col items-center justify-center gap-1 py-1 px-3 rounded-xl transition-all ${
            currentView === 'dashboard'
              ? 'text-sky-400 font-bold scale-105'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <FolderKanban className="w-4 h-4" />
          <span className="text-[10px]">Assets</span>
        </button>

        {/* Layers (in Editor 2D Mode) */}
        {currentView === 'editor' && mode === '2d' && (
          <button
            onClick={() => setShowMobileLayers(true)}
            className="flex flex-col items-center justify-center gap-1 py-1 px-3 rounded-xl text-slate-400 hover:text-white transition-all relative"
          >
            <LayersIcon className="w-4 h-4" />
            <span className="text-[10px]">Layers</span>
            <span className="absolute top-0 right-2 w-3.5 h-3.5 rounded-full bg-slate-800 border border-slate-700 text-[9px] font-mono flex items-center justify-center text-sky-400">
              {currentFrame.layers.length}
            </span>
          </button>
        )}

        {/* Timeline Frames (in Editor 2D Mode) */}
        {currentView === 'editor' && mode === '2d' && (
          <button
            onClick={() => setShowMobileTimeline(true)}
            className="flex flex-col items-center justify-center gap-1 py-1 px-3 rounded-xl text-slate-400 hover:text-white transition-all relative"
          >
            <Film className="w-4 h-4" />
            <span className="text-[10px]">Frames</span>
            <span className="absolute top-0 right-2 w-3.5 h-3.5 rounded-full bg-slate-800 border border-slate-700 text-[9px] font-mono flex items-center justify-center text-sky-400">
              {project.frames.length}
            </span>
          </button>
        )}

        {/* Export Button */}
        <button
          onClick={() => setIsExportOpen(true)}
          className="flex flex-col items-center justify-center gap-1 py-1 px-3 rounded-xl text-slate-400 hover:text-sky-400 transition-all"
        >
          <Download className="w-4 h-4" />
          <span className="text-[10px]">Export</span>
        </button>
      </nav>

      {/* Android Gesture Navigation Bar Pill */}
      <div className="h-4 bg-slate-950 flex items-center justify-center pointer-events-none">
        <div className="w-24 h-1 rounded-full bg-slate-600/70" />
      </div>

      {/* Export Modal */}
      {isExportOpen && (
        <ExportModal
          project={project}
          onClose={() => setIsExportOpen(false)}
          onImportProject={imported => {
            setProject(imported);
            pushHistory(imported);
          }}
        />
      )}

      {/* Touch Gestures Guide Modal */}
      {isGesturesGuideOpen && (
        <TouchGesturesModal
          onClose={() => setIsGesturesGuideOpen(false)}
        />
      )}

      {/* Android Mobile APK Test Bundle Modal */}
      {isApkModalOpen && (
        <ApkBundleModal
          onClose={() => setIsApkModalOpen(false)}
        />
      )}
    </MobileFrame>
  );
}
