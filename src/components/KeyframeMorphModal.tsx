import React, { useState, useEffect, useRef } from 'react';
import { Frame } from '../types/sprite';
import { 
  generateMorphFrames, 
  interpolateLayerPixels, 
  getFrameCompositePixels 
} from '../utils/morphUtils';
import { 
  GitFork, 
  X, 
  Play, 
  Pause, 
  ArrowRight, 
  Sparkles, 
  Copy, 
  ArrowLeftRight 
} from 'lucide-react';

interface KeyframeMorphModalProps {
  isOpen: boolean;
  onClose: () => void;
  frames: Frame[];
  currentFrameIndex: number;
  width: number;
  height: number;
  onAddMorphFrames: (newFrames: Frame[], insertAfterIndex?: number) => void;
  onDuplicateFrame?: (index: number) => void;
}

export const KeyframeMorphModal: React.FC<KeyframeMorphModalProps> = ({
  isOpen,
  onClose,
  frames,
  currentFrameIndex,
  width,
  height,
  onAddMorphFrames,
  onDuplicateFrame
}) => {
  const [frameAIndex, setFrameAIndex] = useState<number>(() => {
    return Math.min(Math.max(0, currentFrameIndex), Math.max(0, frames.length - 1));
  });

  const [frameBIndex, setFrameBIndex] = useState<number>(() => {
    if (frames.length > 1) {
      return (currentFrameIndex + 1) % frames.length;
    }
    return 0;
  });

  const [steps, setSteps] = useState<number>(3);
  const [style, setStyle] = useState<'blend' | 'dither'>('blend');
  const [insertPosition, setInsertPosition] = useState<'between' | 'end'>('between');

  // Preview animation state
  const [previewStep, setPreviewStep] = useState<number>(0); // 0 = Frame A, steps+1 = Frame B
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);

  // Sync frame indices when modal opens
  useEffect(() => {
    if (isOpen) {
      const idxA = Math.min(Math.max(0, currentFrameIndex), Math.max(0, frames.length - 1));
      setFrameAIndex(idxA);
      setFrameBIndex(frames.length > 1 ? (idxA + 1) % frames.length : 0);
      setPreviewStep(0);
      setIsPlaying(true);
    }
  }, [isOpen, currentFrameIndex, frames.length]);

  // Preview animation loop
  useEffect(() => {
    if (!isOpen || !isPlaying || frames.length < 2) return;
    const totalSteps = steps + 2; // Frame A, steps in-betweens, Frame B
    const interval = setInterval(() => {
      setPreviewStep(prev => (prev + 1) % totalSteps);
    }, 200);

    return () => clearInterval(interval);
  }, [isOpen, isPlaying, steps, frames.length]);

  // Render live preview canvas
  useEffect(() => {
    if (!isOpen || frames.length < 2) return;
    const canvas = previewCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingEnabled = false;

    const frameA = frames[frameAIndex] || frames[0];
    const frameB = frames[frameBIndex] || frames[1] || frames[0];

    let pixelsToRender: string[];

    if (previewStep === 0) {
      pixelsToRender = getFrameCompositePixels(frameA, width, height);
    } else if (previewStep === steps + 1) {
      pixelsToRender = getFrameCompositePixels(frameB, width, height);
    } else {
      // In-between morph step
      const t = previewStep / (steps + 1);
      const compositeA = getFrameCompositePixels(frameA, width, height);
      const compositeB = getFrameCompositePixels(frameB, width, height);
      pixelsToRender = interpolateLayerPixels(compositeA, compositeB, t, width, height, style);
    }

    // Draw pixel grid on preview canvas
    const scaleX = canvas.width / width;
    const scaleY = canvas.height / height;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const color = pixelsToRender[y * width + x];
        if (color) {
          ctx.fillStyle = color;
          ctx.fillRect(x * scaleX, y * scaleY, scaleX, scaleY);
        }
      }
    }
  }, [isOpen, frames, frameAIndex, frameBIndex, previewStep, steps, style, width, height]);

  if (!isOpen) return null;

  const handleSwapKeyframes = () => {
    const temp = frameAIndex;
    setFrameAIndex(frameBIndex);
    setFrameBIndex(temp);
  };

  const handleGenerate = () => {
    if (frames.length < 2) return;
    const frameA = frames[frameAIndex];
    const frameB = frames[frameBIndex];
    if (!frameA || !frameB) return;

    const newFrames = generateMorphFrames(
      frameA,
      frameB,
      steps,
      style,
      width,
      height,
      frameAIndex,
      frameBIndex
    );

    const insertIdx = insertPosition === 'between' ? frameAIndex : undefined;
    onAddMorphFrames(newFrames, insertIdx);
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 select-none animate-fade-in"
      onPointerDown={e => e.stopPropagation()}
    >
      <div 
        className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[92vh] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
              <GitFork className="w-4 h-4 rotate-90" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">Keyframe Morph (Tweening)</h3>
              <p className="text-[11px] text-slate-400">Interpolate pixel transitions between two keyframes</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 overflow-y-auto space-y-4 text-xs">
          {frames.length < 2 ? (
            /* Warning if fewer than 2 frames exist */
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-center space-y-3">
              <p className="font-medium text-xs">
                Keyframe morphing requires at least 2 keyframes to interpolate between.
              </p>
              {onDuplicateFrame && (
                <button
                  onClick={() => {
                    onDuplicateFrame(0);
                    setFrameAIndex(0);
                    setFrameBIndex(1);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs inline-flex items-center gap-1.5 transition-all shadow-md active:scale-95"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Duplicate Current Frame as Keyframe 2</span>
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Keyframe Selection Row */}
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 items-center">
                {/* Keyframe A */}
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-[11px] font-semibold text-slate-400 flex items-center justify-between">
                    <span>Start Frame (A)</span>
                    <span className="text-[10px] text-sky-400 font-mono">0%</span>
                  </label>
                  <select
                    value={frameAIndex}
                    onChange={e => setFrameAIndex(Number(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white font-medium focus:border-purple-500 outline-none"
                  >
                    {frames.map((f, i) => (
                      <option key={f.id} value={i}>
                        {i + 1}. {f.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Swap Button */}
                <div className="sm:col-span-1 flex items-center justify-center pt-2 sm:pt-4">
                  <button
                    onClick={handleSwapKeyframes}
                    title="Swap Start and End Keyframes"
                    className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/60 transition-all active:scale-95"
                  >
                    <ArrowLeftRight className="w-4 h-4 text-purple-400" />
                  </button>
                </div>

                {/* Keyframe B */}
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-[11px] font-semibold text-slate-400 flex items-center justify-between">
                    <span>Target Frame (B)</span>
                    <span className="text-[10px] text-purple-400 font-mono">100%</span>
                  </label>
                  <select
                    value={frameBIndex}
                    onChange={e => setFrameBIndex(Number(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white font-medium focus:border-purple-500 outline-none"
                  >
                    {frames.map((f, i) => (
                      <option key={f.id} value={i}>
                        {i + 1}. {f.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Live Morph Preview Box */}
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 flex flex-col sm:flex-row items-center gap-3">
                <div className="relative w-28 h-28 bg-slate-900 border border-slate-700 rounded-lg overflow-hidden flex items-center justify-center checker-bg shrink-0 shadow-inner">
                  <canvas
                    ref={previewCanvasRef}
                    width={96}
                    height={96}
                    className="w-full h-full pixel-canvas"
                    style={{ imageRendering: 'pixelated' }}
                  />
                  <div className="absolute top-1 left-1 bg-black/75 px-1.5 py-0.5 rounded text-[9px] font-mono text-purple-300 font-bold backdrop-blur-xs">
                    {previewStep === 0
                      ? 'Keyframe A'
                      : previewStep === steps + 1
                      ? 'Keyframe B'
                      : `Step ${previewStep}/${steps}`}
                  </div>
                </div>

                <div className="flex-1 space-y-2 w-full">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400 font-semibold">Preview Sequence</span>
                    <button
                      onClick={() => setIsPlaying(!isPlaying)}
                      className="px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center gap-1 text-[10px] font-medium transition-colors"
                    >
                      {isPlaying ? <Pause className="w-3 h-3 text-amber-400" /> : <Play className="w-3 h-3 text-emerald-400" />}
                      <span>{isPlaying ? 'Pause' : 'Play'}</span>
                    </button>
                  </div>

                  {/* Scrubber slider */}
                  <input
                    type="range"
                    min={0}
                    max={steps + 1}
                    value={previewStep}
                    onChange={e => {
                      setIsPlaying(false);
                      setPreviewStep(Number(e.target.value));
                    }}
                    className="w-full accent-purple-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                  />

                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-500">
                    <span className={previewStep === 0 ? 'text-sky-400 font-bold' : ''}>A (0%)</span>
                    <span className={previewStep > 0 && previewStep < steps + 1 ? 'text-purple-300 font-bold' : ''}>
                      {previewStep > 0 && previewStep < steps + 1
                        ? `Morph ${Math.round((previewStep / (steps + 1)) * 100)}%`
                        : 'In-Betweens'}
                    </span>
                    <span className={previewStep === steps + 1 ? 'text-purple-400 font-bold' : ''}>B (100%)</span>
                  </div>
                </div>
              </div>

              {/* In-Between Frames Count (Steps) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-300 text-xs">Number of In-Between Frames</span>
                  <span className="font-mono text-purple-400 font-bold bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                    {steps} {steps === 1 ? 'frame' : 'frames'}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="1"
                    max="8"
                    step="1"
                    value={steps}
                    onChange={e => {
                      const val = Number(e.target.value);
                      setSteps(val);
                      setPreviewStep(0);
                    }}
                    className="flex-1 accent-purple-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                  />
                  {/* Quick Preset Pills */}
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 5].map(st => (
                      <button
                        key={st}
                        onClick={() => {
                          setSteps(st);
                          setPreviewStep(0);
                        }}
                        className={`w-6 h-6 rounded-lg text-[10px] font-mono font-bold transition-all ${
                          steps === st
                            ? 'bg-purple-500 text-white shadow-sm'
                            : 'bg-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Morph Algorithm Style */}
              <div className="space-y-1.5">
                <span className="font-semibold text-slate-300 text-xs block">Interpolation Algorithm</span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setStyle('blend')}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      style === 'blend'
                        ? 'bg-purple-500/15 border-purple-500/50 text-white shadow-sm'
                        : 'bg-slate-800/50 border-slate-700/60 text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <div className="font-bold text-xs flex items-center justify-between mb-0.5">
                      <span>Smooth Blend</span>
                      {style === 'blend' && <Sparkles className="w-3.5 h-3.5 text-purple-400" />}
                    </div>
                    <p className="text-[10px] text-slate-400 leading-tight">
                      Linear color cross-fade with 50% opacity threshold for appearing pixels.
                    </p>
                  </button>

                  <button
                    onClick={() => setStyle('dither')}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      style === 'dither'
                        ? 'bg-purple-500/15 border-purple-500/50 text-white shadow-sm'
                        : 'bg-slate-800/50 border-slate-700/60 text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <div className="font-bold text-xs flex items-center justify-between mb-0.5">
                      <span>Dither Dissolve</span>
                      {style === 'dither' && <Sparkles className="w-3.5 h-3.5 text-purple-400" />}
                    </div>
                    <p className="text-[10px] text-slate-400 leading-tight">
                      Retro 4×4 Bayer ordered matrix dissolution for authentic pixel art tweening.
                    </p>
                  </button>
                </div>
              </div>

              {/* Insertion Placement */}
              <div className="space-y-1.5">
                <span className="font-semibold text-slate-300 text-xs block">Insert Location</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setInsertPosition('between')}
                    className={`flex-1 py-1.5 px-2.5 rounded-xl border text-xs font-medium transition-all ${
                      insertPosition === 'between'
                        ? 'bg-sky-500/15 border-sky-500/50 text-sky-300 font-bold'
                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                    }`}
                  >
                    Between Keyframes (after Frame {frameAIndex + 1})
                  </button>

                  <button
                    onClick={() => setInsertPosition('end')}
                    className={`flex-1 py-1.5 px-2.5 rounded-xl border text-xs font-medium transition-all ${
                      insertPosition === 'end'
                        ? 'bg-sky-500/15 border-sky-500/50 text-sky-300 font-bold'
                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                    }`}
                  >
                    Append to Animation End
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-800 bg-slate-950/80">
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 text-xs font-medium transition-colors"
          >
            Cancel
          </button>

          {frames.length >= 2 && (
            <button
              onClick={handleGenerate}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-sky-600 hover:from-purple-500 hover:to-sky-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-purple-950/50 transition-all active:scale-95"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Generate & Add {steps} {steps === 1 ? 'Frame' : 'Frames'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
