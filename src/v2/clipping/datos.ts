/**
 * Trazo 2.0 · lo que comparte el Clipping: cómo se escriben las fechas y los dólares, qué calcula el tablero (el mismo cálculo
 * que la 1.0, sin importar nada de sus componentes), las secciones y cómo se leen los números que se escriben a mano.
 */
import { useMemo, useState } from 'react';
import { faseDe, finMes, inicioMes, mesDe, mesPlan, MESES_CLIP } from '../../data/clipping';
import { compuerta, mesContraMeta, planContraReal, proyeccion, semanas, cuentasActivas, filas, totales } from '../../data/clipping-metricas';
import type { ClippingState } from '../../data/clipping-state';
import { addDays } from '../../data/time';
import { useStore } from '../../state/store';
import type { Ruta } from '../../lib/routes';
import { numeroEscrito } from '../reglas';

const MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
/** "19 nov" */
export const fc = (d: string) => `${Number(d.slice(8))} ${MES[Number(d.slice(5, 7)) - 1]}`;
/** "19 nov 26" */
export const fcA = (d: string) => `${fc(d)} ${d.slice(2, 4)}`;
/** "USD 1.234" */
export const usd = (v: number) => `USD ${Math.round(v).toLocaleString('es-AR')}`;
/** "0,92" (o "—" sin dato): el pago por 1.000 views. */
export const usd2 = (v: number | null) => (v == null ? '—' : v.toFixed(2).replace('.', ','));
export const pc = (v: number | null) => (v == null ? '—' : `${Math.round(v * 100)} %`);
/** "1,2k" para los números de un gráfico angosto. */
export const corto = (v: number) => (v >= 1000 ? `${(v / 1000).toFixed(v >= 10000 ? 0 : 1).replace('.', ',').replace(/,0$/, '')}k` : String(Math.round(v)));
export const n1 = (v: number) => String(v).replace('.', ',');

/** Las secciones del Clipping, en el orden de la 1.0. "Semana 1" se oculta sola después del mes 1. */
export const SUBS = [
  ['registro', 'Registro'], ['campanas', 'Campañas'], ['cuentas', 'Cuentas'], ['retainers', 'Retainers'], ['metricas', 'Métricas'],
  ['plan', 'Plan'], ['nichos', 'Nichos y derechos'], ['riesgos', 'Riesgos y rutina'], ['semana1', 'Semana 1'],
] as const;
export type SubClip = (typeof SUBS)[number][0];
export const subsVisibles = (date: string) => SUBS.filter(([id]) => id !== 'semana1' || mesDe(date) <= 1);

/** Las rutas del Clipping: `#/metas/clipping` y `#/metas/clipping/<sub>`. */
export const cubreClipping = (r: Ruta) => r.param === 'clipping' || !!r.param?.startsWith('clipping/');
export const subDe = (r: Ruta) => (r.param?.startsWith('clipping/') ? r.param.slice('clipping/'.length) : '');

/** El mes del roadmap en palabras para el rótulo: "Mes 1 de 12". */
export function rotuloMes(n: number) {
  return n < 1 ? 'Arranca el 16 nov 2026' : n > MESES_CLIP ? 'Año cerrado' : `Mes ${n} de ${MESES_CLIP}`;
}

/** Lo que calcula el tablero, una vez por cambio de planilla, días o fecha. */
export function useClip(date: string) {
  const clip = useStore((s) => s.clipping);
  const days = useStore((s) => s.days);
  return useMemo(() => {
    const n = mesDe(date);
    const nPlan = Math.min(Math.max(n, 1), MESES_CLIP);
    return {
      clip, days, n, nPlan, mes: mesPlan(nPlan)!, fase: faseDe(nPlan)!,
      vsMeta: mesContraMeta(clip, date), vsPlan: planContraReal(clip, date), proy: proyeccion(clip, date),
      puerta: compuerta(clip, date), sem: semanas(clip, days, date, 8), vacio: !clip.registro.length && !clip.campanas.length && !clip.cuentas.length,
    };
  }, [clip, days, date]);
}

/** Los 12 meses del roadmap: cuentas activas reales (null los que no llegaron). */
export function cuentasPorMes(clip: ClippingState, date: string, n: number): (number | null)[] {
  return Array.from({ length: MESES_CLIP }, (_, i) => { const k = i + 1; return k > n ? null : cuentasActivas(clip, k === n ? date : finMes(k)); });
}

/** Los 12 meses del roadmap: clips por día reales (null los que no llegaron). */
export function clipsDiaPorMes(clip: ClippingState, date: string, n: number): (number | null)[] {
  return Array.from({ length: MESES_CLIP }, (_, i) => {
    const k = i + 1;
    if (k > n) return null;
    const hasta = k === n ? date : finMes(k);
    const desde = addDays(finMes(k - 1), 1);
    const dias = Math.round((Date.parse(hasta) - Date.parse(desde)) / 864e5) + 1;
    return Math.round((totales(filas(clip, { desde, hasta })).clips / dias) * 10) / 10;
  });
}

export { inicioMes, finMes };

// ——— Números escritos a mano ———

/** Un entero con o sin puntos de miles ("12.000" → 12000). Vacío = sin dato. */
export function entero(s: string): number | undefined {
  const t = s.replace(/[^\d]/g, '');
  return t === '' ? undefined : Number(t);
}

/** Un decimal escrito a mano (ver `numeroEscrito`): "1.234,5", "12.50", "1,09", "$1,234.56". */
export const decimal = (s: string) => numeroEscrito(s);

/** Cómo se muestra un número guardado dentro de un campo de texto. */
export const aTexto = (v?: number) => (v == null ? '' : String(v).replace('.', ','));
export const soloNumero = (s: string) => s.replace(/[^\d.,]/g, '');

// ——— La hoja de un elemento ———

/**
 * El estado de una hoja que edita un elemento (una cuenta, una campaña, un retainer o una fila): cuál se abre (ninguno = uno nuevo) y
 * una clave nueva en cada apertura, para que el formulario empiece de cero aunque la hoja todavía se esté yendo.
 */
export function useHojaDe<T>() {
  const [s, setS] = useState<{ clave: number; abierta: boolean; item?: T }>({ clave: 0, abierta: false });
  return {
    abierta: s.abierta, item: s.item, clave: s.clave,
    abrir: (item?: T) => setS((x) => ({ clave: x.clave + 1, abierta: true, item })),
    cerrar: () => setS((x) => ({ ...x, abierta: false })),
  };
}
