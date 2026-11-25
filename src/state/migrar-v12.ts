/**
 * v12.1 · la migración del estado guardado, aditiva e idempotente: no borra nada (horas, lo hecho, el historial de recall, las notas
 * y las metas de P0 quedan como están).
 *  - Las certificaciones aprobadas con los ids de la v7 (C1…C13, un bloque por cert o por par) pasan a sus ids de v12.1
 *    (`plan.hitos['v12:cert:<id>']`); lo de antes queda guardado.
 *  - Suma la actividad de papers y el mazo "20 LLM concepts" (bloqueado) si faltan.
 *  - Las horas del 19 y 20 nov no se tocan: caen por fecha en "PetrIA v0 (archivado)" y no cuentan para la PetrIA de v12.1.
 */
import { conMazoLLM } from '../data/mazos';
import { PAPERS_ID, actividadPapers } from '../data/papers';
import { claveHito } from '../data/periodos-plan';
import type { PlanState } from '../data/plan-state';
import type { StudyState } from '../data/study-types';

/** Cert de la v7 (id del bloque) → certs de v12.1. */
export const CERT_V7_A_V12: Record<string, string[]> = {
  C8: ['claude-architect', 'gh-foundations'], C1: ['aws-saa'], C2: ['secplus'], C3: ['aws-mla'], C9: ['aws-genai-pro'], C10: ['ai-103'],
  C4: ['pnpt'], C5: ['cka'], C6: ['cks'], C7: ['aws-scs'], C11: ['gh-actions'], C12: ['aws-sap'], C13: ['ghas'],
};

export function migrarPlanV12(plan: PlanState): PlanState {
  let hitos = plan.hitos;
  for (const [viejo, nuevos] of Object.entries(CERT_V7_A_V12)) {
    const ex = plan.proyectos?.[viejo]?.examen;
    if (!ex) continue;
    for (const id of nuevos) {
      const k = claveHito.cert(id);
      if (!hitos[k]?.hecho) hitos = { ...hitos, [k]: { ...(hitos[k] ?? {}), hecho: ex.fecha } };
    }
  }
  return hitos === plan.hitos ? plan : { ...plan, hitos };
}

/**
 * v12.4 · el plan nuevo trae todas las fechas re-armadas desde el 21 nov 2026: los corrimientos confirmados con el plan anterior ya no
 * tienen sentido y se limpian, pero se guardan en `respaldoV124` para deshacerlo. No toca los exámenes reservados, las horas, lo tildado,
 * las notas, los leads ni los posts. Una sola vez (`versionPlan`).
 */
export function migrarPlanV124(plan: PlanState, hoy: string): PlanState {
  if (plan.versionPlan === 'v12.4') return plan;
  const cs = plan.corrimientos ?? {};
  if (!Object.keys(cs).length) return { ...plan, versionPlan: 'v12.4' };
  const { corrimientos: _c, ...resto } = plan;
  void _c;
  return { ...resto, versionPlan: 'v12.4', respaldoV124: { corrimientos: cs, fecha: hoy } } as PlanState;
}

export function migrarStudyV12(st: StudyState, hoy: string): StudyState {
  // v12.2: los papers van en el Block 1 (estaban en "leer"); si faltan, se suman.
  const conPapers = st.activities.some((a) => a.id === PAPERS_ID) ? st.activities : [...st.activities, actividadPapers()];
  const activities = conPapers.some((a) => a.id === PAPERS_ID && a.block === 'leer') ? conPapers.map((a) => (a.id === PAPERS_ID ? { ...a, block: 'prog' } : a)) : conPapers;
  const cards = conMazoLLM(st.cards, hoy);
  return activities === st.activities && cards.length === st.cards.length ? st : { ...st, activities, cards };
}
