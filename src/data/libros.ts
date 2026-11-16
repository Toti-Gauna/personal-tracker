import raw from '../../data/libros.json';
import type { Activity, StudyState, TestResult, Unit } from './study-types';

/**
 * Ola 20 · sistema de libros. Un libro se estudia de a 2 capítulos (una unidad del motor): micro-tesis
 * por capítulo, tarjetas, mini-test de la unidad (85 %) y la tesis de la unidad al día siguiente. Al
 * terminar: test final, tesis final y el artefacto (sin artefacto no cuenta como terminado).
 */

export interface Capitulo {
  n: number;
  titulo: string;
  sub?: string;
  parte?: number;
  /** Capítulo de teoría (en Measure What Matters, los cuatro "superpoderes"). */
  teoria?: boolean;
}

export interface Recurso {
  id: string;
  titulo: string;
}

export interface UnidadLibro {
  n: number;
  /** 1 o 2 capítulos. */
  caps: number[];
  /** Recursos que se leen con la unidad (entran al mini-test). */
  recursos?: string[];
}

export type TipoArtefacto = 'framework' | 'analisis' | 'politica' | 'speech';
export const TIPOS_ARTEFACTO: { id: TipoArtefacto; nombre: string }[] = [
  { id: 'framework', nombre: 'Framework' },
  { id: 'analisis', nombre: 'Análisis' },
  { id: 'politica', nombre: 'Política' },
  { id: 'speech', nombre: 'Speech' },
];

export interface Libro {
  id: string;
  titulo: string;
  autor?: string;
  idioma?: string;
  /** Dónde cae en el plan ("Año 1 · inglés · fase 1"). */
  contexto?: string;
  partes?: { n: number; titulo: string }[];
  capitulos: Capitulo[];
  recursos?: Recurso[];
  /** Sin valor, se arman de a 2 capítulos en orden. */
  unidades?: UnidadLibro[];
  test?: { preguntas: number; min: number };
  final?: { preguntas: number; min: number };
  /** Qué artefacto pide el libro. `cuando: 'despues'`: se define al terminarlo. */
  artefacto?: { tipo?: TipoArtefacto; desc?: string; cuando?: 'despues'; nota?: string } | null;
  /** El hito del bloque del plan. */
  hito?: string;
}

export const LIBROS: Libro[] = (raw as { libros: Libro[] }).libros;

/** Libros cargados con JSON (metas por bloque, tipo "libro"). El store los aplica al cargar y al cambiar. */
let PROPIOS: (Libro & { propio: true })[] = [];
export function aplicarLibrosPropios(ls: Libro[] = []) {
  PROPIOS = ls.map((l) => ({ ...l, propio: true as const }));
}
export const libroPorId = (id: string): (Libro & { propio?: boolean }) | undefined => LIBROS.find((l) => l.id === id) ?? PROPIOS.find((l) => l.id === id);
export const todosLosLibros = (): (Libro & { propio?: boolean })[] => [...LIBROS, ...PROPIOS];

/** Las unidades del libro: las del JSON o, sin ellas, de a 2 capítulos. */
export function unidadesDe(l: Libro): UnidadLibro[] {
  if (l.unidades?.length) return l.unidades;
  const out: UnidadLibro[] = [];
  for (let i = 0; i < l.capitulos.length; i += 2) out.push({ n: out.length + 1, caps: l.capitulos.slice(i, i + 2).map((c) => c.n) });
  return out;
}

const y = (xs: string[]) => (xs.length > 1 ? `${xs.slice(0, -1).join(', ')} y ${xs[xs.length - 1]}` : xs[0] ?? '');

/** "caps. 5 y 6", "cap. 21". */
export const capsTexto = (caps: number[]) => (caps.length === 1 ? `cap. ${caps[0]}` : `caps. ${y(caps.map(String))}`);

/** Las unidades del motor: título con los capítulos, mini-test de N preguntas a 85 %. */
export function unidadesMotor(l: Libro): Unit[] {
  const t = l.test ?? { preguntas: 8, min: 15 };
  return unidadesDe(l).map((u) => {
    const caps = u.caps.map((n) => l.capitulos.find((c) => c.n === n)!);
    const rec = (u.recursos ?? []).map((id) => l.recursos?.find((r) => r.id === id)?.titulo ?? id);
    const nombres = [...caps.map((c) => c.titulo), ...rec];
    const tc = capsTexto(u.caps);
    return {
      n: u.n,
      title: `${tc[0].toUpperCase()}${tc.slice(1)} · ${y(nombres)}`,
      corto: tc,
      test: { count: t.preguntas, min: t.min, desc: `Mini-test de los ${tc}: ${t.preguntas} preguntas de concepto y aplicación, sin el libro.` },
    };
  });
}

export const actIdDeLibro = (id: string) => `libro-${id}`;

/** La actividad del motor para un libro. Entra en el bloque que se pida (por defecto, inglés). */
export function actividadDeLibro(l: Libro, o: { block?: string; front?: string; days?: number[] } = {}): Activity {
  const units = unidadesMotor(l);
  return {
    id: actIdDeLibro(l.id), title: l.titulo, front: o.front ?? 'lectura', type: 'lectura', perSession: 1, total: units.length, unit: 'unidades',
    days: o.days ?? [0, 1, 2, 3, 4, 5, 6], block: o.block ?? 'ingles', engine: true, progress: 0, units, unitLabel: 'Unidad', testMode: 'app',
    final: { title: `Test final · ${l.titulo}`, desc: `${l.final?.preguntas ?? 20} preguntas de todo el libro, sin el libro. Aprobás con 85 %.` },
    libro: l.id, area: 'libro',
  };
}

/** Un libro del JSON está bien armado: capítulos en orden, cada uno en una sola unidad, de a 1 o 2. */
export function validarLibro(l: Libro): string[] {
  const e: string[] = [];
  if (!l.id?.trim()) e.push('falta el id');
  if (!l.titulo?.trim()) e.push(`${l.id}: falta el título`);
  if (!Array.isArray(l.capitulos)) return [...e, `${l.id}: faltan los capítulos`];
  l.capitulos.forEach((c, i) => {
    if (c.n !== i + 1) e.push(`${l.id}: el capítulo ${i + 1} tiene n = ${c.n}`);
    if (!c.titulo?.trim()) e.push(`${l.id}: el capítulo ${c.n} no tiene título`);
  });
  const vistos = new Map<number, number>();
  for (const u of unidadesDe(l)) {
    if (!u.caps.length || u.caps.length > 2) e.push(`${l.id}: la unidad ${u.n} tiene ${u.caps.length} capítulos (van 1 o 2)`);
    for (const c of u.caps) {
      if (!l.capitulos.some((x) => x.n === c)) e.push(`${l.id}: la unidad ${u.n} pide el cap. ${c}, que no existe`);
      if (vistos.has(c)) e.push(`${l.id}: el cap. ${c} está en las unidades ${vistos.get(c)} y ${u.n}`);
      vistos.set(c, u.n);
    }
    for (const r of u.recursos ?? []) if (!l.recursos?.some((x) => x.id === r)) e.push(`${l.id}: la unidad ${u.n} pide el recurso ${r}, que no existe`);
  }
  for (const c of l.capitulos) if (!vistos.has(c.n)) e.push(`${l.id}: el cap. ${c.n} no está en ninguna unidad`);
  return e;
}

export function validarLibros(ls: Libro[] = LIBROS): string[] {
  const ids = new Set<string>();
  const e: string[] = [];
  for (const l of ls) {
    if (ids.has(l.id)) e.push(`libro repetido: ${l.id}`);
    ids.add(l.id);
    e.push(...validarLibro(l));
  }
  return e;
}

// ——— Estado de un libro ———

/** El cierre de un libro: test final, tesis final y artefacto. */
export interface FinalLibro {
  tests: TestResult[];
  aprobadoOn?: string;
  /** El repaso (kind tesis) de la tesis final. */
  tesisItem?: string;
  artefacto?: { tipo: TipoArtefacto; titulo: string; link?: string; fecha: string };
}

export interface MicroTesis {
  texto: string;
  fecha: string;
  /** La tarjeta que salió de la micro-tesis. */
  cardId?: string;
}

export const claveMicro = (actId: string, cap: number) => `${actId}:${cap}`;

export type EstadoLibro = 'pendiente' | 'leyendo' | 'leido' | 'terminado';
export const ESTADO_LIBRO: Record<EstadoLibro, string> = {
  pendiente: 'Pendiente', leyendo: 'Leyendo', leido: 'Leído · falta el artefacto', terminado: 'Terminado',
};

export function estadoLibro(st: StudyState, l: Libro) {
  const actId = actIdDeLibro(l.id);
  const us = unidadesDe(l);
  const u = (n: number) => st.units[actId]?.[n];
  const estudiadas = us.filter((x) => u(x.n)?.learnedOn).length;
  const aprobadas = us.filter((x) => u(x.n)?.approvedOn || u(x.n)?.flojo).length;
  const micro = l.capitulos.filter((c) => st.microtesis?.[claveMicro(actId, c.n)]?.texto.trim()).length;
  const fin = st.finales?.[actId];
  const tesisFinal = !!fin?.tesisItem && st.reviews.some((r) => r.id === fin.tesisItem && r.doneOn);
  const artefacto = !!fin?.artefacto;
  const actual = us.find((x) => !u(x.n)?.approvedOn && !u(x.n)?.flojo);
  const estado: EstadoLibro = fin?.aprobadoOn && tesisFinal ? (artefacto ? 'terminado' : 'leido') : estudiadas || micro ? 'leyendo' : 'pendiente';
  return {
    actId, unidades: us.length, estudiadas, aprobadas, micro, capitulos: l.capitulos.length, actual,
    finalToca: aprobadas === us.length && !fin?.aprobadoOn, finalAprobado: !!fin?.aprobadoOn, tesisFinal, artefacto, estado,
  };
}

/** Capítulos de una unidad sin micro-tesis. */
export function microFaltantes(st: StudyState, a: Activity, n: number): number[] {
  const l = a.libro ? libroPorId(a.libro) : undefined;
  if (!l) return [];
  const u = unidadesDe(l).find((x) => x.n === n);
  return (u?.caps ?? []).filter((c) => !st.microtesis?.[claveMicro(a.id, c)]?.texto.trim());
}

/** El libro ya no entra en el día: test final aprobado y tesis final hecha. */
export const libroCerrado = (st: StudyState, a: Activity) => {
  const fin = st.finales?.[a.id];
  return !!a.libro && !!fin?.aprobadoOn && !!fin.tesisItem && st.reviews.some((r) => r.id === fin.tesisItem && r.doneOn);
};

// ——— Unidades por área (ola 20) ———

export type AreaEstudio = 'matematica' | 'programacion' | 'lenguaje' | 'libro';
export const UNIDAD_POR_AREA: Record<AreaEstudio, { nombre: string; unidad: string; label: string }> = {
  matematica: { nombre: 'Matemática', unidad: '1 capítulo', label: 'Cap.' },
  programacion: { nombre: 'Programación, IA y DevSecOps', unidad: '1 bloque del curso (unas 4 partes)', label: 'Bloque' },
  lenguaje: { nombre: 'Lenguajes', unidad: '1 capítulo, unidad o bloque', label: 'Unidad' },
  libro: { nombre: 'Libros', unidad: '2 capítulos', label: 'Unidad' },
};
export const AREAS_ESTUDIO = Object.keys(UNIDAD_POR_AREA) as AreaEstudio[];

// ——— Ola 21 · la biblioteca: 42 libros núcleo en 6 bloques de 7 y 13 opcionales ———

export interface LibroBiblioteca { id: string; titulo: string; aval?: string; faseA?: number }
export interface Biblioteca { criterio: string; bloques: { n: number; nombre: string; libros: LibroBiblioteca[] }[]; opcionales: LibroBiblioteca[] }

export const BIBLIOTECA = (raw as { biblioteca: Biblioteca }).biblioteca;
export const nucleo = () => BIBLIOTECA.bloques.flatMap((b) => b.libros.map((l) => ({ ...l, bloque: b.n })));
export const libroDeBiblioteca = (id: string) => [...nucleo(), ...BIBLIOTECA.opcionales].find((l) => l.id === id);

/** Estado de un libro de la biblioteca: el del sistema de libros si ya tiene capítulos; si no, pendiente. */
export function estadoBiblioteca(st: StudyState, id: string): { estado: EstadoLibro; conCapitulos: boolean } {
  const l = libroPorId(id);
  if (!l) return { estado: 'pendiente', conCapitulos: false };
  const a = st.activities.find((x) => x.id === actIdDeLibro(id));
  return { estado: a ? estadoLibro(st, l).estado : 'pendiente', conCapitulos: true };
}

export function validarBiblioteca(b: Biblioteca = BIBLIOTECA): string[] {
  const e: string[] = [];
  const ids = new Set<string>();
  for (const l of [...b.bloques.flatMap((x) => x.libros), ...b.opcionales]) {
    if (ids.has(l.id)) e.push(`biblioteca: libro repetido ${l.id}`);
    ids.add(l.id);
  }
  if (b.bloques.length !== 6 || b.bloques.some((x) => x.libros.length !== 7)) e.push('biblioteca: son 6 bloques de 7 libros');
  const fa = b.bloques.flatMap((x) => x.libros).filter((l) => l.faseA);
  if (fa.length !== 12) e.push(`biblioteca: la Fase A tiene 12 libros (hay ${fa.length})`);
  for (let y = 1; y <= 6; y++) if (fa.filter((l) => l.faseA === y).length !== 2) e.push(`biblioteca: el año ${y} tiene 2 libros`);
  return e;
}
