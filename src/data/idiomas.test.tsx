import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getState, register, resetState, startDay } from '../state/store';
import { IdiomasPlan } from '../screens/Idiomas';
import { tituloDeBloque } from './etiquetas';
import {
  ERRORES_IDIOMAS, IDIOMAS, alertasIdiomas, aniosIdiomas, calendarioIdiomas, eventosIdiomas, faseIdiomaEn, horasDeLaRutina, nivelesIdiomas, validarIdiomas, type IdiomasFile,
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

  it('las alertas: el examen desde 8 semanas antes, el trimestre en 7 días y la tesis en 14', () => {
    expect(alertasIdiomas('2027-06-20', T0)).toEqual([]);
    expect(alertasIdiomas('2027-06-21', T0).map((a) => a.id)).toEqual(['idioma-a1-examen']);
    expect(alertasIdiomas('2027-06-21', T0)[0].texto).toMatch(/sin verificar/);
    expect(alertasIdiomas('2027-02-08', T0).map((a) => a.id)).toEqual(['idioma-a1-t1']);
    expect(alertasIdiomas('2027-12-14', T0).map((a) => a.id)).toContain('idioma-a1-tesis');
    // Entran al panel de alertas de las etapas.
    expect(alertas('2027-06-21', emptyPlan(), T0).some((a) => a.tipo === 'idioma')).toBe(true);
  });

  it('hoy sos → vas a ser: inglés B1–B2 hacia C1; con el año 1 cerrado, inglés C1 hacia francés B1', () => {
    expect(nivelesIdiomas('2026-11-20', T0)).toMatchObject({ sos: ['Inglés B1–B2'], vasASer: 'Inglés C1' });
    expect(nivelesIdiomas('2028-01-10', T0)).toMatchObject({ sos: ['Inglés C1'], vasASer: 'Francés B1' });
  });

  it('el modo intensivo le da al bloque de idiomas 7 h por semana (el roadmap pide 11,5)', () => {
    expect(horasDeLaRutina()).toBe(7);
  });
});

describe('integración con el plan T+18', () => {
  it('la rama de idiomas del plan lee las fases del roadmap (sin "modo entrevista" ni "45 min por día")', () => {
    expect(PLAN.ingles.fases.map((f) => f.id).slice(0, 6)).toEqual(['a1-mwm', 'a1-pronunciacion', 'a1-gramatica', 'a1-cambridge', 'a1-examen', 'a1-consolidacion']);
    expect(PLAN.ingles.fases[6].nombre).toBe('Francés · Francés básico');
    expect(JSON.stringify(PLAN.ingles.fases)).not.toMatch(/entrevista|45 min/i);
    expect(PLAN.metasBimestre.ingles[0]).toBe('Measure What Matters y Pronunciación');
    expect(PLAN.hitos.find((h) => h.id === 'T+18')!.titulo).not.toMatch(/examen C1/);
  });

  it('el bloque de idiomas de Hoy es inglés técnico y de entrevista, con las tareas de la rutina', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 10, 17, 7, 0));
    resetState();
    register('Toti', 'Abi', T0);
    startDay('completo', '04:00', '2026-11-17');
    const b = getState().days['2026-11-17'].blocks.find((x) => x.key === 'ingles')!;
    expect(tituloDeBloque(b, '2026-11-17')).toBe('Inglés técnico y de entrevista');
    expect(b.tasks.map((t) => t.t)).toEqual(['Explicar un proyecto en voz alta (inglés técnico)', 'Práctica de código en vivo en inglés', 'Preguntas de entrevista en inglés']);
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

describe('pantallas de Idiomas', () => {
  const D = '2026-11-20';
  const day = { date: D, wake: '04:00', routine: 'completo' as const, blocks: [], notes: [], focus: [] };
  beforeEach(() => { resetState(); register('Toti', 'Abi', T0); });
  afterEach(() => vi.useRealTimers());

  it('el roadmap: estás acá, hoy sos → vas a ser, horas y la escalera de 6 años', () => {
    render(<IdiomasPlan day={day} param="idiomas" />);
    expect(screen.getByRole('heading', { name: 'Idiomas y libros' })).toBeInTheDocument();
    expect(screen.getByText('Inglés · Measure What Matters')).toBeInTheDocument();
    expect(screen.getByText('Inglés B1–B2')).toBeInTheDocument();
    expect(screen.getByText('Inglés C1')).toBeInTheDocument();
    expect(screen.getByText(/pide 11,5 h por semana · la búsqueda intensiva le da 7 h/)).toBeInTheDocument();
    const tl = document.querySelector('.re-tl') as HTMLElement;
    expect(within(tl).getAllByRole('link').map((a) => a.querySelector('b')!.textContent)).toEqual(['Inglés', 'Francés', 'Italiano', 'Alemán', 'Japonés', 'Chino']);
  });

  it('el año de inglés: fases con fechas, el enlace de Udemy queda en el teléfono y los libros de la consolidación', () => {
    render(<IdiomasPlan day={day} param="idiomas/ingles" />);
    expect(screen.getByRole('heading', { name: 'Inglés' })).toBeInTheDocument();
    expect(screen.getByText('Preparación Cambridge C1 Advanced + Advanced Grammar in Use')).toBeInTheDocument();
    expect(screen.getByText('Make It Stick')).toBeInTheDocument();
    const input = screen.getByLabelText('Enlace del curso de Udemy');
    fireEvent.change(input, { target: { value: 'no-es-un-enlace' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    expect(getState().idiomas.enlaces).toEqual({});
    fireEvent.change(screen.getByLabelText('Enlace del curso de Udemy'), { target: { value: 'https://ejemplo.com/curso' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    expect(getState().idiomas.enlaces).toEqual({ 'udemy-ingles': 'https://ejemplo.com/curso' });
    expect(screen.getByRole('link', { name: 'Abrir el curso de Udemy' })).toHaveAttribute('href', 'https://ejemplo.com/curso');
  });

  it('la biblioteca y el ascenso a C1', () => {
    const { unmount } = render(<IdiomasPlan day={day} param="idiomas/biblioteca" />);
    expect(screen.getByText('Bloque 1 · Pensar, decidir y negociar')).toBeInTheDocument();
    expect(screen.getAllByText(/sin capítulos/).length).toBeGreaterThanOrEqual(42);
    unmount();
    render(<IdiomasPlan day={day} param="idiomas/ascenso" />);
    expect(screen.getByText('Italiano C1')).toBeInTheDocument();
    expect(screen.getByText('feb 2045 (aprox.)')).toBeInTheDocument();
  });
});
