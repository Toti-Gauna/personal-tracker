/**
 * Ola 32 · hardware y cuentas por fase, y los trámites (roadmap v7): qué hay que comprar o hacer, para qué proyecto y antes de cuándo.
 * Las fechas son las del roadmap. Lo diferido (sensor de presión y caudalímetro: PetrIA va solo con Wokwi) y lo opcional no cuentan
 * como pendiente. Puro.
 */
import raw from '../../data/compras.json';
import type { PlanState } from './plan-state';
import { daysBetween } from './time';

export interface FaseCompra { id: string; nombre: string; antes: string | null; periodo?: string; para: string }
export interface ItemCompra { id: string; fase: string; nombre: string; costo?: string; nota?: string; diferido?: string; opcional?: boolean; propuesta?: boolean }

const D = raw as unknown as { fases: FaseCompra[]; items: ItemCompra[] };
export const FASES_COMPRA = D.fases;
export const ITEMS_COMPRA = D.items;

/** Lo que cuenta como pendiente: ni diferido ni opcional. */
export const cuenta = (i: ItemCompra) => !i.diferido && !i.opcional;

export interface EstadoFase extends FaseCompra {
  items: (ItemCompra & { hecho?: { fecha: string; costo?: string } })[];
  pendientes: number;
  total: number;
  /** Días hasta la fecha límite (negativo: vencida); null sin fecha. */
  dias: number | null;
}

export function estadoCompras(p: Pick<PlanState, 'compras'>, hoy: string): EstadoFase[] {
  return FASES_COMPRA.map((f) => {
    const items = ITEMS_COMPRA.filter((i) => i.fase === f.id).map((i) => ({ ...i, ...(p.compras?.[i.id] ? { hecho: p.compras[i.id] } : {}) }));
    const cuentan = items.filter(cuenta);
    return { ...f, items, total: cuentan.length, pendientes: cuentan.filter((i) => !i.hecho).length, dias: f.antes ? daysBetween(hoy, f.antes) : null };
  });
}

export interface AlertaCompra { id: string; titulo: string; texto: string; fecha: string; href: string }

const MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const fmt = (d: string) => `${Number(d.slice(8))} ${MES[Number(d.slice(5, 7)) - 1]} ${d.slice(0, 4)}`;

/** Avisa 30 días antes de cada fecha límite con lo que falta (y después, como vencida); los trámites, desde ya hasta que estén hechos. */
export function alertasCompras(p: Pick<PlanState, 'compras'>, hoy: string, anticipacion = 30): AlertaCompra[] {
  const out: AlertaCompra[] = [];
  for (const f of estadoCompras(p, hoy)) {
    if (!f.pendientes) continue;
    const faltan = f.items.filter((i) => cuenta(i) && !i.hecho).map((i) => i.nombre);
    const lista = faltan.length > 3 ? `${faltan.slice(0, 3).join(', ')} y ${faltan.length - 3} más` : faltan.join(', ');
    if (f.antes == null) {
      if (f.id === 'tramites') out.push({ id: `compra-${f.id}`, fecha: hoy, href: '#/metas/compras', titulo: `Trámites: ${f.pendientes} sin hacer`, texto: `${f.para}. ${lista}.` });
      continue;
    }
    if (f.dias! > anticipacion) continue;
    out.push({
      id: `compra-${f.id}`, fecha: f.antes, href: '#/metas/compras',
      titulo: f.dias! < 0 ? `${f.nombre}: venció el ${fmt(f.antes)}` : `${f.nombre}: antes del ${fmt(f.antes)}`,
      texto: `Para ${f.para}. Falta: ${lista}.`,
    });
  }
  return out;
}
