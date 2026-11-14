import { describe, expect, it } from 'vitest';
import { PLAN } from '../data/plan';
import { routineFor } from '../data/routines';
import { migrate, planSettings } from './store';

/** Un estado guardado antes del plan T+18: sin "plan", sin settings.plan y con bloques sin rama. */
const viejo = {
  settings: { names: { me: 'Toti', partner: 'Abi' }, startDate: '2026-11-16', presets: [], blockPresets: {} },
  days: {
    '2026-11-11': {
      date: '2026-11-11', wake: '04:00', routine: 'completo', dayType: 'weekday', notes: ['nota vieja'], focus: [],
      blocks: [
        { key: 'math', n: 1, title: 'Matemática', short: 'matemática', area: 'ing', kind: 'estudio', start: '04:30', min: 120, fixed: false, tasks: [{ id: 'a', t: 'Capítulo del día', done: true }] },
        { key: 'eclipse', n: 2, title: 'Eclipse', short: 'Eclipse', area: 'eclipse', kind: 'pomodoro', start: '16:00', min: 120, fixed: false, tasks: [{ id: 'b', t: '10 cold calls', done: false }] },
      ],
    },
  },
  focus: null,
  carry: {},
};

describe('migración al plan T+18 (trazo.v1)', () => {
  it('los días ya guardados siguen igual y el plan arranca vacío', () => {
    const s = migrate(structuredClone(viejo));
    expect(s.days['2026-11-11']).toEqual(viejo.days['2026-11-11']);
    expect(s.plan.entrevistas).toEqual([]);
    expect(s.plan.postulaciones).toEqual([]);
    expect(s.plan.contadores).toEqual({});
    expect(s.plan.respuestas).toHaveLength(PLAN.ingles.respuestas.length);
    expect(s.plan.respuestas.every((r) => r.veces === 0)).toBe(true);
  });

  it('sin ajustes del plan: buscando trabajo y martes libre', () => {
    const cfg = planSettings(migrate(structuredClone(viejo)).settings);
    expect(cfg).toMatchObject({ rutina: 'busqueda', diaLibre: 2, umbralIngreso: '', horasMaximas: '' });
    expect(routineFor('2026-11-17', cfg)).toBe('libre');
    expect(routineFor('2026-11-18', cfg)).toBe('weekday');
  });

  it('conserva lo que ya estaba del plan si se guardó antes', () => {
    const conPlan = { ...structuredClone(viejo), plan: { postulaciones: [{ id: 'p1', fecha: '2026-11-18', rol: 'AI Engineer', estado: 'enviada' }] } };
    const s = migrate(conPlan);
    expect(s.plan.postulaciones).toHaveLength(1);
    expect(s.plan.entrevistas).toEqual([]);
  });
});
