/**
 * Trazo 2.0 · las rutas de la familia «temas» (tanda 3.3). Cada entrada dice a qué pantalla de la 1.0 reemplaza y, con `cubre`,
 * qué parte de sus rutas (`#/estudio/ruta/…`, `#/flojo/examenes`…). Se suman a la entrada principal de esa pantalla en `src/v2/extras.ts`.
 */
import { lazy } from 'react';
import type { EntradaExtra } from '../registro';

/** Los temas de #/flojo/<tema>: todo lo que no es el centro, el recall, el análisis, los exámenes ni el simulacro. */
const ES_TEMA = ['recall', 'analisis', 'examenes', 'simulacro'];

export const ENTRADAS: EntradaExtra[] = [
  // #/estudio/ruta, #/estudio/ruta/<roadmap> y #/estudio/ruta/<roadmap>/<fase>.
  { pantalla: 'estudio', entrada: { nombre: 'Roadmaps de estudio', cubre: (r) => /^ruta/.test(r.param ?? ''), Componente: lazy(() => import('./RutaV2')) } },
  // #/estudio/mate/<tramo> y #/estudio/mate/libro/<id>/<n>: el centro y cada libro ya los cubre la entrada principal de Estudio.
  { pantalla: 'estudio', entrada: { nombre: 'Tramos y capítulos de Matemática', cubre: (r) => /^mate\//.test(r.param ?? ''), Componente: lazy(() => import('./MateExtraV2')) } },
  { pantalla: 'flojo', entrada: { nombre: 'Exámenes', cubre: (r) => r.param === 'examenes', Componente: lazy(() => import('./ExamenesV2')) } },
  { pantalla: 'flojo', entrada: { nombre: 'Simulacro', cubre: (r) => r.param === 'simulacro', Componente: lazy(() => import('./SimulacroV2')) } },
  { pantalla: 'flojo', entrada: { nombre: 'Un tema flojo', cubre: (r) => !!r.param && !ES_TEMA.includes(r.param), Componente: lazy(() => import('./TemaV2')) } },
];
