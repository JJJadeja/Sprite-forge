import React from 'react';
import { X, Smartphone, HandMetal, Touchpad, Check, Sparkles, Undo2, Redo2, ZoomIn, Pipette } from 'lucide-react';

interface TouchGesturesModalProps {
  onClose: () => void;
}

export const TouchGesturesModal: React.FC<TouchGesturesModalProps> = ({ onClose }) => {
  const gestures = [
    {
      title: 'Pinch to Zoom',
      desc: 'Use two fingers to pinch in or spread out to zoom smoothly into pixels or 3D view.',
      icon: <ZoomIn className="w-5 h-5 text-sky-400" />,
      badge: 'Two Fingers'
    },
    {
      title: 'Pan Canvas',
      desc: 'Drag with two fingers across the screen to pan around your workspace freely.',
      icon: <Smartphone className="w-5 h-5 text-indigo-400" />,
      badge: 'Two Fingers'
    },
    {
      title: 'Quick Undo',
      desc: 'Tap screen with two fingers simultaneously to undo your last brush stroke.',
      icon: <Undo2 className="w-5 h-5 text-amber-400" />,
      badge: '2-Finger Tap'
    },
    {
      title: 'Quick Redo',
      desc: 'Tap screen with three fingers simultaneously to redo the undone action.',
      icon: <Redo2 className="w-5 h-5 text-emerald-400" />,
      badge: '3-Finger Tap'
    },
    {
      title: 'Instant Eye Dropper',
      desc: 'Long-press on any pixel for 0.4s to sample its color with haptic vibration feedback.',
      icon: <Pipette className="w-5 h-5 text-rose-400" />,
      badge: 'Long Press'
    },
    {
      title: '1-Finger Drawing & 3D Orbit',
      desc: 'Single finger draws pixels with selected tool, or rotates the 3D model in 3D mode.',
      icon: <HandMetal className="w-5 h-5 text-purple-400" />,
      badge: 'Single Finger'
    },
    {
      title: 'On-Screen Camera HUD (Joystick & Zoom)',
      desc: 'Use the floating HUD widget with virtual joystick, D-pad, and zoom slider to pan & zoom independently of drawing tools.',
      icon: <Touchpad className="w-5 h-5 text-teal-400" />,
      badge: 'On-Screen HUD'
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm select-none">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Touchpad className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Touch Gestures & Controls</h2>
              <p className="text-xs text-slate-400">Streamlined gestures designed for Android & touchscreens</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Gestures List */}
        <div className="p-6 space-y-3 max-h-[70vh] overflow-y-auto">
          {gestures.map((g, idx) => (
            <div
              key={idx}
              className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800/80 flex items-start gap-3.5 hover:border-slate-700 transition-colors"
            >
              <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 flex-shrink-0">
                {g.icon}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-xs font-bold text-white">{g.title}</h3>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                    {g.badge}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">{g.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <span className="text-[11px] text-slate-500 font-mono">Haptic feedback supported on Android</span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-semibold bg-sky-500 hover:bg-sky-400 text-white shadow-md transition-colors"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};
