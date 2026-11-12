import { beforeEach, describe, expect, it, vi } from 'vitest';
import { valueOf } from '../data/goals';
import { exerciseMin, history, nextTarget, plannedFor, rangeOf } from '../data/train';
import { getState, register, resetState, startDay } from './store';
import {
  addWeight, adjustWeek, doneWith, exerciseAt, finishTraining, goToExercise, logSet, nudge, patchActive, setRestMode,
  setWho, setsFor, startTraining,
} from './train';

const D0 = '2026-11-11'; // miércoles: Piernas
const t = () => getState().train;
const legs = () => t().routines.find((r) => r.id === 'legs')!;

/** Hace todas las series de todos los ejercicios con lo que propone el motor. */
function entrenar(date: string, bonus = 0, partner = true) {
  startTraining('legs', date, partner);
  const a0 = t().active!;
  for (let k = 0; k < a0.order.length; k++) {
    goToExercise(k);
    let guard = 0;
    while (guard++ < 60) {
      const a = t().active!;
      const e = exerciseAt(a, legs());
      if (a.athletes.every((w) => doneWith(a, e, w))) break;
      for (const w of a.athletes) {
        const cur = t().active!;
        if (doneWith(cur, e, w)) continue;
        setWho(w);
        const d = t().active!.draft[w]!;
        if (!d.kg) nudge(w, 'kg', w === 'me' ? 100 : 50);
        if (bonus) nudge(w, 'reps', bonus);
        logSet();
      }
    }
  }
}

describe('sesión de entreno', () => {
  beforeEach(() => {
    resetState();
    register('Toti', 'Abi', D0);
    startDay('completo', '04:00', D0);
  });

  it('arranca con la rutina de hoy, los dos con su peso y el tiempo del bloque', () => {
    expect(plannedFor(t(), D0).routine?.name).toBe('Piernas');
    startTraining('legs', D0, true);
    const a = t().active!;
    expect(a.athletes).toEqual(['me', 'partner']);
    expect(a.order).toHaveLength(6);
    expect(a.limitMin).toBe(70);
    expect(a.restMode).toBe('each');
  });

  it('la serie arranca el descanso de quien la marcó (cada uno) o de los dos cuando ambos marcan (compartido)', () => {
    startTraining('legs', D0, true);
    nudge('me', 'kg', 100);
    logSet(1000);
    let a = t().active!;
    expect(a.rest.me?.endsAt).toBe(1000 + 180_000);
    expect(a.rest.partner).toBeUndefined();

    // Compartido: arranca cuando los dos marcaron la serie.
    setRestMode('shared');
    expect(t().active!.rest).toEqual({});
    nudge('partner', 'kg', 50);
    setWho('partner');
    logSet(2000);
    a = t().active!;
    expect(a.rest.shared?.endsAt).toBe(2000 + 180_000);
    expect(setsFor(a, 'partner', 'sentadilla')).toHaveLength(1);

    // Con tres series hechas por uno solo, el descanso compartido espera al otro.
    setWho('me');
    logSet(3000);
    a = t().active!;
    expect(setsFor(a, 'me', 'sentadilla')).toHaveLength(2);
    expect(a.rest.shared?.endsAt).toBe(2000 + 180_000);
  });

  it('un entreno completo se guarda con volumen, récords vacíos al principio y la meta del día cumplida', () => {
    entrenar(D0);
    const id = finishTraining()!;
    const s = t().sessions.find((x) => x.id === id)!;
    expect(s.athletes).toEqual(['me', 'partner']);
    expect(s.skipped).toEqual([]);
    expect(s.records).toEqual([]);
    expect(s.sets.filter((x) => x.who === 'me' && x.ex === 'sentadilla')).toHaveLength(4);
    expect(getState().days[D0].blocks.find((b) => b.kind === 'entreno')!.tasks.every((x) => x.done)).toBe(true);
    expect(t().active).toBeNull();
    const meta = getState().goals.goals.find((g) => g.title === 'Entrenar')!;
    expect(valueOf(meta, D0, { study: getState().study, days: getState().days, train: t() })).toBe(1);
  });

  it('lo que no se llegó a hacer pasa al principio de la próxima y no frena la progresión', () => {
    startTraining('legs', D0, false);
    goToExercise(0);
    nudge('me', 'kg', 100);
    logSet();
    const id = finishTraining()!;
    const s = t().sessions.find((x) => x.id === id)!;
    expect(s.skipped).toEqual(['pm-rumano', 'prensa', 'curl-femoral', 'extension', 'gemelos']);
    expect(t().leftovers.legs).toEqual(s.skipped);
    startTraining('legs', '2026-11-18', false);
    expect(t().active!.order.slice(0, 5)).toEqual(['pm-rumano', 'prensa', 'curl-femoral', 'extension', 'gemelos']);
    // El peso muerto sin historial sigue pidiendo peso: nada se castigó.
    const e = legs().exercises.find((x) => x.id === 'pm-rumano')!;
    expect(nextTarget(history(t().sessions, 'me', e.id), e, rangeOf(t(), 'me', e)).kind).toBe('nuevo');
  });

  it('segunda sesión: el motor propone sumar repeticiones y detecta récords', () => {
    entrenar(D0);
    finishTraining();
    const e = legs().exercises[0];
    // Mismos pesos y repeticiones del mínimo: la próxima pide +1 rep en la primera serie.
    const target = nextTarget(history(t().sessions, 'me', e.id), e, rangeOf(t(), 'me', e));
    expect(target.kg).toBe(100);
    expect(target.reps).toEqual([7, 6, 6, 6]);
    expect(target.note).toBe('+1 rep');
    // Segunda sesión con una repetición más en cada serie: récord de repeticiones.
    entrenar('2026-11-18', 1, false);
    patchActive((x) => x);
    const id = finishTraining()!;
    const s = t().sessions.find((x) => x.id === id)!;
    const rec = s.records.find((r) => r.ex === 'sentadilla' && r.who === 'me')!;
    expect(rec.text).toBe('+2 repeticiones con el mismo peso');
  });

  it('la sesión guardada dura lo que corrió el reloj', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 10, 11, 18, 0));
    startTraining('legs', D0, false);
    vi.setSystemTime(new Date(2026, 10, 11, 19, 12));
    nudge('me', 'kg', 100);
    logSet();
    const id = finishTraining()!;
    expect(t().sessions.find((x) => x.id === id)!.minutes).toBe(72);
    vi.useRealTimers();
  });
});

describe('semana y peso', () => {
  beforeEach(() => {
    resetState();
    register('Toti', 'Abi', D0);
    startDay('completo', '04:00', D0);
  });

  it('si faltaste, pasa los próximos días a Full body', () => {
    adjustWeek('2026-11-11', 2);
    // Como en el diseño: jueves y sábado a Full body, y el viernes queda para descansar de Upper.
    expect(t().plan.days).toEqual(['push', 'pull', 'legs', 'full', 'lower', 'full', 'descanso']);
    expect(t().plan.template).toBe('propia');
  });

  it('un peso por día; el último alimenta la meta del año', () => {
    addWeight('2026-11-08', 88.4);
    addWeight('2026-11-08', 88.6);
    addWeight('2026-11-15', 88.9);
    expect(t().weights).toEqual([{ date: '2026-11-08', kg: 88.6 }, { date: '2026-11-15', kg: 88.9 }]);
    const meta = getState().goals.goals.find((g) => g.title.startsWith('Llegar a 95 kg'))!;
    expect(valueOf(meta, '2026-11-20', { study: getState().study, days: getState().days, train: t() })).toBe(88.9);
  });

  it('estimación de tiempo por ejercicio', () => {
    expect(Math.round(exerciseMin(legs().exercises[0]))).toBe(19);
  });
});
