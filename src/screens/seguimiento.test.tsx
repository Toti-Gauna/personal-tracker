import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { marcarRevisionHecha } from '../state/plan';
import { getState, register, resetState, startDay } from '../state/store';
import { Hoy } from './Hoy';
import { Metas } from './Metas';

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
  startDay('completo', '04:00', '2026-11-22');
});

describe('ola 32 · pantallas de seguimiento', () => {
  it('Revisión semanal: los cinco puntos, los contadores con + y −, la nota y "hecha"', () => {
    render(<Metas day={getState().days['2026-11-22']} tab="revision" />);
    expect(screen.getByRole('heading', { name: 'Revisión semanal' })).toBeInTheDocument();
    expect(screen.getByText(/Semana del 16 nov al 22 nov/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('checkbox', { name: 'english.md: marcar' }));
    expect(getState().plan.revisionesSemanales!['2026-11-16'].checks).toEqual([2]);
    fireEvent.click(screen.getByRole('button', { name: 'Publicaciones: una más' }));
    expect(getState().plan.contadores['2026-11-16'].posts).toBe(1);
    expect(screen.getByText(/1 de 2/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Nota de la semana'), { target: { value: 'PetrIA 1.0 casi lista' } });
    fireEvent.click(screen.getByRole('button', { name: 'Revisión hecha' }));
    expect(getState().plan.revisionesSemanales!['2026-11-16']).toMatchObject({ checks: [2], nota: 'PetrIA 1.0 casi lista', hecha: '2026-11-22' });
    expect(screen.getByText(/El plan termina el/).closest('a')).toHaveAttribute('href', '#/metas/diferencia');
  });

  it('el domingo Hoy avisa la revisión semanal hasta que esté hecha', () => {
    const { unmount } = render(<Hoy day={getState().days['2026-11-22']} />);
    const avisos = () => document.querySelector('.avisos-ramas') as HTMLElement | null;
    expect(within(avisos()!).getByText('Revisión semanal').closest('a')).toHaveAttribute('href', '#/metas/revision');
    unmount();
    marcarRevisionHecha('2026-11-16', '2026-11-22');
    render(<Hoy day={getState().days['2026-11-22']} />);
    expect(avisos() ? within(avisos()!).queryByText('Revisión semanal') : null).toBeNull();
  });

  it('Hardware y trámites: fases con su fecha límite, lo diferido aparte y marcar comprado', () => {
    render(<Metas day={getState().days['2026-11-22']} tab="compras" />);
    const f1 = abrir(/^Fase 1$/);
    expect(f1.querySelector('summary')!.textContent).toMatch(/0 de 4 · antes del 26 dic 2026/);
    expect(within(f1).getByText(/Diferido: PetrIA va solo con Wokwi/)).toBeInTheDocument();
    fireEvent.click(within(f1).getByRole('checkbox', { name: 'MAX30102: marcar comprado' }));
    expect(getState().plan.compras).toEqual({ max30102: { fecha: '2026-11-22' } });
    expect(f1.querySelector('summary')!.textContent).toMatch(/1 de 4/);
    const t = abrir(/^Trámites$/);
    expect(t.querySelector('summary')!.textContent).toMatch(/0 de 3 · arrancar ya/);
  });

  it('Las 4 etapas enlazan la revisión y el hardware, y muestran el aviso de trámites', () => {
    render(<Metas day={getState().days['2026-11-22']} tab="etapas" />);
    expect(screen.getByRole('link', { name: /Revisión semanal/ })).toHaveAttribute('href', '#/metas/revision');
    expect(screen.getByRole('link', { name: /Hardware y trámites/ })).toHaveAttribute('href', '#/metas/compras');
    expect(screen.getByText('Trámites: 3 sin hacer')).toBeInTheDocument();
    // v12.1: Security+ se rinde con la versión vigente al reservar; ya no hay una versión del roadmap que verificar.
    expect(screen.queryByText(/Verificá la SY0-801/)).toBeNull();
  });
});
