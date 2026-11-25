import { beforeEach, describe, expect, it } from 'vitest';
import { setPlanSettings, iniciarSprintSinIA, cortarSprintSinIA, sumarProblemas, registrarSpot, agregarTemaAlgoritmo } from '../state/plan';
import { getState, register, resetState, startDay } from '../state/store';
import { ALG, estadoTemas, lineaLearning, problemas, sprintActivo, temas } from './algoritmos';
import { convertiblesIntensiva, horasRutinaIntensiva } from './capacidad';
import { ajustarDia, planRoutine } from './routines';

const bloques = (d: string) => getState().days[d].blocks;
const dia = (d: string) => { startDay('completo', '04:00', d); return bloques(d); };

beforeEach(() => { resetState(); register('Toti', 'Abi', '2026-11-16'); });

describe('v12.1 · rutina de lunes a viernes (10 h) y horas extra', () => {
  it('lunes a viernes (v12.4): proyecto 4:30–8:30 y 12:00–13:45, el cierre de hábitos de 13:45 a 16:00, las dos horas de fondo hasta las 18:00 y el post de martes y jueves', () => {
    const b = dia('2026-11-18');
    expect(b.map((x) => [x.key, x.start])).toEqual([
      ['rutina', '04:00'], ['prog', '04:30'], ['abi', '08:30'], ['trabajo', '10:00'], ['prog-tarde', '12:00'], ['prog-review', '13:45'],
      ['ingles', '14:40'], ['recall', '14:55'], ['anki', '15:15'], ['busqueda', '15:30'], ['leer', '15:45'],
      // El 18 nov todavía no corre nada de fondo (JulIA arranca el 26): las dos horas vuelven al bloque 2 de la principal.
      ['prog-fondo-sec', '16:00'], ['prog-fondo-com', '17:00'], ['entreno', '18:00'], ['cierre', '20:00'], ['sueno', '21:00'],
    ]);
    // Anthropic Academy quedó en el roadmap v7 archivado: no hay bloque.
    expect(b.some((x) => x.key === 'academy' || x.key === 'prog-academy')).toBe(false);
    // Martes y jueves: los últimos 30 min de la tarde son el post del día.
    const jue = dia('2026-11-19');
    expect(jue.find((x) => x.key === 'prog-tarde')).toMatchObject({ start: '12:00', min: 75 });
    expect(jue.find((x) => x.key === 'post')).toMatchObject({ start: '13:15', min: 30, rama: 'trabajo' });
  });

  it('la rutina da 46,2 h por semana de proyecto con las dos pistas de fondo activas (60,2 sin ellas); sin trabajo nuevo no hay meta de horas extra de PetrIA', () => {
    expect(horasRutinaIntensiva()).toEqual({ semana: 46.2, meta: 0, falta: 0 });
    // Lo que se puede pasar a proyecto: nunca sueño, entreno, Abi, trabajo ni la rutina.
    const ids = convertiblesIntensiva().map((c) => c.id);
    expect(ids).toEqual(expect.arrayContaining(['ingles', 'busqueda', 'leer', 'cierre']));
    // Los hábitos (recall, Anki, post, demo y revisión) no se convierten en horas de proyecto.
    for (const h of ['recall', 'anki', 'post', 'demo', 'revision']) expect(ids).not.toContain(h);
    for (const no of ['sueno', 'entreno', 'abi', 'trabajo', 'rutina', 'prog']) expect(ids).not.toContain(no);
    expect(convertiblesIntensiva().find((c) => c.id === 'ingles')).toMatchObject({ minSemana: 105, dias: 'L a V, sábado, domingo' });
    expect(horasRutinaIntensiva(['ingles'])).toEqual({ semana: 47.9, meta: 0, falta: 0 });
    // Aunque se pida, el entreno no se convierte.
    expect(horasRutinaIntensiva(['entreno'])).toEqual({ semana: 46.2, meta: 0, falta: 0 });
  });

  it('las horas extra elegidas pasan a proyecto; sin fecha de trabajo nuevo, rigen todo el plan', () => {
    setPlanSettings({ extraProyecto: ['ingles'] });
    const b = dia('2026-11-18');
    expect(b.find((x) => x.key === 'prog-extra-ingles')).toMatchObject({ start: '14:40', min: 15, rama: 'programacion' });
    expect(b.some((x) => x.key === 'ingles')).toBe(false);
    expect(dia('2027-06-02').some((x) => x.key === 'prog-extra-ingles')).toBe(true);
  });

  it('el sprint sin IA parte el proyecto de la mañana: 30 min de algoritmos y después el proyecto', () => {
    iniciarSprintSinIA('2026-11-18');
    const b = dia('2026-11-19');
    expect(b.find((x) => x.key === 'algoritmos')).toMatchObject({ start: '04:30', min: 30, title: 'Algoritmos sin IA · día 2 de 14' });
    expect(b.find((x) => x.key === 'prog')).toMatchObject({ start: '05:00', min: 210 });
    // Pasados los 14 días, no.
    expect(dia('2026-12-02').some((x) => x.key === 'algoritmos')).toBe(false);
    expect(sprintActivo(getState().plan, '2026-12-01')).toMatchObject({ dia: 14, fin: '2026-12-01' });
    // Funciona igual el fin de semana (el proyecto de la mañana arranca a las 4:30).
    const p = ajustarDia(planRoutine('busqueda-intensiva-finde', 'completo'), { sprintSinIA: { dia: 3 } });
    expect(p.find((x) => x.block.id === 'algoritmos')!.start).toBe('04:30');
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
