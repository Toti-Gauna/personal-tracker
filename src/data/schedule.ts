import { BLOCKS, ROUTINES } from './defaults';
import type { Block, BlockTemplate, RoutineId } from './types';
import { toHHMM, toMin } from './time';

export interface PlannedBlock {
  tpl: BlockTemplate;
  start: string;
  min: number;
}

const chained = (blocks: BlockTemplate[]) => blocks.filter((b) => !b.fixed);
const firstFixed = (blocks: BlockTemplate[]) => blocks.find((b) => b.fixed)!;

/** Rango para "Otra hora": tiene que entrar el mínimo de cada bloque encadenado antes del primero fijo. */
export function wakeRange(blocks = BLOCKS) {
  const minSum = chained(blocks).reduce((s, b) => s + (b.minMin ?? b.min), 0);
  return { min: toMin('03:00'), max: toMin(firstFixed(blocks).fixed!) - minSum };
}

/**
 * Acorta los bloques flexibles para que entren entre `wake` y el primer bloque fijo.
 * Parte del día completo; el recorte se reparte según lo que cada bloque puede ceder.
 * Redondea a 5 min y la suma da exacto.
 */
export function fitChained(wake: number, blocks = BLOCKS, base = ROUTINES[0].durations): Record<string, number> {
  const list = chained(blocks);
  const avail = toMin(firstFixed(blocks).fixed!) - wake;
  const dur: Record<string, number> = {};
  for (const b of list) dur[b.key] = base[b.key] ?? b.min;
  const total = list.reduce((s, b) => s + dur[b.key], 0);
  if (avail >= total) return dur;

  const slack = (b: BlockTemplate) => Math.max(0, dur[b.key] - (b.minMin ?? dur[b.key]));
  const totalSlack = list.reduce((s, b) => s + slack(b), 0);
  const deficit = Math.min(total - avail, totalSlack);
  let removed = 0;
  for (const b of list) {
    const cut = Math.round(((deficit * slack(b)) / (totalSlack || 1)) / 5) * 5;
    dur[b.key] -= cut;
    removed += cut;
  }
  // Ajuste del redondeo sobre el bloque que más puede ceder.
  let diff = deficit - removed;
  const order = [...list].sort((a, b) => dur[b.key] - (b.minMin ?? 0) - (dur[a.key] - (a.minMin ?? 0)));
  for (const b of order) {
    if (!diff) break;
    const room = diff > 0 ? dur[b.key] - (b.minMin ?? dur[b.key]) : Infinity;
    const d = diff > 0 ? Math.min(diff, room) : diff;
    dur[b.key] -= d;
    diff -= d;
  }
  return dur;
}

/** Arma el día: bloques encadenados desde que te levantás y los fijos en su hora. */
export function planDay(routine: RoutineId, wakeHHMM: string, blocks = BLOCKS): PlannedBlock[] {
  const wake = toMin(wakeHHMM);
  const preset = ROUTINES.find((r) => r.id === routine);
  const dur = preset ? preset.durations : fitChained(wake, blocks);
  let t = wake;
  return blocks.map((tpl) => {
    if (tpl.fixed) return { tpl, start: tpl.fixed, min: tpl.min };
    const start = toHHMM(t);
    const min = dur[tpl.key] ?? tpl.min;
    t += min;
    return { tpl, start, min };
  });
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
