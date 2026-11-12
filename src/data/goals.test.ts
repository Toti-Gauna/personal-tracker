import { beforeEach, describe, expect, it } from 'vitest';
import { getState, register, resetState, startDay } from '../state/store';
import { addGoal, addProgress, deleteGoal, renameBimester, toggleGoal } from '../state/goals';
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
    expect(bimester('x', '2026-12-14')).toMatchObject({ n: 1, week: 5 });
    expect(bimester('x', '2026-12-14', { 1: 'El salto' }).name).toBe('El salto');
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
    expect(gs.filter((g) => g.horizon === 'semana')).toHaveLength(10);
    expect(gs.filter((g) => g.horizon === 'mes')).toHaveLength(6);
    expect(gs.filter((g) => g.horizon === 'anio')).toHaveLength(5);
  });

  it('el avance semanal se reinicia cada semana', () => {
    const g = getState().goals.goals.find((x) => x.title === 'Correr')!;
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
    const g = getState().goals.goals.find((x) => x.title.startsWith('Tests aprobados'))!;
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
