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

describe('ola 27 · control, alertas y deuda de matemática', () => {
  it('días 10 y 20 del modo intensivo: con menos del 85 % de las horas planificadas, avisa con los recortes en orden', async () => {
    const { alertaHorasIntensivo, controlHoras, diaIntensivo, ordenDeRecortes, deudaMatematica } = await import('./control');
    const c = { t0: '2026-11-16', inicioTrabajo: '2027-01-11' };
    expect(diaIntensivo('2026-11-22', c)).toBe(0);
    expect(diaIntensivo('2026-11-23', c)).toBe(1);
    expect(diaIntensivo('2026-12-02', c)).toBe(10);
    expect(diaIntensivo('2026-12-12', c)).toBe(20);
    expect(diaIntensivo('2027-01-11', c)).toBe(0);
    // Nada registrado: 0 % de lo planificado.
    const h = controlHoras('2026-12-02', {}, c)!;
    expect(h).toMatchObject({ dia: 10, reales: 0, debajo: true });
    expect(h.planificadas).toBeCloseTo(9 * 7 + 0, -1);
    const a = alertaHorasIntensivo('2026-12-02', {}, c)!;
    expect(a.titulo).toMatch(/Día 10 del modo intensivo: 0 %/);
    // Orden de recortes: primero el conector de terceros (P1), después la accesibilidad (P2).
    expect(ordenDeRecortes()).toEqual(['Conector a una API de terceros en sandbox', 'Revisión de accesibilidad']);
    expect(a.texto.indexOf('Conector')).toBeLessThan(a.texto.indexOf('accesibilidad'));
    expect(a.texto).toMatch(/Nunca el sueño, el entrenamiento ni los repasos/);
    // Dos días después todavía se ve; al cuarto, no.
    expect(alertaHorasIntensivo('2026-12-04', {}, c)).not.toBeNull();
    expect(alertaHorasIntensivo('2026-12-06', {}, c)).toBeNull();
    // El día 20 mide de nuevo.
    expect(alertaHorasIntensivo('2026-12-12', {}, c)!.id).toBe('horas-dia-20');
    // Con el 100 % de lo planificado no avisa.
    const dias: Record<string, import('./types').DayLog> = {};
    const { horasDelDia } = await import('./capacidad');
    const { addDays } = await import('./time');
    for (let d = '2026-11-23'; d < '2026-12-02'; d = addDays(d, 1)) dias[d] = { date: d, wake: '04:00', routine: 'completo', notes: [], blocks: [{ key: 'prog', n: 1, title: 'P', short: 'p', area: 'ing', kind: 'pomodoro', start: '05:30', min: 180, fixed: false, rama: 'programacion', tasks: [] }], focus: [{ key: 'prog', plan: 'p', focusMin: horasDelDia(d, { ...c, pausas: true }) * 60, at: '07:00' }] } as import('./types').DayLog;
    expect(controlHoras('2026-12-02', dias, c)!.debajo).toBe(false);
    expect(alertaHorasIntensivo('2026-12-02', dias, c)).toBeNull();
    // Deuda de matemática: 1 h por día desde el inicio de P1.
    expect(deudaMatematica('2026-12-02', c).horas).toBe(9);
    expect(deudaMatematica('2027-03-01', c).horas).toBe(49);
  });

  it('alerta cuando un proyecto arranca antes de que termine el tramo de matemática que lo habilita (solo los nombrados)', async () => {
    const { alertasMatematica, habilitaciones } = await import('./control');
    expect(habilitaciones().map((h) => `${h.tramo}>${h.proyecto}`)).toEqual(['m2>P4', 'm2>P9', 'm3>P7']);
    // P4 arranca el 15 mar 2027 y m2 termina el 22 jul 2027.
    const a = alertasMatematica('2027-03-10', '2026-11-16');
    expect(a.map((x) => x.id)).toEqual(['mate-m2-P4']);
    expect(a[0].titulo).toBe('P4 arranca antes de que termine m2');
    // P9 arranca después de que m2 termine: nunca avisa. P7 sí, con la nota de la pieza de PCA y SVD.
    expect(alertasMatematica('2027-08-05', '2026-11-16').map((x) => x.id)).toEqual(['mate-m3-P7']);
    expect(alertasMatematica('2027-08-05', '2026-11-16')[0].texto).toMatch(/PCA y SVD de P7 pasa después de W3 o a P9/);
    expect(alertasMatematica('2026-12-01', '2026-11-16')).toEqual([]);
  });
});
