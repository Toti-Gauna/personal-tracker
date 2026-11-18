import { beforeEach, describe, expect, it } from 'vitest';
import { setPlanSettings } from '../state/plan';
import { getState, inicioTrabajo, planSettings, register, resetState, startDay } from '../state/store';
import { HORARIO_TRABAJO, ajustarTrabajo, conPendientes, pendienteEncaja, planRoutine, routineFor } from './routines';
import { buildBlocks, planDay } from './schedule';
import { horasSemana } from './sprint';

const horario = (p: ReturnType<typeof planRoutine>) => p.map((x) => [x.block.id, x.start, x.min]);

describe('ola 27 · rutinas v3', () => {
  beforeEach(() => { resetState(); register('Toti', 'Abi', '2026-11-16'); });

  it('horas por semana de cada rutina', () => {
    expect(horasSemana('busqueda-intensiva', 'busqueda-intensiva-finde')).toMatchObject({ Programación: 53, Matemática: 7, Inglés: 7, Entrenamiento: 10 });
    expect(horasSemana('con-trabajo', 'con-trabajo-finde')).toMatchObject({ Programación: 29, Matemática: 14, Inglés: 6.5 });
  });

  it('la rutina cambia en la fecha de inicio del trabajo (11 ene 2027 por defecto), también el fin de semana', () => {
    const cfg = { ...planSettings(getState().settings), inicioTrabajo: inicioTrabajo(getState().settings) };
    expect(cfg.inicioTrabajo).toBe('2027-01-11');
    expect(routineFor('2027-01-08', cfg)).toBe('busqueda-intensiva');
    expect(routineFor('2027-01-09', cfg)).toBe('busqueda-intensiva-finde');
    expect(routineFor('2027-01-11', cfg)).toBe('con-trabajo');
    expect(routineFor('2027-01-16', cfg)).toBe('con-trabajo-finde');
    // Cargar otra fecha mueve el corte.
    setPlanSettings({ t2: '2026-12-14' });
    expect(inicioTrabajo(getState().settings)).toBe('2026-12-14');
    startDay('completo', '04:00', '2026-12-14');
    expect(getState().days['2026-12-14'].dayType).toBe('con-trabajo');
  });

  it('con trabajo: salida a las 16:00 es la rutina de fábrica; a las 18:00 la matemática de la tarde queda como deuda', () => {
    const base = planRoutine('con-trabajo', 'completo');
    expect(ajustarTrabajo(base, HORARIO_TRABAJO).tarde).toEqual({ sinMatematica: false, entrenoMin: 150 });
    expect(horario(ajustarTrabajo(base, HORARIO_TRABAJO).plan)).toEqual(horario(base));
    const tarde = ajustarTrabajo(base, { inicio: '10:00', fin: '18:00' });
    expect(tarde.tarde).toEqual({ sinMatematica: true, entrenoMin: 90 });
    const h = Object.fromEntries(horario(tarde.plan).map(([id, s, m]) => [id, [s, m]]));
    expect(h['math-tarde']).toBeUndefined();
    expect(h.ingles).toEqual(['18:00', 30]);
    expect(h.entreno).toEqual(['18:30', 90]);
    expect(h.prog).toEqual(['05:30', 180]);
  });

  it('el domingo, el cierre suma la revisión semanal y la mini-tesis', () => {
    startDay('completo', '04:00', '2026-11-22');
    const c = getState().days['2026-11-22'].blocks.find((b) => b.key === 'cierre')!;
    expect(c.tasks.map((t) => t.t)).toEqual(expect.arrayContaining(['Revisión semanal (30 min)', 'Mini-tesis de una página']));
    startDay('completo', '04:00', '2026-11-21');
    expect(getState().days['2026-11-21'].blocks.find((b) => b.key === 'cierre')!.tasks.map((t) => t.t)).not.toContain('Revisión semanal (30 min)');
  });

  it('bloques pendientes: no pisan otras metas; el descanso del fin de semana cede su tiempo', () => {
    expect(pendienteEncaja({ start: '17:00', min: 90, dias: 'lv' })).toMatch(/Pisa a/);
    expect(pendienteEncaja({ start: '17:00', min: 120, dias: 'finde' })).toBeNull();
    expect(pendienteEncaja({ start: '08:00', min: 60, dias: 'finde' })).toMatch(/Pisa a/);
    const p = conPendientes(planRoutine('busqueda-intensiva-finde', 'completo'), { clipping: { start: '17:00', min: 120, dias: 'finde' } }, 'busqueda-intensiva-finde');
    const h = Object.fromEntries(horario(p).map(([id, s, m]) => [id, [s, m]]));
    expect(h.clipping).toEqual(['17:00', 120]);
    expect(h.cierre).toEqual(['19:00', 120]);
    expect(h.sueno[0]).toBe('21:00');
    // Entre semana el día está lleno: no se suma.
    const lv = conPendientes(planRoutine('busqueda-intensiva', 'completo'), { handyx: { start: '17:00', min: 60, dias: 'todos' } }, 'busqueda-intensiva');
    expect(lv.some((x) => x.block.id === 'handyx')).toBe(false);
  });

  it('con una entrevista en 48 h, el último bloque de programación pasa a preparación', () => {
    getState().plan.entrevistas.push({ id: 'e', fecha: '2026-11-20', rol: 'AI Engineer', empresa: 'Acme', modalidad: 'remoto', prep: {} });
    const dia = (d: string) => { startDay('completo', '04:00', d); return getState().days[d].blocks; };
    expect(dia('2026-11-18').find((b) => b.key === 'prog-tarde')!.title).toMatch(/^Preparación de la entrevista/);
    expect(dia('2026-11-17').find((b) => b.key === 'prog-tarde')!.title).not.toMatch(/Preparación/);
    expect(buildBlocks(planDay('2026-11-18', 'completo', undefined, 'busqueda-intensiva')).length).toBeGreaterThan(5);
  });
});
