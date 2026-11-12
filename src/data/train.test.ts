import { describe, expect, it } from 'vitest';
import { emptyTrain } from './train-catalog';
import { exercisesMin, history, isDeloadWeek, nextTarget, pace, plannedFor, recordsFor, stalls, totalMin, volume, type Hist } from './train';
import type { Exercise, SetLog, TrainSession } from './train-types';

const ex = (kind: Exercise['kind'], sets = 3, lo = 8, hi = 10): Exercise => ({ id: 'e', name: 'E', sets, repMin: lo, repMax: hi, rest: 120, kind });
const h = (kg: number, ...reps: number[]): Hist => ({ date: '2026-11-01', kg, reps });
const sess = (date: string, who: 'me' | 'partner', exId: string, kg: number, reps: number[], deload = false): TrainSession => ({
  id: date + who, date, routineId: 'legs', routineName: 'Piernas', minutes: 60, athletes: [who], deload, note: '', skipped: [], records: [],
  sets: reps.map((r, i) => ({ ex: exId, who, i: i + 1, kg, reps: r })),
});

describe('doble progresión', () => {
  it('sin historial: pide elegir el peso y arranca en el mínimo', () => {
    expect(nextTarget([], ex('torso'), [8, 10])).toMatchObject({ kg: 0, reps: [8, 8, 8], kind: 'nuevo' });
  });

  it('suma una repetición en la serie más baja, sin pasar el tope', () => {
    const t = nextTarget([h(100, 8, 8, 7, 7)], ex('pierna', 4, 6, 8), [6, 8]);
    expect(t).toMatchObject({ kg: 100, reps: [8, 8, 8, 7], kind: 'rep' });
    expect(nextTarget([h(80, 8, 8, 8)], ex('torso'), [8, 10]).reps).toEqual([9, 8, 8]);
  });

  it('con una repetición para subir: "falta 1 rep"', () => {
    const t = nextTarget([h(100, 8, 8, 8, 7)], ex('pierna', 4, 6, 8), [6, 8]);
    expect(t).toMatchObject({ kg: 100, reps: [8, 8, 8, 8], kind: 'falta', note: 'falta 1 rep para subir' });
  });

  it('al tope en todas las series sube el peso (+5 piernas, +2,5 torso, +1 aislamiento) y vuelve al mínimo', () => {
    expect(nextTarget([h(100, 8, 8, 8, 8)], ex('pierna', 4, 6, 8), [6, 8])).toMatchObject({ kg: 105, reps: [6, 6, 6, 6], kind: 'sube', note: 'sube de 100 kg' });
    expect(nextTarget([h(80, 10, 10, 10)], ex('torso'), [8, 10])).toMatchObject({ kg: 82.5, reps: [8, 8, 8] });
    expect(nextTarget([h(29, 12, 12, 12)], ex('aislamiento', 3, 12, 12), [12, 12])).toMatchObject({ kg: 30, reps: [12, 12, 12] });
  });

  it('estancado: 2 sesiones iguales se mantiene y 3 baja un 10 %', () => {
    const e = ex('aislamiento', 3, 12, 12);
    expect(stalls([h(45, 12, 12, 11), h(45, 12, 12, 11)])).toBe(1);
    expect(nextTarget([h(45, 12, 12, 11), h(45, 12, 12, 11)], e, [12, 12])).toMatchObject({ kg: 45, kind: 'mantiene', note: 'se mantiene · 2.ª igual' });
    const t = nextTarget([h(45, 12, 12, 11), h(45, 12, 12, 11), h(45, 12, 11, 11)], e, [12, 12]);
    expect(t).toMatchObject({ kg: 40.5, reps: [12, 12, 12], kind: 'baja' });
  });

  it('mejorar o subir de peso reinicia el conteo', () => {
    expect(stalls([h(45, 12, 11, 11), h(45, 12, 12, 11)])).toBe(0);
    expect(stalls([h(40, 12, 12, 12), h(45, 12, 12, 12), h(45, 12, 12, 12)])).toBe(1);
  });

  it('la semana de descarga mantiene el peso con la mitad de las series', () => {
    const t = nextTarget([h(100, 8, 8, 8, 7)], ex('pierna', 4, 6, 8), [6, 8], true);
    expect(t).toMatchObject({ kg: 100, kind: 'descarga' });
    expect(t.reps).toHaveLength(2);
  });

  it('cada uno tiene su rango: Toti 6-8 y Abi 8-10', () => {
    const e = ex('pierna', 4, 6, 8);
    expect(nextTarget([h(52.5, 10, 10, 9, 8)], e, [8, 10]).reps).toEqual([10, 10, 9, 9]);
    expect(nextTarget([h(100, 8, 8, 8, 7)], e, [6, 8]).reps).toEqual([8, 8, 8, 8]);
  });
});

describe('semanas de descarga, récords y volumen', () => {
  it('descarga cada 6 semanas desde el primer entreno', () => {
    const ss = [sess('2026-11-09', 'me', 'e', 100, [8])];
    expect(isDeloadWeek(ss, '2026-11-16')).toBe(false);
    expect(isDeloadWeek(ss, '2026-12-14')).toBe(true); // semana 6
    expect(isDeloadWeek(ss, '2026-12-21')).toBe(false);
    expect(isDeloadWeek([], '2026-12-14')).toBe(false);
  });

  it('la descarga no cuenta en el historial', () => {
    const ss = [sess('2026-11-09', 'me', 'e', 100, [8, 8, 8]), sess('2026-12-14', 'me', 'e', 100, [8], true)];
    expect(history(ss, 'me', 'e')).toHaveLength(1);
  });

  it('récord por peso o por repeticiones con el mismo peso', () => {
    const prev = [sess('2026-11-09', 'me', 'sent', 97.5, [8, 8, 8]), sess('2026-11-09', 'partner', 'prensa', 90, [10, 10, 10])];
    const hoy: SetLog[] = [
      { ex: 'sent', who: 'me', i: 1, kg: 100, reps: 8 },
      { ex: 'prensa', who: 'partner', i: 1, kg: 90, reps: 12 },
      { ex: 'nuevo', who: 'me', i: 1, kg: 50, reps: 10 },
    ];
    const r = recordsFor(prev, hoy, { sent: 'Sentadilla', prensa: 'Prensa' });
    expect(r.map((x) => x.text)).toEqual(['+2,5 kg contra la mejor marca', '+2 repeticiones con el mismo peso']);
  });

  it('volumen en kg movidos', () => {
    const sets: SetLog[] = [{ ex: 'a', who: 'me', i: 1, kg: 100, reps: 8 }, { ex: 'a', who: 'partner', i: 1, kg: 50, reps: 10 }];
    expect(volume(sets, 'me')).toBe(800);
    expect(volume(sets)).toBe(1300);
  });
});

describe('rutinas y semana', () => {
  const t = emptyTrain();
  it('Piernas dura unos 70 min de ejercicios y ~2 h con antes y después', () => {
    const legs = t.routines.find((r) => r.id === 'legs')!;
    expect(exercisesMin(legs)).toBe(70);
    expect(totalMin(legs)).toBe(130);
  });

  it('el miércoles toca Piernas y el domingo, descanso activo', () => {
    expect(plannedFor(t, '2026-11-11').routine?.name).toBe('Piernas');
    expect(plannedFor(t, '2026-11-15').rest).toBe(true);
  });

  it('ritmo de peso por semana', () => {
    expect(pace([{ date: '2026-09-13', kg: 86 }])).toBeNull();
    const p = pace([{ date: '2026-09-13', kg: 86 }, { date: '2026-11-08', kg: 88.4 }])!;
    expect(p.change).toBeCloseTo(2.4);
    expect(p.perWeek).toBeCloseTo(0.3, 1);
  });
});
