/**
 * Trazo 2.0 · las reglas del lenguaje que se pueden medir o reusar: el presupuesto de palabras de cada pantalla, cómo se dice
 * cada estado (ícono + palabra + tono, nunca solo color) y el glosario de la jerga. El detalle está en docs/ux/lenguaje-2.0.md.
 */
import type { EstadoPeriodo } from '../data/periodos';
import type { NombreIcono } from './iconos';

/** Topes por pantalla 2.0. El script de la tanda 1.8 los controla en cada PR. */
export const PRESUPUESTO = {
  /** Palabras del título. */
  titulo: 3,
  /** Palabras de la línea bajo el título (o ninguna). */
  intro: 12,
  /** Palabras visibles antes de desplazar. */
  pliegue: 60,
  /** Palabras de un botón. */
  boton: 3,
  /** Alto máximo, en pantallas de teléfono. */
  pantallas: 4,
} as const;

export const contarPalabras = (texto: string) => texto.trim().split(/\s+/).filter(Boolean).length;

/** "1 día", "3 días": el número con su palabra, en singular cuando es uno (regla 4: ningún "1 días"). */
export const cuantos = (n: number, uno: string, varios: string) => `${String(n).replace('.', ',')} ${n === 1 ? uno : varios}`;

/**
 * Un número escrito a mano, en español o como viene de una página en inglés. Vacío o ilegible = sin dato; nunca negativo.
 * - Con coma y punto, el último es el de los decimales: "1.234,5" y "1,234.5" son 1234,5.
 * - Solo coma: decimales ("1,09"), salvo grupos de tres en serie ("1,234,567").
 * - Solo punto: miles si separa grupos de tres ("12.000", "1.500"), si no decimales ("1.09", "0.125", "12.50").
 */
export function numeroEscrito(s: string): number | undefined {
  const t = s.trim().replace(/[\s$€]/g, '').replace(/^USD/i, '');
  if (t === '') return undefined;
  const coma = t.lastIndexOf(',');
  const punto = t.lastIndexOf('.');
  let limpio = t;
  if (coma >= 0 && punto >= 0) limpio = coma > punto ? t.replace(/\./g, '').replace(',', '.') : t.replace(/,/g, '');
  else if (coma >= 0) limpio = /^\d{1,3}(,\d{3}){2,}$/.test(t) ? t.replace(/,/g, '') : t.replace(',', '.');
  else if (/^[1-9]\d{0,2}(\.\d{3})+$/.test(t)) limpio = t.replace(/\./g, '');
  const n = Number(limpio);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

/**
 * El tono de un estado decide su forma: `neutro` es una píldora de contorno, `atencion` una píldora llena del color del texto
 * (sin tinte) y `critico` la única que usa el rojo. `hecho` lleva el trazo de la marca.
 */
/** Un texto sin acentos, mayúsculas ni signos: para comparar lo que se ve con lo que se anuncia. */
export const textoPlano = (t: string) => t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9ñ]+/g, ' ').trim();

/**
 * El nombre accesible de algo que muestra un rótulo corto: empieza con ese rótulo cuando el nombre no lo contiene ya
 * ("P2, VitalIA, …"). Quien usa la voz dice lo que ve (WCAG 2.5.3, la etiqueta dentro del nombre).
 */
export const nombreConRotulo = (rotulo: string, nombre: string) =>
  rotulo && !textoPlano(nombre).includes(textoPlano(rotulo)) ? `${rotulo}, ${nombre}` : nombre;

export type TonoEstado = 'neutro' | 'atencion' | 'critico' | 'hecho';

export interface EstadoVisual { palabra: string; icono: NombreIcono; tono: TonoEstado }

export const ESTADOS: Record<EstadoPeriodo, EstadoVisual> = {
  proximo: { palabra: 'Próximo', icono: 'reloj', tono: 'neutro' },
  'en-plan': { palabra: 'En plan', icono: 'ritmo', tono: 'neutro' },
  adelantado: { palabra: 'Adelantado', icono: 'adelantado', tono: 'neutro' },
  pausado: { palabra: 'En pausa', icono: 'pausa', tono: 'neutro' },
  atrasado: { palabra: 'Atrasado', icono: 'atencion', tono: 'atencion' },
  vencido: { palabra: 'Vencido', icono: 'alerta', tono: 'critico' },
  hecho: { palabra: 'Hecho', icono: 'tilde', tono: 'hecho' },
};

/** Cómo se dice en la 2.0 lo que en la 1.0 era jerga. `explica` es lo que muestra la ⓘ. */
export const GLOSARIO: { antes: string; ahora: string; explica: string }[] = [
  { antes: 'T+18 1/52', ahora: 'Semana 1 de 52', explica: 'El plan dura 18 meses desde el día que arrancaste. Esto es por dónde vas.' },
  { antes: 'Día 00', ahora: 'Día 1', explica: 'Los días se cuentan desde el primero que registraste.' },
  { antes: '0 seguidas', ahora: 'Racha: 0', explica: 'Cuántas veces seguidas cumpliste este hábito sin saltearte una.' },
  { antes: '+0,00 %', ahora: 'Mejora: +0,00 %', explica: 'Cada meta cumplida suma. Si sostenés 1 % por día, en un año sos 38 veces mejor.' },
  { antes: '0/3', ahora: '0 de 3 pasos', explica: 'Los pasos chicos dentro de una meta.' },
  { antes: 'tiempo / trabajo', ahora: 'Ritmo', explica: 'Compara cuánto tiempo pasó con cuánto trabajo está hecho. Si el trabajo va atrás del tiempo, vas atrasado.' },
  { antes: 'Lote', ahora: 'Lote', explica: 'Un pedazo de una versión que se termina en uno o dos días.' },
  { antes: 'Imán', ahora: 'Imán', explica: 'Los 8 puntos que un lanzamiento necesita para atraer gente: gancho, demo, métrica, posts.' },
  { antes: 'De fondo', ahora: 'De fondo', explica: 'Lo que avanza mientras hacés lo principal: apps secundarias y showcases. No usa tus horas de foco.' },
  { antes: 'Absorbe', ahora: 'Colchón', explica: 'Un bloque que se achica para absorber un atraso sin mover la fecha final.' },
  { antes: 'fuerza 0 a 100', ahora: 'Qué tan firme: 0 a 100', explica: 'Qué tan bien recordás un tema según tus repasos, tarjetas y tests.' },
  { antes: 'Cold recall', ahora: 'Recordar en frío', explica: 'Escribir lo que te acordás de un capítulo sin mirarlo, antes del test.' },
];
