/** Acciones del plan T+18 sobre el estado: contadores, respuestas, Handyx, eventos y más. */
import { PLAN, semanaDelPlan, type Capa, type Entrevista, type EventoRama, type MetaGenerada, type Postulacion } from '../data/plan';
import { proyectoVacio, type Evidencia, type HandyxSemana, type Importacion, type PlanSettings, type PlanState, type RegistroSpot, type TipoError } from '../data/plan-state';
import { newId } from '../data/schedule';
import type { Vacante } from '../data/demanda';
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

/** Tilda o destilda una de las tres pruebas de evidencia de un proyecto. */
export function toggleEvidencia(proyecto: string, k: Evidencia) {
  update((p) => {
    const cur = p.proyectos[proyecto] ?? proyectoVacio();
    return { ...p, proyectos: { ...p.proyectos, [proyecto]: { ...cur, evidencia: { ...cur.evidencia, [k]: !cur.evidencia?.[k] } } } };
  });
}

/** Ola 20 · tilda o destilda un criterio del nivel de salida de una ventana (W1 → índice). */
export function tildarSalida(ventana: string, i: number) {
  update((p) => {
    const cur = new Set(p.salida?.[ventana] ?? []);
    if (cur.has(i)) cur.delete(i);
    else cur.add(i);
    return { ...p, salida: { ...(p.salida ?? {}), [ventana]: [...cur].sort((a, b) => a - b) } };
  });
}

export type TipoExtra = 'feature' | 'plataforma' | 'arquitectura';

/** Prende o apaga las semanas extra (feature, plataforma o arquitectura) de un proyecto; el calendario se recalcula. */
export function setExtraBloque(id: string, prendido: boolean, tipo: TipoExtra = 'feature') {
  const clave = tipo === 'feature' ? id : `${id}:${tipo}`;
  update((p) => {
    const set = new Set(p.extrasApagados ?? []);
    if (prendido) set.delete(clave);
    else set.add(clave);
    return { ...p, extrasApagados: [...set].sort() };
  });
}

/** Apaga varios extras de una vez (las sugerencias de la calibración). */
export function apagarExtras(claves: string[]) {
  update((p) => ({ ...p, extrasApagados: [...new Set([...(p.extrasApagados ?? []), ...claves])].sort() }));
}

/** Ola 24: prende o apaga un tipo de extra en todos los proyectos que lo tienen (plataformas o arquitectura). */
export function setTodosExtra(tipo: Exclude<TipoExtra, 'feature'>, prendido: boolean, ids: string[]) {
  update((p) => {
    const set = new Set(p.extrasApagados ?? []);
    for (const id of ids) {
      if (prendido) set.delete(`${id}:${tipo}`);
      else set.add(`${id}:${tipo}`);
    }
    return { ...p, extrasApagados: [...set].sort() };
  });
}

/** Ola 24: prende o apaga la pausa de fin de año automática. */
export function setPausaFinDeAnio(prendida: boolean) {
  update((p) => ({ ...p, pausaFinDeAnio: prendida }));
}

/** Ola 24: la versión de examen elegida para una certificación ("" la borra). */
export function setVersionCert(cert: string, version: string) {
  update((p) => {
    const v = { ...(p.versionCert ?? {}) };
    if (version) v[cert] = version;
    else delete v[cert];
    return { ...p, versionCert: v };
  });
}

/** Ola 26: suma vacantes a la tabla de demanda. Devuelve los ids (para deshacer). */
export function cargarVacantes(nuevas: Omit<Vacante, 'id'>[]): string[] {
  const ids = nuevas.map(() => `v${newId()}`);
  update((p) => ({ ...p, vacantes: [...(p.vacantes ?? []), ...nuevas.map((v, i) => ({ ...v, id: ids[i] }))] }));
  return ids;
}

export function borrarVacantes(ids: string[]) {
  update((p) => ({ ...p, vacantes: (p.vacantes ?? []).filter((v) => !ids.includes(v.id)) }));
}

/** Vuelve a poner vacantes borradas (el "Deshacer" del aviso). */
export function restaurarVacantes(v: Vacante[]) {
  update((p) => ({ ...p, vacantes: [...(p.vacantes ?? []).filter((x) => !v.some((y) => y.id === x.id)), ...v] }));
}

/** Ola 24: tilda o destilda un entregable de arquitectura de un proyecto. */
export function toggleArquitectura(proyecto: string, k: 'contrato' | 'trazas' | 'mtls' | 'adr') {
  update((p) => {
    const cur = p.arquitectura?.[proyecto] ?? {};
    return { ...p, arquitectura: { ...(p.arquitectura ?? {}), [proyecto]: { ...cur, [k]: !cur[k] } } };
  });
}

/** Ola 30 · tilda un entregable de una versión (notas, video o README). */
export function toggleEntregableVersion(proyecto: string, version: string, k: 'notas' | 'video' | 'readme') {
  update((p) => {
    const cur = p.versiones?.[proyecto]?.[version] ?? {};
    return { ...p, versiones: { ...(p.versiones ?? {}), [proyecto]: { ...(p.versiones?.[proyecto] ?? {}), [version]: { ...cur, [k]: !cur[k] } } } };
  });
}

/** Ola 30 · marca una versión como publicada en una fecha (o la desmarca con `null`). */
export function publicarVersion(proyecto: string, version: string, fecha: string | null) {
  update((p) => {
    const cur = { ...(p.versiones?.[proyecto]?.[version] ?? {}) };
    if (fecha) cur.publicada = fecha;
    else delete cur.publicada;
    return { ...p, versiones: { ...(p.versiones ?? {}), [proyecto]: { ...(p.versiones?.[proyecto] ?? {}), [version]: cur } } };
  });
}

/** Ola 31 · registra (o actualiza) un algorithm spot plantado. `null` lo borra. */
export function registrarSpot(tema: string, r: RegistroSpot | null) {
  update((p) => {
    const algoritmos = { ...(p.algoritmos ?? {}) };
    if (r) algoritmos[tema] = r;
    else delete algoritmos[tema];
    return { ...p, algoritmos };
  });
}

/** Ola 31 · suma un tema propio (el roadmap dice 20 y la tabla trae 16). */
export function agregarTemaAlgoritmo(t: { tema: string; proyectos: string[]; modo: 'con-ia' | 'sin-ia' }) {
  update((p) => ({ ...p, temasPropios: [...(p.temasPropios ?? []), { ...t, id: `propio-${newId()}` }] }));
}

export function borrarTemaAlgoritmo(id: string) {
  update((p) => {
    const { [id]: _, ...algoritmos } = p.algoritmos ?? {};
    return { ...p, temasPropios: (p.temasPropios ?? []).filter((t) => t.id !== id), algoritmos };
  });
}

/** Ola 31 · arranca un sprint sin IA (14 días desde `fecha`) o corta el que está en curso. */
export function iniciarSprintSinIA(fecha: string) {
  update((p) => ({ ...p, sprintsSinIA: [...(p.sprintsSinIA ?? []), { inicio: fecha }] }));
}
export function cortarSprintSinIA(fecha: string) {
  update((p) => {
    const xs = [...(p.sprintsSinIA ?? [])];
    const i = xs.length - 1;
    if (i < 0) return p;
    // Si arrancó hoy, se borra; si no, termina ayer.
    if (xs[i].inicio >= fecha) xs.pop();
    else xs[i] = { ...xs[i], cortado: addDays(fecha, -1) };
    return { ...p, sprintsSinIA: xs };
  });
}

/** Ola 31 · suma (o resta) problemas sin IA resueltos en un día. */
export function sumarProblemas(fecha: string, n: number) {
  update((p) => {
    const v = Math.max(0, (p.problemasSinIA?.[fecha] ?? 0) + n);
    const { [fecha]: _, ...resto } = p.problemasSinIA ?? {};
    return { ...p, problemasSinIA: v ? { ...resto, [fecha]: v } : resto };
  });
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

/** Sprint de búsqueda: cambiar una meta del embudo (son supuestos) o marcar CV, LinkedIn y caso. */
export function setMetaEmbudo(id: string, n: number) {
  update((p) => ({ ...p, sprint: { ...(p.sprint ?? {}), metas: { ...(p.sprint?.metas ?? {}), [id]: n } } }));
}
export function toggleSprintCheck(id: string) {
  update((p) => ({ ...p, sprint: { ...(p.sprint ?? {}), checks: { ...(p.sprint?.checks ?? {}), [id]: !p.sprint?.checks?.[id] } } }));
}

/** Entrevista técnica del proyecto: documento de diseño, ejercicios con tests y defensa. */
export function setTecnica(proyecto: string, patch: { diseno?: boolean; ejercicios?: number; defensa?: string | null }) {
  update((p) => {
    const cur = p.proyectos[proyecto] ?? proyectoVacio();
    const t = { ...(cur.tecnica ?? {}), ...patch };
    if (patch.defensa === null) delete t.defensa;
    return { ...p, proyectos: { ...p.proyectos, [proyecto]: { ...cur, tecnica: t as NonNullable<typeof cur.tecnica> } } };
  });
}

/** MCP publicado o agente con trazas de un proyecto. */
export function toggleAgentico(proyecto: string, k: 'mcp' | 'agente') {
  update((p) => {
    const cur = p.proyectos[proyecto] ?? proyectoVacio();
    return { ...p, proyectos: { ...p.proyectos, [proyecto]: { ...cur, [k]: !cur[k] } } };
  });
}

/** Meta "Mapa de proyectos del portfolio": marcar un paso. */
export function togglePasoMapa(id: string) {
  update((p) => ({ ...p, mapaPortfolio: { ...(p.mapaPortfolio ?? {}), [id]: !p.mapaPortfolio?.[id] } }));
}

/** Revisión de mercado: ofertas cargadas, % por proyecto movible y el día en que se decidió el orden. */
export function setMercado(patch: { ofertas?: number; pct?: Record<string, number>; decidido?: string | null }) {
  update((p) => {
    const cur = p.mercado ?? {};
    const next = { ...cur, ...patch, pct: { ...(cur.pct ?? {}), ...(patch.pct ?? {}) } };
    if (patch.decidido === null) delete next.decidido;
    return { ...p, mercado: next as NonNullable<typeof p.mercado> };
  });
}
