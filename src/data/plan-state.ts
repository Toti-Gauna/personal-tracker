/**
 * Lo que se registra del plan T+18: arranca en cero y crece con el uso (Hoy, las pantallas de
 * cada rama y la importación de JSON). Nada de esto viene con números de ejemplo.
 */
import type { Capa, Entrevista, EventoRama, MetaGenerada, Postulacion, RespuestaEnsayada } from './plan';
import type { MetaBloque } from './metas-bloque';
import { PLAN } from './plan';
import type { Rama } from './types';

export type TipoError = 'concepto' | 'tecnica' | 'descuido';

export interface ProyectoEstado {
  /** Puntos del estándar marcados (ola 30: los 12 de la v7; las 6 casillas de antes quedan guardadas sin mostrarse). */
  estandar: Partial<Record<Capa | string, boolean>>;
  /** Minutos registrados por categoría. */
  tiempo: { nucleo: number; producto: number; lanzamiento: number };
  revisiones: { fecha: string; texto: string; tipo: TipoError }[];
  examen?: { fecha: string; puntaje: number };
  /**
   * Ola 8b: la entrevista técnica dentro del proyecto. El proyecto no se marca cerrado sin el
   * documento de diseño, el set de ejercicios con tests y la defensa simulada de 45 min.
   */
  tecnica?: { diseno?: boolean; ejercicios?: number; defensa?: string };
  /** Un servidor MCP publicado y un agente con trazas por proyecto. */
  mcp?: boolean;
  agente?: boolean;
  /**
   * Ola 16c · puerta de evidencia: sin un número medido contra una referencia externa, un tercero
   * que lo valide y un informe público, el proyecto no cierra.
   */
  evidencia?: Partial<Record<Evidencia, boolean>>;
}

export type Evidencia = 'medido' | 'validador' | 'informe';
export const EVIDENCIAS: [Evidencia, string, string][] = [
  ['medido', 'Número medido contra una referencia externa', 'La referencia de la ficha'],
  ['validador', 'Un tercero que lo valida', 'Experto del rubro, PR aceptado o certificación; con una llamada de 30 min y un comentario escrito alcanza'],
  ['informe', 'Informe público', 'Qué se midió, contra qué y qué salió'],
];
export const evidenciaCompleta = (p?: ProyectoEstado) => EVIDENCIAS.every(([k]) => !!p?.evidencia?.[k]);

export interface HandyxSemana {
  horas?: number;
  operaciones?: number;
  prestadores?: number;
  clientes?: number;
  ingresos?: number;
  margen?: number;
}

export interface Importacion {
  fecha: string;
  importado: string;
  tipo: string;
  rama: Rama;
  resumen: string[];
}

/**
 * Una rama o un área en pausa ("stand-by" en pantalla): no aparece en Hoy ni genera avisos,
 * metas ni contadores nuevos, pero nada se borra. `guardado` es una foto de lo que había al
 * pausar, por si hace falta comparar al retomar.
 */
export interface Pausa {
  id: string;
  objetivo: 'handyx' | 'ventas' | string;
  desde: string;
  hasta?: string;
  motivo: string;
  guardado: unknown;
}

export interface PlanState {
  entrevistas: Entrevista[];
  postulaciones: Postulacion[];
  /** Contadores de la semana del plan (postulaciones, mensajes, posts…): lunes → id → n. */
  contadores: Record<string, Record<string, number>>;
  respuestas: RespuestaEnsayada[];
  /** Lo que falló en entrevistas o simulacros de inglés (también entra como tarjeta). */
  fallasIngles: { fecha: string; texto: string; tipo: string }[];
  proyectos: Record<string, ProyectoEstado>;
  /** Handyx por semana: lunes → números de la semana. */
  handyx: Record<string, HandyxSemana>;
  /** Lo que se registró en cada rama (alimenta el mapa). */
  eventos: EventoRama[];
  /** Metas del mes generadas desde el plan y confirmadas: "AAAA-MM" → metas. */
  meses: Record<string, { confirmado?: string; metas: MetaGenerada[] }>;
  /** Metas de la semana: lunes → metas. */
  semanas: Record<string, { confirmado?: string; metas: MetaGenerada[] }>;
  /** Metas de bimestre y año editadas: "b1-programacion", "anio1-salud" → texto. */
  editadas: Record<string, string>;
  importaciones: Importacion[];
  /** Pausas (stand-by): las abiertas no tienen "hasta". */
  pausas: Pausa[];
  /** Hitos marcados como hechos o movidos de fecha: id → estado. */
  hitos: Record<string, { hecho?: string; fecha?: string }>;
  /** Ola 16b: proyectos con las semanas extra de feature apagadas (por defecto van prendidas). */
  extrasApagados?: string[];
  /** Ola 24: pausa de fin de año automática (sin valor, prendida). */
  pausaFinDeAnio?: boolean;
  /** Ola 24: versión de examen elegida por certificación (C2 → "SY0-801"). */
  versionCert?: Record<string, string>;
  /** Ola 26: las vacantes que cargaste (tabla de demanda). Solo cuenta lo que cargues: no hay datos de mercado. */
  vacantes?: import('./demanda').Vacante[];
  /** Ola 24: checklist de arquitectura por proyecto (contrato, trazas, mtls, adr). */
  arquitectura?: Record<string, Partial<Record<'contrato' | 'trazas' | 'mtls' | 'adr', boolean>>>;
  /** Meta "Mapa de proyectos del portfolio": 4 pasos (Trazo guarda la meta; el diseño es tuyo). */
  mapaPortfolio?: Record<string, boolean>;
  /** Revisión de mercado: ofertas cargadas y % de ofertas que piden cada proyecto movible. */
  mercado?: { ofertas?: number; pct?: Record<string, number>; decidido?: string };
  /** Sprint de búsqueda (10.2): metas del embudo editadas y casillas de CV, LinkedIn y caso. */
  sprint?: { metas?: Partial<Record<'aMedida' | 'mensajes' | 'respuestas' | 'recruiter' | 'tecnica' | 'oferta', number>>; checks?: Record<string, boolean> };
  /** Ola 20: metas propias de cada bloque (proyecto, ventana, certificación, libro o unidad), con submetas. */
  metasBloque?: Record<string, MetaBloque[]>;
  /** Ola 20: criterios del nivel de salida tildados por ventana (W1 → índices). */
  salida?: Record<string, number[]>;
  /** Ola 30 (v7): estado de cada versión de un proyecto (P1 → "1.0" → publicada y lo que sale con ella). */
  versiones?: Record<string, Record<string, EstadoVersion>>;
  /** Ola 31 (v7): algorithm spots registrados (tema → cuándo, en qué proyecto y la pregunta de entrevista que responde). */
  algoritmos?: Record<string, RegistroSpot>;
  /** Ola 31: temas que sumaste (el roadmap dice 20 y la tabla trae 16). */
  temasPropios?: { id: string; tema: string; proyectos: string[]; modo: 'con-ia' | 'sin-ia' }[];
  /** Ola 31: sprints sin IA (14 días, 30 min por día) y los problemas resueltos por día. */
  sprintsSinIA?: { inicio: string; cortado?: string }[];
  problemasSinIA?: Record<string, number>;
  /** Ola 32 (v7): compras de hardware, cuentas y trámites hechos (id → fecha y lo que costó). */
  compras?: Record<string, { fecha: string; costo?: string }>;
  /** Ola 32: versiones de examen que verificaste (C2 → fecha). */
  certVerificada?: Record<string, string>;
  /** v12.1: corrimientos que confirmaste para bloques atrasados (id → fechas nuevas y cuándo lo confirmaste). Nunca automáticos. */
  corrimientos?: Record<string, { inicio: string; fin: string; confirmado: string }>;
  /** Ola 34: tus rutinas del día (generadas, adaptadas o copiadas de una plantilla) y a qué días se aplican. */
  rutinasPropias?: import('./motor-rutinas').RutinaPropia[];
  asignacionesRutina?: import('./motor-rutinas').AsignacionRutina[];
  /** v12.2: estado de cada ítem de las tres pistas (secundarias, comerciales y, para el Imán y el lanzamiento, los principales). */
  fondo?: Record<string, import('./fondo').EstadoItem>;
  /** v12.2: tiempo de revisión de lo de fondo (aparte de las 72 h de foco). */
  revisionFondo?: import('./fondo').EntradaRevision[];
  /** v12.2: el Imán de cada ítem que se publica y el checklist de seguridad de los comerciales. */
  iman?: Record<string, import('./iman').Iman>;
  seguridadShowcase?: Record<string, boolean[]>;
  /** v12.2: las publicaciones (LinkedIn y X), unidas a un ítem y a un paso de la serie del Imán. */
  posts?: import('./iman').Post[];
  /** v12.2: el uso semanal de Claude que cargás en la revisión del domingo (lunes → %) y el umbral para sugerir pausas. */
  usoClaude?: Record<string, number>;
  umbralClaude?: number;
  /** v12.1: puntajes de los simulacros por certificación (id del examen → fecha y %). */
  mocks?: Record<string, { fecha: string; pct: number }[]>;
  /** v12.1: exámenes reservados (id → fecha del examen y cuándo reservaste). Una fecha reservada es fija: nada la corre. */
  reservas?: Record<string, { examen: string; reservado: string }>;
  /**
   * Ola 33 (v7): horas reales cargadas a mano por día (programación y matemática). Mandan sobre el foco de ese día: sirven cuando
   * trabajaste sin abrir el foco (el 19 nov quedó vacío) y son las que calibran el plan con PetrIA 1.0 y 1.1.
   */
  horasManuales?: Record<string, Partial<Record<'programacion' | 'matematica', number>>>;
  /** Ola 32: revisiones semanales (lunes de la semana → checklist, nota y cuándo la hiciste). */
  revisionesSemanales?: Record<string, { checks: number[]; nota?: string; hecha?: string }>;
}

/** Ola 31 · un algorithm spot plantado: cuándo, en qué proyecto, la pregunta de entrevista y si se validó. */
export interface RegistroSpot {
  fecha: string;
  proyecto?: string;
  pregunta?: string;
  /** Con IA: validaste en voz alta complejidad, bordes y cambios. Sin IA: lo escribiste vos y pasan los tests. */
  validado?: boolean;
}

/** Ola 30 · cada versión sale con notas de versión, un video demo de 30 s y el README actualizado. */
export interface EstadoVersion {
  /** Fecha en que la publicaste. */
  publicada?: string;
  notas?: boolean;
  video?: boolean;
  readme?: boolean;
}
export const ENTREGABLES_VERSION: [keyof Omit<EstadoVersion, 'publicada'>, string][] = [['notas', 'Notas de versión'], ['video', 'Video demo de 30 s'], ['readme', 'README actualizado']];

export const emptyPlan = (): PlanState => ({
  entrevistas: [], postulaciones: [], contadores: {},
  respuestas: PLAN.ingles.respuestas.map((texto, i) => ({ id: `r${i + 1}`, texto, veces: 0 })),
  fallasIngles: [], proyectos: {}, handyx: {}, eventos: [], meses: {}, semanas: {}, editadas: {}, importaciones: [], pausas: [], hitos: {},
});

export const proyectoVacio = (): ProyectoEstado => ({ estandar: {}, tiempo: { nucleo: 0, producto: 0, lanzamiento: 0 }, revisiones: [] });

/** Ajustes del plan (Ajustes → Plan T+18). */
export interface PlanSettings {
  /** Rutina de lunes a viernes: buscando trabajo o con trabajo (desde T+2). */
  rutina: 'busqueda' | 'con-trabajo';
  /** Día ISO libre (2 = martes); null, ninguno. */
  diaLibre: number | null;
  /** Inicio del trabajo nuevo (el antiguo T+2). Sin valor: el 4 ene 2027 (supuesto del roadmap v7). Desde esa fecha rige la rutina con trabajo. */
  t2?: string;
  /** Umbrales de la decisión de Handyx: los escribe el usuario. */
  umbralIngreso: string;
  horasMaximas: string;
  /**
   * Modo de la semana. "busqueda-intensiva": rutinas de búsqueda intensiva, sin día libre, con
   * Handyx y ventas en pausa. null: el plan normal. Sin valor: todavía no se decidió (la
   * migración lo activa, porque es la prioridad desde T0).
   */
  modo?: 'busqueda-intensiva' | null;
  /** Ola 27: horario del trabajo nuevo (rutina con trabajo). De fábrica, 10:00 a 16:00. */
  horarioTrabajo?: import('./routines').HorarioTrabajo;
  /** Ola 27: bloques que asignaste a Handyx, clipping y Eclipse (hasta entonces no tienen bloque). */
  bloquesPendientes?: import('./routines').BloquesPendientes;
  /** La rutina y el día libre de antes de activar el modo, para volver exactamente a ellos. */
  previo?: { rutina: 'busqueda' | 'con-trabajo'; diaLibre: number | null };
  /**
   * Ola 31 (v7): bloques de la rutina intensiva que pasan a ser horas extra de proyecto hasta el trabajo nuevo (PetrIA a ~8 h por
   * día: "+1,5–2 h en un bloque a definir"). Ids de la rutina ("ingles", "publicaciones", "cierre"…). Sin elegir: Trazo avisa lo que falta.
   */
  extraProyecto?: string[];
}

/** Pausas que abre la búsqueda intensiva. */
export const PAUSAS_INTENSIVA = ['handyx', 'ventas'] as const;

/** ¿Está en pausa ese objetivo (rama o área) en una fecha? */
export const enPausa = (p: Pick<PlanState, 'pausas'>, objetivo: string, fecha: string) =>
  (p.pausas ?? []).some((x) => x.objetivo === objetivo && x.desde <= fecha && (!x.hasta || x.hasta > fecha));

/** La pausa abierta de un objetivo. */
export const pausaAbierta = (p: Pick<PlanState, 'pausas'>, objetivo: string) => (p.pausas ?? []).find((x) => x.objetivo === objetivo && !x.hasta);

export const DEFAULT_PLAN_SETTINGS: PlanSettings = { rutina: 'busqueda', diaLibre: 2, umbralIngreso: '', horasMaximas: '' };
