import { beforeEach, describe, expect, it } from 'vitest';
import { getState, register, resetState, startDay } from '../state/store';
import { completeLearn, completeReview, saveTest } from '../state/study';
import { DEFAULT_BLOCK_PRESETS, DEFAULT_PRESETS } from './defaults';
import { approves, cardsFromText, dueReview, groupSteps, planActivity, sumMin, unitStatus } from './study';
import { addDays } from './time';

const D0 = '2026-11-11';
const ok = { concepto: 0, tecnica: 0, descuido: 0, enunciado: 0 };

function plan(date: string, id = 'conamat', blockMin = 120) {
  const st = getState().study;
  const a = st.activities.find((x) => x.id === id)!;
  const review = dueReview(st.reviews, date).today;
  return planActivity(a, { study: st, date, blockMin, presets: DEFAULT_PRESETS, blockPresets: DEFAULT_BLOCK_PRESETS, review });
}

describe('sesión de estudio: Repasar → Aprender → Comprobar', () => {
  beforeEach(() => {
    resetState();
    register('Toti', 'Abi', D0);
    startDay('completo', '04:00', D0);
  });

  it('día 0: aprender el cap. 1 y su test completo, sin tesis', () => {
    const t = plan(D0);
    expect([...new Set(t.map((x) => x.step))]).toEqual(['aprender', 'comprobar']);
    expect(t.some((x) => x.kind === 'tesis')).toBe(false);
    expect(t[0].title).toBe('Cap. 1 · Números reales');
    expect(t[t.length - 1].title).toBe('Test cap. 1 · 15 ejercicios');
  });

  it('las duraciones suman exactamente el bloque, que es lo que dice el botón de foco', () => {
    for (const blockMin of [120, 90, 75]) {
      const t = plan(D0, 'conamat', blockMin);
      expect(sumMin(t)).toBe(blockMin);
      expect(sumMin(groupSteps(t))).toBe(sumMin(t));
    }
  });

  it('aprobar agenda la tesis a +3 y el cold recall a +1; la tesis aparece en Repasar ese día con el capítulo en el texto', () => {
    completeLearn(D0, 'conamat', 1);
    expect(saveTest(D0, 'conamat', 1, { score: 14, total: 15, errors: { ...ok, descuido: 1 }, mode: 'papel' })).toBe(true);

    // Mismo día: ningún paso muestra la tesis del capítulo nuevo.
    expect(plan(D0).some((x) => x.kind === 'tesis')).toBe(false);

    // +1: cold recall primero, después aprender el cap. 2 y su test.
    const d1 = plan(addDays(D0, 1));
    expect(d1[0]).toMatchObject({ step: 'repasar', kind: 'cold', title: 'Cold recall · Cap. 1 · Números reales' });
    expect(d1.some((x) => x.kind === 'tesis')).toBe(false);
    expect(d1.find((x) => x.step === 'aprender')!.title).toBe('Cap. 2 · Números enteros');

    // +3: la tesis del cap. 1 entra en Repasar, después del cold recall del cap. 3.
    const colds = () => getState().study.reviews.filter((r) => r.kind === 'cold' && !r.doneOn);
    completeReview(addDays(D0, 1), colds()[0].id);
    completeLearn(addDays(D0, 1), 'conamat', 2);
    completeReview(addDays(D0, 2), colds()[0].id);
    saveTest(addDays(D0, 2), 'conamat', 2, { score: 20, total: 20, errors: ok, mode: 'app' });
    completeLearn(addDays(D0, 2), 'conamat', 3);
    const d3 = plan(addDays(D0, 3));
    const rep = d3.filter((x) => x.step === 'repasar');
    expect(rep.map((x) => x.kind)).toEqual(['cold', 'tesis']);
    expect(rep[1].title).toBe('Tesis · Cap. 1 · Números reales');
    expect(sumMin(d3)).toBe(120);
  });

  it('con menos de 85 % y errores de concepto: re-test en 2 días, sin comprobar en el medio', () => {
    completeLearn(D0, 'conamat', 1);
    expect(saveTest(D0, 'conamat', 1, { score: 10, total: 15, errors: { ...ok, concepto: 5 }, mode: 'app' })).toBe(false);
    const d1 = plan(addDays(D0, 1));
    expect(d1.some((x) => x.step === 'comprobar')).toBe(false);
    expect(d1.find((x) => x.step === 'aprender')!.sub).toMatch(/repasar lo que fallaste/);
    const d2 = plan(addDays(D0, 2));
    expect(d2[d2.length - 1].title).toBe('Re-test cap. 1 · 15 ejercicios');
    expect(unitStatus(getState().study.activities[0], getState().study, 1, addDays(D0, 2)).label).toBe('re-test hoy');
  });

  it('el repaso tiene tope de 20 min: lo que no entra queda para mañana', () => {
    const st = getState().study;
    const mk = (id: string, kind: 'cold' | 'tesis' | 'ejercicios', min: number, due = D0) => ({ id, activityId: 'conamat', kind, due, min, label: id });
    const reviews = [mk('e', 'ejercicios', 10, '2026-11-01'), mk('t', 'tesis', 15), mk('c', 'cold', 5), mk('x', 'ejercicios', 8, '2026-11-20')];
    const r = dueReview(reviews, D0);
    expect(r.today.map((x) => x.id)).toEqual(['c', 't']);
    expect(r.min).toBeLessThanOrEqual(20);
    expect(r.skipped.map((x) => x.id)).toEqual(['e']);
    expect(st).toBeTruthy();
  });

  it('lo hecho hoy sigue en el plan, marcado', () => {
    completeLearn(D0, 'conamat', 1);
    saveTest(D0, 'conamat', 1, { score: 15, total: 15, errors: ok, mode: 'app' });
    const cold = getState().study.reviews.find((r) => r.kind === 'cold')!;
    completeReview(addDays(D0, 1), cold.id);
    expect(dueReview(getState().study.reviews, addDays(D0, 1)).today.map((r) => r.id)).toContain(cold.id);
  });
});

describe('test y tesis', () => {
  it('aprueba con 85 % o si solo hubo descuidos', () => {
    expect(approves(17, 20, { ...ok, descuido: 2, tecnica: 1 })).toBe(true);
    expect(approves(16, 20, { ...ok, descuido: 4 })).toBe(true);
    expect(approves(16, 20, { ...ok, descuido: 3, concepto: 1 })).toBe(false);
  });

  it('las líneas con :: o [[ ]] se vuelven tarjetas', () => {
    const c = cardsFromText('Los enteros son…\nSumar con signos distintos :: se restan los valores absolutos.\nRestar un número es sumar su [[opuesto]].');
    expect(c).toEqual([
      { front: 'Sumar con signos distintos', back: 'Se restan los valores absolutos.', kind: 'pregunta' },
      { front: 'Restar un número es sumar su ___.', back: 'opuesto', kind: 'completar' },
    ]);
  });
});
