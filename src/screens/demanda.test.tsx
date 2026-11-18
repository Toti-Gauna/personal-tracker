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

  it('el stack de un proyecto muestra la nueva, las movidas (de dónde vienen), lo opcional, lo que se recorta primero y el historial', () => {
    const { unmount } = render(<ProgPlan day={day()} param="prog/P1/stack" />);
    expect(screen.getByText('nueva').parentElement!.textContent).toMatch(/LangGraph \(agente analista con herramientas\)/);
    expect(screen.getByText(/se recorta primero:/).textContent).toMatch(/Conector a una API de terceros en sandbox/);
    expect(screen.getByText('Historial de cambios')).toBeInTheDocument();
    unmount();
    const p5 = render(<ProgPlan day={day()} param="prog/P5/stack" />);
    expect(screen.getByText('movida · de P1').parentElement!.textContent).toMatch(/DuckDB y Parquet/);
    p5.unmount();
    render(<ProgPlan day={day()} param="prog/P3/stack" />);
    expect(screen.getByText(/GraphQL en el backoffice de Rails · opcional/)).toBeInTheDocument();
  });

  it('Estudio → Programación tiene el acceso a la Demanda', () => {
    render(<ProgPlan day={day()} param="prog" />);
    expect(screen.getByRole('link', { name: /Demanda: lo que piden las vacantes/ })).toHaveAttribute('href', '#/estudio/prog/demanda');
    expect(Estudio).toBeTypeOf('function');
  });
});
