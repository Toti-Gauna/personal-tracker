/**
 * Plan T+18 extendido (ola 16a; roadmap v7 desde la ola 29): 4 etapas (proyectos, ventanas de matemática,
 * certificaciones, pausas, colchón y cierres). Fuente: data/plan-extendido.json, que sale de la
 * tabla de docs/prompts/plan-t18-extendido.md.
 *
 * Puro, sin estado. Las fechas NO están en el JSON: se derivan sumando semanas desde T0, así
 * cambiar una duración recalcula todo lo que sigue. Todavía no lo usa ninguna pantalla (ola 16b).
 */
import raw from '../../data/plan-extendido.json';
import { addDays, parseDate } from './time';

export type TipoBloque = 'proyecto' | 'ventana' | 'cert' | 'descanso' | 'colchon' | 'cierre' | 'sumas' | 'ingles' | 'busqueda';
export const TIPOS_BLOQUE: TipoBloque[] = ['proyecto', 'ventana', 'cert', 'descanso', 'colchon', 'cierre', 'sumas', 'ingles', 'busqueda'];

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
  /** v3: lo que lleva un bloque de sumas (la consola Electron de P1, la app de Expo de P2…). */
  items?: { nombre: string; desde?: string; opcional?: boolean }[];
  /** v7 (ola 29): horas del plan ("ahora", con el factor provisional de 1,5 salvo PetrIA, que está medida). Mandan sobre `base`. */
  horas?: number;
  /** v7: horas que tenía el bloque antes de la v7 ("antes"), para mostrar la diferencia. */
  horasAntes?: number;
  /** v7: días fijos de calendario (certificaciones, descansos, cierres, consolidación). Una pausa adentro lo alarga. */
  dias?: number;
  /** v7: fechas que estima el roadmap (inicio y fin). Trazo recalcula y muestra la diferencia; no las usa para fechar. */
  roadmap?: { inicio: string; fin: string };
  /** v7: número de la certificación en el roadmap ("Certificación 3"), aparte del id. */
  numero?: number;
  /** v7: nota visible del bloque ("a confirmar acceso", "la arman los agentes"). */
  nota?: string;
  // ——— v12.1 (21 Nov 2026) ———
  /** Fechas explícitas del plan: el bloque va exactamente ahí (el motor no las corre por horas). */
  fechas?: { inicio: string; fin: string };
  /** Fase a la que pertenece (F1 a F11). */
  fase?: string;
  /** Horas si el límite semanal de Claude pega seguido. */
  horasLim?: number;
  rol?: string;
  /** Peso en entrevistas ("very high", "high"). */
  entrevista?: string;
  notas?: string[];
  papers?: PaperV12[];
  /** Ventana de matemática: hitos por rango de días; el bloque no cierra con hitos sin tildar. */
  hitos?: HitoMate[];
  ingles?: { libros: string[]; objetivo: string; reparto: { lv: Record<string, number>; finde: Record<string, number> }; tareas?: string[]; examen?: { nombre: string; semana: [string, string]; nota?: string; reserva?: string } };
  busqueda?: { reparto: Record<string, number> };
  /** Con qué sale al mercado (búsqueda) y los roles. */
  mercado?: string[];
  roles?: string[];
  /** Bloque archivado (PetrIA v0): guarda horas viejas, no cuenta para el plan. */
  archivado?: boolean;
  /** Sin estado "atrasado" (P0 v1: la arman los agentes). */
  sinAtraso?: boolean;
  /** Ventana de certificaciones: una o más, cada una con su plan por día. */
  certs?: CertV12[];
  /** PetrIA: los lotes (batches) con horas, fecha estimada y deadline. */
  lotes?: LoteV12[];
}

export interface PaperV12 { id: string; nombre: string; opcional?: boolean }
export interface HitoMate { dias: [number, number]; inicio: string; fin: string; tema: string; hito: string; capitulos?: { actividad: string; desde: number; hasta: number }; capitulosAConfirmar?: boolean; hitoAConfirmar?: boolean }
export interface CertV12 {
  id: string;
  nombre: string;
  horas: number;
  recursos: string[];
  plan: { fecha: string; texto: string }[];
  examen: string;
  /** Mocks para estar listo (%), o el criterio en texto. */
  listo?: number | string;
  fallback?: string;
  opcional?: boolean;
  requiere?: string;
  reserva?: string;
  costo?: string;
  costoVerificado?: boolean;
  versiones?: VersionExamen[];
  renovacion?: { anos?: number; nota: string };
  miniProyecto?: { nombre: string; fecha: string; texto: string; entregables: string[] };
}
export interface LoteV12 { id: string; version: string; ola0?: boolean; nombre: string; horas: number; estimado: string; deadline: string; modelo: string }
export interface FaseV12 { id: string; etapa: number; nombre: string; inicio: string; fin: string; salida: string[]; mercado: string[]; mercadoAConfirmar?: boolean; roles?: string[] }
export interface HabitoV12 { id: string; nombre: string; cuando: 'diario' | number[]; hora: string }
export interface RecordatorioV12 { id: string; texto: string; fecha: string; certs?: string[]; regla?: string }

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
  /** v7 (ola 30): el ambiente del stack (Frontend, Backend, IA por API, ML propio, DB, Infra, Cloud). */
  ambiente?: string;
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
  /** Ola 32 (v7): la versión que manda si no elegiste otra (Security+: SY0-801), y por qué. */
  porDefecto?: string;
  porDefectoMotivo?: string;
}

export interface VersionExamen {
  id: string;
  nombre: string;
  retiro?: string;
  sale?: string;
  /** Ola 32: false si la fecha de salida no está confirmada (Trazo pide verificarla cuando ya debería haber salido). */
  verificada?: boolean;
}

export interface EtapaExt {
  n: 1 | 2 | 3 | 4;
  nombre: string;
  /** Perfil vendible al cerrar la etapa. */
  perfil: string;
  semanasBase: number;
  semanasExtra: number;
  semanasPlataforma: number;
  semanasArquitectura: number;
  /** v12.1: fechas explícitas de la etapa. */
  inicio?: string;
  fin?: string;
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
    /** v7 (ola 29): `finRoadmap`, el fin que estima el roadmap (Trazo recalcula y muestra la diferencia). */
    diarios: Record<string, MateTramo & { nombre: string; horas?: number; finRoadmap?: string }>;
  };
  /** Perfiles vendibles por hito: el que tenés al cerrar ese bloque. */
  perfilesHito: { despues: string; perfil: string; nota: string }[];
  /** Decisiones abiertas: flags editables, no se resuelven en el código. */
  decisiones: { id: string; texto: string; fecha?: string; /** Ola 32: fecha en que se resolvió (no avisa más). */ resuelta?: string }[];
  /** Ola 26: tecnologías que se pidieron y se dejaron afuera "por ahora", con el motivo. */
  descartadas?: Descartada[];
  /** v3: horas que vale una semana del plan (24,5). Con este campo el calendario se mide en horas. */
  horasPorSemana?: number;
  /** v3: lo que salió de los proyectos y queda sin fecha. */
  backlog?: { nombre: string; motivo: string; fecha: string }[];
  /** v7 (ola 29): la capacidad del plan. */
  capacidad?: CapacidadPlan;
  /** v12.1: fases (rol, fechas, criterio de salida, con qué sale al mercado). */
  fases?: FaseV12[];
  habitos?: HabitoV12[];
  recordatorios?: RecordatorioV12[];
  /** Mazo "20 LLM concepts" (arranca bloqueado). */
  mazoLLM?: string[];
  papersSueltos?: PaperV12[];
  plan?: string;
  archivado?: string;
  /** v12.1: ramas y áreas en pausa (fuera de Hoy y de Metas, con sus datos guardados). */
  pausados?: string[];
}

/** v7 · capacidad de programación que no sale de la rutina. */
export interface CapacidadPlan {
  /** Horas por día de proyecto antes del trabajo nuevo (PetrIA a ~8 h por día). Sin esto rige la rutina intensiva. */
  antesTrabajo?: number;
  /** Horas por semana en las ventanas de matemática (43). */
  ventanaSemana?: number;
  /** Años con pausa de diciembre (la semana cuyo lunes cae del 18 al 24). Sin lista, todos los años. */
  pausasDiciembre?: number[];
  /** Días desde T0 hasta el trabajo nuevo, si no lo cargaste (49: lunes 4 ene 2027). null: sin trabajo nuevo (v12.1). */
  inicioTrabajoDias?: number | null;
  /** v12.1: horas por día de lunes a viernes y el fin de semana (10 y 11). */
  lv?: number;
  finde?: number;
  /** v12.1: fechas que nunca se mueven. v12.4: los días libres fijos (la pausa del 20 al 26 dic 2027 y los dos descansos). */
  fijas?: { inicio: string; fin: string; nombre: string }[];
  /** v12.4: horas por día que salen de un bloque principal para otra cosa (Alawys v0.1: 1 h por día de PetrIA, 5 a 11 dic 2026). */
  extras?: { inicio: string; fin: string; horas: number; bloque: string; nombre: string }[];
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
    if (b.horas != null && (!(b.horas >= 0) || b.dias != null)) err.push(`${en}: horas tiene que ser un número de 0 o más (y sin días fijos)`);
    if (b.dias != null && (!Number.isInteger(b.dias) || b.dias < 1)) err.push(`${en}: dias tiene que ser un entero de 1 o más`);
    if (b.roadmap && (!FECHA.test(b.roadmap.inicio) || !FECHA.test(b.roadmap.fin) || b.roadmap.fin < b.roadmap.inicio)) err.push(`${en}: las fechas del roadmap van AAAA-MM-DD y el fin no va antes del inicio`);
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
    if (b.tipo === 'cert' && !b.cert && !b.certs?.length) err.push(`${b.id}: certificación sin datos (costo y verificación)`);
    if (b.fechas && !(FECHA.test(b.fechas.inicio) && FECHA.test(b.fechas.fin) && b.fechas.fin >= b.fechas.inicio)) err.push(`${b.id}: fechas inválidas`);
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
// v12.4: el doc es el roadmap, así que lo que estima el roadmap y lo que dicen las fechas son lo mismo y el JSON no lo guarda dos veces.
for (const b of doc.bloques) if (b.fechas && !b.roadmap) b.roadmap = { ...b.fechas };
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

export interface OpcionesHoras {
  /** Horas de programación del día (ver capacidad.ts). */
  capacidad: (fecha: string) => number;
  /** Horas por semana del plan; por defecto las del JSON (24,5). */
  horasSemana?: number;
  /** Factor real/estimado que escala las horas de los bloques que todavía no cerraron (calibración en P2 y P3). */
  factor?: number;
  /** Bloques cerrados (con horas reales): después de ellos rige el factor. */
  cerrados?: string[];
}

export interface Opciones {
  /** v3: el calendario se mide en horas y se reparte día por día sobre la capacidad de la rutina. */
  horas?: OpcionesHoras;
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
  /** v12.1: fechas confirmadas que reemplazan a las del bloque (corrimientos por atraso). */
  corrimientos?: Record<string, { inicio: string; fin: string }>;
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
  /** v3: horas del bloque y días desde T0 en que empieza y termina (con el calendario por horas). */
  horas?: number;
  diaIni?: number;
  diaFin?: number;
}

/**
 * ¿La semana que arranca este día es la pausa de fin de año? (su primer día cae entre el 18 y el 24 de diciembre). Con `anios`
 * (v7: 2027 a 2030), solo esos años tienen pausa.
 */
export const esSemanaDePausa = (lunes: string, anios?: readonly number[]) =>
  lunes.slice(5, 7) === '12' && Number(lunes.slice(8, 10)) >= 18 && Number(lunes.slice(8, 10)) <= 24 && (!anios || anios.includes(Number(lunes.slice(0, 4))));

const leer = (sw: Switch | undefined, id: string) => (typeof sw === 'object' ? sw[id] ?? true : sw ?? true);

/**
 * Deriva las fechas. Una ventana siempre va antes de su proyecto; si hay atraso, el colchón de la
 * etapa lo absorbe (hasta sus semanas) y solo lo que sobra corre las fechas siguientes. Con
 * `pausas`, cada diciembre se inserta una pausa: entre bloques o partiendo el bloque en el que cae.
 */
export function calendario(plan: PlanExtendido = PLAN_EXT, o: Opciones = {}): BloqueFechado[] {
  if (o.horas) return calendarioHoras(plan, o);
  const t0 = o.t0 ?? plan.t0;
  const conPausas = o.pausas ?? true;
  const lunesDe = (w: number) => addDays(t0, (w - 1) * 7);
  const pausaEn = (w: number) => conPausas && esSemanaDePausa(lunesDe(w), plan.capacidad?.pausasDiciembre);
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

/**
 * Ola 27 (v3) · el calendario medido en horas. Cada bloque vale sus `horas` (v7) o (semanas del plan × 24,5) horas; se reparte día
 * por día sobre la capacidad de programación que rige ese día (v7: ~8 h por día antes del trabajo, 29 por semana con trabajo, 43
 * por semana en las ventanas de matemática, cero en la pausa de fin de año). Un bloque ocupa días enteros: el siguiente arranca al
 * día siguiente de que se junten sus horas. Los bloques de días fijos (certificaciones, descansos, cierres, consolidación) son
 * calendario: ocupan sus días sin horas y una pausa adentro los alarga. Las pausas de fin de año parten el bloque o van entre dos.
 */
export function calendarioHoras(plan: PlanExtendido = PLAN_EXT, o: Opciones = {}): BloqueFechado[] {
  const h = o.horas!;
  const t0 = o.t0 ?? plan.t0;
  const unidad = h.horasSemana ?? plan.horasPorSemana ?? 24.5;
  const conPausas = o.pausas ?? true;
  const anios = plan.capacidad?.pausasDiciembre;
  const ventanaDia = plan.capacidad?.ventanaSemana != null ? plan.capacidad.ventanaSemana / 7 : null;
  const dia = (n: number) => addDays(t0, n);
  const semanaDe = (n: number) => Math.floor(n / 7) + 1;
  const lunesN = (n: number) => n - ((parseDate(dia(n)).getDay() + 6) % 7);
  const enPausa = (n: number) => conPausas && esSemanaDePausa(dia(lunesN(n)), anios);
  const ultimoCerrado = Math.max(-1, ...(h.cerrados ?? []).map((id) => plan.bloques.findIndex((b) => b.id === id)));
  const out: BloqueFechado[] = [];
  const pausa = (nIni: number, etapa: 1 | 2 | 3 | 4): BloqueFechado => {
    const lunes = lunesN(nIni);
    return {
      id: `PAUSA-${dia(lunes).slice(0, 4)}`, etapa, tipo: 'descanso', nombre: 'Pausa de fin de año', base: 1, extra: 0, extraPlataforma: 0, extraArquitectura: 0,
      que: 'Una semana sin programación entre Navidad y Año Nuevo; la matemática diaria y lo demás siguen.',
      semanas: 1, desde: semanaDe(lunes), hasta: semanaDe(lunes), inicio: dia(lunes), fin: dia(lunes + 6), extraAplicado: 0, plataformaAplicada: 0, arquitecturaAplicada: 0, atraso: 0, absorbido: 0, pausasDentro: [], pausa: true,
      horas: 0, diaIni: lunes, diaFin: lunes + 6,
    };
  };
  /** Semanas de calendario de un tramo de días (sin las pausas que lo parten), al menos 1. */
  const semanasDeDias = (ini: number, fin: number, pausas: number) => Math.max(1, Math.round((fin - ini + 1 - pausas * 7) / 7));
  let cursor = 0;
  let etapa = 0;
  let pendiente = 0;
  plan.bloques.forEach((b, idx) => {
    if (b.etapa !== etapa) { etapa = b.etapa; pendiente = 0; }
    const proy = b.tipo === 'proyecto';
    const extraAplicado = proy && leer(o.extras, b.id) ? b.extra : 0;
    const plataformaAplicada = proy && leer(o.plataforma, b.id) ? b.extraPlataforma ?? 0 : 0;
    const arquitecturaAplicada = proy && leer(o.arquitectura, b.id) ? b.extraArquitectura ?? 0 : 0;
    const atraso = Math.max(0, Math.round(o.atrasos?.[b.id] ?? 0));
    let semanas: number;
    let absorbido = 0;
    let diasFijos = b.dias ?? (b.tipo === 'descanso' ? b.base * 7 : null);
    if (b.tipo === 'colchon') {
      absorbido = Math.min(b.dias != null ? Math.floor(b.dias / 7) : b.base, pendiente);
      semanas = b.base - absorbido;
      if (b.dias != null) { diasFijos = b.dias - absorbido * 7; semanas = diasFijos > 0 ? Math.max(1, Math.round(diasFijos / 7)) : 0; }
      pendiente = 0;
    } else {
      semanas = b.base + extraAplicado + plataformaAplicada + arquitecturaAplicada + atraso;
      if (diasFijos != null) diasFijos += atraso * 7;
      pendiente += atraso;
    }
    const extras = { extraAplicado, plataformaAplicada, arquitecturaAplicada, atraso, absorbido };
    if (semanas === 0 || diasFijos === 0) {
      out.push({ ...b, ...extras, semanas: 0, desde: semanaDe(cursor), hasta: semanaDe(cursor) - 1, inicio: dia(cursor), fin: dia(cursor - 1), pausasDentro: [], horas: 0, diaIni: cursor, diaFin: cursor - 1 });
      return;
    }
    // La pausa que cae justo antes del bloque va entre los dos (no con fechas explícitas: ya la tienen adentro).
    const fechas = o.corrimientos?.[b.id] ?? b.fechas;
    while (!fechas && enPausa(cursor)) {
      const p = pausa(cursor, b.etapa);
      out.push(p);
      cursor = p.diaFin! + 1;
    }
    const ini = cursor;
    const pausasDentro: number[] = [];
    const marcarPausa = (d: number) => { const w = semanaDe(lunesN(d)); if (!pausasDentro.includes(w)) pausasDentro.push(w); };
    // v12.1: fechas explícitas. El bloque va exactamente ahí; una pausa adentro lo parte (sin moverlo).
    if (fechas) {
      const fi = Math.round((parseDate(fechas.inicio).getTime() - parseDate(t0).getTime()) / 864e5);
      const ff = Math.round((parseDate(fechas.fin).getTime() - parseDate(t0).getTime()) / 864e5);
      for (let d = fi; d <= ff; d++) if (enPausa(d)) marcarPausa(d);
      cursor = ff + 1;
      const sem = Math.max(1, Math.round((ff - fi + 1 - pausasDentro.length * 7) / 7));
      out.push({ ...b, ...extras, semanas: sem, desde: semanaDe(fi), hasta: semanaDe(ff), inicio: dia(fi), fin: dia(ff), pausasDentro, horas: b.horas ?? 0, diaIni: fi, diaFin: ff });
      for (const w of pausasDentro) out.push(pausa((w - 1) * 7, b.etapa));
      return;
    }
    let d = ini;
    let horas: number;
    if (diasFijos != null) {
      // Días fijos: calendario, sin horas de proyecto. La pausa no cuenta como día del bloque.
      let quedan = diasFijos;
      for (let guarda = 0; guarda < 4000; guarda++, d++) {
        if (enPausa(d)) { marcarPausa(d); continue; }
        if (--quedan <= 0) break;
      }
      horas = 0;
    } else {
      const base = b.horas != null ? b.horas * (1 + atraso / Math.max(1, b.base)) : semanas * unidad;
      // El factor de calibración (programación) no estira las ventanas de matemática.
      horas = Math.floor(base * (idx > ultimoCerrado && b.tipo !== 'ventana' ? h.factor ?? 1 : 1) + 1e-9);
      const cap = b.tipo === 'ventana' && ventanaDia != null ? () => ventanaDia : (n: number) => h.capacidad(dia(n));
      let acc = 0;
      for (let guarda = 0; guarda < 4000; guarda++, d++) {
        if (enPausa(d)) { marcarPausa(d); continue; }
        acc += cap(d);
        if (acc >= horas - 1e-9) break;
      }
    }
    const fin = d;
    cursor = fin + 1;
    if (b.horas != null || b.dias != null) semanas = semanasDeDias(ini, fin, pausasDentro.length);
    out.push({ ...b, ...extras, semanas, desde: semanaDe(ini), hasta: semanaDe(fin), inicio: dia(ini), fin: dia(fin), pausasDentro, horas, diaIni: ini, diaFin: fin });
    for (const w of pausasDentro) out.push(pausa((w - 1) * 7, b.etapa));
  });
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
