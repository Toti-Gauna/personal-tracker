/**
 * Avisos entre ramas: lo que pasa en una rama y cambia lo que toca en otra. Puro: recibe la
 * fecha, el plan registrado y los ajustes, y devuelve los avisos en el orden en que importan.
 */
import { PLAN, finSemana, inicioSemana, nombreTramo, tramoActivo, ventanaW, type Capa } from './plan';
import type { PlanSettings, PlanState } from './plan-state';
import { RAMA_NOMBRE } from './ramas';
import { addDays, fmtFecha, parseDate } from './time';
import type { Rama, RamaOMain } from './types';

export interface Aviso {
  id: string;
  de: RamaOMain;
  a: RamaOMain;
  titulo: string;
  texto: string;
  href?: string;
  /** Para avisos que piden confirmar algo (pasar a la rutina con trabajo). */
  accion?: 'con-trabajo';
}

const dias = (a: string, b: string) => Math.round((parseDate(b).getTime() - parseDate(a).getTime()) / 864e5);
/** "el jueves 17". */
export const elDia = (d: string) => `el ${fmtFecha(d).split(' ').slice(0, 2).join(' ').toLowerCase()}`;
const lista = (xs: string[]) => (xs.length > 1 ? `${xs.slice(0, -1).join(', ')} y ${xs[xs.length - 1]}` : xs[0] ?? '');

/** Lo que falta del estándar de entrega, con el nombre en minúscula ("el tráiler y la landing" se resume en las capas). */
export function capasFaltantes(p: PlanState, proyectoId: string): { id: Capa; nombre: string }[] {
  const est = p.proyectos[proyectoId]?.estandar ?? {};
  return PLAN.programacion.estandar.filter((c) => !est[c.id]).map((c) => ({ id: c.id, nombre: c.nombre }));
}

export function avisosEntreRamas(date: string, p: PlanState, cfg: PlanSettings, t0?: string): Aviso[] {
  const out: Aviso[] = [];
  // Entrevista a 3 días o menos: la búsqueda se parte y el inglés pasa a modo entrevista.
  const ent = p.entrevistas.filter((e) => e.fecha >= date && e.fecha <= addDays(date, 3)).sort((a, b) => a.fecha.localeCompare(b.fecha))[0];
  if (ent) {
    out.push({
      id: `ent-${ent.id}`, de: 'trabajo', a: 'ingles',
      titulo: `Entrevista ${ent.fecha === date ? 'hoy' : elDia(ent.fecha)}${ent.hora ? ` a las ${ent.hora}` : ''}`,
      texto: 'El bloque de búsqueda se parte: 45 min de postulaciones y 45 de respuestas en voz alta.',
      href: '#/metas/ingles',
    });
  }
  // Proyecto que cierra en 14 días o menos con el estándar sin completar.
  const t = tramoActivo(date, t0);
  if (t.tipo === 'proyecto' && t.id !== 'P0' && dias(date, t.fin) <= 14 && dias(date, t.fin) >= 0) {
    const falta = capasFaltantes(p, t.id);
    if (falta.length) {
      out.push({
        id: `entrega-${t.id}`, de: 'programacion', a: 'trabajo',
        titulo: `${nombreTramo(t, false)} se entrega ${elDia(t.fin)}`,
        texto: `Falta${falta.length > 1 ? 'n' : ''}: ${lista(falta.map((c) => c.nombre.toLowerCase()))}.${ent ? ' Lo usás como demo en la entrevista.' : ' Entra al portfolio.'}`,
        href: `#/metas/proyecto/${t.id}`,
      });
    }
  }
  // Ventana W que empieza en 7 días o menos.
  const w = ventanaW(date, t0);
  if (w.prox && w.diasHastaProx != null && w.diasHastaProx <= 7) {
    const sem = w.prox.hasta - w.prox.desde + 1;
    out.push({
      id: `w-${w.prox.id}`, de: 'matematica', a: 'programacion',
      titulo: `La ventana ${w.prox.id} empieza ${elDia(inicioSemana(w.prox.desde, t0))}`,
      texto: `${sem === 2 ? 'Dos' : sem === 3 ? 'Tres' : sem} semanas de ${w.prox.que.toLowerCase()}: los bloques de programación pasan a matemática hasta ${elDia(finSemana(w.prox.hasta, t0))}.`,
      href: '#/metas',
    });
  }
  // T+2 marcado y todavía con la rutina de búsqueda: pide pasar a la rutina con trabajo.
  if (cfg.t2 && cfg.rutina === 'busqueda') {
    out.push({
      id: 't2', de: 'trabajo', a: 'main',
      titulo: 'T+2: trabajo nuevo',
      texto: 'Desde ahora, la rutina con trabajo: matemática 2 h temprano, programación 1 h, inglés 45 min y Handyx 1 h 30.',
      accion: 'con-trabajo',
    });
  }
  return out;
}

export const nombreRama = (r: Rama | 'main') => RAMA_NOMBRE[r];
