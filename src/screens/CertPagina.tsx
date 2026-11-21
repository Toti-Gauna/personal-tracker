/**
 * v12.1 · #/metas/cert/<id>: una certificación. El plan día por día (hoy resaltado), los recursos, los simulacros contra el puntaje
 * para estar listo, la fecha del examen y su reserva (una fecha reservada queda fija), aprobada y la renovación (a verificar).
 */
import { useState } from 'react';
import { certV12, estadoCert } from '../data/certs-v12';
import { claveHito } from '../data/periodos-plan';
import { RAMA_COLOR } from '../data/ramas';
import type { DayLog } from '../data/types';
import { cargarMock, marcarHito, reservarExamen } from '../state/plan';
import { useStore } from '../state/store';
import { Casilla } from '../ui/Casilla';
import { fp, hrefPeriodo } from '../ui/PeriodoTarjeta';
import '../styles/plan.css';
import '../styles/etapas.css';
import '../styles/periodos.css';

export function CertPagina({ day, id }: { day: DayLog; id: string }) {
  const hoy = day.date;
  const plan = useStore((s) => s.plan);
  const c = certV12(id);
  const [pct, setPct] = useState('');
  const [fecha, setFecha] = useState(() => plan.reservas?.[id]?.examen ?? c?.examen ?? hoy);
  if (!c) return <main className="pantalla et-pag"><div className="topbar"><a className="volver" href="#/metas/periodos">Períodos</a></div><p className="sub">No hay una certificación con ese id.</p></main>;
  const e = estadoCert(c, plan, hoy);
  const agregar = () => { const n = Number(pct.replace(',', '.')); if (n >= 0 && n <= 100) { cargarMock(id, hoy, n); setPct(''); } };
  return (
    <main className="pantalla et-pag pd-pag" style={{ ['--c' as string]: RAMA_COLOR.programacion }}>
      <div className="topbar"><a className="volver" href={hrefPeriodo(c.bloque)}>{c.bloqueNombre}</a><span className="mono sub">{e.diasAlExamen >= 0 ? `examen en ${e.diasAlExamen} días` : 'examen pasado'}</span></div>
      <header><h1 className="titulo">{c.nombre}</h1><p>{c.horas} h de estudio{c.opcional ? ' · opcional' : ''}{c.requiere ? ` · requiere ${c.requiere}` : ''}{c.costo ? ` · ${c.costo}${c.costoVerificado ? '' : ' (sin verificar)'}` : ''}</p></header>

      <section aria-labelledby="cp-ex">
        <span className="etiqueta" id="cp-ex">Examen</span>
        <p><b>{fp(e.examen)}</b> {e.reservado ? `· reservado el ${fp(plan.reservas![id].reservado)} (fecha fija: nada la corre)` : '· sin reservar'}</p>
        <div className="cp-mocks">
          <input className="campo-texto mono" type="date" aria-label="Fecha del examen" value={fecha} onChange={(x) => setFecha(x.target.value)} />
          <button className="btn-borde" onClick={() => reservarExamen(id, fecha, hoy)}>{e.reservado ? 'Cambiar la reserva' : 'Reservé para esa fecha'}</button>
          {e.reservado && <button className="subrayado" onClick={() => reservarExamen(id, null, hoy)}>Deshacer</button>}
        </div>
        {c.fallback && <p className="sub">Si no llegás: {c.fallback}.</p>}
      </section>

      <section aria-labelledby="cp-plan">
        <span className="etiqueta" id="cp-plan">El plan día por día</span>
        <ul className="cp-lista">{c.plan.map((x) => <li key={x.fecha + x.texto} className={x.fecha === hoy ? 'hoy' : ''}><span className="mono">{fp(x.fecha)}</span> · {x.texto}{x.fecha === hoy ? ' ← hoy' : ''}</li>)}</ul>
        <p className="sub">Recursos: {c.recursos.join(' · ')}</p>
      </section>

      <section aria-labelledby="cp-mk">
        <span className="etiqueta" id="cp-mk">Simulacros</span>
        <p>{typeof e.meta === 'number'
          ? <>Para estar listo: <b>{e.meta} %</b> · {e.ultimo == null ? 'todavía sin simulacros' : <>el mejor de los últimos dos: <b className={e.listo ? 'resaltado' : ''}>{e.ultimo} %</b> {e.listo ? '· listo' : `· faltan ${e.meta - e.ultimo} puntos`}</>}</>
          : <>Para estar listo: {e.meta ?? 'sin criterio'}</>}</p>
        <div className="cp-mocks">
          <input className="campo-texto mono" inputMode="decimal" placeholder="%" aria-label="Puntaje del simulacro" value={pct} onChange={(x) => setPct(x.target.value)} onKeyDown={(x) => x.key === 'Enter' && agregar()} />
          <button className="btn-borde" onClick={agregar} disabled={!pct.trim()}>Cargar simulacro</button>
          {e.mocks.length > 0 && <button className="subrayado" onClick={() => cargarMock(id, hoy, null)}>Borrar el último</button>}
        </div>
        {e.mocks.length > 0 && <ul className="cp-lista">{e.mocks.map((m, i) => <li key={i}><span className="mono">{fp(m.fecha)}</span> · {m.pct} %</li>)}</ul>}
      </section>

      <section aria-labelledby="cp-ap">
        <span className="etiqueta" id="cp-ap">Resultado y renovación</span>
        <ul className="vm-hitos"><li><Casilla checked={!!e.aprobada} label={`${c.nombre}: aprobada`} onChange={() => marcarHito(claveHito.cert(id), e.aprobada ? null : hoy)} /><div><b>{e.aprobada ? `Aprobada el ${fp(e.aprobada)}` : 'Aprobada'}</b>{e.renovacion && <span className="sub">{e.renovacion.vence ? `Vence el ${fp(e.renovacion.vence)} · ` : ''}{e.renovacion.nota}</span>}</div></li></ul>
      </section>
      {c.miniProyecto && <p className="sub">Mini proyecto: <b>{c.miniProyecto.nombre}</b> ({fp(c.miniProyecto.fecha)}): {c.miniProyecto.texto}</p>}
    </main>
  );
}
