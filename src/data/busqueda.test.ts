import { beforeEach, describe, expect, it } from 'vitest';
import { activarIntensiva, desactivarIntensiva, retomar, sumarHandyx } from '../state/plan';
import { getState, planSettings, register, resetState, startDay } from '../state/store';
import { diasEnPausa } from './busqueda';
import { enPausa } from './plan-state';
import { metasOf, planRoutine, routineFor } from './routines';

describe('búsqueda intensiva', () => {
  beforeEach(() => {
    resetState();
    register('Toti', 'Abi', '2026-11-16');
  });

  it('arranca activa: rutinas del modo y Handyx y ventas en pausa desde T0', () => {
    const cfg = planSettings(getState().settings);
    expect(cfg.modo).toBe('busqueda-intensiva');
    expect(routineFor('2026-11-16', cfg)).toBe('busqueda-intensiva');
    expect(enPausa(getState().plan, 'handyx', '2026-11-20')).toBe(true);
    expect(enPausa(getState().plan, 'ventas', '2026-11-20')).toBe(true);
  });

  it('las dos rutinas: 10 metas de lunes a viernes y 8 el finde, con las horas de la tabla', () => {
    expect(metasOf('busqueda-intensiva').map((b) => b.start)).toEqual(['04:30', '06:30', '08:30', '10:00', '12:00', '13:30', '15:00', '16:30', '18:00', '20:00']);
    expect(metasOf('busqueda-intensiva-finde')).toHaveLength(8);
    const horas = (rama: string) => {
      const m = (t: 'busqueda-intensiva' | 'busqueda-intensiva-finde') => planRoutine(t, 'completo').filter((p) => p.block.rama === rama || (rama === 'clipping' && p.block.id === 'clipping')).reduce((s, p) => s + p.min, 0);
      return (m('busqueda-intensiva') * 5 + m('busqueda-intensiva-finde') * 2) / 60;
    };
    expect(horas('matematica')).toBe(14);
    expect(horas('programacion')).toBe(25.5);
    expect(horas('ingles')).toBe(11.5);
    expect(horas('trabajo')).toBe(10.5);
    expect(horas('clipping')).toBe(10.5);
  });

  it('el día corto y "Otra hora" recorren solo los bloques 1 y 2', () => {
    const p = planRoutine('busqueda-intensiva', 'corto');
    expect(p.slice(0, 3).map((x) => [x.start, x.min])).toEqual([['05:30', 90], ['07:00', 90], ['08:30', 90]]);
    expect(p[3].start).toBe('10:00');
  });

  it('el sábado Hoy arma la rutina de fin de semana', () => {
    startDay('completo', '04:30', '2026-11-21');
    const d = getState().days['2026-11-21'];
    expect(d.dayType).toBe('busqueda-intensiva-finde');
    expect(d.blocks.map((b) => b.key)).toEqual(['math', 'prog', 'abi', 'caso', 'ingles', 'busqueda', 'clipping', 'cierre']);
  });

  it('con una entrevista a 3 días, inglés pasa a simulacro de esa entrevista', () => {
    getState().plan.entrevistas.push({ id: 'e1', fecha: '2026-11-19', rol: 'AI Engineer', empresa: 'Acme', prep: {} });
    startDay('completo', '04:30', '2026-11-17');
    const ing = getState().days['2026-11-17'].blocks.find((b) => b.key === 'ingles')!;
    expect(ing.title).toBe('Inglés · simulacro de AI Engineer en Acme');
    expect(getState().days['2026-11-17'].blocks.find((b) => b.key === 'busqueda')!.min).toBe(90);
  });

  it('desactivar vuelve exactamente a la rutina anterior y no borra nada de Handyx', () => {
    sumarHandyx('2026-11-17', { operaciones: 3, horas: 2 });
    const handyx = structuredClone(getState().plan.handyx);
    desactivarIntensiva('2026-11-30');
    const cfg = planSettings(getState().settings);
    expect(cfg).toMatchObject({ modo: null, rutina: 'busqueda', diaLibre: 2 });
    expect(cfg.previo).toBeUndefined();
    expect(routineFor('2026-12-01', cfg)).toBe('libre');
    expect(routineFor('2026-12-02', cfg)).toBe('weekday');
    expect(getState().plan.handyx).toEqual(handyx);
    expect(getState().plan.pausas.every((p) => p.hasta === '2026-11-30')).toBe(true);
    expect(diasEnPausa(getState().plan, 'handyx', '2027-01-01')).toBe(14);
    // Volver a activarlo guarda otra vez el martes y abre pausas nuevas sin tocar las viejas.
    activarIntensiva('2026-12-10');
    expect(planSettings(getState().settings).previo).toEqual({ rutina: 'busqueda', diaLibre: 2 });
    expect(getState().plan.pausas).toHaveLength(4);
  });

  it('retomar Handyx cierra solo su pausa y vuelve a la rutina anterior; ventas sigue en pausa', () => {
    retomar('handyx', '2026-12-20');
    expect(enPausa(getState().plan, 'handyx', '2026-12-21')).toBe(false);
    expect(enPausa(getState().plan, 'ventas', '2026-12-21')).toBe(true);
    expect(routineFor('2026-12-22', planSettings(getState().settings))).toBe('libre');
    expect(routineFor('2026-12-23', planSettings(getState().settings))).toBe('weekday');
    expect(getState().plan.pausas.find((p) => p.objetivo === 'handyx')!.guardado).toEqual({ handyx: {} });
  });
});
