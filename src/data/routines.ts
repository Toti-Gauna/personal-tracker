/**
 * Rutinas del día: lunes a viernes ("weekday") y fin de semana ("weekend").
 * Fuente de verdad: data/routines.json, sección "dayRoutines". Acá no hay horarios: se leen,
 * se validan al cargar y se arma el día según la hora a la que te levantaste.
 */
import raw from '../../data/routines.json';
import { parseDate, toHHMM, toMin } from './time';
import { esRama } from './ramas';
import type { Area, BlockKind, BlockTemplate, RamaOMain, RoutineId } from './types';

/**
 * Rutinas: lunes a viernes mientras buscás trabajo ("weekday"), fin de semana ("weekend"),
 * lunes a viernes con trabajo nuevo ("con-trabajo", reemplaza a weekday desde T+2) y el día
 * libre ("libre": solo repasos y un entrenamiento suave).
 */
export type DayType = 'weekday' | 'weekend' | 'con-trabajo' | 'libre' | 'busqueda-intensiva' | 'busqueda-intensiva-finde';
export const DAY_TYPES: DayType[] = ['weekday', 'weekend', 'con-trabajo', 'libre', 'busqueda-intensiva', 'busqueda-intensiva-finde'];
/** Modos que cambian las rutinas de toda la semana (Ola 8b: búsqueda intensiva). */
export type ModoRutina = 'busqueda-intensiva';
/** Las que reparten los días de la semana; las otras reemplazan a una o son el día libre. */
const BASE: DayType[] = ['weekday', 'weekend'];

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
  /** Rama del plan T+18 ("main" = Trazo). Sin rama: fuera del plan (en gris). */
  rama?: RamaOMain;
}

export interface DayRoutineDef {
  label: string;
  /** Días ISO: 1 = lunes … 7 = domingo (solo weekday y weekend). */
  days?: number[];
  /** Rutina a la que reemplaza cuando está activa (con-trabajo → weekday). */
  reemplaza?: DayType;
  /** Es la del día libre. */
  libre?: boolean;
  /** Solo vale con este modo activo (y entonces reemplaza a "reemplaza" todos los días). */
  modo?: ModoRutina;
  /** Hora de levantarse propia (la búsqueda intensiva arranca a las 04:30). Sin valor, la del archivo. */
  wake?: Record<'completo' | 'corto', string>;
  blocks: RoutineBlock[];
}

export interface RoutinesFile {
  timezone: string;
  /** Hora de levantarse de cada modo del modal "Buen día". */
  wake: Record<'completo' | 'corto', string>;
  /** Día libre de fábrica (ISO: 2 = martes). Se cambia en Ajustes. */
  diaLibre: number;
  dayRoutines: Record<DayType, DayRoutineDef>;
  /**
   * Ola 17: si te levantás a las 08:00, el día tiene su propia rutina (vale cualquier día menos el
   * libre): mañana con Abi y trabajo, y a la tarde programación, búsqueda, matemática e inglés.
   */
  tarde: { wake: string; label: string; blocks: RoutineBlock[] };
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
  if (!Number.isInteger(f.diaLibre) || f.diaLibre! < 1 || f.diaLibre! > 7) err.push('"diaLibre" tiene que ser un día de 1 a 7');
  const dias = new Set<number>();
  for (const t of DAY_TYPES) {
    const r = f.dayRoutines?.[t];
    if (!r) { err.push(`falta la rutina "${t}"`); continue; }
    if (!r.label) err.push(`${t}: falta "label"`);
    if (!BASE.includes(t) && !r.reemplaza && !r.libre) err.push(`${t}: tiene que reemplazar a otra rutina o ser la del día libre`);
    if (r.modo && !r.reemplaza) err.push(`${t}: una rutina de modo tiene que decir a cuál reemplaza`);
    for (const k of ['completo', 'corto'] as const) if (r.wake && !HHMM.test(r.wake[k] ?? '')) err.push(`${t}: "wake.${k}" no es HH:MM`);
    if (BASE.includes(t) && !r.days?.length) err.push(`${t}: faltan los días`);
    for (const d of BASE.includes(t) ? r.days ?? [] : []) {
      if (!Number.isInteger(d) || d < 1 || d > 7) err.push(`${t}: día ${d} fuera de 1 a 7`);
      if (dias.has(d)) err.push(`${t}: el día ${d} ya está en otra rutina`);
      dias.add(d);
    }
    err.push(...bloquesErrors(t, r.blocks));
  }
  for (let d = 1; d <= 7; d++) if (!dias.has(d)) err.push(`el día ${d} no tiene rutina`);
  if (!f.tarde) err.push('falta "tarde" (la rutina de las 08:00)');
  else {
    if (!HHMM.test(f.tarde.wake ?? '')) err.push('"tarde.wake" no es HH:MM');
    if (!f.tarde.label) err.push('tarde: falta "label"');
    err.push(...bloquesErrors('tarde', f.tarde.blocks));
    if (f.tarde.blocks?.[0] && f.tarde.blocks[0].start !== f.tarde.wake) err.push('tarde: el primer bloque tiene que empezar a la hora de levantarse');
  }
  return err;
}

function bloquesErrors(t: string, blocks: RoutineBlock[] | undefined): string[] {
  const err: string[] = [];
  {
    const r = { blocks: blocks! };
    const ids = new Set<string>();
    if (!Array.isArray(r.blocks) || !r.blocks.length) return [`${t}: no tiene bloques`];
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
      if (b.rama != null && b.rama !== 'main' && !esRama(b.rama)) err.push(`${at}: rama "${b.rama}" desconocida`);
      const ultimo = i === r.blocks.length - 1;
      if (HHMM.test(b.start) && HHMM.test(b.end) && toMin(b.end) <= toMin(b.start) && !ultimo) err.push(`${at}: termina antes de empezar`);
      const prev = r.blocks[i - 1];
      if (prev && HHMM.test(prev.end) && HHMM.test(b.start) && toMin(b.start) < toMin(prev.end)) err.push(`${at}: se superpone con ${prev.id}`);
      if (b.meta !== false && !(b.tasks?.length)) err.push(`${at}: una meta necesita al menos una tarea`);
    });
    if (!r.blocks.some((b) => b.kind === 'fixed')) err.push(`${t}: necesita al menos un bloque fijo`);
  }
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
export const TARDE = ROUTINES_FILE.tarde;

/** Fecha (YYYY-MM-DD) de un instante en la zona horaria de las rutinas. */
export function dateKeyIn(now: Date, tz = TIMEZONE) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

/** Día ISO de una fecha: 1 = lunes … 7 = domingo. */
export const isoDay = (date: string) => ((parseDate(date).getDay() + 6) % 7) + 1;

/** Lunes a viernes "weekday", sábado y domingo "weekend", según los días del JSON. */
export function dayTypeOf(date: string, file: RoutinesFile = ROUTINES_FILE): DayType {
  const d = isoDay(date);
  return BASE.find((t) => file.dayRoutines[t].days?.includes(d)) ?? 'weekday';
}

export interface RutinaCfg {
  /** "con-trabajo" desde que se marca T+2 (se elige en Ajustes). */
  rutina?: 'busqueda' | 'con-trabajo';
  /** Día ISO libre (null: ninguno). Sin valor, el del JSON. */
  diaLibre?: number | null;
  /** Modo activo: con búsqueda intensiva no hay día libre y cada día usa la rutina del modo. */
  modo?: ModoRutina | null;
}

/**
 * Qué rutina toca un día: el día libre manda; si no, la del día de la semana, con
 * "con-trabajo" en lugar de lunes a viernes cuando está activa. Sin selector por día.
 */
export function routineFor(date: string, cfg: RutinaCfg = {}, file: RoutinesFile = ROUTINES_FILE): DayType {
  const base = dayTypeOf(date, file);
  // El modo manda sobre todo: ni día libre ni con-trabajo mientras dure.
  if (cfg.modo) {
    const delModo = DAY_TYPES.find((t) => file.dayRoutines[t]?.modo === cfg.modo && file.dayRoutines[t].reemplaza === base);
    if (delModo) return delModo;
  }
  const libre = cfg.diaLibre === undefined ? file.diaLibre : cfg.diaLibre;
  if (libre != null && isoDay(date) === libre) return 'libre';
  if (cfg.rutina === 'con-trabajo') {
    const alt = DAY_TYPES.find((t) => file.dayRoutines[t].reemplaza === base && !file.dayRoutines[t].modo);
    if (alt) return alt;
  }
  return base;
}

/** La hora de levantarse de una rutina (la propia o la del archivo). */
export const wakeDe = (t: DayType, file: RoutinesFile = ROUTINES_FILE) => file.dayRoutines[t].wake ?? file.wake;

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
  // Ola 17: a las 08:00 el día es otro, con los horarios del JSON tal cual (el día libre sigue igual).
  if (mode === 'tarde' && t !== 'libre') return file.tarde.blocks.map((b) => ({ block: b, start: b.start, min: blockMin(b) }));
  const bl = file.dayRoutines[t].blocks;
  const w = wakeDe(t, file);
  const wake = toMin(mode === 'otra' ? wakeHHMM ?? w.completo : w[mode === 'tarde' ? 'completo' : mode]);
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
    fixed: b.kind === 'fixed' ? b.start : undefined, focus: b.focus, tasks: b.tasks ?? [], ...(b.rama ? { rama: b.rama } : {}),
  };
}

export interface Ajustes {
  /** Ventana de matemática en curso ("W1"): los bloques de programación pasan a matemática. */
  ventana?: string;
  /**
   * Hay una entrevista mañana. El bloque de búsqueda laboral suma practicarla con el pitch armado
   * (y en inglés, si la entrevista es en inglés). No hay un modo propio.
   */
  entrevista?: { rol: string; empresa?: string; ingles?: boolean } | false;
  /** Puerta de matemática sin aprobar ("W1"): el proyecto no arranca y programación pasa a matemática pura. */
  puerta?: string;
}

/** Aplica la ventana W, la puerta y la práctica de la entrevista de mañana al día ya armado. */
export function ajustarDia(plan: PlannedRoutineBlock[], a: Ajustes): PlannedRoutineBlock[] {
  let out = plan;
  if (a.puerta) {
    out = out.map((p) => (p.block.rama === 'programacion'
      ? { ...p, block: { ...p.block, label: `Matemática pura · puerta ${a.puerta}`, short: 'matemática', rama: 'matematica', tasks: [`Tema de ${a.puerta} hasta dominarlo`, `Test de ${a.puerta} (85 % o más)`] } }
      : p));
  } else if (a.ventana) {
    out = out.map((p) => (p.block.rama === 'programacion'
      ? { ...p, block: { ...p.block, label: `Matemática · ventana ${a.ventana}`, short: 'matemática', rama: 'matematica', tasks: ['Repaso de tarjetas', `Capítulo de la ventana ${a.ventana}`, 'Ejercicios del capítulo'] } }
      : p));
  }
  // Sin modo entrevista: el día anterior, la búsqueda suma practicar la entrevista con el pitch armado
  // (y en inglés si la entrevista es en inglés). Nada se reemplaza ni se parte.
  if (a.entrevista) {
    const e = a.entrevista;
    const de = e.empresa ? ` de ${e.rol} en ${e.empresa}` : e.rol ? ` de ${e.rol}` : '';
    const practica = [`Practicar la entrevista de mañana${de} con el pitch armado`, ...(e.ingles ? ['Practicarla en inglés'] : [])];
    out = out.map((p) => (p.block.id === 'busqueda' ? { ...p, block: { ...p.block, tasks: [...practica, ...(p.block.tasks ?? [])] } } : p));
  }
  return out;
}

/** Las metas de una rutina, en orden. */
export const metasOf = (t: DayType, file: RoutinesFile = ROUTINES_FILE) => file.dayRoutines[t].blocks.filter(isMeta);
