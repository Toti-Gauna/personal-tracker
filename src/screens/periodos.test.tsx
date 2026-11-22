import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { claveHito } from '../data/periodos-plan';
import { tramoActivo } from '../data/plan';
import { marcarHito } from '../state/plan';
import { getState, register, resetState, startDay } from '../state/store';
import { Hoy } from './Hoy';
import { Metas } from './Metas';

const D = '2026-11-23';
const dia = (d = D) => { startDay('completo', '04:00', d); return getState().days[d]; };

beforeEach(() => {
  localStorage.clear();
  resetState();
  register('Toti', 'Abi', '2026-11-16');
});

describe('v12.1 · metas como períodos', () => {
  it('Períodos: lo activo ahora, P0 con sus metas de siempre, las 4 etapas y las fases de la actual, y la semana', () => {
    render(<Metas day={dia()} tab="periodos" />);
    const ahora = screen.getByRole('region', { name: 'Lo del plan para hoy' });
    // 1.1 y 1.2 estimaban el 22: hoy toca el 1.3 (y vencen los que tienen fecha límite hoy).
    expect(ahora.textContent).toMatch(/Activo ahora: Fase 1 › PetrIA › v1\.0 › lote 1\.3/);
    expect(ahora.textContent).toMatch(/Vence hoy: Lote 1\.1 · Ingest & cleaning · Lote 1\.2/);
    expect(ahora.textContent).toMatch(/Próxima fecha límite: v1\.0 MVP · 1 dic \(en 8 días\)/);
    expect(screen.getByRole('link', { name: /P0 · Constelación v1: tus metas de siempre/ })).toHaveAttribute('href', '#/metas/proyecto/P0');
    // v12.2: "Todas" muestra las tres pistas; con "Principal", solo las 4 etapas y las 6 fases de la etapa 1.
    expect(within(screen.getByRole('region', { name: 'Pista secundaria' })).getAllByRole('article')).toHaveLength(4);
    expect(within(screen.getByRole('region', { name: 'Pista comercial' })).getAllByRole('article').length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('radio', { name: 'Principal' }));
    expect(screen.queryByRole('region', { name: 'Pista secundaria' })).toBeNull();
    const tarjetas = screen.getAllByRole('article').map((a) => a.getAttribute('aria-label')!.split(':')[0]);
    expect(tarjetas).toHaveLength(4 + 6);
    expect(tarjetas.slice(0, 3)).toEqual(['Etapa 1 · Núcleo', 'Fase 1 · AI Full-stack Engineer', 'Fase 2 · ML Engineer']);
    expect(screen.getByRole('article', { name: /^Etapa 1 · Núcleo: en plan, tiempo 1 %, trabajo/ })).toBeInTheDocument();
    const sem = screen.getByText('Esta semana').closest('section')!;
    expect(within(sem).getAllByRole('listitem')).toHaveLength(7);
    expect(within(sem).getByText(/mar 24/).closest('li')!.textContent).toMatch(/LinkedIn post/);
  });

  it('bajar a PetrIA: estimado y fecha límite, sus 4 versiones; tildar un lote suma trabajo', () => {
    render(<Metas day={dia()} tab="periodos/P1" />);
    const p1 = screen.getByRole('article', { name: /^PetrIA:/ });
    expect(p1.textContent).toMatch(/Bloque · 21 nov – 9 dic · límite 5 ene 2027/);
    expect(p1.textContent).toMatch(/estimado 9 dic.*límite 5 ene 2027/);
    expect(p1.textContent).toMatch(/plan 193,5 h · real 0 h/);
    expect(screen.getByRole('link', { name: 'La ficha de PetrIA' })).toBeInTheDocument();
    expect(screen.getAllByRole('article').slice(1).map((a) => a.getAttribute('aria-label')!.split(':')[0])).toEqual(['v1.0 MVP', 'v1.1 Producto', 'v2.0 Plataforma', 'v3.0 Producción']);
  });

  it('un lote se tilda desde su versión, y la fase muestra salida, mercado y roles', () => {
    const { unmount } = render(<Metas day={dia()} tab={`periodos/${encodeURIComponent('P1:v1.0')}`} />);
    fireEvent.click(screen.getByRole('checkbox', { name: 'Lote 0.0 · Onboarding: marcar hecho' }));
    expect(getState().plan.hitos[claveHito.lote('P1', '0.0')]).toEqual({ hecho: D });
    expect(screen.getByRole('article', { name: /^Lote 0\.0 · Onboarding: hecho/ })).toBeInTheDocument();
    unmount();
    render(<Metas day={getState().days[D]} tab="periodos/F1" />);
    expect(screen.getByText('Para cerrarla').nextElementSibling!.textContent).toMatch(/PetrIA in production \(4 versions\)/);
    expect(screen.getByText(/Salís al mercado con/).nextElementSibling!.textContent).toMatch(/PetrIA · Claude Architect/);
  });

  it('un bloque vencido sugiere correr lo que sigue; nada cambia hasta confirmar; se puede volver al plan', () => {
    const d = dia('2026-12-12');
    render(<Metas day={d} tab="periodos/P1" />);
    const sug = screen.getByRole('region', { name: /Va atrasado: al ritmo del plan termina el/ });
    // Vencido el 9 dic con el trabajo en 0, al ritmo del plan; el plan v12.1 es continuo, así que se corre todo lo que sigue.
    expect(sug.textContent).toMatch(/termina el 30 dic \(21 días más\)/);
    expect(sug.textContent).toMatch(/PetrIA · 21 nov – 9 dic → 21 nov – 30 dic/);
    expect(sug.textContent).toMatch(/Cert window 1 · 10 dic – 13 dic → 31 dic – 3 ene 2027/);
    expect(within(sug).getAllByRole('checkbox')).toHaveLength(6);
    fireEvent.click(within(sug).getByRole('button', { name: /^Ver los \d+ siguientes$/ }));
    expect(within(sug).getAllByRole('checkbox').length).toBeGreaterThan(6);
    expect(tramoActivo('2026-12-12').id).toBe('CW1');
    fireEvent.click(within(sug).getByRole('checkbox', { name: 'Correr English E#1' }));
    fireEvent.click(within(sug).getByRole('button', { name: /^Confirmar \d+ cambios$/ }));
    const c = getState().plan.corrimientos!;
    expect(Object.keys(c)).toContain('P1');
    expect(Object.keys(c)).not.toContain('E1');
    expect(c.CW1).toMatchObject({ inicio: '2026-12-31', fin: '2027-01-03', confirmado: '2026-12-12' });
    expect(tramoActivo('2026-12-12').id).toBe('P1');
    fireEvent.click(screen.getByRole('button', { name: 'Volver a las fechas del plan' }));
    expect(getState().plan.corrimientos!.P1).toBeUndefined();
  });
});

describe('v12.1 · certificación, ventana, línea de tiempo y Hoy', () => {
  it('Claude Architect: el plan del día, reservar (fija), simulacros contra el 85 % y aprobada con la renovación a verificar', () => {
    render(<Metas day={dia('2026-12-11')} tab="cert/claude-architect" />);
    expect(screen.getByText(/Weak spots \+ mock ← hoy/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Reservé para esa fecha' }));
    expect(getState().plan.reservas!['claude-architect']).toEqual({ examen: '2026-12-12', reservado: '2026-12-11' });
    expect(screen.getByText(/reservado el 11 dic \(fecha fija: nada la corre\)/)).toBeInTheDocument();
    fireEvent.change(screen.getByRole('textbox', { name: 'Puntaje del simulacro' }), { target: { value: '78' } });
    fireEvent.click(screen.getByRole('button', { name: 'Cargar simulacro' }));
    expect(screen.getByText(/faltan 7 puntos/)).toBeInTheDocument();
    fireEvent.change(screen.getByRole('textbox', { name: 'Puntaje del simulacro' }), { target: { value: '88' } });
    fireEvent.click(screen.getByRole('button', { name: 'Cargar simulacro' }));
    expect(screen.getByText(/· listo/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Claude Certified Architect – Foundations: aprobada' }));
    expect(screen.getByText(/validity to verify/)).toBeInTheDocument();
  });

  it('W1: no se cierra con hitos sin tildar; con todos, sí', () => {
    render(<Metas day={dia('2027-01-20')} tab="ventana/W1" />);
    const cerrar = screen.getByRole('button', { name: /Cerrar la ventana \(faltan \d+ hitos\)/ });
    expect(cerrar).toBeDisabled();
    expect(screen.getAllByText(/Conamat · (Aritmética|Álgebra), capítulos/).length).toBeGreaterThan(0);
    for (const c of screen.getAllByRole('checkbox')) fireEvent.click(c);
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar la ventana' }));
    expect(getState().plan.hitos[claveHito.bloque('W1')]).toEqual({ hecho: '2027-01-20' });
    expect(screen.getByText(/Ventana cerrada el/)).toBeInTheDocument();
  });

  it('Línea de tiempo: tres pistas (11 fases, secundaria y comercial), cada bloque con su enlace, hoy marcado', () => {
    const { container } = render(<Metas day={dia()} tab="linea" />);
    // v12.2: las 11 fases y las dos pistas de fondo (secundaria y comercial) en el mismo eje.
    expect(container.querySelectorAll('.gantt-fila')).toHaveLength(13);
    expect(container.querySelectorAll('.gantt-fila.fondo .gantt-b.secundaria')).toHaveLength(12);
    expect(container.querySelectorAll('.gantt-fila.fondo .gantt-b.comercial')).toHaveLength(23);
    expect(container.querySelector('.gantt-hoy')).not.toBeNull();
    expect(container.querySelector('a.gantt-b[href="#/metas/periodos/P1"]')!.getAttribute('title')).toMatch(/P1 · PetrIA · 21 nov – 9 dic/);
    expect(container.querySelectorAll('.gantt-pausa').length).toBeGreaterThan(0);
  });

  it('Hoy: lo activo, el aviso de reserva y los hábitos con su racha', () => {
    marcarHito('x', null);
    render(<Hoy day={dia('2026-11-21')} />);
    const ahora = screen.getByRole('region', { name: 'Lo del plan para hoy' });
    expect(ahora.textContent).toMatch(/Activo ahora: Fase 1 › PetrIA › v1\.0 › lote 0\.0/);
    expect(ahora.textContent).toMatch(/Reservar: Book Claude Architect \+ GitHub Foundations exams \(faltan 2\)/);
    expect(ahora.textContent).toMatch(/Hardware: /);
    expect(within(ahora).getByRole('list', { name: 'Hábitos' }).textContent).toMatch(/Trazo recall.*Anki.*LinkedIn post.*Weekly demo.*Weekly review/);
  });
});
