import { blockDone } from '../data/mejora';
import {
  BIMS, bimOf, nextPart, partDelta, proposeWeek, progressMap, refsForDay, weekOf, weekStart,
  type RutaState, type RutaWeek, type RutaWeekGoal,
} from '../data/ruta';
import { getState, setState, updateDay } from './store';

function update(fn: (r: RutaState) => RutaState) {
  setState((s) => ({ ...s, ruta: fn(s.ruta) }));
}

const findItem = (id: string) => BIMS.flatMap((b) => b.items).find((i) => i.id === id);

/** Pone las etiquetas de ruta en las metas de un día que todavía no las tienen. */
export function ensureDayRefs(date: string) {
  const s = getState();
  const day = s.days[date];
  if (!day || day.blocks.some((b) => b.ref)) return;
  const refs = refsForDay(s.ruta, date);
  if (!Object.keys(refs).length) return;
  updateDay(date, (d) => ({ ...d, blocks: d.blocks.map((b) => (refs[b.key] && !blockDone(b) ? { ...b, ...refs[b.key] } : b)) }));
}

const srcOf = (date: string, key: string) => `block:${date}:${key}`;

/**
 * Al cumplir (o descumplir) una meta con ruta: suma (o resta) su paso al ítem. La mejora del día ya
 * la suma Hoy; la meta semanal, el carril y el ritmo se recalculan solos porque salen de este registro.
 * Devuelve lo que pasó, para avisar.
 */
export function syncBlockRuta(date: string, key: string): { item: string; delta: number; closed: boolean } | null {
  const s = getState();
  const block = s.days[date]?.blocks.find((b) => b.key === key);
  if (!block?.ref) return null;
  const src = srcOf(date, key);
  const has = s.ruta.log.some((l) => l.src === src);
  const done = blockDone(block);
  if (done && !has) {
    const item = findItem(block.ref);
    const delta = item && block.part ? partDelta(item, block.part) : 1;
    update((r) => ({ ...r, log: [...r.log, { date, item: block.ref!, delta, src }] }));
    const after = progressMap(getState().ruta.log)[block.ref] ?? 0;
    return { item: block.ref, delta, closed: !!item && after >= 1 };
  }
  if (!done && has) {
    update((r) => ({ ...r, log: r.log.filter((l) => l.src !== src) }));
    return { item: block.ref, delta: 0, closed: false };
  }
  return null;
}

/** Avance que viene del estudio (capítulo aprendido o test aprobado). Se registra una sola vez. */
export function logFromStudy(date: string, item: string, delta: number, src: string) {
  if (!findItem(item) || getState().ruta.log.some((l) => l.src === src)) return;
  update((r) => ({ ...r, log: [...r.log, { date, item, delta, src }] }));
}

/** Marca o desmarca a mano un paso de un ítem (por ejemplo, en el detalle del bimestre). */
export function toggleItemManual(date: string, id: string) {
  const item = findItem(id);
  if (!item) return;
  const r = getState().ruta;
  const p = progressMap(r.log)[id] ?? 0;
  if (p >= 1) {
    update((x) => ({ ...x, log: x.log.filter((l) => l.item !== id) }));
    return;
  }
  const part = nextPart(item, p);
  const delta = item.parts.length === 1 ? 1 - p : partDelta(item, part);
  update((x) => ({ ...x, log: [...x.log, { date, item: id, delta, src: `manual:${id}:${x.log.length}` }] }));
}

export function setCheck(key: string, on: boolean) {
  update((r) => ({ ...r, checks: { ...r.checks, [key]: on } }));
}

export function addPilot(date: string, bim: number, field: 'calls' | 'interested' | 'demo' | 'pilot', delta: number) {
  if (field === 'calls') {
    const id = `b${bim}-piloto`;
    if (delta < 0) {
      // Quita la última llamada sumada a mano (o, si no hay, la última de la semana).
      update((r) => {
        const idx = [...r.log].reverse().findIndex((l) => l.item === id);
        if (idx < 0) return r;
        const k = r.log.length - 1 - idx;
        return { ...r, log: r.log.filter((_, j) => j !== k) };
      });
    } else update((r) => ({ ...r, log: [...r.log, { date, item: id, delta, src: `manual:${id}:${r.log.length}` }] }));
    return;
  }
  update((r) => {
    const cur = r.pilot[bim] ?? { interested: 0, demo: 0, pilot: 0 };
    return { ...r, pilot: { ...r.pilot, [bim]: { ...cur, [field]: Math.max(0, cur[field] + delta) } } };
  });
}

// ——— La semana ———

const weekKey = (bim: number, week: number) => weekStart(BIMS[bim - 1], week);

/** La semana de la ruta: la guardada, o la propuesta si todavía no se guardó. */
export function weekPlan(date: string): { key: string; plan: RutaWeek; saved: boolean } {
  const s = getState();
  const b = bimOf(date);
  const week = weekOf(b, date);
  const key = weekKey(b.n, week);
  const saved = s.ruta.weeks[key];
  if (saved) return { key, plan: saved, saved: true };
  return { key, plan: proposeWeek(b, week, progressMap(s.ruta.log, addDaysSafe(key, -1))), saved: false };
}
const addDaysSafe = (d: string, n: number) => { const x = new Date(`${d}T12:00:00`); x.setDate(x.getDate() + n); return x.toISOString().slice(0, 10); };

/** Guarda la propuesta de la semana (la primera vez que se abre, o al editarla). */
export function saveWeek(key: string, plan: RutaWeek) {
  update((r) => ({ ...r, weeks: { ...r.weeks, [key]: plan } }));
}

export function editWeekGoal(date: string, id: string, patch: Partial<RutaWeekGoal> | null) {
  const { key, plan } = weekPlan(date);
  const goals = patch === null ? plan.goals.filter((g) => g.id !== id) : plan.goals.map((g) => (g.id === id ? { ...g, ...patch } : g));
  saveWeek(key, { ...plan, goals, edited: true });
}

export function addWeekGoal(date: string, title: string, target = 1) {
  const { key, plan } = weekPlan(date);
  saveWeek(key, { ...plan, edited: true, goals: [...plan.goals, { id: `m${Date.now().toString(36)}`, lane: 'manual', title, refs: [], target, count: 0 }] });
}

export function resetWeek(date: string) {
  const { key } = weekPlan(date);
  update((r) => {
    const { [key]: _, ...rest } = r.weeks;
    return { ...r, weeks: rest };
  });
}


/** La propuesta de la semana se guarda sola la primera vez que se abre la app esa semana (el lunes, normalmente). */
export function ensureWeek(date: string) {
  const { key, plan, saved } = weekPlan(date);
  if (!saved) saveWeek(key, plan);
}
