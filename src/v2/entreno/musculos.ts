/**
 * Trazo 2.0 · qué músculo trabaja cada ejercicio, para la figura del cuerpo. El principal sale del grupo del ejercicio (y de su
 * texto de músculos, si dice algo más preciso: "Trapecio superior"); los secundarios, de los demás que nombra ese texto. Un
 * ejercicio propio sin grupo se deduce del nombre. Con eso se cuentan las series por músculo: 1 por serie en el principal y
 * media en cada secundario, que es como se suele contar el volumen semanal. Puro.
 */
import type { Exercise, Routine, SetLog, Who } from '../../data/train-types';

export type Musculo =
  | 'pecho' | 'hombros' | 'biceps' | 'triceps' | 'antebrazos' | 'abdominales' | 'oblicuos'
  | 'trapecio' | 'dorsales' | 'lumbares' | 'gluteos' | 'cuadriceps' | 'isquios' | 'aductores' | 'gemelos';

export const MUSCULOS: Musculo[] = ['pecho', 'hombros', 'biceps', 'triceps', 'antebrazos', 'abdominales', 'oblicuos', 'trapecio', 'dorsales', 'lumbares', 'gluteos', 'cuadriceps', 'isquios', 'aductores', 'gemelos'];
export const NOMBRE: Record<Musculo, string> = {
  pecho: 'Pecho', hombros: 'Hombros', biceps: 'Bíceps', triceps: 'Tríceps', antebrazos: 'Antebrazos', abdominales: 'Abdominales', oblicuos: 'Oblicuos',
  trapecio: 'Trapecio', dorsales: 'Dorsales', lumbares: 'Lumbares', gluteos: 'Glúteos', cuadriceps: 'Cuádriceps', isquios: 'Isquiotibiales', aductores: 'Aductores', gemelos: 'Gemelos',
};
/** En qué vista de la figura se ve cada músculo. */
export const VISTA: Record<Musculo, ('frente' | 'espalda')[]> = {
  pecho: ['frente'], hombros: ['frente', 'espalda'], biceps: ['frente'], triceps: ['espalda'], antebrazos: ['frente', 'espalda'], abdominales: ['frente'], oblicuos: ['frente'],
  trapecio: ['frente', 'espalda'], dorsales: ['espalda'], lumbares: ['espalda'], gluteos: ['espalda'], cuadriceps: ['frente'], isquios: ['espalda'], aductores: ['frente'], gemelos: ['frente', 'espalda'],
};

export interface Parte { m: Musculo; /** 1 el principal, 0,5 los que acompañan. */ peso: number }

const plano = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

/** Los músculos que puede ser el principal de cada grupo del plan (el primero, si el texto no dice otra cosa). */
const GRUPO: Record<string, Musculo[]> = {
  pecho: ['pecho'], hombros: ['hombros'], triceps: ['triceps'], biceps: ['biceps'], antebrazos: ['antebrazos'],
  abdominales: ['abdominales', 'oblicuos'], espalda: ['dorsales', 'trapecio', 'lumbares'],
  cuadriceps: ['cuadriceps'], aductores: ['aductores'], gemelos: ['gemelos'], gluteos: ['gluteos'], isquiotibiales: ['isquios'],
};

/** Palabras del texto "Músculos" → región de la figura. El orden importa: lo más específico va primero. */
const CLAVES: [RegExp, Musculo][] = [
  [/braquiorradial|antebrazo/, 'antebrazos'],
  [/pectoral/, 'pecho'],
  [/deltoide/, 'hombros'],
  [/triceps/, 'triceps'],
  [/biceps|braquial/, 'biceps'],
  [/trapecio|romboides/, 'trapecio'],
  [/dorsal|redondo mayor/, 'dorsales'],
  [/erector|lumbar/, 'lumbares'],
  [/oblicuo/, 'oblicuos'],
  [/recto abdominal|abdominal|core/, 'abdominales'],
  [/gluteo/, 'gluteos'],
  [/cuadriceps|vasto/, 'cuadriceps'],
  [/isquio|femoral/, 'isquios'],
  [/aductor|gracil/, 'aductores'],
  [/gastrocnemio|soleo|gemelo/, 'gemelos'],
];

/** Los músculos que nombra un texto, en el orden en que aparecen. */
export function musculosDelTexto(texto?: string): Musculo[] {
  if (!texto) return [];
  const t = plano(texto);
  const vistos: { m: Musculo; i: number }[] = [];
  for (const [re, m] of CLAVES) {
    const i = t.search(re);
    if (i >= 0 && !vistos.some((v) => v.m === m)) vistos.push({ m, i });
  }
  return vistos.sort((a, b) => a.i - b.i).map((v) => v.m);
}

/** Un ejercicio sin grupo (los de una rutina propia): qué trabaja, por el nombre. */
const POR_NOMBRE: [RegExp, Musculo, Musculo[]][] = [
  [/curl femoral|femoral/, 'isquios', []],
  [/peso muerto|rumano|buenos dias/, 'isquios', ['gluteos', 'lumbares']],
  [/hip thrust|puente|patada de gluteo|gluteo/, 'gluteos', ['isquios']],
  [/sentadilla|prensa|hack|zancada|estocada|bulgara|extension de cuadriceps/, 'cuadriceps', ['gluteos']],
  [/gemelo|pantorrilla|soleo/, 'gemelos', []],
  [/aductor/, 'aductores', []],
  [/woodchopper|lenador|rotacion|oblicuo/, 'oblicuos', ['abdominales']],
  [/abs|abdominal|plancha|crunch|elevacion de piernas/, 'abdominales', []],
  // Los tirones van antes que el pecho: un "jalón al pecho" trabaja la espalda.
  [/encogimiento|trapecio/, 'trapecio', []],
  [/remo|jalon|dominada|pull ?over|pull|dorsal|high row/, 'dorsales', ['biceps']],
  [/militar|press de hombro|elevacion(es)? lateral|lateral|deltoide/, 'hombros', ['triceps']],
  [/banca|press plano|press inclinado|press horizontal|pecho|apertura|fly|cruce|fondos|flexion/, 'pecho', ['triceps', 'hombros']],
  [/triceps|pressdown|frances|patada de triceps/, 'triceps', []],
  [/curl de antebrazo|antebrazo|wrist|muneca|dead hang/, 'antebrazos', []],
  [/curl|biceps/, 'biceps', ['antebrazos']],
];

/** Los que acompañan cuando el plan no lo dice: un press empuja también con tríceps y hombro; un remo tira también con bíceps. */
function acompanan(nombre: string, principal: Musculo): Musculo[] {
  if (principal === 'pecho' && /press/.test(nombre)) return ['triceps', 'hombros'];
  if (principal === 'hombros' && /press/.test(nombre)) return ['triceps'];
  if (principal === 'dorsales' && /remo|jalon|dominada|high row/.test(nombre)) return ['biceps'];
  if (principal === 'oblicuos') return ['abdominales'];
  return [];
}

/** Lo que trabaja un ejercicio: el principal (peso 1) y los que acompañan (0,5). Vacío si no se puede saber. */
export function musculosDe(e: Pick<Exercise, 'name' | 'grupo' | 'musculos' | 'kind'>): Parte[] {
  const nombre = plano(e.name);
  const texto = musculosDelTexto(e.musculos);
  const candidatos = e.grupo ? GRUPO[plano(e.grupo)] : undefined;
  let principal: Musculo | undefined;
  let extra: Musculo[] = [];
  if (candidatos) {
    principal = texto.find((m) => candidatos.includes(m)) ?? (candidatos.includes('oblicuos') && /woodchopper|lenador|rotacion/.test(nombre) ? 'oblicuos' : candidatos[0]);
    extra = texto.length ? texto.filter((m) => m !== principal) : acompanan(nombre, principal);
  } else if (texto.length) {
    [principal, ...extra] = texto;
  } else {
    const hit = POR_NOMBRE.find(([re]) => re.test(nombre));
    if (hit) { principal = hit[1]; extra = hit[2]; }
    else if (e.kind === 'pierna') return [{ m: 'cuadriceps', peso: 0.5 }, { m: 'isquios', peso: 0.5 }, { m: 'gluteos', peso: 0.5 }];
  }
  if (!principal) return [];
  return [{ m: principal, peso: 1 }, ...extra.filter((m) => m !== principal).map((m) => ({ m, peso: 0.5 }))];
}

export type Carga = Partial<Record<Musculo, number>>;

const sumar = (c: Carga, partes: Parte[], series: number) => { for (const p of partes) c[p.m] = (c[p.m] ?? 0) + p.peso * series; };
const r1 = (x: number) => Math.round(x * 10) / 10;
const redondear = (c: Carga): Carga => Object.fromEntries(Object.entries(c).map(([k, v]) => [k, r1(v as number)])) as Carga;

/** Las series por músculo que trae una rutina (o varias: la semana). */
export function cargaDeRutinas(rutinas: Pick<Routine, 'exercises'>[]): Carga {
  const c: Carga = {};
  for (const r of rutinas) for (const e of r.exercises) sumar(c, musculosDe(e), e.sets);
  return redondear(c);
}

/** Las series por músculo que se hicieron: cada serie cargada cuenta 1 en el principal y media en los que acompañan. */
export function cargaDeSeries(sets: SetLog[], ejercicios: Map<string, Pick<Exercise, 'name' | 'grupo' | 'musculos' | 'kind'>>, who: Who = 'me'): Carga {
  const c: Carga = {};
  for (const s of sets) {
    if (s.who !== who) continue;
    const e = ejercicios.get(s.ex);
    if (e) sumar(c, musculosDe(e), 1);
  }
  return redondear(c);
}

/** Todos los ejercicios de unas rutinas, por id (el mismo ejercicio en dos rutinas es el mismo). */
export function indiceEjercicios(rutinas: Pick<Routine, 'exercises'>[]): Map<string, Exercise> {
  const m = new Map<string, Exercise>();
  for (const r of rutinas) for (const e of r.exercises) if (!m.has(e.id)) m.set(e.id, e);
  return m;
}

/**
 * Cuán encendido va cada músculo, de 0 a 1: lo hecho contra lo planeado de la semana (o contra 10 series, si esa semana no
 * tenía nada planeado para ese músculo). En cuatro pasos, para que se lea de un vistazo.
 */
export function calor(hecho: Carga, plan: Carga = {}): Carga {
  const out: Carga = {};
  for (const m of MUSCULOS) {
    const h = hecho[m] ?? 0;
    if (h <= 0) continue;
    const tope = plan[m] && plan[m]! > 0 ? plan[m]! : 10;
    out[m] = Math.min(1, Math.max(0.25, Math.ceil((h / tope) * 4) / 4));
  }
  return out;
}

/** La figura de una rutina: el principal de cada ejercicio va lleno (1); los que solo acompañan, a media luz (0,5). */
export function luzDeRutina(r: Pick<Routine, 'exercises'>): Carga {
  const out: Carga = {};
  for (const e of r.exercises) for (const p of musculosDe(e)) out[p.m] = Math.max(out[p.m] ?? 0, p.peso >= 1 ? 1 : 0.5);
  return out;
}

/** Los músculos de una carga, del que más tiene al que menos. */
export const ordenados = (c: Carga): [Musculo, number][] => (Object.entries(c) as [Musculo, number][]).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1] || MUSCULOS.indexOf(a[0]) - MUSCULOS.indexOf(b[0]));
