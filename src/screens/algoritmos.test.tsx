import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { getState, register, resetState, startDay } from '../state/store';
import { Ajustes } from './Ajustes';
import { Hoy } from './Hoy';
import { ProgPlan } from './ProgPlan';

const D = '2026-11-18';
const abrir = (titulo: RegExp) => {
  const d = [...document.querySelectorAll('details.plegable')].find((x) => titulo.test(x.querySelector('summary b')?.textContent ?? '')) as HTMLDetailsElement;
  d.open = true;
  fireEvent(d, new Event('toggle'));
  return d;
};

beforeEach(() => {
  localStorage.clear();
  resetState();
  register('Toti', 'Abi', '2026-11-16');
  startDay('completo', '04:00', D);
});

describe('ola 31 · pantallas de la rutina v7 y los algoritmos', () => {
  it('Algoritmos: arrancar el sprint, contar problemas y registrar un spot con su pregunta', () => {
    render(<ProgPlan day={getState().days[D]} param="prog/algoritmos" />);
    expect(screen.getByRole('heading', { name: 'Algoritmos' })).toBeInTheDocument();
    expect(screen.getByText(/faltan 4\. Sumalos acá/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Arrancar el sprint hoy' }));
    expect(screen.getByText('Día 1 de 14')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Un problema resuelto' }));
    fireEvent.click(screen.getByRole('button', { name: 'Un problema resuelto' }));
    expect(screen.getByText(/2 de ≈ 100 problemas sin IA · 1 sprint/)).toBeInTheDocument();
    const p1 = abrir(/^P1 · 7 temas/);
    const lru = within(p1).getByText('LRU (hash map + lista doble)').closest('li') as HTMLElement;
    fireEvent.change(within(lru).getByRole('textbox'), { target: { value: '¿LRU en O(1)?' } });
    fireEvent.click(within(lru).getByRole('button', { name: 'Lo planté hoy' }));
    expect(getState().plan.algoritmos!.lru).toEqual({ fecha: D, proyecto: 'P1', pregunta: '¿LRU en O(1)?' });
    fireEvent.click(within(lru).getByRole('checkbox'));
    expect(getState().plan.algoritmos!.lru.validado).toBe(true);
    // Sumar un tema propio.
    fireEvent.change(screen.getByLabelText('Tema nuevo'), { target: { value: 'Trie' } });
    fireEvent.change(screen.getByLabelText('Proyecto del tema nuevo'), { target: { value: 'p8' } });
    fireEvent.click(screen.getByRole('button', { name: 'Agregar tema' }));
    expect(getState().plan.temasPropios![0]).toMatchObject({ tema: 'Trie', proyectos: ['P8'], modo: 'sin-ia' });
  });

  it('Programación enlaza a Algoritmos', () => {
    render(<ProgPlan day={getState().days[D]} param="prog" />);
    expect(screen.getByRole('link', { name: /Algoritmos: los spots de cada proyecto/ })).toHaveAttribute('href', '#/estudio/prog/algoritmos');
  });

  it('Ajustes (v12.1): sin fecha de trabajo nuevo no hay meta de horas extra de PetrIA, así que no aparece la fila para elegirlas', () => {
    render(<Ajustes />);
    abrir(/^Plan T\+18/);
    expect(screen.queryByText(/La rutina da .* h/)).toBeNull();
    expect(screen.queryByRole('switch', { name: /pasa a proyecto/ })).toBeNull();
  });

  it('Hoy (v12.1) no avisa de horas extra de PetrIA: la rutina de 10/11 h ya es la del plan', () => {
    render(<Hoy day={getState().days[D]} />);
    expect(screen.queryByText(/para las 8 h por día de PetrIA/)).toBeNull();
  });
});
