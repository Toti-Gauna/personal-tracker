import { render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { getState, register, resetState, startDay } from '../state/store';
import { Metas } from './Metas';

const D = '2026-11-20';
beforeEach(() => {
  localStorage.clear();
  resetState();
  register('Toti', 'Abi', '2026-11-16');
  startDay('completo', '04:00', D);
});

describe('ola 29 · pantalla de diferencia contra el roadmap', () => {
  it('muestra cuándo termina el plan, lo que no cierra con la cuenta y cada etapa con sus bloques', () => {
    render(<Metas day={getState().days[D]} tab="diferencia" />);
    expect(screen.getByRole('heading', { name: 'Diferencia contra el roadmap' })).toBeInTheDocument();
    expect(screen.getByText('4 jun 2031')).toBeInTheDocument();
    expect(screen.getByText(/El roadmap estima el 27 may 2031/).textContent).toMatch(/8 días después/);
    expect(screen.getByText(/PetrIA: en sus fechas del roadmap entran 374 h y el bloque pide 304/)).toBeInTheDocument();
    expect(screen.getByText(/304 h \/ 48 días = 6,3 h por día/)).toBeInTheDocument();
    // Las cuatro etapas, plegadas, con cuándo terminan.
    const titulos = [...document.querySelectorAll('details.plegable summary b')].map((b) => b.textContent);
    expect(titulos).toEqual(['Etapa 1 · Núcleo', 'Etapa 2 · Ciberseguridad', 'Etapa 3 · Quant', 'Etapa 4 · Aeroespacial', 'Matemática diaria']);
    const e1 = [...document.querySelectorAll('details.plegable')][0] as HTMLDetailsElement;
    expect(within(e1).getByText('PetrIA').closest('a')).toHaveAttribute('href', '#/metas/proyecto/P1');
    expect(within(e1).getByText('PetrIA').closest('a')!.textContent).toMatch(/−10 d.*Trazo 19 nov a 26 dic 2026 · roadmap 19 nov a 5 ene 2027 · 304 h \(antes 122\)/);
    expect(within(e1).getByText(/certificación 1/).closest('a')!.textContent).toMatch(/7 días fijos/);
    expect(screen.getByText(/Pausas de diciembre: 2027, 2028, 2029 y 2030 \(en 2026 no hay\)/)).toBeInTheDocument();
  });

  it('las etapas enlazan a la diferencia', () => {
    render(<Metas day={getState().days[D]} tab="etapas" />);
    expect(screen.getByRole('link', { name: /Diferencia contra el roadmap v7/ })).toHaveAttribute('href', '#/metas/diferencia');
  });
});
