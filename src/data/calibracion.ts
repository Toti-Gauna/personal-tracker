/**
 * Calibración y escenarios del plan T+18 (§3.9 de la v2; ola 27 · v3; ola 33 · v7).
 * v7: las horas de PetrIA están medidas y las de los demás proyectos llevan un factor provisional de 1,5 hasta calibrar con las horas
 * reales de PetrIA 1.0 y 1.1. El factor real/estimado se calcula al publicar la 1.0 y otra vez con la 1.1 (horas reales de programación,
 * del foco o cargadas a mano, contra las horas de esas versiones) y se aplica a lo que viene después de PetrIA. No se recorta: se
 * mueven fechas.
 */
import { HORAS_SEMANA_PLAN } from './capacidad';
import { horasDeRama } from './metas-plan';
import { calendarioVivo, capacidadDelDia } from './plan';
import type { BloqueFechado } from './plan-extendido';
import type { PlanState } from './plan-state';
import { cierreProyecto } from './puertas';
import { addDays } from './time';
import type { DayLog } from './types';
import { versionesFechadas } from './proyectos-v7';

/** Horas de una semana del plan (la unidad del calendario viejo). */
export const HORAS_PROG_SEMANA = HORAS_SEMANA_PLAN;
/** Debajo de esto, el plan va más rápido de lo estimado; arriba de MAX, más lento. */
export const FACTOR_MIN = 0.85;
export const FACTOR_MAX = 1.15;
/**
 * Ola 33 (v7): el factor sale de PetrIA, que es el proyecto medido. Se calcula al publicar la 1.0 y otra vez al publicar la 1.1, y
 * se aplica a lo que viene después de PetrIA (las horas de los demás proyectos llevan un 1,5 provisional hasta esta calibración).
 */
export const PROYECTO_CALIBRA = 'P1';
export const VERSIONES_FACTOR = ['1.0', '1.1'] as const;

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
    return { id: b.id, nombre: b.nombre, estimadas: r1(horasHechas(b, hasta)), reales: horasDeRama(days, 'programacion', b.inicio, hasta, plan.horasManuales), cerrado, enCurso: !cerrado };
  });
}

export interface FilaVersion { version: string; nombre: string; estimadas: number; reales: number | null; publicada?: string; finTrazo?: string }

export interface Calibracion {
  /** El factor está listo cuando publicás PetrIA 1.0 (y se recalcula con la 1.1). */
  listo: boolean;
  /** Con qué versión de PetrIA se calculó ("1.0" o "1.1"). */
  hito: '1.0' | '1.1' | null;
  /** Cuándo termina, en el calendario, la versión que falta (para el texto "se calcula el…"). */
  cuando: string | null;
  factor: number | null;
  estimadas: number;
  reales: number;
  /** Las versiones de PetrIA que calibran, con sus horas. */
  versiones: FilaVersion[];
  filas: HorasBloque[];
  regla: 'rapido' | 'en-plan' | 'lento' | null;
}

/**
 * Ola 33 · el factor real/estimado con PetrIA: horas reales de programación desde el inicio de PetrIA hasta que publicaste la 1.0
 * (o la 1.1) contra las horas de esas versiones (74 y 74 h, medidas). Antes de publicar la 1.0 no hay factor.
 */
export function calibrar(cal: BloqueFechado[], days: Record<string, DayLog>, plan: PlanState, hoy: string): Calibracion {
  const filas = horasPorBloque(cal, days, plan, hoy);
  const b = cal.find((x) => x.id === PROYECTO_CALIBRA);
  const vs = b ? versionesFechadas(PROYECTO_CALIBRA, b, capacidadDelDia, plan, hoy).filter((v) => (VERSIONES_FACTOR as readonly string[]).includes(v.id)) : [];
  const pub = (id: string) => vs.find((v) => v.id === id)?.registro.publicada;
  const hito = pub('1.1') && pub('1.0') ? '1.1' : pub('1.0') ? '1.0' : null;
  const hasta = hito ? pub(hito)! : null;
  const contadas = vs.filter((v) => !!v.registro.publicada && (hito === '1.1' || v.id === '1.0'));
  const estimadas = r1(contadas.reduce((s, v) => s + (v.horas ?? 0), 0));
  const reales = b && hasta ? horasDeRama(days, 'programacion', b.inicio, hasta, plan.horasManuales) : 0;
  const factor = hito && estimadas > 0 ? Math.round((reales / estimadas) * 100) / 100 : null;
  const regla = factor == null ? null : factor < FACTOR_MIN ? 'rapido' : factor > FACTOR_MAX ? 'lento' : 'en-plan';
  const proxima = vs.find((v) => !v.registro.publicada);
  const versiones: FilaVersion[] = vs.map((v) => ({
    version: v.id, nombre: v.nombre, estimadas: v.horas ?? 0,
    reales: v.registro.publicada && b ? horasDeRama(days, 'programacion', b.inicio, v.registro.publicada, plan.horasManuales) : null,
    ...(v.registro.publicada ? { publicada: v.registro.publicada } : {}), ...(v.finTrazo ? { finTrazo: v.finTrazo } : {}),
  }));
  return { listo: !!hito, hito, cuando: hito === '1.1' ? null : proxima?.finTrazo ?? null, factor, estimadas, reales: r1(reales), versiones, filas, regla };
}

export interface Sugerencia { texto: string }

/** Lo que dice la regla con la v7: si una versión se atrasa (o va más rápido), se mueven fechas; no se recorta profundidad. */
export function sugerencia(c: Calibracion, finConFactor: string | null, finSinFactor: string | null): Sugerencia | null {
  if (c.regla == null || c.regla === 'en-plan' || !finConFactor || !finSinFactor) return null;
  const dias = Math.round((Date.parse(finConFactor) - Date.parse(finSinFactor)) / 864e5);
  const f = String(c.factor).replace('.', ',');
  return c.regla === 'lento'
    ? { texto: `Vas más lento que lo estimado (factor ${f}): el plan se corre ${dias} días. No se recorta profundidad: se mueven fechas.` }
    : { texto: `Vas más rápido que lo estimado (factor ${f}): el plan termina ${Math.abs(dias)} días antes. Las fechas se acomodan solas.` };
}

/** Ola 33 · cuántos días mueve el fin del plan cada +10 % de horas en lo que falta (con lo cerrado como está). */
export function diasPorDiezPorCiento(t0?: string, cerrados: string[] = []) {
  return proyectar(1.1, t0, cerrados).deltaDias;
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
