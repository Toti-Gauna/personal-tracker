import raw from '../../data/idiomas.json';
import { ROUTINES_FILE, blockMin } from './routines';
import { addDays, daysBetween } from './time';

/**
 * Ola 21 · Idiomas y libros: el roadmap maestro v3 (16 nov 2026). Un idioma por año durante 6 años
 * (Fase A), cada año con su etapa inicial y 2 libros de consolidación; después, el ascenso a C1 y los
 * libros que quedan (Fase B). Las fechas salen de las semanas desde t0, como el calendario de
 * programación. Corte de 85 % en todo.
 */

export type TipoFase = 'curso' | 'libro' | 'libros' | 'examen';

export interface FaseIdioma {
  id: string;
  nombre: string;
  semanas: number;
  recurso: string;
  hito: string;
  tipo: TipoFase;
  /** Lo que va en el bloque de idiomas de Hoy mientras dura la fase. */
  tareas: string[];
  libro?: string;
  libros?: string[];
  /** Clave del enlace del curso de Udemy (se carga en la app y queda en el teléfono). */
  udemy?: string;
}

export interface AnioIdioma {
  n: number;
  idioma: string;
  examen: string;
  nivelInicial?: string;
  nivelFinal: string;
  horasInicial: number;
  pctC1?: number;
  horasSemanaC1?: number;
  fases: FaseIdioma[];
}

export interface Idioma { id: string; nombre: string; anio: number; nivelInicial?: string; horasC1?: number }
export interface HitoFaseB { id: string; texto: string; fecha: string; cert?: string }

export interface IdiomasFile {
  version: number;
  t0: string;
  horasSemana: number;
  nota: string;
  idiomas: Idioma[];
  anios: AnioIdioma[];
  faseB: { texto: string; hitos: HitoFaseB[] };
  reglas: string[];
  alertas: string[];
  sinVerificar: string[];
}

const TIPOS: TipoFase[] = ['curso', 'libro', 'libros', 'examen'];

export function validarIdiomas(f: IdiomasFile): string[] {
  const e: string[] = [];
  if (f.version !== 1) e.push('"version" tiene que ser 1');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(f.t0)) e.push('"t0" tiene que ser AAAA-MM-DD');
  if (!(f.horasSemana > 0)) e.push('"horasSemana" tiene que ser mayor a 0');
  const ids = new Set(f.idiomas.map((i) => i.id));
  if (ids.size !== f.idiomas.length) e.push('hay idiomas repetidos');
  f.anios.forEach((a, i) => {
    const at = `año ${a.n}`;
    if (a.n !== i + 1) e.push(`${at}: los años van en orden desde 1`);
    if (!ids.has(a.idioma)) e.push(`${at}: el idioma "${a.idioma}" no existe`);
    if (!a.fases.length) e.push(`${at}: no tiene fases`);
    const fids = new Set<string>();
    for (const x of a.fases) {
      if (!x.id || fids.has(x.id)) e.push(`${at}: fase con id vacío o repetido (${x.id})`);
      fids.add(x.id);
      if (!(Number.isInteger(x.semanas) && x.semanas > 0)) e.push(`${at} · ${x.id}: "semanas" tiene que ser un entero mayor a 0`);
      if (!TIPOS.includes(x.tipo)) e.push(`${at} · ${x.id}: "tipo" tiene que ser ${TIPOS.join(', ')}`);
      if (!x.tareas?.length) e.push(`${at} · ${x.id}: faltan las tareas`);
      if (x.tipo === 'libros' && !x.libros?.length) e.push(`${at} · ${x.id}: la consolidación necesita sus libros`);
    }
    if (!a.fases.some((x) => x.tipo === 'examen')) e.push(`${at}: falta la fase del examen`);
  });
  for (const h of f.faseB.hitos) if (!/^\d{4}-\d{2}$/.test(h.fecha)) e.push(`Fase B · ${h.id}: "fecha" tiene que ser AAAA-MM`);
  return e;
}

export const IDIOMAS = raw as unknown as IdiomasFile;
export const ERRORES_IDIOMAS = validarIdiomas(IDIOMAS);
if (ERRORES_IDIOMAS.length) throw new Error(`data/idiomas.json: ${ERRORES_IDIOMAS.join(' · ')}`);

export const idiomaPorId = (id: string) => IDIOMAS.idiomas.find((i) => i.id === id);
export const nombreIdioma = (id: string) => idiomaPorId(id)?.nombre ?? id;

// ——— Calendario ———

export interface FaseFechada extends FaseIdioma {
  /** "a1-mwm". */
  clave: string;
  anio: number;
  idioma: string;
  /** Semanas desde t0 (la 1 es la de t0). */
  desde: number;
  hasta: number;
  inicio: string;
  fin: string;
}

const lunesDe = (t0: string, semana: number) => addDays(t0, (semana - 1) * 7);
const domingoDe = (t0: string, semana: number) => addDays(t0, semana * 7 - 1);

/** Todas las fases de los 6 años, en orden y sin huecos. */
export function calendarioIdiomas(t0 = IDIOMAS.t0): FaseFechada[] {
  const out: FaseFechada[] = [];
  let s = 1;
  for (const a of IDIOMAS.anios) {
    for (const f of a.fases) {
      const desde = s;
      const hasta = s + f.semanas - 1;
      out.push({ ...f, clave: `a${a.n}-${f.id}`, anio: a.n, idioma: a.idioma, desde, hasta, inicio: lunesDe(t0, desde), fin: domingoDe(t0, hasta) });
      s = hasta + 1;
    }
  }
  return out;
}

export interface AnioFechado extends AnioIdioma { inicio: string; fin: string; desde: number; hasta: number; semanas: number }

export function aniosIdiomas(t0 = IDIOMAS.t0): AnioFechado[] {
  const cal = calendarioIdiomas(t0);
  return IDIOMAS.anios.map((a) => {
    const fs = cal.filter((f) => f.anio === a.n);
    return { ...a, desde: fs[0].desde, hasta: fs[fs.length - 1].hasta, inicio: fs[0].inicio, fin: fs[fs.length - 1].fin, semanas: fs.reduce((x, f) => x + f.semanas, 0) };
  });
}

/** La fase de una fecha (antes de empezar, la primera; después de la Fase A, la última). */
export function faseIdiomaEn(fecha: string, t0 = IDIOMAS.t0): FaseFechada & { semana: number; semanas: number } {
  const cal = calendarioIdiomas(t0);
  const f = cal.find((x) => x.inicio <= fecha && x.fin >= fecha) ?? (fecha < cal[0].inicio ? cal[0] : cal[cal.length - 1]);
  const semana = Math.max(1, Math.min(f.semanas, Math.floor(daysBetween(f.inicio, fecha) / 7) + 1));
  return { ...f, semana, semanas: f.semanas };
}

export const anioEn = (fecha: string, t0 = IDIOMAS.t0) => {
  const as = aniosIdiomas(t0);
  return as.find((a) => a.inicio <= fecha && a.fin >= fecha) ?? (fecha < as[0].inicio ? as[0] : as[as.length - 1]);
};

/** "Inglés · Measure What Matters": el título del bloque de idiomas de Hoy. */
export const tituloIdiomaDelDia = (fecha: string, t0?: string) => {
  const f = faseIdiomaEn(fecha, t0);
  return `${nombreIdioma(f.idioma)} · ${f.nombre}`;
};

// ——— Trimestres, tesis anual y exámenes ———

export type TipoEvento = 'trimestre' | 'tesis' | 'examen';
export interface EventoIdioma { id: string; tipo: TipoEvento; anio: number; idioma: string; fecha: string; texto: string; desde?: string }

/** Cada 13 semanas desde el inicio de cada año, ensayo integrador y examen trimestral; en la última semana, la tesis anual. */
export function eventosIdiomas(t0 = IDIOMAS.t0): EventoIdioma[] {
  const out: EventoIdioma[] = [];
  const cal = calendarioIdiomas(t0);
  for (const a of aniosIdiomas(t0)) {
    const nombre = nombreIdioma(a.idioma);
    for (let q = 1; q * 13 <= a.semanas; q++) {
      out.push({ id: `a${a.n}-t${q}`, tipo: 'trimestre', anio: a.n, idioma: a.idioma, fecha: domingoDe(t0, a.desde + q * 13 - 1), texto: `Ensayo integrador y examen del trimestre ${q} · ${nombre}` });
    }
    out.push({ id: `a${a.n}-tesis`, tipo: 'tesis', anio: a.n, idioma: a.idioma, fecha: a.fin, desde: domingoDe(t0, a.hasta - 1), texto: `Tesis anual · año ${a.n} (${nombre})` });
    const ex = cal.find((f) => f.anio === a.n && f.tipo === 'examen')!;
    out.push({ id: `a${a.n}-examen`, tipo: 'examen', anio: a.n, idioma: a.idioma, fecha: ex.fin, desde: ex.inicio, texto: `Examen ${a.examen}` });
  }
  return out.sort((x, y) => x.fecha.localeCompare(y.fecha));
}

export interface AlertaIdioma { id: string; titulo: string; texto: string; fecha: string; href: string }

const MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const dma = (d: string) => `${Number(d.slice(8))} ${MES[Number(d.slice(5, 7)) - 1]} ${d.slice(0, 4)}`;

/**
 * Alertas: el examen del año desde 8 semanas antes de su fase (fecha, sede y costo sin verificar),
 * el trimestre en 7 días o menos y la tesis anual en 14 días o menos.
 */
export function alertasIdiomas(hoy: string, t0 = IDIOMAS.t0): AlertaIdioma[] {
  const out: AlertaIdioma[] = [];
  for (const e of eventosIdiomas(t0)) {
    const dias = daysBetween(hoy, e.fecha);
    const href = `#/estudio/idiomas/${e.idioma}`;
    if (e.tipo === 'examen' && hoy >= addDays(e.desde!, -56) && hoy <= e.fecha) {
      out.push({ id: `idioma-${e.id}`, titulo: `${e.texto}: entre el ${dma(e.desde!)} y el ${dma(e.fecha)}`, texto: 'Fecha, sede y costo sin verificar: confirmalos y reservá.', fecha: e.desde!, href });
    } else if (e.tipo === 'trimestre' && dias >= 0 && dias <= 7) {
      out.push({ id: `idioma-${e.id}`, titulo: `${e.texto} el ${dma(e.fecha)}`, texto: 'Ensayo que une lo del trimestre y un examen de todo lo visto.', fecha: e.fecha, href });
    } else if (e.tipo === 'tesis' && dias >= 0 && dias <= 14) {
      out.push({ id: `idioma-${e.id}`, titulo: `${e.texto} el ${dma(e.fecha)}`, texto: 'La tesis del año: qué aprendiste, con tus palabras y en el idioma del año.', fecha: e.fecha, href });
    }
  }
  return out;
}

// ——— Hoy sos → vas a ser y horas ———

/** El nivel de cada idioma hoy (por los años terminados) y el que vas a tener al cerrar el año en curso. */
export function nivelesIdiomas(hoy: string, t0 = IDIOMAS.t0) {
  const as = aniosIdiomas(t0);
  const hechos = as.filter((a) => a.fin < hoy);
  const actual = as.find((a) => a.inicio <= hoy && a.fin >= hoy) ?? (hoy < as[0].inicio ? as[0] : null);
  const base = IDIOMAS.idiomas.find((i) => i.nivelInicial);
  const sos = hechos.length ? hechos.map((a) => `${nombreIdioma(a.idioma)} ${a.nivelFinal}`) : base ? [`${base.nombre} ${base.nivelInicial}`] : [];
  return { sos, vasASer: actual ? `${nombreIdioma(actual.idioma)} ${actual.nivelFinal}` : null, actual };
}

/** Horas por semana que le da la rutina de búsqueda intensiva al bloque de idiomas (lunes a viernes y fin de semana). */
export function horasDeLaRutina() {
  const min = (t: 'busqueda-intensiva' | 'busqueda-intensiva-finde') => ROUTINES_FILE.dayRoutines[t].blocks.filter((b) => b.id === 'ingles').reduce((s, b) => s + blockMin(b), 0);
  return Math.round(((min('busqueda-intensiva') * 5 + min('busqueda-intensiva-finde') * 2) / 60) * 10) / 10;
}

/** Las fases en semanas del plan T+18 (mismo t0), recortadas a `hasta`: lo que lee la rama de idiomas del plan. */
export function fasesParaElPlan(hasta: number) {
  return calendarioIdiomas().filter((f) => f.desde <= hasta).map((f) => ({
    id: f.clave, desde: f.desde, hasta: Math.min(hasta, f.hasta),
    nombre: f.anio === 1 ? f.nombre : `${nombreIdioma(f.idioma)} · ${f.nombre}`,
    texto: `${f.recurso}. Hito: ${f.hito}.`,
  }));
}
