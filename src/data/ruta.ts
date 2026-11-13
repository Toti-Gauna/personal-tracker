/**
 * La ruta del roadmap aplicada a tu día: avance por ítem, carriles, ritmo, propuesta semanal y
 * los datos de los gráficos. Todo puro: recibe el estado y devuelve números.
 */
import raw from '../../data/roadmap.json';
import { expectedDone, paceVsPlan, weightedProgress, weeksElapsed, type CompetencyAxis, type PaceStatus } from './roadmap-charts';
import type { Roadmap, RoadmapBimester, RoadmapItem, RoadmapPart } from './roadmap.schema';
import { addDays, daysBetween } from './time';

export const ROADMAP = raw as unknown as Roadmap;
export const BIMS = ROADMAP.bimesters;

// ——— Carriles de la pantalla ———

/** Los carriles que ve la persona. "Desde cero" es la pieza y "Piloto", el embudo de llamadas. */
export type LaneId = 'math' | 'prog' | 'cero' | 'producto' | 'piloto' | 'cert';
export const LANES: { id: LaneId; name: string; color: string }[] = [
  { id: 'math', name: 'Matemática', color: 'var(--ing)' },
  { id: 'prog', name: 'Programación', color: 'var(--salud)' },
  { id: 'cero', name: 'Desde cero', color: 'var(--handyx)' },
  { id: 'producto', name: 'Producto', color: 'var(--eclipse)' },
  { id: 'piloto', name: 'Piloto', color: 'var(--economia)' },
  { id: 'cert', name: 'Certificación', color: 'var(--rutina)' },
];
export const laneById = (id: LaneId) => LANES.find((l) => l.id === id)!;

export function laneOfItem(i: RoadmapItem): LaneId {
  if (i.lane === 'math') return 'math';
  if (i.lane === 'prog') return 'prog';
  if (i.lane === 'cert') return 'cert';
  return i.id.endsWith('-pieza') ? 'cero' : 'producto';
}

/** Ítems de un carril en un bimestre (el cierre del producto va aparte, con sus casillas). */
export const laneItems = (b: RoadmapBimester, lane: LaneId) => b.items.filter((i) => laneOfItem(i) === lane && !i.id.endsWith('-cierre'));

// ——— Avance: el registro de lo hecho ———

/** Un avance: cuánto sumó un ítem (0 a 1), cuándo y por qué. `src` identifica de dónde vino para poder deshacerlo. */
export interface RutaLog {
  date: string;
  item: string;
  delta: number;
  src: string;
}

export interface RutaWeekGoal {
  id: string;
  lane: LaneId | 'hilo' | 'manual';
  title: string;
  /** Ítems del roadmap que cubre; el avance sale de ellos. */
  refs: string[];
  target: number;
  /** Para el piloto y las metas manuales: lo sumado a mano. */
  count?: number;
  /** Viene de una semana anterior. */
  carried?: boolean;
}

export interface RutaWeek {
  bim: number;
  week: number;
  goals: RutaWeekGoal[];
  edited?: boolean;
}

export interface RutaState {
  log: RutaLog[];
  /** Propuesta de cada semana, por el lunes. */
  weeks: Record<string, RutaWeek>;
  /** Casillas marcadas a mano: cierre, aporte, tráiler… ("b1:close:0"). */
  checks: Record<string, boolean>;
  /** Embudo del piloto por bimestre (lo de llamadas también suma desde Hoy). */
  pilot: Record<number, { interested: number; demo: number; pilot: number }>;
}

export const emptyRuta = (): RutaState => ({ log: [], weeks: {}, checks: {}, pilot: {} });

/** Avance de cada ítem a una fecha (inclusive), de 0 a 1. */
export function progressMap(log: RutaLog[], upTo?: string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const l of log) if (!upTo || l.date <= upTo) out[l.item] = (out[l.item] ?? 0) + l.delta;
  for (const k of Object.keys(out)) out[k] = Math.min(1, Math.max(0, Math.round(out[k] * 1000) / 1000));
  return out;
}

/** Cuánto suma un paso de un ítem. Aprender y comprobar valen la mitad; construir se reparte en 3 sesiones por semana. */
export function partDelta(i: RoadmapItem, part: RoadmapPart): number {
  if (part === 'build' && i.parts.length === 1) return 1 / (3 * (i.weeks[1] - i.weeks[0] + 1));
  return 1 / i.parts.length;
}

/** Siguiente paso que falta de un ítem según su avance. */
export function nextPart(i: RoadmapItem, done: number): RoadmapPart {
  if (i.parts.length === 1) return i.parts[0];
  const idx = Math.min(i.parts.length - 1, Math.floor(done * i.parts.length + 1e-9));
  return i.parts[idx];
}

// ——— Dónde estás ———

/** Bimestre de una fecha. Antes de la ruta cuenta el B1 (semana 1); después, el B18. */
export function bimOf(date: string): RoadmapBimester {
  if (date < BIMS[0].start) return BIMS[0];
  return BIMS.find((b) => date >= b.start && date <= b.end) ?? BIMS[BIMS.length - 1];
}

/** Semana del bimestre, de 1 a 9. */
export const weekOf = (b: RoadmapBimester, date: string) => Math.min(9, Math.max(1, Math.floor(Math.max(0, daysBetween(b.start, date)) / 7) + 1));

/** Lunes de la semana de la ruta (las semanas del bimestre arrancan el día 16). */
export const weekStart = (b: RoadmapBimester, week: number) => addDays(b.start, (week - 1) * 7);

/** Día de la ruta (1 el 16-11-2026) y total de días. */
export function routeDay(date: string) {
  const total = daysBetween(ROADMAP.route.start, ROADMAP.route.end) + 1;
  return { day: daysBetween(ROADMAP.route.start, date) + 1, total };
}

// ——— Avance y ritmo ———

const itemDone = (p: Record<string, number>) => (i: RoadmapItem) => ({ hours: i.hours, done: p[i.id] ?? 0 });

/** Avance del bimestre, de 0 a 1, ponderado por horas. */
export const bimProgress = (b: RoadmapBimester, p: Record<string, number>) => weightedProgress(b.items.map(itemDone(p)));

/** Avance de toda la ruta (18 bimestres). */
export const routeProgress = (p: Record<string, number>) => weightedProgress(BIMS.flatMap((b) => b.items).map(itemDone(p)));

/** Plan de toda la ruta a una fecha: lo que tendría que estar hecho. */
export function routePlan(date: string) {
  return weightedProgress(BIMS.flatMap((b) => b.items.map((i) => ({ hours: i.hours, done: expectedDone(i.weeks, weeksElapsed(b, date)) }))));
}

export const pace = (b: RoadmapBimester, date: string, p: Record<string, number>) => paceVsPlan(b, date, p);

export interface LaneStatus {
  lane: LaneId;
  done: number;
  total: number;
  /** Ítems de adelanto (+) o atraso (−) contra el plan. */
  delta: number;
  label: string;
  tone: 'ok' | 'mal' | 'bien' | 'neutro';
  next?: RoadmapItem;
  unit: string;
}

const UNIT: Record<LaneId, [string, string]> = {
  math: ['cap.', 'caps.'], prog: ['tema', 'temas'], cero: ['parte', 'partes'], producto: ['hito', 'hitos'], piloto: ['llamada', 'llamadas'], cert: ['examen', 'exámenes'],
};

/** Estado de un carril: cuánto lleva, si va al día y qué sigue. */
export function laneStatus(b: RoadmapBimester, lane: LaneId, date: string, p: Record<string, number>): LaneStatus {
  const items = laneItems(b, lane);
  const w = weeksElapsed(b, date);
  const week = weekOf(b, date);
  const done = items.reduce((s, i) => s + (p[i.id] ?? 0), 0);
  const expected = items.reduce((s, i) => s + expectedDone(i.weeks, w), 0);
  const delta = Math.round((done - expected) * 2) / 2;
  const next = items.find((i) => (p[i.id] ?? 0) < 1);
  const unit = UNIT[lane][1];
  const n = (x: number) => `${String(Math.abs(x)).replace('.', ',')} ${Math.abs(x) === 1 ? UNIT[lane][0] : unit}`;
  let label = 'al día';
  let tone: LaneStatus['tone'] = 'ok';
  const first = items.length ? Math.min(...items.map((i) => i.weeks[0])) : 0;
  if (!items.length) { label = 'no hay en este bimestre'; tone = 'neutro'; }
  else if (!done && first > week) { label = `semana ${first}`; tone = 'neutro'; }
  else if (!done && first === week && delta >= -0.5) { label = 'empieza esta semana'; tone = 'neutro'; }
  else if (done >= items.length) { label = 'completo'; tone = 'bien'; }
  else if (delta <= -1) { label = `atrasada ${n(delta)}`; tone = 'mal'; }
  else if (delta >= 1) { label = `adelantada ${n(delta)}`; tone = 'bien'; }
  return { lane, done: Math.round(done * 10) / 10, total: items.length, delta, label, tone, next, unit };
}

/** Llamadas del piloto del bimestre (lo que sumó Hoy) y el embudo. */
export function pilotOf(state: RutaState, b: RoadmapBimester, from?: string, to?: string) {
  const calls = state.log.filter((l) => l.item === `b${b.n}-piloto` && (!from || l.date >= from) && (!to || l.date <= to)).reduce((s, l) => s + l.delta, 0);
  return { calls, ...(state.pilot[b.n] ?? { interested: 0, demo: 0, pilot: 0 }) };
}
export const PILOT_WEEKLY = 10;

// ——— Series para los gráficos ———

/** Avance acumulado de un conjunto de ítems día por día (para los mini gráficos de tendencia). */
export function cumulativeSeries(log: RutaLog[], items: RoadmapItem[], from: string, to: string, weigh = true): number[] {
  const ids = new Set(items.map((i) => i.id));
  const n = Math.max(0, daysBetween(from, to) + 1);
  const out: number[] = [];
  for (let k = 0; k < n; k++) {
    const d = addDays(from, k);
    const p = progressMap(log.filter((l) => ids.has(l.item)), d);
    out.push(weigh ? weightedProgress(items.map(itemDone(p))) : items.reduce((s, i) => s + (p[i.id] ?? 0), 0));
  }
  return out;
}

/** Real contra plan del bimestre: un punto por día, 0 a 63 (9 semanas). El real solo llega hasta hoy. */
export function bimCurve(b: RoadmapBimester, log: RutaLog[], date: string) {
  const days = 63;
  const plan: number[] = [];
  const real: number[] = [];
  for (let k = 0; k <= days; k++) {
    const d = addDays(b.start, k);
    plan.push(weightedProgress(b.items.map((i) => ({ hours: i.hours, done: expectedDone(i.weeks, k / 7) }))));
    if (d <= date) real.push(bimProgress(b, progressMap(log, d)));
  }
  return { plan, real, today: Math.max(0, Math.min(days, daysBetween(b.start, date))) };
}

/** Real contra plan de la ruta, bimestre a bimestre: avance acumulado al cerrar cada uno. */
export function routeCurve(log: RutaLog[], date: string) {
  // Al cerrar un bimestre (el día siguiente a su fin) el plan lo da por completo.
  const plan = [0, ...BIMS.map((b) => routePlan(addDays(b.end, 1)))];
  const real: number[] = [0];
  for (const b of BIMS) {
    if (b.start > date) break;
    real.push(routeProgress(progressMap(log, b.end < date ? b.end : date)));
  }
  const p = progressMap(log, date);
  const certs = BIMS.filter((b) => b.cert && (p[b.cert.item] ?? 0) >= 1).map((b) => ({ n: b.n, name: b.cert!.name, value: real[Math.min(b.n, real.length - 1)] }));
  return { plan, real, certs };
}

// ——— Competencias ———

export const AXES = ['ML', 'Seguridad', 'Matemática', 'Cloud', 'Hardware', 'Producto'] as const;
export type Axis = (typeof AXES)[number];

const KW: [Axis, RegExp][] = [
  ['Seguridad', /owasp|security|seguridad|zeek|suricata|portswigger|ataque|adversari|cripto|bscp|ejpt|iso 30107/i],
  ['Hardware', /jetson|px4|esp32|kicad|gnss|ros 2|dron|tensorrt|deepstream/i],
  ['Cloud', /docker|aws|terraform|kubernetes|mlops|sagemaker|triton|vllm|ckad|mqtt|redes/i],
];

/** A qué eje suma cada ítem. */
export function axisOf(i: RoadmapItem): Axis {
  if (i.lane === 'math') return 'Matemática';
  if (i.lane === 'product') return i.id.endsWith('-pieza') ? 'ML' : 'Producto';
  for (const [a, re] of KW) if (re.test(i.title)) return a;
  return 'ML';
}

/** Los 6 ejes con los ítems hasta el bimestre `hasta`, para puntuarlos con el avance dado. */
export function competencyAxes(p: Record<string, number>, hasta = 18): CompetencyAxis[] {
  const items = BIMS.flatMap((b) => b.items);
  return AXES.map((a) => ({
    id: a,
    label: a,
    items: items.filter((i) => axisOf(i) === a).map((i) => {
      const n = Number(i.id.slice(1, i.id.indexOf('-')));
      return { id: i.id, weight: i.hours ?? 1, level: n <= hasta ? (p[i.id] ?? 0) : 0 };
    }),
  }));
}

/** Todo hecho hasta un bimestre: para dibujar la meta del año 1 (B6) o del año 3 (B18). */
export const allDoneUntil = (hasta: number) => Object.fromEntries(BIMS.filter((b) => b.n <= hasta).flatMap((b) => b.items.map((i) => [i.id, 1])));

// ——— La propuesta de la semana ———

const shortMath = (titles: RoadmapItem[]) => {
  const conamat = titles.filter((t) => t.id.includes('-conamat-'));
  if (conamat.length === titles.length && conamat.length) {
    const nums = conamat.map((t) => Number(t.id.slice(-2)));
    return nums.length === 1 ? `CONAMAT · cap. ${nums[0]}` : `CONAMAT · caps. ${nums[0]} a ${nums[nums.length - 1]}`;
  }
  return titles.map((t) => t.title).join(' y ');
};

/**
 * Lo que arma la ruta para una semana: por carril, los ítems que empiezan hasta esa semana y
 * todavía no están completos (así lo pendiente pasa solo a la semana siguiente).
 */
export function proposeWeek(b: RoadmapBimester, week: number, p: Record<string, number>): RutaWeek {
  const goals: RutaWeekGoal[] = [];
  for (const lane of ['math', 'prog', 'cero', 'producto', 'cert'] as LaneId[]) {
    const items = laneItems(b, lane).filter((i) => i.weeks[0] <= week && (p[i.id] ?? 0) < 1);
    if (!items.length) continue;
    goals.push({
      id: `${b.n}-${week}-${lane}`,
      lane,
      title: lane === 'math' ? shortMath(items) : items.map((i) => i.title.replace(`${b.product.name} · `, '')).join(' y '),
      refs: items.map((i) => i.id),
      target: items.length,
      carried: items.some((i) => i.weeks[1] < week),
    });
  }
  if (week <= 8) goals.push({ id: `${b.n}-${week}-piloto`, lane: 'piloto', title: `${PILOT_WEEKLY} llamadas para el piloto de ${b.product.name}`, refs: [`b${b.n}-piloto`], target: PILOT_WEEKLY });
  for (const t of ROADMAP.threads) {
    if (t.from !== 'all' && b.n < t.from) continue;
    goals.push({ id: `${b.n}-${week}-${t.id}`, lane: 'hilo', title: t.perWeek ? `${t.title} · ${t.perWeek} por semana` : t.title, refs: [], target: t.perWeek ?? 1, count: 0 });
  }
  return { bim: b.n, week, goals };
}

/** Avance de una meta de la semana: los ítems que cubre, o lo sumado a mano. */
export function weekGoalValue(g: RutaWeekGoal, p: Record<string, number>, log: RutaLog[], from: string, to: string) {
  if (g.lane === 'piloto') return log.filter((l) => g.refs.includes(l.item) && l.date >= from && l.date <= to).reduce((s, l) => s + l.delta, 0);
  if (!g.refs.length) return g.count ?? 0;
  return Math.round(g.refs.reduce((s, r) => s + (p[r] ?? 0), 0) * 2) / 2;
}

/**
 * Las metas de Hoy que empujan la ruta: matemática toma el próximo capítulo; programación, el
 * próximo tema (semanas 1 a 4: estudio y pieza desde cero; 5 a 8: producto); Eclipse, el piloto.
 * Handyx, Abi, el entreno y el resto no llevan ruta.
 */
export function refsForDay(ruta: RutaState, date: string): Record<string, { ref?: string; part?: RoadmapPart }> {
  const b = bimOf(date);
  const p = progressMap(ruta.log, date);
  const week = weekOf(b, date);
  const pend = (lane: Parameters<typeof laneItems>[1]) => laneItems(b, lane).filter((i) => (p[i.id] ?? 0) < 1);
  const out: Record<string, { ref?: string; part?: RoadmapPart }> = {};
  const math = pend('math')[0];
  if (math) out.math = { ref: math.id, part: nextPart(math, p[math.id] ?? 0) };
  const prog = (week <= 4 ? [...pend('prog'), ...pend('cero')] : [...pend('producto'), ...pend('prog'), ...pend('cero')])[0];
  if (prog) out.prog = { ref: prog.id, part: nextPart(prog, p[prog.id] ?? 0) };
  if (week <= 8) out.eclipse = { ref: `b${b.n}-piloto` };
  return out;
}

export type { PaceStatus };
