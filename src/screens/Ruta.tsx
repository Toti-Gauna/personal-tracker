import { mejoraAyer, racha } from '../data/derive';
import { mejoraDia } from '../data/mejora';
import { PILOT_WEEKLY } from '../data/ruta';
import type { DayLog } from '../data/types';
import { useStore } from '../state/store';
import { setCheck } from '../state/ruta';
import { Anillo, MejoraChart, PlanBimestre, Sparkline } from '../ui/charts/charts';
import { Card, Leyenda, num, pct } from '../ui/charts/core';
import { Estado, GrillaAnios, corto } from '../ui/RutaBits';
import { mejoraSerie, useRutaVista, type Compuerta } from '../ui/useRuta';
import { useMedia } from '../ui/useMedia';
import { RutaEscritorio } from './RutaEscritorio';
import '../styles/ruta.css';

const MES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const finDe = (d: string) => `${Number(d.slice(8))} de ${MES[Number(d.slice(5, 7)) - 1]}`;

export function Compuertas({ lista, bn }: { lista: Compuerta[]; bn: number }) {
  return (
    <ul className="compuertas">
      {lista.map((c) => (
        <li key={c.key} className={c.state >= 1 ? 'hecho' : ''}>
          <Estado value={c.state} label={c.label} onClick={c.checks ? () => c.checks!.forEach((k) => setCheck(k, c.state < 1)) : undefined} />
          <span>{c.label}</span>
        </li>
      ))}
      <li className="sr-only">Bimestre {bn}</li>
    </ul>
  );
}

/** 7.1 Ruta: dónde estás, qué sigue y qué falta. */
export function Ruta({ day }: { day: DayLog }) {
  const ancho = useMedia('(min-width: 1200px)');
  if (ancho) return <RutaEscritorio day={day} />;
  return <RutaMovil day={day} />;
}

function RutaMovil({ day }: { day: DayLog }) {
  const date = day.date;
  const v = useRutaVista(date);
  const days = useStore((s) => s.days);
  const b = v.b;
  const quedan = Math.max(0, Math.round((new Date(`${b.end}T12:00`).getTime() - new Date(`${date}T12:00`).getTime()) / 864e5));
  const antes = date < b.start;
  const chip = v.ritmo.status === 'adelantado' ? `+${Math.round(v.ritmo.delta * 100)} % adelante` : v.ritmo.status === 'atrasado' ? `${Math.round(v.ritmo.delta * 100)} % atrás` : 'en ritmo';
  const serie = mejoraSerie(days, date, 'dia');
  // Con pocos días se ve el tramo que hay (gráfico parcial), no 30 días de ceros.
  const primero = Object.keys(days).sort()[0] ?? date;
  const span = Math.min(30, Math.max(2, Math.round((new Date(`${date}T12:00`).getTime() - new Date(`${primero}T12:00`).getTime()) / 864e5) + 1));
  const vals = serie.values.slice(-span);
  const pocos = Object.keys(days).length < 7;
  const mejora = mejoraDia(day);
  const diff = mejora - mejoraAyer(days, date);
  const lunes = (() => { const x = new Date(`${date}T12:00`); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x.toISOString().slice(0, 10); })();
  const estudioSemana = Object.entries(days).filter(([k]) => k >= lunes && k <= date).flatMap(([, d]) => d.study ?? []).reduce((a, l) => a + l.min, 0);
  const hechasSemana = v.semana.filter(({ g, value }) => value >= g.target).length;
  const compHechas = v.compuertas.filter((c) => c.state >= 1).length;

  return (
    <>
      <Card className="r-bim">
        <div className="r-meta-in">
          <div className="r-meta">Bimestre {b.n} de 18 · semana {v.week} de 9</div>
          <span className={`chip-ritmo ${v.ritmo.status.replace(' ', '-')}`}>{chip}</span>
        </div>
        <div className="r-bim-top">
          <Anillo value={v.bimAvance} label="bimestre" size={124} />
          <div className="r-bim-txt">
            <a href={`#/metas/bim/${b.n}`} className="r-bim-nombre"><h2 className="titulo resaltado" style={{ ['--c' as string]: 'var(--ing)' }}>{b.product.name}</h2></a>
            <p>{b.product.industry[0].toUpperCase() + b.product.industry.slice(1)}{b.product.pitch ? ` · ${b.product.pitch}` : ''}. {antes ? `Empieza el ${finDe(b.start)}.` : `Cierra el ${finDe(b.end)}: quedan ${quedan} días.`}</p>
            <p className="mono sub">Ruta completa: {pct(v.rutaAvance, 1)} · {v.day > 0 ? `día ${v.day} de ${v.total.toLocaleString('es-AR')}` : `empieza en ${1 - v.day} ${1 - v.day === 1 ? 'día' : 'días'}`}</p>
          </div>
        </div>
        <div className="r-plan-cab"><b>Avance contra el plan</b><Leyenda items={[{ label: 'real', color: 'var(--ing)', kind: 'area' }, { label: 'plan', color: 'var(--sub)', kind: 'punteada' }]} /></div>
        <PlanBimestre plan={v.curva.plan} real={v.curva.real} today={v.curva.today} />
      </Card>

      <div className="fila-t r-sec"><span className="etiqueta">Los carriles · tendencia de la semana</span><a className="subrayado" href={`#/metas/bim/${b.n}`}>Ver todo</a></div>
      <ul className="carriles">
        {v.lanes.map((l) => {
          const piloto = l.id === 'piloto';
          const resumen = piloto ? `${v.pilotoSemana} de ${PILOT_WEEKLY} llamadas`
            : l.id === 'math' ? `${b.summary.math.split(' ').slice(0, 2).join(' ').replace(/ \d.*/, '')} · ${num(l.st.done, l.st.done % 1 ? 1 : 0)} de ${l.st.total} ${l.st.unit}`
            : l.id === 'prog' ? `Estudio · ${num(l.st.done, l.st.done % 1 ? 1 : 0)} de ${l.st.total} ${l.st.unit}`
            : l.id === 'producto' ? `${b.product.name} · ${pct(l.st.done)}` : `${l.items[0] ? corto(l.items[0], b) : ''} · ${pct(l.st.done)}`;
          const sigue = piloto ? `${Math.max(0, PILOT_WEEKLY - v.pilotoSemana)} llamadas más esta semana` : l.st.next ? corto(l.st.next, b) : 'Todo listo';
          return (
            <li key={l.id} style={{ ['--c' as string]: l.color }}>
              <div className="carril-txt">
                <div className="carril-t"><i /><b>{l.name}</b><span className={`mono tono-${piloto ? (v.pilotoSemana >= PILOT_WEEKLY ? 'bien' : 'neutro') : l.st.tone}`}>{piloto ? (v.pilotoSemana >= PILOT_WEEKLY ? 'completo' : v.pilotoSemana >= PILOT_WEEKLY * (v.week / 9) ? 'al día' : 'esta semana') : l.st.label}</span></div>
                <span className="sub">{resumen}</span>
                <span className="carril-sigue">→ {sigue}</span>
              </div>
              <Sparkline values={l.trend} color={l.color} label={`Tendencia de ${l.name} en la semana`} />
            </li>
          );
        })}
      </ul>

      <Card title="Tu evolución" aside={<a className="sub" href="#/metas/evolucion">día · mes · bimestre · año →</a>} className="r-evo">
        <div className="r-stats3">
          <div><b className="mono amarillo">+{num(mejora)} %</b><span>mejora de hoy</span>{primero !== date && <small className={diff >= 0 ? 'verde mono' : 'rojo mono'}>{diff >= 0 ? '+' : '−'}{num(Math.abs(diff))} vs ayer</small>}</div>
          <div><b className="mono">{racha(days, date)}</b><span>días seguidos</span></div>
          <div><b className="mono">{Math.floor(estudioSemana / 60)} h {String(estudioSemana % 60).padStart(2, '0')}</b><span>estudio esta semana</span></div>
        </div>
        <MejoraChart values={vals} avg={vals.length >= 7 ? serie.avg.slice(-vals.length) : []} labels={vals.map(() => '')} h={110} label={`Mejora de los últimos ${vals.length} días`} />
        {pocos && <p className="sub r-vacio">Con más días, acá aparecen la línea de cada día, el promedio de 7 días y cómo venís mes a mes. Se completa con el uso.</p>}
      </Card>

      <div className="fila-t r-sec"><span className="etiqueta">Para cerrar el bimestre · {compHechas} de {v.compuertas.length}</span></div>
      <Compuertas lista={v.compuertas} bn={b.n} />

      <div className="fila-t r-sec"><span className="etiqueta">Los 3 años · {b.n} de 18</span><a className="subrayado" href="#/metas/mapa">Mapa completo</a></div>
      <GrillaAnios actual={b.n} avance={v.bimAvance} />
      <p className="sub r-nota">En rojo, el bimestre de cada certificación. Años 4 y 5: física e ingeniería aeroespacial, opcionales.</p>

      <a className="r-link" href="#/metas/semana-ruta">
        <span><b>Esta semana, según la ruta</b><small>{v.semana.length} metas armadas desde el bimestre · {hechasSemana} {hechasSemana === 1 ? 'hecha' : 'hechas'}</small></span>
        <span aria-hidden="true">→</span>
      </a>
    </>
  );
}
