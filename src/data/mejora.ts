import type { Block, DayLog } from './types';

/**
 * Una meta cuenta como cumplida cuando todas sus tareas están hechas, o cuando la diste por hecha a
 * mano (ola 25). Una salteada nunca cuenta.
 */
export const blockDone = (b: Block) => !b.salteado && (!!b.hecho || (b.tasks.length > 0 && b.tasks.every((t) => t.done)));

/** Las metas que cuentan para la mejora: todas menos las salteadas. */
export const cuentan = (blocks: Block[]) => blocks.filter((b) => !b.salteado);

/** Mejora del día en %: hasta 1 %, repartido en partes iguales entre las metas (sin las salteadas). */
export function mejoraDia(day: Pick<DayLog, 'blocks'>): number {
  const bs = cuentan(day.blocks);
  if (!bs.length) return 0;
  return bs.filter(blockDone).length / bs.length;
}

export const valorMeta = (day: Pick<DayLog, 'blocks'>) => { const n = cuentan(day.blocks).length; return n ? 1 / n : 0; };

/** Acumulado compuesto: (1 + m1/100)(1 + m2/100)… − 1, en %. */
export function acumulado(dias: number[]): number {
  return (dias.reduce((p, m) => p * (1 + m / 100), 1) - 1) * 100;
}

export const round = (n: number, d = 3) => Math.round(n * 10 ** d) / 10 ** d;

/** "0,25" con coma decimal. */
export const fmtPct = (n: number, d = 2) => n.toFixed(d).replace('.', ',');
