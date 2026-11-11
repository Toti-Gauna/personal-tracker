import type { FocusState, Seg } from './types';

const MS = 60000;

export function startFocus(date: string, key: string, plan: string, segs: Seg[], now: number): FocusState {
  return { date, key, plan, segs, i: 0, segStart: now, pausedAt: null };
}

const at = (s: FocusState, now: number) => s.pausedAt ?? now;

export const segRemaining = (s: FocusState, now: number) => s.segs[s.i].min * MS - (at(s, now) - s.segStart);
export const segProgress = (s: FocusState, now: number) =>
  Math.min(1, Math.max(0, (at(s, now) - s.segStart) / (s.segs[s.i].min * MS)));

/** Avance de todo el plan, 0..1. */
export function planProgress(s: FocusState, now: number) {
  const total = s.segs.reduce((a, x) => a + x.min, 0) * MS;
  const done = s.segs.slice(0, s.i).reduce((a, x) => a + x.min, 0) * MS + (at(s, now) - s.segStart);
  return Math.min(1, Math.max(0, done / total));
}

export interface TickResult {
  state: FocusState;
  /** Tramos que terminaron en este tick (en orden). */
  ended: Seg[];
  finished: boolean;
}

/** Avanza los tramos vencidos. Sirve también al volver a abrir la app. */
export function tick(s: FocusState, now: number): TickResult {
  if (s.pausedAt != null) return { state: s, ended: [], finished: false };
  let st = s;
  const ended: Seg[] = [];
  while (segRemaining(st, now) <= 0) {
    ended.push(st.segs[st.i]);
    if (st.i >= st.segs.length - 1) return { state: st, ended, finished: true };
    st = { ...st, segStart: st.segStart + st.segs[st.i].min * MS, i: st.i + 1 };
  }
  return { state: st, ended, finished: false };
}

export const pause = (s: FocusState, now: number): FocusState => (s.pausedAt != null ? s : { ...s, pausedAt: now });
export const resume = (s: FocusState, now: number): FocusState =>
  s.pausedAt == null ? s : { ...s, segStart: s.segStart + (now - s.pausedAt), pausedAt: null };

/** "Descanso ahora": corta el foco; si no hay descanso después, mete uno de 5 min. */
export function restNow(s: FocusState, now: number): FocusState {
  const cur = s.segs[s.i];
  if (cur.type !== 'focus') return s;
  const used = Math.max(1, Math.round((at(s, now) - s.segStart) / MS));
  const segs = s.segs.map((x) => ({ ...x }));
  segs[s.i].min = used;
  if (segs[s.i + 1]?.type !== 'rest') segs.splice(s.i + 1, 0, { type: 'rest', min: 5 });
  return { ...s, segs, i: s.i + 1, segStart: now, pausedAt: null };
}

/** "Seguir ahora" desde un descanso: lo corta y pasa al próximo foco. */
export function skipRest(s: FocusState, now: number): FocusState {
  const cur = s.segs[s.i];
  if (cur.type !== 'rest' || s.i >= s.segs.length - 1) return s;
  const segs = s.segs.map((x) => ({ ...x }));
  segs[s.i].min = Math.max(1, Math.round((at(s, now) - s.segStart) / MS));
  return { ...s, segs, i: s.i + 1, segStart: now, pausedAt: null };
}

/** Suma un tramo de foco al final ("Hacerla ahora · 10 min"). */
export function extend(s: FocusState, min: number, now: number): FocusState {
  const segs = [...s.segs, { type: 'focus' as const, min }];
  return { ...s, segs, i: segs.length - 1, segStart: now, pausedAt: null };
}

/** Foco número n de m (para "1 de 2" en el mini reproductor). */
export function focusIndex(s: FocusState) {
  const focus = s.segs.map((x, i) => [x, i] as const).filter(([x]) => x.type === 'focus');
  const n = focus.filter(([, i]) => i <= s.i).length;
  return { n: Math.max(1, n), m: focus.length };
}

/** "Hecho": cierra el tramo actual con lo que llevás y pasa al siguiente. */
export function advance(s: FocusState, now: number): { state: FocusState; usedMin: number; finished: boolean } {
  const usedMin = Math.max(0, Math.round((at(s, now) - s.segStart) / MS));
  const segs = s.segs.map((x) => ({ ...x }));
  const tramos = s.tramos?.map((x) => ({ ...x }));
  segs[s.i].min = Math.max(1, usedMin);
  if (tramos) tramos[s.i].min = segs[s.i].min;
  if (s.i >= s.segs.length - 1) return { state: { ...s, segs, tramos }, usedMin, finished: true };
  return { state: { ...s, segs, tramos, i: s.i + 1, segStart: now, pausedAt: null }, usedMin, finished: false };
}

/** "+5 min" al tramo actual. */
export function addMinutes(s: FocusState, min: number): FocusState {
  const segs = s.segs.map((x, i) => (i === s.i ? { ...x, min: x.min + min } : x));
  const tramos = s.tramos?.map((x, i) => (i === s.i ? { ...x, min: x.min + min } : x));
  return { ...s, segs, tramos };
}

/** Índice del último tramo de "aprender" con foco (al terminarlo, la unidad queda aprendida). */
export const lastLearnIndex = (s: FocusState) =>
  s.tramos ? s.tramos.map((t) => t.kind).lastIndexOf('capitulo') : -1;
