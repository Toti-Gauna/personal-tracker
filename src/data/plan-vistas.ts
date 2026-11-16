/**
 * Ola 16c: lo que muestran las vistas del Plan T+18 extendido. Puro, sin estado.
 * - El roadmap de matemática único (absorbe la ola 15): los tramos diarios y las ventanas del
 *   plan, en las 4 etapas, con su perfil. M0 a M10 (data/study-roadmaps.json) aporta material de
 *   refuerzo por tipo de error.
 * - La línea de tiempo por etapas, el panel "hoy sos" y las alertas.
 */
import { alertasIdiomas } from './idiomas';
import { EXTRAS_APAGADOS, PLAN, T0_PLAN, fechas } from './plan';
import { PLAN_EXT, bloqueExtPorId, calendario, type BloqueExt, type BloqueFechado, type MateTramo, type RolRefuerzo } from './plan-extendido';
import type { PlanState } from './plan-state';
import { cierreProyecto, puertaAprobada } from './puertas';
import { daysBetween } from './time';
import { alertasClipping } from './clipping-metricas';
import type { ClippingState } from './clipping-state';

/** Regla del plan: 85 % o más aprueba y pasa a la tesis; 65 a 84 % refuerzo y retest; menos, vuelve. */
export const PUERTA = { verde: 0.85, amarillo: 0.65 };
export type Luz = 'verde' | 'amarillo' | 'rojo';
export const semaforoPuerta = (pct: number): Luz => (pct >= PUERTA.verde ? 'verde' : pct >= PUERTA.amarillo ? 'amarillo' : 'rojo');
export const TEXTO_LUZ: Record<Luz, string> = {
  verde: 'Aprobás: pasás a la tesis (explicarlo con tus palabras).',
  amarillo: 'Abrí el libro de refuerzo según el tipo de error y hacé el retest.',
  rojo: 'No pasás: volvés al tema.',
};

/** Qué libros de refuerzo abrir según el tipo de error (concepto → intuición, técnica → banco…). */
export function refuerzoPara(m: Pick<MateTramo, 'refuerzo'>, motivo: string) {
  const roles: RolRefuerzo[] = PLAN_EXT.matematica.reglaRefuerzo[motivo] ?? [];
  return m.refuerzo.filter((r) => roles.includes(r.rol)).sort((a, b) => roles.indexOf(a.rol) - roles.indexOf(b.rol));
}

/** El calendario completo (4 etapas) con los mismos extras apagados que el calendario vivo. */
export const calendarioCompleto = (t0?: string) =>
  calendario(PLAN_EXT, { t0, extras: Object.fromEntries(EXTRAS_APAGADOS.map((id) => [id, false])) });

export type EstadoItem = 'hecho' | 'actual' | 'proximo';

export interface ItemMate extends MateTramo {
  id: string;
  tipo: 'diario' | 'ventana';
  nombre: string;
  etapa: number;
  inicio: string;
  fin: string;
  semanas: number;
}

/**
 * El roadmap de matemática: en T+18, los tramos del calendario vivo (diarios y ventanas W1 a W4);
 * después, las ventanas de quant (WQ) y aeroespacial (WA).
 */
export function rutaMate(t0 = T0_PLAN): ItemMate[] {
  const cal = calendarioCompleto(t0);
  const fin1 = cal.filter((b) => b.etapa === 1).pop()!.hasta;
  const vivos: ItemMate[] = PLAN.matematica.tramos.map((m) => {
    const b = cal.find((x) => x.id === m.id);
    const diario = !b;
    const datos: MateTramo & { nombre?: string } = b?.mate ?? PLAN_EXT.matematica.diarios[m.id] ?? PLAN_EXT.matematica.diarios.m4;
    const { inicio, fin } = fechas(m.desde, m.hasta, t0);
    return {
      ...datos,
      id: m.id,
      tipo: diario ? 'diario' : 'ventana',
      nombre: diario ? datos.nombre ?? m.id : b!.nombre,
      etapa: b?.etapa ?? (m.desde <= fin1 ? 1 : 2),
      inicio, fin, semanas: m.hasta - m.desde + 1,
    };
  });
  const despues: ItemMate[] = cal.filter((b) => b.etapa > 2 && b.tipo === 'ventana' && b.mate).map((b) => ({
    ...b.mate!, id: b.id, tipo: 'ventana' as const, nombre: b.nombre, etapa: b.etapa, inicio: b.inicio, fin: b.fin, semanas: b.semanas,
  }));
  return [...vivos, ...despues];
}

export const estadoEn = (x: { inicio: string; fin: string }, hoy: string): EstadoItem => (x.fin < hoy ? 'hecho' : x.inicio <= hoy ? 'actual' : 'proximo');

/**
 * Hoy sos / vas a ser en matemática: el perfil del último tramo terminado (las ventanas, con la
 * puerta aprobada) y el del que está en curso.
 */
export function perfilMate(items: ItemMate[], hoy: string, plan: Pick<PlanState, 'proyectos'>) {
  const hechos = items.filter((x) => estadoEn(x, hoy) === 'hecho' && (x.tipo === 'diario' || !!puertaAprobada(plan, x.id) || !PLAN.programacion.puertas[x.id]));
  const actual = items.find((x) => estadoEn(x, hoy) === 'actual') ?? items.find((x) => estadoEn(x, hoy) === 'proximo') ?? null;
  return { sos: hechos.length ? hechos[hechos.length - 1].perfil : null, vasASer: actual?.perfil ?? null, actual };
}

// ——— Programación: etapas, hoy sos y alertas ———

export interface EtapaVista {
  n: number;
  nombre: string;
  perfil: string;
  inicio: string;
  fin: string;
  semanas: number;
  bloques: (BloqueFechado & { estado: EstadoItem })[];
  estado: EstadoItem;
}

export function lineaEtapas(hoy: string, t0 = T0_PLAN): EtapaVista[] {
  const cal = calendarioCompleto(t0);
  return PLAN_EXT.etapas.map((e) => {
    const bs = cal.filter((b) => b.etapa === e.n && b.semanas > 0).map((b) => ({ ...b, estado: estadoEn(b, hoy) }));
    const inicio = bs[0].inicio;
    const fin = bs[bs.length - 1].fin;
    return { n: e.n, nombre: e.nombre, perfil: e.perfil, inicio, fin, semanas: bs.reduce((s, b) => s + b.semanas, 0), bloques: bs, estado: estadoEn({ inicio, fin }, hoy) };
  });
}

/**
 * Hoy sos (programación): el perfil del último proyecto cerrado (examen, técnica y evidencia) o del
 * último hito pasado; vas a ser: el del proyecto en curso o el próximo.
 */
export function hoySos(hoy: string, plan: PlanState, t0 = T0_PLAN) {
  const cal = calendarioCompleto(t0);
  const cerrados = cal.filter((b) => b.tipo === 'proyecto' && cierreProyecto(plan, b.id));
  const ultimo = cerrados[cerrados.length - 1];
  const hito = PLAN_EXT.perfilesHito.filter((h) => { const b = cal.find((x) => x.id === h.despues); return b && b.fin < hoy && (b.tipo !== 'proyecto' || cierreProyecto(plan, b.id)); }).pop();
  const posHito = hito ? cal.findIndex((x) => x.id === hito.despues) : -1;
  const posUlt = ultimo ? cal.indexOf(ultimo) : -1;
  const sos = posHito > posUlt ? { perfil: hito!.perfil, desde: hito!.nota } : ultimo ? { perfil: ultimo.ficha?.perfil ?? ultimo.perfil ?? ultimo.nombre, desde: `${ultimo.id} cerrado` } : null;
  const prox = cal.find((b) => b.tipo === 'proyecto' && b.fin >= hoy && !cierreProyecto(plan, b.id));
  return { sos, vasASer: prox ? { perfil: prox.ficha?.perfil ?? prox.nombre, con: `${prox.id} · ${prox.nombre}`, fin: prox.fin } : null };
}

export interface Alerta {
  id: string;
  tipo: 'cert' | 'ventana' | 'decision' | 'idioma' | 'clipping';
  titulo: string;
  texto: string;
  href?: string;
  fecha: string;
}

/**
 * Alertas: certificaciones que empiezan en 8 semanas o menos (o en curso), ventanas que cierran en
 * 7 días o menos sin la puerta aprobada y decisiones abiertas con fecha en 14 días o menos.
 */
export function alertas(hoy: string, plan: PlanState, t0 = T0_PLAN, clipping?: ClippingState): Alerta[] {
  const cal = calendarioCompleto(t0);
  const out: Alerta[] = [];
  for (const b of cal) {
    if (b.tipo === 'cert' && b.fin >= hoy && daysBetween(hoy, b.inicio) <= 56) {
      const c = b.cert;
      out.push({
        id: `cert-${b.id}`, tipo: 'cert', fecha: b.inicio, href: `#/metas/proyecto/${b.id}`,
        titulo: b.inicio <= hoy ? `${b.cert ? b.nombre : b.id} en curso: examen el ${fmt(b.fin)}` : `${b.nombre} empieza el ${fmt(b.inicio)}`,
        texto: [c?.costo ? `${c.costo}${c.verificado ? '' : ' (sin verificar)'}` : 'Costo sin verificar', c?.requiere ? `exige ${c.requiere}` : '', 'reconfirmá precio y versión al reservar'].filter(Boolean).join(' · '),
      });
    }
    if (b.tipo === 'ventana' && b.fin >= hoy && daysBetween(hoy, b.fin) <= 7 && b.etapa <= 2 && !puertaAprobada(plan, b.id)) {
      const hab = b.mate?.habilita.join(' y ');
      out.push({ id: `vent-${b.id}`, tipo: 'ventana', fecha: b.fin, href: `#/estudio/mate/${b.id}`, titulo: `${b.id} cierra el ${fmt(b.fin)}`, texto: `Aprobá la puerta (85 %) para que ${hab ?? 'el proyecto'} arranque; si no, la programación sigue siendo matemática y se descuenta del colchón.` });
    }
  }
  for (const d of PLAN_EXT.decisiones) {
    if (d.fecha && d.fecha >= hoy && daysBetween(hoy, d.fecha) <= 14) out.push({ id: `dec-${d.id}`, tipo: 'decision', fecha: d.fecha, titulo: `Decisión el ${fmt(d.fecha)}`, texto: d.texto });
  }
  // Ola 21: exámenes de idiomas, trimestres y tesis anual.
  for (const a of alertasIdiomas(hoy, t0)) out.push({ ...a, tipo: 'idioma' });
  // Ola 23: las del clipping (lunes, viernes, fin de fase, mes 6, concentración y compuerta).
  if (clipping) for (const a of alertasClipping(hoy, clipping)) out.push({ ...a, tipo: 'clipping' });
  return out.sort((a, b) => a.fecha.localeCompare(b.fecha));
}

const MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const fmt = (d: string) => `${Number(d.slice(8))} ${MES[Number(d.slice(5, 7)) - 1]} ${d.slice(0, 4)}`;

/** Un bloque del plan extendido por id, con fechas (para las fichas de las etapas 3 y 4). */
export const bloqueConFechas = (id: string, t0 = T0_PLAN): (BloqueFechado & BloqueExt) | undefined => calendarioCompleto(t0).find((b) => b.id === id);

// ——— Ola 20 · nivel de salida de las ventanas ———

/** Los criterios del nivel de salida de una ventana (W1 a WA5). */
export const salidaDe = (id: string): string[] => bloqueExtPorId(id)?.mate?.salida ?? [];

/** Cuántos criterios de salida tildaste. Sirve de chequeo antes del test de la puerta (el test sigue mandando: 85 %). */
export function avanceSalida(plan: Pick<PlanState, 'salida'>, id: string) {
  const total = salidaDe(id).length;
  const hechos = (plan.salida?.[id] ?? []).filter((i) => i < total).length;
  return { hechos, total, completo: total > 0 && hechos === total };
}
