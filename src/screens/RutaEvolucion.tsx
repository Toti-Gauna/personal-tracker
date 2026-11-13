import { useState } from 'react';
import { mejoraAcumulada, racha } from '../data/derive';
import { allDoneUntil, competencyAxes, routeCurve } from '../data/ruta';
import { competencyScores } from '../data/roadmap-charts';
import { fmtFecha } from '../data/time';
import type { DayLog } from '../data/types';
import { useStore } from '../state/store';
import { Heatmap, MejoraChart, MesAMes, Radar, RutaChart, Sparkline } from '../ui/charts/charts';
import { Card, Leyenda, TablaSR, num, pct } from '../ui/charts/core';
import { bimsCerrados, conamatHechos, constancia, construiste, mejoraSerie, mesAMes, useRutaVista, type Rango } from '../ui/useRuta';
import '../styles/ruta.css';

const RANGOS: [Rango, string][] = [['dia', 'Día'], ['semana', 'Semana'], ['mes', 'Mes'], ['bim', 'Bim.'], ['anio', 'Año']];

/** 7.5 Tu evolución: mejora, constancia, mes a mes, bimestre a bimestre, competencias y lo construido. */
export function RutaEvolucion({ day }: { day: DayLog }) {
  const s = useStore((x) => x);
  const date = day.date;
  const v = useRutaVista(date);
  const [rango, setRango] = useState<Rango>('dia');
  const serie = mejoraSerie(s.days, date, rango);
  const conDatos = serie.values.filter((x) => x > 0);
  const promedio = conDatos.length ? conDatos.reduce((a, x) => a + x, 0) / conDatos.length : 0;
  const mitad = Math.floor(serie.values.length / 2);
  const prev = serie.values.slice(0, mitad).filter((x) => x > 0);
  const recent = serie.values.slice(mitad).filter((x) => x > 0);
  const delta = prev.length && recent.length ? recent.reduce((a, x) => a + x, 0) / recent.length - prev.reduce((a, x) => a + x, 0) / prev.length : null;
  const pocos = serie.cargados < 7;
  const mejor = Math.max(0, ...Object.values(s.days).map((d) => d.blocks.filter((b) => b.tasks.length && b.tasks.every((t) => t.done)).length / Math.max(1, d.blocks.length)));
  const heat = constancia(s.days, date);
  const meses = mesAMes(s.days, date);
  const rc = routeCurve(s.ruta.log, date);
  const comp = (pm: Record<string, number>) => competencyScores(competencyAxes(pm)).map((c) => c.score);
  const hoy = comp(v.p);
  const a1 = comp(allDoneUntil(6));
  const a3 = comp(allDoneUntil(18));
  const ejes = competencyAxes(v.p).map((a) => a.label);
  const hechos = construiste(s, date);
  const diffPlan = v.rutaAvance - v.rutaPlan;
  const ultMes = meses[meses.length - 1];

  return (
    <main className="pantalla r-pant">
      <div className="topbar"><a className="volver" href="#/metas/ruta">Ruta</a><span className="mono">{fmtFecha(date).toLowerCase()}</span></div>
      <h1 className="titulo">Tu evolución</h1>
      <p className="sub">Cómo venís día a día, mes a mes, bimestre a bimestre y año a año. {pocos ? 'Con pocos días cargados se ve lo que hay: se completa con el uso.' : ''}</p>

      <div className="segmentado" role="radiogroup" aria-label="Rango">
        {RANGOS.map(([id, n]) => <button key={id} role="radio" aria-checked={rango === id} onClick={() => setRango(id)}>{n}</button>)}
      </div>

      <Card title="Mejora diaria" aside={serie.titulo}>
        <div className="r-grande"><b className="mono">{num(promedio)} %</b><span className="sub">promedio{delta != null && <span className={delta >= 0 ? 'verde' : 'rojo'}> · {delta >= 0 ? '+' : '−'}{num(Math.abs(delta))} contra la mitad anterior</span>}</span></div>
        <MejoraChart key={rango} values={serie.values} avg={serie.values.length >= 7 || rango !== 'dia' ? serie.avg : []} labels={serie.labels} label={`Mejora, ${serie.titulo}: promedio ${num(promedio)} %`} />
        <TablaSR caption={`Mejora, ${serie.titulo}`} head={['Período', 'Mejora', 'Promedio']} rows={serie.values.map((x, i) => [serie.labels[i] || String(i + 1), `${num(x)} %`, `${num(serie.avg[i] ?? 0)} %`])} />
        <Leyenda items={[{ label: rango === 'dia' ? 'cada día' : 'promedio del período', color: 'var(--economia)', kind: 'area' }, { label: rango === 'dia' ? 'promedio de 7 días' : 'tendencia', color: 'var(--tinta)', kind: 'linea' }]} />
        {pocos && <p className="sub r-vacio">Hay {serie.cargados} {serie.cargados === 1 ? 'día' : 'días'} con datos: el gráfico se completa con el uso.</p>}
        <div className="r-stats3">
          <div><b className="mono">{racha(s.days, date)}</b><span>días seguidos</span></div>
          <div><b className="mono">{num(mejor)} %</b><span>mejor día</span></div>
          <div><b className="mono verde">+{num(mejoraAcumulada(s.days, date), 1)} %</b><span>compuesto desde el día 0</span></div>
        </div>
      </Card>

      <Card title="Constancia" aside="15 semanas">
        <Heatmap cells={heat} weeks={15} />
        <div className="heat-pie"><span className="sub">Cada cuadrado es un día; las filas, de lunes a domingo. El martes es libre: si no hay registro, no cuenta como falta.</span></div>
        <TablaSR caption="Constancia por día" head={['Día', 'Nivel']} rows={heat.filter((c) => !c.futuro).map((c) => [c.date, c.libre ? 'libre' : c.level == null ? 'sin registro' : String(c.level)])} />
      </Card>

      <Card title="Mes a mes" aside="horas y metas cumplidas">
        <MesAMes months={meses} />
        <Leyenda items={[{ label: 'matemática', color: 'var(--ing)', kind: 'area' }, { label: 'programación', color: 'var(--salud)', kind: 'area' }, { label: '% de metas', color: 'var(--economia)', kind: 'linea' }]} />
        <TablaSR caption="Horas y metas por mes" head={['Mes', 'Matemática (h)', 'Programación (h)', 'Metas']} rows={meses.map((m) => [m.label, num(m.math, 1), num(m.prog, 1), m.metas == null ? '—' : pct(m.metas)])} />
        <p className="sub r-vacio">{ultMes?.metas != null ? `${ultMes.label[0].toUpperCase() + ultMes.label.slice(1)} va con ${pct(ultMes.metas)} de metas cumplidas.` : 'Los meses se llenan a medida que cargás días.'}</p>
      </Card>

      <Card title="Bimestre a bimestre" aside="avance acumulado de la ruta">
        <RutaChart plan={rc.plan} real={rc.real} certs={rc.certs} />
        <Leyenda items={[{ label: 'real', color: 'var(--ing)', kind: 'area' }, { label: 'plan', color: 'var(--sub)', kind: 'punteada' }, { label: 'certificación', color: 'var(--rutina)', kind: 'linea' }]} />
        <TablaSR caption="Avance acumulado por bimestre" head={['Bimestre', 'Plan', 'Real']} rows={rc.plan.slice(1).map((x, i) => [`B${i + 1}`, pct(x), rc.real[i + 1] != null ? pct(rc.real[i + 1], 1) : '—'])} />
        <div className="r-stats3">
          <div><b className="mono">{bimsCerrados(v.p, date)}</b><span>bimestres cerrados</span></div>
          <div><b className="mono azul">{pct(v.rutaAvance, 1)}</b><span>de la ruta</span><small className={`mono ${diffPlan >= 0 ? 'verde' : 'rojo'}`}>{diffPlan >= 0 ? '+' : '−'}{num(Math.abs(diffPlan * 100), 1)} {diffPlan >= 0 ? 'sobre' : 'bajo'} el plan</small></div>
          <div><b className="mono">{conamatHechos(v.p)} / 69</b><span>caps. de CONAMAT</span></div>
        </div>
      </Card>

      <Card title="Año a año" aside="competencias">
        <Radar axes={ejes} series={[
          { label: 'meta del año 3', values: a3, className: 'rd-a3' },
          { label: 'meta del año 1', values: a1, className: 'rd-a1' },
          { label: 'hoy', values: hoy, className: 'rd-hoy' },
        ]} />
        <Leyenda items={[{ label: 'hoy', color: 'var(--ing)', kind: 'area' }, { label: 'meta del año 1', color: 'var(--economia)', kind: 'punteada' }, { label: 'meta del año 3', color: 'var(--sub)', kind: 'punteada' }]} />
        <TablaSR caption="Competencias" head={['Eje', 'Hoy', 'Meta del año 1', 'Meta del año 3']} rows={ejes.map((e, i) => [e, hoy[i], a1[i], a3[i]])} />
        <p className="sub r-vacio">Cada eje sube con lo que cerrás: capítulos y exámenes para matemática, productos y piezas desde cero para ML y producto, certificaciones para cloud y seguridad, placas y equipos para hardware.</p>
      </Card>

      <Card title="Lo que construiste">
        <div className="lo-construido">
          {hechos.map((h) => (
            <div key={h.label} style={{ ['--c' as string]: h.color }}>
              <span>{h.label}</span>
              <b>{h.value}</b>
              <Sparkline values={h.serie} color={h.color} label={`${h.label}: ${h.value}`} />
            </div>
          ))}
        </div>
      </Card>
    </main>
  );
}
