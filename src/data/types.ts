import type { RoadmapPart } from './roadmap.schema';
import type { Tramo } from './study-types';

export type Area = 'ing' | 'handyx' | 'eclipse' | 'salud' | 'rutina' | 'economia';

/**
 * Ramas del plan T+18: seis roadmaps que salen de main (Trazo) en T0 y vuelven en T+18.
 * "main" es Trazo mismo (rutina de la mañana, cierre).
 */
export type Rama = 'programacion' | 'matematica' | 'trabajo' | 'ingles' | 'handyx' | 'salud';
export type RamaOMain = Rama | 'main';

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
  /** Rama del plan T+18 ("main" = Trazo); sin valor, fuera del plan. */
  rama?: RamaOMain;
  tasks: string[];
}

/** Modo del Buen día: 04:00 completo, 05:00 corto, 08:00 tarde (ola 17) u otra hora. */
export type RoutineId = 'completo' | 'corto' | 'tarde' | 'otra';


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
  /** Rama del plan T+18 ("main" = Trazo); sin valor, fuera del plan. */
  rama?: RamaOMain;
  tasks: Task[];
  /** Ola 25: dado por hecho a mano (aunque queden submetas), con lo que hiciste en ese tiempo. */
  hecho?: { at: string; nota?: string };
  /** Ola 25: salteado hoy (no cuenta en la mejora). */
  salteado?: boolean;
  /** Ola 25: meta sumada hoy desde Hoy (no viene de la rutina). */
  propia?: boolean;
  /** Ola 25: horario cambiado hoy. */
  editado?: boolean;
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
  /** Rutina del día: lunes a viernes, fin de semana, con trabajo o día libre. */
  dayType?: 'weekday' | 'weekend' | 'con-trabajo' | 'con-trabajo-finde' | 'libre' | 'busqueda-intensiva' | 'busqueda-intensiva-finde' | 'busqueda-intensiva-domingo';
  /** Ventana de matemática del plan si cayó ese día ("W1"). */
  ventana?: string;
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
  /** Plan T+18: rutina activa, día libre, T+2 y umbrales de Handyx. */
  plan?: Partial<import('./plan-state').PlanSettings>;
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
  /** Epoch ms en que empezó el foco (los guardados antes de la ola 14 no lo tienen). */
  startedAt?: number;
  pausedAt: number | null;
  /** Sesión de estudio: un tramo por segmento, con su paso y su referencia. */
  tramos?: Tramo[];
  /** Actividad de la sesión de estudio, o 'repaso' para el repaso del día. */
  activityId?: string;
}

// Tipos del plan T+18 (definidos junto a sus datos en plan.ts).
export type {
  Capa, CorteHandyx, Entrega, Entrevista, EstadoPostulacion, EventoRama, Hito, MetaAnio, MetaBimestre, MetaGenerada, Postulacion, Proyecto, RespuestaEnsayada,
} from './plan';
