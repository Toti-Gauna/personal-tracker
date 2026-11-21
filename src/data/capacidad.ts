/**
 * Ola 27 (v3) · capacidad de programación por día, en horas, según la rutina que rige ese día. El calendario del plan se mide en
 * horas y se reparte sobre esa capacidad. v7 (ola 29): antes del trabajo nuevo, ~8 h por día de proyecto (PetrIA, sale de
 * data/plan-extendido.json); con trabajo, 29 h por semana (3 h de lunes a viernes y 7 h el sábado y el domingo). La semana de pausa
 * de fin de año vale cero, solo en los años que dice el plan (2027 a 2030). Puro.
 */
import { PLAN_EXT } from './plan-extendido';
import { ajustarDia, blockMin, domingoDe, esConvertible, planRoutine, type DayType } from './routines';
import { addDays, parseDate } from './time';

/** v7: días desde T0 hasta el trabajo nuevo si no lo cargaste (49: lunes 4 ene 2027 con T0 el 16 nov 2026). */
export const INICIO_TRABAJO_DIAS = PLAN_EXT.capacidad?.inicioTrabajoDias === null ? 36500 : PLAN_EXT.capacidad?.inicioTrabajoDias ?? 56;
/** v12.1: sin trabajo nuevo en el plan (la rutina es la misma hasta el final). */
export const SIN_TRABAJO_NUEVO = PLAN_EXT.capacidad?.inicioTrabajoDias === null;
/** v12.1: horas por día de lunes a viernes y el fin de semana (10 y 11 → 72 por semana). */
export const HORAS_LV = PLAN_EXT.capacidad?.lv ?? null;
export const HORAS_FINDE = PLAN_EXT.capacidad?.finde ?? null;
/** v7: horas por día de proyecto antes del trabajo nuevo (8), o null si rige la rutina intensiva. */
export const HORAS_ANTES_TRABAJO = PLAN_EXT.capacidad?.antesTrabajo ?? null;
/** v7: años con pausa de diciembre (2027 a 2030); sin lista, todos. */
export const ANIOS_PAUSA = PLAN_EXT.capacidad?.pausasDiciembre;

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
  /** v7: horas por día antes del trabajo nuevo; `null` usa la rutina intensiva. Por defecto, las del plan (8). */
  antesTrabajo?: number | null;
  /** v7: años con pausa de diciembre; por defecto, los del plan. */
  aniosPausa?: readonly number[];
}

const esFinde = (f: string) => { const d = parseDate(f).getDay(); return d === 0 || d === 6; };
const lunesDe = (f: string) => addDays(f, -((parseDate(f).getDay() + 6) % 7));
const enPausa = (lunes: string, anios: readonly number[] | undefined) =>
  lunes.slice(5, 7) === '12' && Number(lunes.slice(8, 10)) >= 18 && Number(lunes.slice(8, 10)) <= 24 && (!anios || anios.includes(Number(lunes.slice(0, 4))));

let cache: Record<string, number> | null = null;
const horasTipo = (t: DayType) => (cache ??= {})[t] ??= horasProgDe(t);

/** ¿La semana de ese día es la pausa de fin de año? (v7: solo de 2027 a 2030). */
export const esDiaDePausa = (f: string, anios: readonly number[] | undefined = ANIOS_PAUSA) => enPausa(lunesDe(f), anios);

/**
 * Horas de programación de un día. v7: antes del inicio del trabajo, las horas por día del plan (8); desde ahí, la rutina con
 * trabajo. Sin horas por día en el plan (calendario viejo), la semana de arranque cuenta 24,5 h repartidas parejo y después rige
 * el modo intensivo.
 */
export function horasDelDia(f: string, c: CfgCapacidad): number {
  if ((c.pausas ?? true) && esDiaDePausa(f, c.aniosPausa ?? ANIOS_PAUSA)) return 0;
  const real = c.reales?.[f];
  if (real != null && c.hoy && f < c.hoy) return real;
  const antes = c.antesTrabajo === undefined ? HORAS_ANTES_TRABAJO : c.antesTrabajo;
  const fin = esFinde(f);
  // v12.1: 10 h de lunes a viernes y 11 el fin de semana, todo el plan (sin trabajo nuevo).
  if (HORAS_LV != null && HORAS_FINDE != null && c.antesTrabajo === undefined) return fin ? HORAS_FINDE : HORAS_LV;
  if (f < c.inicioTrabajo && antes != null) return antes;
  if (f < addDays(c.t0, 7)) return HORAS_SEMANA_PLAN / 7;
  if (f < c.inicioTrabajo) return horasTipo(fin ? (parseDate(f).getDay() === 0 ? domingoDe('busqueda-intensiva-finde') : 'busqueda-intensiva-finde') : 'busqueda-intensiva');
  return horasTipo(fin ? 'con-trabajo-finde' : 'con-trabajo');
}

/** Horas por semana de la rutina de cada período (para mostrar: 53 y 29). */
export const horasPorSemana = (t: 'busqueda-intensiva' | 'con-trabajo') => 5 * horasTipo(t) + horasTipo(`${t}-finde` as DayType) + horasTipo(domingoDe(`${t}-finde` as DayType));

/**
 * Ola 31 (v7) · horas de proyecto por semana que da la rutina intensiva con los bloques que pasaste a proyecto, contra las ~8 h por día
 * que pide PetrIA: 50 h por semana (47,5 con Anthropic Academy, hasta el 22 dic); faltan 6 (u 8,5) para 56.
 */
export function horasRutinaIntensiva(extra: string[] = [], o: { academy?: boolean } = {}): { semana: number; meta: number; falta: number } {
  const dia = (t: DayType) => ajustarDia(planRoutine(t, 'completo'), { extraProyecto: extra, ...(o.academy ? { academy: true } : {}) }).filter((p) => p.block.rama === 'programacion' && /^prog/.test(p.block.id)).reduce((s, p) => s + p.min, 0) / 60;
  const semana = Math.round((5 * dia('busqueda-intensiva') + dia('busqueda-intensiva-finde') + dia(domingoDe('busqueda-intensiva-finde'))) * 10) / 10;
  const meta = Math.round((HORAS_ANTES_TRABAJO ?? 0) * 7 * 10) / 10;
  return { semana, meta, falta: Math.max(0, Math.round((meta - semana) * 10) / 10) };
}

/** Ola 31 · los bloques de la rutina intensiva que pueden pasar a proyecto, con cuánto suman por semana (por ejemplo, inglés hablado: 2 h 30). */
export function convertiblesIntensiva(): { id: string; label: string; minSemana: number; dias: string }[] {
  const tipos: [DayType, number, string][] = [['busqueda-intensiva', 5, 'L a V'], ['busqueda-intensiva-finde', 1, 'sábado'], [domingoDe('busqueda-intensiva-finde'), 1, 'domingo']];
  const m = new Map<string, { id: string; label: string; minSemana: number; dias: string[] }>();
  for (const [t, veces, dias] of tipos) {
    for (const p of planRoutine(t, 'completo')) {
      if (!esConvertible(p.block) || p.block.meta === false) continue;
      const x = m.get(p.block.id) ?? { id: p.block.id, label: p.block.label, minSemana: 0, dias: [] };
      x.minSemana += blockMin(p.block) * veces;
      x.dias.push(dias);
      m.set(p.block.id, x);
    }
  }
  return [...m.values()].map((x) => ({ ...x, dias: x.dias.join(', ') }));
}
