import { metasOf, toTemplate } from './routines';
import type { Area, BlockTemplate, Preset } from './types';

const AREA_DEFAULTS: Record<Area, { name: string; css: string }> = {
  ing: { name: 'Ingeniería', css: 'var(--ing)' },
  handyx: { name: 'Handyx', css: 'var(--handyx)' },
  eclipse: { name: 'Eclipse', css: 'var(--eclipse)' },
  salud: { name: 'Salud', css: 'var(--salud)' },
  rutina: { name: 'Rutina', css: 'var(--rutina)' },
  economia: { name: 'Economía', css: 'var(--economia)' },
};

/** Nombres propios de las áreas (Ajustes). */
export const areaNameOverrides: Partial<Record<Area, string>> = {};

/** El nombre sale de los ajustes si lo renombraste; el color no cambia. */
export const AREAS = Object.fromEntries(
  (Object.keys(AREA_DEFAULTS) as Area[]).map((k) => [
    k,
    { get name() { return areaNameOverrides[k]?.trim() || AREA_DEFAULTS[k].name; }, css: AREA_DEFAULTS[k].css },
  ]),
) as Record<Area, { readonly name: string; css: string }>;
export const areaDefaultName = (a: Area) => AREA_DEFAULTS[a].name;

/**
 * Las metas de lunes a viernes, como plantillas (para elegir el bloque de una actividad de
 * estudio). Salen de data/routines.json: acá no hay horarios.
 */
export const BLOCKS: BlockTemplate[] = metasOf('weekday').map((b) => toTemplate(b));

/** Formas base de trabajar un bloque: se ajustan al tiempo que queda. */
export const BUILTIN_PRESETS: Preset[] = [
  { id: 'b-50-10', name: '50/10', focus: 50, rest: 10, cycles: 1, builtin: true, desc: 'Un pomodoro largo y un cierre corto' },
  { id: 'b-80-10', name: '80/10', focus: 80, rest: 10, cycles: 1, builtin: true, desc: 'Para meterte de lleno en algo difícil' },
  { id: 'b-25-5', name: '25/5', focus: 25, rest: 5, cycles: 1, builtin: true, desc: 'Para tareas sueltas o un día cansado' },
  { id: 'b-corrido', name: 'Corrido', focus: 0, rest: 0, cycles: 1, straight: true, builtin: true, desc: 'Sin cortes; el descanso va después' },
];

export const DEFAULT_PRESETS: Preset[] = [
  { id: 'p-math', name: 'Matemática profunda', focus: 80, rest: 10, cycles: 1 },
  { id: 'p-prog', name: 'Programación', focus: 50, rest: 10, cycles: 2 },
  { id: 'p-lectura', name: 'Lectura larga', focus: 90, rest: 15, cycles: 1 },
  { id: 'p-clasico', name: 'Clásico', focus: 25, rest: 5, cycles: 4, longRest: 20 },
];

export const DEFAULT_BLOCK_PRESETS: Record<string, string> = { math: 'p-math', prog: 'p-prog' };

export const WEEKS_PER_BIMESTER = 9;
