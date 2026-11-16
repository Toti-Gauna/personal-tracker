import { puertaBloqueando } from '../data/puertas';
import { T0_PLAN } from '../data/plan';
import { aplicarIntensiva } from '../data/busqueda';
import { useSyncExternalStore } from 'react';
import { DEFAULT_BLOCK_PRESETS, DEFAULT_PRESETS } from '../data/defaults';
import { buildBlocks, newId, planDay } from '../data/schedule';
import { routineFor } from '../data/routines';
import { emptyPlan, DEFAULT_PLAN_SETTINGS, type PlanSettings, type PlanState } from '../data/plan-state';
import { semanaDelPlan, ventanaW } from '../data/plan';
import { addDays, dateKey } from '../data/time';
import { emptyStudy } from '../data/study-catalog';
import { defaultGoals, emptyGoals, RAMA_DE_SEMILLA, REEMPLAZADAS_POR_PLAN } from '../data/goals-catalog';
import type { Goal, GoalsState } from '../data/goals-types';
import { periodKey } from '../data/goals';
import { emptyTrain } from '../data/train-catalog';
import { emptyRuta, refsForDay, type RutaState } from '../data/ruta';
import { applySettings } from './apply';
import { aplicarCalendario } from '../data/plan';
import type { TrainState } from '../data/train-types';
import type { StudyState } from '../data/study-types';
import { emptyEstudioRuta, type EstudioRutaState } from '../data/study-roadmap';
import type { Block, DayLog, FocusEntry, FocusState, Preset, RoutineId, Settings } from '../data/types';

export interface State {
  settings: Settings | null;
  days: Record<string, DayLog>;
  focus: FocusState | null;
  /** Tareas que pasaron a otro día: fecha → key del bloque → textos. */
  carry: Record<string, Record<string, string[]>>;
  study: StudyState;
  goals: GoalsState;
  train: TrainState;
  ruta: RutaState;
  /** Plan T+18: entrevistas, postulaciones, contadores, proyectos, Handyx, metas generadas. */
  plan: PlanState;
  /** Roadmaps de estudio (ola 12): criterios de salida y fases cerradas. */
  estudioRuta: EstudioRutaState;
  /** Sellos ganados: id → fecha. */
  profile: { seals: Record<string, string>; /** Sellos cuya pantalla de logro ya viste. */ seen: string[] };
}

const KEY = 'trazo.v1';
const empty = (): State => ({ settings: null, days: {}, focus: null, carry: {}, study: emptyStudy(), goals: emptyGoals(), train: emptyTrain(), ruta: emptyRuta(), plan: emptyPlan(), estudioRuta: emptyEstudioRuta(), profile: { seals: {}, seen: [] } });

function load(): State {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return migrate(JSON.parse(raw));
  } catch { /* sin storage o JSON roto */ }
  return empty();
}

/**
 * Lleva un estado guardado (trazo.v1) a la forma actual. Solo suma lo que falta: los días ya
 * guardados quedan como estaban.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function migrate(parsed: any): State {
  // Migración: la ola 1 no tenía estudio y la ola 2 no tenía reglas, registro ni puntos.
  const base = emptyStudy();
  const study = parsed.study ? { ...base, ...parsed.study, attempts: parsed.study.attempts ?? [], rules: { ...base.rules, ...parsed.study.rules, pesos: { ...base.rules.pesos, ...parsed.study.rules?.pesos } } } : base;
  const goals = parsed.goals ? { ...emptyGoals(), ...parsed.goals } : null;
  const train = parsed.train ? { ...emptyTrain(), ...parsed.train } : emptyTrain();
  const ruta = { ...emptyRuta(), ...(parsed.ruta ?? {}) };
  // Ola 8: el plan T+18 arranca vacío; los días ya guardados no cambian.
  let plan = { ...emptyPlan(), ...(parsed.plan ?? {}) };
  // Ola 8b: la búsqueda intensiva es la prioridad desde T0. Si nunca se decidió el modo, se activa
  // (con Handyx y ventas en pausa desde T0); si ya se decidió, se respeta.
  let settings = parsed.settings ?? null;
  if (settings && settings.plan?.modo === undefined) ({ settings, plan } = aplicarIntensiva(settings, plan, settings.startDate || T0_PLAN));
  return { ...empty(), ...parsed, settings, study, train, ruta, plan, estudioRuta: { ...emptyEstudioRuta(), ...(parsed.estudioRuta ?? {}) }, profile: { seals: {}, seen: Object.keys(parsed.profile?.seals ?? {}), ...(parsed.profile ?? {}) }, goals: migrateGoals(goals ?? seedGoals(parsed.settings?.startDate ?? dateKey())) };
}

let state: State = load();
applySettings(state.settings);
aplicarCalendario(state.plan.extrasApagados ?? []);
const subs = new Set<() => void>();

export const getState = () => state;

export function setState(fn: (s: State) => State) {
  const prev = state.settings;
  const prevExtras = state.plan.extrasApagados;
  state = fn(state);
  if (state.settings !== prev) applySettings(state.settings);
  // Ola 16b: el calendario vivo se recalcula si cambian los extras de feature apagados.
  if (state.plan.extrasApagados !== prevExtras) aplicarCalendario(state.plan.extrasApagados ?? []);
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* sin storage */ }
  subs.forEach((f) => f());
}

/** Solo para tests. */
export function resetState(s: State = empty()) {
  state = s;
  applySettings(s.settings);
  aplicarCalendario(s.plan.extrasApagados ?? []);
  subs.forEach((f) => f());
}

const subscribe = (f: () => void) => {
  subs.add(f);
  return () => subs.delete(f);
};

export function useStore<T>(sel: (s: State) => T): T {
  return useSyncExternalStore(subscribe, () => sel(state), () => sel(state));
}

/**
 * Ola 5: Entrenar, Entrenamientos y el peso pasan a salir solos del entreno.
 * Ola 8: las semillas que el plan reemplaza con sus contadores se van si no tienen avance, y las
 * metas personales de partida toman su rama (Handyx, salud).
 */
function migrateGoals(g: GoalsState): GoalsState {
  const reemplazada = (x: GoalsState['goals'][number]) =>
    x.id.startsWith('g-seed') && REEMPLAZADAS_POR_PLAN.some(([t, h]) => t === x.title && h === x.horizon) && (x.auto || !Object.values(x.progress ?? {}).some((v) => v));
  return {
    ...g,
    goals: g.goals.filter((x) => !reemplazada(x)).map((x) => (x.rama || !x.id.startsWith('g-seed') || !RAMA_DE_SEMILLA[x.title] ? x : { ...x, rama: RAMA_DE_SEMILLA[x.title] })).map((x) => {
      if (x.auto) return x;
      if (x.title === 'Entrenar' && x.horizon === 'semana') return { ...x, auto: { kind: 'entreno' }, quick: false };
      // Ola 13: Correr sale solo de las corridas registradas.
      if (x.title === 'Correr' && x.horizon === 'semana') return { ...x, auto: { kind: 'correr' }, quick: false };
      if (x.title === 'Entrenamientos' && x.horizon === 'mes') return { ...x, auto: { kind: 'entreno' } };
      if (x.title === 'Llegar a 95 kg entrenando 6 días' && x.horizon === 'anio') return { ...x, auto: { kind: 'peso' } };
      return x;
    }),
  };
}

export function seedGoals(today: string): GoalsState {
  const keys = Object.fromEntries((['dia', 'semana', 'mes', 'bim', 'anio'] as const).map((h) => [h, periodKey(h, today)]));
  return { goals: defaultGoals(today, keys), bimesterNames: {} };
}

// ——— acciones ———

export function register(me: string, partner: string, today = dateKey()) {
  setState((s) => ({
    ...s,
    goals: seedGoals(today),
    settings: {
      names: { me: me.trim() || 'Toti', partner: partner.trim() || 'Abi' },
      startDate: today,
      presets: DEFAULT_PRESETS,
      blockPresets: DEFAULT_BLOCK_PRESETS,
    },
  }));
  // Desde el primer día: búsqueda intensiva con Handyx y ventas en pausa.
  setState((s) => (s.settings ? { ...s, ...aplicarIntensiva(s.settings, s.plan, s.settings.startDate) } : s));
}

export function startDay(routine: RoutineId, wake: string, date = dateKey()) {
  setState((s) => {
    const carry = s.carry[date] ?? {};
    const { [date]: _, ...restCarry } = s.carry;
    // Las metas que empujan la ruta llevan su etiqueta (ref y part) desde que empieza el día.
    const refs = refsForDay(s.ruta, date);
    const cfg = planSettings(s.settings);
    const dayType = routineFor(date, cfg);
    const t0 = s.settings?.startDate;
    const puerta = puertaBloqueando(date, s.plan, t0) ?? undefined;
    const ventana = ventanaW(date, t0).ahora?.id ?? puerta;
    const entrevista = entrevistaCerca(s.plan, date);
    const blocks = buildBlocks(planDay(date, routine, wake, dayType, { ventana, entrevista, puerta }), carry).map((b) => (refs[b.key] ? { ...b, ...refs[b.key] } : b));
    const day: DayLog = { date, wake, routine, dayType, ...(ventana ? { ventana } : {}), blocks, notes: [], focus: [] };
    return { ...s, days: { ...s.days, [date]: day }, carry: restCarry };
  });
}

/** Ajustes del plan con los valores de fábrica. */
export const planSettings = (st: Settings | null): PlanSettings => ({ ...DEFAULT_PLAN_SETTINGS, ...(st?.plan ?? {}) });

/** ¿La entrevista es en inglés? Se lee de la modalidad ("remoto · entrevista técnica en inglés"). */
export const entrevistaEnIngles = (e: { modalidad?: string }) => /ingl[eé]s/i.test(e.modalidad ?? '');

/** ¿Hay una entrevista cargada para mañana? Ese día se practica en el bloque de búsqueda laboral. */
export function entrevistaCerca(p: PlanState, date: string): { rol: string; empresa?: string; ingles: boolean } | false {
  const e = p.entrevistas.find((x) => x.fecha === addDays(date, 1));
  return e ? { rol: e.rol, ...(e.empresa ? { empresa: e.empresa } : {}), ingles: entrevistaEnIngles(e) } : false;
}

/** Semana del plan para una fecha, con el T0 de los ajustes. */
export const semanaPlan = (date: string) => semanaDelPlan(date, state.settings?.startDate);

export function updateDay(date: string, fn: (d: DayLog) => DayLog) {
  setState((s) => (s.days[date] ? { ...s, days: { ...s.days, [date]: fn(s.days[date]) } } : s));
}

function updateBlock(date: string, key: string, fn: (b: Block) => Block) {
  updateDay(date, (d) => ({ ...d, blocks: d.blocks.map((b) => (b.key === key ? fn(b) : b)) }));
}

export function toggleTask(date: string, key: string, id: string) {
  updateBlock(date, key, (b) => ({ ...b, tasks: b.tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t)) }));
}

export function addTask(date: string, key: string, text: string) {
  const t = text.trim();
  if (!t) return;
  updateBlock(date, key, (b) => ({ ...b, tasks: [...b.tasks, { id: newId(), t, done: false }] }));
}

/** Pasa las tareas pendientes de un bloque al día siguiente. */
export function carryPending(date: string, key: string) {
  const day = state.days[date];
  const block = day?.blocks.find((b) => b.key === key);
  if (!block) return;
  const pending = block.tasks.filter((t) => !t.done);
  if (!pending.length) return;
  const tomorrow = addDays(date, 1);
  setState((s) => {
    const forDay = s.carry[tomorrow] ?? {};
    return {
      ...s,
      carry: { ...s.carry, [tomorrow]: { ...forDay, [key]: [...(forDay[key] ?? []), ...pending.map((t) => t.t)] } },
    };
  });
  updateBlock(date, key, (b) => ({ ...b, tasks: b.tasks.filter((t) => t.done) }));
}

export function addNote(date: string, text: string) {
  const t = text.trim();
  if (t) updateDay(date, (d) => ({ ...d, notes: [...d.notes, t] }));
}

export function logFocus(date: string, entry: FocusEntry) {
  updateDay(date, (d) => ({ ...d, focus: [...d.focus, entry] }));
}

export function setFocus(f: FocusState | null) {
  setState((s) => ({ ...s, focus: f }));
}

function updateSettings(fn: (st: Settings) => Settings) {
  setState((s) => (s.settings ? { ...s, settings: fn(s.settings) } : s));
}

export function savePreset(p: Omit<Preset, 'id'>, assignTo?: string) {
  const id = `p-${newId()}`;
  updateSettings((st) => ({
    ...st,
    presets: [...st.presets, { ...p, id }],
    blockPresets: assignTo ? { ...st.blockPresets, [assignTo]: id } : st.blockPresets,
  }));
  return id;
}

export function deletePreset(id: string) {
  updateSettings((st) => ({
    ...st,
    presets: st.presets.filter((p) => p.id !== id),
    blockPresets: Object.fromEntries(Object.entries(st.blockPresets).filter(([, v]) => v !== id)),
  }));
}

export function setBlockPreset(key: string, id: string | null) {
  updateSettings((st) => {
    const bp = { ...st.blockPresets };
    if (id) bp[key] = id;
    else delete bp[key];
    return { ...st, blockPresets: bp };
  });
}
