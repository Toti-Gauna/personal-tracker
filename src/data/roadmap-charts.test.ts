import { describe, expect, it } from 'vitest';
import raw from '../../data/roadmap.json';
import {
  competencyScore, competencyScores, dailyImprovementSeries, expectedDone, hoursByMonthLane, movingAverage, paceVsPlan, weeksElapsed, weightedProgress,
} from './roadmap-charts';
import type { Roadmap } from './roadmap.schema';
import type { DayLog } from './types';

const b1 = (raw as unknown as Roadmap).bimesters[0];

const dia = (date: string, hechas: number, extra: Partial<DayLog> = {}): DayLog => ({
  date, wake: '04:00', routine: 'completo', notes: [], focus: [],
  blocks: Array.from({ length: 8 }, (_, i) => ({
    key: `b${i}`, n: i + 1, title: 'x', short: 'x', area: 'ing' as const, kind: 'pomodoro' as const, start: '04:00', min: 30, fixed: false,
    tasks: [{ id: `t${i}`, t: 'x', done: i < hechas }],
  })),
  ...extra,
});

describe('promedio móvil de 7 días', () => {
  it('promedia los últimos 7 y, al principio, los que haya', () => {
    expect(movingAverage([1, 2, 3])).toEqual([1, 1.5, 2]);
    const r = movingAverage([0, 0, 0, 0, 0, 0, 7, 7]);
    expect(r[6]).toBe(1); // 7 / 7
    expect(r[7]).toBe(2); // 14 / 7: el primer 0 ya salió de la ventana
  });
  it('una ventana de 1 devuelve lo mismo, y vacío devuelve vacío', () => {
    expect(movingAverage([3, 1, 2], 1)).toEqual([3, 1, 2]);
    expect(movingAverage([])).toEqual([]);
  });
});

describe('serie diaria de mejora', () => {
  it('un punto por día, con 0 en los días sin registro y el promedio de 7 días', () => {
    const days = { '2026-11-16': dia('2026-11-16', 8), '2026-11-18': dia('2026-11-18', 4) };
    const s = dailyImprovementSeries(days, '2026-11-16', '2026-11-18');
    expect(s.map((p) => p.date)).toEqual(['2026-11-16', '2026-11-17', '2026-11-18']);
    expect(s.map((p) => p.mejora)).toEqual([1, 0, 0.5]);
    expect(s.map((p) => p.logged)).toEqual([true, false, true]);
    expect(s[2].mejora7).toBe(0.5); // (1 + 0 + 0.5) / 3
    expect(dailyImprovementSeries(days, '2026-11-18', '2026-11-16')).toEqual([]);
  });
});

describe('horas por mes y por carril', () => {
  it('suma el estudio por frente y el foco en los bloques de producto, mes a mes', () => {
    const days = {
      '2026-11-30': dia('2026-11-30', 0, { study: [{ front: 'math', activityId: 'a', min: 90 }, { front: 'lectura', activityId: 'l', min: 30 }] }),
      '2026-12-01': dia('2026-12-01', 0, {
        study: [{ front: 'math', activityId: 'a', min: 30 }, { front: 'prog', activityId: 'p', min: 60 }],
        focus: [{ key: 'handyx', plan: '50/10', focusMin: 120, at: '10:00' }, { key: 'abi', plan: 'x', focusMin: 90, at: '08:30' }],
      }),
      '2026-12-15': dia('2026-12-15', 0, { study: [{ front: 'math', activityId: 'a', min: 30 }] }),
    };
    expect(hoursByMonthLane(days)).toEqual([
      { month: '2026-11', lane: 'math', hours: 1.5 },
      { month: '2026-12', lane: 'math', hours: 1 },
      { month: '2026-12', lane: 'product', hours: 2 },
      { month: '2026-12', lane: 'prog', hours: 1 },
    ]);
  });
});

describe('avance ponderado por horas', () => {
  it('pesa cada ítem por sus horas; sin horas pesa 1', () => {
    expect(weightedProgress([{ hours: 40, done: 1 }, { hours: 10, done: 0 }])).toBe(0.8);
    expect(weightedProgress([{ done: 1 }, { done: 0 }])).toBe(0.5);
    expect(weightedProgress([{ hours: 90, done: 0.5 }, { done: 1 }])).toBeCloseTo(46 / 91, 3);
  });
  it('limita el avance a 0–1 y devuelve 0 sin ítems', () => {
    expect(weightedProgress([{ hours: 10, done: 3 }, { hours: 10, done: -2 }])).toBe(0.5);
    expect(weightedProgress([])).toBe(0);
  });
});

describe('ritmo esperado contra real', () => {
  it('semanas transcurridas: 0 antes de empezar, 9 después de terminar', () => {
    expect(weeksElapsed(b1, '2026-11-01')).toBe(0);
    expect(weeksElapsed(b1, '2026-11-23')).toBe(1);
    expect(weeksElapsed(b1, '2027-01-15')).toBeCloseTo(8.571, 2);
    expect(weeksElapsed(b1, '2027-02-01')).toBe(9);
  });
  it('lo esperado de un ítem va de 0 a 1 a lo largo de sus semanas', () => {
    expect(expectedDone([3, 4], 2)).toBe(0);
    expect(expectedDone([3, 4], 3)).toBe(0.5);
    expect(expectedDone([3, 4], 4)).toBe(1);
  });
  it('a mitad de bimestre, sin nada hecho está atrasado; con todo lo previsto, en ritmo; con más, adelantado', () => {
    const fecha = '2026-12-14'; // 4 semanas
    const nada = paceVsPlan(b1, fecha, {});
    expect(nada.expected).toBeGreaterThan(0.3);
    expect(nada).toMatchObject({ actual: 0, status: 'atrasado' });

    const alDia: Record<string, number> = Object.fromEntries(b1.items.map((i) => [i.id, expectedDone(i.weeks, 4)]));
    expect(paceVsPlan(b1, fecha, alDia)).toMatchObject({ delta: 0, status: 'en ritmo' });

    const todo: Record<string, number> = Object.fromEntries(b1.items.map((i) => [i.id, 1]));
    expect(paceVsPlan(b1, fecha, todo).status).toBe('adelantado');
    expect(paceVsPlan(b1, '2026-11-16', {})).toMatchObject({ expected: 0, status: 'en ritmo' });
  });
  it('la tolerancia es de 5 puntos y se puede cambiar', () => {
    const casi: Record<string, number> = Object.fromEntries(b1.items.map((i) => [i.id, Math.max(0, expectedDone(i.weeks, 4) - 0.03)]));
    expect(paceVsPlan(b1, '2026-12-14', casi).status).toBe('en ritmo');
    expect(paceVsPlan(b1, '2026-12-14', casi, 0.01).status).toBe('atrasado');
  });
});

describe('puntaje de competencias', () => {
  const eje = { id: 'seguridad', label: 'Seguridad', items: [{ id: 'owasp', weight: 3, level: 1 }, { id: 'labs', weight: 1, level: 0 }] };
  it('es el nivel ponderado, de 0 a 100', () => {
    expect(competencyScore(eje)).toEqual({ id: 'seguridad', label: 'Seguridad', score: 75 });
    expect(competencyScore({ ...eje, items: [{ id: 'a', weight: 1, level: 0.333 }] }).score).toBe(33);
  });
  it('sin pesos o sin ítems vale 0, y los niveles se limitan a 0–1', () => {
    expect(competencyScore({ ...eje, items: [] }).score).toBe(0);
    expect(competencyScore({ ...eje, items: [{ id: 'a', weight: 0, level: 1 }] }).score).toBe(0);
    expect(competencyScore({ ...eje, items: [{ id: 'a', weight: 1, level: 5 }, { id: 'b', weight: 1, level: -1 }] }).score).toBe(50);
  });
  it('puntúa varios ejes', () => {
    expect(competencyScores([eje, { id: 'ml', label: 'ML', items: [{ id: 'x', weight: 1, level: 0.5 }] }]).map((s) => s.score)).toEqual([75, 50]);
  });
});
