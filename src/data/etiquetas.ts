/**
 * La línea de rama de cada meta en Hoy ("↳ programacion · P1 · semana 3 de 4"), su color y el
 * título del bloque de programación con el proyecto activo.
 */
import { AREAS } from './defaults';
import { PLAN, bimestreDelPlan, enPlan, corteHandyx, faseTrabajo, nombreTramo, tramoActivo, ventanaW } from './plan';
import type { PlanState } from './plan-state';
import { RAMA_COLOR } from './ramas';
import { focusUnit } from './study';
import type { StudyState } from './study-types';
import { fmtDur, fmtFecha } from './time';
import type { Block, DayLog } from './types';

/** Color del cuadrado y de la etiqueta: el de la rama; main va con el del área; sin rama (fuera del plan), gris. */
export function colorDeBloque(b: Pick<Block, 'rama' | 'area'>, delPlan: boolean) {
  if (!b.rama) return delPlan ? 'var(--sub)' : AREAS[b.area].css;
  return b.rama === 'main' ? AREAS[b.area].css : RAMA_COLOR[b.rama];
}

/** Título que se muestra: el bloque de programación lleva el proyecto activo ("Programación · Faro v1"). */
export function tituloDeBloque(b: Pick<Block, 'rama' | 'key' | 'title'>, date: string, t0?: string) {
  if (b.rama !== 'programacion' || b.key !== 'prog') return b.title;
  return programacionDelPlan(date, t0) ?? b.title;
}

/** "Programación · Faro v1" (o la certificación) en vez de "Python": lo que se programa hoy según el plan. */
export function programacionDelPlan(date: string, t0?: string) {
  if (!enPlan(date, t0)) return null;
  const t = tramoActivo(date, t0);
  if (t.tipo === 'proyecto') return `Programación · ${nombreTramo(t, false)}`;
  if (t.tipo === 'cert') return `Programación · ${t.corto ?? t.nombre}`;
  return null;
}

export interface Ctx {
  day: DayLog;
  t0?: string;
  plan: PlanState;
  study: StudyState;
}

/** "programacion · P1 · semana 3 de 4", "trabajo · semana 4 de 8 · 45 min hoy", "fuera del plan". */
export function etiquetaDeBloque(b: Block, { day, t0, plan, study }: Ctx): string | null {
  if (!day.dayType) return null; // días de antes del plan
  if (!b.rama) return 'fuera del plan';
  const date = day.date;
  const bim = bimestreDelPlan(date, t0);
  switch (b.rama) {
    case 'main':
      return b.key === 'cierre' ? 'main · JSON del día' : 'main · rutina';
    case 'matematica': {
      const w = ventanaW(date, t0).ahora;
      if (w && b.key !== 'math') return `matematica · ventana ${w.id}`;
      const a = study.activities.find((x) => x.id === 'conamat');
      const u = a ? focusUnit(a, study, date) : undefined;
      if (b.key === 'repaso') return 'matematica · repasos del día';
      return u && a?.units ? `matematica · ${a.title.split(' · ').pop()} cap. ${u.n} de ${a.units.length}` : `matematica · ${PLAN.metasBimestre.matematica[bim.n - 1]}`;
    }
    case 'programacion': {
      const t = tramoActivo(date, t0);
      if (t.tipo === 'proyecto') return b.key === 'prog' ? `programacion · ${t.id} · semana ${t.semana} de ${t.semanas}` : `programacion · ${nombreTramo(t, false)}`;
      if (t.tipo === 'cert') return `programacion · ${t.id} · ${t.corto} · semana ${t.semana} de ${t.semanas}`;
      return `programacion · ${t.nombre.toLowerCase()}`;
    }
    case 'trabajo': {
      const f = faseTrabajo(date, t0);
      if (f.id !== 'busqueda') return `trabajo · ${PLAN.metasBimestre.trabajo[bim.n - 1].toLowerCase()}`;
      const s = Math.min(f.hasta, Math.max(1, bim.desde + bim.semana - 1));
      return `trabajo · semana ${s} de ${f.hasta} · ${fmtDur(b.min)} hoy`;
    }
    case 'ingles': {
      const ent = plan.entrevistas.filter((e) => e.fecha >= date).sort((x, y) => x.fecha.localeCompare(y.fecha))[0];
      if (b.key === 'ingles-entrevista' && ent) {
        const [dia, n] = fmtFecha(ent.fecha).split(' ');
        return `ingles · entrevista del ${dia.slice(0, 3).toLowerCase()} ${n}`;
      }
      return `ingles · ${PLAN.metasBimestre.ingles[bim.n - 1].toLowerCase()}`;
    }
    case 'handyx': {
      const c = corteHandyx(date, t0);
      return c ? `handyx · ${c.nombre} · semana ${c.semana} de ${c.semanas}` : `handyx · ${PLAN.metasBimestre.handyx[bim.n - 1].toLowerCase()}`;
    }
    case 'salud':
      return b.kind === 'entreno' ? 'salud · fuerza' : `salud · ${PLAN.metasBimestre.salud[bim.n - 1].toLowerCase()}`;
  }
}
