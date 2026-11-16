import type { Rama, RamaOMain } from './types';

/** Las seis ramas del plan T+18, en el orden en que se muestran. */
export const RAMAS: Rama[] = ['programacion', 'matematica', 'trabajo', 'ingles', 'handyx', 'salud'];

export const RAMA_NOMBRE: Record<RamaOMain, string> = {
  main: 'Trazo', programacion: 'Programación', matematica: 'Matemática', trabajo: 'Trabajo', ingles: 'Idiomas', handyx: 'Handyx', salud: 'Salud',
};

/** Cada rama toma el color de un área; inglés tiene token propio (--idi) y main va en tinta. */
export const RAMA_COLOR: Record<RamaOMain, string> = {
  main: 'var(--tinta)', programacion: 'var(--ing)', matematica: 'var(--economia)', trabajo: 'var(--rutina)', ingles: 'var(--idi)', handyx: 'var(--handyx)', salud: 'var(--salud)',
};

export const esRama = (x: unknown): x is Rama => typeof x === 'string' && (RAMAS as string[]).includes(x);
