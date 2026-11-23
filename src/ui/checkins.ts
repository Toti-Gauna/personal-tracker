/**
 * Los check-ins de Entreno: qué hoja está abierta (el peso del día o la corrida). El peso se pregunta con un aviso, no con una
 * hoja que te persigue (lo resuelve el marco); la corrida se carga en `v2/entreno/HojaCorridaV2`.
 */
import { useSyncExternalStore } from 'react';

export type Checkin = { tipo: 'peso' | 'corrida'; date: string } | null;
let abierta: Checkin = null;
const subs = new Set<() => void>();
const emit = () => subs.forEach((f) => f());
const subscribe = (f: () => void) => { subs.add(f); return () => { subs.delete(f); }; };

/** Pregunta el peso del día (la primera vez que entrás a Entreno). */
export const abrirPeso = (date: string) => { abierta = { tipo: 'peso', date }; emit(); };
/** Abre la hoja de la corrida del día (al tildar "Correr" o tocar + en la meta). */
export const abrirCorrida = (date: string) => { abierta = { tipo: 'corrida', date }; emit(); };
export const cerrarHojas = () => { abierta = null; emit(); };
/** Solo para tests: qué hoja está abierta. */
export const hojaAbierta = () => abierta;
export const useHojaAbierta = () => useSyncExternalStore(subscribe, () => abierta);
