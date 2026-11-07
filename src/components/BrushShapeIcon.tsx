import React from 'react';
import { BrushShape } from '../types/sprite';
import { Square, Circle, Diamond, Plus, X, Minus, Star, Heart, Paintbrush } from 'lucide-react';

interface BrushShapeIconProps {
  shape: BrushShape;
  className?: string;
}

export const BrushShapeIcon: React.FC<BrushShapeIconProps> = ({ shape, className = 'w-3.5 h-3.5' }) => {
  switch (shape) {
    case 'square':
      return <Square className={className} />;
    case 'circle':
      return <Circle className={className} />;
    case 'diamond':
      return <Diamond className={className} />;
    case 'cross':
      return <Plus className={className} />;
    case 'x':
      return <X className={className} />;
    case 'slash':
      return (
        <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square">
          <line x1="13" y1="3" x2="3" y2="13" />
        </svg>
      );
    case 'backslash':
      return (
        <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square">
          <line x1="3" y1="3" x2="13" y2="13" />
        </svg>
      );
    case 'horizontal':
      return <Minus className={className} />;
    case 'vertical':
      return (
        <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square">
          <line x1="8" y1="2" x2="8" y2="14" />
        </svg>
      );
    case 'star':
      return <Star className={className} />;
    case 'heart':
      return <Heart className={className} />;
    case 'custom':
      return <Paintbrush className={className} />;
    default:
      return <Square className={className} />;
  }
};
