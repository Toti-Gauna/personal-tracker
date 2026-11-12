import { useEffect, useState } from 'react';
import { AREAS } from '../data/defaults';
import { bimester, dayNumber, mejoraAcumulada, racha } from '../data/derive';
import { appliesTo, averagePct, monthLabel, periodRange, ratio, valueOf } from '../data/goals';
import { fmtPct, mejoraDia } from '../data/mejora';
import { SEALS, levelOf, totalXp } from '../data/profile';
import { fmtKg, pace, weightAt } from '../data/train';
import { addDays, fmtDur } from '../data/time';
import type { DayLog } from '../data/types';
import { ir } from '../lib/routes';
import { useStore } from '../state/store';
import { Calendario } from '../ui/Calendario';
import { Sello } from '../ui/Sello';
import { StudyChart, barras, type Periodo } from '../ui/WeekChart';
import '../styles/avance.css';

const PERIODOS: [Periodo, string][] = [['semana', 'Semana'], ['mes', 'Mes'], ['anio', 'Año']];

/** Avance: todo el progreso en una pantalla, con modo presentación para mostrárselo a alguien. */
export function Avance({ day, presentacion }: { day: DayLog; presentacion: boolean }) {
  const s = useStore((x) => x);
  const settings = s.settings!;
  const [periodo, setPeriodo] = useState<Periodo>('semana');
  const date = day.date;
  const bim = bimester(settings.startDate, date, s.goals.bimesterNames);
  const n = dayNumber(settings.startDate, date);
  const rach = racha(s.days, date);
  const lv = levelOf(totalXp(s));
  const acum = mejoraAcumulada(s.days, date);
  const ctx = { study: s.study, days: s.days, train: s.train };

  // Estudio del período elegido.
  const { items } = barras(periodo, date);
  const desde = items[0].desde;
  const hasta = items[items.length - 1].hasta;
  const minutos = Object.entries(s.days).filter(([k]) => k >= desde && k <= hasta).flatMap(([, d]) => d.study ?? []).reduce((a, l) => a + l.min, 0);
  const log30 = s.study.log.filter((l) => l.date >= addDays(date, -30));
  const recuerdo = log30.length ? Math.round((log30.filter((l) => l.grade > 1).length / log30.length) * 100) : null;

  const ws = s.train.weights;
  const ultimo = weightAt(ws, date);
  const ritmo = pace(ws.filter((w) => w.date >= addDays(date, -28)));
  const [mesDesde, mesHasta] = periodRange('mes', date);
  const promMes = averagePct(s.days, mesDesde, mesHasta);
  const anio = s.goals.goals.filter((g) => appliesTo(g, 'anio', date));
  const ganados = SEALS.filter((d) => s.profile.seals[d.id]);

  // Con presentación se esconde lo privado (peso y plata) y se sale con Esc.
  useEffect(() => {
    if (!presentacion) return;
    const on = (e: KeyboardEvent) => e.key === 'Escape' && ir('avance');
    window.addEventListener('keydown', on);
    try { void document.documentElement.requestFullscreen?.(); } catch { /* sin pantalla completa */ }
    return () => {
      window.removeEventListener('keydown', on);
      try { if (document.fullscreenElement) void document.exitFullscreen(); } catch { /* sin pantalla completa */ }
    };
  }, [presentacion]);

  const mostrarPeso = !presentacion;
  const privada = (g: { unit?: string }) => presentacion && (g.unit === 'USD' || g.unit === 'kg');

  return (
    <main className={`avance${presentacion ? ' presentacion' : ''}`}>
      <header className="avance-cab">
        <div>
          <h1 className="titulo">Avance</h1>
          <p>Día {String(n).padStart(2, '0')} de {bim.name}, el primero de nueve bimestres. Todo lo que hice esta semana en estudio, metas y entreno, en una sola vista.</p>
        </div>
        <div className="avance-acc">
          <div className="segmentado" role="radiogroup" aria-label="Período">
            {PERIODOS.map(([id, nombre]) => <button key={id} role="radio" aria-checked={periodo === id} onClick={() => setPeriodo(id)}>{nombre}</button>)}
          </div>
          {presentacion
            ? <a className="btn-borde" href="#/avance">Salir</a>
            : <a className="btn-principal" href="#/avance/presentacion">Modo presentación</a>}
        </div>
      </header>

      <div className="avance-stats" style={{ ['--n' as string]: mostrarPeso ? 4 : 3 }}>
        <div><span className="sub">Racha</span><b className="mono">{rach} {rach === 1 ? 'día' : 'días'}</b><small>nivel {lv.level} · {totalXp(s).toLocaleString('es-AR')} XP</small></div>
        <div><span className="sub">Mejora</span><b className="mono">+{fmtPct(acum)} %</b><small>desde el día 0 · hoy +{fmtPct(mejoraDia(day))}</small></div>
        <div><span className="sub">Estudio</span><b className="mono">{fmtDur(minutos)}</b><small>{recuerdo != null ? `${recuerdo} % de tarjetas recordadas` : 'esta ' + (periodo === 'anio' ? 'año' : periodo)}</small></div>
        {mostrarPeso && <div><span className="sub">Peso</span><b className="mono">{ultimo ? `${fmtKg(ultimo.kg)} kg` : '—'}</b><small>{ritmo ? `${ritmo.change >= 0 ? '+' : '−'}${fmtKg(Math.abs(Math.round(ritmo.change * 10) / 10))} kg en ${ritmo.weeks} ${ritmo.weeks === 1 ? 'semana' : 'semanas'}` : 'cargalo en Entreno'}</small></div>}
      </div>

      <div className="avance-fila uno">
        <section className="tarjeta-av"><StudyChart days={s.days} date={date} fronts={s.study.fronts} periodo={periodo} titulo={`Estudio ${periodo === 'semana' ? 'esta semana' : periodo === 'mes' ? 'este mes' : 'este año'}`} /></section>
        <section className="tarjeta-av" aria-labelledby="av-metas">
          <div className="fila-t"><span className="etiqueta" id="av-metas">Metas del año</span><span className="mono sub">año 1</span></div>
          <ul className="av-metas">
            {anio.map((g) => {
              const v = valueOf(g, date, ctx);
              const oculto = privada(g);
              return (
                <li key={g.id} style={{ ['--c' as string]: AREAS[g.area].css }}>
                  <div><i /><span>{g.title}</span><b className="mono">{oculto ? '•••' : g.unit === 'kg' ? fmtKg(v) : g.unit === 'USD' ? v : `${String(v).replace('.', ',')}/${g.target}`}</b></div>
                  <span className="mg-barra"><span style={{ width: oculto ? '0%' : `${ratio(v, g.target) * 100}%` }} /></span>
                </li>
              );
            })}
          </ul>
        </section>
      </div>

      <div className="avance-fila tres" style={{ ['--n' as string]: mostrarPeso ? 3 : 2 }}>
        <section className="tarjeta-av" aria-labelledby="av-mes">
          <div className="fila-t"><span className="etiqueta" id="av-mes">{monthLabel(date)}</span><span className="mono sub">{promMes.loaded ? `promedio ${Math.round(promMes.avg * 100)} %` : 'sin días cargados'}</span></div>
          <Calendario date={date} days={s.days} leyenda={false} />
        </section>
        <section className="tarjeta-av" aria-labelledby="av-frentes">
          <div className="fila-t"><span className="etiqueta" id="av-frentes">Frentes de estudio</span><span className="mono sub">bimestre {bim.n}</span></div>
          <ul className="av-metas">
            {s.study.activities.map((a) => {
              const f = s.study.fronts.find((x) => x.id === a.front);
              const hechas = a.units ? a.units.filter((u) => s.study.units[a.id]?.[u.n]?.approvedOn).length : a.progress;
              const total = a.units ? a.units.length : a.total;
              return (
                <li key={a.id} style={{ ['--c' as string]: AREAS[f?.color ?? 'ing'].css }}>
                  <div><i /><span>{a.title}</span><b className="mono">{hechas}/{total}</b></div>
                  <span className="mg-barra"><span style={{ width: `${ratio(hechas, total) * 100}%` }} /></span>
                </li>
              );
            })}
          </ul>
        </section>
        {mostrarPeso && (
          <section className="tarjeta-av" aria-labelledby="av-peso">
            <div className="fila-t"><span className="etiqueta" id="av-peso">Peso</span><span className="mono sub">meta {fmtKg(s.train.goalKg)} kg</span></div>
            <CurvaPeso ws={ws} goal={s.train.goalKg} />
          </section>
        )}
      </div>

      <section className="tarjeta-av" aria-labelledby="av-sellos">
        <div className="fila-t"><span className="etiqueta" id="av-sellos">Sellos</span><span className="mono sub">{ganados.length} de {SEALS.length}</span></div>
        <ul className="av-sellos">
          {ganados.length === 0 && <li className="sub">Todavía no ganaste sellos.</li>}
          {ganados.map((d) => <li key={d.id}><Sello mark={d.mark} color={d.color} label={d.name} size={64} /></li>)}
        </ul>
      </section>
    </main>
  );
}

/** Curva chica de peso con la meta punteada. */
function CurvaPeso({ ws, goal }: { ws: { date: string; kg: number }[]; goal: number }) {
  if (!ws.length) return <p className="sub">Todavía no hay pesajes. Cargalos en Entreno → Peso.</p>;
  const vals = [...ws.map((w) => w.kg), goal];
  const min = Math.min(...vals) - 1;
  const max = Math.max(...vals) + 1;
  const W = 300;
  const H = 130;
  const x = (i: number) => 8 + (ws.length > 1 ? (i / (ws.length - 1)) * (W - 24) : (W - 24) / 2);
  const y = (kg: number) => 10 + (1 - (kg - min) / (max - min)) * (H - 36);
  return (
    <svg className="peso-mini" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Peso: ${ws.map((w) => `${fmtKg(w.kg)} kg`).join(', ')}; meta ${fmtKg(goal)} kg`}>
      <line x1={8} x2={W - 8} y1={y(goal)} y2={y(goal)} className="meta" />
      <text x={W - 8} y={y(goal) - 5} textAnchor="end" className="meta-t">meta {fmtKg(goal)} kg</text>
      {ws.length > 1 && <polyline className="curva" points={ws.map((w, i) => `${x(i)},${y(w.kg)}`).join(' ')} />}
      {ws.map((w, i) => <circle key={w.date} cx={x(i)} cy={y(w.kg)} r={i === ws.length - 1 ? 5 : 3} className={i === ws.length - 1 ? 'ultimo' : 'punto'} />)}
      <text x={8} y={H - 6} className="eje">{fmtKg(ws[0].kg)}</text>
      <text x={W - 8} y={H - 6} textAnchor="end" className="eje">{fmtKg(ws[ws.length - 1].kg)} kg hoy</text>
    </svg>
  );
}
