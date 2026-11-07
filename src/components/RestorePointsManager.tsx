import React, { useState, useEffect } from 'react';
import { Project } from '../types/sprite';
import { 
  ProjectRestorePoint, 
  BackupSettings, 
  getAllRestorePoints, 
  getBackupSettings, 
  saveBackupSettings, 
  createRestorePoint, 
  restoreProjectFromPoint, 
  deleteRestorePoint, 
  togglePinRestorePoint, 
  clearRestorePoints,
  exportRestorePointJson,
  importRestorePointFromJson
} from '../utils/backupStorage';
import { 
  Cloud, 
  CloudCheck, 
  RotateCcw, 
  Clock, 
  ShieldCheck, 
  Star, 
  Trash2, 
  Download, 
  Upload, 
  Copy, 
  Search, 
  Sliders, 
  Layers, 
  Box, 
  Check, 
  AlertCircle, 
  Sparkles, 
  Calendar,
  HardDrive,
  RefreshCw,
  PlusCircle,
  ExternalLink
} from 'lucide-react';

interface RestorePointsManagerProps {
  currentProject: Project;
  onRestoreProject: (project: Project) => void;
  onProjectCloned?: (newProject: Project) => void;
  onClose?: () => void;
}

export const RestorePointsManager: React.FC<RestorePointsManagerProps> = ({
  currentProject,
  onRestoreProject,
  onProjectCloned,
  onClose
}) => {
  const [restorePoints, setRestorePoints] = useState<ProjectRestorePoint[]>([]);
  const [settings, setSettings] = useState<BackupSettings>(() => getBackupSettings());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');
  const [triggerFilter, setTriggerFilter] = useState<string>('all');
  const [isBackingUpNow, setIsBackingUpNow] = useState(false);
  const [confirmRestorePoint, setConfirmRestorePoint] = useState<ProjectRestorePoint | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);

  // Load restore points
  const loadPoints = () => {
    const list = getAllRestorePoints();
    setRestorePoints(list);
    setSettings(getBackupSettings());
  };

  useEffect(() => {
    loadPoints();
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Immediate manual backup of active project
  const handleBackupNow = () => {
    setIsBackingUpNow(true);
    setTimeout(() => {
      const created = createRestorePoint(currentProject, 'manual');
      setIsBackingUpNow(false);
      if (created) {
        loadPoints();
        showToast(`Created backup checkpoint for "${currentProject.name}"`);
      }
    }, 200);
  };

  // Restore action
  const handleConfirmRestore = () => {
    if (!confirmRestorePoint) return;
    const result = restoreProjectFromPoint(confirmRestorePoint.id, currentProject);
    if (result) {
      onRestoreProject(result.restoredProject);
      loadPoints();
      setConfirmRestorePoint(null);
      showToast(`Restored "${confirmRestorePoint.projectName}" from ${formatRelativeTime(confirmRestorePoint.timestamp)}!`);
    }
  };

  // Clone restore point as new project
  const handleForkRestorePoint = (point: ProjectRestorePoint) => {
    const cloned: Project = {
      ...JSON.parse(JSON.stringify(point.projectData)),
      id: `proj-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: `${point.projectName} (Restored ${new Date(point.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })})`,
      updatedAt: Date.now()
    };
    onProjectCloned?.(cloned);
    showToast(`Forked restore point into new project: "${cloned.name}"`);
  };

  // Delete restore point
  const handleDelete = (id: string, name: string) => {
    deleteRestorePoint(id);
    loadPoints();
    showToast(`Deleted restore point for "${name}"`);
  };

  // Toggle pin
  const handleTogglePin = (id: string) => {
    togglePinRestorePoint(id);
    loadPoints();
  };

  // Export JSON file
  const handleExportJson = (point: ProjectRestorePoint) => {
    const jsonStr = exportRestorePointJson(point.id);
    if (!jsonStr) return;
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${point.projectName.toLowerCase().replace(/\s+/g, '_')}_backup_${new Date(point.timestamp).toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Downloaded backup snapshot JSON');
  };

  // Import JSON file
  const handleImportJsonFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const imported = importRestorePointFromJson(content);
        if (imported) {
          loadPoints();
          showToast(`Imported backup: "${imported.projectName}"`);
        } else {
          showToast('Failed to import backup JSON. Check file format.');
        }
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Format relative time helper
  function formatRelativeTime(ts: number): string {
    const diffSec = Math.floor((Date.now() - ts) / 1000);
    if (diffSec < 10) return 'Just now';
    if (diffSec < 60) return `${diffSec}s ago`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return new Date(ts).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  // Filtered restore points
  const filteredPoints = restorePoints.filter(p => {
    const matchesSearch = p.projectName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      new Date(p.timestamp).toLocaleString().toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    if (selectedProjectId !== 'all' && p.projectId !== selectedProjectId) return false;
    if (triggerFilter !== 'all' && p.trigger !== triggerFilter) return false;
    return true;
  });

  // Calculate total backup storage size
  const totalSizeBytes = restorePoints.reduce((acc, p) => acc + (p.sizeBytes || 0), 0);
  const totalSizeFormatted = totalSizeBytes < 1024
    ? `${totalSizeBytes} B`
    : totalSizeBytes < 1024 * 1024
    ? `${(totalSizeBytes / 1024).toFixed(1)} KB`
    : `${(totalSizeBytes / (1024 * 1024)).toFixed(2)} MB`;

  // Unique projects represented in restore points
  const uniqueProjectsMap = new Map<string, string>();
  restorePoints.forEach(p => uniqueProjectsMap.set(p.projectId, p.projectName));
  uniqueProjectsMap.set(currentProject.id, `${currentProject.name} (Current)`);

  return (
    <div className="space-y-4">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-14 right-6 z-50 flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-900 border border-emerald-500/50 text-white text-xs font-medium shadow-2xl backdrop-blur-xl animate-fade-in">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Control Card */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-900/95 to-slate-950 border border-slate-800/80 rounded-3xl p-4 sm:p-5 shadow-xl relative overflow-hidden">
        {/* Glow accent */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-sky-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-sky-500/15 border border-sky-500/30 text-sky-300 font-bold text-xs">
                <Cloud className="w-3.5 h-3.5 text-sky-400 animate-pulse" />
                <span>Cloud-Synced Auto-Backup</span>
              </span>
              <span className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-mono font-medium">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Active ({settings.intervalSeconds}s Interval)</span>
              </span>
              <span className="px-2 py-0.5 rounded-lg bg-slate-800 text-[11px] text-slate-400 font-mono">
                {restorePoints.length} Snapshots • {totalSizeFormatted}
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-bold text-white">
              Browser Storage Vault & Restore Points
            </h3>
            <p className="text-xs text-slate-400 max-w-xl mt-0.5 leading-relaxed">
              Your edits are automatically captured to browser storage on a scheduled background interval. Revert to any previous timestamp with zero data loss.
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
            <button
              onClick={handleBackupNow}
              disabled={isBackingUpNow}
              className="flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 active:scale-95 text-white font-bold text-xs shadow-lg shadow-sky-500/20 transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isBackingUpNow ? 'animate-spin' : ''}`} />
              <span>{isBackingUpNow ? 'Backing up...' : 'Backup Current Now'}</span>
            </button>

            <button
              onClick={() => setShowSettingsPanel(!showSettingsPanel)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-medium transition-all ${
                showSettingsPanel 
                  ? 'bg-slate-800 border-sky-500/50 text-white' 
                  : 'bg-slate-900 hover:bg-slate-800 border-slate-700/80 text-slate-300'
              }`}
            >
              <Sliders className="w-3.5 h-3.5 text-sky-400" />
              <span>Settings</span>
            </button>

            {/* Import Backup JSON */}
            <label className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-slate-300 hover:text-white text-xs font-medium cursor-pointer transition-all">
              <Upload className="w-3.5 h-3.5 text-emerald-400" />
              <span>Import</span>
              <input 
                type="file" 
                accept=".json" 
                onChange={handleImportJsonFile} 
                className="hidden" 
              />
            </label>
          </div>
        </div>

        {/* Collapsible Auto-Backup Settings Panel */}
        {showSettingsPanel && (
          <div className="mt-4 pt-4 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-3 gap-3 animate-fade-in text-xs">
            {/* Auto-Backup Toggle */}
            <div className="bg-slate-950/60 p-3 rounded-2xl border border-slate-800 flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-200 block text-xs">Scheduled Auto-Backup</span>
                <span className="text-[11px] text-slate-400">Capture states periodically</span>
              </div>
              <button
                onClick={() => {
                  const updated = saveBackupSettings({ enabled: !settings.enabled });
                  setSettings(updated);
                  showToast(`Auto-backup ${updated.enabled ? 'Enabled' : 'Disabled'}`);
                }}
                className={`px-3 py-1 rounded-xl font-bold font-mono text-xs transition-all ${
                  settings.enabled 
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' 
                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                }`}
              >
                {settings.enabled ? 'ON' : 'OFF'}
              </button>
            </div>

            {/* Scheduled Interval Selector */}
            <div className="bg-slate-950/60 p-3 rounded-2xl border border-slate-800 space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="font-bold text-slate-200 text-xs">Backup Interval</span>
                <span className="text-sky-400 font-mono font-bold text-[11px]">{settings.intervalSeconds}s</span>
              </div>
              <div className="grid grid-cols-4 gap-1">
                {[30, 60, 120, 300].map(sec => (
                  <button
                    key={sec}
                    onClick={() => {
                      const updated = saveBackupSettings({ intervalSeconds: sec });
                      setSettings(updated);
                      showToast(`Interval set to ${sec < 60 ? `${sec}s` : `${sec / 60}m`}`);
                    }}
                    className={`py-1 rounded-lg font-mono font-bold text-[10px] transition-all ${
                      settings.intervalSeconds === sec
                        ? 'bg-sky-500 text-white shadow-xs'
                        : 'bg-slate-850 text-slate-400 hover:text-white'
                    }`}
                  >
                    {sec < 60 ? `${sec}s` : `${sec / 60}m`}
                  </button>
                ))}
              </div>
            </div>

            {/* Cloud Sync Vault Toggle */}
            <div className="bg-slate-950/60 p-3 rounded-2xl border border-slate-800 flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-200 block text-xs">Cloud Vault Sync</span>
                <span className="text-[11px] text-slate-400">Offline & cloud synchronization</span>
              </div>
              <button
                onClick={() => {
                  const updated = saveBackupSettings({ cloudSyncEnabled: !settings.cloudSyncEnabled });
                  setSettings(updated);
                  showToast(`Cloud Sync ${updated.cloudSyncEnabled ? 'Activated' : 'Paused'}`);
                }}
                className={`px-3 py-1 rounded-xl font-bold font-mono text-xs transition-all ${
                  settings.cloudSyncEnabled 
                    ? 'bg-sky-500/20 text-sky-400 border border-sky-500/40' 
                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                }`}
              >
                {settings.cloudSyncEnabled ? 'SYNCED' : 'PAUSED'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/80 p-2.5 rounded-2xl border border-slate-800">
        <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
          {/* Search Box */}
          <div className="relative w-full sm:w-56">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filter restore points..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
            />
          </div>

          {/* Project selector */}
          <select
            value={selectedProjectId}
            onChange={e => setSelectedProjectId(e.target.value)}
            className="px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-sky-500 cursor-pointer"
          >
            <option value="all">All Projects ({restorePoints.length})</option>
            {Array.from(uniqueProjectsMap.entries()).map(([id, name]) => (
              <option key={id} value={id}>
                {name} ({restorePoints.filter(p => p.projectId === id).length})
              </option>
            ))}
          </select>
        </div>

        {/* Trigger Filter Pills */}
        <div className="flex items-center gap-1 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: 'all', label: 'All Triggers' },
            { id: 'auto_interval', label: 'Scheduled' },
            { id: 'manual', label: 'Manual' },
            { id: 'pre_restore', label: 'Pre-Restore' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setTriggerFilter(tab.id)}
              className={`px-2.5 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                triggerFilter === tab.id
                  ? 'bg-sky-500 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Restore Points List */}
      {filteredPoints.length === 0 ? (
        <div className="py-12 px-4 rounded-3xl bg-slate-900/50 border border-dashed border-slate-800 text-center">
          <HardDrive className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <h4 className="text-sm font-bold text-white mb-1">No Restore Points Found</h4>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mb-4">
            {restorePoints.length === 0
              ? 'Restore points will be automatically saved in the background every 60s, or you can create one manually right now.'
              : 'No snapshots matched your filter criteria.'}
          </p>
          <button
            onClick={handleBackupNow}
            className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-bold text-xs shadow-lg shadow-sky-500/20 active:scale-95 transition-all inline-flex items-center gap-2"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create First Restore Point</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredPoints.map((point) => {
            const isCurrentProject = point.projectId === currentProject.id;
            const formattedTime = new Date(point.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const formattedDate = new Date(point.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });

            const triggerPill = {
              auto_interval: { label: 'Scheduled', bg: 'bg-sky-500/15 text-sky-300 border-sky-500/30' },
              manual: { label: 'Manual Checkpoint', bg: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' },
              pre_restore: { label: 'Pre-Restore Safety', bg: 'bg-amber-500/15 text-amber-300 border-amber-500/30' },
              cloud_sync: { label: 'Cloud Synced', bg: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30' }
            }[point.trigger] || { label: 'Backup', bg: 'bg-slate-800 text-slate-300 border-slate-700' };

            return (
              <div
                key={point.id}
                className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-2xl p-3 flex flex-col justify-between gap-3 shadow-lg hover:shadow-xl transition-all group relative"
              >
                {/* Top Bar */}
                <div className="flex items-start gap-3">
                  {/* Thumbnail Preview */}
                  <div className="w-14 h-14 rounded-xl bg-slate-950 border border-slate-850 flex items-center justify-center overflow-hidden shrink-0 shadow-inner group-hover:border-sky-500/40 transition-colors">
                    {point.thumbnailUrl ? (
                      <img 
                        src={point.thumbnailUrl} 
                        alt={point.projectName} 
                        className="w-full h-full object-contain [image-rendering:pixelated]" 
                      />
                    ) : (
                      <Layers className="w-6 h-6 text-slate-600" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <span className={`px-1.5 py-0.2 text-[9px] font-bold rounded-md border ${triggerPill.bg}`}>
                        {triggerPill.label}
                      </span>
                      <button
                        onClick={() => handleTogglePin(point.id)}
                        title={point.isPinned ? 'Protected from pruning (Click to unpin)' : 'Pin to prevent auto-pruning'}
                        className={`p-1 rounded-md transition-colors ${
                          point.isPinned ? 'text-amber-400 bg-amber-500/15' : 'text-slate-500 hover:text-amber-400 hover:bg-slate-800'
                        }`}
                      >
                        <Star className={`w-3.5 h-3.5 ${point.isPinned ? 'fill-amber-400' : ''}`} />
                      </button>
                    </div>

                    <h4 className="font-bold text-white text-xs truncate" title={point.projectName}>
                      {point.projectName}
                    </h4>

                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-0.5">
                      <Clock className="w-3 h-3 text-slate-500" />
                      <span className="font-medium text-slate-300">{formatRelativeTime(point.timestamp)}</span>
                      <span>•</span>
                      <span>{formattedTime}</span>
                    </div>

                    {/* Stats pill */}
                    <div className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-1 font-mono">
                      <span>{point.summary.width}×{point.summary.height}px</span>
                      <span>•</span>
                      {point.summary.voxelsCount > 0 ? (
                        <span>{point.summary.voxelsCount} voxels</span>
                      ) : (
                        <span>{point.summary.layersCount} layers</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Bottom Actions Bar */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 gap-1.5">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleExportJson(point)}
                      title="Download JSON Snapshot file"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleForkRestorePoint(point)}
                      title="Clone as New Project in Gallery"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(point.id, point.projectName)}
                      title="Delete this snapshot"
                      className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Restore Button */}
                  <button
                    onClick={() => setConfirmRestorePoint(point)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-500/20 hover:bg-sky-500 text-sky-300 hover:text-white border border-sky-500/40 text-xs font-bold transition-all active:scale-95"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Restore</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Restore Confirmation Modal */}
      {confirmRestorePoint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="bg-slate-900 border border-slate-700/80 rounded-3xl p-5 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-sky-500/20 border border-sky-500/40 flex items-center justify-center shrink-0">
                <RotateCcw className="w-5 h-5 text-sky-400" />
              </div>
              <div>
                <h4 className="text-base font-bold text-white">Restore Project State</h4>
                <p className="text-xs text-slate-400">
                  Roll back "{confirmRestorePoint.projectName}" to snapshot
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
              <div className="flex items-center justify-between text-slate-300">
                <span className="text-slate-400">Snapshot Timestamp:</span>
                <span className="font-mono font-bold text-white">
                  {new Date(confirmRestorePoint.timestamp).toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <span className="text-slate-400">Dimensions:</span>
                <span className="font-mono">{confirmRestorePoint.summary.width}×{confirmRestorePoint.summary.height}px</span>
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <span className="text-slate-400">Layers / Voxels:</span>
                <span className="font-mono">
                  {confirmRestorePoint.summary.voxelsCount > 0
                    ? `${confirmRestorePoint.summary.voxelsCount} voxels`
                    : `${confirmRestorePoint.summary.layersCount} layers, ${confirmRestorePoint.summary.framesCount} frames`}
                </span>
              </div>
              <div className="pt-1.5 border-t border-slate-800 text-[11px] text-emerald-400 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                <span>A safety checkpoint of your current work will be automatically saved before restoring.</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setConfirmRestorePoint(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmRestore}
                className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-bold text-xs shadow-lg shadow-sky-500/25 active:scale-95 transition-all flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Confirm Restore</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
