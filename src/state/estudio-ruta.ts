import { progresoVacio, roadmapPorId, type ProgresoRoadmap } from '../data/study-roadmap';
import { getState, setState } from './store';

function update(id: string, fn: (p: ProgresoRoadmap) => ProgresoRoadmap) {
  setState((s) => ({ ...s, estudioRuta: { ...s.estudioRuta, [id]: fn(s.estudioRuta[id] ?? progresoVacio()) } }));
}

/** Tilda o destilda un criterio de salida de una fase. */
export function toggleCriterio(roadmap: string, fase: string, i: number) {
  update(roadmap, (p) => {
    const set = new Set(p.salida[fase] ?? []);
    if (set.has(i)) set.delete(i);
    else set.add(i);
    return { ...p, salida: { ...p.salida, [fase]: [...set].sort((a, b) => a - b) } };
  });
}

/**
 * Cierra la fase actual si todos sus criterios están confirmados. Devuelve si la cerró.
 * Las fases se cierran en orden: no se puede cerrar una que no es la actual.
 */
export function cerrarFase(roadmap: string, fase: string, fecha: string): boolean {
  const r = roadmapPorId(roadmap);
  const p = getState().estudioRuta[roadmap] ?? progresoVacio();
  const actual = r?.fases.find((f) => !p.cerradas[f.id]);
  if (!r || !actual || actual.id !== fase) return false;
  if ((p.salida[fase] ?? []).length < actual.salida.length) return false;
  update(roadmap, (q) => ({ ...q, cerradas: { ...q.cerradas, [fase]: fecha } }));
  return true;
}

/** Reabre la última fase cerrada (si te apuraste). */
export function reabrirFase(roadmap: string) {
  const r = roadmapPorId(roadmap);
  if (!r) return;
  update(roadmap, (p) => {
    const ultima = [...r.fases].reverse().find((f) => p.cerradas[f.id]);
    if (!ultima) return p;
    const { [ultima.id]: _, ...resto } = p.cerradas;
    return { ...p, cerradas: resto };
  });
}
