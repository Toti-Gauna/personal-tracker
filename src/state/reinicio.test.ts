import { beforeEach, describe, expect, it } from 'vitest';
import { dayNumber } from '../data/derive';
import { totalXp } from '../data/profile';
import { addCards, completeLearn, saveTest } from './study';
import { getState, register, resetFromDayZero, resetState, startDay, toggleTask } from './store';
import { addProgress } from './goals';
import { addWeight } from './train';
import { marcarTarea } from '../ui/acciones';
import { closeDay } from './profile';

const D0 = '2026-11-16';
const HOY = '2026-11-25';
const ok = { concepto: 0, tecnica: 0, descuido: 0, enunciado: 0 };

describe('reiniciar desde el día 0', () => {
  beforeEach(() => {
    resetState();
    register('Toti', 'Abi', D0);
    startDay('completo', '04:00', D0);
    for (const b of getState().days[D0].blocks.slice(0, 3)) for (const t of b.tasks) marcarTarea(D0, b.key, t.id);
    closeDay(D0, { victoria: 'x', manana: 'y', carry: [], score: 0.4 });
    completeLearn(D0, 'conamat', 1);
    saveTest(D0, 'conamat', 1, { score: 15, total: 15, errors: ok, mode: 'app' });
    addCards(D0, [{ front: 'a', back: 'b', kind: 'pregunta', deck: 'Matemática', source: 't' }]);
    addWeight(D0, 88.4);
    const g = getState().goals.goals.find((x) => x.title === 'Ventas Foody')!;
    addProgress(g.id, D0, 3);
  });

  it('hoy pasa a ser el día 0 y se borran los días, la racha, los sellos, el XP y la ruta', () => {
    expect(Object.keys(getState().days)).toHaveLength(1);
    expect(totalXp(getState())).toBeGreaterThan(0);
    resetFromDayZero(HOY);
    const s = getState();
    expect(s.settings!.startDate).toBe(HOY);
    expect(dayNumber(s.settings!.startDate, HOY)).toBe(0);
    expect(s.days).toEqual({});
    expect(s.focus).toBeNull();
    expect(s.carry).toEqual({});
    expect(s.ruta.log).toEqual([]);
    expect(s.profile).toEqual({ seals: {}, seen: [] });
    expect(totalXp(s)).toBe(0);
  });

  it('conserva los ajustes, las tarjetas, el estudio, el peso y las metas, pero sin su avance', () => {
    resetFromDayZero(HOY);
    const s = getState();
    expect(s.settings!.names).toEqual({ me: 'Toti', partner: 'Abi' });
    expect(s.study.cards).toHaveLength(1);
    expect(s.study.units.conamat?.[1]?.approvedOn).toBe(D0);
    expect(s.train.weights).toEqual([{ date: D0, kg: 88.4 }]);
    const foody = s.goals.goals.find((g) => g.title === 'Ventas Foody')!;
    expect(foody.progress).toEqual({});
    expect(s.goals.goals.length).toBeGreaterThan(10);
  });

  it('se puede empezar de nuevo: el día 0 arma las metas con su ruta desde el capítulo 1', () => {
    resetFromDayZero(HOY);
    startDay('completo', '04:00', HOY);
    const day = getState().days[HOY];
    expect(day.blocks.find((b) => b.key === 'math')?.ref).toBeDefined();
    toggleTask(HOY, 'rutina', day.blocks[0].tasks[0].id);
    expect(Object.keys(getState().days)).toEqual([HOY]);
  });
});
