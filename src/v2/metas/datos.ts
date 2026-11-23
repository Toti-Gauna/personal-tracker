/**
 * Trazo 2.0 · lo que comparten las pantallas de metas (semana, mes, bimestre, año, ruta, mapa…): formatos, el contexto de los
 * cálculos del plan y las funciones que devuelven lo que se borró (para el "Deshacer"). Los cálculos salen de `data/metas-plan`
 * y los cambios pasan por las mismas acciones que la 1.0.
 */
import { AREAS } from '../../data/defaults';
import type { Goal } from '../../data/goals-types';
import type { CtxPlan } from '../../data/metas-plan';
import { T0_PLAN, type MetaGenerada } from '../../data/plan';
import { enPausa, type PlanState } from '../../data/plan-state';
import { RAMA_COLOR } from '../../data/ramas';
import { parseDate } from '../../data/time';
import type { Area, Rama } from '../../data/types';
import { inicioTrabajo, planSettings, setState, useStore } from '../../state/store';
import { colorV2 } from '../hoy/datos';

export const MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
export const MES_LARGO = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
/** "23 nov". */
export const dm = (d: string) => `${parseDate(d).getDate()} ${MES[parseDate(d).getMonth()]}`;
/** "23 nov 2026". */
export const dmy = (d: string) => `${dm(d)} ${d.slice(0, 4)}`;
/** "noviembre 2026". */
export const mesAnio = (d: string) => `${MES_LARGO[parseDate(d).getMonth()]} ${d.slice(0, 4)}`;
/** Números con coma decimal y un decimal como mucho. */
export const fmt = (n: number) => String(Math.round(n * 10) / 10).replace('.', ',');
export const pct = (n: number) => `${Math.round(n * 100)} %`;
/** Un número con coma decimal y `d` decimales fijos. */
export const num = (x: number, d = 2) => x.toFixed(d).replace('.', ',');
/** Una fracción como porcentaje con `d` decimales: 0,125 → "12,5 %". */
export const pctD = (x: number, d = 0) => `${num(x * 100, d)} %`;
/** "23 – 29 nov", o "30 nov – 6 dic" si cruza de mes. */
export function rangoCorto(a: string, b: string) {
  const [x, y] = [parseDate(a), parseDate(b)];
  return x.getMonth() === y.getMonth() ? `${x.getDate()} – ${dm(b)}` : `${dm(a)} – ${dm(b)}`;
}

/** El color de una rama (o de un área) en los tokens de la 2.0. */
export const colorRama = (r: Rama | 'main' | 'clipping') => colorV2(r === 'clipping' ? 'var(--eclipse)' : RAMA_COLOR[r]);
export const colorArea = (a: Area) => colorV2(AREAS[a].css);
/** El color de una meta generada: el de su rama, el de su área o ninguno. */
export const colorMeta = (m: { rama?: Rama; area?: Area }) => (m.rama ? colorRama(m.rama) : m.area ? colorArea(m.area) : undefined);

/** El titular de una meta larga: hasta el primer «;» y como mucho `max` palabras (el texto entero está en su hoja). */
export function titular(texto: string, max = 8) {
  const primero = texto.split(';')[0].trim();
  const ps = primero.split(/\s+/);
  return ps.length > max ? `${ps.slice(0, max).join(' ').replace(/[,.]$/, '')}…` : primero + (primero.length < texto.trim().length ? '…' : '');
}

export const ORIGEN: Record<MetaGenerada['origen'], string> = { plan: 'del plan', propia: 'tuya', chequeo: 'chequeo mensual' };

/** El contexto de los cálculos del plan: lo mismo que arma la 1.0 en Semana, Mes, Bimestre y Año. */
export function useCtx(): CtxPlan & { goals: Goal[]; intensiva: boolean; inicioTrabajo: string } {
  const plan = useStore((s) => s.plan);
  const days = useStore((s) => s.days);
  const study = useStore((s) => s.study);
  const train = useStore((s) => s.train);
  const settings = useStore((s) => s.settings);
  const goals = useStore((s) => s.goals.goals);
  const clipping = useStore((s) => s.clipping);
  return { plan, days, study, train, goals, clipping, t0: settings?.startDate ?? T0_PLAN, t2: planSettings(settings).t2, intensiva: planSettings(settings).modo === 'busqueda-intensiva', inicioTrabajo: inicioTrabajo(settings) };
}

/**
 * Las metas personales que se muestran: las de una rama en pausa (Handyx) y las de ventas de Eclipse en pausa no aparecen;
 * siguen guardadas y vuelven al retomar.
 */
export function visibles(goals: Goal[], plan: PlanState, date: string) {
  return goals.filter((g) => !(g.rama && enPausa(plan, g.rama, date)) && !(g.area === 'eclipse' && enPausa(plan, 'ventas', date)));
}

type Periodo = { confirmado?: string; metas: MetaGenerada[] };

/** Lo guardado de un período de metas (mes o semana) tal como está ahora: para devolverlo si se deshace un borrado. */
export const instantanea = (plan: PlanState, tipo: 'meses' | 'semanas', clave: string): Periodo | undefined => {
  const p = plan[tipo][clave];
  return p ? { ...p, metas: [...p.metas] } : undefined;
};

/** Vuelve un período de metas a como estaba (si no estaba guardado, lo saca). */
export function devolverPeriodo(tipo: 'meses' | 'semanas', clave: string, antes: Periodo | undefined) {
  setState((s) => {
    const resto = { ...s.plan[tipo] };
    if (antes) resto[clave] = antes;
    else delete resto[clave];
    return { ...s, plan: { ...s.plan, [tipo]: resto } };
  });
}

/** Devuelve una meta propia como estaba: si se borró, en el mismo lugar de la lista y con todo lo que tenía (id, avance, submetas). */
export function devolverMeta(g: Goal, posicion: number) {
  setState((s) => {
    const gs = [...s.goals.goals];
    const i = gs.findIndex((x) => x.id === g.id);
    if (i >= 0) gs[i] = g;
    else gs.splice(Math.min(posicion, gs.length), 0, g);
    return { ...s, goals: { ...s.goals, goals: gs } };
  });
}
