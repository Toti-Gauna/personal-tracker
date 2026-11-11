import type { Grade } from './fsrs';

const STOP = new Set(
  'a al algo con de del el ella en es esa ese eso esta este esto la las le lo los mas más me mi muy o para pero por que qué se si sí su sus te tu un una uno y ya the of and to is in'.split(' '),
);

const norm = (w: string) => w.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');

/** Palabra con peso: no es de relleno y tiene al menos 3 letras o es un número/símbolo. */
const key = (w: string) => {
  const n = norm(w);
  return n.length > 0 && !STOP.has(n) && (n.length >= 3 || /\d/.test(n));
};

/** Raíz simple para comparar "divide"/"dividen", "números"/"numero". */
const stem = (n: string) => (n.length > 5 ? n.slice(0, n.length - 2) : n);

export interface Comparison {
  /** El dorso partido en palabras, con las que faltaron marcadas. */
  tokens: { text: string; missing: boolean }[];
  /** Frases que faltaron ("sin dejar resto"). */
  missing: string[];
  /** Proporción de palabras clave que aparecieron. */
  coverage: number;
  suggested: Grade;
}

/** Compara lo que escribiste con el dorso de la tarjeta. */
export function compareAnswer(answer: string, back: string): Comparison {
  const have = new Set(answer.split(/\s+/).map(norm).filter(Boolean).map(stem));
  const tokens = back.split(/(\s+)/).map((text) => {
    const n = norm(text);
    return { text, missing: key(text) && !have.has(stem(n)) };
  });
  // Los espacios entre dos palabras faltantes también se resaltan, para que se lea como una frase.
  tokens.forEach((t, i) => {
    if (/^\s+$/.test(t.text) && tokens[i - 1]?.missing && tokens[i + 1]?.missing) t.missing = true;
  });
  const keys = tokens.filter((t) => key(t.text));
  const coverage = keys.length ? keys.filter((t) => !t.missing).length / keys.length : 1;

  // Frases: tramos de palabras faltantes, uniendo palabras de relleno del medio.
  const missing: string[] = [];
  let run: string[] = [];
  let pending: string[] = [];
  for (const t of tokens) {
    if (/^\s+$/.test(t.text)) continue;
    if (t.missing) {
      run.push(...pending, t.text);
      pending = [];
    } else if (run.length && !key(t.text)) pending.push(t.text);
    else {
      if (run.length) missing.push(run.join(' ').replace(/[.,;:]+$/, ''));
      run = [];
      pending = [];
    }
  }
  if (run.length) missing.push(run.join(' ').replace(/[.,;:]+$/, ''));

  const suggested: Grade = !answer.trim() || coverage < 0.5 ? 1 : coverage < 0.9 ? 2 : 3;
  return { tokens, missing, coverage, suggested };
}
