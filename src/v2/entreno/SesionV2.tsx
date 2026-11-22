/**
 * Trazo 2.0 · la sesión de entreno (#/entreno-sesion): un ejercicio por vez. Las series son barras (la altura, las repeticiones
 * contra el objetivo; llenas, las hechas), el descanso es un anillo que se vacía y la figura late en los músculos del ejercicio.
 * Guarda con las mismas acciones que la 1.0: nada cambia en lo que queda escrito.
 */
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { clock, ficha, fmtKg, history, nextTarget, rangeOf, recordsFor, restLabel, rirLabel, volume, warmMin } from '../../data/train';
import type { ActiveSession, Calentamiento, Exercise, Who } from '../../data/train-types';
import { ir } from '../../lib/routes';
import { useStore } from '../../state/store';
import {
  addRest, cancelTraining, doneWith, exerciseAt, exerciseDone, extendLimit, finishTraining, goToExercise, logSet, markRestWarned,
  noLimit, nudge, plannedSets, setRestMode, setRir, setWho, setsFor, skipRest, tildarCalentamiento, undoLastSet,
} from '../../state/train';
import { toast } from '../../ui/avisos';
import { useNow } from '../../ui/useNow';
import { Icono } from '../iconos';
import { confirmar } from '../kit/capas';
import { Boton, Casilla, Chip, Contador, Interruptor, Segmentado } from '../kit/controles';
import { Hoja } from '../kit/hoja';
import { Dato, Fila, Tarjeta, Vacio } from '../kit/superficies';
import { Grupo, Marco } from '../marco/Marco';
import { haptico } from '../movimiento/movimiento';
import { FilaHoja, hechasDe } from '../proyecto/piezas';
import { Cuerpo, enPalabras } from './Cuerpo';
import { VISTA, musculosDe, type Carga } from './musculos';
import '../proyecto/proyecto.css';
import './entreno.css';

const SALUD = 'var(--a-salud)';
const seg = (ms: number) => Math.max(0, Math.ceil(ms / 1000));
const decDe = (x: number) => (Number.isInteger(x) ? 0 : Number.isInteger(x * 2) ? 1 : 2);

const INFO = (
  <>
    <p className="t-cuerpo-l">Un ejercicio por vez: cargás la serie y arranca el descanso.</p>
    <p className="t-cuerpo">Cada barra es una serie. La línea punteada es el objetivo de hoy; cuando la marcás, la barra se llena hasta las repeticiones que hiciste.</p>
    <p className="t-cuerpo">Lo que no llegues a hacer no cuenta como falla: pasa al principio de la próxima sesión.</p>
  </>
);

/** Lo que enciende un ejercicio en la figura, y de qué lado se ve mejor. */
export function luzDeEjercicio(e: Exercise): { luz: Carga; vista: 'frente' | 'espalda' } {
  const partes = musculosDe(e);
  const luz: Carga = Object.fromEntries(partes.map((p) => [p.m, p.peso]));
  const principal = partes.find((p) => p.peso >= 1) ?? partes[0];
  return { luz, vista: principal ? VISTA[principal.m][0] : 'frente' };
}

/** La ficha de un ejercicio o de un paso del calentamiento: tempo, posición, consejo, músculos. */
function Ficha({ e }: { e: Exercise | Calentamiento }) {
  const filas = ficha(e);
  const pasos = 'pasos' in e ? e.pasos : undefined;
  if (!filas.length && !pasos?.length) return <p className="t-nota">Este ejercicio no trae más detalle.</p>;
  return (
    <>
      {!!pasos?.length && <ul className="pt-items en-pasos">{pasos.map((p) => <li key={p}>{p}</li>)}</ul>}
      {filas.length > 0 && (
        <dl className="capa-1 pt-ficha">
          {filas.map(([k, v]) => <div key={k} className="pt-ficha-fila"><dt className="t-rotulo">{k}</dt><dd className="t-cuerpo">{v}</dd></div>)}
        </dl>
      )}
    </>
  );
}

/** Los pasos del calentamiento: se tildan, no llevan kilos. */
function Calentar({ pasos, hechos }: { pasos: Calentamiento[]; hechos: Set<string> }) {
  return (
    <div className="capa-1 pt-check">
      {pasos.map((w) => (
        <div key={w.id} className="en-calentar">
          <Casilla marcada={hechos.has(w.id)} etiqueta={w.name} area={SALUD} festejo={false} onCambio={() => tildarCalentamiento(w.id)}
            nota={[w.sets ? `${w.sets} × ${w.reps ?? ''}` : '', w.detalle, w.rir ? rirLabel(w) : '', w.min ? `${w.min} min` : ''].filter(Boolean).join(' · ')} />
          {(ficha(w).length > 0 || !!w.pasos?.length) && (
            <details className="en-como">
              <summary className="t-nota">Cómo se hace</summary>
              <Ficha e={w} />
            </details>
          )}
        </div>
      ))}
    </div>
  );
}

/** Las series de una persona, como barras: la altura son las repeticiones; la línea punteada, el objetivo. */
function Series({ a, e, who, nombre, objetivo, rango, actual }: { a: ActiveSession; e: Exercise; who: Who; nombre: string; objetivo: number[]; rango: [number, number]; actual: boolean }) {
  const n = plannedSets(a, e);
  const hechas = setsFor(a, who, e.id);
  const enSeg = e.unidad === 's';
  const obj = (i: number) => objetivo[i] ?? objetivo[objetivo.length - 1] ?? rango[0];
  // La escala va del valor más bajo (40 % del alto) al más alto (100 %): una repetición de diferencia se tiene que ver.
  const valores = [rango[0], rango[1], ...objetivo, ...hechas.map((s) => s.reps)];
  const piso = Math.min(...valores);
  const tramo = Math.max(1, Math.max(...valores) - piso);
  const pct = (x: number) => `${Math.round((0.4 + 0.6 * Math.max(0, Math.min(1, (x - piso) / tramo))) * 100)}%`;
  return (
    <ol className="en-series" aria-label={`Series de ${nombre}`} data-grafico>
      {Array.from({ length: n }, (_, i) => {
        const s = hechas[i];
        const esActual = actual && !s && i === hechas.length;
        const sup = !!s && s.reps > obj(i);
        const unidad = enSeg ? ' s' : '';
        const dice = s ? `${fmtKg(s.kg)} kg por ${s.reps}${unidad}, hecha${sup ? `, ${s.reps - obj(i)} más que el objetivo` : ''}` : `objetivo ${obj(i)}${unidad}${esActual ? ', es la que sigue' : ''}`;
        return (
          <li key={i} className={s ? 'en-hecha' : esActual ? 'en-actual' : undefined} aria-current={esActual ? 'step' : undefined} aria-label={`Serie ${i + 1}: ${dice}`}>
            <span className="en-serie-barra" aria-hidden="true" style={{ ['--h' as string]: pct(s ? s.reps : obj(i)), ['--obj' as string]: pct(obj(i)), ['--i' as string]: i } as CSSProperties}><i /></span>
            <b className="t-dato" aria-hidden="true">{s ? s.reps : obj(i)}{unidad}{sup && <em>+{s.reps - obj(i)}</em>}</b>
            <small aria-hidden="true">{s ? `${fmtKg(s.kg)} kg${s.rir != null ? ` · R${s.rir}` : ''}` : e.rir?.[i] != null ? `RIR ${e.rir[i]}` : 'obj'}</small>
          </li>
        );
      })}
    </ol>
  );
}

/** El descanso: un anillo que se vacía, con sumar 15 segundos o saltarlo. */
function Descanso({ nombre, restante, total, chico, onMas, onSaltar }: { nombre: string; restante: number; total: number; chico: boolean; onMas: () => void; onSaltar: () => void }) {
  const lado = chico ? 108 : 148;
  const grosor = chico ? 7 : 9;
  const r = (lado - grosor) / 2;
  const largo = 2 * Math.PI * r;
  const queda = Math.max(0, Math.min(1, restante / Math.max(1, total)));
  return (
    <div className={`capa-1 en-descanso${restante <= 3000 ? ' en-tarde' : ''}${chico ? ' en-chico' : ''}`}>
      <div className="en-reloj" role="timer" aria-label={`${nombre}: quedan ${clock(seg(restante))}`} data-grafico style={{ width: lado, height: lado }}>
        <svg viewBox={`0 0 ${lado} ${lado}`} aria-hidden="true">
          <circle className="en-reloj-fondo" cx={lado / 2} cy={lado / 2} r={r} strokeWidth={grosor} />
          <circle className="en-reloj-valor" cx={lado / 2} cy={lado / 2} r={r} strokeWidth={grosor} strokeDasharray={largo} strokeDashoffset={largo * (1 - queda)} transform={`rotate(-90 ${lado / 2} ${lado / 2})`} />
        </svg>
        <span className="en-reloj-centro" aria-hidden="true"><b className="t-dato">{clock(seg(restante))}</b><small className="t-rotulo">{nombre}</small></span>
      </div>
      <div className="en-descanso-acc">
        <Boton tamano="s" variante="secundario" onClick={onMas}>+15 s</Boton>
        <Boton tamano="s" variante="primario" onClick={onSaltar}>Saltar</Boton>
      </div>
    </div>
  );
}

export default function SesionV2() {
  const t = useStore((s) => s.train);
  const names = useStore((s) => s.settings!.names);
  const now = useNow(250);
  const a = t.active;
  const r = a ? t.routines.find((x) => x.id === a.routineId) : undefined;
  const avisados = useRef(new Set<string>());
  const pestanas = useRef<HTMLDivElement>(null);
  const [fichaDe, setFichaDe] = useState<Exercise | null>(null);
  const [fichaAbierta, setFichaAbierta] = useState(false);

  // Avisa (con sonido) cuando termina un descanso: lo mismo que la 1.0, por el puente de avisos.
  useEffect(() => {
    if (!a || !r) return;
    for (const key of ['shared', 'me', 'partner'] as const) {
      const rt = a.rest[key];
      if (rt && !rt.warned && now >= rt.endsAt) {
        markRestWarned(key);
        const e = exerciseAt(a, r);
        const who: Who | null = key === 'shared' ? null : key;
        const n = (who ? setsFor(a, who, e.id).length : Math.min(...a.athletes.map((w) => setsFor(a, w, e.id).length))) + 1;
        const id = `${key}${rt.endsAt}`;
        if (!avisados.current.has(id)) {
          avisados.current.add(id);
          toast({ title: key === 'shared' ? 'Terminó el descanso' : `${names[key]}, a la serie ${n}`, sub: e.name, color: 'var(--salud)', evento: 'entreno' }, true);
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

  // El ejercicio en el que estás queda a la vista en la tira.
  const idx = a?.idx;
  useEffect(() => { pestanas.current?.querySelector<HTMLElement>('[aria-selected="true"]')?.scrollIntoView?.({ inline: 'center', block: 'nearest' }); }, [idx]);

  if (!a || !r || !target) {
    return (
      <Marco className="en" titulo="Sesión" volver={{ href: '#/entreno', nombre: 'Entreno' }}>
        <Vacio ilustracion="plan" titulo="No hay un entreno en curso" texto="Se empieza desde Entreno, con la rutina de hoy." accion={<Boton variante="primario" href="#/entreno">Ir a Entreno</Boton>} />
      </Marco>
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
  const enSeg = e.unidad === 's';
  const dos = a.athletes.length > 1;
  const quien = a.who;
  const borrador = a.draft[quien] ?? { kg: 0, reps: 0 };
  const miSerie = setsFor(a, quien, e.id).length + 1;
  const compartido = a.restMode === 'shared';
  const calentar = r.calentamiento ?? [];
  const tibios = new Set(a.warmDone ?? []);
  const calentarArriba = calentar.length > 0 && a.sets.length === 0 && tibios.size < calentar.length;
  const { luz, vista } = luzDeEjercicio(e);
  const principales = musculosDe(e).filter((p) => p.peso >= 1).map((p) => p.m);
  const siguienteEj = r.exercises.find((x) => x.id === a.order[a.idx + 1]);

  const guardarYSalir = () => { const id = finishTraining(); if (id) ir(`entreno-resumen/${id}`); };
  const siguiente = () => (ultimo ? guardarYSalir() : goToExercise(a.idx + 1));
  const marcar = () => { haptico(miSerie >= n ? 'exito' : 'leve'); logSet(); };
  const descartar = async () => {
    if (await confirmar({ titulo: 'Descartar el entreno', texto: 'Se pierden las series que cargaste hoy.', accion: 'Descartar', peligro: true })) { cancelTraining(); ir('entreno'); }
  };

  // Los descansos que están corriendo ahora.
  const descansos = (compartido ? (['shared'] as const) : a.athletes).flatMap((key) => {
    const rt = a.rest[key];
    return rt && now < rt.endsAt ? [{ key, restante: rt.endsAt - now, total: rt.total, nombre: key === 'shared' ? 'Descanso' : dos ? names[key] : 'Descanso' }] : [];
  });

  const falta = !e.corporal && !borrador.kg ? 'Elegí con cuánto peso hacés esta serie.' : !borrador.reps ? `Poné ${enSeg ? 'cuántos segundos' : 'cuántas repeticiones'} hiciste.` : false;
  const recordsHoy = recordsFor(t.sessions, a.sets, Object.fromEntries(r.exercises.map((x) => [x.id, x.name])));
  const conSeries = a.order.filter((id) => a.sets.some((s) => s.ex === id)).length;
  const quedan = a.order.map((id) => r.exercises.find((x) => x.id === id)!).filter((x) => !a.sets.some((s) => s.ex === x.id));
  const filaCalentar = calentar.length > 0 && (
    <FilaHoja icono="salud" titulo="Calentamiento" nota={`${warmMin(r)} min`} valor={hechasDe(tibios.size, calentar.length)} hecho={tibios.size >= calentar.length}>
      <Calentar pasos={calentar} hechos={tibios} />
    </FilaHoja>
  );

  return (
    <Marco className="en en-sesion" titulo={r.name} volver={{ href: '#/entreno', nombre: 'Entreno' }} info={INFO}>
      <div className="en-tiempo" role="timer" aria-label={`Tiempo de entreno: ${clock(Math.min(elapsed, 99 * 60))}${a.noLimit ? '' : ` de ${clock(limit)}`}`} data-grafico>
        <span className="t-dato"><b>{clock(Math.min(elapsed, 99 * 60))}</b> / {a.noLimit ? '∞' : clock(limit)}</span>
        <span className="en-tiempo-barra"><i style={{ width: `${a.noLimit ? 0 : Math.min(100, (elapsed / limit) * 100)}%` }} /></span>
      </div>

      {calentarArriba && <div className="capa-1 s-lista en-detalle">{filaCalentar}</div>}

      <div className="en-pestanas" role="tablist" aria-label="Ejercicios" ref={pestanas}>
        {a.order.map((id, i) => {
          const x = r.exercises.find((q) => q.id === id)!;
          const listo = exerciseDone(a, x);
          return (
            <button key={id} type="button" role="tab" aria-selected={i === a.idx} className={listo ? 'en-listo' : undefined} onClick={() => goToExercise(i)}>
              <span className="t-dato" aria-hidden="true">{listo ? <Icono nombre="tilde" lado={14} /> : i + 1}</span>{x.name}{listo && <span className="v2-oculto">, hecho</span>}
            </button>
          );
        })}
      </div>

      <Tarjeta heroe area={SALUD} className={dos ? 'en-ejercicio en-dos' : 'en-ejercicio'} etiqueta="Ejercicio actual">
        <div className="en-ej-cab">
          <Cuerpo luz={luz} tono={hecho ? 'hecho' : 'plan'} pulso={hecho ? undefined : principales} vistas={[vista]} alto={124} rotulos={false} nombre={`Trabaja ${enPalabras(luz)}.`} />
          <div className="en-ej-texto">
            <span className="t-rotulo">Ejercicio {a.idx + 1} de {a.order.length}</span>
            <h2 className="t-seccion">{e.name}</h2>
            <p className="t-dato en-ej-meta">{[`${n} series`, `descanso ${restLabel(e.rest)}`, e.tempo ? `tempo ${e.tempo}` : ''].filter(Boolean).join(' · ')}</p>
            <Boton tamano="s" variante="fantasma" icono="info" onClick={() => { setFichaDe(e); setFichaAbierta(true); }}>Cómo se hace</Boton>
          </div>
        </div>
        {a.athletes.map((w) => {
          const x = target[w];
          return (
            <div key={w} className="en-persona">
              <div className="en-persona-cab">
                <span className="t-rotulo">{dos ? names[w] : 'Objetivo'}</span>
                <b className="t-dato">{x.t.kg ? `${fmtKg(x.t.kg)} kg` : 'tu peso'} × {x.t.reps.join(' ')}</b>
              </div>
              <Series a={a} e={e} who={w} nombre={names[w]} objetivo={x.t.reps} rango={x.range} actual={w === quien && !doneWith(a, e, w)} />
              <p className="t-nota en-persona-nota">{x.last ? `La vez pasada ${x.last.reps.join(' ')} · ${x.t.note}` : x.t.note}</p>
            </div>
          );
        })}
      </Tarjeta>

      {descansos.length > 0 && (
        <div className="en-descansos">
          {descansos.map((d) => <Descanso key={d.key} nombre={d.nombre} restante={d.restante} total={d.total} chico={descansos.length > 1} onMas={() => addRest(d.key, 15)} onSaltar={() => skipRest(d.key)} />)}
        </div>
      )}

      {hecho ? (
        <div className="en-seguir">
          <Boton variante="primario" ancho icono={ultimo ? 'tilde' : 'siguiente'} onClick={siguiente}>{ultimo ? 'Terminar entreno' : `Siguiente: ${siguienteEj?.name ?? ''}`}</Boton>
        </div>
      ) : (
        <section className="capa-1 en-cargar" aria-label="Cargar la serie">
          {dos && (
            <Segmentado etiqueta="Quién carga la serie" valor={quien} onCambio={setWho}
              opciones={a.athletes.map((w) => [w, `${names[w]} · ${doneWith(a, e, w) ? 'listo' : `serie ${setsFor(a, w, e.id).length + 1}`}`])} />
          )}
          {doneWith(a, e, quien) ? <p className="t-nota">{names[quien]} terminó este ejercicio.</p> : (
            <>
              <div className="en-campos">
                <div><span className="t-rotulo">Kilos</span><Contador etiqueta="Kilos" valor={borrador.kg} min={0} paso={incr} decimales={Math.max(decDe(borrador.kg), decDe(incr))} onCambio={(v) => nudge(quien, 'kg', v - borrador.kg)} /></div>
                <div><span className="t-rotulo">{enSeg ? 'Segundos' : 'Reps'}</span><Contador etiqueta={enSeg ? 'Segundos' : 'Repeticiones'} valor={borrador.reps} min={0} paso={enSeg ? 5 : 1} onCambio={(v) => nudge(quien, 'reps', v - borrador.reps)} /></div>
              </div>
              <div className="en-rir" role="group" aria-label="RIR que te quedó (opcional)">
                <span className="t-rotulo">RIR que te quedó{e.rir?.[miSerie - 1] != null ? ` · objetivo ${e.rir[miSerie - 1]}` : ''}</span>
                <div>{[0, 1, 2, 3, 4].map((k) => <Chip key={k} activo={borrador.rir === k} onCambio={() => setRir(quien, k)}>{k}</Chip>)}</div>
              </div>
              <Boton variante="primario" ancho icono="tilde" deshabilitado={falta} onClick={marcar}>{dos ? `Serie ${miSerie} de ${names[quien]} hecha` : `Serie ${miSerie} hecha`}</Boton>
              {e.corporal && !borrador.kg && <p className="t-nota">Sin peso extra cuenta tu peso corporal. Sumá kilos si agregás lastre.</p>}
            </>
          )}
        </section>
      )}

      <Grupo titulo="Más">
        <div className="capa-1 s-lista">
          {!calentarArriba && filaCalentar}
          {a.sets.length > 0 && <Fila icono="deshacer" titulo="Deshacer la última serie" onClick={undoLastSet} />}
          <Fila icono="ritmo" titulo="Cómo se calcula" nota="El motor de entreno" href="#/entreno-motor" />
          <Fila icono="tilde" titulo="Terminar entreno" nota="Guarda lo hecho hasta acá" onClick={guardarYSalir} />
        </div>
        {dos && <div className="capa-1 en-modo"><Interruptor prendido={compartido} onCambio={(v) => setRestMode(v ? 'shared' : 'each')} etiqueta="Descanso compartido" nota="Arranca cuando los dos marcan la serie" /></div>}
        <div className="pt-acciones"><Boton variante="peligro" icono="borrar" onClick={descartar}>Descartar el entreno</Boton></div>
      </Grupo>

      <Hoja abierta={fichaAbierta} onCerrar={() => setFichaAbierta(false)} titulo={fichaDe?.name ?? 'Cómo se hace'}>
        {fichaDe && <Ficha e={fichaDe} />}
      </Hoja>

      <Hoja abierta={vencido} onCerrar={() => extendLimit(10)} titulo="Hora de ir a casa"
        pie={<Boton variante="primario" ancho icono="tilde" onClick={guardarYSalir}>Terminar y guardar</Boton>}>
        <div className="pt-version">
          <p className="t-cuerpo-l">Pasaron los {a.limitMin} minutos del bloque.</p>
          <div className="en-numeros">
            <Dato valor={`${conSeries}/${a.order.length}`} etiqueta="Ejercicios" />
            <Dato valor={Math.round(volume(a.sets)).toLocaleString('es-AR')} unidad="kg" etiqueta="Movidos" />
            <Dato valor={String(recordsHoy.length)} etiqueta="Récords" />
          </div>
          {quedan.length > 0 && <p className="t-cuerpo">Quedaron: {quedan.map((x) => x.name).join(', ')}.</p>}
          <p className="t-nota">Lo que quedó no cuenta como falla: pasa al principio de la próxima {r.name}.</p>
          <div className="pt-acciones">
            <Boton variante="secundario" icono="mas" onClick={() => extendLimit(10)}>10 min</Boton>
            <Boton variante="secundario" onClick={noLimit}>Seguir sin límite</Boton>
          </div>
        </div>
      </Hoja>
    </Marco>
  );
}
