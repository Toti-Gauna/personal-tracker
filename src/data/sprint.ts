/**
 * 10.2 Sprint de búsqueda y 10.3 Qué cambia en la ruta: cuentas puras sobre el plan, las
 * rutinas y lo registrado. El sprint dura 14 días desde que arrancó la búsqueda intensiva; si
 * el día 14 no hay oferta, se renueva (la búsqueda no se cierra) hasta que entre el trabajo.
 */
import { MOTIVO_INTENSIVA, cortesCorridos } from './busqueda';
import { horasDeBloque, horasDeRama } from './metas-plan';
import { PLAN, T0_PLAN, finSemana } from './plan';
import type { PlanState } from './plan-state';
import { DAY_ROUTINES, blockMin, domingoDe, type DayType } from './routines';
import { addDays } from './time';
import type { DayLog } from './types';

export const DIAS_SPRINT = 14;

/** Metas del embudo de las dos semanas: supuestos para medir tus tasas reales (editables). */
export const EMBUDO_DEFAULT = { aMedida: 70, mensajes: 70, respuestas: 14, recruiter: 4, tecnica: 1, oferta: 1 };
export type MetasEmbudo = typeof EMBUDO_DEFAULT;

const dias = (a: string, b: string) => Math.round((new Date(b + 'T12:00').getTime() - new Date(a + 'T12:00').getTime()) / 864e5);

/** El sprint en curso: arranca con la pausa de la intensiva (o T0) y se renueva cada 14 días. */
export function sprintActual(hoy: string, plan: Pick<PlanState, 'pausas'>, t0 = T0_PLAN) {
  const inicio0 = (plan.pausas ?? []).filter((p) => p.motivo === MOTIVO_INTENSIVA).map((p) => p.desde).sort()[0] ?? t0;
  const n = Math.max(0, Math.floor(dias(inicio0, hoy) / DIAS_SPRINT));
  const desde = addDays(inicio0, n * DIAS_SPRINT);
  const hasta = addDays(desde, DIAS_SPRINT - 1);
  return { numero: n + 1, desde, hasta, dia: Math.min(DIAS_SPRINT, Math.max(0, dias(desde, hoy) + 1)), dias: Array.from({ length: DIAS_SPRINT }, (_, i) => addDays(desde, i)) };
}

const contadorEntre = (p: PlanState, id: string, desde: string, hasta: string) =>
  Object.entries(p.contadores).filter(([l]) => l >= addDays(desde, -6) && l <= hasta).reduce((s, [, c]) => s + (c[id] ?? 0), 0);

/** El embudo real del sprint: postulaciones a medida, mensajes, respuestas, recruiter, técnica y oferta. */
export function embudoSprint(p: PlanState, desde: string, hasta: string) {
  const post = p.postulaciones.filter((x) => x.fecha >= desde && x.fecha <= hasta);
  const ents = p.entrevistas.filter((e) => e.fecha >= desde && e.fecha <= hasta);
  return {
    aMedida: contadorEntre(p, 'postulaciones', desde, hasta),
    mensajes: contadorEntre(p, 'mensajes', desde, hasta),
    respuestas: post.filter((x) => x.estado === 'respuesta' || x.estado === 'entrevista' || x.estado === 'oferta').length,
    recruiter: ents.length,
    tecnica: ents.filter((e) => /t[eé]cnic/i.test(`${e.modalidad ?? ''} ${e.rol}`)).length,
    oferta: post.filter((x) => x.estado === 'oferta').length,
  };
}

/** Lo que hace funcionar el embudo: inglés todos los días, simulacros, CV/LinkedIn/caso, clips y matemática. */
export function acompanaSprint(p: PlanState, days: Record<string, DayLog>, desde: string, hasta: string, checks: Record<string, boolean> = {}) {
  const sesionesIngles = Object.entries(days).filter(([d, day]) => d >= desde && d <= hasta && day.focus.some((f) => day.blocks.find((b) => b.key === f.key)?.rama === 'ingles')).length;
  return {
    ingles: sesionesIngles,
    simulacros: contadorEntre(p, 'simulada', desde, hasta),
    cv: ['cv', 'linkedin', 'caso'].filter((k) => checks[k]).length,
    clips: contadorEntre(p, 'clips', desde, hasta),
    mate: Math.round((horasDeRama(days, 'matematica', desde, hasta) + contadorEntre(p, 'horas-mate', desde, hasta)) * 10) / 10,
    clipping: horasDeBloque(days, 'clipping', desde, hasta),
  };
}

// ——— 10.3 Qué cambia en la ruta ———

export type FilaHoras = 'Programación' | 'Matemática' | 'Inglés' | 'Búsqueda' | 'Clipping' | 'Entrenamiento' | 'Handyx' | 'Ventas';

/** Horas por semana de cada cosa con un par de rutinas (lunes a viernes × 5 + finde × 2). */
export function horasSemana(semana: DayType, finde: DayType): Record<FilaHoras, number> {
  const de = (t: DayType, f: (b: { id: string; rama?: string; area: string }) => boolean) => DAY_ROUTINES[t].blocks.filter((b) => b.meta !== false && f(b)).reduce((s, b) => s + blockMin(b), 0) / 60;
  // Ola 31: el domingo puede tener su rutina (modo intensivo v7).
  const domingo = domingoDe(finde);
  const sem = (f: (b: { id: string; rama?: string; area: string }) => boolean) => Math.round((de(semana, f) * 5 + de(finde, f) + de(domingo, f)) * 10) / 10;
  return {
    Programación: sem((b) => b.rama === 'programacion'),
    Matemática: sem((b) => b.rama === 'matematica'),
    Inglés: sem((b) => b.rama === 'ingles'),
    Búsqueda: sem((b) => b.rama === 'trabajo'),
    Clipping: sem((b) => b.id === 'clipping'),
    Entrenamiento: sem((b) => b.id === 'entreno'),
    Handyx: sem((b) => b.rama === 'handyx'),
    Ventas: sem((b) => b.id === 'eclipse' || b.id === 'ventas'),
  };
}

/**
 * Cuánto se corre el lanzamiento de Handyx según cuándo entre el trabajo: la pausa dura hasta
 * esa fecha, así que el corte se corre esos días (como mínimo).
 */
export function escenariosHandyx(desdePausa: string, t0 = T0_PLAN) {
  const lanzar = finSemana(PLAN.handyx.cortes[0].hasta, t0);
  const t2 = addDays(t0, (PLAN.hitos.find((h) => h.id === 'T+2')!.semana - 1) * 7);
  const casos: [string, string][] = [['semana 4', addDays(t0, 28)], ['T+2', t2], ['semana 13', addDays(t0, 84)]];
  return casos.map(([n, fecha]) => {
    const [c] = cortesCorridos([{ id: 'lanzar', fin: lanzar }], { pausas: [{ id: 'x', objetivo: 'handyx', desde: desdePausa, hasta: fecha, motivo: '', guardado: null }] }, fecha);
    return { nombre: n, fecha, lanza: c.fecha };
  });
}
