/**
 * v12.1 · los papers como una actividad de estudio con unidades: cada paper pasa por estudiar → test → tesis como un capítulo (y el
 * siguiente se abre con la tesis). Van en el orden de los bloques del plan; los opcionales y los sueltos, al final de su tramo. La
 * tesis del paper es el tema del post del martes o el jueves.
 */
import { PLAN_EXT, type PaperV12 } from './plan-extendido';
import type { Activity, StudyState } from './study-types';
import { addDays } from './time';

export const PAPERS_ID = 'papers';

export const PAPERS_V12: (PaperV12 & { bloque: string | null })[] = [
  ...PLAN_EXT.bloques.flatMap((b) => (b.papers ?? []).map((p) => ({ ...p, bloque: b.id }))),
  ...(PLAN_EXT.papersSueltos ?? []).map((p) => ({ ...p, bloque: null })),
];

export const actividadPapers = (): Activity => ({
  id: PAPERS_ID, title: 'Papers', front: 'prog', type: 'lectura', perSession: 1, total: PAPERS_V12.length, unit: 'papers',
  days: [0, 1, 2, 3, 4, 5, 6], block: 'leer', engine: true, progress: 0, unitLabel: 'Paper', testMode: 'app',
  units: PAPERS_V12.map((p, i) => ({
    n: i + 1, title: `${p.nombre}${p.opcional ? ' (opcional)' : ''}`, corto: p.nombre.replace(/ \(\d{4}\)$/, ''),
    test: { count: 5, desc: 'La idea, el método, el resultado, el límite y qué cambió después', min: 15 },
  })),
});

/** El tema del post de hoy: la tesis de paper más reciente de la última semana (o nada). */
export function temaDelPost(st: Pick<StudyState, 'tesis'>, fecha: string): string | null {
  const t = st.tesis
    .filter((x) => x.activityId === PAPERS_ID && x.savedOn <= fecha && x.savedOn > addDays(fecha, -7))
    .sort((a, b) => b.savedOn.localeCompare(a.savedOn))[0];
  if (!t?.unit) return null;
  return PAPERS_V12[t.unit - 1]?.nombre ?? null;
}
