import { useState } from 'react';
import { fmtKg, nextFor, sessionsInWeek, volume } from '../data/train';
import { fmtFecha } from '../data/time';
import type { DayLog } from '../data/types';
import { ir } from '../lib/routes';
import { useStore } from '../state/store';
import { setNote } from '../state/train';
import '../styles/entreno.css';

const kgs = (n: number) => Math.round(n).toLocaleString('es-AR');

/** 5.7 Resumen y próxima vez. */
export function ResumenEntreno({ id }: { day?: DayLog; id?: string }) {
  const t = useStore((s) => s.train);
  const names = useStore((s) => s.settings!.names);
  const s = t.sessions.find((x) => x.id === id);
  const [nota, setNota] = useState(s?.note ?? '');
  if (!s) {
    return <main className="pantalla"><a className="volver" href="#/entreno">Entreno</a><p>No encontré ese entreno.</p></main>;
  }
  const r = t.routines.find((x) => x.id === s.routineId);
  const esta = sessionsInWeek(t, s.date);
  const planeadas = t.plan.days.filter((d) => d && d !== 'descanso').length;
  // Lo próximo se calcula sobre el historial completo, que ya incluye esta sesión.
  const prox = r ? nextFor(t, r, s.athletes, s.date).filter((p) => p.target.kind !== 'nuevo') : [];
  const interesantes = prox.filter((p) => p.target.kind === 'sube' || p.target.kind === 'baja' || p.target.kind === 'mantiene' || p.target.kind === 'falta').slice(0, 4);
  const lista = (interesantes.length ? interesantes : prox).slice(0, 4);

  return (
    <main className="pantalla resumen-entreno" style={{ ['--c' as string]: 'var(--salud)' }}>
      <div className="etiqueta" style={{ color: 'var(--salud)' }}>Sesión terminada · {fmtFecha(s.date)}</div>
      <h1 className="titulo"><span className="resaltado">{s.routineName}</span>, hecha.</h1>

      <div className="cuatro-datos">
        <div><b className="mono">{s.minutes} min</b><span>duración</span></div>
        <div><b className="mono">{esta.length}/{planeadas}</b><span>entrenos esta semana</span></div>
        {s.athletes.map((w) => (
          <div key={w}><b className="mono">{kgs(volume(s.sets, w))}</b><span>kg movidos · {names[w]}</span></div>
        ))}
      </div>

      {s.deload && <p className="sub">Semana de descarga: mismo peso y la mitad de las series. No cuenta para la progresión.</p>}

      <div className="etiqueta rep-t">Récords de hoy</div>
      {s.records.length ? (
        <ul className="records">
          {s.records.map((x) => (
            <li key={`${x.who}${x.ex}`}><span><b>{x.name} · {names[x.who]}</b><small>{x.text}</small></span><span className="mono">{fmtKg(x.kg)} × {x.reps}</span></li>
          ))}
        </ul>
      ) : (
        <p className="sub">Hoy no hubo récords. El primer entreno de cada ejercicio fija la marca.</p>
      )}

      {s.skipped.length > 0 && (
        <p className="sub quedaron">Quedaron sin hacer: {s.skipped.map((id) => r?.exercises.find((e) => e.id === id)?.name ?? id).join(', ')}. Pasan al principio de la próxima {s.routineName}; no cuentan como falla.</p>
      )}

      <div className="fila-t rep-t"><span className="etiqueta">La próxima {s.routineName.toLowerCase()}</span><a className="subrayado" href="#/entreno-motor">ver todo</a></div>
      <ul className="records proximas">
        {lista.map((p) => (
          <li key={`${p.who}${p.ex.id}`}>
            <span><b>{p.ex.name} · {names[p.who]}</b><small>{p.last ? `Hiciste ${p.last.reps.join(' ')}: ${p.target.note}` : p.target.note}</small></span>
            <span className={`mono${p.target.kind === 'sube' ? ' verde' : p.target.kind === 'baja' ? ' rojo' : ''}`}>
              {p.target.kind === 'sube' ? `${fmtKg(p.last?.kg ?? 0)} → ${fmtKg(p.target.kg)} kg` : `${fmtKg(p.target.kg)} × ${p.target.reps.join(' ')}`}
            </span>
          </li>
        ))}
      </ul>

      <label className="etiqueta rep-t" htmlFor="nota-e">Nota de la sesión</label>
      <textarea id="nota-e" className="campo-texto" rows={3} value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Rodilla bien. Subir sentadilla el lunes." />
      <button className="btn-principal" style={{ marginTop: 18 }} onClick={() => { setNote(s.id, nota.trim()); ir('hoy'); }}>Guardar y volver a Hoy</button>
    </main>
  );
}
