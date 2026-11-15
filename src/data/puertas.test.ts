import { beforeEach, describe, expect, it } from 'vitest';
import { guardarExamen, setTecnica, toggleAgentico } from '../state/plan';
import { getState, register, resetState, startDay } from '../state/store';
import { emptyPlan, proyectoVacio } from './plan-state';
import { cierreProyecto, contadoresAgenticos, puertaBloqueando, semanasGanadas } from './puertas';

const T0 = '2026-11-16';

describe('semanas ganadas', () => {
  it('parte de 25 con el plan sin atrasos (78 − 53)', () => {
    expect(semanasGanadas(emptyPlan(), '2026-11-16', T0)).toEqual({ total: 25, base: 25, proyectos: 0, puertas: 0 });
  });

  it('suma lo que un proyecto cierra antes de su meta y resta la semana de tope si se pasa', () => {
    const p = emptyPlan();
    p.proyectos.P0 = { ...proyectoVacio(), examen: { fecha: '2026-11-29', puntaje: 90 } };
    p.proyectos.P1 = { ...proyectoVacio(), examen: { fecha: '2026-12-10', puntaje: 90 }, tecnica: { diseno: true, ejercicios: 6, defensa: '2026-12-11' } };
    expect(cierreProyecto(p, 'P1')).toBe('2026-12-11');
    // P1 cerró 9 días antes de su meta (20 dic): una semana ganada.
    expect(semanasGanadas(p, '2026-12-14', T0).total).toBe(26);
    // P1 sin cerrar después de su meta: usa la semana de tope.
    const q = emptyPlan();
    q.proyectos.P0 = p.proyectos.P0;
    expect(semanasGanadas(q, '2026-12-22', T0).total).toBe(24);
  });

  it('sin la entrevista técnica completa el proyecto no se cierra', () => {
    const p = emptyPlan();
    p.proyectos.P1 = { ...proyectoVacio(), examen: { fecha: '2026-12-10', puntaje: 95 }, tecnica: { diseno: true, ejercicios: 5 } };
    expect(cierreProyecto(p, 'P1')).toBeNull();
  });
});

describe('puertas de matemática', () => {
  beforeEach(() => {
    resetState();
    register('Toti', 'Abi', T0);
  });

  it('P3 no arranca sin aprobar W1: la programación del día pasa a matemática pura', () => {
    expect(puertaBloqueando('2027-02-02', getState().plan, T0)).toBe('W1');
    startDay('completo', '04:30', '2027-02-02');
    const prog = getState().days['2027-02-02'].blocks.filter((b) => b.key === 'prog' || b.key === 'caso');
    expect(prog).toHaveLength(2);
    for (const b of prog) expect(b).toMatchObject({ rama: 'matematica', title: 'Matemática pura · puerta W1' });
  });

  it('con W1 aprobada (85 % o más) P3 arranca normal, y la atrasada se descuenta del colchón', () => {
    guardarExamen('W1', '2027-02-08', 88);
    expect(puertaBloqueando('2027-02-09', getState().plan, T0)).toBeNull();
    startDay('completo', '04:30', '2027-02-09');
    expect(getState().days['2027-02-09'].blocks.find((b) => b.key === 'prog')!.rama).toBe('programacion');
    expect(semanasGanadas(getState().plan, '2027-02-09', T0).puertas).toBe(2);
  });

  it('P6 y P8 también tienen puerta (W2 y W3)', () => {
    expect(puertaBloqueando('2027-06-01', emptyPlan(), T0)).toBe('W2');
    expect(puertaBloqueando('2027-08-10', emptyPlan(), T0)).toBe('W3');
    expect(puertaBloqueando('2027-03-09', emptyPlan(), T0)).toBeNull();
  });
});

describe('Perfil · portfolio agéntico', () => {
  beforeEach(() => {
    resetState();
    register('Toti', 'Abi', T0);
  });

  it('MCP publicados, agentes con trazas y defensas aprobadas, de 11', () => {
    toggleAgentico('P0', 'mcp');
    toggleAgentico('P1', 'mcp');
    toggleAgentico('P1', 'agente');
    setTecnica('P1', { defensa: '2026-12-18' });
    expect(contadoresAgenticos(getState().plan)).toEqual({ total: 11, mcp: 2, agentes: 1, defensas: 1 });
  });
});
