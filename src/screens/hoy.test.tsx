import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getState, register, resetState, startDay } from '../state/store';
import { Hoy } from './Hoy';

describe('Hoy', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 10, 11, 7, 0));
    resetState();
    register('Toti', 'Abi', '2026-11-08');
    startDay('completo', '04:00', '2026-11-11');
  });
  afterEach(() => vi.useRealTimers());

  it('cada fila: checkbox · número · título · hora · contador, con la hora a la derecha del título', () => {
    render(<Hoy day={getState().days['2026-11-11']} />);
    const filas = screen.getAllByRole('button', { expanded: false }).concat(screen.getAllByRole('button', { expanded: true }));
    // v12.1: rutina de la mañana + 12 metas (bloques, cierre de hábitos, entreno y descanso) + dormir a las 21:00.
    expect(filas).toHaveLength(14);
    const fila = filas.find((f) => f.textContent?.includes('Abi + correr'))!;
    const partes = Array.from(fila.children).map((c) => c.className);
    expect(partes).toEqual(['meta-check', 'meta-n mono', 'meta-tit', 'meta-cont mono']);
    const tit = fila.querySelector('.meta-tit')!;
    expect(tit.children[0]).toHaveTextContent('Abi + correr');
    // La fila lleva solo la hora de inicio (el rango completo va al abrir la meta).
    expect(tit.children[1]).toHaveTextContent(/^08:30$/);
    expect(fila.querySelector('.meta-cont')).toHaveTextContent('0/2');
  });

  it('abre la meta en curso con "AHORA · 07:00 · QUEDAN 1 H 30"', () => {
    render(<Hoy day={getState().days['2026-11-11']} />);
    const abierta = screen.getByRole('button', { expanded: true });
    expect(abierta).toHaveTextContent('Programación');
    expect(screen.getByText(/Ahora · 07:00 · quedan 1 h 30/)).toBeInTheDocument();
    expect(screen.getByText(/Ahora toca el bloque 1; después, Abi y el trabajo\./)).toBeInTheDocument();
  });

  it('marcar todas las tareas cumple la meta y suma 1 % repartido entre las 14 metas', () => {
    const { rerender } = render(<Hoy day={getState().days['2026-11-11']} />);
    const det = document.querySelector('.meta-det') as HTMLElement;
    for (const c of within(det).getAllByRole('checkbox')) {
      act(() => fireEvent.click(c));
      rerender(<Hoy day={getState().days['2026-11-11']} />);
    }
    expect(screen.getByText('+0,07 %')).toBeInTheDocument();
  });
});
