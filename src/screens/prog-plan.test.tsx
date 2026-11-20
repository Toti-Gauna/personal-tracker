import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { avanceSalida, salidaDe } from '../data/plan-vistas';
import { PLAN_EXT } from '../data/plan-extendido';
import { activitiesFor, dueReview } from '../data/study';
import { agregarMetaBloque, agregarSubBloque } from '../state/metas-bloque';
import { tildarSalida } from '../state/plan';
import { getState, migrate, register, resetState, startDay } from '../state/store';
import { completeLearn } from '../state/study';
import { Estudio } from './Estudio';
import { ProgPlan } from './ProgPlan';

const D = '2026-11-17';
const day = () => ({ date: D, wake: '04:00', routine: 'completo' as const, blocks: [], notes: [], focus: [] });

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 10, 17, 7, 0));
  resetState();
  register('Toti', 'Abi', '2026-11-16');
});
afterEach(() => vi.useRealTimers());

describe('nivel de salida de las 12 ventanas', () => {
  it('cada ventana tiene sus criterios; W1 pide ecuaciones, gráficos y varianza, percentiles y cuantiles', () => {
    const ventanas = PLAN_EXT.bloques.filter((b) => b.tipo === 'ventana');
    expect(ventanas).toHaveLength(12);
    for (const v of ventanas) expect(salidaDe(v.id).length).toBeGreaterThanOrEqual(3);
    expect(salidaDe('W1').join(' · ')).toMatch(/ecuaciones y desigualdades.*Graficar funciones.*varianza, desvío, percentiles y cuantiles/);
  });

  it('los criterios se tildan y se destildan', () => {
    tildarSalida('W1', 0);
    tildarSalida('W1', 2);
    expect(avanceSalida(getState().plan, 'W1')).toEqual({ hechos: 2, total: 4, completo: false });
    tildarSalida('W1', 1);
    tildarSalida('W1', 3);
    expect(avanceSalida(getState().plan, 'W1').completo).toBe(true);
    tildarSalida('W1', 1);
    expect(avanceSalida(getState().plan, 'W1').hechos).toBe(3);
  });
});

describe('programación por proyectos', () => {
  it('"Python y FastAPI" queda archivada: no entra al día, pero sus repasos siguen', () => {
    expect(getState().study.activities.find((a) => a.id === 'prog-b1')).toMatchObject({ archivada: true });
    expect(activitiesFor(getState().study, D).some((a) => a.id === 'prog-b1')).toBe(false);
    // Un estado viejo (sin archivar) la archiva al migrar, sin perder lo estudiado.
    const viejo = structuredClone(getState()) as unknown as { study: { activities: { id: string; archivada?: boolean }[] } };
    viejo.study.activities = viejo.study.activities.map((a) => (a.id === 'prog-b1' ? { ...a, archivada: undefined } : a));
    expect(migrate(viejo).study.activities.find((a) => a.id === 'prog-b1')!.archivada).toBe(true);
    getState().study.activities = getState().study.activities.map((a) => (a.id === 'prog-b1' ? { ...a, archivada: false } : a));
    completeLearn('2026-11-16', 'prog-b1', 1);
    getState().study.activities = getState().study.activities.map((a) => (a.id === 'prog-b1' ? { ...a, archivada: true } : a));
    expect(dueReview(getState().study.reviews, D).cold.some((r) => r.activityId === 'prog-b1')).toBe(true);
  });

  it('la meta de programación de Hoy suma lo pendiente del proyecto en curso (P0)', () => {
    agregarMetaBloque('P0', 'Portfolio hub con mapa 3D');
    agregarSubBloque('P0', getState().plan.metasBloque!.P0[0].id, 'proyectos.json validado');
    agregarMetaBloque('P0', 'Trazo publicado');
    startDay('completo', '04:00', D);
    const prog = getState().days[D].blocks.find((b) => b.key === 'prog')!;
    expect(prog.tasks.slice(0, 2).map((t) => t.t)).toEqual(['P0 · Portfolio hub con mapa 3D: proyectos.json validado', 'P0 · Trazo publicado']);
  });

  it('Estudio muestra la card de Programación con "Estás acá" en P0', () => {
    startDay('completo', '04:00', D);
    render(<Estudio day={getState().days[D]} />);
    const card = screen.getByRole('link', { name: /Programación/ });
    expect(card).toHaveAttribute('href', '#/estudio/prog');
    expect(card).toHaveTextContent('P0 · Constelación');
  });

  it('el roadmap: estás acá, hoy sos → vas a ser y la escalera de P0 a A7 por etapas', () => {
    render(<ProgPlan day={day()} param="prog" />);
    expect(screen.getByRole('heading', { name: 'Programación' })).toBeInTheDocument();
    expect(screen.getByText('Recién empezás')).toBeInTheDocument();
    const ids = [...document.querySelectorAll('.esc-lista a')].map((a) => a.getAttribute('href')!.split('/').pop());
    // Ola 22: solo la etapa en curso viene abierta; las otras, plegadas.
    expect([...document.querySelectorAll('.esc details')].map((d) => (d as HTMLDetailsElement).open)).toEqual([true, false, false, false]);
    expect(ids[0]).toBe('P0');
    expect(ids).toContain('A7');
    expect(ids).toContain('W1');
    expect(ids.some((x) => x?.startsWith('DES'))).toBe(false);
    expect(screen.getByText('Etapa 4 · aeroespacial')).toBeInTheDocument();
  });

  it('cada proyecto tiene sus subpáginas con botones: Resumen, Stack, Metas, Evidencia, Pieza matemática y Entrega', () => {
    const { unmount } = render(<ProgPlan day={day()} param="prog/P3" />);
    const nav = screen.getByRole('navigation', { name: 'Secciones de P3' });
    expect(within(nav).getAllByRole('link').map((a) => a.textContent)).toEqual(['Stack y tecnología nueva', 'Metas', 'Evidencia', 'Pieza matemática', 'Entrega']);
    expect(screen.getByText(/Antes va la ventana/)).toBeInTheDocument();
    unmount();
    // Pieza matemática de P3: la ventana W1 con su nivel de salida para tildar.
    render(<ProgPlan day={day()} param="prog/P3/pieza" />);
    const salida = screen.getByRole('region', { name: 'Nivel de salida de W1' });
    fireEvent.click(within(salida).getAllByRole('checkbox')[0]);
    expect(getState().plan.salida?.W1).toEqual([0]);
  });

  it('la subpágina Metas usa las metas del bloque', () => {
    render(<ProgPlan day={day()} param="prog/P0/metas" />);
    expect(screen.getByRole('heading', { name: 'Metas' })).toBeInTheDocument();
    expect(screen.getByText(/En P0 se arman las metas/)).toBeInTheDocument();
  });
});
