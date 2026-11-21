import { beforeEach, describe, expect, it } from 'vitest';
import { setPlanSettings, iniciarSprintSinIA, cortarSprintSinIA, sumarProblemas, registrarSpot, agregarTemaAlgoritmo } from '../state/plan';
import { getState, register, resetState, startDay } from '../state/store';
import { ALG, estadoTemas, lineaLearning, problemas, sprintActivo, temas } from './algoritmos';
import { convertiblesIntensiva, horasRutinaIntensiva } from './capacidad';
import { ajustarDia, planRoutine } from './routines';

const bloques = (d: string) => getState().days[d].blocks;
const dia = (d: string) => { startDay('completo', '04:00', d); return bloques(d); };

beforeEach(() => { resetState(); register('Toti', 'Abi', '2026-11-16'); });

describe('ola 31 · rutina del roadmap v7', () => {
  it('lunes a viernes: proyecto 5:30–8:00 y 11:30–15:30, Anthropic Academy a las 15:30 hasta el 22 dic y proyecto desde el 23', () => {
    const b = dia('2026-11-18');
    expect(b.map((x) => [x.key, x.start])).toEqual([
      ['rutina', '04:00'], ['math', '04:30'], ['prog', '05:30'], ['abi', '08:00'], ['trabajo', '09:30'], ['prog-tarde', '11:30'], ['academy', '15:30'],
      ['ingles', '16:00'], ['ingles-hablado', '16:30'], ['busqueda', '17:00'], ['publicaciones', '17:40'], ['entreno', '18:00'], ['cierre', '20:00'], ['sueno', '21:00'],
    ]);
    expect(b.find((x) => x.key === 'academy')!.title).toMatch(/Anthropic Academy/);
    expect(dia('2026-12-22').some((x) => x.key === 'academy')).toBe(true);
    const d23 = dia('2026-12-23');
    expect(d23.some((x) => x.key === 'academy')).toBe(false);
    expect(d23.find((x) => x.key === 'prog-academy')).toMatchObject({ start: '15:30', min: 30, rama: 'programacion' });
  });

  it('la rutina da 50 h por semana de proyecto (47,5 con Academy) y PetrIA pide 56: faltan 6 (u 8,5)', () => {
    expect(horasRutinaIntensiva()).toEqual({ semana: 50, meta: 56, falta: 6 });
    expect(horasRutinaIntensiva([], { academy: true })).toEqual({ semana: 47.5, meta: 56, falta: 8.5 });
    // Lo que se puede pasar a proyecto: nunca sueño, entreno, Abi, trabajo ni matemática.
    const ids = convertiblesIntensiva().map((c) => c.id);
    expect(ids).toEqual(expect.arrayContaining(['ingles', 'ingles-hablado', 'busqueda', 'publicaciones', 'cierre', 'demo', 'simulada', 'revision']));
    for (const no of ['sueno', 'entreno', 'abi', 'trabajo', 'math', 'rutina', 'prog']) expect(ids).not.toContain(no);
    expect(convertiblesIntensiva().find((c) => c.id === 'ingles-hablado')).toMatchObject({ minSemana: 150, dias: 'L a V' });
    // Inglés hablado (2 h 30) y publicaciones (1 h 40): todavía faltan 1,8 h.
    expect(horasRutinaIntensiva(['ingles-hablado', 'publicaciones'])).toEqual({ semana: 54.2, meta: 56, falta: 1.8 });
    // Aunque se pida, el entreno no se convierte.
    expect(horasRutinaIntensiva(['entreno'])).toEqual({ semana: 50, meta: 56, falta: 6 });
  });

  it('las horas extra elegidas pasan a proyecto hasta el trabajo nuevo; con trabajo, nada cambia', () => {
    setPlanSettings({ extraProyecto: ['ingles-hablado'] });
    const b = dia('2026-11-18');
    expect(b.find((x) => x.key === 'prog-extra-ingles-hablado')).toMatchObject({ start: '16:30', min: 30, rama: 'programacion' });
    expect(b.some((x) => x.key === 'ingles-hablado')).toBe(false);
    const con = dia('2027-01-05');
    expect(con.some((x) => x.key.startsWith('prog-extra'))).toBe(false);
  });

  it('el sprint sin IA parte el proyecto de la mañana: 30 min de algoritmos y después el proyecto', () => {
    iniciarSprintSinIA('2026-11-18');
    const b = dia('2026-11-19');
    expect(b.find((x) => x.key === 'algoritmos')).toMatchObject({ start: '05:30', min: 30, title: 'Algoritmos sin IA · día 2 de 14' });
    expect(b.find((x) => x.key === 'prog')).toMatchObject({ start: '06:00', min: 120 });
    // Pasados los 14 días, no.
    expect(dia('2026-12-02').some((x) => x.key === 'algoritmos')).toBe(false);
    expect(sprintActivo(getState().plan, '2026-12-01')).toMatchObject({ dia: 14, fin: '2026-12-01' });
    // Funciona igual con trabajo (el proyecto de la mañana arranca a las 5:30).
    const p = ajustarDia(planRoutine('con-trabajo', 'completo'), { sprintSinIA: { dia: 3 } });
    expect(p.find((x) => x.block.id === 'algoritmos')!.start).toBe('05:30');
  });

  it('cortar el sprint termina ayer (o lo borra si arrancó hoy); los problemas se cuentan por día', () => {
    iniciarSprintSinIA('2026-11-18');
    cortarSprintSinIA('2026-11-20');
    expect(sprintActivo(getState().plan, '2026-11-20')).toBeNull();
    expect(sprintActivo(getState().plan, '2026-11-19')).toMatchObject({ dia: 2 });
    iniciarSprintSinIA('2026-11-25');
    cortarSprintSinIA('2026-11-25');
    expect(getState().plan.sprintsSinIA).toHaveLength(1);
    sumarProblemas('2026-11-18', 1);
    sumarProblemas('2026-11-18', 1);
    sumarProblemas('2026-11-19', 3);
    sumarProblemas('2026-11-19', -1);
    expect(problemas(getState().plan)).toBe(4);
    expect(problemas(getState().plan, '2026-11-19')).toBe(2);
    sumarProblemas('2026-11-18', -5);
    expect(getState().plan.problemasSinIA).toEqual({ '2026-11-19': 2 });
  });
});

describe('ola 31 · algorithm spots', () => {
  it('los 16 temas del roadmap (la tabla trae 13 filas; las que juntan temas se separan), con su proyecto y modo', () => {
    expect(ALG.temas).toHaveLength(16);
    expect(ALG.temasRoadmap).toBe(20);
    expect(ALG.temas.filter((t) => t.modo === 'sin-ia').map((t) => t.id)).toEqual(['hash-maps', 'sliding-window', 'binary-search', 'sorting', 'two-pointers', 'heap', 'bfs', 'dfs', 'topologico']);
    expect(ALG.temas.find((t) => t.id === 'heap')!.proyectos).toEqual(['P2', 'P5', 'Q4']);
    // Coinciden con los spots de la ficha de PetrIA: 3 sin IA y 4 con IA.
    expect(ALG.temas.filter((t) => t.proyectos[0] === 'P1').length).toBe(7);
  });

  it('registrar un spot guarda la pregunta de entrevista; validado lo da por hecho; la línea para learning.md', () => {
    registrarSpot('lru', { fecha: '2026-12-01', proyecto: 'P1', pregunta: '¿Cómo harías un LRU en O(1)?' });
    let e = estadoTemas(getState().plan);
    expect(e.find((t) => t.id === 'lru')!.estado).toBe('registrado');
    registrarSpot('lru', { ...getState().plan.algoritmos!.lru, validado: true });
    e = estadoTemas(getState().plan);
    expect(e.find((t) => t.id === 'lru')!.estado).toBe('hecho');
    expect(lineaLearning(ALG.temas.find((t) => t.id === 'lru')!, getState().plan.algoritmos!.lru)).toBe('- **LRU (hash map + lista doble)** (con IA, 2026-12-01, P1): caché semántica. Pregunta de entrevista: ¿Cómo harías un LRU en O(1)?');
    registrarSpot('lru', null);
    expect(getState().plan.algoritmos).toEqual({});
  });

  it('los temas que faltan (hasta 20) se suman a mano', () => {
    agregarTemaAlgoritmo({ tema: 'Trie', proyectos: ['P8'], modo: 'sin-ia' });
    const ts = temas(getState().plan);
    expect(ts).toHaveLength(17);
    expect(ts[16]).toMatchObject({ tema: 'Trie', proyectos: ['P8'], propio: true });
  });
});
