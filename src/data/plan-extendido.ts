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
  /** v2 (ola 24): semanas extra por la plataforma extra (mobile, escritorio, VR o AR). */
  extraPlataforma: number;
  /** v2 (ola 24): semanas extra por la capa de arquitectura (microservicios y microfrontends). */
  extraArquitectura: number;
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
  /** Ola 26 (v2.1): las tecnologías del proyecto, cada una con su marca, y su historial de cambios. */
  tecnologias?: Tecnologia[];
  historial?: CambioProyecto[];
  /** Si el proyecto se pasa de horas: lo que se recorta primero, en este orden (nombres de `tecnologias`). */
  recortarPrimero?: string[];
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
  /** v2 (ola 24): la plataforma extra del proyecto (tabla 3.8). */
  plataforma?: string;
  /** v2 (ola 24): la capa de arquitectura del proyecto. */
  arquitectura?: string;
  /** Lleva el checklist de arquitectura (contrato probado, trazas, mTLS y ADR): P1, P5, P10, S1 y Q5. */
  entregablesArquitectura?: boolean;
}

/**
 * Ola 26 · una tecnología de un proyecto. Sin marca: parte del trabajo del proyecto. `nueva`: la que
 * se aprende ahí (una por proyecto como máximo). `reusada`: viene de un proyecto anterior (`desde`).
 * `movida`: cambió de proyecto y aparece solo en su destino (`desde` es de dónde salió).
 */
export type MarcaTecnologia = 'nueva' | 'reusada' | 'movida';
export const MARCAS: MarcaTecnologia[] = ['nueva', 'reusada', 'movida'];
export interface Tecnologia {
  nombre: string;
  marca?: MarcaTecnologia;
  /** reusada o movida: el proyecto de origen. */
  desde?: string;
  /** Otros nombres con los que aparece en una vacante ("k8s" para Kubernetes). */
  alias?: string[];
  opcional?: boolean;
  nota?: string;
}
export interface CambioProyecto { fecha: string; cambio: string; motivo: string }
export interface Descartada { nombre: string; motivo: string; fecha: string }

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
  /** v2 (ola 24): versiones del examen, con la fecha en que se retiran o salen. */
  versiones?: VersionExamen[];
}

export interface VersionExamen { id: string; nombre: string; retiro?: string; sale?: string }

export interface EtapaExt {
  n: 1 | 2 | 3 | 4;
  nombre: string;
  /** Perfil vendible al cerrar la etapa. */
  perfil: string;
  semanasBase: number;
  semanasExtra: number;
  semanasPlataforma: number;
  semanasArquitectura: number;
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
  /** Ola 26: tecnologías que se pidieron y se dejaron afuera "por ahora", con el motivo. */
  descartadas?: Descartada[];
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
    for (const k of ['extraPlataforma', 'extraArquitectura'] as const) {
      if (!Number.isInteger(b[k]) || b[k] < 0) err.push(`${en}: ${k} tiene que ser un entero de 0 o más`);
      if (b[k] > 0 && b.tipo !== 'proyecto') err.push(`${en}: solo un proyecto lleva ${k}`);
    }
    if (b.extraPlataforma > 0 && !b.ficha?.plataforma) err.push(`${en}: suma semanas de plataforma pero la ficha no dice cuál`);
    if (b.extraArquitectura > 0 && !b.ficha?.arquitectura) err.push(`${en}: suma semanas de arquitectura pero la ficha no dice cuál`);
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
  validarTecnologias(bloques, pos, d?.descartadas ?? [], err);
  for (const p of d?.perfilesHito ?? []) if (!pos.has(p.despues)) err.push(`perfil "${p.perfil}": el bloque ${p.despues} no existe`);

  // Sumas por etapa.
  for (const e of etapas) {
    const bs = bloques.filter((b) => b.etapa === e.n);
    if (!bs.length) err.push(`etapa ${e.n}: sin bloques`);
    const base = bs.reduce((s, b) => s + b.base, 0);
    const extra = bs.reduce((s, b) => s + b.extra, 0);
    const plat = bs.reduce((s, b) => s + b.extraPlataforma, 0);
    const arq = bs.reduce((s, b) => s + b.extraArquitectura, 0);
    if (base !== e.semanasBase) err.push(`etapa ${e.n}: las semanas base suman ${base} y dice ${e.semanasBase}`);
    if (extra !== e.semanasExtra) err.push(`etapa ${e.n}: las semanas extra suman ${extra} y dice ${e.semanasExtra}`);
    if (plat !== e.semanasPlataforma) err.push(`etapa ${e.n}: las semanas de plataforma suman ${plat} y dice ${e.semanasPlataforma}`);
    if (arq !== e.semanasArquitectura) err.push(`etapa ${e.n}: las semanas de arquitectura suman ${arq} y dice ${e.semanasArquitectura}`);
  }
  for (const n of new Set(bloques.map((b) => b.etapa))) if (![1, 2, 3, 4].includes(n) || !etapas.some((e) => e.n === n)) err.push(`etapa ${n}: no está declarada en etapas`);
  return err;
}

const norm = (x: string) => x.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
const FECHA = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Ola 26 · valida las tecnologías de los proyectos: sin repetidas dentro de un proyecto, una sola
 * "nueva", las "movidas" solo en su destino (no siguen en el proyecto de origen ni aparecen dos
 * veces), las "reusadas" vienen de un proyecto anterior que la tiene, y lo descartado no se cuela.
 */
export function validarTecnologias(bloques: BloqueExt[], pos: Map<string, number>, descartadas: Descartada[], err: string[]) {
  const movidas = new Map<string, string>();
  for (const b of bloques) {
    if (b.tipo !== 'proyecto') { if (b.tecnologias?.length) err.push(`${b.id}: solo un proyecto lleva tecnologías`); continue; }
    if (!Array.isArray(b.tecnologias)) { err.push(`${b.id}: falta la lista de tecnologías`); continue; }
    const vistas = new Set<string>();
    let nuevas = 0;
    for (const t of b.tecnologias) {
      const k = norm(t.nombre ?? '');
      if (!k) { err.push(`${b.id}: tecnología sin nombre`); continue; }
      if (vistas.has(k)) err.push(`${b.id}: tecnología repetida (${t.nombre})`);
      vistas.add(k);
      if (t.marca && !MARCAS.includes(t.marca)) err.push(`${b.id} · ${t.nombre}: marca desconocida (${t.marca})`);
      if (t.marca === 'nueva') nuevas++;
      if (t.marca === 'nueva' && t.desde) err.push(`${b.id} · ${t.nombre}: una nueva no tiene "desde"`);
      if (t.marca === 'movida' || t.marca === 'reusada') {
        const j = t.desde ? pos.get(t.desde) : undefined;
        const origen = j == null ? undefined : bloques[j];
        if (!t.desde || !origen || origen.tipo !== 'proyecto') err.push(`${b.id} · ${t.nombre}: "${t.marca}" necesita "desde" con un proyecto que exista`);
        else if (j! >= pos.get(b.id)!) err.push(`${b.id} · ${t.nombre}: "desde" (${t.desde}) tiene que ir antes`);
        else {
          const enOrigen = origen.tecnologias?.some((o) => norm(o.nombre) === k);
          if (t.marca === 'movida' && enOrigen) err.push(`${b.id} · ${t.nombre}: es movida y sigue en ${t.desde} (tiene que aparecer solo en su destino)`);
          if (t.marca === 'reusada' && !enOrigen) err.push(`${b.id} · ${t.nombre}: es reusada pero ${t.desde} no la tiene`);
        }
      }
      if (t.marca === 'movida') {
        if (movidas.has(k)) err.push(`${t.nombre}: movida en ${movidas.get(k)} y en ${b.id} (solo en su destino)`);
        movidas.set(k, b.id);
      }
      for (const d of descartadas) if (norm(d.nombre) && k.includes(norm(d.nombre))) err.push(`${b.id}: ${t.nombre} está descartada por ahora (${d.nombre})`);
    }
    if (nuevas > 1) err.push(`${b.id}: hay ${nuevas} tecnologías nuevas y el máximo es una`);
    for (const r of b.recortarPrimero ?? []) if (!vistas.has(norm(r))) err.push(`${b.id}: recortarPrimero menciona ${r}, que no está en sus tecnologías`);
    for (const h of b.historial ?? []) if (!FECHA.test(h.fecha) || !h.cambio || !h.motivo) err.push(`${b.id}: el historial pide fecha AAAA-MM-DD, cambio y motivo`);
  }
  for (const d of descartadas) if (!d.nombre || !d.motivo || !FECHA.test(d.fecha)) err.push(`descartada ${d.nombre || '(sin nombre)'}: pide nombre, motivo y fecha`);
}

const doc = raw as unknown as PlanExtendido;
const problemas = validar(doc);
if (problemas.length) console.error('data/plan-extendido.json tiene problemas:\n' + problemas.join('\n'));

// La tecnología nueva de la ficha sale de la lista (una sola fuente): "garak y PyRIT (si se confirma el reemplazo)".
for (const b of doc.bloques) {
  const n = b.tecnologias?.find((t) => t.marca === 'nueva');
  if (b.ficha && n) b.ficha.tecnologiaNueva = `${n.nombre}${n.nota ? ` (${n.nota})` : ''}`;
}

export const PLAN_EXT: PlanExtendido = doc;
export const T0_EXT = doc.t0;
export const BLOQUES_EXT = doc.bloques;
export const bloqueExtPorId = (id: string) => BLOQUES_EXT.find((b) => b.id === id);

// ——— calendario derivado ———

/** Un switch de extras: `true` o `false` para todos, o un mapa por bloque sobre el valor por defecto. */
export type Switch = boolean | Record<string, boolean>;

export interface Opciones {
  /** Inicio del plan; por defecto el T0 del plan (si el usuario instaló otro día, el suyo). */
  t0?: string;
  /** Semanas extra de feature (por defecto, prendidas en todos los proyectos). */
  extras?: Switch;
  /** v2: semanas extra de plataforma (por defecto, prendidas). */
  plataforma?: Switch;
  /** v2: semanas extra de arquitectura (por defecto, prendidas). */
  arquitectura?: Switch;
  /**
   * v2: pausa de fin de año automática (por defecto, prendida): la semana cuyo lunes cae entre el
   * 18 y el 24 de diciembre. Si cae dentro de un bloque, lo parte y lo corre una semana.
   */
  pausas?: boolean;
  /** Semanas de atraso por bloque (puerta de matemática sin aprobar, proyecto que se pasó). */
  atrasos?: Record<string, number>;
}

export interface BloqueFechado extends BloqueExt {
  /** Semanas de trabajo con las opciones elegidas (base + extras + atraso, o lo que quedó del colchón). */
  semanas: number;
  /** Semana del plan en que empieza y en que termina (1 es la de T0); incluye las pausas que lo parten. */
  desde: number;
  hasta: number;
  /** Lunes del primer día y domingo del último. */
  inicio: string;
  fin: string;
  /** Extras que se sumaron (feature, plataforma y arquitectura). */
  extraAplicado: number;
  plataformaAplicada: number;
  arquitecturaAplicada: number;
  /** Semanas de atraso propias. */
  atraso: number;
  /** Colchón: semanas que se comió el atraso de la etapa. */
  absorbido: number;
  /** Semanas del plan que son pausa de fin de año dentro del bloque (lo parten). */
  pausasDentro: number[];
  /** Es una pausa de fin de año insertada por el motor. */
  pausa?: true;
}

/** ¿La semana que arranca este día es la pausa de fin de año? (su primer día cae entre el 18 y el 24 de diciembre). */
export const esSemanaDePausa = (lunes: string) => lunes.slice(5, 7) === '12' && Number(lunes.slice(8, 10)) >= 18 && Number(lunes.slice(8, 10)) <= 24;

const leer = (sw: Switch | undefined, id: string) => (typeof sw === 'object' ? sw[id] ?? true : sw ?? true);

/**
 * Deriva las fechas. Una ventana siempre va antes de su proyecto; si hay atraso, el colchón de la
 * etapa lo absorbe (hasta sus semanas) y solo lo que sobra corre las fechas siguientes. Con
 * `pausas`, cada diciembre se inserta una pausa: entre bloques o partiendo el bloque en el que cae.
 */
export function calendario(plan: PlanExtendido = PLAN_EXT, o: Opciones = {}): BloqueFechado[] {
  const t0 = o.t0 ?? plan.t0;
  const conPausas = o.pausas ?? true;
  const lunesDe = (w: number) => addDays(t0, (w - 1) * 7);
  const pausaEn = (w: number) => conPausas && esSemanaDePausa(lunesDe(w));
  const out: BloqueFechado[] = [];
  const pausa = (w: number, etapa: 1 | 2 | 3 | 4): BloqueFechado => ({
    id: `PAUSA-${lunesDe(w).slice(0, 4)}`, etapa, tipo: 'descanso', nombre: 'Pausa de fin de año', base: 1, extra: 0, extraPlataforma: 0, extraArquitectura: 0,
    que: 'Una semana sin programación entre Navidad y Año Nuevo; la matemática diaria y lo demás siguen.',
    semanas: 1, desde: w, hasta: w, inicio: lunesDe(w), fin: addDays(lunesDe(w), 6), extraAplicado: 0, plataformaAplicada: 0, arquitecturaAplicada: 0, atraso: 0, absorbido: 0, pausasDentro: [], pausa: true,
  });
  let semana = 0;
  let etapa = 0;
  let pendiente = 0;
  for (const b of plan.bloques) {
    if (b.etapa !== etapa) { etapa = b.etapa; pendiente = 0; }
    const proy = b.tipo === 'proyecto';
    const extraAplicado = proy && leer(o.extras, b.id) ? b.extra : 0;
    const plataformaAplicada = proy && leer(o.plataforma, b.id) ? b.extraPlataforma ?? 0 : 0;
    const arquitecturaAplicada = proy && leer(o.arquitectura, b.id) ? b.extraArquitectura ?? 0 : 0;
    const atraso = Math.max(0, Math.round(o.atrasos?.[b.id] ?? 0));
    let semanas: number;
    let absorbido = 0;
    if (b.tipo === 'colchon') {
      absorbido = Math.min(b.base, pendiente);
      semanas = b.base - absorbido;
      pendiente = 0;
    } else {
      semanas = b.base + extraAplicado + plataformaAplicada + arquitecturaAplicada + atraso;
      pendiente += atraso;
    }
    const extras = { extraAplicado, plataformaAplicada, arquitecturaAplicada, atraso, absorbido };
    // Un colchón consumido del todo dura 0 semanas: no ocupa fechas.
    if (semanas === 0) {
      out.push({ ...b, ...extras, semanas, desde: semana + 1, hasta: semana, inicio: lunesDe(semana + 1), fin: addDays(lunesDe(semana + 1), -1), pausasDentro: [] });
      continue;
    }
    // La pausa que cae justo antes del bloque va entre los dos.
    while (pausaEn(semana + 1)) { semana++; out.push(pausa(semana, b.etapa)); }
    const desde = semana + 1;
    const pausasDentro: number[] = [];
    let quedan = semanas;
    while (quedan > 0) {
      semana++;
      if (pausaEn(semana)) pausasDentro.push(semana);
      else quedan--;
    }
    out.push({ ...b, ...extras, semanas, desde, hasta: semana, inicio: lunesDe(desde), fin: addDays(t0, semana * 7 - 1), pausasDentro });
    // La pausa que parte el bloque va después de él en la lista (sus fechas están adentro del bloque).
    for (const w of pausasDentro) out.push(pausa(w, b.etapa));
  }
  return out;
}

/** Opciones del calendario a partir de lo guardado: ids con el extra apagado ("P1" es feature; "P1:plataforma" y "P1:arquitectura") y la pausa. */
export function opcionesDe(apagados: readonly string[] = [], pausas = true, t0?: string): Opciones {
  const de = (k: string) => Object.fromEntries(apagados.filter((x) => x.endsWith(`:${k}`)).map((x) => [x.split(':')[0], false]));
  return {
    ...(t0 ? { t0 } : {}),
    extras: Object.fromEntries(apagados.filter((x) => !x.includes(':')).map((id) => [id, false])),
    plataforma: de('plataforma'),
    arquitectura: de('arquitectura'),
    pausas,
  };
}

/** Semanas totales del calendario (con las pausas). */
export const totalSemanas = (cal: BloqueFechado[]) => cal.reduce((s, b) => s + b.semanas, 0);

/** Último día de una etapa. */
export function finEtapa(cal: BloqueFechado[], n: number) {
  const bs = cal.filter((b) => b.etapa === n && b.semanas > 0);
  return bs.length ? bs.reduce((m, b) => (b.fin > m ? b.fin : m), bs[0].fin) : null;
}

/** El bloque que está en curso en una fecha (null antes de T0 o después del final). */
export function bloqueEn(cal: BloqueFechado[], fecha: string): BloqueFechado | null {
  // Una pausa que parte un bloque gana: esa semana no se programa.
  return cal.find((b) => b.pausa && fecha >= b.inicio && fecha <= b.fin) ?? cal.find((b) => b.semanas > 0 && fecha >= b.inicio && fecha <= b.fin) ?? null;
}

/** Semana del plan (1 es la de T0) en la que cae una fecha; 0 o negativa si es anterior. */
export function semanaDe(fecha: string, t0: string = PLAN_EXT.t0) {
  return Math.floor((parseDate(fecha).getTime() - parseDate(t0).getTime()) / (7 * 864e5)) + 1;
}
