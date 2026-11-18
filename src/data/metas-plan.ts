/**
 * Metas del plan T+18 por horizonte. Año y bimestre son fijos (vienen del plan y se pueden
 * editar); mes y semana se generan desde el plan para cualquier fecha y el usuario los confirma,
 * los cambia o los borra. Nada se carga 18 meses antes: todo se calcula al abrir el período.
 */
import { IDIOMAS, calendarioIdiomas } from './idiomas';
import { mesClipEn, mesDe as mesClipDe, planEntre } from './clipping';
import { clipsEntre, usdEntre } from './clipping-metricas';
import type { ClippingState } from './clipping-state';
import {
  PLAN, SEMANAS, SEMANAS_BIM, TRAMOS, bimestreDelPlan, corteHandyx, faseIngles, faseTrabajo, fechaCorta, fechaHito, finSemana, hitoSemana,
  inicioSemana, metasSemanaPlan, tramoEnSemana, nombreTramo, semanaDelPlan, T0_PLAN, tramoActivo, type MetaGenerada, type Tramo,
} from './plan';
import { enPausa, type PlanState } from './plan-state';
import { cierreProyecto } from './puertas';
import { RAMAS } from './ramas';
import { focusUnit, unitState } from './study';
import type { StudyState } from './study-types';
import { addDays, parseDate } from './time';
import type { TrainState } from './train-types';
import type { DayLog, Rama, RamaOMain } from './types';

export interface CtxPlan {
  plan: PlanState;
  days: Record<string, DayLog>;
  study: StudyState;
  train: TrainState;
  t0?: string;
  /** Fecha en que se marcó T+2 (Ajustes). */
  t2?: string;
  /** Ola 23: la planilla del clipping (los clips y lo cobrado salen de ahí). */
  clipping?: ClippingState;
}

const lunes = (d: string) => addDays(d, -((parseDate(d).getDay() + 6) % 7));
const diasEntre = (a: string, b: string) => Math.round((parseDate(b).getTime() - parseDate(a).getTime()) / 864e5);
const max = (a: string, b: string) => (a > b ? a : b);
const min = (a: string, b: string) => (a < b ? a : b);
const finDelPlan = (t0: string) => finSemana(SEMANAS, t0);

/** Primer y último día del mes de una fecha. */
export function rangoMes(fecha: string): [string, string] {
  const d = parseDate(fecha);
  const y = d.getFullYear();
  const m = d.getMonth();
  const ult = new Date(y, m + 1, 0).getDate();
  const k = `${y}-${String(m + 1).padStart(2, '0')}`;
  return [`${k}-01`, `${k}-${String(ult).padStart(2, '0')}`];
}
export const claveMes = (fecha: string) => fecha.slice(0, 7);

// ——— Avance de una meta generada ———

/** Contadores que se suman con + (y desde Hoy): viven en plan.contadores por semana. */
const CONTADORES = new Set(['sesiones-tecnicas', 'clips', 'horas-clipping', 'postulaciones', 'mensajes', 'posts', 'simulada', 'labs', 'respuestas', 'horas-busqueda', 'horas-ingles', 'horas-mate', 'horas-prog', 'horas-handyx', 'pitch']);
/** Horas que también salen solas de las sesiones de foco de los bloques de esa rama. */
const HORAS: Record<string, Rama> = { 'horas-mate': 'matematica', 'horas-prog': 'programacion', 'horas-handyx': 'handyx', 'horas-ingles': 'ingles', 'horas-busqueda': 'trabajo' };

/** Horas de foco registradas en bloques de una rama entre dos fechas. */
export function horasDeRama(days: Record<string, DayLog>, rama: Rama, desde: string, hasta: string) {
  let m = 0;
  for (const [d, day] of Object.entries(days)) {
    if (d < desde || d > hasta) continue;
    const ramaDe = new Map(day.blocks.map((b) => [b.key, b.rama]));
    for (const f of day.focus) if (ramaDe.get(f.key) === rama) m += f.focusMin;
  }
  return Math.round((m / 60) * 10) / 10;
}

/** Horas de foco de un bloque por su clave (el clipping no tiene rama). */
export function horasDeBloque(days: Record<string, DayLog>, key: string, desde: string, hasta: string) {
  let m = 0;
  for (const [d, day] of Object.entries(days)) if (d >= desde && d <= hasta) for (const f of day.focus) if (f.key === key) m += f.focusMin;
  return Math.round((m / 60) * 10) / 10;
}

function sumaContador(p: PlanState, id: string, desde: string, hasta: string) {
  const l0 = lunes(desde);
  return Object.entries(p.contadores).filter(([l]) => l >= l0 && l <= hasta).reduce((s, [, c]) => s + (c[id] ?? 0), 0);
}

// TODO(ola 9): después de Aritmética (B1) el catálogo de Estudio no trae Álgebra, Geometría ni Cálculo: los capítulos
// de B2 en adelante cuentan cuando esas actividades existan.
export const conamatDe = (study: StudyState) => study.activities.find((a) => a.id === 'conamat');

function capsAprobados(study: StudyState, desde: string, hasta: string) {
  const a = conamatDe(study);
  if (!a?.units) return 0;
  return a.units.filter((u) => { const d = unitState(study, a.id, u.n).approvedOn; return d && d >= desde && d <= hasta; }).length;
}

/** Valor de una meta en un período y si sale sola (sin botón +). */
export function avanceMeta(m: MetaGenerada, desde: string, hasta: string, c: CtxPlan): { v: number; auto: boolean } {
  const k = m.clave;
  if (!k) return { v: m.hecho ?? 0, auto: false };
  if (k.startsWith('casillas:')) {
    const e = c.plan.proyectos[k.slice(9)]?.estandar ?? {};
    return { v: Object.values(e).filter(Boolean).length, auto: true };
  }
  if (k.startsWith('examen:')) {
    const ex = c.plan.proyectos[k.slice(7)]?.examen;
    return { v: ex && ex.puntaje >= 85 ? 1 : 0, auto: true };
  }
  // Ola 23: los clips y lo cobrado salen de la planilla del clipping (más lo que sumaste a mano).
  if (k === 'usd-clipping') return { v: c.clipping ? usdEntre(c.clipping, desde, hasta) : 0, auto: true };
  if (k === 'clips') return { v: (c.clipping ? clipsEntre(c.clipping, desde, hasta) : 0) + sumaContador(c.plan, k, desde, hasta), auto: false };
  if (k === 'entrenos') return { v: c.train.sessions.filter((s) => s.date >= desde && s.date <= hasta).length, auto: true };
  if (k === 'caps') return { v: capsAprobados(c.study, desde, hasta), auto: true };
  if (k === 'kit') return { v: c.plan.respuestas.filter((r) => r.veces > 0).length, auto: false };
  if (k === 'operaciones') return { v: Object.entries(c.plan.handyx).filter(([l]) => l >= lunes(desde) && l <= hasta).reduce((s, [, h]) => s + (h.operaciones ?? 0), 0), auto: false };
  if (CONTADORES.has(k)) {
    const auto = HORAS[k] ? horasDeRama(c.days, HORAS[k], desde, hasta) : k === 'horas-clipping' ? horasDeBloque(c.days, 'clipping', desde, hasta) : 0;
    const handyx = k === 'horas-handyx' ? Object.entries(c.plan.handyx).filter(([l]) => l >= lunes(desde) && l <= hasta).reduce((s, [, h]) => s + (h.horas ?? 0), 0) : 0;
    return { v: Math.round((auto + handyx + sumaContador(c.plan, k, desde, hasta)) * 10) / 10, auto: false };
  }
  return { v: m.hecho ?? 0, auto: false };
}

/** Qué hace el botón + de una meta: un contador de la semana, una respuesta, una operación o a mano. */
export function accionMeta(m: MetaGenerada): 'contador' | 'kit' | 'operaciones' | 'hecho' | 'auto' {
  const k = m.clave;
  if (!k) return 'hecho';
  if (k === 'kit' || k === 'operaciones') return k;
  if (CONTADORES.has(k)) return 'contador';
  return 'auto';
}

/** Nombre de un bimestre: el que le pusiste, el sugerido por el plan o "B3". */
export const nombreBimestre = (n: number, nombres: Record<number, string>) =>
  nombres[n]?.trim() || PLAN.nombresBimestre[n - 1] || (PLAN.metasBimestre.programacion[n - 1] ?? `B${n}`).split(', ').slice(0, 2).join(' y ');

/** Lo que suma el botón + de una meta. */
export const pasoMeta = (m: MetaGenerada) => (m.unidad === 'h' ? 0.5 : 1);
/** ¿Se cumple una vez (casilla) o se cuenta? */
export const esTarea = (m: MetaGenerada) => !m.meta || (m.meta === 1 && !m.clave);

// ——— Semana ———

/**
 * Las metas de la semana según la fase: hasta T+2, búsqueda; desde T+2, con trabajo. Suma las
 * casillas del estándar del proyecto en curso y el capítulo de matemática; la semana 1 trae
 * además las tareas de la etapa actual.
 */
export interface OpcionesPlan {
  /** Búsqueda intensiva activa: contadores de la intensiva en lugar de los de la fase. */
  intensiva?: boolean;
  /** Pausas (stand-by): sus ramas no generan metas nuevas. */
  pausa?: Pick<PlanState, 'pausas'>;
}

/**
 * Los contadores semanales de la búsqueda intensiva (Ola 8b): 70 a medida y 70 mensajes en
 * las dos semanas del sprint, y las horas de la tabla (matemática 14, programación 25,5,
 * inglés 11,5, búsqueda 10,5, clipping 11,5, entrenamiento 10). Los clips de la semana salen del mes del
 * Roadmap Clipper (ola 23): clips por día del mes × 7.
 */
export const SEMANA_INTENSIVA: (Omit<MetaGenerada, 'id' | 'origen'> & { clave: string })[] = [
  { rama: 'trabajo', texto: 'Postulaciones a medida', meta: 35, clave: 'postulaciones', nota: '5 por día' },
  { rama: 'trabajo', texto: 'Mensajes directos', meta: 35, clave: 'mensajes', nota: '5 por día' },
  { rama: 'trabajo', texto: 'Horas de búsqueda', meta: 10.5, unidad: 'h', clave: 'horas-busqueda' },
  { rama: 'programacion', texto: 'Horas de programación', meta: 25.5, unidad: 'h', clave: 'horas-prog' },
  { rama: 'matematica', texto: 'Horas de matemática', meta: 14, unidad: 'h', clave: 'horas-mate' },
  { rama: 'ingles', texto: 'Horas de idiomas', meta: 11.5, unidad: 'h', clave: 'horas-ingles' },
  // Ola 18/21: la entrevista se practica en el bloque de búsqueda laboral.
  { rama: 'trabajo', texto: 'Respuestas ensayadas', meta: 10, clave: 'respuestas' },
  { rama: 'trabajo', texto: 'Simulacro de entrevista', meta: 1, clave: 'simulada' },
  // Ola 23: 1 h 30 de lunes a viernes y 2 h el sábado y el domingo; los clips salen del mes del roadmap.
  { area: 'eclipse', texto: 'Horas de clipping', meta: 11.5, unidad: 'h', clave: 'horas-clipping' },
  { area: 'eclipse', texto: 'Clips publicados', meta: 35, clave: 'clips' },
  { rama: 'salud', texto: 'Entrenamientos', meta: 5, clave: 'entrenos' },
];

/** Saca las metas de ramas o áreas en pausa (Handyx; las ventas de Eclipse). */
export const sinPausa = (ms: MetaGenerada[], fecha: string, pausa?: Pick<PlanState, 'pausas'>) =>
  pausa ? ms.filter((m) => !(m.rama && enPausa(pausa, m.rama, fecha)) && !(m.clave === 'ventas' && enPausa(pausa, 'ventas', fecha))) : ms;

/** Ola 23: los clips de la semana según el mes del Roadmap Clipper (clips por día × 7). */
function clipsDeLaSemana(fecha: string) {
  const l = lunes(fecha);
  const m = mesClipEn(l);
  return { meta: planEntre(l, addDays(l, 6)).clips, nota: `mes ${Math.max(1, Math.min(12, mesClipDe(l)))} del roadmap · ${m.clipsDia} por día` };
}

export function metasSemanaGeneradas(fecha: string, t0 = T0_PLAN, op: OpcionesPlan = {}): MetaGenerada[] {
  const s = semanaDelPlan(fecha, t0);
  if (s < 1 || s > SEMANAS) return [];
  const base: MetaGenerada[] = op.intensiva
    ? SEMANA_INTENSIVA.map((x) => ({ ...x, id: `s-${x.clave}`, origen: 'plan' as const, ...(x.clave === 'clips' ? clipsDeLaSemana(fecha) : {}) }))
    : metasSemanaPlan(fecha, t0).map((x) => ({ id: `s-${x.id}`, rama: x.rama, texto: x.texto, meta: x.meta, unidad: x.unidad || undefined, clave: x.id, origen: 'plan' }));
  const out = sinPausa(base, fecha, op.pausa);
  const t = tramoActivo(fecha, t0);
  if (t.tipo === 'proyecto' && t.id !== 'P0') {
    out.push({ id: 's-casillas', rama: 'programacion', texto: 'Casillas del estándar', meta: 6, clave: `casillas:${t.id}`, origen: 'plan' });
    // Ola 8b: la entrevista técnica se entrena dentro del proyecto (2 de algoritmos y 1 de diseño).
    out.push({ id: 's-tecnicas', rama: 'programacion', texto: 'Sesiones técnicas de 45 min', meta: PLAN.programacion.tecnica.sesionesPorSemana, clave: 'sesiones-tecnicas', nota: '2 de algoritmos y 1 de diseño', origen: 'plan' });
  }
  if (t.tipo !== 'ventana') out.push({ id: 's-caps', rama: 'matematica', texto: 'Capítulo con test aprobado', meta: 1, clave: 'caps', origen: 'plan' });
  if (s === PLAN.etapaActual.semana.semana) {
    PLAN.etapaActual.semana.metas.forEach((m, i) => out.push({ id: `s-e${i}`, rama: m.rama, texto: m.texto, origen: 'plan' }));
  }
  return sinPausa(out, fecha, op.pausa);
}

/** El título de la semana: lo que la define. */
export function tituloSemana(fecha: string, entrevistas: { fecha: string }[], t0 = T0_PLAN) {
  const s = semanaDelPlan(fecha, t0);
  const l = inicioSemana(Math.max(1, s), t0);
  const d = addDays(l, 6);
  if (s === 1) return 'La del arranque';
  const hito = PLAN.hitos.find((h) => { const f = fechaHito(h, t0); return f >= l && f <= d; });
  if (hito && hito.id !== 'T+0') return `La de ${hito.id}`;
  if (entrevistas.some((e) => e.fecha >= l && e.fecha <= d)) return 'La de la entrevista';
  const t = tramoActivo(fecha, t0);
  if (t.tipo === 'descanso') return 'La del descanso';
  if (t.tipo === 'ventana') return `Ventana ${t.id}`;
  if (t.semana === t.semanas && t.tipo === 'proyecto') return `La entrega de ${nombreTramo(t, false)}`;
  if (t.semana === t.semanas && t.tipo === 'cert') return `El examen de ${t.corto ?? t.nombre}`;
  if (t.semana === 1) return `Empieza ${t.tipo === 'cert' ? t.corto ?? t.nombre : nombreTramo(t, false)}`;
  return `${t.tipo === 'cert' ? t.corto ?? t.nombre : nombreTramo(t, false)} · semana ${t.semana} de ${t.semanas}`;
}

// ——— Mes ———

export interface Cierre {
  fecha: string;
  rama: RamaOMain | null;
  texto: string;
}

/** Lo que cierra en el mes según el plan: entregas, exámenes, ventanas, cortes, hitos y entrevistas. */
export function cierraEnMes(fecha: string, entrevistas: { fecha: string; rol: string }[], t0 = T0_PLAN): Cierre[] {
  const [a, b] = rangoMes(fecha);
  const out: Cierre[] = [];
  const en = (d: string) => d >= a && d <= b;
  for (const t of TRAMOS) {
    const ini = inicioSemana(t.desde, t0);
    const fin = finSemana(t.hasta, t0);
    if (t.tipo === 'proyecto' && en(fin)) out.push({ fecha: fin, rama: 'programacion', texto: t.id === 'P0' ? 'P0 · consolidación cerrada' : `${nombreTramo(t, false)} entregado y examen de programación` });
    if (t.tipo === 'cert' && en(fin)) out.push({ fecha: fin, rama: 'programacion', texto: `Examen de ${t.corto ?? t.nombre}` });
    if (t.tipo === 'ventana' && en(ini)) out.push({ fecha: ini, rama: 'matematica', texto: `Empieza la ventana ${t.id} · ${t.hasta - t.desde + 1} semanas` });
    if (t.tipo === 'descanso' && en(ini)) out.push({ fecha: ini, rama: null, texto: `${t.nombre} · semana ${t.desde}` });
  }
  for (const c of PLAN.handyx.cortes) { const f = finSemana(c.hasta, t0); if (en(f)) out.push({ fecha: f, rama: 'handyx', texto: `Handyx · corte: ${c.nombre.toLowerCase()}` }); }
  for (const h of PLAN.hitos) { const f = fechaHito(h, t0); if (en(f)) out.push({ fecha: f, rama: 'main', texto: `${h.id} · ${h.titulo}` }); }
  for (const e of entrevistas) if (en(e.fecha)) out.push({ fecha: e.fecha, rama: 'trabajo', texto: `Entrevista · ${e.rol}` });
  return out.sort((x, y) => x.fecha.localeCompare(y.fecha));
}

/**
 * Las metas del mes desde el plan: lo que cierra ese mes (entrega de proyecto, examen,
 * capítulos, corte de Handyx, ventana W), los chequeos mensuales y la búsqueda prorrateada
 * (5 postulaciones y 5 mensajes por día). El mes de T0 trae las metas de la etapa actual.
 */
export function metasMesGeneradas(fecha: string, t0 = T0_PLAN, study?: StudyState, op: OpcionesPlan = {}): MetaGenerada[] {
  const [a0, b0] = rangoMes(fecha);
  const a = max(a0, t0);
  const b = min(b0, finDelPlan(t0));
  if (a > b) return [];
  const dias = diasEntre(a, b) + 1;
  const semanas = dias / 7;
  const out: MetaGenerada[] = [];
  const push = (m: Omit<MetaGenerada, 'origen'> & { origen?: MetaGenerada['origen'] }) => out.push({ origen: 'plan', ...m });

  if (t0 >= a0 && t0 <= b0) {
    PLAN.etapaActual.mes.metas.forEach((m, i) => push({ id: `m-e${i}`, rama: m.rama, texto: m.texto }));
  } else {
    // Programación: lo que se entrega este mes; si no se entrega nada, las horas del tramo.
    const cierran = TRAMOS.filter((t) => { const f = finSemana(t.hasta, t0); return f >= a && f <= b && (t.tipo === 'proyecto' || t.tipo === 'cert') && t.id !== 'P0'; });
    for (const t of cierran) {
      if (t.tipo === 'proyecto') {
        push({ id: `m-cas-${t.id}`, rama: 'programacion', texto: `${nombreTramo(t, false)} con tráiler, docs y landing`, meta: 6, clave: `casillas:${t.id}` });
        push({ id: `m-ex-${t.id}`, rama: 'programacion', texto: `Examen de ${nombreTramo(t, false)} de 85 % o más`, meta: 1, clave: `examen:${t.id}` });
      } else {
        push({ id: `m-cert-${t.id}`, rama: 'programacion', texto: `${t.corto ?? t.nombre} aprobada`, meta: 1 });
      }
    }
    const semanal = (id: string) => metasSemanaPlan(a, t0).find((x) => x.id === id)?.meta ?? 0;
    if (!cierran.length) {
      const t = tramoActivo(a, t0);
      if (t.tipo !== 'descanso') push({ id: 'm-horas-prog', rama: 'programacion', texto: `Horas de programación · ${t.tipo === 'cert' ? t.corto ?? t.nombre : t.tipo === 'proyecto' ? nombreTramo(t, false) : t.nombre}`, meta: Math.round(semanal('horas-prog') * semanas), unidad: 'h', clave: 'horas-prog' });
    }
    // Matemática: la ventana W o los capítulos del mes (uno cada 5 días).
    const w = TRAMOS.find((t) => t.tipo === 'ventana' && inicioSemana(t.desde, t0) <= b && finSemana(t.hasta, t0) >= a);
    if (w) push({ id: `m-${w.id}`, rama: 'matematica', texto: `Ventana ${w.id}: ${w.que}` });
    const caps = Math.max(1, Math.round((w ? dias - 7 * (w.hasta - w.desde + 1) : dias) / 5));
    if (!w || caps > 1) {
      const c = study && conamatDe(study);
      const u = c && study ? focusUnit(c, study, a) : undefined;
      const total = c?.units?.length ?? 0;
      const texto = c && u ? `${c.title} cap. ${u.n} a ${Math.min(total, u.n + caps - 1)} con test aprobado` : `${caps} capítulos con test aprobado`;
      push({ id: 'm-caps', rama: 'matematica', texto, meta: caps, clave: 'caps' });
    }
    // Trabajo: búsqueda prorrateada hasta T+2; después, 2 h por semana.
    const t2 = inicioSemana(hitoSemana('T+2'), t0);
    const diasBusqueda = Math.max(0, diasEntre(a, min(b, addDays(t2, -1))) + 1);
    const { porDia } = PLAN.trabajo;
    if (diasBusqueda > 0) {
      push({ id: 'm-post', rama: 'trabajo', texto: 'Postulaciones', meta: porDia.postulaciones * diasBusqueda, clave: 'postulaciones', nota: `${porDia.postulaciones} por día` });
      push({ id: 'm-msj', rama: 'trabajo', texto: 'Mensajes directos', meta: porDia.mensajes * diasBusqueda, clave: 'mensajes', nota: `${porDia.mensajes} por día` });
      push({ id: 'm-sim', rama: 'trabajo', texto: 'Entrevistas simuladas', meta: Math.max(1, Math.round(diasBusqueda / 7)), clave: 'simulada' });
    }
    if (diasBusqueda < dias) push({ id: 'm-busq', rama: 'trabajo', texto: 'Horas de búsqueda', meta: Math.round(2 * ((dias - diasBusqueda) / 7)), unidad: 'h', clave: 'horas-busqueda' });
    // Idiomas (ola 21): las 11,5 h por semana del roadmap y el hito de la fase que cierra en el mes.
    push({ id: 'm-ing', rama: 'ingles', texto: 'Horas de idiomas', meta: Math.round(((IDIOMAS.horasSemana * dias) / 7) * 10) / 10, unidad: 'h', clave: 'horas-ingles', nota: `${String(IDIOMAS.horasSemana).replace('.', ',')} h por semana` });
    for (const f of calendarioIdiomas(t0)) if (f.fin >= a && f.fin <= b) push({ id: `m-idioma-${f.clave}`, rama: 'ingles', texto: `${f.nombre}: ${f.hito.charAt(0).toLowerCase()}${f.hito.slice(1)}` });
    // Handyx: el corte que cae en el mes y las horas.
    for (const c of PLAN.handyx.cortes) { const f = finSemana(c.hasta, t0); if (f >= a && f <= b) push({ id: `m-corte-${c.id}`, rama: 'handyx', texto: `Corte ${c.nombre.toLowerCase()} el ${fechaCorta(f)}: ${c.texto}` }); }
    if (corteHandyx(a, t0)) push({ id: 'm-hx', rama: 'handyx', texto: 'Horas de Handyx', meta: Math.round(semanal('horas-handyx') * semanas), unidad: 'h', clave: 'horas-handyx' });
    // Salud.
    push({ id: 'm-entreno', rama: 'salud', texto: 'Entrenar 6 de 7 días', meta: Math.round((dias * 6) / 7), clave: 'entrenos' });
  }
  if (op.intensiva) {
    // Ola 23: clips y USD del Roadmap Clipper, día por día del mes (el mes del roadmap arranca el 16).
    const pc = planEntre(a, b);
    push({ id: 'm-clips', area: 'eclipse', texto: 'Clips publicados', meta: pc.clips, clave: 'clips', nota: 'según el mes del roadmap' });
    push({ id: 'm-usd-clip', area: 'eclipse', texto: 'Cobrado del clipping', meta: pc.usd, unidad: 'USD', clave: 'usd-clipping', nota: 'la meta del roadmap, prorrateada' });
  }
  // Chequeos mensuales.
  const sFin = semanaDelPlan(b, t0);
  const sIni = semanaDelPlan(a, t0);
  PLAN.chequeosMensuales.filter((c) => (!c.desdeSemana || sFin >= c.desdeSemana) && (!c.hastaSemana || sIni <= c.hastaSemana)).forEach((c, i) => out.push({ id: `m-chq${i}`, rama: c.rama, texto: c.texto, meta: 1, origen: 'chequeo' }));
  return sinPausa(out, a, op.pausa);
}

/** Resumen de lo que el plan propone para el mes siguiente ("Escudo, T+2, Aritmética 7 a 9"). */
export function resumenMes(fecha: string, t0 = T0_PLAN, study?: StudyState) {
  const ms = metasMesGeneradas(fecha, t0, study).filter((m) => m.origen === 'plan');
  const corto = (m: MetaGenerada) => m.texto.replace(/^.* · /, '').replace(/ con (tráiler|test).*$/, '').replace(/^Examen de .*$/, '').replace(/ cap\. /, ' ');
  const hitos = PLAN.hitos.filter((h) => { const f = fechaHito(h, t0); const [a, b] = rangoMes(fecha); return f >= a && f <= b; }).map((h) => h.id);
  return [...new Set([...ms.filter((m) => m.rama === 'programacion' || m.rama === 'matematica').map(corto), ...hitos])].filter(Boolean).slice(0, 3);
}

// ——— Bimestre ———

/** Letra de cada semana del bimestre en la rama programación ("P0", "F", "—", "W"). */
export function letraTramo(t: Tramo) {
  if (t.tipo === 'descanso') return '—';
  if (t.tipo === 'ventana') return 'W';
  if (t.tipo === 'cert') return 'C';
  if (t.tipo === 'colchon') return '·';
  if (t.tipo === 'cierre') return 'T';
  // P1 a P10 van con la inicial del producto (F, E, S…); P0 y los de la etapa 2 (S1 a S3), con su id.
  return t.id === 'P0' || !t.id.startsWith('P') ? t.id : t.nombre[0];
}
const nombreLeyenda = (t: Tramo) => (t.pausa ? 'pausa de fin de año' : t.tipo === 'descanso' ? 'descanso' : t.id === 'P0' ? 'consolidación' : t.tipo === 'cert' ? t.corto ?? t.nombre : t.tipo === 'ventana' ? t.id : t.tipo === 'colchon' ? 'colchón' : t.tipo === 'cierre' ? 'cierre de T+18' : nombreTramo(t, false));

export function semanasDelBimestre(n: number, t0 = T0_PLAN) {
  const desde = (n - 1) * SEMANAS_BIM + 1;
  const hasta = Math.min(SEMANAS, n * SEMANAS_BIM);
  const semanas: { s: number; letra: string; tramo: Tramo }[] = [];
  for (let s = desde; s <= hasta; s++) {
    const t = tramoEnSemana(s);
    semanas.push({ s, letra: letraTramo(t), tramo: t });
  }
  const vistos = new Map<string, string>();
  for (const x of semanas) if (!vistos.has(x.tramo.id)) vistos.set(x.tramo.id, `${x.letra} ${nombreLeyenda(x.tramo)}`);
  return { desde, hasta, inicio: inicioSemana(desde, t0), fin: finSemana(hasta, t0), semanas, leyenda: [...vistos.values()] };
}

/** Capítulos que el plan pone en el bimestre ("Álgebra 13–17, Geo y trig 1–10" → 15). */
export function capitulosPlaneados(texto: string) {
  let n = 0;
  for (const m of texto.matchAll(/(\d+)\s*[–-]\s*(\d+)/g)) n += Number(m[2]) - Number(m[1]) + 1;
  return n;
}

export interface FilaBim {
  rama: Rama;
  clave: string;
  titulo: string;
  sub: string;
  lado: string;
  avance: number;
}

/** Una meta por rama del bimestre con su avance real. */
export function filasBimestre(n: number, fecha: string, c: CtxPlan, editadas: Record<string, string>): FilaBim[] {
  const t0 = c.t0 ?? T0_PLAN;
  const b = semanasDelBimestre(n, t0);
  const hasta = min(fecha, b.fin);
  const transcurrido = fecha < b.inicio ? 0 : Math.min(1, (diasEntre(b.inicio, fecha) + 1) / (diasEntre(b.inicio, b.fin) + 1));
  const semBim = fecha < b.inicio ? 0 : Math.min(b.hasta - b.desde + 1, Math.floor(diasEntre(b.inicio, fecha) / 7) + 1);
  const futuro = fecha < b.inicio;
  return RAMAS.map((rama) => {
    const clave = `b${n}-${rama}`;
    const titulo = editadas[clave] ?? PLAN.metasBimestre[rama][n - 1] ?? '';
    let sub = '';
    let lado = futuro ? '' : `sem ${semBim}/${b.hasta - b.desde + 1}`;
    let avance = transcurrido;
    if (rama === 'programacion') {
      const ts = TRAMOS.filter((t) => t.tipo !== 'descanso' && t.desde <= b.hasta && t.hasta >= b.desde);
      const cerrados = ts.filter((t) => finSemana(t.hasta, t0) < fecha).length;
      const partes = ts.slice(0, 3).map((t) => (t.hasta <= b.hasta ? `${nombreLeyenda(t)} ${t.tipo === 'proyecto' ? 'se entrega' : 'termina'} el ${fechaCorta(finSemana(t.hasta, t0))}` : `${nombreLeyenda(t)} empieza el ${fechaCorta(inicioSemana(t.desde, t0))}`));
      sub = partes.slice(-2).join('; ');
      lado = `${cerrados}/${ts.length}`;
      avance = ts.length ? cerrados / ts.length : 0;
    } else if (rama === 'matematica') {
      const plan = capitulosPlaneados(PLAN.metasBimestre.matematica[n - 1] ?? '');
      const hechos = capsAprobados(c.study, b.inicio, hasta);
      const w = TRAMOS.find((t) => t.tipo === 'ventana' && t.desde <= b.hasta && t.hasta >= b.desde);
      sub = w ? `Ventana ${w.id} del ${fechaCorta(inicioSemana(w.desde, t0))}: ${w.que.toLowerCase()}` : 'Un capítulo con test aprobado cada 5 días';
      if (plan) { lado = `${hechos}/${plan}`; avance = Math.min(1, hechos / plan); }
    } else if (rama === 'trabajo') {
      const f = faseTrabajo(b.inicio, t0);
      const post = c.plan.postulaciones.filter((p) => p.fecha >= b.inicio && p.fecha <= b.fin).length + sumaContador(c.plan, 'postulaciones', b.inicio, b.fin);
      const ents = c.plan.entrevistas.filter((e) => e.fecha >= b.inicio && e.fecha <= b.fin).length;
      sub = f.id === 'busqueda' ? `Embudo: ${post} postulaciones · ${ents} ${ents === 1 ? 'entrevista' : 'entrevistas'}` : f.texto;
      if (f.id === 'busqueda' && !futuro) {
        const s = Math.min(f.hasta, semanaDelPlan(fecha, t0));
        lado = `sem ${s}/${f.hasta}`;
        avance = s / f.hasta;
      }
    } else if (rama === 'ingles') {
      sub = faseIngles(b.inicio, t0).texto;
    } else if (rama === 'handyx') {
      const prox = PLAN.handyx.cortes.find((x) => finSemana(x.hasta, t0) >= b.inicio);
      if (prox) {
        const i = PLAN.handyx.cortes.indexOf(prox) + 1;
        const f = i === PLAN.handyx.cortes.length ? fechaHito(PLAN.hitos.find((h) => h.id === 'T+12')!, t0) : finSemana(prox.hasta, t0);
        sub = `${i === PLAN.handyx.cortes.length ? 'Decisión' : `Corte ${i}`} el ${fechaCorta(f)}${f > b.fin ? `, ya dentro de B${n + 1}` : ''}`;
      } else sub = 'Según la decisión del año 1';
      const ops = Object.entries(c.plan.handyx).filter(([l]) => l >= lunes(b.inicio) && l <= b.fin).reduce((s, [, h]) => s + (h.operaciones ?? 0), 0);
      if (!futuro) lado = `${ops} op.`;
    } else {
      const ses = c.train.sessions.filter((s) => s.date >= b.inicio && s.date <= hasta).length;
      const esperado = futuro ? 0 : Math.max(1, Math.round(((diasEntre(b.inicio, hasta) + 1) * 6) / 7));
      sub = n === 1 ? 'Entreno, calorías y sueño registrados' : PLAN.salud.componentes.map((x) => x.nombre.toLowerCase()).slice(0, 3).join(', ');
      if (!futuro) { lado = `${ses}/${esperado}`; avance = Math.min(1, ses / esperado); }
    }
    return { rama, clave, titulo, sub, lado, avance: futuro ? 0 : avance };
  });
}

/** La tarjeta "Al cerrar Bn": qué pasa al terminar el bimestre. */
export function alCerrar(n: number, t0 = T0_PLAN) {
  const b = semanasDelBimestre(n, t0);
  const sig = PLAN.metasBimestre.programacion[n];
  const hito = PLAN.hitos.find((h) => h.id !== 'T+0' && h.semana >= b.desde && h.semana <= b.hasta + 1);
  let texto: string;
  if (n >= Math.ceil(SEMANAS / SEMANAS_BIM)) texto = 'Todo vuelve a main: senior ML + DevSecOps + cloud y el examen C1.';
  else if (hito?.id === 'T+2') texto = `Se marca T+2, la rutina pasa a "con trabajo nuevo" y armamos las metas de B${n + 1}: ${sig}.`;
  else if (hito?.id === 'T+12') texto = `Llega T+12: la decisión de Handyx con los umbrales que escribiste. Después, B${n + 1}: ${sig}.`;
  else texto = `Armamos las metas de B${n + 1}: ${sig}.`;
  return { fecha: b.fin, texto };
}

// ——— Año ———

export interface FilaAnio {
  rama?: Rama;
  clave: string;
  titulo: string;
  nota: string;
  lado: string;
  avance: number;
}

/** Proyectos y certificaciones del año 1 (los que terminan antes de T+12). */
export function cerradosAnio1(c: CtxPlan, fecha: string) {
  const t0 = c.t0 ?? T0_PLAN;
  const ts = TRAMOS.filter((t) => (t.tipo === 'proyecto' || t.tipo === 'cert') && t.hasta <= hitoSemana('T+12') - 3);
  const cerrado = (t: Tramo) => {
    if (t.tipo === 'proyecto') return !!cierreProyecto(c.plan, t.id) || (t.id === 'P0' && finSemana(t.hasta, t0) < fecha);
    const p = c.plan.proyectos[t.id];
    return !!(p?.examen && p.examen.puntaje >= 85);
  };
  return { total: ts.length, hechos: ts.filter(cerrado).length };
}

/** Las metas del año 1 por rama, con su avance (salud y Handyx toman el número de tu meta personal). */
export function filasAnio(fecha: string, c: CtxPlan, editadas: Record<string, string>, personal: Partial<Record<Rama, { v: number; target: number; unit?: string }>>): FilaAnio[] {
  const t0 = c.t0 ?? T0_PLAN;
  const t2 = inicioSemana(hitoSemana('T+2'), t0);
  const fmt = (n: number) => String(Math.round(n * 10) / 10).replace('.', ',');
  return PLAN.metasAnio.anio1.filter((m) => m.rama).map((m) => {
    const rama = m.rama!;
    const clave = `anio1-${rama}`;
    const titulo = editadas[clave] ?? m.texto;
    let nota = '';
    let v = 0;
    let target = 1;
    let lado = '';
    if (rama === 'trabajo') {
      const t2Marcado = !!c.t2 && c.t2 <= fecha;
      const ml = c.plan.postulaciones.some((p) => p.fecha >= t2 && /\b(ai|ml)\b/i.test(p.rol));
      v = (t2Marcado ? 1 : 0) + (ml ? 1 : 0);
      target = 2;
      nota = `T+2 el ${fechaCorta(t2)}; la revisión salarial en B4`;
    } else if (rama === 'programacion') {
      const x = cerradosAnio1(c, fecha);
      v = x.hechos; target = x.total;
      nota = 'P0 a P7, AWS SAA y Security+; AWS ML arranca en B6';
    } else if (rama === 'matematica') {
      const a = conamatDe(c.study);
      v = a?.units?.filter((u) => unitState(c.study, a.id, u.n).approvedOn).length ?? 0;
      target = a?.units?.length || 69;
      nota = `${target} capítulos en B1 a B6 y las ventanas W1 y W2`;
    } else if (rama === 'ingles') {
      // Ola 21: el año 1 de idiomas son sus 6 fases (hasta Cambridge C1 y la consolidación).
      const a1 = calendarioIdiomas(t0).filter((f) => f.anio === 1);
      v = a1.filter((f) => f.fin < fecha).length; target = a1.length;
      nota = `Cambridge C1 entre el ${fechaCorta(a1.find((f) => f.tipo === 'examen')!.inicio)} y el ${fechaCorta(a1.find((f) => f.tipo === 'examen')!.fin)}; después, francés`;
    } else if (rama === 'handyx') {
      const p = personal.handyx;
      v = p?.v ?? Math.max(0, ...Object.values(c.plan.handyx).map((h) => h.clientes ?? 0)); target = p?.target ?? 100;
      const dec = fechaHito(PLAN.hitos.find((h) => h.id === 'T+12')!, t0);
      nota = `${PLAN.handyx.cortes.length === 4 ? 'Cuatro' : PLAN.handyx.cortes.length} cortes; la decisión es el ${fechaCorta(dec)} ${dec.slice(0, 4)}`;
    } else {
      const p = personal.salud;
      v = p?.v ?? 0; target = p?.target ?? 95;
      lado = v ? `${fmt(v)} kg` : '— kg';
      nota = 'Peso cada domingo, entreno con Abi y un objetivo de carrera';
    }
    return { rama, clave, titulo, nota, lado: lado || `${fmt(v)}/${target}`, avance: target ? Math.min(1, v / target) : 0 };
  });
}

/** Promedio esperado: semana del plan sobre el total, para comparar. */
export const avanceDelPlan = (fecha: string, t0 = T0_PLAN) => Math.max(0, Math.min(1, semanaDelPlan(fecha, t0) / SEMANAS));
export { bimestreDelPlan };

/** Los 4 pasos de la meta "Mapa de proyectos del portfolio" (prompt 23). */
export const PASOS_MAPA: [string, string][] = [
  ['json', 'proyectos.json validado'],
  ['escena', 'Escena base 3D'],
  ['lista', 'Versión de lista accesible'],
  ['publicado', 'Publicado en el portfolio'],
];
