import { beforeEach, describe, expect, it } from 'vitest';
import { DAY, review, newSrs } from './fsrs';
import { MAZO_LLM, MAZOS_V12, bloqueada, conMazoLLM, tarjetasLLM } from './mazos';
import { cardsForDay } from './study';
import { getState, register, resetState } from '../state/store';
import { addCards, gradeCard, updateCard } from '../state/study';
import type { StudyState } from './study-types';

const D = '2026-11-21';
const enHoy = (st: StudyState, date = D) => cardsForDay(st, date, 60).groups.flatMap((g) => g.cards.map((c) => c.id));

describe('v12.1 · mazos y tarjetas bloqueadas', () => {
  beforeEach(() => { resetState(); register('Toti', 'Abi', '2026-11-16'); });

  it('los mazos del plan: inglés, un libro de matemática por mazo, uno por paper y 20 LLM concepts', () => {
    expect(MAZOS_V12.ingles).toEqual(['English Made Simple', 'English Pronunciation Course', 'Cambridge C1']);
    expect(MAZOS_V12.math).toEqual(['Conamat · Aritmética', 'Conamat · Álgebra']);
    expect(MAZOS_V12.prog[0]).toBe(MAZO_LLM);
    expect(MAZOS_V12.prog).toContain('Paper · Attention Is All You Need (2017)');
    const llm = tarjetasLLM(D);
    expect(llm).toHaveLength(20);
    expect(llm.every(bloqueada)).toBe(true);
    // Sumarlas dos veces no duplica.
    expect(conMazoLLM(conMazoLLM([], D), D)).toHaveLength(20);
  });

  it('una bloqueada no entra nunca (ni como nueva ni vencida); con el dorso escrito entra como nueva', () => {
    const st0 = getState().study;
    const vencida = { ...tarjetasLLM(D)[0], id: 'llm-vencida', srs: { ...newSrs(0), state: 'review' as const, due: 0, s: 3, last: 0 } };
    const st = { ...st0, cards: [...tarjetasLLM(D), vencida] };
    expect(enHoy(st)).toEqual([]);
    const conDorso = { ...st, cards: st.cards.map((c) => (c.id === 'llm-1' ? { ...c, back: 'Partir el texto en piezas que el modelo ve como unidades' } : c)) };
    expect(enHoy(conDorso)).toEqual(['llm-1']);
  });

  it('el motor (FSRS): "bien" seguido estira el intervalo; "otra vez" lo vuelve a minutos', () => {
    let s = newSrs(0);
    const dues: number[] = [];
    let now = 0;
    for (let i = 0; i < 4; i++) { s = review(s, 3, now); dues.push(s.due - now); now = s.due; }
    expect(dues[0]).toBeLessThan(dues[1]);
    expect(dues[1]).toBeLessThan(dues[2]);
    expect(dues[2]).toBeLessThan(dues[3]);
    expect(dues[3]).toBeGreaterThan(7 * DAY);
    const olvido = review(s, 1, now);
    expect(olvido.state).toBe('relearning');
    expect(olvido.due - now).toBeLessThan(DAY);
  });

  it('en el store: escribir el dorso de una LLM la desbloquea y se califica como cualquier otra', () => {
    addCards(D, [{ front: 'KV cache: explicalo', back: '', kind: 'explicar', deck: MAZO_LLM, frontId: 'prog', source: 't' }]);
    const id = getState().study.cards.find((c) => c.deck === MAZO_LLM)!.id;
    expect(enHoy(getState().study)).not.toContain(id);
    updateCard(id, { back: 'Guardar claves y valores de la atención para no recalcularlos' });
    expect(enHoy(getState().study)).toContain(id);
    gradeCard(D, id, 3, new Date(`${D}T10:00:00`).getTime());
    expect(getState().study.cards.find((c) => c.id === id)!.srs!.state).not.toBe('new');
  });
});
