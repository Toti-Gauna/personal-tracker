/**
 * Plan v12.2 · los datos generados por scripts/plan-v12-2.mjs desde docs/prompts/plan-v12.2.md: el detalle de cada proyecto (en
 * castellano, tal cual), la línea BACKGROUND de cada bloque, las 4 apps secundarias, los 23 slots comerciales, los recordatorios
 * nuevos y el backlog "Ver a futuro". Todo lo de v12.1 sigue igual: v12.2 lo extiende con tres pistas.
 */
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
  secundaria?: { app: string; version: string }[] | 'libre';
  comercial?: number | null;
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
}

export interface Comercial {
  n: number;
  id: string;
  inicio: string;
  fin: string;
  ventana: string;
  /** null: "TO DEFINE" (hay que elegir la marca). */
  marca: string | null;
  queSeHace: string | null;
  wow: string | null;
  reusa: string | null;
}

export interface DatosV122 {
  version: 1;
  plan: 'v12.2';
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
  versiones: VersionHerramienta[];
}

export const V122 = raw as unknown as DatosV122;
export const detalleDe = (id: string): DetalleProyecto | undefined => V122.detalle[id];
export const secundaria = (id: string) => V122.secundarias.find((s) => s.id === id);
export const comercial = (id: string) => V122.comerciales.find((c) => c.id === id);

/** Las pausas fijas de todo lo de fondo: el PNPT y el 20–26 dic 2027 (se ven en pausa, no atrasadas). */
export const PAUSAS_FONDO = [
  { id: 'pnpt', nombre: 'PNPT', inicio: '2027-10-28', fin: '2027-11-11' },
  { id: 'dic-2027', nombre: 'Pausa de fin de año', inicio: '2027-12-20', fin: '2027-12-26' },
];
