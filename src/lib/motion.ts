export const reducedMotion = () =>
  typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** Duraciones: movimiento normal vs. fundido de 150 ms con movimiento reducido. */
export const DUR = { flip: 0.28, fade: 0.15 };
