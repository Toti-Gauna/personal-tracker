import { useState } from 'react';
import { AREAS } from '../data/defaults';
import { WEEK_GOAL_MIN } from '../data/study-catalog';
import type { Front } from '../data/study-types';
import { addDays, fmtDur } from '../data/time';
import type { DayLog } from '../data/types';
import { weekday } from '../data/study';

const DIAS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const DIAS_LARGO = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
/** Orden fijo de apilado: validado para que dos áreas vecinas se distingan (también con daltonismo). */
const ORDEN = ['ing', 'eclipse', 'salud', 'handyx', 'rutina', 'economia'];

/** Minutos de estudio por día de la semana, apilados por frente, con la meta diaria punteada. */
export function WeekChart({ days, date, fronts }: { days: Record<string, DayLog>; date: string; fronts: Front[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const lunes = addDays(date, -weekday(date));
  const sorted = [...fronts].sort((a, b) => ORDEN.indexOf(a.color) - ORDEN.indexOf(b.color));
  const semana = DIAS.map((_, i) => {
    const key = addDays(lunes, i);
    const logs = days[key]?.study ?? [];
    const por = sorted.map((f) => ({ f, min: logs.filter((l) => l.front === f.id).reduce((s, l) => s + l.min, 0) }));
    return { key, por, total: por.reduce((s, x) => s + x.min, 0) };
  });
  const total = semana.reduce((s, d) => s + d.total, 0);
  const metaDia = WEEK_GOAL_MIN / 6;
  const max = Math.max(metaDia * 1.15, ...semana.map((d) => d.total));
  const usados = sorted.filter((f) => semana.some((d) => d.por.some((p) => p.f.id === f.id && p.min > 0)));
  const hoyIdx = weekday(date);

  return (
    <section className="semana" aria-labelledby="semana-t">
      <div className="fila-t">
        <span id="semana-t" className="etiqueta">Esta semana</span>
        <span className="mono"><b>{fmtDur(total)}</b> de {fmtDur(WEEK_GOAL_MIN)}</span>
      </div>
      <div className="grafico" role="img" aria-label={`Estudio de la semana: ${fmtDur(total)} de ${fmtDur(WEEK_GOAL_MIN)}`}>
        <div className="meta-linea" style={{ bottom: `${(metaDia / max) * 100}%` }}><span className="mono">meta {fmtDur(metaDia)}</span></div>
        {semana.map((d, i) => (
          <button
            key={d.key}
            className="barra-dia"
            aria-label={`${DIAS_LARGO[i]}: ${fmtDur(d.total)}`}
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
            onFocus={() => setHover(i)}
            onBlur={() => setHover(null)}
          >
            <span className="pila" style={{ height: `${(d.total / max) * 100}%` }}>
              {d.por.filter((p) => p.min > 0).map((p) => (
                <span key={p.f.id} style={{ flexGrow: p.min, background: AREAS[p.f.color].css }} />
              ))}
            </span>
            {hover === i && (
              <span className="tip" role="tooltip">
                <b>{DIAS_LARGO[i]} · {fmtDur(d.total)}</b>
                {d.por.filter((p) => p.min > 0).map((p) => (
                  <span key={p.f.id}><i style={{ background: AREAS[p.f.color].css }} />{p.f.name} {fmtDur(p.min)}</span>
                ))}
              </span>
            )}
          </button>
        ))}
      </div>
      <div className="ejes mono" aria-hidden="true">
        {DIAS.map((d, i) => <span key={d} className={i === hoyIdx ? 'hoy' : ''}>{d}</span>)}
      </div>
      {usados.length > 1 && (
        <div className="leyenda">
          {usados.map((f) => <span key={f.id}><i style={{ background: AREAS[f.color].css }} />{f.name}</span>)}
        </div>
      )}
      <div className="sr-only"><table>
        <caption>Minutos de estudio por día y frente</caption>
        <thead><tr><th>Día</th>{sorted.map((f) => <th key={f.id}>{f.name}</th>)}<th>Total</th></tr></thead>
        <tbody>
          {semana.map((d, i) => (
            <tr key={d.key}><th>{DIAS_LARGO[i]}</th>{d.por.map((p) => <td key={p.f.id}>{p.min}</td>)}<td>{d.total}</td></tr>
          ))}
        </tbody>
      </table></div>
    </section>
  );
}
