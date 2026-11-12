import { dayPct, monthLabel, periodRange } from '../data/goals';
import { weekday } from '../data/study';
import { addDays, daysBetween, parseDate } from '../data/time';
import type { DayLog } from '../data/types';

const DIAS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const nivel = (p: number | null) => (p == null ? 0 : p >= 0.85 ? 4 : p >= 0.5 ? 3 : p > 0 ? 2 : 1);

/** Calendario de calor del mes: cada día se llena según las tareas cumplidas. */
export function Calendario({ date, days, leyenda = true }: { date: string; days: Record<string, DayLog>; leyenda?: boolean }) {
  const [from, to] = periodRange('mes', date);
  const total = daysBetween(from, to) + 1;
  const offset = weekday(from);
  return (
    <>
      <div className="calendario" role="grid" aria-label={`Calendario de ${monthLabel(date)}`}>
        {DIAS.map((d) => <span key={d} className="cal-dia mono" role="columnheader">{d}</span>)}
        {Array.from({ length: offset }, (_, i) => <span key={`v${i}`} />)}
        {Array.from({ length: total }, (_, i) => addDays(from, i)).map((d) => {
          const p = dayPct(days[d]);
          return (
            <span key={d} role="gridcell" className={`cal-celda n${nivel(p)}${d === date ? ' hoy' : ''}`} aria-label={`${parseDate(d).getDate()}: ${p == null ? 'sin datos' : Math.round(p * 100) + ' %'}`}>
              <span className="mono">{parseDate(d).getDate()}</span>
            </span>
          );
        })}
      </div>
      {leyenda && <div className="cal-leyenda mono sub" aria-hidden="true"><span>menos</span><i className="n1" /><i className="n2" /><i className="n3" /><i className="n4" /><span>85 % o más</span></div>}
    </>
  );
}
