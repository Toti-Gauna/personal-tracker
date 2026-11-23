/**
 * Ola 28 · "¿En qué estado estás?": la hoja que aparece al cerrar la meta de matemática o una sesión de estudio. Acá vive qué
 * hoja está abierta; la hoja en sí es `v2/estudio/EstadoEstudioV2`. El capítulo no avanza por tiempo: lo marcás vos.
 */
import { useSyncExternalStore } from 'react';

export type EstadoAbierto = { date: string; actividades?: string[]; nota?: string } | null;
let abierta: EstadoAbierto = null;
const subs = new Set<() => void>();
const emit = () => subs.forEach((f) => f());
const subscribe = (f: () => void) => { subs.add(f); return () => { subs.delete(f); }; };

/** Abre la hoja. Sin `actividades`, la de los libros de matemática en curso. */
export const abrirEstadoEstudio = (date: string, opciones: { actividades?: string[]; nota?: string } = {}) => {
  abierta = { date, ...opciones };
  emit();
};
export const cerrarEstadoEstudio = () => { abierta = null; emit(); };
/** Solo para tests. */
export const estadoEstudioAbierto = () => abierta;
export const useEstadoEstudio = () => useSyncExternalStore(subscribe, () => abierta);
