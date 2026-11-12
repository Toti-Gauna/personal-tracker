/**
 * Modelo de datos de los gráficos del roadmap. Son tipos y funciones puras: no dibujan nada.
 * Las pantallas (olas siguientes) los consumen.
 */
import { mejoraDia } from './mejora';
import type { RoadmapBimester, RoadmapLane } from './roadmap.schema';
import { addDays, daysBetween } from './time';
import type { DayLog } from './types';

// ——— Tipos ———

/** Un punto de la serie diaria de mejora. */
export interface ImprovementPoint {
  date: string;
  /** Mejora del día, en % (hasta 1). */
  mejora: number;
  /** El día tiene registro; si no, vale 0. */
  logged: boolean;
  /** Promedio móvil de 7 días hasta este día. */
  mejora7: number;
}

/** Horas de un mes en un carril. */
export interface HoursPoint {
  /** AAAA-MM */
  month: string;
  lane: RoadmapLane;
  hours: number;
}

/** Avance de un bimestre: lo hecho contra lo esperado. */
export interface BimesterProgress {
  n: number;
  /** Avance esperado a esta fecha, de 0 a 1. */
  expected: number;
  /** Avance real, de 0 a 1. */
  actual: number;
  delta: number;
  status: PaceStatus;
}

export type PaceStatus = 'adelantado' | 'en ritmo' | 'atrasado';

/** Un ítem de un eje de competencias: su peso y el nivel logrado (0 a 1). */
export interface CompetencyItem {
  id: string;
  weight: number;
  level: number;
}
export interface CompetencyAxis {
  id: string;
  label: string;
  items: CompetencyItem[];
}
export interface CompetencyScore {
  id: string;
  label: string;
  /** De 0 a 100. */
  score: number;
}

// ——— Funciones puras ———

const clamp01 = (x: number) => (Number.isFinite(x) ? Math.min(1, Math.max(0, x)) : 0);
const round = (x: number, d = 3) => Math.round(x * 10 ** d) / 10 ** d;

/**
 * Promedio móvil hacia atrás. Al principio, con los días que haya (los primeros 6 puntos
 * promedian menos de 7). Devuelve un valor por cada entrada.
 */
export function movingAverage(values: number[], window = 7): number[] {
  const w = Math.max(1, Math.floor(window));
  return values.map((_, i) => {
    const from = Math.max(0, i - w + 1);
    const slice = values.slice(from, i + 1);
    return round(slice.reduce((a, b) => a + b, 0) / slice.length, 4);
  });
}

/** Serie diaria de mejora entre dos fechas (inclusive); los días sin registro valen 0. */
export function dailyImprovementSeries(days: Record<string, DayLog>, from: string, to: string): ImprovementPoint[] {
  const n = Math.max(0, daysBetween(from, to) + 1);
  const dates = Array.from({ length: n }, (_, i) => addDays(from, i));
  const raw = dates.map((d) => (days[d] ? mejoraDia(days[d]) : 0));
  const avg = movingAverage(raw, 7);
  return dates.map((date, i) => ({ date, mejora: round(raw[i], 4), logged: !!days[date], mejora7: avg[i] }));
}

/** De qué carril es el tiempo registrado: estudio por frente, y foco en los bloques de producto. */
export type LaneOf = (source: { kind: 'study'; front: string } | { kind: 'focus'; block: string }) => RoadmapLane | null;
export const defaultLaneOf: LaneOf = (s) => {
  if (s.kind === 'study') return s.front === 'math' ? 'math' : s.front === 'prog' ? 'prog' : null;
  return s.block === 'handyx' || s.block === 'eclipse' ? 'product' : null;
};

/** Horas por mes y por carril, de lo que registraste (estudio y foco). Ordenado por mes y carril. */
export function hoursByMonthLane(days: Record<string, DayLog>, laneOf: LaneOf = defaultLaneOf): HoursPoint[] {
  const acc = new Map<string, number>();
  const add = (date: string, lane: RoadmapLane | null, min: number) => {
    if (!lane || !(min > 0)) return;
    const k = `${date.slice(0, 7)}|${lane}`;
    acc.set(k, (acc.get(k) ?? 0) + min);
  };
  for (const [date, d] of Object.entries(days)) {
    for (const l of d.study ?? []) add(date, laneOf({ kind: 'study', front: l.front }), l.min);
    for (const f of d.focus) add(date, laneOf({ kind: 'focus', block: f.key }), f.focusMin);
  }
  return [...acc.entries()]
    .map(([k, min]) => ({ month: k.split('|')[0], lane: k.split('|')[1] as RoadmapLane, hours: round(min / 60, 2) }))
    .sort((a, b) => a.month.localeCompare(b.month) || a.lane.localeCompare(b.lane));
}

/**
 * Avance ponderado por horas: Σ(horas × avance) / Σ(horas). Un ítem sin horas pesa 1 y el avance
 * se limita a 0–1. Sin ítems, 0.
 */
export function weightedProgress(items: { hours?: number; done: number }[]): number {
  let num = 0;
  let den = 0;
  for (const i of items) {
    const w = i.hours != null && i.hours > 0 ? i.hours : 1;
    num += w * clamp01(i.done);
    den += w;
  }
  return den > 0 ? round(num / den, 4) : 0;
}

/** Semanas transcurridas del bimestre a una fecha, de 0 a 9 (antes de empezar 0; después de terminar 9). */
export function weeksElapsed(b: Pick<RoadmapBimester, 'start' | 'end'>, date: string): number {
  if (date <= b.start) return 0;
  if (date > b.end) return 9;
  return Math.min(9, round(daysBetween(b.start, date) / 7, 3));
}

/** Cuánto de un ítem debería estar hecho: su tramo de semanas, a medida que pasan. */
export const expectedDone = (weeks: [number, number], elapsed: number) => clamp01((elapsed - (weeks[0] - 1)) / (weeks[1] - weeks[0] + 1));

/**
 * Ritmo esperado contra real: lo esperado sale de en qué semana estás y qué ítems ya tendrían que
 * estar hechos; lo real, de `done` (0 a 1 por id; lo que falte vale 0). Con 5 puntos o más de
 * diferencia a favor está "adelantado"; con 5 o más en contra, "atrasado".
 */
export function paceVsPlan(b: RoadmapBimester, date: string, done: Record<string, number>, tolerance = 0.05): BimesterProgress {
  const elapsed = weeksElapsed(b, date);
  const expected = weightedProgress(b.items.map((i) => ({ hours: i.hours, done: expectedDone(i.weeks, elapsed) })));
  const actual = weightedProgress(b.items.map((i) => ({ hours: i.hours, done: done[i.id] ?? 0 })));
  const delta = round(actual - expected, 4);
  const status: PaceStatus = delta >= tolerance ? 'adelantado' : delta <= -tolerance ? 'atrasado' : 'en ritmo';
  return { n: b.n, expected, actual, delta, status };
}

/** Puntaje de un eje de competencias, de 0 a 100: el nivel de cada ítem, ponderado por su peso. */
export function competencyScore(axis: CompetencyAxis): CompetencyScore {
  let num = 0;
  let den = 0;
  for (const i of axis.items) {
    const w = i.weight > 0 ? i.weight : 0;
    num += w * clamp01(i.level);
    den += w;
  }
  return { id: axis.id, label: axis.label, score: den > 0 ? Math.round((num / den) * 100) : 0 };
}

export const competencyScores = (axes: CompetencyAxis[]): CompetencyScore[] => axes.map(competencyScore);
