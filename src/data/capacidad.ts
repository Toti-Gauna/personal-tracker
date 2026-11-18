/**
 * Ola 27 (v3) · capacidad de programación por día, en horas, según la rutina que rige ese día. El calendario del plan se mide en
 * horas (semanas del plan × 24,5 h) y se reparte sobre esa capacidad: en el modo intensivo son 53 h por semana (7 h de lunes a viernes y
 * 9 h el sábado y el domingo); con trabajo, 29 (3 h y 7 h). La semana de pausa de fin de año vale cero. Puro.
 */
import { planRoutine, type DayType } from './routines';
import { addDays, parseDate } from './time';

/** Horas del plan que equivalen a "una semana del plan". */
export const HORAS_SEMANA_PLAN = 24.5;

/** Horas de programación que da una rutina en un día (suma de sus bloques de programación). */
export function horasProgDe(tipo: DayType): number {
  const min = planRoutine(tipo, 'completo').filter((p) => p.block.rama === 'programacion' && /^prog/.test(p.block.id)).reduce((s, p) => s + p.min, 0);
  return min / 60;
}

export interface CfgCapacidad {
  /** Lunes de la semana 1 del plan. */
  t0: string;
  /** Primer día con la rutina con trabajo. */
  inicioTrabajo: string;
  /** Pausa de fin de año (la semana cuyo lunes cae entre el 18 y el 24 de diciembre no se programa). */
  pausas?: boolean;
  /** Horas de programación reales de los días que ya pasaron (cuando hay registro, mandan sobre lo planificado). */
  reales?: Record<string, number>;
  /** Hoy: las horas reales solo se usan antes de esta fecha. */
  hoy?: string;
}

const esFinde = (f: string) => { const d = parseDate(f).getDay(); return d === 0 || d === 6; };
const lunesDe = (f: string) => addDays(f, -((parseDate(f).getDay() + 6) % 7));
const enPausa = (lunes: string) => lunes.slice(5, 7) === '12' && Number(lunes.slice(8, 10)) >= 18 && Number(lunes.slice(8, 10)) <= 24;

let cache: Record<string, number> | null = null;
const horasTipo = (t: DayType) => (cache ??= {})[t] ??= horasProgDe(t);

/** ¿La semana de ese día es la pausa de fin de año? */
export const esDiaDePausa = (f: string) => enPausa(lunesDe(f));

/**
 * Horas de programación de un día. La semana de arranque (P0, 7 días desde T0) cuenta las 24,5 h de una semana del plan, repartidas parejo.
 * Antes del inicio del trabajo rige el modo intensivo; desde ahí, la rutina con trabajo.
 */
export function horasDelDia(f: string, c: CfgCapacidad): number {
  if ((c.pausas ?? true) && esDiaDePausa(f)) return 0;
  const real = c.reales?.[f];
  if (real != null && c.hoy && f < c.hoy) return real;
  if (f < addDays(c.t0, 7)) return HORAS_SEMANA_PLAN / 7;
  const fin = esFinde(f);
  if (f < c.inicioTrabajo) return horasTipo(fin ? 'busqueda-intensiva-finde' : 'busqueda-intensiva');
  return horasTipo(fin ? 'con-trabajo-finde' : 'con-trabajo');
}

/** Horas por semana de la rutina de cada período (para mostrar: 53 y 29). */
export const horasPorSemana = (t: 'busqueda-intensiva' | 'con-trabajo') => 5 * horasTipo(t) + 2 * horasTipo(`${t}-finde` as DayType);
