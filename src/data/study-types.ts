import type { Srs } from './fsrs';
import type { Area } from './types';

export interface Front {
  id: string;
  name: string;
  color: Area;
}

export type ActType = 'lectura' | 'curso' | 'practica' | 'video' | 'otra';

/** Unidad de un libro o curso con test (un capítulo de CONAMAT, un bloque de un curso). */
export interface Unit {
  n: number;
  title: string;
  test: { count: number; desc: string; min: number };
}

export interface Activity {
  id: string;
  title: string;
  front: string;
  type: ActType;
  /** Cuánto avanzás por sesión y el total, en `unit`. */
  perSession: number;
  total: number;
  unit: string;
  /** Días de la semana: 0 = lunes … 6 = domingo. */
  days: number[];
  /** Bloque del día donde entra (key de BLOCKS). */
  block: string;
  /** Pasa por el motor de repaso (cold recall al día siguiente). */
  engine: boolean;
  /** Avance acumulado en `unit` (actividades sin unidades). */
  progress: number;
  /** Unidades con test: CONAMAT, cursos del roadmap. */
  units?: Unit[];
  /** "Cap." o "Unidad". */
  unitLabel?: string;
  /** Examen final del bimestre. */
  final?: { title: string; desc: string };
  testMode: 'app' | 'papel';
  /** Pomodoro para estudiar el capítulo (id de preset). Sin valor, 50/10. */
  pomodoro?: string;
}

export type ErrType = 'concepto' | 'tecnica' | 'descuido' | 'enunciado';
export const ERR_TYPES: ErrType[] = ['concepto', 'tecnica', 'descuido', 'enunciado'];

export interface TestResult {
  date: string;
  score: number;
  total: number;
  errors: Record<ErrType, number>;
  mode: 'app' | 'papel';
  approved: boolean;
  /** Por ejercicio, en papel: null = bien, o el tipo de error. */
  perEx?: (ErrType | null)[];
  /** Los ejercicios que fallaste (con su consigna y respuesta): la tesis arranca por acá. */
  wrong?: { q: string; a: string; type: ErrType }[];
}

export interface UnitState {
  learnedOn?: string;
  approvedOn?: string;
  tests: TestResult[];
}

/** Lo que vuelve en el repaso: escalera 0 → +1 cold recall → +3 tesis → +7 → +21 → +60. */
export type ReviewKind = 'cold' | 'tesis' | 'ejercicios' | 'examen' | 'retest' | 'releer';

export interface ReviewItem {
  id: string;
  activityId: string;
  unit?: number;
  kind: ReviewKind;
  due: string;
  min: number;
  label: string;
  doneOn?: string;
  /** Cold recall: % de puntos recordados. */
  score?: number;
  /** Ejercicios: salieron perfectos. */
  perfect?: boolean;
}

export type CardKind = 'pregunta' | 'completar' | 'explicar' | 'ejercicio' | 'inversa';

export interface CardDraft {
  front: string;
  back: string;
  kind: CardKind;
}

export interface Card extends CardDraft {
  id: string;
  deck: string;
  source: string;
  createdOn: string;
  /** Frente (id) al que pertenece; las de la ola 2 se resuelven por el nombre del mazo. */
  frontId?: string;
  /** Unidad de origen, para agendar la relectura. */
  activityId?: string;
  unit?: number;
  /** Estado FSRS; sin valor, es nueva. */
  srs?: Srs;
  /** Día del primer repaso (para el tope de nuevas por día). */
  firstOn?: string;
  /** No entra antes de este día (lo olvidado en un cold recall vuelve mañana). */
  dueFrom?: string;
}

export interface CardLog {
  cardId: string;
  date: string;
  grade: 1 | 2 | 3 | 4;
}

/** Reglas del motor, ajustables en Motor de repaso. */
export interface Rules {
  /** Tope de repaso por día, en minutos. */
  cap: number;
  /** Retención buscada (FSRS). */
  retention: number;
  newPerDay: number;
  /** Releer si el cold recall da menos de esto (0..1). */
  rereadBelow: number;
  /** Si el cold recall da esto o más, no hay relectura ni tarjetas de lo olvidado. */
  coldSkipAt: number;
  /** Ejercicios espaciados más cortos si el anterior salió perfecto. */
  shortenIfPerfect: boolean;
}

export interface Tesis {
  itemId: string;
  activityId: string;
  unit?: number;
  text: string;
  mode: 'app' | 'papel';
  savedOn: string;
  practice: boolean[];
}

export interface StudyState {
  fronts: Front[];
  activities: Activity[];
  units: Record<string, Record<number, UnitState>>;
  reviews: ReviewItem[];
  tesis: Tesis[];
  cards: Card[];
  rules: Rules;
  log: CardLog[];
  /** Puntos clave por unidad (act:n), para comparar el cold recall. */
  points: Record<string, string[]>;
}

/**
 * Fase de un capítulo: Estudiar (de corrido) → Test (completo) → Tesis (+3) → Repetir (+1 → +60).
 * En el día va primero lo que vence (repetir y tesis), después estudiar y al final el test.
 */
export type Step = 'repetir' | 'estudiar' | 'test';
export type TramoKind = 'cold' | 'tesis' | 'ejercicios' | 'examen' | 'releer' | 'tarjetas' | 'capitulo' | 'descanso' | 'test';

export interface Tramo {
  step: Step;
  kind: TramoKind;
  title: string;
  sub: string;
  /** Cómo se nombra en la lista de Estudio (si difiere del título de la sesión). */
  paso?: string;
  min: number;
  /** Referencia para marcarlo hecho: rev:<id>, learn:<act>:<n>, test:<act>:<n>. */
  ref: string;
  activityId: string;
  paper?: boolean;
}
