import { useRef, useCallback } from "react";

export function useLongPress(onLongPress: () => void, delay = 500) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const start = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    // Only trigger on direct touch/click, not bubbled events from child buttons
    timer.current = setTimeout(() => {
      onLongPress();
    }, delay);
  }, [onLongPress, delay]);

  const cancel = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);

  return {
    onMouseDown: start,
    onMouseUp: cancel,
    onMouseLeave: cancel,
    onTouchStart: start,
    onTouchEnd: cancel,
    onTouchCancel: cancel,
  };
}
