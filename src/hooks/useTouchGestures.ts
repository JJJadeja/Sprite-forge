import { useEffect, useRef } from 'react';

interface TouchGestureHandlers {
  onGestureStart?: () => void;
  onPinchZoom?: (scaleDelta: number, centerX: number, centerY: number) => void;
  onTwoFingerPan?: (deltaX: number, deltaY: number) => void;
  onTwoFingerTap?: () => void; // Undo
  onThreeFingerTap?: () => void; // Redo
}

export function useTouchGestures(
  targetRef: React.RefObject<HTMLElement | null>,
  handlers: TouchGestureHandlers,
  enabled: boolean = true
) {
  const touchState = useRef({
    initialDistance: 0,
    initialCenter: { x: 0, y: 0 },
    lastCenter: { x: 0, y: 0 },
    touchStartTime: 0,
    touchCount: 0,
    hasMoved: false
  });

  useEffect(() => {
    const el = targetRef.current;
    if (!el || !enabled) return;

    const getDistance = (t1: Touch, t2: Touch) => {
      const dx = t1.clientX - t2.clientX;
      const dy = t1.clientY - t2.clientY;
      return Math.sqrt(dx * dx + dy * dy);
    };

    const getCenter = (t1: Touch, t2: Touch) => {
      return {
        x: (t1.clientX + t2.clientX) / 2,
        y: (t1.clientY + t2.clientY) / 2
      };
    };

    const handleTouchStart = (e: TouchEvent) => {
      touchState.current.touchCount = e.touches.length;
      touchState.current.touchStartTime = Date.now();
      touchState.current.hasMoved = false;

      // When 2 or more fingers are touched, cancel drawing and activate gestures
      if (e.touches.length >= 2) {
        e.preventDefault();
        handlers.onGestureStart?.();
      }

      // Two finger pinch/pan setup
      if (e.touches.length === 2) {
        touchState.current.initialDistance = getDistance(e.touches[0], e.touches[1]);
        const center = getCenter(e.touches[0], e.touches[1]);
        touchState.current.initialCenter = center;
        touchState.current.lastCenter = center;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        touchState.current.hasMoved = true;
        const dist = getDistance(e.touches[0], e.touches[1]);
        const center = getCenter(e.touches[0], e.touches[1]);

        if (touchState.current.initialDistance > 0 && handlers.onPinchZoom) {
          const ratio = dist / touchState.current.initialDistance;
          handlers.onPinchZoom(ratio, center.x, center.y);
          touchState.current.initialDistance = dist;
        }

        if (handlers.onTwoFingerPan) {
          const dx = center.x - touchState.current.lastCenter.x;
          const dy = center.y - touchState.current.lastCenter.y;
          handlers.onTwoFingerPan(dx, dy);
        }

        touchState.current.lastCenter = center;
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      const elapsed = Date.now() - touchState.current.touchStartTime;

      // Multi-finger tap detection (under 300ms, minimal movement)
      if (elapsed < 300 && !touchState.current.hasMoved) {
        if (touchState.current.touchCount === 2 && handlers.onTwoFingerTap) {
          e.preventDefault();
          if (navigator.vibrate) navigator.vibrate(25);
          handlers.onTwoFingerTap();
        } else if (touchState.current.touchCount === 3 && handlers.onThreeFingerTap) {
          e.preventDefault();
          if (navigator.vibrate) navigator.vibrate(35);
          handlers.onThreeFingerTap();
        }
      }

      touchState.current.touchCount = e.touches.length;
      touchState.current.initialDistance = 0;
    };

    el.addEventListener('touchstart', handleTouchStart, { passive: false });
    el.addEventListener('touchmove', handleTouchMove, { passive: false });
    el.addEventListener('touchend', handleTouchEnd);
    el.addEventListener('touchcancel', handleTouchEnd);

    return () => {
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchmove', handleTouchMove);
      el.removeEventListener('touchend', handleTouchEnd);
      el.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [handlers, enabled, targetRef]);
}
