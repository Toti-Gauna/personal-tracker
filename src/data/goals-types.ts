import type { Area } from './types';

export type Horizon = 'dia' | 'semana' | 'mes' | 'bim' | 'anio';
export type GoalType = 'tarea' | 'contador' | 'numero';

/** De dónde sale el avance si no se suma a mano. */
export type AutoSource =
  | { kind: 'tests' }
  | { kind: 'horas'; front: string }
  | { kind: 'actividad'; id: string };

export interface Goal {
  id: string;
  title: string;
  area: Area;
  /** Encabezado del grupo (por ejemplo "Trabajo nuevo"); sin valor, el nombre del área. */
  group?: string;
  horizon: Horizon;
  type: GoalType;
  /** Cuánto hay que llegar a (1 para una tarea). */
  target: number;
  unit?: string;
  /** Cuánto suma el botón +. */
  step?: number;
  /** Una nota debajo del título (metas del año). */
  note?: string;
  /** Si se repite cada día, semana o mes; bimestre y año no. */
  repeat: boolean;
  /** Período en que empieza (la clave del día, semana, mes, bimestre o año). */
  from: string;
  /** Avance por período (clave → valor). Lo automático no se guarda. */
  progress: Record<string, number>;
  auto?: AutoSource;
  /** Aparece en Hoy como botón para sumar rápido. */
  quick?: boolean;
  /** Cómo se llama el botón de Hoy ("Entrené"); sin valor, el título. */
  quickLabel?: string;
}

export interface GoalsState {
  goals: Goal[];
  /** Nombres de bimestres renombrados: número → nombre. */
  bimesterNames: Record<number, string>;
}
