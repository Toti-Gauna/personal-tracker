/** Ola 25 · Hoy editable: las hojas para editar el día sin salir de Hoy. */
import { useState } from 'react';
import { AREAS } from '../data/defaults';
import type { Modo } from '../data/editar-dia';
import { blockDone, fmtPct, mejoraDia, valorMeta } from '../data/mejora';
import { RAMA_NOMBRE } from '../data/ramas';
import { nowMin, toHHMM, toMin } from '../data/time';
import type { Block, RamaOMain, Task } from '../data/types';
import { agregarMetaHoy, borrarTarea, cambiarHorario, darPorHecho, editarTarea, restaurarTarea } from '../state/dia';
import { getState } from '../state/store';
import { toast } from './avisos';
import { Hoja } from './Hoja';

const color = (b: Pick<Block, 'area'>) => AREAS[b.area].css;

/** Editar o borrar una submeta (con Deshacer). */
export function HojaTarea({ date, block, tarea, onCerrar }: { date: string; block: Block; tarea: Task; onCerrar: () => void }) {
  const [texto, setTexto] = useState(tarea.t);
  return (
    <Hoja titulo="Submeta" kicker={block.title} color={color(block)} onCerrar={onCerrar}>
      <form onSubmit={(e) => { e.preventDefault(); editarTarea(date, block.key, tarea.id, texto); onCerrar(); }}>
        <input className="campo-texto" autoFocus enterKeyHint="done" value={texto} onChange={(e) => setTexto(e.target.value)} aria-label="Texto de la submeta" />
        <button className="btn-principal" type="submit" style={{ marginTop: 14 }} disabled={!texto.trim() || texto.trim() === tarea.t}>Guardar</button>
        <button className="btn-borde" type="button" onClick={() => {
          const r = borrarTarea(date, block.key, tarea.id);
          onCerrar();
          if (r) toast({ title: 'Submeta borrada', sub: r.tarea.t, color: color(block), action: { label: 'Deshacer', run: () => restaurarTarea(date, block.key, r.tarea, r.i) } }, false);
        }}>Borrar la submeta</button>
      </form>
    </Hoja>
  );
}

/** Dar el bloque por hecho aunque queden submetas, con lo que hiciste en ese tiempo. */
export function HojaHecho({ date, block, onCerrar }: { date: string; block: Block; onCerrar: () => void }) {
  const [nota, setNota] = useState('');
  const pendientes = block.tasks.filter((t) => !t.done).length;
  const listo = () => {
    const antes = blockDone(block);
    darPorHecho(date, block.key, nota);
    onCerrar();
    const day = getState().days[date];
    if (day && !antes) toast({ title: `Meta ${block.n} cumplida · +${fmtPct(valorMeta(day), 3)} %`, sub: `Hoy llevás +${fmtPct(mejoraDia(day))} % de mejora`, color: color(block), evento: 'tarea' });
  };
  return (
    <Hoja titulo="Dar por hecho" kicker={block.title} color={color(block)} onCerrar={onCerrar}>
      <form onSubmit={(e) => { e.preventDefault(); listo(); }}>
        <p className="sub">{pendientes ? `Quedan ${pendientes} ${pendientes === 1 ? 'submeta' : 'submetas'} sin tildar: no pasan a mañana.` : 'El bloque cuenta como hecho.'} Cuenta en la mejora del día.</p>
        <label className="etiqueta" htmlFor="hecho-nota">¿En qué lo usaste? (opcional)</label>
        <input id="hecho-nota" className="campo-texto" autoFocus enterKeyHint="done" value={nota} onChange={(e) => setNota(e.target.value)} placeholder="La reunión no se dio: avancé con otra tarea de Tsoft" />
        <button className="btn-principal" type="submit" style={{ marginTop: 14 }}>Dar por hecho</button>
      </form>
    </Hoja>
  );
}

function Modos({ modo, setModo }: { modo: Modo; setModo: (m: Modo) => void }) {
  return (
    <div className="segmentado hdia-modo" role="radiogroup" aria-label="Los que siguen">
      <button type="button" role="radio" aria-checked={modo === 'correr'} onClick={() => setModo('correr')}>Correr los siguientes</button>
      <button type="button" role="radio" aria-checked={modo === 'acortar'} onClick={() => setModo('acortar')}>Acortar los siguientes</button>
    </div>
  );
}

const textoModo = (m: Modo) => (m === 'correr' ? 'Los que siguen empiezan más tarde si se pisan; nada pasa de dormir a las 22:00.' : 'Los que siguen se achican (mínimo 15 min) para terminar a la misma hora que antes.');

/** Cambiar el horario de un bloque solo por hoy. */
export function HojaHorario({ date, block, onCerrar }: { date: string; block: Block; onCerrar: () => void }) {
  const [start, setStart] = useState(block.start);
  const [min, setMin] = useState(String(block.min));
  const [modo, setModo] = useState<Modo>('correr');
  const [error, setError] = useState('');
  const m = Number(min);
  const ok = /^\d{2}:\d{2}$/.test(start) && m >= 5;
  return (
    <Hoja titulo="Cambiar horario" kicker={`${block.title} · solo hoy`} color={color(block)} onCerrar={onCerrar}>
      <form className="hdia" onSubmit={(e) => {
        e.preventDefault();
        if (!ok) return;
        const r = cambiarHorario(date, block.key, start, m, modo);
        if (!r.ok) { setError(r.error); return; }
        onCerrar();
        toast({ title: 'Horario cambiado', sub: `${block.title}: ${start} a ${toHHMM(toMin(start) + m)}`, color: color(block) }, false);
      }}>
        <div className="hdia-dos">
          <label>Empieza<input className="campo-texto mono" type="time" value={start} onChange={(e) => { setStart(e.target.value); setError(''); }} /></label>
          <label>Dura (min)<input className="campo-texto mono" inputMode="numeric" value={min} onChange={(e) => { setMin(e.target.value.replace(/\D/g, '')); setError(''); }} /></label>
        </div>
        <p className="sub mono">Termina a las {ok ? toHHMM(toMin(start) + m) : '—'}</p>
        <Modos modo={modo} setModo={(x) => { setModo(x); setError(''); }} />
        <p className="sub">{textoModo(modo)} La rutina no cambia: solo hoy.</p>
        {error && <p className="hdia-error" role="alert">{error}</p>}
        <button className="btn-principal" type="submit" disabled={!ok}>Guardar</button>
      </form>
    </Hoja>
  );
}

const RAMAS_META: (RamaOMain | '')[] = ['', 'programacion', 'matematica', 'trabajo', 'ingles', 'handyx', 'salud', 'main'];

/** Sumar una meta para hoy (surgió algo nuevo). */
export function HojaMetaNueva({ date, onCerrar }: { date: string; onCerrar: () => void }) {
  const ahora = Math.ceil(nowMin() / 5) * 5;
  const [titulo, setTitulo] = useState('');
  const [rama, setRama] = useState<RamaOMain | ''>('');
  const [start, setStart] = useState(toHHMM(Math.min(ahora, 21 * 60 + 30)));
  const [min, setMin] = useState('60');
  const [tareas, setTareas] = useState('');
  const [modo, setModo] = useState<Modo>('acortar');
  const [error, setError] = useState('');
  const m = Number(min);
  const ok = !!titulo.trim() && /^\d{2}:\d{2}$/.test(start) && m >= 5;
  return (
    <Hoja titulo="Meta para hoy" kicker="Surgió algo nuevo" onCerrar={onCerrar}>
      <form className="hdia" onSubmit={(e) => {
        e.preventDefault();
        if (!ok) return;
        const r = agregarMetaHoy(date, { titulo, rama: rama || undefined, start, min: m, tareas: tareas.split('\n') }, modo);
        if (!r.ok) { setError(r.error); return; }
        onCerrar();
        toast({ title: 'Meta sumada a hoy', sub: `${titulo.trim()} · ${start} a ${toHHMM(toMin(start) + m)}`, color: 'var(--tinta)' }, false);
      }}>
        <label>Qué es<input className="campo-texto" autoFocus value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Reunión con el cliente de Tsoft" /></label>
        <label>Rama
          <select className="campo-texto" value={rama} onChange={(e) => setRama(e.target.value as RamaOMain | '')}>
            {RAMAS_META.map((r) => <option key={r} value={r}>{r ? RAMA_NOMBRE[r] : 'Fuera del plan'}</option>)}
          </select>
        </label>
        <div className="hdia-dos">
          <label>Empieza<input className="campo-texto mono" type="time" value={start} onChange={(e) => { setStart(e.target.value); setError(''); }} /></label>
          <label>Dura (min)<input className="campo-texto mono" inputMode="numeric" value={min} onChange={(e) => { setMin(e.target.value.replace(/\D/g, '')); setError(''); }} /></label>
        </div>
        <label>Submetas (una por línea, opcional)<textarea className="campo-texto" rows={2} value={tareas} onChange={(e) => setTareas(e.target.value)} /></label>
        <Modos modo={modo} setModo={(x) => { setModo(x); setError(''); }} />
        <p className="sub">{textoModo(modo)} Si cae en medio de un bloque, ese se corta ahí.</p>
        {error && <p className="hdia-error" role="alert">{error}</p>}
        <button className="btn-principal" type="submit" disabled={!ok}>Sumar a hoy</button>
      </form>
    </Hoja>
  );
}
