import { describe, expect, it } from 'vitest';
import { MAZO_LLM } from '../data/mazos';
import { PAPERS_ID } from '../data/papers';
import { claveHito } from '../data/periodos-plan';
import { emptyPlan } from '../data/plan-state';
import { CERT_V7_A_V12, migrarPlanV12 } from './migrar-v12';
import { getState, migrate, register, resetState } from './store';

describe('v12.1 · migración aditiva', () => {
  it('un estado de la v7 conserva todo (horas, lo hecho, notas, metas de P0) y suma papers, el mazo de LLM y las certs con sus ids nuevos', () => {
    resetState();
    register('Toti', 'Abi', '2026-11-16');
    const viejo = JSON.parse(JSON.stringify(getState()));
    viejo.study.activities = viejo.study.activities.filter((a: { id: string }) => a.id !== PAPERS_ID);
    viejo.study.cards = [{ id: 'c1', front: 'a', back: 'b', kind: 'pregunta', deck: 'Matemática', source: 'x', createdOn: '2026-11-17' }];
    viejo.plan.horasManuales = { '2026-11-19': { programacion: 6 }, '2026-11-20': { programacion: 7 } };
    viejo.plan.metasBloque = { P0: { metas: [{ id: 'm1', texto: 'Agentes andando', hecha: '2026-11-18' }] } };
    viejo.plan.proyectos = { ...viejo.plan.proyectos, C8: { estandar: {}, minutos: {}, examen: { fecha: '2026-12-12', puntaje: 88 } } };
    viejo.days = { '2026-11-19': { date: '2026-11-19', wake: '04:00', routine: 'completo', blocks: [], notes: ['nota de PetrIA v0'], focus: [] } };
    const m = migrate(viejo);
    expect(m.plan.horasManuales).toEqual(viejo.plan.horasManuales);
    expect(m.plan.metasBloque).toEqual(viejo.plan.metasBloque);
    expect(m.days['2026-11-19'].notes).toEqual(['nota de PetrIA v0']);
    expect(m.study.cards[0]).toEqual(viejo.study.cards[0]);
    expect(m.study.cards.filter((c) => c.deck === MAZO_LLM)).toHaveLength(20);
    expect(m.study.activities.some((a) => a.id === PAPERS_ID)).toBe(true);
    expect(m.plan.hitos[claveHito.cert('claude-architect')]).toEqual({ hecho: '2026-12-12' });
    expect(m.plan.hitos[claveHito.cert('gh-foundations')]).toEqual({ hecho: '2026-12-12' });
    expect(m.plan.proyectos.C8.examen).toEqual({ fecha: '2026-12-12', puntaje: 88 });
    // Idempotente: migrar dos veces da lo mismo.
    const m2 = migrate(JSON.parse(JSON.stringify(m)));
    expect(m2.study.cards).toHaveLength(m.study.cards.length);
    expect(m2.study.activities).toHaveLength(m.study.activities.length);
    expect(m2.plan.hitos).toEqual(m.plan.hitos);
  });

  it('las 13 certs de la v7 tienen su id nuevo; lo que ya marcaste en v12.1 no se pisa', () => {
    expect(Object.keys(CERT_V7_A_V12)).toHaveLength(13);
    const p = { ...emptyPlan(), proyectos: { C2: { estandar: {}, minutos: {}, examen: { fecha: '2027-05-01', puntaje: 90 } } }, hitos: { [claveHito.cert('secplus')]: { hecho: '2027-05-08' } } } as never;
    expect(migrarPlanV12(p).hitos[claveHito.cert('secplus')]).toEqual({ hecho: '2027-05-08' });
  });
});
