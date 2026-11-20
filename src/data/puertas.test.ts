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
    p.proyectos.P0 = { ...proyectoVacio(), examen: { fecha: '2026-11-18', puntaje: 90 }, evidencia };
    p.proyectos.P1 = { ...proyectoVacio(), examen: { fecha: '2026-12-19', puntaje: 90 }, tecnica: { diseno: true, ejercicios: 6, defensa: '2026-12-20' }, evidencia };
    expect(cierreProyecto(p, 'P1')).toBe('2026-12-20');
    // P1 cerró 6 días antes de su meta (26 dic): 48 h de programación libres (a 8 h por día), una semana del plan (24,5 h) ganada.
    expect(semanasGanadas(p, '2026-12-21', T0).total).toBe(3);
    // P1 sin cerrar después de su meta: usa la semana de tope.
    const q = emptyPlan();
    q.proyectos.P0 = p.proyectos.P0;
    expect(semanasGanadas(q, '2027-01-02', T0).total).toBe(1);
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
    // Con el roadmap v7, W1 va del 20 feb al 11 mar y P3 (AgrIA) arranca el 12 mar.
    expect(puertaBloqueando('2027-03-11', getState().plan, T0)).toBeNull();
    expect(puertaBloqueando('2027-03-16', getState().plan, T0)).toBe('W1');
    startDay('completo', '04:30', '2027-03-16');
    const prog = getState().days['2027-03-16'].blocks.filter((b) => /^prog/.test(b.key));
    // Con trabajo (desde el 4 ene 2027) el martes tiene un solo bloque de programación, el de las 05:30.
    expect(prog).toHaveLength(1);
    for (const b of prog) expect(b).toMatchObject({ rama: 'matematica', title: 'Matemática pura · puerta W1' });
  });

  it('con W1 aprobada (85 % o más) P3 arranca normal, y la atrasada se descuenta del colchón', () => {
    guardarExamen('W1', '2027-03-25', 88);
    expect(puertaBloqueando('2027-03-26', getState().plan, T0)).toBeNull();
    startDay('completo', '04:30', '2027-03-26');
    expect(getState().days['2027-03-26'].blocks.find((b) => b.key === 'prog')!.rama).toBe('programacion');
    // W1 cerró el 11 mar y se aprobó el 25 mar: 2 semanas que se descuentan del colchón.
    expect(semanasGanadas(getState().plan, '2027-03-26', T0).puertas).toBe(2);
  });

  it('P6 y P8 también tienen puerta (W2 y W3)', () => {
    // P6 (AeroScan) arranca el 10 oct 2027 y P8 (AdversarIA) el 13 feb 2028.
    expect(puertaBloqueando('2027-10-20', emptyPlan(), T0)).toBe('W2');
    expect(puertaBloqueando('2028-02-20', emptyPlan(), T0)).toBe('W3');
    expect(puertaBloqueando('2028-02-10', emptyPlan(), T0)).toBeNull();
    expect(puertaBloqueando('2027-05-01', emptyPlan(), T0)).toBeNull(); // P4 no tiene puerta
  });
});

describe('Perfil · portfolio agéntico', () => {
  beforeEach(() => {
    resetState();
    register('Toti', 'Abi', T0);
  });

  it('MCP publicados, agentes con trazas y defensas aprobadas, de 15 (P0 a P10, Constelación 2.0 y S1 a S3)', () => {
    toggleAgentico('P0', 'mcp');
    toggleAgentico('P1', 'mcp');
    toggleAgentico('P1', 'agente');
    setTecnica('P1', { defensa: '2026-12-18' });
    expect(contadoresAgenticos(getState().plan)).toEqual({ total: 15, mcp: 2, agentes: 1, defensas: 1 });
  });
});
