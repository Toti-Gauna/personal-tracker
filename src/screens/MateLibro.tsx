/**
 * Ola 28 · el libro de matemática por dentro (#/estudio/mate/libro/:id) y cada capítulo (#/estudio/mate/libro/:id/:n).
 * Lo que sirve para estudiar: en qué capítulo estás y qué sigue, el % de los tests, las tarjetas para repasar (e
 * importarlas a ese capítulo), el examen del libro y el historial de días. Las reglas generales quedan plegadas.
 */
import { useRef, useState } from 'react';
import { AREAS } from '../data/defaults';
import { capitulos, cuando, estadoCapitulo, historial, resumenLibro, tarjetasDe, type DiaHistorial, type InfoCap } from '../data/estado-capitulo';
import { actShort, arranco, parseCardsText } from '../data/study';
import { PUNTOS_CAP } from '../data/study-catalog';
import type { Activity, ReviewItem } from '../data/study-types';
import type { DayLog } from '../data/types';
import { ir } from '../lib/routes';
import { getState, useStore } from '../state/store';
import { addCards, seguirEstudiando, terminarEstudio, volverAEstudiar } from '../state/study';
import { toast } from '../ui/avisos';
import { abrirEstadoEstudio } from '../ui/EstadoEstudio';
import { Plegable } from '../ui/Plegable';
import '../styles/estudio.css';
import '../styles/roadmap-estudio.css';
import '../styles/mate-libro.css';

const MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const fCorta = (d: string) => `${Number(d.slice(8))} ${MES[Number(d.slice(5, 7)) - 1]}`;
const QUE: Record<ReviewItem['kind'], string> = { cold: 'Cold recall', tesis: 'Tesis', releer: 'Releer lo que falló', retest: 'Re-test', ejercicios: 'Repaso con ejercicios', examen: 'Examen corto' };

function useLibro(id: string) {
  const study = useStore((s) => s.study);
  const a = study.activities.find((x) => x.id === id && x.units?.length);
  const front = study.fronts.find((f) => f.id === a?.front);
  return { study, a, color: front ? AREAS[front.color].css : 'var(--ing)' };
}

/** #/estudio/mate/libro/:id[/:n] */
export function MateLibro({ day, param }: { day: DayLog; param: string }) {
  const [, , id, n] = param.split('/');
  const { a } = useLibro(id ?? '');
  if (!a) return <main className="pantalla"><div className="topbar"><a className="volver" href="#/estudio/mate">Matemática</a></div><p className="sub">No encontré ese libro.</p></main>;
  return n ? <Capitulo key={`${id}:${n}`} day={day} a={a} n={Number(n)} /> : <Libro day={day} a={a} />;
}

/** Fila corta de un libro para el tramo y la pantalla de Matemática. */
export function FilaLibro({ a, hoy }: { a: Activity; hoy: string }) {
  const study = useStore((s) => s.study);
  const r = resumenLibro(study, a, hoy);
  const empezo = arranco(study, a);
  return (
    <a className="ml-fila-libro" href={`#/estudio/mate/libro/${a.id}`}>
      <span className="ml-fl-t"><b>{actShort(a)}</b><span className="mono sub">{r.aprobados}/{r.total} aprobados{r.promedio != null ? ` · ${r.promedio} %` : ''}</span></span>
      <span className="sub">{!empezo ? `Arranca al terminar ${actShort(study.activities.find((x) => x.id === a.despuesDe)!)}` : r.enCurso ? `${a.unitLabel ?? 'Cap.'} ${r.enCurso.n} · ${r.enCurso.unit.title} · ${r.enCurso.etiqueta}` : 'Todos los capítulos aprobados'}{r.tarjetas ? ` · ${r.tarjetas} tarjetas` : ''}</span>
      <span className="ml-barra" aria-hidden="true"><span style={{ width: `${(r.aprobados / Math.max(1, r.total)) * 100}%` }} /></span>
    </a>
  );
}

function Libro({ day, a }: { day: DayLog; a: Activity }) {
  const { study, color } = useLibro(a.id);
  const days = useStore((s) => s.days);
  const hoy = day.date;
  const r = resumenLibro(study, a, hoy);
  const cs = capitulos(study, a, hoy);
  const h = historial(study, days, a);
  const empezo = arranco(study, a);
  const c = r.enCurso;
  return (
    <main className="pantalla re ml" style={{ ['--c' as string]: color }}>
      <div className="topbar"><a className="volver" href="#/estudio/mate">Matemática</a><span className="mono sub">{r.total} capítulos</span></div>
      <div className="kicker">{a.title.split(' · ')[0]} · {a.testMode === 'papel' ? 'tests en papel' : 'tests en la app'}</div>
      <header><h1 className="titulo">{actShort(a)}</h1></header>

      <div className="numeros">
        <div><b className="mono">{r.aprobados}/{r.total}</b><span>capítulos aprobados</span></div>
        <div><b className="mono">{r.promedio == null ? '—' : `${r.promedio} %`}</b><span>promedio de los tests (85 % aprueba)</span></div>
        <div><b className="mono">{r.tarjetas}</b><span>tarjetas</span></div>
      </div>

      {!empezo ? (
        <p className="sub">Arranca cuando termines {actShort(study.activities.find((x) => x.id === a.despuesDe)!)}: hasta entonces no entra en el día.</p>
      ) : c ? (
        <section className="ml-ahora" aria-labelledby="ml-ahora-t">
          <span className="etiqueta" id="ml-ahora-t">Estás acá</span>
          <a href={`#/estudio/mate/libro/${a.id}/${c.n}`}><b>{a.unitLabel ?? 'Cap.'} {c.n} · {c.unit.title}</b><span className="mono sub">{c.etiqueta}</span></a>
          {c.proximo && c.estado !== 'estudiando' && <p className="sub">Sigue: {c.proximo.que.toLowerCase()} ({cuando(c.proximo.fecha, hoy)}).</p>}
          <button className="btn-principal" onClick={() => abrirEstadoEstudio(hoy, { actividades: [a.id] })}>Marcar dónde quedé</button>
        </section>
      ) : null}

      <div className="dos-botones">
        <a className="btn-borde" href={`#/tarjetas/libro:${a.id}`} aria-disabled={!r.tarjetas}>Repasar tarjetas ({r.tarjetas})</a>
        {c && <a className="btn-borde" href={`#/estudio/mate/libro/${a.id}/${c.n}`}>Importar tarjetas</a>}
      </div>

      <section className="re-sec">
        <span className="etiqueta">Capítulos</span>
        <ul className="ml-caps">
          {cs.map((x) => (
            <li key={x.n} className={`ml-cap ml-e-${x.estado}`}>
              <a href={`#/estudio/mate/libro/${a.id}/${x.n}`}>
                <span className="ml-cap-n mono">{x.n}</span>
                <span className="ml-cap-t"><b>{x.unit.title}</b><small className="sub">{resumenCap(x)}</small></span>
                <span className="ml-chip mono">{x.etiqueta}</span>
              </a>
            </li>
          ))}
        </ul>
      </section>

      {r.final && (
        <section className="re-sec">
          <span className="etiqueta">Test del libro · {r.final.titulo}</span>
          <p className="sub">{r.final.desc}</p>
          {r.final.aprobado ? <p className="mono">Aprobado{r.final.ultimo != null ? ` · ${r.final.ultimo} %` : ''}</p>
            : r.final.disponible ? <button className="btn-borde" onClick={() => ir(`test/${a.id}/final`)}>Registrar el examen{r.final.ultimo != null ? ` (último: ${r.final.ultimo} %)` : ''}</button>
            : <p className="sub">Se habilita con los {r.total} capítulos aprobados ({r.aprobados}/{r.total}).</p>}
        </section>
      )}

      <Plegable id={`ml:hist:${a.id}`} titulo="Historial de días" resumen={h.length ? `${h.length} ${h.length === 1 ? 'día' : 'días'}` : 'vacío'}>
        <Historial h={h} />
      </Plegable>
    </main>
  );
}

function resumenCap(x: InfoCap) {
  const p: string[] = [];
  if (x.tests.length) p.push(`${x.tests.length} ${x.tests.length === 1 ? 'test' : 'tests'} · mejor ${x.mejor} %`);
  if (x.tarjetas) p.push(`${x.tarjetas} tarjetas`);
  return p.join(' · ') || (x.estado === 'pendiente' ? 'todavía no' : 'sin tests todavía');
}

function Historial({ h }: { h: DiaHistorial[] }) {
  if (!h.length) return <p className="sub">Todavía no hay días con estudio de este libro. Se arma solo con las sesiones, los tests, las tesis y las tarjetas.</p>;
  return (
    <ul className="ml-hist">
      {h.slice(0, 30).map((d) => (
        <li key={d.fecha}>
          <span className="mono">{fCorta(d.fecha)}{d.min ? ` · ${d.min} min` : ''}</span>
          {d.eventos.length > 0 && <ul>{d.eventos.map((e, i) => <li key={i}>{e}</li>)}</ul>}
        </li>
      ))}
    </ul>
  );
}

function Capitulo({ day, a, n }: { day: DayLog; a: Activity; n: number }) {
  const { study, color } = useLibro(a.id);
  const days = useStore((s) => s.days);
  const hoy = day.date;
  if (!a.units?.some((u) => u.n === n)) return <main className="pantalla"><div className="topbar"><a className="volver" href={`#/estudio/mate/libro/${a.id}`}>{actShort(a)}</a></div><p className="sub">No existe ese capítulo.</p></main>;
  const c = estadoCapitulo(study, a, n, hoy);
  const cards = tarjetasDe(study, a.id, n);
  const h = historial(study, days, a, n);
  const puntos = study.points[`${a.id}:${n}`]?.length ? study.points[`${a.id}:${n}`] : PUNTOS_CAP[a.id]?.[n] ?? [];
  const total = a.units.length;
  const nombre = `${a.unitLabel ?? 'Cap.'} ${n} · ${c.unit.title}`;
  const ok = (title: string, sub: string) => toast({ title, sub, color }, false);
  const done = (getState().days[hoy]?.studyDone ?? []).includes(`learn:${a.id}:${n}`);
  return (
    <main className="pantalla re ml" style={{ ['--c' as string]: color }}>
      <div className="topbar"><a className="volver" href={`#/estudio/mate/libro/${a.id}`}>{actShort(a)}</a><span className="mono sub">{a.unitLabel ?? 'Cap.'} {n} de {total}</span></div>
      <div className="kicker">{c.etiqueta}</div>
      <header><h1 className="titulo">{c.unit.title}</h1>{c.proximo && <p>{c.estado === 'estudiando' ? 'Cuando lo termines, marcalo: al día siguiente van el cold recall y el test.' : `Sigue: ${c.proximo.que.toLowerCase()} (${cuando(c.proximo.fecha, hoy)}).`}</p>}</header>

      <section className="ml-ahora" aria-label="Dónde quedaste">
        {c.estado === 'estudiando' && (
          <>
            <button className="btn-borde" aria-pressed={done} onClick={() => { seguirEstudiando(hoy, a.id, n); ok('Sigue el mismo capítulo', `${nombre}: mañana continúa, sin test todavía`); }}>{done ? 'Sigo estudiándolo ✓' : 'Sigo estudiándolo'}</button>
            <button className="btn-principal" onClick={() => { const e = terminarEstudio(hoy, a.id, n); if (e) toast({ title: e, color: 'var(--handyx)' }, false); else ok('Capítulo estudiado', 'Mañana: cold recall y test completo'); }}>Lo terminé · test mañana</button>
          </>
        )}
        {(c.estado === 'test' || c.estado === 'retest') && (
          <>
            <button className="btn-principal" onClick={() => ir(`test/${a.id}/${n}`)}>Hice el test · cargar el resultado</button>
            {c.estado === 'test' && !c.tests.length && <button className="btn-borde" onClick={() => { if (volverAEstudiar(a.id, n)) ok('Volvió a "estudiando"', `${nombre}: se sacaron el cold recall y el test`); }}>Todavía no lo terminé</button>}
          </>
        )}
        {c.estado === 'tesis' && c.tesis && <button className="btn-principal" onClick={() => ir(`tesis/${c.tesis!.id}`)}>Escribir la tesis</button>}
        {c.estado === 'pendiente' && <p className="sub">Todavía no: se estudia después de los anteriores.</p>}
        {(c.estado === 'repasos' || c.estado === 'cerrado' || c.estado === 'flojo') && <p className="sub">{c.estado === 'cerrado' ? 'Cerrado: pasó todos sus repasos.' : 'Los repasos se agendan solos; aparecen en el día cuando vencen.'}</p>}
      </section>

      <section className="re-sec">
        <div className="fila-t"><span className="etiqueta">Tarjetas · {cards.length}</span>{cards.length > 0 && <a className="subrayado" href={`#/tarjetas/cap:${a.id}:${n}`}>Repasar</a>}</div>
        {cards.length > 0 ? (
          <Plegable id={`ml:tarj:${a.id}:${n}`} titulo="Ver las tarjetas" resumen={`${cards.filter((x) => !x.srs || x.srs.state === 'new').length} nuevas`}>
            <ul className="ml-tarjetas">{cards.map((x) => <li key={x.id}><b>{x.front}</b><small className="sub">{x.back}</small></li>)}</ul>
          </Plegable>
        ) : <p className="sub">Este capítulo todavía no tiene tarjetas. Las crean el cold recall, la tesis y los errores del test, o las importás acá.</p>}
        <Importar a={a} n={n} hoy={hoy} />
      </section>

      <section className="re-sec">
        <span className="etiqueta">Tests{c.mejor != null ? ` · mejor ${c.mejor} %` : ''}</span>
        {c.tests.length ? (
          <ul className="ml-tests">
            {c.tests.map((t, i) => <li key={i}><span className="mono">{fCorta(t.date)}</span><span>{i ? 'Re-test' : 'Test'} · {t.score}/{t.total}</span><b className="mono">{Math.round((t.score / t.total) * 100)} %{t.approved ? ' ✓' : ''}</b></li>)}
          </ul>
        ) : <p className="sub">{c.unit.test.desc} Aprobás con 85 %.</p>}
      </section>

      {c.repasos.length > 0 && (
        <Plegable id={`ml:rep:${a.id}:${n}`} titulo="Repasos agendados" resumen={`${c.repasos.filter((r) => !r.doneOn).length} pendientes`}>
          <ul className="ml-tests">{c.repasos.map((r) => <li key={r.id}><span className="mono">{fCorta(r.due)}</span><span>{QUE[r.kind]}</span><b className="mono">{r.doneOn ? `hecho ${fCorta(r.doneOn)}` : cuando(r.due, hoy)}</b></li>)}</ul>
        </Plegable>
      )}

      {puntos.length > 0 && (
        <Plegable id={`ml:puntos:${a.id}:${n}`} titulo="Puntos clave del cold recall" resumen={`${puntos.length} puntos`}>
          <ul className="ml-tarjetas">{puntos.map((p) => { const [t, d] = p.split('::').map((x) => x.trim()); return <li key={p}><b>{t}</b>{d && <small className="sub">{d}</small>}</li>; })}</ul>
        </Plegable>
      )}

      <Plegable id={`ml:hist:${a.id}:${n}`} titulo="Historial" resumen={h.length ? `${h.length} ${h.length === 1 ? 'día' : 'días'}` : 'vacío'}>
        <Historial h={h} />
      </Plegable>

      <nav className="re-nav" aria-label="Otros capítulos">
        {n > 1 ? <a href={`#/estudio/mate/libro/${a.id}/${n - 1}`}>← {a.unitLabel ?? 'Cap.'} {n - 1}</a> : <span />}
        {n < total ? <a href={`#/estudio/mate/libro/${a.id}/${n + 1}`}>{a.unitLabel ?? 'Cap.'} {n + 1} →</a> : <span />}
      </nav>
    </main>
  );
}

/** Importar tarjetas a este capítulo: un .txt de Anki (frente y dorso con tab) o líneas con :: y [[ ]]. */
function Importar({ a, n, hoy }: { a: Activity; n: number; hoy: string }) {
  const [texto, setTexto] = useState('');
  const archivo = useRef<HTMLInputElement>(null);
  const st = getState().study;
  const deck = st.fronts.find((f) => f.id === a.front)?.name ?? 'General';
  const cargar = (t: string, origen: string) => {
    const cs = parseCardsText(t);
    if (!cs.length) { toast({ title: 'No encontré tarjetas', sub: 'Una por línea con :: o [[ ]], o un .txt de Anki (frente<tab>dorso)', color: 'var(--rutina)' }, false); return; }
    addCards(hoy, cs.map((c) => ({ ...c, deck, frontId: a.front, activityId: a.id, unit: n, source: origen })));
    setTexto('');
    toast({ title: `${cs.length} tarjetas en el cap. ${n}`, sub: `Entran de a ${st.rules.newPerDay} nuevas por día en el repaso`, color: 'var(--ing)' }, false);
  };
  return (
    <Plegable id={`ml:imp:${a.id}:${n}`} titulo="Importar tarjetas a este capítulo" resumen="Anki o ::">
      <div className="ml-imp">
        <label className="sub" htmlFor={`imp-${a.id}-${n}`}>Pegá un .txt de Anki (frente y dorso separados por tab) o una tarjeta por línea: <span className="mono">pregunta :: respuesta</span> o una frase con <span className="mono">[[palabra]]</span>.</label>
        <textarea id={`imp-${a.id}-${n}`} className="campo-texto" rows={4} value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="¿Qué es un número racional? :: El cociente de dos enteros con divisor distinto de cero." />
        <div className="dos-botones">
          <button className="btn-principal" disabled={!texto.trim()} onClick={() => cargar(texto, `${actShort(a)} · cap. ${n}`)}>Cargar</button>
          <button className="btn-borde" onClick={() => archivo.current?.click()}>Elegir archivo</button>
        </div>
        <input ref={archivo} type="file" accept=".txt,.tsv,.csv,text/plain" hidden onChange={(e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          const rd = new FileReader();
          rd.onload = () => cargar(String(rd.result ?? ''), `${actShort(a)} · cap. ${n} · ${f.name.replace(/\.[^.]+$/, '')}`);
          rd.readAsText(f);
          e.target.value = '';
        }} />
      </div>
    </Plegable>
  );
}
