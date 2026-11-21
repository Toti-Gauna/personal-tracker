/**
 * Plan T+18: seis ramas que salen de main (Trazo) en T0 y vuelven a juntarse en T+18, el cierre
 * de la etapa 2 del Plan T+18 extendido. Fuentes: data/plan.json (las ramas, metas y textos) y,
 * desde la ola 16b, data/plan-extendido.json (el calendario de programación: las fechas se
 * derivan sumando semanas, con las semanas extra de feature prendidas salvo que se apaguen).
 * Todo se cuenta en semanas desde T0 (settings.startDate, o el T0 del plan si no hay).
 */
import { fasesParaElPlan } from './idiomas';
import raw from '../../data/plan.json';
import { HORAS_SEMANA_PLAN, INICIO_TRABAJO_DIAS, horasDelDia, type CfgCapacidad } from './capacidad';
import { fecharDiarios } from './mate-horas';
import { PLAN_EXT, calendario, opcionesDe, type BloqueFechado } from './plan-extendido';
import { RAMAS } from './ramas';
import { addDays, parseDate } from './time';
import type { Area, Rama } from './types';

// ——— Tipos ———

export type TipoTramo = 'proyecto' | 'cert' | 'ventana' | 'descanso' | 'colchon' | 'cierre' | 'sumas';
/**
 * Ola 30 (v7) · los 12 puntos del estándar de alto valor. Los 6 de antes (ux, tresd, animacion, docs, venta, ingenieria) quedan
 * guardados en el estado de cada proyecto pero ya no se muestran ni cuentan.
 */
export type Capa = 'produccion' | 'datos' | 'metricas' | 'diseno' | 'seguridad' | 'llm' | 'escala' | 'operacion' | 'frontend' | 'spots' | 'entrevista' | 'opensource';

/** Un tramo de la rama programación: proyecto, certificación, ventana de matemática, descanso o colchón. */
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
  /** Ola 24 (v2): extras de plataforma y arquitectura que suma, y los que podría sumar. */
  plataforma?: number;
  plataformaPosible?: number;
  arquitectura?: number;
  arquitecturaPosible?: number;
  /** Semanas del plan que son pausa de fin de año dentro del tramo (lo parten). */
  pausas?: number[];
  /** Es una pausa de fin de año (la inserta el motor). */
  pausa?: true;
  /** Ola 27 (v3): fechas exactas (con el T0 con que se aplicó el calendario) y horas del tramo. */
  inicio?: string;
  fin?: string;
  horas?: number;
  diaIni?: number;
  diaFin?: number;
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
  /** Ola 27 (v3): fechas exactas y horas (los tramos diarios se miden en horas de matemática; las ventanas, en las de programación). */
  inicio?: string;
  fin?: string;
  horas?: number;
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
    tramos: Tramo[]; pares: [string, string][]; estandar: { id: Capa; nombre: string; texto: string; detalle?: string[] }[]; presupuesto: { nucleo: number; producto: number; lanzamiento: number }; laboratorios: string;
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
  /** Ola 21: las fases salen de data/idiomas.json (las pone aplicarCalendario); `respuestas` es el kit de entrevista. */
  ingles: { fases: Fase[]; respuestas: string[]; minutosDiarios: number; nota?: string };
  handyx: { cortes: CorteHandyx[]; horasPorDia: number; horasPorSemana: number; metricas: string[] };
  salud: { componentes: { id: string; nombre: string; texto: string }[] };
  metasBimestre: Record<Rama, string[]>;
  nombresBimestre: string[];
  metasAnio: { anio1: MetaAnio[]; tramoFinal: MetaAnio[] };
  semana: { busqueda: SemanaMeta[]; conTrabajo: SemanaMeta[] };
  chequeosMensuales: { rama: Rama; texto: string; desdeSemana?: number; hastaSemana?: number }[];
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
const ALIAS: Record<string, string> = { COL: 'colchon' };
const BASE_MATE: TramoMate[] = PLAN.matematica.tramos.map((t) => ({ ...t }));
const BASE_NOMBRES = [...PLAN.nombresBimestre];
const BASE_METAS_BIM = Object.fromEntries(Object.entries(PLAN.metasBimestre).map(([k, v]) => [k, [...v]])) as Record<Rama, string[]>;

/** Semanas del plan hasta T+18 (cierre de la etapa 2): 104 con todos los extras y las 2 pausas (ola 24); 90 sin pausas ni capas v2 (ola 18). */
export let SEMANAS = PLAN.semanas;
export let BIMESTRES = Math.ceil(SEMANAS / SEMANAS_BIM);
export let TRAMOS: Tramo[] = PLAN.programacion.tramos;
/** Última semana del calendario de programación: el cierre de T+18. */
export let FIN_PROGRAMACION = TRAMOS[TRAMOS.length - 1].hasta;
/** Los extras apagados ("P1" es feature; "P1:plataforma", "P1:arquitectura"), lo último que se aplicó. */
export let EXTRAS_APAGADOS: readonly string[] = [];
/** Ola 24: si la pausa de fin de año está prendida (lo último que se aplicó). */
export let PAUSAS = true;

/**
 * Después del calendario de programación queda margen hasta T+18. Desde la ola 16b el calendario
 * llega hasta T+18 (la etapa 2 ocupa el margen viejo), así que el margen queda vacío; se deja por
 * compatibilidad.
 */
export let MARGEN: Tramo = { id: 'margen', desde: FIN_PROGRAMACION + 1, hasta: SEMANAS, tipo: 'colchon', nombre: 'Margen', que: 'Lo que sobra del calendario' };

/** Ola 27 (v3): con qué T0, inicio del trabajo y horas reales se calculó el calendario vivo. */
export interface CfgHoras extends CfgCapacidad {
  /** Factor real/estimado (calibración en P2 y P3) y bloques ya cerrados. */
  factor?: number;
  cerrados?: string[];
}
export let CFG_HORAS: CfgHoras = { t0: PLAN.t0, inicioTrabajo: addDays(PLAN.t0, INICIO_TRABAJO_DIAS) };
/** Horas de programación del día con la rutina y los registros con que se armó el calendario. */
export const capacidadDelDia = (fecha: string) => horasDelDia(fecha, { ...CFG_HORAS, pausas: PAUSAS });

/** Ola 27: horas de programación planificadas entre dos fechas (inclusive). */
export function horasEntre(desde: string, hasta: string) {
  let h = 0;
  for (let d = desde; d <= hasta; d = addDays(d, 1)) h += capacidadDelDia(d);
  return h;
}

/** Ola 27: el calendario completo (las 4 etapas) medido en horas, con los mismos ajustes que el calendario vivo. */
export function calendarioVivo(t0?: string, o: { factor?: number | null; cerrados?: string[] } = {}): BloqueFechado[] {
  const tt = t0 ?? CFG_HORAS.t0;
  const factor = o.factor === undefined ? CFG_HORAS.factor : o.factor ?? undefined;
  const cerrados = o.cerrados ?? CFG_HORAS.cerrados;
  const cfg = { ...CFG_HORAS, t0: tt, inicioTrabajo: addDays(CFG_HORAS.inicioTrabajo, dias(CFG_HORAS.t0, tt)), pausas: PAUSAS };
  return calendario(PLAN_EXT, {
    ...opcionesDe(EXTRAS_APAGADOS, PAUSAS, tt),
    horas: { capacidad: (f) => horasDelDia(f, cfg), horasSemana: HORAS_SEMANA_PLAN, ...(factor ? { factor } : {}), ...(cerrados ? { cerrados } : {}) },
  });
}

/** Ola 27: fecha en que empieza y en que termina un tramo (exactas, corridas si usás otro T0 que el del calendario). */
export const inicioDe = (t: Pick<Tramo, 'desde' | 'inicio'>, t0 = T0_PLAN) => (t.inicio ? addDays(t.inicio, dias(CFG_HORAS.t0, t0)) : inicioSemana(t.desde, t0));
export const finDe = (t: Pick<Tramo, 'hasta' | 'fin'>, t0 = T0_PLAN) => (t.fin ? addDays(t.fin, dias(CFG_HORAS.t0, t0)) : finSemana(t.hasta, t0));

/** El tramo de programación de una semana (o el margen después del calendario). Una pausa que parte un tramo gana. */
export const tramoEnSemana = (s: number) => {
  // Con fechas exactas, el tramo de una semana es el que tiene el jueves (la mitad) de esa semana.
  const jueves = addDays(CFG_HORAS.t0, (s - 1) * 7 + 3);
  return tramoEnFecha(jueves) ?? TRAMOS.find((x) => x.pausa && s >= x.desde && s <= x.hasta) ?? TRAMOS.find((x) => s >= x.desde && s <= x.hasta) ?? (s > FIN_PROGRAMACION ? MARGEN : TRAMOS[0]);
};

/** El tramo que cubre una fecha (en el marco del T0 con que se aplicó el calendario). Una pausa que parte un tramo gana. */
export function tramoEnFecha(f: string): Tramo | undefined {
  const dentro = (x: Tramo) => !!x.inicio && !!x.fin && f >= x.inicio && f <= x.fin;
  return TRAMOS.find((x) => x.pausa && dentro(x)) ?? TRAMOS.find(dentro);
}

/** Semanas de trabajo de un tramo: su rango menos las pausas que lo parten. */
export const semanasDeTramo = (t: Pick<Tramo, 'desde' | 'hasta' | 'pausas'>) => t.hasta - t.desde + 1 - (t.pausas?.length ?? 0);

/** Los libros de un tramo diario de matemática: los del plan extendido (ola 16c, un solo roadmap). */
function conLibros(d: TramoMate, clave: string): TramoMate {
  const x = PLAN_EXT.matematica?.diarios?.[clave];
  return x ? { ...d, libros: x.principal, habilita: x.habilita.join(' y ') } : d;
}

/** Nombre de un bimestre a partir de lo que hay en él: los dos primeros proyectos o certificaciones. */
function nombreAuto(desde: number, hasta: number) {
  const ts = TRAMOS.filter((t) => !t.pausa && t.hasta >= desde && t.desde <= hasta && (t.tipo === 'proyecto' || t.tipo === 'cert' || t.tipo === 'cierre'));
  const ns = ts.map((t) => (t.tipo === 'cert' ? t.corto ?? t.nombre : t.tipo === 'cierre' ? 'cierre de T+18' : `${t.nombre}${t.version ? ` ${t.version}` : ''}`));
  const u = [...new Set(ns)].slice(0, 2);
  return u.length ? u.join(' y ') : 'Colchón';
}

/** Lo de programación de un bimestre: "P2 VitalIA, W1 y P3 AgrIA". */
function progAuto(desde: number, hasta: number) {
  const ts = TRAMOS.filter((t) => !t.pausa && t.hasta >= desde && t.desde <= hasta);
  const ns = ts.map((t) => (t.tipo === 'sumas' ? 'sumas' : t.tipo === 'proyecto' ? `${t.id} ${t.nombre}${t.version ? ` ${t.version}` : ''}` : t.tipo === 'cert' ? t.corto ?? t.nombre : t.tipo === 'colchon' ? 'colchón' : t.tipo === 'cierre' ? 'cierre de T+18' : t.id));
  return ns.length > 1 ? `${ns.slice(0, -1).join(', ')} y ${ns[ns.length - 1]}` : ns[0] ?? '';
}

/**
 * Recalcula el calendario vivo. `apagados`: proyectos sin las semanas extra de feature. Se llama
 * al cargar el estado y cuando cambia `plan.extrasApagados`.
 */
export function aplicarCalendario(apagados: readonly string[] = [], pausas = true, horas: Partial<CfgHoras> = {}) {
  const t0 = horas.t0 ?? PLAN.t0;
  CFG_HORAS = { t0, inicioTrabajo: horas.inicioTrabajo ?? addDays(t0, INICIO_TRABAJO_DIAS), ...(horas.reales ? { reales: horas.reales } : {}), ...(horas.hoy ? { hoy: horas.hoy } : {}), ...(horas.factor ? { factor: horas.factor } : {}), ...(horas.cerrados ? { cerrados: horas.cerrados } : {}) };
  PAUSAS = pausas;
  const cal = calendario(PLAN_EXT, { ...opcionesDe(apagados, pausas, t0), horas: { capacidad: capacidadDelDia, horasSemana: HORAS_SEMANA_PLAN, ...(CFG_HORAS.factor ? { factor: CFG_HORAS.factor } : {}), ...(CFG_HORAS.cerrados ? { cerrados: CFG_HORAS.cerrados } : {}) } }).filter((b) => b.etapa <= 2);
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
      plataforma: b.plataformaAplicada,
      plataformaPosible: b.extraPlataforma,
      arquitectura: b.arquitecturaAplicada,
      arquitecturaPosible: b.extraArquitectura,
      ...(b.pausasDentro.length ? { pausas: b.pausasDentro } : {}),
      ...(b.pausa ? { pausa: true as const } : {}),
      inicio: b.inicio,
      fin: b.fin,
      ...(b.horas != null ? { horas: b.horas, diaIni: b.diaIni, diaFin: b.diaFin } : {}),
    };
    if (!t.pausas) delete t.pausas;
    if (!b.pausa) delete t.pausa;
    if (base?.tope != null || tipo === 'proyecto') t.tope = b.semanas + 1;
    else delete t.tope;
    // Ola 26: el stack sale de las tecnologías del proyecto (una sola fuente, con marca).
    if (b.tecnologias?.length) t.stack = b.tecnologias.map((x) => x.nombre);
    if (!base?.corto && b.corto) t.corto = b.corto;
    if (!base?.perfil && b.perfil) t.perfil = b.perfil;
    return t;
  });
  SEMANAS = Math.max(...TRAMOS.map((t) => t.hasta));
  FIN_PROGRAMACION = SEMANAS;
  PAUSAS = pausas;
  BIMESTRES = Math.ceil(SEMANAS / SEMANAS_BIM);
  EXTRAS_APAGADOS = [...apagados];
  MARGEN = { ...MARGEN, desde: FIN_PROGRAMACION + 1, hasta: SEMANAS };
  PLAN.semanas = SEMANAS;
  PLAN.programacion.tramos = TRAMOS;
  // T+18 es el cierre de la etapa 2 (T+0, T+2 y T+12 son fechas de calendario y no se mueven).
  PLAN.hitos = PLAN.hitos.map((h) => (h.id === 'T+18' ? { ...h, semana: SEMANAS, fin: true } : h));

  // Matemática (v3): las ventanas salen del calendario; los tramos diarios se miden en horas y se pausan durante cada ventana.
  const vents = TRAMOS.filter((t) => t.tipo === 'ventana');
  const semanaDeFecha = (f: string) => Math.floor(dias(t0, f) / 7) + 1;
  const diariosCfg = Object.entries(PLAN_EXT.matematica?.diarios ?? {}).sort(([a], [z]) => a.localeCompare(z, undefined, { numeric: true })).map(([id, x]) => ({ id, horas: x.horas ?? 0, x })).filter((d) => d.horas > 0);
  const ventFechas = vents.map((v) => ({ inicio: v.inicio!, fin: v.fin! }));
  const finPlan = TRAMOS.reduce((m, t) => (t.fin! > m ? t.fin! : m), TRAMOS[0].fin!);
  const dfechados = fecharDiarios(diariosCfg, t0, finPlan, { inicioTrabajo: CFG_HORAS.inicioTrabajo, ventanas: ventFechas });
  const mate: TramoMate[] = [];
  for (const df of dfechados) {
    const d = diariosCfg.find((x) => x.id === df.id)!;
    const base = BASE_MATE.find((m) => m.id === df.id);
    mate.push({ ...(base ?? { libros: d.x.principal, habilita: d.x.habilita.join(' y ') }), ...conLibros(base ?? { id: df.id, desde: 0, hasta: 0, libros: [], habilita: '' }, df.id), id: df.id, desde: semanaDeFecha(df.inicio), hasta: semanaDeFecha(df.fin), inicio: df.inicio, fin: df.fin, horas: df.horas });
  }
  for (const v of vents) {
    const bw = BASE_MATE.find((m) => m.id === v.id);
    const bx = PLAN_EXT.bloques.find((x) => x.id === v.id);
    const base = bw ?? { id: v.id, desde: 0, hasta: 0, libros: bx?.libros ?? [v.que], habilita: bx?.habilita ?? '' };
    mate.push({ ...base, ...(bx?.mate ? { libros: bx.mate.principal, habilita: bx.mate.habilita.join(' y ') } : {}), id: v.id, desde: v.desde, hasta: v.hasta, inicio: v.inicio, fin: v.fin, ...(v.horas ? { horas: v.horas } : {}) });
  }
  mate.sort((a, z) => (a.inicio ?? '').localeCompare(z.inicio ?? '') || (a.id.startsWith('m') ? -1 : 1));
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
  // Ola 21: la rama de idiomas lee el roadmap maestro v3 (mismo T0): sus fases y lo de cada bimestre.
  PLAN.ingles.fases = fasesParaElPlan(SEMANAS);
  const ing: string[] = [];
  for (let n = 1; n <= BIMESTRES; n++) {
    const desde = (n - 1) * SEMANAS_BIM + 1;
    const hasta = Math.min(SEMANAS, n * SEMANAS_BIM);
    const fs = PLAN.ingles.fases.filter((f) => f.hasta >= desde && f.desde <= hasta).map((f) => f.nombre);
    ing.push(fs.length > 1 ? `${fs.slice(0, -1).join(', ')} y ${fs[fs.length - 1]}` : fs[0] ?? '');
  }
  for (const r of Object.keys(BASE_METAS_BIM) as Rama[]) {
    const base = r === 'programacion' ? prog : r === 'ingles' ? ing : BASE_METAS_BIM[r];
    PLAN.metasBimestre[r] = Array.from({ length: BIMESTRES }, (_, i) => base[Math.min(i, base.length - 1)]);
  }
}

aplicarCalendario();

// ——— Fechas ———

function dias(a: string, b: string) { return Math.round((parseDate(b).getTime() - parseDate(a).getTime()) / 864e5); }

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

/** El tramo que termina último (una pausa que parte el cierre queda antes en la lista). */
const ultimoTramo = () => TRAMOS.filter((t) => !t.pausa).reduce((m, t) => ((t.fin ?? '') > (m.fin ?? '') ? t : m), TRAMOS[TRAMOS.length - 1]);

/** El tramo de programación activo (proyecto, certificación, ventana, descanso o colchón). */
export function tramoActivo(fecha: string, t0 = T0_PLAN) {
  // Ola 27: por fecha exacta (el calendario se mide en horas). Antes de T0, el primero; después del final, el último.
  const f = addDays(fecha, -dias(CFG_HORAS.t0, t0));
  const t = tramoEnFecha(f) ?? (f < (TRAMOS[0].inicio ?? '') ? TRAMOS[0] : ultimoTramo());
  const ini = t.inicio ?? inicioSemana(t.desde, CFG_HORAS.t0);
  const fin = t.fin ?? finSemana(t.hasta, CFG_HORAS.t0);
  // "Semana n de N": las horas del tramo repartidas en sus N semanas (con el calendario viejo, tramos de 24,5 h; con la v7, las
  // horas del bloque / sus semanas de calendario). Sin horas (días fijos), semanas de calendario.
  const N = Math.max(1, Math.ceil(t.meta ?? semanasDeTramo(t)));
  const hechas = t.horas ? Array.from({ length: Math.max(0, Math.min(dias(ini, f), dias(ini, fin) + 1)) }, (_, i) => capacidadDelDia(addDays(ini, i))).reduce((x, y) => x + y, 0) : Math.floor(dias(ini, f) / 7);
  const unidad = t.horas ? t.horas / N : 1;
  const semana = Math.max(1, Math.min(N, Math.floor(hechas / unidad + 1e-9) + 1));
  return { ...t, semana, semanas: N, inicio: addDays(ini, dias(CFG_HORAS.t0, t0)), fin: addDays(fin, dias(CFG_HORAS.t0, t0)) };
}

export const proyectos = () => TRAMOS.filter((t) => t.tipo === 'proyecto');
export const certificaciones = () => TRAMOS.filter((t) => t.tipo === 'cert');
export const ventanas = () => TRAMOS.filter((t) => t.tipo === 'ventana');
export const tramoPorId = (id: string) => TRAMOS.find((t) => t.id === id);

/** "PetrIA · petróleo", "VitalIA · medicina", "AWS SAA". */
export const nombreTramo = (t: Tramo, conIndustria = true) =>
  t.tipo === 'cert' ? t.corto ?? t.nombre : `${t.nombre}${t.version ? ` ${t.version}` : ''}${conIndustria && t.industria ? ` · ${t.industria}` : ''}`;

/** El siguiente tramo con trabajo después de uno (saltea los descansos). */
export const siguienteTramo = (id: string) => TRAMOS.slice(TRAMOS.findIndex((t) => t.id === id) + 1).find((t) => t.tipo !== 'descanso');

/** La ventana de matemática en curso, o la próxima. */
export function ventanaW(fecha: string, t0 = T0_PLAN) {
  // Ola 27: por fecha exacta (las ventanas no empiezan en lunes).
  const ahora = ventanas().find((w) => inicioDe(w, t0) <= fecha && fecha <= finDe(w, t0));
  const prox = ventanas().find((w) => inicioDe(w, t0) > fecha);
  return { ahora, prox, ...(prox ? { diasHastaProx: dias(fecha, inicioDe(prox, t0)) } : {}) };
}

// ——— Otras ramas ———

const enRango = <T extends { desde: number; hasta: number }>(xs: T[], s: number) => xs.find((x) => s >= x.desde && s <= x.hasta) ?? xs[xs.length - 1];

/** El tramo de matemática de una fecha: la ventana si hay una en curso; si no, el tramo diario que corre. */
export const tramoMatematica = (fecha: string, t0 = T0_PLAN) => {
  const f = addDays(fecha, -dias(CFG_HORAS.t0, t0));
  const ts = PLAN.matematica.tramos;
  const dentro = (m: TramoMate) => !!m.inicio && !!m.fin && f >= m.inicio && f <= m.fin;
  // v12.1: sin tramos diarios (m1–m4 archivados), fuera de una ventana toca la próxima (o la última, después de todas).
  const diarios = ts.filter((m) => /^m/.test(m.id));
  return ts.find((m) => /^W/.test(m.id) && dentro(m)) ?? ts.find((m) => /^m/.test(m.id) && dentro(m))
    ?? (f < (ts[0].inicio ?? '') ? ts[0] : diarios.length ? diarios[diarios.length - 1] : ts.find((m) => (m.inicio ?? '') > f) ?? ts[ts.length - 1]);
};
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
    if (t.tipo === 'proyecto' && t.id !== 'P0') out.push({ de: 'programacion', a: 'trabajo', fecha: finDe(t, t0), texto: `${nombreTramo(t, false)} entra al portfolio con tráiler y landing` });
    if (t.tipo === 'ventana') {
      // El proyecto que la ventana habilita (el que depende de ella); si no lo dice, el próximo proyecto.
      const hab = PLAN_EXT.bloques.find((b) => b.dependeDe?.includes(t.id))?.id;
      const sig = TRAMOS.find((x) => x.id === hab) ?? TRAMOS.find((x) => x.tipo === 'proyecto' && (x.inicio && t.fin ? x.inicio > t.fin : x.desde > t.hasta));
      const sem = t.meta ?? t.hasta - t.desde + 1;
      out.push({ de: 'matematica', a: 'programacion', fecha: inicioDe(t, t0), texto: `Ventana ${t.id} de ${sem} ${sem === 1 ? 'semana' : 'semanas'}: la base de ${sig ? nombreTramo(sig, false) : 'lo que sigue'}` });
    }
  }
  // Ola 21: el examen de Cambridge C1 (fin de su fase) entra al CV.
  const c1 = PLAN.ingles.fases.find((f) => f.id === 'a1-examen');
  if (c1) out.push({ de: 'ingles', a: 'trabajo', fecha: finSemana(c1.hasta, t0), texto: 'Cambridge C1 Advanced: el certificado entra al CV y a LinkedIn' });
  return out.sort((a, b) => a.fecha.localeCompare(b.fecha));
}

/** Las próximas entregas desde una fecha. */
export const proximasEntregas = (fecha: string, n = 4, extra: Entrega[] = [], t0 = T0_PLAN) =>
  [...entregasDelPlan(t0), ...extra].filter((e) => e.fecha >= fecha).sort((a, b) => a.fecha.localeCompare(b.fecha)).slice(0, n);

/** Los eventos del plan para el mapa: inicio y fin de cada tramo de programación, cortes, hitos y fases. */
export function eventosDelPlan(t0 = T0_PLAN): EventoRama[] {
  const out: EventoRama[] = PLAN.hitos.map((h) => ({ id: `hito-${h.id}`, rama: 'main' as const, fecha: fechaHito(h, t0), texto: h.texto, origen: 'plan' as const }));
  for (const t of TRAMOS) {
    if (t.tipo === 'descanso' || t.tipo === 'colchon') continue;
    out.push({ id: `fin-${t.id}`, rama: t.tipo === 'ventana' ? 'matematica' : 'programacion', fecha: finDe(t, t0), texto: t.tipo === 'ventana' ? `${t.id} · ${t.que.toLowerCase()}` : `${t.id} · ${nombreTramo(t)} cerrado`, origen: 'plan' });
  }
  for (const c of PLAN.handyx.cortes) out.push({ id: `handyx-${c.id}`, rama: 'handyx', fecha: finSemana(c.hasta, t0), texto: `Corte · ${c.nombre}`, origen: 'plan' });
  for (const f of PLAN.ingles.fases.slice(1)) out.push({ id: `ingles-${f.id}`, rama: 'ingles', fecha: inicioSemana(f.desde, t0), texto: `Empieza: ${f.nombre.toLowerCase()}`, origen: 'plan' });
  return out.sort((a, b) => a.fecha.localeCompare(b.fecha));
}

// ——— Etapa de cada rama ———

export interface Etapa {
  rama: Rama;
  /** "P1 · PetrIA · petróleo". */
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
    titulo: w.ahora ? `${w.ahora.id} · ${w.ahora.que}` : (m.libros ?? []).join(' y ') || m.id,
    sub: w.prox ? `${w.prox.id} (${w.prox.que.toLowerCase()}) el ${fmtCorta(inicioDe(w.prox, t0))}` : `Habilita: ${m.habilita}`,
    lado: `B${b.n} · ${PLAN.metasBimestre.matematica[b.n - 1]}`,
    avance: m.inicio && m.fin ? Math.max(0.01, Math.min(1, (dias(m.inicio, addDays(fecha, -dias(CFG_HORAS.t0, t0))) + 1) / (dias(m.inicio, m.fin) + 1))) : (s - m.desde + 1) / (m.hasta - m.desde + 1),
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
    sub: ing.texto,
    lado: `sem ${s - ing.desde + 1}/${ing.hasta - ing.desde + 1}`,
    avance: (s - ing.desde + 1) / (ing.hasta - ing.desde + 1),
  };
  const hand: Etapa = hx
    ? { rama: 'handyx', titulo: `Año de prueba · ${hx.nombre}`, sub: `Corte ${hx.indice + 1} el ${fmtCorta(hx.fin)}: ${hx.texto.toLowerCase().replace(/\.$/, '')}`, lado: `sem ${hx.semana}/${hx.semanas}`, avance: hx.semana / hx.semanas }
    : { rama: 'handyx', titulo: 'Según la decisión', sub: PLAN.metasBimestre.handyx[b.n - 1], lado: `B${b.n}`, avance: b.semana / b.semanas };
  const salud: Etapa = { rama: 'salud', titulo: PLAN.metasBimestre.salud[b.n - 1], sub: `B${b.n} · semana ${b.semana} de ${b.semanas}`, lado: `B${b.n}`, avance: b.semana / b.semanas };
  return [prog, mate, trab, ingl, hand, salud];
}
