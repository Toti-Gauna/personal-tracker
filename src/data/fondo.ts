/**
 * v12.2 · lo de fondo: las apps secundarias (una por vez, con un solape corto en el relevo) y los slots comerciales (uno por ventana
 * que no es proyecto principal). No usan horas de foco ni cuentan para las 72 h de la semana: su tiempo se anota aparte, como
 * tiempo de revisión. Se pausan en el PNPT y el 20–26 dic 2027. Puro.
 */
import { HORAS_FINDE, HORAS_LV } from './capacidad';
import type { Periodo } from './periodos';
import { blockDone } from './mejora';
import { fondoEn, type FondoActivo, type PistaFondo } from './pistas-dia';
import { claveHito } from './periodos-plan';
import type { PlanState } from './plan-state';
import type { DayLog } from './types';
import { ROUTINES_FILE, blockMin } from './routines';
import { addDays, toMin } from './time';
import { PAUSAS_FONDO, V122, type AreaForeground, type Comercial } from './v12-2';

export { fondoEn, type FondoActivo };

export type EstadoComercial = 'planned' | 'building' | 'review' | 'published' | 'pitched';
export const ESTADOS_COMERCIAL: EstadoComercial[] = ['planned', 'building', 'review', 'published', 'pitched'];
export const ESTADO_COMERCIAL_TXT: Record<EstadoComercial, string> = { planned: 'planificado', building: 'en construcción', review: 'en revisión', published: 'publicado', pitched: 'ofrecido' };

/** v12.4 · por dónde se contactó a un lead. */
export const CANALES_LEAD = ['email', 'WhatsApp', 'LinkedIn', 'Instagram', 'llamada', 'en persona'] as const;
export type CanalLead = (typeof CANALES_LEAD)[number];
/** v12.4 · la venta de un slot: el pitch a la marca y a 10 negocios parecidos (11 leads), cada uno con nombre, fecha, canal y estado. */
export const META_LEADS = 11;
export interface Lead { id: string; nombre: string; /** La fecha en que se lo contactó. */ contactado: string; /** v12.4: el canal. Los leads viejos no lo tienen. */ canal?: CanalLead; estado: 'contactado' | 'respondió' | 'reunión' | 'propuesta' | 'ganado' | 'perdido' }

/** v12.4 · la pregunta que se hace 14 días antes de cada slot y cuya respuesta se guarda. */
export const PERFILES_MARCA = [
  { id: 'regional', etiqueta: 'Regional', nota: 'para conseguir clientes' },
  { id: 'grande', etiqueta: 'Grande', nota: 'para hacer ruido' },
] as const;

/** Lo que se guarda de cada ítem de fondo (y de los principales, para el Imán y el lanzamiento). */
export interface EstadoItem {
  estado?: EstadoComercial;
  repo?: string;
  demo?: string;
  /** La versión que es el lanzamiento público (la del Imán). */
  lanzamiento?: string;
  /** Versiones publicadas (fecha) y la revisión en primer plano hecha (fecha). */
  versiones?: Record<string, { publicada?: string; foreground?: string }>;
  /** Comercial "TO DEFINE": la marca elegida. */
  marca?: string;
  /** v12.4: la respuesta a "¿marca regional para clientes o marca grande para ruido?" de ese slot. */
  perfilMarca?: 'regional' | 'grande';
  leads?: Lead[];
  /** Pausado a mano (por el uso de Claude), con la fecha. */
  pausado?: string;
  /** Herramientas (§14): el segundo ítem que la necesita (las extraídas no se publican sin él), el link del paquete y las descargas (a mano). */
  necesitadoPor?: string;
  enlace?: string;
  descargas?: number;
}

export interface EntradaRevision {
  id: string; fecha: string; inicio?: string; min: number; item: string; tipo: 'walkthrough' | 'diseño' | 'comercial' | 'otro'; nota?: string;
  /** v12.4: la hora de fondo del día que la anotó sola al tildarse (los minutos se editan después). */
  bloque?: 'fondo-sec' | 'fondo-com';
}

/** v12.4 (respuesta 2) · tildar una hora de fondo anota 60 min de revisión a esa pista. */
export const MIN_HORA_FONDO = 60;
const TIPO_BLOQUE_FONDO = { 'fondo-sec': 'walkthrough', 'fondo-com': 'comercial' } as const;

/**
 * Las entradas de revisión de un día según sus horas de fondo: al tildar la hora de la secundaria o la comercial se anotan 60 min a
 * esa pista (a la app o al slot que corre ese día); al destildarla, se saca la entrada si sus minutos siguen en 60 (si los editaste,
 * se queda). Devuelve el mismo arreglo si nada cambia.
 */
export function sincronizarRevision(log: EntradaRevision[] | undefined, dia: Pick<DayLog, 'date' | 'blocks'>): EntradaRevision[] | undefined {
  const base = log ?? [];
  let out = base;
  const f = fondoEn(dia.date);
  for (const b of dia.blocks) {
    const tipo = TIPO_BLOQUE_FONDO[b.key as keyof typeof TIPO_BLOQUE_FONDO];
    if (!tipo) continue;
    const id = `rev-${dia.date}-${b.key}`;
    const item = b.key === 'fondo-sec' ? f.secundaria[0]?.app.id : f.comercial?.id;
    const existe = out.find((x) => x.id === id);
    if (blockDone(b) && item && !existe) out = [...out, { id, fecha: dia.date, min: MIN_HORA_FONDO, item, tipo, bloque: b.key as 'fondo-sec' | 'fondo-com', nota: 'La hora de fondo del día' }];
    else if (!blockDone(b) && existe && existe.min === MIN_HORA_FONDO) out = out.filter((x) => x.id !== id);
  }
  return out === base ? log : out;
}

type Plan = Pick<PlanState, 'hitos'> & { fondo?: Record<string, EstadoItem>; corrimientos?: PlanState['corrimientos'] };
/** Las fechas de un período de fondo con el corrimiento confirmado, si lo hay. */
const fechas = (plan: Plan, id: string, x: { inicio: string; fin: string }) => (plan.corrimientos?.[id] ? { inicio: plan.corrimientos[id].inicio, fin: plan.corrimientos[id].fin } : { inicio: x.inicio, fin: x.fin });

const pausas = PAUSAS_FONDO.map(({ inicio, fin }) => ({ inicio, fin }));
/** Las pausas de un ítem: las fijas y, si lo pausaste a mano, desde ese día. */
const pausasDe = (plan: Plan, id: string) => (plan.fondo?.[id]?.pausado ? [...pausas, { inicio: plan.fondo[id].pausado!, fin: '9999-12-31' }] : pausas);

/** El lanzamiento por defecto: la v3.0 (o la última) en proyectos y apps; la única en los comerciales. */
export const lanzamientoDe = (versiones: { id: string }[], elegido?: string) => elegido ?? (versiones.some((v) => v.id === '3.0') ? '3.0' : versiones[versiones.length - 1]?.id ?? '1.0');

/** Las apps secundarias como períodos, con sus versiones y sus entregables. */
export function periodosSecundarias(plan: Plan): Periodo[] {
  return V122.secundarias.map((s) => ({
    id: s.id, nombre: s.nombre, nivel: 'bloque', inicio: s.inicio, fin: s.fin, track: 'secundaria', pausas: pausasDe(plan, s.id),
    hijos: s.versiones.map((v) => {
      const checklist = v.entregables.map((texto, i) => ({ clave: claveHito.entregable(s.id, v.id, i), texto, hecho: !!plan.hitos?.[claveHito.entregable(s.id, v.id, i)]?.hecho }));
      const publicada = plan.fondo?.[s.id]?.versiones?.[v.id]?.publicada;
      return {
        id: `${s.id}:v${v.id}`, nombre: `${s.nombre} v${v.id}`, nivel: 'version' as const, ...fechas(plan, `${s.id}:v${v.id}`, v), track: 'secundaria' as const, pausas: pausasDe(plan, s.id), checklist,
        progreso: publicada ? 1 : checklist.filter((c) => c.hecho).length / Math.max(1, checklist.length),
      };
    }),
  }));
}

/** Lo que se construye en un slot comercial, como checklist. */
const entregablesComercial = (c: Comercial) => (c.queSeHace ? c.queSeHace.split(/,\s*/) : []);
export const AVANCE_ESTADO: Record<EstadoComercial, number> = { planned: 0, building: 0.4, review: 0.8, published: 1, pitched: 1 };

/** Los slots comerciales como períodos: el trabajo sale de su estado (planificado → … → publicado). */
export function periodosComerciales(plan: Plan): Periodo[] {
  return V122.comerciales.map((c) => {
    const e = plan.fondo?.[c.id];
    const marca = c.marca ?? e?.marca ?? null;
    return {
      id: c.id, nombre: `#${c.n} · ${marca ?? c.sector ?? 'A definir'}`, nivel: 'bloque' as const, ...fechas(plan, c.id, c), track: 'comercial' as const, pausas: pausasDe(plan, c.id),
      progreso: AVANCE_ESTADO[e?.estado ?? 'planned'],
      ...(entregablesComercial(c).length ? { checklist: entregablesComercial(c).map((texto, i) => ({ clave: claveHito.entregable(c.id, '1.0', i), texto, hecho: !!plan.hitos?.[claveHito.entregable(c.id, '1.0', i)]?.hecho })) } : {}),
    };
  });
}

/** Lo de fondo que se corre con su ventana cuando se corre el plan: los slots comerciales y las versiones de las apps secundarias. */
export const itemsDeFondo = () => [
  ...V122.comerciales.map((c) => ({ id: c.id, nombre: `#${c.n} ${c.marca ?? c.sector ?? 'a definir'}`, inicio: c.inicio, fin: c.fin })),
  ...V122.secundarias.flatMap((a) => a.versiones.map((v) => ({ id: `${a.id}:v${v.id}`, nombre: `${a.nombre} v${v.id}`, inicio: v.inicio, fin: v.fin }))),
];

/** Dos períodos de fondo del mismo tipo se pisan (fuera del relevo de las secundarias, que se solapan a propósito unos días). */
export function solapes<T extends { id: string; inicio: string; fin: string }>(xs: T[], toleranciaDias = 0): [string, string][] {
  const out: [string, string][] = [];
  const ys = [...xs].sort((a, b) => a.inicio.localeCompare(b.inicio));
  for (let i = 1; i < ys.length; i++) {
    const a = ys[i - 1];
    const b = ys[i];
    if (b.inicio <= a.fin && addDays(b.inicio, toleranciaDias) <= a.fin) out.push([a.id, b.id]);
  }
  return out;
}

/** v12.2 · el foco bruto de una semana: 10 h × 5 + 11 h × 2 = 72 h. v12.4: lo de fondo sale de esas horas (ver `capacidadSemana`). */
export const CAPACIDAD_SEMANA = (HORAS_LV ?? 10) * 5 + (HORAS_FINDE ?? 11) * 2;

/** El tiempo de revisión de fondo de una semana (aparte de las 72 h): total y por tipo. */
export function revisionSemana(log: EntradaRevision[] | undefined, lunes: string) {
  const dom = addDays(lunes, 6);
  const xs = (log ?? []).filter((x) => x.fecha >= lunes && x.fecha <= dom);
  const por = (t: EntradaRevision['tipo']) => xs.filter((x) => x.tipo === t).reduce((s, x) => s + x.min, 0);
  return { min: xs.reduce((s, x) => s + x.min, 0), walkthrough: por('walkthrough'), diseno: por('diseño'), comercial: por('comercial'), otro: por('otro') };
}

/**
 * La meta de revisión de la semana (v12.4, respuesta 3): 1 h por cada día en que la pista está activa. Con la secundaria activa los 7
 * días son 7 h; con un slot comercial activo, otras 7 h. Un día libre fijo o una pista pausada a mano no suman.
 */
export function metaRevisionSemana(lunes: string, pausadas: readonly PistaFondo[] = []) {
  const apps = new Set<string>();
  let diasSecundaria = 0;
  let diasComercial = 0;
  for (let i = 0; i < 7; i++) {
    const f = fondoEn(addDays(lunes, i));
    if (f.secundaria.length && !pausadas.includes('secundaria')) { diasSecundaria++; for (const s of f.secundaria) apps.add(s.app.id); }
    if (f.comercial && !pausadas.includes('comercial')) diasComercial++;
  }
  return { walkthroughMin: diasSecundaria * 60, comercialMin: diasComercial * 60, diasSecundaria, diasComercial, apps: [...apps] };
}

/**
 * El tiempo comercial va solo en el cierre del día y en la sesión del fin de semana, nunca en un bloque de estudio o de simulacros.
 * Devuelve el aviso si la entrada cae en un bloque de foco de la rutina de ese día (o null).
 */
export function avisoRevision(e: Pick<EntradaRevision, 'fecha' | 'inicio' | 'min' | 'tipo'>, tipoBloque?: string): string | null {
  if (e.tipo !== 'comercial' || !e.inicio) return null;
  const iso = ((new Date(`${e.fecha}T12:00:00`).getDay() + 6) % 7) + 1;
  const dia = ROUTINES_FILE.dayRoutines[iso <= 5 ? 'busqueda-intensiva' : iso === 6 ? 'busqueda-intensiva-finde' : 'busqueda-intensiva-domingo'];
  const a = toMin(e.inicio);
  const b = a + e.min;
  const foco = dia.blocks.find((x) => /^prog(?!-review)/.test(x.id) && a < toMin(x.start) + blockMin(x) && toMin(x.start) < b);
  if (!foco) return null;
  return tipoBloque === 'cert'
    ? `Eso cae en ${foco.label} (${foco.start}–${foco.end}), que hoy es de simulacros: el tiempo comercial va en el cierre o en la sesión del fin de semana.`
    : `Eso cae en ${foco.label} (${foco.start}–${foco.end}), un bloque de estudio: el tiempo comercial va en el cierre o en la sesión del fin de semana.`;
}

/** Revisión en primer plano: la versión toca plata, datos personales, seguridad o smart contracts y no se cierra sin ella. */
export function faltaForeground(areas: AreaForeground[] | undefined, hecha: string | undefined) {
  return !!areas?.length && !hecha;
}

/** Con el uso de Claude en o sobre el umbral, se sugiere pausar primero lo comercial y después lo secundario (nunca solo). */
export function sugerenciaPausas(usoPct: number | undefined, umbral = 85, activo: Pick<FondoActivo, 'secundaria' | 'comercial'>): { pista: 'comercial' | 'secundaria'; id: string; nombre: string }[] {
  if (usoPct == null || usoPct < umbral) return [];
  return [
    ...(activo.comercial ? [{ pista: 'comercial' as const, id: activo.comercial.id, nombre: `#${activo.comercial.n} · ${activo.comercial.marca ?? activo.comercial.sector ?? 'A definir'}` }] : []),
    ...activo.secundaria.map((s) => ({ pista: 'secundaria' as const, id: s.app.id, nombre: `${s.app.nombre} v${s.version}` })),
  ];
}

export interface RecordatorioFondo { id: string; fecha: string; texto: string; href?: string }

/**
 * Los recordatorios de lo de fondo: los de v12.2 (desde su fecha), el brief 7 días antes de cada slot comercial y "elegí la marca"
 * 14 días antes de los que están a definir. Se ven hasta que los marcás hechos (o hasta que el slot empieza).
 */
export function recordatoriosFondo(plan: Plan, hoy: string): RecordatorioFondo[] {
  const hecho = (id: string) => !!plan.hitos?.[`v12:recordatorio:${id}`]?.hecho;
  const out: RecordatorioFondo[] = [];
  // Los relevos de las apps secundarias: el último día de cada una, revisar que llegó a la v3.0 o anotar lo que falta (los arma la app).
  const relevos = V122.secundarias.slice(0, -1).map((a, i) => ({ id: `v124-relevo-${a.id}`, fecha: a.fin, texto: `Secondary handover: ${a.nombre} → ${V122.secundarias[i + 1].nombre}. Check ${a.nombre} reached v3.0 or log what's left.` }));
  for (const r of [...V122.recordatorios, ...relevos]) if (r.fecha <= hoy && !hecho(r.id) && hoy <= addDays(r.fecha, 14)) out.push({ ...r });
  for (const c of V122.comerciales) {
    if (c.inicio <= hoy) continue;
    const marca = c.marca ?? plan.fondo?.[c.id]?.marca;
    // v12.4: 14 días antes de cada slot se pregunta qué marca; la respuesta (regional o grande) queda guardada en `perfilMarca`.
    if (addDays(c.inicio, -14) <= hoy && !plan.fondo?.[c.id]?.perfilMarca && !hecho(`marca-${c.id}`)) out.push({ id: `marca-${c.id}`, fecha: addDays(c.inicio, -14), texto: `Slot #${c.n}${marca ? ` (${marca})` : ''} arranca el ${c.inicio}: ¿marca regional para clientes o marca grande para ruido?`, href: `#/metas/fondo/${c.id}` });
    // El brief va 7 días antes de cada slot; el del #1 es el recordatorio del 3 dic (no hay uno automático).
    if (c.n !== 1 && addDays(c.inicio, -7) <= hoy && !hecho(`brief-${c.id}`)) out.push({ id: `brief-${c.id}`, fecha: addDays(c.inicio, -7), texto: `Prepará el brief del slot #${c.n}${marca ? ` (${marca})` : ''}: gancho, momento wow y qué reusa`, href: `#/metas/fondo/${c.id}` });
  }
  return out;
}
