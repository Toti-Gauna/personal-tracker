import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { getState, register, resetState, startDay } from '../state/store';
import { Metas } from './Metas';

const D = '2026-11-21';
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
  startDay('completo', '04:00', D);
});

describe('ola 30 · versiones y estándar de alto valor en la pantalla del proyecto', () => {
  it('PetrIA: las 4 versiones con fechas de Trazo y del roadmap; marcar entregables y publicar la 1.0', () => {
    render(<Metas day={getState().days[D]} tab="proyecto/P1" />);
    const plegable = abrir('Versiones');
    expect(plegable.querySelector('summary')!.textContent).toMatch(/0 de 4 publicadas · 1\.0 en curso/);
    const items = plegable.querySelectorAll('.pp-vers > li');
    expect(items).toHaveLength(4);
    expect(items[0].textContent).toMatch(/1\.0 MVP.*en curso.*Trazo 21 nov 2026 — 25 nov 2026 · roadmap 25 nov 2026 \(en fecha\) · 47 h/);
    expect(items[1].textContent).toMatch(/Herramientas: valor del pozo, declinación, lector de partes/);
    fireEvent.click(within(items[0] as HTMLElement).getByRole('checkbox', { name: 'Notas de versión de la 1.0: marcar' }));
    fireEvent.click(within(items[0] as HTMLElement).getByRole('button', { name: 'Publicada hoy' }));
    expect(getState().plan.versiones).toEqual({ P1: { '1.0': { notas: true, publicada: D } } });
    expect(plegable.querySelector('summary')!.textContent).toMatch(/1 de 4 publicadas/);
    fireEvent.click(within(plegable.querySelectorAll('.pp-vers > li')[0] as HTMLElement).getByRole('button', { name: 'Deshacer publicada' }));
    expect(getState().plan.versiones!.P1['1.0']).toEqual({ notas: true });
  });

  it('VitalIA: las horas por versión se marcan como repartidas por días', () => {
    render(<Metas day={getState().days[D]} tab="proyecto/P2" />);
    expect(abrir('Versiones').querySelectorAll('.pp-vers > li')[0].textContent).toMatch(/≈ 21 h \(repartidas por días\)/); // §14: VitalIA 104 h
  });

  it('el estándar de alto valor tiene los 12 puntos (vienen de la v7), con el detalle', () => {
    render(<Metas day={getState().days[D]} tab="proyecto/P1" />);
    const est = abrir('Estándar de alto valor');
    expect(est.querySelector('summary')!.textContent).toMatch(/0 de 12/);
    expect(within(est).getByText(/Feature flags · Migraciones expand\/contract/)).toBeInTheDocument();
    fireEvent.click(within(est).getByRole('checkbox', { name: 'En producción: marcar' }));
    expect(getState().plan.proyectos.P1.estandar).toEqual({ produccion: true });
    expect(est.querySelector('summary')!.textContent).toMatch(/1 de 12/);
  });

  it('un proyecto de la etapa 3 también tiene versiones y su ficha v7', () => {
    render(<Metas day={getState().days[D]} tab="proyecto/Q1" />);
    expect(screen.getByText('Quant Developer')).toBeInTheDocument();
    expect(abrir('Versiones').querySelectorAll('.pp-vers > li')).toHaveLength(4);
  });
});
