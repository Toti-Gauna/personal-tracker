import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { getState, register, resetState, startDay } from '../state/store';
import { SemanaPlan } from '../screens/MetasPlan';
import { Metas } from '../screens/Metas';
import { ProgPlan } from '../screens/ProgPlan';
import { EscaleraCompacta } from './EscaleraCompacta';
import { Plegable } from './Plegable';

const T0 = '2026-11-16';
const day = () => getState().days['2026-11-18'];

beforeEach(() => {
  localStorage.clear();
  resetState();
  register('Toti', 'Abi', T0);
  startDay('completo', '04:00', '2026-11-18');
});

describe('ola 22 · secciones plegables', () => {
  it('arranca cerrada o abierta según se pida, se abre al tocar y recuerda cómo la dejaste', () => {
    const { unmount } = render(<Plegable id="x:uno" titulo="Hitos" resumen="2 de 5"><p>contenido</p></Plegable>);
    const det = () => document.querySelector('details') as HTMLDetailsElement;
    expect(det().open).toBe(false);
    expect(screen.getByText('2 de 5')).toBeInTheDocument();
    det().open = true;
    fireEvent(det(), new Event('toggle'));
    unmount();
    // Al volver a la pantalla sigue abierta.
    render(<Plegable id="x:uno" titulo="Hitos" resumen="2 de 5"><p>contenido</p></Plegable>);
    expect(det().open).toBe(true);
    expect(JSON.parse(localStorage.getItem('trazo.plegables')!)).toEqual({ 'x:uno': true });
  });

  it('abierto por defecto si se pide, y sin storage no se rompe', () => {
    render(<Plegable titulo="Examen" abierto><p>x</p></Plegable>);
    expect((document.querySelector('details') as HTMLDetailsElement).open).toBe(true);
  });

  it('la escalera compacta abre solo la etapa en curso y marca dónde estás', () => {
    render(<EscaleraCompacta etiqueta="Escalera" color="var(--ing)" grupos={[
      { id: 'e:1', titulo: 'Etapa 1', resumen: '1 de 2', abierto: false, items: [
        { id: 'a', href: '#/a', titulo: 'A · uno', sub: '16 nov', estado: 'hecho' }, { id: 'b', href: '#/b', titulo: 'B · dos', sub: '23 nov', estado: 'actual', aqui: true }] },
      { id: 'e:2', titulo: 'Etapa 2', resumen: '0 de 1', abierto: false, items: [{ id: 'c', href: '#/c', titulo: 'C · tres', estado: 'proximo' }] },
    ]} />);
    expect([...document.querySelectorAll('details')].map((d) => d.open)).toEqual([true, false]);
    expect(screen.getByText(/16 nov/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /B · dos/ })).toHaveAttribute('aria-current', 'step');
  });
});

describe('ola 22 · Metas y Estudio livianos', () => {
  it('Semana: cada rama es una sección y solo la primera viene abierta; los hitos van plegados', () => {
    render(<Metas day={day()} tab="semana" />);
    const dets = [...document.querySelectorAll('main details.plegable')] as HTMLDetailsElement[];
    expect(dets.length).toBeGreaterThanOrEqual(5);
    const abiertas = dets.filter((d) => d.open).map((d) => d.querySelector('summary b')?.textContent);
    expect(abiertas).toHaveLength(1);
    const hitos = dets.find((d) => d.querySelector('summary b')?.textContent === 'Hitos del período');
    expect(hitos?.open).toBe(false);
  });

  it('Semana: abrir una rama muestra sus metas y queda recordado', () => {
    render(<Metas day={day()} tab="semana" />);
    const prog = [...document.querySelectorAll('main details.plegable')].find((d) => d.querySelector('.pleg-k')?.textContent === 'programacion') as HTMLDetailsElement;
    prog.open = true;
    fireEvent(prog, new Event('toggle'));
    expect(JSON.parse(localStorage.getItem('trazo.plegables')!)['semana:programacion']).toBe(true);
    expect(prog.textContent).toContain('Horas de programación');
  });

  it('Programación: los 50 bloques van en 4 etapas y solo la de P0 viene abierta', () => {
    render(<ProgPlan day={day()} param="prog" />);
    expect(document.querySelectorAll('.esc-lista a').length).toBeGreaterThan(40);
    expect([...document.querySelectorAll('.esc details')].map((d) => (d as HTMLDetailsElement).open)).toEqual([true, false, false, false]);
    expect(SemanaPlan).toBeTypeOf('function');
  });
});
