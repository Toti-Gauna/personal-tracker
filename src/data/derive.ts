import { BIMESTER_NAMES, WEEKS_PER_BIMESTER } from './defaults';
import { acumulado, mejoraDia } from './mejora';
import { addDays, daysBetween } from './time';
import type { DayLog } from './types';

/** Día número N desde que instalaste (el día de la instalación es el 0). */
export const dayNumber = (startDate: string, date: string) => Math.max(0, daysBetween(startDate, date));

export function bimester(startDate: string, date: string) {
  const d = dayNumber(startDate, date);
  const n = Math.floor(d / (WEEKS_PER_BIMESTER * 7)) + 1;
  const week = Math.floor((d % (WEEKS_PER_BIMESTER * 7)) / 7) + 1;
  return { n, name: BIMESTER_NAMES[n - 1] ?? `Bimestre ${n}`, week, weeks: WEEKS_PER_BIMESTER };
}

/** Mejora de ayer (el último día registrado antes de hoy). */
export function mejoraAyer(days: Record<string, DayLog>, date: string) {
  const prev = days[addDays(date, -1)];
  return prev ? mejoraDia(prev) : 0;
}

export function mejoraAcumulada(days: Record<string, DayLog>, upTo: string) {
  return acumulado(
    Object.keys(days)
      .filter((k) => k <= upTo)
      .sort()
      .map((k) => mejoraDia(days[k])),
  );
}

/** Días seguidos con alguna meta cumplida, contando hoy si ya cumpliste una (si no, desde ayer). */
export function racha(days: Record<string, DayLog>, date: string) {
  let n = 0;
  let d = date;
  if (!(days[d] && mejoraDia(days[d]) > 0)) d = addDays(d, -1);
  while (days[d] && mejoraDia(days[d]) > 0) {
    n++;
    d = addDays(d, -1);
  }
  return n;
}
