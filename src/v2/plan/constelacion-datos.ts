/**
 * Trazo 2.0 · la constelación del plan: dónde va cada cosa, sin dibujar nada. El plan es una espiral que sale del centro:
 * cada vuelta es una fase (todas empiezan arriba, a las doce) y cada bloque es una estrella sobre su tramo de la vuelta.
 * Es la línea de tiempo, enrollada. Puro: la escena 3D y el mapa plano dibujan lo mismo a partir de acá.
 */
import type { EstadoPeriodo, PeriodoMedido } from '../../data/periodos';
import { daysBetween } from '../../data/time';
import { partesNombre } from './datos';
import { areaDe } from './TarjetaPeriodo';

export interface Estrella {
  id: string; nombre: string;
  /** Índice de su fase (0 = la primera, la vuelta de más adentro) y de su etapa. */
  fase: number; etapa: number;
  /** Dónde está sobre la espiral, en vueltas (2,5 = a mitad de la tercera fase), y de dónde a dónde va su tramo. */
  t: number; desde: number; hasta: number;
  x: number; y: number; z: number;
  /** Radio de la estrella, según las horas planificadas. */
  tam: number;
  /** El color de su área, como variable CSS. */
  area: string;
  estado: EstadoPeriodo;
  trabajo: number;
  /** Es el bloque que corre hoy. */
  ahora: boolean;
  p: PeriodoMedido;
}
export interface Vuelta { id: string; nombre: string; corto: string; etapa: number; /** Dónde empieza (en vueltas): su índice. */ t: number; estado: EstadoPeriodo; p: PeriodoMedido }
export interface Constelacion {
  estrellas: Estrella[]; vueltas: Vuelta[];
  /** Cuántas vueltas tiene la espiral y hasta dónde llega. */
  total: number; radioMax: number;
  hechas: number;
  ahora?: Estrella;
  /** Dónde cae hoy sobre la espiral (en vueltas): 0 antes de empezar, `total` al terminar. */
  hoy: number;
  /** Hoy cae dentro del plan. */
  enCurso: boolean;
}

export const RADIO_0 = 1.6;
/** Cuánto se abre la espiral en cada vuelta, y cuánto sube (apenas: da profundidad al girarla). */
export const PASO = 0.62;
export const SUBE = 0.07;
const INICIO = -Math.PI / 2;

const r4 = (x: number) => Math.round(x * 10000) / 10000;
const entre = (x: number) => Math.max(0, Math.min(1, x));

/** El punto de la espiral a `t` vueltas del centro. Visto de arriba: x a la derecha, z hacia abajo. */
export function puntoEn(t: number) {
  const a = INICIO + Math.PI * 2 * t;
  const r = RADIO_0 + PASO * t;
  return { x: r4(r * Math.cos(a)), y: r4(SUBE * t), z: r4(r * Math.sin(a)), r, a };
}

/**
 * Dentro de una fase, los bloques cortos quedarían pegados: la vuelta se reparte mitad por fechas y mitad en partes iguales.
 * Devuelve la función que lleva una fracción del tiempo de la fase (0 a 1) a su fracción de vuelta (0 a 1), sin desordenar.
 */
export function reparto(medios: number[]): (x: number) => number {
  const n = medios.length;
  const xs = [0, ...medios, 1];
  const ys = [0, ...medios.map((_, k) => (k + 0.5) / n), 1];
  return (x) => {
    const v = entre(x);
    let k = 1;
    while (k < xs.length - 1 && xs[k] < v) k++;
    const ancho = xs[k] - xs[k - 1];
    const parejo = ancho > 0 ? ys[k - 1] + ((v - xs[k - 1]) / ancho) * (ys[k] - ys[k - 1]) : ys[k];
    return 0.5 * v + 0.5 * parejo;
  };
}

export function constelacion(arbol: PeriodoMedido[], hoy: string): Constelacion {
  const estrellas: Estrella[] = [];
  const vueltas: Vuelta[] = [];
  let hoyT: number | null = null;
  let i = 0;
  let ultimoFin = '';
  arbol.forEach((etapa, ie) => {
    for (const fase of etapa.hijos ?? []) {
      const dias = daysBetween(fase.inicio, fase.fin) + 1;
      const bloques = fase.hijos ?? [];
      const ini = (b: PeriodoMedido) => daysBetween(fase.inicio, b.inicio) / dias;
      const fin = (b: PeriodoMedido) => (daysBetween(fase.inicio, b.fin) + 1) / dias;
      const f = reparto(bloques.map((b) => (ini(b) + fin(b)) / 2));
      for (const b of bloques) {
        const t = i + f((ini(b) + fin(b)) / 2);
        const horas = b.horasPlan ?? (daysBetween(b.inicio, b.fin) + 1) * 6;
        estrellas.push({
          id: b.id, nombre: b.nombre, fase: i, etapa: ie,
          t: r4(t), desde: r4(i + f(ini(b))), hasta: r4(i + f(fin(b))),
          ...(({ x, y, z }) => ({ x, y, z }))(puntoEn(t)),
          tam: r4(0.085 + 0.12 * Math.sqrt(Math.min(1, horas / 200))),
          area: areaDe(b), estado: b.estado, trabajo: b.trabajo,
          ahora: b.inicio <= hoy && hoy <= b.fin,
          p: b,
        });
      }
      if (fase.inicio <= hoy && hoy <= fase.fin) hoyT = i + f(daysBetween(fase.inicio, hoy) / dias);
      vueltas.push({ id: fase.id, nombre: fase.nombre, corto: partesNombre(fase).prefijo.replace(/^Fase\s+/, 'F'), etapa: ie, t: i, estado: fase.estado, p: fase });
      ultimoFin = fase.fin;
      i++;
    }
  });
  return {
    estrellas, vueltas,
    total: i,
    radioMax: RADIO_0 + PASO * i,
    hechas: estrellas.filter((e) => e.estado === 'hecho').length,
    ahora: estrellas.find((e) => e.ahora),
    hoy: r4(hoyT ?? (ultimoFin && hoy > ultimoFin ? i : 0)),
    enCurso: hoyT !== null,
  };
}

/** Los puntos de un tramo de la espiral (de `desde` a `hasta` vueltas), cada `paso` de vuelta: x, y, z seguidos. */
export function tramo(desde: number, hasta: number, paso = 1 / 96): number[] {
  const n = Math.max(1, Math.ceil((hasta - desde) / paso));
  const out: number[] = [];
  for (let k = 0; k <= n; k++) {
    const p = puntoEn(desde + ((hasta - desde) * k) / n);
    out.push(p.x, p.y, p.z);
  }
  return out;
}

/** El tramo, visto de arriba, como camino SVG. */
export function caminoPlano(desde: number, hasta: number): string {
  const p = tramo(desde, hasta, 1 / 48);
  let d = '';
  for (let k = 0; k < p.length; k += 3) d += `${k ? 'L' : 'M'}${p[k].toFixed(3)} ${p[k + 2].toFixed(3)}`;
  return d;
}

/** Los colores ya resueltos (hex) que necesita la escena: salen de los tokens del tema que esté puesto. */
export interface Colores { claro: boolean; tinta: string; tinta2: string; trazo: string; critico: string; areas: Record<string, string> }

/** Lee los tokens de color de un elemento (que ya tiene el tema aplicado). */
export function leerColores(el: Element, areas: string[]): Colores {
  const cs = getComputedStyle(el);
  const v = (n: string) => cs.getPropertyValue(n).trim();
  const nombre = (a: string) => a.replace(/^var\((--[a-z0-9-]+)\)$/i, '$1');
  const mapa: Record<string, string> = {};
  for (const a of areas) mapa[a] = v(nombre(a)) || v('--texto-2');
  return { claro: document.documentElement.dataset.theme === 'light', tinta: v('--texto'), tinta2: v('--texto-2'), trazo: v('--trazo'), critico: v('--e-critico'), areas: mapa };
}
