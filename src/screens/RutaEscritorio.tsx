import { BIMS, ROADMAP, allDoneUntil, competencyAxes, laneItems, routeCurve } from '../data/ruta';
import { competencyScores, expectedDone, weeksElapsed } from '../data/roadmap-charts';
import { fmtFecha } from '../data/time';
import type { DayLog } from '../data/types';
import { useStore } from '../state/store';
import { MejoraChart, MesAMes, Radar, RutaChart } from '../ui/charts/charts';
import { Card, Leyenda, num, pct } from '../ui/charts/core';
import { conamatHechos, mejoraSerie, mesAMes, racha, useRutaVista } from '../ui/useRuta';
import { Compuertas } from './Ruta';
import '../styles/ruta.css';

const FILAS = [
  { id: 'producto', name: 'Producto', color: 'var(--eclipse)' },
  { id: 'math', name: 'Matemática', color: 'var(--ing)' },
  { id: 'prog', name: 'Programación', color: 'var(--salud)' },
  { id: 'cert', name: 'Certificación', color: 'var(--rutina)' },
] as const;

const cortoMath = (s: string) => s.replace(/^CONAMAT /, '').replace(/ \d.*$/, '').replace(/,.*$/, '');

/** 7.6 Ruta en escritorio: la grilla de 18 bimestres, los gráficos en dos filas, "Ahora" y "Qué falta". */
export function RutaEscritorio({ day }: { day: DayLog }) {
  const date = day.date;
  const s = useStore((x) => x);
  const v = useRutaVista(date);
  const p = v.p;
  const b = v.b;
  const serie = mejoraSerie(s.days, date, 'dia');
  const promedio = serie.cargados ? serie.values.filter((_, i) => serie.values[i] > 0).reduce((a, x) => a + x, 0) / Math.max(1, serie.values.filter((x) => x > 0).length) : 0;
  const rc = routeCurve(s.ruta.log, date);
  const certsHechas = BIMS.filter((x) => x.cert && (p[x.cert.item] ?? 0) >= 1).length;
  const totalCerts = BIMS.filter((x) => x.cert).length;
  const comp = (pm: Record<string, number>) => competencyScores(competencyAxes(pm)).map((c) => c.score);
  const hoy = comp(p);
  const ejes = competencyAxes(p).map((a) => a.label);
  const cerrados = BIMS.filter((x) => x.end < date).length;
  const fill = (n: number, fila: string) => {
    const bb = BIMS[n - 1];
    const its = fila === 'producto' ? bb.items.filter((i) => i.lane === 'product') : fila === 'cert' ? bb.items.filter((i) => i.lane === 'cert') : laneItems(bb, fila as 'math' | 'prog');
    if (!its.length) return 0;
    return its.reduce((a, i) => a + (p[i.id] ?? 0), 0) / its.length;
  };
  const etiqueta = (n: number, fila: string) => {
    const bb = BIMS[n - 1];
    if (fila === 'producto') return bb.product.name;
    if (fila === 'math') return cortoMath(bb.summary.math);
    if (fila === 'prog') return bb.summary.prog.split(', ')[0];
    return bb.cert?.name.replace('AWS Security – Specialty', 'AWS Sec').replace('AWS ', '') ?? '';
  };
  const elapsed = weeksElapsed(b, date);

  return (
    <div className="r-esc">
      <header className="r-esc-cab">
        <div>
          <div className="etiqueta">Ruta · {fmtFecha(date).toLowerCase()} · B{b.n} · semana {v.week} de 9</div>
          <h2 className="titulo">Machine learning y ciberseguridad, en 18 bimestres</h2>
        </div>
        <div className="r-esc-stats">
          <div><b className="mono">{cerrados} / 18</b><span>bimestres</span></div>
          <div><b className="mono azul">{pct(v.rutaAvance, v.rutaAvance < 0.1 ? 1 : 0)}</b><span>de la ruta</span></div>
          <div><b className="mono rojo">{certsHechas} / {totalCerts}</b><span>certificaciones</span></div>
          <div><b className="mono">{conamatHechos(p)} / 69</b><span>caps. CONAMAT</span></div>
          <div><b className="mono verde">{racha(s.days, date)}</b><span>días seguidos</span></div>
        </div>
      </header>

      <Card className="r-grilla">
        <div className="rg" role="table" aria-label="Los 18 bimestres: producto, matemática, programación y certificación">
          <div className="rg-fila rg-anios" role="row">
            <span role="columnheader" />
            {ROADMAP.route.years.map((y) => <span key={y.year} role="columnheader" className="rg-anio" style={{ gridColumn: 'span 6' }}>Año {y.year} · {y.profile}</span>)}
          </div>
          <div className="rg-fila" role="row">
            <span role="columnheader" />
            {BIMS.map((x) => <span key={x.n} role="columnheader" className={`mono rg-n${x.n === b.n ? ' actual' : ''}`}>B{x.n}</span>)}
          </div>
          {FILAS.map((f) => (
            <div key={f.id} className="rg-fila" role="row" style={{ ['--c' as string]: f.color }}>
              <span role="rowheader" className="rg-nombre"><i />{f.name}</span>
              {BIMS.map((x) => {
                const t = etiqueta(x.n, f.id);
                const r = fill(x.n, f.id);
                return (
                  <span key={x.n} role="cell" className={`rg-c${x.n === b.n ? ' actual' : ''}${!t ? ' vacia' : ''}`} title={t}>
                    {t && <i style={{ width: `${r * 100}%` }} />}
                    <span>{t}</span>
                  </span>
                );
              })}
            </div>
          ))}
        </div>
      </Card>

      <div className="r-esc-fila tres">
        <Card title="Mejora diaria" aside="últimos 30 días">
          <div className="r-grande"><b className="mono">{num(promedio)} %</b><span className="sub">promedio</span></div>
          <MejoraChart values={serie.values} avg={serie.avg} labels={serie.labels} label="Mejora de los últimos 30 días" />
          <Leyenda items={[{ label: 'cada día', color: 'var(--economia)', kind: 'area' }, { label: 'promedio de 7 días', color: 'var(--tinta)', kind: 'linea' }]} />
          {serie.cargados < 7 && <p className="sub r-vacio">Se completa con el uso: hay {serie.cargados} {serie.cargados === 1 ? 'día' : 'días'} cargados.</p>}
        </Card>
        <Card title="Bimestre a bimestre" aside="real contra plan">
          <RutaChart plan={rc.plan} real={rc.real} certs={rc.certs} />
          <Leyenda items={[{ label: 'real', color: 'var(--ing)', kind: 'area' }, { label: 'plan', color: 'var(--sub)', kind: 'punteada' }, { label: 'certificación', color: 'var(--rutina)', kind: 'linea' }]} />
        </Card>
        <Card title="Competencias" aside="hoy contra metas">
          <Radar axes={ejes} series={[
            { label: 'año 3', values: comp(allDoneUntil(18)), className: 'rd-a3' },
            { label: 'año 1', values: comp(allDoneUntil(6)), className: 'rd-a1' },
            { label: 'hoy', values: hoy, className: 'rd-hoy' },
          ]} />
          <Leyenda items={[{ label: 'hoy', color: 'var(--ing)', kind: 'area' }, { label: 'año 1', color: 'var(--economia)', kind: 'punteada' }, { label: 'año 3', color: 'var(--sub)', kind: 'punteada' }]} />
        </Card>
      </div>

      <div className="r-esc-fila tres">
        <Card title="Mes a mes" aside="horas y metas">
          <MesAMes months={mesAMes(s.days, date)} />
          <Leyenda items={[{ label: 'matemática', color: 'var(--ing)', kind: 'area' }, { label: 'programación', color: 'var(--salud)', kind: 'area' }, { label: '% de metas', color: 'var(--economia)', kind: 'linea' }]} />
        </Card>
        <Card title={`Ahora · ${b.product.name}`} aside={`B${b.n} · ${b.product.industry}`}>
          <ul className="ahora">
            {v.lanes.filter((l) => l.id !== 'cert').map((l) => {
              const real = l.id === 'piloto' ? Math.min(1, v.pilotoSemana / 10) : l.st.total ? l.st.done / l.st.total : 0;
              const plan = l.id === 'piloto' ? Math.min(1, elapsed / 9) : l.items.length ? l.items.reduce((a, i) => a + expectedDone(i.weeks, elapsed), 0) / l.items.length : 0;
              return (
                <li key={l.id} style={{ ['--c' as string]: l.color }}>
                  <span className="ahora-n"><i />{l.name}</span>
                  <span className="ahora-b" role="img" aria-label={`${l.name}: ${Math.round(real * 100)} % real, ${Math.round(plan * 100)} % del plan`}><i style={{ width: `${real * 100}%` }} /><b style={{ left: `${plan * 100}%` }} /></span>
                  <span className={`mono tono-${l.st.tone}`}>{l.id === 'piloto' ? `${v.pilotoSemana} de 10 llamadas` : l.st.label}</span>
                </li>
              );
            })}
          </ul>
        </Card>
        <Card title={`Qué falta para cerrar el B${b.n}`}>
          <Compuertas lista={v.compuertas} bn={b.n} />
        </Card>
      </div>
    </div>
  );
}
