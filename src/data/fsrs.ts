/**
 * FSRS-5: programa cada tarjeta para cuando la probabilidad de recordarla
 * baja a la retención buscada (90 % por defecto). Parámetros por defecto de FSRS-5.
 */
export const W = [
  0.40255, 1.18385, 3.173, 15.69105, 7.1949, 0.5345, 1.4604, 0.0046, 1.54575, 0.1192, 1.01925,
  1.9395, 0.11, 0.29605, 2.2698, 0.2315, 2.9898, 0.51655, 0.6621,
];
const DECAY = -0.5;
const FACTOR = 0.9 ** (1 / DECAY) - 1; // 19/81

export type Grade = 1 | 2 | 3 | 4; // Otra vez, Difícil, Bien, Fácil
export type SrsState = 'new' | 'learning' | 'review' | 'relearning';

export interface Srs {
  state: SrsState;
  /** Epoch ms en que vence. */
  due: number;
  /** Estabilidad en días: a los S días, R = 90 %. */
  s: number;
  /** Dificultad 1..10. */
  d: number;
  reps: number;
  lapses: number;
  /** Epoch ms del último repaso. */
  last?: number;
  /** Fallos seguidos (para "releer si falla 2 veces"). */
  fails: number;
}

export const DAY = 86400000;
export const RELEARN_MIN = 10;

const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));

export const newSrs = (now: number): Srs => ({ state: 'new', due: now, s: 0, d: 0, reps: 0, lapses: 0, fails: 0 });

/** Probabilidad de recordar a los t días con estabilidad S. */
export const retrievability = (t: number, s: number) => (s > 0 ? (1 + (FACTOR * t) / s) ** DECAY : 0);

/** Días hasta que R baja a la retención buscada. */
export const intervalFor = (s: number, retention: number) => (s / FACTOR) * (retention ** (1 / DECAY) - 1);

const d0 = (g: Grade) => clamp(W[4] - Math.exp(W[5] * (g - 1)) + 1, 1, 10);

function nextD(d: number, g: Grade) {
  const delta = -W[6] * (g - 3);
  const dp = d + (delta * (10 - d)) / 9;
  return clamp(W[7] * d0(4) + (1 - W[7]) * dp, 1, 10);
}

function sRecall(d: number, s: number, r: number, g: Grade) {
  const hard = g === 2 ? W[15] : 1;
  const easy = g === 4 ? W[16] : 1;
  return s * (Math.exp(W[8]) * (11 - d) * s ** -W[9] * (Math.exp(W[10] * (1 - r)) - 1) * hard * easy + 1);
}

const sForget = (d: number, s: number, r: number) =>
  Math.min(s, W[11] * d ** -W[12] * ((s + 1) ** W[13] - 1) * Math.exp(W[14] * (1 - r)));

const sShort = (s: number, g: Grade) => s * Math.exp(W[17] * (g - 3 + W[18]));

const roundDays = (x: number) => Math.max(1, Math.round(x));

/** Aplica una calificación. Devuelve la tarjeta reprogramada. */
export function review(c: Srs, g: Grade, now: number, retention = 0.9): Srs {
  let s: number;
  let d: number;
  if (c.state === 'new') {
    s = W[g - 1];
    d = d0(g);
  } else {
    const elapsed = c.last != null ? (now - c.last) / DAY : 0;
    d = nextD(c.d, g);
    if (elapsed < 1) s = g === 1 ? sForget(c.d, c.s, retrievability(elapsed, c.s)) : sShort(c.s, g);
    else {
      const r = retrievability(elapsed, c.s);
      s = g === 1 ? sForget(c.d, c.s, r) : sRecall(c.d, c.s, r, g);
    }
  }
  s = Math.max(0.1, s);
  const base = { ...c, s, d, reps: c.reps + 1, last: now };
  if (g === 1) {
    return {
      ...base,
      state: c.state === 'new' || c.state === 'learning' ? 'learning' : 'relearning',
      lapses: c.state === 'review' ? c.lapses + 1 : c.lapses,
      due: now + RELEARN_MIN * 60000,
      fails: c.fails + 1,
    };
  }
  return { ...base, state: 'review', due: now + roundDays(intervalFor(s, retention)) * DAY, fails: 0 };
}

/** Qué pasaría con cada botón: intervalos ordenados (Difícil ≤ Bien < Fácil). */
export function preview(c: Srs, now: number, retention = 0.9) {
  const out = ([1, 2, 3, 4] as Grade[]).map((g) => review(c, g, now, retention));
  const days = out.map((x) => (x.due - now) / DAY);
  if (days[1] > days[2]) out[1] = { ...out[1], due: out[2].due };
  if (days[3] <= days[2]) out[3] = { ...out[3], due: out[2].due + DAY };
  return out;
}

/** "10 min", "2 días", "1 día". */
export function fmtInterval(ms: number) {
  if (ms < DAY) return `${Math.max(1, Math.round(ms / 60000))} min`;
  const d = Math.round(ms / DAY);
  if (d < 60) return `${d} ${d === 1 ? 'día' : 'días'}`;
  const m = Math.round(d / 30);
  return `${m} ${m === 1 ? 'mes' : 'meses'}`;
}
