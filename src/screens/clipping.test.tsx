import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { getState, register, resetState, startDay } from '../state/store';
import { guardarCampana, guardarCuenta, registrarClips } from '../state/clipping';
import { Metas } from './Metas';

const day = () => getState().days['2026-11-20'];

beforeEach(() => {
  localStorage.clear();
  resetState();
  register('Toti', 'Abi', '2026-11-16');
  startDay('completo', '04:00', '2026-11-20');
});

describe('ola 23 · el apartado Clipping en Metas', () => {
  it('la Ruta tiene la card de Clipping con el mes y la meta', () => {
    render(<Metas day={day()} tab="ruta" />);
    const card = screen.getByRole('link', { name: /Clipping/ });
    expect(card).toHaveAttribute('href', '#/metas/clipping');
    expect(card.textContent).toMatch(/mes 1 de 12 · fase 1/);
    expect(card.textContent).toMatch(/USD 150/);
  });

  it('vacío: la portada guía a la primera campaña y muestra la compuerta gris', () => {
    render(<Metas day={day()} tab="clipping" />);
    expect(screen.getByRole('heading', { name: 'Clipping', level: 1 })).toBeInTheDocument();
    expect(screen.getByText(/Mes 1 de 12 · fase 1/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Cargá tu primera campaña' })).toHaveAttribute('href', '#/metas/clipping/campanas');
    expect(screen.getByText('Compuerta a la fase 2')).toBeInTheDocument();
    expect(screen.getByText('Sin datos')).toBeInTheDocument();
    // Semana 1 se ve en el mes 1.
    expect(screen.getAllByRole('link', { name: /Semana 1/ }).length).toBeGreaterThan(0);
  });

  it('con datos: lo cobrado en grande, los 4 indicadores y la proyección', () => {
    const k = guardarCampana({ nombre: 'GTA 6', plataforma: 'Whop', nicho: 'Videojuegos', tarifa: 1.2, estado: 'activa', desde: '2026-11-18' });
    guardarCuenta({ alias: 'gta.cortes', red: 'TikTok', nicho: 'Videojuegos', estado: 'activa', desde: '2026-11-17' });
    registrarClips({ fecha: '2026-11-19', campana: k, clips: 5, views: 40000, mas1000: 3, aprobados: 5, cobrado: 36 });
    render(<Metas day={day()} tab="clipping" />);
    expect(screen.getByLabelText('USD 36 cobrados este mes')).toBeInTheDocument();
    const ind = screen.getByRole('list', { name: 'Indicadores del mes' });
    expect(within(ind).getAllByRole('listitem')).toHaveLength(4);
    expect(ind.textContent).toContain('0,90');
    expect(ind.textContent).toContain('100 %');
    expect(screen.getByText(/Con tu ritmo, el mes 12 cierra en/)).toBeInTheDocument();
    expect(screen.getByText('Verde')).toBeInTheDocument();
  });

  it('Registrar: la hoja carga en 3 toques, recuerda la campaña y deja Deshacer', () => {
    const k = guardarCampana({ nombre: 'Podcast X', plataforma: 'Vyro', nicho: 'Podcasts', tarifa: 1, estado: 'activa', desde: '2026-11-18' });
    registrarClips({ fecha: '2026-11-18', campana: k, clips: 1, views: 1 });
    render(<Metas day={day()} tab="clipping/registro" />);
    fireEvent.click(screen.getByRole('button', { name: /Registrar/ }));
    const dlg = screen.getByRole('dialog');
    expect((within(dlg).getByLabelText('Campaña') as HTMLSelectElement).value).toBe(k);
    fireEvent.change(within(dlg).getByLabelText('Clips'), { target: { value: '5' } });
    fireEvent.change(within(dlg).getByLabelText('Views'), { target: { value: '12.000' } });
    fireEvent.click(within(dlg).getByRole('button', { name: 'Guardar' }));
    const r = getState().clipping.registro;
    expect(r).toHaveLength(2);
    expect(r[1]).toMatchObject({ fecha: '2026-11-20', clips: 5, views: 12000, campana: k });
    expect(screen.getByText(/2 filas · 6 clips/)).toBeInTheDocument();
  });

  it('Plan: tres fases, solo la del mes en curso abierta y el mes 1 marcado', () => {
    render(<Metas day={day()} tab="clipping/plan" />);
    const fases = [...document.querySelectorAll('details.plegable')].filter((d) => d.querySelector('.pleg-k')?.textContent?.startsWith('fase')) as HTMLDetailsElement[];
    expect(fases.map((d) => d.open)).toEqual([true, false, false]);
    expect(document.querySelector('.clip-meses li[aria-current="step"]')?.textContent).toContain('Aprender haciendo');
  });

  it('Métricas: selector de período y los gráficos con su tabla para lector de pantalla', () => {
    registrarClips({ fecha: '2026-11-19', clips: 5, views: 40000, cobrado: 36 });
    render(<Metas day={day()} tab="clipping/metricas" />);
    expect(screen.getByRole('radio', { name: '30 días' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('img', { name: /Ingreso mensual/ })).toBeInTheDocument();
    expect(screen.getByText('Ingreso por mes del roadmap (USD)')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('radio', { name: 'Todo' }));
    expect(screen.getByRole('radio', { name: 'Todo' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByText(/base mes 13 · optimista mes 10 · conservador no llega/)).toBeInTheDocument();
  });

  it('Riesgos y rutina: la rutina semanal se tilda y queda en la semana', () => {
    render(<Metas day={day()} tab="clipping/riesgos" />);
    const viernes = screen.getByRole('checkbox', { name: /Viernes · decidir/ });
    expect(viernes.textContent).toContain('hoy');
    fireEvent.click(viernes);
    expect(getState().clipping.rutina['2026-11-16']).toEqual(['viernes']);
    expect(screen.getByText(/consultar con un contador/)).toBeInTheDocument();
  });

  it('Semana 1 se oculta después del mes 1 y la ruta vuelve al resumen', () => {
    startDay('completo', '04:00', '2027-01-05');
    render(<Metas day={getState().days['2027-01-05']} tab="clipping/semana1" />);
    expect(screen.queryByRole('link', { name: /Semana 1/ })).toBeNull();
    expect(screen.getByText(/Mes 2 de 12 · fase 1/)).toBeInTheDocument();
  });
});
