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
}

export interface UnitState {
  learnedOn?: string;
  approvedOn?: string;
  tests: TestResult[];
}

/** Lo que vuelve en el repaso: escalera 0 → +1 cold recall → +3 tesis → +7 → +21 → +60. */
export type ReviewKind = 'cold' | 'tesis' | 'ejercicios' | 'examen' | 'retest';

export interface ReviewItem {
  id: string;
  activityId: string;
  unit?: number;
  kind: ReviewKind;
  due: string;
  min: number;
  label: string;
  doneOn?: string;
}

export interface CardDraft {
  front: string;
  back: string;
  kind: 'pregunta' | 'completar';
}

export interface Card extends CardDraft {
  id: string;
  deck: string;
  source: string;
  createdOn: string;
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
}

/** Paso de la sesión de estudio: Repasar → Aprender → Comprobar (y al final, Cerrar). */
export type Step = 'repasar' | 'aprender' | 'comprobar';
export type TramoKind = 'cold' | 'tesis' | 'ejercicios' | 'examen' | 'capitulo' | 'descanso' | 'test';

export interface Tramo {
  step: Step;
  kind: TramoKind;
  title: string;
  sub: string;
  min: number;
  /** Referencia para marcarlo hecho: rev:<id>, learn:<act>:<n>, test:<act>:<n>. */
  ref: string;
  activityId: string;
  paper?: boolean;
}
