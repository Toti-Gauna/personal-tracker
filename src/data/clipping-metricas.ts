/**
 * Ola 23 · métricas puras del clipping. No tocan el estado: reciben la planilla y devuelven números.
 * Regla del pago real: sale solo de las filas con cobro cargado (cobrado ÷ views verificadas × 1.000).
 */
import { CLIP, curva, diasDelMes, faseDe, finMes, inicioMes, mesDe, mesPlan, MESES_CLIP } from './clipping';
import type { ClippingState, FilaClip, Retainer } from './clipping-state';
import { addDays } from './time';
import type { DayLog } from './types';

export interface Rango { desde: string; hasta: string }
export interface Filtro { cuenta?: string; campana?: string }

export const enRango = (f: FilaClip, r?: Rango) => !r || (f.fecha >= r.desde && f.fecha <= r.hasta);

export function filas(st: ClippingState, r?: Rango, filtro: Filtro = {}): FilaClip[] {
  return st.registro.filter((f) => enRango(f, r) && (!filtro.cuenta || f.cuenta === filtro.cuenta) && (!filtro.campana || f.campana === filtro.campana));
}

const ver = (f: FilaClip) => f.verificadas ?? f.views;

export interface Totales {
  clips: number;
  views: number;
  verificadas: number;
  aprobados: number;
  /** Clips de las filas que traen aprobados (la base de la tasa). */
  clipsConAprobados: number;
  mas1000: number;
  clipsConMas1000: number;
  estimado: number;
  cobrado: number;
  /** Views verificadas de las filas con cobro (la base del pago real). */
  viewsCobradas: number;
  /** Clips de las filas con cobro mayor a 0. */
  clipsPagados: number;
}

export function totales(fs: FilaClip[]): Totales {
  const t: Totales = { clips: 0, views: 0, verificadas: 0, aprobados: 0, clipsConAprobados: 0, mas1000: 0, clipsConMas1000: 0, estimado: 0, cobrado: 0, viewsCobradas: 0, clipsPagados: 0 };
  for (const f of fs) {
    t.clips += f.clips;
    t.views += f.views;
    t.verificadas += ver(f);
    if (f.aprobados != null) { t.aprobados += f.aprobados; t.clipsConAprobados += f.clips; }
    if (f.mas1000 != null) { t.mas1000 += f.mas1000; t.clipsConMas1000 += f.clips; }
    t.estimado += f.estimado ?? 0;
    if (f.cobrado != null) {
      t.cobrado += f.cobrado;
      t.viewsCobradas += ver(f);
      if (f.cobrado > 0) t.clipsPagados += f.aprobados ?? f.clips;
    }
  }
  return t;
}

const div = (a: number, b: number) => (b > 0 ? a / b : null);
const r2 = (x: number) => Math.round(x * 100) / 100;

/** Pago real por 1.000 views verificadas (null sin filas cobradas). */
export const pagoReal = (fs: FilaClip[]) => { const t = totales(fs); const v = div(t.cobrado * 1000, t.viewsCobradas); return v == null ? null : r2(v); };
/** Tasa de aprobación: aprobados ÷ clips (solo filas con aprobados). */
export const aprobacion = (fs: FilaClip[]) => { const t = totales(fs); return div(t.aprobados, t.clipsConAprobados); };
/** Parte de los clips con más de 1.000 views. */
export const pct1000 = (fs: FilaClip[]) => { const t = totales(fs); return div(t.mas1000, t.clipsConMas1000); };
/** Views promedio por clip. */
export const viewsPorClip = (fs: FilaClip[]) => { const t = totales(fs); const v = div(t.views, t.clips); return v == null ? null : Math.round(v); };

/** Retainer cobrando entre dos fechas (la prueba no cobra). */
const retainerEn = (r: Retainer, desde: string, hasta: string) => r.estado !== 'prueba' && r.desde <= hasta && (!r.hasta || r.hasta >= desde);

/** USD de retainers en un rango: el fijo de cada mes del roadmap que se superpone (prorrateado si el rango es corto). */
export function usdRetainers(st: ClippingState, r: Rango): number {
  const dias = Math.round((Date.parse(r.hasta) - Date.parse(r.desde)) / 864e5) + 1;
  return st.retainers.filter((x) => retainerEn(x, r.desde, r.hasta)).reduce((s, x) => s + x.usdMes * Math.min(1, dias / 30), 0);
}

/** Lo cobrado en el mes n del roadmap: filas con cobro más retainers. */
export function ingresoMes(st: ClippingState, n: number): number {
  const r = { desde: inicioMes(n), hasta: finMes(n) };
  const cob = totales(filas(st, r)).cobrado;
  const ret = st.retainers.filter((x) => retainerEn(x, r.desde, r.hasta)).reduce((s, x) => s + x.usdMes, 0);
  return r2(cob + ret);
}

export const ingresosPorMes = (st: ClippingState) => Array.from({ length: MESES_CLIP }, (_, i) => ingresoMes(st, i + 1));

/** Horas de foco del bloque de clipping entre dos fechas. */
export function horasClipping(days: Record<string, DayLog>, desde: string, hasta: string) {
  let m = 0;
  for (const [d, day] of Object.entries(days)) if (d >= desde && d <= hasta) for (const f of day.focus ?? []) if (f.key === 'clipping') m += f.focusMin;
  return Math.round((m / 60) * 10) / 10;
}

/** USD por hora trabajada (null sin horas). */
export function usdPorHora(st: ClippingState, days: Record<string, DayLog>, r: Rango) {
  const h = horasClipping(days, r.desde, r.hasta);
  const usd = totales(filas(st, r)).cobrado + usdRetainers(st, r);
  const v = div(usd, h);
  return v == null ? null : r2(v);
}

export interface MesVsMeta { n: number; meta: number; cobrado: number; pct: number; esperado: number; ritmo: number | null; diasHechos: number; diasTotal: number }

/** USD del mes contra la meta: acumulado, lo esperado a hoy y el ritmo (cobrado ÷ esperado). */
export function mesContraMeta(st: ClippingState, date: string): MesVsMeta | null {
  const n = mesDe(date);
  const m = mesPlan(n);
  if (!m) return null;
  const cobrado = ingresoMes(st, n);
  const { hechos, total } = diasDelMes(n, date);
  const esperado = (m.meta * hechos) / total;
  return { n, meta: m.meta, cobrado, pct: cobrado / m.meta, esperado: Math.round(esperado), ritmo: esperado > 0 ? cobrado / esperado : null, diasHechos: hechos, diasTotal: total };
}

export interface Parte { nombre: string; usd: number; pct: number }
export interface Concentracion { campana: Parte[]; plataforma: Parte[]; nicho: Parte[]; total: number; peor: (Parte & { dim: 'campaña' | 'plataforma' | 'nicho' }) | null }

const partes = (m: Map<string, number>, total: number): Parte[] => [...m].map(([nombre, usd]) => ({ nombre, usd: r2(usd), pct: total > 0 ? usd / total : 0 })).sort((a, b) => b.usd - a.usd);

/** De dónde sale el ingreso: por campaña (los retainers cuentan cada uno), plataforma y nicho. */
export function concentracion(st: ClippingState, r: Rango): Concentracion {
  const camp = new Map<string, number>();
  const plat = new Map<string, number>();
  const nicho = new Map<string, number>();
  const add = (m: Map<string, number>, k: string, v: number) => m.set(k, (m.get(k) ?? 0) + v);
  let total = 0;
  for (const f of filas(st, r)) {
    if (!f.cobrado) continue;
    const c = st.campanas.find((x) => x.id === f.campana);
    add(camp, c?.nombre ?? 'Sin campaña', f.cobrado);
    add(plat, c?.plataforma ?? 'Sin plataforma', f.cobrado);
    add(nicho, c?.nicho || 'Sin nicho', f.cobrado);
    total += f.cobrado;
  }
  for (const x of st.retainers.filter((y) => retainerEn(y, r.desde, r.hasta))) {
    const dias = Math.round((Date.parse(r.hasta) - Date.parse(r.desde)) / 864e5) + 1;
    const v = x.usdMes * Math.min(1, dias / 30);
    add(camp, `Retainer · ${x.nombre}`, v);
    add(plat, 'Retainers', v);
    add(nicho, 'Retainers', v);
    total += v;
  }
  const res = { campana: partes(camp, total), plataforma: partes(plat, total), nicho: partes(nicho, total), total: r2(total) };
  const cands = [
    ...(res.campana[0] ? [{ ...res.campana[0], dim: 'campaña' as const }] : []),
    ...(res.plataforma[0] ? [{ ...res.plataforma[0], dim: 'plataforma' as const }] : []),
  ];
  const peor = cands.sort((a, b) => b.pct - a.pct)[0] ?? null;
  return { ...res, peor };
}

/** Cuentas activas a una fecha (las que calientan no cuentan todavía). */
export const cuentasActivas = (st: ClippingState, date: string) => st.cuentas.filter((c) => c.estado === 'activa' && c.desde <= date).length;

export interface PlanVsReal { cuentas: number; cuentasPlan: number; clipsDia: number; clipsDiaPlan: number }

/** Cuentas activas y clips por día del mes, contra el plan. */
export function planContraReal(st: ClippingState, date: string): PlanVsReal | null {
  const n = mesDe(date);
  const m = mesPlan(n);
  if (!m) return null;
  const { hechos } = diasDelMes(n, date);
  const clips = totales(filas(st, { desde: inicioMes(n), hasta: date })).clips;
  return { cuentas: cuentasActivas(st, date), cuentasPlan: m.cuentas, clipsDia: hechos ? Math.round((clips / hechos) * 10) / 10 : 0, clipsDiaPlan: m.clipsDia };
}

export interface Proyeccion { ritmo: number; mes12: number; falta: number; base: number; meses: number[] }

/**
 * Proyección a 12 meses con el ritmo real: los últimos 2 meses cerrados contra su meta (o, en el
 * mes 1, lo que va del mes contra lo esperado a hoy). Null sin nada cobrado.
 */
export function proyeccion(st: ClippingState, date: string): Proyeccion | null {
  const n = Math.min(mesDe(date), MESES_CLIP + 1);
  if (n < 1) return null;
  const cerrados = Array.from({ length: Math.min(n - 1, MESES_CLIP) }, (_, i) => i + 1).slice(-2);
  let ritmo: number | null = null;
  if (cerrados.length) {
    const meta = cerrados.reduce((s, k) => s + curva('base', k), 0);
    const cob = cerrados.reduce((s, k) => s + ingresoMes(st, k), 0);
    ritmo = cob > 0 ? cob / meta : null;
  }
  if (ritmo == null && n <= MESES_CLIP) ritmo = mesContraMeta(st, date)?.ritmo ?? null;
  if (!ritmo) return null;
  const base = curva('base', MESES_CLIP);
  const mes12 = Math.round(base * ritmo);
  const meses = Array.from({ length: MESES_CLIP }, (_, i) => (i + 1 < n ? ingresoMes(st, i + 1) : Math.round(curva('base', i + 1) * ritmo!)));
  return { ritmo, mes12, falta: Math.max(0, CLIP.metaFinal - mes12), base, meses };
}

export type Luz = 'verde' | 'amarillo' | 'rojo' | 'gris';
export interface Chequeo { texto: string; valor: string; ok: boolean | null }
export interface Compuerta { fase: number; titulo: string; luz: Luz; texto: string; chequeos: Chequeo[] }

const usd = (x: number | null) => (x == null ? 'sin datos' : `USD ${x.toFixed(2).replace('.', ',')}`);
const pc = (x: number | null) => (x == null ? 'sin datos' : `${Math.round(x * 100)} %`);

function luzDe(oks: (boolean | null)[]): Luz {
  if (oks.every((x) => x == null)) return 'gris';
  if (oks.every((x) => x === true)) return 'verde';
  if (oks.some((x) => x === true) || oks.some((x) => x == null)) return 'amarillo';
  return 'rojo';
}

/**
 * La compuerta de la fase en curso, con el mismo semáforo que las puertas de matemática.
 * Fase 1 → 2: pago real ≥ 0,80 y ≥ 40 % de clips con más de 1.000 views (filas de la fase).
 * Fase 2 (revisión del mes 6): pago real ≥ 0,70; entre 0,70 y 0,80, amarillo.
 * Fase 3: ninguna fuente arriba del 30 % del ingreso de los últimos 30 días.
 */
export function compuerta(st: ClippingState, date: string): Compuerta | null {
  const n = Math.min(Math.max(mesDe(date), 1), MESES_CLIP);
  const fa = faseDe(n);
  if (!fa) return null;
  const u = CLIP.umbrales;
  const r = { desde: inicioMes(fa.meses[0]), hasta: date };
  const fs = filas(st, r);
  if (fa.n === 1) {
    const p = pagoReal(fs);
    const k = pct1000(fs);
    const chequeos = [
      { texto: `Pago real ≥ USD ${u.pagoFase2.toFixed(2).replace('.', ',')} por 1.000 views`, valor: usd(p), ok: p == null ? null : p >= u.pagoFase2 },
      { texto: `≥ ${Math.round(u.pct1000Fase2 * 100)} % de clips con más de 1.000 views`, valor: pc(k), ok: k == null ? null : k >= u.pct1000Fase2 },
    ];
    const luz = luzDe(chequeos.map((c) => c.ok));
    return { fase: 1, titulo: 'Compuerta a la fase 2', luz, chequeos, texto: luz === 'verde' ? 'Pasás a la fase 2: escalá con herramientas propias.' : luz === 'gris' ? 'Cargá views y cobros para ver la compuerta.' : fa.siNo };
  }
  if (fa.n === 2) {
    const p = pagoReal(fs);
    const ok = p == null ? null : p >= u.pagoMes6;
    const luz: Luz = p == null ? 'gris' : p < u.pagoMes6 ? 'rojo' : p < u.pagoFase2 ? 'amarillo' : 'verde';
    return { fase: 2, titulo: 'Revisión del mes 6', luz, chequeos: [{ texto: `Pago real ≥ USD ${u.pagoMes6.toFixed(2).replace('.', ',')} por 1.000 views`, valor: usd(p), ok }], texto: luz === 'rojo' ? 'Cambiá de campañas antes de escalar más.' : luz === 'amarillo' ? 'Por encima del piso, pero debajo de USD 0,80: mirá qué campañas tirar.' : luz === 'gris' ? 'Cargá cobros para ver la revisión.' : 'Seguí escalando.' };
  }
  const c = concentracion(st, { desde: addDays(date, -29), hasta: date });
  const pk = c.peor?.pct ?? null;
  const luz: Luz = pk == null ? 'gris' : pk <= u.concentracionMax ? 'verde' : pk <= u.concentracionMax + 0.1 ? 'amarillo' : 'rojo';
  return { fase: 3, titulo: 'Concentración', luz, chequeos: [{ texto: `Ninguna fuente arriba del ${Math.round(u.concentracionMax * 100)} %`, valor: c.peor ? `${c.peor.nombre} · ${pc(pk)}` : 'sin datos', ok: pk == null ? null : pk <= u.concentracionMax }], texto: luz === 'verde' ? 'Ingreso repartido.' : luz === 'gris' ? 'Cargá cobros para ver de dónde sale el ingreso.' : fa.siNo };
}

export interface FilaCampana { id: string; nombre: string; plataforma: string; tarifa: number; pagoReal: number | null; brecha: number | null; aprobacion: number | null; clips: number; views: number; cobrado: number; estado: string }

/** Una fila por campaña: tarifa listada contra pago real (la brecha) y aprobación. Ordenadas por pago real. */
export function porCampana(st: ClippingState, r?: Rango): FilaCampana[] {
  return st.campanas.map((c) => {
    const fs = filas(st, r, { campana: c.id });
    const t = totales(fs);
    const p = pagoReal(fs);
    return { id: c.id, nombre: c.nombre, plataforma: c.plataforma, tarifa: c.tarifa, pagoReal: p, brecha: p == null ? null : r2(p - c.tarifa), aprobacion: aprobacion(fs), clips: t.clips, views: t.views, cobrado: r2(t.cobrado), estado: c.estado };
  }).sort((a, b) => (b.pagoReal ?? -1) - (a.pagoReal ?? -1));
}

/** Embudo: publicados → aprobados → con más de 1.000 views → pagados. */
export function embudo(fs: FilaClip[]) {
  const t = totales(fs);
  return [
    { id: 'publicados', nombre: 'Publicados', v: t.clips },
    { id: 'aprobados', nombre: 'Aprobados', v: t.aprobados },
    { id: 'mas1000', nombre: 'Más de 1.000 views', v: t.mas1000 },
    { id: 'pagados', nombre: 'Pagados', v: t.clipsPagados },
  ];
}

export const TRAMOS_VIEWS = [
  { hasta: 500, nombre: '< 500' },
  { hasta: 1000, nombre: '500–1k' },
  { hasta: 3500, nombre: '1k–3,5k' },
  { hasta: 10000, nombre: '3,5k–10k' },
  { hasta: Infinity, nombre: '10k +' },
];

/** Distribución de views por clip: cuántos clips caen en cada tramo (con el promedio de cada fila). */
export function distribucionViews(fs: FilaClip[]) {
  const out = TRAMOS_VIEWS.map((t) => ({ ...t, clips: 0 }));
  for (const f of fs) {
    if (!f.clips) continue;
    const vpc = f.views / f.clips;
    out.find((t) => vpc < t.hasta)!.clips += f.clips;
  }
  return out;
}

/** Clips por día (para el calendario de actividad). */
export function clipsPorDia(st: ClippingState, r: Rango): Record<string, number> {
  const out: Record<string, number> = {};
  for (const f of filas(st, r)) out[f.fecha] = (out[f.fecha] ?? 0) + f.clips;
  return out;
}

/** Lunes de una fecha. */
const lunes = (d: string) => addDays(d, -((new Date(`${d}T12:00:00`).getDay() + 6) % 7));

export interface SemanaClip { lunes: string; clips: number; views: number; cobrado: number; horas: number; usdHora: number | null; pagoReal: number | null; aprobacion: number | null; cuentas: number; clipsDia: number }

/** Las últimas `n` semanas (lunes a domingo) hasta la fecha: lo de cada una, para los mini gráficos. */
export function semanas(st: ClippingState, days: Record<string, DayLog>, date: string, n = 8): SemanaClip[] {
  const l0 = lunes(date);
  return Array.from({ length: n }, (_, i) => {
    const l = addDays(l0, -7 * (n - 1 - i));
    const fin = addDays(l, 6);
    const r = { desde: l, hasta: fin };
    const fs = filas(st, r);
    const t = totales(fs);
    const horas = horasClipping(days, l, fin);
    const cob = t.cobrado + usdRetainers(st, r);
    const dias = fin <= date ? 7 : Math.round((Date.parse(date) - Date.parse(l)) / 864e5) + 1;
    return { lunes: l, clips: t.clips, views: t.views, cobrado: r2(cob), horas, usdHora: horas > 0 ? r2(cob / horas) : null, pagoReal: pagoReal(fs), aprobacion: aprobacion(fs), cuentas: cuentasActivas(st, fin < date ? fin : date), clipsDia: Math.round((t.clips / dias) * 10) / 10 };
  });
}

/** Rango de un período de la pantalla de métricas. */
export function rangoPeriodo(p: '30' | '90' | 'todo', date: string, st?: ClippingState): Rango {
  if (p === 'todo') {
    const primera = st?.registro.reduce((m, f) => (f.fecha < m ? f.fecha : m), CLIP.t0) ?? CLIP.t0;
    return { desde: primera < date ? primera : date, hasta: date };
  }
  return { desde: addDays(date, -(Number(p) - 1)), hasta: date };
}
