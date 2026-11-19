/**
 * Ola 28 · en qué estado está cada capítulo de un libro con unidades (CONAMAT Aritmética, Álgebra…), el
 * resumen del libro con su % de aprobación y el historial de días. Puro: lee el estado de estudio, no lo cambia.
 *
 * Un capítulo pasa por: pendiente → estudiando → test (día 2) → [re-test] → tesis → repasos (8, 22, 61) → cerrado.
 * Nada avanza solo: estudiando → test lo marcás vos ("Terminé de estudiarlo"); lo demás sale del test y la tesis.
 */
import { focusUnit, unitState } from './study';
import type { Activity, Card, ReviewItem, StudyState, TestResult, Unit } from './study-types';
import { addDays, daysBetween } from './time';
import type { DayLog } from './types';

export type EstadoCap = 'pendiente' | 'estudiando' | 'test' | 'retest' | 'tesis' | 'repasos' | 'cerrado' | 'flojo';

export interface InfoCap {
  n: number;
  unit: Unit;
  estado: EstadoCap;
  /** Texto corto para la lista ("test mañana", "aprobado 93 %"). */
  etiqueta: string;
  /** Lo que sigue y cuándo. */
  proximo?: { que: string; fecha: string };
  tests: TestResult[];
  /** Mejor y último % de los tests (0 a 100). */
  mejor: number | null;
  ultimo: number | null;
  tarjetas: number;
  /** El repaso de la tesis pendiente (para abrirla). */
  tesis?: ReviewItem;
  /** Repasos agendados de este capítulo (cold recall, tesis, días 8, 22 y 61, releer y re-test). */
  repasos: ReviewItem[];
}

const pct = (t: TestResult) => Math.round((t.score / t.total) * 100);
const MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const fechaCorta = (d: string) => `${Number(d.slice(8))} ${MES[Number(d.slice(5, 7)) - 1]}`;

/** "hoy", "mañana", "atrasado" o "el 3 dic". */
export function cuando(fecha: string, hoy: string) {
  if (fecha === hoy) return 'hoy';
  if (fecha === addDays(hoy, 1)) return 'mañana';
  if (fecha < hoy) return 'atrasado';
  return `el ${fechaCorta(fecha)}`;
}

export const tarjetasDe = (st: StudyState, actId: string, n?: number): Card[] =>
  st.cards.filter((c) => c.activityId === actId && (n == null || c.unit === n));

/** El estado de un capítulo a una fecha. */
export function estadoCapitulo(st: StudyState, a: Activity, n: number, hoy: string): InfoCap {
  const unit = a.units!.find((u) => u.n === n)!;
  const s = unitState(st, a.id, n);
  const tests = s.tests;
  const mejor = tests.length ? Math.max(...tests.map(pct)) : null;
  const ultimo = tests.length ? pct(tests[tests.length - 1]) : null;
  const repasos = st.reviews.filter((r) => r.activityId === a.id && r.unit === n).sort((x, y) => x.due.localeCompare(y.due));
  const pend = (k: ReviewItem['kind']) => repasos.find((r) => r.kind === k && !r.doneOn);
  const base = { n, unit, tests, mejor, ultimo, tarjetas: tarjetasDe(st, a.id, n).length, repasos };

  if (s.approvedOn || s.flojo) {
    const tesis = pend('tesis');
    if (tesis) return { ...base, estado: 'tesis', tesis, etiqueta: `tesis ${cuando(tesis.due, hoy)}`, proximo: { que: 'Tesis: explicarlo con tus palabras, empezando por los errores del test', fecha: tesis.due } };
    const sig = repasos.find((r) => !r.doneOn && (r.kind === 'ejercicios' || r.kind === 'examen'));
    if (s.flojo && !s.approvedOn) return { ...base, estado: 'flojo', etiqueta: `flojo · ${ultimo ?? 0} %`, ...(sig ? { proximo: { que: sig.label.split(' · ')[0], fecha: sig.due } } : {}) };
    if (sig) return { ...base, estado: 'repasos', etiqueta: `aprobado ${mejor} % · repaso ${cuando(sig.due, hoy)}`, proximo: { que: sig.label.split(' · ')[0], fecha: sig.due } };
    return { ...base, estado: 'cerrado', etiqueta: `aprobado ${mejor} %` };
  }
  if (s.learnedOn) {
    if (tests.length) {
      const re = pend('retest');
      const fecha = re?.due ?? hoy;
      return { ...base, estado: 'retest', etiqueta: `re-test ${cuando(fecha, hoy)} · ${ultimo} %`, proximo: { que: 'Re-test con ejercicios nuevos (antes, releer lo que falló)', fecha } };
    }
    const fecha = addDays(s.learnedOn, 1);
    return { ...base, estado: 'test', etiqueta: `test ${cuando(fecha < hoy ? hoy : fecha, hoy)}`, proximo: { que: 'Cold recall y test completo del capítulo', fecha: fecha < hoy ? hoy : fecha } };
  }
  if (focusUnit(a, st, hoy)?.n === n) return { ...base, estado: 'estudiando', etiqueta: 'estudiando', proximo: { que: 'Terminar de estudiarlo: después va el test', fecha: hoy } };
  return { ...base, estado: 'pendiente', etiqueta: 'por empezar' };
}

export const capitulos = (st: StudyState, a: Activity, hoy: string) => (a.units ?? []).map((u) => estadoCapitulo(st, a, u.n, hoy));

/** Los capítulos en juego hoy: el que estudiás, los que tienen test o re-test pendiente y las tesis que vencen. */
export function capitulosEnJuego(st: StudyState, a: Activity, hoy: string): InfoCap[] {
  return capitulos(st, a, hoy).filter((c) => c.estado === 'estudiando' || c.estado === 'test' || c.estado === 'retest' || (c.estado === 'tesis' && c.tesis!.due <= hoy));
}

export interface ResumenLibro {
  aprobados: number;
  total: number;
  /** Promedio del mejor % de cada capítulo con test (null sin tests). */
  promedio: number | null;
  tarjetas: number;
  enCurso?: InfoCap;
  /** El examen final del libro: bloqueado hasta aprobar (o marcar flojos) todos los capítulos. */
  final?: { titulo: string; desc: string; disponible: boolean; aprobado: boolean; ultimo: number | null };
}

export function resumenLibro(st: StudyState, a: Activity, hoy: string): ResumenLibro {
  const cs = capitulos(st, a, hoy);
  const conTest = cs.filter((c) => c.mejor != null);
  const fin = st.finales?.[a.id];
  const ultFinal = fin?.tests.length ? pct(fin.tests[fin.tests.length - 1]) : null;
  return {
    aprobados: cs.filter((c) => c.estado === 'tesis' || c.estado === 'repasos' || c.estado === 'cerrado').filter((c) => unitState(st, a.id, c.n).approvedOn).length,
    total: cs.length,
    promedio: conTest.length ? Math.round(conTest.reduce((s, c) => s + c.mejor!, 0) / conTest.length) : null,
    tarjetas: tarjetasDe(st, a.id).length,
    enCurso: cs.find((c) => c.estado === 'estudiando') ?? cs.find((c) => c.estado === 'test' || c.estado === 'retest'),
    ...(a.final ? { final: { titulo: a.final.title, desc: a.final.desc, disponible: cs.every((c) => !!unitState(st, a.id, c.n).approvedOn || !!unitState(st, a.id, c.n).flojo), aprobado: !!fin?.aprobadoOn, ultimo: ultFinal } } : {}),
  };
}

/** ¿El libro ya está terminado? Todos los capítulos aprobados o marcados flojos. */
export const libroTerminado = (st: StudyState, a: Activity) =>
  !!a.units?.length && a.units.every((u) => !!unitState(st, a.id, u.n).approvedOn || !!unitState(st, a.id, u.n).flojo);

export interface DiaHistorial { fecha: string; min: number; eventos: string[] }

const QUE: Record<ReviewItem['kind'], string> = { cold: 'Cold recall', tesis: 'Tesis', releer: 'Releíste lo que falló', retest: 'Re-test', ejercicios: 'Repaso con ejercicios', examen: 'Examen corto' };

/**
 * El historial de días de un libro (o de un capítulo, con `n`): minutos estudiados, capítulos terminados,
 * tests con su %, tesis y repasos hechos y tarjetas repasadas. Del más nuevo al más viejo.
 */
export function historial(st: StudyState, days: Record<string, DayLog>, a: Activity, n?: number): DiaHistorial[] {
  const m = new Map<string, DiaHistorial>();
  const dia = (f: string) => m.get(f) ?? (m.set(f, { fecha: f, min: 0, eventos: [] }), m.get(f)!);
  const cap = (k: number) => `${a.unitLabel ?? 'Cap.'} ${k}`;
  // Minutos de la sesión de estudio: se cuentan para el libro (no se sabe de qué capítulo eran).
  if (n == null) for (const [f, d] of Object.entries(days)) { const min = (d.study ?? []).filter((x) => x.activityId === a.id).reduce((s, x) => s + x.min, 0); if (min) dia(f).min += min; }
  for (const u of a.units ?? []) {
    if (n != null && u.n !== n) continue;
    const s = unitState(st, a.id, u.n);
    if (s.learnedOn) dia(s.learnedOn).eventos.push(`Terminaste de estudiar el ${cap(u.n).toLowerCase()}`);
    for (const t of s.tests) dia(t.date).eventos.push(`${s.tests.indexOf(t) ? 'Re-test' : 'Test'} del ${cap(u.n).toLowerCase()}: ${t.score}/${t.total} (${pct(t)} %)${t.approved ? ', aprobado' : ''}`);
  }
  for (const r of st.reviews) {
    if (r.activityId !== a.id || !r.doneOn || (n != null && r.unit !== n)) continue;
    if (r.kind === 'retest') continue; // el re-test ya está con su resultado
    // El test cierra el cold recall que quedó sin hacer: solo cuenta el que hiciste (tiene su %).
    if (r.kind === 'cold' && r.score == null) continue;
    dia(r.doneOn).eventos.push(`${QUE[r.kind]}${r.unit != null ? ` del ${cap(r.unit).toLowerCase()}` : ''}${r.kind === 'cold' && r.score != null ? ` (${Math.round(r.score * 100)} % recordado)` : ''}`);
  }
  const ids = new Set(tarjetasDe(st, a.id, n).map((c) => c.id));
  const porDia = new Map<string, number>();
  for (const l of st.log) if (ids.has(l.cardId)) porDia.set(l.date, (porDia.get(l.date) ?? 0) + 1);
  for (const [f, k] of porDia) dia(f).eventos.push(`${k} ${k === 1 ? 'tarjeta repasada' : 'tarjetas repasadas'}`);
  return [...m.values()].filter((d) => d.min || d.eventos.length).sort((x, y) => y.fecha.localeCompare(x.fecha));
}

/** Días desde que terminaste de estudiar el capítulo (para "día 2", "día 8"…). */
export const diaDelCapitulo = (st: StudyState, actId: string, n: number, hoy: string) => {
  const l = unitState(st, actId, n).learnedOn;
  return l ? daysBetween(l, hoy) + 1 : 0;
};
