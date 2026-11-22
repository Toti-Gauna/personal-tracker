/**
 * v12.2 · el estándar 🧲 Imán (las tres pistas) y el checklist de seguridad de los comerciales. El Imán va en el lanzamiento público:
 * una versión por ítem marcada como lanzamiento (v3.0 de fábrica en proyectos y apps; la única en los comerciales). Ese lanzamiento no
 * se publica sin los 8 puntos, con los pasos 1 a 3 de la serie de posts (teaser, build, launch); "deep dive" y "result" quedan como
 * tareas de después. Las versiones de antes se publican sin el Imán. Puro.
 */
export type PasoSerie = 'teaser' | 'build' | 'launch' | 'deepdive' | 'result';
export const PASOS_SERIE: PasoSerie[] = ['teaser', 'build', 'launch', 'deepdive', 'result'];
export const PASOS_ANTES: PasoSerie[] = ['teaser', 'build', 'launch'];
export const PASO_TXT: Record<PasoSerie, string> = { teaser: 'Teaser', build: 'Build', launch: 'Launch', deepdive: 'Deep dive', result: 'Result' };

export interface Iman {
  /** 1 · gancho de una línea. */
  hook?: string;
  /** 2 · el momento wow en los primeros 3 s de un video de 30 s. */
  video?: string;
  /** 3 · demo pública sin registro. */
  demo?: string;
  /** 4 · una métrica memorable, medida (no inventada). */
  metrica?: { valor?: string; como?: string };
  /** 5 · el gancho con una noticia. */
  noticia?: { link?: string; linea?: string };
  /** 6 · listo para una prueba técnica. */
  readme?: boolean;
  adrs?: boolean;
  tests?: boolean;
  /** 7 · empresas a las que apunta. */
  empresas?: string[];
  /** 8 · la serie de posts: cada paso, unido a un post. */
  posts?: Partial<Record<PasoSerie, string>>;
}

const lleno = (s?: string) => !!s && s.trim().length > 0;
const url = (s?: string) => lleno(s) && /^https?:\/\/\S+$/.test(s!.trim());

/** Los 8 puntos: si está cada uno y qué falta. */
export function puntosIman(i: Iman | undefined) {
  const x = i ?? {};
  return [
    { n: 1, nombre: 'Gancho de una línea', ok: lleno(x.hook) },
    { n: 2, nombre: 'Wow en los primeros 3 s (video de 30 s)', ok: url(x.video) },
    { n: 3, nombre: 'Demo pública sin registro', ok: url(x.demo) },
    { n: 4, nombre: 'Una métrica medida', ok: lleno(x.metrica?.valor) && lleno(x.metrica?.como) },
    { n: 5, nombre: 'Gancho con una noticia', ok: url(x.noticia?.link) && lleno(x.noticia?.linea) },
    { n: 6, nombre: 'README, ADRs y tests', ok: !!x.readme && !!x.adrs && !!x.tests },
    { n: 7, nombre: 'Empresas objetivo', ok: (x.empresas ?? []).some(lleno) },
    { n: 8, nombre: 'Serie de posts: teaser, build y launch', ok: PASOS_ANTES.every((p) => lleno(x.posts?.[p])) },
  ];
}

export const imanCompleto = (i: Iman | undefined) => puntosIman(i).every((p) => p.ok);

export const SEGURIDAD = [
  'Etiqueta visible: "concepto no oficial, sin relación con la marca"',
  'Diseño propio: sin logos ni escudos copiados',
  'Sin login ni pagos que imiten a la marca real',
  'Datos simulados y marcados como simulados; ningún dato real de clientes',
  'Las pruebas de carga nunca pegan a la API real del LLM',
] as const;

/** Reglas extra que se muestran donde aplican (no son casillas). */
export const REGLAS_EXTRA = {
  cripto: 'Cripto solo en testnet',
  pagos: 'Pagos reales solo por Mercado Pago',
  voz: 'Los agentes de voz avisan que son IA y que graban; sin clonar voces',
  clip: 'Clip Studio: solo APIs oficiales, sin automatizar varias cuentas, sin engagement falso, solo contenido con permiso',
} as const;

export const seguridadCompleta = (marcas: boolean[] | undefined) => SEGURIDAD.every((_, i) => !!marcas?.[i]);

/**
 * ¿Se puede marcar publicada esta versión? Las de antes del lanzamiento, sí (salvo la revisión en primer plano). El lanzamiento pide
 * el Imán completo y, en los comerciales, el checklist de seguridad.
 */
export function puedePublicar(o: {
  version: string;
  lanzamiento: string;
  iman?: Iman;
  comercial?: boolean;
  seguridad?: boolean[];
  /** La versión pide revisión en primer plano y todavía no se hizo. */
  faltaForeground?: boolean;
}): { ok: boolean; faltan: string[] } {
  const faltan: string[] = [];
  if (o.faltaForeground) faltan.push('Revisión en primer plano (toca plata, datos personales, seguridad o smart contracts)');
  if (o.version === o.lanzamiento) {
    for (const p of puntosIman(o.iman)) if (!p.ok) faltan.push(`Imán ${p.n} · ${p.nombre}`);
    if (o.comercial && !seguridadCompleta(o.seguridad)) faltan.push('Checklist de seguridad del showcase');
  }
  return { ok: faltan.length === 0, faltan };
}

export type Canal = 'linkedin-en' | 'linkedin-es' | 'x';
export interface Post {
  id: string;
  fecha: string;
  canales: Canal[];
  pista: 'principal' | 'secundaria' | 'comercial';
  /** El ítem al que se une (P1, handyx, com-3…). */
  item?: string;
  paso?: PasoSerie;
  link?: string;
  texto?: string;
}

/** El hábito del martes y el jueves: martes lo principal; jueves lo secundario o un showcase. */
export const pistaDelPost = (fecha: string): 'principal' | 'fondo' | null => {
  const d = new Date(`${fecha}T12:00:00`).getDay();
  return d === 2 ? 'principal' : d === 4 ? 'fondo' : null;
};
