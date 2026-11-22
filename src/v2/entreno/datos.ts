/**
 * Trazo 2.0 · lo que necesita Entreno sin dibujar nada: la semana (qué toca cada día y qué se hizo), las series por músculo
 * hechas contra las planeadas, y los ejercicios que trabajan un músculo. Usa las mismas funciones que la 1.0.
 */
import { monday, rutinaDelDia, sessionsInWeek } from '../../data/train';
import { REST_DAY } from '../../data/train-catalog';
import type { Routine, TrainState } from '../../data/train-types';
import { addDays } from '../../data/time';
import { cargaDeRutinas, cargaDeSeries, indiceEjercicios, musculosDe, type Carga, type Musculo } from './musculos';

export interface DiaSemana { fecha: string; letra: string; rutina: Routine | null; descanso: boolean; hecho: boolean; hoy: boolean }
const LETRAS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

/** "Push A" → "Push A"; los nombres largos se acortan para que entren en la tira de la semana. */
export const nombreCorto = (r: Pick<Routine, 'name'>) => r.name.replace('Piernas', 'Legs').replace('Full body', 'Full');

/** Los siete días de la semana de `date`: qué rutina toca, si es descanso, si ya se entrenó y cuál es hoy. */
export function semanaDe(t: Pick<TrainState, 'plan' | 'routines' | 'sessions'>, date: string, t0?: string): DiaSemana[] {
  const m = monday(date);
  return t.plan.days.map((id, i) => {
    const fecha = addDays(m, i);
    return { fecha, letra: LETRAS[i], rutina: rutinaDelDia(t.routines, id, fecha, t0), descanso: id === REST_DAY, hecho: t.sessions.some((s) => s.date === fecha), hoy: fecha === date };
  });
}

export interface Volumen {
  /** Series por músculo que pide la semana (principal 1, acompañante 0,5). */
  plan: Carga;
  /** Series por músculo que ya hiciste esta semana (incluye el entreno en curso). */
  hecho: Carga;
  sesiones: number;
  planeadas: number;
}

/** El volumen de la semana: lo planeado sale de las rutinas de los siete días; lo hecho, de las series cargadas. */
export function volumenSemana(t: Pick<TrainState, 'plan' | 'routines' | 'sessions' | 'active'>, date: string, t0?: string): Volumen {
  const dias = semanaDe(t, date, t0);
  const rutinas = dias.map((d) => d.rutina).filter((r): r is Routine => !!r);
  const indice = indiceEjercicios(t.routines);
  const semana = sessionsInWeek(t, date);
  const m = monday(date);
  const enCurso = t.active && t.active.date >= m && t.active.date <= addDays(m, 6) ? t.active.sets : [];
  return {
    plan: cargaDeRutinas(rutinas),
    hecho: cargaDeSeries([...semana.flatMap((s) => s.sets), ...enCurso], indice, 'me'),
    sesiones: semana.length,
    planeadas: t.plan.days.filter((d) => d && d !== REST_DAY).length,
  };
}

export interface EjercicioDeMusculo { id: string; nombre: string; rutina: string; series: number; principal: boolean }

/** Los ejercicios de la semana que trabajan un músculo, con cuántas series le suman y en qué rutina van. */
export function ejerciciosDe(m: Musculo, rutinas: Routine[]): EjercicioDeMusculo[] {
  const out: EjercicioDeMusculo[] = [];
  for (const r of rutinas) for (const e of r.exercises) {
    const p = musculosDe(e).find((x) => x.m === m);
    if (p) out.push({ id: `${r.id}:${e.id}`, nombre: e.name, rutina: r.name, series: Math.round(e.sets * p.peso * 10) / 10, principal: p.peso >= 1 });
  }
  return out.sort((a, b) => Number(b.principal) - Number(a.principal) || b.series - a.series);
}

/** "6" o "6,5": las series con coma decimal. */
export const fmtSeries = (n: number) => String(Math.round(n * 10) / 10).replace('.', ',');
