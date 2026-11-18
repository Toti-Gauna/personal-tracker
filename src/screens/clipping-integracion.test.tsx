import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { avanceMeta, metasMesGeneradas, metasSemanaGeneradas } from '../data/metas-plan';
import { alertas } from '../data/plan-vistas';
import { emptyPlan } from '../data/plan-state';
import { emptyClipping } from '../data/clipping-state';
import { alertasClipping } from '../data/clipping-metricas';
import { planEntre } from '../data/clipping';
import { dayJson } from '../data/export';
import { hitosFechados } from '../data/hitos';
import { etiquetaDeBloque, tituloDeBloque } from '../data/etiquetas';
import { getState, register, resetState, startDay } from '../state/store';
import { registrarClips } from '../state/clipping';
import { setPlanSettings } from '../state/plan';
import { Hoy } from './Hoy';

beforeEach(() => {
  localStorage.clear();
  resetState();
  register('Toti', 'Abi', '2026-11-16');
});

describe('ola 23 · el clipping en Hoy', () => {
  it('sin bloque asignado el clipping no está en Hoy; con uno, trae el mes del roadmap (lunes a viernes) o el pipeline (finde)', () => {
    startDay('completo', '04:00', '2026-11-18');
    expect(getState().days['2026-11-18'].blocks.some((x) => x.key === 'clipping')).toBe(false);
    // El día entre semana está lleno: no entra en ningún hueco, así que no se suma.
    setPlanSettings({ bloquesPendientes: { clipping: { start: '17:00', min: 90, dias: 'todos' } } });
    startDay('completo', '04:00', '2026-11-18');
    expect(getState().days['2026-11-18'].blocks.some((x) => x.key === 'clipping')).toBe(false);
    startDay('completo', '04:00', '2026-11-21');
    const f = getState().days['2026-11-21'].blocks.find((x) => x.key === 'clipping')!;
    expect([f.start, f.min]).toEqual(['17:00', 90]);
    const d = getState().days['2026-11-21'];
    expect(tituloDeBloque(f, d.date)).toBe('Clipping · Mes 1');
    expect(etiquetaDeBloque(f, { day: d, plan: getState().plan, study: getState().study })).toMatch(/^clipping · mes 1/);
    expect(f.tasks.map((t) => t.t)).toEqual(['Mejoras al pipeline (1 a 2 h)', 'Prospección de retainers']);
  });

  it('el bloque abierto tiene "Registrar clips y views" y "Sumar a la semana" cuenta los clips de la planilla', () => {
    setPlanSettings({ bloquesPendientes: { clipping: { start: '17:00', min: 120, dias: 'finde' } } });
    startDay('completo', '04:00', '2026-11-21');
    registrarClips({ fecha: '2026-11-17', clips: 4, views: 9000 });
    render(<Hoy day={getState().days['2026-11-21']} />);
    const sumar = screen.getByRole('button', { name: /Registrar clips: van 4 de 35/ });
    fireEvent.click(sumar);
    const dlg = screen.getByRole('dialog');
    expect(within(dlg).getByRole('heading', { name: 'Registrar' })).toBeInTheDocument();
  });
});

describe('ola 23 · metas, mapa, alertas y JSON', () => {
  it('metas: los clips de la semana y del mes salen del roadmap y avanzan con la planilla', () => {
    const s = metasSemanaGeneradas('2026-12-21', '2026-11-16', { intensiva: true });
    expect(s.find((m) => m.clave === 'clips')?.meta).toBe(56); // mes 2: 8 por día
    expect(planEntre('2026-12-14', '2026-12-20').clips).toBe(2 * 5 + 5 * 8);
    const m = metasMesGeneradas('2026-11-20', '2026-11-16', undefined, { intensiva: true });
    expect(m.find((x) => x.clave === 'clips')?.meta).toBe(15 * 5);
    const usd = m.find((x) => x.clave === 'usd-clipping')!;
    expect(usd.meta).toBe(75); // la mitad del mes 1 (16 a 30 nov)
    const c = { ...emptyClipping(), registro: [{ id: 'a', fecha: '2026-11-20', clips: 6, views: 1, cobrado: 12.5 }] };
    const ctx = { plan: emptyPlan(), days: {}, study: getState().study, train: getState().train, clipping: c };
    expect(avanceMeta(m.find((x) => x.clave === 'clips')!, '2026-11-01', '2026-11-30', ctx).v).toBe(6);
    expect(avanceMeta(usd, '2026-11-01', '2026-11-30', ctx)).toEqual({ v: 12.5, auto: true });
  });

  it('mapa: los hitos del roadmap con su fecha (GTA 6, USD 150, revisión del mes 6)', () => {
    const h = hitosFechados('2026-11-16', {}, '2026-11-16').filter((x) => x.rama === 'clipping');
    expect(h).toHaveLength(15);
    expect(h[0]).toMatchObject({ id: 'clip-gta6', fecha: '2026-11-19' });
    expect(h.find((x) => x.id === 'clip-revision-6')).toMatchObject({ fecha: '2027-05-15', tipo: 'grande' });
    expect(h.some((x) => x.texto.includes('US$ 100'))).toBe(false);
  });

  it('alertas: lunes, viernes, fin de fase, mes 6, concentración y compuerta en rojo', () => {
    const e = emptyClipping();
    expect(alertasClipping('2026-11-16', e).map((a) => a.id)).toEqual(['clip-lunes']);
    expect(alertasClipping('2026-11-20', e)[0]).toMatchObject({ id: 'clip-viernes', titulo: 'Clipping · viernes: pago real sin cobros esta semana' });
    expect(alertasClipping('2027-02-10', e).map((a) => a.id)).toContain('clip-fase-1');
    expect(alertasClipping('2027-05-05', e).map((a) => a.id)).toContain('clip-revision-6');
    const una = { ...e, campanas: [{ id: 'k', nombre: 'Única', plataforma: 'Whop', nicho: 'Streamers', tarifa: 1, estado: 'activa' as const, desde: '2027-06-01' }], registro: [{ id: 'r', fecha: '2027-06-20', campana: 'k', clips: 5, views: 10000, cobrado: 5 }] };
    const ids = alertasClipping('2027-06-24', una).map((a) => a.id);
    expect(ids).toEqual(expect.arrayContaining(['clip-conc', 'clip-compuerta']));
    expect(alertasClipping('2027-12-01', una)).toEqual([]);
    expect(alertas('2026-11-16', emptyPlan(), '2026-11-16', e).some((a) => a.tipo === 'clipping')).toBe(true);
    expect(alertas('2026-11-16', emptyPlan(), '2026-11-16').some((a) => a.tipo === 'clipping')).toBe(false);
  });

  it('JSON del día: el clipping entra solo si cargaste algo ese día', () => {
    startDay('completo', '04:00', '2026-11-20');
    const s = getState();
    const d = s.days['2026-11-20'];
    expect('clipping' in dayJson(d, s.settings!, s.days, {}, s.train, s.clipping)).toBe(false);
    registrarClips({ fecha: '2026-11-20', clips: 5, views: 12000, cobrado: 10 });
    const j = dayJson(d, s.settings!, s.days, {}, s.train, getState().clipping) as { clipping?: unknown };
    expect(j.clipping).toEqual({ clips: 5, views: 12000, cobrado: 10, mes: 1, cobradoMes: 10 });
  });
});
