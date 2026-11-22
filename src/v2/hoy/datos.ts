/**
 * Trazo 2.0 · Hoy: lo que decide la pantalla, sin dibujar nada. Qué va en el héroe (lo de ahora, lo próximo o el cierre),
 * las filas de la línea del día con la marca de "ahora", a dónde lleva "Entrar en foco" y el resumen del día. Puro.
 */
import { blockDone, cuentan } from '../../data/mejora';
import { blockEnd, currentBlock, remainingMin } from '../../data/schedule';
import { activitiesFor } from '../../data/study';
import type { StudyState } from '../../data/study-types';
import { RAMA_NOMBRE } from '../../data/ramas';
import { fmtDur, toHHMM, toMin } from '../../data/time';
import type { TrainState } from '../../data/train-types';
import type { Block, DayLog, FocusState } from '../../data/types';

const DIA = 24 * 60;

/** Los colores de área y rama de la 1.0, en los tokens de la 2.0. */
export const colorV2 = (css: string) => (css === 'var(--tinta)' ? 'var(--texto)' : css === 'var(--sub)' ? 'var(--texto-3)' : css.replace(/^var\(--(\w+)\)$/, 'var(--a-$1)'));

export const pasosDe = (b: Pick<Block, 'tasks'>) => ({ hechos: b.tasks.filter((t) => t.done).length, total: b.tasks.length });

/** "3 pasos" si no empezaste, "2 de 3 pasos" si vas por la mitad: todo número con su rótulo, sin ceros de más. */
export function textoPasos(hechos: number, total: number) {
  if (!total) return 'sin pasos';
  if (total === 1) return hechos ? '1 paso hecho' : '1 paso';
  return hechos ? `${hechos} de ${total} pasos` : `${total} pasos`;
}

/** El punto medio no arranca un renglón: "Programación ·" arriba y "PetrIA" abajo, nunca "· PetrIA". */
export const sinPuntoSuelto = (t: string) => t.replace(/ · /g, '\u00a0· ');

/** "programacion · P1 · semana 1 de 3" → "Programación · P1 · semana 1 de 3": la rama con su nombre, no con su id. */
export function etiquetaLinda(tag: string | null) {
  if (!tag) return null;
  const [rama, ...resto] = tag.split(' · ');
  const nombre = (RAMA_NOMBRE as Record<string, string>)[rama];
  const t = nombre ? [nombre, ...resto].join(' · ') : tag[0].toUpperCase() + tag.slice(1);
  return sinPuntoSuelto(t);
}

// ——— El héroe ———

export type Ahora =
  | { tipo: 'cerrado' }
  | { tipo: 'ahora' | 'proximo'; bloque: Block; /** Lo que queda (ahora) o lo que falta para empezar (próximo). */ minutos: number; /** 0 a 1 del bloque en curso. */ avance: number; despues?: Block }
  | { tipo: 'fin'; pendientes: number };

/**
 * Qué muestra el héroe: el bloque en curso si todavía no está hecho; si no, la próxima meta sin hacer; y cuando no queda
 * nada por delante, el cierre. Las salteadas no cuentan.
 */
export function ahoraDe(day: DayLog, now: number): Ahora {
  if (day.closed) return { tipo: 'cerrado' };
  const activos = day.blocks.filter((b) => !b.salteado);
  const despuesDe = (b: Block) => activos.find((x) => toMin(x.start) >= blockEnd(b) && !blockDone(x));
  const cur = currentBlock(activos, now);
  if (cur && !blockDone(cur)) return { tipo: 'ahora', bloque: cur, minutos: remainingMin(cur, now), avance: Math.max(0, Math.min(1, (now - toMin(cur.start)) / cur.min)), despues: despuesDe(cur) };
  const prox = activos.find((b) => toMin(b.start) > now && !blockDone(b));
  if (prox) return { tipo: 'proximo', bloque: prox, minutos: toMin(prox.start) - now, avance: 0, despues: despuesDe(prox) };
  return { tipo: 'fin', pendientes: activos.filter((b) => !blockDone(b)).length };
}

// ——— La línea del día ———

export type EstadoFila = 'hecha' | 'ahora' | 'pasada' | 'futura' | 'salteada';
export type FilaLinea = { tipo: 'bloque'; b: Block; estado: EstadoFila } | { tipo: 'ahora'; hora: string };

/** Las metas en orden, con la marca de "ahora" en el hueco donde cae la hora si no hay un bloque en curso. */
export function filasLinea(day: DayLog, now: number): FilaLinea[] {
  const cur = currentBlock(day.blocks.filter((b) => !b.salteado), now);
  const out: FilaLinea[] = [];
  let puesta = !!cur || !!day.closed;
  for (const b of day.blocks) {
    if (!puesta && toMin(b.start) > now) { out.push({ tipo: 'ahora', hora: toHHMM(now) }); puesta = true; }
    const estado: EstadoFila = b.salteado ? 'salteada' : blockDone(b) ? 'hecha' : cur?.key === b.key ? 'ahora' : blockEnd(b) <= now ? 'pasada' : 'futura';
    out.push({ tipo: 'bloque', b, estado });
  }
  return out;
}

/** "Ahora · quedan 2 h 10" y el rango "04:30–08:30" de una meta. */
export function momento(b: Pick<Block, 'start' | 'min'>, now: number) {
  const s = toMin(b.start);
  const e = blockEnd(b);
  const rango = `${b.start}–${toHHMM(e % DIA)}`;
  if (now >= s && now < e) return { rango, texto: `Ahora · quedan ${fmtDur(remainingMin(b, now))}` };
  if (now < s) return { rango, texto: `Empieza ${b.start} · ${fmtDur(b.min)}` };
  return { rango, texto: `Terminó ${toHHMM(e % DIA)} · ${fmtDur(b.min)}` };
}

// ——— El foco ———

export interface Destino { ruta: string; etiqueta: string }
export interface CtxFoco { focus: FocusState | null; study: StudyState; train: Pick<TrainState, 'active' | 'sessions'> }

/** A dónde lleva el botón principal de una meta (o `null` si esa meta no abre foco: rutina, comidas, dormir). */
export function destinoDe(b: Block, day: Pick<DayLog, 'date'>, { focus, study, train }: CtxFoco): Destino | null {
  if (b.focus === false) return null;
  if (b.kind === 'entreno') {
    if (train.active?.date === day.date) return { ruta: `entreno-sesion/${train.active.routineId}`, etiqueta: 'Volver al entreno' };
    return { ruta: 'entreno', etiqueta: train.sessions.some((s) => s.date === day.date) ? 'Ver el entreno' : 'Ir a entrenar' };
  }
  if (focus?.key === b.key && focus.date === day.date) return { ruta: focus.tramos ? `sesion/${focus.activityId}` : 'foco', etiqueta: 'Volver al foco' };
  const act = b.kind === 'estudio' ? activitiesFor(study, day.date).find((a) => a.block === b.key) : undefined;
  return { ruta: act ? `sesion/${act.id}` : `elegir/${b.key}`, etiqueta: 'Entrar en foco' };
}

// ——— El día ———

export function resumenDia(day: Pick<DayLog, 'blocks'>) {
  const metas = cuentan(day.blocks);
  const tareas = day.blocks.flatMap((b) => b.tasks);
  return { metas: metas.length, hechas: metas.filter(blockDone).length, pasos: tareas.length, pasosHechos: tareas.filter((t) => t.done).length };
}

/** "Weekly review (hours, …)" → "Weekly review": el detalle largo va en la hoja de la meta. */
export const nombreHabito = (n: string) => n.split(' (')[0];
