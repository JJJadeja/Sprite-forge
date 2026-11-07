import React from 'react';

interface LockTransparencyIconProps {
  className?: string;
  locked?: boolean;
}

/**
 * Classic digital art checkerboard transparency grid with padlock icon,
 * universally recognized across Photoshop, Aseprite, Krita, and Procreate.
 */
export const LockTransparencyIcon: React.FC<LockTransparencyIconProps> = ({ 
  className = 'w-3.5 h-3.5', 
  locked = false 
}) => {
  return (
    <svg 
      viewBox="0 0 16 16" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg" 
      className={className}
      aria-hidden="true"
    >
      {/* 2x2 Checkerboard pattern for transparency representation */}
      <rect x="2" y="2" width="6" height="6" fill="currentColor" fillOpacity={locked ? "0.9" : "0.5"} />
      <rect x="8" y="2" width="6" height="6" fill="currentColor" fillOpacity={locked ? "0.3" : "0.15"} />
      <rect x="2" y="8" width="6" height="6" fill="currentColor" fillOpacity={locked ? "0.3" : "0.15"} />
      <rect x="8" y="8" width="6" height="6" fill="currentColor" fillOpacity={locked ? "0.9" : "0.5"} />

      {/* Padlock Shackle */}
      <path 
        d="M6.5 7V5.5C6.5 4.67 7.17 4 8 4C8.83 4 9.5 4.67 9.5 5.5V7" 
        stroke="currentColor" 
        strokeWidth="1.2" 
        strokeLinecap="round" 
      />

      {/* Padlock Body */}
      <rect 
        x="5" 
        y="7" 
        width="6" 
        height="5" 
        rx="1" 
        fill="#0f172a" 
        stroke="currentColor" 
        strokeWidth="1.2" 
      />

      {/* Keyhole dot */}
      <circle cx="8" cy="9.5" r="0.75" fill="currentColor" />
    </svg>
  );
};
