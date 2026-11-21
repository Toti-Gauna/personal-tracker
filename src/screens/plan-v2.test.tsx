import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { cargarHorasManuales, publicarVersion } from '../state/plan';
import { TRAMOS } from '../data/plan';
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
  it('P1 (v7): la ficha sigue con su detalle; "Horas y fechas" muestra las horas de ahora y de antes y la diferencia contra el roadmap', () => {
    const { unmount } = render(<Metas day={day()} tab="proyecto/P1" />);
    const ficha = abrir('Ficha');
    // Ola 30: la ficha es la del roadmap v7 (★ = dentro del alcance).
    expect(within(ficha).getByText('Full-stack AI Engineer (energía)')).toBeInTheDocument();
    expect(within(ficha).getByText(/Sweet spots/).closest('li')).toHaveClass('estrella');
    expect(within(ficha).getByText(/Extras: alertas, más cuencas, cumplimiento, yacimiento 3D/)).toBeInTheDocument();
    const h = abrir('Horas y fechas');
    expect(within(h).getByText(/304 h \(antes 122 h\) · 19 nov 2026 — 26 dic 2026/)).toBeInTheDocument();
    expect(within(h).getByText(/El roadmap estima 19 nov 2026 — 5 ene 2027: Trazo lo termina 10 días antes/)).toBeInTheDocument();
    expect(within(h).getByText(/no se recorta profundidad/)).toBeInTheDocument();
    // Sin semanas extra no hay switches.
    expect(within(h).queryByRole('switch')).toBeNull();
    unmount();
    // Una certificación de días fijos, con su nota.
    render(<Metas day={day()} tab="proyecto/C8" />);
    const c = abrir('Horas y fechas');
    expect(within(c).getByText(/7 días fijos · 27 dic 2026 — 2 ene 2027/)).toBeInTheDocument();
    expect(within(c).getByText(/Claude Partner Network/)).toBeInTheDocument();
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

  it('C2 (Security+): manda la SY0-801 del roadmap; pide verificarla y "Ya la verifiqué" lo guarda; la 701 en inglés avisa', () => {
    render(<Metas day={getState().days['2026-11-18']} tab="proyecto/C2" />);
    expect(screen.getByLabelText('Elegida')).toHaveDisplayValue('La del roadmap (SY0-801)');
    expect(screen.getByText(/La SY0-801 llega a tu examen \(15 sep 2027\)/)).toBeInTheDocument();
    expect(screen.getByText(/Verificá la SY0-801 de CompTIA Security\+/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Ya la verifiqué' }));
    expect(getState().plan.certVerificada).toEqual({ C2: '2026-11-18' });
    expect(screen.queryByText(/Verificá la SY0-801/)).toBeNull();
    fireEvent.change(screen.getByLabelText('Elegida'), { target: { value: 'SY0-701-en' } });
    expect(screen.getByRole('status')).toHaveTextContent(/SY0-701 en inglés se retira el 11 jun 2027/);
  });

  it('Etapas: la pausa aparece en la lista', () => {
    render(<Metas day={day()} tab="etapas" />);
    // 2026 no tiene pausa; la de 2027 parte AgrIA Sat.
    expect(screen.getAllByText(/pausa de fin de año · 20 dic 2027 · 1 sem/).length).toBeGreaterThan(0);
    expect(screen.queryByText(/pausa de fin de año · 21 dic 2026/)).toBeNull();
    expect(screen.getAllByText(/proyecto · 19 nov 2026 · 304 h/).length).toBeGreaterThan(0);
  });

  it('Ajustes: la pausa se prende y apaga y T+18 se corre; sin semanas extra en la v7, no hay switches de plataforma ni arquitectura', () => {
    render(<Ajustes />);
    abrir('Plan T+18');
    expect(screen.getByText(/Con el roadmap v7, solo en 2027, 2028, 2029 y 2030/)).toBeInTheDocument();
    expect(screen.getByText(/T\+18 el 31 dic 2028/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('switch', { name: 'Pausa de fin de año' }));
    expect(getState().plan.pausaFinDeAnio).toBe(false);
    expect(screen.queryByRole('switch', { name: 'Plataformas extra' })).toBeNull();
    expect(screen.queryByRole('switch', { name: 'Arquitectura' })).toBeNull();
    // Sin la pausa de 2028, T+18 vuelve a acercarse.
    expect(screen.getByText(/T\+18 el \d+ \w+ 2028/)).toBeInTheDocument();
    expect(screen.queryByText(/T\+18 el 31 dic 2028/)).toBeNull();
  });

  it('Calibración (v7): espera a PetrIA 1.0, carga horas a mano y, al publicar la 1.0, el factor corre el calendario', () => {
    const { unmount } = render(<Metas day={day()} tab="calibracion" />);
    expect(screen.getByText(/Se calcula al publicar PetrIA 1\.0 \(en el calendario, el 28 nov 2026\), y otra vez con la 1\.1/)).toBeInTheDocument();
    expect(screen.getByText(/Cada \+10 % de horas en lo que falta corre el fin del plan/)).toBeInTheDocument();
    expect(screen.getByText('Calendario actual').parentElement!.textContent).toMatch(/ h · 4 jun 2031/);
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
    // PetrIA 1.0 publicada con 104 h reales (8 h por día): factor 1,41 y lo que viene después de PetrIA se estira.
    const finAntes = TRAMOS.find((t) => t.id === 'CIE2')!.fin!;
    for (let d = new Date('2026-11-19T12:00'); d <= new Date('2026-12-01T12:00'); d.setDate(d.getDate() + 1)) cargarHorasManuales(d.toISOString().slice(0, 10), 'programacion', 8);
    publicarVersion('P1', '1.0', '2026-12-01');
    render(<Metas day={day()} tab="calibracion" />);
    expect(screen.getByText('1,41')).toBeInTheDocument();
    expect(screen.getByText(/Vas más lento que lo estimado \(factor 1,41\): el plan se corre \d+ días\. No se recorta profundidad/)).toBeInTheDocument();
    expect(TRAMOS.find((t) => t.id === 'P2')!.horas).toBe(Math.floor(155 * 1.41));
    expect(TRAMOS.find((t) => t.id === 'W1')!.horas).toBe(122); // las ventanas no se estiran
    expect(TRAMOS.find((t) => t.id === 'CIE2')!.fin! > finAntes).toBe(true);
  });
});
