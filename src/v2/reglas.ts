/**
 * Trazo 2.0 · las reglas del lenguaje que se pueden medir o reusar: el presupuesto de palabras de cada pantalla, cómo se dice
 * cada estado (ícono + palabra + tono, nunca solo color) y el glosario de la jerga. El detalle está en docs/ux/lenguaje-2.0.md.
 */
import type { EstadoPeriodo } from '../data/periodos';

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

/**
 * El tono de un estado decide su forma: `neutro` es una píldora de contorno, `atencion` una píldora llena del color del texto
 * (sin tinte) y `critico` la única que usa el rojo. `hecho` lleva el trazo de la marca.
 */
export type TonoEstado = 'neutro' | 'atencion' | 'critico' | 'hecho';

export interface EstadoVisual { palabra: string; icono: string; tono: TonoEstado }

export const ESTADOS: Record<EstadoPeriodo, EstadoVisual> = {
  proximo: { palabra: 'Próximo', icono: 'reloj', tono: 'neutro' },
  'en-plan': { palabra: 'En plan', icono: 'ritmo', tono: 'neutro' },
  adelantado: { palabra: 'Adelantado', icono: 'adelante', tono: 'neutro' },
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
