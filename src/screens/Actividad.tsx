import { useState } from 'react';
import { AREAS, BLOCKS } from '../data/defaults';
import { minutesFor } from '../data/study-catalog';
import type { ActType, Activity } from '../data/study-types';
import { newId } from '../data/schedule';
import { fmtDur } from '../data/time';
import type { Area } from '../data/types';
import { ir } from '../lib/routes';
import { useStore } from '../state/store';
import { addFront, deleteActivity, saveActivity } from '../state/study';
import { toast } from '../ui/avisos';
import '../styles/estudio.css';

const TIPOS: { id: ActType; name: string; unit: string }[] = [
  { id: 'lectura', name: 'Lectura', unit: 'págs' },
  { id: 'curso', name: 'Curso', unit: 'lecciones' },
  { id: 'practica', name: 'Práctica', unit: 'min' },
  { id: 'video', name: 'Video', unit: 'videos' },
  { id: 'otra', name: 'Otra', unit: 'min' },
];
const DIAS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const COLORES: Area[] = ['ing', 'salud', 'handyx', 'eclipse', 'rutina', 'economia'];

/** 2.4 Actividad de estudio: cualquier cosa que estudies entra en tu día y en el repaso. */
export function Actividad({ id }: { id?: string }) {
  const study = useStore((s) => s.study);
  const prev = study.activities.find((a) => a.id === id);
  const [a, setA] = useState<Activity>(
    prev ?? { id: `a${newId()}`, title: '', front: study.fronts[2]?.id ?? study.fronts[0].id, type: 'lectura', perSession: 20, total: 300, unit: 'págs', days: [0, 2, 4], block: 'cierre', engine: true, progress: 0, testMode: 'app' },
  );
  const [nuevo, setNuevo] = useState<string | null>(null);
  const set = (p: Partial<Activity>) => setA((x) => ({ ...x, ...p }));
  const block = BLOCKS.find((b) => b.key === a.block);

  const guardar = () => {
    saveActivity({ ...a, title: a.title.trim() });
    toast({ title: prev ? 'Actividad guardada' : 'Actividad nueva', sub: `${a.title.trim()} · ${a.days.map((d) => DIAS[d]).join(' ')}`, color: 'var(--salud)' }, false);
    ir('estudio');
  };

  return (
    <main className="pantalla actividad">
      <div className="topbar">
        <a className="volver" href="#/estudio">Cancelar</a>
        <span className="mono">{prev ? 'editar actividad' : 'nueva actividad'}</span>
      </div>
      <h1 className="titulo">Actividad de estudio</h1>
      <p className="sub">Cualquier cosa que estudies: un libro, un curso, práctica o un video. Entra en tu día y en el repaso.</p>

      <label className="etiqueta" htmlFor="act-t">Qué vas a estudiar</label>
      <input id="act-t" className="campo-grande" value={a.title} onChange={(e) => set({ title: e.target.value })} placeholder="Leer Make It Stick" />

      <span className="etiqueta">Frente</span>
      <div className="chips" role="radiogroup" aria-label="Frente">
        {study.fronts.map((f) => (
          <button key={f.id} role="radio" aria-checked={a.front === f.id} onClick={() => set({ front: f.id })}><i style={{ background: AREAS[f.color].css }} />{f.name}</button>
        ))}
        {nuevo == null ? (
          <button className="nuevo-chip" onClick={() => setNuevo('')}>+ Nuevo</button>
        ) : (
          <form onSubmit={(e) => { e.preventDefault(); if (nuevo.trim()) set({ front: addFront(nuevo.trim(), COLORES[study.fronts.length % COLORES.length]) }); setNuevo(null); }}>
            <input className="campo-texto" autoFocus value={nuevo} onChange={(e) => setNuevo(e.target.value)} placeholder="Nombre del frente" aria-label="Nombre del frente nuevo" />
          </form>
        )}
      </div>

      {!prev?.units && (
        <>
          <span className="etiqueta">Tipo</span>
          <div className="segmentado" role="radiogroup" aria-label="Tipo">
            {TIPOS.map((t) => (
              <button key={t.id} role="radio" aria-checked={a.type === t.id} onClick={() => set({ type: t.id, unit: t.unit })}>{t.name}</button>
            ))}
          </div>
          <div className="dos-campos">
            <label>Por sesión<input className="campo-texto mono" inputMode="numeric" value={a.perSession} onChange={(e) => set({ perSession: Number(e.target.value.replace(/\D/g, '')) || 0 })} aria-describedby="u1" /><small id="u1">{a.unit} · ~{fmtDur(minutesFor(a))}</small></label>
            <label>Total<input className="campo-texto mono" inputMode="numeric" value={a.total} onChange={(e) => set({ total: Number(e.target.value.replace(/\D/g, '')) || 0 })} /><small>{a.unit} · vas {a.progress}</small></label>
          </div>
        </>
      )}

      <span className="etiqueta">Cuándo</span>
      <div className="dias">
        {DIAS.map((d, i) => (
          <button key={d} aria-pressed={a.days.includes(i)} aria-label={d} onClick={() => set({ days: a.days.includes(i) ? a.days.filter((x) => x !== i) : [...a.days, i].sort() })}>{d}</button>
        ))}
      </div>

      <div className="fila-ajuste">
        <span className="sub">En el bloque</span>
        <select className="campo-texto select" value={a.block} onChange={(e) => set({ block: e.target.value })} aria-label="Bloque">
          {BLOCKS.map((b) => <option key={b.key} value={b.key}>{b.fixed ?? ''} {b.title}</option>)}
        </select>
      </div>
      {block && <p className="sub nota-izq">{block.title} · {fmtDur(block.min)}</p>}

      <div className="fila-ajuste">
        <span>Pasar por el motor de repaso<small>Cold recall al día siguiente{a.units ? ', tesis a +3 y ejercicios a +7, +21 y +60' : ''}</small></span>
        <button role="switch" className="switch" aria-checked={a.engine} aria-label="Pasar por el motor de repaso" onClick={() => set({ engine: !a.engine })} />
      </div>
      {a.units && (
        <div className="fila-ajuste">
          <span>Test en papel<small>Si no, lo cargás en la app</small></span>
          <button role="switch" className="switch" aria-checked={a.testMode === 'papel'} aria-label="Test en papel" onClick={() => set({ testMode: a.testMode === 'papel' ? 'app' : 'papel' })} />
        </div>
      )}

      <button className="btn-principal" style={{ marginTop: 24 }} disabled={!a.title.trim() || !a.days.length} onClick={guardar}>Guardar actividad</button>
      {prev && (
        <button className="terminar-foco" onClick={() => { deleteActivity(prev.id); ir('estudio'); }}>Borrar actividad</button>
      )}
    </main>
  );
}
