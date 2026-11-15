/** Acciones del plan T+18 sobre el estado: contadores, respuestas, Handyx, eventos y más. */
import { PLAN, semanaDelPlan, type Capa, type Entrevista, type EventoRama, type MetaGenerada, type Postulacion } from '../data/plan';
import { proyectoVacio, type HandyxSemana, type Importacion, type PlanSettings, type PlanState, type TipoError } from '../data/plan-state';
import { newId } from '../data/schedule';
import { addDays, parseDate } from '../data/time';
import type { Rama } from '../data/types';
import { getState, setState } from './store';
import { addCards } from './study';
import { aplicarIntensiva, quitarIntensiva } from '../data/busqueda';

/** Lunes de la semana de una fecha. */
export const lunesDe = (date: string) => addDays(date, -((parseDate(date).getDay() + 6) % 7));

function update(fn: (p: PlanState) => PlanState) {
  setState((s) => ({ ...s, plan: fn(s.plan) }));
}

function evento(p: PlanState, rama: Rama, fecha: string, texto: string): PlanState {
  const e: EventoRama = { id: `e${newId()}`, rama, fecha, texto, origen: 'registro' };
  return { ...p, eventos: [...p.eventos, e] };
}

/** Suma a un contador de la semana (postulaciones, mensajes, posts, horas…). */
export function sumarContador(date: string, id: string, n = 1) {
  const l = lunesDe(date);
  update((p) => ({ ...p, contadores: { ...p.contadores, [l]: { ...(p.contadores[l] ?? {}), [id]: Math.max(0, (p.contadores[l]?.[id] ?? 0) + n) } } }));
}

export const contador = (p: PlanState, date: string, id: string) => p.contadores[lunesDe(date)]?.[id] ?? 0;

/** Suma de un contador entre dos fechas (por semanas). */
export function contadorEntre(p: PlanState, id: string, desde: string, hasta: string) {
  return Object.entries(p.contadores).filter(([l]) => l >= lunesDe(desde) && l <= hasta).reduce((s, [, c]) => s + (c[id] ?? 0), 0);
}

/** +1 respuesta ensayada: la que menos veces ensayaste (o una en particular). */
export function ensayarRespuesta(date: string, id?: string) {
  update((p) => {
    const objetivo = id ?? [...p.respuestas].sort((a, b) => a.veces - b.veces)[0]?.id;
    return { ...p, respuestas: p.respuestas.map((r) => (r.id === objetivo ? { ...r, veces: r.veces + 1 } : r)) };
  });
  sumarContador(date, 'respuestas');
}

/** Números de Handyx de la semana. */
export function sumarHandyx(date: string, patch: Partial<Record<keyof HandyxSemana, number>>, sumar = true) {
  const l = lunesDe(date);
  update((p) => {
    const cur = p.handyx[l] ?? {};
    const next = { ...cur };
    for (const [k, v] of Object.entries(patch) as [keyof HandyxSemana, number][]) next[k] = sumar ? (cur[k] ?? 0) + v : v;
    return { ...p, handyx: { ...p.handyx, [l]: next } };
  });
}

export function guardarEntrevista(e: Omit<Entrevista, 'id' | 'prep'> & { id?: string; prep?: Entrevista['prep'] }) {
  update((p) => {
    const id = e.id ?? `i${newId()}`;
    const nueva = { prep: {}, ...e, id } as Entrevista;
    const otras = p.entrevistas.filter((x) => x.id !== id);
    return evento({ ...p, entrevistas: [...otras, nueva] }, 'trabajo', e.fecha, `Entrevista: ${e.rol}`);
  });
}

export function marcarPrep(id: string, clave: string) {
  update((p) => ({ ...p, entrevistas: p.entrevistas.map((e) => (e.id === id ? { ...e, prep: { ...e.prep, [clave]: !e.prep[clave] } } : e)) }));
}

export function nuevaPostulacion(date: string, x: Omit<Postulacion, 'id' | 'fecha' | 'estado'> & { estado?: Postulacion['estado'] }) {
  update((p) => ({ ...p, postulaciones: [...p.postulaciones, { id: `p${newId()}`, fecha: date, estado: 'enviada', ...x }] }));
  sumarContador(date, 'postulaciones');
}

export function estadoPostulacion(id: string, estado: Postulacion['estado']) {
  update((p) => ({ ...p, postulaciones: p.postulaciones.map((x) => (x.id === id ? { ...x, estado } : x)) }));
}

export function marcarCapa(proyecto: string, capa: Capa) {
  update((p) => {
    const cur = p.proyectos[proyecto] ?? proyectoVacio();
    return { ...p, proyectos: { ...p.proyectos, [proyecto]: { ...cur, estandar: { ...cur.estandar, [capa]: !cur.estandar[capa] } } } };
  });
}

export function sumarTiempo(proyecto: string, cat: 'nucleo' | 'producto' | 'lanzamiento', min: number) {
  update((p) => {
    const cur = p.proyectos[proyecto] ?? proyectoVacio();
    return { ...p, proyectos: { ...p.proyectos, [proyecto]: { ...cur, tiempo: { ...cur.tiempo, [cat]: Math.max(0, cur.tiempo[cat] + min) } } } };
  });
}

export function sumarRevision(proyecto: string, fecha: string, texto: string, tipo: TipoError) {
  update((p) => {
    const cur = p.proyectos[proyecto] ?? proyectoVacio();
    return evento({ ...p, proyectos: { ...p.proyectos, [proyecto]: { ...cur, revisiones: [...cur.revisiones, { fecha, texto, tipo }] } } }, 'programacion', fecha, `Revisión: ${texto}`);
  });
}

/** Examen de programación de un proyecto o certificación (85 % o más lo cierra). */
export function guardarExamen(proyecto: string, fecha: string, puntaje: number) {
  update((p) => {
    const cur = p.proyectos[proyecto] ?? proyectoVacio();
    return evento({ ...p, proyectos: { ...p.proyectos, [proyecto]: { ...cur, examen: { fecha, puntaje } } } }, 'programacion', fecha, `Examen de ${proyecto}: ${puntaje} %`);
  });
}

export function registrarEvento(rama: Rama, fecha: string, texto: string) {
  update((p) => evento(p, rama, fecha, texto));
}

export function sumarFallaIngles(fecha: string, texto: string, tipo: string) {
  update((p) => ({ ...p, fallasIngles: [...p.fallasIngles, { fecha, texto, tipo }] }));
  // Lo que falló ya es tarjeta: entra al mismo motor de repaso que matemática.
  addCards(fecha, [{ front: `Decilo bien en voz alta: ${texto}`, back: `Falló en ${tipo}. Grabate y comparalo.`, kind: 'explicar', deck: 'Inglés', frontId: 'ingles', source: 'entrevista' }]);
}

/** Lo que falló en una entrevista: queda en la entrevista y va a Puntos débiles de inglés o de programación. */
export function fallaEntrevista(id: string, fecha: string, texto: string, rama: 'ingles' | 'programacion', tipo: string) {
  update((p) => ({ ...p, entrevistas: p.entrevistas.map((e) => (e.id === id ? { ...e, fallas: [...(e.fallas ?? []), texto] } : e)) }));
  if (rama === 'ingles') sumarFallaIngles(fecha, texto, tipo);
  else addCards(fecha, [{ front: `Pregunta de entrevista: ${texto}`, back: 'Respondela completa, con un ejemplo de tus proyectos.', kind: 'explicar', deck: 'Programación', frontId: 'prog', source: 'entrevista' }]);
}

export function guardarImportacion(i: Importacion) {
  update((p) => evento({ ...p, importaciones: [...p.importaciones, i] }, i.rama, i.fecha, i.resumen[i.resumen.length - 1] ?? `Importado: ${i.tipo}`));
}

/** Metas de mes o semana: confirmar las generadas, cambiar o borrar una, sumar una propia. */
export function confirmarMetas(tipo: 'meses' | 'semanas', clave: string, metas: MetaGenerada[], hoy: string) {
  update((p) => ({ ...p, [tipo]: { ...p[tipo], [clave]: { confirmado: hoy, metas } } }));
}

/**
 * Cambia o borra una meta de mes o semana. Si el período todavía no se guardó, se guarda primero
 * con las generadas (`base`), así lo que cambiaste no se pierde cuando el plan se recalcula.
 */
export function editarMeta(tipo: 'meses' | 'semanas', clave: string, id: string, patch: Partial<MetaGenerada> | null, base: MetaGenerada[] = []) {
  update((p) => {
    const cur = p[tipo][clave] ?? { metas: base };
    const metas = patch === null ? cur.metas.filter((m) => m.id !== id) : cur.metas.map((m) => (m.id === id ? { ...m, ...patch } : m));
    return { ...p, [tipo]: { ...p[tipo], [clave]: { ...cur, metas } } };
  });
}

/** Suma a mano a una meta de mes o semana sin contador propio (o la marca si es una tarea). */
export function sumarHechoMeta(tipo: 'meses' | 'semanas', clave: string, m: MetaGenerada, n: number, base: MetaGenerada[] = []) {
  editarMeta(tipo, clave, m.id, { hecho: Math.max(0, (m.hecho ?? 0) + n) }, base);
}

export function sumarMetaPropia(tipo: 'meses' | 'semanas', clave: string, meta: Omit<MetaGenerada, 'id' | 'origen'>) {
  update((p) => {
    const cur = p[tipo][clave] ?? { metas: [] };
    return { ...p, [tipo]: { ...p[tipo], [clave]: { ...cur, metas: [...cur.metas, { ...meta, id: `m${newId()}`, origen: 'propia' as const }] } } };
  });
}

/** Metas de bimestre y año: el texto del plan o el que escribiste. */
export function editarMetaFija(clave: string, texto: string) {
  update((p) => {
    const editadas = { ...p.editadas };
    if (texto.trim()) editadas[clave] = texto.trim();
    else delete editadas[clave];
    return { ...p, editadas };
  });
}

/** Cambia T0 (inicio del plan): todas las fechas del plan se recalculan desde ahí. */
export function setInicioPlan(fecha: string) {
  setState((s) => (s.settings && /^\d{4}-\d{2}-\d{2}$/.test(fecha) ? { ...s, settings: { ...s.settings, startDate: fecha } } : s));
}

/** Ajustes del plan. */
export function setPlanSettings(patch: Partial<PlanSettings>) {
  setState((s) => (s.settings ? { ...s, settings: { ...s.settings, plan: { ...(s.settings.plan ?? {}), ...patch } } } : s));
}

export const semanaDe = (date: string) => semanaDelPlan(date, getState().settings?.startDate);
export const _plan = PLAN;

/** Activa la búsqueda intensiva desde hoy (Ajustes). */
export function activarIntensiva(hoy: string) {
  setState((s) => (s.settings ? { ...s, ...aplicarIntensiva(s.settings, s.plan, hoy) } : s));
}

/** Desactiva la búsqueda intensiva: vuelve a la rutina anterior y cierra sus pausas. Nada se borra. */
export function desactivarIntensiva(hoy: string) {
  setState((s) => (s.settings ? { ...s, ...quitarIntensiva(s.settings, s.plan, hoy) } : s));
}

/** Retomar una rama o área en pausa: cierra esa pausa y vuelve a la rutina anterior. */
export function retomar(objetivo: string, hoy: string) {
  setState((s) => (s.settings ? { ...s, ...quitarIntensiva(s.settings, s.plan, hoy, objetivo) } : s));
}

/** Marcar un hito como hecho (o deshacerlo) y moverle la fecha. */
export function marcarHito(id: string, hoy: string | null) {
  update((p) => ({ ...p, hitos: { ...p.hitos, [id]: { ...(p.hitos[id] ?? {}), hecho: hoy ?? undefined } } }));
}
export function moverHito(id: string, fecha: string) {
  update((p) => ({ ...p, hitos: { ...p.hitos, [id]: { ...(p.hitos[id] ?? {}), fecha } } }));
}
