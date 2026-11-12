import { useEffect, useMemo, useRef } from 'react';
import { fmtKg, history, nextTarget, clock, rangeOf, recordsFor, restLabel, volume } from '../data/train';
import type { RestTimer, Who } from '../data/train-types';
import { ir } from '../lib/routes';
import { useStore } from '../state/store';
import {
  addRest, cancelTraining, exerciseAt, exerciseDone, doneWith, extendLimit, finishTraining, goToExercise, logSet,
  markRestWarned, noLimit, nudge, plannedSets, setRestMode, setWho, setsFor, skipRest, undoLastSet,
} from '../state/train';
import { toast } from '../ui/avisos';
import { useNow } from '../ui/useNow';
import '../styles/entreno.css';

const SALUD = 'var(--salud)';
const ms = (s: number) => Math.max(0, Math.ceil(s / 1000));

/** 5.4 Sesión en pareja (y 5.6 Se terminó el tiempo). */
export function SesionEntreno() {
  const t = useStore((s) => s.train);
  const names = useStore((s) => s.settings!.names);
  const now = useNow(250);
  const a = t.active;
  const r = a ? t.routines.find((x) => x.id === a.routineId) : undefined;
  const avisados = useRef(new Set<string>());

  // Avisa cuando termina un descanso.
  useEffect(() => {
    if (!a || !r) return;
    for (const key of ['shared', 'me', 'partner'] as const) {
      const rt = a.rest[key];
      if (rt && !rt.warned && now >= rt.endsAt) {
        markRestWarned(key);
        const e = exerciseAt(a, r);
        const who: Who | null = key === 'shared' ? null : key;
        const n = (who ? setsFor(a, who, e.id).length : Math.min(...a.athletes.map((w) => setsFor(a, w, e.id).length))) + 1;
        const lbl = key === 'shared' ? 'Terminó el descanso' : `${names[key]}, a la serie ${n}`;
        const id = `${key}${rt.endsAt}`;
        if (!avisados.current.has(id)) {
          avisados.current.add(id);
          toast({ title: lbl, sub: `${e.name}${key !== 'shared' ? ` · terminó su descanso` : ''}`, color: SALUD, evento: 'entreno' }, true);
        }
      }
    }
  }, [now, a, r, names]);

  const target = useMemo(() => {
    if (!a || !r) return null;
    const e = exerciseAt(a, r);
    return Object.fromEntries(a.athletes.map((w) => {
      const h = history(t.sessions, w, e.id);
      return [w, { t: nextTarget(h, e, rangeOf(t, w, e), a.deload), last: h[h.length - 1], range: rangeOf(t, w, e) }];
    }));
  }, [a, r, t]);

  if (!a || !r || !target) {
    return (
      <main className="pantalla">
        <a className="volver" href="#/entreno">Entreno</a>
        <header><h1 className="titulo">Sesión</h1><p>No hay un entreno en curso. Empezalo desde Entreno.</p></header>
        <a className="btn-principal enlace" href="#/entreno">Ir a Entreno</a>
      </main>
    );
  }

  const e = exerciseAt(a, r);
  const elapsed = Math.floor((now - a.startedAt) / 1000);
  const limit = a.limitMin * 60;
  const vencido = !a.noLimit && elapsed >= limit;
  const ultimo = a.idx === a.order.length - 1;
  const hecho = exerciseDone(a, e);
  const n = plannedSets(a, e);
  const incr = e.kind === 'aislamiento' ? 1 : 2.5;
  const quien = a.who;
  const miSerie = setsFor(a, quien, e.id).length + 1;
  const compartido = a.restMode === 'shared';

  const guardarYSalir = () => {
    const id = finishTraining();
    if (id) ir(`entreno-resumen/${id}`);
  };
  const siguiente = () => (ultimo ? guardarYSalir() : goToExercise(a.idx + 1));

  const restCard = (key: Who) => {
    const rt = compartido ? a.rest.shared : a.rest[key];
    const activo = rt && now < rt.endsAt;
    const restante = activo ? rt!.endsAt - now : 0;
    const total = e.rest * 1000;
    const hechas = setsFor(a, key, e.id).length;
    return (
      <div className={`rest-card${activo ? ' activo' : ''}`} key={key}>
        <div className="rest-cab"><b>{names[key]}</b><span className="sub">{activo ? 'descansa' : doneWith(a, e, key) ? 'listo' : `en la serie ${hechas + 1}`}</span></div>
        <div className={`mono rest-t${activo ? '' : ' mudo'}`}>{clock(activo ? ms(restante) : e.rest)}</div>
        <div className="rest-barra"><span style={{ width: `${activo ? (1 - restante / (rt as RestTimer).total) * 100 : 0}%` }} /></div>
        {activo ? (
          <div className="rest-acc">
            <button className="btn-borde" onClick={() => addRest(compartido ? 'shared' : key, 15)}>+15 s</button>
            <button className="btn-principal" onClick={() => skipRest(compartido ? 'shared' : key)}>Saltar</button>
          </div>
        ) : (
          <p className="sub rest-nota">{doneWith(a, e, key) ? 'terminó este ejercicio' : compartido ? 'arranca cuando los dos marquen la serie' : 'arranca cuando marque la serie'}</p>
        )}
      </div>
    );
  };

  const filas = Array.from({ length: n }, (_, i) => i);
  const recordsHoy = recordsFor(t.sessions, a.sets, Object.fromEntries(r.exercises.map((x) => [x.id, x.name])));
  const hechos = r.exercises.filter((x) => a.order.includes(x.id) && a.sets.some((s) => s.ex === x.id)).length;
  const quedan = a.order.map((id) => r.exercises.find((x) => x.id === id)!).filter((x) => !a.sets.some((s) => s.ex === x.id));

  return (
    <main className="pantalla sesion-entreno" style={{ ['--c' as string]: SALUD }}>
      <div className="topbar">
        <a className="volver" href="#/hoy">Meta 7 · {r.name}</a>
        <span className="mono"><b>{clock(Math.min(elapsed, 99 * 60))}</b> <span className="sub">/ {a.noLimit ? '∞' : clock(limit)}</span></span>
      </div>
      <div className="tiempo-barra" aria-hidden="true"><span style={{ width: `${a.noLimit ? 0 : Math.min(100, (elapsed / limit) * 100)}%` }} /></div>

      <div className="chips-ej" role="tablist" aria-label="Ejercicios">
        {a.order.map((id, i) => {
          const x = r.exercises.find((q) => q.id === id)!;
          return (
            <button key={id} role="tab" aria-selected={i === a.idx} className={exerciseDone(a, x) ? 'ok' : ''} onClick={() => goToExercise(i)}>
              <span className="mono">{exerciseDone(a, x) ? '✓' : i + 1}</span> {x.name}
            </button>
          );
        })}
      </div>

      {a.athletes.length > 1 && (
        <div className="fila-t descanso-cab">
          <span className="etiqueta" style={{ color: SALUD }}>Descanso · {restLabel(e.rest)}</span>
          <div className="segmentado chico" role="radiogroup" aria-label="Tipo de descanso">
            <button role="radio" aria-checked={compartido} onClick={() => setRestMode('shared')}>Compartido</button>
            <button role="radio" aria-checked={!compartido} onClick={() => setRestMode('each')}>Cada uno</button>
          </div>
        </div>
      )}
      <div className={`rest-grid${a.athletes.length === 1 ? ' uno' : ''}`}>{a.athletes.map((w) => restCard(w))}</div>

      <div className="etiqueta ej-n">Ejercicio {a.idx + 1} de {a.order.length} · {n} series · descanso {restLabel(e.rest)}</div>
      <h1 className="titulo ej-t">{e.name}</h1>

      <div className="objetivos">
        {a.athletes.map((w) => {
          const x = target[w];
          return (
            <div key={w}>
              <span className="sub">Objetivo de {names[w]} · rango {x.range[0] === x.range[1] ? x.range[0] : `${x.range[0]}-${x.range[1]}`}</span>
              <b className="mono">{x.t.kg ? `${fmtKg(x.t.kg)} kg × ${x.t.reps.join(' ')}` : `elegí tu peso × ${x.t.reps.join(' ')}`}</b>
              <small>{x.last ? `la vez pasada ${x.last.reps.join(' ')} · ${x.t.note}` : x.t.note}</small>
            </div>
          );
        })}
      </div>

      <div className="serie-tabla" style={{ ['--cols' as string]: a.athletes.length }}>
        <div className="serie-cab mono"><span>SERIE</span>{a.athletes.map((w) => <span key={w}>{names[w].toUpperCase()}</span>)}</div>
        {filas.map((i) => (
          <div key={i} className={`serie-fila${a.athletes.some((w) => w === quien && setsFor(a, w, e.id).length === i && !doneWith(a, e, w)) ? ' actual' : ''}`}>
            <span className="mono">{i + 1}</span>
            {a.athletes.map((w) => {
              const hecha = setsFor(a, w, e.id)[i];
              const obj = target[w].t.reps[i] ?? target[w].t.reps[target[w].t.reps.length - 1];
              const sup = hecha && hecha.reps > obj;
              return (
                <span key={w} className={`mono${hecha ? ' ok' : ''}${sup ? ' sup' : ''}`}>
                  {hecha ? <>{fmtKg(hecha.kg)} × {hecha.reps} ✓{sup ? ` +${hecha.reps - obj}` : ''}</> : <>{fmtKg(a.draft[w]?.kg ?? target[w].t.kg)} × —</>}
                  <small>obj {obj}{sup ? ' · superado' : ''}</small>
                </span>
              );
            })}
          </div>
        ))}
      </div>

      {!hecho && (
        <>
          {a.athletes.length > 1 && (
            <div className="segmentado" role="radiogroup" aria-label="Quién carga la serie">
              {a.athletes.map((w) => (
                <button key={w} role="radio" aria-checked={quien === w} onClick={() => setWho(w)}>
                  {names[w]} · {doneWith(a, e, w) ? 'listo' : `serie ${setsFor(a, w, e.id).length + 1}`}
                </button>
              ))}
            </div>
          )}
          {!doneWith(a, e, quien) && (
            <div className="cargar">
              <div><span className="sub">Kg</span>
                <div className="stepper grande"><button aria-label="Menos kilos" onClick={() => nudge(quien, 'kg', -incr)}>−</button><output aria-label="Kilos">{fmtKg(a.draft[quien]?.kg ?? 0)}</output><button aria-label="Más kilos" onClick={() => nudge(quien, 'kg', incr)}>+</button></div></div>
              <div><span className="sub">Reps · objetivo {target[quien].t.reps[miSerie - 1] ?? '—'}</span>
                <div className="stepper grande"><button aria-label="Menos repeticiones" onClick={() => nudge(quien, 'reps', -1)}>−</button><output aria-label="Repeticiones">{a.draft[quien]?.reps ?? 0}</output><button aria-label="Más repeticiones" onClick={() => nudge(quien, 'reps', 1)}>+</button></div></div>
            </div>
          )}
          {!doneWith(a, e, quien) && (
            <button className="btn-verde" disabled={!(a.draft[quien]?.kg) || !(a.draft[quien]?.reps)} onClick={() => logSet()}>
              Serie de {names[quien]} hecha{miSerie < n ? ' · arranca su descanso' : ''}
            </button>
          )}
          {!(a.draft[quien]?.kg) && !doneWith(a, e, quien) && <p className="sub nota-izq">Elegí con cuánto peso hacés esta serie.</p>}
        </>
      )}
      {hecho && <button className="btn-verde" onClick={siguiente}>{ultimo ? 'Terminar entreno' : `Siguiente: ${r.exercises.find((x) => x.id === a.order[a.idx + 1])?.name}`}</button>}
      {a.sets.length > 0 && !hecho && <button className="subrayado deshacer" onClick={undoLastSet}>Deshacer la última serie</button>}

      <div className="pie-sesion">
        <a className="subrayado" href="#/entreno-motor">Cómo se calcula</a>
        <button className="sub" onClick={guardarYSalir}>Terminar entreno</button>
      </div>
      <button className="terminar-foco" onClick={() => { cancelTraining(); ir('entreno'); }}>Descartar el entreno</button>

      {vencido && (
        <div className="hoja-fondo sheet-tiempo">
          <section className="modal-tiempo" role="dialog" aria-modal="true" aria-labelledby="tiempo-t">
            <span className="reloj-70 mono" aria-hidden="true">{a.limitMin}´</span>
            <div className="etiqueta" style={{ color: 'var(--rutina)' }}>Se terminó el tiempo</div>
            <h2 id="tiempo-t" className="titulo">Hora de ir a casa.</h2>
            <p className="sub">Pasaron los {a.limitMin} minutos del bloque. Lo que sigue del día te espera en casa.</p>
            <dl className="resumen-tiempo">
              <div><dt>Ejercicios hechos</dt><dd className="mono"><b>{hechos} de {a.order.length}</b></dd></div>
              <div><dt>Quedaron</dt><dd>{quedan.length ? quedan.map((x) => x.name).join(', ') : 'Ninguno'}</dd></div>
              <div><dt>Récords</dt><dd className="verde">{recordsHoy.length ? recordsHoy.map((x) => `${x.name} · ${names[x.who]}`).join(', ') : '—'}</dd></div>
              <div><dt>Kg movidos</dt><dd className="mono">{Math.round(volume(a.sets)).toLocaleString('es-AR')}</dd></div>
            </dl>
            <p className="sub">Lo que quedó no cuenta como falla: pasa al principio de la próxima {r.name} y no frena tu progresión.</p>
            <div className="sheet-botones">
              <button className="btn-principal" onClick={guardarYSalir}>Terminar y guardar</button>
              <div className="dos-botones">
                <button className="btn-borde" onClick={() => extendLimit(10)}>+10 min</button>
                <button className="btn-borde" onClick={noLimit}>Seguir sin límite</button>
              </div>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
