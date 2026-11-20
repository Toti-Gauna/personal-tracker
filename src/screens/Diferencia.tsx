/**
 * Ola 29 · #/metas/diferencia: el calendario de Trazo contra las fechas que estima el roadmap v7. Las fechas del roadmap son
 * estimaciones: Trazo recalcula con las horas de cada bloque sobre la capacidad de cada día (y con tus horas reales cuando las
 * cargás) y muestra cuánto se corre cada bloque. Arriba, lo que no cierra en el propio roadmap, con la cuenta.
 */
import { useMemo } from 'react';
import { ANIOS_PAUSA, esDiaDePausa, horasDelDia, HORAS_ANTES_TRABAJO, INICIO_TRABAJO_DIAS } from '../data/capacidad';
import { addDays } from '../data/time';
import { chequeosRoadmap, diferenciaMate, diferenciaRoadmap, resumenDiferencia, textoDelta, type FilaDiferencia } from '../data/diferencia';
import { PLAN, T0_PLAN } from '../data/plan';
import { PLAN_EXT } from '../data/plan-extendido';
import { calendarioCompleto } from '../data/plan-vistas';
import { RAMA_COLOR } from '../data/ramas';
import type { DayLog } from '../data/types';
import { inicioTrabajo, planSettings, useStore } from '../state/store';
import { Plegable } from '../ui/Plegable';
import '../styles/plan.css';
import '../styles/etapas.css';
import '../styles/diferencia.css';

const MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const f = (d: string) => `${Number(d.slice(8))} ${MES[Number(d.slice(5, 7)) - 1]} ${d.slice(0, 4)}`;
const fc = (d: string) => `${Number(d.slice(8))} ${MES[Number(d.slice(5, 7)) - 1]}`;
const n1 = (x: number) => (Math.round(x * 10) / 10).toLocaleString('es-AR');
const ETAPA = ['', 'Núcleo', 'Ciberseguridad', 'Quant', 'Aeroespacial'];
const clase = (d: number) => (d < 0 ? 'antes' : d > 0 ? 'despues' : 'enfecha');

function Delta({ d }: { d: number }) {
  return <span className={`dif-delta ${clase(d)} mono`}>{d === 0 ? 'en fecha' : `${d > 0 ? '+' : '−'}${Math.abs(d)} d`}</span>;
}

function Fila({ x }: { x: FilaDiferencia }) {
  return (
    <li>
      <a href={`#/metas/proyecto/${x.id}`}>
        <span className="mono">{x.id}</span>
        <span className="dif-nom">{x.nombre}{x.numero != null ? <small className="sub"> · certificación {x.numero}</small> : null}</span>
        <Delta d={x.deltaFin} />
        <span className="mono sub dif-det">
          Trazo {fc(x.inicio)} a {f(x.fin)} · roadmap {fc(x.roadmap.inicio)} a {f(x.roadmap.fin)} · {x.horas ? `${x.horas} h${x.horasAntes ? ` (antes ${x.horasAntes})` : ''}` : `${x.dias ?? 0} días fijos`}
        </span>
      </a>
    </li>
  );
}

export function Diferencia({ day }: { day: DayLog }) {
  const t0 = useStore((s) => s.settings?.startDate) ?? T0_PLAN;
  const inicio = useStore((s) => inicioTrabajo(s.settings));
  // Los chequeos miden el roadmap con sus propios supuestos: su T0 y el trabajo el 4 ene 2027 (o el inicio que cargaste).
  const inicioRoadmap = useStore((s) => planSettings(s.settings).t2) ?? addDays(PLAN_EXT.t0, INICIO_TRABAJO_DIAS);
  // El calendario vivo se recalcula con las horas reales: la diferencia también.
  useStore((s) => s.days);
  useStore((s) => s.plan.pausaFinDeAnio);
  const d = useMemo(() => {
    const filas = diferenciaRoadmap(calendarioCompleto(t0));
    const ventana = (PLAN_EXT.capacidad?.ventanaSemana ?? 43) / 7;
    const chequeos = chequeosRoadmap(PLAN_EXT, (fecha, tipo) => (tipo === 'ventana' ? ventana : horasDelDia(fecha, { t0: PLAN_EXT.t0, inicioTrabajo: inicioRoadmap })), (fecha) => esDiaDePausa(fecha));
    return { filas, resumen: resumenDiferencia(filas), chequeos, mate: diferenciaMate(PLAN_EXT, PLAN.matematica.tramos) };
  }, [t0, inicio, inicioRoadmap, day.date]);
  const r = d.resumen;
  return (
    <main className="pantalla et-pag dif-pag" style={{ ['--c' as string]: RAMA_COLOR.programacion }}>
      <div className="topbar"><a className="volver" href="#/metas/etapas">Las 4 etapas</a><span className="mono sub">roadmap v7</span></div>
      <header>
        <h1 className="titulo">Diferencia contra el roadmap</h1>
        <p>Las fechas del roadmap son estimaciones. Trazo recalcula con las horas de cada bloque y lo que da cada día{HORAS_ANTES_TRABAJO != null ? ` (${n1(HORAS_ANTES_TRABAJO)} h por día antes del trabajo nuevo, que empieza el ${f(inicio)}; 29 h por semana después; 43 en las ventanas)` : ''}, y con tus horas reales cuando las cargás. Acá se ve cuánto se corre cada bloque.</p>
      </header>

      {r && (
        <section className="cal-factor" aria-labelledby="dif-r">
          <span className="etiqueta" id="dif-r">El plan termina</span>
          <b className="dif-fin">{f(r.fin)}</b>
          <span className="sub">El roadmap estima el {f(r.finRoadmap)}: <b>{textoDelta(r.delta)}</b>.</span>
          <span className="sub mono">{n1(r.horas)} h de proyecto (antes {n1(r.horasAntes)} h en los mismos bloques)</span>
          {r.masAntes && <span className="sub">Lo que más se adelanta: {r.masAntes.id} · {r.masAntes.nombre} ({textoDelta(r.masAntes.deltaFin)}).</span>}
          {r.masDespues && <span className="sub">Lo que más se atrasa: {r.masDespues.id} · {r.masDespues.nombre} ({textoDelta(r.masDespues.deltaFin)}).</span>}
        </section>
      )}

      {d.chequeos.length > 0 && (
        <section className="et-alertas" aria-labelledby="dif-ch">
          <span className="etiqueta" id="dif-ch">Lo que no cierra en el roadmap</span>
          {d.chequeos.map((c) => (
            <div key={c.id} className={`et-alerta dif-ch ${c.tipo}`}>
              <b>{c.texto}</b>
              <span className="sub mono">{c.calculo}</span>
            </div>
          ))}
          <p className="sub">Trazo no lo corrige: usa las horas del bloque y te muestra la diferencia.</p>
        </section>
      )}

      {[1, 2, 3, 4].map((n) => {
        const fs = d.filas.filter((x) => x.etapa === n);
        if (!fs.length) return null;
        const ult = fs.reduce((m, x) => (x.fin > m.fin ? x : m), fs[0]);
        const ultR = fs.reduce((m, x) => (x.roadmap.fin > m.roadmap.fin ? x : m), fs[0]);
        const delta = Math.round((Date.parse(ult.fin) - Date.parse(ultR.roadmap.fin)) / 864e5);
        return (
          <Plegable key={n} id={`dif:etapa-${n}`} titulo={`Etapa ${n} · ${ETAPA[n]}`} resumen={`termina ${f(ult.fin)} · ${textoDelta(delta)}`} color={RAMA_COLOR.programacion}>
            <ul className="dif-lista">{fs.map((x) => <Fila key={x.id} x={x} />)}</ul>
          </Plegable>
        );
      })}

      {d.mate.length > 0 && (
        <Plegable id="dif:mate" titulo="Matemática diaria" resumen={d.mate.map((m) => `${m.id} ${m.delta === 0 ? 'en fecha' : `${m.delta > 0 ? '+' : '−'}${Math.abs(m.delta)} d`}`).join(' · ')} color={RAMA_COLOR.matematica}>
          <ul className="dif-lista">
            {d.mate.map((m) => (
              <li key={m.id}>
                <a href={`#/estudio/mate/${m.id}`}>
                  <span className="mono">{m.id}</span>
                  <span className="dif-nom">{m.nombre}</span>
                  <Delta d={m.delta} />
                  <span className="mono sub dif-det">{m.horas} h · Trazo termina el {f(m.fin)} · roadmap ≈ {f(m.finRoadmap)}</span>
                </a>
              </li>
            ))}
          </ul>
          <p className="sub">1 h por día hasta el trabajo nuevo y 2 h después; se pausa en las ventanas.</p>
        </Plegable>
      )}

      <p className="sub">{ANIOS_PAUSA ? `Pausas de diciembre: ${ANIOS_PAUSA.join(', ').replace(/, (\d+)$/, ' y $1')} (en 2026 no hay). ` : ''}Si una versión se atrasa, se mueven fechas: no se recorta profundidad.</p>
    </main>
  );
}
