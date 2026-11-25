/**
 * v12.4 · el atraso acumulado de la pista principal (respuesta 8). 14 dic 2028 es una estimación, no una fecha límite, y no hay buffer:
 * los absorbedores ya miden 3 días, así que cualquier atraso corre el fin. Cuando el atraso acumulado pasa los 7 días, Hoy y la revisión
 * del domingo lo dicen con el nuevo fin estimado y una sugerencia: pausar primero lo comercial y después lo secundario (la hora de
 * cada pista vuelve a la principal). Solo avisa y sugiere: nada se mueve sin tu confirmación. Puro.
 */
import { fijasDeReservas } from './certs-v12';
import { horasDelDia } from './capacidad';
import { pistasActivas, type PistaFondo } from './pistas-dia';
import { finProyectado, recorrer, sugerirCorrimiento, type PeriodoMedido } from './periodos';
import { bloqueDe, secuenciaPlan } from './periodos-plan';
import { PLAN_EXT } from './plan-extendido';
import type { PlanState } from './plan-state';
import { addDays, daysBetween } from './time';

/** A partir de cuántos días de atraso se avisa. */
export const UMBRAL_ATRASO_DIAS = 7;

export interface PistaSugerida { pista: PistaFondo; diasRecuperados: number; horas: number }
export interface AtrasoPrincipal {
  /** Días de atraso acumulado del fin del plan contra el plan v12.4 (los corrimientos ya confirmados cuentan). Negativo: adelantado. */
  dias: number;
  /** El fin del plan v12.4. */
  finPlan: string;
  /** El fin estimado hoy: con los corrimientos confirmados y lo que falta correr del bloque más atrasado. */
  finEstimado: string;
  /** El bloque que más atrasa lo que falta (el primero atrasado), si hay uno. */
  bloque?: { id: string; nombre: string };
  /** ¿Pasa el umbral (más de 7 días)? */
  excede: boolean;
  /** Qué pausar y cuánto recupera, en el orden: primero lo comercial, después lo secundario. Solo las pistas con algo activo desde hoy. */
  sugerencias: PistaSugerida[];
}

/** La hora de la pista que vuelve a la principal si se pausa desde `desde` hasta `hasta`, y cuántos días de foco eso compra. */
export function recuperaPausando(pista: PistaFondo, desde: string, hasta: string): { horas: number; dias: number } {
  const cfg = { t0: PLAN_EXT.t0, inicioTrabajo: '2126-10-23' };
  let extra = 0;
  let total = 0;
  let n = 0;
  for (let d = desde; d <= hasta; d = addDays(d, 1)) {
    if (!pistasActivas(d).includes(pista)) { const h = horasDelDia(d, cfg); if (h > 0) { total += h; n++; } continue; }
    extra += horasDelDia(d, { ...cfg, pausadas: [pista] }) - horasDelDia(d, cfg);
    const h = horasDelDia(d, cfg);
    if (h > 0) { total += h; n++; }
  }
  const promedio = n ? total / n : 9;
  return { horas: Math.round(extra * 10) / 10, dias: Math.floor(extra / promedio) };
}

export function atrasoPrincipal(arbol: PeriodoMedido[], cal: Parameters<typeof secuenciaPlan>[0], plan: Pick<PlanState, 'proyectos' | 'hitos'> & Partial<PlanState>, hoy: string): AtrasoPrincipal {
  const base = PLAN_EXT.bloques.filter((b) => b.id !== 'P0' && b.id !== 'P1V0' && b.fechas);
  const finPlan = base[base.length - 1].fechas!.fin;
  const reservas = fijasDeReservas(plan as PlanState);
  const seq = secuenciaPlan(cal, reservas);
  const libres = [...(PLAN_EXT.capacidad?.fijas ?? []), ...reservas];
  let finEstimado = seq[seq.length - 1]?.fin ?? finPlan;
  let bloque: AtrasoPrincipal['bloque'];
  // Los bloques principales atrasados (el trabajo viene por debajo del tiempo, o ya pasó su fin con trabajo pendiente): el primero corre todo lo que sigue.
  const atrasados = [...recorrer(arbol)].filter((p) => p.nivel === 'bloque' && p.track === undefined && (p.estado === 'atrasado' || p.estado === 'vencido'));
  for (const p of atrasados) {
    const cs = sugerirCorrimiento(seq, bloqueDe(p.id), finProyectado(p, hoy), libres);
    const fin = cs[cs.length - 1]?.nuevoFin;
    if (fin && fin > finEstimado) { finEstimado = fin; bloque ??= { id: p.id, nombre: p.nombre }; }
  }
  const dias = daysBetween(finPlan, finEstimado);
  const excede = dias > UMBRAL_ATRASO_DIAS;
  const sugerencias: PistaSugerida[] = excede
    ? (['comercial', 'secundaria'] as const).flatMap((pista) => { const r = recuperaPausando(pista, hoy, finEstimado); return r.horas > 0 ? [{ pista, diasRecuperados: r.dias, horas: r.horas }] : []; })
    : [];
  return { dias, finPlan, finEstimado, ...(bloque ? { bloque } : {}), excede, sugerencias };
}
