import React from 'react';
import { 
  Undo2, 
  Redo2, 
  Download, 
  ChevronLeft, 
  Smartphone, 
  Wifi,
  BatteryMedium,
  Check, 
  Package,
  PanelLeftClose,
  PanelLeft,
  Cloud
} from 'lucide-react';
import { Project } from '../types/sprite';

interface HeaderProps {
  project: Project;
  onUpdateProjectName: (name: string) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onOpenExport: () => void;
  onOpenApkBundle: () => void;
  onOpenGesturesGuide: () => void;
  onBackToDashboard: () => void;
  onOpenBackups?: () => void;
  isBackingUp?: boolean;
  isToolbarHidden: boolean;
  onToggleToolbar: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  project,
  onUpdateProjectName,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onOpenExport,
  onOpenApkBundle,
  onOpenGesturesGuide,
  onBackToDashboard,
  onOpenBackups,
  isBackingUp,
  isToolbarHidden,
  onToggleToolbar
}) => {
  return (
    <div className="flex flex-col select-none z-40 bg-slate-900 border-b border-slate-800">
      {/* Android System Status Bar */}
      <div className="h-6 px-4 bg-slate-950 flex items-center justify-between text-[11px] font-semibold text-slate-400 select-none border-b border-slate-900">
        <span>9:41</span>
        <div className="flex items-center gap-2">
          <Wifi className="w-3 h-3" />
          <span className="text-[10px] font-mono">5G</span>
          <div className="flex items-center gap-1">
            <span className="text-[10px]">98%</span>
            <BatteryMedium className="w-3.5 h-3.5 text-emerald-400" />
          </div>
        </div>
      </div>

      {/* Main Studio Navigation Bar */}
      <header className="h-12 px-3 sm:px-4 flex items-center justify-between gap-2 bg-slate-900/95 backdrop-blur-md">
        {/* Left: Back to Dashboard & Toolbar Hide/Show Toggle */}
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={onBackToDashboard}
            title="Return to Dashboard"
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-400 hover:text-sky-300 border border-slate-700/80 active:scale-95 transition-all flex-shrink-0"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* Toggle Toolbar Visibility (More Space for Editor!) */}
          <button
            onClick={onToggleToolbar}
            title={isToolbarHidden ? "Show Toolbar" : "Hide Toolbar (Maximize Canvas)"}
            className={`p-2 rounded-xl border transition-all active:scale-95 ${
              isToolbarHidden 
                ? 'bg-sky-500/20 text-sky-400 border-sky-500/50' 
                : 'bg-slate-800 text-slate-400 hover:text-white border-slate-700/80'
            }`}
          >
            {isToolbarHidden ? <PanelLeft className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
          </button>

          {/* Project Title Input */}
          <input
            type="text"
            value={project.name}
            onChange={e => onUpdateProjectName(e.target.value)}
            className="bg-slate-800/60 hover:bg-slate-800 focus:bg-slate-800 border border-transparent focus:border-sky-500 rounded-lg px-2.5 py-1 text-xs font-semibold text-white outline-none transition-all truncate max-w-[130px] sm:max-w-[180px]"
          />

          {/* Cloud Auto-Backup & Restore Points Quick Link */}
          {onOpenBackups && (
            <button
              onClick={onOpenBackups}
              title={isBackingUp ? "Saving auto-backup restore point..." : "Cloud Auto-Backup & Restore Points"}
              className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 text-slate-300 hover:text-emerald-300 text-[10px] font-medium transition-colors flex-shrink-0"
            >
              <Cloud className={`w-3.5 h-3.5 ${isBackingUp ? 'text-sky-400 animate-bounce' : 'text-emerald-400'}`} />
              <span>{isBackingUp ? 'Saving...' : 'Synced'}</span>
            </button>
          )}
        </div>

        {/* Right: Undo/Redo, APK Bundle, Gestures, Export (ICON ONLY) */}
        <div className="flex items-center gap-1.5">
          {/* Undo / Redo */}
          <div className="flex items-center bg-slate-800/70 rounded-xl p-0.5 border border-slate-700/60">
            <button
              onClick={onUndo}
              disabled={!canUndo}
              title="Undo"
              className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700 disabled:opacity-30 disabled:pointer-events-none transition-colors"
            >
              <Undo2 className="w-4 h-4" />
            </button>
            <button
              onClick={onRedo}
              disabled={!canRedo}
              title="Redo"
              className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700 disabled:opacity-30 disabled:pointer-events-none transition-colors"
            >
              <Redo2 className="w-4 h-4" />
            </button>
          </div>

          {/* Gestures Guide Button (Icon only) */}
          <button
            onClick={onOpenGesturesGuide}
            title="Touch Gestures"
            className="p-2 rounded-xl text-slate-400 hover:text-amber-300 hover:bg-slate-800 transition-colors hidden sm:flex"
          >
            <Smartphone className="w-4 h-4" />
          </button>

          {/* Android APK Test Bundle Button (Icon only) */}
          <button
            onClick={onOpenApkBundle}
            title="Mobile APK Test Bundle"
            className="p-2 rounded-xl bg-emerald-950/60 hover:bg-emerald-900/80 border border-emerald-700/60 text-emerald-400 hover:text-emerald-300 active:scale-95 transition-all"
          >
            <Package className="w-4 h-4" />
          </button>

          {/* Primary Export Button (ICON ONLY, NO TEXT) */}
          <button
            onClick={onOpenExport}
            title="Export PNG / OBJ / FBX"
            className="p-2 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white shadow-lg shadow-sky-500/20 active:scale-95 transition-all"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </header>
    </div>
  );
};
