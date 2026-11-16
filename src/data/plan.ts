/**
 * Plan T+18: seis ramas que salen de main (Trazo) en T0 y vuelven a juntarse en T+18, el cierre
 * de la etapa 2 del Plan T+18 extendido. Fuentes: data/plan.json (las ramas, metas y textos) y,
 * desde la ola 16b, data/plan-extendido.json (el calendario de programación: las fechas se
 * derivan sumando semanas, con las semanas extra de feature prendidas salvo que se apaguen).
 * Todo se cuenta en semanas desde T0 (settings.startDate, o el T0 del plan si no hay).
 */
import raw from '../../data/plan.json';
import { PLAN_EXT, calendario } from './plan-extendido';
import { RAMAS } from './ramas';
import { addDays, parseDate } from './time';
import type { Area, Rama } from './types';

// ——— Tipos ———

export type TipoTramo = 'proyecto' | 'cert' | 'ventana' | 'pausa' | 'colchon' | 'cierre';
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
  /** Ola 8b: semanas meta del tramo (calendario comprimido). */
  meta?: number;
  /** Semanas de tope de un proyecto (meta + 1): si se pasa, se recorta alcance, no calendario. */
  tope?: number;
  que: string;
  stack?: string[];
  perfil?: string;
  /** Ola 16b: etapa del Plan T+18 extendido (1 núcleo, 2 ciberseguridad). */
  etapa?: number;
  /** Semanas extra de feature que suma con la configuración actual, y las que podría sumar. */
  extra?: number;
  extraPosible?: number;
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
  /** De dónde sale el avance solo ("postulaciones", "horas-mate", "casillas:P1"…); sin valor, se suma a mano. */
  clave?: string;
  /** Avance sumado a mano. */
  hecho?: number;
  /** "5 por día". */
  nota?: string;
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
  programacion: {
    tramos: Tramo[]; pares: [string, string][]; estandar: { id: Capa; nombre: string; texto: string }[]; presupuesto: { nucleo: number; producto: number; lanzamiento: number }; laboratorios: string;
    /** Créditos de la API de Claude (US$) por proyecto y reserva. */
    creditos: Record<string, number>;
    /** Semanas del calendario original, para el contador de semanas ganadas. */
    semanasOriginal: number;
    /** Entrevista técnica dentro de cada proyecto. */
    tecnica: { sesionesPorSemana: number; ejercicios: [number, number]; defensaMin: number; paginasDiseno: number };
    /** Puertas de matemática: ventana → proyecto que no arranca sin aprobarla. */
    puertas: Record<string, string>;
  };
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
export const SEMANAS_BIM = PLAN.semanasPorBimestre;

// ——— Calendario vivo (ola 16b) ———
// Las fechas de programación salen de data/plan-extendido.json. Etapas 1 y 2 son el horizonte
// de T+18; las 3 y 4 las muestra la línea de tiempo por etapas (16c). Estos valores son `let`:
// `aplicarCalendario` los recalcula (por ejemplo, al apagar el extra de un proyecto) y todos los
// que los importan ven el valor nuevo.

/** Los tramos tal como estaban en data/plan.json: el detalle (qué, stack, perfil, estándar). */
const BASE_TRAMOS: Tramo[] = PLAN.programacion.tramos.map((t) => ({ ...t }));
/** Los ids que cambiaron en el plan extendido. */
const ALIAS: Record<string, string> = { PAU1: 'pausa', COL: 'colchon' };
const BASE_MATE: TramoMate[] = PLAN.matematica.tramos.map((t) => ({ ...t }));
const BASE_NOMBRES = [...PLAN.nombresBimestre];
const BASE_METAS_BIM = Object.fromEntries(Object.entries(PLAN.metasBimestre).map(([k, v]) => [k, [...v]])) as Record<Rama, string[]>;

/** Semanas del plan hasta T+18 (cierre de la etapa 2): 92 con todos los extras, 78 sin ninguno. */
export let SEMANAS = PLAN.semanas;
export let BIMESTRES = Math.ceil(SEMANAS / SEMANAS_BIM);
export let TRAMOS: Tramo[] = PLAN.programacion.tramos;
/** Última semana del calendario de programación: el cierre de T+18. */
export let FIN_PROGRAMACION = TRAMOS[TRAMOS.length - 1].hasta;
/** Los ids de proyecto con el extra apagado (lo último que se aplicó). */
export let EXTRAS_APAGADOS: readonly string[] = [];

/**
 * Después del calendario de programación queda margen hasta T+18. Desde la ola 16b el calendario
 * llega hasta T+18 (la etapa 2 ocupa el margen viejo), así que el margen queda vacío; se deja por
 * compatibilidad.
 */
export let MARGEN: Tramo = { id: 'margen', desde: FIN_PROGRAMACION + 1, hasta: SEMANAS, tipo: 'colchon', nombre: 'Margen', que: 'Lo que sobra del calendario' };

/** El tramo de programación de una semana (o el margen después del calendario). */
export const tramoEnSemana = (s: number) => TRAMOS.find((x) => s >= x.desde && s <= x.hasta) ?? (s > FIN_PROGRAMACION ? MARGEN : TRAMOS[0]);

/** Los libros de un tramo diario de matemática: los del plan extendido (ola 16c, un solo roadmap). */
function conLibros(d: TramoMate, clave: string): TramoMate {
  const x = PLAN_EXT.matematica?.diarios?.[clave];
  return x ? { ...d, libros: x.principal, habilita: x.habilita.join(' y ') } : d;
}

/** Nombre de un bimestre a partir de lo que hay en él: los dos primeros proyectos o certificaciones. */
function nombreAuto(desde: number, hasta: number) {
  const ts = TRAMOS.filter((t) => t.hasta >= desde && t.desde <= hasta && (t.tipo === 'proyecto' || t.tipo === 'cert' || t.tipo === 'cierre'));
  const ns = ts.map((t) => (t.tipo === 'cert' ? t.corto ?? t.nombre : t.tipo === 'cierre' ? 'cierre de T+18' : `${t.nombre}${t.version ? ` ${t.version}` : ''}`));
  const u = [...new Set(ns)].slice(0, 2);
  return u.length ? u.join(' y ') : 'Colchón';
}

/** Lo de programación de un bimestre: "P2 Escudo, W1 y P3 Surco v1". */
function progAuto(desde: number, hasta: number) {
  const ts = TRAMOS.filter((t) => t.hasta >= desde && t.desde <= hasta && t.tipo !== 'pausa');
  const ns = ts.map((t) => (t.tipo === 'proyecto' ? `${t.id} ${t.nombre}${t.version ? ` ${t.version}` : ''}` : t.tipo === 'cert' ? t.corto ?? t.nombre : t.tipo === 'colchon' ? 'colchón' : t.tipo === 'cierre' ? 'cierre de T+18' : t.id));
  return ns.length > 1 ? `${ns.slice(0, -1).join(', ')} y ${ns[ns.length - 1]}` : ns[0] ?? '';
}

/**
 * Recalcula el calendario vivo. `apagados`: proyectos sin las semanas extra de feature. Se llama
 * al cargar el estado y cuando cambia `plan.extrasApagados`.
 */
export function aplicarCalendario(apagados: readonly string[] = []) {
  const cal = calendario(PLAN_EXT, { extras: Object.fromEntries(apagados.map((id) => [id, false])) }).filter((b) => b.etapa <= 2);
  TRAMOS = cal.map((b) => {
    const base = BASE_TRAMOS.find((t) => t.id === b.id || t.id === ALIAS[b.id]);
    const tipo = b.tipo as TipoTramo;
    const t: Tramo = {
      ...(base ?? {}),
      id: b.id,
      tipo,
      nombre: base?.nombre ?? b.nombre,
      desde: b.desde,
      hasta: b.hasta,
      que: base?.que ?? b.que ?? b.nombre,
      meta: b.semanas,
      etapa: b.etapa,
      extra: b.extraAplicado,
      extraPosible: b.extra,
    };
    if (base?.tope != null || tipo === 'proyecto') t.tope = b.semanas + 1;
    else delete t.tope;
    if (!base?.corto && b.corto) t.corto = b.corto;
    if (!base?.perfil && b.perfil) t.perfil = b.perfil;
    return t;
  });
  SEMANAS = TRAMOS[TRAMOS.length - 1].hasta;
  FIN_PROGRAMACION = SEMANAS;
  BIMESTRES = Math.ceil(SEMANAS / SEMANAS_BIM);
  EXTRAS_APAGADOS = [...apagados];
  MARGEN = { ...MARGEN, desde: FIN_PROGRAMACION + 1, hasta: SEMANAS };
  PLAN.semanas = SEMANAS;
  PLAN.programacion.tramos = TRAMOS;
  // T+18 es el cierre de la etapa 2 (T+0, T+2 y T+12 son fechas de calendario y no se mueven).
  PLAN.hitos = PLAN.hitos.map((h) => (h.id === 'T+18' ? { ...h, semana: SEMANAS, fin: true } : h));

  // Matemática: las ventanas salen del calendario y los tramos diarios llenan los huecos.
  const vents = TRAMOS.filter((t) => t.tipo === 'ventana');
  const diarios = BASE_MATE.filter((m) => !vents.some((v) => v.id === m.id) && !BASE_TRAMOS.some((v) => v.id === m.id));
  const mate: TramoMate[] = [];
  let cursor = 1;
  vents.forEach((v, k) => {
    const d = diarios[Math.min(k, diarios.length - 1)];
    if (v.desde > cursor) mate.push({ ...conLibros(d, k < diarios.length ? d.id : 'm4'), id: k < diarios.length ? d.id : `m${k + 1}`, desde: cursor, hasta: v.desde - 1 });
    const bw = BASE_MATE.find((m) => m.id === v.id);
    const bx = PLAN_EXT.bloques.find((x) => x.id === v.id);
    const base = bw ?? { id: v.id, desde: 0, hasta: 0, libros: bx?.libros ?? [v.que], habilita: bx?.habilita ?? '' };
    mate.push({ ...base, ...(bx?.mate ? { libros: bx.mate.principal, habilita: bx.mate.habilita.join(' y ') } : {}), id: v.id, desde: v.desde, hasta: v.hasta });
    cursor = v.hasta + 1;
  });
  if (cursor <= SEMANAS) {
    const k = vents.length;
    const d = diarios[Math.min(k, diarios.length - 1)];
    mate.push({ ...conLibros(d, k < diarios.length ? d.id : 'm4'), id: k < diarios.length ? d.id : `m${k + 1}`, desde: cursor, hasta: SEMANAS });
  }
  PLAN.matematica.tramos = mate;
  // Ola 16c: las puertas salen del plan extendido (ventana → proyecto que no arranca sin aprobarla).
  PLAN.programacion.puertas = Object.fromEntries(
    PLAN_EXT.bloques.filter((b) => b.etapa <= 2 && b.tipo === 'proyecto' && b.dependeDe?.length).flatMap((b) => b.dependeDe!.map((w) => [w, b.id])),
  );

  // Bimestres: con el calendario nuevo cambia lo que cae en cada uno. B1 conserva su nombre
  // ("El despegue"); los demás se arman con lo que hay de programación. Las metas de las otras
  // ramas siguen las del plan y, en los bimestres que se suman, repiten la última.
  const nombres: string[] = [];
  const prog: string[] = [];
  for (let n = 1; n <= BIMESTRES; n++) {
    const desde = (n - 1) * SEMANAS_BIM + 1;
    const hasta = Math.min(SEMANAS, n * SEMANAS_BIM);
    nombres.push(n === 1 && BASE_NOMBRES[0] ? BASE_NOMBRES[0] : nombreAuto(desde, hasta));
    prog.push(progAuto(desde, hasta));
  }
  PLAN.nombresBimestre = nombres;
  for (const r of Object.keys(BASE_METAS_BIM) as Rama[]) {
    const base = r === 'programacion' ? prog : BASE_METAS_BIM[r];
    PLAN.metasBimestre[r] = Array.from({ length: BIMESTRES }, (_, i) => base[Math.min(i, base.length - 1)]);
  }
}

aplicarCalendario();

// ——— Fechas ———

const dias = (a: string, b: string) => Math.round((parseDate(b).getTime() - parseDate(a).getTime()) / 864e5);

/** Lunes de una semana del plan (1 = la de T0). */
export const inicioSemana = (n: number, t0 = T0_PLAN) => addDays(t0, (n - 1) * 7);
/** Domingo de una semana del plan. */
export const finSemana = (n: number, t0 = T0_PLAN) => addDays(t0, n * 7 - 1);
/** Rango de semanas en fechas. */
export const fechas = (desde: number, hasta: number, t0 = T0_PLAN) => ({ inicio: inicioSemana(desde, t0), fin: finSemana(hasta, t0) });

/** Semana del plan (1 a SEMANAS) de una fecha; 0 antes de T0 y SEMANAS + 1 después del final. */
export function semanaDelPlan(fecha: string, t0 = T0_PLAN) {
  const d = dias(t0, fecha);
  if (d < 0) return 0;
  return Math.min(SEMANAS + 1, Math.floor(d / 7) + 1);
}

/** ¿Está dentro del plan? */
export const enPlan = (fecha: string, t0 = T0_PLAN) => { const s = semanaDelPlan(fecha, t0); return s >= 1 && s <= SEMANAS; };

/** Bimestre del plan y la semana dentro de él: "B1 · semana 5 de 9". El último puede ser más corto. */
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
  const t = tramoEnSemana(s);
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
