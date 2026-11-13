import { beforeEach, describe, expect, it } from 'vitest';
import { getState, register, resetState, startDay } from '../state/store';
import { addCards, completeLearn, saveTest } from '../state/study';
import { BUILTIN_PRESETS, DEFAULT_BLOCK_PRESETS, DEFAULT_PRESETS } from './defaults';
import { checkAnswer, chapterExercises, testExercises } from './ejercicios';
import {
  approves, cardsFromText, cierreSugerido, dailyReview, dueReview, groupSteps, planActivity, studySegs, sumMin, tesisStart, testOf, unitPhases, unitStatus,
} from './study';
import { CONAMAT_B1 } from './study-catalog';
import { addDays } from './time';

const D0 = '2026-11-11';
const ok = { concepto: 0, tecnica: 0, descuido: 0, enunciado: 0 };
const b5010 = BUILTIN_PRESETS[0];
const d = (n: number) => addDays(D0, n);

function plan(date: string, id = 'conamat', blockMin = 120) {
  const st = getState().study;
  const a = st.activities.find((x) => x.id === id)!;
  const review = dueReview(st.reviews, date).today;
  return planActivity(a, { study: st, date, blockMin, presets: DEFAULT_PRESETS, blockPresets: DEFAULT_BLOCK_PRESETS, review });
}
const test = (date: string, n: number, score = 20, total = 20) =>
  saveTest(date, 'conamat', n, { score, total, errors: { ...ok, descuido: total - score }, mode: 'papel' });
const reviews = (k: string) => getState().study.reviews.filter((r) => r.kind === k);

describe('cada capítulo: día 1 estudiar, día 2 test, día 3 tesis, días 8, 22 y 61 repetir', () => {
  beforeEach(() => {
    resetState();
    register('Toti', 'Abi', D0);
    startDay('completo', '04:00', D0);
  });

  it('día 1: estudiar el cap. 1 de corrido en pomodoros 50/10 enteros', () => {
    const t = plan(D0);
    expect(t.map((x) => [x.kind, x.min])).toEqual([['capitulo', 50], ['descanso', 10], ['capitulo', 50]]);
    expect(t[0]).toMatchObject({ step: 'estudiar', title: 'Cap. 1 · Números reales', paso: 'Cap. 1 · Números reales, de corrido', sub: 'Estudiar · de corrido, pomodoro 50/10' });
  });

  it('día 2: cold recall de 5 min y el test del capítulo de ayer; el capítulo nuevo al final', () => {
    completeLearn(D0, 'conamat', 1);
    expect(reviews('cold')).toMatchObject([{ due: d(1), min: 5 }]);
    const t = plan(d(1));
    expect(t.map((x) => x.kind)).toEqual(['cold', 'test', 'descanso', 'capitulo']);
    expect(t.map((x) => x.title)).toEqual(['Cold recall · cap. 1', 'Test completo · cap. 1', 'Descanso', 'Cap. 2 · Números enteros']);
    expect(t.map((x) => x.step)).toEqual(['test', 'test', 'test', 'estudiar']);
    expect(t[1]).toMatchObject({ min: 25, paso: 'Cap. 1 · 15 ejercicios, 85 % para pasar' });
  });

  it('un día cualquiera: cold recall, tarjetas, test de ayer, descanso, tesis de antes de ayer y capítulo nuevo', () => {
    completeLearn(D0, 'conamat', 1);
    test(d(1), 1, 14, 15); // tesis del cap. 1 el día 3
    completeLearn(d(1), 'conamat', 2);
    addCards(d(1), Array.from({ length: 8 }, (_, i) => ({ front: `P${i}`, back: `R${i}`, kind: 'pregunta' as const, deck: 'Matemática', frontId: 'math', source: 't' })));
    const st = getState().study;
    const a = st.activities[0];
    const daily = dailyReview(st, d(2));
    const t = planActivity(a, { study: st, date: d(2), blockMin: 120, presets: DEFAULT_PRESETS, blockPresets: DEFAULT_BLOCK_PRESETS, review: daily.today, groups: daily.groups });
    expect(t.map((x) => x.kind)).toEqual(['cold', 'tarjetas', 'test', 'descanso', 'tesis', 'capitulo']);
    expect(t.map((x) => x.title)).toEqual(['Cold recall · cap. 2', '8 tarjetas de Aritmética', 'Test completo · cap. 2', 'Descanso', 'Tesis · cap. 1', 'Cap. 3 · Teoría de números']);
    // 5 + 4 + 25 + 10 + 20 = 64: quedan 56 min, entra un pomodoro de 50.
    expect(t[t.length - 1].min).toBe(50);
    expect(sumMin(t)).toBe(114);
    expect(groupSteps(t).map((s) => [s.step, s.title, s.ver])).toEqual([
      ['test', 'Cap. 2 · Números enteros, sin mirar', 5],
      ['repetir', '8 tarjetas de Aritmética', 4],
      ['test', 'Cap. 2 · 20 ejercicios, 85 % para pasar', 25],
      ['tesis', 'Cap. 1 · Números reales, con tus palabras', 20],
      ['estudiar', 'Cap. 3 · Teoría de números, de corrido', 50],
    ]);
    expect(unitPhases(a, st, d(2))!.map((f) => `${f.name} ${f.when}`)).toEqual(['Estudiar cap. 3', 'Test cap. 2', 'Tesis cap. 1', 'Repetir 8 → 61']);
  });

  it('la sesión entra en el bloque y la lista de Estudio suma lo mismo', () => {
    completeLearn(D0, 'conamat', 1);
    for (const blockMin of [120, 90, 75]) {
      const t = plan(d(1), 'conamat', blockMin);
      expect(sumMin(t)).toBeLessThanOrEqual(blockMin);
      expect(sumMin(groupSteps(t))).toBe(sumMin(t));
    }
  });

  it('aprobado: la tesis al día siguiente (día 3, 20 min, fuera del tope) y repetir los días 8, 22 y 61', () => {
    completeLearn(D0, 'conamat', 1);
    expect(test(d(1), 1, 17, 20).approved).toBe(true);
    expect(reviews('tesis')).toMatchObject([{ due: d(2), min: 20, label: 'Tesis · Cap. 1 · Números reales' }]);
    expect([...reviews('ejercicios'), ...reviews('examen')].map((r) => r.due)).toEqual([d(7), d(21), d(60)]);
    expect(dueReview(getState().study.reviews, d(2)).today).toEqual([]);
    expect(plan(d(1)).some((x) => x.kind === 'tesis')).toBe(false);
    expect(unitStatus(getState().study.activities[0], getState().study, 1, d(2)).label).toBe('tesis hoy');
  });

  it('reprobado: releer al día siguiente, re-test al otro, y la tesis el día después de aprobar', () => {
    completeLearn(D0, 'conamat', 1);
    expect(test(d(1), 1, 12, 15).approved).toBe(false);
    expect(reviews('releer')).toMatchObject([{ due: d(2), min: 15 }]);
    const d2 = plan(d(2));
    expect(d2.some((x) => x.kind === 'test')).toBe(false);
    expect(d2[0]).toMatchObject({ kind: 'releer', title: 'Releer · cap. 1' });
    expect(unitStatus(getState().study.activities[0], getState().study, 1, d(2)).label).toBe('releer hoy');
    const d3 = plan(d(3));
    expect(d3.find((x) => x.kind === 'test')!.title).toBe('Re-test · cap. 1');
    expect(test(d(3), 1, 14, 15).approved).toBe(true);
    expect(reviews('tesis')).toMatchObject([{ due: d(4) }]);
  });

  it('a la tercera vez sin aprobar, el tema queda flojo y sigue a la tesis', () => {
    completeLearn(D0, 'conamat', 1);
    test(d(1), 1, 10, 15);
    test(d(3), 1, 11, 15);
    expect(test(d(5), 1, 12, 15)).toEqual({ approved: false, flojo: true });
    const s = getState().study.units.conamat[1];
    expect(s.flojo).toBe(d(5));
    expect(reviews('retest').filter((r) => !r.doneOn)).toEqual([]);
    expect(reviews('tesis')).toMatchObject([{ due: d(6) }]);
    // Los repasos no caen antes del día después de la tesis.
    expect(reviews('ejercicios')[0].due).toBe(d(7));
    expect(unitStatus(getState().study.activities[0], getState().study, 1, d(5))).toEqual({ label: 'flojo', tone: 'flojo' });
  });

  it('el cierre sugiere la victoria del día y lo primero de mañana', () => {
    completeLearn(D0, 'conamat', 1);
    test(d(1), 1, 18, 20);
    completeLearn(d(1), 'conamat', 2);
    expect(cierreSugerido(getState().study, d(1))).toEqual({ victoria: 'Aprobé el test del cap. 1', manana: 'Cold recall y test del cap. 2' });
  });
});

describe('test completo', () => {
  it('el corte es 85 %', () => {
    expect(approves(17, 20)).toBe(true);
    expect(approves(16, 20)).toBe(false);
    expect(approves(0, 0)).toBe(false);
  });

  it('15 nuevos del capítulo y, desde el cap. 2, 5 de los anteriores, en 25 min', () => {
    expect(testOf(CONAMAT_B1[0])).toEqual({ nuevos: 15, prev: 0, total: 15, min: 25 });
    expect(testOf(CONAMAT_B1[2])).toEqual({ nuevos: 15, prev: 5, total: 20, min: 25 });
    expect(testOf(CONAMAT_B1[10]).total).toBe(15);
  });

  it('los ejercicios salen del capítulo y de los anteriores, y el re-test trae otros', () => {
    const t = testExercises('conamat', 3, 15, 5);
    expect(t).toHaveLength(20);
    expect(t.slice(0, 15).every((e) => e.cap === 3)).toBe(true);
    expect(t.slice(15).every((e) => e.cap! < 3)).toBe(true);
    expect(testExercises('conamat', 3, 15, 5)).toEqual(t);
    expect(testExercises('conamat', 3, 15, 5, 1).map((e) => e.q)).not.toEqual(t.map((e) => e.q));
    expect(testExercises('prog-b1', 1, 1, 0)).toEqual([]);
  });

  it('cada respuesta del banco se corrige como bien, y otra cosa como mal', () => {
    for (let cap = 1; cap <= 11; cap++) {
      for (let s = 0; s < 8; s++) {
        for (const e of chapterExercises(cap, 7, `t:${cap}:${s}`)) {
          expect(e.a).not.toMatch(/NaN|Infinity|undefined/);
          expect(checkAnswer(e.a, e), `${e.q} → ${e.a}`).toBe(true);
          expect(checkAnswer(e.cmp === 'txt' ? 'zz' : '123456,7', e)).toBe(false);
        }
      }
    }
  });

  it('acepta otras formas de escribir lo mismo', () => {
    const f = { q: 'Descomponé 360.', a: '2^3·3^2·5', alts: ['2·2·2·3·3·5'] };
    expect(checkAnswer('2³·3²·5', f)).toBe(true);
    expect(checkAnswer('2^3 x 3^2 x 5', f)).toBe(true);
    expect(checkAnswer('2 2 2 3 3 5', f)).toBe(true);
    expect(checkAnswer('  ', f)).toBeNull();
    expect(checkAnswer('1.260', { q: 'MCM', a: '1260' })).toBe(true);
    expect(checkAnswer('0.375', { q: '3/8', a: '0,375' })).toBe(true);
    expect(checkAnswer('−1/6', { q: 'resta', a: '−1/6' })).toBe(true);
    expect(checkAnswer('Sí', { q: '¿divisible?', a: 'sí', cmp: 'txt' })).toBe(true);
  });

  it('los ejercicios fallados vuelven mañana como tarjetas', () => {
    resetState();
    register('Toti', 'Abi', D0);
    completeLearn(D0, 'conamat', 1);
    saveTest(D0, 'conamat', 1, { score: 13, total: 15, errors: { ...ok, concepto: 1, descuido: 1 }, mode: 'papel', wrong: [{ q: 'Calculá |3 − 7|.', a: '4', type: 'concepto' }, { q: 'Calculá |−2| − |5|.', a: '−3', type: 'descuido' }] });
    const cards = getState().study.cards;
    expect(cards.map((c) => [c.front, c.back, c.dueFrom])).toEqual([['Calculá |3 − 7|.', '4', addDays(D0, 1)], ['Calculá |−2| − |5|.', '−3', addDays(D0, 1)]]);
  });

  it('la tesis arranca por los errores del test', () => {
    expect(tesisStart({ date: D0, score: 18, total: 20, mode: 'papel', approved: true, errors: { ...ok, concepto: 1, descuido: 1 }, wrong: [{ q: 'Calculá |3 − 7|.', a: '4', type: 'concepto' }] }))
      .toBe('En el test sacaste 18 de 20. Un error de concepto (calculá |3 − 7|) y un descuido. Explicá primero la idea que no te salió.');
    expect(tesisStart({ date: D0, score: 20, total: 20, mode: 'app', approved: true, errors: ok })).toBe('En el test sacaste 20 de 20. Sin errores: explicá el capítulo de punta a punta.');
  });
});

describe('pomodoros y tarjetas', () => {
  it('estudiar en pomodoros 50/10 enteros, sin terminar en descanso; si no entra uno, de corrido', () => {
    expect(studySegs(b5010, 56).map((s) => s.min)).toEqual([50]);
    expect(studySegs(b5010, 110).map((s) => s.min)).toEqual([50, 10, 50]);
    expect(studySegs(b5010, 95).map((s) => s.min)).toEqual([50, 10, 35]);
    expect(studySegs(b5010, 36).map((s) => s.min)).toEqual([36]);
    expect(studySegs(BUILTIN_PRESETS[3], 120).map((s) => s.min)).toEqual([120]);
  });

  it('las líneas con :: o [[ ]] se vuelven tarjetas', () => {
    const c = cardsFromText('Los enteros son…\nSumar con signos distintos :: se restan los valores absolutos.\nRestar un número es sumar su [[opuesto]].');
    expect(c).toEqual([
      { front: 'Sumar con signos distintos', back: 'Se restan los valores absolutos.', kind: 'pregunta' },
      { front: 'Restar un número es sumar su ___.', back: 'opuesto', kind: 'completar' },
    ]);
  });
});
