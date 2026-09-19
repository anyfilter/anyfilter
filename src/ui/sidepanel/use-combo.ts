import { useEffect, useRef, useState } from 'react';

const COMBO_WINDOW_MS = 1500;

export interface Combo {
  count: number;
  hit: number;
}

export function useCombo(value: number): Combo {
  const previous = useRef(value);
  const lastHitAt = useRef(0);
  const [combo, setCombo] = useState<Combo>({ count: 0, hit: 0 });

  useEffect(() => {
    const increment = value - previous.current;
    previous.current = value;
    if (increment <= 0) return;
    const now = Date.now();
    const chained = now - lastHitAt.current < COMBO_WINDOW_MS;
    lastHitAt.current = now;
    setCombo((current) => ({
      count: chained ? current.count + increment : increment,
      hit: current.hit + 1,
    }));
    const timer = setTimeout(() => setCombo({ count: 0, hit: 0 }), COMBO_WINDOW_MS);
    return () => clearTimeout(timer);
  }, [value]);

  return combo;
}
