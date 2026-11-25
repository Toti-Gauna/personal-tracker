/**
 * Plan v12.2 / v12.4 · los datos de data/v12-2.json: el detalle de cada proyecto (en castellano, tal cual), la línea BACKGROUND de
 * cada bloque, las 10 apps secundarias, los 23 slots comerciales (build y sell), los recordatorios y el backlog "Ver a futuro".
 * Generados por scripts/plan-v12-2.mjs y reescritos por scripts/plan-v12-4.mjs desde docs/prompts/plan-v12.4.md (la fuente de verdad).
 */
import planRaw from '../../data/plan-extendido.json';
import raw from '../../data/v12-2.json';

export type Pista = 'principal' | 'secundaria' | 'comercial';

export interface VersionDetalle {
  id: string;
  inicio?: string;
  fin?: string;
  deadline?: string;
  /** La versión 2.0 de Paper Trail: un día antes de la pausa y el resto después. */
  partida?: boolean;
  /** Ya hecha (Constelación v1.0). */
  base?: boolean;
  linea: string;
  entregables: string[];
}

export interface DetalleProyecto {
  horas?: number;
  horasLim?: number;
  notaAlcance?: string;
  puesto?: string;
  descripcion?: string;
  problema?: string;
  valor?: string;
  diferencial?: string;
  herramientas?: string;
  capaFisica?: string;
  ahorro?: string;
  impacto?: string;
  voz?: string;
  escala?: string;
  stack?: string;
  publicacion?: string;
  cambios?: string;
  pesoEntrevistas?: string;
  versiones: VersionDetalle[];
}

export interface FondoBloque {
  /** `version` puede ser un rango ("1.0–3.0"). */
  secundaria?: { app: string; version: string }[] | 'libre';
  comercial?: number | null;
  /** v12.4: en qué fase del slot está el bloque. */
  faseComercial?: 'build' | 'sell' | 'build + sell';
  pausa?: 'PNPT';
}

export type AreaForeground = 'dinero' | 'datos personales' | 'seguridad' | 'smart contracts';

export interface VersionSecundaria { id: string; inicio: string; fin: string; linea: string; entregables: string[]; revisionForeground?: AreaForeground[] }

export interface Secundaria {
  id: string;
  nombre: string;
  inicio: string;
  fin: string;
  descripcion: string;
  valor: string;
  diferencial: string;
  rol: string;
  peso: string;
  empresas: string[];
  stack: { dev: string; staging: string; prod: string };
  versiones: VersionSecundaria[];
  /** v12.4: se genera con Alawys (todas menos JulIA, que arranca antes). */
  conAlawys?: boolean;
}

export interface Comercial {
  n: number;
  id: string;
  inicio: string;
  fin: string;
  ventana: string;
  /** null: "TO DEFINE" (hay que elegir la marca). */
  marca: string | null;
  /** v12.4: el rubro del slot ("Universities and institutes"). */
  sector?: string | null;
  /** v12.4: los días 1 a 7 se construye; desde el 8 se vende (a la marca y a 10 negocios parecidos). Sin `venta`, solo build. */
  build: { inicio: string; fin: string };
  venta: { inicio: string; fin: string } | null;
  queSeHace: string | null;
  wow: string | null;
  reusa: string | null;
  revisionForeground?: string[];
}

export interface DatosV122 {
  version: 1;
  plan: 'v12.2' | 'v12.4';
  detalle: Record<string, DetalleProyecto>;
  fondo: Record<string, FondoBloque>;
  secundarias: Secundaria[];
  comerciales: Comercial[];
  recordatorios: { id: string; fecha: string; texto: string }[];
  backlog: { nombre: string; destacado: boolean }[];
  herramientas: Herramienta[];
}

/** §14 · una versión de una herramienta: nace en un ítem y toma sus fechas (un día, el bloque o el cierre). */
export interface VersionHerramienta {
  id: string;
  origen: string | null;
  donde: 'fecha' | 'bloque' | 'cierre' | 'recurrente';
  fecha?: string;
  /** La versión del ítem de origen que la trae (apps secundarias). */
  version?: string;
  linea: string;
  lanzamiento?: boolean;
  post?: string;
  /** v12.4: con `fecha`, hasta qué día se arma (Alawys v0.1: 5 a 11 dic). */
  hasta?: string;
}
export interface Herramienta {
  id: string;
  nombre: string;
  paquete: string;
  registro: string;
  /** standalone: producto público desde el día uno. extracted: sale de un proyecto cuando un segundo lo necesita. interna: nunca se publica. */
  kind: 'standalone' | 'extracted' | 'interna';
  licencia?: string;
  ficha?: Record<string, string>;
  /** v12.4: de dónde sale (extraída de ahí); el ítem de origen de la versión es el que la necesita. */
  desde?: string;
  versiones: VersionHerramienta[];
}

export const V122 = raw as unknown as DatosV122;
export const detalleDe = (id: string): DetalleProyecto | undefined => V122.detalle[id];
export const secundaria = (id: string) => V122.secundarias.find((s) => s.id === id);
export const comercial = (id: string) => V122.comerciales.find((c) => c.id === id);

/** v12.4 · un día libre fijo: ni foco ni fondo (la pausa del 20 al 26 dic 2027 y los dos descansos). */
export interface DiaLibre { inicio: string; fin: string; nombre: string }
/** v12.4 · una hora de foco que va a otra cosa (Alawys v0.1: 1 h por día de PetrIA entre el 5 y el 11 dic 2026). */
export interface ExtraFoco { inicio: string; fin: string; horas: number; bloque: string; nombre: string }

/** Los días libres fijos del plan (salen de data/plan-extendido.json: nunca se corren). */
export const DIAS_LIBRES: DiaLibre[] = (planRaw.capacidad?.fijas ?? []).map(({ inicio, fin, nombre }) => ({ inicio, fin, nombre }));
export const EXTRAS_FOCO: ExtraFoco[] = ((planRaw.capacidad as { extras?: ExtraFoco[] } | undefined)?.extras ?? []).map((x) => ({ ...x }));

/**
 * v12.4 · las pausas de todo lo de fondo (respuesta 7): la ventana del PNPT y cada día libre fijo. Ahí no corre ninguna de las dos
 * pistas: se ve la pausa, no un atraso. Salen de los datos (la ventana, del bloque marcado con `pausa: 'PNPT'`).
 */
export const PAUSAS_FONDO: { id: string; nombre: string; inicio: string; fin: string }[] = [
  // Los días libres van primero: en 20–26 dic 2027, que cae adentro del PNPT, se ve la pausa de fin de año.
  ...DIAS_LIBRES.map((d, i) => ({ id: `libre-${i + 1}`, nombre: d.nombre === 'Pause' ? 'Pausa de fin de año' : 'Descanso', inicio: d.inicio, fin: d.fin })),
  ...Object.entries(V122.fondo).filter(([, f]) => f.pausa === 'PNPT').flatMap(([id]) => {
    const b = planRaw.bloques.find((x) => x.id === id);
    return b?.fechas ? [{ id: 'pnpt', nombre: 'PNPT', inicio: b.fechas.inicio, fin: b.fechas.fin }] : [];
  }),
];
