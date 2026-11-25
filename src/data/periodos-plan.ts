/**
 * v12.1 · el plan como árbol de períodos: Etapa › Fase › Bloque › (Versión › Lote | Cert | Hito de matemática). Las fechas salen
 * del calendario vivo (los bloques v12.1 tienen fechas explícitas) y lo hecho, de lo que ya guarda el plan: versiones publicadas
 * (`plan.versiones`) y hitos marcados (`plan.hitos`, con las claves de `claveHito`). P0 (Constelación v1) queda fuera del árbol:
 * sus metas son las de siempre (formato viejo) y se leen aparte.
 */
import { fichaV7 } from './proyectos-v7';
import { detalleDe } from './v12-2';
import { PRIMER_ARRANQUE, textoArranque } from './herramientas';
import type { BloqueExt } from './plan-extendido';
import { PLAN_EXT } from './plan-extendido';
import type { Periodo } from './periodos';
import type { PlanState } from './plan-state';
import { addDays, daysBetween } from './time';

/** Las claves de `plan.hitos` para lo que se tilda en el árbol. */
export const claveHito = {
  lote: (bloque: string, lote: string) => `v12:${bloque}:lote:${lote}`,
  cert: (cert: string) => `v12:cert:${cert}`,
  mate: (bloque: string, i: number) => `v12:${bloque}:hito:${i + 1}`,
  bloque: (bloque: string) => `v12:${bloque}`,
  version: (bloque: string, version: string) => `v12:${bloque}:v${version}`,
  /** v12.2: un entregable de una versión (la línea de la versión, partida). */
  entregable: (item: string, version: string, i: number) => `v12:${item}:v${version}:e${i + 1}`,
};

type Fechado = BloqueExt & { inicio: string; fin: string; pausa?: boolean };

/**
 * Una fecha de adentro de un bloque, llevada adonde cae si el bloque se corrió (un corrimiento confirmado o empezar de nuevo): las
 * de adentro mantienen su lugar relativo (con el mismo largo es correr los mismos días), las de afuera, su distancia al borde. Sin
 * corrimiento (el bloque está donde dice su plan) devuelve la misma fecha.
 */
export function llevarFecha(d: string, de: { inicio: string; fin: string } | undefined, a: { inicio: string; fin: string }): string {
  if (!de || (de.inicio === a.inicio && de.fin === a.fin)) return d;
  if (d < de.inicio) return addDays(a.inicio, -daysBetween(d, de.inicio));
  if (d > de.fin) return addDays(a.fin, daysBetween(de.fin, d));
  const antes = daysBetween(de.inicio, de.fin);
  const ahora = daysBetween(a.inicio, a.fin);
  return addDays(a.inicio, antes === 0 ? 0 : Math.round((daysBetween(de.inicio, d) * ahora) / antes));
}
type Ctx = { plan: Pick<PlanState, 'hitos' | 'versiones'>; horasReal?: (bloque: string) => number | undefined };

const hecho = (ctx: Ctx, k: string) => (ctx.plan.hitos?.[k]?.hecho ? 1 : 0);

function versiones(b: Fechado, ctx: Ctx): Periodo[] {
  const f = fichaV7(b.id);
  if (!f) return [];
  // Si el bloque se corrió, sus versiones y lotes van con él.
  const ll = (d: string) => llevarFecha(d, b.fechas, b);
  const lotes = b.lotes ?? [];
  return f.versiones.filter((v) => v.inicio && v.fin && !v.enCurso).map((v) => {
    const dl = (v as { deadline?: string }).deadline;
    const publicada = ctx.plan.versiones?.[b.id]?.[v.id]?.publicada || ctx.plan.hitos?.[claveHito.version(b.id, v.id)]?.hecho;
    let previo = v.inicio!; // en las fechas del plan; cada una se lleva con ll() al armar el lote
    const hijos: Periodo[] = lotes.filter((l) => l.version === v.id).map((l) => {
      const ini = previo < l.estimado ? previo : l.estimado;
      previo = l.estimado;
      return { id: `${b.id}:lote:${l.id}`, nombre: `Lote ${l.id} · ${l.nombre}`, nivel: 'lote' as const, inicio: ll(ini), fin: ll(l.estimado), ...(l.deadline !== l.estimado ? { deadline: ll(l.deadline) } : {}), peso: l.horas, horasPlan: l.horas, progreso: hecho(ctx, claveHito.lote(b.id, l.id)) };
    });
    // v12.2: la línea de la versión es su checklist de entregables; sin lotes, el trabajo es lo tildado.
    const entregables = detalleDe(b.id)?.versiones.find((x) => x.id === v.id)?.entregables ?? [];
    const checklist = entregables.map((texto, i) => ({ clave: claveHito.entregable(b.id, v.id, i), texto, hecho: !!ctx.plan.hitos?.[claveHito.entregable(b.id, v.id, i)]?.hecho }));
    // §14: la primera versión de cada proyecto principal desde VitalIA arranca con "0.1 · Arranque" y su preset en Alawys.
    if (b.fechas && b.fechas.inicio >= PRIMER_ARRANQUE && v.id === f.versiones.find((x) => x.inicio && !x.enCurso)?.id) {
      const k = (x: string) => `v12:${b.id}:${x}`;
      checklist.unshift(
        { clave: k('arranque'), texto: textoArranque(b.id), hecho: !!ctx.plan.hitos?.[k('arranque')]?.hecho },
        { clave: k('preset-alawys'), texto: 'Preset agregado a Alawys', hecho: !!ctx.plan.hitos?.[k('preset-alawys')]?.hecho },
      );
    }
    const tildados = checklist.length ? checklist.filter((c) => c.hecho).length / checklist.length : 0;
    return {
      id: `${b.id}:v${v.id}`, nombre: `v${v.id} ${v.nombre}`, nivel: 'version' as const, inicio: ll(v.inicio!), fin: ll(v.fin!),
      ...(dl && dl !== v.fin ? { deadline: ll(dl) } : {}),
      ...(v.horas != null ? { horasPlan: v.horas } : {}),
      ...(publicada ? { progreso: 1 } : hijos.length ? {} : { progreso: tildados }),
      ...(checklist.length ? { checklist } : {}),
      ...(hijos.length ? { hijos } : {}),
    };
  });
}

/**
 * Cómo llevar una fecha de adentro de un bloque adonde está hoy: con el corrimiento confirmado del bloque (corrido a mano o por
 * empezar de nuevo) lo de adentro va con él; sin corrimiento, queda donde dice el plan. Sirve para las pantallas que leen las
 * fechas del plan directo (el día por día de una certificación, los hitos de una ventana).
 */
export function llevarDeBloque(corrimientos: PlanState['corrimientos'], bloqueId: string): (d: string) => string {
  const cor = corrimientos?.[bloqueId];
  const base = PLAN_EXT.bloques.find((b) => b.id === bloqueId)?.fechas;
  return (d) => (cor && base ? llevarFecha(d, base, cor) : d);
}

/** Un bloque del calendario como período, con sus hijos según el tipo. */
export function periodoBloque(b: Fechado, ctx: Ctx): Periodo {
  let hijos: Periodo[] | undefined;
  const ll = (d: string) => llevarFecha(d, b.fechas, b); // si el bloque se corrió, lo de adentro va con él
  if (b.tipo === 'proyecto') hijos = versiones(b, ctx);
  else if (b.certs?.length) hijos = b.certs.map((c) => ({ id: `${b.id}:${c.id}`, nombre: c.nombre, nivel: 'cert' as const, inicio: b.inicio, fin: ll(c.examen) < b.inicio ? b.inicio : ll(c.examen), peso: c.horas, horasPlan: c.horas, progreso: hecho(ctx, claveHito.cert(c.id)) }));
  else if (b.hitos?.length) hijos = b.hitos.map((h, i) => ({ id: `${b.id}:hito:${i + 1}`, nombre: `${h.tema}: ${h.hito}`, nivel: 'hito' as const, inicio: ll(h.inicio), fin: ll(h.fin), progreso: hecho(ctx, claveHito.mate(b.id, i)), ...(h.hitoAConfirmar || h.capitulosAConfirmar ? { aConfirmar: true } : {}) }));
  if (hijos && !hijos.length) hijos = undefined;
  const real = ctx.horasReal?.(b.id);
  // Un proyecto lleva el estimado (el fin del bloque) y la fecha límite de su última versión.
  const dl = hijos?.reduce<string | undefined>((m, h) => (h.deadline && (!m || h.deadline > m) ? h.deadline : m), undefined);
  return {
    id: b.id, nombre: b.nombre, nivel: 'bloque', inicio: b.inicio, fin: b.fin,
    ...(dl && dl > b.fin ? { deadline: dl } : {}),
    ...(b.horas ? { horasPlan: b.horas } : {}),
    ...(real != null ? { horasReal: real } : {}),
    ...(hijos ? { hijos } : { progreso: hecho(ctx, claveHito.bloque(b.id)) }),
  };
}

/** El árbol entero: las 4 etapas con sus fases y bloques (sin P0, P1V0 archivado ni pausas). */
export function arbolPlan(cal: Fechado[], ctx: Ctx): Periodo[] {
  const bloques = cal.filter((b) => !b.pausa && !b.archivado && b.fase);
  return PLAN_EXT.etapas.map((e) => ({
    id: `etapa-${e.n}`, nombre: `Etapa ${e.n} · ${e.nombre}`, nivel: 'etapa' as const, inicio: e.inicio!, fin: e.fin!,
    hijos: (PLAN_EXT.fases ?? []).filter((f) => f.etapa === e.n).map((f) => ({
      id: f.id, nombre: `Fase ${f.id.slice(1)} · ${f.nombre}`, nivel: 'fase' as const, inicio: f.inicio, fin: f.fin,
      ...(f.mercadoAConfirmar ? { aConfirmar: true } : {}),
      hijos: bloques.filter((b) => b.fase === f.id).map((b) => periodoBloque(b, ctx)),
    })),
  }));
}

export type AccionPeriodo = { tipo: 'hito'; clave: string } | { tipo: 'version'; proyecto: string; version: string };

/** Qué se tilda para marcar hecho un período hoja: un hito de `plan.hitos` o publicar la versión. */
export function accionDe(id: string): AccionPeriodo | null {
  const m = /^([^:]+):(.+)$/.exec(id);
  if (!m) return PLAN_EXT.bloques.some((b) => b.id === id) ? { tipo: 'hito', clave: claveHito.bloque(id) } : null;
  const [, b, resto] = m;
  let x: RegExpExecArray | null;
  if ((x = /^lote:(.+)$/.exec(resto))) return { tipo: 'hito', clave: claveHito.lote(b, x[1]) };
  if ((x = /^hito:(\d+)$/.exec(resto))) return { tipo: 'hito', clave: claveHito.mate(b, Number(x[1]) - 1) };
  if ((x = /^v(\d+\.\d+)$/.exec(resto))) return { tipo: 'version', proyecto: b, version: x[1] };
  if (PLAN_EXT.bloques.find((y) => y.id === b)?.certs?.some((c) => c.id === resto)) return { tipo: 'hito', clave: claveHito.cert(resto) };
  return null;
}

/** El bloque al que pertenece un período (para sugerir correr lo que sigue). */
export const bloqueDe = (id: string) => id.split(':')[0];

/** v12.4 · los tipos de bloque que absorben atrasos: consolidación, cierres de etapa y cierre final (en ese orden). Los descansos ya no son bloques: son días libres fijos y no se usan nunca. */
export const ABSORBEN = new Set(['colchon', 'cierre']);

/**
 * La secuencia para sugerir corrimientos: los bloques del plan en orden (sin P0, P1V0 ni la pausa fija), con los absorbedores
 * marcados y las certificaciones con un examen reservado como fijas.
 */
export function secuenciaPlan(cal: Fechado[], reservas: { inicio: string; fin: string }[] = []) {
  return cal
    .filter((b) => !b.pausa && !b.archivado && b.id !== 'P0')
    .map((b) => ({
      id: b.id, nombre: b.nombre, inicio: b.inicio, fin: b.fin,
      ...(ABSORBEN.has(b.tipo) ? { absorbe: true } : {}),
      ...(b.tipo === 'cert' && reservas.some((r) => r.inicio >= b.inicio && r.inicio <= b.fin) ? { fija: true } : {}),
    }));
}
