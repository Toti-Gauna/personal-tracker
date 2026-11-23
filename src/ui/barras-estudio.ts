/** Los períodos de estudio (semana, mes, año) partidos en barras, con la meta de minutos de cada una. */
import { periodRange, yearMonths } from '../data/goals';
import { WEEK_GOAL_MIN } from '../data/study-catalog';
import { addDays } from '../data/time';
import { weekday } from '../data/study';

export type Periodo = 'semana' | 'mes' | 'anio';

const DIAS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const DIAS_LARGO = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

interface Barra { key: string; letra: string; largo: string; desde: string; hasta: string; actual: boolean }

/** Las barras del período: los 7 días de la semana, las semanas del mes o los 12 meses del año. */
export function barras(periodo: Periodo, date: string): { items: Barra[]; metaMin: number; metaTotal: number } {
  if (periodo === 'semana') {
    const lunes = addDays(date, -weekday(date));
    return {
      items: DIAS.map((l, i) => { const d = addDays(lunes, i); return { key: d, letra: l, largo: DIAS_LARGO[i], desde: d, hasta: d, actual: d === date }; }),
      metaMin: WEEK_GOAL_MIN / 6, metaTotal: WEEK_GOAL_MIN,
    };
  }
  if (periodo === 'mes') {
    const [desde, hasta] = periodRange('mes', date);
    const items: Barra[] = [];
    let d = addDays(desde, -weekday(desde));
    for (let i = 1; d <= hasta; i++) {
      const fin = addDays(d, 6);
      items.push({ key: d, letra: `S${i}`, largo: `Semana ${i}`, desde: d < desde ? desde : d, hasta: fin > hasta ? hasta : fin, actual: date >= d && date <= fin });
      d = addDays(d, 7);
    }
    return { items, metaMin: WEEK_GOAL_MIN, metaTotal: WEEK_GOAL_MIN * items.length };
  }
  const meses = yearMonths(1);
  const items = meses.map((m) => ({ key: m.key, letra: m.letter, largo: m.name[0].toUpperCase() + m.name.slice(1), desde: `${m.key}-01`, hasta: `${m.key}-31`, actual: date.startsWith(m.key) }));
  return { items, metaMin: Math.round((WEEK_GOAL_MIN * 52) / 12), metaTotal: WEEK_GOAL_MIN * 52 };
}
