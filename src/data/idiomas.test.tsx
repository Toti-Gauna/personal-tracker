import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getState, register, resetState, startDay } from '../state/store';
import { tituloDeBloque } from './etiquetas';
import {
  ERRORES_IDIOMAS, IDIOMAS, IDIOMAS_ARCHIVADO, alertasIdiomas, aniosIdiomas, calendarioIdiomas, eventosIdiomas, faseIdiomaEn, horasDeLaRutina, nivelesIdiomas, validarIdiomas, type IdiomasFile,
} from './idiomas';
import { BIBLIOTECA, nucleo, validarBiblioteca } from './libros';
import { alertas } from './plan-vistas';
import { emptyPlan } from './plan-state';
import { PLAN } from './plan';

const T0 = '2026-11-16';

describe('data/idiomas.json · el roadmap maestro v3', () => {
  it('es válido: 6 años, 6 idiomas, un examen por año', () => {
    expect(ERRORES_IDIOMAS).toEqual([]);
    expect(IDIOMAS.anios.map((a) => [a.idioma, a.examen])).toEqual([
      ['ingles', 'Cambridge C1 Advanced'], ['frances', 'DELF B1'], ['italiano', 'CILS o PLIDA B1'], ['aleman', 'Goethe A2'], ['japones', 'JLPT N4'], ['chino', 'HSK elemental (2 a 3)'],
    ]);
    expect(IDIOMAS.horasSemana).toBe(11.5);
  });

  it('el año 1 son 58 semanas (16 nov 2026 a 26 dic 2027) y los demás 40 + 12; el año 6 termina el 19 dic 2032', () => {
    const as = aniosIdiomas(T0);
    expect([as[0].inicio, as[0].fin, as[0].semanas]).toEqual(['2026-11-16', '2027-12-26', 58]);
    expect(as[0].fases.map((f) => f.semanas)).toEqual([6, 6, 7, 20, 7, 12]);
    for (const a of as.slice(1)) expect(a.fases.map((f) => f.semanas)).toEqual([5, 11, 3, 5, 16, 12]);
    expect(as[1].inicio).toBe('2027-12-27');
    expect(as[5].fin).toBe('2032-12-19');
  });

  it('las fases del año 1 caen en sus fechas', () => {
    const a1 = calendarioIdiomas(T0).filter((f) => f.anio === 1).map((f) => [f.id, f.inicio, f.fin]);
    expect(a1).toEqual([
      ['mwm', '2026-11-16', '2026-12-27'], ['pronunciacion', '2026-12-28', '2027-02-07'], ['gramatica', '2027-02-08', '2027-03-28'],
      ['cambridge', '2027-03-29', '2027-08-15'], ['examen', '2027-08-16', '2027-10-03'], ['consolidacion', '2027-10-04', '2027-12-26'],
    ]);
  });

  it('el validador marca años fuera de orden, fases sin semanas, consolidación sin libros y fechas mal escritas', () => {
    const f = structuredClone(IDIOMAS) as IdiomasFile;
    f.anios[1].n = 7;
    f.anios[0].fases[0].semanas = 0;
    f.anios[0].fases[5].libros = [];
    f.faseB.hitos[0].fecha = 'nov 2033';
    const e = validarIdiomas(f).join('\n');
    expect(e).toMatch(/año 7: los años van en orden/);
    expect(e).toMatch(/mwm: "semanas"/);
    expect(e).toMatch(/consolidación necesita sus libros/);
    expect(e).toMatch(/Fase B · italiano-c1: "fecha"/);
  });

  it('cada trimestre (13 semanas) hay ensayo y examen; la tesis anual va en la última semana', () => {
    const ev = eventosIdiomas(T0).filter((e) => e.anio === 1);
    expect(ev.filter((e) => e.tipo === 'trimestre').map((e) => e.fecha)).toEqual(['2027-02-14', '2027-05-16', '2027-08-15', '2027-11-14']);
    expect(ev.find((e) => e.tipo === 'tesis')).toMatchObject({ fecha: '2027-12-26', texto: 'Tesis anual · año 1 (Inglés)' });
    expect(ev.find((e) => e.tipo === 'examen')).toMatchObject({ desde: '2027-08-16', fecha: '2027-10-03', texto: 'Examen Cambridge C1 Advanced' });
    expect(eventosIdiomas(T0).filter((e) => e.anio === 2 && e.tipo === 'trimestre')).toHaveLength(4);
  });

  it('las alertas del plan de 6 años no salen: quedó archivado en v12.1 (el inglés vive en los bloques del plan)', () => {
    expect(IDIOMAS_ARCHIVADO).toBe(true);
    // Antes: el examen desde 8 semanas antes (21 jun 2027), el trimestre en 7 días (8 feb 2027) y la tesis en 14 (14 dic 2027).
    for (const f of ['2027-06-21', '2027-02-08', '2027-12-14']) expect(alertasIdiomas(f, T0)).toEqual([]);
    expect(alertas('2027-06-21', emptyPlan(), T0).some((a) => a.tipo === 'idioma')).toBe(false);
  });

  it('hoy sos → vas a ser: inglés B1–B2 hacia C1; con el año 1 cerrado, inglés C1 hacia francés B1', () => {
    expect(nivelesIdiomas('2026-11-20', T0)).toMatchObject({ sos: ['Inglés B1–B2'], vasASer: 'Inglés C1' });
    expect(nivelesIdiomas('2028-01-10', T0)).toMatchObject({ sos: ['Inglés C1'], vasASer: 'Francés B1' });
  });

  it('el modo intensivo (v12.1) le da al inglés 15 min por día del cierre: 1,8 h por semana', () => {
    expect(horasDeLaRutina()).toBe(1.8);
  });
});

describe('integración con el plan T+18', () => {
  it('la rama de idiomas del plan lee las fases del año de inglés (sin "modo entrevista" ni "45 min por día")', () => {
    // v12.1: el calendario por semanas termina en T+18 (semana 53), así que solo entra el año de inglés.
    expect(PLAN.ingles.fases.map((f) => f.id)).toEqual(['a1-mwm', 'a1-pronunciacion', 'a1-gramatica', 'a1-cambridge', 'a1-examen', 'a1-consolidacion']);
    expect(PLAN.ingles.fases[5].hasta).toBe(53);
    expect(JSON.stringify(PLAN.ingles.fases)).not.toMatch(/entrevista|45 min/i);
    expect(PLAN.metasBimestre.ingles[0]).toBe('Measure What Matters y Pronunciación');
    expect(PLAN.hitos.find((h) => h.id === 'T+18')!.titulo).not.toMatch(/examen C1/);
  });

  it('el bloque de inglés de Hoy (v12.1) es el 2-min English + learning.md del cierre, sin inglés hablado aparte', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 10, 17, 7, 0));
    resetState();
    register('Toti', 'Abi', T0);
    startDay('completo', '04:00', '2026-11-17');
    const b = getState().days['2026-11-17'].blocks.find((x) => x.key === 'ingles')!;
    // v12.1: 16:40 a 16:55, dentro del cierre de las 15:45.
    expect(tituloDeBloque(b, '2026-11-17')).toBe('2-min English + learning.md');
    expect(b).toMatchObject({ start: '16:40', min: 15 });
    expect(getState().days['2026-11-17'].blocks.find((x) => x.key === 'ingles-hablado')).toBeUndefined();
    expect(b.tasks.map((t) => t.t)).toEqual(['Explicar en inglés en 2 minutos lo que hiciste', 'Anotar en learning.md']);
    // La fase del roadmap sigue disponible en Estudio · Idiomas.
    expect(faseIdiomaEn('2026-11-17').tareas.length).toBeGreaterThan(0);
    vi.useRealTimers();
  });
});

describe('la biblioteca', () => {
  it('42 libros núcleo en 6 bloques de 7, 12 de la Fase A (2 por año) y 13 opcionales', () => {
    expect(validarBiblioteca()).toEqual([]);
    expect(nucleo()).toHaveLength(42);
    expect(BIBLIOTECA.opcionales).toHaveLength(13);
    // Los libros de la consolidación de cada año existen en la biblioteca.
    const ids = new Set(nucleo().map((l) => l.id));
    for (const a of IDIOMAS.anios) for (const f of a.fases) for (const id of f.libros ?? []) expect(ids.has(id), id).toBe(true);
    expect(nucleo().filter((l) => l.faseA === 1).map((l) => l.titulo)).toEqual(['Make It Stick', 'Getting to Yes']);
  });
});
