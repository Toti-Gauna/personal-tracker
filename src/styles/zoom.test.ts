import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const DIR = __dirname;
const css = readdirSync(DIR).filter((f) => f.endsWith('.css')).map((f) => [f, readFileSync(join(DIR, f), 'utf8')] as const);

/** Reglas "selector { declaraciones }" de un CSS plano (sin anidar), sin comentarios. */
const reglas = (src: string) => [...src.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((m) => ({ sel: m[1].trim(), dec: m[2] }));

describe('ola 18: sin zoom al escribir en el teléfono', () => {
  it('ningún campo (input, textarea, select, .campo-texto, .celda input) baja de 16 px', () => {
    const malos: string[] = [];
    for (const [f, src] of css) {
      for (const r of reglas(src)) {
        if (!/\b(input|textarea|select)\b|campo-texto/.test(r.sel)) continue;
        const px = /(?:^|[;\s])font-size:\s*([\d.]+)px/.exec(r.dec);
        if (px && Number(px[1]) < 16) malos.push(`${f}: ${r.sel} → ${px[1]} px`);
      }
    }
    expect(malos).toEqual([]);
  });

  it('hay una regla base de 16 px para los campos y el viewport no bloquea el pellizco', () => {
    const global = css.find(([f]) => f === 'global.css')![1];
    expect(global).toMatch(/input,\s*textarea,\s*select\s*\{\s*font-size:\s*16px/);
    const html = readFileSync(join(DIR, '../../index.html'), 'utf8');
    expect(html).toMatch(/name="viewport"/);
    expect(html).not.toMatch(/maximum-scale|user-scalable\s*=\s*no/);
  });
});
