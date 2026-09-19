import { useEffect, useRef, useState } from 'react';

const BUMP_MS = 1400;

export function useBump(value: number): number {
  const previous = useRef(value);
  const [delta, setDelta] = useState(0);

  useEffect(() => {
    const increment = value - previous.current;
    previous.current = value;
    if (increment <= 0) return;
    setDelta(increment);
    const timer = setTimeout(() => setDelta(0), BUMP_MS);
    return () => clearTimeout(timer);
  }, [value]);

  return delta;
}
