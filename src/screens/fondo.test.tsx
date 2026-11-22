import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { getState, register, resetState, startDay } from '../state/store';
import { Hoy } from './Hoy';
import { Metas } from './Metas';

const dia = (d: string) => { startDay('completo', '04:00', d); return getState().days[d]; };
beforeEach(() => { localStorage.clear(); resetState(); register('Toti', 'Abi', '2026-11-16'); location.hash = ''; });

describe('v12.2 · pistas de fondo', () => {
  it('pista secundaria: las 4 apps en secuencia y el backlog "Ver a futuro"; comercial: los 23 slots en el pipeline', () => {
    const { unmount } = render(<Metas day={dia('2026-11-28')} tab="pista/secundaria" />);
    expect(screen.getAllByRole('article').map((a) => a.getAttribute('aria-label')!.split(':')[0])).toEqual(['HandyX', 'JulIA', 'Clip Studio', 'Roofy']);
    expect(screen.getByText(/Agentes para pymes ⭐/)).toBeInTheDocument();
    unmount();
    render(<Metas day={dia('2026-11-28')} tab="pista/comercial" />);
    expect(within(screen.getByRole('region', { name: 'planificado' })).getAllByRole('listitem')).toHaveLength(23);
    expect(screen.getByRole('link', { name: /Aquasol and water parks/ })).toHaveAttribute('href', '#/metas/fondo/com-1');
    expect(screen.getAllByText('A definir: elegí la marca')).toHaveLength(9);
  });

  it('HandyX: la v1.0 toca plata y no se publica sin la revisión en primer plano; la v3.0 es el lanzamiento y pide el Imán', () => {
    render(<Metas day={dia('2026-12-17')} tab="fondo/handyx" />);
    const alertas = screen.getAllByRole('alert').map((a) => a.textContent);
    expect(alertas[0]).toMatch(/Para publicar la v1\.0 falta: Revisión en primer plano/);
    fireEvent.click(screen.getByRole('checkbox', { name: 'v1.0: revisión en primer plano hecha' }));
    fireEvent.click(screen.getByRole('button', { name: 'v1.0 publicada hoy' }));
    expect(getState().plan.fondo!.handyx.versiones!['1.0']).toEqual({ foreground: '2026-12-17', publicada: '2026-12-17' });
    expect(screen.getByText(/Publicada el 17 dic/)).toBeInTheDocument();
    // La v2.0 no toca nada sensible: se publica sin más.
    expect(screen.getByRole('button', { name: 'v2.0 publicada hoy' })).toBeInTheDocument();
    // La v3.0: revisión en primer plano y los 8 puntos del Imán.
    expect(screen.getAllByRole('alert').map((a) => a.textContent).join(' ')).toMatch(/v3\.0 falta: Revisión en primer plano.*Imán 1 · Gancho/);
    expect(screen.getByText(/cripto solo en testnet/i)).toBeInTheDocument();
  });

  it('Imán: los 8 puntos con los pasos 1 a 3 de la serie destraban el lanzamiento', () => {
    const { unmount } = render(<Metas day={dia('2027-02-03')} tab="iman/handyx" />);
    const llenar = (label: string, v: string) => { const i = screen.getByRole('textbox', { name: label }); fireEvent.change(i, { target: { value: v } }); fireEvent.blur(i); };
    llenar('1 · Gancho de una línea', 'Pedí un plomero con una foto');
    llenar('2 · Video de 30 s (wow en los primeros 3 s)', 'https://youtu.be/x');
    llenar('3 · Demo pública sin registro', 'https://handyx.app');
    llenar('4 · Métrica: el valor', 'presupuesto en 9 s');
    llenar('4 · Métrica: cómo se midió', '30 pedidos cronometrados');
    llenar('5 · Noticia: link', 'https://news.example/oficios');
    llenar('5 · Noticia: una línea', 'faltan oficios en MDQ');
    for (const n of ['README', 'ADRs', 'Tests']) fireEvent.click(screen.getByRole('checkbox', { name: `6 · ${n}` }));
    llenar('7 · Empresas objetivo (separadas por coma)', 'Uber, Rappi');
    for (const p of ['Teaser', 'Build', 'Launch']) fireEvent.click(screen.getByRole('button', { name: `Post ${p} hecho hoy` }));
    expect(screen.getByText('8 de 8')).toBeInTheDocument();
    expect(getState().plan.posts).toHaveLength(3);
    expect(screen.getByRole('button', { name: 'Post Deep dive hecho hoy' })).toBeInTheDocument(); // queda para después
    unmount();
    render(<Metas day={getState().days['2027-02-03']} tab="fondo/handyx" />);
    fireEvent.click(screen.getByRole('checkbox', { name: 'v3.0: revisión en primer plano hecha' }));
    expect(screen.getByRole('button', { name: 'v3.0 publicada hoy' })).toBeInTheDocument();
  });

  it('comercial: no se publica sin el Imán y el checklist de seguridad; los leads se suman', () => {
    render(<Metas day={dia('2026-12-12')} tab="fondo/com-1" />);
    expect(screen.getByRole('radio', { name: 'publicado' })).toBeDisabled();
    expect(screen.getByText(/Checklist de seguridad del showcase/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('radio', { name: 'en construcción' }));
    expect(getState().plan.fondo!['com-1'].estado).toBe('building');
    fireEvent.click(screen.getByRole('checkbox', { name: /Etiqueta visible/ }));
    expect(getState().plan.seguridadShowcase!['com-1']).toEqual([true]);
    fireEvent.change(screen.getByRole('textbox', { name: 'Nuevo lead' }), { target: { value: 'Aquasol MDQ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sumar lead' }));
    expect(screen.getByText(/Leads freelance · 1/)).toBeInTheDocument();
  });

  it('el lanzamiento principal (PetrIA v3.0) no se marca publicado sin el Imán', () => {
    render(<Metas day={dia('2026-12-09')} tab="periodos/P1" />);
    expect(screen.getByRole('article', { name: /^v3\.0 Producción/ }).textContent).toMatch(/Lanzamiento: se publica con el Imán completo \(faltan 8\)/);
    fireEvent.click(screen.getByRole('checkbox', { name: 'v3.0 Producción: marcar publicada' }));
    expect(getState().plan.versiones?.P1?.['3.0']).toBeUndefined();
    expect(location.hash).toBe('#/metas/iman/P1');
    // Las versiones de antes se publican sin el Imán.
    fireEvent.click(screen.getByRole('checkbox', { name: 'v1.0 MVP: marcar publicada' }));
    expect(getState().plan.versiones!.P1['1.0'].publicada).toBe('2026-12-09');
    expect(screen.getByRole('region', { name: 'Detalle del proyecto' }).textContent).toMatch(/Full-stack AI Engineer \(energía\)/);
  });

  it('el plan entero: cada bloque con su línea de fondo; el PNPT pausa lo de fondo', () => {
    render(<Metas day={dia('2026-11-28')} tab="roadmap" />);
    expect(screen.getByText(/Fondo: HandyX v1\.0, HandyX v2\.0 · comercial: #1 Aquasol and water parks/)).toBeInTheDocument();
    expect(screen.getByText('Fondo: en pausa (PNPT)')).toBeInTheDocument();
    expect(screen.getAllByText(/secundaria libre/).length).toBeGreaterThan(10);
  });
});

describe('v12.2 · revisión del domingo, Hoy y papers', () => {
  it('uso de Claude sobre el umbral: sugiere pausar lo comercial y después lo secundario; pausar es a mano', () => {
    render(<Metas day={dia('2026-12-13')} tab="revision" />);
    const uso = screen.getByRole('textbox', { name: 'Uso de Claude esta semana' });
    fireEvent.change(uso, { target: { value: '91' } });
    fireEvent.blur(uso);
    const sug = screen.getAllByRole('alert').find((a) => /Claude al 91 %/.test(a.textContent ?? ''))!;
    const botones = within(sug).getAllByRole('button').map((b) => b.textContent);
    expect(botones[0]).toMatch(/Pausar #1 · Aquasol and water parks \(comercial\)/);
    expect(botones[1]).toMatch(/Pausar HandyX v1\.0 \(secundaria\)/);
    expect(getState().plan.fondo?.['com-1']?.pausado).toBeUndefined();
    fireEvent.click(within(sug).getAllByRole('button')[0]);
    expect(getState().plan.fondo!['com-1'].pausado).toBe('2026-12-13');
  });

  it('tiempo comercial anotado en un bloque de foco avisa; la revisión de fondo no suma a las 72 h', () => {
    render(<Metas day={dia('2026-12-12')} tab="revision" />);
    fireEvent.change(screen.getByRole('combobox', { name: 'Ítem de fondo' }), { target: { value: 'com-1' } });
    fireEvent.change(screen.getByRole('combobox', { name: 'Tipo de revisión' }), { target: { value: 'comercial' } });
    fireEvent.change(screen.getByLabelText('Desde'), { target: { value: '05:00' } });
    fireEvent.click(screen.getByRole('button', { name: 'Anotar' }));
    expect(screen.getAllByRole('alert').map((a) => a.textContent).join(' ')).toMatch(/de simulacros: el tiempo comercial va en el cierre/);
    expect(screen.getByText(/Revisión de fondo: 1 h esta semana.*No suma a las 72 h de foco/)).toBeInTheDocument();
  });

  it('Hoy: lo de fondo en una línea (la app secundaria, el showcase y la revisión de la semana)', () => {
    render(<Hoy day={dia('2026-12-12')} />);
    const fondo = screen.getByLabelText('De fondo');
    expect(fondo.textContent).toMatch(/De fondo: HandyX v1\.0 · #1 Aquasol and water parks \(planificado\) · revisión 0 \/ 1 h esta semana/);
  });

  it('papers: van en el Block 1 del primer día de su bloque (AeroScan, 19 jun 2027)', () => {
    const d = dia('2027-06-19');
    expect(d.blocks.find((b) => b.key === 'prog')!.tasks.map((t) => t.t)).toEqual(expect.arrayContaining(['Paper: AlexNet (2012) (estudiar y test)', 'Paper: ResNet (2015) (estudiar y test)']));
    expect(dia('2027-06-20').blocks.find((b) => b.key === 'prog')!.tasks.some((t) => /^Paper:/.test(t.t))).toBe(false);
  });
});

describe('§14 · Open source', () => {
  it('la página: Alawys con su ficha y el Imán en v1.0; una extraída pide "la necesita"; publicar, link, descargas y el post', () => {
    render(<Metas day={dia('2026-12-30')} tab="open-source" />);
    expect(screen.getByText(/Todavía ninguna: la primera es Alawys v1\.0/)).toBeInTheDocument();
    const alawys = screen.getByRole('listitem', { name: 'Alawys 1.0' });
    expect(alawys.textContent).toMatch(/lanzamiento \(Imán\)/);
    expect(alawys.textContent).toMatch(/El Imán \(es un lanzamiento\)/);
    // Alawys v0.1: con el checklist completo se publica.
    const v01 = screen.getByRole('listitem', { name: 'Alawys 0.1' });
    for (const c of within(v01).getAllByRole('checkbox')) fireEvent.click(c);
    fireEvent.click(within(screen.getByRole('listitem', { name: 'Alawys 0.1' })).getByRole('button', { name: 'Alawys 0.1 publicada hoy' }));
    expect(getState().plan.fondo!.alawys.versiones!['0.1'].publicada).toBe('2026-12-30');
    expect(screen.getByRole('region', { name: 'Publicadas' }).textContent).toMatch(/0\.1create-alawys · @alawys\/\*VitalIA/);
    const notify = screen.getByRole('listitem', { name: '@alawys/notify 1.0' });
    expect(notify.textContent).toMatch(/La necesita: el segundo ítem que la usa/);
    fireEvent.change(screen.getByRole('combobox', { name: '@alawys/notify: la necesita' }), { target: { value: 'P10' } });
    expect(getState().plan.fondo!.notify.necesitadoPor).toBe('P10');
    expect(screen.getByRole('listitem', { name: 'Escrow de Mercado Pago (HandyX) 1.0' }).textContent).toMatch(/Interna: nunca se publica/);
  });

  it('cada proyecto muestra su herramienta y la regla', () => {
    render(<Metas day={dia('2027-03-01')} tab="periodos/P4" />);
    const s = screen.getByRole('region', { name: 'Herramientas' });
    expect(s.textContent).toMatch(/mcp-ar \+satélites.*@alawys\/sgp4-wasm 1\.0/);
    expect(s.textContent).toMatch(/Como máximo UNA herramienta nueva por proyecto/);
  });
});
