import { AREAS } from '../data/defaults';
import { ratio, valueOf } from '../data/goals';
import type { Goal } from '../data/goals-types';
import { useStore } from '../state/store';
import { addProgress, deleteGoal, stepOf, toggleGoal } from '../state/goals';
import { Casilla } from './Casilla';

const fmt = (n: number) => String(n).replace('.', ',');

/** Una meta con su contador, su barra y el botón + (o una casilla si es una tarea). */
export function GoalRow({ g, date, editar }: { g: Goal; date: string; editar?: boolean }) {
  const study = useStore((s) => s.study);
  const days = useStore((s) => s.days);
  const v = valueOf(g, date, { study, days });
  const manual = !g.auto;
  const done = v >= g.target;
  return (
    <li className="meta-fila-g" style={{ ['--c' as string]: AREAS[g.area].css }}>
      <div className="mg-cuerpo">
        <div className="mg-cab">
          <span className={`mg-t${done && g.type === 'tarea' ? ' trazo on' : ''}`}>{g.title}</span>
          <span className="mono mg-n" aria-label={`${fmt(v)} de ${g.target}${g.unit ? ` ${g.unit}` : ''}`}>
            {g.type === 'tarea' ? (done ? 'hecha' : 'pendiente') : `${fmt(v)}/${g.target}${g.unit === 'h' || g.unit === 'kg' ? ` ${g.unit}` : ''}`}
          </span>
        </div>
        <div className="mg-barra" aria-hidden="true"><span style={{ width: `${ratio(v, g.target) * 100}%` }} /></div>
      </div>
      {editar ? (
        <button className="borrar" onClick={() => deleteGoal(g.id)} aria-label={`Borrar ${g.title}`}>Borrar</button>
      ) : manual && g.type === 'tarea' ? (
        <Casilla checked={done} label={`${g.title}: marcar`} onChange={() => toggleGoal(g.id, date)} />
      ) : manual ? (
        <button className="mg-mas" aria-label={`Sumar ${stepOf(g)} a ${g.title}`} onClick={() => addProgress(g.id, date, stepOf(g))}>+</button>
      ) : (
        <span className="mg-auto mono" title="Se suma solo">auto</span>
      )}
    </li>
  );
}
