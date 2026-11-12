import { useState } from 'react';
import { addDays } from '../data/time';
import { weekday } from '../data/study';
import { fmtH, fmtKg, monday, plannedFor, restLabel, sessionsInWeek, setsLabel, stepsMin, totalMin, volume, weightAt } from '../data/train';
import { PLAN_NAME, REST_DAY } from '../data/train-catalog';
import type { DayLog } from '../data/types';
import { ir } from '../lib/routes';
import { useStore } from '../state/store';
import { startTraining } from '../state/train';
import '../styles/entreno.css';

const DIAS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

/** 5.1 Rutinas: la semana, lo que toca hoy y entrenar en pareja. */
export function Entreno({ day }: { day: DayLog }) {
  const t = useStore((s) => s.train);
  const settings = useStore((s) => s.settings)!;
  const [pareja, setPareja] = useState(true);
  const date = day.date;
  const hoy = plannedFor(t, date);
  const semana = sessionsInWeek(t, date);
  const planeadas = t.plan.days.filter((d) => d && d !== REST_DAY).length;
  const kgSemana = volume(semana.flatMap((s) => s.sets), 'me');
  const peso = weightAt(t.weights, date);
  const m = monday(date);
  const hechoHoy = t.sessions.some((s) => s.date === date);
  const enCurso = t.active?.date === date ? t.active : null;
  const partner = settings.names.partner;
  const otras = t.routines.filter((r) => r.id !== hoy.routine?.id);

  return (
    <main className="pantalla entreno">
      <header>
        <h1 className="titulo">Entreno</h1>
        <p>
          {hoy.routine ? `Hoy toca ${hoy.routine.name.toLowerCase()}${pareja ? ` con ${partner}` : ''}. ` : hoy.rest ? 'Hoy toca descanso activo: caminar 45 minutos. ' : 'Hoy no hay entreno planeado. '}
          Van {semana.length} de {planeadas} sesiones de la semana, plan {PLAN_NAME[t.plan.template]}.
        </p>
      </header>

      <div className="tres-datos">
        <div><b className="mono">{semana.length}/{planeadas}</b><span>esta semana</span></div>
        <a href="#/entreno-peso"><b className="mono">{peso ? fmtKg(peso.kg) : '—'}</b><span>kg · ver curva →</span></a>
        <div><b className="mono">{fmtKg(Math.round(kgSemana / 100) / 10)} t</b><span>volumen semanal</span></div>
      </div>

      <div className="semana-tira" role="list" aria-label="Semana de entreno">
        {t.plan.days.map((id, i) => {
          const r = t.routines.find((x) => x.id === id);
          const key = addDays(m, i);
          const hecho = t.sessions.some((s) => s.date === key);
          return (
            <div key={i} role="listitem" className={i === weekday(date) ? 'hoy' : ''}>
              <span className="mono">{DIAS[i]}</span>
              <b>{r ? r.name.replace('Piernas', 'Legs').replace('Full body', 'Full') : '—'}</b>
              <i className={hecho ? 'on' : ''} />
            </div>
          );
        })}
      </div>
      <a className="fila-link" href="#/entreno-semana">Cambiar qué entreno cada día <span aria-hidden="true">→</span></a>

      {hoy.routine && (
        <>
          <div className="fila-t hoy-toca"><span className="etiqueta" style={{ color: 'var(--salud)' }}>Hoy toca</span><span className="mono sub">~{fmtH(totalMin(hoy.routine))} con antes y después</span></div>
          <h2 className="titulo rut-t">{hoy.routine.name}</h2>
          <ul className="rut-lista">
            <li><span>Antes · {hoy.routine.before.map((s) => s.name.toLowerCase()).join(' + ')}</span><span className="mono">{stepsMin(hoy.routine.before)} min</span></li>
            {hoy.routine.exercises.map((e) => (
              <li key={e.id}><span>{e.name}</span><span className="mono">{setsLabel(e)} · {restLabel(e.rest)}</span></li>
            ))}
            <li><span>Después · {hoy.routine.after.map((s) => s.name.toLowerCase()).join(' + ')}</span><span className="mono">{stepsMin(hoy.routine.after)} min</span></li>
          </ul>
          <div className="fila-ajuste caja">
            <span>Entrenar en pareja<small>Con {partner} · cada uno con su peso</small></span>
            <button role="switch" className="switch" aria-checked={pareja} aria-label="Entrenar en pareja" onClick={() => setPareja((v) => !v)} />
          </div>
          {hechoHoy && !enCurso ? (
            <p className="listo">Entrenamiento de hoy, listo.</p>
          ) : (
            <button className="btn-principal" onClick={() => { if (!enCurso) startTraining(hoy.routine!.id, date, pareja); ir(`entreno-sesion/${hoy.routine!.id}`); }}>
              {enCurso ? `Volver a ${hoy.routine.name}` : `Empezar ${hoy.routine.name}`}
            </button>
          )}
        </>
      )}
      {hoy.rest && (
        <div className="descanso-hoy"><h2 className="titulo rut-t">Descanso activo</h2><p className="sub">Caminar 45 minutos. Hoy no se levanta.</p></div>
      )}

      <div className="etiqueta otras-t">Otras rutinas</div>
      <ul className="otras">
        {otras.map((r) => (
          <li key={r.id}>
            <a href={`#/entreno-rutina/${r.id}`}>
              <span><b>{r.name}</b><small>{r.desc}</small></span>
              <span className="mono sub">{r.exercises.length} ej.</span>
            </a>
          </li>
        ))}
      </ul>
      <div className="dos-botones">
        <a className="btn-borde" href="#/entreno-motor">Motor de entreno</a>
        <a className="btn-borde" href="#/entreno-peso">Peso</a>
      </div>
    </main>
  );
}
