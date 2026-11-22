/**
 * Trazo 2.0 · lo que dibujan Perfil, Avance y el cierre sin tocar la pantalla: el año como mapa de calor (un renglón por mes,
 * una celda por día), el mes y los números del resumen. Todo sale de los mismos días, sellos y entrenos que la 1.0.
 */
import { mejoraAcumulada, racha } from '../../data/derive';
import { dayPct } from '../../data/goals';
import { mejoraDia } from '../../data/mejora';
import { SEALS, bestStreak, levelOf, totalXp } from '../../data/profile';
import { volume } from '../../data/train';
import { addDays } from '../../data/time';
import type { DayLog } from '../../data/types';
import type { State } from '../../state/store';
import { colorV2 } from '../hoy/datos';

export type Nivel = 0 | 1 | 2 | 3 | 4;
/** Cuánto se llena un día: sin datos, nada hecho, algo, la mitad o más, casi todo (85 % o más). Igual que el calendario de la 1.0. */
export const nivelDe = (p: number | null): Nivel => (p == null ? 0 : p >= 0.85 ? 4 : p >= 0.5 ? 3 : p > 0 ? 2 : 1);

export interface CeldaDia { fecha: string; dia: number; nivel: Nivel; pct: number | null; hoy: boolean; futuro: boolean }
export interface FilaMes { clave: string; letra: string; nombre: string; celdas: CeldaDia[] }
export interface MapaAnio { filas: FilaMes[]; cargados: number; promedio: number | null; desde: string; hasta: string }

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const p2 = (n: number) => String(n).padStart(2, '0');
const diasDelMes = (y: number, m: number) => new Date(Date.UTC(y, m + 1, 0)).getUTCDate();

/** Los doce meses del año del plan en el que cae `date`: el año arranca el mes en que empezaste. */
export function mapaDelAnio(days: Record<string, DayLog>, date: string, startDate: string): MapaAnio {
  const [y0, m0] = [Number(startDate.slice(0, 4)), Number(startDate.slice(5, 7)) - 1];
  const [y1, m1] = [Number(date.slice(0, 4)), Number(date.slice(5, 7)) - 1];
  const vuelta = Math.floor(Math.max(0, (y1 - y0) * 12 + (m1 - m0)) / 12);
  const filas: FilaMes[] = [];
  const pcts: number[] = [];
  for (let i = 0; i < 12; i++) {
    const abs = m0 + vuelta * 12 + i;
    const y = y0 + Math.floor(abs / 12);
    const m = abs % 12;
    const celdas: CeldaDia[] = Array.from({ length: diasDelMes(y, m) }, (_, k) => {
      const fecha = `${y}-${p2(m + 1)}-${p2(k + 1)}`;
      const pct = fecha <= date ? dayPct(days[fecha]) : null;
      if (pct != null) pcts.push(pct);
      return { fecha, dia: k + 1, nivel: nivelDe(pct), pct, hoy: fecha === date, futuro: fecha > date };
    });
    filas.push({ clave: `${y}-${p2(m + 1)}`, letra: MESES[m][0].toUpperCase(), nombre: MESES[m], celdas });
  }
  return {
    filas, cargados: pcts.length, promedio: pcts.length ? pcts.reduce((a, b) => a + b, 0) / pcts.length : null,
    desde: filas[0].celdas[0].fecha, hasta: filas[11].celdas[filas[11].celdas.length - 1].fecha,
  };
}

/** Los últimos `n` días hasta `date`, con la mejora de cada uno (0 si ese día no se cargó). */
export function ultimosDias(days: Record<string, DayLog>, date: string, n: number) {
  return Array.from({ length: n }, (_, i) => addDays(date, i - n + 1)).map((d) => ({ fecha: d, mejora: days[d] ? mejoraDia(days[d]) : 0, cargado: !!days[d] }));
}

/** El color de un sello (definido con los colores de la 1.0), en los tokens de la 2.0. */
export const colorDeSello = (css: string) => colorV2(css);

export interface Resumen {
  dias: number; racha: number; mejorRacha: number; mejora: number; nivel: number; xp: number; haciaElProximo: number; costo: number; faltan: number;
  sellos: number; sellosTotal: number; minutosEstudio: number; tarjetas: number; entrenos: number; toneladas: number;
}

/** Los números grandes de Perfil y de la presentación. Nada privado: ni el peso ni la plata. */
export function resumen(s: State, date: string): Resumen {
  const xp = totalXp(s);
  const lv = levelOf(xp);
  return {
    dias: Object.keys(s.days).length,
    racha: racha(s.days, date),
    mejorRacha: bestStreak(s.days),
    mejora: mejoraAcumulada(s.days, date),
    nivel: lv.level, xp, haciaElProximo: lv.into, costo: lv.cost, faltan: lv.toNext,
    sellos: SEALS.filter((d) => s.profile.seals[d.id]).length, sellosTotal: SEALS.length,
    minutosEstudio: Object.values(s.days).flatMap((d) => d.study ?? []).reduce((a, l) => a + l.min, 0),
    tarjetas: s.study.cards.length,
    entrenos: s.train.sessions.length,
    toneladas: Math.round(volume(s.train.sessions.flatMap((x) => x.sets), 'me') / 100) / 10,
  };
}
