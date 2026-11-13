/**
 * Bloques de Puntos débiles: se usan en el teléfono (8.1, 8.3) y en la vista de escritorio (8.4).
 * Gráficos en SVG propio, colores de las variables CSS y tabla para lectores de pantalla.
 */
import { useState } from 'react';
import { AREAS } from '../data/defaults';
import {
  BANDA_COLOR, ERR_COLOR, ERR_CONSEJO, ERR_NOMBRE, ERR_ORDEN, banda, calibration, errorTypes, examenes, fixPlan, leeches, mapa, ranking, recallSemanal, refuerzo, repetidos, simulacro, temaInfo as temaInfoSafe,
  type Fuentes,
} from '../data/debiles';
import { fmtFecha } from '../data/time';
import type { Activity, StudyState, Tramo } from '../data/study-types';
import { ir } from '../lib/routes';
import { addCards, setRules, updateCard } from '../state/study';
import { getState, setState } from '../state/store';
import { toast } from './avisos';
import { Card, Leyenda, smooth, TablaSR, useDibujo } from './charts/core';
import { startStudy } from './estudio-acciones';

const frontColor = (st: StudyState, id: string) => AREAS[st.fronts.find((f) => f.id === id)?.color ?? 'ing'].css;
const fuentesTxt = (f: Fuentes) => [f.cold != null && `recall ${f.cold} %`, f.tarjetas != null && `tarjetas ${f.tarjetas} %`, f.test != null && `test ${f.test} %`].filter(Boolean).join(' · ');
export const Vacio = ({ children }: { children: React.ReactNode }) => <p className="sub deb-vacio">{children} Se completa con el uso.</p>;

/** Lo más flojo ahora: ranking con qué falla y cuánto lleva arreglarlo. */
export function Ranking({ st, max = 5, compacto = false }: { st: StudyState; max?: number; compacto?: boolean }) {
  const r = ranking(st, max);
  return (
    <section className={`deb-rank${compacto ? ' compacto' : ''}`} aria-labelledby="deb-rank-t">
      <div className="deb-cab"><h2 id="deb-rank-t">Lo más flojo ahora</h2><span className="sub">fuerza 0 a 100</span></div>
      {!r.length && <Vacio>Todavía no hay temas por debajo de 85: hacen falta cold recalls, tarjetas o tests.</Vacio>}
      {r.length > 0 && st.attempts.length + st.log.length < 30 && <Vacio>Con pocos intentos la fuerza todavía se mueve mucho.</Vacio>}
      <ol>
        {r.map((t, i) => (
          <li key={t.id}>
            <span className="mono sub">{i + 1}</span>
            <div>
              <div className="deb-rank-t">
                <b><i style={{ background: frontColor(st, t.frontId) }} />{t.nombre}</b>
                <span className="mono" style={{ color: BANDA_COLOR[banda(t.fuerza!)] }}>{t.fuerza}</span>
              </div>
              <small className="sub">{fuentesTxt(t.fuentes)}</small>
              <span className="deb-barra" role="img" aria-label={`Fuerza ${t.fuerza} de 100`}><span style={{ width: `${t.fuerza}%`, background: BANDA_COLOR[banda(t.fuerza!)] }} /></span>
              <div className="deb-rank-pie">
                <small className="sub">falla: {t.falla}</small>
                <a className="mono" href={`#/flojo/${encodeURIComponent(t.id)}`}>arreglar · {t.min} min <span aria-hidden="true">→</span></a>
              </div>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

/** Mapa de fortaleza por capítulo: cold recall, tarjetas, test y el día 8, en rojo, amarillo y verde. */
export function Mapa({ st, a }: { st: StudyState; a?: Activity }) {
  if (!a) return null;
  const filas = mapa(st, a);
  const celda = (v: number | undefined | null, txt?: string) =>
    v == null ? <span className="mapa-c vacia" aria-label="sin datos">–</span> : <span className="mapa-c mono" style={{ ['--c' as string]: BANDA_COLOR[banda(v)] }}>{txt ?? v}</span>;
  return (
    <Card title="Mapa de fortaleza" aside={`${st.fronts.find((f) => f.id === a.front)?.name ?? ''} · ${a.title.split(' · ')[0]}`} className="deb-mapa">
      {!filas.length ? <Vacio>Aparece cuando estudies el primer capítulo.</Vacio> : (
        <>
          <div className="mapa" role="table" aria-label="Fortaleza por capítulo">
            <div role="row" className="mapa-f cab"><span role="columnheader" /><span role="columnheader" className="mono">Recall</span><span role="columnheader" className="mono">Tarjetas</span><span role="columnheader" className="mono">Test</span><span role="columnheader" className="mono">día 8</span></div>
            {filas.map((f) => (
              <a role="row" key={f.n} className="mapa-f" href={`#/flojo/${encodeURIComponent(`${a.id}:${f.n}`)}`}>
                <span role="rowheader">{String(f.n).padStart(2, '0')} · {f.titulo}</span>
                <span role="cell">{celda(f.cold)}</span>
                <span role="cell">{celda(f.tarjetas)}</span>
                <span role="cell">{celda(f.test)}</span>
                <span role="cell">{celda(f.d8 ? Math.round((f.d8[0] / f.d8[1]) * 100) : null, f.d8 ? `${f.d8[0]}/${f.d8[1]}` : undefined)}</span>
              </a>
            ))}
          </div>
          <div className="deb-ley sub" aria-hidden="true">
            <span><i style={{ background: BANDA_COLOR.mal }} />menos de 70 %</span><span><i style={{ background: BANDA_COLOR.medio }} />70 a 84 %</span><span><i style={{ background: BANDA_COLOR.bien }} />85 % o más</span>
          </div>
        </>
      )}
    </Card>
  );
}

/** Cómo fallás: los errores de los tests por tipo, con el consejo de cada uno. */
export function ComoFallas({ st }: { st: StudyState }) {
  const e = errorTypes(st);
  return (
    <Card title="Cómo fallás" aside={e.total ? `${e.total} errores en ${e.tests} ${e.tests === 1 ? 'test' : 'tests'}` : undefined} className="deb-fallas">
      {!e.total ? <Vacio>Todavía no hay errores cargados en tus tests.</Vacio> : (
        <>
          <div className="fallas-barra" role="img" aria-label={ERR_ORDEN.map((k) => `${ERR_NOMBRE[k]}: ${e.by[k]}`).join(', ')}>
            {ERR_ORDEN.filter((k) => e.by[k]).map((k) => <span key={k} style={{ flexGrow: e.by[k], background: ERR_COLOR[k] }} />)}
          </div>
          <ul className="fallas">
            {ERR_ORDEN.map((k) => (
              <li key={k}>
                <i style={{ background: ERR_COLOR[k] }} />
                <span><b>{ERR_NOMBRE[k]}</b><small className="sub">{ERR_CONSEJO[k]}</small></span>
                <span className="mono">{e.by[k]} · {Math.round((e.by[k] / e.total) * 100)} %</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </Card>
  );
}

/** Tu recall, semana a semana: el promedio del cold recall de cada frente contra el 85 %. */
export function RecallSemanal({ st, date }: { st: StudyState; date: string }) {
  const { semanas, series } = recallSemanal(st, date);
  const ref = useDibujo<SVGSVGElement>([series.length, date]);
  const W = 320, H = 130, T = 6, B = 112, MIN = 40;
  const x = (i: number) => 4 + (i / (semanas.length - 1)) * (W - 8);
  const y = (v: number) => B - ((Math.max(MIN, v) - MIN) / (100 - MIN)) * (B - T);
  return (
    <Card title="Tu recall, semana a semana" aside="cold recall" className="deb-semanal">
      {!series.length ? <Vacio>Aparece con tus primeros cold recalls.</Vacio> : (
        <>
          <svg ref={ref} className="ch" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Cold recall por semana: ${series.map((s) => `${s.front.name} ${s.valores.filter((v) => v != null).at(-1)} %`).join(', ')}; tope 85 %`}>
            {[55, 70, 100].map((g) => <line key={g} x1={4} x2={W - 4} y1={y(g)} y2={y(g)} className="ch-grid" />)}
            <line x1={4} x2={W - 4} y1={y(85)} y2={y(85)} className="ch-meta" />
            <line x1={4} x2={W - 4} y1={B + 6} y2={B + 6} className="ch-base" />
            {series.map((s) => {
              const pts = s.valores.flatMap((v, i) => (v == null ? [] : [[x(i), y(v)] as [number, number]]));
              const c = AREAS[s.front.color].css;
              return (
                <g key={s.front.id} style={{ ['--c' as string]: c }}>
                  <path d={smooth(pts)} className="ch-linea dibujo" />
                  {pts.length === 1 && <circle cx={pts[0][0]} cy={pts[0][1]} r={3.5} className="ch-punto" />}
                </g>
              );
            })}
          </svg>
          <div className="ch-ejes mono sub" aria-hidden="true">{semanas.map((_, i) => <span key={i} className={i === semanas.length - 1 ? 'hoy' : ''}>S{i + 1}</span>)}</div>
          <Leyenda items={[...series.map((s) => ({ label: s.front.name, color: AREAS[s.front.color].css, kind: 'linea' as const })), { label: 'tope 85 %', color: 'var(--tinta)', kind: 'punteada' }]} />
          <TablaSR caption="Cold recall promedio por semana y frente" head={['Frente', ...semanas.map((_, i) => `S${i + 1}`)]} rows={series.map((s) => [s.front.name, ...s.valores.map((v) => (v == null ? '—' : `${v} %`))])} />
        </>
      )}
    </Card>
  );
}

/** Creías contra recordaste: la calibración de cada frente en los cold recalls. */
export function Calibracion({ st }: { st: StudyState }) {
  const c = calibration(st.attempts, st.fronts);
  const peor = [...c].sort((a, b) => b.diff - a.diff)[0];
  return (
    <Card title="Creías contra recordaste" aside="calibración" className="deb-calib">
      {!c.length ? <Vacio>Aparece cuando, antes de comparar un cold recall, digas cuánto creés que recordaste.</Vacio> : (
        <>
          <ul className="calib">
            {c.map((x) => (
              <li key={x.front.id} style={{ ['--c' as string]: AREAS[x.front.color].css }}>
                <span>{x.front.name}</span>
                <span className="calib-barras" role="img" aria-label={`${x.front.name}: creías ${x.creia} %, recordaste ${x.recordo} %`}>
                  <span className="creia"><i style={{ width: `${x.creia}%` }} /></span>
                  <span className="recordo"><i style={{ width: `${x.recordo}%` }} /></span>
                </span>
                <span className="mono" style={{ color: x.diff > 0 ? 'var(--rutina)' : 'var(--salud)' }}>{x.diff > 0 ? '−' : x.diff < 0 ? '+' : ''}{Math.abs(x.diff)}</span>
              </li>
            ))}
          </ul>
          <p className="sub deb-nota">
            Arriba, lo que creías recordar; abajo, lo que recordaste.
            {peor && peor.diff > 0 ? ` En ${peor.front.name} te sobreestimás ${peor.diff} puntos: ahí la sensación de saber no alcanza, seguí con el test y el cold recall.` : ' Por ahora te calibrás bien.'}
          </p>
        </>
      )}
    </Card>
  );
}

/** Tarjetas sanguijuela: las que fallaste 4 veces o más, con qué hacer con cada una. */
export function Sanguijuelas({ st, date }: { st: StudyState; date: string }) {
  const ls = leeches(st.cards, st.log);
  const [editando, setEditando] = useState<{ id: string; modo: 'reescribir' | 'dividir'; f: string; b: string; f2: string; b2: string } | null>(null);
  const guardar = () => {
    if (!editando) return;
    const c = st.cards.find((x) => x.id === editando.id)!;
    if (editando.modo === 'reescribir') {
      updateCard(c.id, { front: editando.f, back: editando.b });
      toast({ title: 'Tarjeta reescrita', sub: editando.f, color: 'var(--economia)' }, false);
    } else {
      addCards(date, [
        { front: editando.f, back: editando.b, kind: c.kind, deck: c.deck, frontId: c.frontId, source: c.source },
        { front: editando.f2, back: editando.b2, kind: c.kind, deck: c.deck, frontId: c.frontId, source: c.source },
      ]);
      setState((s) => ({ ...s, study: { ...s.study, cards: s.study.cards.filter((x) => x.id !== c.id) } }));
      toast({ title: 'Dividida en dos', sub: 'Entran como tarjetas nuevas', color: 'var(--economia)' }, false);
    }
    setEditando(null);
  };
  const releer = (id: string) => {
    const c = st.cards.find((x) => x.id === id)!;
    setState((s) => ({ ...s, study: { ...s.study, reviews: [...s.study.reviews, { id: `r${Date.now().toString(36)}`, activityId: c.activityId ?? 'repaso', unit: c.unit, kind: 'releer', due: date, min: 5, label: `Releer · ${c.source || c.deck}` }] } }));
    toast({ title: 'Releer la fuente', sub: `${c.source || c.deck}: entra en el repaso de hoy`, color: 'var(--economia)' }, false);
  };
  return (
    <Card title="Tarjetas sanguijuela" aside="falladas 4 veces o más" className="deb-sang">
      {!ls.length ? <Vacio>Ninguna tarjeta falló 4 veces todavía.</Vacio> : (
        <>
          <ul className="sang">
            {ls.slice(0, 3).map(({ card, fallos }) => (
              <li key={card.id}>
                <div className="sang-t"><span><b>{card.front}</b><small className="sub">{st.fronts.find((f) => f.id === card.frontId)?.name ?? card.deck}</small></span><span className="chip-x mono">×{fallos}</span></div>
                {editando?.id === card.id ? (
                  <div className="sang-edit">
                    <input className="campo-texto" value={editando.f} onChange={(e) => setEditando({ ...editando, f: e.target.value })} aria-label="Frente" />
                    <input className="campo-texto" value={editando.b} onChange={(e) => setEditando({ ...editando, b: e.target.value })} aria-label="Dorso" />
                    {editando.modo === 'dividir' && (
                      <>
                        <input className="campo-texto" value={editando.f2} onChange={(e) => setEditando({ ...editando, f2: e.target.value })} aria-label="Frente de la segunda" placeholder="Frente de la segunda" />
                        <input className="campo-texto" value={editando.b2} onChange={(e) => setEditando({ ...editando, b2: e.target.value })} aria-label="Dorso de la segunda" placeholder="Dorso de la segunda" />
                      </>
                    )}
                    <div className="sang-bot"><button className="btn-borde" onClick={() => setEditando(null)}>Cancelar</button><button className="btn-principal" onClick={guardar} disabled={!editando.f.trim() || !editando.b.trim() || (editando.modo === 'dividir' && (!editando.f2.trim() || !editando.b2.trim()))}>Guardar</button></div>
                  </div>
                ) : (
                  <div className="sang-bot">
                    <button onClick={() => setEditando({ id: card.id, modo: 'reescribir', f: card.front, b: card.back, f2: '', b2: '' })}>Reescribir</button>
                    <button onClick={() => setEditando({ id: card.id, modo: 'dividir', f: card.front, b: card.back, f2: '', b2: '' })}>Dividir en dos</button>
                    <button onClick={() => releer(card.id)}>Releer la fuente</button>
                  </div>
                )}
              </li>
            ))}
          </ul>
          <p className="sub deb-nota">Una tarjeta que fallás una y otra vez suele estar mal armada, no mal estudiada.</p>
        </>
      )}
    </Card>
  );
}

/** Los tramos del refuerzo de hoy, para la sesión de estudio. */
export function tramosRefuerzo(st: StudyState): Tramo[] {
  return refuerzo(st).pasos.map(({ tema, paso }, i) => ({
    step: 'repetir',
    kind: paso.kind === 'tarjetas' ? 'tarjetas' : paso.kind === 'releer' ? 'releer' : 'ejercicios',
    title: `${tema.corto[0].toUpperCase()}${tema.corto.slice(1)} · ${paso.texto[0].toLowerCase()}${paso.texto.slice(1)}`,
    sub: `Refuerzo · ${tema.nombre}`,
    min: paso.min,
    ref: paso.kind === 'tarjetas' ? `cards:${tema.frontId}` : `fix:${tema.id}:${i}`,
    activityId: tema.activity?.id ?? 'repaso',
  }));
}

export const empezarRefuerzo = (date: string, tramos: Tramo[]) => {
  if (!tramos.length) return toast({ title: 'Nada para reforzar hoy', sub: 'No hay temas flojos', color: 'var(--salud)' }, false);
  startStudy(date, 'refuerzo', 'math', tramos);
};

/** Priorizar lo flojo y el refuerzo de hoy. */
export function Priorizar({ st, date, conLista = false }: { st: StudyState; date: string; conLista?: boolean }) {
  const r = refuerzo(st);
  const on = st.rules.priorizarFlojo;
  return (
    <section className="deb-prio" aria-label="Priorizar lo flojo">
      {conLista && (
        <>
          <div className="deb-cab"><h2>Hoy</h2><span className="sub">lo que entra en {st.rules.cap} min</span></div>
          <ul className="prio-lista">
            {r.pasos.length ? r.pasos.map(({ tema, paso }, i) => <li key={i}><span>{tema.corto[0].toUpperCase() + tema.corto.slice(1)} · {paso.texto.toLowerCase()}</span><span className="mono sub">{paso.min} min</span></li>) : <li className="sub">Nada flojo para hoy.</li>}
          </ul>
        </>
      )}
      <div className="prio-fila">
        <span>
          <b>{conLista ? 'Priorizar lo flojo' : 'Priorizar lo flojo en el repaso'}</b>
          {!conLista && <small className="sub">Si vence más de lo que entra en {st.rules.cap} min, entran primero los temas por debajo de 70 %.</small>}
        </span>
        <button role="switch" className="switch" aria-checked={on} aria-label="Priorizar lo flojo" onClick={() => setRules({ priorizarFlojo: !on })} />
      </div>
      <button className="btn-principal" disabled={!r.min} onClick={() => empezarRefuerzo(date, tramosRefuerzo(getState().study))}>Refuerzo de hoy · {r.min} min</button>
    </section>
  );
}

/** Puntaje de cada test contra el corte. */
export function PuntajeTests({ st, a }: { st: StudyState; a?: Activity }) {
  const ref = useDibujo<SVGSVGElement>([st.units]);
  if (!a) return null;
  const ex = examenes(st, a);
  const W = 320, H = 150, T = 18, B = 132;
  const n = Math.max(ex.filas.length, 1);
  const bw = Math.min(26, (W - 8) / n - 8);
  const y = (v: number) => B - (v / 100) * (B - T) * 1.05 + 0;
  return (
    <Card title="Puntaje de cada test" aside={`corte ${ex.corte} %`} className="deb-puntajes">
      {!ex.filas.length ? <Vacio>Aparece con tu primer test.</Vacio> : (
        <>
          <svg ref={ref} className="ch" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Puntaje de cada test: ${ex.filas.map((f) => `cap. ${f.n} ${Math.round((f.t.score / f.t.total) * 100)} %`).join(', ')}; corte ${ex.corte} %`}>
            {[25, 50, 75, 100].map((g) => <line key={g} x1={4} x2={W - 4} y1={y(g)} y2={y(g)} className="ch-grid" />)}
            {ex.filas.map((f, i) => {
              const v = Math.round((f.t.score / f.t.total) * 100);
              const cx = 4 + ((i + 0.5) / n) * (W - 8);
              return (
                <g key={f.n}>
                  <rect x={cx - bw / 2} y={y(v)} width={bw} height={B - y(v)} rx={2} className="crece" style={{ fill: v >= ex.corte ? 'color-mix(in srgb, var(--salud) 80%, transparent)' : 'color-mix(in srgb, var(--rutina) 85%, transparent)' }} />
                  <text x={cx} y={y(v) - 5} textAnchor="middle" className="ch-txt mono">{v}</text>
                </g>
              );
            })}
            <line x1={4} x2={W - 4} y1={y(ex.corte)} y2={y(ex.corte)} className="ch-meta" />
            <line x1={4} x2={W - 4} y1={B} y2={B} className="ch-base" />
          </svg>
          <div className="ch-ejes mono sub" style={{ gridTemplateColumns: `repeat(${n}, 1fr)` }} aria-hidden="true">{ex.filas.map((f) => <span key={f.n}>C{f.n}</span>)}</div>
          <TablaSR caption="Puntaje del último test de cada capítulo" head={['Capítulo', 'Puntaje', 'Aprobado']} rows={ex.filas.map((f) => [`Cap. ${f.n}`, `${f.t.score} de ${f.t.total}`, f.t.approved ? 'sí' : 'no'])} />
        </>
      )}
    </Card>
  );
}

/** Qué errores tuviste en cada test. */
export function ErroresPorTest({ st, a }: { st: StudyState; a?: Activity }) {
  if (!a) return null;
  const ex = examenes(st, a);
  const max = Math.max(1, ...ex.filas.map((f) => ERR_ORDEN.reduce((s, k) => s + f.t.errors[k], 0)));
  return (
    <Card title="Qué errores tuviste" aside="por test" className="deb-err-test">
      {!ex.filas.length ? <Vacio>Aparece con tu primer test.</Vacio> : (
        <>
          <ul className="err-test">
            {ex.filas.map((f) => {
              const tot = ERR_ORDEN.reduce((s, k) => s + f.t.errors[k], 0);
              return (
                <li key={f.n}>
                  <span className="mono sub">C{f.n}</span>
                  <span className="err-segs" role="img" aria-label={`Cap. ${f.n}: ${tot} errores. ${ERR_ORDEN.filter((k) => f.t.errors[k]).map((k) => `${ERR_NOMBRE[k]} ${f.t.errors[k]}`).join(', ')}`}>
                    {ERR_ORDEN.flatMap((k) => Array.from({ length: f.t.errors[k] }, (_, j) => <i key={k + j} style={{ width: `${100 / max}%`, background: ERR_COLOR[k] }} />))}
                  </span>
                  <span className="mono">{tot}</span>
                </li>
              );
            })}
          </ul>
          <Leyenda items={ERR_ORDEN.map((k) => ({ label: ERR_NOMBRE[k], color: ERR_COLOR[k], kind: 'area' as const }))} />
        </>
      )}
    </Card>
  );
}

/** Lo que fallás seguido: lo que practica cada ejercicio fallado, si se repite. */
export function Repetidos({ st }: { st: StudyState }) {
  const r = repetidos(st);
  return (
    <Card title="Lo que fallás seguido" aside="se repite" className="deb-rep">
      {!r.length ? <Vacio>Todavía no se repite ningún error entre tests en papel.</Vacio> : (
        <ul className="sang">
          {r.slice(0, 5).map((x) => (
            <li key={x.tema}><div className="sang-t"><span><b>{x.tema}</b><small className="sub">{x.caps.length > 1 ? `caps. ${x.caps.slice(0, -1).join(', ')} y ${x.caps.at(-1)}` : `cap. ${x.caps[0]}`} · {ERR_NOMBRE[x.tipo].toLowerCase()}</small></span><span className="chip-x mono">×{x.n}</span></div></li>
          ))}
        </ul>
      )}
    </Card>
  );
}

/** Simulacro dirigido: cuántos ejercicios de cada capítulo, con más peso en lo flojo. */
export function Simulacro({ st, a, fuerzas }: { st: StudyState; a?: Activity; fuerzas: Record<number, number | null> }) {
  if (!a?.units) return null;
  const s = simulacro(fuerzas).sort((x, y) => y.n - x.n || (x.fuerza ?? 101) - (y.fuerza ?? 101));
  const top = s.filter((x) => x.fuerza != null).slice(0, 5);
  const resto = s.filter((x) => !top.includes(x)).reduce((t, x) => t + x.n, 0);
  const max = Math.max(...s.map((x) => x.n), resto);
  const nombre = (n: number) => { const u = a.units!.find((x) => x.n === n)!; return u.corto ?? u.title; };
  return (
    <Card title="Simulacro dirigido" aside="40 ejercicios · 90 min" className="deb-simul">
      <p className="sub deb-nota">Arma el examen con más ejercicios de lo flojo y menos de lo que ya dominás.</p>
      <ul className="simul">
        {top.map((x) => (
          <li key={x.unit}><span>{nombre(x.unit)}</span><span className="deb-barra"><span style={{ width: `${(x.n / max) * 100}%`, background: BANDA_COLOR[banda(x.fuerza ?? 0)] }} /></span><span className="mono">{x.n}</span></li>
        ))}
        {resto > 0 && <li><span>El resto</span><span className="deb-barra"><span style={{ width: `${(resto / max) * 100}%`, background: BANDA_COLOR.bien }} /></span><span className="mono">{resto}</span></li>}
      </ul>
      <button className="btn-principal" onClick={() => ir('flojo/simulacro')}>Armar simulacro</button>
    </Card>
  );
}

export const fechaCorta = (d: string) => fmtFecha(d).split(' ')[0].toLowerCase();

/** Los tramos para arreglar un solo tema. */
export function tramosDeTema(st: StudyState, temaId: string): Tramo[] {
  const t = st.activities.length ? temaInfoSafe(st, temaId) : null;
  if (!t) return [];
  return fixPlan(st, temaId).map((paso, i) => ({
    step: 'repetir',
    kind: paso.kind === 'tarjetas' ? 'tarjetas' : paso.kind === 'releer' ? 'releer' : 'ejercicios',
    title: `${t.corto[0].toUpperCase()}${t.corto.slice(1)} · ${paso.texto[0].toLowerCase()}${paso.texto.slice(1)}`,
    sub: `Arreglar · ${t.nombre}`,
    min: paso.min,
    ref: paso.kind === 'tarjetas' ? `cards:${t.frontId}` : `fix:${t.id}:${i}`,
    activityId: t.activity?.id ?? 'repaso',
  }));
}
