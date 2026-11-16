import raw from '../../data/clipping.json';
import { addDays } from './time';

/**
 * Ola 23 · Clipping: el Roadmap Clipper de 12 meses (de 0 a USD 10k/mes), del 16 nov 2026.
 * Trazo es la planilla y el tablero: no publica ni entra a ninguna plataforma. Los datos de
 * plataformas y tarifas son del texto (sin verificar). El mes n arranca el 16, como el plan extendido.
 */

export interface MesClipping {
  n: number;
  meta: number;
  cuentas: number;
  clipsDia: number;
  titulo: string;
  foco: string;
  tareas: string[];
  metrica?: string;
}
export interface FaseClipping { n: number; nombre: string; meses: [number, number]; objetivo: string; criterios: string[]; siNo: string }
export type TipoHitoClip = 'commit' | 'grande';
export interface HitoClipping { id: string; texto: string; tipo: TipoHitoClip; fecha?: string; mes?: number; fin?: boolean }
export type RiesgoNicho = 'bajo' | 'medio' | 'alto';

export interface ClippingFile {
  version: number;
  t0: string;
  titulo: string;
  metaFinal: number;
  datosA: string;
  resumen: string;
  cobro: string;
  expectativas: string[];
  umbrales: { pagoFase2: number; pct1000Fase2: number; pagoMes6: number; concentracionMax: number; viewsPorClipObjetivo: number; viewsMesObjetivo: number };
  fases: FaseClipping[];
  meses: MesClipping[];
  hitos: HitoClipping[];
  plataformas: { nombre: string; tarifa: string; nota: string }[];
  nichos: { nombre: string; fuente: string; riesgo: RiesgoNicho; como: string }[];
  derechos: string;
  reglasCuentas: string[];
  riesgos: { riesgo: string; planB: string }[];
  rutina: { id: string; dias: number[]; titulo: string; texto: string }[];
  semana1: { desde: string; hasta: string; texto: string }[];
  gta6: string;
  stack: string[];
  reglaDeOro: string;
  fuentes: string[];
}

const FECHA = /^\d{4}-\d{2}-\d{2}$/;

/** Valida el plan de clipping; devuelve los errores (vacío si está bien). */
export function validarClipping(f: ClippingFile): string[] {
  const e: string[] = [];
  if (f.version !== 1) e.push('"version" tiene que ser 1');
  if (!FECHA.test(f.t0) || f.t0.slice(8) !== '16') e.push('"t0" tiene que ser AAAA-MM-16');
  if (f.meses.length !== 12) e.push('tienen que ser 12 meses');
  f.meses.forEach((m, i) => {
    if (m.n !== i + 1) e.push(`mes ${i + 1}: los meses van en orden desde 1`);
    if (!(m.meta > 0)) e.push(`mes ${m.n}: la meta tiene que ser mayor a 0`);
    if (i && m.meta < f.meses[i - 1].meta) e.push(`mes ${m.n}: la meta no puede bajar`);
    if (i && m.cuentas < f.meses[i - 1].cuentas) e.push(`mes ${m.n}: las cuentas no pueden bajar`);
    if (!(Number.isInteger(m.clipsDia) && m.clipsDia > 0)) e.push(`mes ${m.n}: "clipsDia" tiene que ser un entero mayor a 0`);
    if (!m.tareas?.length) e.push(`mes ${m.n}: faltan las tareas`);
  });
  let esperado = 1;
  for (const fa of f.fases) {
    if (fa.meses[0] !== esperado || fa.meses[1] < fa.meses[0]) e.push(`fase ${fa.n}: los meses no siguen a la fase anterior`);
    if (!fa.criterios.length) e.push(`fase ${fa.n}: faltan los criterios de paso`);
    esperado = fa.meses[1] + 1;
  }
  if (esperado !== 13) e.push('las fases tienen que cubrir los 12 meses');
  const ids = new Set<string>();
  for (const h of f.hitos) {
    if (ids.has(h.id)) e.push(`hito repetido: ${h.id}`);
    ids.add(h.id);
    if (!h.fecha && !h.mes) e.push(`hito ${h.id}: falta "fecha" o "mes"`);
    if (h.fecha && !FECHA.test(h.fecha)) e.push(`hito ${h.id}: "fecha" tiene que ser AAAA-MM-DD`);
    if (h.mes && (h.mes < 1 || h.mes > 12)) e.push(`hito ${h.id}: "mes" va de 1 a 12`);
  }
  const u = f.umbrales;
  if (!(u.pagoMes6 < u.pagoFase2)) e.push('el piso del mes 6 tiene que ser menor que el de la fase 2');
  if (!(u.concentracionMax > 0 && u.concentracionMax < 1)) e.push('"concentracionMax" va entre 0 y 1');
  for (const n of f.nichos) if (!['bajo', 'medio', 'alto'].includes(n.riesgo)) e.push(`nicho ${n.nombre}: riesgo bajo, medio o alto`);
  for (const s of f.semana1) if (!FECHA.test(s.desde) || !FECHA.test(s.hasta) || s.hasta < s.desde) e.push(`semana 1: fechas inválidas (${s.desde})`);
  return e;
}

export const CLIP = raw as ClippingFile;
{
  const errs = validarClipping(CLIP);
  if (errs.length) throw new Error(`data/clipping.json: ${errs.join('; ')}`);
}

export const MESES_CLIP = 12;
export const COLOR_CLIP = 'var(--eclipse)';

/** Suma n meses a una fecha AAAA-MM-DD (el día queda igual; el plan usa siempre el 16). */
export function sumarMeses(d: string, n: number): string {
  const y = Number(d.slice(0, 4));
  const m = Number(d.slice(5, 7)) - 1 + n;
  const yy = y + Math.floor(m / 12);
  const mm = ((m % 12) + 12) % 12;
  return `${yy}-${String(mm + 1).padStart(2, '0')}-${d.slice(8)}`;
}

/** Primer día del mes n del roadmap (mes 1: 16 nov 2026). */
export const inicioMes = (n: number, t0 = CLIP.t0) => sumarMeses(t0, n - 1);
/** Último día del mes n (el 15 del mes siguiente). */
export const finMes = (n: number, t0 = CLIP.t0) => addDays(inicioMes(n + 1, t0), -1);

/** Mes del roadmap de una fecha: 0 antes de empezar, 13 o más después del año. */
export function mesDe(date: string, t0 = CLIP.t0): number {
  if (date < t0) return 0;
  let n = 1;
  while (date > finMes(n, t0)) n++;
  return n;
}

/** El mes del plan (1 a 12) o null fuera del año. */
export const mesPlan = (n: number): MesClipping | null => CLIP.meses[n - 1] ?? null;

export const faseDe = (n: number): FaseClipping | null => CLIP.fases.find((f) => n >= f.meses[0] && n <= f.meses[1]) ?? null;

/** Fecha de un hito: la propia, o el inicio (o el fin) de su mes. Los de "inicio" caen a la semana 2. */
export const fechaHitoClip = (h: HitoClipping, t0 = CLIP.t0) => h.fecha ?? (h.fin ? finMes(h.mes!, t0) : addDays(inicioMes(h.mes!, t0), 14));

export type Escenario = 'base' | 'optimista' | 'conservador';
export const ESCENARIOS: Escenario[] = ['base', 'optimista', 'conservador'];
export const NOMBRE_ESCENARIO: Record<Escenario, string> = { base: 'Base', optimista: 'Optimista', conservador: 'Conservador' };

/**
 * Curva de un escenario para el mes n (puede pasar de 12: extrapola con el último escalón).
 * Base = las metas del texto. Optimista = hasta 1,5 veces el base hacia el mes 10 (crece desde el mes 3).
 * Conservador = 60 % del base desde el mes 3. Son supuestos: se ajustan con la planilla real.
 */
export function curva(esc: Escenario, n: number): number {
  const ms = CLIP.meses;
  const base = n <= ms.length ? ms[n - 1].meta : ms[ms.length - 1].meta + (n - ms.length) * (ms[ms.length - 1].meta - ms[ms.length - 2].meta);
  if (esc === 'base') return base;
  if (esc === 'conservador') return n >= 3 ? Math.round(base * 0.6) : base;
  const f = n <= 2 ? 1 : n >= 10 ? 1.5 : 1 + (0.5 * (n - 2)) / 8;
  return Math.round(base * f);
}

/** Primer mes en el que un escenario llega a la meta final, mirando hasta `hasta` meses (null si no llega). */
export function mesCruce(esc: Escenario, hasta = 14): number | null {
  for (let n = 1; n <= hasta; n++) if (curva(esc, n) >= CLIP.metaFinal) return n;
  return null;
}

/** Hitos del roadmap con su fecha, ordenados. */
export const hitosClip = (t0 = CLIP.t0) => CLIP.hitos.map((h) => ({ ...h, fechaReal: fechaHitoClip(h, t0) })).sort((a, b) => a.fechaReal.localeCompare(b.fechaReal));

/** Cuántos días de un mes caen hasta `date` (incluido) y cuántos tiene. */
export function diasDelMes(n: number, date: string, t0 = CLIP.t0) {
  const a = inicioMes(n, t0);
  const b = finMes(n, t0);
  const total = Math.round((Date.parse(b) - Date.parse(a)) / 864e5) + 1;
  const hechos = date < a ? 0 : date >= b ? total : Math.round((Date.parse(date) - Date.parse(a)) / 864e5) + 1;
  return { total, hechos };
}
