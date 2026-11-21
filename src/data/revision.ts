/**
 * Ola 32 · la revisión semanal del domingo (roadmap v7: "Trazo, learning.md, english.md, hours.md en el repo privado, plan"). Junta
 * lo de la semana: horas reales contra las planificadas, publicaciones y entrevistas simuladas contra su meta (cadencias de la v5: 2 y
 * 1 por semana), versiones publicadas, spots plantados y problemas sin IA. Puro.
 */
import { problemas } from './algoritmos';
import { registroDiario } from './control';
import { metasSemanaGeneradas } from './metas-plan';
import type { PlanState } from './plan-state';
import { addDays } from './time';
import type { DayLog } from './types';

export const PUNTOS_REVISION = [
  'Trazo: la semana que pasó y la que viene',
  'learning.md: los spots y lo aprendido',
  'english.md',
  'hours.md: las horas reales, en el repo privado',
  'El plan: la diferencia contra el roadmap',
];

/** Cadencias de la v5 si la semana no trae su meta: 2 publicaciones y 1 entrevista simulada. */
export const CADENCIA = { posts: 2, simulada: 1 } as const;

export const lunesDeFecha = (f: string) => addDays(f, -((new Date(`${f}T12:00:00`).getDay() + 6) % 7));

export interface ResumenSemana {
  lunes: string;
  domingo: string;
  horas: { prog: { real: number; plan: number }; mate: { real: number; plan: number } };
  contadores: { id: 'posts' | 'simulada'; nombre: string; v: number; meta: number; total: number }[];
  versiones: { proyecto: string; version: string; fecha: string }[];
  spots: { tema: string; fecha: string }[];
  problemas: number;
}

const r1 = (x: number) => Math.round(x * 10) / 10;

export function resumenSemana(
  lunes: string,
  hoy: string,
  ctx: { plan: PlanState; days: Record<string, DayLog>; t0: string; inicioTrabajo: string; intensiva?: boolean },
): ResumenSemana {
  const domingo = addDays(lunes, 6);
  const hasta = hoy < domingo ? hoy : domingo;
  const reg = hasta >= lunes ? registroDiario(ctx.days, lunes, hasta, { t0: ctx.t0, inicioTrabajo: ctx.inicioTrabajo }) : [];
  const suma = (k: 'progReal' | 'progPlan' | 'mateReal' | 'matePlan') => r1(reg.reduce((s, x) => s + x[k], 0));
  const metas = metasSemanaGeneradas(lunes, ctx.t0, { intensiva: ctx.intensiva });
  const cont = (id: 'posts' | 'simulada', nombre: string) => {
    const semana = ctx.plan.contadores[lunes]?.[id] ?? 0;
    const total = Object.values(ctx.plan.contadores).reduce((s, c) => s + (c[id] ?? 0), 0);
    return { id, nombre, v: semana, meta: metas.find((m) => m.clave === id)?.meta ?? CADENCIA[id], total };
  };
  const dentro = (f: string) => f >= lunes && f <= domingo;
  return {
    lunes, domingo,
    horas: { prog: { real: suma('progReal'), plan: suma('progPlan') }, mate: { real: suma('mateReal'), plan: suma('matePlan') } },
    contadores: [cont('posts', 'Publicaciones'), cont('simulada', 'Entrevistas simuladas')],
    versiones: Object.entries(ctx.plan.versiones ?? {}).flatMap(([proyecto, vs]) => Object.entries(vs).filter(([, e]) => e.publicada && dentro(e.publicada)).map(([version, e]) => ({ proyecto, version, fecha: e.publicada! }))),
    spots: Object.entries(ctx.plan.algoritmos ?? {}).filter(([, r]) => dentro(r.fecha)).map(([tema, r]) => ({ tema, fecha: r.fecha })),
    problemas: problemas(ctx.plan, lunes, domingo),
  };
}

/** ¿Está hecha la revisión de la semana de esa fecha? */
export const revisionHecha = (p: Pick<PlanState, 'revisionesSemanales'>, fecha: string) => !!p.revisionesSemanales?.[lunesDeFecha(fecha)]?.hecha;
