import { AREAS } from '../data/defaults';
import { ratio, valueOf } from '../data/goals';
import type { Goal } from '../data/goals-types';
import { useState } from 'react';
import { useStore } from '../state/store';
import { periodKey } from '../data/goals';
import { addDays } from '../data/time';
import { runWeek } from '../data/train';
import { aceptaSubs, addProgress, addSub, deleteGoal, removeSub, stepOf, toggleGoal, toggleMark, toggleSub } from '../state/goals';
import { dateKey } from '../data/time';
import { Casilla } from './Casilla';
import { abrirCorrida } from './checkins';
import { HojaSubmeta } from './HojaSubmeta';

const fmt = (n: number) => String(n).replace('.', ',');
const DIAS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

/** Una meta con su contador, su barra y el botón + (o una casilla si es una tarea). */
export function GoalRow({ g, date, editar, sub }: { g: Goal; date: string; editar?: boolean; sub?: string }) {
  const study = useStore((s) => s.study);
  const days = useStore((s) => s.days);
  const train = useStore((s) => s.train);
  const v = valueOf(g, date, { study, days, train });
  const manual = !g.auto;
  const done = v >= g.target;
  const corr = g.auto?.kind === 'correr' ? runWeek(train.runs, date) : null;
  const subtexto = sub ?? (corr && corr.n ? `${corr.min} min${corr.km ? ` · ${fmt(corr.km)} km` : ''} esta semana` : undefined);
  const conSubs = !!g.subs?.length;
  const porDia = !!g.daily && manual;
  const hechas = new Set(g.subDone?.[periodKey(g.horizon, date)] ?? []);
  const [hoja, setHoja] = useState(false);
  const lunes = periodKey('semana', date);
  const hoy = dateKey();
  return (
    <li className="meta-fila-g" style={{ ['--c' as string]: AREAS[g.area].css }}>
      <div className="mg-cuerpo">
        <div className="mg-cab">
          <span className={`mg-t${done && g.type === 'tarea' ? ' trazo on' : ''}`}>{g.title}</span>
          <span className="mono mg-n" aria-label={`${fmt(v)} de ${g.target}${g.unit ? ` ${g.unit}` : ''}`}>
            {g.type === 'tarea' ? (done ? 'hecha' : 'pendiente') : `${fmt(v)}/${g.target}${g.unit === 'h' || g.unit === 'kg' ? ` ${g.unit}` : ''}`}
          </span>
        </div>
        {subtexto && <small className="mg-sub mono">{subtexto}</small>}
        <div className="mg-barra" aria-hidden="true"><span style={{ width: `${ratio(v, g.target) * 100}%` }} /></div>
      </div>
      {editar ? (
        <button className="borrar" onClick={() => deleteGoal(g.id)} aria-label={`Borrar ${g.title}`}>Borrar</button>
      ) : conSubs || porDia ? null : manual && g.type === 'tarea' ? (
        <Casilla checked={done} label={`${g.title}: marcar`} onChange={() => toggleGoal(g.id, date)} />
      ) : manual ? (
        <button className="mg-mas" aria-label={`Sumar ${stepOf(g)} a ${g.title}`} onClick={() => addProgress(g.id, date, stepOf(g))}>+</button>
      ) : g.auto?.kind === 'correr' ? (
        <button className="mg-mas" aria-label="Registrar una corrida" title="Registrar corrida" onClick={() => abrirCorrida(date)}>+</button>
      ) : (
        <span className="mg-auto mono" title="Se suma solo">auto</span>
      )}
      {conSubs && (
        <ul className="mg-extra mg-subs" aria-label={`Submetas de ${g.title}`}>
          {g.subs!.map((x) => (
            <li key={x.id}>
              {editar ? (
                <>
                  <span className={`trazo${hechas.has(x.id) ? ' on' : ''}`}>{x.t}</span>
                  <button className="borrar" type="button" aria-label={`Quitar la submeta ${x.t}`} onClick={() => removeSub(g.id, date, x.id)}>Quitar</button>
                </>
              ) : (
                <>
                  <Casilla id={`s-${g.id}-${x.id}`} checked={hechas.has(x.id)} label={x.t} onChange={() => toggleSub(g.id, date, x.id)} />
                  <label htmlFor={`s-${g.id}-${x.id}`}><span className={`trazo${hechas.has(x.id) ? ' on' : ''}`}>{x.t}</span></label>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
      {aceptaSubs(g) && (
        <div className="mg-extra mg-add">
          <button type="button" className="mg-add-sub" aria-label={`Agregar submeta a ${g.title}`} onClick={() => setHoja(true)}>{conSubs ? '+ Submeta' : '+ Agregar submeta'}</button>
        </div>
      )}
      {hoja && <HojaSubmeta kicker={g.title} color={AREAS[g.area].css} onAgregar={(t) => addSub(g.id, date, t)} onCerrar={() => setHoja(false)} />}
      {!editar && porDia && (
        <div className="mg-extra mg-dias" role="group" aria-label={`Días de ${g.title}`}>
          {DIAS.map((l, i) => {
            const d = addDays(lunes, i);
            const on = !!g.marks?.includes(d);
            const futuro = d > hoy;
            return (
              <button key={d} type="button" aria-pressed={on} disabled={futuro} className={d === hoy ? 'hoy' : ''} aria-label={`${l} ${d.slice(8)}: ${on ? 'hecho' : 'sin marcar'}`} onClick={() => toggleMark(g.id, d)}>
                <span className="mono">{l}</span>
                <i aria-hidden="true">{on ? '✓' : ''}</i>
              </button>
            );
          })}
        </div>
      )}
    </li>
  );
}
