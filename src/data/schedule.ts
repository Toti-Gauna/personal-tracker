import { dayTypeOf, isMeta, planRoutine, toTemplate, type DayType } from './routines';
import type { Block, BlockTemplate, RoutineId } from './types';
import { toMin } from './time';

export interface PlannedBlock {
  tpl: BlockTemplate;
  start: string;
  min: number;
}

/**
 * Arma las metas del día: la rutina del día de la semana (lunes a viernes o fin de semana) en
 * el modo del modal "Buen día" (04:00 completo, 05:00 corto u otra hora). Lo que no es meta
 * (despertar, comidas, descanso y sueño) no entra.
 */
export function planDay(date: string, routine: RoutineId, wake?: string, type: DayType = dayTypeOf(date)): PlannedBlock[] {
  return planRoutine(type, routine, wake)
    .filter((p) => isMeta(p.block))
    .map((p) => ({ tpl: toTemplate(p.block, p.min), start: p.start, min: p.min }));
}

let uid = 0;
export const newId = () => `${Date.now().toString(36)}${(uid++).toString(36)}`;

/** Instancia los bloques del día, con las tareas que quedaron de ayer. */
export function buildBlocks(plan: PlannedBlock[], carry: Record<string, string[]> = {}): Block[] {
  return plan.map(({ tpl, start, min }, i) => ({
    key: tpl.key,
    n: i + 1,
    title: tpl.title,
    short: tpl.short,
    area: tpl.area,
    kind: tpl.kind,
    start,
    min,
    fixed: !!tpl.fixed,
    ...(tpl.focus === false ? { focus: false } : {}),
    tasks: [...tpl.tasks, ...(carry[tpl.key] ?? [])].map((t) => ({ id: newId(), t, done: false })),
  }));
}

export const blockEnd = (b: Pick<Block, 'start' | 'min'>) => toMin(b.start) + b.min;

/** Bloque en curso a una hora dada (minutos del día). */
export function currentBlock<T extends Pick<Block, 'start' | 'min'>>(blocks: T[], now: number): T | undefined {
  return blocks.find((b) => now >= toMin(b.start) && now < blockEnd(b));
}

/** Cuánto le queda al bloque desde ahora; si no empezó o ya terminó, su duración entera. */
export function remainingMin(b: Pick<Block, 'start' | 'min'>, now: number) {
  const s = toMin(b.start);
  const e = s + b.min;
  return now >= s && now < e ? e - now : b.min;
}
