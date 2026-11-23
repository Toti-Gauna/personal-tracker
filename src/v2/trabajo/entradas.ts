/**
 * Trazo 2.0 · las rutas de la familia «trabajo» (tanda 3.3): las ramas del plan (búsqueda, idiomas, Handyx), el sprint y su impacto, el
 * análisis (calibración, diferencia, revisión semanal, compras) y el proyecto en curso con P0. Cada entrada dice a qué pantalla de la
 * 1.0 reemplaza y, con `cubre`, qué parte de sus rutas. Se suman a la entrada principal de esa pantalla en `src/v2/extras.ts`.
 */
import { lazy } from 'react';
import type { EntradaExtra } from '../registro';

export const ENTRADAS: EntradaExtra[] = [
  { pantalla: 'metas', entrada: { parte: true, nombre: 'Búsqueda de trabajo', cubre: (r) => r.param === 'trabajo', Componente: lazy(() => import('./BusquedaV2')) } },
  { pantalla: 'metas', entrada: { parte: true, nombre: 'Idiomas', cubre: (r) => r.param === 'ingles', Componente: lazy(() => import('./InglesV2')) } },
  { pantalla: 'metas', entrada: { parte: true, nombre: 'Handyx', cubre: (r) => r.param === 'handyx', Componente: lazy(() => import('./HandyxV2')) } },
  { pantalla: 'metas', entrada: { parte: true, nombre: 'Búsqueda intensiva', cubre: (r) => r.param === 'sprint', Componente: lazy(() => import('./SprintV2')) } },
  { pantalla: 'metas', entrada: { parte: true, nombre: 'Impacto', cubre: (r) => r.param === 'impacto', Componente: lazy(() => import('./ImpactoV2')) } },
  { pantalla: 'metas', entrada: { parte: true, nombre: 'Calibración', cubre: (r) => r.param === 'calibracion', Componente: lazy(() => import('./CalibracionV2')) } },
  { pantalla: 'metas', entrada: { parte: true, nombre: 'Diferencia', cubre: (r) => r.param === 'diferencia', Componente: lazy(() => import('./DiferenciaV2')) } },
  { pantalla: 'metas', entrada: { parte: true, nombre: 'Revisión semanal', cubre: (r) => r.param === 'revision', Componente: lazy(() => import('./RevisionV2')) } },
  { pantalla: 'metas', entrada: { parte: true, nombre: 'Compras y trámites', cubre: (r) => r.param === 'compras', Componente: lazy(() => import('./ComprasV2')) } },
  // El proyecto en curso (sin id) y P0, Constelación v1: la única página de bloque que la tanda 2.4 dejó en 1.0 a propósito.
  { pantalla: 'metas', entrada: { parte: true, nombre: 'Proyecto en curso y P0', cubre: (r) => r.param === 'proyecto' || r.param === 'proyecto/P0', Componente: lazy(() => import('./ProyectoCursoV2')) } },
];
