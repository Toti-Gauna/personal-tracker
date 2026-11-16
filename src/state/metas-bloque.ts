import { actividadDeLibro, actIdDeLibro } from '../data/libros';
import { fusionarBloque, slug, type ImportBloque, type MetaBloque } from '../data/metas-bloque';
import { newId } from '../data/schedule';
import { getState, setState } from './store';

/** Ola 20 · metas por bloque: lo que cambia una lista (proyecto, ventana, libro o unidad). */
function lista(bloque: string, fn: (ms: MetaBloque[]) => MetaBloque[]) {
  setState((s) => {
    const prev = s.plan.metasBloque ?? {};
    const ms = fn(prev[bloque] ?? []);
    const next = { ...prev };
    if (ms.length) next[bloque] = ms;
    else delete next[bloque];
    return { ...s, plan: { ...s.plan, metasBloque: next } };
  });
}
const una = (bloque: string, id: string, fn: (m: MetaBloque) => MetaBloque) => lista(bloque, (ms) => ms.map((m) => (m.id === id ? fn(m) : m)));

export function agregarMetaBloque(bloque: string, texto: string) {
  const t = texto.trim();
  if (!t) return;
  lista(bloque, (ms) => {
    let id = slug(t);
    if (ms.some((m) => m.id === id)) id = `${id}-${newId()}`;
    return [...ms, { id, texto: t, origen: 'propia' }];
  });
}
export const editarMetaBloque = (bloque: string, id: string, texto: string) => texto.trim() && una(bloque, id, (m) => ({ ...m, texto: texto.trim() }));
export const borrarMetaBloque = (bloque: string, id: string) => lista(bloque, (ms) => ms.filter((m) => m.id !== id));
export const tildarMetaBloque = (bloque: string, id: string, date: string) =>
  una(bloque, id, (m) => {
    const { hecho: _, ...resto } = m;
    return m.hecho ? resto : { ...m, hecho: date };
  });
export function agregarSubBloque(bloque: string, id: string, texto: string) {
  const t = texto.trim();
  if (!t) return;
  una(bloque, id, (m) => ({ ...m, subs: [...(m.subs ?? []), { id: `${m.id}-s${newId()}`, t }] }));
}
export const tildarSubBloque = (bloque: string, id: string, subId: string, date: string) =>
  una(bloque, id, (m) => ({ ...m, subs: (m.subs ?? []).map((x) => (x.id !== subId ? x : x.hecho ? { id: x.id, t: x.t } : { ...x, hecho: date })) }));
export const borrarSubBloque = (bloque: string, id: string, subId: string) =>
  una(bloque, id, (m) => {
    const subs = (m.subs ?? []).filter((x) => x.id !== subId);
    const { subs: _, ...resto } = m;
    return subs.length ? { ...m, subs } : resto;
  });

/**
 * Aplica un JSON validado. Metas: reemplaza la lista del bloque y conserva lo tildado. Libro: lo suma a
 * los libros propios (o lo actualiza) con su actividad archivada, hasta que lo empieces.
 */
export function importarJsonBloque(d: ImportBloque): string[] {
  if (d.tipo === 'metas-bloque') {
    lista(d.bloque, (ms) => fusionarBloque(d, ms));
    return [`${d.metas.length} ${d.metas.length === 1 ? 'meta' : 'metas'} en ${d.bloque}`];
  }
  const l = d.libro;
  setState((s) => {
    const propios = [...(s.study.librosPropios ?? []).filter((x) => x.id !== l.id), l];
    const actId = actIdDeLibro(l.id);
    const prev = s.study.activities.find((a) => a.id === actId);
    const act = { ...actividadDeLibro(l), archivada: prev ? prev.archivada : true };
    const activities = prev ? s.study.activities.map((a) => (a.id === actId ? { ...act, days: a.days, block: a.block, front: a.front } : a)) : [...s.study.activities, act];
    return { ...s, study: { ...s.study, librosPropios: propios, activities } };
  });
  return [`${l.titulo}: ${l.capitulos.length} capítulos cargados`];
}

/** Empieza (o pausa) un libro: su actividad entra (o sale) del día. */
export function empezarLibro(id: string, empezar = true) {
  const actId = actIdDeLibro(id);
  setState((s) => ({ ...s, study: { ...s.study, activities: s.study.activities.map((a) => (a.id === actId ? { ...a, archivada: !empezar } : a)) } }));
}

export const metasDe = (bloque: string) => getState().plan.metasBloque?.[bloque] ?? [];
