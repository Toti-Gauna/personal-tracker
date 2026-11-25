import { describe, expect, it } from 'vitest';
import { emptyPlan } from '../data/plan-state';
import { avisoRespaldoV124Visto, restaurarRespaldoV124 } from './plan';
import { migrarPlanV124 } from './migrar-v12';
import { getState, migrate, resetState } from './store';

const CS = { P1: { inicio: '2026-11-25', fin: '2026-12-16', confirmado: '2026-11-25' }, CW1: { inicio: '2026-12-17', fin: '2026-12-22', confirmado: '2026-11-25' } };

describe('v12.4 · la migración limpia los corrimientos confirmados y deja un respaldo para deshacer', () => {
  const guardado = () => ({
    settings: { names: { me: 'Toti', partner: 'Abi' }, startDate: '2026-11-16', presets: [], blockPresets: [] },
    days: { '2026-11-24': { date: '2026-11-24', wake: '04:00', routine: 'completo', dayType: 'busqueda-intensiva', blocks: [], notes: ['una nota'], focus: [{ key: 'prog', plan: '', focusMin: 90, at: '05:00' }] } },
    plan: {
      ...emptyPlan(), corrimientos: CS,
      proyectos: { CW1: { examen: { fecha: '2026-12-16', puntaje: 90 } } },
      hitos: { 'v12:P1:v1.0': { hecho: '2026-11-25' } },
      fondo: { 'com-1': { leads: [{ id: 'l1', nombre: 'Aquasol', contactado: '2026-11-20', estado: 'contactado' }] } },
      posts: [{ id: 'p1', fecha: '2026-11-24', canales: ['linkedin-en'], pista: 'principal' }],
    },
  });

  it('saca los corrimientos, los guarda en el respaldo y no toca exámenes, horas, tildes, notas, leads ni posts', () => {
    const s = migrate(guardado());
    expect(s.plan.versionPlan).toBe('v12.4');
    expect(s.plan.corrimientos).toBeUndefined();
    expect(s.plan.respaldoV124).toEqual({ corrimientos: CS, fecha: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/) });
    expect(s.plan.proyectos.CW1.examen).toEqual({ fecha: '2026-12-16', puntaje: 90 });
    expect(s.plan.hitos['v12:P1:v1.0']).toEqual({ hecho: '2026-11-25' });
    expect(s.plan.fondo!['com-1'].leads).toHaveLength(1);
    expect(s.plan.posts).toHaveLength(1);
    expect(s.days['2026-11-24'].notes).toEqual(['una nota']);
    expect(s.days['2026-11-24'].focus[0].focusMin).toBe(90);
  });

  it('corre una sola vez (la segunda no borra lo que confirmes después) y sin corrimientos no deja respaldo', () => {
    const una = migrarPlanV124(guardado().plan as never, '2026-11-26');
    const otra = migrarPlanV124({ ...una, corrimientos: { P2: { inicio: '2026-12-29', fin: '2027-01-09', confirmado: '2026-12-01' } } }, '2026-12-02');
    expect(otra.corrimientos).toEqual({ P2: { inicio: '2026-12-29', fin: '2027-01-09', confirmado: '2026-12-01' } });
    expect(migrarPlanV124(emptyPlan(), '2026-11-26')).toMatchObject({ versionPlan: 'v12.4' });
    expect(migrarPlanV124(emptyPlan(), '2026-11-26').respaldoV124).toBeUndefined();
  });

  it('"Deshacer" devuelve los corrimientos de antes y saca el respaldo; el aviso visto se anota sin perderlo', () => {
    resetState(migrate(guardado()));
    avisoRespaldoV124Visto('2026-11-26');
    expect(getState().plan.respaldoV124).toMatchObject({ aviso: '2026-11-26' });
    restaurarRespaldoV124();
    expect(getState().plan.corrimientos).toEqual(CS);
    expect(getState().plan.respaldoV124).toBeUndefined();
  });
});
