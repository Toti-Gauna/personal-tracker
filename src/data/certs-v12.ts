/**
 * v12.1 · las certificaciones por dentro: la fecha del examen (la reservada manda: es fija), el plan de los días, los simulacros
 * contra el puntaje para estar listo, la renovación (validez habitual del proveedor, "a verificar") y los avisos para reservar. Puro.
 */
import { claveHito } from './periodos-plan';
import { PLAN_EXT, type CertV12, type RecordatorioV12 } from './plan-extendido';
import type { PlanState } from './plan-state';
import { addDays, daysBetween } from './time';

export interface CertConBloque extends CertV12 { bloque: string; bloqueNombre: string }

export const CERTS_V12: CertConBloque[] = PLAN_EXT.bloques.flatMap((b) => (b.certs ?? []).map((c) => ({ ...c, bloque: b.id, bloqueNombre: b.nombre })));
export const certV12 = (id: string) => CERTS_V12.find((c) => c.id === id);

type Plan = Pick<PlanState, 'hitos' | 'mocks' | 'reservas'>;

export interface EstadoCert {
  cert: CertConBloque;
  /** La fecha del examen: la reservada o la del plan. */
  examen: string;
  reservado: boolean;
  aprobada: string | null;
  diasAlExamen: number;
  mocks: { fecha: string; pct: number }[];
  /** El mejor de los últimos dos simulacros (el criterio de "listo" pide sostenerlo). */
  ultimo: number | null;
  /** Lo que pide para estar listo: un % o un criterio en texto. */
  meta: number | string | null;
  listo: boolean | null;
  /** El paso del plan que toca hoy, si hay. */
  hoy: { fecha: string; texto: string } | null;
  renovacion: { vence: string | null; nota: string } | null;
}

export function estadoCert(c: CertConBloque, plan: Plan, hoy: string): EstadoCert {
  const r = plan.reservas?.[c.id];
  const examen = r?.examen ?? c.examen;
  const aprobada = plan.hitos?.[claveHito.cert(c.id)]?.hecho ?? null;
  const mocks = plan.mocks?.[c.id] ?? [];
  const ultimo = mocks.length ? Math.max(...mocks.slice(-2).map((m) => m.pct)) : null;
  const meta = c.listo ?? null;
  const listo = typeof meta === 'number' ? (ultimo == null ? false : ultimo >= meta) : null;
  const anos = c.renovacion?.anos;
  return {
    cert: c, examen, reservado: !!r, aprobada, diasAlExamen: daysBetween(hoy, examen), mocks, ultimo, meta, listo,
    hoy: c.plan.find((p) => p.fecha === hoy) ?? null,
    renovacion: c.renovacion ? { vence: aprobada && anos ? `${Number(aprobada.slice(0, 4)) + anos}${aprobada.slice(4)}` : null, nota: c.renovacion.nota } : null,
  };
}

/** Las fechas fijas que agregan las reservas: el día de cada examen reservado. */
export const fijasDeReservas = (plan: Pick<PlanState, 'reservas'>) => Object.values(plan.reservas ?? {}).map((r) => ({ inicio: r.examen, fin: r.examen }));

export interface Recordatorio extends RecordatorioV12 { faltan: string[] }

/**
 * Los avisos de reserva que tocan hoy: desde su fecha y hasta que reserves todos sus exámenes (o lo marques hecho, si no trae
 * exámenes del plan, como el Cambridge C1). Se ven desde 7 días antes, para tener tiempo de elegir la fecha.
 */
export function recordatoriosActivos(plan: Plan, hoy: string, lista = PLAN_EXT.recordatorios ?? []): Recordatorio[] {
  return lista.flatMap((r) => {
    if (addDays(r.fecha, -7) > hoy || plan.hitos?.[`v12:recordatorio:${r.id}`]?.hecho) return [];
    const faltan = (r.certs ?? []).filter((id) => !plan.reservas?.[id] && !plan.hitos?.[claveHito.cert(id)]?.hecho);
    if (r.certs?.length && !faltan.length) return [];
    return [{ ...r, faltan }];
  });
}
