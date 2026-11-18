/**
 * Ola 8b · 5 ter: puertas de matemática y semanas ganadas.
 *
 * Puertas: W1, W2 y W3 cierran con los tests del tema (85 % o más). Con la puerta sin aprobar,
 * el proyecto siguiente (P3, P6, P8) no arranca: los bloques de programación de esos días pasan
 * a matemática pura hasta aprobar. Matemática es el camino crítico.
 *
 * Colchón (ola 16b): desde el Plan T+18 extendido la etapa 2 ocupa el margen que dejaba el
 * calendario comprimido, así que lo que queda de aire son las semanas del colchón (2 al final de
 * la etapa 1), más las que cada proyecto cierra antes de su meta, menos las de atraso (proyecto
 * que pasa la meta; puerta sin aprobar: cada semana se descuenta del colchón).
 */
import { FIN_PROGRAMACION, PLAN, T0_PLAN, TRAMOS, finSemana, inicioSemana, semanaDelPlan, tramoActivo } from './plan';
import { evidenciaCompleta, type PlanState } from './plan-state';

export const APROBAR = 85;
const dias = (a: string, b: string) => Math.round((new Date(b + 'T12:00').getTime() - new Date(a + 'T12:00').getTime()) / 864e5);

/** ¿La puerta (W1, W2, W3) está aprobada? Con el examen de la ventana a 85 % o más. */
export function puertaAprobada(plan: Pick<PlanState, 'proyectos'>, w: string) {
  const e = plan.proyectos[w]?.examen;
  return e && e.puntaje >= APROBAR ? e.fecha : null;
}

/** La ventana cuya puerta abre un proyecto ("P3" → "W1"). */
export const puertaDe = (proyecto: string) => Object.entries(PLAN.programacion.puertas).find(([, p]) => p === proyecto)?.[0];

/**
 * Si hoy toca un proyecto con puerta y la puerta no está aprobada, devuelve la ventana: el
 * proyecto no arranca y la programación del día pasa a matemática pura.
 */
export function puertaBloqueando(date: string, plan: Pick<PlanState, 'proyectos'>, t0 = T0_PLAN): string | null {
  const t = tramoActivo(date, t0);
  const w = puertaDe(t.id);
  if (!w) return null;
  return puertaAprobada(plan, w) ? null : w;
}

/** Semanas de atraso que suma una puerta: desde que terminó la ventana hasta que se aprobó (o hasta hoy). */
export function atrasoPuerta(plan: Pick<PlanState, 'proyectos'>, w: string, hoy: string, t0 = T0_PLAN) {
  const v = TRAMOS.find((t) => t.id === w);
  if (!v) return 0;
  const fin = finSemana(v.hasta, t0);
  const hasta = puertaAprobada(plan, w) ?? hoy;
  return hasta > fin ? Math.ceil(dias(fin, hasta) / 7) : 0;
}

/** ¿Tiene la entrevista técnica completa? Documento de diseño, 6 a 8 ejercicios con tests y la defensa. */
export function tecnicaCompleta(plan: Pick<PlanState, 'proyectos'>, id: string) {
  const t = plan.proyectos[id]?.tecnica;
  return !!(t?.diseno && (t.ejercicios ?? 0) >= PLAN.programacion.tecnica.ejercicios[0] && t.defensa);
}

/**
 * Fecha en que un proyecto quedó cerrado: examen a 85 % o más y la entrevista técnica completa
 * (sin esos tres, no se cierra). P0 no lleva entrevista técnica. Gana la fecha más tardía.
 */
export function cierreProyecto(plan: PlanState, id: string) {
  const p = plan.proyectos[id];
  if (!p) return null;
  const ex = p.examen && p.examen.puntaje >= APROBAR ? p.examen.fecha : null;
  if (!ex) return null;
  // Ola 16c: sin las tres pruebas de evidencia (número medido, validador e informe) no cierra.
  if (!evidenciaCompleta(p)) return null;
  if (id === 'P0') return ex;
  if (!tecnicaCompleta(plan, id)) return null;
  return p.tecnica!.defensa! > ex ? p.tecnica!.defensa! : ex;
}

/** Contadores de Perfil: MCP publicados, agentes con trazas y defensas aprobadas, de 11. */
export function contadoresAgenticos(plan: Pick<PlanState, 'proyectos'>) {
  const ids = TRAMOS.filter((t) => t.tipo === 'proyecto').map((t) => t.id);
  return {
    total: ids.length,
    mcp: ids.filter((i) => plan.proyectos[i]?.mcp).length,
    agentes: ids.filter((i) => plan.proyectos[i]?.agente).length,
    defensas: ids.filter((i) => plan.proyectos[i]?.tecnica?.defensa).length,
  };
}

/** Semanas ganadas (o perdidas) por cada proyecto contra su meta. */
export function semanasDeProyecto(plan: PlanState, id: string, hoy: string, t0 = T0_PLAN) {
  const t = TRAMOS.find((x) => x.id === id);
  if (!t || t.tipo !== 'proyecto') return 0;
  const fin = finSemana(t.hasta, t0);
  const c = cierreProyecto(plan, id);
  // Ola 24: las semanas de pausa que caen entre el cierre y la meta no son semanas ganadas.
  if (c) return c < fin ? Math.max(0, Math.floor(dias(c, fin) / 7) - (t.pausas ?? []).filter((w) => inicioSemana(w, t0) > c).length) : c > fin ? -1 : 0;
  // Sin cerrar y pasada la meta: usa la semana de tope (y si pasa el tope, se recorta alcance).
  return hoy > fin ? -1 : 0;
}

/** Semanas del colchón de la etapa 1 con el calendario actual. */
export const semanasColchon = () => TRAMOS.filter((t) => t.tipo === 'colchon').reduce((s, t) => s + t.hasta - t.desde + 1, 0);

export function semanasGanadas(plan: PlanState, hoy: string, t0 = T0_PLAN) {
  const base = semanasColchon();
  const proyectos = TRAMOS.filter((t) => t.tipo === 'proyecto').reduce((s, t) => s + semanasDeProyecto(plan, t.id, hoy, t0), 0);
  const puertas = Object.keys(PLAN.programacion.puertas).reduce((s, w) => s + atrasoPuerta(plan, w, hoy, t0), 0);
  return { total: base + proyectos - puertas, base, proyectos, puertas };
}

/** Semana del plan en que realmente termina programación: el colchón absorbe los atrasos. */
export const finRealProgramacion = (plan: PlanState, hoy: string, t0 = T0_PLAN) => {
  const g = semanasGanadas(plan, hoy, t0);
  const extra = Math.max(0, g.puertas - g.proyectos);
  const col = semanasColchon();
  return { semana: FIN_PROGRAMACION + Math.max(0, extra - col), colchonUsado: Math.min(col, extra), fecha: inicioSemana(FIN_PROGRAMACION + 1, t0), hoySemana: semanaDelPlan(hoy, t0) };
};
