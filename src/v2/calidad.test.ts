/**
 * Trazo 2.0 · el lint de la capa nueva (tanda 1.8). Lee los CSS de src/v2 y se queja de lo que rompe el lenguaje:
 * colores crudos fuera de tokens.css, tamaños de letra fuera de la escala, y selectores de elementos sueltos que
 * caerían sobre la 1.0 (todo tiene que colgar de html[data-ui='v2'], .v2 o una clase de la 2.0).
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const RAIZ = 'src/v2';
const EXENTOS = new Set(['tokens.css']); // la única hoja que define colores y tamaños.

function css(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) return css(p);
    return n.endsWith('.css') && !EXENTOS.has(n) ? [p] : [];
  });
}

/** El CSS sin comentarios, línea por línea, con el número de línea original. */
function lineas(path: string) {
  const sin = readFileSync(path, 'utf8').replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));
  return sin.split('\n').map((texto, i) => ({ n: i + 1, texto }));
}

const ARCHIVOS = css(RAIZ);

describe('2.0 · lint de los estilos', () => {
  it('hay hojas que revisar', () => {
    expect(ARCHIVOS.length).toBeGreaterThanOrEqual(6);
  });

  it('ningún color crudo fuera de tokens.css (todo sale de un token)', () => {
    const malos = ARCHIVOS.flatMap((f) => lineas(f).filter((l) => /#[0-9a-fA-F]{3,8}\b/.test(l.texto)).map((l) => `${f}:${l.n}`));
    expect(malos).toEqual([]);
  });

  it('ningún tamaño de letra fuera de la escala (font-size o el tamaño de un shorthand "font: … 12px/…")', () => {
    const tamano = /(font-size:\s*[\d.]+px)|(font:[^;]*?\s[\d.]+px\/)/;
    const malos = ARCHIVOS.flatMap((f) => lineas(f).filter((l) => tamano.test(l.texto)).map((l) => `${f}:${l.n}`));
    expect(malos).toEqual([]);
  });

  it('todo selector cuelga de la 2.0 (no pisa elementos sueltos de la 1.0)', () => {
    const suelto = /^\s*(html|body|main|nav|ul|li|a|h1|h2|h3|p|button|input|textarea|section|header|footer|span|svg|img)\b\s*[,{:.#\[]/;
    const malos: string[] = [];
    for (const f of ARCHIVOS) for (const l of lineas(f)) {
      if (!/\{/.test(l.texto) || /^\s*@/.test(l.texto)) continue;
      const selector = l.texto.split('{')[0];
      if (suelto.test(selector) && !/data-ui/.test(selector)) malos.push(`${f}:${l.n}  ${selector.trim()}`);
    }
    expect(malos).toEqual([]);
  });
});
