/**
 * Plan T+18 extendido (ola 16a): 4 etapas, 56 bloques (proyectos, ventanas de matemática,
 * certificaciones, pausas, colchón y cierres). Fuente: data/plan-extendido.json, que sale de la
 * tabla de docs/prompts/plan-t18-extendido.md.
 *
 * Puro, sin estado. Las fechas NO están en el JSON: se derivan sumando semanas desde T0, así
 * cambiar una duración recalcula todo lo que sigue. Todavía no lo usa ninguna pantalla (ola 16b).
 */
import raw from '../../data/plan-extendido.json';
import { addDays, parseDate } from './time';

export type TipoBloque = 'proyecto' | 'ventana' | 'cert' | 'descanso' | 'colchon' | 'cierre';
export const TIPOS_BLOQUE: TipoBloque[] = ['proyecto', 'ventana', 'cert', 'descanso', 'colchon', 'cierre'];

export interface BloqueExt {
  id: string;
  etapa: 1 | 2 | 3 | 4;
  tipo: TipoBloque;
  nombre: string;
  /** Semanas del plan original. */
  base: number;
  /** Semanas extra por la feature diferencial (solo proyectos). */
  extra: number;
  /** Bloques que tienen que ir antes (la ventana que abre el proyecto). */
  dependeDe?: string[];
  /** Propuesta de reemplazo, pendiente de confirmar ("red teaming de agentes"). */
  alternativa?: string;
  /** Si falta tiempo, se recorta este bloque. */
  recortable?: boolean;
  /** Detalle para las pantallas (los bloques que no estaban en data/plan.json). */
  que?: string;
  corto?: string;
  perfil?: string;
  /** Ventanas: libros principales y qué proyecto habilitan. */
  libros?: string[];
  habilita?: string;
  /** Ola 16c: ficha de un proyecto, matemática de una ventana y datos de una certificación. */
  ficha?: Ficha;
  mate?: MateTramo;
  cert?: CertInfo;
}

/** Ficha de un proyecto: lo que lo hace distinto y cómo se prueba. */
export interface Ficha {
  rubro?: string;
  tecnologiaNueva?: string;
  feature?: string;
  visual?: string;
  /** La pieza matemática hecha a mano y contrastada con una referencia. */
  pieza?: string;
  /** Contra qué se mide (referencia externa). */
  referencia?: string;
  /** Quién lo valida (experto del rubro, PR aceptado o certificación). */
  validador?: string;
  perfil?: string;
}

/** Rol de un libro de refuerzo: se abre según el tipo de error. */
export type RolRefuerzo = 'intuicion' | 'banco' | 'duro' | 'curso';
export const ROL_REFUERZO: Record<RolRefuerzo, string> = { intuicion: 'Intuición', banco: 'Banco de ejercicios', duro: 'Libro duro', curso: 'Curso de apoyo' };

/** Matemática de un tramo (ventana o diario): libro principal, refuerzo, qué habilita y el perfil. */
export interface MateTramo {
  nombre?: string;
  principal: string[];
  refuerzo: { titulo: string; rol: RolRefuerzo }[];
  /** Ids de proyecto (ventanas) o texto (tramos diarios). */
  habilita: string[];
  perfil: string;
  /** Fase de M0 a M10 (data/study-roadmaps.json) que aporta el material de refuerzo extra. */
  fase?: string;
  /** Ola 20 · nivel de salida de una ventana: criterios que se tildan antes del test de la puerta. */
  salida?: string[];
}

export interface CertInfo {
  /** Costo tal como está en el prompt; sin valor, "sin verificar". */
  costo?: string;
  /** true si el precio y la versión se verificaron (el 15 nov 2026). */
  verificado: boolean;
  notas?: string;
  /** Fecha de una decisión pendiente (Security+). */
  decision?: string;
  /** Certificación que exige antes (CKS exige CKA). */
  requiere?: string;
}

export interface EtapaExt {
  n: 1 | 2 | 3 | 4;
  nombre: string;
  /** Perfil vendible al cerrar la etapa. */
  perfil: string;
  semanasBase: number;
  semanasExtra: number;
}

export interface PlanExtendido {
  version: 1;
  t0: string;
  etapas: EtapaExt[];
  bloques: BloqueExt[];
  /** El roadmap de matemática del plan: los tramos diarios (las ventanas van en sus bloques). */
  matematica: {
    principio: string;
    /** Tipo de error → roles de refuerzo que se abren (concepto → intuición, técnica → banco…). */
    reglaRefuerzo: Record<string, RolRefuerzo[]>;
    diarios: Record<string, MateTramo & { nombre: string }>;
  };
  /** Perfiles vendibles por hito: el que tenés al cerrar ese bloque. */
  perfilesHito: { despues: string; perfil: string; nota: string }[];
  /** Decisiones abiertas: flags editables, no se resuelven en el código. */
  decisiones: { id: string; texto: string; fecha?: string }[];
}

// ——— validación ———

/** Revisa el JSON a mano (sin dependencias). Devuelve los problemas; vacía si está bien. */
export function validar(doc: unknown): string[] {
  const err: string[] = [];
  const d = doc as Partial<PlanExtendido>;
  if (!d || d.version !== 1) err.push('version debe ser 1');
  if (!d?.t0 || !/^\d{4}-\d{2}-\d{2}$/.test(d.t0) || parseDate(d.t0).getDay() !== 1) err.push('t0 tiene que ser un lunes (AAAA-MM-DD)');
  const bloques = d?.bloques ?? [];
  const etapas = d?.etapas ?? [];
  if (!bloques.length) return [...err, 'bloques vacío'];

  const pos = new Map<string, number>();
  bloques.forEach((b, i) => {
    if (!b.id) err.push(`bloque #${i + 1}: id vacío`);
    else if (pos.has(b.id)) err.push(`${b.id}: id repetido`);
    pos.set(b.id, i);
  });

  bloques.forEach((b, i) => {
    const en = b.id;
    if (!b.nombre) err.push(`${en}: sin nombre`);
    if (!TIPOS_BLOQUE.includes(b.tipo)) err.push(`${en}: tipo desconocido (${b.tipo})`);
    if (![1, 2, 3, 4].includes(b.etapa)) err.push(`${en}: etapa inválida (${b.etapa})`);
    if (!Number.isInteger(b.base) || b.base < 1) err.push(`${en}: base tiene que ser un entero de 1 o más`);
    if (!Number.isInteger(b.extra) || b.extra < 0) err.push(`${en}: extra tiene que ser un entero de 0 o más`);
    if (b.extra > 0 && b.tipo !== 'proyecto') err.push(`${en}: solo un proyecto lleva semanas extra de feature`);
    if (b.alternativa && b.tipo !== 'proyecto') err.push(`${en}: solo un proyecto tiene alternativa`);
    if (i > 0 && bloques[i - 1].etapa > b.etapa) err.push(`${en}: las etapas van en orden (la ${b.etapa} viene después de la ${bloques[i - 1].etapa})`);
    for (const dep of b.dependeDe ?? []) {
      const j = pos.get(dep);
      if (j == null) err.push(`${en}: depende de un bloque que no existe (${dep})`);
      else if (j >= i) err.push(`${en}: depende de ${dep}, que va después (una ventana va siempre antes del proyecto que la pide)`);
      else if (bloques[j].tipo !== 'ventana') err.push(`${en}: depende de ${dep}, que no es una ventana`);
    }
  });

  // Ciclos en dependeDe (con el orden ya validado no debería haber, pero se revisa igual).
  const estado = new Map<string, 1 | 2>();
  const visitar = (id: string, ruta: string[]) => {
    if (estado.get(id) === 2) return;
    if (estado.get(id) === 1) { err.push(`ciclo de dependencias: ${[...ruta, id].join(' → ')}`); return; }
    estado.set(id, 1);
    for (const dep of bloques[pos.get(id) ?? -1]?.dependeDe ?? []) if (pos.has(dep)) visitar(dep, [...ruta, id]);
    estado.set(id, 2);
  };
  for (const b of bloques) visitar(b.id, []);

  // Ola 16c: cada proyecto con su ficha, cada ventana con su matemática y cada certificación con sus datos.
  for (const b of bloques) {
    if (b.tipo === 'proyecto' && !b.ficha?.perfil) err.push(`${b.id}: proyecto sin ficha (perfil)`);
    if (b.tipo === 'ventana') {
      if (!b.mate?.principal?.length || !b.mate.perfil) err.push(`${b.id}: ventana sin libro principal o perfil`);
      for (const h of b.mate?.habilita ?? []) {
        const j = pos.get(h);
        if (j == null) err.push(`${b.id}: habilita un bloque que no existe (${h})`);
        else if (j <= pos.get(b.id)!) err.push(`${b.id}: habilita ${h}, que va antes`);
      }
    }
    if (b.tipo === 'cert' && !b.cert) err.push(`${b.id}: certificación sin datos (costo y verificación)`);
    if (b.cert?.requiere && !pos.has(b.cert.requiere)) err.push(`${b.id}: requiere una certificación que no existe (${b.cert.requiere})`);
  }
  for (const p of d?.perfilesHito ?? []) if (!pos.has(p.despues)) err.push(`perfil "${p.perfil}": el bloque ${p.despues} no existe`);

  // Sumas por etapa.
  for (const e of etapas) {
    const bs = bloques.filter((b) => b.etapa === e.n);
    if (!bs.length) err.push(`etapa ${e.n}: sin bloques`);
    const base = bs.reduce((s, b) => s + b.base, 0);
    const extra = bs.reduce((s, b) => s + b.extra, 0);
    if (base !== e.semanasBase) err.push(`etapa ${e.n}: las semanas base suman ${base} y dice ${e.semanasBase}`);
    if (extra !== e.semanasExtra) err.push(`etapa ${e.n}: las semanas extra suman ${extra} y dice ${e.semanasExtra}`);
  }
  for (const n of new Set(bloques.map((b) => b.etapa))) if (![1, 2, 3, 4].includes(n) || !etapas.some((e) => e.n === n)) err.push(`etapa ${n}: no está declarada en etapas`);
  return err;
}

const doc = raw as unknown as PlanExtendido;
const problemas = validar(doc);
if (problemas.length) console.error('data/plan-extendido.json tiene problemas:\n' + problemas.join('\n'));

export const PLAN_EXT: PlanExtendido = doc;
export const T0_EXT = doc.t0;
export const BLOQUES_EXT = doc.bloques;
export const bloqueExtPorId = (id: string) => BLOQUES_EXT.find((b) => b.id === id);

// ——— calendario derivado ———

export interface Opciones {
  /** Inicio del plan; por defecto el T0 del plan (si el usuario instaló otro día, el suyo). */
  t0?: string;
  /**
   * Semanas extra de feature: `true` (por defecto) las suma en todos los proyectos, `false` en
   * ninguno, o un mapa por bloque ({ P1: false }) sobre el valor por defecto.
   */
  extras?: boolean | Record<string, boolean>;
  /** Semanas de atraso por bloque (puerta de matemática sin aprobar, proyecto que se pasó). */
  atrasos?: Record<string, number>;
}

export interface BloqueFechado extends BloqueExt {
  /** Semanas que dura con las opciones elegidas (base + extra + atraso, o lo que quedó del colchón). */
  semanas: number;
  /** Semana del plan en que empieza y en que termina (1 es la de T0). */
  desde: number;
  hasta: number;
  /** Lunes del primer día y domingo del último. */
  inicio: string;
  fin: string;
  /** Extra de feature que se sumó. */
  extraAplicado: number;
  /** Semanas de atraso propias. */
  atraso: number;
  /** Colchón: semanas que se comió el atraso de la etapa. */
  absorbido: number;
}

/**
 * Deriva las fechas. Una ventana siempre va antes de su proyecto; si hay atraso, el colchón de la
 * etapa lo absorbe (hasta sus semanas) y solo lo que sobra corre las fechas siguientes.
 */
export function calendario(plan: PlanExtendido = PLAN_EXT, o: Opciones = {}): BloqueFechado[] {
  const t0 = o.t0 ?? plan.t0;
  const porDefecto = typeof o.extras === 'boolean' ? o.extras : true;
  const quiere = (id: string) => (typeof o.extras === 'object' ? o.extras[id] ?? porDefecto : porDefecto);
  let semana = 0;
  let etapa = 0;
  let pendiente = 0;
  return plan.bloques.map((b) => {
    if (b.etapa !== etapa) { etapa = b.etapa; pendiente = 0; }
    const extraAplicado = b.tipo === 'proyecto' && quiere(b.id) ? b.extra : 0;
    const atraso = Math.max(0, Math.round(o.atrasos?.[b.id] ?? 0));
    let semanas: number;
    let absorbido = 0;
    if (b.tipo === 'colchon') {
      absorbido = Math.min(b.base, pendiente);
      semanas = b.base - absorbido;
      pendiente = 0;
    } else {
      semanas = b.base + extraAplicado + atraso;
      pendiente += atraso;
    }
    const desde = semana + 1;
    const hasta = semana + semanas;
    semana = hasta;
    // Un colchón consumido del todo dura 0 semanas: no ocupa fechas.
    const inicio = addDays(t0, (desde - 1) * 7);
    const fin = semanas > 0 ? addDays(t0, hasta * 7 - 1) : addDays(t0, (desde - 1) * 7 - 1);
    return { ...b, semanas, desde, hasta, inicio, fin, extraAplicado, atraso, absorbido };
  });
}

/** Semanas totales del calendario. */
export const totalSemanas = (cal: BloqueFechado[]) => cal.reduce((s, b) => s + b.semanas, 0);

/** Último día de una etapa. */
export function finEtapa(cal: BloqueFechado[], n: number) {
  const bs = cal.filter((b) => b.etapa === n && b.semanas > 0);
  return bs.length ? bs[bs.length - 1].fin : null;
}

/** El bloque que está en curso en una fecha (null antes de T0 o después del final). */
export function bloqueEn(cal: BloqueFechado[], fecha: string): BloqueFechado | null {
  return cal.find((b) => b.semanas > 0 && fecha >= b.inicio && fecha <= b.fin) ?? null;
}

/** Semana del plan (1 es la de T0) en la que cae una fecha; 0 o negativa si es anterior. */
export function semanaDe(fecha: string, t0: string = PLAN_EXT.t0) {
  return Math.floor((parseDate(fecha).getTime() - parseDate(t0).getTime()) / (7 * 864e5)) + 1;
}
