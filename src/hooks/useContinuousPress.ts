import { useRef, useCallback, useEffect } from 'react';

interface ContinuousPressOptions {
  onAction: () => void;
  initialDelayMs?: number;
  intervalMs?: number;
}

/**
 * Hook to handle both instantaneous single-tap action and smooth continuous
 * repeating action when a touch or mouse button is held down.
 */
export function useContinuousPress({
  onAction,
  initialDelayMs = 240,
  intervalMs = 45
}: ContinuousPressOptions) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isPressingRef = useRef<boolean>(false);
  const actionRef = useRef(onAction);

  useEffect(() => {
    actionRef.current = onAction;
  }, [onAction]);

  const stop = useCallback(() => {
    isPressingRef.current = false;
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const start = useCallback((e?: React.PointerEvent | React.TouchEvent | React.MouseEvent) => {
    if (e) {
      e.preventDefault();
    }
    stop();
    isPressingRef.current = true;

    // Trigger immediate single action for crisp responsiveness
    actionRef.current();

    // Start repeating after the initial delay threshold
    timeoutRef.current = setTimeout(() => {
      if (!isPressingRef.current) return;
      intervalRef.current = setInterval(() => {
        if (!isPressingRef.current) {
          stop();
          return;
        }
        actionRef.current();
      }, intervalMs);
    }, initialDelayMs);
  }, [initialDelayMs, intervalMs, stop]);

  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  return {
    onPointerDown: start,
    onPointerUp: stop,
    onPointerLeave: stop,
    onPointerCancel: stop,
    stop
  };
}
