/**
 * Trazo 2.0 · Editar rutina (#/entreno-rutina/<id> y #/entreno-rutina/nueva): lo que va antes, los ejercicios (series, repeticiones,
 * descanso y cuánto sube el peso) y lo que va después. Cada fila se edita en una hoja; el orden se cambia con las flechas. Se guarda
 * con `saveRoutine` y se borra con `deleteRoutine`, como en la 1.0 (el borrado se puede deshacer).
 */
import { useState } from 'react';
import { newId } from '../../data/schedule';
import { exercisesMin, fmtH, setsLabel, stepsMin, totalMin } from '../../data/train';
import type { Exercise, ExKind, Routine, Step } from '../../data/train-types';
import { ir } from '../../lib/routes';
import { getState, setState, useStore } from '../../state/store';
import { deleteRoutine, saveRoutine } from '../../state/train';
import { Icono } from '../iconos';
import { aviso } from '../kit/capas';
import { Boton, CampoTexto, Contador, Selector } from '../kit/controles';
import { Hoja } from '../kit/hoja';
import { Dato } from '../kit/superficies';
import { Grupo, Marco } from '../marco/Marco';
import type { PropsV2 } from '../registro';
import { Etiquetado } from './piezas';
import './ajustes.css';

type Sec = 'before' | 'exercises' | 'after';
type Sel = { sec: Sec; id: string } | null;
const KINDS: { valor: ExKind; etiqueta: string }[] = [{ valor: 'pierna', etiqueta: 'Pierna (+5 kg)' }, { valor: 'torso', etiqueta: 'Torso (+2,5 kg)' }, { valor: 'aislamiento', etiqueta: 'Aislamiento (+1 kg)' }];
const fmtRest = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

const INFO = (
  <>
    <p className="t-cuerpo-l">Una rutina tiene tres partes: lo que hacés antes, los ejercicios y lo que hacés después.</p>
    <p className="t-cuerpo">Tocá una fila para editarla y usá las flechas para cambiar el orden. "Cuánto sube el peso" dice cuánto suma Trazo cuando completás todas las series en el tope del rango.</p>
    <p className="t-cuerpo">Cada persona ajusta sus propios rangos de repeticiones en la sesión.</p>
  </>
);

function Fila({ texto, extra, i, n, nombre, onAbrir, onMover }: { texto: string; extra: string; i: number; n: number; nombre: string; onAbrir: () => void; onMover: (d: number) => void }) {
  return (
    <li className="ax-item">
      <button type="button" className="s-fila s-tocable ax-item-main" aria-label={`Editar ${nombre}: ${texto || 'sin nombre'}, ${extra}`} onClick={onAbrir}>
        <span className="s-fila-texto"><b>{texto || 'Sin nombre'}</b><small className="t-dato">{extra}</small></span>
        <Icono nombre="editar" lado={18} className="icono s-chevron" />
      </button>
      <span className="ax-mover">
        <button type="button" aria-label={`Subir ${texto || 'el elemento'}`} aria-disabled={i === 0 || undefined} onClick={() => i > 0 && onMover(-1)}><Icono nombre="arriba" lado={20} /></button>
        <button type="button" aria-label={`Bajar ${texto || 'el elemento'}`} aria-disabled={i === n - 1 || undefined} onClick={() => i < n - 1 && onMover(1)}><Icono nombre="abajo" lado={20} /></button>
      </span>
    </li>
  );
}

export default function RutinaV2({ ruta }: PropsV2) {
  const id = ruta.param && ruta.param !== 'nueva' ? ruta.param : undefined;
  const rutinas = useStore((s) => s.train.routines);
  const base = rutinas.find((r) => r.id === id);
  const [r, setR] = useState<Routine>(() => base ?? { id: `r${newId()}`, name: '', desc: '', before: [], exercises: [], after: [] });
  const [sel, setSel] = useState<Sel>(null);
  const nueva = !base;

  const mover = (sec: Sec, i: number, d: number) =>
    setR((x) => {
      const arr = [...x[sec]] as unknown[];
      const j = i + d;
      if (j < 0 || j >= arr.length) return x;
      [arr[i], arr[j]] = [arr[j], arr[i]];
      return { ...x, [sec]: arr };
    });
  const quitar = (sec: Sec, itemId: string) => {
    const lista = r[sec] as { id: string; name: string }[];
    const i = lista.findIndex((e) => e.id === itemId);
    const item = lista[i];
    if (!item) return;
    setR((x) => ({ ...x, [sec]: (x[sec] as { id: string }[]).filter((e) => e.id !== itemId) }) as Routine);
    setSel(null);
    aviso({ titulo: sec === 'exercises' ? 'Ejercicio quitado' : 'Paso quitado', sub: item.name || 'Sin nombre', deshacer: () => setR((x) => {
      const arr = [...(x[sec] as unknown[])];
      arr.splice(Math.min(i, arr.length), 0, item);
      return { ...x, [sec]: arr } as Routine;
    }) });
  };
  const addStep = (sec: 'before' | 'after') => {
    const s: Step = { id: `s${newId()}`, name: '', min: 5 };
    setR((x) => ({ ...x, [sec]: [...x[sec], s] }));
    setSel({ sec, id: s.id });
  };
  const addEx = () => {
    const e: Exercise = { id: `e${newId()}`, name: '', sets: 3, repMin: 8, repMax: 10, rest: 90, kind: 'torso' };
    setR((x) => ({ ...x, exercises: [...x.exercises, e] }));
    setSel({ sec: 'exercises', id: e.id });
  };
  const editStep = (sec: 'before' | 'after', itemId: string, p: Partial<Step>) => setR((x) => ({ ...x, [sec]: x[sec].map((s) => (s.id === itemId ? { ...s, ...p } : s)) }));
  const editEx = (itemId: string, p: Partial<Exercise>) => setR((x) => ({ ...x, exercises: x.exercises.map((e) => (e.id === itemId ? { ...e, ...p } : e)) }));

  const motivo = !r.name.trim() ? 'Poné un nombre.' : r.exercises.length === 0 ? 'Agregá al menos un ejercicio.' : r.exercises.some((e) => !e.name.trim()) ? 'Todos los ejercicios necesitan nombre.' : false;
  const guardar = () => {
    if (motivo) return;
    saveRoutine({ ...r, name: r.name.trim(), desc: r.desc.trim() || `${r.exercises.length} ejercicios`, before: r.before.filter((s) => s.name.trim()), after: r.after.filter((s) => s.name.trim()) });
    ir('entreno-semana');
  };
  const borrar = () => {
    if (!base) return;
    const antes = getState().train;
    const indice = antes.routines.findIndex((x) => x.id === base.id);
    deleteRoutine(base.id);
    aviso({ titulo: 'Rutina borrada', sub: base.name, deshacer: () => setState((s) => ({
      ...s,
      train: {
        ...s.train,
        routines: s.train.routines.some((x) => x.id === base.id) ? s.train.routines : [...s.train.routines.slice(0, indice), base, ...s.train.routines.slice(indice)],
        plan: { ...s.train.plan, days: s.train.plan.days.map((d, i) => (d == null && antes.plan.days[i] === base.id ? base.id : d)) },
      },
    })) });
    ir('entreno-semana');
  };

  const selEx = sel?.sec === 'exercises' ? r.exercises.find((e) => e.id === sel.id) : undefined;
  const selStep = sel && sel.sec !== 'exercises' ? r[sel.sec].find((s) => s.id === sel.id) : undefined;
  const nombreSel = selEx ? selEx.name || 'Ejercicio nuevo' : selStep ? selStep.name || 'Paso nuevo' : 'Editar';

  const lista = (sec: Sec) => (
    <ul className="capa-1 ax-items">
      {(r[sec] as { id: string; name: string }[]).map((x, i, a) => {
        const e = sec === 'exercises' ? (x as Exercise) : null;
        const s = sec !== 'exercises' ? (x as Step) : null;
        return <Fila key={x.id} i={i} n={a.length} nombre={sec === 'exercises' ? 'ejercicio' : 'paso'} texto={x.name} extra={e ? `${setsLabel(e)} · ${fmtRest(e.rest)}` : `${s!.min} min`}
          onAbrir={() => setSel({ sec, id: x.id })} onMover={(d) => mover(sec, i, d)} />;
      })}
    </ul>
  );

  return (
    <Marco className="ax" titulo={nueva ? 'Nueva rutina' : 'Editar rutina'} volver={{ href: '#/entreno', nombre: 'Entreno' }} info={INFO}>
      <div className="capa-1 ax-form">
        <CampoTexto etiqueta="Nombre de la rutina" valor={r.name} onCambio={(v) => setR({ ...r, name: v })} placeholder="Piernas" />
        <CampoTexto etiqueta="Qué trabaja (opcional)" valor={r.desc} onCambio={(v) => setR({ ...r, desc: v })} />
        <Dato valor={fmtH(totalMin(r))} etiqueta="duración total" />
      </div>

      <Grupo titulo="Antes" extremo={<span className="t-dato t-nota">{stepsMin(r.before)} min</span>}>
        {lista('before')}
        <Boton ancho icono="mas" onClick={() => addStep('before')}>Paso antes</Boton>
      </Grupo>
      <Grupo titulo="Ejercicios" extremo={<span className="t-dato t-nota">~{exercisesMin({ ...r })} min</span>}>
        {lista('exercises')}
        <Boton ancho icono="mas" onClick={addEx}>Ejercicio</Boton>
      </Grupo>
      <Grupo titulo="Después" extremo={<span className="t-dato t-nota">{stepsMin(r.after)} min</span>}>
        {lista('after')}
        <Boton ancho icono="mas" onClick={() => addStep('after')}>Paso después</Boton>
      </Grupo>

      <Boton variante="primario" ancho icono="tilde" deshabilitado={motivo} onClick={guardar}>Guardar rutina</Boton>
      {!nueva && <Boton variante="peligro" ancho icono="borrar" onClick={borrar}>Borrar rutina</Boton>}

      <Hoja abierta={!!(selEx || selStep)} onCerrar={() => setSel(null)} titulo={nombreSel}
        pie={<><Boton variante="peligro" icono="borrar" onClick={() => sel && quitar(sel.sec, sel.id)}>{selEx ? 'Quitar ejercicio' : 'Quitar paso'}</Boton><Boton variante="primario" icono="tilde" onClick={() => setSel(null)}>Listo</Boton></>}>
        {selEx && (
          <div className="ax-editar" role="group" aria-label={`Editando ${selEx.name || 'ejercicio nuevo'}`}>
            <CampoTexto etiqueta="Nombre del ejercicio" valor={selEx.name} onCambio={(v) => editEx(selEx.id, { name: v })} />
            <Etiquetado etiqueta="Series"><Contador etiqueta="Series" valor={selEx.sets} onCambio={(v) => editEx(selEx.id, { sets: v })} min={1} max={10} /></Etiquetado>
            <Etiquetado etiqueta={selEx.unidad === 's' ? 'Segundos mínimos' : 'Repeticiones mínimas'}><Contador etiqueta={selEx.unidad === 's' ? 'Segundos mínimos' : 'Repeticiones mínimas'} valor={selEx.repMin} onCambio={(v) => editEx(selEx.id, { repMin: v, repMax: Math.max(selEx.repMax, v) })} min={1} max={200} /></Etiquetado>
            <Etiquetado etiqueta={selEx.unidad === 's' ? 'Segundos máximos' : 'Repeticiones máximas'}><Contador etiqueta={selEx.unidad === 's' ? 'Segundos máximos' : 'Repeticiones máximas'} valor={selEx.repMax} onCambio={(v) => editEx(selEx.id, { repMax: Math.max(v, selEx.repMin) })} min={1} max={200} /></Etiquetado>
            <Etiquetado etiqueta="Descanso"><Contador etiqueta="Descanso en segundos" valor={selEx.rest} onCambio={(v) => editEx(selEx.id, { rest: v })} min={5} max={600} paso={15} unidad="s" /></Etiquetado>
            <p className="t-nota">Descanso de {fmtRest(selEx.rest)}.</p>
            <Selector etiqueta="Cuánto sube el peso" valor={selEx.kind} opciones={KINDS} onCambio={(k) => editEx(selEx.id, { kind: k })} />
          </div>
        )}
        {selStep && sel && sel.sec !== 'exercises' && (
          <div className="ax-editar" role="group" aria-label={`Editando ${selStep.name || 'paso nuevo'}`}>
            <CampoTexto etiqueta="Nombre del paso" valor={selStep.name} onCambio={(v) => editStep(sel.sec as 'before' | 'after', selStep.id, { name: v })} />
            <Etiquetado etiqueta="Minutos"><Contador etiqueta="Minutos" valor={selStep.min} onCambio={(v) => editStep(sel.sec as 'before' | 'after', selStep.id, { min: v })} min={0} max={240} unidad="min" /></Etiquetado>
          </div>
        )}
      </Hoja>
    </Marco>
  );
}
