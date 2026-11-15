/**
 * Lo que se registra del plan T+18: arranca en cero y crece con el uso (Hoy, las pantallas de
 * cada rama y la importación de JSON). Nada de esto viene con números de ejemplo.
 */
import type { Capa, Entrevista, EventoRama, MetaGenerada, Postulacion, RespuestaEnsayada } from './plan';
import { PLAN } from './plan';
import type { Rama } from './types';

export type TipoError = 'concepto' | 'tecnica' | 'descuido';

export interface ProyectoEstado {
  estandar: Partial<Record<Capa, boolean>>;
  /** Minutos registrados por categoría. */
  tiempo: { nucleo: number; producto: number; lanzamiento: number };
  revisiones: { fecha: string; texto: string; tipo: TipoError }[];
  examen?: { fecha: string; puntaje: number };
}

export interface HandyxSemana {
  horas?: number;
  operaciones?: number;
  prestadores?: number;
  clientes?: number;
  ingresos?: number;
  margen?: number;
}

export interface Importacion {
  fecha: string;
  importado: string;
  tipo: string;
  rama: Rama;
  resumen: string[];
}

/**
 * Una rama o un área en pausa ("stand-by" en pantalla): no aparece en Hoy ni genera avisos,
 * metas ni contadores nuevos, pero nada se borra. `guardado` es una foto de lo que había al
 * pausar, por si hace falta comparar al retomar.
 */
export interface Pausa {
  id: string;
  objetivo: 'handyx' | 'ventas' | string;
  desde: string;
  hasta?: string;
  motivo: string;
  guardado: unknown;
}

export interface PlanState {
  entrevistas: Entrevista[];
  postulaciones: Postulacion[];
  /** Contadores de la semana del plan (postulaciones, mensajes, posts…): lunes → id → n. */
  contadores: Record<string, Record<string, number>>;
  respuestas: RespuestaEnsayada[];
  /** Lo que falló en entrevistas o simulacros de inglés (también entra como tarjeta). */
  fallasIngles: { fecha: string; texto: string; tipo: string }[];
  proyectos: Record<string, ProyectoEstado>;
  /** Handyx por semana: lunes → números de la semana. */
  handyx: Record<string, HandyxSemana>;
  /** Lo que se registró en cada rama (alimenta el mapa). */
  eventos: EventoRama[];
  /** Metas del mes generadas desde el plan y confirmadas: "AAAA-MM" → metas. */
  meses: Record<string, { confirmado?: string; metas: MetaGenerada[] }>;
  /** Metas de la semana: lunes → metas. */
  semanas: Record<string, { confirmado?: string; metas: MetaGenerada[] }>;
  /** Metas de bimestre y año editadas: "b1-programacion", "anio1-salud" → texto. */
  editadas: Record<string, string>;
  importaciones: Importacion[];
  /** Pausas (stand-by): las abiertas no tienen "hasta". */
  pausas: Pausa[];
  /** Hitos marcados como hechos o movidos de fecha: id → estado. */
  hitos: Record<string, { hecho?: string; fecha?: string }>;
}

export const emptyPlan = (): PlanState => ({
  entrevistas: [], postulaciones: [], contadores: {},
  respuestas: PLAN.ingles.respuestas.map((texto, i) => ({ id: `r${i + 1}`, texto, veces: 0 })),
  fallasIngles: [], proyectos: {}, handyx: {}, eventos: [], meses: {}, semanas: {}, editadas: {}, importaciones: [], pausas: [], hitos: {},
});

export const proyectoVacio = (): ProyectoEstado => ({ estandar: {}, tiempo: { nucleo: 0, producto: 0, lanzamiento: 0 }, revisiones: [] });

/** Ajustes del plan (Ajustes → Plan T+18). */
export interface PlanSettings {
  /** Rutina de lunes a viernes: buscando trabajo o con trabajo (desde T+2). */
  rutina: 'busqueda' | 'con-trabajo';
  /** Día ISO libre (2 = martes); null, ninguno. */
  diaLibre: number | null;
  /** Fecha en que marcaste T+2 (trabajo nuevo). */
  t2?: string;
  /** Umbrales de la decisión de Handyx: los escribe el usuario. */
  umbralIngreso: string;
  horasMaximas: string;
  /**
   * Modo de la semana. "busqueda-intensiva": rutinas de búsqueda intensiva, sin día libre, con
   * Handyx y ventas en pausa. null: el plan normal. Sin valor: todavía no se decidió (la
   * migración lo activa, porque es la prioridad desde T0).
   */
  modo?: 'busqueda-intensiva' | null;
  /** La rutina y el día libre de antes de activar el modo, para volver exactamente a ellos. */
  previo?: { rutina: 'busqueda' | 'con-trabajo'; diaLibre: number | null };
}

/** Pausas que abre la búsqueda intensiva. */
export const PAUSAS_INTENSIVA = ['handyx', 'ventas'] as const;

/** ¿Está en pausa ese objetivo (rama o área) en una fecha? */
export const enPausa = (p: Pick<PlanState, 'pausas'>, objetivo: string, fecha: string) =>
  (p.pausas ?? []).some((x) => x.objetivo === objetivo && x.desde <= fecha && (!x.hasta || x.hasta > fecha));

/** La pausa abierta de un objetivo. */
export const pausaAbierta = (p: Pick<PlanState, 'pausas'>, objetivo: string) => (p.pausas ?? []).find((x) => x.objetivo === objetivo && !x.hasta);

export const DEFAULT_PLAN_SETTINGS: PlanSettings = { rutina: 'busqueda', diaLibre: 2, umbralIngreso: '', horasMaximas: '' };
