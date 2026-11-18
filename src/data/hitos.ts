/**
 * Hitos por rama (Ola 8b): no solo commits. Un hito grande cierra un proyecto, un libro o una
 * etapa; los de main son T+0, T+2 y T+18. Se guardan como días desde T0 (no como fechas) para
 * que, si cambia el inicio del plan en Ajustes, se muevan todos juntos.
 *
 * Las fechas de búsqueda (entrevista, etapa técnica, T+2) son metas, no promesas: si pasan sin
 * cumplirse, el hito queda "vencido" y Trazo propone una fecha nueva; no se borra.
 */
import { T0_PLAN, TRAMOS } from './plan';
import type { PlanState } from './plan-state';
import { addDays, daysBetween } from './time';
import { CLIP, hitosClip } from './clipping';
import { clippingActivo } from './clipping-activo';
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
  /**
   * Ola 16b: el hito sigue a un tramo del calendario (empieza o cierra con él). Si el tramo se
   * mueve (semanas extra de feature, atrasos), el hito se mueve; `dia` queda como respaldo.
   */
  ancla?: { tramo: string; borde: 'inicio' | 'fin' };
}

/** Día del hito desde T0: el del tramo al que está anclado, o el guardado. */
export function diaDe(h: HitoRama) {
  if (!h.ancla) return h.dia;
  const t = TRAMOS.find((x) => x.id === h.ancla!.tramo);
  if (!t) return h.dia;
  return h.ancla.borde === 'inicio' ? (t.desde - 1) * 7 : t.hasta * 7 - 1;
}

/**
 * Los 30 hitos iniciales, del 16 nov 2026 al cierre de Surco v1. Los de programación y la ventana
 * W1 están anclados a su tramo (ola 16b): con las semanas extra de feature, Surco v1 cierra el
 * 28 mar 2027 en vez del 21 feb.
 */
export const HITOS: HitoRama[] = [
  { id: 'main-0', rama: 'main', dia: 0, texto: 'T+0 · arranca, Handyx y Eclipse en stand-by', tipo: 'main' },
  { id: 'salud-0', rama: 'salud', dia: 0, texto: 'Medición inicial · rumbo a 95 kg', tipo: 'commit' },
  { id: 'handyx-0', rama: 'handyx', dia: 0, texto: 'Stand-by: backlog y cortes congelados', tipo: 'commit' },
  { id: 'matematica-1', rama: 'matematica', dia: 1, texto: 'Aritmética · test del cap. 1', tipo: 'commit' },
  // Ola 18/21: la entrevista se practica en la búsqueda laboral (los ids quedan para no perder lo marcado).
  { id: 'ingles-6', rama: 'trabajo', dia: 6, texto: 'Primer simulacro de entrevista completo', tipo: 'commit' },
  { id: 'programacion-6', rama: 'programacion', dia: 6, texto: 'Portfolio con mapa 3D de proyectos y Trazo', tipo: 'commit' },
  { id: 'trabajo-6', rama: 'trabajo', dia: 6, texto: 'Mercado revisado: orden confirmado', tipo: 'grande' },
  { id: 'programacion-13', rama: 'programacion', dia: 13, texto: 'P0 cerrado: portfolio, Trazo, RAG y MCP', tipo: 'grande' , ancla: { tramo: 'P0', borde: 'fin' } },
  { id: 'trabajo-13', rama: 'trabajo', dia: 13, texto: 'Fin de la intensiva: 70 + 70', tipo: 'grande', desde: 'programacion' },
  { id: 'ingles-16', rama: 'trabajo', dia: 16, texto: 'Pitch de 60 s y 6 historias STAR', tipo: 'commit' },
  { id: 'trabajo-24', rama: 'trabajo', dia: 24, texto: 'Primera entrevista con recruiter', tipo: 'grande', desde: 'ingles' },
  { id: 'matematica-27', rama: 'matematica', dia: 27, texto: 'Aritmética · caps. 1 a 4 aprobados', tipo: 'commit' },
  { id: 'programacion-27', rama: 'programacion', dia: 27, texto: 'Faro v1: API Spring Boot y servicio RAG conectados', tipo: 'commit' },
  { id: 'salud-27', rama: 'salud', dia: 27, texto: '4 semanas sin faltar al entreno', tipo: 'commit' },
  { id: 'programacion-34', rama: 'programacion', dia: 34, texto: 'P1 · Faro v1 cerrado con Spring Boot y MCP', tipo: 'grande' , ancla: { tramo: 'P1', borde: 'fin' } },
  { id: 'trabajo-34', rama: 'trabajo', dia: 34, texto: 'Un proceso en etapa técnica', tipo: 'grande', desde: 'programacion' },
  { id: 'programacion-42', rama: 'programacion', dia: 42, texto: 'P2 · Escudo arranca (Go)', tipo: 'commit' , ancla: { tramo: 'P2', borde: 'inicio' } },
  { id: 'salud-55', rama: 'salud', dia: 55, texto: 'Control de peso y medidas', tipo: 'commit' },
  { id: 'main-56', rama: 'main', dia: 56, texto: 'T+2 · trabajo remoto de USD 3.000 a 5.000', tipo: 'main' },
  { id: 'handyx-56', rama: 'handyx', dia: 56, texto: 'Vuelve con la rutina con-trabajo (si entró el trabajo)', tipo: 'commit' },
  // Ola 21: los hitos del año 1 de idiomas (roadmap maestro v3), en días desde T0.
  { id: 'ingles-41', rama: 'ingles', dia: 41, texto: 'Measure What Matters: tesis final y 3 min hablados sin leer', tipo: 'commit' },
  { id: 'ingles-83', rama: 'ingles', dia: 83, texto: 'Pronunciación: grabación de control (85 %)', tipo: 'commit' },
  { id: 'ingles-132', rama: 'ingles', dia: 132, texto: 'Gramática: test (85 %) y simulacro diagnóstico de Cambridge', tipo: 'commit' },
  { id: 'ingles-321', rama: 'ingles', dia: 321, texto: 'Examen Cambridge C1 Advanced', tipo: 'grande' },
  { id: 'matematica-62', rama: 'matematica', dia: 62, texto: 'Aritmética completa: cierra B1', tipo: 'grande' },
  { id: 'programacion-62', rama: 'programacion', dia: 62, texto: 'P2 · Escudo cerrado: gateway en Go y MCP', tipo: 'grande' , ancla: { tramo: 'P2', borde: 'fin' } },
  { id: 'matematica-76', rama: 'matematica', dia: 76, texto: 'W1 · estadística básica lista para Surco v1', tipo: 'grande' , ancla: { tramo: 'W1', borde: 'fin' } },
  { id: 'programacion-77', rama: 'programacion', dia: 77, texto: 'P3 · Surco v1 arranca (ML clásico)', tipo: 'commit', desde: 'matematica' , ancla: { tramo: 'P3', borde: 'inicio' } },
  { id: 'salud-83', rama: 'salud', dia: 83, texto: 'Control de peso y medidas', tipo: 'commit' },
  { id: 'programacion-97', rama: 'programacion', dia: 97, texto: 'P3 · Surco v1 cerrado con visor 3D', tipo: 'grande' , ancla: { tramo: 'P3', borde: 'fin' } },
  // Ola 23: los hitos del Roadmap Clipper reemplazan a los de 50 clips, primer pago y USD 100.
  ...hitosClip().map((h): HitoRama => ({ id: `clip-${h.id}`, rama: 'clipping', dia: daysBetween(CLIP.t0, h.fechaReal), texto: h.texto, tipo: h.tipo })),
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
  return HITOS.filter((h) => h.rama !== 'clipping' || clippingActivo()).map((h): HitoFechado => {
    const original = addDays(t0, diaDe(h));
    const st = estado[h.id] ?? {};
    const fecha = st.fecha ?? original;
    const vencido = !st.hecho && esDeBusqueda(h) && fecha < hoy;
    return { ...h, fecha, original, hecho: st.hecho, estado: st.hecho ? 'hecho' : vencido ? 'vencido' : 'pendiente', ...(vencido ? { propuesta: addDays(hoy, 14) } : {}) };
  }).sort((a, b) => a.fecha.localeCompare(b.fecha) || HITOS.indexOf(a) - HITOS.indexOf(b));
}

/** Los hitos que caen en un rango (para Semana, Mes y Bimestre). */
export const hitosEntre = (hoy: string, desde: string, hasta: string, estado: PlanState['hitos'] = {}, t0 = T0_PLAN) =>
  hitosFechados(hoy, estado, t0).filter((h) => h.fecha >= desde && h.fecha <= hasta);
