import React, { useState, useRef, useEffect } from 'react';
import { Minus, Plus, RotateCcw, Sparkles } from 'lucide-react';

interface LayerOpacitySliderProps {
  opacity: number; // 0 to 1
  disabled?: boolean;
  layerName?: string;
  onChange: (newOpacity: number) => void;
}

const OPACITY_PRESETS = [
  { label: '20%', sub: 'Trace', value: 0.2 },
  { label: '40%', sub: 'Ghost', value: 0.4 },
  { label: '50%', sub: 'Half', value: 0.5 },
  { label: '75%', sub: 'Soft', value: 0.75 },
  { label: '100%', sub: 'Solid', value: 1.0 }
];

export const LayerOpacitySlider: React.FC<LayerOpacitySliderProps> = ({
  opacity,
  disabled = false,
  layerName,
  onChange
}) => {
  const percent = Math.round(opacity * 100);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [inputValue, setInputValue] = useState<string>(String(percent));

  useEffect(() => {
    if (!isEditing) {
      setInputValue(String(percent));
    }
  }, [percent, isEditing]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleInputBlur = () => {
    setIsEditing(false);
    const parsed = parseInt(inputValue, 10);
    if (!isNaN(parsed)) {
      const clamped = Math.max(0, Math.min(100, parsed));
      onChange(clamped / 100);
    } else {
      setInputValue(String(percent));
    }
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleInputBlur();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setInputValue(String(percent));
    }
  };

  const handleNudge = (deltaPercent: number) => {
    if (disabled) return;
    const newPercent = Math.max(0, Math.min(100, percent + deltaPercent));
    onChange(newPercent / 100);
  };

  return (
    <div className="space-y-2 select-none">
      {/* Header with Title, Live Swatch, Editable Numeric Percent, and Reset */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 font-medium text-slate-300">
          {/* Live Checkerboard Opacity Swatch Preview */}
          <div
            className="w-4 h-4 rounded checker-bg relative overflow-hidden border border-slate-700/80 shrink-0 shadow-xs"
            title={`Preview of current layer opacity (${percent}%)`}
          >
            <div
              className="w-full h-full bg-sky-400"
              style={{ opacity }}
            />
          </div>

          <div className="flex items-center gap-1.5">
            <span className={disabled ? 'text-slate-500' : 'text-slate-200'}>
              {layerName ? layerName : 'Layer Opacity'}
            </span>
            {percent < 100 && (
              <span className="text-[9px] font-mono font-bold bg-sky-500/20 text-sky-300 px-1 py-0.2 rounded border border-sky-500/30">
                Overlay
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Direct Numerical Input or Badge */}
          {isEditing && !disabled ? (
            <div className="flex items-center bg-slate-900 border border-sky-500 rounded-md px-1.5 py-0.5">
              <input
                type="number"
                min="0"
                max="100"
                value={inputValue}
                autoFocus
                onChange={handleInputChange}
                onBlur={handleInputBlur}
                onKeyDown={handleInputKeyDown}
                className="w-8 text-right bg-transparent text-sky-300 font-mono text-[11px] font-bold outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <span className="text-slate-400 font-mono text-[10px] ml-0.5">%</span>
            </div>
          ) : (
            <button
              onClick={() => {
                if (!disabled) setIsEditing(true);
              }}
              disabled={disabled}
              title="Click to type exact percentage"
              className={`font-mono text-[11px] font-bold px-2 py-0.5 rounded-md border transition-all ${
                disabled
                  ? 'bg-slate-900 text-slate-600 border-slate-800 cursor-not-allowed'
                  : 'bg-slate-800/80 hover:bg-slate-800 text-sky-400 hover:text-sky-300 border-slate-700 hover:border-sky-500/50 cursor-pointer active:scale-95'
              }`}
            >
              {percent}%
            </button>
          )}

          {/* Quick Reset to 100% button if not already 100% */}
          {percent !== 100 && !disabled && (
            <button
              onClick={() => onChange(1.0)}
              title="Reset opacity to 100%"
              className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Interactive Slider Track with Checkered Alpha Background */}
      <div className="flex items-center gap-2">
        {/* Step Down (-5%) */}
        <button
          onClick={() => handleNudge(-5)}
          disabled={disabled || percent <= 0}
          title="Decrease Opacity by 5%"
          className="p-1.5 rounded-lg text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700 border border-slate-700/60 disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95 shrink-0"
        >
          <Minus className="w-3 h-3" />
        </button>

        {/* Custom Track Slider */}
        <div className="relative flex-1 flex items-center h-6">
          {/* Subtle checkered preview under the track */}
          <div
            className="absolute inset-x-0 h-2 rounded-full overflow-hidden checker-bg opacity-40 pointer-events-none"
          />

          {/* Native range slider styled with Tailwind */}
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={opacity}
            disabled={disabled}
            onChange={e => onChange(parseFloat(e.target.value))}
            className="relative z-10 w-full h-2 bg-slate-800/80 accent-sky-400 rounded-full cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus:ring-1 focus:ring-sky-500/50"
            style={{
              background: `linear-gradient(to right, rgba(56, 189, 248, 0.2) 0%, rgba(56, 189, 248, 1) ${percent}%, rgba(30, 41, 59, 0.8) ${percent}%, rgba(30, 41, 59, 0.8) 100%)`
            }}
          />
        </div>

        {/* Step Up (+5%) */}
        <button
          onClick={() => handleNudge(5)}
          disabled={disabled || percent >= 100}
          title="Increase Opacity by 5%"
          className="p-1.5 rounded-lg text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700 border border-slate-700/60 disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95 shrink-0"
        >
          <Plus className="w-3 h-3" />
        </button>
      </div>

      {/* Quick Opacity Overlay Preset Chips */}
      <div className="grid grid-cols-5 gap-1 pt-0.5">
        {OPACITY_PRESETS.map(preset => {
          const isCurrent = Math.abs(opacity - preset.value) < 0.02;
          return (
            <button
              key={preset.label}
              onClick={() => onChange(preset.value)}
              disabled={disabled}
              className={`py-1 px-0.5 rounded-lg text-center flex flex-col items-center justify-center transition-all ${
                disabled
                  ? 'bg-slate-900 text-slate-600 border border-slate-800 cursor-not-allowed'
                  : isCurrent
                  ? 'bg-sky-500 text-white shadow-xs border border-sky-400 font-extrabold'
                  : 'bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-700/50'
              }`}
            >
              <span className="font-mono text-[10px] font-bold leading-tight">{preset.label}</span>
              <span className={`text-[8px] uppercase tracking-tighter leading-none ${isCurrent ? 'text-sky-100' : 'text-slate-500'}`}>
                {preset.sub}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
