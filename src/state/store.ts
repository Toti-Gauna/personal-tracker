import { useSyncExternalStore } from 'react';
import { DEFAULT_BLOCK_PRESETS, DEFAULT_PRESETS } from '../data/defaults';
import { buildBlocks, newId, planDay } from '../data/schedule';
import { addDays, dateKey } from '../data/time';
import { emptyStudy } from '../data/study-catalog';
import type { StudyState } from '../data/study-types';
import type { Block, DayLog, FocusEntry, FocusState, Preset, RoutineId, Settings } from '../data/types';

export interface State {
  settings: Settings | null;
  days: Record<string, DayLog>;
  focus: FocusState | null;
  /** Tareas que pasaron a otro día: fecha → key del bloque → textos. */
  carry: Record<string, Record<string, string[]>>;
  study: StudyState;
}

const KEY = 'trazo.v1';
const empty = (): State => ({ settings: null, days: {}, focus: null, carry: {}, study: emptyStudy() });

function load(): State {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Migración: la ola 1 no tenía estudio y la ola 2 no tenía reglas, registro ni puntos.
      const base = emptyStudy();
      const study = parsed.study ? { ...base, ...parsed.study, rules: { ...base.rules, ...parsed.study.rules } } : base;
      return { ...empty(), ...parsed, study };
    }
  } catch { /* sin storage o JSON roto */ }
  return empty();
}

let state: State = load();
const subs = new Set<() => void>();

export const getState = () => state;

export function setState(fn: (s: State) => State) {
  state = fn(state);
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* sin storage */ }
  subs.forEach((f) => f());
}

/** Solo para tests. */
export function resetState(s: State = empty()) {
  state = s;
  subs.forEach((f) => f());
}

const subscribe = (f: () => void) => {
  subs.add(f);
  return () => subs.delete(f);
};

export function useStore<T>(sel: (s: State) => T): T {
  return useSyncExternalStore(subscribe, () => sel(state), () => sel(state));
}

// ——— acciones ———

export function register(me: string, partner: string, today = dateKey()) {
  setState((s) => ({
    ...s,
    settings: {
      names: { me: me.trim() || 'Toti', partner: partner.trim() || 'Abi' },
      startDate: today,
      presets: DEFAULT_PRESETS,
      blockPresets: DEFAULT_BLOCK_PRESETS,
    },
  }));
}

export function startDay(routine: RoutineId, wake: string, date = dateKey()) {
  setState((s) => {
    const carry = s.carry[date] ?? {};
    const { [date]: _, ...restCarry } = s.carry;
    const day: DayLog = { date, wake, routine, blocks: buildBlocks(planDay(routine, wake), carry), notes: [], focus: [] };
    return { ...s, days: { ...s.days, [date]: day }, carry: restCarry };
  });
}

export function updateDay(date: string, fn: (d: DayLog) => DayLog) {
  setState((s) => (s.days[date] ? { ...s, days: { ...s.days, [date]: fn(s.days[date]) } } : s));
}

function updateBlock(date: string, key: string, fn: (b: Block) => Block) {
  updateDay(date, (d) => ({ ...d, blocks: d.blocks.map((b) => (b.key === key ? fn(b) : b)) }));
}

export function toggleTask(date: string, key: string, id: string) {
  updateBlock(date, key, (b) => ({ ...b, tasks: b.tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t)) }));
}

export function addTask(date: string, key: string, text: string) {
  const t = text.trim();
  if (!t) return;
  updateBlock(date, key, (b) => ({ ...b, tasks: [...b.tasks, { id: newId(), t, done: false }] }));
}

/** Pasa las tareas pendientes de un bloque al día siguiente. */
export function carryPending(date: string, key: string) {
  const day = state.days[date];
  const block = day?.blocks.find((b) => b.key === key);
  if (!block) return;
  const pending = block.tasks.filter((t) => !t.done);
  if (!pending.length) return;
  const tomorrow = addDays(date, 1);
  setState((s) => {
    const forDay = s.carry[tomorrow] ?? {};
    return {
      ...s,
      carry: { ...s.carry, [tomorrow]: { ...forDay, [key]: [...(forDay[key] ?? []), ...pending.map((t) => t.t)] } },
    };
  });
  updateBlock(date, key, (b) => ({ ...b, tasks: b.tasks.filter((t) => t.done) }));
}

export function addNote(date: string, text: string) {
  const t = text.trim();
  if (t) updateDay(date, (d) => ({ ...d, notes: [...d.notes, t] }));
}

export function logFocus(date: string, entry: FocusEntry) {
  updateDay(date, (d) => ({ ...d, focus: [...d.focus, entry] }));
}

export function setFocus(f: FocusState | null) {
  setState((s) => ({ ...s, focus: f }));
}

function updateSettings(fn: (st: Settings) => Settings) {
  setState((s) => (s.settings ? { ...s, settings: fn(s.settings) } : s));
}

export function savePreset(p: Omit<Preset, 'id'>, assignTo?: string) {
  const id = `p-${newId()}`;
  updateSettings((st) => ({
    ...st,
    presets: [...st.presets, { ...p, id }],
    blockPresets: assignTo ? { ...st.blockPresets, [assignTo]: id } : st.blockPresets,
  }));
  return id;
}

export function deletePreset(id: string) {
  updateSettings((st) => ({
    ...st,
    presets: st.presets.filter((p) => p.id !== id),
    blockPresets: Object.fromEntries(Object.entries(st.blockPresets).filter(([, v]) => v !== id)),
  }));
}

export function setBlockPreset(key: string, id: string | null) {
  updateSettings((st) => {
    const bp = { ...st.blockPresets };
    if (id) bp[key] = id;
    else delete bp[key];
    return { ...st, blockPresets: bp };
  });
}
