import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { getState, register, resetState, startDay } from '../state/store';
import { Estudio } from './Estudio';
import { ProgPlan } from './ProgPlan';

const day = () => getState().days['2026-11-18'];

beforeEach(() => {
  localStorage.clear();
  resetState();
  register('Toti', 'Abi', '2026-11-16');
  startDay('completo', '04:00', '2026-11-18');
});

describe('ola 26 · pantallas de tecnologías y demanda', () => {
  it('Demanda: arranca vacía; al pegar texto la tabla se arma con proyecto y fecha; deshacer la vacía', () => {
    render(<ProgPlan day={day()} param="prog/demanda" />);
    expect(screen.getByText(/no hay nada que contar/)).toBeInTheDocument();
    expect(screen.queryByRole('table')).toBeNull();
    fireEvent.change(screen.getByLabelText(/Pegá el texto de una vacante/), { target: { value: 'AI Engineer · X\nStack: Python, LangGraph, Elixir\n---\nBackend\nLangGraph y Docker' } });
    fireEvent.click(screen.getByRole('button', { name: 'Cargar' }));
    expect(getState().plan.vacantes).toHaveLength(2);
    const tabla = screen.getAllByRole('table')[0];
    const filas = within(tabla).getAllByRole('row').slice(1);
    expect(filas[0].textContent).toMatch(/LangGraph.*2.*P1.*9 dic 2026/);
    expect(within(tabla).getByText('Elixir').closest('tr')!.textContent).toMatch(/sin proyecto/);
  });

  it('Demanda: un JSON con error lo dice y no carga nada; un JSON válido carga', () => {
    render(<ProgPlan day={day()} param="prog/demanda" />);
    const campo = screen.getByLabelText(/Pegá el texto de una vacante/);
    fireEvent.change(campo, { target: { value: '[{"rol":"A","stack":"Python"}]' } });
    fireEvent.click(screen.getByRole('button', { name: 'Cargar' }));
    expect(screen.getByRole('alert').textContent).toMatch(/vacante 1: "stack" tiene que ser una lista/);
    expect(getState().plan.vacantes ?? []).toHaveLength(0);
    fireEvent.change(campo, { target: { value: '{"tipo":"vacantes","lista":[{"rol":"ML","stack":["k8s"]}]}' } });
    fireEvent.click(screen.getByRole('button', { name: 'Cargar' }));
    expect(getState().plan.vacantes![0]).toMatchObject({ rol: 'ML', stack: ['Kubernetes'] });
  });

  it('Demanda: lista las vacantes cargadas (con borrar) y lo descartado por ahora con su motivo', () => {
    render(<ProgPlan day={day()} param="prog/demanda" />);
    const abrir = (t: string) => { const d = [...document.querySelectorAll('details.plegable')].find((x) => x.querySelector('summary b')?.textContent === t) as HTMLDetailsElement; d.open = true; fireEvent(d, new Event('toggle')); return d; };
    const desc = abrir('Descartado por ahora');
    for (const n of ['Django', 'Supabase', 'CRM/ERP', 'APIs de bolsa']) expect(within(desc).getByText(n)).toBeInTheDocument();
    expect(within(desc).getByText(/El backend Python ya lo cubre FastAPI/)).toBeInTheDocument();
  });

  it('el stack de un proyecto (v7) va por ambiente, con la † como propuesta y las tecnologías que cuenta la demanda; sin recortes', () => {
    const { unmount } = render(<ProgPlan day={day()} param="prog/P1/stack" />);
    const stack = document.querySelector('.pp-stack')!;
    expect([...stack.querySelectorAll('dt')].map((x) => x.textContent)).toEqual(['Frontend', 'Backend', 'IA por API', 'ML propio', 'DB', 'Infra', 'Cloud']);
    expect(within(stack as HTMLElement).getByText(/Java \+ Spring Boot/)).toBeInTheDocument();
    expect(screen.getByText('LightGBM †')).toBeInTheDocument();
    expect(screen.queryByText(/se recorta primero:/)).toBeNull();
    expect(screen.getByText('Historial de cambios')).toBeInTheDocument();
    unmount();
    // A6 (Upstream) no tiene stack propio: "el de cada proyecto".
    render(<ProgPlan day={day()} param="prog/A6/stack" />);
    expect(screen.getByText(/Este bloque no suma tecnología nueva/)).toBeInTheDocument();
  });

  it('Estudio → Programación tiene el acceso a la Demanda', () => {
    render(<ProgPlan day={day()} param="prog" />);
    expect(screen.getByRole('link', { name: /Demanda: lo que piden las vacantes/ })).toHaveAttribute('href', '#/estudio/prog/demanda');
    expect(Estudio).toBeTypeOf('function');
  });
});
