import { T0_PLAN } from './plan';
import { REST_DAY, REST_DAY_MIN, RULES } from './train-catalog';
import type { Exercise, Medida, Routine, Run, RunKind, SetLog, TrainRecord, TrainSession, TrainState, Who } from './train-types';
import { addDays, daysBetween } from './time';
import { weekday } from './study';

export const monday = (date: string) => addDays(date, -weekday(date));

/** Minutos que lleva un ejercicio: series con su descanso. */
export const exerciseMin = (e: Exercise) => (e.sets * (RULES.setSec + e.rest)) / 60;
/** Lo de los ejercicios, redondeado a 5 min: es el tiempo del bloque de entreno. */
export const exercisesMin = (r: Routine) => Math.max(5, Math.round(r.exercises.reduce((s, e) => s + exerciseMin(e), 0) / 5) * 5);
export const stepsMin = (xs: { min: number }[]) => xs.reduce((s, x) => s + x.min, 0);
/** El calentamiento de una rutina, en minutos. */
export const warmMin = (r: Routine) => Math.round((r.calentamiento ?? []).reduce((s, w) => s + w.min, 0));
/** Lo que dura el entrenamiento de verdad: calentamiento y ejercicios (sin las caminatas). */
export const trainingMin = (r: Routine) => warmMin(r) + exercisesMin(r);
/** Con las dos caminatas: la ida y la vuelta. */
export const totalMin = (r: Routine) => stepsMin(r.before) + trainingMin(r) + stepsMin(r.after);
/** ¿Pasa de las 2 h del bloque? Se avisa antes de empezar. */
export const pasaDelLimite = (r: Routine) => trainingMin(r) > RULES.limiteMin;

/** "3 × 6-8 · 2 min" / "3 × 12 · 90 s". */
export const setsLabel = (e: Exercise) => `${e.sets} × ${e.repMin === e.repMax ? e.repMin : `${e.repMin}-${e.repMax}`}${e.unidad === 's' ? ' s' : ''}`;
/** "RIR 2-1-0". */
export const rirLabel = (e: Pick<Exercise, 'rir'>) => (e.rir?.length ? `RIR ${e.rir.join('-')}` : '');
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
  if (!h.length) {
    const kg = e.pesoInicial ?? 0;
    return { kg, reps: Array(n).fill(lo), kind: 'nuevo', note: kg ? `arrancá con ${fmtKg(kg)} kg` : e.corporal ? 'peso corporal' : 'elegí tu peso' };
  }
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

/**
 * Pull, Legs y Push tienen versión A y B y se alternan por semana: la semana del plan que arranca el
 * lunes de T0 es la 1 (A); las impares, A; las pares, B.
 */
export function esSemanaA(date: string, t0 = T0_PLAN) {
  const sem = Math.floor(daysBetween(monday(t0), monday(date)) / 7);
  return ((sem % 2) + 2) % 2 === 0;
}

/** La rutina de un día de la semana: la que tiene ese id o, si es un día (push), la A o la B de esta semana. */
export function rutinaDelDia(routines: Routine[], id: string | null, date: string, t0 = T0_PLAN): Routine | null {
  if (!id) return null;
  const vivas = routines.filter((r) => !r.archivada);
  const directa = vivas.find((r) => r.id === id);
  if (directa) return directa;
  const vs = vivas.filter((r) => r.slot === id && r.variante);
  return vs.find((r) => r.variante === (esSemanaA(date, t0) ? 'A' : 'B')) ?? vs[0] ?? null;
}

/** Lo planeado para una fecha: la rutina, el descanso activo o un día libre. */
export function plannedFor(t: Pick<TrainState, 'plan' | 'routines'>, date: string, t0 = T0_PLAN) {
  const id = t.plan.days[weekday(date)];
  if (id === REST_DAY) return { rest: true as const, libre: false as const, routine: null, id };
  const routine = rutinaDelDia(t.routines, id, date, t0);
  return { rest: false as const, libre: !id, routine, id };
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

// ——— Ola 13: peso al entrar, corridas y medidas ———

export const RUN_LABEL: Record<RunKind, string> = { suave: 'Suave', fondo: 'Fondo', series: 'Series' };
export const FEEL_LABEL = ['', 'Muy mal', 'Mal', 'Normal', 'Bien', 'Muy bien'];

/** Ritmo en min/km ("5:30"); sin distancia no hay ritmo. */
export function fmtPace(min: number, km?: number) {
  if (!km || km <= 0 || min <= 0) return null;
  const sec = Math.round((min / km) * 60);
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
}

export const runOn = (runs: Run[], date: string) => runs.find((r) => r.date === date);
export const runsBetween = (runs: Run[], from: string, to: string) => runs.filter((r) => r.date >= from && r.date <= to).sort((a, b) => a.date.localeCompare(b.date));

/** Lo corrido en la semana (lunes a domingo) de una fecha. */
export function runWeek(runs: Run[], date: string) {
  const l = monday(date);
  const rs = runsBetween(runs, l, addDays(l, 6));
  return { n: rs.length, min: rs.reduce((s, r) => s + r.min, 0), km: Math.round(rs.reduce((s, r) => s + (r.km ?? 0), 0) * 10) / 10 };
}

/** Las medidas se piden una vez por mes: a los 28 días de la última (o si nunca se cargaron). */
export const DIAS_ENTRE_MEDIDAS = 28;
export function medidasPendientes(medidas: Medida[], date: string) {
  const ult = [...medidas].filter((m) => m.date <= date).sort((a, b) => a.date.localeCompare(b.date)).pop();
  return !ult || daysBetween(ult.date, date) >= DIAS_ENTRE_MEDIDAS;
}

/**
 * ¿Hay que preguntar el peso al entrar a Entreno? Una sola vez por día: si ya lo cargaste, si
 * ya lo salteaste o si estás en plena sesión, no.
 */
export const debePreguntarPeso = (t: Pick<TrainState, 'weights' | 'pesoPreguntado' | 'active'>, date: string) =>
  !t.pesoPreguntado.includes(date) && !t.weights.some((w) => w.date === date) && !t.active;

// ——— Ola 19: la ficha de cada ejercicio y los días de la semana ———

/** "2-1-2" → "2 s bajando — 1 s de pausa — 2 s subiendo". */
export function tempoTexto(tempo: string) {
  const [a, b, c] = tempo.split('-');
  return `${a} s bajando — ${b} s de pausa — ${c} s subiendo`;
}

/** Lo que muestra "Cómo se hace": solo las filas que el ejercicio trae. */
export function ficha(e: Pick<Exercise, 'tempo' | 'tempoDesc' | 'rir' | 'rirGuia' | 'posicion' | 'parciales' | 'dropset' | 'tips' | 'musculos' | 'objetivo' | 'nota'>): [string, string][] {
  const mayus = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  const rows: [string, string | undefined][] = [
    ['Tempo', e.tempo ? `${e.tempo} · ${e.tempoDesc ?? tempoTexto(e.tempo)}` : undefined],
    ['RIR por serie', e.rir?.length ? `${e.rir.join(' · ')}${e.rirGuia ? ` — ${e.rirGuia}` : ''}` : e.rirGuia],
    ['Posicionamiento', e.posicion],
    ['Parciales', e.parciales],
    ['Dropset', e.dropset],
    ['Consejo', e.tips ? mayus(e.tips) : undefined],
    ['Músculos', e.musculos],
    ['Objetivo', e.objetivo],
    ['Nota', e.nota],
  ];
  return rows.filter((r): r is [string, string] => !!r[1]);
}

/** Qué se puede poner en un día de la semana: cada día (Pull, Legs, Push) una sola vez, con su A y B por semana. */
export function opcionesDia(routines: Routine[]): { id: string; nombre: string; alterna: boolean }[] {
  const out: { id: string; nombre: string; alterna: boolean }[] = [];
  for (const r of routines.filter((x) => !x.archivada)) {
    if (r.slot && r.variante) {
      if (!out.some((o) => o.id === r.slot)) out.push({ id: r.slot, nombre: r.name.replace(/ [AB]$/, ''), alterna: true });
    } else out.push({ id: r.id, nombre: r.name, alterna: false });
  }
  return out;
}

/** Cuántas series por semana lleva cada grupo muscular, sumando los entrenos de la semana tipo (cada día cuenta una vez). */
export function seriesPorGrupo(rutinas: Routine[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const r of rutinas) for (const e of r.exercises) if (e.grupo) out[e.grupo] = (out[e.grupo] ?? 0) + e.sets;
  return out;
}
