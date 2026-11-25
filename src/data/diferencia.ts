/**
 * Ola 29 · diferencia contra el roadmap v7. Las fechas del roadmap son estimaciones: Trazo recalcula con su motor (horas de cada
 * bloque sobre la capacidad de cada día) y muestra cuánto se corre cada bloque. Además revisa el propio roadmap: huecos o solapes
 * entre bloques y horas que no entran en las fechas que estima (con la capacidad del plan). No corrige nada: avisa con el cálculo.
 * Puro.
 */
import type { BloqueFechado, PlanExtendido } from './plan-extendido';
import { addDays, daysBetween } from './time';

export interface FilaDiferencia {
  id: string;
  nombre: string;
  tipo: BloqueFechado['tipo'];
  etapa: number;
  /** Número de la certificación en el roadmap. */
  numero?: number;
  horas: number;
  horasAntes?: number;
  dias?: number;
  /** Fechas que calcula Trazo. */
  inicio: string;
  fin: string;
  /** Fechas que estima el roadmap. */
  roadmap: { inicio: string; fin: string };
  /** Días de diferencia (negativo: Trazo termina antes que el roadmap). */
  deltaInicio: number;
  deltaFin: number;
  nota?: string;
}

/** "en fecha", "10 días antes", "1 día después". */
export const textoDelta = (d: number) => (d === 0 ? 'en fecha' : `${Math.abs(d)} ${Math.abs(d) === 1 ? 'día' : 'días'} ${d < 0 ? 'antes' : 'después'}`);

/** Cada bloque con fechas del roadmap, con las fechas de Trazo y la diferencia. Las pausas que inserta el motor no tienen fila. */
export function diferenciaRoadmap(cal: BloqueFechado[]): FilaDiferencia[] {
  return cal.filter((b) => b.roadmap && !b.pausa).map((b) => ({
    id: b.id, nombre: b.nombre, tipo: b.tipo, etapa: b.etapa, ...(b.numero != null ? { numero: b.numero } : {}),
    horas: b.horas ?? 0, ...(b.horasAntes != null ? { horasAntes: b.horasAntes } : {}), ...(b.dias != null ? { dias: b.dias } : {}),
    inicio: b.inicio, fin: b.fin, roadmap: b.roadmap!,
    deltaInicio: daysBetween(b.roadmap!.inicio, b.inicio), deltaFin: daysBetween(b.roadmap!.fin, b.fin),
    ...(b.nota ? { nota: b.nota } : {}),
  }));
}

export interface ResumenDiferencia {
  fin: string;
  finRoadmap: string;
  delta: number;
  /** El bloque que más se adelanta y el que más se atrasa (por su fin). */
  masAntes: FilaDiferencia | null;
  masDespues: FilaDiferencia | null;
  horas: number;
  horasAntes: number;
}

export function resumenDiferencia(filas: FilaDiferencia[]): ResumenDiferencia | null {
  if (!filas.length) return null;
  const ult = filas.reduce((m, f) => (f.fin > m.fin ? f : m), filas[0]);
  const ultR = filas.reduce((m, f) => (f.roadmap.fin > m.roadmap.fin ? f : m), filas[0]);
  const orden = [...filas].sort((a, z) => a.deltaFin - z.deltaFin);
  return {
    fin: ult.fin, finRoadmap: ultR.roadmap.fin, delta: daysBetween(ultR.roadmap.fin, ult.fin),
    masAntes: orden[0].deltaFin < 0 ? orden[0] : null, masDespues: orden[orden.length - 1].deltaFin > 0 ? orden[orden.length - 1] : null,
    horas: filas.reduce((s, f) => s + f.horas, 0), horasAntes: filas.reduce((s, f) => s + (f.horasAntes ?? 0), 0),
  };
}

export interface Chequeo {
  id: string;
  tipo: 'hueco' | 'solape' | 'horas';
  texto: string;
  /** La cuenta que lo muestra. */
  calculo: string;
}

const MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const fc = (d: string) => `${Number(d.slice(8))} ${MES[Number(d.slice(5, 7)) - 1]} ${d.slice(0, 4)}`;
const n1 = (x: number) => (Math.round(x * 10) / 10).toLocaleString('es-AR');

/** Umbral para avisar que las horas de un bloque no entran en sus fechas del roadmap (o sobran). */
export const UMBRAL_HORAS_ROADMAP = 0.1;

/**
 * Revisa el roadmap tal como vino: que cada bloque empiece al día siguiente del anterior (contando las pausas de diciembre como
 * días ocupados) y que las horas de cada bloque entren en sus fechas con la capacidad del plan (±10 %). `capacidad(fecha, tipo)` da
 * las horas de proyecto de ese día (las ventanas usan la suya).
 */
export function chequeosRoadmap(plan: PlanExtendido, capacidad: (fecha: string, tipo: BloqueFechado['tipo']) => number, esPausa: (fecha: string) => boolean): Chequeo[] {
  const out: Chequeo[] = [];
  const bs = plan.bloques.filter((b) => b.roadmap);
  for (let i = 1; i < bs.length; i++) {
    const a = bs[i - 1];
    const b = bs[i];
    // La pausa entre dos bloques no es hueco.
    let esperado = addDays(a.roadmap!.fin, 1);
    while (esPausa(esperado) && esperado < b.roadmap!.inicio) esperado = addDays(esperado, 1);
    if (b.roadmap!.inicio > esperado) {
      const n = daysBetween(esperado, b.roadmap!.inicio);
      out.push({ id: `hueco-${b.id}`, tipo: 'hueco', texto: `Entre ${a.id} y ${b.id} quedan ${n} ${n === 1 ? 'día' : 'días'} sin bloque`, calculo: `${a.id} termina el ${fc(a.roadmap!.fin)} y ${b.id} empieza el ${fc(b.roadmap!.inicio)}` });
    } else if (b.roadmap!.inicio <= a.roadmap!.fin) {
      const n = daysBetween(b.roadmap!.inicio, a.roadmap!.fin) + 1;
      out.push({ id: `solape-${b.id}`, tipo: 'solape', texto: `${a.id} y ${b.id} se pisan ${n} ${n === 1 ? 'día' : 'días'}`, calculo: `${a.id} termina el ${fc(a.roadmap!.fin)} y ${b.id} empieza el ${fc(b.roadmap!.inicio)}` });
    }
  }
  for (const b of bs) {
    if (b.horas == null || b.horas <= 0) continue;
    let cap = 0;
    let dias = 0;
    for (let d = b.roadmap!.inicio; d <= b.roadmap!.fin; d = addDays(d, 1)) {
      if (esPausa(d)) continue;
      const c = capacidad(d, b.tipo);
      cap += c;
      if (c > 0) dias++; // un día libre fijo no es un día del bloque
    }
    const desvio = (cap - b.horas) / b.horas;
    if (Math.abs(desvio) <= UMBRAL_HORAS_ROADMAP) continue;
    // Un bloque ocupa días enteros: lo que sobra del último día no es un desvío (termina el día en que se juntan sus horas).
    if (cap > b.horas && cap - b.horas <= capacidad(b.roadmap!.fin, b.tipo) + 1e-9) continue;
    out.push({
      id: `horas-${b.id}`, tipo: 'horas',
      texto: desvio > 0
        ? `${b.id} · ${b.nombre}: en sus fechas del roadmap entran ${n1(cap)} h y el bloque pide ${b.horas} (sobran ${n1(cap - b.horas)} h)`
        : `${b.id} · ${b.nombre}: el bloque pide ${b.horas} h y en sus fechas del roadmap entran ${n1(cap)} (faltan ${n1(b.horas - cap)} h)`,
      calculo: `${dias} días del ${fc(b.roadmap!.inicio)} al ${fc(b.roadmap!.fin)} con la capacidad del plan = ${n1(cap)} h; ${b.horas} h / ${dias} días = ${n1(b.horas / dias)} h por día`,
    });
  }
  return out;
}

/** Tramos diarios de matemática: el fin que estima el roadmap contra el que calcula Trazo. */
export interface FilaMate { id: string; nombre: string; horas: number; fin: string; finRoadmap: string; delta: number }

export function diferenciaMate(plan: PlanExtendido, tramos: { id: string; fin?: string; horas?: number }[]): FilaMate[] {
  return Object.entries(plan.matematica.diarios).filter(([, x]) => x.finRoadmap).flatMap(([id, x]) => {
    const t = tramos.find((m) => m.id === id);
    if (!t?.fin) return [];
    return [{ id, nombre: x.nombre, horas: t.horas ?? x.horas ?? 0, fin: t.fin, finRoadmap: x.finRoadmap!, delta: daysBetween(x.finRoadmap!, t.fin) }];
  });
}
