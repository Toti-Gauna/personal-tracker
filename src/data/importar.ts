/**
 * 7.7 · Importar el JSON que devuelve Claude (foto del cuaderno → Claude corrige → JSON → Trazo).
 * Validación a mano, sin dependencias: cada error dice la línea del texto pegado donde falla.
 * Campos comunes: "tipo", "rama", "fecha".
 */
import { TRAMOS, fechaCorta, type EstadoPostulacion } from './plan';
import { RAMAS } from './ramas';
import { approves, scheduleApproved, scheduleFailed, unitState } from './study';
import type { ErrType, StudyState } from './study-types';
import { addDays } from './time';
import type { Rama } from './types';

export type TipoImport = 'sesion' | 'revision' | 'examen' | 'entrevista' | 'simulacro' | 'postulaciones' | 'semana';

/** Qué ramas acepta cada tipo (la primera es la que se detecta si el JSON no trae "rama"). */
export const RAMAS_DE_TIPO: Record<TipoImport, Rama[]> = {
  sesion: ['matematica', 'programacion'],
  revision: ['programacion'],
  examen: ['programacion', 'matematica'],
  entrevista: ['ingles', 'trabajo'],
  simulacro: ['ingles', 'trabajo'],
  postulaciones: ['trabajo'],
  semana: ['handyx'],
};

export const QUE_ES: Record<TipoImport, string> = {
  sesion: 'Sesión de estudio: tarjetas, errores, test y repasos.',
  revision: 'Revisión de código: hallazgos con su tipo de error.',
  examen: 'Examen de programación de un proyecto o certificación.',
  entrevista: 'Entrevista: preguntas, lo que falló y el puntaje.',
  simulacro: 'Simulacro: preguntas, lo que falló y el puntaje.',
  postulaciones: 'Lista de postulaciones con su estado.',
  semana: 'Semana de Handyx: horas, operaciones, ingresos y margen.',
};

const ERR: ErrType[] = ['concepto', 'tecnica', 'descuido', 'enunciado'];
const ESTADOS: EstadoPostulacion[] = ['enviada', 'respuesta', 'entrevista', 'oferta', 'rechazada'];

export interface Hallazgo { texto: string; tipo: string }
export interface Importable {
  tipo: TipoImport;
  rama: Rama;
  fecha: string;
  libro?: string;
  capitulo?: number;
  minutos?: number;
  test?: { hechos: number; correctos: number };
  errores?: { tema: string; tipo: ErrType; nota?: string }[];
  tarjetas?: { frente: string; dorso: string }[];
  tarjetasNuevas?: number;
  proyecto?: string;
  puntaje?: number;
  hallazgos?: Hallazgo[];
  rol?: string;
  preguntas?: string[];
  fallas?: Hallazgo[];
  lista?: { rol: string; empresa?: string; rango?: string; estado: EstadoPostulacion }[];
  mensajes?: number;
  horas?: number;
  operaciones?: number;
  ingresos?: number;
  margen?: number;
  usuarios?: number;
}

export interface ErrorImport { linea: number; mensaje: string }
export type Validacion = { ok: true; d: Importable; detectada: boolean } | { ok: false; error: ErrorImport };

/** Línea (1…) de una posición del texto. */
export const lineaDe = (texto: string, pos: number) => texto.slice(0, Math.max(0, pos)).split('\n').length;

/** Línea de la n-ésima aparición de "clave" (o de la primera desde otra clave). */
export function lineaDeClave(texto: string, clave: string, n = 0, despuesDe?: string) {
  const base = despuesDe ? Math.max(0, texto.indexOf(`"${despuesDe}"`)) : 0;
  let i = base - 1;
  for (let k = 0; k <= n; k++) {
    i = texto.indexOf(`"${clave}"`, i + 1);
    if (i < 0) return despuesDe ? lineaDe(texto, base) : 1;
  }
  return lineaDe(texto, i);
}

/** Línea del error de sintaxis según el mensaje del navegador. */
function lineaDeSintaxis(texto: string, msg: string) {
  const lc = /line (\d+) column (\d+)/i.exec(msg);
  if (lc) return Number(lc[1]);
  const p = /position (\d+)/i.exec(msg);
  if (p) return lineaDe(texto, Number(p[1]));
  return texto.trimEnd().split('\n').length;
}

function esFecha(s: unknown): s is string {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split('-').map(Number);
  const x = new Date(y, m - 1, d);
  return x.getFullYear() === y && x.getMonth() === m - 1 && x.getDate() === d;
}
const esEntero = (v: unknown, min = 0) => typeof v === 'number' && Number.isInteger(v) && v >= min;
const esNum = (v: unknown, min = -Infinity) => typeof v === 'number' && Number.isFinite(v) && v >= min;
const esTexto = (v: unknown) => typeof v === 'string' && v.trim().length > 0;

class Falla extends Error {
  constructor(public linea: number, mensaje: string) { super(mensaje); }
}

/** Valida el JSON pegado. `ramaElegida` se usa si el JSON no trae "rama". */
export function validarImportacion(texto: string, ramaElegida?: Rama): Validacion {
  if (!texto.trim()) return { ok: false, error: { linea: 1, mensaje: 'Pegá el JSON que te devolvió Claude.' } };
  let raw: unknown;
  try {
    raw = JSON.parse(texto);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: { linea: lineaDeSintaxis(texto, msg), mensaje: 'No es un JSON válido: revisá comas, comillas y llaves en esta línea o en la anterior.' } };
  }
  const L = (clave: string, n = 0, despuesDe?: string) => lineaDeClave(texto, clave, n, despuesDe);
  try {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Falla(1, 'Tiene que ser un objeto: { "tipo": …, "rama": …, "fecha": … }.');
    const o = raw as Record<string, unknown>;
    const tipos = Object.keys(RAMAS_DE_TIPO) as TipoImport[];
    if (!tipos.includes(o.tipo as TipoImport)) throw new Falla(L('tipo'), `"tipo" tiene que ser uno de: ${tipos.join(', ')}.`);
    const tipo = o.tipo as TipoImport;
    const permitidas = RAMAS_DE_TIPO[tipo];
    let detectada = true;
    let rama: Rama;
    if (o.rama === undefined) {
      detectada = false;
      rama = ramaElegida && permitidas.includes(ramaElegida) ? ramaElegida : permitidas[0];
    } else if (!RAMAS.includes(o.rama as Rama)) throw new Falla(L('rama'), `"rama" tiene que ser una de: ${RAMAS.join(', ')}.`);
    else if (!permitidas.includes(o.rama as Rama)) throw new Falla(L('rama'), `Un "${tipo}" va a ${permitidas.join(' o ')}, no a ${o.rama}.`);
    else rama = o.rama as Rama;
    if (!esFecha(o.fecha)) throw new Falla(L('fecha'), '"fecha" tiene que ser AAAA-MM-DD, por ejemplo "2026-12-14".');
    const d: Importable = { tipo, rama, fecha: o.fecha as string };

    const opcNum = (k: string, min = 0, entero = false) => {
      if (o[k] === undefined) return undefined;
      if (entero ? !esEntero(o[k], min) : !esNum(o[k], min)) throw new Falla(L(k), `"${k}" tiene que ser un número${entero ? ' entero' : ''}${min > -Infinity ? ` desde ${min}` : ''}.`);
      return o[k] as number;
    };
    const hallazgos = (k: string, tiposOk?: string[]) => {
      if (o[k] === undefined) return undefined;
      if (!Array.isArray(o[k])) throw new Falla(L(k), `"${k}" tiene que ser una lista.`);
      return (o[k] as unknown[]).map((h, i) => {
        const x = h as Record<string, unknown>;
        if (typeof h === 'string' && esTexto(h)) return { texto: h, tipo: tiposOk?.[0] ?? 'otro' };
        if (!x || typeof x !== 'object' || !esTexto(x.texto)) throw new Falla(L('texto', i, k), `Cada ítem de "${k}" necesita "texto".`);
        if (tiposOk && x.tipo !== undefined && !tiposOk.includes(x.tipo as string)) throw new Falla(L('tipo', i + 1, k), `"tipo" en "${k}" tiene que ser ${tiposOk.join(', ')}.`);
        return { texto: (x.texto as string).trim(), tipo: (x.tipo as string) ?? tiposOk?.[0] ?? 'otro' };
      });
    };
    // Ola 8b: el examen de una ventana (W1 a W3) es el test de su puerta de matemática.
    const proyecto = (conVentanas = false) => {
      const ok = TRAMOS.some((t) => t.id === o.proyecto && (t.tipo === 'proyecto' || t.tipo === 'cert' || (conVentanas && t.tipo === 'ventana')));
      if (!ok) throw new Falla(L('proyecto'), `"proyecto" tiene que ser un id del plan: P0 a P10 o C1 a C3${conVentanas ? ' (o W1 a W3 para la puerta de matemática)' : ''}.`);
      return o.proyecto as string;
    };

    if (tipo === 'sesion') {
      if (o.libro !== undefined && !esTexto(o.libro)) throw new Falla(L('libro'), '"libro" tiene que ser un texto.');
      d.libro = o.libro as string | undefined;
      d.capitulo = opcNum('capitulo', 1, true);
      if (rama === 'matematica' && d.capitulo === undefined) throw new Falla(L('tipo'), 'Una sesión de matemática necesita "capitulo".');
      d.minutos = opcNum('minutos', 0);
      if (o.test !== undefined) {
        const t = o.test as Record<string, unknown>;
        if (!t || typeof t !== 'object' || !esEntero(t.hechos, 1)) throw new Falla(L('hechos', 0, 'test'), '"test.hechos" tiene que ser un entero desde 1.');
        if (!esEntero(t.correctos, 0) || (t.correctos as number) > (t.hechos as number)) throw new Falla(L('correctos', 0, 'test'), '"test.correctos" va de 0 a "hechos".');
        if (d.capitulo === undefined) throw new Falla(L('test'), 'Un test necesita "capitulo".');
        d.test = { hechos: t.hechos as number, correctos: t.correctos as number };
      }
      if (o.errores !== undefined) {
        if (!Array.isArray(o.errores)) throw new Falla(L('errores'), '"errores" tiene que ser una lista.');
        d.errores = o.errores.map((e, i) => {
          const x = e as Record<string, unknown>;
          if (!x || typeof x !== 'object' || !esTexto(x.tema)) throw new Falla(L('tema', i, 'errores'), 'Cada error necesita "tema".');
          if (!ERR.includes(x.tipo as ErrType)) throw new Falla(L('tipo', i + 1, 'errores'), `"tipo" del error tiene que ser ${ERR.join(', ')}.`);
          if (x.nota !== undefined && typeof x.nota !== 'string') throw new Falla(L('nota', i, 'errores'), '"nota" tiene que ser un texto.');
          return { tema: (x.tema as string).trim(), tipo: x.tipo as ErrType, nota: x.nota as string | undefined };
        });
      }
      const tn = o.tarjetas_nuevas;
      if (tn !== undefined) {
        if (Array.isArray(tn)) {
          d.tarjetas = tn.map((c, i) => {
            const x = c as Record<string, unknown>;
            if (!x || !esTexto(x.frente) || !esTexto(x.dorso)) throw new Falla(L('frente', i, 'tarjetas_nuevas'), 'Cada tarjeta necesita "frente" y "dorso".');
            return { frente: (x.frente as string).trim(), dorso: (x.dorso as string).trim() };
          });
        } else if (esEntero(tn, 0)) d.tarjetasNuevas = tn as number;
        else throw new Falla(L('tarjetas_nuevas'), '"tarjetas_nuevas" es un número o una lista de { "frente", "dorso" }.');
      }
    } else if (tipo === 'revision') {
      d.proyecto = proyecto();
      d.hallazgos = hallazgos('hallazgos', ['concepto', 'tecnica', 'descuido']);
      if (!d.hallazgos?.length) throw new Falla(L('tipo'), 'Una revisión necesita "hallazgos" con al menos uno.');
    } else if (tipo === 'examen') {
      d.proyecto = proyecto(true);
      const p = opcNum('puntaje', 0);
      if (p === undefined || p > 100) throw new Falla(L(o.puntaje === undefined ? 'proyecto' : 'puntaje'), '"puntaje" va de 0 a 100.');
      d.puntaje = p;
      d.hallazgos = hallazgos('hallazgos', ['concepto', 'tecnica', 'descuido']);
    } else if (tipo === 'entrevista' || tipo === 'simulacro') {
      if (o.rol !== undefined && !esTexto(o.rol)) throw new Falla(L('rol'), '"rol" tiene que ser un texto.');
      d.rol = o.rol as string | undefined;
      if (o.preguntas !== undefined && (!Array.isArray(o.preguntas) || !o.preguntas.every(esTexto))) throw new Falla(L('preguntas'), '"preguntas" tiene que ser una lista de textos.');
      d.preguntas = o.preguntas as string[] | undefined;
      d.fallas = hallazgos('fallas');
      const p = opcNum('puntaje', 0);
      if (p !== undefined && p > 100) throw new Falla(L('puntaje'), '"puntaje" va de 0 a 100.');
      d.puntaje = p;
    } else if (tipo === 'postulaciones') {
      if (!Array.isArray(o.lista) || !o.lista.length) throw new Falla(L(o.lista === undefined ? 'tipo' : 'lista'), '"lista" tiene que ser una lista con al menos una postulación.');
      d.lista = o.lista.map((p, i) => {
        const x = p as Record<string, unknown>;
        if (!x || !esTexto(x.rol)) throw new Falla(L('rol', i, 'lista'), 'Cada postulación necesita "rol".');
        if (x.estado !== undefined && !ESTADOS.includes(x.estado as EstadoPostulacion)) throw new Falla(L('estado', i, 'lista'), `"estado" tiene que ser ${ESTADOS.join(', ')}.`);
        return { rol: (x.rol as string).trim(), empresa: x.empresa as string | undefined, rango: x.rango as string | undefined, estado: (x.estado as EstadoPostulacion) ?? 'enviada' };
      });
      d.mensajes = opcNum('mensajes', 0, true);
    } else {
      d.horas = opcNum('horas', 0);
      d.operaciones = opcNum('operaciones', 0, true);
      d.ingresos = opcNum('ingresos', 0);
      d.margen = opcNum('margen', -Infinity);
      d.usuarios = opcNum('usuarios', 0, true);
      if ([d.horas, d.operaciones, d.ingresos, d.margen, d.usuarios].every((x) => x === undefined)) throw new Falla(L('tipo'), 'La semana de Handyx necesita al menos uno: horas, operaciones, ingresos, margen o usuarios.');
    }
    return { ok: true, d, detectada };
  } catch (e) {
    if (e instanceof Falla) return { ok: false, error: { linea: e.linea, mensaje: e.message } };
    throw e;
  }
}

/** La actividad de estudio de una sesión: por el nombre del libro o, en matemática, CONAMAT. */
export function actividadDe(d: Importable, study: StudyState) {
  const libro = d.libro?.toLowerCase().trim();
  const porNombre = libro ? study.activities.find((a) => a.title.toLowerCase() === libro || a.title.toLowerCase().includes(libro) || libro.includes(a.title.toLowerCase())) : undefined;
  if (porNombre) return porNombre;
  if (d.rama === 'matematica') return study.activities.find((a) => a.id === 'conamat');
  return undefined;
}

export interface Cambio { color: string; titulo: string; texto: string }

const pct = (c: number, h: number) => Math.round((c / h) * 100);
const lista = (ds: string[]) => (ds.length > 1 ? `${ds.slice(0, -1).join(', ')} y ${ds[ds.length - 1]}` : ds[0] ?? '');

/** "Qué cambia" antes de guardar: lo mismo que va a hacer `aplicarImportacion`. */
export function queCambia(d: Importable, study: StudyState, colores: Record<Rama | 'main' | 'rutina', string>): Cambio[] {
  const c = colores[d.rama];
  const out: Cambio[] = [];
  if (d.tipo === 'sesion') {
    const a = actividadDe(d, study);
    const unit = a?.units?.find((u) => u.n === d.capitulo);
    if (d.test && a && unit) {
      const ok = approves(d.test.correctos, d.test.hechos);
      const ya = unitState(study, a.id, unit.n);
      out.push({ color: c, titulo: `Test del cap. ${unit.n} · ${pct(d.test.correctos, d.test.hechos)} %`, texto: ok ? 'Aprobado: supera el corte de 85 %.' : 'No llega al 85 %: mañana releer lo que falló y pasado el re-test.' });
      if (!ya.approvedOn && !ya.flojo) {
        const ag = ok ? scheduleApproved(a, unit, d.fecha, ya.learnedOn ?? d.fecha) : scheduleFailed(a, unit, d.fecha);
        const tesis = ag.find((r) => r.kind === 'tesis');
        if (tesis) out.push({ color: c, titulo: `Tesis del cap. ${unit.n} · ${fechaCorta(tesis.due)}`, texto: `Entra al repaso de ese día. Después: ${lista(ag.filter((r) => r.kind !== 'tesis').map((r) => fechaCorta(r.due)))}.` });
      }
    } else if (d.test) {
      out.push({ color: colores.rutina, titulo: 'El test no tiene dónde guardarse', texto: `No encontré ${d.libro ? `«${d.libro}»` : 'la actividad'}${d.capitulo ? ` con el cap. ${d.capitulo}` : ''} en Estudio: se guarda el resto.` });
    }
    const tarjetas = (d.tarjetas?.length ?? 0) + (d.errores?.length ?? 0);
    if (tarjetas) out.push({ color: c, titulo: `+${tarjetas} ${tarjetas === 1 ? 'tarjeta' : 'tarjetas'}`, texto: `Entran al repaso desde el ${fechaCorta(addDays(d.fecha, 1))}${d.errores?.length ? ': una por cada error' : ''}.` });
    if (d.tarjetasNuevas) out.push({ color: c, titulo: `${d.tarjetasNuevas} tarjetas para escribir`, texto: 'El JSON trae solo el número: escribilas en Tarjetas (o pedile a Claude "frente" y "dorso").' });
    d.errores?.forEach((e) => out.push({ color: colores.rutina, titulo: `1 punto débil · ${e.tema}`, texto: `Tipo ${e.tipo}${e.nota ? ` (${e.nota})` : ''}. Se suma a Puntos débiles.` }));
    if (d.minutos) out.push({ color: c, titulo: `+${Math.round((d.minutos / 60) * 10) / 10} h de ${d.rama === 'matematica' ? 'matemática' : 'programación'}`, texto: 'Suma al contador de horas de la semana.' });
    if (a && d.capitulo) out.push({ color: colores.main, titulo: `Ruta: ${a.title.split(' · ').pop()} ${d.capitulo} de ${a.units?.length ?? '?'}`, texto: `La rama ${d.rama} avanza y el mapa marca el commit.` });
  } else if (d.tipo === 'revision' || d.tipo === 'examen') {
    const puerta = d.proyecto?.startsWith('W');
    if (d.tipo === 'examen') out.push({ color: c, titulo: `${puerta ? 'Puerta' : 'Examen de'} ${d.proyecto} · ${d.puntaje} %`, texto: puerta ? ((d.puntaje ?? 0) >= 85 ? 'Puerta aprobada: el proyecto siguiente puede arrancar.' : 'No llega al 85 %: el proyecto siguiente sigue esperando y la programación pasa a matemática pura.') : (d.puntaje ?? 0) >= 85 ? 'Examen aprobado: con la entrevista técnica completa, cierra el proyecto.' : 'No llega al 85 %: el proyecto sigue abierto.' });
    if (d.hallazgos?.length) out.push({ color: c, titulo: `${d.hallazgos.length} ${d.hallazgos.length === 1 ? 'hallazgo' : 'hallazgos'} en ${d.proyecto}`, texto: `${d.hallazgos.map((h) => h.tipo).join(', ')}. Van a las revisiones del proyecto y al mapa.` });
  } else if (d.tipo === 'entrevista' || d.tipo === 'simulacro') {
    if (d.puntaje !== undefined) out.push({ color: c, titulo: `${d.tipo === 'entrevista' ? 'Entrevista' : 'Simulacro'} · ${d.puntaje} %`, texto: 'Queda en el mapa de la rama.' });
    if (d.fallas?.length) out.push({ color: c, titulo: `${d.fallas.length} ${d.fallas.length === 1 ? 'falla' : 'fallas'} · ya son tarjetas`, texto: `Van a Puntos débiles de ${d.rama === 'ingles' ? 'inglés' : 'programación'}.` });
    if (d.preguntas?.length) out.push({ color: c, titulo: `${d.preguntas.length} preguntas`, texto: 'Quedan guardadas con la entrevista.' });
  } else if (d.tipo === 'postulaciones') {
    out.push({ color: c, titulo: `+${d.lista!.length} ${d.lista!.length === 1 ? 'postulación' : 'postulaciones'}`, texto: `${d.lista!.slice(0, 3).map((p) => p.rol).join(', ')}${d.lista!.length > 3 ? '…' : ''}. Suman al embudo de la semana.` });
    if (d.mensajes) out.push({ color: c, titulo: `+${d.mensajes} mensajes directos`, texto: 'Suman al contador de la semana.' });
  } else {
    const xs = [d.horas !== undefined && `${d.horas} h`, d.operaciones !== undefined && `${d.operaciones} operaciones`, d.ingresos !== undefined && `USD ${d.ingresos} de ingresos`, d.margen !== undefined && `margen USD ${d.margen}`, d.usuarios !== undefined && `${d.usuarios} usuarios`].filter(Boolean);
    out.push({ color: c, titulo: `Handyx · semana del ${fechaCorta(d.fecha)}`, texto: `${xs.join(' · ')}.` });
  }
  return out;
}

/** El texto del commit en el mapa. */
export function commitDe(d: Importable, study: StudyState) {
  if (d.tipo === 'sesion') { const a = actividadDe(d, study); return a && d.capitulo ? `${a.title.split(' · ').pop()} ${d.capitulo} de ${a.units?.length ?? '?'}` : 'Sesión importada'; }
  if (d.tipo === 'examen') return `Examen de ${d.proyecto}: ${d.puntaje} %`;
  if (d.tipo === 'revision') return `Revisión de ${d.proyecto}: ${d.hallazgos!.length} hallazgos`;
  if (d.tipo === 'postulaciones') return `${d.lista!.length} postulaciones`;
  if (d.tipo === 'semana') return 'Semana de Handyx registrada';
  return `${d.tipo === 'entrevista' ? 'Entrevista' : 'Simulacro'}${d.rol ? `: ${d.rol}` : ''}${d.puntaje !== undefined ? ` · ${d.puntaje} %` : ''}`;
}

export const EJEMPLO = `{
  "tipo": "sesion",
  "rama": "matematica",
  "fecha": "AAAA-MM-DD",
  "libro": "CONAMAT · Aritmética",
  "capitulo": 1,
  "minutos": 0,
  "test": { "hechos": 0, "correctos": 0 },
  "errores": [{ "tema": "…", "tipo": "concepto", "nota": "…" }],
  "tarjetas_nuevas": [{ "frente": "…", "dorso": "…" }]
}`;
