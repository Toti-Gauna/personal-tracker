/**
 * Hitos por rama (Ola 8b): no solo commits. Un hito grande cierra un proyecto, un libro o una
 * etapa; los de main son T+0, T+2 y T+18. Se guardan como días desde T0 (no como fechas) para
 * que, si cambia el inicio del plan en Ajustes, se muevan todos juntos.
 *
 * Las fechas de búsqueda (entrevista, etapa técnica, T+2) son metas, no promesas: si pasan sin
 * cumplirse, el hito queda "vencido" y Trazo propone una fecha nueva; no se borra.
 */
import { T0_PLAN } from './plan';
import type { PlanState } from './plan-state';
import { addDays } from './time';
import type { Rama } from './types';

export type RamaMapa = Rama | 'clipping';
export type TipoHito = 'commit' | 'grande' | 'main';

export interface HitoRama {
  id: string;
  rama: RamaMapa | 'main';
  /** Días desde T0 (0 = el lunes de T0). */
  dia: number;
  texto: string;
  tipo: TipoHito;
  /** La rama que le entrega a esta (se dibuja una flecha). */
  desde?: Rama;
}

/** Los 26 hitos iniciales, del 16 nov 2026 al 15 feb 2027. */
export const HITOS: HitoRama[] = [
  { id: 'main-0', rama: 'main', dia: 0, texto: 'T+0 · arranca, Handyx y Eclipse en stand-by', tipo: 'main' },
  { id: 'salud-0', rama: 'salud', dia: 0, texto: 'Medición inicial · rumbo a 95 kg', tipo: 'commit' },
  { id: 'handyx-0', rama: 'handyx', dia: 0, texto: 'Stand-by: backlog y cortes congelados', tipo: 'commit' },
  { id: 'matematica-1', rama: 'matematica', dia: 1, texto: 'Aritmética · test del cap. 1', tipo: 'commit' },
  { id: 'ingles-6', rama: 'ingles', dia: 6, texto: 'Primer simulacro de entrevista completo', tipo: 'commit' },
  { id: 'programacion-13', rama: 'programacion', dia: 13, texto: 'P0 cerrado: CV, LinkedIn y caso', tipo: 'grande' },
  { id: 'trabajo-13', rama: 'trabajo', dia: 13, texto: 'Fin de la intensiva: 70 + 70', tipo: 'grande', desde: 'programacion' },
  { id: 'clipping-13', rama: 'clipping', dia: 13, texto: '50 clips publicados', tipo: 'commit' },
  { id: 'ingles-16', rama: 'ingles', dia: 16, texto: 'Pitch de 60 s y 6 historias STAR', tipo: 'commit' },
  { id: 'clipping-20', rama: 'clipping', dia: 20, texto: 'Primer pago cobrado', tipo: 'commit' },
  { id: 'trabajo-24', rama: 'trabajo', dia: 24, texto: 'Primera entrevista con recruiter', tipo: 'grande', desde: 'ingles' },
  { id: 'programacion-27', rama: 'programacion', dia: 27, texto: 'Faro v1: backend, RAG y staging', tipo: 'commit' },
  { id: 'matematica-27', rama: 'matematica', dia: 27, texto: 'Aritmética · caps. 1 a 4 aprobados', tipo: 'commit' },
  { id: 'salud-27', rama: 'salud', dia: 27, texto: '4 semanas sin faltar al entreno', tipo: 'commit' },
  { id: 'clipping-28', rama: 'clipping', dia: 28, texto: 'Revisión: ¿US$ 100 cobrados?', tipo: 'grande' },
  { id: 'trabajo-34', rama: 'trabajo', dia: 34, texto: 'Un proceso en etapa técnica', tipo: 'grande', desde: 'programacion' },
  { id: 'programacion-41', rama: 'programacion', dia: 41, texto: 'P1 · Faro v1 cerrado con tráiler y landing', tipo: 'grande' },
  { id: 'salud-55', rama: 'salud', dia: 55, texto: 'Control de peso y medidas', tipo: 'commit' },
  { id: 'main-56', rama: 'main', dia: 56, texto: 'T+2 · trabajo remoto de USD 3.000 a 5.000', tipo: 'main' },
  { id: 'handyx-56', rama: 'handyx', dia: 56, texto: 'Vuelve con la rutina con-trabajo (si entró el trabajo)', tipo: 'commit' },
  { id: 'ingles-62', rama: 'ingles', dia: 62, texto: 'Test de nivel: B2 sólido', tipo: 'commit' },
  { id: 'matematica-62', rama: 'matematica', dia: 62, texto: 'Aritmética completa: cierra B1', tipo: 'grande' },
  { id: 'programacion-76', rama: 'programacion', dia: 76, texto: 'P2 · Escudo cerrado', tipo: 'grande' },
  { id: 'salud-83', rama: 'salud', dia: 83, texto: 'Control de peso y medidas', tipo: 'commit' },
  { id: 'matematica-90', rama: 'matematica', dia: 90, texto: 'W1 · estadística básica lista para Surco v1', tipo: 'grande' },
  { id: 'programacion-91', rama: 'programacion', dia: 91, texto: 'P3 · Surco v1 arranca', tipo: 'commit', desde: 'matematica' },
];

export type EstadoHito = 'hecho' | 'vencido' | 'pendiente';

export interface HitoFechado extends HitoRama {
  fecha: string;
  /** La fecha del plan, si se movió. */
  original: string;
  estado: EstadoHito;
  hecho?: string;
  /** Fecha nueva que propone Trazo para un hito vencido (dos semanas desde hoy). */
  propuesta?: string;
}

/** Los hitos de búsqueda (que pueden vencer): los de trabajo y el T+2. */
export const esDeBusqueda = (h: HitoRama) => h.rama === 'trabajo' || (h.rama === 'main' && h.texto.startsWith('T+2'));

/** Los hitos con su fecha real (desde T0, o la que moviste) y su estado a una fecha. */
export function hitosFechados(hoy: string, estado: PlanState['hitos'] = {}, t0 = T0_PLAN): HitoFechado[] {
  return HITOS.map((h): HitoFechado => {
    const original = addDays(t0, h.dia);
    const st = estado[h.id] ?? {};
    const fecha = st.fecha ?? original;
    const vencido = !st.hecho && esDeBusqueda(h) && fecha < hoy;
    return { ...h, fecha, original, hecho: st.hecho, estado: st.hecho ? 'hecho' : vencido ? 'vencido' : 'pendiente', ...(vencido ? { propuesta: addDays(hoy, 14) } : {}) };
  }).sort((a, b) => a.fecha.localeCompare(b.fecha) || HITOS.indexOf(a) - HITOS.indexOf(b));
}

/** Los hitos que caen en un rango (para Semana, Mes y Bimestre). */
export const hitosEntre = (hoy: string, desde: string, hasta: string, estado: PlanState['hitos'] = {}, t0 = T0_PLAN) =>
  hitosFechados(hoy, estado, t0).filter((h) => h.fecha >= desde && h.fecha <= hasta);
