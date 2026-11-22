/**
 * Trazo 2.0 · la portada de un proyecto: un dibujo generado a partir de su id, siempre el mismo para el mismo proyecto y
 * distinto entre proyectos. Cuatro motivos (órbitas, malla, ondas e isobandas) en un lienzo de 400 × 200 que se recorta al
 * tamaño de la tarjeta. Puro: la pieza `Portada` solo lo dibuja con el color del área.
 */
export type Motivo = 'orbitas' | 'malla' | 'ondas' | 'isobandas';
export const MOTIVOS: Motivo[] = ['orbitas', 'malla', 'ondas', 'isobandas'];
export const ANCHO = 400;
export const ALTO = 200;
const TAU = Math.PI * 2;

export interface Trazo { d: string; w: number; o: number }
export interface Punto { x: number; y: number; r: number; o: number }
export interface Arte { motivo: Motivo; trazos: Trazo[]; puntos: Punto[] }

/** Un número de 32 bits a partir de un texto (FNV-1a). */
export function semilla(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) { h ^= id.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

/** Azar con semilla (mulberry32): entre 0 y 1. */
function azar(s: number) {
  let a = s >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const r1 = (x: number) => Math.round(x * 10) / 10;
const pt = (x: number, y: number) => `${r1(x)} ${r1(y)}`;

/** Una curva cerrada y suave por unos puntos (cuadráticas entre los puntos medios). */
function cerrada(ps: [number, number][]): string {
  const n = ps.length;
  const medio = (a: [number, number], b: [number, number]): [number, number] => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const m0 = medio(ps[n - 1], ps[0]);
  let d = `M${pt(...m0)}`;
  for (let i = 0; i < n; i++) { const m = medio(ps[i], ps[(i + 1) % n]); d += `Q${pt(...ps[i])} ${pt(...m)}`; }
  return `${d}Z`;
}

function orbitas(a: () => number): Pick<Arte, 'trazos' | 'puntos'> {
  const cx = 220 + a() * 100, cy = 70 + a() * 60, rot = (a() - 0.5) * 26, n = 6 + Math.floor(a() * 3), k = 0.36 + a() * 0.14;
  const c = Math.cos((rot * Math.PI) / 180), s = Math.sin((rot * Math.PI) / 180);
  const en = (rx: number, ry: number, t: number): [number, number] => [cx + rx * Math.cos(t) * c - ry * Math.sin(t) * s, cy + rx * Math.cos(t) * s + ry * Math.sin(t) * c];
  const trazos: Trazo[] = [], puntos: Punto[] = [];
  for (let i = 0; i < n; i++) {
    const rx = 26 + i * (30 + a() * 6), ry = rx * k;
    const [x1, y1] = en(rx, ry, Math.PI), [x2, y2] = en(rx, ry, 0);
    trazos.push({ d: `M${pt(x1, y1)}A${r1(rx)} ${r1(ry)} ${r1(rot)} 1 0 ${pt(x2, y2)}A${r1(rx)} ${r1(ry)} ${r1(rot)} 1 0 ${pt(x1, y1)}`, w: i % 3 === 0 ? 1.6 : 1, o: r1(0.2 + 0.55 * (1 - i / n)) });
    for (let j = 0, m = a() < 0.6 ? 2 : 1; j < m; j++) { const [x, y] = en(rx, ry, a() * TAU); puntos.push({ x: r1(x), y: r1(y), r: r1(2 + a() * 3), o: 0.9 }); }
  }
  puntos.push({ x: r1(cx), y: r1(cy), r: 5, o: 1 });
  return { trazos, puntos };
}

function malla(a: () => number): Pick<Arte, 'trazos' | 'puntos'> {
  const filas = 7, cols = 13, dx = 34, dy = 22, sesgo = 9, ox = -20 + a() * 20, oy = 24, fase = a() * TAU;
  const nodo = (r: number, c: number): [number, number] => [ox + c * dx + r * sesgo, oy + r * dy + Math.sin(c * 0.5 + fase) * 6 * (r / filas)];
  const trazos: Trazo[] = [], puntos: Punto[] = [];
  for (let r = 0; r < filas; r++) trazos.push({ d: Array.from({ length: cols }, (_, c) => `${c ? 'L' : 'M'}${pt(...nodo(r, c))}`).join(''), w: 0.8, o: r1(0.12 + 0.03 * r) });
  for (let c = 0; c < cols; c += 2) trazos.push({ d: Array.from({ length: filas }, (_, r) => `${r ? 'L' : 'M'}${pt(...nodo(r, c))}`).join(''), w: 0.8, o: 0.12 });
  for (let r = 0; r < filas; r++) for (let c = 0; c < cols; c++) { const [x, y] = nodo(r, c); puntos.push({ x: r1(x), y: r1(y), r: 1.4, o: 0.35 }); }
  // El camino que se destaca: una caminata de 7 nodos de izquierda a derecha.
  let r = Math.floor(a() * filas), c = 1 + Math.floor(a() * 2);
  const camino: [number, number][] = [nodo(r, c)];
  for (let i = 0; i < 6; i++) { c += 1 + Math.floor(a() * 2); r = Math.max(0, Math.min(filas - 1, r + Math.floor(a() * 3) - 1)); camino.push(nodo(r, Math.min(cols - 1, c))); }
  trazos.push({ d: camino.map((p, i) => `${i ? 'L' : 'M'}${pt(...p)}`).join(''), w: 1.8, o: 0.9 });
  for (const [x, y] of camino) puntos.push({ x: r1(x), y: r1(y), r: r1(3 + a() * 2), o: 1 });
  return { trazos, puntos };
}

function ondas(a: () => number): Pick<Arte, 'trazos' | 'puntos'> {
  const trazos: Trazo[] = [], puntos: Punto[] = [];
  const n = 6, f0 = 0.012 + a() * 0.012;
  for (let i = 0; i < n; i++) {
    const y0 = 34 + i * 26, A = 8 + a() * 16, f = f0 * (0.8 + a() * 0.5), ph = a() * TAU;
    let d = '';
    for (let x = -20, k = 0; x <= 420; x += 10, k++) d += `${k ? 'L' : 'M'}${pt(x, y0 + A * Math.sin(ph + x * f))}`;
    trazos.push({ d, w: i === 3 ? 1.8 : 1.1, o: r1(0.16 + i * 0.12) });
    if (i === 3) for (let j = 0; j < 3; j++) { const x = 60 + a() * 280; puntos.push({ x: r1(x), y: r1(y0 + A * Math.sin(ph + x * f)), r: r1(2.5 + a() * 2.5), o: 1 }); }
  }
  return { trazos, puntos };
}

function isobandas(a: () => number): Pick<Arte, 'trazos' | 'puntos'> {
  const cx = 200 + (a() - 0.5) * 120, cy = 96 + (a() - 0.5) * 30, p1 = a() * TAU, p2 = a() * TAU, p3 = a() * TAU;
  const trazos: Trazo[] = [], puntos: Punto[] = [];
  for (let k = 0; k < 7; k++) {
    const base = 14 + k * 19;
    const ps: [number, number][] = Array.from({ length: 28 }, (_, j) => {
      const t = (j / 28) * TAU;
      const r = base * (1 + 0.18 * Math.sin(2 * t + p1 + k * 0.3) + 0.1 * Math.sin(3 * t + p2) + 0.06 * Math.sin(5 * t + p3));
      return [cx + r * 1.7 * Math.cos(t), cy + r * 0.95 * Math.sin(t)];
    });
    trazos.push({ d: cerrada(ps), w: k === 3 ? 1.8 : 1, o: r1(0.65 - k * 0.07) });
  }
  for (let j = 0; j < 4; j++) puntos.push({ x: r1(cx + (a() - 0.5) * 220), y: r1(cy + (a() - 0.5) * 120), r: r1(2 + a() * 3), o: 0.95 });
  return { trazos, puntos };
}

/** El motivo que le toca a cada tipo de bloque (las certificaciones, malla; la matemática, isobandas…); los proyectos, por su id. */
export function motivoDe(id: string, tipo?: string): Motivo {
  if (tipo === 'cert') return 'malla';
  if (tipo === 'ventana') return 'isobandas';
  if (tipo === 'ingles' || tipo === 'busqueda') return 'ondas';
  return MOTIVOS[semilla(id) % MOTIVOS.length];
}

export function portada(id: string, tipo?: string): Arte {
  const motivo = motivoDe(id, tipo);
  const a = azar(semilla(`${id}:${motivo}`));
  const h = { orbitas, malla, ondas, isobandas }[motivo](a);
  return { motivo, ...h };
}
