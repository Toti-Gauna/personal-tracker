/**
 * Calibración y escenarios del plan T+18 (§3.9 de la v2, reescrito en la ola 27 · v3).
 * Horas estimadas (las del calendario por horas: semanas del plan × 24,5) contra horas reales (foco de
 * los bloques de programación entre las fechas del bloque). El factor real/estimado se calcula al cerrar
 * P2 y otra vez al cerrar P3 y se aplica al resto del calendario; Trazo propone qué apagar, pero no lo aplica solo.
 */
import { HORAS_SEMANA_PLAN } from './capacidad';
import { horasDeRama } from './metas-plan';
import { calendarioVivo, capacidadDelDia } from './plan';
import type { BloqueFechado } from './plan-extendido';
import type { PlanState } from './plan-state';
import { cierreProyecto } from './puertas';
import { addDays } from './time';
import type { DayLog } from './types';

/** Horas de una semana del plan (la unidad del calendario). */
export const HORAS_PROG_SEMANA = HORAS_SEMANA_PLAN;
/** Debajo de esto, el plan va más rápido de lo estimado; arriba de MAX, más lento. */
export const FACTOR_MIN = 0.85;
export const FACTOR_MAX = 1.15;
/** Los proyectos que reusan trabajo anterior: sus extras se comprimen si vas rápido. */
export const REUSAN = ['P5', 'P7', 'P9', 'P10', 'S2', 'S3', 'Q3', 'Q4', 'Q5', 'Q6', 'A5', 'A7'];
/** Lo primero que se recorta si vas lento (alcance), además de las plataformas opcionales. */
export const RECORTAR = ['A3', 'A6', 'Q2', 'Q6'];
/** Los proyectos con los que se calcula el factor: al cerrar el primero y otra vez al cerrar el segundo. */
export const HITOS_FACTOR = ['P2', 'P3'] as const;

export interface HorasBloque { id: string; nombre: string; estimadas: number; reales: number; cerrado: boolean; enCurso: boolean }

const r1 = (x: number) => Math.round(x * 10) / 10;

/** Horas de programación que el calendario puso en un bloque hasta una fecha (todas si ya terminó). */
function horasHechas(b: BloqueFechado, hoy: string) {
  const total = b.horas ?? Math.floor(b.semanas * HORAS_PROG_SEMANA);
  if (hoy < b.inicio) return 0;
  if (hoy >= b.fin) return total;
  let h = 0;
  for (let d = b.inicio; d <= hoy; d = addDays(d, 1)) h += capacidadDelDia(d);
  return Math.min(total, h);
}

/** Horas estimadas y reales de cada proyecto que ya empezó (hasta hoy). */
export function horasPorBloque(cal: BloqueFechado[], days: Record<string, DayLog>, plan: PlanState, hoy: string): HorasBloque[] {
  return cal.filter((b) => b.tipo === 'proyecto' && b.inicio <= hoy).map((b) => {
    const cerrado = !!cierreProyecto(plan, b.id) || b.fin < hoy;
    const hasta = b.fin < hoy ? b.fin : hoy;
    return { id: b.id, nombre: b.nombre, estimadas: r1(horasHechas(b, hasta)), reales: horasDeRama(days, 'programacion', b.inicio, hasta), cerrado, enCurso: !cerrado };
  });
}

export interface Calibracion {
  /** El factor está listo cuando cierra P2 (y se recalcula al cerrar P3). */
  listo: boolean;
  /** Con qué proyecto se calculó el factor ("P2" o "P3"). */
  hito: 'P2' | 'P3' | null;
  /** Cuándo cierra el que falta (para el texto "se calcula el…"). */
  cuando: string | null;
  factor: number | null;
  estimadas: number;
  reales: number;
  filas: HorasBloque[];
  regla: 'rapido' | 'en-plan' | 'lento' | null;
}

const cerrado = (cal: BloqueFechado[], plan: PlanState, id: string, hoy: string) => { const b = cal.find((x) => x.id === id); return !!b && (!!cierreProyecto(plan, id) || b.fin < hoy); };

/** El factor real/estimado sobre los proyectos cerrados (se calcula desde que cierra P2 y se recalcula al cerrar P3). */
export function calibrar(cal: BloqueFechado[], days: Record<string, DayLog>, plan: PlanState, hoy: string): Calibracion {
  const filas = horasPorBloque(cal, days, plan, hoy);
  const hito = cerrado(cal, plan, 'P3', hoy) ? 'P3' : cerrado(cal, plan, 'P2', hoy) ? 'P2' : null;
  const proximo = hito === 'P3' ? null : cal.find((b) => b.id === (hito === 'P2' ? 'P3' : 'P2'));
  const cerrados = filas.filter((f) => f.cerrado);
  const estimadas = r1(cerrados.reduce((s, f) => s + f.estimadas, 0));
  const reales = r1(cerrados.reduce((s, f) => s + f.reales, 0));
  const factor = hito && estimadas > 0 ? Math.round((reales / estimadas) * 100) / 100 : null;
  const regla = factor == null ? null : factor < FACTOR_MIN ? 'rapido' : factor > FACTOR_MAX ? 'lento' : 'en-plan';
  return { listo: !!hito, hito, cuando: proximo?.fin ?? null, factor, estimadas, reales, filas, regla };
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

export interface Escenario { id: string; nombre: string; factor: number; horas: number; fin: string; supuesto: string }

/** Cierre del calendario con un factor aplicado a lo que todavía no cerró (las ventanas también se estiran: son horas). */
export function proyectar(factor: number, t0?: string, cerrados: string[] = []) {
  const cal = calendarioVivo(t0, { factor, cerrados });
  const base = calendarioVivo(t0, { factor: null, cerrados: [] });
  const fin = (c: BloqueFechado[]) => c.reduce((m, b) => (b.fin > m ? b.fin : m), c[0].fin);
  const horas = cal.reduce((s, b) => s + (b.horas ?? 0), 0);
  const dif = Math.round((Date.parse(fin(cal)) - Date.parse(fin(base))) / 864e5);
  return { horas, fin: fin(cal), deltaDias: dif };
}

/** Los tres escenarios, calculados con el factor (0,85, 1,00 y 1,15) sobre el calendario por horas: no son supuestos escritos a mano. */
export function escenarios(t0?: string, cerrados: string[] = []): Escenario[] {
  const f = (factor: number, id: string, nombre: string, supuesto: string): Escenario => ({ id, nombre, factor, supuesto, ...proyectar(factor, t0, cerrados) });
  return [
    f(FACTOR_MIN, 'rapido', 'Rápido', 'Todo lo que falta lleva el 85 % de las horas estimadas.'),
    f(1, 'en-plan', 'En plan', 'Las horas estimadas, como están.'),
    f(FACTOR_MAX, 'lento', 'Lento', 'Todo lo que falta lleva el 115 % de las horas estimadas.'),
  ];
}
