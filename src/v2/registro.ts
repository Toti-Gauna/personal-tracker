/**
 * UX 2.0 · las pantallas ya hechas en 2.0, por ruta. Las que no están acá se ven con su versión 1.0 dentro de la 2.0
 * (con una marca "1.0"). Cada pantalla nueva se suma a este registro y se carga recién cuando se la visita, así la 1.0
 * no descarga nada de la 2.0.
 */
import { lazy, type ComponentType } from 'react';
import type { DayLog } from '../data/types';
import type { Pantalla, Ruta } from '../lib/routes';

export interface PropsV2 {
  ruta: Ruta;
  day: DayLog;
  today: string;
}

export interface EntradaV2 {
  /** Cómo se llama en la lista de Ajustes. */
  nombre: string;
  /** De taller: muestra el sistema, no reemplaza a ninguna pantalla de la 1.0. */
  taller?: boolean;
  /** Qué parte de la ruta cubre (por su `param`); lo demás sigue en 1.0. Sin esto, la ruta entera. */
  cubre?: (ruta: Ruta) => boolean;
  Componente: ComponentType<PropsV2>;
}

export type RegistroV2 = Partial<Record<Pantalla, EntradaV2>>;

/** Las pantallas llegan de a una; las de `taller` no cuentan como pantallas convertidas. */
/** Qué rutas de #/metas/… son 2.0 (el resto, y P0, siguen en la 1.0 con su marca). */
export function cubreMetas(param?: string): boolean {
  if (!param) return true;
  if (['periodos', 'analisis', 'linea', 'constelacion', 'fondo', 'open-source'].includes(param)) return true;
  if (param.startsWith('periodos/')) return true;
  if (/^(cert|ventana|pista|fondo|iman)\/[^/]+$/.test(param)) return true;
  return /^proyecto\/(?!P0$)[^/]+$/.test(param);
}

export const PANTALLAS_V2: RegistroV2 = {
  hoy: { nombre: 'Hoy', Componente: lazy(() => import('./hoy/HoyV2')) },
  // El Plan: el centro (#/metas y #/metas/periodos), la bajada por niveles, el análisis, la línea de tiempo y la constelación (2.2 y 2.3);
  // las páginas de bloque, certificación y ventana, y De fondo con sus pistas, ítems, Imán y open source (2.4). Lo demás de Metas
  // sigue en 1.0, y también P0 (Constelación v1): sus metas propias no se tocan hasta la 3.3.
  metas: { nombre: 'Plan', Componente: lazy(() => import('./plan/PlanV2')), cubre: (r) => cubreMetas(r.param) },
  ajustes: { nombre: 'Ajustes', Componente: lazy(() => import('./pantallas/AjustesV2')) },
  v2: { nombre: 'Taller 2.0', taller: true, Componente: lazy(() => import('./pantallas/Taller')) },
};
