/**
 * v12.1 · los hábitos van aparte de las metas: no son períodos sino rachas y casillas. Cada hábito es un bloque de la rutina (recall,
 * Anki, la publicación de martes y jueves, la demo del sábado y la revisión del domingo): está hecho el día en que ese bloque quedó
 * hecho. Puro.
 */
import { blockDone } from './mejora';
import { PLAN_EXT, type HabitoV12 } from './plan-extendido';
import { addDays } from './time';
import type { DayLog } from './types';

export const HABITOS: HabitoV12[] = PLAN_EXT.habitos ?? [];

/** 1 = lunes … 7 = domingo. */
export const diaIso = (f: string) => ((new Date(`${f}T12:00:00`).getDay() + 6) % 7) + 1;
export const tocaHabito = (h: Pick<HabitoV12, 'cuando'>, f: string) => h.cuando === 'diario' || h.cuando.includes(diaIso(f));
export const habitoHecho = (h: Pick<HabitoV12, 'id'>, day: DayLog | undefined) => {
  const b = day?.blocks.find((x) => x.key === h.id);
  return !!b && blockDone(b);
};

export interface EstadoHabito {
  habito: HabitoV12;
  hoy: { toca: boolean; hecho: boolean };
  /** Días seguidos (de los que toca) hechos hasta hoy; hoy sin hacer todavía no corta la racha. */
  racha: number;
  /** La semana de lunes a domingo: null el día que no toca. */
  semana: { fecha: string; hecho: boolean | null }[];
}

export function estadoHabitos(days: Record<string, DayLog>, hoy: string, desde?: string, habitos = HABITOS): EstadoHabito[] {
  const lunes = addDays(hoy, -(diaIso(hoy) - 1));
  return habitos.map((h) => {
    const hecho = (f: string) => habitoHecho(h, days[f]);
    let racha = 0;
    let f = tocaHabito(h, hoy) && !hecho(hoy) ? addDays(hoy, -1) : hoy;
    for (let guarda = 0; guarda < 3660 && (!desde || f >= desde); guarda++, f = addDays(f, -1)) {
      if (!tocaHabito(h, f)) continue;
      if (!hecho(f)) break;
      racha++;
    }
    return {
      habito: h,
      hoy: { toca: tocaHabito(h, hoy), hecho: hecho(hoy) },
      racha,
      semana: Array.from({ length: 7 }, (_, i) => addDays(lunes, i)).map((d) => ({ fecha: d, hecho: tocaHabito(h, d) ? (d > hoy ? false : hecho(d)) : null })),
    };
  });
}
