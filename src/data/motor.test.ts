import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getState, register, resetState, startDay } from '../state/store';
import { addCards, completeLearn, gradeCard, saveColdRecall, saveTest, setRules } from '../state/study';
import { DEFAULT_BLOCK_PRESETS, DEFAULT_PRESETS } from './defaults';
import { dailyReview, parseCardsText, planActivity, sumMin } from './study';
import { addDays } from './time';

const D0 = '2026-11-11';
const ok = { concepto: 0, tecnica: 0, descuido: 0, enunciado: 0 };
const mkCards = (n: number, front = 'math') =>
  addCards(D0, Array.from({ length: n }, (_, i) => ({ front: `P${i}`, back: `R${i}`, kind: 'pregunta' as const, deck: 'Matemática', frontId: front, source: 'test' })));

describe('motor de repaso', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 10, 11, 7, 0));
    resetState();
    register('Toti', 'Abi', D0);
    startDay('completo', '04:00', D0);
  });
  afterEach(() => vi.useRealTimers());

  it('entran hasta 15 nuevas por día y caben en el tope', () => {
    mkCards(40);
    const d = dailyReview(getState().study, D0);
    expect(d.groups[0].cards).toHaveLength(15);
    expect(d.min).toBeLessThanOrEqual(20);
    setRules({ newPerDay: 50 });
    const d2 = dailyReview(getState().study, D0);
    expect(d2.groups[0].cards).toHaveLength(40); // 40 × 30 s = 20 min
    expect(d2.min).toBe(20);
  });

  it('el tope se reparte: primero cold recall, después tarjetas (la tesis va aparte)', () => {
    completeLearn(D0, 'conamat', 1);
    saveTest(D0, 'conamat', 1, { score: 15, total: 15, errors: ok, mode: 'app' });
    mkCards(40);
    setRules({ newPerDay: 50 });
    const d1 = dailyReview(getState().study, addDays(D0, 1));
    expect(d1.today.map((r) => r.kind)).toEqual(['cold']);
    expect(d1.groups[0].cards).toHaveLength(30); // 15 min restantes
    expect(d1.min).toBe(20);
  });

  it('las tarjetas del frente entran en el Repetir de su actividad, nombradas por ella', () => {
    mkCards(6);
    const st = getState().study;
    const a = st.activities.find((x) => x.id === 'conamat')!;
    const d = dailyReview(st, D0);
    const t = planActivity(a, { study: st, date: D0, blockMin: 120, presets: DEFAULT_PRESETS, blockPresets: DEFAULT_BLOCK_PRESETS, review: d.today, groups: d.groups });
    expect(t[0]).toMatchObject({ step: 'repetir', kind: 'tarjetas', title: '6 tarjetas de Aritmética', min: 3 });
    expect(sumMin(t)).toBeLessThanOrEqual(120);
  });

  it('calificar saca la tarjeta de pendientes; "Otra vez" la deja para hoy', () => {
    mkCards(2);
    const [c1, c2] = getState().study.cards;
    gradeCard(D0, c1.id, 3);
    gradeCard(D0, c2.id, 1);
    const g = dailyReview(getState().study, D0).groups[0];
    expect(g.cards).toHaveLength(2);
    expect(g.pending.map((c) => c.id)).toEqual([c2.id]);
  });

  it('una tarjeta fallada 2 veces agenda releer', () => {
    mkCards(1);
    const c = getState().study.cards[0];
    gradeCard(D0, c.id, 1);
    vi.setSystemTime(new Date(2026, 10, 11, 7, 15));
    gradeCard(D0, c.id, 1);
    expect(getState().study.reviews.filter((r) => r.kind === 'releer')).toHaveLength(1);
  });

  it('cold recall con menos de 70 %: lo olvidado vuelve mañana como tarjeta y se agenda releer', () => {
    completeLearn(D0, 'conamat', 2);
    const cold = getState().study.reviews.find((r) => r.kind === 'cold')!;
    const d1 = addDays(D0, 1);
    const s = saveColdRecall(d1, cold.id, ['Qué son los enteros :: naturales, cero y opuestos', 'Valor absoluto :: distancia al cero', 'Orden en la recta'], [true, false, false]);
    expect(s).toBeCloseTo(1 / 3);
    const st = getState().study;
    expect(st.cards.map((c) => c.front)).toEqual(['Valor absoluto', '¿Qué recordás de «Orden en la recta»?']);
    expect(st.cards.every((c) => c.dueFrom === addDays(d1, 1))).toBe(true);
    expect(dailyReview(st, d1).groups).toHaveLength(0);
    expect(st.reviews.find((r) => r.kind === 'releer')).toMatchObject({ due: addDays(d1, 1), label: 'Releer · Cap. 2 · Números enteros' });
    expect(st.points['conamat:2']).toHaveLength(3);
  });

  it('cold recall con 85 % o más: nada más que hacer', () => {
    completeLearn(D0, 'conamat', 2);
    const cold = getState().study.reviews.find((r) => r.kind === 'cold')!;
    saveColdRecall(addDays(D0, 1), cold.id, ['a', 'b', 'c', 'd', 'e', 'f', 'g'], [true, true, true, true, true, true, false]);
    expect(getState().study.cards).toHaveLength(0);
    expect(getState().study.reviews.some((r) => r.kind === 'releer')).toBe(false);
  });

  it('importa Anki (tab, HTML y cloze) y bloques con :: o [[ ]]', () => {
    const cs = parseCardsText('#separator:tab\n#html:true\n¿MCD?\tEl mayor <b>divisor</b>&nbsp;común\n{{c1::Menos}} por menos da más\t\nRestar es sumar el [[opuesto]].\nA :: B');
    expect(cs).toEqual([
      { front: '¿MCD?', back: 'El mayor divisor común', kind: 'pregunta' },
      { front: '___ por menos da más', back: 'Menos', kind: 'completar' },
      { front: 'Restar es sumar el ___.', back: 'opuesto', kind: 'completar' },
      { front: 'A', back: 'B.', kind: 'pregunta' },
    ]);
  });
});
