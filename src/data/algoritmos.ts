/**
 * Ola 31 · los algorithm spots plantados en los proyectos (roadmap v7) y el sprint sin IA. Con IA: Claude propone y vos validás en
 * voz alta complejidad, bordes y cambios. Sin IA: el problema con su complejidad esperada y 2 o 3 tests; lo escribís vos y Claude
 * revisa. El sprint sin IA son 14 días de 30 min antes de cada ciclo de entrevistas técnicas; los problemas que resolvés se cuentan
 * (meta ≈ 100). Puro.
 */
import raw from '../../data/algoritmos.json';
import type { PlanState, RegistroSpot } from './plan-state';
import { addDays, daysBetween } from './time';

export type ModoSpot = 'con-ia' | 'sin-ia';
export interface TemaAlgoritmo { id: string; tema: string; proyectos: string[]; modo: ModoSpot; donde?: string; propio?: boolean }

interface AlgoritmosFile {
  temasRoadmap: number;
  metaProblemas: number;
  sprint: { dias: number; minPorDia: number; cuando: string };
  modos: Record<ModoSpot, string>;
  registro: string;
  temas: TemaAlgoritmo[];
}

export const ALG = raw as unknown as AlgoritmosFile;

/** Los temas del roadmap más los que sumaste. */
export const temas = (p: Pick<PlanState, 'temasPropios'>): TemaAlgoritmo[] => [...ALG.temas, ...(p.temasPropios ?? []).map((t) => ({ ...t, propio: true }))];

export interface EstadoTema extends TemaAlgoritmo { registro?: RegistroSpot; estado: 'hecho' | 'registrado' | 'pendiente' }

/** Cada tema con lo que registraste: hecho (validado), registrado (falta validar) o pendiente. */
export function estadoTemas(p: Pick<PlanState, 'temasPropios' | 'algoritmos'>): EstadoTema[] {
  return temas(p).map((t) => {
    const r = p.algoritmos?.[t.id];
    return { ...t, ...(r ? { registro: r } : {}), estado: r ? (r.validado ? 'hecho' : 'registrado') : 'pendiente' };
  });
}

export interface SprintActivo { inicio: string; fin: string; dia: number }

/** El sprint sin IA que corre en una fecha (14 días desde su inicio, salvo que lo hayas cortado). */
export function sprintActivo(p: Pick<PlanState, 'sprintsSinIA'>, fecha: string): SprintActivo | null {
  for (const s of [...(p.sprintsSinIA ?? [])].reverse()) {
    const fin = addDays(s.inicio, ALG.sprint.dias - 1);
    const hasta = s.cortado && s.cortado < fin ? s.cortado : fin;
    if (fecha >= s.inicio && fecha <= hasta) return { inicio: s.inicio, fin: hasta, dia: daysBetween(s.inicio, fecha) + 1 };
  }
  return null;
}

/** Problemas sin IA resueltos (todos, o entre dos fechas). */
export function problemas(p: Pick<PlanState, 'problemasSinIA'>, desde?: string, hasta?: string): number {
  return Object.entries(p.problemasSinIA ?? {}).filter(([f]) => (!desde || f >= desde) && (!hasta || f <= hasta)).reduce((s, [, n]) => s + n, 0);
}

/** La línea para `docs/learning.md` del proyecto: tema, modo, fecha y la pregunta de entrevista que responde. */
export function lineaLearning(t: TemaAlgoritmo, r: RegistroSpot): string {
  return `- **${t.tema}** (${t.modo === 'con-ia' ? 'con IA' : 'sin IA'}, ${r.fecha}${r.proyecto ? `, ${r.proyecto}` : ''})${t.donde ? `: ${t.donde}` : ''}. Pregunta de entrevista: ${r.pregunta?.trim() || '(a completar)'}`;
}
