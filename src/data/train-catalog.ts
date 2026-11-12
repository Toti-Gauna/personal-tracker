import type { Exercise, ExKind, Routine, Step, TrainState, WeekPlan } from './train-types';

let n = 0;
const sid = (p: string) => `${p}${n++}`;
const step = (name: string, min: number): Step => ({ id: sid('s'), name, min });
const ex = (id: string, name: string, sets: number, repMin: number, repMax: number, rest: number, kind: ExKind): Exercise => ({ id, name, sets, repMin, repMax, rest, kind });

const antes = () => [step('Caminata', 30), step('Movilidad de cadera', 5)];
const despues = () => [step('Estirar', 10), step('Ducha', 15)];
const routine = (id: string, name: string, desc: string, exercises: Exercise[]): Routine => ({ id, name, desc, before: antes(), exercises, after: despues() });

/** Rutinas de partida: PPL + Upper/Lower + Full body. Se editan en Editar rutina. */
export const defaultRoutines = (): Routine[] => [
  routine('push', 'Push', 'Pecho, hombros y tríceps', [
    ex('press-banca', 'Press de banca', 3, 8, 10, 120, 'torso'),
    ex('press-inclinado', 'Press inclinado con mancuernas', 3, 8, 12, 120, 'torso'),
    ex('press-militar', 'Press militar', 3, 8, 10, 120, 'torso'),
    ex('elev-lateral', 'Elevaciones laterales', 3, 12, 15, 60, 'aislamiento'),
    ex('triceps-polea', 'Extensión de tríceps en polea', 3, 10, 12, 90, 'aislamiento'),
    ex('press-frances', 'Press francés', 3, 10, 12, 90, 'aislamiento'),
  ]),
  routine('pull', 'Pull', 'Espalda y bíceps', [
    ex('jalon', 'Jalón al pecho', 4, 6, 10, 120, 'torso'),
    ex('remo-barra', 'Remo con barra', 3, 8, 10, 120, 'torso'),
    ex('remo-polea', 'Remo en polea', 3, 10, 12, 90, 'torso'),
    ex('face-pull', 'Face pull', 3, 12, 15, 60, 'aislamiento'),
    ex('curl-barra', 'Curl con barra', 3, 8, 10, 90, 'aislamiento'),
    ex('curl-martillo', 'Curl martillo', 3, 10, 12, 60, 'aislamiento'),
  ]),
  routine('legs', 'Piernas', 'Cuádriceps, femorales y gemelos', [
    ex('sentadilla', 'Sentadilla', 4, 6, 8, 180, 'pierna'),
    ex('pm-rumano', 'Peso muerto rumano', 3, 8, 10, 120, 'pierna'),
    ex('prensa', 'Prensa', 3, 10, 12, 120, 'pierna'),
    ex('curl-femoral', 'Curl femoral', 3, 12, 12, 90, 'aislamiento'),
    ex('extension', 'Extensión de cuádriceps', 3, 12, 12, 90, 'aislamiento'),
    ex('gemelos', 'Gemelos de pie', 4, 12, 15, 60, 'aislamiento'),
  ]),
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

export const REST_DAY = 'descanso';
export const REST_DAY_MIN = 45;

export const PLANS: Record<'ppl' | 'full', (string | null)[]> = {
  ppl: ['push', 'pull', 'legs', 'upper', 'lower', 'full', REST_DAY],
  full: ['full', REST_DAY, 'full', REST_DAY, 'full', REST_DAY, REST_DAY],
};

export const TEMPLATE_LABEL = { ppl: 'PPL + UL', full: 'Full body ×3', propia: 'Propia' } as const;
export const PLAN_NAME = { ppl: 'PPL + Upper / Lower', full: 'Full body ×3', propia: 'tu plan' } as const;

export const defaultPlan = (): WeekPlan => ({ template: 'ppl', days: [...PLANS.ppl] });

export const emptyTrain = (): TrainState => ({
  routines: defaultRoutines(),
  plan: defaultPlan(),
  sessions: [],
  weights: [],
  goalKg: 95,
  active: null,
  leftovers: {},
  lastId: null,
  ranges: {},
  dismissed: [],
});

/** Reglas del motor (ver Motor de entreno). */
export const RULES = {
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
