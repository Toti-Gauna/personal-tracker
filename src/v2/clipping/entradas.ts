/**
 * Trazo 2.0 · las rutas de la familia «clipping» (tanda 3.3): el Clipping de Metas (`#/metas/clipping` y `#/metas/clipping/<sub>`).
 * Cada sección es su propia entrada (y su propio trozo que se baja recién al visitarla); la última, el centro, también recoge cualquier
 * sub-ruta que no exista, como hacía la 1.0 (cae al resumen). Se suman a la entrada principal de `metas` en `src/v2/extras.ts`.
 */
import { lazy } from 'react';
import type { EntradaExtra } from '../registro';
import { cubreClipping } from './datos';

const seccion = (id: string, nombre: string, Componente: EntradaExtra['entrada']['Componente']): EntradaExtra => ({
  pantalla: 'metas',
  entrada: { nombre: `Clipping · ${nombre}`, parte: true, cubre: (r) => r.param === `clipping/${id}`, Componente },
});

const guia = <K extends 'PlanClip' | 'NichosClip' | 'RiesgosClip' | 'Semana1Clip'>(k: K) => lazy(() => import('./Guia').then((m) => ({ default: m[k] })));

export const ENTRADAS: EntradaExtra[] = [
  seccion('registro', 'Registro', lazy(() => import('./RegistroV2'))),
  seccion('campanas', 'Campañas', lazy(() => import('./CampanasV2'))),
  seccion('cuentas', 'Cuentas', lazy(() => import('./CuentasV2'))),
  seccion('retainers', 'Retainers', lazy(() => import('./RetainersV2'))),
  seccion('metricas', 'Métricas', lazy(() => import('./MetricasV2'))),
  seccion('plan', 'Plan', guia('PlanClip')),
  seccion('nichos', 'Nichos y derechos', guia('NichosClip')),
  seccion('riesgos', 'Riesgos y rutina', guia('RiesgosClip')),
  seccion('semana1', 'Semana 1', guia('Semana1Clip')),
  // El centro: #/metas/clipping y todo lo que cuelgue de él que no sea una sección (la 1.0 lo llevaba al resumen).
  { pantalla: 'metas', entrada: { nombre: 'Clipping', cubre: cubreClipping, Componente: lazy(() => import('./ClippingV2')) } },
];
