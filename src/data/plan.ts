/**
 * Plan T+18: seis ramas que salen de main (Trazo) en T0 y vuelven a juntarse 78 semanas
 * después. Fuente: data/plan.json. Todo se cuenta en semanas desde T0 (settings.startDate, o el
 * T0 del plan si no hay), así que las fechas se derivan acá y no hay fechas sueltas en pantallas.
 */
import raw from '../../data/plan.json';
import { RAMAS } from './ramas';
import { addDays, parseDate } from './time';
import type { Area, Rama } from './types';

// ——— Tipos ———

export type TipoTramo = 'proyecto' | 'cert' | 'ventana' | 'pausa' | 'colchon';
export type Capa = 'ux' | 'tresd' | 'animacion' | 'docs' | 'venta' | 'ingenieria';

/** Un tramo de la rama programación: proyecto, certificación, ventana de matemática, pausa o colchón. */
export interface Tramo {
  id: string;
  desde: number;
  hasta: number;
  tipo: TipoTramo;
  nombre: string;
  /** "AWS SAA" para las certificaciones. */
  corto?: string;
  version?: 'v1' | 'v2';
  industria?: string;
  /** Producto que crece de v1 a v2 ("faro"). */
  producto?: string;
  que: string;
  stack?: string[];
  perfil?: string;
}

/** Un proyecto del plan con su estándar de entrega. */
export interface Proyecto extends Tramo {
  tipo: 'proyecto';
  estandar: Record<Capa, boolean>;
}

export interface Hito {
  id: 'T+0' | 'T+2' | 'T+12' | 'T+18';
  semana: number;
  /** El hito de T+18 cae al final de su semana. */
  fin?: boolean;
  titulo: string;
  texto: string;
}

/** Algo que una rama le entrega a otra en una fecha. */
export interface Entrega {
  de: Rama;
  a: Rama;
  fecha: string;
  texto: string;
}

/** Lo que se registra en una rama y alimenta el mapa (commits). */
export interface EventoRama {
  id: string;
  rama: Rama | 'main';
  fecha: string;
  texto: string;
  /** De dónde sale: el plan, una importación o algo que hiciste en la app. */
  origen: 'plan' | 'registro';
}

export interface CorteHandyx {
  id: string;
  nombre: string;
  hasta: number;
  texto: string;
}

export interface MetaBimestre {
  rama: Rama;
  bimestre: number;
  texto: string;
}

export interface MetaAnio {
  rama?: Rama;
  area?: Area;
  texto: string;
}

/** Meta de mes o semana generada desde el plan: el usuario la confirma, la cambia o la borra. */
export interface MetaGenerada {
  id: string;
  rama?: Rama;
  area?: Area;
  texto: string;
  meta?: number;
  unidad?: string;
  origen: 'plan' | 'propia' | 'chequeo';
}

export interface Fase {
  id: string;
  desde: number;
  hasta: number;
  nombre: string;
  texto: string;
}

export interface TramoMate {
  id: string;
  desde: number;
  hasta: number;
  desdeT?: string;
  hastaT?: string;
  libros: string[];
  habilita: string;
}

export interface Entrevista {
  id: string;
  fecha: string;
  hora?: string;
  rol: string;
  empresa?: string;
  /** "USD 4.000–5.000". */
  rango?: string;
  modalidad?: string;
  /** Lo que preguntaron y lo que falló, si se cargó después. */
  fallas?: string[];
  prep: Record<string, boolean>;
}

export type EstadoPostulacion = 'enviada' | 'respuesta' | 'entrevista' | 'oferta' | 'rechazada';
export interface Postulacion {
  id: string;
  fecha: string;
  rol: string;
  empresa?: string;
  rango?: string;
  estado: EstadoPostulacion;
}

export interface RespuestaEnsayada {
  id: string;
  texto: string;
  veces: number;
}

interface PlanFile {
  t0: string;
  semanas: number;
  semanasPorBimestre: number;
  ramas: { id: Rama; nombre: string; color: string; contiene: string }[];
  hitos: Hito[];
  programacion: { tramos: Tramo[]; pares: [string, string][]; estandar: { id: Capa; nombre: string; texto: string }[]; presupuesto: { nucleo: number; producto: number; lanzamiento: number }; laboratorios: string };
  matematica: { tramos: TramoMate[]; corte: number };
  trabajo: { fases: Fase[]; embudo: { semanas: number; postulaciones: number; mensajes: number; entrevistas: [number, number]; ofertas: [number, number] }; porDia: { postulaciones: number; mensajes: number }; postsPorSemana: number };
  ingles: { fases: Fase[]; respuestas: string[]; minutosDiarios: number };
  handyx: { cortes: CorteHandyx[]; horasPorDia: number; horasPorSemana: number; metricas: string[] };
  salud: { componentes: { id: string; nombre: string; texto: string }[] };
  metasBimestre: Record<Rama, string[]>;
  nombresBimestre: string[];
  metasAnio: { anio1: MetaAnio[]; tramoFinal: MetaAnio[] };
  semana: { busqueda: SemanaMeta[]; conTrabajo: SemanaMeta[] };
  chequeosMensuales: { rama: Rama; texto: string; desdeSemana?: number }[];
  etapaActual: {
    mes: { desde: number; hasta: number; titulo: string; metas: { rama: Rama; texto: string }[] };
    semana: { semana: number; titulo: string; metas: { rama: Rama; dias: number[]; texto: string }[] };
    checklistDiario: string[];
  };
}

export interface SemanaMeta {
  rama: Rama;
  id: string;
  texto: string;
  meta: number;
  unidad: string;
}

export const PLAN = raw as unknown as PlanFile;
export const T0_PLAN = PLAN.t0;
export const SEMANAS = PLAN.semanas;
export const SEMANAS_BIM = PLAN.semanasPorBimestre;
export const BIMESTRES = Math.ceil(SEMANAS / SEMANAS_BIM);
export const TRAMOS = PLAN.programacion.tramos;

// ——— Fechas ———

const dias = (a: string, b: string) => Math.round((parseDate(b).getTime() - parseDate(a).getTime()) / 864e5);

/** Lunes de una semana del plan (1 = la de T0). */
export const inicioSemana = (n: number, t0 = T0_PLAN) => addDays(t0, (n - 1) * 7);
/** Domingo de una semana del plan. */
export const finSemana = (n: number, t0 = T0_PLAN) => addDays(t0, n * 7 - 1);
/** Rango de semanas en fechas. */
export const fechas = (desde: number, hasta: number, t0 = T0_PLAN) => ({ inicio: inicioSemana(desde, t0), fin: finSemana(hasta, t0) });

/** Semana del plan (1 a 78) de una fecha; 0 antes de T0 y 79 después del final. */
export function semanaDelPlan(fecha: string, t0 = T0_PLAN) {
  const d = dias(t0, fecha);
  if (d < 0) return 0;
  return Math.min(SEMANAS + 1, Math.floor(d / 7) + 1);
}

/** ¿Está dentro del plan? */
export const enPlan = (fecha: string, t0 = T0_PLAN) => { const s = semanaDelPlan(fecha, t0); return s >= 1 && s <= SEMANAS; };

/** Bimestre del plan (B1 a B9) y la semana dentro de él: "B1 · semana 5 de 9". B9 tiene 6 semanas. */
export function bimestreDelPlan(fecha: string, t0 = T0_PLAN) {
  const s = Math.max(1, Math.min(SEMANAS, semanaDelPlan(fecha, t0)));
  const n = Math.ceil(s / SEMANAS_BIM);
  const desde = (n - 1) * SEMANAS_BIM + 1;
  const hasta = Math.min(SEMANAS, n * SEMANAS_BIM);
  return { n, semana: s - desde + 1, semanas: hasta - desde + 1, desde, hasta, ...fechas(desde, hasta, t0) };
}

/** Año 1 = B1 a B6; tramo final = B7 a B9. */
export const tramoDelAnio = (bimestre: number) => (bimestre <= 6 ? 'anio1' : 'final');

// ——— Programación ———

/** El tramo de programación activo (proyecto, certificación, ventana, pausa o colchón). */
export function tramoActivo(fecha: string, t0 = T0_PLAN) {
  const s = Math.max(1, Math.min(SEMANAS, semanaDelPlan(fecha, t0)));
  const t = TRAMOS.find((x) => s >= x.desde && s <= x.hasta)!;
  return { ...t, semana: s - t.desde + 1, semanas: t.hasta - t.desde + 1, ...fechas(t.desde, t.hasta, t0) };
}

export const proyectos = () => TRAMOS.filter((t) => t.tipo === 'proyecto');
export const certificaciones = () => TRAMOS.filter((t) => t.tipo === 'cert');
export const ventanas = () => TRAMOS.filter((t) => t.tipo === 'ventana');
export const tramoPorId = (id: string) => TRAMOS.find((t) => t.id === id);

/** "Faro v1 · petróleo", "Escudo · medicina", "AWS SAA". */
export const nombreTramo = (t: Tramo, conIndustria = true) =>
  t.tipo === 'cert' ? t.corto ?? t.nombre : `${t.nombre}${t.version ? ` ${t.version}` : ''}${conIndustria && t.industria ? ` · ${t.industria}` : ''}`;

/** El siguiente tramo con trabajo después de uno (saltea la pausa de fin de año). */
export const siguienteTramo = (id: string) => TRAMOS.slice(TRAMOS.findIndex((t) => t.id === id) + 1).find((t) => t.tipo !== 'pausa');

/** La ventana de matemática en curso, o la próxima. */
export function ventanaW(fecha: string, t0 = T0_PLAN) {
  const s = semanaDelPlan(fecha, t0);
  const ahora = ventanas().find((w) => s >= w.desde && s <= w.hasta);
  const prox = ventanas().find((w) => w.desde > s);
  return { ahora, prox, ...(prox ? { diasHastaProx: dias(fecha, inicioSemana(prox.desde, t0)) } : {}) };
}

// ——— Otras ramas ———

const enRango = <T extends { desde: number; hasta: number }>(xs: T[], s: number) => xs.find((x) => s >= x.desde && s <= x.hasta) ?? xs[xs.length - 1];

export const tramoMatematica = (fecha: string, t0 = T0_PLAN) => enRango(PLAN.matematica.tramos, Math.max(1, Math.min(SEMANAS, semanaDelPlan(fecha, t0))));
export const faseTrabajo = (fecha: string, t0 = T0_PLAN) => enRango(PLAN.trabajo.fases, Math.max(1, Math.min(SEMANAS, semanaDelPlan(fecha, t0))));
export const faseIngles = (fecha: string, t0 = T0_PLAN) => enRango(PLAN.ingles.fases, Math.max(1, Math.min(SEMANAS, semanaDelPlan(fecha, t0))));

/** El corte de Handyx en curso (o null después de la decisión) y la semana dentro de él. */
export function corteHandyx(fecha: string, t0 = T0_PLAN) {
  const s = Math.max(1, semanaDelPlan(fecha, t0));
  const cs = PLAN.handyx.cortes;
  const i = cs.findIndex((c) => s <= c.hasta);
  if (i < 0) return null;
  const desde = i ? cs[i - 1].hasta + 1 : 1;
  return { ...cs[i], indice: i, desde, semana: s - desde + 1, semanas: cs[i].hasta - desde + 1, fin: finSemana(cs[i].hasta, t0) };
}

/** Metas fijas del bimestre de cada rama. */
export const metasDelBimestre = (n: number): MetaBimestre[] => RAMAS.map((r) => ({ rama: r, bimestre: n, texto: PLAN.metasBimestre[r][n - 1] }));

/** Semanal según la fase: hasta T+2 la de búsqueda; después, con trabajo. */
export const metasSemanaPlan = (fecha: string, t0 = T0_PLAN): SemanaMeta[] =>
  semanaDelPlan(fecha, t0) < hitoSemana('T+2') ? PLAN.semana.busqueda : PLAN.semana.conTrabajo;

// ——— Hitos y entregas ———

export const hitoSemana = (id: Hito['id']) => PLAN.hitos.find((h) => h.id === id)!.semana;
export const fechaHito = (h: Hito, t0 = T0_PLAN) => (h.fin ? finSemana(h.semana, t0) : inicioSemana(h.semana, t0));

/**
 * Las entregas entre ramas que salen del plan: cada proyecto entra al portfolio (programación →
 * trabajo), cada ventana W prepara un proyecto (matemática → programación) y con el trabajo
 * nuevo empieza el bloque diario de inglés (trabajo → inglés).
 */
export function entregasDelPlan(t0 = T0_PLAN): Entrega[] {
  const out: Entrega[] = [];
  for (const t of TRAMOS) {
    if (t.tipo === 'proyecto' && t.id !== 'P0') out.push({ de: 'programacion', a: 'trabajo', fecha: finSemana(t.hasta, t0), texto: `${nombreTramo(t, false)} entra al portfolio con tráiler y landing` });
    if (t.tipo === 'ventana') {
      const sig = TRAMOS.find((x) => x.tipo === 'proyecto' && x.desde > t.hasta);
      out.push({ de: 'matematica', a: 'programacion', fecha: inicioSemana(t.desde, t0), texto: `Ventana ${t.id} de ${t.hasta - t.desde + 1} semanas: la base de ${sig ? nombreTramo(sig, false) : 'lo que sigue'}` });
    }
  }
  out.push({ de: 'trabajo', a: 'ingles', fecha: inicioSemana(hitoSemana('T+2'), t0), texto: 'Trabajo nuevo: empieza el bloque diario hacia el C1' });
  return out.sort((a, b) => a.fecha.localeCompare(b.fecha));
}

/** Las próximas entregas desde una fecha. */
export const proximasEntregas = (fecha: string, n = 4, extra: Entrega[] = [], t0 = T0_PLAN) =>
  [...entregasDelPlan(t0), ...extra].filter((e) => e.fecha >= fecha).sort((a, b) => a.fecha.localeCompare(b.fecha)).slice(0, n);

/** Los eventos del plan para el mapa: inicio y fin de cada tramo de programación, cortes, hitos y fases. */
export function eventosDelPlan(t0 = T0_PLAN): EventoRama[] {
  const out: EventoRama[] = PLAN.hitos.map((h) => ({ id: `hito-${h.id}`, rama: 'main' as const, fecha: fechaHito(h, t0), texto: h.texto, origen: 'plan' as const }));
  for (const t of TRAMOS) {
    if (t.tipo === 'pausa' || t.tipo === 'colchon') continue;
    out.push({ id: `fin-${t.id}`, rama: t.tipo === 'ventana' ? 'matematica' : 'programacion', fecha: finSemana(t.hasta, t0), texto: t.tipo === 'ventana' ? `${t.id} · ${t.que.toLowerCase()}` : `${t.id} · ${nombreTramo(t)} cerrado`, origen: 'plan' });
  }
  for (const c of PLAN.handyx.cortes) out.push({ id: `handyx-${c.id}`, rama: 'handyx', fecha: finSemana(c.hasta, t0), texto: `Corte · ${c.nombre}`, origen: 'plan' });
  for (const f of PLAN.ingles.fases.slice(1)) out.push({ id: `ingles-${f.id}`, rama: 'ingles', fecha: inicioSemana(f.desde, t0), texto: `Empieza: ${f.nombre.toLowerCase()}`, origen: 'plan' });
  return out.sort((a, b) => a.fecha.localeCompare(b.fecha));
}

// ——— Etapa de cada rama ———

export interface Etapa {
  rama: Rama;
  /** "P1 · Faro v1 · petróleo". */
  titulo: string;
  /** Lo que sigue o lo que entrega. */
  sub: string;
  /** "sem 3/4". */
  lado: string;
  /** Avance de la etapa 0..1. */
  avance: number;
}

const fmtCorta = (d: string) => {
  const M = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const x = parseDate(d);
  return `${x.getDate()} ${M[x.getMonth()]}`;
};
const DOW = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
export const fechaCorta = fmtCorta;
export const diaSemanaCorto = (d: string) => DOW[parseDate(d).getDay()];

/**
 * La etapa de cada rama para una fecha, solo con lo que dice el plan. Las pantallas le suman lo
 * real (capítulo de CONAMAT, respuestas ensayadas, entrenamientos).
 */
export function etapas(fecha: string, t0 = T0_PLAN): Etapa[] {
  const s = Math.max(1, Math.min(SEMANAS, semanaDelPlan(fecha, t0)));
  const b = bimestreDelPlan(fecha, t0);
  const p = tramoActivo(fecha, t0);
  const sig = siguienteTramo(p.id);
  const w = ventanaW(fecha, t0);
  const m = tramoMatematica(fecha, t0);
  const tr = faseTrabajo(fecha, t0);
  const ing = faseIngles(fecha, t0);
  const hx = corteHandyx(fecha, t0);
  const prog: Etapa = {
    rama: 'programacion',
    titulo: p.tipo === 'proyecto' ? `${p.id} · ${nombreTramo(p)}` : p.tipo === 'cert' ? `${p.id} · ${p.nombre}` : p.tipo === 'ventana' ? `${p.id} · ${p.nombre}` : p.nombre,
    sub: `${p.tipo === 'proyecto' ? 'Entrega' : 'Termina'} el ${diaSemanaCorto(p.fin)} ${fmtCorta(p.fin)}${sig ? ` · sigue ${sig.tipo === 'proyecto' ? nombreTramo(sig) : sig.corto ?? sig.nombre}` : ''}`,
    lado: `sem ${p.semana}/${p.semanas}`,
    avance: p.semana / p.semanas,
  };
  const mate: Etapa = {
    rama: 'matematica',
    titulo: w.ahora ? `${w.ahora.id} · ${w.ahora.que}` : m.libros.join(' y '),
    sub: w.prox ? `${w.prox.id} (${w.prox.que.toLowerCase()}) el ${fmtCorta(inicioSemana(w.prox.desde, t0))}` : `Habilita: ${m.habilita}`,
    lado: `B${b.n} · ${PLAN.metasBimestre.matematica[b.n - 1]}`,
    avance: (s - m.desde + 1) / (m.hasta - m.desde + 1),
  };
  const trab: Etapa = {
    rama: 'trabajo',
    titulo: tr.nombre,
    sub: tr.id === 'busqueda' ? 'Meta: remoto de USD 3.000 a 5.000 en T+2' : PLAN.metasBimestre.trabajo[b.n - 1],
    lado: tr.id === 'busqueda' ? `sem ${s}/${tr.hasta}` : `B${b.n}`,
    avance: tr.id === 'busqueda' ? s / tr.hasta : b.semana / b.semanas,
  };
  const ingl: Etapa = {
    rama: 'ingles',
    titulo: ing.nombre,
    sub: ing.id === 'entrevista' ? 'Después, bloque diario al C1' : PLAN.metasBimestre.ingles[b.n - 1],
    lado: `sem ${s - ing.desde + 1}/${ing.hasta - ing.desde + 1}`,
    avance: (s - ing.desde + 1) / (ing.hasta - ing.desde + 1),
  };
  const hand: Etapa = hx
    ? { rama: 'handyx', titulo: `Año de prueba · ${hx.nombre}`, sub: `Corte ${hx.indice + 1} el ${fmtCorta(hx.fin)}: ${hx.texto.toLowerCase().replace(/\.$/, '')}`, lado: `sem ${hx.semana}/${hx.semanas}`, avance: hx.semana / hx.semanas }
    : { rama: 'handyx', titulo: 'Según la decisión', sub: PLAN.metasBimestre.handyx[b.n - 1], lado: `B${b.n}`, avance: b.semana / b.semanas };
  const salud: Etapa = { rama: 'salud', titulo: PLAN.metasBimestre.salud[b.n - 1], sub: `B${b.n} · semana ${b.semana} de ${b.semanas}`, lado: `B${b.n}`, avance: b.semana / b.semanas };
  return [prog, mate, trab, ingl, hand, salud];
}
