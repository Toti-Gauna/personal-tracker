import { useMemo } from 'react';
import { blockDone } from '../data/mejora';
import { racha } from '../data/derive';
import { averagePct, dayPct } from '../data/goals';
import { dailyImprovementSeries, hoursByMonthLane, movingAverage } from '../data/roadmap-charts';
import {
  BIMS, LANES, bimCurve, bimOf, bimProgress, cumulativeSeries, laneItems, laneStatus, pace, pilotOf, progressMap, routeCurve,
  routeDay, routePlan, routeProgress, weekGoalValue, weekOf, weekStart, type LaneId, type RutaState,
} from '../data/ruta';
import type { RoadmapBimester } from '../data/roadmap.schema';
import { addDays, daysBetween } from '../data/time';
import type { DayLog } from '../data/types';
import { useStore, type State } from '../state/store';
import { weekPlan } from '../state/ruta';

export interface Compuerta {
  key: string;
  label: string;
  /** 0, 0,5 o 1. */
  state: number;
  /** Casillas que se marcan a mano (la compuerta las prende o apaga todas). */
  checks?: string[];
}

/** Las compuertas para cerrar un bimestre: lo automático sale del avance; lo demás se marca a mano. */
export function compuertas(b: RoadmapBimester, ruta: RutaState, p: Record<string, number>): Compuerta[] {
  const close = (i: number) => `b${b.n}:close:${i}`;
  const ch = (k: string) => !!ruta.checks[k];
  const math = laneItems(b, 'math');
  const mathDone = math.every((i) => (p[i.id] ?? 0) >= 1);
  const mathAny = math.some((i) => (p[i.id] ?? 0) > 0);
  const pieza = b.items.find((i) => i.id === `b${b.n}-pieza`)!;
  const pil = pilotOf(ruta, b);
  const plan = Object.values(ruta.weeks).some((w) => w.bim === b.n);
  const out: Compuerta[] = [
    { key: 'plan', label: 'Plan del bimestre cargado', state: plan ? 1 : 0 },
    { key: 'math', label: `Examen de ${b.summary.math} · 85 %`, state: mathDone ? 1 : mathAny ? 0.5 : 0 },
    { key: 'pub', label: `${b.product.name} publicado con su métrica`, state: ch(close(0)) ? 1 : 0, checks: [close(0)] },
    { key: 'aporte', label: 'Aporte abierto publicado', state: ch(close(1)) ? 1 : 0, checks: [close(1)] },
    { key: 'pieza', label: `${pieza.title.replace(' · pieza', '')}, con tests`, state: (p[pieza.id] ?? 0) >= 1 ? 1 : (p[pieza.id] ?? 0) > 0 ? 0.5 : 0 },
    { key: 'trailer', label: 'Tráiler, README y caso de estudio', state: [2, 3, 4].every((i) => ch(close(i))) ? 1 : [2, 3, 4].some((i) => ch(close(i))) ? 0.5 : 0, checks: [2, 3, 4].map(close) },
    { key: 'piloto', label: 'Piloto confirmado', state: pil.pilot >= 1 ? 1 : pil.demo >= 1 || pil.interested >= 1 ? 0.5 : 0 },
  ];
  if (b.cert) out.push({ key: 'cert', label: `${b.cert.name} aprobada${b.cert.optional ? ' (opcional)' : ''}`, state: (p[b.cert.item] ?? 0) >= 1 ? 1 : (p[b.cert.item] ?? 0) > 0 ? 0.5 : 0 });
  return out;
}

/** Todo lo que necesitan las pantallas de la ruta, calculado una vez. */
export function rutaVista(s: State, date: string) {
  const b = bimOf(date);
  const week = weekOf(b, date);
  const p = progressMap(s.ruta.log, date);
  const ritmo = pace(b, date, p);
  const desdeSemana = addDays(date, -6);
  const lanes = LANES.filter((l) => l.id !== 'cert' || b.cert).map((l) => {
    const st = laneStatus(b, l.id, date, p);
    const items = laneItems(b, l.id);
    const trend = l.id === 'piloto'
      ? Array.from({ length: 7 }, (_, k) => pilotOf(s.ruta, b, b.start, addDays(desdeSemana, k)).calls)
      : cumulativeSeries(s.ruta.log, items, desdeSemana, date, false);
    return { ...l, st, items, trend };
  });
  const { day, total } = routeDay(date);
  const wk = weekPlan(date);
  const from = wk.key;
  const to = addDays(wk.key, 6);
  const semana = wk.plan.goals.map((g) => ({ g, value: weekGoalValue(g, p, s.ruta.log, from, to) }));
  return {
    b, week, p, ritmo, lanes, day, total,
    bimAvance: bimProgress(b, p),
    rutaAvance: routeProgress(p),
    rutaPlan: routePlan(date),
    curva: bimCurve(b, s.ruta.log, date),
    compuertas: compuertas(b, s.ruta, p),
    semana, semanaKey: wk.key, semanaGuardada: wk.saved,
    piloto: pilotOf(s.ruta, b),
    pilotoSemana: pilotOf(s.ruta, b, from, to).calls,
  };
}

export function useRutaVista(date: string) {
  const s = useStore((x) => x);
  return useMemo(() => rutaVista(s, date), [s, date]);
}

// ——— Tu evolución ———

export type Rango = 'dia' | 'semana' | 'mes' | 'bim' | 'anio';
const MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const dm = (d: string) => `${Number(d.slice(8))} ${MES[Number(d.slice(5, 7)) - 1]}`;

/** La serie de mejora según el rango: días, semanas, meses, bimestres o años (promedios). */
export function mejoraSerie(days: Record<string, DayLog>, date: string, rango: Rango) {
  if (rango === 'dia') {
    // Con pocos días, el gráfico arranca en el primer día cargado (gráfico parcial), no en 30 días de ceros.
    const primero = Object.keys(days).sort()[0] ?? date;
    const desde = addDays(date, -29) > primero ? addDays(date, -29) : primero < date ? primero : addDays(date, -1);
    const s = dailyImprovementSeries(days, desde, date);
    return {
      values: s.map((x) => x.mejora), avg: s.map((x) => x.mejora7), titulo: s.length < 30 ? `${s.length} ${s.length === 1 ? 'día' : 'días'} desde el día 0` : 'últimos 30 días',
      labels: s.map((x, i) => (i === s.length - 1 ? 'hoy' : i % 7 === 0 && s.length - 1 - i >= 4 ? dm(x.date) : '')),
      cargados: s.filter((x) => x.logged).length,
    };
  }
  const buckets: { label: string; from: string; to: string }[] = [];
  if (rango === 'semana') for (let k = 11; k >= 0; k--) { const to = addDays(date, -7 * k); buckets.push({ label: k === 0 ? 'hoy' : k % 3 === 0 ? dm(addDays(to, -6)) : '', from: addDays(to, -6), to }); }
  if (rango === 'mes') {
    const [y, m] = date.split('-').map(Number);
    for (let k = 11; k >= 0; k--) {
      const d = new Date(y, m - 1 - k, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      buckets.push({ label: MES[d.getMonth()], from: `${key}-01`, to: `${key}-31` });
    }
  }
  if (rango === 'bim') for (const b of BIMS) if (b.start <= date) buckets.push({ label: `B${b.n}`, from: b.start, to: b.end < date ? b.end : date });
  if (rango === 'anio') for (const y of [1, 2, 3]) { const bs = BIMS.filter((b) => b.year === y && b.start <= date); if (bs.length) buckets.push({ label: `Año ${y}`, from: bs[0].start, to: bs[bs.length - 1].end < date ? bs[bs.length - 1].end : date }); }
  const s = dailyImprovementSeries(days, buckets[0]?.from ?? date, date);
  const values = buckets.map((bk) => { const xs = s.filter((x) => x.date >= bk.from && x.date <= bk.to && x.logged); return xs.length ? xs.reduce((a, x) => a + x.mejora, 0) / xs.length : 0; });
  const titulos: Record<Rango, string> = { dia: '', semana: 'últimas 12 semanas', mes: 'últimos 12 meses', bim: 'bimestre a bimestre', anio: 'año a año' };
  return { values, avg: movingAverage(values, 3), labels: buckets.map((bk) => bk.label), titulo: titulos[rango], cargados: s.filter((x) => x.logged).length };
}

/** Constancia: 15 semanas que terminan en la actual. */
export function constancia(days: Record<string, DayLog>, date: string, weeks = 15) {
  const dow = (new Date(`${date}T12:00:00`).getDay() + 6) % 7;
  const start = addDays(date, -dow - (weeks - 1) * 7);
  return Array.from({ length: weeks * 7 }, (_, i) => {
    const d = addDays(start, i);
    const pct = dayPct(days[d]);
    const primero = Object.keys(days).sort()[0] ?? date;
    const libre = i % 7 === 1 && !days[d] && d >= primero;
    const level = pct == null ? null : pct >= 0.85 ? 3 : pct >= 0.5 ? 2 : pct > 0 ? 1 : 0;
    return { date: d, level, libre, futuro: d > date || d < primero };
  });
}

/** Mes a mes desde el inicio de la ruta (hasta 12 meses): horas de matemática y programación y % de metas. */
export function mesAMes(days: Record<string, DayLog>, date: string) {
  const h = hoursByMonthLane(days);
  const start = date < '2026-11-01' ? date : '2026-11-01';
  const months: { label: string; math: number; prog: number; metas: number | null; actual: boolean }[] = [];
  const [y0, m0] = start.split('-').map(Number);
  const [y1, m1] = date.split('-').map(Number);
  for (let k = 0, y = y0, m = m0; y < y1 || (y === y1 && m <= m1); k++) {
    const key = `${y}-${String(m).padStart(2, '0')}`;
    const avg = averagePct(days, `${key}-01`, `${key}-31`);
    months.push({ label: MES[m - 1], math: h.find((x) => x.month === key && x.lane === 'math')?.hours ?? 0, prog: h.find((x) => x.month === key && x.lane === 'prog')?.hours ?? 0, metas: avg.loaded ? avg.avg : null, actual: key === date.slice(0, 7) });
    m++;
    if (m > 12) { m = 1; y++; }
  }
  return months.slice(-12);
}

/** Lo que construiste: conteos y su historia (semanal) para los mini gráficos. */
export function construiste(s: State, date: string) {
  const p = progressMap(s.ruta.log, date);
  const desde = addDays(BIMS[0].start, 0) < date ? BIMS[0].start : addDays(date, -28);
  const semanas = Math.max(2, Math.min(52, Math.ceil(daysBetween(desde, date) / 7) + 1));
  const serie = (ids: string[]) => Array.from({ length: semanas }, (_, k) => {
    const d = addDays(desde, k * 7);
    const pk = progressMap(s.ruta.log, d > date ? date : d);
    return ids.filter((id) => (pk[id] ?? 0) >= 1).length;
  });
  const productos = BIMS.map((b) => `b${b.n}-producto`);
  const piezas = BIMS.map((b) => `b${b.n}-pieza`);
  const certs = BIMS.filter((b) => b.cert).map((b) => b.cert!.item);
  const aportes = BIMS.filter((b) => s.ruta.checks[`b${b.n}:close:1`]).length;
  const maduras = s.study.cards.filter((c) => c.srs?.state === 'review' && c.srs.s >= 21).length;
  const pilotos = Object.values(s.ruta.pilot).reduce((a, x) => a + x.pilot, 0);
  return [
    { label: 'Productos', value: productos.filter((i) => (p[i] ?? 0) >= 1).length, serie: serie(productos), color: 'var(--eclipse)' },
    { label: 'Piezas desde cero', value: piezas.filter((i) => (p[i] ?? 0) >= 1).length, serie: serie(piezas), color: 'var(--handyx)' },
    { label: 'Aportes abiertos', value: aportes, serie: [0, aportes], color: 'var(--economia)' },
    { label: 'Certificaciones', value: certs.filter((i) => (p[i] ?? 0) >= 1).length, serie: serie(certs), color: 'var(--rutina)' },
    { label: 'Tarjetas dominadas', value: maduras, serie: [0, maduras], color: 'var(--ing)' },
    { label: 'Pilotos', value: pilotos, serie: [0, pilotos], color: 'var(--salud)' },
  ];
}

export const conamatHechos = (p: Record<string, number>) => BIMS.slice(0, 6).flatMap((b) => b.items).filter((i) => i.id.includes('-conamat-') && (p[i.id] ?? 0) >= 1).length;
export const bimsCerrados = (p: Record<string, number>, date: string) => BIMS.filter((b) => b.end < date || bimProgress(b, p) >= 1).filter((b) => bimProgress(b, p) >= 0.85).length;

export { racha, routeCurve, blockDone, weekStart };
export type { LaneId };
