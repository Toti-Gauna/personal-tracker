import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { dayJson } from '../data/export';
import { mejoraDia } from '../data/mejora';
import { borrarTarea, restaurarTarea } from '../state/dia';
import { getState, register, resetState, startDay } from '../state/store';
import { Cierre } from './Cierre';
import { Hoy } from './Hoy';

const D = '2026-11-18';
const day = () => getState().days[D];
const bloque = (k: string) => day().blocks.find((b) => b.key === k)!;
/** Abre la meta de Hoy por su título. */
const abrir = (titulo: RegExp) => {
  const fila = screen.getAllByRole('button').find((x) => x.classList.contains('meta-fila') && titulo.test(x.textContent ?? ''))!;
  if (fila.getAttribute('aria-expanded') !== 'true') fireEvent.click(fila);
  return fila.closest('li')!;
};

beforeEach(() => {
  localStorage.clear();
  resetState();
  register('Toti', 'Abi', '2026-11-16');
  startDay('completo', '04:00', D);
});

describe('ola 25 · submetas y bloque hecho', () => {
  it('una submeta se edita y se borra desde su botón ⋯ (y se puede deshacer)', () => {
    const { rerender } = render(<Hoy day={day()} />);
    const li = abrir(/Trabajo actual/);
    fireEvent.click(within(li).getByRole('button', { name: 'Editar o borrar: Tarea principal del trabajo' }));
    const dlg = screen.getByRole('dialog');
    fireEvent.change(within(dlg).getByLabelText('Texto de la submeta'), { target: { value: 'Reunión con el equipo' } });
    fireEvent.click(within(dlg).getByRole('button', { name: 'Guardar' }));
    expect(bloque('trabajo').tasks.map((t) => t.t)).toEqual(['Reunión con el equipo']);
    rerender(<Hoy day={day()} />);
    fireEvent.click(within(abrir(/Trabajo actual/)).getByRole('button', { name: 'Editar o borrar: Reunión con el equipo' }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Borrar la submeta' }));
    expect(bloque('trabajo').tasks).toEqual([]);
    // Deshacer: vuelve en su lugar.
    const prog = bloque('prog');
    const r = borrarTarea(D, 'prog', prog.tasks[0].id)!;
    expect(bloque('prog').tasks).toHaveLength(prog.tasks.length - 1);
    restaurarTarea(D, 'prog', r.tarea, r.i);
    expect(bloque('prog').tasks.map((t) => t.id)).toEqual(prog.tasks.map((t) => t.id));
  });

  it('dar el bloque por hecho con nota: cuenta en la mejora, sus pendientes no pasan a mañana y el JSON lo dice', () => {
    const { rerender } = render(<Hoy day={day()} />);
    fireEvent.click(within(abrir(/Trabajo actual/)).getByRole('button', { name: 'Dar por hecho' }));
    const dlg = screen.getByRole('dialog');
    fireEvent.change(within(dlg).getByLabelText('¿En qué lo usaste? (opcional)'), { target: { value: 'La reunión no se dio: otra tarea de Tsoft' } });
    fireEvent.click(within(dlg).getByRole('button', { name: 'Dar por hecho' }));
    expect(bloque('trabajo').hecho?.nota).toBe('La reunión no se dio: otra tarea de Tsoft');
    expect(mejoraDia(day())).toBeCloseTo(1 / day().blocks.length);
    rerender(<Hoy day={day()} />);
    expect(screen.getByText(/Hecho a mano a las .*: La reunión no se dio/)).toBeInTheDocument();
    const s = getState();
    const j = dayJson(day(), s.settings!, s.days) as { blocks: { id: string; done: boolean; hecho?: string; nota?: string }[] };
    expect(j.blocks.find((x) => x.id === 'trabajo')).toMatchObject({ done: true, hecho: 'a mano', nota: 'La reunión no se dio: otra tarea de Tsoft' });
    // En el cierre, "Tarea principal del trabajo" no aparece para pasar a mañana.
    const cierre = render(<Cierre day={day()} />);
    expect(within(cierre.container).queryByText('Tarea principal del trabajo')).toBeNull();
    // Deshacer.
    fireEvent.click(screen.getAllByRole('button', { name: 'Deshacer' })[0]);
    expect(bloque('trabajo').hecho).toBeUndefined();
  });
});

describe('ola 25 · horarios y metas del día', () => {
  it('cambiar el horario de trabajo (hasta las 13) acortando los siguientes; la rutina no cambia', () => {
    render(<Hoy day={day()} />);
    fireEvent.click(within(abrir(/Trabajo actual/)).getByRole('button', { name: 'Cambiar horario' }));
    const dlg = screen.getByRole('dialog');
    fireEvent.change(within(dlg).getByLabelText('Dura (min)'), { target: { value: '180' } });
    expect(within(dlg).getByText('Termina a las 13:00')).toBeInTheDocument();
    // El día de la intensiva está lleno hasta las 22: corriendo no entra, acortando sí.
    fireEvent.click(within(dlg).getByRole('button', { name: 'Guardar' }));
    expect(within(dlg).getByRole('alert').textContent).toMatch(/pasan de dormir/);
    fireEvent.click(within(dlg).getByRole('radio', { name: 'Acortar los siguientes' }));
    fireEvent.click(within(dlg).getByRole('button', { name: 'Guardar' }));
    expect(bloque('trabajo')).toMatchObject({ start: '10:00', min: 180, editado: true });
    expect(bloque('caso').start).toBe('13:00');
    const cierre = bloque('cierre');
    expect(Number(cierre.start.slice(0, 2)) * 60 + Number(cierre.start.slice(3)) + cierre.min).toBe(22 * 60);
    expect(bloque('sueno').start).toBe('22:00');
    // Mañana arranca con la rutina de siempre.
    startDay('completo', '04:00', '2026-11-19');
    expect(getState().days['2026-11-19'].blocks.find((b) => b.key === 'trabajo')).toMatchObject({ start: '10:00', min: 120 });
  });

  it('si no entra antes de dormir, avisa y no cambia nada', () => {
    render(<Hoy day={day()} />);
    fireEvent.click(within(abrir(/Trabajo actual/)).getByRole('button', { name: 'Cambiar horario' }));
    const dlg = screen.getByRole('dialog');
    fireEvent.change(within(dlg).getByLabelText('Dura (min)'), { target: { value: '600' } });
    fireEvent.click(within(dlg).getByRole('button', { name: 'Guardar' }));
    expect(within(dlg).getByRole('alert').textContent).toMatch(/dormir/);
    expect(bloque('trabajo').min).toBe(120);
  });

  it('+ Meta para hoy suma una meta en su hora y acorta los siguientes; se puede quitar', () => {
    const { rerender } = render(<Hoy day={day()} />);
    fireEvent.click(screen.getByRole('button', { name: '+ Meta para hoy' }));
    const dlg = screen.getByRole('dialog');
    fireEvent.change(within(dlg).getByLabelText('Qué es'), { target: { value: 'Reunión Tsoft' } });
    fireEvent.change(within(dlg).getByLabelText('Empieza'), { target: { value: '12:00' } });
    fireEvent.change(within(dlg).getByLabelText('Dura (min)'), { target: { value: '30' } });
    fireEvent.click(within(dlg).getByRole('button', { name: 'Sumar a hoy' }));
    const nueva = day().blocks.find((b) => b.propia)!;
    expect(nueva).toMatchObject({ title: 'Reunión Tsoft', start: '12:00', min: 30 });
    expect(bloque('caso').start).toBe('12:30');
    expect(bloque('sueno').start).toBe('22:00');
    rerender(<Hoy day={day()} />);
    fireEvent.click(within(abrir(/Reunión Tsoft/)).getByRole('button', { name: 'Quitar de hoy' }));
    expect(day().blocks.some((b) => b.propia)).toBe(false);
  });

  it('saltear hoy: no cuenta en la mejora y se puede volver', () => {
    const { rerender } = render(<Hoy day={day()} />);
    fireEvent.click(within(abrir(/Trabajo actual/)).getByRole('button', { name: 'Saltear hoy' }));
    expect(bloque('trabajo').salteado).toBe(true);
    rerender(<Hoy day={day()} />);
    expect(screen.getByText(/salteado hoy/)).toBeInTheDocument();
    fireEvent.click(within(abrir(/Trabajo actual/)).getByRole('button', { name: 'Volver a hoy' }));
    expect(bloque('trabajo').salteado).toBeUndefined();
  });
});
