/**
 * Trazo 2.0 · las rutas de la familia «ajustes» (tanda 3.3). Cada entrada dice a qué pantalla de la 1.0 reemplaza y, con `cubre`,
 * qué parte de sus rutas (`#/estudio/idiomas`, `#/metas/semana`…). Se suman a la entrada principal de esa pantalla en `src/v2/extras.ts`.
 * Acá se convierten enteras: las rutinas del día (con sus subrutas), la compañera, la copia de seguridad, los sonidos, la semana de
 * entreno y la edición de una rutina, y las herramientas de Hoy (elegir foco, foco, pomodoros, JSON del día e importar).
 */
import { lazy } from 'react';
import type { EntradaExtra } from '../registro';

export const ENTRADAS: EntradaExtra[] = [
  { pantalla: 'ajustes-rutinas', entrada: { nombre: 'Rutinas del día', parte: true, Componente: lazy(() => import('./RutinasV2')) } },
  { pantalla: 'ajustes-companera', entrada: { nombre: 'Compañera de entreno', parte: true, Componente: lazy(() => import('./CompaneraV2')) } },
  { pantalla: 'ajustes-datos', entrada: { nombre: 'Copia de seguridad', parte: true, Componente: lazy(() => import('./DatosV2')) } },
  { pantalla: 'sonidos', entrada: { nombre: 'Sonidos y alarmas', parte: true, Componente: lazy(() => import('./SonidosV2')) } },
  { pantalla: 'entreno-semana', entrada: { nombre: 'Semana de entreno', parte: true, Componente: lazy(() => import('./SemanaV2')) } },
  { pantalla: 'entreno-rutina', entrada: { nombre: 'Editar rutina', parte: true, Componente: lazy(() => import('./RutinaV2')) } },
  { pantalla: 'elegir', entrada: { nombre: 'Elegir foco', parte: true, Componente: lazy(() => import('./ElegirV2')) } },
  { pantalla: 'foco', entrada: { nombre: 'Foco', parte: true, Componente: lazy(() => import('./FocoV2')) } },
  { pantalla: 'pomodoros', entrada: { nombre: 'Pomodoros', parte: true, Componente: lazy(() => import('./PomodorosV2')) } },
  { pantalla: 'json', entrada: { nombre: 'JSON del día', parte: true, Componente: lazy(() => import('./JsonV2')) } },
  { pantalla: 'importar', entrada: { nombre: 'Importar', parte: true, Componente: lazy(() => import('./ImportarV2')) } },
];
