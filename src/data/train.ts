import { REST_DAY, REST_DAY_MIN, RULES } from './train-catalog';
import type { Exercise, Routine, SetLog, TrainRecord, TrainSession, TrainState, Who } from './train-types';
import { addDays, daysBetween } from './time';
import { weekday } from './study';

export const monday = (date: string) => addDays(date, -weekday(date));

/** Minutos que lleva un ejercicio: series con su descanso. */
export const exerciseMin = (e: Exercise) => (e.sets * (RULES.setSec + e.rest)) / 60;
/** Lo de los ejercicios, redondeado a 5 min: es el tiempo del bloque de entreno. */
export const exercisesMin = (r: Routine) => Math.max(5, Math.round(r.exercises.reduce((s, e) => s + exerciseMin(e), 0) / 5) * 5);
export const stepsMin = (xs: { min: number }[]) => xs.reduce((s, x) => s + x.min, 0);
export const totalMin = (r: Routine) => stepsMin(r.before) + exercisesMin(r) + stepsMin(r.after);

/** "3 × 6-8 · 2 min" / "3 × 12 · 90 s". */
export const setsLabel = (e: Exercise) => `${e.sets} × ${e.repMin === e.repMax ? e.repMin : `${e.repMin}-${e.repMax}`}`;
export const restLabel = (s: number) => (s >= 120 && s % 60 === 0 ? `${s / 60} min` : `${s} s`);
export const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

export const fmtH = (min: number) => {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return h ? (m ? `${h} h ${m}` : `${h} h`) : `${m} min`;
};
export const fmtKg = (n: number) => String(Math.round(n * 100) / 100).replace('.', ',');

export const rangeKey = (who: Who, ex: string) => `${who}:${ex}`;
export const rangeOf = (t: Pick<TrainState, 'ranges'>, who: Who, e: Exercise): [number, number] => t.ranges[rangeKey(who, e.id)] ?? [e.repMin, e.repMax];

/** Lo que hizo una persona en un ejercicio en una sesión. */
export interface Hist {
  date: string;
  kg: number;
  reps: number[];
}

/** Historial de una persona en un ejercicio, sin las semanas de descarga. */
export function history(sessions: TrainSession[], who: Who, exId: string): Hist[] {
  const out: Hist[] = [];
  for (const s of [...sessions].sort((a, b) => a.date.localeCompare(b.date))) {
    if (s.deload) continue;
    const sets = s.sets.filter((x) => x.who === who && x.ex === exId).sort((a, b) => a.i - b.i);
    if (!sets.length) continue;
    out.push({ date: s.date, kg: sets[0].kg, reps: sets.map((x) => x.reps) });
  }
  return out;
}

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

/** Sesiones seguidas, al final, que no mejoraron contra la anterior con el mismo peso. */
export function stalls(h: Hist[]) {
  let c = 0;
  for (let j = h.length - 1; j >= 1; j--) {
    if (h[j].kg === h[j - 1].kg && sum(h[j].reps) <= sum(h[j - 1].reps)) c++;
    else break;
  }
  return c;
}

export type TargetKind = 'nuevo' | 'sube' | 'rep' | 'falta' | 'mantiene' | 'baja' | 'descarga';
export interface Target {
  kg: number;
  reps: number[];
  kind: TargetKind;
  note: string;
}

const round05 = (x: number) => Math.round(x * 2) / 2;

/**
 * Doble progresión: dentro del rango sumás repeticiones (+1 en la serie más baja) y, cuando
 * todas llegan al tope, sube el peso y volvés al mínimo. Si te estancás, se mantiene; a la
 * tercera sesión igual, baja un 10 %. En semana de descarga: mismo peso, la mitad de las series.
 */
export function nextTarget(h: Hist[], e: Exercise, range: [number, number], deload = false): Target {
  const [lo, hi] = range;
  const n = e.sets;
  if (!h.length) return { kg: 0, reps: Array(n).fill(lo), kind: 'nuevo', note: 'elegí tu peso' };
  const last = h[h.length - 1];
  const reps = Array.from({ length: n }, (_, i) => Math.min(hi, last.reps[i] ?? lo));
  if (deload) {
    const k = Math.max(1, Math.ceil(n / 2));
    return { kg: last.kg, reps: reps.slice(0, k), kind: 'descarga', note: `descarga · ${k} series` };
  }
  const st = stalls(h);
  if (st >= RULES.dropAt - 1) {
    return { kg: round05(last.kg * (1 - RULES.dropPct)), reps: Array(n).fill(lo), kind: 'baja', note: `baja 10 % · ${st + 1} sesiones iguales` };
  }
  if (st === RULES.holdAt - 1) return { kg: last.kg, reps, kind: 'mantiene', note: `se mantiene · ${st + 1}.ª igual` };
  if (reps.every((r) => r >= hi)) {
    const kg = round05(last.kg + RULES.inc[e.kind]);
    return { kg, reps: Array(n).fill(lo), kind: 'sube', note: `sube de ${fmtKg(last.kg)} kg` };
  }
  const low = Math.min(...reps);
  const at = reps.indexOf(low);
  const next = reps.map((r, i) => (i === at ? Math.min(hi, r + 1) : r));
  const missing = sum(reps.map((r) => hi - r));
  return { kg: last.kg, reps: next, kind: missing === 1 ? 'falta' : 'rep', note: missing === 1 ? 'falta 1 rep para subir' : '+1 rep' };
}

/** ¿Esa fecha cae en una semana de descarga? Cada 6 semanas desde el primer entreno. */
export function isDeloadWeek(sessions: TrainSession[], date: string) {
  const firsts = sessions.map((s) => s.date).sort();
  if (!firsts.length) return false;
  const w = Math.floor(daysBetween(monday(firsts[0]), monday(date)) / 7);
  return w > 0 && (w + 1) % RULES.deloadEvery === 0;
}

/** Récords de una sesión: más peso, o más repeticiones con el mismo peso, contra todo lo anterior. */
export function recordsFor(prev: TrainSession[], sets: SetLog[], names: Record<string, string>): TrainRecord[] {
  const out: TrainRecord[] = [];
  const keys = new Set(sets.map((s) => `${s.who}|${s.ex}`));
  for (const k of keys) {
    const [who, ex] = k.split('|') as [Who, string];
    const before = prev.filter((s) => !s.deload).flatMap((s) => s.sets.filter((x) => x.who === who && x.ex === ex));
    if (!before.length) continue;
    const bestKg = Math.max(...before.map((x) => x.kg));
    const bestAtKg = (kg: number) => Math.max(0, ...before.filter((x) => x.kg === kg).map((x) => x.reps));
    const today = sets.filter((x) => x.who === who && x.ex === ex);
    const top = today.reduce((a, b) => (b.kg > a.kg || (b.kg === a.kg && b.reps > a.reps) ? b : a));
    if (top.kg > bestKg) out.push({ who, ex, name: names[ex] ?? ex, kg: top.kg, reps: top.reps, text: `+${fmtKg(top.kg - bestKg)} kg contra la mejor marca` });
    else if (top.kg === bestKg && top.reps > bestAtKg(top.kg)) out.push({ who, ex, name: names[ex] ?? ex, kg: top.kg, reps: top.reps, text: `+${top.reps - bestAtKg(top.kg)} ${top.reps - bestAtKg(top.kg) === 1 ? 'repetición' : 'repeticiones'} con el mismo peso` });
  }
  return out;
}

export const volume = (sets: SetLog[], who?: Who) => sets.filter((s) => !who || s.who === who).reduce((a, s) => a + s.kg * s.reps, 0);

/** Sesiones de una semana (lunes a domingo). */
export const sessionsInWeek = (t: Pick<TrainState, 'sessions'>, date: string) => {
  const m = monday(date);
  const e = addDays(m, 6);
  return t.sessions.filter((s) => s.date >= m && s.date <= e);
};

/** Lo planeado para una fecha: la rutina, o el descanso activo. */
export function plannedFor(t: Pick<TrainState, 'plan' | 'routines'>, date: string) {
  const id = t.plan.days[weekday(date)];
  if (id === REST_DAY) return { rest: true as const, routine: null, id };
  const routine = t.routines.find((r) => r.id === id) ?? null;
  return { rest: false as const, routine, id };
}

/**
 * Qué días se pasan a Full body para cubrir la semana: de los que quedan, el primero y el último
 * (jueves y sábado en PPL + UL), así queda espacio para descansar en el medio.
 */
export function adjustDays(plan: { days: (string | null)[] }, today: number, count = 2): number[] {
  const later = plan.days.map((d, i) => [d, i] as const).filter(([d, i]) => i > today && d && d !== REST_DAY).map(([, i]) => i);
  if (later.length <= count) return later;
  return count === 2 ? [later[0], later[later.length - 1]] : later.slice(-count);
}

export const REST_LABEL = `Descanso activo · caminar ${REST_DAY_MIN} min`;

/** Ejercicios de hoy: primero lo que quedó sin hacer la última vez. */
export function orderFor(r: Routine, leftovers: string[] = []) {
  const left = r.exercises.filter((e) => leftovers.includes(e.id));
  return [...left, ...r.exercises.filter((e) => !leftovers.includes(e.id))].map((e) => e.id);
}

export interface Pending {
  who: Who;
  ex: Exercise;
  target: Target;
  last?: Hist;
}

/** La próxima vez de una rutina: qué levanta cada uno en cada ejercicio. */
export function nextFor(t: TrainState, r: Routine, whos: Who[], date: string): Pending[] {
  const deload = isDeloadWeek(t.sessions, date);
  return r.exercises.flatMap((e) =>
    whos.map((who) => {
      const h = history(t.sessions, who, e.id);
      return { who, ex: e, target: nextTarget(h, e, rangeOf(t, who, e), deload), last: h[h.length - 1] };
    }),
  );
}

/** Pesaje: el más reciente hasta una fecha. */
export const weightAt = (ws: { date: string; kg: number }[], date: string) => [...ws].filter((w) => w.date <= date).sort((a, b) => a.date.localeCompare(b.date)).pop();

/** Ritmo en kg por semana, con el primer y el último pesaje. */
export function pace(ws: { date: string; kg: number }[]) {
  const s = [...ws].sort((a, b) => a.date.localeCompare(b.date));
  if (s.length < 2) return null;
  const weeks = Math.max(1, daysBetween(s[0].date, s[s.length - 1].date) / 7);
  return { perWeek: (s[s.length - 1].kg - s[0].kg) / weeks, change: s[s.length - 1].kg - s[0].kg, weeks: Math.round(weeks) };
}
