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
  /** Es una pantalla de adentro de otra (la sesión es parte de Entreno): en Ajustes no se nombra aparte. */
  parte?: boolean;
  /** Qué parte de la ruta cubre (por su `param`); lo demás sigue en 1.0. Sin esto, la ruta entera. */
  cubre?: (ruta: Ruta) => boolean;
  Componente: ComponentType<PropsV2>;
}

export type RegistroV2 = Partial<Record<Pantalla, EntradaV2>>;

/** Las pantallas llegan de a una; las de `taller` no cuentan como pantallas convertidas. */
/** Qué rutas de #/estudio/… son 2.0: el centro, Matemática y cada uno de sus libros. */
export function cubreEstudio(param?: string): boolean {
  return !param || param === 'mate' || /^mate\/libro\/[^/]+$/.test(param);
}

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
  // Estudio (2.5): el centro con el metro de caminos, Matemática y sus libros con el mapa de calor, el repaso y los puntos débiles,
  // las tarjetas que giran y Cómo funciona. El capítulo, cada tramo, idiomas, programación y los tests siguen en la 1.0.
  estudio: { nombre: 'Estudio', Componente: lazy(() => import('./estudio/EstudioV2')), cubre: (r) => cubreEstudio(r.param) },
  repaso: { nombre: 'Repasar', Componente: lazy(() => import('./estudio/Pantallas').then((m) => ({ default: m.Repaso }))) },
  flojo: { nombre: 'Puntos débiles', Componente: lazy(() => import('./estudio/Pantallas').then((m) => ({ default: m.Flojo }))), cubre: (r) => !r.param || r.param === 'recall' || r.param === 'analisis' },
  tarjetas: { nombre: 'Tarjetas', Componente: lazy(() => import('./estudio/Pantallas').then((m) => ({ default: m.Tarjetas }))) },
  como: { nombre: 'Cómo funciona', Componente: lazy(() => import('./estudio/Pantallas').then((m) => ({ default: m.Como }))) },
  // Entreno (3.1): el centro con la figura del cuerpo y sus pantallas de adentro. Cambiar la semana y editar una rutina siguen en la 1.0.
  entreno: { nombre: 'Entreno', Componente: lazy(() => import('./entreno/EntrenoV2')) },
  'entreno-sesion': { nombre: 'Sesión de entreno', parte: true, Componente: lazy(() => import('./entreno/SesionV2')) },
  'entreno-resumen': { nombre: 'Resumen de entreno', parte: true, Componente: lazy(() => import('./entreno/ResumenV2')) },
  'entreno-peso': { nombre: 'Peso', parte: true, Componente: lazy(() => import('./entreno/PesoV2')) },
  'entreno-motor': { nombre: 'Motor de entreno', parte: true, Componente: lazy(() => import('./entreno/MotorV2')) },
  // Perfil, Avance y el cierre (3.2). La presentación es parte de Avance; el sello nuevo, de Perfil; el cierre, de Hoy.
  perfil: { nombre: 'Perfil', Componente: lazy(() => import('./perfil/PerfilV2')) },
  avance: { nombre: 'Avance', Componente: lazy(() => import('./perfil/AvanceV2')) },
  cierre: { nombre: 'Cierre del día', parte: true, Componente: lazy(() => import('./perfil/CierreV2')) },
  logro: { nombre: 'Sello nuevo', parte: true, Componente: lazy(() => import('./perfil/LogroV2')) },
  ajustes: { nombre: 'Ajustes', Componente: lazy(() => import('./pantallas/AjustesV2')) },
  v2: { nombre: 'Taller 2.0', taller: true, Componente: lazy(() => import('./pantallas/Taller')) },
};
