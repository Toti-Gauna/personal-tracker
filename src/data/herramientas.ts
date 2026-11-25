/**
 * §14 · las herramientas open source: Alawys (versionada a lo largo de todo el plan) y una herramienta nueva como máximo por
 * proyecto, entregable de su cierre. Cada versión nace en un ítem (proyecto principal, app secundaria o slot comercial) y toma sus
 * fechas. Puro.
 *  - standalone: producto público desde el día uno.
 *  - extracted: una librería que sale de un proyecto cuando un segundo la necesita: no se publica sin "la necesita: X".
 *  - interna: nunca se publica (el escrow de Mercado Pago de HandyX).
 * El Imán va solo en dos lanzamientos (Alawys v1.0 y mcp-ar v2); las demás, el checklist de 5 puntos y un post del jueves.
 */
import type { EstadoItem } from './fondo';
import { imanCompleto, type Iman } from './iman';
import { PLAN_EXT } from './plan-extendido';
import { fichaV7 } from './proyectos-v7';
import { V122, type Herramienta, type VersionHerramienta } from './v12-2';

export const HERRAMIENTAS: Herramienta[] = V122.herramientas;
export const herramienta = (id: string) => HERRAMIENTAS.find((h) => h.id === id);

export const CHECKLIST_EXTRACCION = ['Tests', 'README', 'Ejemplo', 'Semver', 'Publicada con provenance'] as const;
export const claveExtraccion = (h: string, v: string, i: number) => `v12:tool:${h}:${v}:${i + 1}`;
export const REGLA_HERRAMIENTAS = 'Como máximo UNA herramienta nueva por proyecto (sumar a una existente, como un preset de Alawys o un servidor de mcp-ar, no cuenta); es un entregable del cierre: tests · README · ejemplo · semver · publicada con provenance. Las extraídas se publican recién cuando un segundo ítem las necesita.';

/** El nombre de un ítem de origen (bloque, app secundaria o slot comercial). */
export function nombreOrigen(id: string | null): string {
  if (!id) return 'cada proyecto principal';
  return PLAN_EXT.bloques.find((b) => b.id === id)?.nombre ?? V122.secundarias.find((s) => s.id === id)?.nombre ?? (() => { const c = V122.comerciales.find((x) => x.id === id); return c ? `#${c.n} ${c.marca ?? c.sector ?? 'a definir'}` : id; })();
}

/**
 * Las fechas de una versión: el día dado (o hasta `hasta`: Alawys v0.1 se arma del 5 al 11 dic); el bloque entero; o el cierre del origen
 * (su última versión o la indicada; en un slot comercial, la fase de build: la herramienta sale al terminar de construir).
 */
export function fechasVersion(v: VersionHerramienta): { inicio: string; fin: string } | null {
  if (v.donde === 'fecha' && v.fecha) return { inicio: v.fecha, fin: v.hasta ?? v.fecha };
  if (!v.origen) return null;
  const b = PLAN_EXT.bloques.find((x) => x.id === v.origen);
  if (b?.fechas) {
    if (v.donde === 'bloque') return { ...b.fechas };
    const vs = (fichaV7(b.id)?.versiones ?? []).filter((x) => x.inicio && x.fin);
    const ultima = vs[vs.length - 1];
    return ultima ? { inicio: ultima.inicio!, fin: ultima.fin! } : { ...b.fechas };
  }
  const s = V122.secundarias.find((x) => x.id === v.origen);
  if (s) { const x = s.versiones.find((y) => y.id === (v.version ?? s.versiones[s.versiones.length - 1].id))!; return { inicio: x.inicio, fin: x.fin }; }
  const c = V122.comerciales.find((x) => x.id === v.origen);
  return c ? { ...(c.build ?? { inicio: c.inicio, fin: c.fin }) } : null;
}

/** Las herramientas que nacen (o crecen) en un ítem. */
export const herramientasDe = (item: string) => HERRAMIENTAS.flatMap((h) => h.versiones.filter((v) => v.origen === item).map((v) => ({ h, v })));
/** La herramienta nueva de un ítem: la que tiene ahí su primera versión. */
export const herramientaNuevaDe = (item: string) => HERRAMIENTAS.find((h) => h.versiones.find((v) => v.origen)?.origen === item);

type Plan = { hitos: Record<string, { hecho?: string }>; fondo?: Record<string, EstadoItem>; iman?: Record<string, Iman> };

export function estadoVersion(h: Herramienta, v: VersionHerramienta, plan: Plan) {
  const checklist = CHECKLIST_EXTRACCION.map((texto, i) => ({ clave: claveExtraccion(h.id, v.id, i), texto, hecho: !!plan.hitos?.[claveExtraccion(h.id, v.id, i)]?.hecho }));
  return { checklist, publicada: plan.fondo?.[h.id]?.versiones?.[v.id]?.publicada ?? null, fechas: fechasVersion(v) };
}

/** ¿Se puede marcar publicada? Nunca la interna; las extraídas, con el segundo ítem; todas, con los 5 puntos; los dos lanzamientos, con el Imán. */
export function puedePublicarHerramienta(h: Herramienta, v: VersionHerramienta, plan: Plan): { ok: boolean; faltan: string[] } {
  if (h.kind === 'interna') return { ok: false, faltan: ['Es interna: no se publica'] };
  const faltan: string[] = [];
  if (h.kind === 'extracted' && !plan.fondo?.[h.id]?.necesitadoPor) faltan.push('La necesita: el segundo ítem que la usa');
  const e = estadoVersion(h, v, plan);
  for (const c of e.checklist) if (!c.hecho) faltan.push(c.texto);
  if (v.lanzamiento && !imanCompleto(plan.iman?.[h.id])) faltan.push('El Imán (es un lanzamiento)');
  return { ok: faltan.length === 0, faltan };
}

/** Los proyectos principales con "0.1 · Arranque" (de VitalIA en adelante): el texto y si ya sumaron su preset a Alawys. */
export const PRIMER_ARRANQUE = '2026-12-28';
export const textoArranque = (id: string) => (id === 'P2' ? 'Alawys v0.1 + scaffold VitalIA with it' : '0.1 · Arranque');
export const conArranque = () => PLAN_EXT.bloques.filter((b) => b.tipo === 'proyecto' && !b.archivado && b.fechas && b.fechas.inicio >= PRIMER_ARRANQUE);
export function presetsAlawys(plan: Pick<Plan, 'hitos'>) {
  const ps = conArranque();
  return { total: ps.length, hechos: ps.filter((b) => plan.hitos?.[`v12:${b.id}:preset-alawys`]?.hecho).length };
}
