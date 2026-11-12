import type { Seg } from '../data/types';

/** Barra de un plan: foco lleno, descanso rayado. */
export function PlanBar({ segs, color, restColor }: { segs: Seg[]; color: string; restColor?: string }) {
  return (
    <div className="plan-barra" aria-hidden="true">
      {segs.map((s, i) => (
        <span
          key={i}
          className={s.type}
          style={{ flexGrow: s.min, ...(s.type === 'focus' ? { background: color } : restColor ? { background: restColor } : {}) }}
        />
      ))}
    </div>
  );
}
