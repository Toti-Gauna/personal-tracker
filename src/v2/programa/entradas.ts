/**
 * Trazo 2.0 · las rutas de la familia «programa» (tanda 3.3). Cada entrada dice a qué pantalla de la 1.0 reemplaza y, con `cubre`,
 * qué parte de sus rutas (`#/estudio/idiomas`, `#/metas/semana`…). Se suman a la entrada principal de esa pantalla en `src/v2/extras.ts`.
 */
import { lazy } from 'react';
import type { EntradaExtra } from '../registro';

export const ENTRADAS: EntradaExtra[] = [
  { pantalla: 'estudio', entrada: { nombre: 'Idiomas', cubre: (r) => r.param === 'idiomas' || !!r.param?.startsWith('idiomas/'), Componente: lazy(() => import('./IdiomasV2')) } },
  { pantalla: 'estudio', entrada: { nombre: 'Demanda', cubre: (r) => r.param === 'prog/demanda', Componente: lazy(() => import('./DemandaV2')) } },
  { pantalla: 'estudio', entrada: { nombre: 'Algoritmos', cubre: (r) => r.param === 'prog/algoritmos', Componente: lazy(() => import('./AlgoritmosV2')) } },
  { pantalla: 'estudio', entrada: { nombre: 'Programación', cubre: (r) => r.param === 'prog' || !!r.param?.startsWith('prog/'), Componente: lazy(() => import('./ProgV2')) } },
  { pantalla: 'estudio', entrada: { nombre: 'Libro', cubre: (r) => !!r.param?.startsWith('libro/'), Componente: lazy(() => import('./LibroV2')) } },
];
