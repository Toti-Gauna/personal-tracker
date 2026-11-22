/**
 * Ola 24 · #/metas/calibracion (ola 33: con PetrIA 1.0 y 1.1). Horas estimadas contra reales, el factor que sale de PetrIA (el proyecto
 * medido) y se aplica a lo que viene después, cuántos días mueve el fin cada +10 % de horas, los escenarios y el registro diario, con
 * la carga de horas a mano para los días sin foco.
 */
import { useMemo, useState } from 'react';
import { FACTOR_MAX, FACTOR_MIN, calibrar, diasPorDiezPorCiento, escenarios, proyectar, sugerencia } from '../data/calibracion';
import { deudaMatematica, registroDiario } from '../data/control';
import { T0_PLAN } from '../data/plan';
import { PLAN_EXT } from '../data/plan-extendido';
import { addDays } from '../data/time';
import { calendarioCompleto } from '../data/plan-vistas';
import { RAMA_COLOR } from '../data/ramas';
import type { DayLog } from '../data/types';
import { cargarHorasManuales } from '../state/plan';
import { inicioTrabajo, useStore } from '../state/store';
import '../styles/plan.css';
import '../styles/etapas.css';

const MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const f = (d: string) => `${Number(d.slice(8))} ${MES[Number(d.slice(5, 7)) - 1]} ${d.slice(0, 4)}`;
const n1 = (x: number) => String(x).replace('.', ',');

/** Las horas de un día: el valor cargado a mano o, vacío, el del foco. */
function HorasDia({ fecha, rama, foco, manual }: { fecha: string; rama: 'programacion' | 'matematica'; foco: number; manual?: number }) {
  const [v, setV] = useState(manual != null ? String(manual) : '');
  const guardar = () => {
    const n = v.trim() === '' ? null : Number(v.replace(',', '.'));
    if (n != null && !(n >= 0 && n <= 24)) { setV(manual != null ? String(manual) : ''); return; }
    cargarHorasManuales(fecha, rama, n);
  };
  return (
    <input
      className="campo-texto mono cal-h" inputMode="decimal" value={v} placeholder={n1(foco)}
      aria-label={`Horas de ${rama === 'programacion' ? 'programación' : 'matemática'} del ${f(fecha)}`}
      onChange={(e) => setV(e.target.value)} onBlur={guardar} onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
    />
  );
}

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
    const cerrados = c.hito ? ['P0', 'P1'] : [];
    const proy = c.factor != null ? proyectar(c.factor, t0, cerrados) : null;
    const base = proyectar(1, t0, cerrados);
    return { cal, c, horas, fin, proy, sug: proy ? sugerencia(c, proy.fin, base.fin) : null, esc: escenarios(t0, cerrados), diez: diasPorDiezPorCiento(t0, cerrados) };
  }, [t0, plan, days, hoy]);
  const { c } = d;
  const p1 = PLAN_EXT.bloques.find((b) => b.id === 'P1');
  const max = Math.max(1, ...c.filas.map((x) => Math.max(x.estimadas, x.reales)));
  const desde = addDays(hoy, -6) < t0 ? t0 : addDays(hoy, -6);
  return (
    <main className="pantalla plan-proy cal-pag" style={{ ['--c' as string]: RAMA_COLOR.programacion }}>
      <div className="topbar"><a className="volver" href="#/metas/etapas">Las 4 etapas</a><span className="mono sub">{n1(d.horas)} h · hasta el {f(d.fin)}</span></div>
      <header>
        <h1 className="titulo">Calibración</h1>
        <p>
          Las horas de PetrIA salen de sus lotes ({n1(p1?.horas ?? 0)} h{p1?.horasAntes ? `; antes eran ${n1(p1.horasAntes)}` : ''}). El factor real/estimado se calcula al publicar PetrIA 1.0 y otra vez con la 1.1,
          y proyecta lo que viene después. Las fechas del plan no se mueven solas: si hace falta correr bloques, Trazo lo sugiere en Períodos y vos lo confirmás.
        </p>
      </header>

      <section className="cal-factor" aria-labelledby="cal-f">
        <span className="etiqueta" id="cal-f">Factor real / estimado</span>
        {c.factor != null ? (
          <>
            <b className="mono cal-n">{n1(c.factor)}</b>
            <span className="sub">{n1(c.reales)} h reales de {n1(c.estimadas)} h estimadas en PetrIA {c.hito === '1.1' ? '1.0 y 1.1' : '1.0'} · en plan entre {n1(FACTOR_MIN)} y {n1(FACTOR_MAX)}</span>
            {c.hito === '1.0' && c.cuando && <span className="sub">Se recalcula al publicar la 1.1 (en el calendario, el {f(c.cuando)}).</span>}
          </>
        ) : (
          <>
            <b className="cal-espera">Se calcula al publicar PetrIA 1.0{c.cuando ? ` (en el calendario, el ${f(c.cuando)})` : ''}, y otra vez con la 1.1</b>
            <span className="sub">Las horas reales salen del foco de los bloques de programación o de lo que cargues a mano abajo. Se marca publicada en la ficha de PetrIA → Versiones.</span>
          </>
        )}
      </section>

      <ul className="cal-filas" aria-label="Versiones de PetrIA que calibran">
        {c.versiones.map((v) => (
          <li key={v.version}>
            <span className="cal-fila-t"><b className="mono">{v.version}</b> {v.nombre}<small className="mono sub">{v.publicada ? `publicada el ${f(v.publicada)} · ${n1(v.reales ?? 0)} h reales` : `sin publicar${v.finTrazo ? ` · el calendario la da el ${f(v.finTrazo)}` : ''}`} · {v.estimadas} h estimadas</small></span>
          </li>
        ))}
      </ul>

      {d.sug && <section className={`cal-sug ${c.regla}`}><p>{d.sug.texto}</p></section>}
      {c.regla === 'en-plan' && <p className="sub">Vas en plan: no hace falta tocar nada.</p>}
      <p className="sub">Cada +10 % de horas en lo que falta corre el fin del plan <b>{d.diez} días</b>.</p>

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
      <p className="sub">Si trabajaste sin abrir el foco, cargá las horas a mano: mandan sobre el foco de ese día. Vacío, cuenta el foco.</p>
      <ul className="cal-filas" aria-label="Horas por día">
        {registroDiario(days, desde, hoy, { t0, inicioTrabajo: inicio, manual: plan.horasManuales }).map((r) => (
          <li key={r.fecha} className="cal-dia">
            <span className="cal-fila-t"><b className="mono">{Number(r.fecha.slice(8))} {MES[Number(r.fecha.slice(5, 7)) - 1]}</b> {r.proyecto}<small className="mono sub">plan: prog {n1(r.progPlan)} h · mate {n1(r.matePlan)} h</small></span>
            <span className="cal-cargar">
              <label>prog <HorasDia fecha={r.fecha} rama="programacion" foco={r.progReal} manual={plan.horasManuales?.[r.fecha]?.programacion} /></label>
              <label>mate <HorasDia fecha={r.fecha} rama="matematica" foco={r.mateReal} manual={plan.horasManuales?.[r.fecha]?.matematica} /></label>
            </span>
          </li>
        ))}
      </ul>
      {(() => { const deuda = deudaMatematica(hoy, { t0, inicioTrabajo: inicio }); return deuda.horas > 0 ? <p className="sub">Matemática: en el modo intensivo es 1 h por día en lugar de 2. Deuda acumulada: <b>{n1(deuda.horas)} h</b> (se recupera con trabajo).</p> : null; })()}

      <span className="etiqueta">Escenarios</span>
      <ul className="cal-esc">
        <li className="actual"><b>Calendario actual</b><span className="mono">{n1(d.horas)} h · {f(d.fin)}</span><small className="sub">Con las horas reales cargadas y el factor, si ya está.</small></li>
        {d.proy && <li className="tuyo"><b>Con tu factor</b><span className="mono">{n1(d.proy.horas)} h · {f(d.proy.fin)}</span><small className="sub">Los días de los proyectos que vienen después de PetrIA × {n1(c.factor!)}; las ventanas, las certificaciones, los días fijos y la pausa no cambian.</small></li>}
        {d.esc.map((e) => <li key={e.id}><b>{e.nombre} · {n1(e.factor)}</b><span className="mono">{n1(e.horas)} h · {f(e.fin)}</span><small className="sub">{e.supuesto}</small></li>)}
      </ul>
      <p className="sub">Los tres escenarios proyectan el plan con un factor de 0,85, 1,00 y 1,15 sobre los proyectos que faltan; son proyecciones, el calendario no cambia.</p>
    </main>
  );
}
