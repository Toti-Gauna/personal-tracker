/** v12.2 · las acciones de las tres pistas: estado de cada ítem, versiones, revisión en primer plano, tiempo de revisión, Imán, seguridad, posts, leads y uso de Claude. */
import { avisoRevision, type EntradaRevision, type EstadoItem, type Lead } from '../data/fondo';
import type { Iman, Post } from '../data/iman';
import type { PlanState } from '../data/plan-state';
import { newId } from '../data/schedule';
import { setState } from './store';

const plan = (fn: (p: PlanState) => PlanState) => setState((s) => ({ ...s, plan: fn(s.plan) }));
const item = (p: PlanState, id: string): EstadoItem => p.fondo?.[id] ?? {};
const conItem = (p: PlanState, id: string, x: EstadoItem): PlanState => ({ ...p, fondo: { ...(p.fondo ?? {}), [id]: x } });

export function setItem(id: string, patch: Partial<EstadoItem>) {
  plan((p) => conItem(p, id, { ...item(p, id), ...patch }));
}

/** Marca una versión de un ítem de fondo publicada (o la desmarca). El llamador valida el Imán y la revisión en primer plano. */
export function publicarVersionFondo(id: string, version: string, fecha: string | null) {
  plan((p) => {
    const x = item(p, id);
    const v = { ...(x.versiones?.[version] ?? {}) };
    if (fecha) v.publicada = fecha; else delete v.publicada;
    return conItem(p, id, { ...x, versiones: { ...(x.versiones ?? {}), [version]: v } });
  });
}

export function marcarForeground(id: string, version: string, fecha: string | null) {
  plan((p) => {
    const x = item(p, id);
    const v = { ...(x.versiones?.[version] ?? {}) };
    if (fecha) v.foreground = fecha; else delete v.foreground;
    return conItem(p, id, { ...x, versiones: { ...(x.versiones ?? {}), [version]: v } });
  });
}

/** Anota tiempo de revisión y devuelve el aviso si es comercial y cae en un bloque de foco (igual se anota). */
export function anotarRevision(e: Omit<EntradaRevision, 'id'>, tipoBloque?: string): string | null {
  plan((p) => ({ ...p, revisionFondo: [...(p.revisionFondo ?? []), { ...e, id: `rev-${newId()}` }] }));
  return avisoRevision(e, tipoBloque);
}
export function borrarRevision(id: string) {
  plan((p) => ({ ...p, revisionFondo: (p.revisionFondo ?? []).filter((x) => x.id !== id) }));
}

export function setIman(id: string, patch: Partial<Iman>) {
  plan((p) => ({ ...p, iman: { ...(p.iman ?? {}), [id]: { ...(p.iman?.[id] ?? {}), ...patch } } }));
}

export function marcarSeguridad(id: string, i: number, v: boolean) {
  plan((p) => {
    const xs = [...(p.seguridadShowcase?.[id] ?? [])];
    xs[i] = v;
    return { ...p, seguridadShowcase: { ...(p.seguridadShowcase ?? {}), [id]: xs } };
  });
}

export function agregarPost(post: Omit<Post, 'id'>): string {
  const id = `post-${newId()}`;
  plan((p) => {
    const posts = [...(p.posts ?? []), { ...post, id }];
    // Si va unido a un paso de la serie, queda en el Imán del ítem.
    const iman = post.item && post.paso ? { ...(p.iman ?? {}), [post.item]: { ...(p.iman?.[post.item] ?? {}), posts: { ...(p.iman?.[post.item]?.posts ?? {}), [post.paso]: id } } } : p.iman;
    return { ...p, posts, ...(iman ? { iman } : {}) };
  });
  return id;
}
export function borrarPost(id: string) {
  plan((p) => ({
    ...p,
    posts: (p.posts ?? []).filter((x) => x.id !== id),
    iman: Object.fromEntries(Object.entries(p.iman ?? {}).map(([k, v]) => [k, { ...v, posts: Object.fromEntries(Object.entries(v.posts ?? {}).filter(([, pid]) => pid !== id)) }])),
  }));
}

export function agregarLead(id: string, l: Omit<Lead, 'id'>) {
  plan((p) => { const x = item(p, id); return conItem(p, id, { ...x, leads: [...(x.leads ?? []), { ...l, id: `lead-${newId()}` }] }); });
}
export function estadoLead(id: string, lead: string, estado: Lead['estado']) {
  plan((p) => { const x = item(p, id); return conItem(p, id, { ...x, leads: (x.leads ?? []).map((l) => (l.id === lead ? { ...l, estado } : l)) }); });
}

export function setUsoClaude(lunes: string, pct: number | null) {
  plan((p) => { const u = { ...(p.usoClaude ?? {}) }; if (pct == null) delete u[lunes]; else u[lunes] = pct; return { ...p, usoClaude: u }; });
}
export function setUmbralClaude(n: number) {
  plan((p) => ({ ...p, umbralClaude: n }));
}

/** Pausar (o reanudar) un ítem de fondo: siempre a mano, desde la sugerencia de la revisión del domingo. */
export function pausarItem(id: string, fecha: string | null) {
  plan((p) => { const x = { ...item(p, id) }; if (fecha) x.pausado = fecha; else delete x.pausado; return conItem(p, id, x); });
}
