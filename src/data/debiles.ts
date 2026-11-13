/**
 * Puntos débiles: qué se te olvida, según tus cold recalls, tus tarjetas y tus tests.
 * Todo es puro: recibe el estado de estudio y devuelve números y textos.
 */
import { addDays, parseDate } from './time';
import { unitName, unitShort, unitState } from './study';
import { PASS } from './study-catalog';
import type { Activity, Attempt, Card, ErrType, Rules, StudyState, TestResult } from './study-types';

/** Fuerza menor a esto: tema flojo. */
export const FLOJO = 70;
/** Desde acá un tema está bien (verde). */
export const BIEN = 85;
/** Una tarjeta que fallaste esta cantidad de veces o más es una sanguijuela. */
export const SANGUIJUELA = 4;

export type Banda = 'mal' | 'medio' | 'bien';
/** Rojo por debajo de 70, amarillo de 70 a 84, verde desde 85 (en 0..100). */
export const banda = (v: number): Banda => (v < FLOJO ? 'mal' : v < BIEN ? 'medio' : 'bien');
export const BANDA_COLOR: Record<Banda, string> = { mal: 'var(--rutina)', medio: 'var(--economia)', bien: 'var(--salud)' };

// ——— Fuerza ———

export interface Fuentes {
  cold?: number;
  tarjetas?: number;
  test?: number;
}

/**
 * Fuerza de un tema, de 0 a 100: 40 % cold recall + 30 % tarjetas + 30 % test (pesos del
 * motor). Si falta una fuente, su peso se reparte entre las otras. Sin ninguna, null.
 */
export function strength(f: Fuentes, pesos: Rules['pesos'] = { cold: 0.4, tarjetas: 0.3, test: 0.3 }): number | null {
  const partes = (['cold', 'tarjetas', 'test'] as const).filter((k) => f[k] != null && pesos[k] > 0);
  const w = partes.reduce((s, k) => s + pesos[k], 0);
  if (!w) return null;
  return Math.round(partes.reduce((s, k) => s + f[k]! * pesos[k], 0) / w);
}

export const isWeak = (fuerza: number | null) => fuerza != null && fuerza < FLOJO;

// ——— Temas ———

export const temaUnidad = (actId: string, n: number) => `${actId}:${n}`;
export const temaMazo = (frontId: string) => `mazo:${frontId}`;
/** El tema de una tarjeta: su capítulo, o si no tiene, su mazo. */
export const temaDeCarta = (c: Card, fronts: StudyState['fronts']) =>
  c.activityId && c.unit != null ? temaUnidad(c.activityId, c.unit) : temaMazo(c.frontId ?? fronts.find((f) => f.name === c.deck)?.id ?? 'otros');

/** Intentos de tarjeta: uno por calificación (ok si no fue "Otra vez"). */
export function cardAttempts(st: StudyState) {
  const byId = new Map(st.cards.map((c) => [c.id, c]));
  return st.log.flatMap((l) => {
    const c = byId.get(l.cardId);
    if (!c) return [];
    return [{ tema: temaDeCarta(c, st.fronts), frontId: c.frontId ?? 'otros', date: l.date, ok: l.grade > 1 ? 1 : 0, idea: c.front, cardId: c.id }];
  });
}

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : undefined);
const r100 = (x?: number) => (x == null ? undefined : Math.round(x * 100));

/** Las tres fuentes de un tema, en 0..100. El test es el último que hiciste. */
export function sources(st: StudyState, tema: string): Fuentes {
  const cold = mean(st.attempts.filter((a) => a.tema === tema && a.kind === 'cold').map((a) => a.ok));
  const tarj = mean(cardAttempts(st).filter((a) => a.tema === tema).map((a) => a.ok));
  let test: number | undefined;
  const [act, n] = tema.split(':');
  if (act !== 'mazo') {
    const ts = unitState(st, act, Number(n)).tests;
    const t = ts[ts.length - 1];
    if (t) test = t.score / t.total;
  }
  return { cold: r100(cold), tarjetas: r100(tarj), test: r100(test) };
}

export interface Tema {
  id: string;
  /** "Cap. 2 · Números enteros" o "Inglés". */
  nombre: string;
  /** "cap. 2" o el mazo. */
  corto: string;
  frontId: string;
  activity?: Activity;
  unit?: number;
  fuentes: Fuentes;
  fuerza: number | null;
}

/** Todos los temas con algún dato: capítulos estudiados y mazos sueltos. */
export function temas(st: StudyState): Tema[] {
  const ids = new Set<string>();
  for (const a of st.activities) for (const u of a.units ?? []) {
    const s = unitState(st, a.id, u.n);
    if (s.learnedOn || s.tests.length) ids.add(temaUnidad(a.id, u.n));
  }
  for (const a of st.attempts) ids.add(a.tema);
  for (const a of cardAttempts(st)) ids.add(a.tema);
  return [...ids].map((id) => temaInfo(st, id)).filter((t): t is Tema => !!t);
}

export function temaInfo(st: StudyState, id: string): Tema | null {
  const [a, n] = id.split(':');
  const fuentes = sources(st, id);
  if (a === 'mazo') {
    const f = st.fronts.find((x) => x.id === n);
    return { id, nombre: f?.name ?? 'Otras tarjetas', corto: f?.name ?? 'otras', frontId: n, fuentes, fuerza: strength(fuentes, st.rules.pesos) };
  }
  const act = st.activities.find((x) => x.id === a);
  const u = act?.units?.find((x) => x.n === Number(n));
  if (!act || !u) return null;
  return { id, nombre: unitName(act, u), corto: unitShort(act, u.n).toLowerCase(), frontId: act.front, activity: act, unit: u.n, fuentes, fuerza: strength(fuentes, st.rules.pesos) };
}

/** Los temas flojos (fuerza menor a 70), para que el motor los priorice. */
export const weakSet = (st: StudyState) => new Set(temas(st).filter((t) => isWeak(t.fuerza)).map((t) => t.id));

// ——— Sanguijuelas ———

/** Tarjetas que fallaste 4 veces o más, de la que más a la que menos. */
export function leeches(cards: Card[], log: StudyState['log']) {
  const fallos = new Map<string, number>();
  for (const l of log) if (l.grade === 1) fallos.set(l.cardId, (fallos.get(l.cardId) ?? 0) + 1);
  return cards
    .map((c) => ({ card: c, fallos: fallos.get(c.id) ?? 0 }))
    .filter((x) => x.fallos >= SANGUIJUELA)
    .sort((a, b) => b.fallos - a.fallos);
}

// ——— Calibración ———

/**
 * Creías contra recordaste, por frente: promedio de lo que creías recordar y de lo que
 * recordaste en los cold recalls (0..100). `diff` = creías − recordaste: positivo, te
 * sobreestimás.
 */
export function calibration(attempts: Attempt[], fronts: StudyState['fronts']) {
  return fronts.flatMap((f) => {
    const xs = attempts.filter((a) => a.frontId === f.id && a.kind === 'cold' && a.creia != null);
    if (!xs.length) return [];
    const creia = Math.round(mean(xs.map((a) => a.creia!))! * 100);
    const recordo = Math.round(mean(xs.map((a) => a.ok))! * 100);
    return [{ front: f, creia, recordo, diff: creia - recordo, n: xs.length }];
  });
}

// ——— Examen final ———

/** Ejercicios de cada capítulo en el examen final de Aritmética (40). */
export const FINAL_MIX: Record<number, number> = { 1: 3, 2: 4, 3: 4, 4: 4, 5: 3, 6: 4, 7: 4, 8: 4, 9: 3, 10: 3, 11: 4 };

/**
 * Cuán listo estás para el final: promedio de la fuerza de cada capítulo ponderado por sus
 * ejercicios en el examen. Lo que todavía no estudiaste cuenta 0.
 */
export function finalReadiness(fuerzas: Record<number, number | null | undefined>, mix: Record<number, number> = FINAL_MIX) {
  const ns = Object.keys(mix).map(Number);
  const total = ns.reduce((s, n) => s + mix[n], 0);
  if (!total) return 0;
  return Math.round(ns.reduce((s, n) => s + (fuerzas[n] ?? 0) * mix[n], 0) / total);
}

/**
 * Simulacro dirigido: los 40 ejercicios repartidos con más peso en lo flojo y menos en lo que
 * ya dominás. Peso = ejercicios del examen × (1 + lo que le falta para 100 / 50).
 */
export function simulacro(fuerzas: Record<number, number | null | undefined>, total = 40, mix: Record<number, number> = FINAL_MIX) {
  const ns = Object.keys(mix).map(Number);
  const w = ns.map((n) => mix[n] * (1 + (100 - (fuerzas[n] ?? 50)) / 50));
  const sw = w.reduce((a, b) => a + b, 0);
  const raw = w.map((x) => (x / sw) * total);
  const out = raw.map(Math.floor);
  let falta = total - out.reduce((a, b) => a + b, 0);
  raw.map((x, i) => [x - Math.floor(x), i] as const).sort((a, b) => b[0] - a[0]).forEach(([, i]) => { if (falta-- > 0) out[i]++; });
  return ns.map((n, i) => ({ unit: n, n: out[i], fuerza: fuerzas[n] ?? null }));
}

// ——— Qué falla y cómo arreglarlo ———

/** Las ideas que olvidaste en el último cold recall de un tema. */
export function olvidadas(st: StudyState, tema: string) {
  const last = st.attempts.filter((a) => a.tema === tema && a.kind === 'cold').at(-1);
  return (last?.ideas ?? []).filter((i) => !i.ok).map((i) => i.idea);
}

const lista = (xs: string[]) => (xs.length > 1 ? `${xs.slice(0, -1).join(', ')} y ${xs[xs.length - 1]}` : xs[0] ?? '');
const lower1 = (s: string) => (s ? s[0].toLowerCase() + s.slice(1) : s);

/** El último test de un tema, si es un capítulo. */
export function lastTest(st: StudyState, tema: string): TestResult | undefined {
  const [a, n] = tema.split(':');
  if (a === 'mazo') return undefined;
  return unitState(st, a, Number(n)).tests.at(-1);
}

/** "falla: …": lo más concreto que se sepa de por qué está flojo. */
export function qFalla(st: StudyState, tema: string) {
  const ol = olvidadas(st, tema);
  if (ol.length) return lista(ol.map(lower1));
  const sang = leeches(st.cards.filter((c) => temaDeCarta(c, st.fronts) === tema), st.log)[0];
  if (sang) return `una tarjeta sanguijuela: la fallaste ${sang.fallos} veces`;
  const t = lastTest(st, tema);
  const temasT = [...new Set((t?.wrong ?? []).map((w) => w.tema).filter(Boolean) as string[])];
  if (temasT.length) return lista(temasT.slice(0, 2).map(lower1));
  if (t && t.score < t.total) return `${t.total - t.score} errores en el test`;
  const f = sources(st, tema);
  if (f.tarjetas != null && f.tarjetas < 80) return 'retención del mazo bajo el 80 %';
  return 'todavía hay pocos datos';
}

export interface PasoArreglo {
  texto: string;
  min: number;
  kind: 'releer' | 'tarjetas' | 'ejercicios';
}

/** Cómo arreglarlo: releer lo olvidado, las tarjetas que fallaste y ejercicios de lo que falla en el test. */
export function fixPlan(st: StudyState, tema: string): PasoArreglo[] {
  const out: PasoArreglo[] = [];
  const ol = olvidadas(st, tema);
  if (ol.length) out.push({ kind: 'releer', texto: `Releer ${lista(ol.map(lower1))}`, min: Math.min(9, 3 * ol.length) });
  const desde = addDays(st.log.at(-1)?.date ?? '2000-01-01', -14);
  const cartas = st.cards.filter((c) => temaDeCarta(c, st.fronts) === tema);
  const ids = new Set(cartas.map((c) => c.id));
  const falladas = new Set(st.log.filter((l) => ids.has(l.cardId) && l.grade === 1 && l.date >= desde).map((l) => l.cardId)).size;
  const nuevas = ol.length;
  if (falladas || nuevas) {
    const partes = [nuevas && `${nuevas} ${nuevas === 1 ? 'tarjeta nueva' : 'tarjetas nuevas'}`, falladas && `${falladas === 1 ? 'la que fallaste' : `las ${falladas} que fallaste`}`].filter(Boolean) as string[];
    out.push({ kind: 'tarjetas', texto: partes.join(' y '), min: Math.max(2, Math.ceil((nuevas + falladas) * 0.8)) });
  }
  const t = lastTest(st, tema);
  const temasT = [...new Set((t?.wrong ?? []).filter((w) => w.type !== 'descuido').map((w) => w.tema).filter(Boolean) as string[])];
  if (temasT.length) out.push({ kind: 'ejercicios', texto: `5 ejercicios de ${lista(temasT.slice(0, 2).map(lower1))}`, min: 8 });
  else if (t && (t.errors.tecnica || t.errors.concepto)) out.push({ kind: 'ejercicios', texto: '5 ejercicios del capítulo', min: 8 });
  if (!out.length) out.push({ kind: 'tarjetas', texto: 'Las tarjetas del tema que vencen', min: 4 });
  return out;
}

export const planMin = (p: PasoArreglo[]) => p.reduce((s, x) => s + x.min, 0);

/** Lo más flojo ahora: los temas por debajo de 85, del más flojo al menos. */
export function ranking(st: StudyState, max = 5) {
  return temas(st)
    .filter((t) => t.fuerza != null && t.fuerza < BIEN)
    .sort((a, b) => a.fuerza! - b.fuerza!)
    .slice(0, max)
    .map((t) => ({ ...t, falla: qFalla(st, t.id), min: planMin(fixPlan(st, t.id)) }));
}

/** Refuerzo de hoy: los arreglos de los temas más flojos que entran en el tope. */
export function refuerzo(st: StudyState, cap = st.rules.cap) {
  const out: { tema: Tema; paso: PasoArreglo }[] = [];
  let used = 0;
  for (const t of ranking(st, 10)) {
    for (const p of fixPlan(st, t.id)) {
      if (used + p.min > cap) continue;
      out.push({ tema: t, paso: p });
      used += p.min;
    }
  }
  return { pasos: out, min: used };
}

// ——— Cómo fallás ———

export const ERR_ORDEN: ErrType[] = ['descuido', 'tecnica', 'concepto', 'enunciado'];
export const ERR_NOMBRE: Record<ErrType, string> = { descuido: 'Descuido', tecnica: 'Técnica', concepto: 'Concepto', enunciado: 'Enunciado' };
export const ERR_COLOR: Record<ErrType, string> = { descuido: 'var(--economia)', tecnica: 'var(--eclipse)', concepto: 'var(--rutina)', enunciado: 'var(--handyx)' };
export const ERR_CONSEJO: Record<ErrType, string> = {
  descuido: 'Revisá antes de entregar: releé cada resultado una vez.',
  tecnica: 'Más ejercicios espaciados del mismo tipo, cortos.',
  concepto: 'Releer ese tramo y escribirlo con tus palabras.',
  enunciado: 'Subrayá qué te piden antes de resolver.',
};

/** Todos los tests, en orden: capítulo, puntaje y errores. */
export function allTests(st: StudyState) {
  return st.activities.flatMap((a) => (a.units ?? []).flatMap((u) => unitState(st, a.id, u.n).tests.map((t, i) => ({ a, n: u.n, t, intento: i + 1 }))))
    .sort((x, y) => x.t.date.localeCompare(y.t.date) || x.n - y.n);
}

export function errorTypes(st: StudyState) {
  const ts = allTests(st);
  const by: Record<ErrType, number> = { descuido: 0, tecnica: 0, concepto: 0, enunciado: 0 };
  for (const { t } of ts) for (const k of ERR_ORDEN) by[k] += t.errors[k];
  const total = ERR_ORDEN.reduce((s, k) => s + by[k], 0);
  return { by, total, tests: ts.length };
}

/** Lo que fallás seguido: lo que practica cada ejercicio fallado, si se repite en 2 tests o más. */
export function repetidos(st: StudyState) {
  const m = new Map<string, { caps: Set<number>; tipos: Map<ErrType, number>; n: number }>();
  for (const { n, t } of allTests(st)) for (const w of t.wrong ?? []) {
    if (!w.tema) continue;
    const x = m.get(w.tema) ?? { caps: new Set(), tipos: new Map(), n: 0 };
    x.caps.add(n);
    x.tipos.set(w.type, (x.tipos.get(w.type) ?? 0) + 1);
    x.n++;
    m.set(w.tema, x);
  }
  return [...m.entries()]
    .filter(([, x]) => x.n >= 2)
    .sort((a, b) => b[1].n - a[1].n)
    .map(([tema, x]) => ({ tema, n: x.n, caps: [...x.caps].sort((a, b) => a - b), tipo: [...x.tipos.entries()].sort((a, b) => b[1] - a[1])[0][0] }));
}

/** Por capítulo de una actividad: el último puntaje, si aprobó al primer intento y los re-test pendientes. */
export function examenes(st: StudyState, a: Activity) {
  const filas = (a.units ?? []).flatMap((u) => {
    const s = unitState(st, a.id, u.n);
    const t = s.tests.at(-1);
    return t ? [{ n: u.n, t, primero: !!s.tests[0]?.approved, flojo: !!s.flojo }] : [];
  });
  const retests = st.reviews.filter((r) => r.activityId === a.id && r.kind === 'retest' && !r.doneOn);
  const prom = filas.length ? Math.round((filas.reduce((s, f) => s + f.t.score / f.t.total, 0) / filas.length) * 100) : null;
  return { filas, retests, prom, primero: filas.filter((f) => f.primero).length, corte: Math.round(PASS * 100) };
}

// ——— Recall semana a semana ———

/** Promedio del cold recall por frente en las últimas `n` semanas (lunes a domingo), 0..100. */
export function recallSemanal(st: StudyState, date: string, n = 6) {
  const d = parseDate(date);
  const lunes = addDays(date, -((d.getDay() + 6) % 7));
  const semanas = Array.from({ length: n }, (_, i) => addDays(lunes, -7 * (n - 1 - i)));
  const series = st.fronts.map((f) => ({
    front: f,
    valores: semanas.map((s) => r100(mean(st.attempts.filter((a) => a.kind === 'cold' && a.frontId === f.id && a.date >= s && a.date < addDays(s, 7)).map((a) => a.ok))) ?? null),
  })).filter((x) => x.valores.some((v) => v != null));
  return { semanas, series };
}

/** El recall de la semana: el promedio de los cold recalls de los últimos 7 días. */
export const recallDeLaSemana = (st: StudyState, date: string) =>
  r100(mean(st.attempts.filter((a) => a.kind === 'cold' && a.date > addDays(date, -7) && a.date <= date).map((a) => a.ok))) ?? null;

// ——— Mapa de fortaleza ———

/** Por capítulo estudiado: cold recall, tarjetas, test y el ejercicio del día 8 (bien de 5). */
export function mapa(st: StudyState, a: Activity) {
  return (a.units ?? []).flatMap((u) => {
    const id = temaUnidad(a.id, u.n);
    const s = unitState(st, a.id, u.n);
    if (!s.learnedOn && !s.tests.length) return [];
    const f = sources(st, id);
    const ej = st.attempts.find((x) => x.tema === id && x.kind === 'ejercicio');
    return [{ n: u.n, titulo: u.corto ?? u.title, ...f, d8: ej?.de ?? null }];
  });
}

// ——— Datos ———

/** reviews.json: cada intento (tema, tipo, resultado, fecha y cuánto creías recordar). */
export function reviewsJson(st: StudyState) {
  return [
    ...st.attempts.map((a) => ({ tema: a.tema, tipo: a.kind === 'cold' ? 'cold recall' : 'ejercicio', resultado: Math.round(a.ok * 100), fecha: a.date, ...(a.creia != null ? { creia: Math.round(a.creia * 100) } : {}), ...(a.ideas ? { ideas: a.ideas } : {}) })),
    ...cardAttempts(st).map((a) => ({ tema: a.tema, tipo: 'tarjeta', resultado: a.ok * 100, fecha: a.date, tarjeta: a.idea })),
  ].sort((x, y) => x.fecha.localeCompare(y.fecha));
}

/** tests.json: capítulo, puntaje y el tipo de cada error. */
export function testsJson(st: StudyState) {
  return allTests(st).map(({ a, n, t, intento }) => ({
    capitulo: temaUnidad(a.id, n), fecha: t.date, intento, puntaje: t.score, total: t.total, aprobado: t.approved,
    errores: t.wrong?.length ? t.wrong.map((w) => ({ tipo: w.type, ejercicio: w.q, ...(w.tema ? { tema: w.tema } : {}) })) : ERR_ORDEN.flatMap((k) => Array(t.errors[k]).fill({ tipo: k })),
  }));
}
