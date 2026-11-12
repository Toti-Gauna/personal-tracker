import { DEFAULT_ALARMS, DEFAULT_SOUNDS } from '../data/sounds';
import { dayXp, newSeals } from '../data/profile';
import { addDays, nowMin, toHHMM } from '../data/time';
import type { Alarm, DayLog, Settings, SoundEvent, SoundId } from '../data/types';
import { getState, setState, updateDay } from './store';
import type { Area } from '../data/types';

/** Suma a la lista los sellos que ya se cumplen. Devuelve los nuevos. */
export function syncSeals(date: string): string[] {
  const s = getState();
  if (!s.settings) return [];
  const fresh = newSeals(s, date);
  if (fresh.length) {
    setState((x) => ({ ...x, profile: { ...x.profile, seals: { ...x.profile.seals, ...Object.fromEntries(fresh.map((id) => [id, date])) } } }));
  }
  return fresh;
}

export function claimSeal(id: string, date: string) {
  setState((x) => (x.profile.seals[id] ? x : { ...x, profile: { ...x.profile, seals: { ...x.profile.seals, [id]: date } } }));
}

export function unclaimSeal(id: string) {
  setState((x) => {
    const { [id]: _, ...rest } = x.profile.seals;
    return { ...x, profile: { ...x.profile, seals: rest } };
  });
}

/** Cierra el día: guarda el cierre, pasa las tareas elegidas a mañana y suma los sellos. */
export function closeDay(date: string, data: { victoria: string; manana: string; carry: string[]; score: number }) {
  const day = getState().days[date];
  if (!day) return [];
  // Las tareas elegidas pasan a mañana, bloque por bloque.
  for (const b of day.blocks) {
    const pend = b.tasks.filter((t) => !t.done && data.carry.includes(t.id));
    if (!pend.length) continue;
    const tomorrow = addDays(date, 1);
    setState((s) => {
      const forDay = s.carry[tomorrow] ?? {};
      return { ...s, carry: { ...s.carry, [tomorrow]: { ...forDay, [b.key]: [...(forDay[b.key] ?? []), ...pend.map((t) => t.t)] } } };
    });
    updateDay(date, (d) => ({ ...d, blocks: d.blocks.map((x) => (x.key === b.key ? { ...x, tasks: x.tasks.filter((t) => !pend.some((p) => p.id === t.id)) } : x)) }));
  }
  const closed = getState().days[date];
  updateDay(date, (d) => ({ ...d, closed: { at: toHHMM(nowMin()), xp: dayXp(closed), score: data.score, victoria: data.victoria.trim(), manana: data.manana.trim() } }));
  syncSeals(date);
  // Los sellos que todavía no viste: la pantalla de logro sale al cerrar.
  const s = getState();
  return Object.keys(s.profile.seals).filter((id) => !s.profile.seen.includes(id));
}

export function markSealSeen(id: string) {
  setState((x) => (x.profile.seen.includes(id) ? x : { ...x, profile: { ...x.profile, seen: [...x.profile.seen, id] } }));
}

export const reopenDay = (date: string) => updateDay(date, (d: DayLog) => ({ ...d, closed: undefined }));

// ——— Ajustes ———

function updateSettings(fn: (s: Settings) => Settings) {
  setState((x) => (x.settings ? { ...x, settings: fn(x.settings) } : x));
}

export function setNames(me: string, partner: string) {
  updateSettings((s) => ({ ...s, names: { me: me.trim() || s.names.me, partner: partner.trim() || s.names.partner } }));
}

export function setAreaName(a: Area, name: string) {
  updateSettings((s) => {
    const names = { ...(s.areaNames ?? {}) };
    if (name.trim()) names[a] = name.trim();
    else delete names[a];
    return { ...s, areaNames: names };
  });
}

export function setSoundFor(event: SoundEvent, id: SoundId) {
  updateSettings((s) => {
    const cur = s.sounds ?? DEFAULT_SOUNDS;
    return { ...s, sounds: { ...cur, events: { ...cur.events, [event]: id } } };
  });
}

export function setVolume(v: number) {
  updateSettings((s) => ({ ...s, sounds: { ...(s.sounds ?? DEFAULT_SOUNDS), volume: Math.max(0, Math.min(100, Math.round(v))) } }));
}

export function setVibrate(on: boolean) {
  updateSettings((s) => ({ ...s, sounds: { ...(s.sounds ?? DEFAULT_SOUNDS), vibrate: on } }));
}

export function setAlarms(alarms: Alarm[]) {
  updateSettings((s) => ({ ...s, alarms }));
}

export function setDayRoutine(id: 'completo' | 'corto', patch: { wake?: string; durations?: Record<string, number> }) {
  updateSettings((s) => {
    const cur = s.dayRoutines?.[id];
    return { ...s, dayRoutines: { ...(s.dayRoutines ?? {}), [id]: { wake: patch.wake ?? cur?.wake ?? '', durations: { ...(cur?.durations ?? {}), ...(patch.durations ?? {}) } } } };
  });
}

export function resetDayRoutines() {
  updateSettings((s) => ({ ...s, dayRoutines: undefined }));
}

export function markBackup(date: string) {
  updateSettings((s) => ({ ...s, lastBackup: date }));
}

export const alarmsOf = (s: Settings | null) => s?.alarms ?? DEFAULT_ALARMS;
