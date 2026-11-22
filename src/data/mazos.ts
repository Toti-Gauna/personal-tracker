/**
 * v12.1 · los mazos. El frente es el área (matemática, programación, inglés) y el mazo, lo que hay adentro: los libros de inglés
 * (English Made Simple, English Pronunciation Course, Cambridge C1), un mazo por libro de matemática, uno por paper y "20 LLM
 * concepts". Una tarjeta sin dorso está bloqueada: no entra nunca al repaso hasta que escribas el dorso (así arranca el mazo de LLM).
 */
import { PLAN_EXT } from './plan-extendido';
import type { Card } from './study-types';

export const MAZO_LLM = '20 LLM concepts';
const papers = [...PLAN_EXT.bloques.flatMap((b) => b.papers ?? []), ...(PLAN_EXT.papersSueltos ?? [])];

export const MAZOS_V12: Record<string, string[]> = {
  ingles: ['English Made Simple', 'English Pronunciation Course', 'Cambridge C1'],
  math: ['Conamat · Aritmética', 'Conamat · Álgebra'],
  prog: [MAZO_LLM, ...papers.map((p) => `Paper · ${p.nombre}`)],
};

/** Bloqueada: sin dorso. No es nueva ni vence nunca. */
export const bloqueada = (c: Pick<Card, 'back'>) => !c.back.trim();

/** Las 20 tarjetas del mazo de LLM, bloqueadas (frente = el concepto; el dorso lo escribís vos). */
export const tarjetasLLM = (hoy: string): Card[] =>
  (PLAN_EXT.mazoLLM ?? []).map((concepto, i) => ({
    id: `llm-${i + 1}`, front: `${concepto}: explicalo con tus palabras`, back: '', kind: 'explicar', deck: MAZO_LLM, frontId: 'prog', source: 'Plan v12.1 · Trazo recall', createdOn: hoy,
  }));

/** Suma las que falten del mazo de LLM (por id), sin tocar las que ya tenés. */
export const conMazoLLM = (cards: Card[], hoy: string): Card[] => {
  const ids = new Set(cards.map((c) => c.id));
  return [...cards, ...tarjetasLLM(hoy).filter((c) => !ids.has(c.id))];
};
