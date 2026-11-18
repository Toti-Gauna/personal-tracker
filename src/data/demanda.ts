/**
 * Ola 26 · tabla de demanda: qué tecnologías piden las vacantes que cargaste y qué proyecto del plan
 * las cubre. NO hay datos de mercado: solo cuenta lo que vos cargás (pegando texto o JSON).
 * Puro: recibe las vacantes y el calendario.
 */
import { PLAN_EXT, type BloqueFechado, type Tecnologia } from './plan-extendido';

export interface Vacante {
  id: string;
  rol: string;
  empresa?: string;
  /** Tecnologías que pide, tal como se cargaron (o ya con el nombre del plan). */
  stack: string[];
  /** Día en que la cargaste. */
  fecha: string;
}

/** Sin tildes, en minúscula y con los espacios normalizados. */
export const norm = (x: string) => x.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

export interface EntradaCatalogo {
  clave: string;
  nombre: string;
  /** Todas las formas en que una vacante puede escribirla (incluido su nombre). */
  alias: string[];
  /** El proyecto que la cubre (el primero del plan que la tiene; una movida la cubre su destino). */
  proyecto: string;
}

const SEPARA = /\s+y\s+|,\s*|\s+o\s+|\s*\/\s*/;
/** Una parte que parece un nombre propio de tecnología: hasta 2 palabras, con mayúscula, número, punto o #. */
const pareceNombre = (x: string) => x.length >= 2 && x.split(/\s+/).length <= 2 && /^[A-ZÁÉÍÓÚÑ0-9.#]|[0-9.#+]/.test(x);

/** Los alias de una tecnología: su nombre, el nombre sin paréntesis, lo que va entre paréntesis y las partes de "X y Y". */
export function aliasDe(t: Tecnologia): string[] {
  const out = new Set<string>([t.nombre, ...(t.alias ?? [])]);
  const sin = t.nombre.replace(/\s*\([^)]*\)/g, '').trim();
  if (sin) out.add(sin);
  // Lo que va entre paréntesis solo suma si el nombre es una descripción ("Cola asíncrona para la ingesta (RabbitMQ o SQS)"):
  // en "Orekit (Java)" el paréntesis es el lenguaje, no otra forma de llamarla.
  const dentro = sin.split(/\s+/).length >= 3 ? [...t.nombre.matchAll(/\(([^)]*)\)/g)].map((m) => m[1]) : [];
  for (const trozo of [sin, ...dentro]) for (const parte of trozo.split(SEPARA).map((x) => x.trim())) if (pareceNombre(parte)) out.add(parte);
  return [...out].filter(Boolean);
}

/** Las tecnologías del plan con el proyecto que las cubre (en el orden del calendario). */
export function catalogo(): EntradaCatalogo[] {
  const out = new Map<string, EntradaCatalogo>();
  for (const b of PLAN_EXT.bloques) {
    if (b.tipo !== 'proyecto') continue;
    for (const t of b.tecnologias ?? []) {
      if (t.marca === 'reusada') continue;
      const clave = norm(t.nombre);
      if (!out.has(clave)) out.set(clave, { clave, nombre: t.nombre, alias: aliasDe(t), proyecto: b.id });
    }
  }
  // Un alias que sirve para dos tecnologías distintas es ambiguo: queda solo en la que lo tiene como nombre.
  const dueños = new Map<string, number>();
  for (const e of out.values()) for (const a of new Set(e.alias.map(norm))) dueños.set(a, (dueños.get(a) ?? 0) + 1);
  for (const e of out.values()) e.alias = e.alias.filter((a) => norm(a) === e.clave || dueños.get(norm(a)) === 1);
  return [...out.values()];
}

/** Escapa un texto para usarlo dentro de una expresión regular. */
const esc = (x: string) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const BORDE_IZQ = '(?<![\\p{L}\\p{N}+#])';
const BORDE_DER = '(?![\\p{L}\\p{N}+#])';

/** ¿El texto nombra este alias? Los cortos (hasta 3 letras: "Go", "C#", "SQS") distinguen mayúsculas para no confundirse con palabras. */
function nombra(texto: string, textoNorm: string, alias: string) {
  if (alias.length <= 3) return new RegExp(`${BORDE_IZQ}${esc(alias)}${BORDE_DER}`, 'u').test(texto);
  return new RegExp(`${BORDE_IZQ}${esc(norm(alias))}${BORDE_DER}`, 'u').test(textoNorm);
}

/** Las tecnologías del plan que nombra un texto, con el nombre del plan. */
export function detectar(texto: string, cat: EntradaCatalogo[] = catalogo()): string[] {
  const n = norm(texto);
  return cat.filter((c) => c.alias.some((a) => nombra(texto, n, a))).map((c) => c.nombre);
}

// ——— cargar vacantes (JSON o texto) ———

export type ResultadoCarga = { ok: true; vacantes: Omit<Vacante, 'id'>[]; avisos: string[] } | { ok: false; errores: string[] };

const lista = (x: unknown) => Array.isArray(x) && x.every((s) => typeof s === 'string' && s.trim());
const dedup = (xs: string[]) => { const v = new Set<string>(); return xs.filter((x) => { const k = norm(x); if (v.has(k)) return false; v.add(k); return true; }); };

/** Una vacante a partir de un texto: la primera línea es el rol; "Stack: a, b" suma lo que ahí diga; el resto se busca en el plan. */
function deTexto(bloque: string, hoy: string, cat: EntradaCatalogo[]): Omit<Vacante, 'id'> | null {
  const lineas = bloque.split('\n').map((l) => l.trim()).filter(Boolean);
  if (!lineas.length) return null;
  const rol = lineas[0].replace(/^[#*\-•\s]+/, '').slice(0, 120);
  const explicito = lineas.filter((l) => /^(stack|tecnolog[ií]as|requisitos|skills)\s*[:\-]/i.test(l)).flatMap((l) => l.replace(/^[^:\-]+[:\-]\s*/, '').split(/[,;•|/]/).map((x) => x.trim()).filter(Boolean));
  const stack = dedup([...detectar(bloque, cat), ...explicito.map((e) => cat.find((c) => c.alias.some((a) => norm(a) === norm(e)))?.nombre ?? e)]);
  return { rol, stack, fecha: hoy };
}

/**
 * Lee vacantes de lo que pegaste. JSON: un arreglo de vacantes, `{ "tipo": "vacantes", "lista": [...] }` o una sola;
 * cada una con "rol" y "stack" (lista) o "texto". Texto: una vacante por bloque, separados por una línea `---`.
 */
export function leerVacantes(entrada: string, hoy: string, cat: EntradaCatalogo[] = catalogo()): ResultadoCarga {
  const t = entrada.trim();
  if (!t) return { ok: false, errores: ['Pegá una vacante (texto) o un JSON con vacantes.'] };
  if (/^[[{]/.test(t)) {
    let x: unknown;
    try { x = JSON.parse(t); } catch (e) { return { ok: false, errores: [`El JSON no es válido: ${(e as Error).message}`] }; }
    const o = x as { tipo?: unknown; lista?: unknown };
    if (!Array.isArray(x) && o && typeof o === 'object' && o.tipo !== undefined && o.tipo !== 'vacantes') return { ok: false, errores: [`"tipo" tiene que ser "vacantes" (dice "${String(o.tipo)}").`] };
    const arr: unknown[] = Array.isArray(x) ? x : Array.isArray(o?.lista) ? (o.lista as unknown[]) : o && typeof o === 'object' && 'rol' in o ? [o] : [];
    if (!arr.length) return { ok: false, errores: ['No encontré vacantes: tiene que ser una lista, `{ "tipo": "vacantes", "lista": [...] }` o una vacante con "rol".'] };
    const errores: string[] = [];
    const avisos: string[] = [];
    const vacantes: Omit<Vacante, 'id'>[] = [];
    arr.forEach((v, i) => {
      const r = v as { rol?: unknown; empresa?: unknown; stack?: unknown; texto?: unknown };
      const n = i + 1;
      if (!r || typeof r !== 'object' || typeof r.rol !== 'string' || !r.rol.trim()) { errores.push(`vacante ${n}: falta "rol".`); return; }
      if (r.empresa !== undefined && typeof r.empresa !== 'string') { errores.push(`vacante ${n}: "empresa" tiene que ser un texto.`); return; }
      if (r.stack !== undefined && !lista(r.stack)) { errores.push(`vacante ${n}: "stack" tiene que ser una lista de textos.`); return; }
      if (r.texto !== undefined && typeof r.texto !== 'string') { errores.push(`vacante ${n}: "texto" tiene que ser un texto.`); return; }
      if (r.stack === undefined && r.texto === undefined) { errores.push(`vacante ${n}: falta "stack" (lista) o "texto".`); return; }
      const dichas = ((r.stack as string[] | undefined) ?? []).map((s) => cat.find((c) => c.alias.some((a) => norm(a) === norm(s)))?.nombre ?? s.trim());
      const vistas = typeof r.texto === 'string' ? detectar(r.texto, cat) : [];
      const stack = dedup([...dichas, ...vistas]);
      if (!stack.length) avisos.push(`vacante ${n} (${r.rol.trim()}): sin tecnologías; se guarda igual.`);
      vacantes.push({ rol: r.rol.trim(), ...(r.empresa ? { empresa: (r.empresa as string).trim() } : {}), stack, fecha: hoy });
    });
    return errores.length ? { ok: false, errores } : { ok: true, vacantes, avisos };
  }
  const bloques = t.split(/^\s*-{3,}\s*$/m).map((b) => b.trim()).filter(Boolean);
  const vacantes = bloques.map((b) => deTexto(b, hoy, cat)).filter((v): v is Omit<Vacante, 'id'> => !!v);
  return { ok: true, vacantes, avisos: vacantes.filter((v) => !v.stack.length).map((v) => `${v.rol}: no encontré tecnologías del plan ni una línea "Stack:".`) };
}

// ——— la tabla ———

export interface FilaDemanda {
  clave: string;
  tecnologia: string;
  /** Cuántas vacantes la piden. */
  vacantes: number;
  /** El proyecto que la cubre; null si ninguno la cubre. */
  proyecto: string | null;
  /** Cuándo cierra ese proyecto (estimada: sale del calendario con tus extras). */
  fecha: string | null;
  /** El proyecto que la cubre ya llegó a su fecha estimada. */
  cubierta: boolean;
}

export interface TablaDemanda {
  filas: FilaDemanda[];
  /** Tecnologías del plan que ninguna vacante pidió (con 0). */
  sinPedir: FilaDemanda[];
  vacantes: number;
  /** Pedidas que el plan no cubre. */
  fueraDelPlan: number;
}

/**
 * Cuenta, por tecnología, cuántas vacantes la piden (una vacante cuenta una vez por tecnología) y la une con el
 * proyecto del plan que la cubre y la fecha en que cierra. Una tecnología que el plan no cubre queda sin proyecto.
 */
export function tablaDemanda(vacantes: Vacante[], cal: BloqueFechado[], hoy: string, cat: EntradaCatalogo[] = catalogo()): TablaDemanda {
  const cuenta = new Map<string, FilaDemanda>();
  const fila = (clave: string, tecnologia: string, proyecto: string | null): FilaDemanda => {
    const b = proyecto ? cal.find((x) => x.id === proyecto) : undefined;
    return { clave, tecnologia, vacantes: 0, proyecto, fecha: b?.fin ?? null, cubierta: !!b && b.fin < hoy };
  };
  for (const c of cat) cuenta.set(c.clave, fila(c.clave, c.nombre, c.proyecto));
  for (const v of vacantes) {
    const vistas = new Set<string>();
    for (const s of v.stack) {
      const c = cat.find((e) => e.alias.some((a) => norm(a) === norm(s)));
      const clave = c?.clave ?? norm(s);
      if (vistas.has(clave)) continue;
      vistas.add(clave);
      if (!cuenta.has(clave)) cuenta.set(clave, fila(clave, s.trim(), null));
      cuenta.get(clave)!.vacantes++;
    }
  }
  const orden = (a: FilaDemanda, b: FilaDemanda) => b.vacantes - a.vacantes || (a.fecha ?? '9999').localeCompare(b.fecha ?? '9999') || a.tecnologia.localeCompare(b.tecnologia);
  const todas = [...cuenta.values()];
  const filas = todas.filter((f) => f.vacantes > 0).sort(orden);
  return { filas, sinPedir: todas.filter((f) => f.vacantes === 0).sort(orden), vacantes: vacantes.length, fueraDelPlan: filas.filter((f) => !f.proyecto).length };
}
