/**
 * Trazo 2.0 · las rutas de la familia «ajustes» (tanda 3.3). Cada entrada dice a qué pantalla de la 1.0 reemplaza y, con `cubre`,
 * qué parte de sus rutas (`#/estudio/idiomas`, `#/metas/semana`…). Se suman a la entrada principal de esa pantalla en `src/v2/extras.ts`.
 */
import { lazy } from 'react';
import type { EntradaExtra } from '../registro';

export const ENTRADAS: EntradaExtra[] = [
  // { pantalla: 'estudio', entrada: { nombre: 'Idiomas', cubre: (r) => r.param === 'idiomas' || !!r.param?.startsWith('idiomas/'), Componente: lazy(() => import('./IdiomasV2')) } },
];
void lazy;
