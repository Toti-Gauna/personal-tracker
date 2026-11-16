/**
 * La línea de rama de cada meta en Hoy ("↳ programacion · P1 · semana 3 de 4"), su color y el
 * título del bloque de programación con el proyecto activo.
 */
import { AREAS } from './defaults';
import { faseIdiomaEn, tituloIdiomaDelDia } from './idiomas';
import { mesClipEn, mesDe as mesClipDe } from './clipping';
import { PLAN, bimestreDelPlan, enPlan, corteHandyx, faseTrabajo, nombreTramo, tramoActivo, ventanaW } from './plan';
import type { PlanState } from './plan-state';
import { RAMA_COLOR } from './ramas';
import { focusUnit } from './study';
import type { StudyState } from './study-types';
import { fmtDur, fmtFecha } from './time';
import type { Block, DayLog } from './types';

/** Color del cuadrado y de la etiqueta: el de la rama; main va con el del área; sin rama (fuera del plan), gris. */
export function colorDeBloque(b: Pick<Block, 'rama' | 'area'>, delPlan: boolean) {
  // Sin rama: gris dentro del plan, salvo el clipping, que lleva el color de Eclipse (Ola 8b).
  if (!b.rama) return delPlan && b.area !== 'eclipse' ? 'var(--sub)' : AREAS[b.area].css;
  return b.rama === 'main' ? AREAS[b.area].css : RAMA_COLOR[b.rama];
}

/** Título que se muestra: el bloque de programación lleva el proyecto activo ("Programación · Faro v1"). */
export function tituloDeBloque(b: Pick<Block, 'rama' | 'key' | 'title'>, date: string, t0?: string) {
  // Ola 21: el bloque de idiomas dice lo que toca esa semana ("Inglés · Measure What Matters").
  if (b.key === 'ingles') return tituloIdiomaDelDia(date, t0);
  // Ola 23: el clipping dice el mes del Roadmap Clipper ("Clipping · Mes 1").
  if (b.key === 'clipping' && mesClipDe(date) >= 1 && mesClipDe(date) <= 12) return `Clipping · Mes ${mesClipDe(date)}`;
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
  if (!b.rama) return b.key === 'clipping' ? etiquetaClipping(day.date) : 'fuera del plan';
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
      { const f = faseIdiomaEn(date, t0); return `ingles · ${f.nombre.toLowerCase()} · semana ${f.semana} de ${f.semanas}`; }
    }
    case 'handyx': {
      const c = corteHandyx(date, t0);
      return c ? `handyx · ${c.nombre} · semana ${c.semana} de ${c.semanas}` : `handyx · ${PLAN.metasBimestre.handyx[bim.n - 1].toLowerCase()}`;
    }
    case 'salud':
      return b.kind === 'entreno' ? 'salud · fuerza' : `salud · ${PLAN.metasBimestre.salud[bim.n - 1].toLowerCase()}`;
  }
}

/** "clipping · mes 1 · 5 clips/día · 3 cuentas" (ola 23). */
function etiquetaClipping(date: string) {
  const n = mesClipDe(date);
  if (n < 1 || n > 12) return 'clipping · fuera del roadmap';
  const m = mesClipEn(date);
  return `clipping · mes ${n} · ${m.clipsDia} clips/día · ${m.cuentas} cuentas`;
}
