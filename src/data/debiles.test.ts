import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getState, register, resetState, setState } from '../state/store';
import { addCards, completeLearn, gradeCard, saveColdRecall, saveTest, setRules } from '../state/study';
import {
  banda, calibration, finalReadiness, fixPlan, isWeak, leeches, qFalla, ranking, recallSemanal, repetidos, reviewsJson, simulacro, sources, strength, testsJson, weakSet,
} from './debiles';
import { dueReview } from './study';
import { CONAMAT_PUNTOS } from './study-catalog';
import type { Attempt, ReviewItem } from './study-types';
import { addDays } from './time';

const D0 = '2026-11-11';
const d = (n: number) => addDays(D0, n);
const ok = { concepto: 0, tecnica: 0, descuido: 0, enunciado: 0 };

describe('fuerza de un tema', () => {
  it('40 % cold recall + 30 % tarjetas + 30 % test', () => {
    expect(strength({ cold: 62, tarjetas: 66, test: 80 })).toBe(69);
    expect(strength({ cold: 100, tarjetas: 0, test: 0 })).toBe(40);
  });

  it('si falta una fuente, su peso se reparte entre las otras', () => {
    expect(strength({ cold: 70, tarjetas: 68 })).toBe(69); // (0,4·70 + 0,3·68) / 0,7
    expect(strength({ tarjetas: 78 })).toBe(78);
    expect(strength({})).toBeNull();
  });

  it('los pesos se ajustan en el motor', () => {
    expect(strength({ cold: 50, tarjetas: 100, test: 100 }, { cold: 1, tarjetas: 0, test: 0 })).toBe(50);
  });

  it('flojo es menos de 70; bandas rojo, amarillo y verde', () => {
    expect([isWeak(69), isWeak(70), isWeak(null)]).toEqual([true, false, false]);
    expect([banda(69), banda(70), banda(84), banda(85)]).toEqual(['mal', 'medio', 'medio', 'bien']);
  });
});

describe('tarjetas sanguijuela y calibración', () => {
  it('sanguijuela: 4 fallos o más, la que más falla primero', () => {
    const cards = ['a', 'b', 'c'].map((id) => ({ id, front: id, back: id, kind: 'pregunta' as const, deck: 'M', source: '', createdOn: D0 }));
    const log = [...Array(5).fill({ cardId: 'a', date: D0, grade: 1 }), ...Array(4).fill({ cardId: 'b', date: D0, grade: 1 }), ...Array(3).fill({ cardId: 'c', date: D0, grade: 1 }), { cardId: 'c', date: D0, grade: 3 }];
    expect(leeches(cards, log).map((x) => [x.card.id, x.fallos])).toEqual([['a', 5], ['b', 4]]);
  });

  it('calibración por frente: lo que creías menos lo que recordaste', () => {
    const fronts = [{ id: 'math', name: 'Matemática', color: 'ing' as const }, { id: 'prog', name: 'Programación', color: 'salud' as const }];
    const at = (frontId: string, creia: number, okv: number): Attempt => ({ tema: 'x', frontId, kind: 'cold', date: D0, ok: okv, creia });
    const c = calibration([at('math', 0.85, 0.67), at('math', 0.85, 0.75), at('prog', 0.8, 0.81)], fronts);
    expect(c.map((x) => [x.front.id, x.creia, x.recordo, x.diff])).toEqual([['math', 85, 71, 14], ['prog', 80, 81, -1]]);
  });
});

describe('examen final', () => {
  it('listo para el final: fuerza promedio ponderada por ejercicios del examen', () => {
    expect(finalReadiness({ 1: 90, 2: 60 }, { 1: 3, 2: 1 })).toBe(83);
    expect(finalReadiness({ 1: 90 }, { 1: 1, 2: 1 })).toBe(45); // lo no estudiado cuenta 0
  });

  it('el simulacro reparte 40 ejercicios con más peso en lo flojo', () => {
    const s = simulacro({ 1: 95, 2: 60, 3: 80 }, 40, { 1: 4, 2: 4, 3: 4 });
    expect(s.reduce((a, x) => a + x.n, 0)).toBe(40);
    expect(s.find((x) => x.unit === 2)!.n).toBeGreaterThan(s.find((x) => x.unit === 1)!.n);
  });
});

describe('con datos de la app', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 10, 11, 7, 0));
    resetState();
    register('Toti', 'Abi', D0);
  });
  afterEach(() => vi.useRealTimers());

  it('cold recall, tarjetas y test se juntan en la fuerza del capítulo, y qué falla', () => {
    completeLearn(D0, 'conamat', 2);
    const cold = getState().study.reviews.find((r) => r.kind === 'cold')!;
    saveColdRecall(d(1), cold.id, CONAMAT_PUNTOS[2], [true, true, true, true, false, false], 0.85);
    saveTest(d(1), 'conamat', 2, { score: 17, total: 20, errors: { ...ok, tecnica: 2, descuido: 1 }, mode: 'papel', wrong: [{ q: 'a', a: '1', type: 'tecnica', tema: 'Signos de agrupación' }, { q: 'b', a: '2', type: 'tecnica', tema: 'Signos de agrupación' }, { q: 'c', a: '3', type: 'descuido', tema: 'Ley de signos' }] });
    expect(sources(getState().study, 'conamat:2')).toEqual({ cold: 67, tarjetas: undefined, test: 85 });
    expect(qFalla(getState().study, 'conamat:2')).toBe('valor absoluto y orden en la recta');
    expect(fixPlan(getState().study, 'conamat:2').map((p) => [p.kind, p.texto, p.min])).toEqual([
      ['releer', 'Releer valor absoluto y orden en la recta', 6],
      ['tarjetas', '2 tarjetas nuevas', 2],
      ['ejercicios', '5 ejercicios de signos de agrupación', 8],
    ]);
    const r = ranking(getState().study);
    expect(r[0]).toMatchObject({ id: 'conamat:2', nombre: 'Cap. 2 · Números enteros', fuerza: 75, min: 16 });
    expect(repetidos(getState().study)).toEqual([{ tema: 'Signos de agrupación', n: 2, caps: [2], tipo: 'tecnica' }]);
    expect(reviewsJson(getState().study)[0]).toMatchObject({ tema: 'conamat:2', tipo: 'cold recall', resultado: 67, creia: 85, fecha: d(1) });
    expect(testsJson(getState().study)[0]).toMatchObject({ capitulo: 'conamat:2', puntaje: 17, total: 20, aprobado: true });
    expect(testsJson(getState().study)[0].errores.map((e) => e.tipo)).toEqual(['tecnica', 'tecnica', 'descuido']);
    expect(recallSemanal(getState().study, d(1)).series.map((x) => [x.front.id, x.valores.at(-1)])).toEqual([['math', 67]]);
  });

  it('las tarjetas que fallás bajan la fuerza del mazo', () => {
    addCards(D0, [{ front: 'look up', back: 'buscar', kind: 'pregunta', deck: 'Inglés', frontId: 'ingles', source: 'x' }]);
    const id = getState().study.cards[0].id;
    for (let i = 0; i < 4; i++) gradeCard(D0, id, 1);
    gradeCard(D0, id, 3);
    expect(sources(getState().study, 'mazo:ingles').tarjetas).toBe(20);
    expect(weakSet(getState().study).has('mazo:ingles')).toBe(true);
    expect(qFalla(getState().study, 'mazo:ingles')).toBe('una tarjeta sanguijuela: la fallaste 4 veces');
  });

  it('priorizar lo flojo: si vence más de lo que entra en 20 min, entran primero los temas flojos', () => {
    const mk = (id: string, unit: number, due: string): ReviewItem => ({ id, activityId: 'conamat', unit, kind: 'ejercicios', due, min: 15, label: id });
    const reviews = [mk('fuerte', 1, d(-2)), mk('flojo', 6, d(-1))];
    expect(dueReview(reviews, D0).today.map((r) => r.id)).toEqual(['fuerte']);
    expect(dueReview(reviews, D0, 20, new Set(['conamat:6'])).today.map((r) => r.id)).toEqual(['flojo']);
    // Si entra todo, no cambia nada.
    expect(dueReview(reviews, D0, 30, new Set(['conamat:6'])).today.map((r) => r.id)).toEqual(['fuerte', 'flojo']);
    setRules({ priorizarFlojo: false });
    setState((s) => s);
    expect(getState().study.rules.priorizarFlojo).toBe(false);
  });
});
