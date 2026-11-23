/**
 * Ola 23 · estado del clipping: la planilla. Es "el esquema de datos del dashboard" del roadmap:
 * se exporta en JSON para sembrarlo cuando armes tu dashboard (mes 2). Todo acepta fechas pasadas.
 */

export type EstadoCuenta = 'calentando' | 'activa' | 'pausada' | 'baneada';
export type EstadoCampana = 'probando' | 'activa' | 'pausada' | 'agotada' | 'descartada';
export type EstadoRetainer = 'prueba' | 'activo' | 'terminado';

export const ESTADOS_CUENTA: EstadoCuenta[] = ['calentando', 'activa', 'pausada', 'baneada'];
export const ESTADOS_CAMPANA: EstadoCampana[] = ['probando', 'activa', 'pausada', 'agotada', 'descartada'];
export const ESTADOS_RETAINER: EstadoRetainer[] = ['prueba', 'activo', 'terminado'];

export interface Cuenta {
  id: string;
  alias: string;
  /** TikTok, Reels, Shorts… */
  red: string;
  nicho: string;
  /** Estilo de subtítulos, ritmo y horarios: la identidad de la cuenta. */
  estilo?: string;
  estado: EstadoCuenta;
  desde: string;
}

export interface Campana {
  id: string;
  nombre: string;
  /** Whop Content Rewards, Vyro, Clipster… */
  plataforma: string;
  nicho: string;
  /** Tarifa listada en USD por 1.000 views. */
  tarifa: number;
  /** Tope por clip en USD. */
  tope?: number;
  fuente?: string;
  estado: EstadoCampana;
  desde: string;
}

/** Una fila de la planilla: un día (o un clip) de una cuenta en una campaña. */
export interface FilaClip {
  id: string;
  fecha: string;
  cuenta?: string;
  campana?: string;
  clips: number;
  views: number;
  /** Views verificadas por la plataforma; sin cargar, cuentan las views. */
  verificadas?: number;
  aprobados?: number;
  /** Clips con más de 1.000 views. */
  mas1000?: number;
  estimado?: number;
  /** Lo cobrado de verdad por estas views (el pago real sale solo de las filas con cobro). */
  cobrado?: number;
  nota?: string;
}

export interface Retainer {
  id: string;
  nombre: string;
  estado: EstadoRetainer;
  /** El "fijo" mensual en USD. */
  usdMes: number;
  clipsMes?: number;
  desde: string;
  hasta?: string;
}

/** Prospección de una semana (lunes): mensajes enviados y pruebas arrancadas. */
export interface Prospeccion { mensajes: number; pruebas: number }

export interface ClippingState {
  cuentas: Cuenta[];
  campanas: Campana[];
  registro: FilaClip[];
  retainers: Retainer[];
  /** lunes → prospección de la semana. */
  prospeccion: Record<string, Prospeccion>;
  /** lunes → ids de la rutina semanal tildados. */
  rutina: Record<string, string[]>;
  /** Lo último elegido en la hoja de registro. */
  ultima?: { cuenta?: string; campana?: string };
}

export const emptyClipping = (): ClippingState => ({ cuentas: [], campanas: [], registro: [], retainers: [], prospeccion: {}, rutina: {} });

const arr = <T,>(x: unknown): T[] => (Array.isArray(x) ? (x as T[]) : []);
const obj = <T,>(x: unknown): Record<string, T> => (x && typeof x === 'object' && !Array.isArray(x) ? (x as Record<string, T>) : {});

/** Lleva un estado guardado (o nada) a la forma actual, sin perder lo cargado. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function migrarClipping(x: any): ClippingState {
  if (!x || typeof x !== 'object') return emptyClipping();
  return {
    ...emptyClipping(),
    cuentas: arr<Cuenta>(x.cuentas),
    campanas: arr<Campana>(x.campanas),
    registro: arr<FilaClip>(x.registro).map(numerosDeFila),
    retainers: arr<Retainer>(x.retainers),
    prospeccion: obj<Prospeccion>(x.prospeccion),
    rutina: obj<string[]>(x.rutina),
    ...(x.ultima ? { ultima: x.ultima } : {}),
  };
}

/**
 * Los números de una fila como números: una planilla importada puede traerlos como texto ("12.50"), y sumar texto los pega en vez
 * de sumarlos. Los opcionales que no son números se sacan.
 */
function numerosDeFila(f: FilaClip): FilaClip {
  const r: FilaClip = { ...f, clips: Number(f.clips) || 0, views: Number(f.views) || 0 };
  for (const k of ['verificadas', 'aprobados', 'mas1000', 'estimado', 'cobrado'] as const) {
    if (r[k] == null) continue;
    const n = Number(r[k]);
    if (Number.isFinite(n)) r[k] = n; else delete r[k];
  }
  return r;
}

/** Verifica una planilla importada; devuelve los errores por línea (vacío si está bien). */
export function validarPlanilla(x: unknown): string[] {
  const e: string[] = [];
  if (!x || typeof x !== 'object') return ['La planilla tiene que ser un objeto con "registro", "cuentas", "campanas" o "retainers".'];
  const o = x as Record<string, unknown>;
  const fecha = (v: unknown) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
  arr<Record<string, unknown>>(o.registro).forEach((f, i) => {
    if (!fecha(f.fecha)) e.push(`registro ${i + 1}: "fecha" tiene que ser AAAA-MM-DD`);
    if (!(Number(f.clips) >= 0)) e.push(`registro ${i + 1}: "clips" tiene que ser 0 o más`);
    if (!(Number(f.views) >= 0)) e.push(`registro ${i + 1}: "views" tiene que ser 0 o más`);
    for (const k of ['verificadas', 'aprobados', 'mas1000', 'estimado', 'cobrado']) if (f[k] != null && !(Number(f[k]) >= 0)) e.push(`registro ${i + 1}: "${k}" tiene que ser 0 o más`);
    if (f.aprobados != null && Number(f.aprobados) > Number(f.clips)) e.push(`registro ${i + 1}: hay más aprobados que clips`);
  });
  arr<Record<string, unknown>>(o.cuentas).forEach((c, i) => {
    if (!c.alias) e.push(`cuenta ${i + 1}: falta "alias"`);
    if (c.estado && !ESTADOS_CUENTA.includes(c.estado as EstadoCuenta)) e.push(`cuenta ${i + 1}: estado ${ESTADOS_CUENTA.join(', ')}`);
  });
  arr<Record<string, unknown>>(o.campanas).forEach((c, i) => {
    if (!c.nombre) e.push(`campaña ${i + 1}: falta "nombre"`);
    if (!(Number(c.tarifa) >= 0)) e.push(`campaña ${i + 1}: "tarifa" tiene que ser 0 o más`);
    if (c.estado && !ESTADOS_CAMPANA.includes(c.estado as EstadoCampana)) e.push(`campaña ${i + 1}: estado ${ESTADOS_CAMPANA.join(', ')}`);
  });
  arr<Record<string, unknown>>(o.retainers).forEach((r, i) => {
    if (!r.nombre) e.push(`retainer ${i + 1}: falta "nombre"`);
    if (!(Number(r.usdMes) >= 0)) e.push(`retainer ${i + 1}: "usdMes" tiene que ser 0 o más`);
    if (!fecha(r.desde)) e.push(`retainer ${i + 1}: "desde" tiene que ser AAAA-MM-DD`);
  });
  return e;
}
