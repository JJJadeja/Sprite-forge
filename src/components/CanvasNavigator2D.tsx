import React, { useState, useRef, useEffect } from 'react';
import {
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Plus,
  Minus,
  Maximize2,
  Hand,
  HelpCircle,
  GitFork,
  Compass,
  SlidersHorizontal,
  X,
  Gamepad2,
  MousePointer
} from 'lucide-react';
import { useContinuousPress } from '../hooks/useContinuousPress';
import { useVirtualJoystick } from '../hooks/useVirtualJoystick';

interface CanvasNavigator2DProps {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onSetZoom: (zoom: number) => void;
  onPan: (dx: number, dy: number) => void;
  onCenterCanvas: () => void;
  isHandMode: boolean;
  onToggleHandMode: () => void;
  isKeyframeMorphAvailable?: boolean;
  onOpenMorphModal?: () => void;
  onShowGestureGuide?: () => void;
}

const ZOOM_PRESETS = [
  { label: '50%', value: 8 },
  { label: '100%', value: 16 },
  { label: '200%', value: 32 },
  { label: '300%', value: 48 },
  { label: '400%', value: 64 },
];

export const CanvasNavigator2D: React.FC<CanvasNavigator2DProps> = ({
  zoom,
  onZoomIn,
  onZoomOut,
  onSetZoom,
  onPan,
  onCenterCanvas,
  isHandMode,
  onToggleHandMode,
  isKeyframeMorphAvailable,
  onOpenMorphModal,
  onShowGestureGuide
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [padControlMode, setPadControlMode] = useState<'joystick' | 'dpad'>('joystick');
  const [showZoomMenu, setShowZoomMenu] = useState<boolean>(false);
  const zoomMenuRef = useRef<HTMLDivElement>(null);

  // Close zoom presets popover when clicking outside
  useEffect(() => {
    if (!showZoomMenu) return;
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (zoomMenuRef.current && !zoomMenuRef.current.contains(e.target as Node)) {
        setShowZoomMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [showZoomMenu]);

  // Step size for nudge vs continuous pan
  const NUDGE_STEP = 32;

  // Continuous press handlers for D-Pad
  const panUpPress = useContinuousPress({
    onAction: () => onPan(0, NUDGE_STEP),
    initialDelayMs: 200,
    intervalMs: 40
  });

  const panDownPress = useContinuousPress({
    onAction: () => onPan(0, -NUDGE_STEP),
    initialDelayMs: 200,
    intervalMs: 40
  });

  const panLeftPress = useContinuousPress({
    onAction: () => onPan(NUDGE_STEP, 0),
    initialDelayMs: 200,
    intervalMs: 40
  });

  const panRightPress = useContinuousPress({
    onAction: () => onPan(-NUDGE_STEP, 0),
    initialDelayMs: 200,
    intervalMs: 40
  });

  // Continuous press handlers for Zoom
  const zoomInPress = useContinuousPress({
    onAction: onZoomIn,
    initialDelayMs: 220,
    intervalMs: 60
  });

  const zoomOutPress = useContinuousPress({
    onAction: onZoomOut,
    initialDelayMs: 220,
    intervalMs: 60
  });

  // Smooth continuous touch trackpad joystick
  const joystick = useVirtualJoystick({
    onMove: (dx, dy) => {
      // Pan follows joystick deflection vector
      onPan(-dx * 0.45, -dy * 0.45);
    },
    maxDistance: 44,
    speedMultiplier: 1.0,
    intervalMs: 30
  });

  const zoomPercentage = Math.round((zoom / 16) * 100);

  return (
    <div
      className="absolute bottom-4 right-4 z-20 flex flex-col items-end gap-2 select-none pointer-events-auto"
      onPointerDown={e => e.stopPropagation()}
    >
      {/* Hand Mode Banner Prompt (when hand tool is active) */}
      {isHandMode && (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-amber-500/20 border border-amber-500/50 text-amber-200 text-xs font-medium shadow-xl backdrop-blur-md animate-fade-in">
          <Hand className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
          <span>Pan Drag Active: Drag canvas to pan</span>
          <button
            onClick={onToggleHandMode}
            className="ml-1 text-[10px] bg-amber-500/30 hover:bg-amber-500/50 text-amber-200 px-2 py-0.5 rounded-lg font-bold transition-colors"
          >
            Exit
          </button>
        </div>
      )}

      {/* Expanded Precision Navigation Pad */}
      {isExpanded ? (
        <div className="bg-slate-900/95 border border-slate-700/80 rounded-3xl p-3 shadow-2xl backdrop-blur-md flex flex-col gap-2.5 w-60 animate-fade-in">
          {/* Header */}
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center gap-1.5 text-xs font-bold text-white">
              <Compass className="w-4 h-4 text-sky-400" />
              <span>Canvas Navigator</span>
            </div>
            <button
              onClick={() => setIsExpanded(false)}
              title="Collapse Navigator"
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Mode Switcher: Joystick Touchpad vs D-Pad */}
          <div className="grid grid-cols-2 gap-1 bg-slate-950/80 p-0.5 rounded-xl border border-slate-800">
            <button
              onClick={() => setPadControlMode('joystick')}
              className={`flex items-center justify-center gap-1.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                padControlMode === 'joystick'
                  ? 'bg-sky-500 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Gamepad2 className="w-3 h-3" />
              <span>Touch Joystick</span>
            </button>
            <button
              onClick={() => setPadControlMode('dpad')}
              className={`flex items-center justify-center gap-1.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                padControlMode === 'dpad'
                  ? 'bg-sky-500 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <SlidersHorizontal className="w-3 h-3" />
              <span>D-Pad Steps</span>
            </button>
          </div>

          {/* Panning Surface */}
          {padControlMode === 'joystick' ? (
            /* Virtual Touch Joystick */
            <div className="flex flex-col items-center justify-center my-1">
              <div
                {...joystick.pointerProps}
                className="relative w-36 h-36 bg-gradient-to-br from-slate-950/90 to-slate-900/90 border-2 border-slate-800 rounded-full flex items-center justify-center shadow-inner cursor-grab active:cursor-grabbing touch-none select-none group"
              >
                {/* Crosshairs Background */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-full h-px bg-slate-800/60" />
                  <div className="h-full w-px bg-slate-800/60 absolute" />
                  <div className="w-20 h-20 rounded-full border border-slate-800/60" />
                </div>

                {/* Joystick Knob Puck */}
                <div
                  className={`w-12 h-12 rounded-full border shadow-xl flex items-center justify-center transition-transform duration-75 pointer-events-none ${
                    joystick.isActive
                      ? 'bg-sky-500 text-white border-sky-300 shadow-sky-500/50 scale-105 ring-4 ring-sky-500/20'
                      : 'bg-slate-800 text-slate-300 border-slate-600 group-hover:border-slate-500'
                  }`}
                  style={{
                    transform: `translate(${joystick.knobOffset.x}px, ${joystick.knobOffset.y}px)`
                  }}
                >
                  <Compass className={`w-5 h-5 ${joystick.isActive ? 'text-white animate-spin' : 'text-sky-400'}`} />
                </div>
              </div>
              <span className="text-[10px] text-slate-400 font-mono mt-1.5">
                {joystick.isActive ? 'Panning smoothly 360°...' : 'Drag circle to pan 360°'}
              </span>
            </div>
          ) : (
            /* 4-Way Panning D-Pad */
            <div className="flex flex-col items-center justify-center my-1">
              <div className="relative w-36 h-36 bg-slate-950/70 border border-slate-800 rounded-2xl p-1 flex items-center justify-center shadow-inner">
                {/* Up Button */}
                <button
                  {...panUpPress}
                  title="Pan Up (Hold for continuous)"
                  aria-label="Pan Up"
                  className="absolute top-1 left-1/2 -translate-x-1/2 w-11 h-10 rounded-xl bg-slate-800/90 hover:bg-slate-700 active:bg-sky-500 active:text-white border border-slate-700/80 text-slate-300 flex items-center justify-center shadow-md active:scale-95 transition-all touch-none select-none"
                >
                  <ChevronUp className="w-5 h-5 pointer-events-none" />
                </button>

                {/* Left Button */}
                <button
                  {...panLeftPress}
                  title="Pan Left (Hold for continuous)"
                  aria-label="Pan Left"
                  className="absolute left-1 top-1/2 -translate-y-1/2 w-10 h-11 rounded-xl bg-slate-800/90 hover:bg-slate-700 active:bg-sky-500 active:text-white border border-slate-700/80 text-slate-300 flex items-center justify-center shadow-md active:scale-95 transition-all touch-none select-none"
                >
                  <ChevronLeft className="w-5 h-5 pointer-events-none" />
                </button>

                {/* Center Fit / Reset Button */}
                <button
                  onClick={onCenterCanvas}
                  title="Center & Fit Canvas"
                  aria-label="Center Canvas"
                  className="w-10 h-10 rounded-xl bg-sky-500/15 hover:bg-sky-500/30 active:bg-sky-500 text-sky-400 active:text-white border border-sky-500/30 flex items-center justify-center shadow-xs active:scale-90 transition-all z-10 touch-none"
                >
                  <Maximize2 className="w-4 h-4 pointer-events-none" />
                </button>

                {/* Right Button */}
                <button
                  {...panRightPress}
                  title="Pan Right (Hold for continuous)"
                  aria-label="Pan Right"
                  className="absolute right-1 top-1/2 -translate-y-1/2 w-10 h-11 rounded-xl bg-slate-800/90 hover:bg-slate-700 active:bg-sky-500 active:text-white border border-slate-700/80 text-slate-300 flex items-center justify-center shadow-md active:scale-95 transition-all touch-none select-none"
                >
                  <ChevronRight className="w-5 h-5 pointer-events-none" />
                </button>

                {/* Down Button */}
                <button
                  {...panDownPress}
                  title="Pan Down (Hold for continuous)"
                  aria-label="Pan Down"
                  className="absolute bottom-1 left-1/2 -translate-x-1/2 w-11 h-10 rounded-xl bg-slate-800/90 hover:bg-slate-700 active:bg-sky-500 active:text-white border border-slate-700/80 text-slate-300 flex items-center justify-center shadow-md active:scale-95 transition-all touch-none select-none"
                >
                  <ChevronDown className="w-5 h-5 pointer-events-none" />
                </button>
              </div>
              <span className="text-[10px] text-slate-500 font-mono mt-1">Tap nudge • Hold continuous</span>
            </div>
          )}

          {/* Zoom Section: Slider + Buttons + Presets */}
          <div className="flex flex-col gap-1.5 pt-2 border-t border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-400">Zoom Scale</span>
              <div className="relative" ref={zoomMenuRef}>
                <button
                  onClick={() => setShowZoomMenu(!showZoomMenu)}
                  className="px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-sky-400 font-mono text-xs font-bold transition-colors"
                >
                  {zoomPercentage}%
                </button>

                {/* Quick Zoom Presets Popover */}
                {showZoomMenu && (
                  <div className="absolute right-0 bottom-full mb-1 w-28 bg-slate-900 border border-slate-700 rounded-xl p-1 shadow-2xl backdrop-blur-md z-30 flex flex-col gap-0.5">
                    <button
                      onClick={() => {
                        onCenterCanvas();
                        setShowZoomMenu(false);
                      }}
                      className="px-2 py-1 text-left text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg"
                    >
                      Fit to Screen
                    </button>
                    {ZOOM_PRESETS.map(preset => (
                      <button
                        key={preset.label}
                        onClick={() => {
                          onSetZoom(preset.value);
                          setShowZoomMenu(false);
                        }}
                        className={`px-2 py-1 text-left text-xs font-mono font-medium rounded-lg transition-colors ${
                          zoom === preset.value
                            ? 'bg-sky-500 text-white font-bold'
                            : 'text-slate-300 hover:text-white hover:bg-slate-800'
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Continuous Zoom Range Slider */}
            <div className="flex items-center gap-2">
              <button
                {...zoomOutPress}
                title="Zoom Out"
                className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 active:bg-sky-500 text-slate-300 active:text-white border border-slate-700 touch-none select-none transition-colors"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>

              <input
                type="range"
                min="4"
                max="64"
                step="1"
                value={zoom}
                onChange={e => onSetZoom(Number(e.target.value))}
                className="flex-1 accent-sky-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg appearance-none"
              />

              <button
                {...zoomInPress}
                title="Zoom In"
                className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 active:bg-sky-500 text-slate-300 active:text-white border border-slate-700 touch-none select-none transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Quick Presets Pills */}
            <div className="grid grid-cols-4 gap-1">
              {[
                { label: 'Fit', action: onCenterCanvas },
                { label: '100%', action: () => onSetZoom(16) },
                { label: '200%', action: () => onSetZoom(32) },
                { label: '400%', action: () => onSetZoom(64) }
              ].map(p => (
                <button
                  key={p.label}
                  onClick={p.action}
                  className="py-0.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/60 text-[10px] font-mono transition-colors active:scale-95"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Quick Tools Row (Hand Drag Mode, Morph, Gestures) */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-800 gap-1.5">
            <button
              onClick={onToggleHandMode}
              title="Toggle Touch Pan Mode (Drag anywhere without drawing)"
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-xl border text-xs font-semibold transition-all active:scale-95 ${
                isHandMode
                  ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md font-bold'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
              }`}
            >
              <Hand className="w-3.5 h-3.5" />
              <span>Pan Drag</span>
            </button>

            {isKeyframeMorphAvailable && onOpenMorphModal && (
              <button
                onClick={onOpenMorphModal}
                title="Morph / Interpolate Keyframes"
                className="p-2 rounded-xl bg-purple-500/15 hover:bg-purple-500/30 text-purple-400 border border-purple-500/30 active:scale-95 transition-all"
              >
                <GitFork className="w-4 h-4 rotate-90" />
              </button>
            )}

            {onShowGestureGuide && (
              <button
                onClick={onShowGestureGuide}
                title="Touch Gestures Guide"
                className="p-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/30 text-amber-400 border border-amber-500/30 active:scale-95 transition-all"
              >
                <HelpCircle className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      ) : (
        /* Compact Floating Navigation Bar */
        <div className="flex items-center gap-1 bg-slate-900/90 border border-slate-800 rounded-2xl p-1.5 shadow-xl backdrop-blur-md">
          {/* Zoom Out Button */}
          <button
            {...zoomOutPress}
            title="Zoom Out (Hold for continuous)"
            aria-label="Zoom Out"
            className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 active:bg-sky-500 active:text-white transition-all touch-none select-none"
          >
            <Minus className="w-4 h-4 pointer-events-none" />
          </button>

          {/* Zoom Percentage / Presets Trigger */}
          <div className="relative" ref={zoomMenuRef}>
            <button
              onClick={() => setShowZoomMenu(!showZoomMenu)}
              title="Select Zoom Preset"
              className="px-2 py-1.5 rounded-xl text-xs font-mono font-bold text-sky-400 hover:bg-slate-800 transition-colors min-w-[3.5rem] text-center"
            >
              {zoomPercentage}%
            </button>

            {/* Presets Popover in compact mode */}
            {showZoomMenu && (
              <div className="absolute right-0 bottom-full mb-2 w-28 bg-slate-900 border border-slate-700 rounded-xl p-1 shadow-2xl backdrop-blur-md z-30 flex flex-col gap-0.5">
                <button
                  onClick={() => {
                    onCenterCanvas();
                    setShowZoomMenu(false);
                  }}
                  className="px-2 py-1 text-left text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg"
                >
                  Fit to Screen
                </button>
                {ZOOM_PRESETS.map(preset => (
                  <button
                    key={preset.label}
                    onClick={() => {
                      onSetZoom(preset.value);
                      setShowZoomMenu(false);
                    }}
                    className={`px-2 py-1 text-left text-xs font-mono font-medium rounded-lg transition-colors ${
                      zoom === preset.value
                        ? 'bg-sky-500 text-white font-bold'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Zoom In Button */}
          <button
            {...zoomInPress}
            title="Zoom In (Hold for continuous)"
            aria-label="Zoom In"
            className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 active:bg-sky-500 active:text-white transition-all touch-none select-none"
          >
            <Plus className="w-4 h-4 pointer-events-none" />
          </button>

          <div className="h-5 w-px bg-slate-800 mx-0.5" />

          {/* Hand Mode Toggle Button */}
          <button
            onClick={onToggleHandMode}
            title={isHandMode ? "Exit Pan Drag Mode" : "Touch Pan Drag Mode (One-Finger Pan)"}
            aria-label="Touch Pan Mode"
            className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all active:scale-95 ${
              isHandMode
                ? 'bg-amber-500 text-slate-950 font-bold shadow-md ring-2 ring-amber-400/40'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Hand className="w-4 h-4" />
          </button>

          {/* Center / Fit Button */}
          <button
            onClick={onCenterCanvas}
            title="Fit to Screen"
            aria-label="Fit Canvas to Screen"
            className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <Maximize2 className="w-4 h-4" />
          </button>

          {/* Expand Precision D-Pad Button */}
          <button
            onClick={() => setIsExpanded(true)}
            title="Open On-Screen Panning Pad"
            aria-label="Open D-Pad Navigator"
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-sky-500/15 hover:bg-sky-500/25 text-sky-400 border border-sky-500/30 transition-all active:scale-95 shadow-xs"
          >
            <Compass className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
