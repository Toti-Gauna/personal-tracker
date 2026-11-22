import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ICONOS, Icono, Ilustracion, NOMBRES_ICONO } from './iconos';
import { ESTADOS } from './reglas';

describe('2.0 · íconos', () => {
  it('son más de 50, todos en la grilla de 24 con trazo de 1,75 y sin relleno propio', () => {
    expect(NOMBRES_ICONO.length).toBeGreaterThanOrEqual(50);
    for (const n of NOMBRES_ICONO) {
      const { container, unmount } = render(<Icono nombre={n} />);
      const svg = container.querySelector('svg')!;
      expect(svg.getAttribute('viewBox'), n).toBe('0 0 24 24');
      expect(svg.getAttribute('stroke-width'), n).toBe('1.75');
      expect(svg.getAttribute('fill'), n).toBe('none');
      expect(svg.children.length, n).toBeGreaterThan(0);
      // Nada se sale de la grilla: ninguna coordenada fuera de 0–24.
      for (const el of svg.querySelectorAll('path')) for (const x of el.getAttribute('d')!.match(/-?\d+(\.\d+)?/g)!.map(Number)) expect(Math.abs(x), `${n}: ${x}`).toBeLessThanOrEqual(24);
      unmount();
    }
  });

  it('solo va con título cuando no tiene palabra al lado; si no, es decorativo', () => {
    const { container, rerender } = render(<Icono nombre="ajustes" />);
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
    rerender(<Icono nombre="ajustes" titulo="Ajustes" />);
    expect(container.querySelector('svg')).toHaveAttribute('aria-label', 'Ajustes');
    expect(container.querySelector('svg')).not.toHaveAttribute('aria-hidden');
  });

  it('una metáfora por significado: Ajustes es un engranaje (no el sol del tema) y Entreno una mancuerna', () => {
    const d = (n: keyof typeof ICONOS) => render(<Icono nombre={n} />).container.innerHTML;
    expect(d('ajustes')).not.toBe(d('sol'));
    // El engranaje es un contorno cerrado de 8 dientes (32 vértices) con su agujero; el sol, 8 rayos sueltos.
    expect(d('ajustes').match(/L/g)!.length).toBe(31);
    expect(d('ajustes')).toMatch(/z"/);
    expect(d('sol').match(/M/g)!.length).toBe(8);
    expect(d('entreno')).not.toBe(d('siguiente'));
  });

  it('cada estado tiene su ícono en el juego', () => {
    for (const e of Object.values(ESTADOS)) expect(NOMBRES_ICONO).toContain(e.icono);
  });

  it('las ilustraciones de vacío llevan un solo trazo amarillo', () => {
    for (const n of ['plan', 'datos', 'repaso'] as const) {
      const { container, unmount } = render(<Ilustracion nombre={n} />);
      expect(container.querySelectorAll('.il-trazo')).toHaveLength(1);
      unmount();
    }
  });
});
