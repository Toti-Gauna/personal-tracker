import { PLAN, SEMANAS, fechaCorta, fechaHito, hitoSemana, proximasEntregas, proyectos, finSemana, type Entrega } from '../data/plan';
import { RAMA_COLOR } from '../data/ramas';
import { fmtFecha } from '../data/time';
import type { DayLog } from '../data/types';
import { DeA } from '../ui/PlanBits';
import { usePlanVista } from '../ui/usePlan';
import '../styles/plan.css';

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const mesAnio = (d: string) => `${MESES[Number(d.slice(5, 7)) - 1]} ${d.slice(0, 4)}`;
const fechaLarga = (d: string) => `${Number(d.slice(8))} ${MESES[Number(d.slice(5, 7)) - 1]} ${d.slice(0, 4)}`;

/** 7.1 Ruta: la semana del plan, los hitos, las seis ramas con su etapa, lo que viene y T+18. */
export function PlanRuta({ day }: { day: DayLog }) {
  const date = day.date;
  const v = usePlanVista(date);
  const hitos = PLAN.hitos.filter((h) => h.id !== 'T+0');
  const marcas = new Set(PLAN.hitos.map((h) => h.semana));
  // Entrevistas cargadas: lo que falle pasa a tarjetas de inglés.
  const extra: Entrega[] = v.ent ? [{ de: 'trabajo', a: 'ingles', fecha: v.ent.fecha, texto: `Entrevista del ${fmtFecha(v.ent.fecha).split(' ').slice(0, 2).join(' ').toLowerCase()}: lo que falle pasa a tarjetas de inglés` }] : [];
  const viene = proximasEntregas(date, 4, extra, v.t0);
  const cerrados = proyectos().filter((p) => p.id !== 'P0' && finSemana(p.hasta, v.t0) < date).length;
  const total = proyectos().filter((p) => p.id !== 'P0').length;
  const pctPlan = Math.round((v.semana / SEMANAS) * 100);
  return (
    <div className="plan-ruta">
      <div className="pr-semana">
        <span className="mono"><b>{v.semana}</b> / {SEMANAS}</span>
        <span className="mono sub">B{v.bim.n} · {v.nombreBim} · {fechaLarga(date)}</span>
      </div>
      <div className="pr-segs" role="img" aria-label={`Semana ${v.semana} de ${SEMANAS}`}>
        {Array.from({ length: SEMANAS }, (_, i) => {
          const n = i + 1;
          return <span key={n} className={`${n < v.semana ? 'pasada' : n === v.semana ? 'actual' : ''}${marcas.has(n) ? ' hito' : ''}`} />;
        })}
      </div>
      <div className="pr-hitos">
        {hitos.map((h) => (
          <div key={h.id} className={hitoSemana(h.id) <= v.semana ? 'cumplido' : ''}>
            <b className="mono">{h.id}</b>
            <span>{h.titulo}</span>
            <small className="mono sub">{h.id === 'T+18' ? mesAnio(fechaHito(h, v.t0)) : fechaLarga(fechaHito(h, v.t0))}</small>
          </div>
        ))}
      </div>

      <div className="fila-t pr-t"><span className="etiqueta">Las seis ramas</span><a className="subrayado" href="#/metas/mapa">Ver el mapa →</a></div>
      <ul className="pr-ramas">
        {v.ramas.map((r) => (
          <li key={r.rama} className={r.pausa ? 'standby' : undefined} style={{ ['--c' as string]: RAMA_COLOR[r.rama] }}>
            <a href={r.href}>
              <i aria-hidden="true" />
              <span className="pr-rama-txt">
                <span className="mono pr-rama-n">{r.rama}</span>
                <b>{r.titulo}</b>
                <small className="sub">{r.sub}</small>
                {r.riesgo && <small className="pr-riesgo">{r.riesgo}</small>}
                <span className="pr-barra"><span style={{ width: `${Math.round(r.avance * 100)}%` }} /></span>
              </span>
              <span className="mono sub pr-lado">{r.lado}</span>
            </a>
          </li>
        ))}
      </ul>

      <div className="etiqueta pr-t">Lo que viene · entregas entre ramas</div>
      <ul className="pr-viene">
        {viene.map((e, i) => (
          <li key={i}>
            <span className="mono sub">{fechaCorta(e.fecha)}</span>
            <span><DeA de={e.de} a={e.a} /><span className="pr-viene-t">{e.texto}</span></span>
          </li>
        ))}
      </ul>

      <section className="pr-t18">
        <span className="etiqueta">T+18 · {mesAnio(fechaHito(PLAN.hitos[3], v.t0))} · todo vuelve a main</span>
        <h2>Senior ML + DevSecOps + cloud</h2>
        <p className="sub">10 proyectos en 6 industrias, AWS SAA, Security+ y AWS ML Engineer, examen C1, Handyx decidido y la base matemática hacia la ingeniería.</p>
        <span className="pr-barra tinta" role="img" aria-label={`${pctPlan} % del plan`}><span style={{ width: `${pctPlan}%` }} /></span>
        <small className="mono sub">{pctPlan} % del plan · {cerrados} de {total} proyectos cerrados</small>
      </section>
    </div>
  );
}
