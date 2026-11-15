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

export type Rango = 'mes' | 'trimestre' | 'todo';

export interface Fila {
  id: string;
  rama: Rama | 'main';
  fecha: string;
  tipo: 'hito' | 'evento' | 'head' | 'gap';
  /** "T+2" para los hitos. */
  hito?: string;
  texto: string;
  /** Entrega a otra rama: se dibuja una curva hacia su columna. */
  a?: Rama;
  futuro: boolean;
}

/** Orden de las columnas a la derecha de main. */
export const COLUMNAS: Rama[] = ['ingles', 'trabajo', 'programacion', 'matematica', 'handyx', 'salud'];

const DIAS_RANGO: Record<Exclude<Rango, 'todo'>, number> = { mes: 30, trimestre: 91 };

export function filasMapa(date: string, rango: Rango, plan: PlanState, study: StudyState, t0?: string): Fila[] {
  const ini = fechaHito(PLAN.hitos[0], t0);
  const fin = fechaHito(PLAN.hitos[3], t0);
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
  const vistos = new Set<string>();
  const filas: Fila[] = ev
    .filter((e) => e.fecha >= desde && e.fecha <= hasta && e.fecha !== ini && e.fecha !== fin)
    .filter((e) => (vistos.has(e.id) ? false : (vistos.add(e.id), true)))
    .map((e) => {
      const h = e.rama === 'main' ? PLAN.hitos.find((x) => `hito-${x.id}` === e.id) : undefined;
      return { id: e.id, rama: e.rama, fecha: e.fecha, tipo: h ? 'hito' : 'evento', hito: h?.id, texto: h ? h.texto : e.texto, a: e.a, futuro: e.fecha > date } as Fila;
    });

  // HEAD: hoy, con el tramo de programación en curso.
  const t = tramoActivo(date, t0);
  filas.push({ id: 'head', rama: 'programacion', fecha: date, tipo: 'head', texto: t.tipo === 'proyecto' || t.tipo === 'cert' ? `${nombreTramo(t, false)} · semana ${t.semana} de ${t.semanas}` : t.nombre, futuro: false });
  filas.sort((a, b) => b.fecha.localeCompare(a.fecha) || (a.tipo === 'head' ? -1 : b.tipo === 'head' ? 1 : 0));

  // Arriba T+18 y abajo T+0, con el salto si no están en el rango.
  const arriba: Fila[] = [{ id: 'hito-T+18', rama: 'main', fecha: fin, tipo: 'hito', hito: 'T+18', texto: PLAN.hitos[3].texto, futuro: fin > date }];
  const masNueva = filas[0]?.fecha ?? date;
  if (hasta < fin) {
    const semanas = Math.round((new Date(fin).getTime() - new Date(masNueva).getTime()) / (7 * 864e5));
    arriba.push({ id: 'gap-arriba', rama: 'main', fecha: hasta, tipo: 'gap', texto: `${semanas} semanas · 10 proyectos, 3 certificaciones, W1 a W3 y el C1 en el medio`, futuro: true });
  }
  const abajo: Fila[] = [];
  if (desde > ini) abajo.push({ id: 'gap-abajo', rama: 'main', fecha: desde, tipo: 'gap', texto: `${Math.round((new Date(filas[filas.length - 1]?.fecha ?? date).getTime() - new Date(ini).getTime()) / (7 * 864e5))} semanas antes`, futuro: false });
  abajo.push({ id: 'hito-T+0', rama: 'main', fecha: ini, tipo: 'hito', hito: 'T+0', texto: 'Arranca el plan: seis ramas salen de main', futuro: ini > date });
  return [...arriba, ...filas, ...abajo];
}

export const fechaFin = (t0?: string) => finSemana(PLAN.semanas, t0);
