import type { Block } from '../data/types';
import { AREAS } from '../data/defaults';
import { marcarTarea } from './acciones';
import { Casilla } from './Casilla';

export function Tareas({ date, block }: { date: string; block: Block }) {
  return (
    <ul className="tareas" style={{ ['--c' as string]: AREAS[block.area].css }}>
      {block.tasks.map((t) => (
        <li key={t.id}>
          <Casilla id={`t-${t.id}`} checked={t.done} label={t.t} onChange={() => marcarTarea(date, block.key, t.id)} />
          <label htmlFor={`t-${t.id}`}><span className={`trazo${t.done ? ' on' : ''}`}>{t.t}</span></label>
        </li>
      ))}
    </ul>
  );
}
