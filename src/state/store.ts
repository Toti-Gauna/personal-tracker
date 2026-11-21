import { puertaBloqueando } from '../data/puertas';
import { T0_PLAN } from '../data/plan';
import { INICIO_TRABAJO_DIAS } from '../data/capacidad';
import { sprintActivo } from '../data/algoritmos';
import { ACADEMY_HASTA } from '../data/routines';
import { aplicarIntensiva } from '../data/busqueda';
import { useSyncExternalStore } from 'react';
import { DEFAULT_BLOCK_PRESETS, DEFAULT_PRESETS } from '../data/defaults';
import { buildBlocks, newId, planDay } from '../data/schedule';
import { isoDay, routineFor } from '../data/routines';
import { emptyPlan, DEFAULT_PLAN_SETTINGS, type PlanSettings, type PlanState } from '../data/plan-state';
import { semanaDelPlan, tramoActivo, ventanaW } from '../data/plan';
import { tareasDeBloque } from '../data/metas-bloque';
import { mesClipEn, mesDe as mesClipDe } from '../data/clipping';
import { plannedFor } from '../data/train';
import { addDays, dateKey } from '../data/time';
import { emptyStudy } from '../data/study-catalog';
import { defaultGoals, emptyGoals, RAMA_DE_SEMILLA, REEMPLAZADAS_POR_PLAN } from '../data/goals-catalog';
import type { Goal, GoalsState } from '../data/goals-types';
import { periodKey } from '../data/goals';
import { emptyTrain, migrarEntreno } from '../data/train-catalog';
import { emptyRuta, refsForDay, type RutaState } from '../data/ruta';
import { applySettings } from './apply';
import { calibrar } from '../data/calibracion';
import { aplicarCalendario, calendarioVivo } from '../data/plan';
import { setClippingActivo } from '../data/clipping-activo';
import { aplicarLibrosPropios } from '../data/libros';
import type { TrainState } from '../data/train-types';
import type { StudyState } from '../data/study-types';
import { emptyEstudioRuta, type EstudioRutaState } from '../data/study-roadmap';
import { emptyClipping, migrarClipping, type ClippingState } from '../data/clipping-state';
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
  /** Ola 21: enlaces de los cursos de idiomas (Udemy). Quedan en el teléfono: no van al repo. */
  idiomas: { enlaces: Record<string, string> };
  /** Ola 23: la planilla del clipping (cuentas, campañas, registro, retainers, prospección y rutina). */
  clipping: ClippingState;
  /** Sellos ganados: id → fecha. */
  profile: { seals: Record<string, string>; /** Sellos cuya pantalla de logro ya viste. */ seen: string[] };
}

const KEY = 'trazo.v1';
const empty = (): State => ({ settings: null, days: {}, focus: null, carry: {}, study: emptyStudy(), goals: emptyGoals(), train: emptyTrain(), ruta: emptyRuta(), plan: emptyPlan(), estudioRuta: emptyEstudioRuta(), idiomas: { enlaces: {} }, clipping: emptyClipping(), profile: { seals: {}, seen: [] } });

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
  const study = parsed.study ? migrateStudy({ ...base, ...parsed.study, attempts: parsed.study.attempts ?? [], rules: { ...base.rules, ...parsed.study.rules, pesos: { ...base.rules.pesos, ...parsed.study.rules?.pesos } } }) : base;
  const goals = parsed.goals ? { ...emptyGoals(), ...parsed.goals } : null;
  const train = parsed.train ? migrarEntreno({ ...emptyTrain(), ...parsed.train, ...(parsed.train.v ? {} : { v: undefined }) }) : emptyTrain();
  const ruta = { ...emptyRuta(), ...(parsed.ruta ?? {}) };
  // Ola 8: el plan T+18 arranca vacío; los días ya guardados no cambian.
  let plan = { ...emptyPlan(), ...(parsed.plan ?? {}) };
  // Ola 8b: la búsqueda intensiva es la prioridad desde T0. Si nunca se decidió el modo, se activa
  // (con Handyx y ventas en pausa desde T0); si ya se decidió, se respeta.
  let settings = parsed.settings ?? null;
  if (settings && settings.plan?.modo === undefined) ({ settings, plan } = aplicarIntensiva(settings, plan, settings.startDate || T0_PLAN));
  return { ...empty(), ...parsed, settings, study, train, ruta, plan, estudioRuta: { ...emptyEstudioRuta(), ...(parsed.estudioRuta ?? {}) }, idiomas: { enlaces: {}, ...(parsed.idiomas ?? {}) }, clipping: migrarClipping(parsed.clipping), profile: migrarPerfil({ seals: {}, seen: Object.keys(parsed.profile?.seals ?? {}), ...(parsed.profile ?? {}) }), goals: migrateGoals(goals ?? seedGoals(parsed.settings?.startDate ?? dateKey())) };
}

let state: State = load();

/** Ola 27 · horas de programación reales por día (foco en bloques de la rama programación), solo de los días que ya pasaron. */
function realesProg(days: Record<string, DayLog>, hoy: string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [d, day] of Object.entries(days)) {
    if (d >= hoy) continue;
    const ramaDe = new Map(day.blocks.map((b) => [b.key, b.rama]));
    const min = day.focus.filter((f) => ramaDe.get(f.key) === 'programacion').reduce((x, f) => x + f.focusMin, 0);
    if (min > 0) out[d] = Math.round((min / 60) * 100) / 100;
  }
  return out;
}

/** Ola 27 · el factor real/estimado (al cerrar P2 y P3) y los bloques cerrados con los que se calculó. Cuando todavía no cierra P2, nada. */
function factorCalendario(s: State, t0: string, hoy: string): { factor?: number; cerrados?: string[] } {
  if (!s.plan.proyectos.P2?.examen && hoy < addDays(t0, 40)) return {};
  const c = calibrar(calendarioVivo(t0, { factor: null, cerrados: [] }), s.days, s.plan, hoy);
  if (c.factor == null || !c.hito) return {};
  return { factor: c.factor, cerrados: c.hito === 'P3' ? ['P0', 'P1', 'P2', 'P3'] : ['P0', 'P1', 'P2'] };
}

/** Ola 27 · lo que hace falta para fechar el calendario por horas: T0, inicio del trabajo, extras, pausa, horas reales y factor. */
function ajustesCalendario(s: State) {
  const t0 = s.settings?.startDate ?? T0_PLAN;
  const hoy = dateKey();
  const reales = realesProg(s.days, hoy);
  return { t0, hoy, reales, inicioTrabajo: s.settings?.plan?.t2 ?? addDays(t0, INICIO_TRABAJO_DIAS) };
}
const claveCalendario = (s: State) => {
  const a = ajustesCalendario(s);
  return `${a.t0}|${s.settings?.plan?.t2 ?? ''}|${(s.plan.extrasApagados ?? []).join(',')}|${s.plan.pausaFinDeAnio !== false}|${a.hoy}|${Object.entries(a.reales).map(([d, h]) => `${d}:${h}`).join(',')}|${Object.entries(s.plan.proyectos).filter(([, p]) => p.examen).map(([id]) => id).join(',')}`;
};
let claveAplicada = '';
function recalcularCalendario() {
  claveAplicada = claveCalendario(state);
  const a = ajustesCalendario(state);
  // Primero sin factor (para medir contra el calendario estimado); con las horas reales ya cargadas.
  aplicarCalendario(state.plan.extrasApagados ?? [], state.plan.pausaFinDeAnio !== false, { t0: a.t0, inicioTrabajo: a.inicioTrabajo, reales: a.reales, hoy: a.hoy });
  const f = factorCalendario(state, a.t0, a.hoy);
  if (f.factor) aplicarCalendario(state.plan.extrasApagados ?? [], state.plan.pausaFinDeAnio !== false, { t0: a.t0, inicioTrabajo: a.inicioTrabajo, reales: a.reales, hoy: a.hoy, ...f });
}
applySettings(state.settings);
setClippingActivo(!!state.settings?.plan?.bloquesPendientes?.clipping);
recalcularCalendario();
aplicarLibrosPropios(state.study.librosPropios);
const subs = new Set<() => void>();

export const getState = () => state;

export function setState(fn: (s: State) => State) {
  const prev = state.settings;
  const prevExtras = state.plan.extrasApagados;
  const prevPausa = state.plan.pausaFinDeAnio;
  const prevLibros = state.study.librosPropios;
  state = fn(state);
  if (state.study.librosPropios !== prevLibros) aplicarLibrosPropios(state.study.librosPropios);
  if (state.settings !== prev) { applySettings(state.settings); setClippingActivo(!!state.settings?.plan?.bloquesPendientes?.clipping); }
  // Ola 16b: el calendario vivo se recalcula si cambian los extras de feature apagados.
  if (state.plan.extrasApagados !== prevExtras || state.plan.pausaFinDeAnio !== prevPausa || claveCalendario(state) !== claveAplicada) recalcularCalendario();
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* sin storage */ }
  subs.forEach((f) => f());
}

/** Solo para tests. */
export function resetState(s: State = empty()) {
  state = s;
  applySettings(s.settings);
  setClippingActivo(!!s.settings?.plan?.bloquesPendientes?.clipping);
  recalcularCalendario();
  aplicarLibrosPropios(s.study.librosPropios);
  subs.forEach((f) => f());
}

const subscribe = (f: () => void) => {
  subs.add(f);
  return () => subs.delete(f);
};

export function useStore<T>(sel: (s: State) => T): T {
  return useSyncExternalStore(subscribe, () => sel(state), () => sel(state));
}

/** Ola 29: los sellos "Pesar 90" y "Pesar 95" se ganaban al pasar esos kilos hacia arriba (con 110 kg ya los tenías): se sacan; los de peso nuevos siguen tu meta. */
function migrarPerfil(p: State['profile']): State['profile'] {
  const viejo = (id: string) => id === 'pesar-90' || id === 'pesar-95';
  if (!Object.keys(p.seals).some(viejo) && !p.seen.some(viejo)) return p;
  return { ...p, seals: Object.fromEntries(Object.entries(p.seals).filter(([id]) => !viejo(id))), seen: p.seen.filter((id) => !viejo(id)) };
}

/**
 * Ola 20: el sistema de libros suma Measure What Matters (si no estaba), cada actividad conocida toma
 * su área (CONAMAT, matemática) y "Python y FastAPI" se archiva. Lo estudiado no se toca.
 */
function migrateStudy(st: StudyState): StudyState {
  const mwm = emptyStudy().activities.find((a) => a.libro === 'mwm')!;
  let activities = st.activities.map((a) => {
    if (a.id === 'conamat' && !a.area) return { ...a, area: 'matematica' as const };
    // La programación pasa a aprenderse por proyectos: la lectura de Python y FastAPI se archiva (lo estudiado queda).
    if (a.id === 'prog-b1' && a.archivada === undefined) return { ...a, area: 'programacion' as const, archivada: true };
    return a;
  });
  if (!activities.some((a) => a.libro === 'mwm' || a.id === mwm.id)) activities = [...activities, mwm];
  // Ola 28: Álgebra es un libro aparte (va justo después de Aritmética).
  if (!activities.some((a) => a.id === 'conamat-algebra')) {
    const alg = emptyStudy().activities.find((a) => a.id === 'conamat-algebra')!;
    const i = activities.findIndex((a) => a.id === 'conamat');
    activities = i < 0 ? [...activities, alg] : [...activities.slice(0, i + 1), alg, ...activities.slice(i + 1)];
  }
  return { ...st, activities };
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
    const dayType = routineFor(date, { ...cfg, inicioTrabajo: inicioTrabajo(s.settings) });
    const t0 = s.settings?.startDate;
    const puerta = puertaBloqueando(date, s.plan, t0) ?? undefined;
    const ventana = ventanaW(date, t0).ahora?.id ?? puerta;
    const entrevista = entrevistaCerca(s.plan, date);
    const prepara = entrevistaEn48h(s.plan, date);
    // Ola 20: la meta de programación sale de las metas del proyecto en curso (si las hay).
    const proyecto = tramoActivo(date, t0).id;
    const delProyecto = tareasDeBloque(s.plan.metasBloque?.[proyecto]);
    // Ola 19: el estiramiento de las 21:00 a 22:00 lleva los músculos de la rutina del día.
    const estirar = plannedFor(s.train, date, t0 ?? T0_PLAN).routine?.estiramiento?.musculos;
    // Ola 31 (v7): Academy hasta el 22 dic, el sprint sin IA y las horas extra de PetrIA (solo antes del trabajo nuevo).
    const antesDelTrabajo = date < inicioTrabajo(s.settings);
    const sprint = sprintActivo(s.plan, date);
    const v7 = {
      ...(antesDelTrabajo && date <= ACADEMY_HASTA ? { academy: true } : {}),
      ...(sprint ? { sprintSinIA: { dia: sprint.dia } } : {}),
      ...(antesDelTrabajo && cfg.extraProyecto?.length ? { extraProyecto: cfg.extraProyecto } : {}),
    };
    const blocks = buildBlocks(planDay(date, routine, wake, dayType, { ventana, entrevista, puerta, prepara, ...(cfg.horarioTrabajo ? { trabajo: cfg.horarioTrabajo } : {}), ...(cfg.bloquesPendientes ? { pendientes: cfg.bloquesPendientes } : {}), ...v7 }), carry)
      .map((b) => (refs[b.key] ? { ...b, ...refs[b.key] } : b))
      .map((b) => (b.rama === 'programacion' && delProyecto.length ? { ...b, tasks: [...delProyecto.map((t) => ({ id: newId(), t: `${proyecto} · ${t}`, done: false })), ...b.tasks] } : b))
      .map((b) => (b.key === 'cierre' && estirar ? { ...b, tasks: b.tasks.map((x) => (x.t === 'Estirar' ? { ...x, t: `Estirar: ${estirar}` } : x)) } : b))
      // Ola 27: el domingo, el cierre suma la revisión semanal de 30 min y la mini-tesis de una página.
      // (el domingo del modo intensivo v7 ya tiene su bloque de revisión semanal).
      .map((b) => (b.key === 'cierre' && isoDay(date) === 7 && /^(busqueda-intensiva|con-trabajo)/.test(dayType) && dayType !== 'busqueda-intensiva-domingo' ? { ...b, tasks: [...b.tasks, ...['Revisión semanal (30 min)', 'Mini-tesis de una página'].map((t) => ({ id: newId(), t, done: false }))] } : b))
      // Ola 23: de lunes a viernes, el clipping trae las tareas del mes del roadmap; el finde, pipeline y prospección.
      .map((b) => (b.key === 'clipping' && isoDay(date) <= 5 && mesClipDe(date) >= 1 && mesClipDe(date) <= 12 ? { ...b, tasks: [...mesClipEn(date).tareas.map((t) => ({ id: newId(), t, done: false })), ...b.tasks.filter((x) => (carry.clipping ?? []).includes(x.t))] } : b));
    const day: DayLog = { date, wake, routine, dayType, ...(ventana ? { ventana } : {}), blocks, notes: [], focus: [] };
    return { ...s, days: { ...s.days, [date]: day }, carry: restCarry };
  });
}

/** Ajustes del plan con los valores de fábrica. */
export const planSettings = (st: Settings | null): PlanSettings => ({ ...DEFAULT_PLAN_SETTINGS, ...(st?.plan ?? {}) });

/** Ola 27 · el inicio del trabajo (un único campo): lo que cargaste o, si no, el supuesto del roadmap v7 (4 ene 2027 con el plan de fábrica). */
export const inicioTrabajo = (st: Settings | null): string => planSettings(st).t2 ?? addDays(st?.startDate ?? T0_PLAN, INICIO_TRABAJO_DIAS);

/** Ola 27 · ¿hay una entrevista en las próximas 48 h (hoy, mañana o pasado)? El último bloque de programación pasa a preparación. */
export function entrevistaEn48h(p: PlanState, date: string): { rol: string; empresa?: string } | false {
  const e = p.entrevistas.find((x) => x.fecha >= date && x.fecha <= addDays(date, 2));
  return e ? { rol: e.rol, ...(e.empresa ? { empresa: e.empresa } : {}) } : false;
}

/** Ola 27 · ¿rige el modo intensivo ese día? Hasta el día anterior al inicio del trabajo. */
export const intensivaEn = (st: Settings | null, date: string): boolean => planSettings(st).modo === 'busqueda-intensiva' && date < inicioTrabajo(st);

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

/** Ola 21: guarda (o borra, con el texto vacío) el enlace de un curso de idiomas. Solo https. */
export function guardarEnlaceIdioma(clave: string, url: string) {
  const u = url.trim();
  if (u && !/^https:\/\/\S+$/.test(u)) return false;
  setState((s) => {
    const enlaces = { ...s.idiomas.enlaces };
    if (u) enlaces[clave] = u;
    else delete enlaces[clave];
    return { ...s, idiomas: { ...s.idiomas, enlaces } };
  });
  return true;
}
