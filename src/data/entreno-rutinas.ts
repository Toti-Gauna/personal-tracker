import raw from '../../data/entreno.json';
import type { Calentamiento, ExKind, Exercise, Estiramiento, Routine } from './train-types';

/**
 * Ola 19 · las rutinas de entreno de Toti, de data/entreno.json: Push, Pull y Legs en versión A y B, y
 * Upper y Lower. Se validan al cargar. Los días de la semana (lunes Pull … viernes Lower) los fija la
 * plantilla "PPL + Upper/Lower" (train-catalog.ts).
 */

interface EjJson {
  id: string; nombre: string; grupo?: string; series: number; reps: [number, number]; rir?: number[]; tipo: ExKind; descanso: number;
  tempo?: string; tempoDesc?: string; posicion?: string; rirGuia?: string; parciales?: string; dropset?: string; tips?: string; musculos?: string;
  objetivo?: string; pesoInicial?: number; corporal?: boolean; unidad?: 's'; nota?: string;
}
interface WarmJson {
  id: string; nombre: string; series?: number; reps?: string; rir?: number[]; min: number; detalle?: string; pasos?: string[];
  tempo?: string; tempoDesc?: string; posicion?: string; rirGuia?: string; parciales?: string; dropset?: string; tips?: string; musculos?: string; objetivo?: string;
}
interface RutinaJson {
  id: string; slot: string; variante?: 'A' | 'B'; nombre: string; enfoque: string; calentamiento: WarmJson[]; ejercicios: EjJson[]; estiramiento: Estiramiento;
}
export interface EntrenoFile { version: number; rutinas: RutinaJson[] }

const KINDS: ExKind[] = ['pierna', 'torso', 'aislamiento'];

/** Errores de data/entreno.json; vacío si está bien. */
export function validarEntreno(f: EntrenoFile): string[] {
  const e: string[] = [];
  if (f.version !== 1) e.push('"version" tiene que ser 1');
  const ids = new Set<string>();
  const variantes = new Map<string, Set<string>>();
  for (const r of f.rutinas ?? []) {
    const at = r.id ?? '(sin id)';
    if (!r.id || ids.has(r.id)) e.push(`${at}: id vacío o repetido`);
    ids.add(r.id);
    if (!r.slot) e.push(`${at}: falta "slot"`);
    if (r.variante) {
      const v = variantes.get(r.slot) ?? new Set();
      if (v.has(r.variante)) e.push(`${at}: la variante ${r.variante} de "${r.slot}" está repetida`);
      variantes.set(r.slot, v.add(r.variante));
    }
    if (!r.nombre || !r.enfoque) e.push(`${at}: faltan "nombre" o "enfoque"`);
    if (!r.ejercicios?.length) e.push(`${at}: no tiene ejercicios`);
    if (!r.estiramiento?.musculos) e.push(`${at}: falta el estiramiento con sus músculos`);
    const exIds = new Set<string>();
    for (const x of r.ejercicios ?? []) {
      const ax = `${at} · ${x.id ?? x.nombre}`;
      if (!x.id || exIds.has(x.id)) e.push(`${ax}: id vacío o repetido`);
      exIds.add(x.id);
      if (!x.nombre) e.push(`${ax}: falta el nombre`);
      if (!(x.series >= 1)) e.push(`${ax}: "series" tiene que ser 1 o más`);
      if (!Array.isArray(x.reps) || x.reps.length !== 2 || !(x.reps[0] >= 1) || x.reps[1] < x.reps[0]) e.push(`${ax}: "reps" tiene que ser [mín, máx]`);
      if (!KINDS.includes(x.tipo)) e.push(`${ax}: "tipo" tiene que ser ${KINDS.join(', ')}`);
      if (!(x.descanso >= 15)) e.push(`${ax}: "descanso" en segundos (15 o más)`);
      if (x.rir && x.rir.length !== x.series) e.push(`${ax}: el RIR trae ${x.rir.length} valores y son ${x.series} series`);
      if (x.rir?.some((n) => !Number.isInteger(n) || n < 0 || n > 6)) e.push(`${ax}: el RIR va de 0 a 6`);
      if (x.tempo && !/^\d-\d-\d$/.test(x.tempo)) e.push(`${ax}: "tempo" tiene la forma 2-1-2`);
    }
    const wIds = new Set<string>();
    for (const w of r.calentamiento ?? []) {
      if (!w.id || wIds.has(w.id)) e.push(`${at} · calentamiento ${w.id ?? w.nombre}: id vacío o repetido`);
      wIds.add(w.id);
      if (!(w.min > 0)) e.push(`${at} · calentamiento ${w.id}: "min" tiene que ser mayor a 0`);
    }
  }
  return e;
}

const warm = (w: WarmJson): Calentamiento => ({
  id: w.id, name: w.nombre, min: w.min, ...(w.series ? { sets: w.series } : {}), ...(w.reps ? { reps: w.reps } : {}), ...(w.rir ? { rir: w.rir } : {}),
  ...(w.detalle ? { detalle: w.detalle } : {}), ...(w.pasos ? { pasos: w.pasos } : {}),
  ...(w.tempo ? { tempo: w.tempo } : {}), ...(w.tempoDesc ? { tempoDesc: w.tempoDesc } : {}), ...(w.posicion ? { posicion: w.posicion } : {}), ...(w.rirGuia ? { rirGuia: w.rirGuia } : {}),
  ...(w.parciales ? { parciales: w.parciales } : {}), ...(w.dropset ? { dropset: w.dropset } : {}), ...(w.tips ? { tips: w.tips } : {}), ...(w.musculos ? { musculos: w.musculos } : {}),
  ...(w.objetivo ? { objetivo: w.objetivo } : {}),
});

const ejercicio = (x: EjJson): Exercise => ({
  id: x.id, name: x.nombre, sets: x.series, repMin: x.reps[0], repMax: x.reps[1], rest: x.descanso, kind: x.tipo,
  ...(x.grupo ? { grupo: x.grupo } : {}), ...(x.rir ? { rir: x.rir } : {}), ...(x.pesoInicial != null ? { pesoInicial: x.pesoInicial } : {}),
  ...(x.corporal ? { corporal: true } : {}), ...(x.unidad ? { unidad: x.unidad } : {}), ...(x.nota ? { nota: x.nota } : {}),
  ...(x.tempo ? { tempo: x.tempo } : {}), ...(x.tempoDesc ? { tempoDesc: x.tempoDesc } : {}), ...(x.posicion ? { posicion: x.posicion } : {}), ...(x.rirGuia ? { rirGuia: x.rirGuia } : {}),
  ...(x.parciales ? { parciales: x.parciales } : {}), ...(x.dropset ? { dropset: x.dropset } : {}), ...(x.tips ? { tips: x.tips } : {}), ...(x.musculos ? { musculos: x.musculos } : {}),
  ...(x.objetivo ? { objetivo: x.objetivo } : {}),
});

/** Una rutina del JSON como la usa el entreno: 30 min de caminata de ida, la rutina, y 30 de vuelta. */
export function rutinaDeJson(r: RutinaJson, sid: (p: string) => string): Routine {
  return {
    id: r.id, name: r.nombre, desc: r.enfoque, slot: r.slot, ...(r.variante ? { variante: r.variante } : {}),
    before: [{ id: sid('s'), name: 'Caminata de ida', min: 30 }],
    calentamiento: r.calentamiento.map(warm),
    exercises: r.ejercicios.map(ejercicio),
    estiramiento: r.estiramiento,
    after: [{ id: sid('s'), name: 'Caminata de vuelta', min: 30 }],
  };
}

export const ENTRENO = raw as unknown as EntrenoFile;
export const ERRORES_ENTRENO = validarEntreno(ENTRENO);
if (ERRORES_ENTRENO.length) throw new Error(`data/entreno.json: ${ERRORES_ENTRENO.join(' · ')}`);
