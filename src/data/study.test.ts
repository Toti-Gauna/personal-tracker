import { beforeEach, describe, expect, it } from 'vitest';
import { getState, register, resetState, startDay } from '../state/store';
import { completeLearn, completeReview, saveTest } from '../state/study';
import { BUILTIN_PRESETS, DEFAULT_BLOCK_PRESETS, DEFAULT_PRESETS } from './defaults';
import { checkAnswer, chapterExercises, testExercises } from './ejercicios';
import {
  approves, cardsFromText, cierreSugerido, dueReview, groupSteps, planActivity, studySegs, sumMin, tesisStart, testOf, unitPhases, unitStatus,
} from './study';
import { CONAMAT_B1 } from './study-catalog';
import { addDays } from './time';

const D0 = '2026-11-11';
const ok = { concepto: 0, tecnica: 0, descuido: 0, enunciado: 0 };
const b5010 = BUILTIN_PRESETS[0];

function plan(date: string, id = 'conamat', blockMin = 120) {
  const st = getState().study;
  const a = st.activities.find((x) => x.id === id)!;
  const review = dueReview(st.reviews, date).today;
  return planActivity(a, { study: st, date, blockMin, presets: DEFAULT_PRESETS, blockPresets: DEFAULT_BLOCK_PRESETS, review });
}

/** Aprueba un capítulo entero el día `d` (estudiar + test). */
const aprobar = (d: string, n: number, score = 20, total = 20) => {
  completeLearn(d, 'conamat', n);
  return saveTest(d, 'conamat', n, { score, total, errors: { ...ok, descuido: total - score }, mode: 'papel' });
};

describe('el día de un capítulo: Estudiar → Test, y lo que vence primero', () => {
  beforeEach(() => {
    resetState();
    register('Toti', 'Abi', D0);
    startDay('completo', '04:00', D0);
  });

  it('día 0: estudiar el cap. 1 de corrido en 50/10 y su test completo, sin tesis', () => {
    const t = plan(D0);
    expect([...new Set(t.map((x) => x.step))]).toEqual(['estudiar', 'test']);
    expect(t.some((x) => x.kind === 'tesis')).toBe(false);
    expect(t[0]).toMatchObject({ title: 'Cap. 1 · Números reales', paso: 'Cap. 1 · Números reales, de corrido', min: 50 });
    expect(t[0].sub).toBe('Estudiar · de corrido, pomodoro 50/10');
    expect(t[1]).toMatchObject({ kind: 'descanso', min: 10 });
    expect(t[t.length - 1]).toMatchObject({ title: 'Test completo · cap. 1', paso: 'Cap. 1 · 15 ejercicios, 85 % para pasar', min: 25 });
  });

  it('la sesión entra en el bloque en pomodoros enteros y la lista de Estudio suma lo mismo', () => {
    for (const blockMin of [120, 90, 75]) {
      const t = plan(D0, 'conamat', blockMin);
      expect(sumMin(t)).toBeLessThanOrEqual(blockMin);
      expect(sumMin(groupSteps(t))).toBe(sumMin(t));
    }
  });

  it('el día de la referencia: cold recall del cap. 2, tesis del cap. 1, estudiar el cap. 3 y su test', () => {
    aprobar(D0, 1, 14, 15); // tesis del cap. 1 a +3
    completeReview(addDays(D0, 1), getState().study.reviews.find((r) => r.kind === 'cold')!.id);
    aprobar(addDays(D0, 2), 2); // cold recall del cap. 2 a +1
    const d3 = plan(addDays(D0, 3));
    expect(d3.map((x) => x.kind)).toEqual(['cold', 'tesis', 'capitulo', 'descanso', 'test']);
    expect(d3.map((x) => x.title)).toEqual(['Cold recall · cap. 2', 'Tesis · cap. 1', 'Cap. 3 · Teoría de números', 'Descanso', 'Test completo · cap. 3']);
    expect(groupSteps(d3).map((s) => s.title)).toEqual([
      'Cap. 2 · Números enteros, sin mirar', 'Cap. 1 · Números reales, con tus palabras', 'Cap. 3 · Teoría de números, de corrido', 'Cap. 3 · 20 ejercicios, 85 % para pasar',
    ]);
    // 5 + 20 + 50 + 10 + 25: lo que sobra del bloque (10 min) no alcanza para otro pomodoro.
    expect(sumMin(d3)).toBe(110);
  });

  it('la tesis dura 20 min y va fuera del tope de 20 min de repaso', () => {
    const mk = (id: string, kind: 'cold' | 'tesis' | 'ejercicios', min: number, due = D0) => ({ id, activityId: 'conamat', kind, due, min, label: id });
    const r = dueReview([mk('e', 'ejercicios', 15, '2026-11-01'), mk('t', 'tesis', 20), mk('c', 'cold', 5), mk('x', 'ejercicios', 15, '2026-11-20')], D0);
    expect(r.today.map((x) => x.id)).toEqual(['c', 'e']);
    expect(r.min).toBe(20);
    expect(r.tesis.map((x) => x.id)).toEqual(['t']);
    expect(r.skipped).toEqual([]);
  });

  it('con 85 % o más la tesis queda a +3 (nunca el mismo día que el test)', () => {
    expect(aprobar(D0, 1, 17, 20)).toBe(true);
    const tesis = getState().study.reviews.find((r) => r.kind === 'tesis')!;
    expect(tesis).toMatchObject({ due: addDays(D0, 3), min: 20, label: 'Tesis · Cap. 1 · Números reales' });
    expect(plan(D0).some((x) => x.kind === 'tesis')).toBe(false);
    expect(unitStatus(getState().study.activities[0], getState().study, 1, addDays(D0, 3)).label).toBe('tesis hoy');
  });

  it('con menos de 85 %: releer lo que falló y re-test a los 2 días, sin test en el medio', () => {
    expect(aprobar(D0, 1, 12, 15)).toBe(false);
    const d1 = plan(addDays(D0, 1));
    expect(d1.some((x) => x.step === 'test')).toBe(false);
    expect(d1.find((x) => x.step === 'estudiar')!.sub).toMatch(/^Estudiar · releer lo que falló/);
    const d2 = plan(addDays(D0, 2));
    expect(d2[d2.length - 1].title).toBe('Re-test · cap. 1');
    expect(unitStatus(getState().study.activities[0], getState().study, 1, addDays(D0, 2)).label).toBe('re-test hoy');
    expect(getState().study.reviews.some((r) => r.kind === 'tesis')).toBe(false);
  });

  it('las fases del capítulo en curso: en qué estás y cuándo toca cada una', () => {
    const f = unitPhases(getState().study.activities[0], getState().study, D0)!;
    expect(f.actual).toBe(0);
    expect(f.fases.map((x) => `${x.when} ${x.name}`)).toEqual(['hoy Estudiar', 'hoy Test', 'sáb · +3 Tesis', '+7 → +60 Repetir']);
  });

  it('lo hecho hoy sigue en el plan, marcado', () => {
    aprobar(D0, 1, 15, 15);
    const cold = getState().study.reviews.find((r) => r.kind === 'cold')!;
    completeReview(addDays(D0, 1), cold.id);
    expect(dueReview(getState().study.reviews, addDays(D0, 1)).today.map((r) => r.id)).toContain(cold.id);
  });

  it('el cierre sugiere la victoria del día y lo primero de mañana', () => {
    aprobar(D0, 1, 18, 20);
    expect(cierreSugerido(getState().study, D0)).toEqual({ victoria: 'Aprobé el test del cap. 1', manana: 'Cold recall del cap. 1' });
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
  it('estudiar en ciclos enteros de 50/10; si no entra uno, de corrido', () => {
    expect(studySegs(b5010, 66).map((s) => s.min)).toEqual([50, 10]);
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
