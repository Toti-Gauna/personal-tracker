import { render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { getState, register, resetState, startDay } from '../state/store';
import { Metas } from './Metas';

const D = '2026-11-21';
beforeEach(() => {
  localStorage.clear();
  resetState();
  register('Toti', 'Abi', '2026-11-16');
  startDay('completo', '04:00', D);
});

describe('pantalla de diferencia contra el plan v12.1', () => {
  it('muestra cuándo termina el plan, lo que no cierra con la cuenta y cada etapa con sus bloques', () => {
    render(<Metas day={getState().days[D]} tab="diferencia" />);
    expect(screen.getByRole('heading', { name: 'Diferencia contra el roadmap' })).toBeInTheDocument();
    expect(screen.getByText('27 oct 2028')).toBeInTheDocument();
    expect(screen.getByText(/El roadmap estima el 27 oct 2028/).textContent).toMatch(/en fecha/);
    expect(screen.getByText(/Multiplatform week: en sus fechas del roadmap entran 32 h y el bloque pide 25/)).toBeInTheDocument();
    expect(screen.getByText(/25 h \/ 3 días = 8,3 h por día/)).toBeInTheDocument();
    // v12.1: las ventanas de matemática tienen la misma capacidad (10/11 h por día): no faltan horas.
    expect(screen.queryByText(/W1 · Math W1: el bloque pide/)).toBeNull();
    // Las cuatro etapas, plegadas (la matemática diaria m1–m4 está archivada).
    const titulos = [...document.querySelectorAll('details.plegable summary b')].map((b) => b.textContent);
    expect(titulos).toEqual(['Etapa 1 · Núcleo', 'Etapa 2 · Ciberseguridad', 'Etapa 3 · Quant', 'Etapa 4 · Aeroespacial']);
    const e1 = [...document.querySelectorAll('details.plegable')][0] as HTMLDetailsElement;
    const petria = within(e1).getAllByText('PetrIA').map((x) => x.closest('a')!).find((x) => x.getAttribute('href') === '#/metas/proyecto/P1')!;
    expect(petria.textContent).toMatch(/en fecha.*Trazo 21 nov a 9 dic 2026 · roadmap 21 nov a 9 dic 2026/);
    expect(within(e1).getByText('Cert window 1').closest('a')!.textContent).toMatch(/42 h/);
    expect(screen.getByText(/Pausas de diciembre: 2027 \(en 2026 no hay\)/)).toBeInTheDocument();
  });

  it('las etapas enlazan a la diferencia', () => {
    render(<Metas day={getState().days[D]} tab="etapas" />);
    expect(screen.getByRole('link', { name: /Diferencia contra el plan v12.1/ })).toHaveAttribute('href', '#/metas/diferencia');
  });
});
