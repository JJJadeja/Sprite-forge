import React, { useEffect, useRef, useState } from 'react';
import { Frame } from '../types/sprite';
import { renderFrameToCanvas } from '../utils/exporters';
import { 
  Play, 
  Pause, 
  Minimize2, 
  Maximize2, 
  Grid3X3, 
  Gamepad2, 
  Film,
  ZoomIn
} from 'lucide-react';

interface PreviewPanelProps {
  frames: Frame[];
  width: number;
  height: number;
  currentFrameIndex: number;
}

export const PreviewPanel: React.FC<PreviewPanelProps> = ({
  frames,
  width,
  height,
  currentFrameIndex
}) => {
  const [activeTab, setActiveTab] = useState<'anim' | 'tile' | 'mockup'>('anim');
  const [scale, setScale] = useState<number>(3);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [fps, setFps] = useState<number>(8);
  const [collapsed, setCollapsed] = useState<boolean>(() => typeof window !== 'undefined' ? window.innerWidth < 1024 : true);

  const [animIndex, setAnimIndex] = useState<number>(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tileCanvasRef = useRef<HTMLCanvasElement>(null);
  const mockupCanvasRef = useRef<HTMLCanvasElement>(null);

  // Animation loop
  useEffect(() => {
    if (!isPlaying || frames.length <= 1) {
      setAnimIndex(currentFrameIndex);
      return;
    }

    const interval = Math.max(30, Math.round(1000 / fps));
    const timer = setInterval(() => {
      setAnimIndex(prev => (prev + 1) % frames.length);
    }, interval);

    return () => clearInterval(timer);
  }, [isPlaying, fps, frames.length, currentFrameIndex]);

  // Render animated preview
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const targetFrame = frames[animIndex] || frames[0];
    if (!targetFrame) return;

    const rendered = renderFrameToCanvas(targetFrame, width, height, scale, null);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(rendered, 0, 0);
  }, [frames, animIndex, width, height, scale]);

  // Render 3x3 Tile Preview
  useEffect(() => {
    const canvas = tileCanvasRef.current;
    if (!canvas || activeTab !== 'tile') return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const targetFrame = frames[currentFrameIndex] || frames[0];
    if (!targetFrame) return;

    const singleTile = renderFrameToCanvas(targetFrame, width, height, 1, null);
    const tileW = width * 2;
    const tileH = height * 2;

    ctx.imageSmoothingEnabled = false;
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        ctx.drawImage(singleTile, c * tileW, r * tileH, tileW, tileH);
      }
    }
  }, [frames, currentFrameIndex, width, height, activeTab]);

  // Render Game Mockup (Sprite in a mini platformer scene)
  useEffect(() => {
    const canvas = mockupCanvasRef.current;
    if (!canvas || activeTab !== 'mockup') return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Sky gradient
    const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    grad.addColorStop(0, '#0f172a');
    grad.addColorStop(1, '#1e293b');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Distant retro moon / sun
    ctx.fillStyle = 'rgba(254, 240, 138, 0.4)';
    ctx.beginPath();
    ctx.arc(canvas.width - 30, 25, 12, 0, Math.PI * 2);
    ctx.fill();

    // Ground platform
    ctx.fillStyle = '#334155';
    ctx.fillRect(0, canvas.height - 24, canvas.width, 24);
    ctx.fillStyle = '#10b981'; // Grass trim
    ctx.fillRect(0, canvas.height - 24, canvas.width, 4);

    // Mini floating block
    ctx.fillStyle = '#475569';
    ctx.fillRect(20, 45, 40, 8);
    ctx.fillStyle = '#10b981';
    ctx.fillRect(20, 45, 40, 2);

    // Draw active animated sprite onto the ground platform
    const targetFrame = frames[animIndex] || frames[0];
    if (targetFrame) {
      const spriteScale = 2;
      const sprite = renderFrameToCanvas(targetFrame, width, height, spriteScale, null);
      ctx.imageSmoothingEnabled = false;
      const posX = Math.floor((canvas.width - width * spriteScale) / 2);
      const posY = canvas.height - 24 - height * spriteScale;
      ctx.drawImage(sprite, posX, posY);
    }
  }, [frames, animIndex, width, height, activeTab]);

  if (collapsed) {
    return (
      <div className="absolute top-14 right-4 z-20">
        <button
          onClick={() => setCollapsed(false)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 rounded-xl text-xs font-medium text-slate-300 shadow-xl backdrop-blur-md"
        >
          <Play className="w-3.5 h-3.5 text-sky-400" />
          <span>Show Preview</span>
        </button>
      </div>
    );
  }

  return (
    <div className="absolute top-14 right-4 z-20 bg-slate-900/95 border border-slate-800 rounded-2xl p-2.5 shadow-2xl backdrop-blur-md w-60 select-none text-xs">
      {/* Header Tabs */}
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
        <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded-lg border border-slate-800/80">
          <button
            onClick={() => setActiveTab('anim')}
            title="Animation Preview"
            className={`px-2 py-1 rounded-md transition-colors ${
              activeTab === 'anim' ? 'bg-sky-500 text-white font-semibold' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Film className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setActiveTab('tile')}
            title="Seamless 3x3 Tile Repeat Check"
            className={`px-2 py-1 rounded-md transition-colors ${
              activeTab === 'tile' ? 'bg-sky-500 text-white font-semibold' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Grid3X3 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setActiveTab('mockup')}
            title="Game Engine Scene Mockup"
            className={`px-2 py-1 rounded-md transition-colors ${
              activeTab === 'mockup' ? 'bg-sky-500 text-white font-semibold' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Gamepad2 className="w-3.5 h-3.5" />
          </button>
        </div>

        <button
          onClick={() => setCollapsed(true)}
          className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800"
          title="Minimize Preview"
        >
          <Minimize2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Main Preview Screen */}
      <div className="flex items-center justify-center checker-bg rounded-xl p-2 min-h-[140px] border border-slate-800/80 overflow-hidden">
        {activeTab === 'anim' && (
          <canvas
            ref={canvasRef}
            width={width * scale}
            height={height * scale}
            className="pixel-canvas rounded shadow-sm"
          />
        )}

        {activeTab === 'tile' && (
          <canvas
            ref={tileCanvasRef}
            width={width * 6}
            height={height * 6}
            className="pixel-canvas rounded"
          />
        )}

        {activeTab === 'mockup' && (
          <canvas
            ref={mockupCanvasRef}
            width={180}
            height={120}
            className="pixel-canvas rounded"
          />
        )}
      </div>

      {/* Footer Controls */}
      <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-400">
        {activeTab === 'anim' ? (
          <>
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="flex items-center gap-1 text-slate-300 hover:text-white"
            >
              {isPlaying ? <Pause className="w-3 h-3 text-amber-400" /> : <Play className="w-3 h-3 text-sky-400" />}
              <span>{isPlaying ? 'Pause' : 'Play'}</span>
            </button>

            {/* Scale toggle */}
            <div className="flex items-center gap-1">
              {[2, 3, 4].map(s => (
                <button
                  key={s}
                  onClick={() => setScale(s)}
                  className={`px-1.5 py-0.5 rounded font-mono ${
                    scale === s ? 'bg-sky-500 text-white font-bold' : 'hover:bg-slate-800 text-slate-400'
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>
          </>
        ) : activeTab === 'tile' ? (
          <span className="font-mono text-[10px] text-slate-400">3×3 Seamless Tiling</span>
        ) : (
          <span className="font-mono text-[10px] text-slate-400">Retro Platformer Mockup</span>
        )}
      </div>
    </div>
  );
};
