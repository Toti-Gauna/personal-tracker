export type Area = 'ing' | 'handyx' | 'eclipse' | 'salud' | 'rutina' | 'economia';

/** A qué motor lleva "Entrar en foco". Estudio y entreno tienen sesión propia (olas 2 y 5). */
export type BlockKind = 'estudio' | 'entreno' | 'pomodoro';

export interface Task {
  id: string;
  t: string;
  done: boolean;
}

/** Bloque del catálogo: la meta del día antes de instanciarla. */
export interface BlockTemplate {
  key: string;
  title: string;
  /** Nombre corto para frases ("Ahora toca programación"). */
  short: string;
  area: Area;
  kind: BlockKind;
  /** Duración por defecto en minutos. */
  min: number;
  /** Mínimo al que se puede acortar si es flexible (sin valor: no se acorta). */
  minMin?: number;
  /** Hora fija HH:MM; sin valor, el bloque va encadenado desde que te levantás. */
  fixed?: string;
  tasks: string[];
}

export type RoutineId = 'completo' | 'corto' | 'otra';

export interface DayRoutine {
  id: Exclude<RoutineId, 'otra'>;
  name: string;
  wake: string;
  /** Duraciones de los bloques encadenados de la mañana. */
  durations: Record<string, number>;
}

export interface Block {
  key: string;
  n: number;
  title: string;
  short: string;
  area: Area;
  kind: BlockKind;
  start: string;
  min: number;
  fixed: boolean;
  tasks: Task[];
}

export interface FocusEntry {
  key: string;
  plan: string;
  focusMin: number;
  at: string;
}

export interface DayLog {
  date: string;
  wake: string;
  routine: RoutineId;
  blocks: Block[];
  notes: string[];
  focus: FocusEntry[];
}

export interface Preset {
  id: string;
  name: string;
  focus: number;
  rest: number;
  cycles: number;
  /** Descanso largo al final de los ciclos. */
  longRest?: number;
  /** Sin cortes: un solo tramo que ocupa todo el tiempo. */
  straight?: boolean;
  builtin?: boolean;
  desc?: string;
}

export interface Settings {
  names: { me: string; partner: string };
  startDate: string;
  presets: Preset[];
  /** Preset por bloque: key del bloque → id del preset. */
  blockPresets: Record<string, string>;
}

export type SegType = 'focus' | 'rest';
export interface Seg {
  type: SegType;
  min: number;
}

export interface FocusState {
  date: string;
  key: string;
  plan: string;
  segs: Seg[];
  i: number;
  /** Epoch ms en que empezó el tramo actual (corrido por las pausas). */
  segStart: number;
  pausedAt: number | null;
}
