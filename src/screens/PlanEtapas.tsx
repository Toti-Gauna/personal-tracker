/**
 * Ola 16c · las 4 etapas del Plan T+18 extendido a escala: la etapa actual marcada, el panel
 * "hoy sos" (el último perfil desbloqueado y el siguiente), las alertas de certificaciones y de
 * cierre de ventanas, y las decisiones abiertas. Cada barra tiene su lista para lectores de pantalla.
 */
import { T0_PLAN } from '../data/plan';
import { PLAN_EXT } from '../data/plan-extendido';
import { alertas, hoySos, lineaEtapas } from '../data/plan-vistas';
import type { DayLog } from '../data/types';
import { inicioTrabajo, useStore } from '../state/store';
import '../styles/plan.css';
import '../styles/etapas.css';

const MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const f = (d: string) => `${Number(d.slice(8))} ${MES[Number(d.slice(5, 7)) - 1]} ${d.slice(0, 4)}`;
const TIPO: Record<string, string> = { proyecto: 'proyecto', ventana: 'ventana de matemática', cert: 'certificación', descanso: 'descanso', colchon: 'colchón', cierre: 'cierre', sumas: 'semana de sumas' };

export function PlanEtapas({ day }: { day: DayLog }) {
  const t0 = useStore((s) => s.settings?.startDate) ?? T0_PLAN;
  const plan = useStore((s) => s.plan);
  const clipping = useStore((s) => s.clipping);
  const days = useStore((s) => s.days);
  const inicio = useStore((s) => inicioTrabajo(s.settings));
  const hoy = day.date;
  const etapas = lineaEtapas(hoy, t0);
  const total = etapas.reduce((s, e) => s + e.semanas, 0);
  const sos = hoySos(hoy, plan, t0);
  const al = alertas(hoy, plan, t0, clipping, { days, inicioTrabajo: inicio });
  return (
    <main className="pantalla et-pag">
      <div className="topbar"><a className="volver" href="#/metas">Ruta</a><span className="mono sub">{total} semanas del plan · {f(etapas[0].inicio)} a {f(etapas[3].fin)}</span></div>
      <header><h1 className="titulo">Las 4 etapas</h1><p>Cada etapa deja un perfil vendible: cortar en cualquier cierre no pierde lo anterior.</p></header>

      <section className="et-sos" aria-labelledby="et-sos-t">
        <span className="etiqueta" id="et-sos-t">Hoy sos</span>
        <b className="et-perfil">{sos.sos?.perfil ?? 'Todavía sin proyecto cerrado'}</b>
        {sos.sos && <small className="sub">{sos.sos.desde}</small>}
        {sos.vasASer && <span className="et-sig">→ vas a ser <b className="resaltado" style={{ ['--c' as string]: 'var(--ing)' }}>{sos.vasASer.perfil}</b> <small className="sub">con {sos.vasASer.con}, hasta el {f(sos.vasASer.fin)}</small></span>}
      </section>

      {al.length > 0 && (
        <section className="et-alertas" aria-label="Alertas">
          {al.map((a) => {
            const cuerpo = <><b>{a.titulo}</b><span className="sub">{a.texto}</span></>;
            return a.href ? <a key={a.id} className={`et-alerta ${a.tipo}`} href={a.href}>{cuerpo}</a> : <div key={a.id} className={`et-alerta ${a.tipo}`}>{cuerpo}</div>;
          })}
        </section>
      )}

      <a className="fila-link" href="#/metas/periodos">Períodos: tiempo contra trabajo <span aria-hidden="true">→</span></a>
      <a className="fila-link" href="#/metas/linea">Línea de tiempo <span aria-hidden="true">→</span></a>
      <a className="fila-link" href="#/metas/revision">Revisión semanal <span aria-hidden="true">→</span></a>
      <a className="fila-link" href="#/metas/compras">Hardware y trámites <span aria-hidden="true">→</span></a>
      <a className="fila-link" href="#/metas/diferencia">Diferencia contra el plan v12.1 <span aria-hidden="true">→</span></a>
      <a className="fila-link" href="#/metas/calibracion">Calibración con horas reales y escenarios <span aria-hidden="true">→</span></a>

      {etapas.map((e) => (
        <section key={e.n} className={`et-etapa ${e.estado}`} aria-labelledby={`et-${e.n}`}>
          <div className="et-cab">
            <span className="etiqueta" id={`et-${e.n}`}>Etapa {e.n} · {e.nombre}{e.estado === 'actual' ? ' · estás acá' : ''}</span>
            <span className="mono sub">{e.semanas} sem · {f(e.inicio)} a {f(e.fin)}</span>
          </div>
          <div className="et-barra" role="img" aria-label={`Etapa ${e.n}: ${e.bloques.map((b) => `${b.id} ${b.semanas} semanas`).join(', ')}`}>
            {e.bloques.map((b) => (
              <a key={b.id} href={`#/metas/proyecto/${b.id}`} className={`et-b ${b.tipo} ${b.estado}`} style={{ flexGrow: b.semanas }} title={`${b.id} · ${b.nombre} · ${f(b.inicio)} a ${f(b.fin)}`}>
                <span>{b.semanas >= 3 ? b.id : ''}</span>
              </a>
            ))}
          </div>
          <p className="et-perfil-etapa">Al cerrarla: <b>{e.perfil}</b></p>
          <details className="et-lista">
            <summary>Los {e.bloques.length} bloques</summary>
            <ul>
              {e.bloques.map((b) => (
                <li key={b.id} className={b.estado}>
                  <a href={`#/metas/proyecto/${b.id}`}>
                    <span className="mono">{b.id}</span>
                    <span>{b.nombre}{b.alternativa ? <small className="sub"> · o {b.alternativa}</small> : null}{b.recortable ? <small className="sub"> · recortable</small> : null}</span>
                    <span className="mono sub">{b.pausa ? 'pausa de fin de año' : TIPO[b.tipo]} · {f(b.inicio)} · {b.horas ? `${b.horas} h` : `${b.semanas} sem`}{b.semanas > b.base && !b.pausa && b.horas == null && b.dias == null ? ` (+${b.semanas - b.base - b.atraso})` : ''}{b.pausasDentro?.length ? ' · partido por la pausa' : ''}</span>
                  </a>
                </li>
              ))}
            </ul>
          </details>
        </section>
      ))}

      <div className="et-ley mono" aria-hidden="true">
        {['proyecto', 'ventana', 'cert', 'descanso', 'colchon', 'cierre'].map((t) => <span key={t}><i className={`et-b ${t}`} />{TIPO[t]}</span>)}
      </div>

      <section className="et-dec" aria-labelledby="et-dec-t">
        <span className="etiqueta" id="et-dec-t">Decisiones abiertas · se deciden a mano, Trazo no las resuelve</span>
        <ul>{PLAN_EXT.decisiones.map((d) => <li key={d.id}>{d.texto}{d.fecha ? <span className="mono sub"> · {f(d.fecha)}</span> : null}</li>)}</ul>
      </section>
    </main>
  );
}
