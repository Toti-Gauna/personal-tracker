import { areaNameOverrides } from '../data/defaults';
import type { Settings } from '../data/types';
import { configureSound } from '../ui/sound';

/** Lleva los ajustes a lo que los usa de forma global: sonidos y nombres de áreas. */
export function applySettings(s: Settings | null) {
  configureSound(s?.sounds);
  for (const k of Object.keys(areaNameOverrides)) delete areaNameOverrides[k as keyof typeof areaNameOverrides];
  Object.assign(areaNameOverrides, s?.areaNames ?? {});
}
