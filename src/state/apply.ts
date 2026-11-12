import { ROUTINES, areaNameOverrides } from '../data/defaults';
import { DEFAULT_ROUTINES_SNAPSHOT } from '../data/routines-default';
import type { Settings } from '../data/types';
import { configureSound } from '../ui/sound';

/** Lleva los ajustes a lo que los usa de forma global: sonidos, nombres de áreas y rutinas del día. */
export function applySettings(s: Settings | null) {
  configureSound(s?.sounds);
  for (const k of Object.keys(areaNameOverrides)) delete areaNameOverrides[k as keyof typeof areaNameOverrides];
  Object.assign(areaNameOverrides, s?.areaNames ?? {});
  for (const r of ROUTINES) {
    const base = DEFAULT_ROUTINES_SNAPSHOT[r.id];
    const over = s?.dayRoutines?.[r.id];
    r.wake = over?.wake || base.wake;
    r.durations = { ...base.durations, ...(over?.durations ?? {}) };
  }
}
