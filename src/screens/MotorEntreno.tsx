import { fmtKg, nextFor, plannedFor, restLabel } from '../data/train';
import { RULES } from '../data/train-catalog';
import { fmtFecha } from '../data/time';
import type { DayLog } from '../data/types';
import { useStore } from '../state/store';
import '../styles/entreno.css';

/** Sesiones de ejemplo: press de banca 3 × 8-10. */
const EJEMPLO = [
  { kg: 80, reps: [8, 8, 8], tag: 'S1' },
  { kg: 80, reps: [9, 9, 8], tag: 'S2' },
  { kg: 80, reps: [10, 10, 9], tag: 'S3' },
  { kg: 80, reps: [10, 10, 10], tag: 'S4 ✓' },
  { kg: 82.5, reps: [8, 8, 8], tag: 'S5 · sube', sube: true },
];

/** 5.5 Motor de entreno: sobrecarga progresiva, con lo que sigue para cada uno. */
export function MotorEntreno({ day }: { day: DayLog }) {
  const t = useStore((s) => s.train);
  const names = useStore((s) => s.settings!.names);
  const plan = plannedFor(t, day.date);
  const r = plan.routine ?? t.routines.find((x) => x.id === t.sessions[t.sessions.length - 1]?.routineId) ?? t.routines[0];
  const whos = t.active?.athletes ?? t.sessions[t.sessions.length - 1]?.athletes ?? (['me', 'partner'] as const);
  const prox = nextFor(t, r, [...whos], day.date);
  const hay = t.sessions.length > 0;

  return (
    <main className="pantalla motor-entreno">
      <div className="topbar"><a className="volver" href={t.active ? '#/entreno-sesion/' + t.active.routineId : '#/entreno'}>{t.active ? 'Sesión' : 'Entreno'}</a></div>
      <h1 className="titulo">Motor de entreno</h1>
      <p className="sub">Calcula cuánto levantar cada vez: primero sumás repeticiones dentro del rango y, cuando todas las series llegan al tope, sube el peso.</p>

      <div className="fila-t ejemplo-cab"><span className="etiqueta">Ejemplo · press de banca, 3 × 8-10</span><span className="mono sub">{names.me}</span></div>
      <div className="ejemplo" role="img" aria-label="Cinco sesiones: 8 8 8, 9 9 8, 10 10 9, 10 10 10 y, con 82,5 kg, 8 8 8">
        {EJEMPLO.map((s) => (
          <div key={s.tag} className={s.sube ? 'sube' : ''}>
            <span className="barras">{s.reps.map((x, i) => <i key={i} style={{ height: `${x * 7}px` }} className={x >= 10 ? 'tope' : ''} />)}</span>
            <b className="mono">{fmtKg(s.kg)}</b>
            <span className="mono sub">{s.reps.join(' ')}</span>
            <span className="mono sub">{s.tag}</span>
          </div>
        ))}
      </div>
      <p className="sub">Cada barra es una sesión y su altura, las repeticiones. En la cuarta las tres series llegan a 10: la próxima sube a 82,5 kg y vuelve a 8.</p>

      <div className="etiqueta rep-t">Reglas</div>
      <dl className="reglas-motor">
        <div><dt>Doble progresión<small>Dentro del rango sumás repeticiones; al tope, sube el peso y volvés al mínimo.</small></dt><dd className="mono">reps → kg</dd></div>
        <div><dt>Cuánto sube<small>Piernas y peso muerto · torso · aislamiento.</small></dt><dd className="mono">+{fmtKg(RULES.inc.pierna)} · +{fmtKg(RULES.inc.torso)} · +{fmtKg(RULES.inc.aislamiento)} kg</dd></div>
        <div><dt>Objetivo de cada sesión<small>+1 repetición en la serie más baja, sin pasar el tope.</small></dt><dd className="mono">+1 rep</dd></div>
        <div><dt>Si se estanca<small>2 sesiones iguales: se mantiene. 3 sesiones: baja 10 % y vuelve a subir.</small></dt><dd className="mono">−10 %</dd></div>
        <div><dt>Semana de descarga<small>Mismo peso y la mitad de las series, para recuperar. No cuenta en la progresión.</small></dt><dd className="mono">cada {RULES.deloadEvery} sem.</dd></div>
        <div><dt>Cada uno con lo suyo<small>{names.me} y {names.partner} tienen rangos, pesos y récords separados.</small></dt><dd className="mono">por persona</dd></div>
        <div><dt>Si no llegás a todo<small>Lo que queda pasa al principio de la próxima y no frena la progresión.</small></dt><dd className="mono">no es falla</dd></div>
      </dl>

      <div className="fila-t rep-t"><span className="etiqueta">Próxima {r.name.toLowerCase()}{plan.routine ? ` · ${fmtFecha(day.date).toLowerCase()}` : ''}</span><span className="mono sub">calculado</span></div>
      {!hay && <p className="sub">Todavía no entrenaste: la primera vez elegís tu peso en cada ejercicio y desde ahí el motor calcula.</p>}
      <div className="proxima-tabla" style={{ ['--cols' as string]: whos.length }}>
        <div className="mono cab"><span>EJERCICIO</span>{whos.map((w) => <span key={w}>{names[w].toUpperCase()}</span>)}</div>
        {r.exercises.map((e) => (
          <div key={e.id} className="fila">
            <b>{e.name}<small>{restLabel(e.rest)}</small></b>
            {whos.map((w) => {
              const p = prox.find((x) => x.ex.id === e.id && x.who === w)!;
              return (
                <span key={w} className="mono">
                  {p.target.kg ? `${fmtKg(p.target.kg)} × ${p.target.reps.join(' ')}` : `— × ${p.target.reps.join(' ')}`}
                  <small className={p.target.kind === 'sube' ? 'verde' : p.target.kind === 'mantiene' || p.target.kind === 'baja' ? 'rojo' : ''}>{p.target.note}</small>
                </span>
              );
            })}
          </div>
        ))}
      </div>
    </main>
  );
}
