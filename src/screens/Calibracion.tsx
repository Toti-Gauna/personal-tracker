/** Ola 24 · #/metas/calibracion: horas estimadas contra reales, el factor tras P3 y los escenarios del plan v2. */
import { useMemo } from 'react';
import { ESCENARIOS_V2, FACTOR_MAX, FACTOR_MIN, calibrar, proyectar, sugerencia } from '../data/calibracion';
import { T0_PLAN } from '../data/plan';
import { calendarioCompleto } from '../data/plan-vistas';
import { RAMA_COLOR } from '../data/ramas';
import type { DayLog } from '../data/types';
import { apagarExtras } from '../state/plan';
import { useStore } from '../state/store';
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
  const d = useMemo(() => {
    const cal = calendarioCompleto(t0);
    const c = calibrar(cal, days, plan, hoy);
    const total = cal.reduce((s, b) => s + b.semanas, 0);
    const fin = cal.reduce((m, b) => (b.fin > m ? b.fin : m), cal[0].fin);
    return { cal, c, total, fin, sug: sugerencia(c, cal, hoy), proy: c.factor != null ? proyectar(cal, c.factor, hoy) : null };
  }, [t0, plan, days, hoy]);
  const { c } = d;
  const max = Math.max(1, ...c.filas.map((x) => Math.max(x.estimadas, x.reales)));
  return (
    <main className="pantalla plan-proy cal-pag" style={{ ['--c' as string]: RAMA_COLOR.programacion }}>
      <div className="topbar"><a className="volver" href="#/metas/etapas">Las 4 etapas</a><span className="mono sub">{d.total} semanas · hasta el {f(d.fin)}</span></div>
      <header><h1 className="titulo">Calibración</h1><p>Horas estimadas contra horas reales de programación. Al cerrar P3 se calcula el factor y se revisa al cerrar cada etapa: Trazo propone, vos decidís.</p></header>

      <section className="cal-factor" aria-labelledby="cal-f">
        <span className="etiqueta" id="cal-f">Factor real / estimado</span>
        {c.factor != null ? (
          <>
            <b className="mono cal-n">{n1(c.factor)}</b>
            <span className="sub">{n1(c.reales)} h reales de {n1(c.estimadas)} h estimadas en los proyectos cerrados · en plan entre {n1(FACTOR_MIN)} y {n1(FACTOR_MAX)}</span>
          </>
        ) : (
          <>
            <b className="cal-espera">Se calcula al cerrar P3{c.cuando ? `, el ${f(c.cuando)}` : ''}</b>
            <span className="sub">Las horas reales salen del foco de los bloques de programación. Estimadas: semanas de trabajo × 25,5 h.</span>
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

      <span className="etiqueta">Escenarios</span>
      <ul className="cal-esc">
        <li className="actual"><b>Calendario actual</b><span className="mono">{d.total} sem · {f(d.fin)}</span><small className="sub">Con las extras y la pausa como las tenés ahora.</small></li>
        {d.proy && <li className="tuyo"><b>Con tu factor</b><span className="mono">{d.proy.semanas} sem · {f(d.proy.fin)}</span><small className="sub">Las semanas de proyecto que faltan × {n1(c.factor!)}; ventanas, certificaciones y pausas no cambian.</small></li>}
        {ESCENARIOS_V2.map((e) => <li key={e.id}><b>{e.nombre}</b><span className="mono">{e.semanas} sem · {f(e.fin)}</span><small className="sub">{e.supuesto}</small></li>)}
      </ul>
      <p className="sub">Los tres escenarios son supuestos de la v2, sin verificar: se recalibran con tus horas reales. Ventanas, certificaciones y pausas no se comprimen.</p>
    </main>
  );
}
