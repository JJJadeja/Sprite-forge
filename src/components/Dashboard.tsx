import React, { useState, useEffect, useRef } from 'react';
import { Project, GameEngine } from '../types/sprite';
import { 
  createNewProjectFromWizard, 
  deleteProjectFromStorage, 
  saveCurrentProject 
} from '../utils/storage';
import { PRESET_PALETTES, DEFAULT_PALETTE } from '../utils/palettes';
import { renderFrameToCanvas } from '../utils/exporters';
import { 
  Plus, 
  Layers, 
  Box, 
  Sparkles, 
  Search, 
  Trash2, 
  Copy, 
  ArrowRight, 
  Download, 
  Sliders, 
  Gamepad2, 
  Smartphone, 
  Wifi, 
  BatteryMedium, 
  Clock, 
  Check, 
  X,
  Palette,
  Maximize2,
  Package,
  Cloud,
  RotateCcw,
  ShieldCheck
} from 'lucide-react';
import { RestorePointsManager } from './RestorePointsManager';
import { getAllRestorePoints } from '../utils/backupStorage';

interface DashboardProps {
  projects: Project[];
  activeProjectId: string;
  onSelectProject: (project: Project) => void;
  onRefreshProjects: () => void;
  onOpenGesturesGuide: () => void;
  onOpenApkBundle?: () => void;
  isFrameView: boolean;
  onToggleFrameView: () => void;
  initialTab?: 'gallery' | 'backups';
  onTabChange?: (tab: 'gallery' | 'backups') => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  projects,
  activeProjectId,
  onSelectProject,
  onRefreshProjects,
  onOpenGesturesGuide,
  onOpenApkBundle,
  isFrameView,
  onToggleFrameView,
  initialTab,
  onTabChange
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | '2d' | '3d'>('all');
  const [dashboardTab, setDashboardTab] = useState<'gallery' | 'backups'>(initialTab || 'gallery');

  useEffect(() => {
    if (initialTab && initialTab !== dashboardTab) {
      setDashboardTab(initialTab);
    }
  }, [initialTab]);

  const handleTabSwitch = (tab: 'gallery' | 'backups') => {
    setDashboardTab(tab);
    onTabChange?.(tab);
  };
  const [restorePointsCount, setRestorePointsCount] = useState<number>(0);
  const [showWizard, setShowWizard] = useState(false);

  useEffect(() => {
    setRestorePointsCount(getAllRestorePoints().length);
  }, [projects]);

  const currentProject = projects.find(p => p.id === activeProjectId) || projects[0];

  // Wizard State
  const [wizardName, setWizardName] = useState('New_Game_Asset');
  const [wizardMode, setWizardMode] = useState<'2d' | '3d'>('2d');
  const [wizardSize, setWizardSize] = useState<number>(16);
  const [wizardEngine, setWizardEngine] = useState<GameEngine>('unity');
  const [wizardPalette, setWizardPalette] = useState<string[]>(DEFAULT_PALETTE);
  const [wizardTemplate, setWizardTemplate] = useState<string>('blank');

  // Filtered projects
  const filtered = projects.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;
    if (filterType === '2d') return p.voxels.length === 0 || p.frames.length > 0;
    if (filterType === '3d') return p.voxels.length > 0;
    return true;
  });

  // Handle Create and Start Editing
  const handleCreateAndEdit = () => {
    const newProj = createNewProjectFromWizard({
      name: wizardName.trim() || 'New Game Asset',
      width: wizardSize,
      height: wizardSize,
      engine: wizardEngine,
      palette: wizardPalette,
      mode: wizardMode,
      starterTemplate: wizardTemplate === 'blank' ? undefined : wizardTemplate
    });

    saveCurrentProject(newProj);
    onRefreshProjects();
    onSelectProject(newProj);
    setShowWizard(false);
  };

  const handleDuplicate = (e: React.MouseEvent, p: Project) => {
    e.stopPropagation();
    const dup: Project = {
      ...JSON.parse(JSON.stringify(p)),
      id: 'proj-' + Date.now(),
      name: `${p.name} (Copy)`,
      updatedAt: Date.now()
    };
    saveCurrentProject(dup);
    onRefreshProjects();
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (projects.length <= 1) {
      alert('Keep at least one game asset in your library.');
      return;
    }
    if (confirm('Delete this game asset from device?')) {
      deleteProjectFromStorage(id);
      onRefreshProjects();
    }
  };

  // Format relative time
  const formatTimeAgo = (ts: number) => {
    const diff = Math.floor((Date.now() - ts) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100 select-none overflow-y-auto">
      {/* Android Native Status Bar */}
      <div className="h-7 px-4 bg-slate-950 flex items-center justify-between text-[11px] font-semibold text-slate-400 select-none border-b border-slate-900">
        <span>9:41</span>
        <div className="flex items-center gap-2">
          <Wifi className="w-3.5 h-3.5" />
          <span className="text-[10px] font-mono">5G</span>
          <div className="flex items-center gap-1">
            <span className="text-[10px]">98%</span>
            <BatteryMedium className="w-3.5 h-3.5 text-emerald-400" />
          </div>
        </div>
      </div>

      {/* Android Top App Bar */}
      <div className="px-4 py-3 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between gap-3 sticky top-0 z-30 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-sky-500 via-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-sky-500/20 text-white font-black text-sm">
            SF
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-white tracking-tight">SpriteForge</h1>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-400 border border-sky-500/30">
                Android Native
              </span>
            </div>
            <p className="text-[11px] text-slate-400">Game Asset Studio & Engine Exporter</p>
          </div>
        </div>

        {/* View Frame Mode & Quick Help */}
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleFrameView}
            title={isFrameView ? "Switch to Fullscreen Native View" : "Switch to Android Device Frame"}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition-colors"
          >
            <Smartphone className="w-3.5 h-3.5 text-sky-400" />
            <span className="hidden sm:inline">{isFrameView ? "Full App" : "Device Frame"}</span>
          </button>

          {onOpenApkBundle && (
            <button
              onClick={onOpenApkBundle}
              title="Mobile APK Test Bundle"
              className="p-2 rounded-xl bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-700/60 text-emerald-400 hover:text-emerald-300 transition-colors"
            >
              <Package className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={onOpenGesturesGuide}
            title="Touch Gestures"
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700 transition-colors"
          >
            <Sparkles className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="p-4 max-w-4xl mx-auto w-full space-y-5 pb-24">
        {/* Hero Create Action Card */}
        <div className="p-5 rounded-3xl bg-gradient-to-br from-indigo-950/70 via-slate-900 to-sky-950/60 border border-indigo-800/40 shadow-2xl relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] font-semibold uppercase tracking-wider">
                Asset Hub
              </span>
              <span className="text-xs text-slate-400">• Ready for Unity, Unreal & Godot</span>
            </div>
            <h2 className="text-lg sm:text-xl font-black text-white mb-1.5">
              Create New Game Asset
            </h2>
            <p className="text-xs text-slate-300 max-w-lg mb-4 leading-relaxed">
              Design 2D sprite animations and 3D voxel models with touch gestures, layers, and instant multi-engine exports (PNG, OBJ, FBX).
            </p>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                onClick={() => {
                  setWizardMode('2d');
                  setShowWizard(true);
                }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-sky-500/25 active:scale-95 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>New 2D Sprite</span>
              </button>

              <button
                onClick={() => {
                  setWizardMode('3d');
                  setShowWizard(true);
                }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold text-xs active:scale-95 transition-all"
              >
                <Box className="w-4 h-4 text-sky-400" />
                <span>New 3D Voxel</span>
              </button>

              <button
                onClick={() => {
                  setWizardTemplate('knight');
                  setShowWizard(true);
                }}
                className="flex items-center gap-1.5 px-3 py-2.5 rounded-2xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-medium active:scale-95 transition-all"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Starter Templates</span>
              </button>
            </div>
          </div>
        </div>

        {/* Navigation Tabs: Projects Gallery vs Auto-Backup & Restore Points */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
          <button
            onClick={() => handleTabSwitch('gallery')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all ${
              dashboardTab === 'gallery'
                ? 'bg-slate-800 text-white shadow-md border border-slate-700/80'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Package className="w-4 h-4 text-sky-400" />
            <span>Projects Gallery</span>
            <span className="px-1.5 py-0.2 rounded-md bg-slate-950 text-[10px] text-slate-400 font-mono">
              {projects.length}
            </span>
          </button>

          <button
            onClick={() => handleTabSwitch('backups')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all ${
              dashboardTab === 'backups'
                ? 'bg-slate-800 text-white shadow-md border border-slate-700/80'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Cloud className="w-4 h-4 text-emerald-400" />
            <span>Cloud Auto-Backup & Restore Points</span>
            <span className="px-1.5 py-0.2 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-mono">
              {restorePointsCount}
            </span>
          </button>
        </div>

        {dashboardTab === 'backups' ? (
          /* Cloud-Synced Restore Points View */
          <RestorePointsManager
            currentProject={currentProject}
            onRestoreProject={(restored) => {
              onSelectProject(restored);
              onRefreshProjects();
            }}
            onProjectCloned={(cloned) => {
              onRefreshProjects();
              onSelectProject(cloned);
            }}
          />
        ) : (
          /* Projects Gallery View */
          <>
            {/* Filter and Search Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search assets..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-2xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
            />
          </div>

          {/* Type Filter Chips */}
          <div className="flex items-center gap-1.5 w-full sm:w-auto bg-slate-900 p-1 rounded-2xl border border-slate-800">
            {(['all', '2d', '3d'] as const).map(type => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-3 py-1 rounded-xl text-xs font-semibold capitalize transition-all ${
                  filterType === type
                    ? 'bg-sky-500 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {type === 'all' ? 'All Assets' : type === '2d' ? '2D Sprites' : '3D Models'}
              </button>
            ))}
          </div>
        </div>

        {/* Saved Assets Section */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span>Saved Projects on Device</span>
              <span className="text-xs text-slate-500 font-mono">({filtered.length})</span>
            </h3>
            <span className="text-[11px] text-emerald-400 flex items-center gap-1">
              <Check className="w-3 h-3" />
              <span>Offline Ready</span>
            </span>
          </div>

          {/* Assets Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {filtered.map(project => {
              const isActive = project.id === activeProjectId;
              const has3D = project.voxels.length > 0;
              const hasFrames = project.frames.length > 1;

              return (
                <div
                  key={project.id}
                  onClick={() => onSelectProject(project)}
                  className={`group p-3.5 rounded-3xl border transition-all cursor-pointer relative flex flex-col justify-between ${
                    isActive
                      ? 'bg-slate-900/95 border-sky-500 shadow-xl ring-1 ring-sky-500/50'
                      : 'bg-slate-900/60 border-slate-800 hover:bg-slate-900 hover:border-slate-700 shadow-md'
                  }`}
                >
                  <div>
                    {/* Thumbnail Preview & Badges */}
                    <div className="relative w-full h-32 rounded-2xl checker-bg border border-slate-800/80 flex items-center justify-center overflow-hidden mb-3">
                      <ProjectThumbnail project={project} />

                      {/* Engine Badge */}
                      <div className="absolute top-2 left-2 px-2 py-0.5 rounded-lg bg-slate-950/80 backdrop-blur-md border border-slate-700/60 text-[10px] font-mono text-slate-300 capitalize">
                        {project.settings?.engine || 'Unity'}
                      </div>

                      {/* 2D / 3D indicators */}
                      <div className="absolute top-2 right-2 flex items-center gap-1">
                        {has3D && (
                          <span className="px-1.5 py-0.5 rounded-md bg-indigo-500/80 text-white text-[10px] font-bold">
                            3D
                          </span>
                        )}
                        <span className="px-1.5 py-0.5 rounded-md bg-slate-800/90 text-slate-300 text-[10px] font-mono">
                          {project.width}×{project.height}
                        </span>
                      </div>
                    </div>

                    {/* Asset Name and Metadata */}
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="text-sm font-bold text-white group-hover:text-sky-400 transition-colors truncate">
                        {project.name}
                      </h4>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono mb-3">
                      <span>{project.frames.length} frame{project.frames.length > 1 ? 's' : ''}</span>
                      <span>•</span>
                      <span>{project.voxels.length} voxels</span>
                      <span>•</span>
                      <span>{formatTimeAgo(project.updatedAt)}</span>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                    <button
                      onClick={() => onSelectProject(project)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-500/20 hover:bg-sky-500 text-sky-400 hover:text-white text-xs font-semibold transition-all"
                    >
                      <span>Start Editing</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          onSelectProject(project);
                          setDashboardTab('backups');
                        }}
                        title="View Restore Points for this Asset"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-sky-400 hover:bg-slate-800 transition-colors"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={e => handleDuplicate(e, project)}
                        title="Duplicate Asset"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={e => handleDelete(e, project.id)}
                        title="Delete Asset"
                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        </>
      )}
      </div>

      {/* Creation Wizard Bottom Sheet / Modal */}
      {showWizard && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm select-none">
          <div className="bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-sky-500/20 text-sky-400 border border-sky-500/30">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Create New Asset</h3>
                  <p className="text-xs text-slate-400">Configure canvas, engine target & palette</p>
                </div>
              </div>

              <button
                onClick={() => setShowWizard(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 overflow-y-auto">
              {/* Asset Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Asset Name</label>
                <input
                  type="text"
                  value={wizardName}
                  onChange={e => setWizardName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-sky-500 font-medium"
                />
              </div>

              {/* Asset Type (2D Sprite or 3D Voxel) */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Asset Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setWizardMode('2d')}
                    className={`flex items-center justify-center gap-2 p-3 rounded-2xl border text-xs font-bold transition-all ${
                      wizardMode === '2d'
                        ? 'bg-sky-500 text-white border-sky-400 shadow-md'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <Layers className="w-4 h-4" />
                    <span>2D Sprite Animation</span>
                  </button>

                  <button
                    onClick={() => setWizardMode('3d')}
                    className={`flex items-center justify-center gap-2 p-3 rounded-2xl border text-xs font-bold transition-all ${
                      wizardMode === '3d'
                        ? 'bg-sky-500 text-white border-sky-400 shadow-md'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <Box className="w-4 h-4" />
                    <span>3D Voxel Mesh</span>
                  </button>
                </div>
              </div>

              {/* Canvas Resolution */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Resolution</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {[16, 24, 32, 48].map(sz => (
                    <button
                      key={sz}
                      onClick={() => setWizardSize(sz)}
                      className={`py-2 rounded-xl text-xs font-mono font-bold transition-all ${
                        wizardSize === sz
                          ? 'bg-sky-500 text-white shadow-sm'
                          : 'bg-slate-950 text-slate-400 border border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      {sz}×{sz}
                    </button>
                  ))}
                </div>
              </div>

              {/* Game Engine Preset */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Target Game Engine</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['unity', 'unreal', 'godot', 'gamemaker', 'pico8', 'custom'] as GameEngine[]).map(eng => (
                    <button
                      key={eng}
                      onClick={() => setWizardEngine(eng)}
                      className={`py-2 rounded-xl text-xs capitalize font-semibold transition-all ${
                        wizardEngine === eng
                          ? 'bg-sky-500 text-white shadow-sm'
                          : 'bg-slate-950 text-slate-400 border border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      {eng}
                    </button>
                  ))}
                </div>
              </div>

              {/* Starter Template */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Starter Template</label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {[
                    { id: 'blank', label: 'Blank Canvas', desc: 'Start completely empty' },
                    { id: 'knight', label: 'Hero Knight', desc: 'Animated 2D character + 3D' },
                    { id: 'mech', label: 'Cyber Mech', desc: 'Sci-fi walker with cannon' },
                    { id: 'chest', label: 'Treasure Chest', desc: '3D Voxel prop with gold trim' }
                  ].map(tmpl => (
                    <button
                      key={tmpl.id}
                      onClick={() => setWizardTemplate(tmpl.id)}
                      className={`p-2.5 rounded-2xl border text-left transition-all ${
                        wizardTemplate === tmpl.id
                          ? 'bg-sky-500/15 border-sky-500 text-white'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="font-bold text-xs text-white">{tmpl.label}</div>
                      <div className="text-[10px] text-slate-400 truncate">{tmpl.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between">
              <button
                onClick={() => setShowWizard(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
              >
                Cancel
              </button>

              <button
                onClick={handleCreateAndEdit}
                className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-sky-500/25 active:scale-95 transition-all"
              >
                <span>Start Editing</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Android Bottom Navigation Pill */}
      <div className="fixed bottom-0 left-0 right-0 h-6 bg-slate-950/90 backdrop-blur-md flex items-center justify-center pointer-events-none z-40">
        <div className="w-28 h-1 rounded-full bg-slate-600" />
      </div>
    </div>
  );
};

// Sub-component for rendering crisp project thumbnails
const ProjectThumbnail: React.FC<{ project: Project }> = ({ project }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const frame = project.frames[0];
    if (frame) {
      const rendered = renderFrameToCanvas(frame, project.width, project.height, 4, null);
      ctx.imageSmoothingEnabled = false;
      const x = Math.floor((canvas.width - project.width * 4) / 2);
      const y = Math.floor((canvas.height - project.height * 4) / 2);
      ctx.drawImage(rendered, x, y);
    }
  }, [project]);

  return (
    <canvas
      ref={canvasRef}
      width={120}
      height={90}
      className="pixel-canvas"
    />
  );
};
