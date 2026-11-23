/**
 * Trazo 2.0 · las rutas de la familia «metas» (tanda 3.3). Cada entrada dice a qué pantalla de la 1.0 reemplaza y, con `cubre`,
 * qué parte de sus rutas (`#/estudio/idiomas`, `#/metas/semana`…). Se suman a la entrada principal de esa pantalla en `src/v2/extras.ts`.
 *
 * Metas por horizonte (ruta, semana, mes, bimestre, año), una meta nueva, el mapa por ramas, las etapas, la evolución y el plan
 * entero. `proyecto/P0` y el resto de #/metas/… son de otras familias.
 */
import { lazy } from 'react';
import type { EntradaExtra } from '../registro';

export const ENTRADAS: EntradaExtra[] = [
  { pantalla: 'metas', entrada: { nombre: 'Ruta', parte: true, cubre: (r) => r.param === 'ruta', Componente: lazy(() => import('./RutaV2')) } },
  { pantalla: 'metas', entrada: { nombre: 'Metas de la semana', parte: true, cubre: (r) => r.param === 'semana', Componente: lazy(() => import('./SemanaV2')) } },
  { pantalla: 'metas', entrada: { nombre: 'Metas del mes', parte: true, cubre: (r) => r.param === 'mes', Componente: lazy(() => import('./MesV2')) } },
  { pantalla: 'metas', entrada: { nombre: 'Metas del bimestre', parte: true, cubre: (r) => r.param === 'bimestre' || /^bimestre\/\d+$/.test(r.param ?? ''), Componente: lazy(() => import('./BimestreV2')) } },
  { pantalla: 'metas', entrada: { nombre: 'Metas del año', parte: true, cubre: (r) => r.param === 'anio', Componente: lazy(() => import('./AnioV2')) } },
  { pantalla: 'metas', entrada: { nombre: 'Mapa por ramas', parte: true, cubre: (r) => r.param === 'mapa', Componente: lazy(() => import('./MapaV2')) } },
  { pantalla: 'metas', entrada: { nombre: 'Etapas', parte: true, cubre: (r) => r.param === 'etapas', Componente: lazy(() => import('./EtapasV2')) } },
  { pantalla: 'metas', entrada: { nombre: 'Evolución', parte: true, cubre: (r) => r.param === 'evolucion', Componente: lazy(() => import('./EvolucionV2')) } },
  { pantalla: 'metas', entrada: { nombre: 'El plan entero', parte: true, cubre: (r) => r.param === 'roadmap', Componente: lazy(() => import('./RoadmapV2')) } },
  { pantalla: 'meta-nueva', entrada: { nombre: 'Meta nueva', parte: true, Componente: lazy(() => import('./NuevaMetaV2')) } },
];
