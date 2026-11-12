import { periodKey } from '../data/goals';
import type { Goal, Horizon } from '../data/goals-types';
import { newId } from '../data/schedule';
import { setState } from './store';

function update(fn: (goals: Goal[]) => Goal[]) {
  setState((s) => ({ ...s, goals: { ...s.goals, goals: fn(s.goals.goals) } }));
}

export type GoalDraft = Pick<Goal, 'title' | 'area' | 'horizon' | 'type' | 'target'> & Partial<Pick<Goal, 'unit' | 'step' | 'note' | 'group' | 'quick'>>;

/** Meta nueva: empieza en el período actual y se repite si es del día, la semana o el mes. */
export function addGoal(d: GoalDraft, today: string) {
  const target = d.type === 'tarea' ? 1 : Math.max(1, d.target);
  const g: Goal = {
    ...d,
    target,
    id: `g${newId()}`,
    repeat: d.horizon === 'dia' || d.horizon === 'semana' || d.horizon === 'mes',
    from: periodKey(d.horizon, today),
    progress: {},
  };
  update((gs) => [...gs, g]);
  return g.id;
}

export function deleteGoal(id: string) {
  update((gs) => gs.filter((g) => g.id !== id));
}

/** Suma (o resta) al avance del período de `date`, sin bajar de cero. */
export function addProgress(id: string, date: string, delta: number) {
  update((gs) =>
    gs.map((g) => {
      if (g.id !== id) return g;
      const key = periodKey(g.horizon, date);
      return { ...g, progress: { ...g.progress, [key]: Math.max(0, Math.round(((g.progress[key] ?? 0) + delta) * 100) / 100) } };
    }),
  );
}

export function setProgress(id: string, date: string, value: number) {
  update((gs) =>
    gs.map((g) => (g.id === id ? { ...g, progress: { ...g.progress, [periodKey(g.horizon, date)]: Math.max(0, value) } } : g)),
  );
}

export function toggleGoal(id: string, date: string) {
  update((gs) =>
    gs.map((g) => {
      if (g.id !== id) return g;
      const key = periodKey(g.horizon, date);
      return { ...g, progress: { ...g.progress, [key]: (g.progress[key] ?? 0) >= g.target ? 0 : g.target } };
    }),
  );
}

/** Renombra un bimestre; con el nombre vacío vuelve al de fábrica. */
export function renameBimester(n: number, name: string) {
  setState((s) => {
    const names = { ...s.goals.bimesterNames };
    if (name.trim()) names[n] = name.trim();
    else delete names[n];
    return { ...s, goals: { ...s.goals, bimesterNames: names } };
  });
}

export const stepOf = (g: Goal) => g.step ?? 1;
