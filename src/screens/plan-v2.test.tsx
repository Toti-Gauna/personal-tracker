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
  it('P1 (v3): la ficha manda la consola Electron a la Semana de sumas; los switches de feature y plataforma de P3 recalculan el cierre', () => {
    const { unmount } = render(<Metas day={day()} tab="proyecto/P1" />);
    const ficha = abrir('Ficha');
    expect(within(ficha).getByText(/Escritorio \(consola Electron\): pasa a la Semana de sumas/)).toBeInTheDocument();
    expect(within(ficha).getByText(/2 servicios con contrato OpenAPI/)).toBeInTheDocument();
    expect(within(abrir('Semanas extra')).getByText(/3 base \+ 2 feature = 5 semanas del plan \(122 h\)/)).toBeInTheDocument();
    unmount();
    render(<Metas day={day()} tab="proyecto/P3" />);
    const ext = abrir('Semanas extra');
    expect(within(ext).getByText(/3 base \+ 1 feature \+ 1 plataforma = 5 semanas del plan \(122 h\).*cierra el 2 mar 2027/)).toBeInTheDocument();
    fireEvent.click(within(ext).getByRole('switch', { name: 'Plataforma extra de P3' }));
    expect(getState().plan.extrasApagados).toEqual(['P3:plataforma']);
    expect(within(ext).getByText(/3 base \+ 1 feature = 4 semanas del plan \(98 h\).*cierra el/)).toBeInTheDocument();
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

  it('C2 (Security+): con el examen el 31 may 2027 (antes del retiro de la 701 en inglés) no avisa; se puede elegir la SY0-801', () => {
    render(<Metas day={day()} tab="proyecto/C2" />);
    expect(screen.queryByRole('status')).toBeNull();
    fireEvent.change(screen.getByLabelText('Elegida'), { target: { value: 'SY0-801' } });
    expect(getState().plan.versionCert).toEqual({ C2: 'SY0-801' });
    expect(screen.getByText(/La SY0-801 llega a tu examen \(31 may 2027\)/)).toBeInTheDocument();
  });

  it('Etapas: la pausa aparece en la lista', () => {
    render(<Metas day={day()} tab="etapas" />);
    expect(screen.getAllByText(/pausa de fin de año · 21 dic 2026 · 1 sem/).length).toBeGreaterThan(0);
  });

  it('Ajustes: la pausa y las plataformas se prenden y apagan; T+18 se corre', () => {
    render(<Ajustes />);
    abrir('Plan T+18');
    fireEvent.click(screen.getByRole('switch', { name: 'Pausa de fin de año' }));
    expect(getState().plan.pausaFinDeAnio).toBe(false);
    fireEvent.click(screen.getByRole('switch', { name: 'Plataformas extra' }));
    expect(getState().plan.extrasApagados).toHaveLength(16);
    expect(screen.getByRole('switch', { name: 'Plataformas extra' })).toHaveAttribute('aria-checked', 'false');
    // Sin pausas ni plataformas: T+18 vuelve a acercarse.
    expect(screen.getByText(/T\+18 el \d+ \w+ 2028/)).toBeInTheDocument();
  });

  it('Calibración: antes de P2 espera, muestra las horas por proyecto y los escenarios calculados con el factor', () => {
    render(<Metas day={day()} tab="calibracion" />);
    expect(screen.getByText(/Se calcula al cerrar P2, el 29 dic 2026, y otra vez al cerrar P3/)).toBeInTheDocument();
    expect(screen.getAllByText(/P0/).length).toBeGreaterThan(0);
    expect(screen.getByText('Calendario actual').parentElement!.textContent).toMatch(/ h · 6 may 2030|ene 2031| 2030/);
    expect(screen.getByText(/Lento · 1,15/).parentElement!.textContent).toMatch(/ h · /);
    expect(screen.getByText(/Rápido · 0,85/)).toBeInTheDocument();
  });
});
