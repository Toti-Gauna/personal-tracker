import { beforeEach, describe, expect, it } from 'vitest';
import { setPlanSettings } from '../state/plan';
import { getState, inicioTrabajo, planSettings, register, resetState, startDay } from '../state/store';
import { HORARIO_TRABAJO, ajustarTrabajo, conPendientes, pendienteEncaja, planRoutine, routineFor } from './routines';
import { buildBlocks, planDay } from './schedule';
import { horasSemana } from './sprint';

const horario = (p: ReturnType<typeof planRoutine>) => p.map((x) => [x.block.id, x.start, x.min]);

describe('ola 27 · rutinas v3', () => {
  beforeEach(() => { resetState(); register('Toti', 'Abi', '2026-11-16'); });

  it('horas por semana de cada rutina (v12.1: 10 h de lunes a viernes y 11 h el fin de semana; con trabajo, la archivada)', () => {
    expect(horasSemana('busqueda-intensiva', 'busqueda-intensiva-finde')).toMatchObject({ Programación: 46.2, Búsqueda: 3, Entrenamiento: 10, Handyx: 0, Clipping: 0 });
    expect(horasSemana('con-trabajo', 'con-trabajo-finde')).toMatchObject({ Programación: 29, Matemática: 14, Inglés: 6.5 });
  });

  it('v12.1 no tiene fecha de trabajo nuevo: rige la rutina del plan todo el tiempo; cargar una fecha corta a la rutina con trabajo', () => {
    const cfg = { ...planSettings(getState().settings), inicioTrabajo: inicioTrabajo(getState().settings) };
    // Sin fecha: el corte queda a 100 años (nunca llega).
    expect(cfg.inicioTrabajo > '2100-01-01').toBe(true);
    expect(routineFor('2027-01-01', cfg)).toBe('busqueda-intensiva');
    expect(routineFor('2027-01-02', cfg)).toBe('busqueda-intensiva-finde');
    expect(routineFor('2027-01-03', cfg)).toBe('busqueda-intensiva-domingo');
    expect(routineFor('2027-01-04', cfg)).toBe('busqueda-intensiva');
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

  it('el domingo (v12.1) tiene la revisión semanal de 15:45 a 17:00 y el sábado la demo; con trabajo, el cierre suma la revisión y la mini-tesis', () => {
    startDay('completo', '04:00', '2026-11-22');
    const dom = getState().days['2026-11-22'].blocks;
    expect(dom.find((b) => b.key === 'revision')).toMatchObject({ start: '15:45', min: 75, rama: 'main' });
    expect(dom.find((b) => b.key === 'cierre')!.tasks.map((t) => t.t)).not.toContain('Revisión semanal (30 min)');
    startDay('completo', '04:00', '2026-11-21');
    expect(getState().days['2026-11-21'].blocks.find((b) => b.key === 'demo')).toMatchObject({ start: '15:45', min: 75, rama: 'trabajo' });
    // La rutina con trabajo (archivada) solo rige si cargás una fecha.
    setPlanSettings({ t2: '2027-01-04' });
    startDay('completo', '04:00', '2027-01-10');
    const c = getState().days['2027-01-10'].blocks.find((b) => b.key === 'cierre')!;
    expect(c.tasks.map((t) => t.t)).toEqual(expect.arrayContaining(['Revisión semanal (30 min)', 'Mini-tesis de una página']));
    startDay('completo', '04:00', '2027-01-09');
    expect(getState().days['2027-01-09'].blocks.find((b) => b.key === 'cierre')!.tasks.map((t) => t.t)).not.toContain('Revisión semanal (30 min)');
  });

  it('bloques pendientes: no pisan otras metas; el descanso del fin de semana cede su tiempo', () => {
    expect(pendienteEncaja({ start: '17:00', min: 90, dias: 'lv' })).toMatch(/Pisa a/);
    expect(pendienteEncaja({ start: '17:00', min: 120, dias: 'finde' })).toBeNull();
    expect(pendienteEncaja({ start: '08:00', min: 60, dias: 'finde' })).toMatch(/Pisa a Bloque 1/);
    const p = conPendientes(planRoutine('busqueda-intensiva-finde', 'completo'), { clipping: { start: '18:00', min: 120, dias: 'finde' } }, 'busqueda-intensiva-finde');
    const h = Object.fromEntries(horario(p).map(([id, s, m]) => [id, [s, m]]));
    expect(h.clipping).toEqual(['18:00', 120]);
    // v12.1: el sábado queda libre desde las 17:00; el bloque de 18 a 20 le deja al descanso la hora de antes.
    expect(h.cierre).toEqual(['17:00', 60]);
    expect(h.sueno[0]).toBe('21:00');
    // Entre semana el día está lleno: no se suma.
    const lv = conPendientes(planRoutine('busqueda-intensiva', 'completo'), { handyx: { start: '17:00', min: 60, dias: 'todos' } }, 'busqueda-intensiva');
    expect(lv.some((x) => x.block.id === 'handyx')).toBe(false);
  });

  it('con una entrevista en 48 h, el último bloque de programación pasa a preparación', () => {
    getState().plan.entrevistas.push({ id: 'e', fecha: '2026-11-20', rol: 'AI Engineer', empresa: 'Acme', modalidad: 'remoto', prep: {} });
    const dia = (d: string) => { startDay('completo', '04:00', d); return getState().days[d].blocks; };
    // El último bloque de proyecto del día es la hora de las 17:00 (el 18 nov no corre nada de fondo: vuelve a la principal).
    expect(dia('2026-11-18').find((b) => b.key === 'prog-fondo-com')!.title).toMatch(/^Preparación de la entrevista/);
    expect(dia('2026-11-17').find((b) => b.key === 'prog-fondo-com')!.title).not.toMatch(/Preparación/);
    expect(buildBlocks(planDay('2026-11-18', 'completo', undefined, 'busqueda-intensiva')).length).toBeGreaterThan(5);
  });
});

describe('ola 27 · control, alertas y deuda de matemática', () => {
  it('días 10 y 20 desde el inicio de PetrIA (21 nov): con menos del 85 % de las horas planificadas, avisa que se corren las fechas (no se recorta)', async () => {
    const { alertaHorasIntensivo, controlHoras, diaIntensivo, ordenDeRecortes } = await import('./control');
    // Con un trabajo cargado a mano (la v12.1 no trae fecha), el conteo corta ahí.
    const c = { t0: '2026-11-16', inicioTrabajo: '2027-01-04' };
    expect(diaIntensivo('2026-11-20', c)).toBe(0);
    expect(diaIntensivo('2026-11-21', c)).toBe(1);
    expect(diaIntensivo('2026-11-30', c)).toBe(10);
    expect(diaIntensivo('2026-12-10', c)).toBe(20);
    expect(diaIntensivo('2027-01-04', c)).toBe(0);
    // Nada registrado: 0 % de lo planificado (9 días de foco: 10 h entre semana y 11 el fin de semana, menos la hora de JulIA desde el 26 nov).
    const h = controlHoras('2026-11-30', {}, c)!;
    expect(h).toMatchObject({ dia: 10, reales: 0, debajo: true, planificadas: 90 });
    const a = alertaHorasIntensivo('2026-11-30', {}, c)!;
    expect(a.titulo).toMatch(/Día 10 del modo intensivo: 0 %/);
    expect(ordenDeRecortes()).toEqual([]);
    expect(a.texto).toMatch(/No se recorta profundidad/);
    expect(a.texto).toMatch(/Nunca el sueño, el entrenamiento ni los repasos/);
    // Dos días después todavía se ve; al cuarto, no.
    expect(alertaHorasIntensivo('2026-12-02', {}, c)).not.toBeNull();
    expect(alertaHorasIntensivo('2026-12-04', {}, c)).toBeNull();
    // El día 20 mide de nuevo.
    expect(alertaHorasIntensivo('2026-12-10', {}, c)!.id).toBe('horas-dia-20');
    // Con el 100 % de lo planificado no avisa.
    const dias: Record<string, import('./types').DayLog> = {};
    const { horasDelDia } = await import('./capacidad');
    const { addDays } = await import('./time');
    for (let d = '2026-11-21'; d < '2026-11-30'; d = addDays(d, 1)) dias[d] = { date: d, wake: '04:00', routine: 'completo', notes: [], blocks: [{ key: 'prog', n: 1, title: 'P', short: 'p', area: 'ing', kind: 'pomodoro', start: '04:30', min: 240, fixed: false, rama: 'programacion', tasks: [] }], focus: [{ key: 'prog', plan: 'p', focusMin: horasDelDia(d, { ...c, pausas: true }) * 60, at: '07:00' }] } as import('./types').DayLog;
    expect(controlHoras('2026-11-30', dias, c)!.debajo).toBe(false);
    expect(alertaHorasIntensivo('2026-11-30', dias, c)).toBeNull();
  });

  it('v12.1: sin tramos diarios de matemática (m1–m4 archivados) no hay deuda de matemática', async () => {
    const { deudaMatematica } = await import('./control');
    const c = { t0: '2026-11-16', inicioTrabajo: '2027-01-04' };
    expect(deudaMatematica('2026-12-02', c).horas).toBe(0);
    expect(deudaMatematica('2027-03-01', c).horas).toBe(0);
  });

  it('sin tramos diarios de matemática (m1–m4 archivados) no hay habilitaciones ni alertas de proyecto antes de tiempo', async () => {
    const { alertasMatematica, habilitaciones } = await import('./control');
    expect(habilitaciones()).toEqual([]);
    for (const f of ['2026-12-01', '2027-04-15', '2027-12-01']) expect(alertasMatematica(f, '2026-11-16')).toEqual([]);
  });
});
