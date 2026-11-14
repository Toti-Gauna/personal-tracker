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
}

export const emptyPlan = (): PlanState => ({
  entrevistas: [], postulaciones: [], contadores: {},
  respuestas: PLAN.ingles.respuestas.map((texto, i) => ({ id: `r${i + 1}`, texto, veces: 0 })),
  fallasIngles: [], proyectos: {}, handyx: {}, eventos: [], meses: {}, semanas: {}, editadas: {}, importaciones: [],
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
}

export const DEFAULT_PLAN_SETTINGS: PlanSettings = { rutina: 'busqueda', diaLibre: 2, umbralIngreso: '', horasMaximas: '' };
