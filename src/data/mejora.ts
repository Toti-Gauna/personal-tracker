import type { Block, DayLog } from './types';

/** Una meta cuenta como cumplida cuando todas sus tareas están hechas. */
export const blockDone = (b: Block) => b.tasks.length > 0 && b.tasks.every((t) => t.done);

/** Mejora del día en %: hasta 1 %, repartido en partes iguales entre las metas. */
export function mejoraDia(day: Pick<DayLog, 'blocks'>): number {
  if (!day.blocks.length) return 0;
  return day.blocks.filter(blockDone).length / day.blocks.length;
}

export const valorMeta = (day: Pick<DayLog, 'blocks'>) => (day.blocks.length ? 1 / day.blocks.length : 0);

/** Acumulado compuesto: (1 + m1/100)(1 + m2/100)… − 1, en %. */
export function acumulado(dias: number[]): number {
  return (dias.reduce((p, m) => p * (1 + m / 100), 1) - 1) * 100;
}

export const round = (n: number, d = 3) => Math.round(n * 10 ** d) / 10 ** d;

/** "0,25" con coma decimal. */
export const fmtPct = (n: number, d = 2) => n.toFixed(d).replace('.', ',');
