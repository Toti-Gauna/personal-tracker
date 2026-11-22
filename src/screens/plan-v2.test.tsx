import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { cargarHorasManuales, publicarVersion } from '../state/plan';
import { TRAMOS } from '../data/plan';
import { PLAN_EXT } from '../data/plan-extendido';
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

describe('ola 24 · pantallas del plan (v12.1)', () => {
  it('P1: la ficha sigue con su detalle; "Horas y fechas" muestra las horas y la diferencia contra el plan', () => {
    const { unmount } = render(<Metas day={day()} tab="proyecto/P1" />);
    const ficha = abrir('Ficha');
    // La ficha es la de los proyectos (★ = dentro del alcance).
    expect(within(ficha).getByText('Full-stack AI Engineer (energy)')).toBeInTheDocument();
    expect(within(ficha).getByText(/Sweet spots/).closest('li')).toHaveClass('estrella');
    expect(within(ficha).getByText(/Extras: alertas, más cuencas, cumplimiento, yacimiento 3D/)).toBeInTheDocument();
    const h = abrir('Horas y fechas');
    expect(within(h).getByText(/193[.,]5 h · 21 nov 2026 — 9 dic 2026/)).toBeInTheDocument();
    expect(within(h).getByText(/El roadmap estima 21 nov 2026 — 9 dic 2026: Trazo lo termina en fecha/)).toBeInTheDocument();
    expect(within(h).getByText(/no se recorta profundidad/)).toBeInTheDocument();
    // Sin semanas extra no hay switches.
    expect(within(h).queryByRole('switch')).toBeNull();
    unmount();
    // Una ventana de certificaciones con sus horas y fechas.
    render(<Metas day={day()} tab="proyecto/CW1" />);
    const c = abrir('Horas y fechas');
    expect(within(c).getByText(/42 h · 10 dic 2026 — 13 dic 2026/)).toBeInTheDocument();
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

  it('CW6 (Security+): se rinde con la versión vigente al reservar, sin versión por defecto que verificar', () => {
    const sec = PLAN_EXT.bloques.find((b) => b.id === 'CW6')!.certs!.find((c) => c.id === 'secplus')!;
    expect(sec.nombre).toBe('CompTIA Security+ (current version at booking)');
    expect(sec.examen).toBe('2027-05-08');
    render(<Metas day={getState().days['2026-11-18']} tab="proyecto/CW6" />);
    expect(within(abrir('Horas y fechas')).getByText(/94 h · 1 may 2027 — 9 may 2027/)).toBeInTheDocument();
    expect(screen.queryByText(/Verificá la SY0-801/)).toBeNull();
  });

  it('Etapas: la pausa aparece en la lista', () => {
    render(<Metas day={day()} tab="etapas" />);
    // 2026 no tiene pausa; la de 2027 (20 al 26 dic, fecha fija).
    expect(screen.getAllByText(/pausa de fin de año · 20 dic 2027 · 1 sem/).length).toBeGreaterThan(0);
    expect(screen.queryByText(/pausa de fin de año · 21 dic 2026/)).toBeNull();
    expect(screen.getAllByText(/proyecto · 21 nov 2026 · 193[.,]5 h/).length).toBeGreaterThan(0);
  });

  it('Ajustes: la pausa se prende y apaga; T+18 no se corre (la pausa cae después); no hay switches de plataforma ni arquitectura', () => {
    render(<Ajustes />);
    abrir('Plan T+18');
    expect(screen.getByText(/T\+18 el 21 nov 2027/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('switch', { name: 'Pausa de fin de año' }));
    expect(getState().plan.pausaFinDeAnio).toBe(false);
    expect(screen.queryByRole('switch', { name: 'Plataformas extra' })).toBeNull();
    expect(screen.queryByRole('switch', { name: 'Arquitectura' })).toBeNull();
    expect(screen.getByText(/T\+18 el 21 nov 2027/)).toBeInTheDocument();
  });

  it('Calibración: espera a PetrIA 1.0, carga horas a mano y, al publicar la 1.0, da el factor sin mover fechas solas', () => {
    const { unmount } = render(<Metas day={day()} tab="calibracion" />);
    expect(screen.getByText(/Se calcula al publicar PetrIA 1\.0 \(en el calendario, el 25 nov 2026\), y otra vez con la 1\.1/)).toBeInTheDocument();
    expect(screen.getByText(/Cada \+10 % de horas en lo que falta corre el fin del plan/)).toBeInTheDocument();
    expect(screen.getByText('Calendario actual').parentElement!.textContent).toMatch(/ h · 27 oct 2028/);
    expect(screen.getByText(/Lento · 1,15/).parentElement!.textContent).toMatch(/ h · /);
    // Horas a mano del día (mandan sobre el foco).
    const prog = screen.getByLabelText('Horas de programación del 18 nov 2026');
    fireEvent.change(prog, { target: { value: '7,5' } });
    fireEvent.blur(prog);
    expect(getState().plan.horasManuales).toEqual({ '2026-11-18': { programacion: 7.5 } });
    fireEvent.change(prog, { target: { value: '' } });
    fireEvent.blur(prog);
    expect(getState().plan.horasManuales).toEqual({});
    unmount();
    // PetrIA 1.0 publicada con 70 h reales (14 h por día del 21 al 25 nov) contra 47: factor 1,49.
    const finAntes = TRAMOS.find((t) => t.id === 'CIE2')!.fin!;
    for (let d = new Date('2026-11-21T12:00'); d <= new Date('2026-11-25T12:00'); d.setDate(d.getDate() + 1)) cargarHorasManuales(d.toISOString().slice(0, 10), 'programacion', 14);
    publicarVersion('P1', '1.0', '2026-11-25');
    render(<Metas day={day()} tab="calibracion" />);
    expect(screen.getByText('1,49')).toBeInTheDocument();
    expect(screen.getByText(/Vas más lento que lo estimado \(factor 1,49\)/)).toBeInTheDocument();
    // v12.1: las fechas son explícitas; un corrimiento se sugiere y se confirma, nunca se aplica solo.
    expect(TRAMOS.find((t) => t.id === 'CIE2')!.fin).toBe(finAntes);
  });
});
