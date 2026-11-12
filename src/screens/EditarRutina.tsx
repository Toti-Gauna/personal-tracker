import { useState } from 'react';
import { newId } from '../data/schedule';
import { exercisesMin, fmtH, setsLabel, stepsMin, totalMin } from '../data/train';
import type { Exercise, ExKind, Routine, Step } from '../data/train-types';
import { ir } from '../lib/routes';
import { useStore } from '../state/store';
import { deleteRoutine, saveRoutine } from '../state/train';
import '../styles/entreno.css';

type Sel = { sec: 'before' | 'exercises' | 'after'; id: string } | null;
const KINDS: [ExKind, string][] = [['pierna', 'Pierna (+5 kg)'], ['torso', 'Torso (+2,5 kg)'], ['aislamiento', 'Aislamiento (+1 kg)']];

const parseRest = (s: string) => {
  const m = s.trim().match(/^(\d+):(\d{2})$/);
  if (m) return Number(m[1]) * 60 + Number(m[2]);
  const n = Number(s.replace(/\D/g, ''));
  return n > 0 && n <= 20 ? n * 60 : n || 0;
};
const fmtRest = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

/** 5.3 Editar rutina: antes, ejercicios y después. */
export function EditarRutina({ id }: { id?: string }) {
  const rutinas = useStore((s) => s.train.routines);
  const base = rutinas.find((r) => r.id === id);
  const [r, setR] = useState<Routine>(() => base ?? { id: `r${newId()}`, name: '', desc: '', before: [], exercises: [], after: [] });
  const [sel, setSel] = useState<Sel>(null);
  const nueva = !base;

  const mover = (sec: 'before' | 'exercises' | 'after', i: number, d: number) =>
    setR((x) => {
      const arr = [...x[sec]] as unknown[];
      const j = i + d;
      if (j < 0 || j >= arr.length) return x;
      [arr[i], arr[j]] = [arr[j], arr[i]];
      return { ...x, [sec]: arr };
    });
  const quitar = (sec: 'before' | 'exercises' | 'after', itemId: string) => {
    setR((x) => ({ ...x, [sec]: (x[sec] as { id: string }[]).filter((e) => e.id !== itemId) }) as Routine);
    setSel(null);
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

  const valida = r.name.trim() && r.exercises.length > 0 && r.exercises.every((e) => e.name.trim());
  const guardar = () => {
    if (!valida) return;
    saveRoutine({ ...r, name: r.name.trim(), desc: r.desc.trim() || `${r.exercises.length} ejercicios`, before: r.before.filter((s) => s.name.trim()), after: r.after.filter((s) => s.name.trim()) });
    ir('entreno-semana');
  };

  const Fila = ({ sec, item, texto, extra }: { sec: 'before' | 'exercises' | 'after'; item: { id: string; name: string }; texto: string; extra: string }) => {
    const i = (r[sec] as { id: string }[]).findIndex((x) => x.id === item.id);
    const abierto = sel?.sec === sec && sel.id === item.id;
    return (
      <li className={abierto ? 'abierta' : ''}>
        <span className="orden">
          <button aria-label={`Subir ${texto}`} onClick={() => mover(sec, i, -1)} disabled={i === 0}>↑</button>
          <button aria-label={`Bajar ${texto}`} onClick={() => mover(sec, i, 1)} disabled={i === (r[sec] as unknown[]).length - 1}>↓</button>
        </span>
        <button className="fila-edit" aria-expanded={abierto} onClick={() => setSel(abierto ? null : { sec, id: item.id })}>
          <span>{texto || 'Sin nombre'}</span><span className="mono sub">{extra}</span><span aria-hidden="true">›</span>
        </button>
      </li>
    );
  };

  const selEx = sel?.sec === 'exercises' ? r.exercises.find((e) => e.id === sel.id) : undefined;
  const selStep = sel && sel.sec !== 'exercises' ? r[sel.sec].find((s) => s.id === sel.id) : undefined;

  return (
    <main className="pantalla editar-rutina">
      <div className="topbar">
        <a className="volver" href="#/entreno-semana">Cancelar</a>
        <span className="mono">~ {fmtH(totalMin({ ...r, exercises: r.exercises }))} en total</span>
      </div>
      <label className="etiqueta" htmlFor="rt-n">Rutina</label>
      <input id="rt-n" className="campo-grande" value={r.name} onChange={(e) => setR({ ...r, name: e.target.value })} placeholder="Piernas" />
      <input className="campo-texto" style={{ marginTop: 10 }} value={r.desc} onChange={(e) => setR({ ...r, desc: e.target.value })} placeholder="Qué trabaja (opcional)" aria-label="Descripción" />

      <div className="sec-cab"><span className="etiqueta">Antes</span><span className="mono sub">{stepsMin(r.before)} min</span></div>
      <ul className="rut-edit">{r.before.map((s) => <Fila key={s.id} sec="before" item={s} texto={s.name} extra={`${s.min} min`} />)}</ul>
      <button className="mas-fila" onClick={() => addStep('before')}>+ Paso antes</button>

      <div className="sec-cab"><span className="etiqueta">Ejercicios</span><span className="mono sub">~{exercisesMin({ ...r, exercises: r.exercises })} min</span></div>
      <ul className="rut-edit">{r.exercises.map((e) => <Fila key={e.id} sec="exercises" item={e} texto={e.name} extra={`${setsLabel(e)} · ${fmtRest(e.rest)}`} />)}</ul>
      <button className="mas-fila" onClick={addEx}>+ Ejercicio</button>

      <div className="sec-cab"><span className="etiqueta">Después</span><span className="mono sub">{stepsMin(r.after)} min</span></div>
      <ul className="rut-edit">{r.after.map((s) => <Fila key={s.id} sec="after" item={s} texto={s.name} extra={`${s.min} min`} />)}</ul>
      <button className="mas-fila" onClick={() => addStep('after')}>+ Paso después</button>

      {selEx && (
        <div className="panel-edit" role="group" aria-label={`Editando ${selEx.name}`}>
          <span className="etiqueta">Editando · {selEx.name || 'ejercicio nuevo'}</span>
          <input className="campo-texto" autoFocus={!selEx.name} value={selEx.name} onChange={(e) => editEx(selEx.id, { name: e.target.value })} placeholder="Nombre del ejercicio" aria-label="Nombre del ejercicio" />
          <div className="tres-campos">
            <label>Series<input className="campo-texto mono" inputMode="numeric" value={selEx.sets} onChange={(e) => editEx(selEx.id, { sets: Math.min(10, Number(e.target.value.replace(/\D/g, '')) || 0) })} /></label>
            <label>Reps<input className="campo-texto mono" inputMode="numeric" defaultValue={selEx.repMin === selEx.repMax ? String(selEx.repMin) : `${selEx.repMin}-${selEx.repMax}`} key={selEx.id}
              onChange={(e) => { const [a, b] = e.target.value.split(/[-–]/).map((x) => Number(x.replace(/\D/g, ''))); if (a > 0) editEx(selEx.id, { repMin: a, repMax: b >= a ? b : a }); }} aria-label="Repeticiones, por ejemplo 6-8" /></label>
            <label>Descanso<input className="campo-texto mono" inputMode="numeric" defaultValue={fmtRest(selEx.rest)} key={`${selEx.id}d`} onChange={(e) => { const v = parseRest(e.target.value); if (v > 0) editEx(selEx.id, { rest: v }); }} aria-label="Descanso, por ejemplo 3:00" /></label>
          </div>
          <label className="campo-kind">Cuánto sube el peso
            <select className="campo-texto" value={selEx.kind} onChange={(e) => editEx(selEx.id, { kind: e.target.value as ExKind })}>
              {KINDS.map(([k, n]) => <option key={k} value={k}>{n}</option>)}
            </select>
          </label>
          <button className="borrar" onClick={() => quitar('exercises', selEx.id)}>Quitar ejercicio</button>
        </div>
      )}
      {selStep && sel && sel.sec !== 'exercises' && (
        <div className="panel-edit" role="group" aria-label={`Editando ${selStep.name}`}>
          <span className="etiqueta">Editando · {selStep.name || 'paso nuevo'}</span>
          <div className="dos-campos">
            <label>Nombre<input className="campo-texto" autoFocus={!selStep.name} value={selStep.name} onChange={(e) => editStep(sel.sec as 'before' | 'after', selStep.id, { name: e.target.value })} aria-label="Nombre del paso" /></label>
            <label>Minutos<input className="campo-texto mono" inputMode="numeric" value={selStep.min} onChange={(e) => editStep(sel.sec as 'before' | 'after', selStep.id, { min: Number(e.target.value.replace(/\D/g, '')) || 0 })} /></label>
          </div>
          <button className="borrar" onClick={() => quitar(sel.sec, selStep.id)}>Quitar paso</button>
        </div>
      )}

      <button className="btn-principal" style={{ marginTop: 24 }} disabled={!valida} onClick={guardar}>Guardar rutina</button>
      {!nueva && <button className="terminar-foco" onClick={() => { deleteRoutine(r.id); ir('entreno-semana'); }}>Borrar rutina</button>}
    </main>
  );
}
