import React, { useEffect, useRef, useState } from 'react';
import { Frame } from '../types/sprite';
import { renderFrameToCanvas } from '../utils/exporters';
import { 
  Play, 
  Pause, 
  Plus, 
  Copy, 
  Trash2, 
  Clock, 
  Film,
  SkipBack,
  SkipForward
} from 'lucide-react';

interface TimelineProps {
  frames: Frame[];
  currentFrameIndex: number;
  width: number;
  height: number;
  onSelectFrame: (index: number) => void;
  onAddFrame: () => void;
  onDuplicateFrame: (index: number) => void;
  onDeleteFrame: (index: number) => void;
  onUpdateFrameDuration: (index: number, durationMs: number) => void;
}

export const Timeline: React.FC<TimelineProps> = ({
  frames,
  currentFrameIndex,
  width,
  height,
  onSelectFrame,
  onAddFrame,
  onDuplicateFrame,
  onDeleteFrame,
  onUpdateFrameDuration
}) => {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [fps, setFps] = useState<number>(8);
  const playTimer = useRef<number | null>(null);

  // Animation playback loop
  useEffect(() => {
    if (isPlaying && frames.length > 1) {
      const interval = Math.max(30, Math.round(1000 / fps));
      playTimer.current = window.setInterval(() => {
        onSelectFrame((currentFrameIndex + 1) % frames.length);
      }, interval);
    } else {
      if (playTimer.current) {
        clearInterval(playTimer.current);
        playTimer.current = null;
      }
    }

    return () => {
      if (playTimer.current) {
        clearInterval(playTimer.current);
        playTimer.current = null;
      }
    };
  }, [isPlaying, fps, frames.length, currentFrameIndex, onSelectFrame]);

  return (
    <div className="h-20 border-t border-slate-800 bg-slate-900/95 px-3 flex items-center gap-3 select-none text-xs backdrop-blur-md">
      {/* Playback Controls */}
      <div className="flex items-center gap-1.5 pr-3 border-r border-slate-800">
        <button
          onClick={() => onSelectFrame((currentFrameIndex - 1 + frames.length) % frames.length)}
          title="Previous Frame"
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <SkipBack className="w-4 h-4" />
        </button>

        <button
          onClick={() => setIsPlaying(!isPlaying)}
          title={isPlaying ? 'Pause Animation' : 'Play Animation'}
          className={`p-2 rounded-xl font-bold transition-all ${
            isPlaying
              ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/25'
              : 'bg-sky-500 text-white hover:bg-sky-400 shadow-lg shadow-sky-500/25'
          }`}
        >
          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        </button>

        <button
          onClick={() => onSelectFrame((currentFrameIndex + 1) % frames.length)}
          title="Next Frame"
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <SkipForward className="w-4 h-4" />
        </button>

        {/* FPS Control */}
        <div className="flex items-center gap-1.5 ml-2">
          <span className="text-[11px] font-mono text-slate-400">{fps} FPS</span>
          <input
            type="range"
            min="1"
            max="24"
            value={fps}
            onChange={e => setFps(parseInt(e.target.value))}
            className="w-16 accent-sky-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
          />
        </div>
      </div>

      {/* Frame Thumbnails Strip */}
      <div className="flex-1 flex items-center gap-2 overflow-x-auto py-1">
        {frames.map((frame, index) => {
          const isSelected = index === currentFrameIndex;

          return (
            <div
              key={frame.id}
              onClick={() => onSelectFrame(index)}
              className={`relative flex flex-col items-center p-1 rounded-xl border transition-all cursor-pointer group flex-shrink-0 ${
                isSelected
                  ? 'bg-sky-500/20 border-sky-400 shadow-md ring-1 ring-sky-400/50'
                  : 'bg-slate-800/40 border-slate-700/60 hover:bg-slate-800 hover:border-slate-600'
              }`}
            >
              {/* Frame Canvas Thumbnail */}
              <FrameThumbnail frame={frame} width={width} height={height} />

              {/* Frame Label */}
              <div className="flex items-center justify-between w-full px-1 mt-1 text-[10px] text-slate-400 font-mono">
                <span>#{index + 1}</span>
                <span className="text-slate-500">{frame.name.slice(0, 6)}</span>
              </div>
            </div>
          );
        })}

        {/* Add Frame Button */}
        <button
          onClick={onAddFrame}
          title="Add New Empty Frame"
          className="flex flex-col items-center justify-center w-12 h-14 rounded-xl border border-dashed border-slate-700 hover:border-sky-400 hover:bg-sky-500/10 text-slate-400 hover:text-sky-300 transition-all flex-shrink-0"
        >
          <Plus className="w-4 h-4 mb-0.5" />
          <span className="text-[9px] font-medium">Add</span>
        </button>
      </div>

      {/* Frame Actions (Duplicate & Delete) */}
      <div className="flex items-center gap-1.5 pl-3 border-l border-slate-800">
        <button
          onClick={() => onDuplicateFrame(currentFrameIndex)}
          title="Duplicate Current Frame"
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 text-[11px] font-medium transition-colors"
        >
          <Copy className="w-3.5 h-3.5" />
          <span>Duplicate</span>
        </button>

        <button
          onClick={() => onDeleteFrame(currentFrameIndex)}
          disabled={frames.length <= 1}
          title="Delete Current Frame"
          className="p-1.5 rounded-lg text-rose-400 hover:text-rose-300 bg-rose-950/40 hover:bg-rose-950/80 disabled:opacity-30 disabled:pointer-events-none transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

// Sub-component for rendering pixel-crisp thumbnail
const FrameThumbnail: React.FC<{ frame: Frame; width: number; height: number }> = ({
  frame,
  width,
  height
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const rendered = renderFrameToCanvas(frame, width, height, 1, null);
    ctx.drawImage(rendered, 0, 0, canvas.width, canvas.height);
  }, [frame, width, height]);

  return (
    <div className="w-10 h-10 rounded-lg overflow-hidden checker-bg border border-slate-700/50">
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="w-full h-full pixel-canvas"
      />
    </div>
  );
};
