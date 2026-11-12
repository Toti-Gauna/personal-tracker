import { newId } from '../data/schedule';
import { weekday } from '../data/study';
import {
  adjustDays, exercisesMin, history, isDeloadWeek, nextTarget, orderFor, rangeKey, rangeOf, recordsFor, sessionsInWeek,
} from '../data/train';
import { PLANS } from '../data/train-catalog';
import type { ActiveSession, Exercise, Routine, SetLog, Template, TrainState, Who } from '../data/train-types';
import { getState, setState, updateDay } from './store';

function update(fn: (t: TrainState) => TrainState) {
  setState((s) => ({ ...s, train: fn(s.train) }));
}
const routineOf = (id: string) => getState().train.routines.find((r) => r.id === id);

/** Cuánto levanta cada uno hoy en un ejercicio: el objetivo del motor, o lo último que cargó. */
function draftFor(t: TrainState, who: Who, e: Exercise, setIdx: number, deload: boolean) {
  const target = nextTarget(history(t.sessions, who, e.id), e, rangeOf(t, who, e), deload);
  return { kg: target.kg, reps: target.reps[setIdx] ?? target.reps[target.reps.length - 1] ?? e.repMin };
}

/** Empieza el entreno: con o sin Abi, y con el tiempo del bloque. */
export function startTraining(routineId: string, date: string, partner: boolean) {
  const t = getState().train;
  const r = routineOf(routineId);
  if (!r) return;
  const athletes: Who[] = partner ? ['me', 'partner'] : ['me'];
  const order = orderFor(r, t.leftovers[routineId]);
  const first = r.exercises.find((e) => e.id === order[0])!;
  const deload = isDeloadWeek(t.sessions, date);
  const draft = Object.fromEntries(athletes.map((w) => [w, draftFor(t, w, first, 0, deload)]));
  const a: ActiveSession = {
    routineId, date, startedAt: Date.now(), athletes, order, idx: 0, sets: [], draft, who: 'me',
    restMode: 'each', rest: {}, limitMin: exercisesMin(r), noLimit: false, deload,
  };
  update((x) => ({ ...x, active: a }));
}

export function patchActive(fn: (a: ActiveSession) => ActiveSession) {
  update((t) => (t.active ? { ...t, active: fn(t.active) } : t));
}

export const exerciseAt = (a: ActiveSession, r: Routine, idx = a.idx) => r.exercises.find((e) => e.id === a.order[idx])!;
export const setsFor = (a: ActiveSession, who: Who, exId: string) => a.sets.filter((s) => s.who === who && s.ex === exId);
/** Series que corresponden hoy: en descarga, la mitad. */
export const plannedSets = (a: ActiveSession, e: Exercise) => (a.deload ? Math.max(1, Math.ceil(e.sets / 2)) : e.sets);
export const doneWith = (a: ActiveSession, e: Exercise, who: Who) => setsFor(a, who, e.id).length >= plannedSets(a, e);
export const exerciseDone = (a: ActiveSession, e: Exercise) => a.athletes.every((w) => doneWith(a, e, w));

/** Pasa a otro ejercicio y deja listo el peso de cada uno. */
export function goToExercise(idx: number) {
  const t = getState().train;
  const a = t.active;
  const r = a && routineOf(a.routineId);
  if (!a || !r || idx < 0 || idx >= a.order.length) return;
  const e = exerciseAt(a, r, idx);
  const draft = Object.fromEntries(a.athletes.map((w) => [w, draftFor(t, w, e, setsFor(a, w, e.id).length, a.deload)]));
  patchActive((x) => ({ ...x, idx, draft, who: a.athletes.find((w) => !doneWith({ ...a, idx }, e, w)) ?? 'me' }));
}

export function setWho(who: Who) {
  patchActive((a) => ({ ...a, who }));
}

export function nudge(who: Who, field: 'kg' | 'reps', delta: number) {
  patchActive((a) => {
    const d = a.draft[who] ?? { kg: 0, reps: 0 };
    return { ...a, draft: { ...a.draft, [who]: { ...d, [field]: Math.max(0, Math.round((d[field] + delta) * 100) / 100) } } };
  });
}

/**
 * Marca la serie de una persona. Con "cada uno", su descanso arranca ya; con "compartido",
 * arranca cuando los dos marcaron esa serie.
 */
export function logSet(now = Date.now()) {
  const t = getState().train;
  const a = t.active;
  const r = a && routineOf(a.routineId);
  if (!a || !r) return;
  const e = exerciseAt(a, r);
  const who = a.who;
  const d = a.draft[who];
  if (!d || doneWith(a, e, who)) return;
  const i = setsFor(a, who, e.id).length + 1;
  const sets: SetLog[] = [...a.sets, { ex: e.id, who, i, kg: d.kg, reps: d.reps }];
  const na: ActiveSession = { ...a, sets };
  const rest = { ...a.rest };
  const restMs = e.rest * 1000;
  const lastSet = i >= plannedSets(a, e);
  if (!lastSet) {
    if (a.restMode === 'each') rest[who] = { endsAt: now + restMs, total: restMs };
    else if (a.athletes.every((w) => setsFor(na, w, e.id).length >= i)) rest.shared = { endsAt: now + restMs, total: restMs };
  } else if (a.restMode === 'shared' && a.athletes.every((w) => doneWith(na, e, w))) delete rest.shared;
  // Siguiente carga: el objetivo de la próxima serie.
  const target = nextTarget(history(t.sessions, who, e.id), e, rangeOf(t, who, e), a.deload);
  const draft = { ...a.draft, [who]: { kg: d.kg || target.kg, reps: target.reps[i] ?? d.reps } };
  // Quién sigue: el otro, si todavía no hizo su serie.
  const other = a.athletes.find((w) => w !== who);
  const who2: Who = other && setsFor(na, other, e.id).length < i && !doneWith(na, e, other) ? other : doneWith(na, e, who) && other && !doneWith(na, e, other) ? other : who;
  update((x) => ({ ...x, active: { ...na, rest, draft, who: who2 } }));
}

export function undoLastSet() {
  patchActive((a) => {
    const last = a.sets[a.sets.length - 1];
    return last ? { ...a, sets: a.sets.slice(0, -1), who: last.who, draft: { ...a.draft, [last.who]: { kg: last.kg, reps: last.reps } } } : a;
  });
}

export function addRest(key: 'shared' | Who, sec: number) {
  patchActive((a) => {
    const r = a.rest[key];
    return r ? { ...a, rest: { ...a.rest, [key]: { ...r, endsAt: r.endsAt + sec * 1000, total: r.total + sec * 1000, warned: false } } } : a;
  });
}

export function skipRest(key: 'shared' | Who) {
  patchActive((a) => {
    const rest = { ...a.rest };
    delete rest[key];
    return { ...a, rest };
  });
}

export function markRestWarned(key: 'shared' | Who) {
  patchActive((a) => (a.rest[key] ? { ...a, rest: { ...a.rest, [key]: { ...a.rest[key]!, warned: true } } } : a));
}

export function setRestMode(mode: 'shared' | 'each') {
  patchActive((a) => ({ ...a, restMode: mode, rest: {} }));
}

export const extendLimit = (min: number) => patchActive((a) => ({ ...a, limitMin: a.limitMin + min }));
export const noLimit = () => patchActive((a) => ({ ...a, noLimit: true }));

/** Termina y guarda. Lo que no se hizo pasa al principio de la próxima. */
export function finishTraining(now = Date.now()): string | null {
  const t = getState().train;
  const a = t.active;
  const r = a && routineOf(a.routineId);
  if (!a || !r) return null;
  const names = Object.fromEntries(r.exercises.map((e) => [e.id, e.name]));
  const skipped = a.order.filter((id) => !a.sets.some((s) => s.ex === id));
  const id = `t${newId()}`;
  const session = {
    id, date: a.date, routineId: r.id, routineName: r.name, minutes: Math.max(1, Math.round((now - a.startedAt) / 60000)),
    athletes: a.athletes, sets: a.sets, skipped, deload: a.deload, note: '', records: recordsFor(t.sessions, a.sets, names),
  };
  update((x) => ({ ...x, active: null, sessions: [...x.sessions, session], lastId: id, leftovers: { ...x.leftovers, [r.id]: skipped } }));
  // Lo de hoy en Hoy: la meta de entrenamiento queda cumplida.
  updateDay(a.date, (d) => ({ ...d, blocks: d.blocks.map((b) => (b.kind === 'entreno' ? { ...b, tasks: b.tasks.map((x) => ({ ...x, done: true })) } : b)) }));
  return id;
}

export function cancelTraining() {
  update((t) => ({ ...t, active: null }));
}

export function setNote(id: string, note: string) {
  update((t) => ({ ...t, sessions: t.sessions.map((s) => (s.id === id ? { ...s, note } : s)) }));
}

// ——— Semana y rutinas ———

export function setTemplate(template: Template) {
  update((t) => ({ ...t, plan: { template, days: template === 'propia' ? t.plan.days : [...PLANS[template]] } }));
}

export function setDay(i: number, id: string | null) {
  update((t) => ({ ...t, plan: { template: 'propia', days: t.plan.days.map((d, j) => (j === i ? id : d)) } }));
}

/** Pasa a Full body los próximos días de entreno de la semana para cubrirla. */
export function adjustWeek(date: string, count = 2) {
  update((t) => {
    const days = [...t.plan.days];
    adjustDays(t.plan, weekday(date), count).forEach((i) => (days[i] = 'full'));
    return { ...t, plan: { template: 'propia', days } };
  });
}

export function dismissAdjust(weekKey: string) {
  update((t) => ({ ...t, dismissed: [...t.dismissed, weekKey] }));
}

export function saveRoutine(r: Routine) {
  update((t) => ({ ...t, routines: t.routines.some((x) => x.id === r.id) ? t.routines.map((x) => (x.id === r.id ? r : x)) : [...t.routines, r] }));
}

export function deleteRoutine(id: string) {
  update((t) => ({ ...t, routines: t.routines.filter((r) => r.id !== id), plan: { ...t.plan, days: t.plan.days.map((d) => (d === id ? null : d)) } }));
}

export function setRange(who: Who, exId: string, range: [number, number]) {
  update((t) => ({ ...t, ranges: { ...t.ranges, [rangeKey(who, exId)]: range } }));
}

// ——— Peso ———

export function addWeight(date: string, kg: number) {
  if (!(kg > 0)) return;
  update((t) => ({ ...t, weights: [...t.weights.filter((w) => w.date !== date), { date, kg }].sort((a, b) => a.date.localeCompare(b.date)) }));
}

export function deleteWeight(date: string) {
  update((t) => ({ ...t, weights: t.weights.filter((w) => w.date !== date) }));
}

export function setGoalKg(kg: number) {
  if (kg > 0) update((t) => ({ ...t, goalKg: kg }));
}

export const weekSessions = (date: string) => sessionsInWeek(getState().train, date);
