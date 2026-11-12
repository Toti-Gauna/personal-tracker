import { bimesterAt, BIMESTERS } from './bimesters';
import { approves } from './study';
import type { Goal, Horizon } from './goals-types';
import type { StudyState } from './study-types';
import type { TrainState } from './train-types';
import { addDays, dateKey, parseDate } from './time';
import type { DayLog } from './types';
import { weekday } from './study';

/** Clave del período de una fecha: el día, el lunes de la semana, el mes, el bimestre o el año. */
export function periodKey(h: Horizon, date: string): string {
  switch (h) {
    case 'dia': return date;
    case 'semana': return addDays(date, -weekday(date));
    case 'mes': return date.slice(0, 7);
    case 'bim': return `b${bimesterAt(date).n}`;
    case 'anio': return `y${yearOf(date)}`;
  }
}

/** Año 1 va de nov 2026 a oct 2027. */
export const yearOf = (date: string) => {
  const [y, m] = date.split('-').map(Number);
  return m >= 11 ? y - 2025 : y - 2026;
};

export const HORIZON_LABEL: Record<Horizon, string> = { dia: 'Día', semana: 'Semana', mes: 'Mes', bim: 'Bim.', anio: 'Año' };

/** Rango [desde, hasta] (inclusive) de un período. */
export function periodRange(h: Horizon, date: string): [string, string] {
  switch (h) {
    case 'dia': return [date, date];
    case 'semana': { const s = periodKey('semana', date); return [s, addDays(s, 6)]; }
    case 'mes': {
      const [y, m] = date.split('-').map(Number);
      return [`${y}-${String(m).padStart(2, '0')}-01`, dateKey(new Date(y, m, 0))];
    }
    case 'bim': { const b = bimesterAt(date); return [b.start, b.end]; }
    case 'anio': {
      const y = yearOf(date);
      const i = (y - 1) * 6;
      return [BIMESTERS[i].start, BIMESTERS[Math.min(i + 5, BIMESTERS.length - 1)].end];
    }
  }
}

/** ¿La meta cuenta en el período que contiene `date`? */
export function appliesTo(g: Goal, h: Horizon, date: string) {
  if (g.horizon !== h) return false;
  const key = periodKey(h, date);
  return g.repeat ? key >= g.from : key === g.from;
}

/** Avance de una meta en el período de `date`: automático o el sumado a mano. */
export function valueOf(g: Goal, date: string, ctx: { study: StudyState; days: Record<string, DayLog>; train?: TrainState }): number {
  const key = periodKey(g.horizon, date);
  if (!g.auto) return g.progress[key] ?? 0;
  const [from, to] = periodRange(g.horizon, date);
  const inRange = (d: string) => d >= from && d <= to;
  switch (g.auto.kind) {
    case 'tests':
      return Object.values(ctx.study.units).flatMap((u) => Object.values(u)).flatMap((s) => s.tests)
        .filter((t) => inRange(t.date) && approves(t.score, t.total, t.errors)).length;
    case 'horas': {
      const front = g.auto.front;
      const min = Object.entries(ctx.days).filter(([d]) => inRange(d))
        .flatMap(([, day]) => day.study ?? []).filter((l) => l.front === front).reduce((s, l) => s + l.min, 0);
      return Math.round((min / 60) * 10) / 10;
    }
    case 'entreno':
      return ctx.train ? ctx.train.sessions.filter((s) => inRange(s.date)).length : 0;
    case 'peso': {
      const w = ctx.train?.weights.filter((x) => x.date <= date).sort((a, b) => a.date.localeCompare(b.date)).pop();
      return w?.kg ?? 0;
    }
    case 'actividad': {
      const id = g.auto.id;
      const a = ctx.study.activities.find((x) => x.id === id);
      if (!a) return 0;
      if (a.units) return a.units.filter((u) => ctx.study.units[a.id]?.[u.n]?.approvedOn).length;
      return a.progress;
    }
  }
}

export const ratio = (value: number, target: number) => (target > 0 ? Math.min(1, value / target) : 0);

/** Qué porcentaje de cada día se cumplió: tareas hechas sobre tareas del día. */
export function dayPct(day?: DayLog): number | null {
  if (!day) return null;
  const t = day.blocks.flatMap((b) => b.tasks);
  return t.length ? t.filter((x) => x.done).length / t.length : null;
}

/** Promedio de los días cargados de un rango. */
export function averagePct(days: Record<string, DayLog>, from: string, to: string) {
  const ps = Object.entries(days).filter(([d]) => d >= from && d <= to).map(([, day]) => dayPct(day)).filter((x): x is number => x != null);
  return { loaded: ps.length, avg: ps.length ? ps.reduce((a, b) => a + b, 0) / ps.length : 0 };
}

/** Meses del año 1, de noviembre a octubre. */
export function yearMonths(year = 1) {
  const out: { key: string; letter: string; name: string }[] = [];
  const names = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const letters = ['E', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
  for (let i = 0; i < 12; i++) {
    const m = (10 + i) % 12;
    const y = 2025 + year + (10 + i >= 12 ? 1 : 0);
    out.push({ key: `${y}-${String(m + 1).padStart(2, '0')}`, letter: letters[m], name: names[m] });
  }
  return out;
}

export const monthLabel = (date: string) => {
  const names = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  return names[parseDate(date).getMonth()];
};
