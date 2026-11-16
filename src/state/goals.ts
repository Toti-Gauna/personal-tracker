import { periodKey } from '../data/goals';
import type { Goal, Horizon } from '../data/goals-types';
import { newId } from '../data/schedule';
import { setState } from './store';

function update(fn: (goals: Goal[]) => Goal[]) {
  setState((s) => ({ ...s, goals: { ...s.goals, goals: fn(s.goals.goals) } }));
}

export type GoalDraft = Pick<Goal, 'title' | 'area' | 'horizon' | 'type' | 'target'> & Partial<Pick<Goal, 'unit' | 'step' | 'note' | 'group' | 'quick' | 'ref' | 'part' | 'rama' | 'subs' | 'daily'>>;

/** Meta nueva: empieza en el período actual y se repite si es del día, la semana o el mes. */
export function addGoal(d: GoalDraft, today: string) {
  const subs = d.subs?.filter((x) => x.t.trim());
  const conSubs = !!subs?.length;
  // Con submetas la meta cuenta cuántas hiciste; sin ellas, lo que se pidió.
  const type = conSubs ? 'contador' : d.type;
  const target = conSubs ? subs!.length : d.type === 'tarea' ? 1 : Math.max(1, d.target);
  const g: Goal = {
    ...d,
    type,
    target,
    ...(conSubs ? { subs, unit: d.unit ?? 'pasos' } : { subs: undefined }),
    daily: !conSubs && d.daily && d.horizon === 'semana' ? true : undefined,
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

/** ¿Se le pueden agregar submetas? Solo a las manuales: ni las automáticas ni las de una tira por día. */
export const aceptaSubs = (g: Goal) => !g.auto && !g.daily;

/**
 * Agrega una submeta a una meta que ya existe (la "meta padre"). La meta pasa a cumplirse al hacer todas
 * las submetas: el avance del período de `date` es cuántas van; el de otros períodos no se toca.
 */
export function addSub(id: string, date: string, texto: string) {
  const t = texto.trim();
  if (!t) return;
  update((gs) =>
    gs.map((g) => {
      if (g.id !== id || !aceptaSubs(g)) return g;
      const subs = [...(g.subs ?? []), { id: newId(), t }];
      const key = periodKey(g.horizon, date);
      const hechas = (g.subDone?.[key] ?? []).filter((x) => subs.some((y) => y.id === x));
      return {
        ...g, type: 'contador', target: subs.length, unit: g.subs?.length ? g.unit : 'pasos', step: undefined, quick: undefined,
        subs, subDone: { ...g.subDone, [key]: hechas }, progress: { ...g.progress, [key]: hechas.length },
      };
    }),
  );
}

/** Saca una submeta. Si era la última, la meta vuelve a ser una tarea simple. */
export function removeSub(id: string, date: string, subId: string) {
  update((gs) =>
    gs.map((g) => {
      if (g.id !== id || !g.subs) return g;
      const subs = g.subs.filter((x) => x.id !== subId);
      const key = periodKey(g.horizon, date);
      if (!subs.length) {
        const { subs: _s, subDone: _d, ...resto } = g;
        return { ...resto, type: 'tarea', target: 1, unit: undefined, progress: { ...g.progress, [key]: 0 } };
      }
      const subDone = Object.fromEntries(Object.entries(g.subDone ?? {}).map(([k, ids]) => [k, ids.filter((x) => x !== subId)]));
      const n = (subDone[key] ?? []).length;
      return { ...g, subs, target: subs.length, subDone, progress: { ...g.progress, [key]: n } };
    }),
  );
}

/** Tilda una submeta del período de `date` y deja el avance en cuántas van. */
export function toggleSub(id: string, date: string, subId: string) {
  update((gs) =>
    gs.map((g) => {
      if (g.id !== id || !g.subs) return g;
      const key = periodKey(g.horizon, date);
      const hechas = new Set(g.subDone?.[key] ?? []);
      if (hechas.has(subId)) hechas.delete(subId);
      else hechas.add(subId);
      const ids = g.subs.map((x) => x.id).filter((x) => hechas.has(x));
      return { ...g, subDone: { ...g.subDone, [key]: ids }, progress: { ...g.progress, [key]: ids.length } };
    }),
  );
}

/** Marca o desmarca un día de una meta diaria; el avance de la semana son los días marcados. */
export function toggleMark(id: string, date: string) {
  update((gs) =>
    gs.map((g) => {
      if (g.id !== id || !g.daily) return g;
      const marks = new Set(g.marks ?? []);
      if (marks.has(date)) marks.delete(date);
      else marks.add(date);
      const key = periodKey(g.horizon, date);
      const todas = [...marks].sort();
      const n = todas.filter((d) => periodKey(g.horizon, d) === key).length;
      return { ...g, marks: todas, progress: { ...g.progress, [key]: n } };
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
