/**
 * Ola 34 · las rutinas propias que rigen cada fecha, para lo que se calcula sin el estado a mano (las metas de horas de la semana y
 * del mes). El store las registra cada vez que cambian (como el clipping activo).
 */
import { minutosPorRama, rutinaParaFecha, type AsignacionRutina, type RutinaPropia } from './motor-rutinas';
import { isMeta, toTemplate, type RoutineBlock } from './routines';
import type { PlannedBlock } from './schedule';
import type { RamaOMain } from './types';

let RUTINAS: RutinaPropia[] = [];
let ASIGNACIONES: AsignacionRutina[] = [];

export function setRutinasPropias(rutinas: RutinaPropia[] | undefined, asignaciones: AsignacionRutina[] | undefined) {
  RUTINAS = rutinas ?? [];
  ASIGNACIONES = asignaciones ?? [];
}

export const rutinaPropiaEn = (fecha: string) => rutinaParaFecha(fecha, ASIGNACIONES, RUTINAS);

/** Horas por rama de la rutina propia de esa fecha (o null si rige la del plan). */
export function horasPropiasDia(fecha: string): Partial<Record<RamaOMain, number>> | null {
  const r = rutinaPropiaEn(fecha);
  if (!r) return null;
  const m = minutosPorRama(r.bloques);
  return Object.fromEntries(Object.entries(m).map(([k, v]) => [k, v! / 60]));
}

/** Las metas del día de una rutina propia, tal cual está escrita (sin las reglas del plan). */
export const planPropio = (bloques: RoutineBlock[]): PlannedBlock[] =>
  bloques.filter(isMeta).map((b) => {
    const min = ((Number(b.end.slice(0, 2)) * 60 + Number(b.end.slice(3))) - (Number(b.start.slice(0, 2)) * 60 + Number(b.start.slice(3))) + 1440) % 1440 || 1440;
    return { tpl: toTemplate(b, min), start: b.start, min };
  });
