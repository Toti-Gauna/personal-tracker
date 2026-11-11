import { useState } from 'react';
import { BLOCKS } from '../data/defaults';
import { presetLabel, presetPattern } from '../data/pomodoro';
import { deletePreset, savePreset, useStore } from '../state/store';
import { toast } from '../ui/avisos';
import { PlanBar } from '../ui/Plan';
import '../styles/foco.css';

const titulo = (key: string) => BLOCKS.find((b) => b.key === key)?.title.split(' · ')[0] ?? key;

function Paso({ label, value, fmt, onChange, min, max, step }: {
  label: string; value: number; fmt: (v: number) => string; onChange: (v: number) => void; min: number; max: number; step: number;
}) {
  return (
    <div className="paso">
      <span>{label}</span>
      <div className="stepper">
        <button type="button" aria-label={`Menos ${label.toLowerCase()}`} onClick={() => onChange(Math.max(min, value - step))}>−</button>
        <output aria-label={label}>{fmt(value)}</output>
        <button type="button" aria-label={`Más ${label.toLowerCase()}`} onClick={() => onChange(Math.min(max, value + step))}>+</button>
      </div>
    </div>
  );
}

/** 1.6 Pomodoros a medida: crear presets y asignarlos a cada bloque. */
export function Pomodoros() {
  const settings = useStore((s) => s.settings)!;
  const enFoco = useStore((s) => !!s.focus);
  const [nombre, setNombre] = useState('');
  const [focus, setFocusMin] = useState(45);
  const [rest, setRest] = useState(10);
  const [cycles, setCycles] = useState(2);
  const [longRest, setLongRest] = useState(0);
  const [asignar, setAsignar] = useState('');

  const asignadoA = (id: string) =>
    Object.entries(settings.blockPresets).filter(([, v]) => v === id).map(([k]) => titulo(k));

  const guardar = (e: React.FormEvent) => {
    e.preventDefault();
    const name = nombre.trim() || `${focus}/${rest}`;
    savePreset({ name, focus, rest, cycles, longRest: longRest || undefined }, asignar || undefined);
    toast({ title: 'Pomodoro guardado', sub: asignar ? `${name} · asignado a ${titulo(asignar)}` : name, color: 'var(--salud)' }, false);
    setNombre('');
  };

  return (
    <main className="pantalla pomodoros">
      <div className="topbar">
        <a className="volver" href={enFoco ? '#/foco' : '#/hoy'}>{enFoco ? 'Foco' : 'Hoy'}</a>
      </div>
      <div className="kicker">Concentración / descanso</div>
      <h1 className="titulo">Pomodoros</h1>

      <ul className="presets">
        {settings.presets.map((p) => {
          const a = asignadoA(p.id);
          return (
            <li key={p.id}>
              <div className="preset-cab">
                <b>{p.name}</b>
                <span className="mono">{presetLabel(p)}</span>
              </div>
              <PlanBar segs={presetPattern(p)} color="var(--tinta)" restColor="var(--salud)" />
              <div className="preset-pie">
                <span className="sub">{a.length ? `Asignado a: ${a.join(', ')}` : 'Sin asignar'}</span>
                <button className="borrar" onClick={() => deletePreset(p.id)} aria-label={`Borrar ${p.name}`}>Borrar</button>
              </div>
            </li>
          );
        })}
      </ul>

      <form className="nuevo" onSubmit={guardar}>
        <div className="etiqueta">Nuevo</div>
        <input className="campo-texto" placeholder="Nombre (opcional)" value={nombre} onChange={(e) => setNombre(e.target.value)} aria-label="Nombre del pomodoro" />
        <Paso label="Concentración" value={focus} onChange={setFocusMin} min={5} max={180} step={5} fmt={(v) => `${v} m`} />
        <Paso label="Descanso" value={rest} onChange={setRest} min={0} max={30} step={5} fmt={(v) => `${v} m`} />
        <Paso label="Ciclos" value={cycles} onChange={setCycles} min={1} max={8} step={1} fmt={String} />
        <Paso label="Descanso largo" value={longRest} onChange={setLongRest} min={0} max={45} step={5} fmt={(v) => (v ? `${v} m` : '—')} />
        <label className="paso">
          <span>Asignar a</span>
          <select className="campo-texto select" value={asignar} onChange={(e) => setAsignar(e.target.value)}>
            <option value="">Ningún bloque</option>
            {BLOCKS.map((b) => <option key={b.key} value={b.key}>{b.title}</option>)}
          </select>
        </label>
        <div className="paso"><span>Sonido al terminar: <b>Campana de bronce</b></span></div>
        <PlanBar segs={presetPattern({ id: 'x', name: '', focus, rest, cycles, longRest })} color="var(--tinta)" restColor="var(--salud)" />
        <button className="btn-principal" type="submit">Guardar pomodoro</button>
      </form>
    </main>
  );
}
