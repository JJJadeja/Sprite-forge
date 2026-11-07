import { useState, useRef, useEffect, useCallback } from 'react';

interface UseVirtualJoystickOptions {
  onMove: (deltaX: number, deltaY: number) => void;
  maxDistance?: number;
  deadzone?: number;
  speedMultiplier?: number;
  intervalMs?: number;
}

export function useVirtualJoystick({
  onMove,
  maxDistance = 44,
  deadzone = 3,
  speedMultiplier = 1,
  intervalMs = 35
}: UseVirtualJoystickOptions) {
  const [knobOffset, setKnobOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isActive, setIsActive] = useState<boolean>(false);
  const activePointerId = useRef<number | null>(null);
  const padCenterRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const currentDeltaRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const loopTimerRef = useRef<number | null>(null);

  const stopLoop = useCallback(() => {
    if (loopTimerRef.current !== null) {
      clearInterval(loopTimerRef.current);
      loopTimerRef.current = null;
    }
  }, []);

  const startLoop = useCallback(() => {
    stopLoop();
    loopTimerRef.current = window.setInterval(() => {
      const { x, y } = currentDeltaRef.current;
      const dist = Math.hypot(x, y);
      if (dist > deadzone) {
        // Linear normalized speed based on deflection
        const normalizedRate = dist / maxDistance;
        onMove(x * speedMultiplier * normalizedRate, y * speedMultiplier * normalizedRate);
      }
    }, intervalMs);
  }, [onMove, deadzone, maxDistance, speedMultiplier, intervalMs, stopLoop]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
    activePointerId.current = e.pointerId;
    setIsActive(true);

    const rect = e.currentTarget.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    padCenterRef.current = { x: centerX, y: centerY };

    const dx = e.clientX - centerX;
    const dy = e.clientY - centerY;
    const dist = Math.hypot(dx, dy);
    const clampedDist = Math.min(maxDistance, dist);
    const angle = Math.atan2(dy, dx);

    const knobX = Math.cos(angle) * clampedDist;
    const knobY = Math.sin(angle) * clampedDist;

    setKnobOffset({ x: knobX, y: knobY });
    currentDeltaRef.current = { x: knobX, y: knobY };
    startLoop();
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (activePointerId.current !== e.pointerId) return;
    e.stopPropagation();

    const { x: centerX, y: centerY } = padCenterRef.current;
    const dx = e.clientX - centerX;
    const dy = e.clientY - centerY;
    const dist = Math.hypot(dx, dy);
    const clampedDist = Math.min(maxDistance, dist);
    const angle = Math.atan2(dy, dx);

    const knobX = Math.cos(angle) * clampedDist;
    const knobY = Math.sin(angle) * clampedDist;

    setKnobOffset({ x: knobX, y: knobY });
    currentDeltaRef.current = { x: knobX, y: knobY };
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (activePointerId.current === e.pointerId) {
      e.stopPropagation();
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {}
      activePointerId.current = null;
      setIsActive(false);
      setKnobOffset({ x: 0, y: 0 });
      currentDeltaRef.current = { x: 0, y: 0 };
      stopLoop();
    }
  };

  useEffect(() => {
    return () => {
      stopLoop();
    };
  }, [stopLoop]);

  return {
    knobOffset,
    isActive,
    pointerProps: {
      onPointerDown: handlePointerDown,
      onPointerMove: handlePointerMove,
      onPointerUp: handlePointerUp,
      onPointerCancel: handlePointerUp
    }
  };
}
