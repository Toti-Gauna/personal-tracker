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
  Componente: ComponentType<PropsV2>;
}

export type RegistroV2 = Partial<Record<Pantalla, EntradaV2>>;

/** Las pantallas llegan de a una; las de `taller` no cuentan como pantallas convertidas. */
export const PANTALLAS_V2: RegistroV2 = {
  v2: { nombre: 'Taller 2.0', taller: true, Componente: lazy(() => import('./pantallas/Taller')) },
};
