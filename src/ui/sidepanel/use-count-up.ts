import { useEffect, useRef, useState } from 'react';

export function useCountUp(target: number): number {
  const [displayed, setDisplayed] = useState(target);
  const displayedRef = useRef(target);

  useEffect(() => {
    const from = displayedRef.current;
    const start = performance.now();
    let frame = 0;
    const step = (now: number): void => {
      const t = Math.min(1, (now - start) / 350);
      const value = from + (target - from) * (1 - Math.pow(1 - t, 3));
      displayedRef.current = value;
      setDisplayed(value);
      if (t < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [target]);

  return displayed;
}
