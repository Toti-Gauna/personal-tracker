import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { planRoutine } from '../data/routines';
import { emptyTrain } from '../data/train-catalog';
import type { Routine, TrainState } from '../data/train-types';
import { Entreno } from '../screens/Entreno';
import { EntrenoSemana } from '../screens/EntrenoSemana';
import { SesionEntreno } from '../screens/SesionEntreno';
import { getState, migrate, register, resetState, startDay } from './store';
import { finishTraining, goToExercise, logSet, nudge, setRir, startTraining, tildarCalentamiento, undoLastSet } from './train';

const t = () => getState().train;
const day = (date: string) => getState().days[date];

describe('ola 19 · lo guardado de antes pasa a las rutinas nuevas sin perder nada', () => {
  const vieja = (id: string, name: string): Routine => ({ id, name, desc: name, before: [], exercises: [{ id: `${id}-x`, name: 'Algo', sets: 3, repMin: 8, repMax: 10, rest: 90, kind: 'torso' }], after: [] });
  const antes = (): TrainState => ({
    ...emptyTrain(), v: undefined,
    routines: ['push', 'pull', 'legs', 'upper', 'lower', 'full'].map((id) => vieja(id, id)),
    plan: { template: 'ppl', days: ['push', 'pull', 'legs', 'upper', 'lower', 'full', 'descanso'] },
    sessions: [{ id: 's1', date: '2026-11-10', routineId: 'legs', routineName: 'Piernas', minutes: 60, athletes: ['me'], sets: [{ ex: 'legs-x', who: 'me', i: 1, kg: 100, reps: 8 }], skipped: [], deload: false, note: '', records: [] }],
    leftovers: { legs: ['legs-x'] },
  });

  it('archiva Push, Pull y Piernas (con su historial) y suma las seis nuevas; la semana de fábrica pasa a la nueva', () => {
    const s = migrate({ train: antes(), settings: null }).train;
    expect(s.v).toBe(3);
    const vivas = s.routines.filter((r) => !r.archivada).map((r) => r.id);
    expect(vivas).toEqual(['full', 'push-a', 'pull-a', 'push-b', 'pull-b', 'legs-a', 'legs-b', 'upper', 'lower']);
    expect(s.routines.filter((r) => r.archivada).map((r) => r.id)).toEqual(['viejo-push', 'viejo-pull', 'viejo-legs', 'viejo-upper', 'viejo-lower']);
    // Upper y Lower nuevas reemplazan a las de la ola 5 (que quedan archivadas con lo suyo).
    expect(s.routines.find((r) => r.id === 'upper')!.exercises).toHaveLength(8);
    expect(s.routines.find((r) => r.id === 'lower')!.exercises).toHaveLength(8);
    expect(s.plan.days).toEqual(['pull', 'legs', 'push', 'upper', 'lower', null, null]);
    // El historial sigue apuntando a la rutina archivada.
    expect(s.sessions[0].routineId).toBe('viejo-legs');
    expect(s.leftovers).toEqual({ 'viejo-legs': ['legs-x'] });
    // Migrar de nuevo no duplica nada.
    expect(migrate({ train: s, settings: null }).train.routines).toHaveLength(14);
  });

  it('una semana propia conserva sus días y un entreno en curso sigue en su rutina', () => {
    const a = antes();
    a.plan = { template: 'propia', days: ['push', null, 'legs', 'full', null, 'pull', null] };
    a.active = { routineId: 'legs', date: '2026-11-11', startedAt: 1, athletes: ['me'], order: ['legs-x'], idx: 0, sets: [], draft: {}, who: 'me', restMode: 'each', rest: {}, limitMin: 70, noLimit: false, deload: false };
    const s = migrate({ train: a, settings: null }).train;
    expect(s.plan.days).toEqual(['push', null, 'legs', 'full', null, 'pull', null]);
    expect(s.active?.routineId).toBe('viejo-legs');
  });
});

describe('ola 19 · la sesión: calentamiento, RIR y el día', () => {
  const D = '2026-11-17'; // martes de la semana 1: Legs A
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 10, 17, 18, 0));
    resetState();
    register('Toti', 'Abi', '2026-11-16');
    startDay('completo', '04:00', D);
  });
  afterEach(() => vi.useRealTimers());

  it('el calentamiento se tilda y se destilda', () => {
    startTraining('legs-a', D, false);
    expect(t().active!.warmDone).toEqual([]);
    tildarCalentamiento('caminadora');
    expect(t().active!.warmDone).toEqual(['caminadora']);
    tildarCalentamiento('movilidad-pierna');
    tildarCalentamiento('caminadora');
    expect(t().active!.warmDone).toEqual(['movilidad-pierna']);
  });

  it('el RIR que te quedó es opcional: se guarda en la serie, se saca tocándolo de nuevo y no se arrastra a la siguiente', () => {
    startTraining('legs-a', D, false);
    nudge('me', 'kg', 100);
    setRir('me', 1);
    expect(t().active!.draft.me).toMatchObject({ rir: 1 });
    setRir('me', 1);
    expect(t().active!.draft.me!.rir).toBeUndefined();
    setRir('me', 2);
    logSet();
    expect(t().active!.sets[0]).toMatchObject({ ex: 'hack-squat', kg: 100, reps: 8, rir: 2 });
    expect(t().active!.draft.me!.rir).toBeUndefined();
    logSet();
    expect(t().active!.sets[1].rir).toBeUndefined();
    undoLastSet();
    undoLastSet();
    expect(t().active!.draft.me).toMatchObject({ rir: 2 });
    finishTraining();
  });

  it('un ejercicio en peso corporal se marca sin kilos', () => {
    startTraining('pull-b', D, false);
    const i = t().active!.order.indexOf('dead-hang');
    goToExercise(i);
    expect(t().active!.draft.me).toMatchObject({ kg: 0, reps: 30 });
    logSet();
    expect(t().active!.sets[0]).toMatchObject({ ex: 'dead-hang', kg: 0, reps: 30 });
  });

  it('el cierre de las 21:00 a 22:00 estira los músculos de la rutina del día', () => {
    const cierre = day(D).blocks.find((b) => b.key === 'cierre')!;
    expect(cierre.title).toBe('Bañarse, estirar, comer y escribir');
    expect(cierre.tasks.map((x) => x.t)).toEqual(['Bañarse', 'Estirar: cuádriceps, aductores, glúteos y gemelos', 'Comer', 'Escribir']);
  });

  it('el jueves se estira lo de Upper y el viernes lo de Lower; el sábado no hay entreno que estirar', () => {
    startDay('completo', '04:00', '2026-11-19');
    startDay('completo', '04:00', '2026-11-20');
    expect(day('2026-11-19').blocks.find((b) => b.key === 'cierre')!.tasks[1].t).toBe('Estirar: pecho, hombros, espalda, bíceps y tríceps');
    expect(day('2026-11-20').blocks.find((b) => b.key === 'cierre')!.tasks[1].t).toBe('Estirar: cuádriceps, isquiotibiales, glúteos, aductores y gemelos');
  });

  it('el entreno de la rutina de búsqueda son 30 min de ida, 2 h y 30 de vuelta', () => {
    const e = day(D).blocks.find((b) => b.key === 'entreno')!;
    expect(e.start).toBe('18:00');
    expect(e.min).toBe(180);
    expect(e.tasks.map((x) => x.t)).toEqual(['Caminar 30 min de ida', 'Entrenar: la rutina del día (2 h)', 'Caminar 30 min de vuelta']);
  });
});

describe('ola 19 · sábado y domingo son libres, también a las 08:00', () => {
  it('la rutina de las 08:00 de un sábado no tiene entreno y la tarde queda para descansar hasta las 22:00', () => {
    for (const tipo of ['weekend', 'busqueda-intensiva-finde'] as const) {
      const p = planRoutine(tipo, 'tarde');
      expect(p.some((x) => x.block.id === 'entreno')).toBe(false);
      const c = p.find((x) => x.block.id === 'cierre')!;
      expect([c.start, c.min]).toEqual(['18:00', 240]);
    }
    // En semana sigue igual: entreno de 18:00 a 21:00 y cierre de 21:00 a 22:00.
    const sem = planRoutine('busqueda-intensiva', 'tarde');
    expect(sem.find((x) => x.block.id === 'entreno')).toMatchObject({ start: '18:00', min: 180 });
    expect(sem.find((x) => x.block.id === 'cierre')).toMatchObject({ start: '21:00', min: 60 });
  });
});

describe('ola 19 · pantallas', () => {
  const D = '2026-11-17';
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 10, 17, 18, 0));
    resetState();
    register('Toti', 'Abi', '2026-11-16');
    startDay('completo', '04:00', D);
    getState().train.pesoPreguntado.push(D);
  });
  afterEach(() => vi.useRealTimers());

  it('Entreno: hoy toca Legs A con calentamiento, RIR y cuánto dura; la semana muestra Pull, Legs, Push, Upper, Lower y dos libres', () => {
    render(<Entreno day={day(D)} />);
    expect(screen.getByText(/Hoy toca Legs A/)).toBeInTheDocument();
    expect(screen.getByText('Enfoque: cuádriceps')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Legs A/ })).toBeInTheDocument();
    expect(screen.getByText(/Calentamiento · caminadora inclinada \+ movilidad dinámica de pierna/)).toBeInTheDocument();
    expect(screen.getByText('3 × 8-12 · RIR 2-1-0 · 3 min')).toBeInTheDocument();
    expect(screen.getByText(/Los estiramientos van de 21:00 a 22:00, con cuádriceps, aductores, glúteos y gemelos/)).toBeInTheDocument();
    expect(screen.queryByText(/pasa de las 2 h|Esta rutina lleva/)).toBeNull();
    const semana = screen.getByRole('list', { name: 'Semana de entreno' });
    expect(within(semana).getAllByRole('listitem').map((x) => x.querySelector('b')!.textContent)).toEqual(['Pull A', 'Legs A', 'Push A', 'Upper', 'Lower', '—', '—']);
  });

  it('Entreno: una rutina que pasa de las 2 h avisa antes de empezar', () => {
    const legs = t().routines.find((r) => r.id === 'legs-a')!;
    legs.exercises = Array.from({ length: 12 }, (_, i) => ({ ...legs.exercises[0], id: `z${i}`, sets: 4 }));
    render(<Entreno day={day(D)} />);
    expect(screen.getByRole('status')).toHaveTextContent(/lleva unos 3 h|lleva unos 2 h/);
    expect(screen.getByRole('status')).toHaveTextContent('el bloque es de 2 h');
  });

  it('Semana: cada día se elige una vez (con A y B) y el sábado y el domingo son libres', () => {
    render(<EntrenoSemana day={day(D)} />);
    expect(screen.getByText('Pull A')).toBeInTheDocument();
    // El lunes ya pasó sin entrenar ("No se hizo"): quedan Legs y Push con su aviso de A y B.
    expect(screen.getAllByText(/A y B se alternan por semana/)).toHaveLength(2);
    expect(screen.getByText('No se hizo')).toBeInTheDocument();
    expect(screen.getAllByText('Libre')).toHaveLength(2);
    fireEvent.click(screen.getAllByRole('button', { name: 'Cambiar' })[0]);
    const op = screen.getByRole('radiogroup', { name: /Qué entrenás el lunes/ });
    expect(within(op).getAllByRole('radio').map((x) => x.textContent)).toEqual(['Push A/B', 'Pull A/B', 'Legs A/B', 'Upper', 'Lower', 'Full body', 'Descanso activo', 'Libre']);
  });

  it('Sesión: calentamiento que se tilda, "Cómo se hace", RIR objetivo por serie y el RIR que te quedó', () => {
    startTraining('legs-a', D, false);
    render(<SesionEntreno />);
    const warm = screen.getByText(/Calentamiento · 10 min/).closest('details')!;
    expect(warm).toHaveTextContent('0/2');
    act(() => { fireEvent.click(within(warm).getByRole('checkbox', { name: 'Caminadora inclinada' })); });
    expect(warm).toHaveTextContent('1/2');
    expect(t().active!.warmDone).toEqual(['caminadora']);
    // El ejercicio: tempo y RIR objetivo.
    expect(screen.getByText('Tempo 3-1-2 · RIR 2-1-0')).toBeInTheDocument();
    expect(screen.getByText(/obj 8 · RIR 2/)).toBeInTheDocument();
    // "Cómo se hace" abre la ficha.
    fireEvent.click(screen.getByRole('button', { name: 'Cómo se hace' }));
    const ficha = screen.getByRole('dialog');
    expect(ficha).toHaveTextContent('Espalda apoyada — talones firmes — profundidad máxima');
    expect(ficha).toHaveTextContent('Cuádriceps completo');
    fireEvent.click(within(ficha).getByRole('button', { name: 'Listo' }));
    // RIR opcional.
    nudgeKg();
    fireEvent.click(screen.getByRole('button', { name: 'RIR 1' }));
    expect(t().active!.draft.me!.rir).toBe(1);
    act(() => { fireEvent.click(screen.getByRole('button', { name: /Serie de Toti hecha/ })); });
    expect(t().active!.sets[0].rir).toBe(1);
    expect(screen.getByText(/te quedó 1/)).toBeInTheDocument();
  });

  it('Sesión: una dominada o un dead hang se marca sin kilos', () => {
    startTraining('pull-b', D, false);
    goToExercise(t().active!.order.indexOf('dead-hang'));
    render(<SesionEntreno />);
    expect(screen.getByText(/Segundos · objetivo 30/)).toBeInTheDocument();
    expect(screen.queryByText(/Elegí con cuánto peso/)).toBeNull();
    expect(screen.getByText(/Sin peso extra/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Serie de Toti hecha/ })).toBeEnabled();
  });
});

function nudgeKg() {
  act(() => { nudge('me', 'kg', 100); });
}
