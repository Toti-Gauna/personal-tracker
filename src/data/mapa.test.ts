import { describe, expect, it } from 'vitest';
import { filasMapa } from './mapa';
import { emptyPlan } from './plan-state';
import { emptyStudy } from './study-catalog';

describe('mapa en ramas', () => {
  it('arriba T+18, abajo T+0 y HEAD en hoy; lo que viene después de HEAD es futuro', () => {
    const f = filasMapa('2026-12-14', 'mes', emptyPlan(), emptyStudy());
    expect(f[0]).toMatchObject({ hito: 'T+18', fecha: '2028-05-14' });
    expect(f[f.length - 1]).toMatchObject({ hito: 'T+0', fecha: '2026-11-16' });
    const head = f.findIndex((x) => x.tipo === 'head');
    expect(f[head].texto).toBe('Faro v1 · semana 3 de 4');
    expect(f.slice(1, head).every((x) => x.futuro || x.tipo === 'gap')).toBe(true);
    expect(f.slice(head + 1).every((x) => !x.futuro)).toBe(true);
    // Este mes incluye T+2 (11 ene) y la entrega de Faro v1 (27 dic).
    expect(f.some((x) => x.hito === 'T+2')).toBe(true);
    expect(f.some((x) => x.a === 'trabajo' && x.fecha === '2026-12-27')).toBe(true);
    // Ordenadas de la más nueva a la más vieja.
    const fechas = f.filter((x) => x.tipo !== 'gap').map((x) => x.fecha);
    expect([...fechas].sort().reverse()).toEqual(fechas);
  });

  it('18 meses: los proyectos, las certificaciones y las ventanas', () => {
    const f = filasMapa('2026-12-14', 'todo', emptyPlan(), emptyStudy());
    const ids = f.map((x) => x.id);
    for (const id of ['fin-P1', 'fin-P10', 'fin-C1', 'fin-C2', 'fin-C3', 'fin-W1', 'fin-W2', 'fin-W3']) expect(ids).toContain(id);
    expect(ids.filter((x) => x.startsWith('fin-P'))).toHaveLength(11);
    expect(f.some((x) => x.tipo === 'gap')).toBe(false);
  });
});
