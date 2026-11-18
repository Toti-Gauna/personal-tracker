import { describe, expect, it } from 'vitest';
import { avisosEntreRamas } from './avisos';
import { colorDeBloque, etiquetaDeBloque, tituloDeBloque } from './etiquetas';
import { DEFAULT_PLAN_SETTINGS, emptyPlan } from './plan-state';
import { emptyStudy } from './study-catalog';
import { buildBlocks, planDay } from './schedule';
import type { DayLog } from './types';

const cfg = DEFAULT_PLAN_SETTINGS;

describe('avisos entre ramas', () => {
  it('sin nada cargado y lejos de todo, no hay avisos', () => {
    expect(avisosEntreRamas('2026-11-18', emptyPlan(), cfg)).toEqual([]);
  });

  it('entrevista a 3 días o menos → trabajo → ingles; a 4, nada', () => {
    const p = { ...emptyPlan(), entrevistas: [{ id: 'e', fecha: '2026-12-17', hora: '11:00', rol: 'AI Engineer', prep: {} }] };
    expect(avisosEntreRamas('2026-12-14', p, cfg)[0]).toMatchObject({ de: 'trabajo', a: 'ingles', titulo: 'Entrevista el jueves 17 a las 11:00' });
    expect(avisosEntreRamas('2026-12-13', p, cfg).some((a) => a.de === 'trabajo')).toBe(false);
  });

  it('sin modo entrevista: el aviso manda a practicar en el bloque de búsqueda, y en inglés si lo es', () => {
    const e = { id: 'e', fecha: '2026-12-17', rol: 'AI Engineer', empresa: 'Acme', prep: {} };
    const cast = (modalidad?: string) => ({ ...emptyPlan(), entrevistas: [{ ...e, ...(modalidad ? { modalidad } : {}) }] });
    const ayer = avisosEntreRamas('2026-12-16', cast('remoto · entrevista técnica en inglés'), cfg)[0];
    expect(ayer.texto).toContain('bloque de búsqueda laboral');
    expect(ayer.texto).toContain('con el pitch armado y en inglés');
    expect(ayer.texto).not.toMatch(/simulacro|se parte|modo entrevista/i);
    expect(avisosEntreRamas('2026-12-16', cast('presencial'), cfg)[0].texto).not.toContain('en inglés');
    expect(avisosEntreRamas('2026-12-14', cast(), cfg)[0].texto).toContain('El día anterior');
  });

  it('proyecto que cierra en 14 días o menos con el estándar sin marcar → programacion → trabajo', () => {
    // Con la feature, la plataforma y la pausa adentro, Faro v1 se entrega el domingo 17 de enero.
    const a = avisosEntreRamas('2027-01-04', emptyPlan(), cfg).find((x) => x.de === 'programacion')!;
    expect(a).toMatchObject({ a: 'trabajo', titulo: 'Faro v1 se entrega el domingo 17', href: '#/metas/proyecto/P1' });
    const listo = { ...emptyPlan(), proyectos: { P1: { estandar: { ux: true, tresd: true, animacion: true, docs: true, venta: true, ingenieria: true }, tiempo: { nucleo: 0, producto: 0, lanzamiento: 0 }, revisiones: [] } } };
    expect(avisosEntreRamas('2027-01-04', listo, cfg).some((x) => x.de === 'programacion')).toBe(false);
    expect(avisosEntreRamas('2027-01-02', emptyPlan(), cfg).some((x) => x.de === 'programacion')).toBe(false);
  });

  it('ventana W que empieza en 7 días o menos → matematica → programacion', () => {
    // Con la v2, W1 empieza el lunes 22 de febrero.
    expect(avisosEntreRamas('2027-02-15', emptyPlan(), cfg).find((x) => x.de === 'matematica')).toMatchObject({ a: 'programacion', titulo: 'La ventana W1 empieza el lunes 22' });
    expect(avisosEntreRamas('2027-02-14', emptyPlan(), cfg).some((x) => x.de === 'matematica')).toBe(false);
  });

  it('el inicio del trabajo es una fecha: ya no hay aviso de T+2 que pida cambiar de rutina', () => {
    expect(avisosEntreRamas('2027-01-12', emptyPlan(), { ...cfg, t2: '2027-01-11' }).some((x) => x.id === 't2')).toBe(false);
  });
});

describe('etiqueta de rama en Hoy', () => {
  const dia = (date: string, entrevista: { rol: string } | false = false): DayLog => ({ date, wake: '04:00', routine: 'completo', dayType: 'weekday', blocks: buildBlocks(planDay(date, 'completo', undefined, 'weekday', { entrevista })), notes: [], focus: [] });

  it('el lunes 14 dic: cada meta dice su rama y su etapa', () => {
    const p = { ...emptyPlan(), entrevistas: [{ id: 'e', fecha: '2026-12-17', rol: 'AI', prep: {} }] };
    const d = dia('2026-12-14');
    const tag = (k: string) => etiquetaDeBloque(d.blocks.find((b) => b.key === k)!, { day: d, plan: p, study: emptyStudy() });
    expect(tag('rutina')).toBe('main · rutina');
    expect(tag('math')).toBe('matematica · Aritmética cap. 1 de 11');
    expect(tag('prog')).toBe('programacion · P1 · semana 3 de 6');
    expect(tag('trabajo')).toBe('fuera del plan');
    expect(tag('busqueda')).toBe('trabajo · semana 5 de 8 · 1 h 30 hoy');
    expect(tag('handyx')).toBe('handyx · Lanzar · semana 5 de 13');
    expect(tag('prog-tarde')).toBe('programacion · Faro v1');
    expect(tag('entreno')).toBe('salud · fuerza');
    expect(tag('cierre')).toBe('main · JSON del día');
    expect(tituloDeBloque(d.blocks.find((b) => b.key === 'prog')!, d.date)).toBe('Programación · Faro v1');
  });

  it('el color sale de la rama; main, del área; fuera del plan, gris', () => {
    expect(colorDeBloque({ rama: 'ingles', area: 'ing' }, true)).toBe('var(--idi)');
    expect(colorDeBloque({ rama: 'main', area: 'rutina' }, true)).toBe('var(--rutina)');
    expect(colorDeBloque({ area: 'economia' }, true)).toBe('var(--sub)');
    expect(colorDeBloque({ area: 'economia' }, false)).toBe('var(--economia)');
  });
});
