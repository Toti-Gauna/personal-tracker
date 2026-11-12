import { useState } from 'react';
import { AREAS } from '../data/defaults';
import { periodRange, yearMonths } from '../data/goals';
import { WEEK_GOAL_MIN } from '../data/study-catalog';
import type { Front } from '../data/study-types';
import { addDays, fmtDur } from '../data/time';
import type { DayLog } from '../data/types';
import { weekday } from '../data/study';

export type Periodo = 'semana' | 'mes' | 'anio';

const DIAS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const DIAS_LARGO = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
/** Orden fijo de apilado: validado para que dos áreas vecinas se distingan (también con daltonismo). */
const ORDEN = ['ing', 'eclipse', 'salud', 'handyx', 'rutina', 'economia'];

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

/** Minutos de estudio por período, apilados por frente, con la meta punteada. */
export function StudyChart({ days, date, fronts, periodo = 'semana', titulo }: { days: Record<string, DayLog>; date: string; fronts: Front[]; periodo?: Periodo; titulo?: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const { items, metaMin, metaTotal } = barras(periodo, date);
  const sorted = [...fronts].sort((a, b) => ORDEN.indexOf(a.color) - ORDEN.indexOf(b.color));
  const datos = items.map((b) => {
    const logs = Object.entries(days).filter(([k]) => k >= b.desde && k <= b.hasta).flatMap(([, d]) => d.study ?? []);
    const por = sorted.map((f) => ({ f, min: logs.filter((l) => l.front === f.id).reduce((s, l) => s + l.min, 0) }));
    return { ...b, por, total: por.reduce((s, x) => s + x.min, 0) };
  });
  const total = datos.reduce((s, d) => s + d.total, 0);
  const max = Math.max(metaMin * 1.15, ...datos.map((d) => d.total));
  const usados = sorted.filter((f) => datos.some((d) => d.por.some((p) => p.f.id === f.id && p.min > 0)));
  const nombre = titulo ?? (periodo === 'semana' ? 'Esta semana' : periodo === 'mes' ? 'Este mes' : 'Este año');
  const cols = datos.length;

  return (
    <section className="semana" aria-labelledby="semana-t">
      <div className="fila-t">
        <span id="semana-t" className="etiqueta">{nombre}</span>
        <span className="mono"><b>{fmtDur(total)}</b> de {fmtDur(metaTotal)}</span>
      </div>
      <div className="grafico" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }} role="img" aria-label={`Estudio, ${nombre.toLowerCase()}: ${fmtDur(total)} de ${fmtDur(metaTotal)}`}>
        <div className="meta-linea" style={{ bottom: `${(metaMin / max) * 100}%` }}><span className="mono">meta {fmtDur(metaMin)}</span></div>
        {datos.map((d, i) => (
          <button key={d.key} className="barra-dia" aria-label={`${d.largo}: ${fmtDur(d.total)}`}
            onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} onFocus={() => setHover(i)} onBlur={() => setHover(null)}>
            <span className="pila" style={{ height: `${(d.total / max) * 100}%` }}>
              {d.por.filter((p) => p.min > 0).map((p) => <span key={p.f.id} style={{ flexGrow: p.min, background: AREAS[p.f.color].css }} />)}
            </span>
            {hover === i && (
              <span className="tip" role="tooltip">
                <b>{d.largo} · {fmtDur(d.total)}</b>
                {d.por.filter((p) => p.min > 0).map((p) => <span key={p.f.id}><i style={{ background: AREAS[p.f.color].css }} />{p.f.name} {fmtDur(p.min)}</span>)}
              </span>
            )}
          </button>
        ))}
      </div>
      <div className="ejes mono" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }} aria-hidden="true">
        {datos.map((d) => <span key={d.key} className={d.actual ? 'hoy' : ''}>{d.letra}</span>)}
      </div>
      {usados.length > 1 && (
        <div className="leyenda">{usados.map((f) => <span key={f.id}><i style={{ background: AREAS[f.color].css }} />{f.name}</span>)}</div>
      )}
      <div className="sr-only"><table>
        <caption>Minutos de estudio por {periodo === 'semana' ? 'día' : periodo === 'mes' ? 'semana' : 'mes'} y frente</caption>
        <thead><tr><th>Período</th>{sorted.map((f) => <th key={f.id}>{f.name}</th>)}<th>Total</th></tr></thead>
        <tbody>{datos.map((d) => <tr key={d.key}><th>{d.largo}</th>{d.por.map((p) => <td key={p.f.id}>{p.min}</td>)}<td>{d.total}</td></tr>)}</tbody>
      </table></div>
    </section>
  );
}

/** El gráfico de la semana de Estudio. */
export const WeekChart = (p: { days: Record<string, DayLog>; date: string; fronts: Front[] }) => <StudyChart {...p} periodo="semana" />;
