/**
 * Trazo 2.0 · los pasos de una meta (las casillas). En el héroe van hasta tres, sin editar; en la hoja de la meta van todos,
 * se editan en el lugar y se agrega uno nuevo abajo.
 */
import { useRef, useState } from 'react';
import type { Block } from '../../data/types';
import { borrarTarea, editarTarea, restaurarTarea } from '../../state/dia';
import { addTask } from '../../state/store';
import { marcarTarea } from '../../ui/acciones';
import { aviso } from '../kit/capas';
import { Boton, Casilla } from '../kit/controles';

interface Props {
  date: string;
  block: Block;
  /** Cuántos mostrar como mucho (los pendientes primero). Sin valor, todos. */
  max?: number;
  /** Con lápiz para editar o borrar cada paso, y el campo para agregar uno. */
  editable?: boolean;
  /** Lo que hace "+N más". */
  onMas?: () => void;
}

export function Pasos({ date, block, max, editable, onMas }: Props) {
  const [editando, setEditando] = useState<string | null>(null);
  const [texto, setTexto] = useState('');
  const [nuevo, setNuevo] = useState('');
  const orden = max ? [...block.tasks.filter((t) => !t.done), ...block.tasks.filter((t) => t.done)] : block.tasks;
  // Con tope (el héroe de Hoy), los pasos a la vista se eligen una vez y no se reordenan al tildar: el que tildaste queda donde
  // estaba (con su tilde) en vez de saltar o desaparecer bajo el dedo. Se vuelven a elegir con otra meta o cuando están todos hechos.
  const elegidos = useRef<{ key: string; ids: string[] } | null>(null);
  if (max) {
    const actuales = elegidos.current?.key === block.key ? elegidos.current.ids.map((id) => block.tasks.find((t) => t.id === id)).filter((t): t is NonNullable<typeof t> => !!t) : [];
    const agotados = actuales.length > 0 && actuales.every((t) => t.done) && block.tasks.some((t) => !t.done && !elegidos.current!.ids.includes(t.id));
    if (!actuales.length || agotados) elegidos.current = { key: block.key, ids: orden.slice(0, max).map((t) => t.id) };
  }
  const visibles = max ? elegidos.current!.ids.map((id) => block.tasks.find((t) => t.id === id)).filter((t): t is NonNullable<typeof t> => !!t) : orden;
  const resto = block.tasks.length - visibles.length;

  const guardar = (id: string) => { if (texto.trim()) editarTarea(date, block.key, id, texto); setEditando(null); };
  const borrar = (id: string) => {
    const r = borrarTarea(date, block.key, id);
    setEditando(null);
    if (r) aviso({ titulo: 'Paso borrado', sub: r.tarea.t, deshacer: () => restaurarTarea(date, block.key, r.tarea, r.i) });
  };
  const agregar = () => { if (!nuevo.trim()) return; addTask(date, block.key, nuevo); setNuevo(''); };

  return (
    <div className="hy-pasos">
      {visibles.map((t) => editando === t.id ? (
        <form key={t.id} className="hy-paso-edita" onSubmit={(e) => { e.preventDefault(); guardar(t.id); }}>
          <input autoFocus aria-label="Texto del paso" value={texto} onChange={(e) => setTexto(e.target.value)} enterKeyHint="done" />
          <Boton tipo="submit" tamano="s" variante="primario">Guardar</Boton>
          <Boton tamano="s" variante="peligro" soloIcono icono="borrar" etiqueta="Borrar el paso" onClick={() => borrar(t.id)} />
        </form>
      ) : (
        <div key={t.id} className="hy-paso">
          <Casilla marcada={t.done} etiqueta={t.t} onCambio={() => marcarTarea(date, block.key, t.id)} />
          {editable && <Boton soloIcono tamano="s" variante="fantasma" icono="editar" etiqueta={`Editar: ${t.t}`} onClick={() => { setEditando(t.id); setTexto(t.t); }} />}
        </div>
      ))}
      {resto > 0 && onMas && <button type="button" className="hy-mas-pasos" onClick={onMas}>+{resto} más</button>}
      {editable && (
        <form className="hy-paso-nuevo" onSubmit={(e) => { e.preventDefault(); agregar(); }}>
          <input aria-label="Nuevo paso" placeholder="Nuevo paso" value={nuevo} onChange={(e) => setNuevo(e.target.value)} enterKeyHint="done" />
          <Boton tipo="submit" tamano="s" icono="mas" deshabilitado={!nuevo.trim()}>Agregar</Boton>
        </form>
      )}
    </div>
  );
}
