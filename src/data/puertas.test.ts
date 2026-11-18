import { beforeEach, describe, expect, it } from 'vitest';
import { guardarExamen, setTecnica, toggleAgentico } from '../state/plan';
import { getState, register, resetState, startDay } from '../state/store';
import { emptyPlan, proyectoVacio } from './plan-state';
import { cierreProyecto, contadoresAgenticos, puertaBloqueando, semanasGanadas } from './puertas';

const T0 = '2026-11-16';

describe('colchón (ola 16b: reemplaza a las semanas ganadas del calendario comprimido)', () => {
  it('parte de las 2 semanas de colchón al final de la etapa 1, sin atrasos', () => {
    expect(semanasGanadas(emptyPlan(), '2026-11-16', T0)).toEqual({ total: 2, base: 2, proyectos: 0, puertas: 0 });
  });

  it('suma lo que un proyecto cierra antes de su meta y resta la semana de tope si se pasa', () => {
    const p = emptyPlan();
    const evidencia = { medido: true, validador: true, informe: true };
    p.proyectos.P0 = { ...proyectoVacio(), examen: { fecha: '2026-11-20', puntaje: 90 }, evidencia };
    p.proyectos.P1 = { ...proyectoVacio(), examen: { fecha: '2026-12-02', puntaje: 90 }, tecnica: { diseno: true, ejercicios: 6, defensa: '2026-12-03' }, evidencia };
    expect(cierreProyecto(p, 'P1')).toBe('2026-12-03');
    // P1 cerró 6 días antes de su meta (9 dic): 46 h de programación libres, una semana del plan (24,5 h) ganada.
    expect(semanasGanadas(p, '2026-12-04', T0).total).toBe(3);
    // P1 sin cerrar después de su meta: usa la semana de tope.
    const q = emptyPlan();
    q.proyectos.P0 = p.proyectos.P0;
    expect(semanasGanadas(q, '2026-12-20', T0).total).toBe(1);
  });

  it('sin las tres pruebas de evidencia el proyecto no cierra (ola 16c)', () => {
    const p = emptyPlan();
    p.proyectos.P1 = { ...proyectoVacio(), examen: { fecha: '2026-12-10', puntaje: 95 }, tecnica: { diseno: true, ejercicios: 6, defensa: '2026-12-11' }, evidencia: { medido: true, validador: true } };
    expect(cierreProyecto(p, 'P1')).toBeNull();
    p.proyectos.P1.evidencia!.informe = true;
    expect(cierreProyecto(p, 'P1')).toBe('2026-12-11');
    // P0 tampoco cierra sin evidencia, aunque no lleve entrevista técnica.
    p.proyectos.P0 = { ...proyectoVacio(), examen: { fecha: '2026-11-29', puntaje: 90 } };
    expect(cierreProyecto(p, 'P0')).toBeNull();
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
    // Con el calendario por horas, W1 va del 6 al 31 de enero y P3 arranca el 1 de febrero.
    expect(puertaBloqueando('2027-02-10', getState().plan, T0)).toBe('W1');
    startDay('completo', '04:30', '2027-02-10');
    const prog = getState().days['2027-02-10'].blocks.filter((b) => /^prog/.test(b.key));
    // Con trabajo (desde el 11 ene 2027) el martes tiene un solo bloque de programación, el de las 05:30.
    expect(prog).toHaveLength(1);
    for (const b of prog) expect(b).toMatchObject({ rama: 'matematica', title: 'Matemática pura · puerta W1' });
  });

  it('con W1 aprobada (85 % o más) P3 arranca normal, y la atrasada se descuenta del colchón', () => {
    guardarExamen('W1', '2027-02-20', 88);
    expect(puertaBloqueando('2027-02-21', getState().plan, T0)).toBeNull();
    startDay('completo', '04:30', '2027-02-21');
    expect(getState().days['2027-02-21'].blocks.find((b) => b.key === 'prog')!.rama).toBe('programacion');
    // W1 cerró el 31 ene y se aprobó el 20 feb: 3 semanas que se descuentan del colchón.
    expect(semanasGanadas(getState().plan, '2027-02-21', T0).puertas).toBe(3);
  });

  it('P6 y P8 también tienen puerta (W2 y W3)', () => {
    // P6 arranca el 7 jul 2027 y P8 el 17 oct 2027.
    expect(puertaBloqueando('2027-07-20', emptyPlan(), T0)).toBe('W2');
    expect(puertaBloqueando('2027-10-20', emptyPlan(), T0)).toBe('W3');
    expect(puertaBloqueando('2027-10-10', emptyPlan(), T0)).toBeNull();
    expect(puertaBloqueando('2027-04-01', emptyPlan(), T0)).toBeNull(); // P4 no tiene puerta
  });
});

describe('Perfil · portfolio agéntico', () => {
  beforeEach(() => {
    resetState();
    register('Toti', 'Abi', T0);
  });

  it('MCP publicados, agentes con trazas y defensas aprobadas, de 14 (P0 a P10 y S1 a S3)', () => {
    toggleAgentico('P0', 'mcp');
    toggleAgentico('P1', 'mcp');
    toggleAgentico('P1', 'agente');
    setTecnica('P1', { defensa: '2026-12-18' });
    expect(contadoresAgenticos(getState().plan)).toEqual({ total: 14, mcp: 2, agentes: 1, defensas: 1 });
  });
});
