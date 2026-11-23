/**
 * Trazo 2.0 · las rutas de la familia «sesiones» (tanda 3.3): la sesión de estudio, el test, la tesis, el cold recall, las unidades, la
 * actividad, la tarjeta nueva y el motor de repaso. Cada una reemplaza a la pantalla entera de la 1.0 (sin `cubre`), y se carga recién
 * al visitarla.
 */
import { lazy } from 'react';
import type { EntradaExtra } from '../registro';

export const ENTRADAS: EntradaExtra[] = [
  { pantalla: 'sesion', entrada: { nombre: 'Sesión de estudio', Componente: lazy(() => import('./SesionEstudioV2')) } },
  { pantalla: 'test', entrada: { nombre: 'Test', Componente: lazy(() => import('./TestV2')) } },
  { pantalla: 'tesis', entrada: { nombre: 'Tesis', Componente: lazy(() => import('./TesisV2')) } },
  { pantalla: 'recall', entrada: { nombre: 'Cold recall', Componente: lazy(() => import('./RecallV2')) } },
  { pantalla: 'unidades', entrada: { nombre: 'Unidades y tests', Componente: lazy(() => import('./UnidadesV2')) } },
  { pantalla: 'actividad', entrada: { nombre: 'Actividad de estudio', Componente: lazy(() => import('./ActividadV2')) } },
  { pantalla: 'tarjeta-nueva', entrada: { nombre: 'Nueva tarjeta', Componente: lazy(() => import('./TarjetaNuevaV2')) } },
  { pantalla: 'motor', entrada: { nombre: 'Motor de repaso', Componente: lazy(() => import('./MotorEstudioV2')) } },
];
