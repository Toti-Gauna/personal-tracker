/**
 * Ola 20 · metas por bloque. Cada proyecto, ventana, certificación, libro o unidad tiene sus metas
 * propias (con submetas). Se arman a mano o se importan con un JSON: Trazo valida línea por línea,
 * muestra qué cambia antes de guardar y conserva el avance. También se exportan en el mismo formato.
 */
import { lineaDeClave, lineaDeSintaxis } from './importar';
import { libroPorId, unidadesDe, validarLibro, type Libro } from './libros';
import { PLAN_EXT } from './plan-extendido';

export interface SubMetaBloque { id: string; t: string; hecho?: string }
export interface MetaBloque {
  id: string;
  texto: string;
  /** Fecha en que se tildó. */
  hecho?: string;
  subs?: SubMetaBloque[];
  origen?: 'propia' | 'json';
}

/** Clave del bloque: "P0", "W1", "C2", "libro:mwm" o "libro:mwm:3" (una unidad). */
export function nombreBloque(clave: string): string | null {
  if (clave.startsWith('libro:')) {
    const [, id, n] = clave.split(':');
    const l = libroPorId(id);
    if (!l) return null;
    if (n === undefined) return l.titulo;
    const u = unidadesDe(l).find((x) => x.n === Number(n));
    return u ? `${l.titulo} · unidad ${u.n}` : null;
  }
  const b = PLAN_EXT.bloques.find((x) => x.id === clave);
  return b ? `${b.id} · ${b.nombre}` : null;
}

/** Una meta del bloque está cumplida si está tildada o si tiene submetas y están todas. */
export const metaCumplida = (m: MetaBloque) => !!m.hecho || (!!m.subs?.length && m.subs.every((s) => s.hecho));
export const avanceBloque = (ms: MetaBloque[] = []) => ({ hechas: ms.filter(metaCumplida).length, total: ms.length });

/** "Portfolio hub con mapa 3D" → "portfolio-hub-con-mapa-3d". */
export const slug = (t: string) =>
  t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48) || 'meta';

/**
 * Lo que entra como tareas en la meta de programación de Hoy: lo pendiente del proyecto en curso
 * (la primera submeta sin tildar de cada meta, o la meta si no tiene submetas), hasta `n`.
 */
export function tareasDeBloque(ms: MetaBloque[] = [], n = 2): string[] {
  return ms.filter((m) => !metaCumplida(m)).map((m) => {
    const s = m.subs?.find((x) => !x.hecho);
    return s ? `${m.texto}: ${s.t}` : m.texto;
  }).slice(0, n);
}

// ——— JSON ———

export interface ImportMetas { tipo: 'metas-bloque'; bloque: string; metas: { id: string; texto: string; subs: string[] }[] }
export interface ImportLibro { tipo: 'libro'; libro: Libro }
export type ImportBloque = ImportMetas | ImportLibro;
export type ValidacionBloque = { ok: true; d: ImportBloque } | { ok: false; error: { linea: number; mensaje: string } };

/** ¿El texto pegado es de metas por bloque o de un libro? (si no, es del importador de la ola 8). */
export const esJsonDeBloque = (texto: string) => /"tipo"\s*:\s*"(metas-bloque|libro)"/.test(texto);

class Falla extends Error {
  constructor(public linea: number, mensaje: string) { super(mensaje); }
}
const esTexto = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0;

export function validarJsonBloque(texto: string): ValidacionBloque {
  if (!texto.trim()) return { ok: false, error: { linea: 1, mensaje: 'Pegá el JSON.' } };
  let raw: unknown;
  try {
    raw = JSON.parse(texto);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: { linea: lineaDeSintaxis(texto, msg), mensaje: 'No es un JSON válido: revisá comas, comillas y llaves en esta línea o en la anterior.' } };
  }
  const L = (clave: string, n = 0, despuesDe?: string) => lineaDeClave(texto, clave, n, despuesDe);
  try {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Falla(1, 'Tiene que ser un objeto: { "tipo": "metas-bloque", … } o { "tipo": "libro", … }.');
    const o = raw as Record<string, unknown>;
    if (o.tipo === 'metas-bloque') {
      if (!esTexto(o.bloque) || !nombreBloque(o.bloque)) throw new Falla(L('bloque'), '"bloque" tiene que ser un id del plan (P0 a A7, W1 a WA5, C1 a C7) o "libro:<id>" o "libro:<id>:<unidad>".');
      if (!Array.isArray(o.metas) || !o.metas.length) throw new Falla(L('metas'), '"metas" tiene que ser una lista con al menos una meta.');
      const ids = new Set<string>();
      const metas = o.metas.map((m, i) => {
        if (typeof m === 'string' && esTexto(m)) return { id: slug(m), texto: m.trim(), subs: [] as string[] };
        const x = m as Record<string, unknown>;
        if (!x || typeof x !== 'object' || !esTexto(x.texto)) throw new Falla(L('texto', i, 'metas'), `La meta ${i + 1} necesita "texto".`);
        if (x.id !== undefined && !esTexto(x.id)) throw new Falla(L('id', i, 'metas'), `"id" de la meta ${i + 1} tiene que ser un texto.`);
        const id = (x.id as string | undefined)?.trim() ?? slug(x.texto as string);
        if (ids.has(id)) throw new Falla(L('texto', i, 'metas'), `La meta ${i + 1} repite el id "${id}".`);
        ids.add(id);
        let subs: string[] = [];
        if (x.submetas !== undefined) {
          if (!Array.isArray(x.submetas)) throw new Falla(L('submetas', 0, 'metas'), `"submetas" de la meta ${i + 1} tiene que ser una lista de textos.`);
          subs = x.submetas.map((s) => {
            const t = typeof s === 'string' ? s : (s as Record<string, unknown>)?.texto;
            if (!esTexto(t)) throw new Falla(L('submetas', 0, 'metas'), `Las submetas de la meta ${i + 1} tienen que ser textos.`);
            return t.trim();
          });
        }
        return { id, texto: (x.texto as string).trim(), subs };
      });
      return { ok: true, d: { tipo: 'metas-bloque', bloque: o.bloque.trim(), metas } };
    }
    if (o.tipo === 'libro') {
      if (!esTexto(o.id) || !/^[a-z0-9-]+$/.test(o.id)) throw new Falla(L('id'), '"id" tiene que ser un texto corto en minúsculas, sin espacios ("make-it-stick").');
      if (libroPorId(o.id) && !(libroPorId(o.id) as Libro & { propio?: boolean }).propio) throw new Falla(L('id'), `El libro "${o.id}" ya viene cargado en Trazo.`);
      if (!esTexto(o.titulo)) throw new Falla(L('titulo'), '"titulo" tiene que ser un texto.');
      if (!Array.isArray(o.capitulos) || !o.capitulos.length) throw new Falla(L('capitulos'), '"capitulos" tiene que ser una lista con al menos un capítulo.');
      const capitulos = o.capitulos.map((c, i) => {
        const t = typeof c === 'string' ? c : (c as Record<string, unknown>)?.titulo;
        if (!esTexto(t)) throw new Falla(L('titulo', i + 1), `El capítulo ${i + 1} necesita "titulo".`);
        const sub = typeof c === 'object' && c && esTexto((c as Record<string, unknown>).sub) ? ((c as Record<string, unknown>).sub as string).trim() : undefined;
        return { n: i + 1, titulo: t.trim(), ...(sub ? { sub } : {}) };
      });
      let unidades: Libro['unidades'];
      if (o.unidades !== undefined) {
        if (!Array.isArray(o.unidades) || o.unidades.some((u) => !Array.isArray(u) || u.some((n) => !Number.isInteger(n)))) throw new Falla(L('unidades'), '"unidades" es una lista de listas de capítulos: [[1, 2], [3, 4], [5]].');
        unidades = (o.unidades as number[][]).map((caps, i) => ({ n: i + 1, caps }));
      }
      const libro: Libro = { id: o.id, titulo: o.titulo.trim(), ...(esTexto(o.autor) ? { autor: o.autor.trim() } : {}), capitulos, ...(unidades ? { unidades } : {}) };
      const err = validarLibro(libro);
      if (err.length) throw new Falla(L('unidades') || L('capitulos'), err[0]);
      return { ok: true, d: { tipo: 'libro', libro } };
    }
    throw new Falla(L('tipo'), '"tipo" tiene que ser "metas-bloque" o "libro".');
  } catch (e) {
    if (e instanceof Falla) return { ok: false, error: { linea: e.linea, mensaje: e.message } };
    throw e;
  }
}

export interface Cambios { agrega: string[]; cambia: string[]; saca: string[]; conserva: number }

/** Qué cambia al importar: metas nuevas, textos que cambian, las que se van y cuánto avance se conserva. */
export function queCambiaBloque(d: ImportMetas, actual: MetaBloque[] = []): Cambios {
  const agrega: string[] = [];
  const cambia: string[] = [];
  let conserva = 0;
  for (const m of d.metas) {
    const prev = actual.find((x) => x.id === m.id);
    if (!prev) agrega.push(m.texto);
    else {
      const subsPrev = (prev.subs ?? []).map((s) => s.t);
      if (prev.texto !== m.texto || subsPrev.join('\n') !== m.subs.join('\n')) cambia.push(m.texto);
      if (prev.hecho || prev.subs?.some((s) => s.hecho && m.subs.includes(s.t))) conserva++;
    }
  }
  const saca = actual.filter((x) => !d.metas.some((m) => m.id === x.id)).map((x) => x.texto);
  return { agrega, cambia, saca, conserva };
}

/** Aplica el JSON: reemplaza la lista del bloque, conservando lo tildado (por id de meta y texto de submeta). */
export function fusionarBloque(d: ImportMetas, actual: MetaBloque[] = []): MetaBloque[] {
  return d.metas.map((m) => {
    const prev = actual.find((x) => x.id === m.id);
    const subs = m.subs.map((t, i) => {
      const ps = prev?.subs?.find((s) => s.t === t);
      return { id: ps?.id ?? `${m.id}-${i + 1}`, t, ...(ps?.hecho ? { hecho: ps.hecho } : {}) };
    });
    return { id: m.id, texto: m.texto, origen: prev?.origen ?? 'json', ...(prev?.hecho ? { hecho: prev.hecho } : {}), ...(subs.length ? { subs } : {}) };
  });
}

/** El JSON para exportar: el mismo formato que se importa (sin el avance). */
export function exportarBloque(bloque: string, metas: MetaBloque[] = []) {
  return JSON.stringify({
    tipo: 'metas-bloque', bloque,
    metas: metas.map((m) => ({ id: m.id, texto: m.texto, ...(m.subs?.length ? { submetas: m.subs.map((s) => s.t) } : {}) })),
  }, null, 2);
}

export const EJEMPLO_BLOQUE = `{
  "tipo": "metas-bloque",
  "bloque": "P0",
  "metas": [
    {
      "id": "p0-hub",
      "texto": "Portfolio hub con mapa 3D de proyectos",
      "submetas": ["proyectos.json validado", "Mapa 3D con los 27 proyectos"]
    },
    { "texto": "Trazo publicado con README en inglés" }
  ]
}`;
