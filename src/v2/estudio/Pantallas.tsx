/**
 * Trazo 2.0 · las pantallas de Estudio que tienen su propia ruta (repaso, puntos débiles, tarjetas y cómo funciona), cada una
 * con la forma que pide el registro: reciben la ruta, el día y la fecha de hoy.
 */
import { lazy, Suspense } from 'react';
import type { PropsV2 } from '../registro';
import { ComoV2 } from './Como';
import { FlojoV2, RepasoV2 } from './Repasar';
import { TarjetasV2 } from './Tarjetas';

const Analisis = lazy(() => import('./Analisis').then((m) => ({ default: m.AnalisisFlojo })));

export const Repaso = ({ day, today }: PropsV2) => <RepasoV2 day={day} hoy={today} />;
export const Flojo = ({ ruta, day, today }: PropsV2) => (ruta.param === 'analisis'
  ? <Suspense fallback={null}><Analisis day={day} /></Suspense>
  : <FlojoV2 day={day} hoy={today} filtro={ruta.param} />);
export const Tarjetas = ({ ruta, day }: PropsV2) => <TarjetasV2 key={ruta.param ?? 'todas'} day={day} param={ruta.param} />;
export const Como = () => <ComoV2 />;
