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
  // v12.2 (respuesta C): Block 1 del primer día de su bloque (estudiar → test); la tesis, en el cierre (el slot de learning.md).
  days: [0, 1, 2, 3, 4, 5, 6], block: 'prog', engine: true, progress: 0, unitLabel: 'Paper', testMode: 'app',
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

/** v12.2 · los papers que tocan una fecha: los del bloque que empieza ese día (van en su Block 1). */
export const papersDelDia = (fecha: string) => PLAN_EXT.bloques.filter((b) => b.papers?.length && b.fechas?.inicio === fecha).flatMap((b) => b.papers!);

/** v12.2 · la tesis de paper que vence (o venció y no se escribió): va en el slot de learning.md del cierre y es el borrador del post. */
export function tesisDePaper(st: Pick<StudyState, 'reviews'>, fecha: string): string | null {
  const r = st.reviews.find((x) => x.activityId === PAPERS_ID && x.kind === 'tesis' && !x.doneOn && x.due <= fecha);
  return r?.unit ? PAPERS_V12[r.unit - 1]?.nombre ?? null : null;
}
