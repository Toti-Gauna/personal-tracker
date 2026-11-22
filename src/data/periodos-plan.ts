/**
 * v12.1 · el plan como árbol de períodos: Etapa › Fase › Bloque › (Versión › Lote | Cert | Hito de matemática). Las fechas salen
 * del calendario vivo (los bloques v12.1 tienen fechas explícitas) y lo hecho, de lo que ya guarda el plan: versiones publicadas
 * (`plan.versiones`) y hitos marcados (`plan.hitos`, con las claves de `claveHito`). P0 (Constelación v1) queda fuera del árbol:
 * sus metas son las de siempre (formato viejo) y se leen aparte.
 */
import { fichaV7 } from './proyectos-v7';
import type { BloqueExt } from './plan-extendido';
import { PLAN_EXT } from './plan-extendido';
import type { Periodo } from './periodos';
import type { PlanState } from './plan-state';

/** Las claves de `plan.hitos` para lo que se tilda en el árbol. */
export const claveHito = {
  lote: (bloque: string, lote: string) => `v12:${bloque}:lote:${lote}`,
  cert: (cert: string) => `v12:cert:${cert}`,
  mate: (bloque: string, i: number) => `v12:${bloque}:hito:${i + 1}`,
  bloque: (bloque: string) => `v12:${bloque}`,
  version: (bloque: string, version: string) => `v12:${bloque}:v${version}`,
};

type Fechado = BloqueExt & { inicio: string; fin: string; pausa?: boolean };
type Ctx = { plan: Pick<PlanState, 'hitos' | 'versiones'>; horasReal?: (bloque: string) => number | undefined };

const hecho = (ctx: Ctx, k: string) => (ctx.plan.hitos?.[k]?.hecho ? 1 : 0);

function versiones(b: Fechado, ctx: Ctx): Periodo[] {
  const f = fichaV7(b.id);
  if (!f) return [];
  const lotes = b.lotes ?? [];
  return f.versiones.filter((v) => v.inicio && v.fin && !v.enCurso).map((v) => {
    const dl = (v as { deadline?: string }).deadline;
    const publicada = ctx.plan.versiones?.[b.id]?.[v.id]?.publicada || ctx.plan.hitos?.[claveHito.version(b.id, v.id)]?.hecho;
    let previo = v.inicio!;
    const hijos: Periodo[] = lotes.filter((l) => l.version === v.id).map((l) => {
      const ini = previo < l.estimado ? previo : l.estimado;
      previo = l.estimado;
      return { id: `${b.id}:lote:${l.id}`, nombre: `Lote ${l.id} · ${l.nombre}`, nivel: 'lote' as const, inicio: ini, fin: l.estimado, ...(l.deadline !== l.estimado ? { deadline: l.deadline } : {}), peso: l.horas, horasPlan: l.horas, progreso: hecho(ctx, claveHito.lote(b.id, l.id)) };
    });
    return {
      id: `${b.id}:v${v.id}`, nombre: `v${v.id} ${v.nombre}`, nivel: 'version' as const, inicio: v.inicio!, fin: v.fin!,
      ...(dl && dl !== v.fin ? { deadline: dl } : {}),
      ...(v.horas != null ? { horasPlan: v.horas } : {}),
      ...(publicada ? { progreso: 1 } : hijos.length ? {} : { progreso: 0 }),
      ...(hijos.length ? { hijos } : {}),
    };
  });
}

/** Un bloque del calendario como período, con sus hijos según el tipo. */
export function periodoBloque(b: Fechado, ctx: Ctx): Periodo {
  let hijos: Periodo[] | undefined;
  if (b.tipo === 'proyecto') hijos = versiones(b, ctx);
  else if (b.certs?.length) hijos = b.certs.map((c) => ({ id: `${b.id}:${c.id}`, nombre: c.nombre, nivel: 'cert' as const, inicio: b.inicio, fin: c.examen < b.inicio ? b.inicio : c.examen, peso: c.horas, horasPlan: c.horas, progreso: hecho(ctx, claveHito.cert(c.id)) }));
  else if (b.hitos?.length) hijos = b.hitos.map((h, i) => ({ id: `${b.id}:hito:${i + 1}`, nombre: `${h.tema}: ${h.hito}`, nivel: 'hito' as const, inicio: h.inicio, fin: h.fin, progreso: hecho(ctx, claveHito.mate(b.id, i)), ...(h.hitoAConfirmar || h.capitulosAConfirmar ? { aConfirmar: true } : {}) }));
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
