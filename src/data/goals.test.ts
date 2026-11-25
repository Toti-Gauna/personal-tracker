import type { Goal } from './goals-types';
import { beforeEach, describe, expect, it } from 'vitest';
import { getState, register, resetState, startDay } from '../state/store';
import { addGoal, addProgress, deleteGoal, renameBimester, toggleGoal, toggleMark, toggleSub } from '../state/goals';
import { completeLearn, saveTest } from '../state/study';
import { bimesterAt } from './bimesters';
import { bimester } from './derive';
import { appliesTo, averagePct, dayPct, periodKey, periodRange, valueOf, yearOf } from './goals';

const D0 = '2026-11-11';
const ok = { concepto: 0, tecnica: 0, descuido: 0, enunciado: 0 };
const ctx = () => ({ study: getState().study, days: getState().days });

describe('períodos', () => {
  it('semana, mes, bimestre y año', () => {
    expect(periodKey('semana', '2026-11-11')).toBe('2026-11-09');
    expect(periodKey('semana', '2026-11-15')).toBe('2026-11-09');
    expect(periodKey('semana', '2026-11-16')).toBe('2026-11-16');
    expect(periodKey('mes', D0)).toBe('2026-11');
    expect(periodRange('mes', D0)).toEqual(['2026-11-01', '2026-11-30']);
    expect(periodRange('mes', '2027-02-10')).toEqual(['2027-02-01', '2027-02-28']);
    expect(yearOf('2026-11-16')).toBe(1);
    expect(yearOf('2027-10-31')).toBe(1);
    expect(yearOf('2027-11-01')).toBe(2);
    expect(periodRange('anio', D0)).toEqual(['2026-11-16', '2027-11-15']);
  });

  it('los 9 bimestres arrancan el 16 y el B1 también cubre los días de antes', () => {
    expect(bimesterAt('2026-11-11').n).toBe(1);
    expect(bimesterAt('2027-01-15').n).toBe(1);
    expect(bimesterAt('2027-01-16').n).toBe(2);
    expect(bimesterAt('2027-11-16').n).toBe(7);
    expect(bimesterAt('2028-05-15').n).toBe(9);
    // Ola 8: el bimestre de la app es el del plan T+18 (9 semanas desde T0) con su nombre sugerido.
    expect(bimester('2026-11-16', '2026-12-14')).toMatchObject({ n: 1, week: 5, weeks: 9, name: 'El despegue' });
    expect(bimester('2026-11-16', '2027-01-18')).toMatchObject({ n: 2, week: 1, name: 'Cert window 2 y Cert window 3' });
    // v12.4: el calendario por semanas cierra en T+18 (21 ene 2028) con 7 bimestres; el B7 tiene 8 semanas y después queda en el último.
    expect(bimester('2026-11-16', '2027-09-30')).toMatchObject({ n: 6, week: 1, weeks: 9, name: 'AdversarIA y AeroScan Edge' });
    expect(bimester('2026-11-16', '2028-05-14')).toMatchObject({ n: 7, week: 8, weeks: 8 });
    expect(bimester('2026-11-16', '2026-12-14', { 1: 'El salto' }).name).toBe('El salto');
  });
});

describe('metas', () => {
  beforeEach(() => {
    resetState();
    register('Toti', 'Abi', D0);
    startDay('completo', '04:00', D0);
  });

  it('arranca con las metas del diseño', () => {
    const gs = getState().goals.goals;
    // Ola 8: búsqueda, horas, entrenos y tests salen de los contadores del plan.
    expect(gs.filter((g) => g.horizon === 'semana')).toHaveLength(7);
    expect(gs.filter((g) => g.horizon === 'mes')).toHaveLength(2);
    expect(gs.filter((g) => g.horizon === 'bim')).toHaveLength(3);
    expect(gs.filter((g) => g.horizon === 'anio')).toHaveLength(3);
    expect(gs.find((g) => g.title === 'Llegar a 95 kg entrenando 6 días')?.rama).toBe('salud');
  });

  it('el avance semanal se reinicia cada semana', () => {
    // "Correr" se suma solo desde la ola 13; "Comer sano" sigue siendo un contador manual.
    const g = getState().goals.goals.find((x) => x.title === 'Comer sano')!;
    addProgress(g.id, D0, 1);
    addProgress(g.id, '2026-11-13', 1);
    const now = () => getState().goals.goals.find((x) => x.id === g.id)!;
    expect(valueOf(now(), '2026-11-14', ctx())).toBe(2);
    expect(valueOf(now(), '2026-11-16', ctx())).toBe(0);
    expect(appliesTo(now(), 'semana', '2026-11-23')).toBe(true);
    addProgress(g.id, D0, -5);
    expect(valueOf(now(), D0, ctx())).toBe(0);
  });

  it('una meta del bimestre no se repite y una tarea se tilda una vez', () => {
    const id = addGoal({ title: 'Terminar docs', area: 'handyx', horizon: 'bim', type: 'tarea', target: 99 }, D0);
    const g = () => getState().goals.goals.find((x) => x.id === id)!;
    expect(g().target).toBe(1);
    expect(appliesTo(g(), 'bim', '2026-12-20')).toBe(true);
    expect(appliesTo(g(), 'bim', '2027-01-20')).toBe(false);
    toggleGoal(id, D0);
    expect(valueOf(g(), D0, ctx())).toBe(1);
    toggleGoal(id, D0);
    expect(valueOf(g(), D0, ctx())).toBe(0);
    deleteGoal(id);
    expect(getState().goals.goals.some((x) => x.id === id)).toBe(false);
  });

  it('los tests aprobados del mes salen solos del estudio', () => {
    const g: Goal = { id: 't', title: 'Tests aprobados', area: 'ing', horizon: 'mes', type: 'numero', target: 5, repeat: true, from: '2026-11', progress: {}, auto: { kind: 'tests' } };
    completeLearn(D0, 'conamat', 1);
    saveTest(D0, 'conamat', 1, { score: 15, total: 15, errors: ok, mode: 'app' });
    saveTest(D0, 'conamat', 2, { score: 10, total: 20, errors: { ...ok, concepto: 10 }, mode: 'app' });
    expect(valueOf(g, D0, ctx())).toBe(1);
  });

  it('el promedio del mes sale de las tareas hechas por día', () => {
    const day = getState().days[D0];
    expect(dayPct(day)).toBe(0);
    expect(dayPct(undefined)).toBeNull();
    expect(averagePct(getState().days, '2026-11-01', '2026-11-30')).toEqual({ loaded: 1, avg: 0 });
  });

  it('se puede renombrar el bimestre y volver al nombre de fábrica', () => {
    renameBimester(1, 'El salto');
    expect(getState().goals.bimesterNames[1]).toBe('El salto');
    renameBimester(1, '  ');
    expect(getState().goals.bimesterNames[1]).toBeUndefined();
  });
});

describe('submetas y metas por día (ola 10)', () => {
  beforeEach(() => { resetState(); register('Toti', 'Abi', D0); });
  const find = (id: string) => getState().goals.goals.find((g) => g.id === id)!;

  it('con submetas la meta pasa a contar cuántas hiciste', () => {
    const id = addGoal({ title: 'Comer mejor', area: 'salud', horizon: 'semana', type: 'numero', target: 99, subs: [{ id: 'a', t: 'Cocinar' }, { id: 'b', t: ' ' }, { id: 'c', t: 'Sin azúcar' }] }, D0);
    expect(find(id)).toMatchObject({ type: 'contador', target: 2, unit: 'pasos' });
    expect(find(id).subs!.map((x) => x.t)).toEqual(['Cocinar', 'Sin azúcar']);
    toggleSub(id, D0, 'a');
    expect(valueOf(find(id), D0, ctx())).toBe(1);
    toggleSub(id, D0, 'c');
    expect(valueOf(find(id), D0, ctx())).toBe(2);
    toggleSub(id, D0, 'a');
    expect(valueOf(find(id), D0, ctx())).toBe(1);
  });

  it('las submetas se reinician cada semana', () => {
    const id = addGoal({ title: 'x', area: 'salud', horizon: 'semana', type: 'tarea', target: 1, subs: [{ id: 'a', t: 'uno' }] }, D0);
    toggleSub(id, D0, 'a');
    expect(valueOf(find(id), D0, ctx())).toBe(1);
    expect(valueOf(find(id), '2026-11-18', ctx())).toBe(0);
  });

  it('marcar días suma los días de la semana y no los de otra', () => {
    const id = addGoal({ title: 'Comer mejor', area: 'salud', horizon: 'semana', type: 'contador', target: 7, daily: true }, D0);
    expect(find(id).daily).toBe(true);
    toggleMark(id, '2026-11-09');
    toggleMark(id, '2026-11-11');
    toggleMark(id, '2026-11-16');
    expect(valueOf(find(id), '2026-11-11', ctx())).toBe(2);
    expect(valueOf(find(id), '2026-11-16', ctx())).toBe(1);
    toggleMark(id, '2026-11-11');
    expect(valueOf(find(id), '2026-11-11', ctx())).toBe(1);
  });

  it('"por día" solo vale en la semana y sin submetas', () => {
    const mes = addGoal({ title: 'm', area: 'salud', horizon: 'mes', type: 'contador', target: 5, daily: true }, D0);
    expect(find(mes).daily).toBeUndefined();
    toggleMark(mes, D0);
    expect(valueOf(find(mes), D0, ctx())).toBe(0);
  });
});
