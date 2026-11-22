import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { contraste } from './color';
import { ESTADOS, GLOSARIO, PRESUPUESTO, contarPalabras } from './reglas';

const css = readFileSync('src/v2/tokens.css', 'utf8');
/** Los tokens hex de un bloque del archivo (el oscuro o el claro). */
function tema(selector: string): Record<string, string> {
  const i = css.indexOf(selector);
  const bloque = css.slice(css.indexOf('{', i) + 1, css.indexOf('\n}', i));
  return Object.fromEntries([...bloque.matchAll(/(--[\w-]+):\s*(#[0-9a-fA-F]{6})\b/g)].map((m) => [m[1], m[2]]));
}
const TEMAS = { oscuro: tema("html[data-ui='v2'][data-theme='dark']"), claro: tema("html[data-ui='v2'][data-theme='light']") };
const CAPAS = ['--capa-0', '--capa-1', '--capa-2', '--capa-3'];
const AREAS = ['--a-ing', '--a-handyx', '--a-eclipse', '--a-salud', '--a-rutina', '--a-economia', '--a-idi'];

/** Distancia entre dos colores en OKLab: por debajo de ~0,05 se confunden. */
function distancia(a: string, b: string) {
  const lab = (hex: string) => {
    const [r, g, bl] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
    const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * bl);
    const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * bl);
    const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * bl);
    return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s];
  };
  const [x, y] = [lab(a), lab(b)];
  return Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]);
}

describe.each(Object.entries(TEMAS))('tokens 2.0 · tema %s', (_, t) => {
  it('define las mismas piezas en los dos temas', () => {
    for (const k of [...CAPAS, ...AREAS, '--texto', '--texto-2', '--texto-3', '--trazo', '--trazo-texto', '--sobre-trazo', '--e-critico', '--sobre-critico']) expect(t[k], k).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it('el texto se lee sobre cualquier capa: principal AAA, secundario AA, tenue 3:1', () => {
    for (const c of CAPAS) {
      expect(contraste(t['--texto'], t[c]), `texto / ${c}`).toBeGreaterThanOrEqual(7);
      expect(contraste(t['--texto-2'], t[c]), `texto-2 / ${c}`).toBeGreaterThanOrEqual(4.5);
      expect(contraste(t['--texto-3'], t[c]), `texto-3 / ${c}`).toBeGreaterThanOrEqual(3);
    }
  });

  it('los colores de área y el de la marca sirven como texto (AA) sobre las capas', () => {
    for (const a of [...AREAS, '--trazo-texto', '--e-critico']) for (const c of CAPAS) expect(contraste(t[a], t[c]), `${a} / ${c}`).toBeGreaterThanOrEqual(4.5);
  });

  it('lo que va escrito encima del trazo y del rojo se lee', () => {
    expect(contraste(t['--sobre-trazo'], t['--trazo'])).toBeGreaterThanOrEqual(7);
    expect(contraste(t['--sobre-critico'], t['--e-critico'])).toBeGreaterThanOrEqual(4.5);
    // "Atrasado": píldora llena del color del texto, con la mesa como tinta.
    expect(contraste(t['--capa-0'], t['--texto'])).toBeGreaterThanOrEqual(7);
  });

  it('ningún área se confunde con otra, ni con el rojo de "vencido", ni con la marca', () => {
    const todos = [...AREAS, '--e-critico', '--trazo'];
    for (let i = 0; i < todos.length; i++) for (let j = i + 1; j < todos.length; j++) expect(distancia(t[todos[i]], t[todos[j]]), `${todos[i]} vs ${todos[j]}`).toBeGreaterThanOrEqual(0.07);
  });
});

describe('tokens 2.0 · el sistema', () => {
  it('8 tamaños de letra, 3 radios y espacio de a 4', () => {
    expect([...css.matchAll(/--t-(\d+):\s*(\d+)px/g)].map((m) => Number(m[2]))).toEqual([11, 13, 15, 17, 20, 24, 32, 44]);
    expect([...css.matchAll(/--r-[sml]:\s*(\d+)px/g)].map((m) => Number(m[1]))).toEqual([8, 14, 22]);
    for (const m of css.matchAll(/--sp-\d:\s*(\d+)px/g)) expect(Number(m[1]) % 4).toBe(0);
  });

  it('todo cuelga de la 2.0: la 1.0 no recibe ni un token', () => {
    for (const sel of css.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/(^|\})\s*([^{}@]+)\{/g)) for (const s of sel[2].split(',')) expect(s.trim(), s).toMatch(/^html\[data-ui='v2'\]/);
  });
});

describe('reglas de escritura 2.0', () => {
  it('cada estado se dice con ícono y palabra; el rojo es solo de "vencido" y el trazo solo de "hecho"', () => {
    const xs = Object.entries(ESTADOS);
    expect(xs).toHaveLength(7);
    for (const [, e] of xs) { expect(e.palabra).toBeTruthy(); expect(e.icono).toBeTruthy(); }
    expect(xs.filter(([, e]) => e.tono === 'critico').map(([k]) => k)).toEqual(['vencido']);
    expect(xs.filter(([, e]) => e.tono === 'hecho').map(([k]) => k)).toEqual(['hecho']);
  });

  it('el presupuesto: 3 palabras de título, 12 de intro, 60 antes de desplazar', () => {
    expect(PRESUPUESTO).toMatchObject({ titulo: 3, intro: 12, pliegue: 60, boton: 3, pantallas: 4 });
    expect(contarPalabras('  Tu plan,  de la etapa al lote. ')).toBe(7);
  });

  it('el glosario explica cada término en una o dos frases cortas', () => {
    for (const g of GLOSARIO) { expect(contarPalabras(g.ahora), g.ahora).toBeLessThanOrEqual(6); expect(contarPalabras(g.explica), g.antes).toBeLessThanOrEqual(30); }
  });
});
