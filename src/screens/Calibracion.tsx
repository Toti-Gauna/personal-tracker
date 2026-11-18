/** Ola 24 · #/metas/calibracion: horas estimadas contra reales, el factor tras P3 y los escenarios del plan v2. */
import { useMemo } from 'react';
import { FACTOR_MAX, FACTOR_MIN, HORAS_PROG_SEMANA, calibrar, escenarios, proyectar, sugerencia } from '../data/calibracion';
import { deudaMatematica, registroDiario } from '../data/control';
import { T0_PLAN } from '../data/plan';
import { addDays } from '../data/time';
import { calendarioCompleto } from '../data/plan-vistas';
import { RAMA_COLOR } from '../data/ramas';
import type { DayLog } from '../data/types';
import { apagarExtras } from '../state/plan';
import { inicioTrabajo, useStore } from '../state/store';
import { toast } from '../ui/avisos';
import '../styles/plan.css';
import '../styles/etapas.css';

const MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const f = (d: string) => `${Number(d.slice(8))} ${MES[Number(d.slice(5, 7)) - 1]} ${d.slice(0, 4)}`;
const n1 = (x: number) => String(x).replace('.', ',');

export function Calibracion({ day }: { day: DayLog }) {
  const hoy = day.date;
  const t0 = useStore((s) => s.settings?.startDate) ?? T0_PLAN;
  const plan = useStore((s) => s.plan);
  const days = useStore((s) => s.days);
  const inicio = useStore((s) => inicioTrabajo(s.settings));
  const d = useMemo(() => {
    const cal = calendarioCompleto(t0);
    const c = calibrar(cal, days, plan, hoy);
    const horas = cal.reduce((s, b) => s + (b.horas ?? 0), 0);
    const fin = cal.reduce((m, b) => (b.fin > m ? b.fin : m), cal[0].fin);
    const cerrados = c.hito === 'P3' ? ['P0', 'P1', 'P2', 'P3'] : c.hito === 'P2' ? ['P0', 'P1', 'P2'] : [];
    return { cal, c, horas, fin, sug: sugerencia(c, cal, hoy), proy: c.factor != null ? proyectar(c.factor, t0, cerrados) : null, esc: escenarios(t0, cerrados) };
  }, [t0, plan, days, hoy]);
  const { c } = d;
  const max = Math.max(1, ...c.filas.map((x) => Math.max(x.estimadas, x.reales)));
  return (
    <main className="pantalla plan-proy cal-pag" style={{ ['--c' as string]: RAMA_COLOR.programacion }}>
      <div className="topbar"><a className="volver" href="#/metas/etapas">Las 4 etapas</a><span className="mono sub">{n1(d.horas)} h · hasta el {f(d.fin)}</span></div>
      <header><h1 className="titulo">Calibración</h1><p>Horas estimadas contra horas reales de programación. El factor se calcula al cerrar P2 y otra vez al cerrar P3, y se aplica a lo que falta: Trazo propone, vos decidís.</p></header>

      <section className="cal-factor" aria-labelledby="cal-f">
        <span className="etiqueta" id="cal-f">Factor real / estimado</span>
        {c.factor != null ? (
          <>
            <b className="mono cal-n">{n1(c.factor)}</b>
            <span className="sub">{n1(c.reales)} h reales de {n1(c.estimadas)} h estimadas en los proyectos cerrados (hasta {c.hito}) · en plan entre {n1(FACTOR_MIN)} y {n1(FACTOR_MAX)}</span>
          </>
        ) : (
          <>
            <b className="cal-espera">Se calcula al cerrar P2{c.cuando ? `, el ${f(c.cuando)}` : ''}, y otra vez al cerrar P3</b>
            <span className="sub">Las horas reales salen del foco de los bloques de programación. Estimadas: semanas del plan × {n1(HORAS_PROG_SEMANA)} h.</span>
          </>
        )}
      </section>

      {d.sug && (
        <section className={`cal-sug ${c.regla}`}>
          <p>{d.sug.texto}</p>
          {d.sug.recortar.length > 0 && <p className="sub">Recortar alcance (a mano, en cada proyecto): {d.sug.recortar.join(', ')}.</p>}
          {d.sug.claves.length > 0
            ? <button className="btn-principal" onClick={() => { apagarExtras(d.sug!.claves); toast({ title: `${d.sug!.claves.length} extras apagadas`, sub: 'Se prenden de nuevo en cada proyecto o en Ajustes', color: RAMA_COLOR.programacion }, false); }}>Apagar {d.sug.claves.length} {d.sug.claves.length === 1 ? 'extra' : 'extras'}</button>
            : <p className="sub">No queda nada por apagar: las extras sugeridas ya están apagadas o esos proyectos ya empezaron.</p>}
        </section>
      )}
      {c.regla === 'en-plan' && <p className="sub">Vas en plan: no hace falta tocar nada.</p>}

      <span className="etiqueta">Horas por proyecto</span>
      {c.filas.length === 0 ? <p className="sub">Todavía no empezó ningún proyecto.</p> : (
        <ul className="cal-filas">
          {c.filas.map((x) => (
            <li key={x.id}>
              <span className="cal-fila-t"><b className="mono">{x.id}</b> {x.nombre}<small className="mono sub">{x.enCurso ? 'en curso' : 'cerrado'} · {n1(x.reales)} / {n1(x.estimadas)} h</small></span>
              <span className="cal-barras" aria-hidden="true"><i className="est" style={{ width: `${(x.estimadas / max) * 100}%` }} /><i className="real" style={{ width: `${(x.reales / max) * 100}%` }} /></span>
            </li>
          ))}
        </ul>
      )}

      <span className="etiqueta">Registro diario · últimos 7 días</span>
      <ul className="cal-filas" aria-label="Horas por día">
        {registroDiario(days, addDays(hoy, -6), hoy, { t0, inicioTrabajo: inicio }).map((r) => (
          <li key={r.fecha}>
            <span className="cal-fila-t"><b className="mono">{Number(r.fecha.slice(8))} {MES[Number(r.fecha.slice(5, 7)) - 1]}</b> {r.proyecto}<small className="mono sub">prog {n1(r.progReal)} / {n1(r.progPlan)} h · mate {n1(r.mateReal)} / {n1(r.matePlan)} h</small></span>
          </li>
        ))}
      </ul>
      {(() => { const deuda = deudaMatematica(hoy, { t0, inicioTrabajo: inicio }); return deuda.horas > 0 ? <p className="sub">Matemática: en el modo intensivo son 7 h por semana en lugar de 14. Deuda acumulada: <b>{n1(deuda.horas)} h</b> (se recupera con trabajo, a 14 h por semana).</p> : null; })()}

      <span className="etiqueta">Escenarios</span>
      <ul className="cal-esc">
        <li className="actual"><b>Calendario actual</b><span className="mono">{n1(d.horas)} h · {f(d.fin)}</span><small className="sub">Con las extras y la pausa como las tenés ahora.</small></li>
        {d.proy && <li className="tuyo"><b>Con tu factor</b><span className="mono">{n1(d.proy.horas)} h · {f(d.proy.fin)}</span><small className="sub">Las horas de lo que falta × {n1(c.factor!)}; los descansos y la pausa de fin de año no cambian.</small></li>}
        {d.esc.map((e) => <li key={e.id}><b>{e.nombre} · {n1(e.factor)}</b><span className="mono">{n1(e.horas)} h · {f(e.fin)}</span><small className="sub">{e.supuesto}</small></li>)}
      </ul>
      <p className="sub">Los tres escenarios salen del calendario por horas con un factor de 0,85, 1,00 y 1,15 sobre lo que falta; no son supuestos escritos a mano.</p>
    </main>
  );
}
