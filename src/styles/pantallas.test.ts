import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const css = (f: string) => readFileSync(join(__dirname, f), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
const regla = (src: string, sel: string) => new RegExp(`(?:^|\\})\\s*${sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\{([^}]*)\\}`, 'm').exec(src)?.[1] ?? '';

describe('ola 22 · Hoy (§3 bis)', () => {
  const hoy = css('hoy.css');
  it('el título largo de una meta pasa a dos líneas antes de cortarse, y la hora no baja de línea', () => {
    const t = regla(hoy, '.meta-nombre');
    expect(t).toMatch(/-webkit-line-clamp:\s*2/);
    expect(t).not.toMatch(/white-space:\s*nowrap/);
    expect(regla(hoy, '.meta-hora')).toMatch(/white-space:\s*nowrap/);
    expect(regla(hoy, '.meta-hora')).toMatch(/flex:\s*none/);
  });

  it('"Mejora de hoy" no se parte en dos líneas', () => {
    expect(regla(hoy, '.mejora b')).toMatch(/white-space:\s*nowrap/);
  });
});
