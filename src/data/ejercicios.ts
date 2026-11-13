/**
 * Ejercicios del test completo de CONAMAT · Aritmética. Se generan con una semilla (actividad,
 * capítulo e intento): el mismo test se ve igual al recargar y el re-test trae ejercicios nuevos.
 * Cada uno lleva su respuesta, así la app corrige lo que cargás en la grilla.
 */

export interface Exercise {
  q: string;
  a: string;
  /** Otras formas válidas de escribir la respuesta. */
  alts?: string[];
  /** 'num' compara los números en orden; 'txt' compara el texto sin espacios ni tildes. */
  cmp?: 'num' | 'txt';
  /** Capítulo del que sale (los 5 de repaso vienen de capítulos anteriores). */
  cap?: number;
  /** Qué practica ("Signos de agrupación"): agrupa lo que fallás seguido. */
  tema?: string;
}

type Rng = () => number;

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

export function rngFrom(seed: string): Rng {
  let a = hash(seed);
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const ri = (r: Rng, lo: number, hi: number) => lo + Math.floor(r() * (hi - lo + 1));
const pick = <T,>(r: Rng, xs: readonly T[]) => xs[Math.floor(r() * xs.length)];
const nz = (r: Rng, lo: number, hi: number) => { let x = 0; while (x === 0) x = ri(r, lo, hi); return x; };

/** Número con coma decimal y signo menos tipográfico. */
export const fmt = (x: number) => {
  const v = Math.round(x * 1e6) / 1e6;
  return (v < 0 ? '−' : '') + String(Math.abs(v)).replace('.', ',');
};
/** Entre paréntesis si es negativo. */
const par = (x: number) => (x < 0 ? `(${fmt(x)})` : fmt(x));
const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : Math.abs(a));
const lcm = (a: number, b: number) => (a / gcd(a, b)) * b;
const frac = (p: number, q: number) => {
  if (q < 0) { p = -p; q = -q; }
  const g = gcd(p, q) || 1;
  const [n, d] = [p / g, q / g];
  return d === 1 ? fmt(n) : `${fmt(n)}/${d}`;
};
const SUP: Record<string, string> = { '-': '⁻', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };
const sup = (n: number) => String(n).split('').map((c) => SUP[c] ?? c).join('');
const isPrime = (n: number) => { if (n < 2) return false; for (let i = 2; i * i <= n; i++) if (n % i === 0) return false; return true; };
const factor = (n: number) => {
  const out: [number, number][] = [];
  for (let p = 2; n > 1; p++) {
    let e = 0;
    while (n % p === 0) { n /= p; e++; }
    if (e) out.push([p, e]);
  }
  return out;
};

type Gen = (r: Rng) => Exercise;

const CAPS: Record<number, Gen[]> = {
  1: [
    (r) => { const a = ri(r, -15, 15), b = ri(r, -15, 15); return { q: `Calculá |${fmt(a)} − ${par(b)}|.`, a: fmt(Math.abs(a - b)) }; },
    (r) => {
      const [x, t] = pick(r, [['√2', 'irracional'], ['−5', 'entero'], ['3/4', 'racional'], ['7', 'natural'], ['π', 'irracional'], ['0,25', 'racional'], ['√9', 'natural'], ['−√16', 'entero']] as const);
      return { q: `¿En qué conjunto más chico está ${x}? (natural, entero, racional o irracional)`, a: t, cmp: 'txt' };
    },
    (r) => {
      const xs = [-3, -1.5, 0.25, 2, -0.75, 1.2, -2.4, 3.5, 0.5, -0.2].sort(() => r() - 0.5).slice(0, 3);
      return { q: `Ordená de menor a mayor: ${xs.map(fmt).join('; ')}.`, a: [...xs].sort((a, b) => a - b).map(fmt).join('; ') };
    },
    (r) => { const a = nz(r, -12, 12), b = nz(r, -12, 12); return { q: `Calculá |${fmt(a)}| − |${fmt(b)}|.`, a: fmt(Math.abs(a) - Math.abs(b)) }; },
    (r) => { const a = nz(r, -20, 20); return { q: `¿Cuál es el opuesto de ${fmt(a)}?`, a: fmt(-a) }; },
  ],
  2: [
    (r) => { const [a, b, c, d] = [ri(r, -9, 9), ri(r, -9, 9), ri(r, -9, 9), ri(r, -9, 9)]; return { q: `Calculá ${fmt(a)} − (${fmt(b)} − ${par(c)}) + ${par(d)}.`, a: fmt(a - (b - c) + d) }; },
    (r) => { const [a, b, c] = [nz(r, -9, 9), nz(r, -9, 9), ri(r, -9, 9)]; return { q: `Calculá ${par(a)} · ${par(b)} − ${par(c)}.`, a: fmt(a * b - c) }; },
    (r) => { const [a, b, c, d] = [ri(r, -9, 9), nz(r, -6, 6), ri(r, -9, 9), ri(r, -9, 9)]; return { q: `Calculá ${fmt(a)} + ${par(b)} · (${fmt(c)} − ${par(d)}).`, a: fmt(a + b * (c - d)) }; },
    (r) => { const [a, b, c, d] = [ri(r, -9, 9), ri(r, -9, 9), ri(r, -9, 9), nz(r, -5, 5)]; return { q: `Calculá [${fmt(a)} − (${fmt(b)} + ${par(c)})] · ${par(d)}.`, a: fmt((a - (b + c)) * d) }; },
    (r) => { const b = nz(r, -9, 9), k = nz(r, -9, 9), c = ri(r, -9, 9); return { q: `Calculá ${fmt(b * k)} ÷ ${par(b)} + ${par(c)}.`, a: fmt(k + c) }; },
  ],
  3: [
    (r) => { const n = 2 ** ri(r, 1, 4) * 3 ** ri(r, 0, 2) * 5 ** ri(r, 0, 1) * 7 ** ri(r, 0, 1); const f = factor(n); return { q: `Descomponé ${n} en factores primos.`, a: f.map(([p, e]) => (e > 1 ? `${p}^${e}` : `${p}`)).join('·'), alts: [f.flatMap(([p, e]) => Array(e).fill(p)).join('·')] }; },
    (r) => { const g = ri(r, 2, 14), m = ri(r, 2, 9); let n = ri(r, 2, 9); while (gcd(m, n) !== 1 || n === m) n = ri(r, 2, 11); return { q: `MCD de ${g * m} y ${g * n}.`, a: fmt(g) }; },
    (r) => { const a = ri(r, 4, 24), b = ri(r, 4, 30); return { q: `MCM de ${a} y ${b}.`, a: fmt(lcm(a, b)) }; },
    (r) => { const d = pick(r, [3, 4, 9, 6] as const), n = ri(r, 1000, 9999); return { q: `¿Es ${n} divisible entre ${d}? Respondé sí o no.`, a: n % d === 0 ? 'sí' : 'no', cmp: 'txt' }; },
    (r) => { const n = pick(r, [24, 36, 48, 60, 72, 90, 100, 84] as const); return { q: `¿Cuántos divisores tiene ${n}?`, a: fmt(factor(n).reduce((s, [, e]) => s * (e + 1), 1)) }; },
    (r) => { const a = pick(r, [6, 8, 9, 10, 12, 15] as const), b = pick(r, [14, 16, 18, 20, 21, 25] as const); return { q: `Dos luces titilan cada ${a} y ${b} s. ¿Cada cuántos segundos coinciden?`, a: fmt(lcm(a, b)) }; },
    (r) => { const a = ri(r, 2, 8) * 10; let c = 0; for (let i = a + 1; i < a + 20; i++) if (isPrime(i)) c++; return { q: `¿Cuántos números primos hay entre ${a} y ${a + 20}?`, a: fmt(c) }; },
  ],
  4: [
    (r) => { const [a, b, c, d] = [ri(r, 1, 9), ri(r, 2, 9), ri(r, 1, 9), ri(r, 2, 9)]; return { q: `Calculá ${a}/${b} + ${c}/${d}.`, a: frac(a * d + c * b, b * d) }; },
    (r) => { const [a, b, c, d] = [ri(r, 1, 9), ri(r, 2, 9), ri(r, 1, 9), ri(r, 2, 9)]; return { q: `Calculá ${a}/${b} − ${c}/${d}.`, a: frac(a * d - c * b, b * d) }; },
    (r) => { const [a, b, c, d] = [ri(r, 1, 9), ri(r, 2, 9), ri(r, 1, 9), ri(r, 2, 9)]; return { q: `Calculá ${a}/${b} · ${c}/${d}.`, a: frac(a * c, b * d) }; },
    (r) => { const [a, b, c, d] = [ri(r, 1, 9), ri(r, 2, 9), ri(r, 1, 9), ri(r, 2, 9)]; return { q: `Calculá ${a}/${b} ÷ ${c}/${d}.`, a: frac(a * d, b * c) }; },
    (r) => { const g = ri(r, 2, 12), p = ri(r, 1, 9); let q = ri(r, 2, 11); while (gcd(p, q) !== 1) q++; return { q: `Simplificá ${g * p}/${g * q}.`, a: frac(p, q) }; },
  ],
  5: [
    (r) => { const a = ri(r, 101, 999), b = ri(r, 11, 999); return { q: `Calculá ${fmt(a / 100)} + ${fmt(b / 100)}.`, a: fmt((a + b) / 100) }; },
    (r) => { const a = ri(r, 11, 99), b = ri(r, 2, 9); return { q: `Calculá ${fmt(a / 10)} × ${b}.`, a: fmt((a * b) / 10) }; },
    (r) => { const [p, q] = pick(r, [[3, 8], [1, 4], [7, 20], [3, 5], [9, 25], [5, 8], [1, 16], [7, 4]] as const); return { q: `Pasá ${p}/${q} a decimal.`, a: fmt(p / q) }; },
    (r) => { const [x, f] = pick(r, [[0.75, '3/4'], [0.4, '2/5'], [0.125, '1/8'], [0.35, '7/20'], [1.5, '3/2'], [0.06, '3/50']] as const); return { q: `Pasá ${fmt(x)} a fracción irreducible.`, a: f }; },
    (r) => { const [x, f] = pick(r, [['0,333…', '1/3'], ['0,666…', '2/3'], ['0,1212…', '4/33'], ['0,777…', '7/9'], ['0,4545…', '5/11']] as const); return { q: `Pasá el periódico ${x} a fracción.`, a: f }; },
  ],
  6: [
    (r) => { const a = ri(r, 1, 5), b = ri(r, 1, 4); return { q: `Calculá 2${sup(a)} · 2${sup(b)}.`, a: fmt(2 ** (a + b)) }; },
    (r) => { const b = pick(r, [2, 3] as const), m = ri(r, 1, 2), n = ri(r, 2, 3); return { q: `Calculá (${b}${sup(m)})${sup(n)}.`, a: fmt(b ** (m * n)) }; },
    (r) => { const b = pick(r, [2, 4, 5, 10] as const), n = ri(r, 1, 3); return { q: `Calculá ${b}${sup(-n)} como fracción.`, a: `1/${b ** n}`, alts: [fmt(1 / b ** n)] }; },
    (r) => { const k = ri(r, 2, 6), m = pick(r, [2, 3, 5, 6, 7] as const); return { q: `Simplificá √${k * k * m}.`, a: `${k}√${m}` }; },
    (r) => { const n = ri(r, 2, 6); return { q: `Calculá ∛${n ** 3}.`, a: fmt(n) }; },
  ],
  7: [
    (r) => { const m = ri(r, 11, 99) / 10, e = ri(r, 3, 7); return { q: `Escribí ${Math.round(m * 10 ** e)} en notación científica.`, a: `${fmt(m)} × 10^${e}` }; },
    (r) => { const m = ri(r, 11, 99) / 10, e = ri(r, 2, 5); return { q: `Escribí ${fmt(+(m / 10 ** e).toFixed(e + 1))} en notación científica.`, a: `${fmt(m)} × 10^${fmt(-e)}` }; },
    (r) => { const b = pick(r, [2, 3, 5, 10] as const), k = ri(r, 2, b === 2 ? 6 : 4); return { q: `Calculá log${b === 10 ? '' : `_${b}`} ${b ** k}.`, a: fmt(k) }; },
    (r) => { const i = ri(r, 1, 3), j = ri(r, 1, 3); return { q: `Calculá log₂ ${2 ** i} + log₂ ${2 ** j}.`, a: fmt(i + j) }; },
    (r) => { const a = ri(r, 2, 4), b = ri(r, 1, 2), e = ri(r, 2, 4), f = ri(r, 2, 5); return { q: `Calculá (${a} × 10^${e}) · (${b} × 10^${f}).`, a: `${fmt(a * b)} × 10^${e + f}` }; },
  ],
  8: [
    (r) => { const a = ri(r, 2, 6), u = ri(r, 3, 12) * 10, b = ri(r, 3, 12); return { q: `Si ${a} cuadernos cuestan $${a * u}, ¿cuánto cuestan ${b}?`, a: fmt(b * u) }; },
    (r) => { const w = pick(r, [4, 6, 8, 12] as const), d = pick(r, [6, 9, 12, 15] as const), w2 = pick(r, [2, 3, 4, 6] as const); return { q: `${w} obreros hacen una obra en ${d} días. ¿Cuántos días tardan ${w2}?`, a: fmt((w * d) / w2) }; },
    (r) => { const x = pick(r, [5, 10, 15, 20, 25, 30, 40, 75] as const), n = ri(r, 2, 20) * 20; return { q: `¿Cuánto es el ${x} % de ${n}?`, a: fmt((x * n) / 100) }; },
    (r) => { const c = ri(r, 2, 20) * 1000, t = ri(r, 1, 4), p = pick(r, [5, 8, 10, 12] as const); return { q: `$${c} al ${p} % anual durante ${t} años. ¿Cuánto interés simple dan?`, a: fmt((c * p * t) / 100) }; },
    (r) => { const a = ri(r, 1, 9), b = ri(r, 2, 9), k = ri(r, 2, 6); return { q: `Hallá x: ${a}/${b} = x/${b * k}.`, a: fmt(a * k) }; },
  ],
  9: [
    (r) => { const n = ri(r, 9, 63); return { q: `Pasá ${n} a binario.`, a: n.toString(2), cmp: 'txt' }; },
    (r) => { const n = ri(r, 9, 63); return { q: `Pasá ${n.toString(2)}₂ a decimal.`, a: fmt(n) }; },
    (r) => { const n = ri(r, 30, 255); return { q: `Pasá ${n} a hexadecimal.`, a: n.toString(16).toUpperCase(), cmp: 'txt' }; },
    (r) => { const n = ri(r, 30, 255); return { q: `Pasá ${n.toString(16).toUpperCase()}₁₆ a decimal.`, a: fmt(n) }; },
    (r) => { const n = ri(r, 9, 99); return { q: `Pasá ${n} a octal.`, a: n.toString(8), cmp: 'txt' }; },
    (r) => { const a = ri(r, 5, 31), b = ri(r, 5, 31); return { q: `Sumá en base 2: ${a.toString(2)} + ${b.toString(2)}.`, a: (a + b).toString(2), cmp: 'txt' }; },
  ],
  10: [
    (r) => { const x = ri(r, 11, 99) / 10; return { q: `Pasá ${fmt(x)} km a metros.`, a: fmt(x * 1000) }; },
    (r) => { const g = ri(r, 120, 9800); return { q: `Pasá ${g} g a kilogramos.`, a: fmt(g / 1000) }; },
    (r) => { const x = ri(r, 2, 9); return { q: `Pasá ${x} m² a cm².`, a: fmt(x * 10000) }; },
    (r) => { const x = ri(r, 2, 40) / 2; return { q: `Pasá ${fmt(x)} m³ a litros.`, a: fmt(x * 1000) }; },
    (r) => { const x = ri(r, 150, 980); return { q: `Pasá ${x} cm a metros.`, a: fmt(x / 100) }; },
    (r) => { const x = ri(r, 2, 9) * 250; return { q: `Pasá ${x} mL a litros.`, a: fmt(x / 1000) }; },
  ],
  11: [
    (r) => { const n = ri(r, 2, 6), p = ri(r, 3, 15) * 10; const q = Math.ceil((n * p) / 1000) * 1000; return { q: `Comprás ${n} cuadernos a $${p} cada uno y pagás con $${q}. ¿Cuánto vuelto te dan?`, a: fmt(q - n * p) }; },
    (r) => { const v = ri(r, 4, 12) * 10, t = ri(r, 2, 5); return { q: `Un auto recorre ${v * t} km en ${t} h. ¿A qué velocidad va, en km/h?`, a: fmt(v) }; },
    (r) => { const a = ri(r, 1, 4), b = ri(r, 2, 5), k = ri(r, 2, 9) * 100; return { q: `Repartí $${k * (a + b)} en partes proporcionales a ${a} y ${b}. ¿Cuánto recibe la primera?`, a: fmt(k * a) }; },
    (r) => { const b = ri(r, 5, 15), x = ri(r, 2, 12); return { q: `Ana tiene ${2 * b + x} años y su hija ${b}. ¿En cuántos años Ana tendrá el doble que su hija?`, a: fmt(x) }; },
    (r) => {
      const m = ri(r, 6, 8);
      const xs = [ri(r, m - 2, m + 2), ri(r, m - 2, m + 2), ri(r, m - 2, m + 2)];
      const d = Math.min(10, Math.max(1, 4 * m - xs[0] - xs[1] - xs[2]));
      xs[2] = 4 * m - xs[0] - xs[1] - d;
      return { q: `Sacaste ${xs.join(', ')} en tres pruebas. ¿Cuánto necesitás en la cuarta para promediar ${m}?`, a: fmt(d) };
    },
  ],
};

/** Qué practica cada plantilla, en el mismo orden que CAPS. */
export const TEMAS: Record<number, string[]> = {
  1: ['Valor absoluto de una resta', 'Clasificar números', 'Orden en la recta', 'Valor absoluto', 'Opuesto'],
  2: ['Signos de agrupación', 'Ley de signos', 'Signos de agrupación', 'Signos de agrupación con resta', 'División de enteros'],
  3: ['Descomponer en primos', 'MCD', 'MCM', 'Criterios de divisibilidad', 'Cantidad de divisores', 'MCM en problemas', 'Números primos'],
  4: ['Suma de fracciones', 'Resta de fracciones', 'Producto de fracciones', 'División de fracciones', 'Simplificar fracciones'],
  5: ['Suma de decimales', 'Producto de decimales', 'Fracción a decimal', 'Decimal a fracción', 'Decimales periódicos'],
  6: ['Leyes de exponentes', 'Potencia de una potencia', 'Exponente negativo', 'Simplificar raíces', 'Raíz cúbica'],
  7: ['Notación científica', 'Notación científica', 'Logaritmos', 'Propiedades de logaritmos', 'Operar en notación científica'],
  8: ['Regla de tres directa', 'Regla de tres inversa', 'Porcentajes', 'Interés simple', 'Proporciones'],
  9: ['Decimal a binario', 'Binario a decimal', 'Decimal a hexadecimal', 'Hexadecimal a decimal', 'Decimal a octal', 'Suma en base 2'],
  10: ['Longitud', 'Masa', 'Superficie', 'Volumen y capacidad', 'Longitud', 'Capacidad'],
  11: ['Problemas de dinero', 'Velocidad', 'Repartos proporcionales', 'Edades', 'Promedios'],
};

/** Los ejercicios de un capítulo: se van alternando las plantillas para cubrir todo el tema. */
export function chapterExercises(cap: number, count: number, seed: string): Exercise[] {
  const gens = CAPS[cap];
  if (!gens) return [];
  const r = rngFrom(seed);
  const order = gens.map((_, i) => i).sort(() => r() - 0.5);
  return Array.from({ length: count }, (_, i) => {
    const k = order[i % gens.length];
    return { cap, tema: TEMAS[cap]?.[k], ...gens[k](r) };
  });
}

/** Hay banco de ejercicios para esta actividad (CONAMAT · Aritmética). */
export const hasBank = (activityId: string) => activityId === 'conamat';

/**
 * El test completo: los nuevos del capítulo y, desde el cap. 2, `prev` de los anteriores.
 * `attempt` cambia la semilla: el re-test trae ejercicios distintos.
 */
export function testExercises(activityId: string, cap: number, nuevos: number, prev: number, attempt = 0): Exercise[] {
  if (!hasBank(activityId)) return [];
  const seed = `${activityId}:${cap}:${attempt}`;
  const own = chapterExercises(cap, nuevos, seed);
  const r = rngFrom(`${seed}:prev`);
  const old = Array.from({ length: cap > 1 ? prev : 0 }, (_, i) => {
    const c = ri(r, 1, cap - 1);
    return chapterExercises(c, 1, `${seed}:prev:${i}`)[0];
  });
  return [...own, ...old];
}

// ——— Corrección ———

const SUPS = '⁰¹²³⁴⁵⁶⁷⁸⁹';
const norm = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/⁻/g, '^-')
    .replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]+/g, (m) => '^' + m.split('').map((c) => SUPS.indexOf(c)).join(''))
    .replace(/[−–—]/g, '-')
    .replace(/\^\^/g, '^');

const nums = (s: string) =>
  (norm(s).match(/-?\d+(?:[.,]\d+)*/g) ?? []).map((t) => {
    const neg = t.startsWith('-');
    const u = neg ? t.slice(1) : t;
    // 1.260 o 12.500.000: puntos de miles.
    const v = /^[1-9]\d{0,2}(\.\d{3})+$/.test(u) ? Number(u.replace(/\./g, '')) : Number(u.replace(',', '.').replace(/,/g, ''));
    return neg ? -v : v;
  });

const txt = (s: string) => norm(s).replace(/[^a-z0-9ñ]/g, '');

const sameNums = (a: number[], b: number[]) => a.length === b.length && a.every((x, i) => Math.abs(x - b[i]) < 1e-6 * Math.max(1, Math.abs(b[i])));

/** ¿Lo que cargaste coincide con la respuesta? Vacío cuenta como sin cargar (null). */
export function checkAnswer(given: string, ex: Exercise): boolean | null {
  if (!given.trim()) return null;
  return [ex.a, ...(ex.alts ?? [])].some((ok) =>
    ex.cmp === 'txt' ? txt(given) === txt(ok) : sameNums(nums(given), nums(ok)) && nums(ok).length > 0,
  );
}
