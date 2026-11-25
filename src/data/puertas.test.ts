import { beforeEach, describe, expect, it } from 'vitest';
import { guardarExamen, setTecnica, toggleAgentico } from '../state/plan';
import { getState, register, resetState, startDay } from '../state/store';
import { emptyPlan, proyectoVacio } from './plan-state';
import { cierreProyecto, contadoresAgenticos, puertaBloqueando, semanasGanadas } from './puertas';

const T0 = '2026-11-16';

describe('colchón (ola 16b: reemplaza a las semanas ganadas del calendario comprimido)', () => {
  it('parte de la semana de colchón de la etapa 1 (COL, Consolidation, 1–3 nov 2027), sin atrasos', () => {
    expect(semanasGanadas(emptyPlan(), '2026-11-16', T0)).toEqual({ total: 1, base: 1, proyectos: 0, puertas: 0 });
  });

  it('suma lo que un proyecto cierra antes de su meta y resta la semana de tope si se pasa', () => {
    const p = emptyPlan();
    const evidencia = { medido: true, validador: true, informe: true };
    p.proyectos.P0 = { ...proyectoVacio(), examen: { fecha: '2026-11-18', puntaje: 90 }, evidencia };
    p.proyectos.P1 = { ...proyectoVacio(), examen: { fecha: '2026-12-04', puntaje: 90 }, tecnica: { diseno: true, ejercicios: 6, defensa: '2026-12-05' }, evidencia };
    expect(cierreProyecto(p, 'P1')).toBe('2026-12-05');
    // P1 cerró 7 días antes de su meta (12 dic, v12.4): unas 72 h de programación libres, dos semanas del plan
    // (24,5 h cada una) ganadas. PetrIA v0 (archivada, 19–20 nov) y P0 (sin atraso) no cuentan.
    expect(semanasGanadas(p, '2026-12-13', T0)).toMatchObject({ total: 3, proyectos: 2 });
    // P1 sin cerrar después de su meta: usa la semana de tope.
    const q = emptyPlan();
    q.proyectos.P0 = p.proyectos.P0;
    expect(semanasGanadas(q, '2026-12-15', T0)).toMatchObject({ total: 0, proyectos: -1 });
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
    // v12.4: W1 va del 28 ene al 21 feb 2027, siguen Cert window 3 y E3, y P3 (AgrIA) arranca el 13 mar.
    expect(puertaBloqueando('2027-03-12', getState().plan, T0)).toBeNull();
    expect(puertaBloqueando('2027-03-15', getState().plan, T0)).toBe('W1');
    startDay('completo', '04:30', '2027-03-15');
    const prog = getState().days['2027-03-15'].blocks.filter((b) => /^prog/.test(b.key));
    // Sin trabajo nuevo en v12.4, el lunes tiene los dos bloques de deep focus y el PR review: los tres pasan a matemática.
    expect(prog.map((b) => b.key)).toEqual(['prog', 'prog-tarde', 'prog-review']);
    for (const b of prog) expect(b).toMatchObject({ rama: 'matematica', title: 'Matemática pura · puerta W1' });
  });

  it('con W1 aprobada (85 % o más) P3 arranca normal, y la atrasada se descuenta del colchón', () => {
    guardarExamen('W1', '2027-03-07', 88);
    expect(puertaBloqueando('2027-03-15', getState().plan, T0)).toBeNull();
    startDay('completo', '04:30', '2027-03-15');
    expect(getState().days['2027-03-15'].blocks.find((b) => b.key === 'prog')!.rama).toBe('programacion');
    // W1 cerró el 21 feb y se aprobó el 7 mar: 2 semanas que se descuentan del colchón.
    expect(semanasGanadas(getState().plan, '2027-03-15', T0).puertas).toBe(2);
  });

  it('P6 y P8 también tienen puerta (W2 y W3)', () => {
    // v12.4: P6 arranca el 6 ago 2027 (después de W2) y P8 el 22 sep 2027 (después de W3).
    expect(puertaBloqueando('2027-08-10', emptyPlan(), T0)).toBe('W2');
    expect(puertaBloqueando('2027-09-25', emptyPlan(), T0)).toBe('W3');
    expect(puertaBloqueando('2027-09-21', emptyPlan(), T0)).toBeNull(); // último día de W3
    expect(puertaBloqueando('2027-04-20', emptyPlan(), T0)).toBeNull(); // P4 no tiene puerta
  });
});

describe('Perfil · portfolio agéntico', () => {
  beforeEach(() => {
    resetState();
    register('Toti', 'Abi', T0);
  });

  it('MCP publicados, agentes con trazas y defensas aprobadas, de 15 (P0 a P10, Constelación 2.0 y S1 a S3; PetrIA v0 archivada no cuenta)', () => {
    toggleAgentico('P0', 'mcp');
    toggleAgentico('P1', 'mcp');
    toggleAgentico('P1', 'agente');
    setTecnica('P1', { defensa: '2026-12-18' });
    expect(contadoresAgenticos(getState().plan)).toEqual({ total: 15, mcp: 2, agentes: 1, defensas: 1 });
  });
});
