import { ENTRENO, rutinaDeJson } from './entreno-rutinas';
import type { Exercise, ExKind, Routine, Step, TrainState, WeekPlan } from './train-types';

let n = 0;
const sid = (p: string) => `${p}${n++}`;
const step = (name: string, min: number): Step => ({ id: sid('s'), name, min });
const ex = (id: string, name: string, sets: number, repMin: number, repMax: number, rest: number, kind: ExKind): Exercise => ({ id, name, sets, repMin, repMax, rest, kind });

const antes = () => [step('Caminata', 30), step('Movilidad de cadera', 5)];
const despues = () => [step('Estirar', 10), step('Ducha', 15)];
const routine = (id: string, name: string, desc: string, exercises: Exercise[]): Routine => ({ id, name, desc, before: antes(), exercises, after: despues() });

/**
 * Ola 19 · las rutinas de Toti (data/entreno.json): Push, Pull y Legs en versión A y B. Se alternan por
 * semana (semanas impares del plan, la A; pares, la B). Upper, Lower y Full body siguen como estaban.
 */
export const rutinasDeToti = (): Routine[] => ENTRENO.rutinas.map((r) => rutinaDeJson(r, (p) => sid(p)));

/** Rutinas de partida: las de Toti + Upper/Lower + Full body. Se editan en Editar rutina. */
export const defaultRoutines = (): Routine[] => [
  ...rutinasDeToti(),
  routine('upper', 'Upper', 'Torso completo, más volumen', [
    ex('u-inclinado', 'Press inclinado', 4, 6, 8, 120, 'torso'),
    ex('u-remo', 'Remo con barra', 4, 6, 8, 120, 'torso'),
    ex('u-militar', 'Press militar', 3, 8, 10, 120, 'torso'),
    ex('u-jalon', 'Jalón al pecho', 3, 10, 12, 90, 'torso'),
    ex('u-curl', 'Curl con mancuernas', 3, 10, 12, 60, 'aislamiento'),
    ex('u-triceps', 'Tríceps en polea', 3, 10, 12, 60, 'aislamiento'),
  ]),
  routine('lower', 'Lower', 'Piernas con foco en cadera', [
    ex('l-pm', 'Peso muerto', 3, 5, 6, 180, 'pierna'),
    ex('l-hip', 'Hip thrust', 4, 8, 10, 120, 'pierna'),
    ex('l-bulgara', 'Sentadilla búlgara', 3, 8, 10, 120, 'pierna'),
    ex('l-curl', 'Curl femoral', 3, 10, 12, 90, 'aislamiento'),
    ex('l-gemelos', 'Gemelos', 4, 12, 15, 60, 'aislamiento'),
  ]),
  routine('full', 'Full body', 'Si te atrasaste: 1 o 2 días cubren la semana', [
    ex('f-sentadilla', 'Sentadilla', 3, 6, 8, 150, 'pierna'),
    ex('f-banca', 'Press de banca', 3, 6, 8, 120, 'torso'),
    ex('f-remo', 'Remo con barra', 3, 8, 10, 120, 'torso'),
    ex('f-militar', 'Press militar', 3, 8, 10, 90, 'torso'),
    ex('f-rumano', 'Peso muerto rumano', 2, 8, 10, 120, 'pierna'),
    ex('f-jalon', 'Jalón al pecho', 3, 10, 12, 90, 'torso'),
  ]),
];

/** Versión del estado de entreno: 2 = rutinas de Toti (ola 19). */
export const ENTRENO_V = 2;

export const REST_DAY = 'descanso';
export const REST_DAY_MIN = 45;

/**
 * Lunes a domingo. PPL + Upper/Lower: lunes Pull, martes Legs, miércoles Push, jueves Upper y viernes
 * Lower; sábado y domingo son libres. 'pull', 'legs' y 'push' son el día: cada semana toca la A o la B.
 */
export const PLANS: Record<'ppl' | 'full', (string | null)[]> = {
  ppl: ['pull', 'legs', 'push', 'upper', 'lower', null, null],
  full: ['full', REST_DAY, 'full', REST_DAY, 'full', REST_DAY, REST_DAY],
};

/**
 * Ola 19: pasa el entreno guardado a las rutinas de Toti. Las de partida de la ola 5 (Push, Pull y Piernas)
 * se archivan con su historial y las nuevas (A y B) las reemplazan en la semana. No se borra nada.
 */
export function migrarEntreno(t: TrainState): TrainState {
  if ((t.v ?? 1) >= ENTRENO_V) return t;
  const VIEJAS = ['push', 'pull', 'legs'];
  const nuevo = (id: string) => `viejo-${id}`;
  const routines = t.routines.map((r) => (VIEJAS.includes(r.id) && !r.slot ? { ...r, id: nuevo(r.id), archivada: true } : r));
  const faltan = rutinasDeToti().filter((r) => !routines.some((x) => x.id === r.id));
  return {
    ...t,
    v: ENTRENO_V,
    routines: [...routines, ...faltan],
    // La plantilla de fábrica pasa a la semana nueva; una semana propia conserva sus días (push, pull y legs ya son los nuevos).
    plan: t.plan.template === 'ppl' ? defaultPlan() : t.plan,
    sessions: t.sessions.map((s) => (VIEJAS.includes(s.routineId) ? { ...s, routineId: nuevo(s.routineId) } : s)),
    active: t.active && VIEJAS.includes(t.active.routineId) ? { ...t.active, routineId: nuevo(t.active.routineId) } : t.active,
    leftovers: Object.fromEntries(Object.entries(t.leftovers).map(([k, v]) => [VIEJAS.includes(k) ? nuevo(k) : k, v])),
  };
}

export const TEMPLATE_LABEL = { ppl: 'PPL + UL', full: 'Full body ×3', propia: 'Propia' } as const;
export const PLAN_NAME = { ppl: 'PPL + Upper / Lower', full: 'Full body ×3', propia: 'tu plan' } as const;

export const defaultPlan = (): WeekPlan => ({ template: 'ppl', days: [...PLANS.ppl] });

export const emptyTrain = (): TrainState => ({
  v: ENTRENO_V,
  routines: defaultRoutines(),
  plan: defaultPlan(),
  sessions: [],
  weights: [],
  runs: [],
  medidas: [],
  pesoPreguntado: [],
  goalKg: 95,
  active: null,
  leftovers: {},
  lastId: null,
  ranges: {},
  dismissed: [],
});

/** Reglas del motor (ver Motor de entreno). */
export const RULES = {
  /** El bloque de entreno son 2 h de entrenamiento (más 30 min de caminata de ida y 30 de vuelta). */
  limiteMin: 120,
  /** Cuánto sube el peso al llegar al tope, por tipo (kg). */
  inc: { pierna: 5, torso: 2.5, aislamiento: 1 } as Record<ExKind, number>,
  /** Sesiones iguales seguidas: con 2 se mantiene, con 3 baja. */
  holdAt: 2,
  dropAt: 3,
  dropPct: 0.1,
  deloadEvery: 6,
  /** Segundos que lleva una serie de trabajo, con preparación y series de aproximación. */
  setSec: 100,
};
