/** Esquema de data/roadmap.json: la ruta de 18 bimestres (16-11-2026 a 15-11-2029). */

export type RoadmapLane = 'math' | 'prog' | 'product' | 'cert';
/** Qué se hace con un ítem: aprender, comprobar (test), construir o cerrar. */
export type RoadmapPart = 'learn' | 'test' | 'build' | 'close';

export interface RoadmapItem {
  id: string;
  lane: RoadmapLane;
  title: string;
  /** Semanas del bimestre, de la primera a la última (1 a 9). */
  weeks: [number, number];
  parts: RoadmapPart[];
  /** Horas estimadas; las certificaciones las traen. */
  hours?: number;
  /** De dónde sale: libro o curso. */
  source?: string;
}

/** Una compuerta: lo que hay que cumplir en un ítem para pasar. */
export interface RoadmapGate {
  id: string;
  /** Id del ítem al que apunta. */
  item: string;
  rule: string;
  /** Mínimo para un test, de 0 a 1. */
  min?: number;
}

export interface RoadmapCert {
  name: string;
  hours: number;
  optional: boolean;
  /** Id del ítem de la certificación. */
  item: string;
}

export interface RoadmapBimester {
  n: number;
  year: 1 | 2 | 3;
  start: string;
  end: string;
  product: { name: string; industry: string; pitch: string };
  /** Qué existe hoy en ese terreno. */
  existing?: string;
  /** Nuestro ángulo. */
  angle?: string;
  /** Resumen de cada carril, como en la tabla del plan. */
  summary: { math: string; prog: string };
  items: RoadmapItem[];
  gates: RoadmapGate[];
  cert?: RoadmapCert;
}

export interface RoadmapThread {
  id: string;
  title: string;
  /** Bimestre desde el que corre ('all' = todos). */
  from: number | 'all';
  perWeek?: number;
  source?: string;
}

export interface RoadmapOptional {
  id: string;
  title: string;
  /** Año de la ruta al que pertenece (4 o 5). */
  year: 4 | 5;
  items: string[];
}

export interface Roadmap {
  version: 3;
  route: {
    start: string;
    end: string;
    bimesters: number;
    years: { year: 1 | 2 | 3; profile: string; bimesters: number[] }[];
  };
  /** Ciclo de cada bimestre. */
  cycle: {
    study: [number, number];
    product: [number, number];
    close: [number, number];
    closeParts: string[];
    pilot: string;
  };
  threads: RoadmapThread[];
  optional: RoadmapOptional[];
  bimesters: RoadmapBimester[];
}

/** Ítems de un bimestre en una semana (1 a 9). */
export const itemsInWeek = (b: RoadmapBimester, week: number) => b.items.filter((i) => week >= i.weeks[0] && week <= i.weeks[1]);
