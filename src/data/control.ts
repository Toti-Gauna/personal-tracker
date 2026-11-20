/**
 * Ola 27 (v3) · control: horas reales contra las planificadas, alertas del modo intensivo (días 10 y 20 de P1, con menos del 85 %),
 * matemática que habilita un proyecto que ya arranca y deuda de matemática en horas. Puro.
 */
import { horasDelDia } from './capacidad';
import { horasMateDelDia } from './mate-horas';
import { PLAN, T0_PLAN, TRAMOS, inicioDe, finDe, tramoActivo } from './plan';
import { PLAN_EXT } from './plan-extendido';
import { addDays, daysBetween } from './time';
import type { DayLog } from './types';

export const UMBRAL_HORAS = 0.85;
/** Días del modo intensivo (desde el inicio de P1) en que se mide si vas con menos del 85 %. */
export const DIAS_CONTROL = [10, 20];

export interface RegistroDia { fecha: string; proyecto: string; progReal: number; progPlan: number; mateReal: number; matePlan: number }

const redondeo = (x: number) => Math.round(x * 10) / 10;

/** Horas reales de foco por rama en un día. */
export function realesDelDia(day: DayLog | undefined, rama: 'programacion' | 'matematica'): number {
  if (!day) return 0;
  const ramaDe = new Map(day.blocks.map((b) => [b.key, b.rama]));
  return redondeo(day.focus.filter((f) => ramaDe.get(f.key) === rama).reduce((s, f) => s + f.focusMin, 0) / 60);
}

export interface CfgControl { t0: string; inicioTrabajo: string; ventanas?: { inicio: string; fin: string }[] }

/** El registro diario: horas reales de programación y de matemática contra las planificadas, y a qué proyecto o tramo cuentan. */
export function registroDiario(days: Record<string, DayLog>, desde: string, hasta: string, c: CfgControl): RegistroDia[] {
  const ventanas = c.ventanas ?? TRAMOS.filter((t) => t.tipo === 'ventana').map((t) => ({ inicio: inicioDe(t, c.t0), fin: finDe(t, c.t0) }));
  const out: RegistroDia[] = [];
  for (let d = desde; d <= hasta; d = addDays(d, 1)) {
    out.push({
      fecha: d, proyecto: tramoActivo(d, c.t0).id,
      progReal: realesDelDia(days[d], 'programacion'), progPlan: redondeo(horasDelDia(d, { t0: c.t0, inicioTrabajo: c.inicioTrabajo, pausas: true })),
      mateReal: realesDelDia(days[d], 'matematica'), matePlan: redondeo(horasMateDelDia(d, { inicioTrabajo: c.inicioTrabajo, ventanas })),
    });
  }
  return out;
}

/** Primer día del modo intensivo: el inicio de P1 en el calendario (v7: jueves 19 nov 2026); sin calendario, una semana después de T0. */
export function inicioIntensivo(c: Pick<CfgControl, 't0'>): string {
  const p1 = TRAMOS.find((t) => t.id === 'P1');
  return p1?.inicio ? inicioDe(p1, c.t0) : addDays(c.t0, 7);
}

/** Día del modo intensivo (el 1 es el primero de P1). 0 antes y después del modo. */
export function diaIntensivo(fecha: string, c: Pick<CfgControl, 't0' | 'inicioTrabajo'>): number {
  const ini = inicioIntensivo(c);
  if (fecha < ini || fecha >= c.inicioTrabajo) return 0;
  return daysBetween(ini, fecha) + 1;
}

export interface ControlHoras { dia: number; planificadas: number; reales: number; porcentaje: number; debajo: boolean }

/** Horas de programación reales contra las planificadas desde el inicio del modo intensivo hasta ayer. */
export function controlHoras(fecha: string, days: Record<string, DayLog>, c: Pick<CfgControl, 't0' | 'inicioTrabajo'>): ControlHoras | null {
  const dia = diaIntensivo(fecha, c);
  if (!dia) return null;
  const ini = inicioIntensivo(c);
  let plan = 0;
  let real = 0;
  for (let d = ini; d < fecha; d = addDays(d, 1)) { plan += horasDelDia(d, { t0: c.t0, inicioTrabajo: c.inicioTrabajo, pausas: true }); real += realesDelDia(days[d], 'programacion'); }
  const porcentaje = plan > 0 ? real / plan : 1;
  return { dia, planificadas: redondeo(plan), reales: redondeo(real), porcentaje, debajo: plan > 0 && porcentaje < UMBRAL_HORAS };
}

/**
 * Lo que se recorta si P1 o P2 se pasan de horas (`recortarPrimero`). Con la v7 queda vacío: si una versión se atrasa, se mueven
 * fechas, no se recorta profundidad.
 */
export function ordenDeRecortes(): string[] {
  return ['P1', 'P2'].flatMap((id) => PLAN_EXT.bloques.find((b) => b.id === id)?.recortarPrimero ?? []).map((n) => n.replace(/ \(.*\)$/, ''));
}

export interface AvisoControl { id: string; titulo: string; texto: string; fecha: string; href?: string }

const pct = (x: number) => `${Math.round(x * 100)} %`;
const n1 = (x: number) => String(x).replace('.', ',');

/**
 * Alerta de los días 10 y 20 del modo intensivo: si las horas reales de programación quedan debajo del 85 % de las planificadas, ofrece los
 * recortes en orden. Se muestra el día del control y los dos siguientes.
 */
export function alertaHorasIntensivo(fecha: string, days: Record<string, DayLog>, c: Pick<CfgControl, 't0' | 'inicioTrabajo'>): AvisoControl | null {
  for (const n of [...DIAS_CONTROL].reverse()) {
    const controlEl = addDays(inicioIntensivo(c), n - 1);
    if (fecha < controlEl || fecha > addDays(controlEl, 2)) continue;
    const h = controlHoras(controlEl, days, c);
    if (!h?.debajo) return null;
    const recortes = ordenDeRecortes();
    return {
      id: `horas-dia-${n}`, fecha: controlEl, href: '#/metas/calibracion',
      titulo: `Día ${n} del modo intensivo: ${pct(h.porcentaje)} de las horas planificadas`,
      texto: `${n1(h.reales)} h de programación contra ${n1(h.planificadas)} h planificadas (menos del ${pct(UMBRAL_HORAS)}). ${recortes.length ? `Recortá en este orden: ${recortes.join(', ')}.` : 'No se recorta profundidad: el calendario se recalcula con tus horas reales y se corren las fechas (mirá la diferencia contra el roadmap).'} Nunca el sueño, el entrenamiento ni los repasos.`,
    };
  }
  return null;
}

/** Los diarios de matemática y los proyectos que habilitan (solo los que el plan nombra: "todo lo demás" se ignora). */
export function habilitaciones(): { tramo: string; proyecto: string }[] {
  return Object.entries(PLAN_EXT.matematica.diarios).flatMap(([tramo, x]) => x.habilita.filter((h) => /^[A-Z]\d+$/.test(h)).map((proyecto) => ({ tramo, proyecto })));
}

/**
 * Alerta cuando un proyecto arranca (o ya está en curso) antes de que termine el tramo diario de matemática que lo habilita.
 * Aparece desde 14 días antes del arranque hasta que el tramo termina (o el proyecto cierra).
 */
export function alertasMatematica(fecha: string, t0: string = T0_PLAN): AvisoControl[] {
  const out: AvisoControl[] = [];
  for (const { tramo, proyecto } of habilitaciones()) {
    const p = TRAMOS.find((t) => t.id === proyecto);
    const m = PLAN.matematica.tramos.find((x) => x.id === tramo);
    if (!p || !m?.fin) continue;
    const pIni = inicioDe(p, t0);
    const pFin = finDe(p, t0);
    const mFin = addDays(m.fin, daysBetween(PLAN.t0, t0));
    if (!(pIni < mFin) || fecha < addDays(pIni, -14) || fecha > pFin || fecha > mFin) continue;
    const nota = proyecto === 'P7' ? ' La pieza de PCA y SVD de P7 pasa después de W3 o a P9.' : '';
    out.push({
      id: `mate-${tramo}-${proyecto}`, fecha: pIni, href: `#/estudio/mate/${tramo}`,
      titulo: `${proyecto} arranca antes de que termine ${tramo}`,
      texto: `${proyecto} empieza el ${pIni} y el tramo diario ${tramo} (${n1(m.horas ?? 0)} h de matemática) termina el ${mFin}. Seguí con la matemática diaria: lo que el proyecto pide de ahí no está visto todavía.${nota}`,
    });
  }
  return out;
}

/** Deuda de matemática del modo intensivo: 1 h por día respecto de las 2 h de antes, desde el inicio de P1 hasta ayer (o hasta el inicio del trabajo). */
export function deudaMatematica(fecha: string, c: Pick<CfgControl, 't0' | 'inicioTrabajo'>): { horas: number; dias: number } {
  const ini = inicioIntensivo(c);
  const hasta = fecha < c.inicioTrabajo ? fecha : c.inicioTrabajo;
  const dias = Math.max(0, daysBetween(ini, hasta));
  return { horas: dias, dias };
}
