/**
 * Rutinas del día: lunes a viernes ("weekday") y fin de semana ("weekend").
 * Fuente de verdad: data/routines.json, sección "dayRoutines". Acá no hay horarios: se leen,
 * se validan al cargar y se arma el día según la hora a la que te levantaste.
 */
import raw from '../../data/routines.json';
import { parseDate, toHHMM, toMin } from './time';
import type { Area, BlockKind, BlockTemplate, RoutineId } from './types';

export type DayType = 'weekday' | 'weekend';
export const DAY_TYPES: DayType[] = ['weekday', 'weekend'];

export interface RoutineBlock {
  id: string;
  label: string;
  /** Nombre corto para frases ("Ahora toca programación"). */
  short?: string;
  /** HH:MM. El último bloque (sueño) puede terminar al día siguiente. */
  start: string;
  end: string;
  area: Area;
  /** "fixed": no se acorta ni se mueve. "flex": se acorta (si va antes del primer fijo, también se corre). */
  kind: 'fixed' | 'flex';
  /** Abre una sesión de foco (estudio, pomodoro o entreno). */
  focus: boolean;
  /** Cuenta como meta del día (sin valor: sí). Despertar, comidas, descanso y sueño, no. */
  meta?: boolean;
  /** Tareas con que arranca la meta. */
  tasks?: string[];
}

export interface DayRoutineDef {
  label: string;
  /** Días ISO: 1 = lunes … 7 = domingo. */
  days: number[];
  blocks: RoutineBlock[];
}

export interface RoutinesFile {
  timezone: string;
  /** Hora de levantarse de cada modo del modal "Buen día". */
  wake: Record<'completo' | 'corto', string>;
  dayRoutines: Record<DayType, DayRoutineDef>;
}

const AREAS: Area[] = ['ing', 'handyx', 'eclipse', 'salud', 'rutina', 'economia'];
const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Valida el JSON de rutinas. Devuelve la lista de problemas (vacía si está bien). */
export function routineErrors(x: unknown): string[] {
  const err: string[] = [];
  const f = x as Partial<RoutinesFile>;
  if (!f || typeof f !== 'object') return ['routines.json no es un objeto'];
  if (typeof f.timezone !== 'string' || !f.timezone) err.push('falta "timezone"');
  for (const k of ['completo', 'corto'] as const) if (!HHMM.test(f.wake?.[k] ?? '')) err.push(`"wake.${k}" no es HH:MM`);
  const dias = new Set<number>();
  for (const t of DAY_TYPES) {
    const r = f.dayRoutines?.[t];
    if (!r) { err.push(`falta la rutina "${t}"`); continue; }
    if (!r.label) err.push(`${t}: falta "label"`);
    for (const d of r.days ?? []) {
      if (!Number.isInteger(d) || d < 1 || d > 7) err.push(`${t}: día ${d} fuera de 1 a 7`);
      if (dias.has(d)) err.push(`${t}: el día ${d} ya está en otra rutina`);
      dias.add(d);
    }
    const ids = new Set<string>();
    if (!Array.isArray(r.blocks) || !r.blocks.length) { err.push(`${t}: no tiene bloques`); continue; }
    r.blocks.forEach((b, i) => {
      const at = `${t}.${b?.id ?? i}`;
      if (!b.id) err.push(`${at}: falta "id"`);
      if (ids.has(b.id)) err.push(`${at}: id repetido`);
      ids.add(b.id);
      if (!b.label) err.push(`${at}: falta "label"`);
      if (!HHMM.test(b.start) || !HHMM.test(b.end)) err.push(`${at}: start y end tienen que ser HH:MM`);
      if (!AREAS.includes(b.area)) err.push(`${at}: área "${b.area}" desconocida`);
      if (b.kind !== 'fixed' && b.kind !== 'flex') err.push(`${at}: kind tiene que ser "fixed" o "flex"`);
      if (typeof b.focus !== 'boolean') err.push(`${at}: falta "focus"`);
      const ultimo = i === r.blocks.length - 1;
      if (HHMM.test(b.start) && HHMM.test(b.end) && toMin(b.end) <= toMin(b.start) && !ultimo) err.push(`${at}: termina antes de empezar`);
      const prev = r.blocks[i - 1];
      if (prev && HHMM.test(prev.end) && HHMM.test(b.start) && toMin(b.start) < toMin(prev.end)) err.push(`${at}: se superpone con ${prev.id}`);
      if (b.meta !== false && !(b.tasks?.length)) err.push(`${at}: una meta necesita al menos una tarea`);
    });
    if (!r.blocks.some((b) => b.kind === 'fixed')) err.push(`${t}: necesita al menos un bloque fijo`);
  }
  for (let d = 1; d <= 7; d++) if (!dias.has(d)) err.push(`el día ${d} no tiene rutina`);
  return err;
}

export function validateRoutines(x: unknown): RoutinesFile {
  const e = routineErrors(x);
  if (e.length) throw new Error(`data/routines.json no es válido:\n- ${e.join('\n- ')}`);
  return x as RoutinesFile;
}

/** Las rutinas, validadas al cargar. */
export const ROUTINES_FILE: RoutinesFile = validateRoutines(raw);
export const DAY_ROUTINES = ROUTINES_FILE.dayRoutines;
export const TIMEZONE = ROUTINES_FILE.timezone;
export const WAKE = ROUTINES_FILE.wake;

/** Fecha (YYYY-MM-DD) de un instante en la zona horaria de las rutinas. */
export function dateKeyIn(now: Date, tz = TIMEZONE) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

/** Día ISO de una fecha: 1 = lunes … 7 = domingo. */
export const isoDay = (date: string) => ((parseDate(date).getDay() + 6) % 7) + 1;

/** Qué rutina toca: lunes a viernes "weekday", sábado y domingo "weekend". Sin selector manual. */
export function dayTypeOf(date: string, file: RoutinesFile = ROUTINES_FILE): DayType {
  const d = isoDay(date);
  return DAY_TYPES.find((t) => file.dayRoutines[t].days.includes(d)) ?? 'weekday';
}

export const blockMin = (b: Pick<RoutineBlock, 'start' | 'end'>) => {
  const m = toMin(b.end) - toMin(b.start);
  return m > 0 ? m : m + 24 * 60;
};
export const isMeta = (b: RoutineBlock) => b.meta !== false;

export interface PlannedRoutineBlock {
  block: RoutineBlock;
  start: string;
  min: number;
}

/** Los bloques antes del primer fijo: arrancan cuando te levantás. */
const morning = (blocks: RoutineBlock[]) => blocks.slice(0, Math.max(0, blocks.findIndex((b) => b.kind === 'fixed')));

/** Lo mínimo que puede durar una meta flexible al acortarse. */
export const MIN_FLEX = 15;

/** Rango de "Otra hora": desde las 03:00 hasta que las metas de la mañana tengan al menos 15 min. */
export function wakeRange(t: DayType, file: RoutinesFile = ROUTINES_FILE) {
  const bl = file.dayRoutines[t].blocks;
  const m = morning(bl);
  const fijo = toMin(bl.find((b) => b.kind === 'fixed')!.start);
  const fijos = m.filter((b) => !isMeta(b)).reduce((s, b) => s + blockMin(b), 0);
  const max = fijo - fijos - MIN_FLEX * m.filter(isMeta).length;
  return { min: toMin('03:00'), max: Math.floor(max / 10) * 10 };
}

/**
 * Arma el día según el modo del modal:
 * - "completo" (04:00): los horarios del JSON tal cual;
 * - "corto" (05:00) y "otra": la mañana arranca a esa hora y las metas flexibles antes del
 *   primer fijo se acortan en proporción (de a 5 min) para llegar justo. Lo que no es meta
 *   (despertar) mantiene su duración. Los fijos y lo que viene después no se tocan.
 */
export function planRoutine(t: DayType, mode: RoutineId, wakeHHMM?: string, file: RoutinesFile = ROUTINES_FILE): PlannedRoutineBlock[] {
  const bl = file.dayRoutines[t].blocks;
  const wake = toMin(mode === 'otra' ? wakeHHMM ?? file.wake.completo : file.wake[mode]);
  const m = morning(bl);
  const fijo = toMin(bl[m.length].start);
  const dur = new Map(bl.map((b) => [b.id, blockMin(b)]));
  const metas = m.filter(isMeta);
  const otros = m.filter((b) => !isMeta(b)).reduce((s, b) => s + blockMin(b), 0);
  const avail = fijo - wake - otros;
  const base = metas.reduce((s, b) => s + blockMin(b), 0);
  if (avail < base && metas.length) {
    let usado = 0;
    for (const b of metas) {
      const d = Math.max(MIN_FLEX, Math.floor(((blockMin(b) * avail) / base) / 5) * 5);
      dur.set(b.id, d);
      usado += d;
    }
    // El redondeo se lo queda la meta más larga, para que la mañana llegue justo al primer fijo.
    const larga = [...metas].sort((a, b2) => dur.get(b2.id)! - dur.get(a.id)!)[0];
    dur.set(larga.id, dur.get(larga.id)! + avail - usado);
  }
  let t0 = wake;
  return bl.map((b, i) => {
    if (i < m.length) {
      const start = toHHMM(t0);
      t0 += dur.get(b.id)!;
      return { block: b, start, min: dur.get(b.id)! };
    }
    return { block: b, start: b.start, min: blockMin(b) };
  });
}

/** El tipo de meta en la app: estudio (abre la sesión de estudio), entreno o pomodoro. */
export function blockKind(b: RoutineBlock): BlockKind {
  if (b.id === 'entreno') return 'entreno';
  if (b.area === 'ing' && b.focus) return 'estudio';
  return 'pomodoro';
}

/** Un bloque de la rutina como plantilla de meta. */
export function toTemplate(b: RoutineBlock, min = blockMin(b)): BlockTemplate {
  return {
    key: b.id, title: b.label, short: b.short ?? b.label.toLowerCase(), area: b.area, kind: blockKind(b), min,
    fixed: b.kind === 'fixed' ? b.start : undefined, focus: b.focus, tasks: b.tasks ?? [],
  };
}

/** Las metas de una rutina, en orden. */
export const metasOf = (t: DayType, file: RoutinesFile = ROUTINES_FILE) => file.dayRoutines[t].blocks.filter(isMeta);
