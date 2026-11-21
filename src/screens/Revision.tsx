/**
 * Ola 32 · #/metas/revision: la revisión semanal del domingo (roadmap v7). Los cinco puntos (Trazo, learning.md, english.md, hours.md
 * y el plan), la semana en números (horas, publicaciones, entrevistas simuladas, versiones, spots y problemas sin IA), lo que viene en
 * las próximas dos semanas, la diferencia contra el roadmap y una nota. Las anteriores quedan en el historial.
 */
import { useState } from 'react';
import { diferenciaRoadmap, resumenDiferencia, textoDelta } from '../data/diferencia';
import { T0_PLAN } from '../data/plan';
import { alertas, calendarioCompleto } from '../data/plan-vistas';
import { RAMA_COLOR } from '../data/ramas';
import { PUNTOS_REVISION, lunesDeFecha, resumenSemana } from '../data/revision';
import { addDays } from '../data/time';
import type { DayLog } from '../data/types';
import { marcarRevisionHecha, notaRevision, sumarContador, tildarRevision } from '../state/plan';
import { inicioTrabajo, intensivaEn, useStore } from '../state/store';
import { Casilla } from '../ui/Casilla';
import { Plegable } from '../ui/Plegable';
import '../styles/plan.css';
import '../styles/etapas.css';
import '../styles/revision.css';

const MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const fc = (d: string) => `${Number(d.slice(8))} ${MES[Number(d.slice(5, 7)) - 1]}`;
const n1 = (x: number) => String(x).replace('.', ',');

export function Revision({ day }: { day: DayLog }) {
  const hoy = day.date;
  const plan = useStore((s) => s.plan);
  const days = useStore((s) => s.days);
  const settings = useStore((s) => s.settings);
  const clipping = useStore((s) => s.clipping);
  const t0 = settings?.startDate ?? T0_PLAN;
  const inicio = inicioTrabajo(settings);
  const lunes = lunesDeFecha(hoy);
  const r = plan.revisionesSemanales?.[lunes] ?? { checks: [] };
  const [nota, setNota] = useState(r.nota ?? '');
  const res = resumenSemana(lunes, hoy, { plan, days, t0, inicioTrabajo: inicio, intensiva: intensivaEn(settings, hoy) });
  const dif = resumenDiferencia(diferenciaRoadmap(calendarioCompleto(t0)));
  const viene = alertas(hoy, plan, t0, clipping, { days, inicioTrabajo: inicio }).filter((a) => a.fecha <= addDays(hoy, 14)).slice(0, 6);
  const anteriores = Object.entries(plan.revisionesSemanales ?? {}).filter(([l, x]) => l < lunes && x.hecha).sort(([a], [b]) => b.localeCompare(a));
  return (
    <main className="pantalla et-pag rev-pag" style={{ ['--c' as string]: RAMA_COLOR.programacion }}>
      <div className="topbar"><a className="volver" href="#/metas/etapas">Las 4 etapas</a><span className="mono sub">{r.hecha ? `hecha el ${fc(r.hecha)}` : `${r.checks.length} de ${PUNTOS_REVISION.length}`}</span></div>
      <header><h1 className="titulo">Revisión semanal</h1><p>Semana del {fc(res.lunes)} al {fc(res.domingo)}. El domingo a las 14:00, una hora: mirar la semana y dejar lista la que viene.</p></header>

      <section aria-labelledby="rev-p">
        <span className="etiqueta" id="rev-p">Los cinco puntos</span>
        <ul className="pp-capas">
          {PUNTOS_REVISION.map((p, i) => (
            <li key={p}>
              <Casilla checked={r.checks.includes(i)} label={`${p}: marcar`} onChange={() => tildarRevision(lunes, i)} />
              <div><b className={r.checks.includes(i) ? 'resaltado' : ''}>{p}</b></div>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="rev-n">
        <span className="etiqueta" id="rev-n">La semana en números</span>
        <dl className="rev-num">
          <div><dt>Programación</dt><dd className="mono">{n1(res.horas.prog.real)} de {n1(res.horas.prog.plan)} h</dd></div>
          <div><dt>Matemática</dt><dd className="mono">{n1(res.horas.mate.real)} de {n1(res.horas.mate.plan)} h</dd></div>
          {res.contadores.map((c) => (
            <div key={c.id}>
              <dt>{c.nombre}</dt>
              <dd className="rev-cont">
                <button className="btn-borde" aria-label={`${c.nombre}: una menos`} disabled={!c.v} onClick={() => sumarContador(hoy, c.id, -1)}>−</button>
                <span className="mono">{c.v} de {c.meta}<small className="sub"> · {c.total} en total</small></span>
                <button className="btn-borde" aria-label={`${c.nombre}: una más`} onClick={() => sumarContador(hoy, c.id, 1)}>+</button>
              </dd>
            </div>
          ))}
          <div><dt>Versiones publicadas</dt><dd>{res.versiones.length ? res.versiones.map((v) => `${v.proyecto} ${v.version}`).join(', ') : <span className="sub">ninguna</span>}</dd></div>
          <div><dt>Algorithm spots</dt><dd>{res.spots.length ? `${res.spots.length} plantados` : <span className="sub">ninguno</span>}{res.problemas ? ` · ${res.problemas} problemas sin IA` : ''}</dd></div>
        </dl>
        <p className="sub">Las horas salen del foco de cada bloque; hours.md (en el repo privado) es la copia que queda fuera de Trazo.</p>
      </section>

      {dif && <a className="fila-link" href="#/metas/diferencia">El plan termina el {fc(dif.fin)} {dif.fin.slice(0, 4)}: {textoDelta(dif.delta)} que el roadmap <span aria-hidden="true">→</span></a>}

      {viene.length > 0 && (
        <section className="et-alertas" aria-labelledby="rev-v">
          <span className="etiqueta" id="rev-v">Lo que viene (dos semanas)</span>
          {viene.map((a) => {
            const cuerpo = <><b>{a.titulo}</b><span className="sub">{a.texto}</span></>;
            return a.href ? <a key={a.id} className={`et-alerta ${a.tipo}`} href={a.href}>{cuerpo}</a> : <div key={a.id} className={`et-alerta ${a.tipo}`}>{cuerpo}</div>;
          })}
        </section>
      )}

      <section className="re-sec">
        <label className="etiqueta" htmlFor="rev-nota">Nota de la semana</label>
        <textarea id="rev-nota" className="campo-texto" rows={3} value={nota} onChange={(e) => setNota(e.target.value)} onBlur={() => notaRevision(lunes, nota)} placeholder="Qué salió, qué no y qué cambia la semana que viene" />
        {r.hecha
          ? <button className="subrayado" onClick={() => marcarRevisionHecha(lunes, null)}>Deshacer "hecha"</button>
          : <button className="btn-principal" onClick={() => { notaRevision(lunes, nota); marcarRevisionHecha(lunes, hoy); }}>Revisión hecha</button>}
      </section>

      {anteriores.length > 0 && (
        <Plegable id="rev:historial" titulo="Revisiones anteriores" resumen={`${anteriores.length}`}>
          <ul className="rev-hist">{anteriores.map(([l, x]) => <li key={l}><span className="mono sub">{fc(l)} · {x.checks.length} de {PUNTOS_REVISION.length}</span>{x.nota && <span>{x.nota}</span>}</li>)}</ul>
        </Plegable>
      )}
    </main>
  );
}
