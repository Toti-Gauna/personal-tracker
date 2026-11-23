/** Ola 18, hoy en la 2.0: ningún campo baja de 16 px (iOS hace zoom al enfocarlo) y el viewport deja pellizcar. */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const walk = (d: string): string[] => readdirSync(d).flatMap((f) => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : [p]; });
const css = walk('src/v2').filter((f) => f.endsWith('.css')).map((f) => [f, readFileSync(f, 'utf8')] as const);
const reglas = (src: string) => [...src.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((m) => ({ sel: m[1].trim(), dec: m[2] }));

describe('sin zoom al escribir en el teléfono', () => {
  it('la raíz pone los campos en --t-campo, que es 16 px', () => {
    const raiz = readFileSync('src/v2/raiz.css', 'utf8');
    expect(raiz).toMatch(/:where\(input, textarea, select\)\s*\{\s*font-size:\s*var\(--t-campo\)/);
    expect(readFileSync('src/v2/tokens.css', 'utf8')).toMatch(/--t-campo:\s*16px/);
  });

  it('ningún campo usa una letra de la escala menor a 16 px (--t-11, --t-13 o --t-15)', () => {
    const malos: string[] = [];
    for (const [f, src] of css) for (const r of reglas(src)) {
      if (!/\b(input|textarea|select)\b/.test(r.sel)) continue;
      if (/font(-size)?:[^;]*var\(--t-1[135]\)/.test(r.dec)) malos.push(`${f}: ${r.sel}`);
    }
    expect(malos).toEqual([]);
  });

  it('el viewport no bloquea el pellizco', () => {
    const html = readFileSync('index.html', 'utf8');
    expect(html).toMatch(/name="viewport"/);
    expect(html).not.toMatch(/maximum-scale|user-scalable\s*=\s*no/);
  });
});
