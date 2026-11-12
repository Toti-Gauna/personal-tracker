/** Tipo de ejercicio: define cuánto sube el peso. */
export type ExKind = 'pierna' | 'torso' | 'aislamiento';

export interface Exercise {
  id: string;
  name: string;
  sets: number;
  repMin: number;
  repMax: number;
  /** Descanso entre series, en segundos. */
  rest: number;
  kind: ExKind;
}

export interface Step {
  id: string;
  name: string;
  min: number;
}

export interface Routine {
  id: string;
  name: string;
  desc: string;
  before: Step[];
  exercises: Exercise[];
  after: Step[];
}

export type Who = 'me' | 'partner';
export type Template = 'ppl' | 'full' | 'propia';

export interface WeekPlan {
  template: Template;
  /** Lunes a domingo: id de rutina, 'descanso' (caminar) o null. */
  days: (string | null)[];
}

export interface SetLog {
  ex: string;
  who: Who;
  /** Número de serie, desde 1. */
  i: number;
  kg: number;
  reps: number;
}

export interface TrainRecord {
  who: Who;
  ex: string;
  name: string;
  kg: number;
  reps: number;
  text: string;
}

export interface TrainSession {
  id: string;
  date: string;
  routineId: string;
  routineName: string;
  /** Minutos que duró. */
  minutes: number;
  athletes: Who[];
  sets: SetLog[];
  /** Ejercicios que no se llegaron a hacer. */
  skipped: string[];
  deload: boolean;
  note: string;
  records: TrainRecord[];
}

export interface RestTimer {
  endsAt: number;
  /** Cuánto duraba, para la barra. */
  total: number;
  /** Se avisó que terminó. */
  warned?: boolean;
}

export interface ActiveSession {
  routineId: string;
  date: string;
  startedAt: number;
  athletes: Who[];
  /** Ejercicios en el orden de hoy (los que quedaron del último entreno, primero). */
  order: string[];
  idx: number;
  /** Lo hecho: serie a serie. */
  sets: SetLog[];
  /** Lo que se está por cargar para cada uno. */
  draft: Partial<Record<Who, { kg: number; reps: number }>>;
  who: Who;
  restMode: 'shared' | 'each';
  rest: { shared?: RestTimer } & Partial<Record<Who, RestTimer>>;
  limitMin: number;
  noLimit: boolean;
  deload: boolean;
}

export interface Weigh {
  date: string;
  kg: number;
}

export interface TrainState {
  routines: Routine[];
  plan: WeekPlan;
  sessions: TrainSession[];
  weights: Weigh[];
  goalKg: number;
  active: ActiveSession | null;
  /** Ejercicios que quedaron sin hacer, por rutina. */
  leftovers: Record<string, string[]>;
  /** Último entreno guardado, para el resumen. */
  lastId: string | null;
  /** Rangos propios de cada uno: "who:ejercicio" → [mín, máx]. */
  ranges: Record<string, [number, number]>;
  /** Semanas en que se descartó el aviso de ajuste. */
  dismissed: string[];
}
