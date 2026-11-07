import React, { useState } from 'react';
import {
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Plus,
  Minus,
  Rotate3d,
  Move,
  Maximize2,
  Compass,
  X,
  Camera,
  Gamepad2,
  SlidersHorizontal,
  Box
} from 'lucide-react';
import { useContinuousPress } from '../hooks/useContinuousPress';
import { useVirtualJoystick } from '../hooks/useVirtualJoystick';

export type ViewPreset = 'iso' | 'front' | 'side' | 'top';

interface CameraNavigator3DProps {
  onRotateCamera: (deltaAzimuth: number, deltaPolar: number) => void;
  onPanCamera: (deltaX: number, deltaY: number) => void;
  onZoomCamera: (delta: number) => void;
  onResetCamera: () => void;
  onSetViewPreset: (preset: ViewPreset) => void;
  isInspectMode: boolean;
  onToggleInspectMode: () => void;
}

export const CameraNavigator3D: React.FC<CameraNavigator3DProps> = ({
  onRotateCamera,
  onPanCamera,
  onZoomCamera,
  onResetCamera,
  onSetViewPreset,
  isInspectMode,
  onToggleInspectMode
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [navMode, setNavMode] = useState<'orbit' | 'pan'>('orbit');
  const [padControlMode, setPadControlMode] = useState<'joystick' | 'dpad'>('joystick');
  const [activePreset, setActivePreset] = useState<ViewPreset>('iso');

  // Step parameters
  const ROTATE_STEP = 0.08; // radians (~4.5 deg)
  const PAN_STEP = 0.8;
  const ZOOM_STEP = 1.6;

  // Handle directional action based on orbit vs pan mode
  const handleUp = () => {
    if (navMode === 'orbit') {
      onRotateCamera(0, -ROTATE_STEP);
    } else {
      onPanCamera(0, PAN_STEP);
    }
  };

  const handleDown = () => {
    if (navMode === 'orbit') {
      onRotateCamera(0, ROTATE_STEP);
    } else {
      onPanCamera(0, -PAN_STEP);
    }
  };

  const handleLeft = () => {
    if (navMode === 'orbit') {
      onRotateCamera(-ROTATE_STEP, 0);
    } else {
      onPanCamera(-PAN_STEP, 0);
    }
  };

  const handleRight = () => {
    if (navMode === 'orbit') {
      onRotateCamera(ROTATE_STEP, 0);
    } else {
      onPanCamera(PAN_STEP, 0);
    }
  };

  // Continuous press handlers for D-Pad
  const upPress = useContinuousPress({
    onAction: handleUp,
    initialDelayMs: 200,
    intervalMs: 40
  });

  const downPress = useContinuousPress({
    onAction: handleDown,
    initialDelayMs: 200,
    intervalMs: 40
  });

  const leftPress = useContinuousPress({
    onAction: handleLeft,
    initialDelayMs: 200,
    intervalMs: 40
  });

  const rightPress = useContinuousPress({
    onAction: handleRight,
    initialDelayMs: 200,
    intervalMs: 40
  });

  // Continuous press handlers for Zoom
  const zoomInPress = useContinuousPress({
    onAction: () => onZoomCamera(ZOOM_STEP),
    initialDelayMs: 200,
    intervalMs: 50
  });

  const zoomOutPress = useContinuousPress({
    onAction: () => onZoomCamera(-ZOOM_STEP),
    initialDelayMs: 200,
    intervalMs: 50
  });

  // Virtual Joystick for 3D Camera manipulation
  const joystick = useVirtualJoystick({
    onMove: (dx, dy) => {
      if (navMode === 'orbit') {
        // Smooth continuous 3D rotation
        onRotateCamera(dx * 0.0018, dy * 0.0018);
      } else {
        // Smooth continuous camera panning
        onPanCamera(dx * 0.015, -dy * 0.015);
      }
    },
    maxDistance: 44,
    speedMultiplier: 1.0,
    intervalMs: 28
  });

  const handleSelectPreset = (preset: ViewPreset) => {
    setActivePreset(preset);
    onSetViewPreset(preset);
  };

  return (
    <div
      className="absolute top-16 right-3 sm:right-4 z-20 flex flex-col items-end gap-2 select-none pointer-events-auto"
      onPointerDown={e => e.stopPropagation()}
    >
      {/* Inspect Mode Banner Prompt */}
      {isInspectMode && (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-sky-500/20 border border-sky-500/50 text-sky-200 text-xs font-medium shadow-xl backdrop-blur-md animate-fade-in">
          <Camera className="w-3.5 h-3.5 text-sky-400 animate-pulse" />
          <span>Camera Drag Active: Touch canvas to orbit</span>
          <button
            onClick={onToggleInspectMode}
            className="ml-1 text-[10px] bg-sky-500/30 hover:bg-sky-500/50 text-sky-200 px-2 py-0.5 rounded-lg font-bold transition-colors"
          >
            Exit
          </button>
        </div>
      )}

      {/* Expanded 3D Camera Controller Pad */}
      {isExpanded ? (
        <div className="bg-slate-900/95 border border-slate-700/80 rounded-3xl p-3 shadow-2xl backdrop-blur-md flex flex-col gap-2.5 w-64 animate-fade-in">
          {/* Header & Close */}
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center gap-1.5 text-xs font-bold text-white">
              <Compass className="w-4 h-4 text-sky-400" />
              <span>3D Camera Controls</span>
            </div>
            <button
              onClick={() => setIsExpanded(false)}
              title="Minimize Camera Controls"
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Mode Selector: Orbit (Rotate) vs Pan (Slide) */}
          <div className="grid grid-cols-2 gap-1 bg-slate-950/80 p-0.5 rounded-xl border border-slate-800">
            <button
              onClick={() => setNavMode('orbit')}
              className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                navMode === 'orbit'
                  ? 'bg-sky-500 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Rotate3d className="w-3.5 h-3.5" />
              <span>Orbit Angle</span>
            </button>

            <button
              onClick={() => setNavMode('pan')}
              className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                navMode === 'pan'
                  ? 'bg-sky-500 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Move className="w-3.5 h-3.5" />
              <span>Pan Camera</span>
            </button>
          </div>

          {/* Control Style Switcher: Virtual Joystick vs D-Pad Steps */}
          <div className="grid grid-cols-2 gap-1 bg-slate-950/60 p-0.5 rounded-xl border border-slate-800/80 text-[10px]">
            <button
              onClick={() => setPadControlMode('joystick')}
              className={`flex items-center justify-center gap-1 py-1 rounded-lg font-medium transition-all ${
                padControlMode === 'joystick'
                  ? 'bg-slate-800 text-sky-300 font-bold border border-slate-700/80'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Gamepad2 className="w-3 h-3" />
              <span>Touch Joystick</span>
            </button>

            <button
              onClick={() => setPadControlMode('dpad')}
              className={`flex items-center justify-center gap-1 py-1 rounded-lg font-medium transition-all ${
                padControlMode === 'dpad'
                  ? 'bg-slate-800 text-sky-300 font-bold border border-slate-700/80'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <SlidersHorizontal className="w-3 h-3" />
              <span>D-Pad Steps</span>
            </button>
          </div>

          {/* 3D Navigation Surface */}
          {padControlMode === 'joystick' ? (
            /* Virtual Touch Joystick for 3D Camera */
            <div className="flex flex-col items-center justify-center my-0.5">
              <div
                {...joystick.pointerProps}
                className="relative w-36 h-36 bg-gradient-to-br from-slate-950/90 to-slate-900/90 border-2 border-slate-800 rounded-full flex items-center justify-center shadow-inner cursor-grab active:cursor-grabbing touch-none select-none group"
              >
                {/* 3D Axis Rings Background */}
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
                  {navMode === 'orbit' ? (
                    <Rotate3d className={`w-5 h-5 ${joystick.isActive ? 'text-white animate-spin' : 'text-sky-400'}`} />
                  ) : (
                    <Move className={`w-5 h-5 ${joystick.isActive ? 'text-white' : 'text-sky-400'}`} />
                  )}
                </div>
              </div>
              <span className="text-[10px] text-slate-400 font-mono mt-1">
                {joystick.isActive 
                  ? (navMode === 'orbit' ? 'Orbiting camera...' : 'Panning camera...')
                  : (navMode === 'orbit' ? 'Drag circle to orbit' : 'Drag circle to pan')}
              </span>
            </div>
          ) : (
            /* 3D Navigation D-Pad */
            <div className="flex flex-col items-center justify-center my-0.5">
              <div className="relative w-36 h-36 bg-slate-950/70 border border-slate-800 rounded-2xl p-1 flex items-center justify-center shadow-inner">
                {/* Up */}
                <button
                  {...upPress}
                  title={navMode === 'orbit' ? 'Orbit Up' : 'Pan Camera Up'}
                  aria-label={navMode === 'orbit' ? 'Orbit Up' : 'Pan Camera Up'}
                  className="absolute top-1 left-1/2 -translate-x-1/2 w-11 h-10 rounded-xl bg-slate-800/90 hover:bg-slate-700 active:bg-sky-500 active:text-white border border-slate-700/80 text-slate-300 flex items-center justify-center shadow-md active:scale-95 transition-all touch-none select-none"
                >
                  <ChevronUp className="w-5 h-5 pointer-events-none" />
                </button>

                {/* Left */}
                <button
                  {...leftPress}
                  title={navMode === 'orbit' ? 'Orbit Left' : 'Pan Camera Left'}
                  aria-label={navMode === 'orbit' ? 'Orbit Left' : 'Pan Camera Left'}
                  className="absolute left-1 top-1/2 -translate-y-1/2 w-10 h-11 rounded-xl bg-slate-800/90 hover:bg-slate-700 active:bg-sky-500 active:text-white border border-slate-700/80 text-slate-300 flex items-center justify-center shadow-md active:scale-95 transition-all touch-none select-none"
                >
                  <ChevronLeft className="w-5 h-5 pointer-events-none" />
                </button>

                {/* Center Reset */}
                <button
                  onClick={onResetCamera}
                  title="Reset Camera Center"
                  aria-label="Reset Camera"
                  className="w-10 h-10 rounded-xl bg-sky-500/15 hover:bg-sky-500/30 active:bg-sky-500 text-sky-400 active:text-white border border-sky-500/30 flex items-center justify-center shadow-xs active:scale-90 transition-all z-10 touch-none"
                >
                  <Maximize2 className="w-4 h-4 pointer-events-none" />
                </button>

                {/* Right */}
                <button
                  {...rightPress}
                  title={navMode === 'orbit' ? 'Orbit Right' : 'Pan Camera Right'}
                  aria-label={navMode === 'orbit' ? 'Orbit Right' : 'Pan Camera Right'}
                  className="absolute right-1 top-1/2 -translate-y-1/2 w-10 h-11 rounded-xl bg-slate-800/90 hover:bg-slate-700 active:bg-sky-500 active:text-white border border-slate-700/80 text-slate-300 flex items-center justify-center shadow-md active:scale-95 transition-all touch-none select-none"
                >
                  <ChevronRight className="w-5 h-5 pointer-events-none" />
                </button>

                {/* Down */}
                <button
                  {...downPress}
                  title={navMode === 'orbit' ? 'Orbit Down' : 'Pan Camera Down'}
                  aria-label={navMode === 'orbit' ? 'Orbit Down' : 'Pan Camera Down'}
                  className="absolute bottom-1 left-1/2 -translate-x-1/2 w-11 h-10 rounded-xl bg-slate-800/90 hover:bg-slate-700 active:bg-sky-500 active:text-white border border-slate-700/80 text-slate-300 flex items-center justify-center shadow-md active:scale-95 transition-all touch-none select-none"
                >
                  <ChevronDown className="w-5 h-5 pointer-events-none" />
                </button>
              </div>
              <span className="text-[10px] text-slate-500 font-mono mt-1">
                {navMode === 'orbit' ? 'Orbiting 3D Angle' : 'Panning Camera XY'}
              </span>
            </div>
          )}

          {/* Zoom Section */}
          <div className="flex flex-col gap-1.5 pt-2 border-t border-slate-800">
            <span className="text-[11px] font-semibold text-slate-400">Zoom / Distance</span>
            <div className="grid grid-cols-2 gap-2">
              <button
                {...zoomOutPress}
                title="Dolly Zoom Out"
                className="flex items-center justify-center gap-1.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-sky-500 text-slate-300 active:text-white border border-slate-700 font-semibold text-xs active:scale-95 transition-all touch-none select-none"
              >
                <Minus className="w-4 h-4 pointer-events-none" />
                <span className="pointer-events-none">Zoom Out</span>
              </button>

              <button
                {...zoomInPress}
                title="Dolly Zoom In"
                className="flex items-center justify-center gap-1.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-sky-500 text-slate-300 active:text-white border border-slate-700 font-semibold text-xs active:scale-95 transition-all touch-none select-none"
              >
                <Plus className="w-4 h-4 pointer-events-none" />
                <span className="pointer-events-none">Zoom In</span>
              </button>
            </div>
          </div>

          {/* View Angle Presets */}
          <div className="flex flex-col gap-1.5 pt-2 border-t border-slate-800">
            <span className="text-[11px] font-semibold text-slate-400">View Presets</span>
            <div className="grid grid-cols-4 gap-1">
              {(['iso', 'front', 'side', 'top'] as ViewPreset[]).map(preset => (
                <button
                  key={preset}
                  onClick={() => handleSelectPreset(preset)}
                  className={`py-1 rounded-lg border text-xs font-mono font-medium capitalize transition-all active:scale-95 ${
                    activePreset === preset
                      ? 'bg-sky-500 text-white border-sky-400 font-bold shadow-xs'
                      : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border-slate-700/60'
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          {/* Touch Drag Camera Mode Toggle */}
          <div className="pt-2 border-t border-slate-800">
            <button
              onClick={onToggleInspectMode}
              title="Touch Drag Camera Mode (Orbit freely without modifying voxels)"
              className={`w-full flex items-center justify-center gap-1.5 py-2 rounded-xl border text-xs font-semibold transition-all active:scale-95 ${
                isInspectMode
                  ? 'bg-sky-500 text-white border-sky-400 shadow-md font-bold'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
              }`}
            >
              <Camera className="w-4 h-4" />
              <span>{isInspectMode ? 'Exit Camera Drag' : 'Touch Camera Drag'}</span>
            </button>
          </div>
        </div>
      ) : (
        /* Compact Floating Navigation Bar */
        <div className="flex items-center gap-1 bg-slate-900/90 border border-slate-800 rounded-2xl p-1.5 shadow-xl backdrop-blur-md">
          {/* Zoom Out Button */}
          <button
            {...zoomOutPress}
            title="Dolly Zoom Out (Hold for continuous)"
            aria-label="Zoom Out"
            className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 active:bg-sky-500 active:text-white transition-all touch-none select-none"
          >
            <Minus className="w-4 h-4 pointer-events-none" />
          </button>

          {/* Zoom In Button */}
          <button
            {...zoomInPress}
            title="Dolly Zoom In (Hold for continuous)"
            aria-label="Zoom In"
            className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 active:bg-sky-500 active:text-white transition-all touch-none select-none"
          >
            <Plus className="w-4 h-4 pointer-events-none" />
          </button>

          <div className="h-5 w-px bg-slate-800 mx-0.5" />

          {/* Touch Inspect Mode Toggle */}
          <button
            onClick={onToggleInspectMode}
            title={isInspectMode ? 'Exit Camera Drag Mode' : 'Touch Camera Drag Mode'}
            aria-label="Touch Camera Drag"
            className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all active:scale-95 ${
              isInspectMode
                ? 'bg-sky-500 text-white font-bold shadow-md ring-2 ring-sky-400/40'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Camera className="w-4 h-4" />
          </button>

          {/* Reset Camera View */}
          <button
            onClick={onResetCamera}
            title="Reset Camera Framing"
            aria-label="Reset Camera"
            className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <Maximize2 className="w-4 h-4" />
          </button>

          {/* Open Expanded Controller Pad */}
          <button
            onClick={() => setIsExpanded(true)}
            title="Open 3D Camera Controls Pad"
            aria-label="Open 3D Controls"
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-sky-500/15 hover:bg-sky-500/25 text-sky-400 border border-sky-500/30 transition-all active:scale-95 shadow-xs"
          >
            <Compass className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
