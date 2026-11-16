import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { aceptaSubs, addGoal, addSub, removeSub, toggleSub } from '../state/goals';
import { getState, register, resetState, startDay } from '../state/store';
import { GoalRow } from '../ui/GoalRow';
import { Hoy } from './Hoy';

const D = '2026-11-11';
const meta = (id: string) => getState().goals.goals.find((g) => g.id === id)!;

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 10, 11, 7, 0));
  resetState();
  register('Toti', 'Abi', '2026-11-08');
  startDay('completo', '04:00', D);
});
afterEach(() => vi.useRealTimers());

describe('ola 18: submetas en la meta principal (estado)', () => {
  it('agregar la primera submeta a una tarea la vuelve una meta con pasos', () => {
    const id = addGoal({ title: 'Mudanza', area: 'rutina', horizon: 'semana', type: 'tarea', target: 1 }, D);
    addSub(id, D, 'Cajas');
    addSub(id, D, '  Camión  ');
    addSub(id, D, '   ');
    expect(meta(id).subs!.map((x) => x.t)).toEqual(['Cajas', 'Camión']);
    expect(meta(id)).toMatchObject({ type: 'contador', target: 2, unit: 'pasos' });
    toggleSub(id, D, meta(id).subs![0].id);
    expect(meta(id).progress['2026-11-09']).toBe(1);
  });

  it('una submeta nueva en una meta con pasos hechos conserva los hechos y suma uno al total', () => {
    const id = addGoal({ title: 'Mudanza', area: 'rutina', horizon: 'semana', type: 'numero', target: 5, subs: [{ id: 'a', t: 'Cajas' }, { id: 'b', t: 'Camión' }] }, D);
    toggleSub(id, D, 'a');
    toggleSub(id, D, 'b');
    expect(meta(id).progress['2026-11-09']).toBe(2);
    addSub(id, D, 'Limpieza');
    expect(meta(id)).toMatchObject({ target: 3, unit: 'pasos' });
    expect(meta(id).progress['2026-11-09']).toBe(2);
  });

  it('sacar la última submeta devuelve la tarea simple; las automáticas y las diarias no aceptan', () => {
    const id = addGoal({ title: 'Mudanza', area: 'rutina', horizon: 'semana', type: 'tarea', target: 1 }, D);
    addSub(id, D, 'Cajas');
    removeSub(id, D, meta(id).subs![0].id);
    expect(meta(id)).toMatchObject({ type: 'tarea', target: 1 });
    expect(meta(id).subs).toBeUndefined();
    const diaria = addGoal({ title: 'Caminar', area: 'salud', horizon: 'semana', type: 'numero', target: 5, daily: true }, D);
    addSub(diaria, D, 'x');
    expect(meta(diaria).subs).toBeUndefined();
    expect(aceptaSubs(meta(diaria))).toBe(false);
    expect(aceptaSubs({ ...meta(id), auto: { kind: 'tests' } })).toBe(false);
  });
});

describe('ola 18: submetas en pantalla', () => {
  it('Metas: "+ Agregar submeta" abre la hoja, agrega y la meta muestra "1/1"', () => {
    const id = addGoal({ title: 'Mudanza', area: 'rutina', horizon: 'semana', type: 'tarea', target: 1 }, D);
    const { rerender } = render(<ul><GoalRow g={meta(id)} date={D} /></ul>);
    fireEvent.click(screen.getByRole('button', { name: 'Agregar submeta a Mudanza' }));
    const hoja = screen.getByRole('dialog');
    fireEvent.change(within(hoja).getByLabelText('Nombre de la submeta'), { target: { value: 'Cajas' } });
    fireEvent.click(within(hoja).getByRole('button', { name: 'Agregar y cerrar' }));
    rerender(<ul><GoalRow g={meta(id)} date={D} /></ul>);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByRole('checkbox', { name: 'Cajas' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Agregar submeta a Mudanza' })).toHaveTextContent('+ Submeta');
    expect(meta(id).target).toBe(1);
  });

  it('Metas: una meta automática no ofrece submetas', () => {
    const id = addGoal({ title: 'Mudanza', area: 'rutina', horizon: 'semana', type: 'tarea', target: 1 }, D);
    render(<ul><GoalRow g={{ ...meta(id), auto: { kind: 'tests' } }} date={D} /></ul>);
    expect(screen.queryByRole('button', { name: /Agregar submeta/ })).toBeNull();
  });

  it('Hoy: la meta numerada abierta suma "+ Agregar submeta" y la tarea aparece en la lista', () => {
    render(<Hoy day={getState().days[D]} />);
    const antes = getState().days[D].blocks.find((b) => b.key === 'prog')!.tasks.length;
    fireEvent.click(screen.getByRole('button', { name: /^Agregar submeta a Programación/ }));
    const hoja = screen.getByRole('dialog');
    fireEvent.change(within(hoja).getByLabelText('Nombre de la submeta'), { target: { value: 'Repasar el diff' } });
    act(() => { fireEvent.click(within(hoja).getByRole('button', { name: 'Agregar y cerrar' })); });
    const tareas = getState().days[D].blocks.find((b) => b.key === 'prog')!.tasks;
    expect(tareas).toHaveLength(antes + 1);
    expect(tareas[tareas.length - 1]).toMatchObject({ t: 'Repasar el diff', done: false });
  });
});
