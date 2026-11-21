/**
 * Ola 30 · los proyectos por dentro según el roadmap v7: la ficha ampliada (puesto, qué hace, problema, valor, diferencial,
 * herramientas con ★, capa física, qué se mide, notificaciones, voz, escala, operación, stack por ambiente, algorithm spots,
 * hardware, por qué hace ruido y entrevistas), las versiones 1.0 a 3.0 con su alcance y sus horas, la preparación de las
 * certificaciones y el contenido de las ventanas. Fuente: data/proyectos-v7.json, que arma scripts/roadmap-v7.mjs desde el roadmap.
 *
 * Las fechas de las versiones del roadmap son estimaciones: `versionesFechadas` las recalcula sobre el calendario vivo, repartiendo
 * las horas de cada versión día por día desde el inicio del bloque (como el resto del plan). Puro, salvo la capacidad que recibe.
 */
import raw from '../../data/proyectos-v7.json';
import { PLAN_EXT } from './plan-extendido';
import type { EstadoVersion, PlanState } from './plan-state';
import { addDays, daysBetween } from './time';

export interface ItemV7 { nombre: string; estrella?: boolean; extra?: boolean }

export interface VersionV7 {
  id: string;
  nombre: string;
  /** Fechas que estima el roadmap. */
  inicio?: string;
  fin?: string;
  /** La v1 de Constelación: la arman los agentes, sin fecha. */
  enCurso?: boolean;
  horas?: number;
  /** Horas repartidas por días (solo PetrIA tiene horas medidas por versión). */
  derivadas?: boolean;
  alcance: string[];
}

export interface FichaV7 {
  puesto: string;
  queHace?: string[];
  problema?: string;
  valor?: string;
  diferencial?: string[];
  herramientas?: ItemV7[];
  capaFisica?: ItemV7[];
  medir?: { tipo: 'ahorro' | 'impacto'; items: string[] };
  notificaciones?: { nota?: string; items: ItemV7[] };
  voz?: ItemV7[];
  escala?: string;
  operacion?: string;
  stack?: { nota?: string; ambientes: { ambiente: string; texto: string }[] };
  spots?: string[];
  hardware?: string;
  ruido?: string;
  entrevistas?: string;
  versiones: VersionV7[];
}

export interface ProyectosV7 {
  version: 1;
  fuente: string;
  versionesBase: string[];
  reglas: string[];
  estandar: { n: number; texto: string; detalle?: string[] }[];
  proyectos: Record<string, FichaV7>;
  certs: Record<string, { preparacion?: string; requisito?: string }>;
  ventanas: Record<string, { contenido?: string }>;
}

export const PROY_V7 = raw as unknown as ProyectosV7;
{
  const problemas = validarV7(PROY_V7, PLAN_EXT.bloques);
  if (problemas.length) console.error('data/proyectos-v7.json tiene problemas:\n' + problemas.join('\n'));
}
export const fichaV7 = (id: string): FichaV7 | undefined => PROY_V7.proyectos[id];

/** Revisa el JSON: cada proyecto con puesto y versiones; versiones en orden, sin solaparse y dentro de las fechas del roadmap del bloque. */
export function validarV7(doc: ProyectosV7, bloques: { id: string; tipo: string; horas?: number; roadmap?: { inicio: string; fin: string } }[]): string[] {
  const err: string[] = [];
  if (doc.estandar.length !== 12) err.push(`el estándar tiene ${doc.estandar.length} puntos y son 12`);
  for (const b of bloques.filter((x) => x.tipo === 'proyecto')) {
    const p = doc.proyectos[b.id];
    if (!p) { err.push(`${b.id}: sin ficha v7`); continue; }
    if (!p.puesto) err.push(`${b.id}: sin puesto`);
    if (!p.versiones.length) err.push(`${b.id}: sin versiones`);
    let previo = '';
    for (const v of p.versiones) {
      if (v.enCurso) continue;
      if (!v.inicio || !v.fin) { err.push(`${b.id} ${v.id}: sin fechas`); continue; }
      if (v.fin < v.inicio) err.push(`${b.id} ${v.id}: termina antes de empezar`);
      if (previo && v.inicio <= previo) err.push(`${b.id} ${v.id}: se solapa con la versión anterior`);
      if (b.roadmap && (v.inicio < b.roadmap.inicio || v.fin > b.roadmap.fin)) err.push(`${b.id} ${v.id}: cae fuera de las fechas del bloque (${b.roadmap.inicio} a ${b.roadmap.fin})`);
      previo = v.fin;
    }
    const conHoras = p.versiones.filter((v) => v.horas != null);
    const suma = conHoras.reduce((s, v) => s + v.horas!, 0);
    if (b.horas && conHoras.length && suma !== b.horas) err.push(`${b.id}: las versiones suman ${suma} h y el bloque tiene ${b.horas}`);
  }
  return err;
}

export interface VersionFechada extends VersionV7 {
  /** Fechas que calcula Trazo sobre el calendario vivo (con las horas del bloque). */
  inicioTrazo?: string;
  finTrazo?: string;
  /** Días de diferencia del fin contra el roadmap (negativo: antes). */
  delta?: number;
  estado: 'publicada' | 'en-curso' | 'proxima' | 'atrasada';
  registro: EstadoVersion;
}

/**
 * Las versiones de un proyecto con sus fechas en el calendario vivo: cada versión vale su parte de las horas del bloque (las suyas
 * sobre el total de las versiones) y se reparte día por día desde el inicio del bloque con `capacidad`. El estado sale de lo que
 * marcaste (publicada) y de la fecha de hoy.
 */
export function versionesFechadas(
  id: string,
  bloque: { inicio?: string; fin?: string; horas?: number },
  capacidad: (fecha: string) => number,
  plan: Pick<PlanState, 'versiones'>,
  hoy: string,
): VersionFechada[] {
  const p = fichaV7(id);
  if (!p) return [];
  const reg = plan.versiones?.[id] ?? {};
  const conHoras = p.versiones.filter((v) => v.horas != null && !v.enCurso);
  const suma = conHoras.reduce((s, v) => s + v.horas!, 0);
  const total = bloque.horas ?? suma;
  let d = bloque.inicio;
  let acc = 0;
  let objetivo = 0;
  return p.versiones.map((v) => {
    const registro = reg[v.id] ?? {};
    let inicioTrazo: string | undefined;
    let finTrazo: string | undefined;
    if (d && bloque.fin && v.horas != null && suma > 0 && !v.enCurso) {
      objetivo += (v.horas / suma) * total;
      inicioTrazo = d;
      // Avanza hasta juntar las horas de esta versión (sin pasarse del fin del bloque).
      let x = d;
      for (let guarda = 0; guarda < 400; guarda++) {
        acc += capacidad(x);
        if (acc >= objetivo - 1e-6 || x >= bloque.fin) break;
        x = addDays(x, 1);
      }
      finTrazo = x;
      d = addDays(x, 1);
    }
    const fin = finTrazo ?? v.fin;
    const ini = inicioTrazo ?? v.inicio;
    const estado: VersionFechada['estado'] = registro.publicada ? 'publicada' : v.enCurso || (ini && fin && hoy >= ini && hoy <= fin) ? 'en-curso' : fin && hoy > fin ? 'atrasada' : 'proxima';
    return { ...v, ...(inicioTrazo ? { inicioTrazo, finTrazo } : {}), ...(finTrazo && v.fin ? { delta: daysBetween(v.fin, finTrazo) } : {}), estado, registro };
  });
}

/** Cuántos entregables (notas, video, README) tiene marcados una versión. */
export const entregablesHechos = (r: EstadoVersion) => [r.notas, r.video, r.readme].filter(Boolean).length;
