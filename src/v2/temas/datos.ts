/**
 * Trazo 2.0 · lo que comparten las pantallas de la familia «temas» (tanda 3.3): los colores del área, las fechas cortas y los
 * tramos para arreglar un tema. Todo sale de los mismos módulos de datos que la 1.0; acá no hay estado propio.
 */
import { useMemo } from 'react';
import { AREAS } from '../../data/defaults';
import { finalReadiness, fixPlan, temaInfo } from '../../data/debiles';
import type { StudyState, Tramo } from '../../data/study-types';
import { colorV2 } from '../hoy/datos';

/** El color del área de un frente o de un roadmap, ya como token 2.0. */
export const areaV2 = (area: string | undefined, otro = 'var(--a-economia)') => (area && area in AREAS ? colorV2(AREAS[area as keyof typeof AREAS].css) : otro);

const MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
/** "23 nov": día y mes, sin año. */
export const fch = (d: string) => `${Number(d.slice(8))} ${MES[Number(d.slice(5, 7)) - 1]}`;
/** "23 nov 26": con el año corto, para los tramos del plan. */
export const fchAnio = (d: string) => `${fch(d)} ${d.slice(2, 4)}`;
export const pct = (n: number) => `${Math.round(n * 100)} %`;

/** "A, B y C". */
export const lista = (xs: string[]) => (xs.length > 1 ? `${xs.slice(0, -1).join(', ')} y ${xs[xs.length - 1]}` : xs[0] ?? '');

/** Los tramos de estudio para arreglar un solo tema (los mismos que arma la 1.0). */
export function tramosDeTema(st: Parameters<typeof temaInfo>[0], temaId: string): Tramo[] {
  const t = st.activities.length ? temaInfo(st, temaId) : null;
  if (!t) return [];
  return fixPlan(st, temaId).map((paso, i) => ({
    step: 'repetir',
    kind: paso.kind === 'tarjetas' ? 'tarjetas' : paso.kind === 'releer' ? 'releer' : 'ejercicios',
    title: `${t.corto[0].toUpperCase()}${t.corto.slice(1)} · ${paso.texto[0].toLowerCase()}${paso.texto.slice(1)}`,
    sub: `Arreglar · ${t.nombre}`,
    min: paso.min,
    ref: paso.kind === 'tarjetas' ? `cards:${t.frontId}` : `fix:${t.id}:${i}`,
    activityId: t.activity?.id ?? 'repaso',
  }));
}

/** Fuerza de cada capítulo de la actividad con examen final (CONAMAT, o el primer libro con capítulos). */
export function fuerzasDe(st: StudyState) {
  const a = st.activities.find((x) => x.id === 'conamat') ?? st.activities.find((x) => x.units?.length);
  const f: Record<number, number | null> = {};
  for (const u of a?.units ?? []) f[u.n] = temaInfo(st, `${a!.id}:${u.n}`)?.fuerza ?? null;
  return { a, f };
}

/** Cuán listo estás para el final y qué te falta (lo mismo que calculaba la 1.0). */
export function useListo(st: StudyState) {
  return useMemo(() => {
    const { a, f } = fuerzasDe(st);
    const listo = finalReadiness(f);
    const faltan = (a?.units ?? []).filter((u) => f[u.n] != null && f[u.n]! < 85).sort((x, y) => f[x.n]! - f[y.n]!).slice(0, 2).map((u) => u.corto ?? u.title);
    const sinEstudiar = (a?.units ?? []).filter((u) => f[u.n] == null).length;
    const flojos = (a?.units ?? []).filter((u) => f[u.n] != null && f[u.n]! < 70).length;
    // Recomendado: un capítulo por día lo que falta, más el test y la tesis del último, más un día por tema flojo.
    const dias = listo >= 85 ? 0 : sinEstudiar + (sinEstudiar ? 2 : 0) + flojos + (faltan.length ? 2 : 0);
    return { a, f, listo, faltan, sinEstudiar, dias };
  }, [st]);
}
