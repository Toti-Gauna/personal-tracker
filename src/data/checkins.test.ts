import { beforeEach, describe, expect, it } from 'vitest';
import { dayJson } from './export';
import { appliesTo, valueOf } from './goals';
import { DIAS_ENTRE_MEDIDAS, debePreguntarPeso, fmtPace, medidasPendientes, runOn, runWeek } from './train';
import { emptyTrain } from './train-catalog';
import { getState, migrate, register, resetState, startDay } from '../state/store';
import { addMedida, addRun, deleteMedida, deleteRun, guardarPeso, marcarPesoPreguntado } from '../state/train';
import { cerrarHojas, hojaAbierta } from '../ui/checkins';
import { marcarTarea } from '../ui/acciones';

const D = '2026-11-18'; // miércoles
const ctx = () => ({ study: getState().study, days: getState().days, train: getState().train });

describe('corridas', () => {
  beforeEach(() => { resetState(); register('Toti', 'Abi', D); });

  it('el ritmo sale de minutos y km; sin distancia no hay ritmo', () => {
    expect(fmtPace(30, 5)).toBe('6:00');
    expect(fmtPace(33, 6)).toBe('5:30');
    expect(fmtPace(28, 5.2)).toBe('5:23');
    expect(fmtPace(30)).toBeNull();
    expect(fmtPace(30, 0)).toBeNull();
  });

  it('una corrida por día: la segunda del mismo día reemplaza a la primera', () => {
    addRun({ date: D, min: 30, kind: 'suave', feel: 3 });
    addRun({ date: D, min: 45, km: 8, kind: 'fondo', feel: 4 });
    expect(getState().train.runs).toHaveLength(1);
    expect(runOn(getState().train.runs, D)).toMatchObject({ min: 45, km: 8, kind: 'fondo' });
    addRun({ date: D, min: 0, kind: 'suave', feel: 3 });
    expect(runOn(getState().train.runs, D)!.min).toBe(45);
    deleteRun(D);
    expect(getState().train.runs).toEqual([]);
  });

  it('la semana suma veces, minutos y km de lunes a domingo', () => {
    addRun({ date: '2026-11-15', min: 99, kind: 'suave', feel: 3 }); // domingo anterior
    addRun({ date: '2026-11-16', min: 30, km: 5, kind: 'suave', feel: 3 });
    addRun({ date: '2026-11-18', min: 40, km: 6.5, kind: 'fondo', feel: 4 });
    addRun({ date: '2026-11-22', min: 20, kind: 'series', feel: 5 });
    addRun({ date: '2026-11-23', min: 99, kind: 'suave', feel: 3 }); // lunes siguiente
    expect(runWeek(getState().train.runs, D)).toEqual({ n: 3, min: 90, km: 11.5 });
  });

  it('la meta semanal "Correr" se suma sola con las corridas registradas', () => {
    const g = getState().goals.goals.find((x) => x.title === 'Correr' && x.horizon === 'semana')!;
    expect(g.auto).toEqual({ kind: 'correr' });
    expect(appliesTo(g, 'semana', D)).toBe(true);
    expect(valueOf(g, D, ctx())).toBe(0);
    addRun({ date: '2026-11-16', min: 30, kind: 'suave', feel: 3 });
    addRun({ date: D, min: 30, kind: 'suave', feel: 3 });
    expect(valueOf(getState().goals.goals.find((x) => x.id === g.id)!, D, ctx())).toBe(2);
    expect(valueOf(getState().goals.goals.find((x) => x.id === g.id)!, '2026-11-25', ctx())).toBe(0);
  });

  it('una meta "Correr" guardada antes de la ola 13 pasa a sumarse sola', () => {
    resetState();
    register('Toti', 'Abi', D);
    const viejo = structuredClone(getState()) as unknown as { goals: { goals: { title: string; auto?: unknown; quick?: boolean }[] }; train: Record<string, unknown> };
    const g = viejo.goals.goals.find((x) => x.title === 'Correr')!;
    delete g.auto;
    g.quick = true;
    delete viejo.train.runs; delete viejo.train.medidas; delete viejo.train.pesoPreguntado;
    const s = migrate(viejo);
    expect(s.goals.goals.find((x) => x.title === 'Correr')).toMatchObject({ auto: { kind: 'correr' }, quick: false });
    expect(s.train).toMatchObject({ runs: [], medidas: [], pesoPreguntado: [] });
  });

  it('tildar "Correr" en Hoy abre la hoja de la corrida, una vez', () => {
    startDay('completo', '04:00', D);
    const abi = getState().days[D].blocks.find((b) => b.tasks.some((t) => /correr/i.test(t.t)))!;
    const t = abi.tasks.find((x) => /correr/i.test(x.t))!;
    cerrarHojas();
    marcarTarea(D, abi.key, t.id);
    expect(hojaAbierta()).toEqual({ tipo: 'corrida', date: D });
    cerrarHojas();
    // Destildar no abre nada.
    marcarTarea(D, abi.key, t.id);
    expect(hojaAbierta()).toBeNull();
    // Con la corrida de hoy ya cargada, tildar de nuevo no vuelve a preguntar.
    addRun({ date: D, min: 30, kind: 'suave', feel: 3 });
    marcarTarea(D, abi.key, t.id);
    expect(hojaAbierta()).toBeNull();
  });

  it('tildar otra tarea no abre la hoja', () => {
    startDay('completo', '04:00', D);
    const b = getState().days[D].blocks.find((x) => x.tasks.length && !x.tasks.some((t) => /correr/i.test(t.t)))!;
    cerrarHojas();
    marcarTarea(D, b.key, b.tasks[0].id);
    expect(hojaAbierta()).toBeNull();
  });
});

describe('peso al entrar a Entreno', () => {
  beforeEach(() => { resetState(); register('Toti', 'Abi', D); });
  const t = () => getState().train;

  it('pregunta la primera vez del día y no vuelve a preguntar si lo cargaste', () => {
    expect(debePreguntarPeso(t(), D)).toBe(true);
    guardarPeso(D, 90.4);
    expect(t().weights).toEqual([{ date: D, kg: 90.4 }]);
    expect(debePreguntarPeso(t(), D)).toBe(false);
  });

  it('"Hoy no" tampoco vuelve a preguntar ese día, pero sí al día siguiente', () => {
    marcarPesoPreguntado(D);
    marcarPesoPreguntado(D);
    expect(t().pesoPreguntado).toEqual([D]);
    expect(t().weights).toEqual([]);
    expect(debePreguntarPeso(t(), D)).toBe(false);
    expect(debePreguntarPeso(t(), '2026-11-19')).toBe(true);
  });

  it('con un pesaje ya cargado ese día no pregunta; en plena sesión de entreno tampoco', () => {
    expect(debePreguntarPeso({ ...t(), weights: [{ date: D, kg: 90 }] }, D)).toBe(false);
    expect(debePreguntarPeso({ ...t(), active: {} as never }, D)).toBe(false);
  });

  it('guarda solo los últimos 60 días preguntados', () => {
    for (let i = 1; i <= 70; i++) marcarPesoPreguntado(`2026-12-${String(i % 28 + 1).padStart(2, '0')}-${i}`);
    expect(t().pesoPreguntado.length).toBeLessThanOrEqual(61);
  });
});

describe('medidas mensuales', () => {
  beforeEach(() => { resetState(); register('Toti', 'Abi', D); });

  it('se piden si nunca se cargaron y de nuevo a los 28 días', () => {
    expect(medidasPendientes([], D)).toBe(true);
    addMedida({ date: D, cintura: 92 });
    expect(medidasPendientes(getState().train.medidas, '2026-12-15')).toBe(false); // 27 días
    expect(medidasPendientes(getState().train.medidas, '2026-12-16')).toBe(true); // 28 días
    expect(DIAS_ENTRE_MEDIDAS).toBe(28);
  });

  it('sin ningún valor no guarda; una por fecha; se borran', () => {
    addMedida({ date: D });
    expect(getState().train.medidas).toEqual([]);
    addMedida({ date: D, cintura: 92, pecho: 105 });
    addMedida({ date: D, cintura: 91 });
    expect(getState().train.medidas).toEqual([{ date: D, cintura: 91 }]);
    deleteMedida(D);
    expect(getState().train.medidas).toEqual([]);
  });
});

describe('JSON del día', () => {
  beforeEach(() => { resetState(); register('Toti', 'Abi', D); startDay('completo', '04:00', D); });

  it('suma peso, corrida y medidas del día; sin datos, null', () => {
    const s = getState();
    const vacio = dayJson(s.days[D], s.settings!, s.days, {}, s.train) as { salud: unknown };
    expect(vacio.salud).toEqual({ peso: null, corrida: null, medidas: null });

    guardarPeso(D, 90.4);
    addRun({ date: D, min: 35, km: 6, kind: 'fondo', feel: 4 });
    addMedida({ date: D, cintura: 92 });
    const n = getState();
    const j = dayJson(n.days[D], n.settings!, n.days, {}, n.train) as { salud: unknown };
    expect(j.salud).toEqual({
      peso: 90.4,
      corrida: { min: 35, km: 6, tipo: 'fondo', sensacion: 4 },
      medidas: { cintura: 92, pecho: null, brazo: null },
    });
  });

  it('sin el estado de entreno no agrega "salud" (compatibilidad)', () => {
    const s = getState();
    expect(dayJson(s.days[D], s.settings!, s.days)).not.toHaveProperty('salud');
  });
});

describe('estado de entreno', () => {
  it('arranca con corridas, medidas y días preguntados vacíos', () => {
    expect(emptyTrain()).toMatchObject({ runs: [], medidas: [], pesoPreguntado: [] });
  });
});
