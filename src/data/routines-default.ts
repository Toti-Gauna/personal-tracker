import { ROUTINES } from './defaults';

/** Copia de las rutinas del día de fábrica, para poder volver a ellas. */
export const DEFAULT_ROUTINES_SNAPSHOT: Record<'completo' | 'corto', { wake: string; durations: Record<string, number> }> = Object.fromEntries(
  ROUTINES.map((r) => [r.id, { wake: r.wake, durations: { ...r.durations } }]),
) as Record<'completo' | 'corto', { wake: string; durations: Record<string, number> }>;
