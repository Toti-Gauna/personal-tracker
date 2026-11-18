import { useState } from 'react';
import type { Block, Task } from '../data/types';
import { AREAS } from '../data/defaults';
import { marcarTarea } from './acciones';
import { Casilla } from './Casilla';
import { HojaTarea } from './HojasDia';

/** Las submetas de un bloque. Ola 25: cada una se edita o se borra desde su botón ⋯. */
export function Tareas({ date, block }: { date: string; block: Block }) {
  const [editando, setEditando] = useState<Task | null>(null);
  return (
    <>
      <ul className="tareas" style={{ ['--c' as string]: AREAS[block.area].css }}>
        {block.tasks.map((t) => (
          <li key={t.id}>
            <Casilla id={`t-${t.id}`} checked={t.done} label={t.t} onChange={() => marcarTarea(date, block.key, t.id)} />
            <label htmlFor={`t-${t.id}`}><span className={`trazo${t.done ? ' on' : ''}`}>{t.t}</span></label>
            <button type="button" className="tarea-mas" aria-label={`Editar o borrar: ${t.t}`} onClick={() => setEditando(t)}><span aria-hidden="true">⋯</span></button>
          </li>
        ))}
      </ul>
      {editando && <HojaTarea date={date} block={block} tarea={editando} onCerrar={() => setEditando(null)} />}
    </>
  );
}
