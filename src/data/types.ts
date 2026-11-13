import type { RoadmapPart } from './roadmap.schema';
import type { Tramo } from './study-types';

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
  /** Abre una sesión de foco (sin valor: sí). */
  focus?: boolean;
  tasks: string[];
}

export type RoutineId = 'completo' | 'corto' | 'otra';


/** Vínculo opcional con un ítem del roadmap (data/roadmap.json). */
export interface RoadmapLink {
  /** Id del ítem, por ejemplo "b1-conamat-arit-03". */
  ref?: string;
  /** Qué parte del ítem es: aprender, test, construir o cerrar. */
  part?: RoadmapPart;
}

/** Meta del día. Con `ref` y `part` queda atada a un ítem del roadmap. */
export interface Block extends RoadmapLink {
  key: string;
  n: number;
  title: string;
  short: string;
  area: Area;
  kind: BlockKind;
  start: string;
  min: number;
  fixed: boolean;
  /** Abre una sesión de foco (sin valor: sí). */
  focus?: boolean;
  tasks: Task[];
}

export interface FocusEntry {
  key: string;
  plan: string;
  focusMin: number;
  at: string;
}

export interface StudyLog {
  front: string;
  activityId: string;
  min: number;
}

export interface DayLog {
  date: string;
  wake: string;
  /** Modo del modal "Buen día": 04:00 completo, 05:00 corto u otra hora. */
  routine: RoutineId;
  /** Rutina del día de la semana: lunes a viernes o fin de semana. */
  dayType?: 'weekday' | 'weekend';
  blocks: Block[];
  notes: string[];
  focus: FocusEntry[];
  /** Minutos de estudio por frente (para el gráfico de la semana). */
  study?: StudyLog[];
  /** Pasos de estudio hechos hoy (rev:…, learn:…, test:…). */
  studyDone?: string[];
  /** El cierre del día. */
  closed?: { at: string; xp: number; score: number; victoria: string; manana: string };
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

export type SoundEvent = 'pomodoro' | 'descanso' | 'entreno' | 'tarea' | 'sello';
export type SoundId = 'campana' | 'madera' | 'pitidos' | 'marcador' | 'goma';

export interface SoundSettings {
  events: Record<SoundEvent, SoundId>;
  /** 0 a 100. */
  volume: number;
  vibrate: boolean;
}

export interface Alarm {
  id: string;
  time: string;
  title: string;
  on: boolean;
}

export interface Settings {
  names: { me: string; partner: string };
  sounds?: SoundSettings;
  alarms?: Alarm[];
  /** Nombres propios de las áreas. */
  areaNames?: Partial<Record<Area, string>>;
  /** Último respaldo descargado (fecha). */
  lastBackup?: string;
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
  /** Sesión de estudio: un tramo por segmento, con su paso y su referencia. */
  tramos?: Tramo[];
  /** Actividad de la sesión de estudio, o 'repaso' para el repaso del día. */
  activityId?: string;
}
