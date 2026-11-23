/**
 * Trazo 2.0 · lo que comparten las pantallas de la familia «trabajo»: cómo se escriben las fechas y los números, los colores de
 * área de cada rama (los de la 2.0, no los de la 1.0) y el T0 del plan.
 */
import { T0_PLAN } from '../../data/plan';
import { useStore } from '../../state/store';

export const MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
/** "23 nov". */
export const dm = (d: string) => `${Number(d.slice(8))} ${MES[Number(d.slice(5, 7)) - 1]}`;
/** "5 ene 2027". */
export const dma = (d: string) => `${dm(d)} ${d.slice(0, 4)}`;
/** "23 nov" si es del año de `hoy`; si no, con el año ("5 ene 2027"). */
export const fh = (d: string, hoy: string) => (d.slice(0, 4) === hoy.slice(0, 4) ? dm(d) : dma(d));
/** Con coma decimal y un decimal como mucho ("6.482,5"). */
export const n1 = (x: number) => (Math.round(x * 10) / 10).toLocaleString('es-AR', { maximumFractionDigits: 1 });
/** Un factor, con dos decimales ("0,85", "1,00"). */
export const f2 = (x: number) => x.toFixed(2).replace('.', ',');
export const miles = (n: number) => n.toLocaleString('es-AR');
/** "+3 d", "−2 d" o "en fecha": cuánto se corre algo, con signo. */
export const diasTxt = (d: number) => (d === 0 ? 'en fecha' : `${d > 0 ? '+' : '−'}${Math.abs(d)} d`);

/** El color de área de cada rama del plan, en los tokens de la 2.0. */
export const AREA = {
  programacion: 'var(--a-ing)',
  matematica: 'var(--a-economia)',
  trabajo: 'var(--a-rutina)',
  ingles: 'var(--a-idi)',
  handyx: 'var(--a-handyx)',
  salud: 'var(--a-salud)',
  eclipse: 'var(--a-eclipse)',
} as const;

/** El T0 del plan: el que se eligió en Ajustes o el de fábrica. */
export const useT0 = () => useStore((s) => s.settings?.startDate) ?? T0_PLAN;
