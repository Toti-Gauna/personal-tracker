/**
 * Ola 24 · calibración y escenarios del plan T+18 v2 (§3.9 del prompt v2).
 * Horas estimadas (semanas de trabajo × horas de programación por semana) contra horas reales (foco
 * de los bloques de programación entre las fechas del bloque). Al cerrar P3 se calcula el factor
 * real/estimado; Trazo propone qué apagar, pero no lo aplica solo.
 */
import { horasDeRama } from './metas-plan';
import type { BloqueFechado } from './plan-extendido';
import type { PlanState } from './plan-state';
import { cierreProyecto } from './puertas';
import { addDays } from './time';
import type { DayLog } from './types';

/** Horas de programación por semana en la búsqueda intensiva (la tabla de la ola 8b; la v2 dice "unas 25"). */
export const HORAS_PROG_SEMANA = 25.5;
/** Debajo de esto, el plan va más rápido de lo estimado; arriba de MAX, más lento. */
export const FACTOR_MIN = 0.85;
export const FACTOR_MAX = 1.15;
/** Los proyectos que reusan trabajo anterior: sus extras se comprimen si vas rápido. */
export const REUSAN = ['P5', 'P7', 'P9', 'P10', 'S2', 'S3', 'Q3', 'Q4', 'Q5', 'Q6', 'A5', 'A7'];
/** Lo primero que se recorta si vas lento (alcance), además de las plataformas opcionales. */
export const RECORTAR = ['A3', 'A6', 'Q2', 'Q6'];

export interface HorasBloque { id: string; nombre: string; estimadas: number; reales: number; cerrado: boolean; enCurso: boolean }

const r1 = (x: number) => Math.round(x * 10) / 10;

/** Semanas de trabajo de un bloque que ya pasaron a una fecha (sin contar las pausas que lo parten). */
function semanasHechas(b: BloqueFechado, hoy: string) {
  if (hoy < b.inicio) return 0;
  if (hoy > b.fin) return b.semanas;
  const total = Math.floor((Date.parse(hoy) - Date.parse(b.inicio)) / (7 * 864e5)) + 1;
  const pausas = b.pausasDentro.filter((w) => w - b.desde + 1 <= total).length;
  return Math.max(0, Math.min(b.semanas, total - pausas));
}

/** Horas estimadas y reales de cada proyecto que ya empezó (hasta hoy). */
export function horasPorBloque(cal: BloqueFechado[], days: Record<string, DayLog>, plan: PlanState, hoy: string, horasSemana = HORAS_PROG_SEMANA): HorasBloque[] {
  return cal.filter((b) => b.tipo === 'proyecto' && b.inicio <= hoy).map((b) => {
    const cerrado = !!cierreProyecto(plan, b.id) || b.fin < hoy;
    const hasta = b.fin < hoy ? b.fin : hoy;
    return { id: b.id, nombre: b.nombre, estimadas: r1(semanasHechas(b, hasta) * horasSemana), reales: horasDeRama(days, 'programacion', b.inicio, hasta), cerrado, enCurso: !cerrado };
  });
}

export interface Calibracion {
  /** El factor está listo cuando cierra P3. */
  listo: boolean;
  /** Cuándo cierra P3 (para el texto "se calcula el…"). */
  cuando: string | null;
  factor: number | null;
  estimadas: number;
  reales: number;
  filas: HorasBloque[];
  regla: 'rapido' | 'en-plan' | 'lento' | null;
}

/** El factor real/estimado sobre los proyectos cerrados (se calcula desde que cierra P3). */
export function calibrar(cal: BloqueFechado[], days: Record<string, DayLog>, plan: PlanState, hoy: string, horasSemana = HORAS_PROG_SEMANA): Calibracion {
  const filas = horasPorBloque(cal, days, plan, hoy, horasSemana);
  const p3 = cal.find((b) => b.id === 'P3');
  const listo = !!p3 && (!!cierreProyecto(plan, 'P3') || p3.fin < hoy);
  const cerrados = filas.filter((f) => f.cerrado);
  const estimadas = r1(cerrados.reduce((s, f) => s + f.estimadas, 0));
  const reales = r1(cerrados.reduce((s, f) => s + f.reales, 0));
  const factor = listo && estimadas > 0 ? Math.round((reales / estimadas) * 100) / 100 : null;
  const regla = factor == null ? null : factor < FACTOR_MIN ? 'rapido' : factor > FACTOR_MAX ? 'lento' : 'en-plan';
  return { listo, cuando: p3?.fin ?? null, factor, estimadas, reales, filas, regla };
}

export interface Sugerencia { texto: string; claves: string[]; recortar: string[] }

/**
 * Qué propone la regla de §3.9. Rápido (< 0,85): apagar las extras de los proyectos que reusan.
 * Lento (> 1,15): recortar A3, A6, Q2 y Q6 (alcance) y apagar las plataformas opcionales.
 * Solo lo que todavía no empezó y sigue prendido.
 */
export function sugerencia(c: Calibracion, cal: BloqueFechado[], hoy: string): Sugerencia | null {
  const futuro = (id: string) => { const b = cal.find((x) => x.id === id); return b && b.inicio > hoy ? b : null; };
  if (c.regla === 'rapido') {
    const claves = REUSAN.flatMap((id) => {
      const b = futuro(id);
      if (!b) return [];
      return [...(b.extraAplicado ? [id] : []), ...(b.plataformaAplicada ? [`${id}:plataforma`] : []), ...(b.arquitecturaAplicada ? [`${id}:arquitectura`] : [])];
    });
    return { texto: `Vas más rápido que lo estimado (factor ${String(c.factor).replace('.', ',')}): se comprimen las extras de los proyectos que reusan trabajo anterior.`, claves, recortar: [] };
  }
  if (c.regla === 'lento') {
    const claves = cal.filter((b) => b.tipo === 'proyecto' && b.inicio > hoy && b.plataformaAplicada > 0).map((b) => `${b.id}:plataforma`);
    return { texto: `Vas más lento que lo estimado (factor ${String(c.factor).replace('.', ',')}): se recorta primero el alcance de A3, A6, Q2 y Q6 y se apagan las plataformas opcionales.`, claves, recortar: RECORTAR.filter((id) => futuro(id)) };
  }
  return null;
}

export interface Escenario { id: string; nombre: string; semanas: number; fin: string; supuesto: string }

/** Los tres escenarios de la v2 (supuestos, a recalibrar con datos reales). Ventanas, certificaciones y pausas no se comprimen. */
export const ESCENARIOS_V2: Escenario[] = [
  { id: 'optimista', nombre: 'Optimista', semanas: 203, fin: '2030-10-08', supuesto: 'Reutilización fuerte (25 % del núcleo técnico en proyectos que reusan, 10 % en el resto) y sin trabajo de jornada completa.' },
  { id: 'intermedio', nombre: 'Intermedio', semanas: 236, fin: '2031-05-25', supuesto: 'Reutilización moderada (15 % y 5 %) y etapas 2 a 4 un 20 % más largas.' },
  { id: 'pesimista', nombre: 'Pesimista', semanas: 273, fin: '2032-02-05', supuesto: 'Sin compresión y etapas 2 a 4 un 40 % más largas.' },
];

/**
 * Proyección con el factor: las semanas de proyecto que faltan se estiran o se achican por el factor;
 * ventanas, certificaciones, pausas y cierres quedan igual. Devuelve las semanas y la fecha de fin.
 */
export function proyectar(cal: BloqueFechado[], factor: number, hoy: string) {
  const fin = cal.reduce((m, b) => (b.fin > m ? b.fin : m), cal[0].fin);
  const total = cal.reduce((s, b) => s + b.semanas, 0);
  const restantes = cal.filter((b) => b.tipo === 'proyecto').reduce((s, b) => s + b.semanas - semanasHechas(b, hoy), 0);
  const delta = Math.round(restantes * (factor - 1));
  return { semanas: total + delta, fin: addDays(fin, delta * 7), delta };
}
