import React from 'react';
import { Smartphone, Monitor } from 'lucide-react';

interface MobileFrameProps {
  children: React.ReactNode;
  isFrameView: boolean;
  onToggleFrameView: () => void;
}

export const MobileFrame: React.FC<MobileFrameProps> = ({
  children,
  isFrameView,
  onToggleFrameView
}) => {
  if (!isFrameView) {
    return (
      <div className="w-full h-full overflow-hidden bg-slate-950 flex flex-col">
        {children}
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-slate-950 flex flex-col items-center justify-center p-2 sm:p-4 select-none overflow-hidden relative">
      {/* Floating Device Mode Switcher (Top Right) */}
      <div className="absolute top-3 right-4 z-50 flex items-center gap-2">
        <button
          onClick={onToggleFrameView}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900/90 border border-slate-700/80 text-xs font-semibold text-slate-300 hover:text-white shadow-xl backdrop-blur-md transition-all active:scale-95"
        >
          <Monitor className="w-3.5 h-3.5 text-sky-400" />
          <span>Fullscreen Mobile View</span>
        </button>
      </div>

      {/* Android Device Mockup Frame (Google Pixel / Galaxy flagship) */}
      <div className="relative w-full max-w-[430px] h-[96vh] max-h-[890px] bg-black rounded-[48px] p-3 shadow-2xl ring-1 ring-slate-800 border-4 border-slate-800 flex flex-col overflow-hidden">
        {/* Android Punch Hole Camera */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-black border border-slate-800 z-50 pointer-events-none flex items-center justify-center">
          <div className="w-1.5 h-1.5 rounded-full bg-slate-900" />
        </div>

        {/* Inner Phone Screen Content */}
        <div className="relative w-full h-full rounded-[38px] overflow-hidden bg-slate-950 flex flex-col">
          {children}
        </div>

        {/* Android Gesture Navigation Pill at Bottom */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-32 h-1 rounded-full bg-slate-600/80 z-50 pointer-events-none" />
      </div>
    </div>
  );
};
