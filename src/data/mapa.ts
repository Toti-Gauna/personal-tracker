/**
 * El mapa en ramas (git log --graph): filas de la más nueva (arriba, T+18) a la más vieja
 * (abajo, T+0), con HEAD en hoy. Salen del plan y de lo registrado.
 */
import { PLAN, entregasDelPlan, eventosDelPlan, fechaHito, finSemana, nombreTramo, tramoActivo, type EventoRama } from './plan';
import type { PlanState } from './plan-state';
import { unitState } from './study';
import type { StudyState } from './study-types';
import { addDays } from './time';
import type { Rama } from './types';
import { hitosFechados, type EstadoHito, type RamaMapa, type TipoHito } from './hitos';
import { RAMA_COLOR } from './ramas';

export type Rango = 'mes' | 'trimestre' | 'todo';

export interface Fila {
  id: string;
  rama: RamaMapa | 'main';
  fecha: string;
  tipo: 'hito' | 'evento' | 'head' | 'gap';
  /** "T+2" para los hitos. */
  hito?: string;
  texto: string;
  /** Entrega a otra rama: se dibuja una curva hacia su columna. */
  a?: Rama;
  futuro: boolean;
  /** Ola 8b · hitos por rama: commit, hito grande (rombo) o hito de main. */
  hitoTipo?: TipoHito;
  hitoId?: string;
  /** La rama que le entrega a esta (flecha). */
  desde?: Rama;
  estado?: EstadoHito;
  propuesta?: string;
  /** Rama en pausa (stand-by) en esa fecha. */
  standby?: boolean;
}

/** Orden de las columnas a la derecha de main (clipping, Ola 8b, entre matemática y Handyx). */
export const COLUMNAS: RamaMapa[] = ['ingles', 'trabajo', 'programacion', 'matematica', 'clipping', 'handyx', 'salud'];

/** Color de una columna del mapa: clipping va con el de Eclipse. */
export const colorMapa = (r: RamaMapa | 'main') => (r === 'clipping' ? 'var(--eclipse)' : RAMA_COLOR[r]);

/** Días de la pestaña Trimestre: 14 semanas (del 16 nov al 21 feb, el cierre de Surco v1). */
const DIAS_TRIMESTRE = 98;

/** El trimestre del plan que contiene una fecha: bloques de 14 semanas desde T0. */
export function trimestreDe(date: string, t0 = PLAN.t0) {
  const d = Math.max(0, Math.round((new Date(date + 'T12:00').getTime() - new Date(t0 + 'T12:00').getTime()) / 864e5));
  const k = Math.floor(d / DIAS_TRIMESTRE);
  return { desde: addDays(t0, k * DIAS_TRIMESTRE), hasta: addDays(t0, (k + 1) * DIAS_TRIMESTRE - 1) };
}

/** Una fila de hito a partir de un hito fechado. */
function filaDeHito(h: ReturnType<typeof hitosFechados>[number], head: string, plan: PlanState): Fila {
  const main = h.tipo === 'main';
  const id = main ? h.texto.split(' · ')[0] : undefined;
  return {
    id: `h-${h.id}`, rama: h.rama, fecha: h.fecha, tipo: main ? 'hito' : 'evento', hito: id, texto: main ? h.texto.split(' · ').slice(1).join(' · ').replace(/^./, (c) => c.toUpperCase()) : h.texto,
    futuro: h.estado !== 'hecho' && h.fecha > head, hitoTipo: h.tipo, hitoId: h.id, desde: h.desde, estado: h.estado, propuesta: h.propuesta,
    standby: h.rama !== 'main' && h.rama !== 'clipping' && (plan.pausas ?? []).some((p) => p.objetivo === h.rama && p.desde <= h.fecha && (!p.hasta || p.hasta > h.fecha)),
  };
}

const DIAS_RANGO: Record<Exclude<Rango, 'todo'>, number> = { mes: 30, trimestre: 91 };

export function filasMapa(date: string, rango: Rango, plan: PlanState, study: StudyState, t0?: string): Fila[] {
  const ini = fechaHito(PLAN.hitos[0], t0);
  const fin = fechaHito(PLAN.hitos[3], t0);
  const hitos = hitosFechados(date, plan.hitos ?? {}, t0);
  // HEAD es hoy, o el último hito marcado como hecho si se adelantó.
  const head = hitos.filter((h) => h.estado === 'hecho' && h.fecha > date).map((h) => h.fecha).sort().pop() ?? date;
  if (rango === 'trimestre') return filasTrimestre(date, head, hitos, plan, t0);
  const desde = rango === 'todo' ? ini : addDays(date, -DIAS_RANGO[rango]);
  const hasta = rango === 'todo' ? fin : addDays(date, DIAS_RANGO[rango]);

  // Eventos: el plan, lo registrado, los tests de CONAMAT aprobados y las entrevistas.
  let ev: (EventoRama & { a?: Rama })[] = eventosDelPlan(t0);
  if (rango === 'todo') {
    ev = ev.filter((e) => e.rama === 'main' || e.id.startsWith('fin-'));
  } else {
    // Las entrevistas ya quedan como evento al guardarlas.
    ev = [...ev, ...plan.eventos];
    const conamat = study.activities.find((a) => a.id === 'conamat');
    for (const u of conamat?.units ?? []) {
      const t = unitState(study, 'conamat', u.n).tests.find((x) => x.approved);
      if (t) ev.push({ id: `test-${u.n}`, rama: 'matematica', fecha: t.date, texto: `Test del cap. ${u.n} aprobado`, origen: 'registro' });
    }
    for (const [i, e] of entregasDelPlan(t0).entries()) ev.push({ id: `entrega-${i}`, rama: e.de, fecha: e.fecha, texto: e.texto, a: e.a, origen: 'plan' });
  }
  // Ola 8b: los hitos por rama del rango (sin repetir lo del plan que cae en la misma rama y fecha).
  const hitosRango = rango === 'todo' ? [] : hitos.filter((h) => h.tipo !== 'main' && h.fecha >= desde && h.fecha <= hasta);
  const ocupado = new Set(hitosRango.map((h) => `${h.rama}|${h.fecha}`));
  // Solo se saca el cierre de tramo del plan (fin-…): las entregas entre ramas quedan.
  ev = ev.filter((e) => !e.id.startsWith('fin-') || !ocupado.has(`${e.rama}|${e.fecha}`));
  const vistos = new Set<string>();
  const filas: Fila[] = ev
    .filter((e) => e.fecha >= desde && e.fecha <= hasta && e.fecha !== ini && e.fecha !== fin)
    .filter((e) => (vistos.has(e.id) ? false : (vistos.add(e.id), true)))
    .map((e) => {
      const h = e.rama === 'main' ? PLAN.hitos.find((x) => `hito-${x.id}` === e.id) : undefined;
      return { id: e.id, rama: e.rama, fecha: e.fecha, tipo: h ? 'hito' : 'evento', hito: h?.id, texto: h ? h.texto : e.texto, a: e.a, futuro: e.fecha > head } as Fila;
    });
  filas.push(...hitosRango.map((h) => filaDeHito(h, head, plan)));

  // HEAD: hoy, con el tramo de programación en curso.
  const t = tramoActivo(date, t0);
  filas.push({ id: 'head', rama: 'programacion', fecha: head, tipo: 'head', texto: t.tipo === 'proyecto' || t.tipo === 'cert' ? `${nombreTramo(t, false)} · semana ${t.semana} de ${t.semanas}` : t.nombre, futuro: false });
  filas.sort((a, b) => b.fecha.localeCompare(a.fecha) || (a.tipo === 'head' ? -1 : b.tipo === 'head' ? 1 : 0));

  // Arriba T+18 y abajo T+0, con el salto si no están en el rango.
  const arriba: Fila[] = [{ id: 'hito-T+18', rama: 'main', fecha: fin, tipo: 'hito', hito: 'T+18', texto: PLAN.hitos[3].texto, futuro: fin > head }];
  const masNueva = filas[0]?.fecha ?? date;
  if (hasta < fin) {
    const semanas = Math.round((new Date(fin).getTime() - new Date(masNueva).getTime()) / (7 * 864e5));
    arriba.push({ id: 'gap-arriba', rama: 'main', fecha: hasta, tipo: 'gap', texto: `${semanas} semanas · 10 proyectos, 3 certificaciones, W1 a W3 y el C1 en el medio`, futuro: true });
  }
  const abajo: Fila[] = [];
  if (desde > ini) abajo.push({ id: 'gap-abajo', rama: 'main', fecha: desde, tipo: 'gap', texto: `${Math.round((new Date(filas[filas.length - 1]?.fecha ?? date).getTime() - new Date(ini).getTime()) / (7 * 864e5))} semanas antes`, futuro: false });
  const pausadas = (plan.pausas ?? []).some((p) => !p.hasta);
  abajo.push({ id: 'hito-T+0', rama: 'main', fecha: ini, tipo: 'hito', hito: 'T+0', texto: pausadas ? 'Arranca: cinco ramas a fondo, Handyx en stand-by' : 'Arranca el plan: seis ramas salen de main', futuro: ini > head });
  return [...arriba, ...filas.map((f) => ({ ...f, standby: f.standby ?? (f.rama !== 'main' && f.rama !== 'clipping' && (plan.pausas ?? []).some((p) => p.objetivo === f.rama && p.desde <= f.fecha && (!p.hasta || p.hasta > f.fecha))) })), ...abajo];
}

/**
 * Pestaña Trimestre (10.4): los hitos de cada rama en el bloque de 13 semanas que contiene la
 * fecha, con T+18 arriba y HEAD en hoy. Los de main (T+0, T+2) van en main.
 */
function filasTrimestre(date: string, head: string, hitos: ReturnType<typeof hitosFechados>, plan: PlanState, t0?: string): Fila[] {
  const fin = fechaHito(PLAN.hitos[3], t0);
  const { desde, hasta } = trimestreDe(date, t0);
  const en = hitos.filter((h) => h.fecha >= desde && h.fecha <= hasta);
  const filas: Fila[] = en.map((h) => filaDeHito(h, head, plan));
  // HEAD: hoy (si cae en el trimestre y no coincide con T+0, va como fila propia).
  const t = tramoActivo(head, t0);
  if (head >= desde && head <= hasta) filas.push({ id: 'head', rama: 'programacion', fecha: head, tipo: 'head', texto: t.tipo === 'proyecto' || t.tipo === 'cert' ? `${nombreTramo(t, false)} · semana ${t.semana} de ${t.semanas}` : t.nombre, futuro: false });
  // Mismo día: HEAD arriba y main abajo de todo (T+0 es de donde salen las ramas).
  const peso = (f: Fila) => (f.tipo === 'head' ? -1 : f.rama === 'main' ? 1 : 0);
  filas.sort((a, b) => b.fecha.localeCompare(a.fecha) || peso(a) - peso(b));
  const masNueva = filas[0]?.fecha ?? hasta;
  const semanas = Math.round((new Date(fin).getTime() - new Date(masNueva).getTime()) / (7 * 864e5));
  // Antes de T0 HEAD queda abajo, en T+0 ("mañana").
  return [
    { id: 'hito-T+18', rama: 'main', fecha: fin, tipo: 'hito', hito: 'T+18', texto: PLAN.hitos[3].texto, futuro: true },
    { id: 'gap-arriba', rama: 'main', fecha: hasta, tipo: 'gap', texto: `${semanas} semanas · P4 a P10, 3 certificaciones y el C1`, futuro: true },
    ...filas,
  ];
}

export const fechaFin = (t0?: string) => finSemana(PLAN.semanas, t0);
