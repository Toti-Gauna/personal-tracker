import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { getState, register, resetState, startDay } from '../state/store';
import { Metas } from './Metas';
import { Ajustes } from './Ajustes';

const day = () => getState().days['2026-11-18'];
const abrir = (titulo: string) => {
  const d = [...document.querySelectorAll('details.plegable')].find((x) => x.querySelector('summary b')?.textContent === titulo) as HTMLDetailsElement;
  d.open = true;
  fireEvent(d, new Event('toggle'));
  return d;
};

beforeEach(() => {
  localStorage.clear();
  resetState();
  register('Toti', 'Abi', '2026-11-16');
  startDay('completo', '04:00', '2026-11-18');
});

describe('ola 24 · pantallas del plan v2', () => {
  it('P1: ficha con plataforma y arquitectura, y los switches de feature y plataforma recalculan el cierre', () => {
    render(<Metas day={day()} tab="proyecto/P1" />);
    expect(screen.getByText(/con la pausa adentro/)).toBeInTheDocument();
    const ficha = abrir('Ficha');
    expect(within(ficha).getByText('Escritorio (Electron con SQLite local)')).toBeInTheDocument();
    expect(within(ficha).getByText(/2 servicios con contrato OpenAPI/)).toBeInTheDocument();
    const ext = abrir('Semanas extra');
    expect(within(ext).getByText(/3 base \+ 2 feature \+ 1 plataforma = 6 semanas/)).toBeInTheDocument();
    expect(within(ext).getByText(/cierra el 17 ene 2027/)).toBeInTheDocument();
    fireEvent.click(within(ext).getByRole('switch', { name: 'Plataforma extra de P1' }));
    expect(getState().plan.extrasApagados).toEqual(['P1:plataforma']);
    expect(within(ext).getByText(/3 base \+ 2 feature = 5 semanas/)).toBeInTheDocument();
    expect(within(ext).getByText(/cierra el 10 ene 2027/)).toBeInTheDocument();
  });

  it('P1 lleva el checklist de arquitectura (contrato, trazas, mTLS y ADR); P2 no', () => {
    const { unmount } = render(<Metas day={day()} tab="proyecto/P1" />);
    const arq = abrir('Arquitectura');
    fireEvent.click(within(arq).getByRole('checkbox', { name: 'Contrato probado: marcar' }));
    expect(getState().plan.arquitectura).toEqual({ P1: { contrato: true } });
    expect(arq.querySelector('summary')!.textContent).toContain('1 de 4');
    unmount();
    render(<Metas day={day()} tab="proyecto/P2" />);
    expect([...document.querySelectorAll('details.plegable summary b')].map((b) => b.textContent)).not.toContain('Arquitectura');
  });

  it('C2 (Security+): sin elegir versión avisa; con la SY0-801 no', () => {
    render(<Metas day={day()} tab="proyecto/C2" />);
    expect(screen.getByRole('status').textContent).toMatch(/SY0-701 en inglés ya está retirada/);
    fireEvent.change(screen.getByLabelText('Elegida'), { target: { value: 'SY0-801' } });
    expect(getState().plan.versionCert).toEqual({ C2: 'SY0-801' });
    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.getByText(/La SY0-801 llega a tu examen \(1 ago 2027\)/)).toBeInTheDocument();
  });

  it('Etapas: la pausa aparece en la lista y la alerta de versión entra al panel', () => {
    render(<Metas day={day()} tab="etapas" />);
    expect(screen.getAllByText(/pausa de fin de año · 21 dic 2026 · 1 sem/).length).toBeGreaterThan(0);
    expect(screen.getByText(/versión de CompTIA Security\+/)).toBeInTheDocument();
  });

  it('Ajustes: la pausa y las plataformas se prenden y apagan; T+18 se corre', () => {
    render(<Ajustes />);
    abrir('Plan T+18');
    fireEvent.click(screen.getByRole('switch', { name: 'Pausa de fin de año' }));
    expect(getState().plan.pausaFinDeAnio).toBe(false);
    fireEvent.click(screen.getByRole('switch', { name: 'Plataformas extra' }));
    expect(getState().plan.extrasApagados).toHaveLength(18);
    expect(screen.getByRole('switch', { name: 'Plataformas extra' })).toHaveAttribute('aria-checked', 'false');
    // Sin pausas ni plataformas: T+18 vuelve a acercarse (90 + 2 de arquitectura = 92 semanas).
    expect(screen.getByText(/T\+18 el 20 ago 2028/)).toBeInTheDocument();
  });

  it('Calibración: antes de P3 espera, muestra las horas por proyecto y los escenarios', () => {
    render(<Metas day={day()} tab="calibracion" />);
    expect(screen.getByText(/Se calcula al cerrar P3, el 18 abr 2027/)).toBeInTheDocument();
    expect(screen.getByText(/P0/)).toBeInTheDocument();
    expect(screen.getByText('Calendario actual').parentElement!.textContent).toMatch(/217 sem · 12 ene 2031/);
    expect(screen.getByText('Pesimista').parentElement!.textContent).toMatch(/273 sem · 5 feb 2032/);
  });
});
