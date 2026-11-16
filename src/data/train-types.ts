/** Tipo de ejercicio: define cuánto sube el peso. */
export type ExKind = 'pierna' | 'torso' | 'aislamiento';

/** Lo que explica un ejercicio (ola 19): cómo se hace, qué trabaja y para qué. Todo opcional. */
export interface ExInfo {
  /** "2-1-2": segundos de bajada, pausa y subida. */
  tempo?: string;
  tempoDesc?: string;
  /** Guía de posicionamiento. */
  posicion?: string;
  /** Guía de RIR: cómo se siente cada serie. */
  rirGuia?: string;
  parciales?: string;
  dropset?: string;
  tips?: string;
  musculos?: string;
  objetivo?: string;
}

export interface Exercise extends ExInfo {
  id: string;
  name: string;
  sets: number;
  repMin: number;
  repMax: number;
  /** Descanso entre series, en segundos. */
  rest: number;
  kind: ExKind;
  /** Grupo muscular del que sale ("Pecho"). */
  grupo?: string;
  /** RIR objetivo de cada serie ([2, 1, 0]). */
  rir?: number[];
  /** Con qué peso arrancás si todavía no hay historial. */
  pesoInicial?: number;
  /** Se puede hacer sin peso (dominadas, dead hang): el peso 0 vale. */
  corporal?: boolean;
  /** 's': lo que se cuenta son segundos, no repeticiones. */
  unidad?: 's';
  /** Aclaración que va debajo del nombre ("10 kg por mano"). */
  nota?: string;
}

/** Un paso del calentamiento: se tilda en la sesión, no lleva kilos. */
export interface Calentamiento extends ExInfo {
  id: string;
  name: string;
  sets?: number;
  /** "15–20". */
  reps?: string;
  rir?: number[];
  /** Cuánto dura, en minutos. */
  min: number;
  /** Lo que se hace, si no son series ("Velocidad 3.5 — Inclinación máxima"). */
  detalle?: string;
  pasos?: string[];
}

export interface Estiramiento {
  min: number;
  /** Músculos del día: pasan al bloque de las 21:00 a 22:00. */
  musculos: string;
  guia?: string;
  objetivo?: string;
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
  /** Ola 19: el día al que pertenece ('push'); con variante A y B, se alternan por semana. */
  slot?: string;
  variante?: 'A' | 'B';
  calentamiento?: Calentamiento[];
  estiramiento?: Estiramiento;
  /** Rutinas de la ola 5 que ya no se usan: se guardan para el historial. */
  archivada?: boolean;
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
  /** Ola 19: el RIR que te quedó (opcional). */
  rir?: number;
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
  draft: Partial<Record<Who, { kg: number; reps: number; rir?: number }>>;
  /** Ola 19: pasos del calentamiento ya tildados. */
  warmDone?: string[];
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

export type RunKind = 'suave' | 'fondo' | 'series';
export const RUN_KINDS: RunKind[] = ['suave', 'fondo', 'series'];

/** Una corrida: una por día (si cargás otra el mismo día, reemplaza). */
export interface Run {
  date: string;
  min: number;
  km?: number;
  kind: RunKind;
  /** Cómo te sentiste, de 1 (muy mal) a 5 (muy bien). */
  feel: 1 | 2 | 3 | 4 | 5;
}

/** Medidas en cm, una vez por mes. Todas opcionales. */
export interface Medida {
  date: string;
  cintura?: number;
  pecho?: number;
  brazo?: number;
}

export interface TrainState {
  /** Ola 19: 2 = rutinas de Toti (Push, Pull y Legs A y B). Sin valor, estado de antes. */
  v?: number;
  routines: Routine[];
  plan: WeekPlan;
  sessions: TrainSession[];
  weights: Weigh[];
  /** Corridas registradas (ola 13). */
  runs: Run[];
  /** Medidas mensuales (ola 13). */
  medidas: Medida[];
  /** Días en que ya se preguntó el peso al entrar a Entreno, se haya cargado o saltado. */
  pesoPreguntado: string[];
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
