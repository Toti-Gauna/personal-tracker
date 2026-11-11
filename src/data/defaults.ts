import type { Area, BlockTemplate, DayRoutine, Preset } from './types';

export const AREAS: Record<Area, { name: string; css: string }> = {
  ing: { name: 'Ingeniería', css: 'var(--ing)' },
  handyx: { name: 'Handyx', css: 'var(--handyx)' },
  eclipse: { name: 'Eclipse', css: 'var(--eclipse)' },
  salud: { name: 'Salud', css: 'var(--salud)' },
  rutina: { name: 'Rutina', css: 'var(--rutina)' },
  economia: { name: 'Economía', css: 'var(--economia)' },
};

/** Las 8 metas del día, en orden. Las de la mañana se encadenan desde que te levantás. */
export const BLOCKS: BlockTemplate[] = [
  { key: 'rutina', title: 'Rutina de la mañana', short: 'la rutina', area: 'rutina', kind: 'pomodoro', min: 30, minMin: 15,
    tasks: ['Agua y cama hecha', 'Movilidad 10 min'] },
  { key: 'math', title: 'Matemática · CONAMAT', short: 'matemática', area: 'ing', kind: 'estudio', min: 120, minMin: 45,
    tasks: ['Repaso de tarjetas', 'Capítulo del día', 'Test del capítulo'] },
  { key: 'prog', title: 'Programación · Python', short: 'programación', area: 'ing', kind: 'estudio', min: 120, minMin: 45,
    tasks: ['Repaso de tarjetas', 'Python Tutorial, secciones 5 y 6', 'Commit de lo avanzado'] },
  { key: 'abi', title: 'Acompañar a Abi y correr', short: 'Abi', area: 'salud', kind: 'pomodoro', min: 90, fixed: '08:30',
    tasks: ['Correr'] },
  { key: 'handyx', title: 'Handyx', short: 'Handyx', area: 'handyx', kind: 'pomodoro', min: 300, fixed: '10:00',
    tasks: ['Revisar pendientes', 'Tarea principal', 'Hablar con un usuario'] },
  { key: 'eclipse', title: 'Eclipse · 10 cold calls', short: 'Eclipse', area: 'eclipse', kind: 'pomodoro', min: 180, fixed: '15:00',
    tasks: ['10 cold calls', 'Anotar resultados'] },
  { key: 'entreno', title: 'Entrenamiento', short: 'el entreno', area: 'salud', kind: 'entreno', min: 90, fixed: '18:00',
    tasks: ['Caminata y movilidad', 'Rutina del día'] },
  { key: 'cierre', title: 'Cerrar y preparar mañana', short: 'el cierre', area: 'rutina', kind: 'pomodoro', min: 30, fixed: '21:00',
    tasks: ['Cerrar el día', 'Preparar mañana'] },
];

export const ROUTINES: DayRoutine[] = [
  { id: 'completo', name: 'Día completo', wake: '04:00', durations: { rutina: 30, math: 120, prog: 120 } },
  { id: 'corto', name: 'Día corto', wake: '05:00', durations: { rutina: 20, math: 90, prog: 100 } },
];

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

/** Nombres de los bimestres hasta que se puedan renombrar (ola 4). */
export const BIMESTER_NAMES = ['El despegue'];
export const WEEKS_PER_BIMESTER = 9;
