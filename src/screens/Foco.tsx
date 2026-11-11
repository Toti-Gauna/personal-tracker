import { useState } from 'react';
import { AREAS } from '../data/defaults';
import { focusMinutes } from '../data/pomodoro';
import { pause, restNow, resume, segProgress, segRemaining, skipRest } from '../data/focus';
import { blockEnd } from '../data/schedule';
import { fmtClock, nowMin, toHHMM } from '../data/time';
import type { DayLog } from '../data/types';
import { ir } from '../lib/routes';
import { addNote, addTask, logFocus, setFocus, useStore } from '../state/store';
import { toast } from '../ui/avisos';
import { Tareas } from '../ui/Tareas';
import { useNow } from '../ui/useNow';
import '../styles/foco.css';

const TICKS = 40;

/** 1.5 Foco: tiempo, avance y tareas del bloque. */
export function Foco({ day }: { day: DayLog }) {
  const focus = useStore((s) => s.focus);
  const now = useNow(250);
  const [tarea, setTarea] = useState('');
  const [nota, setNota] = useState<string | null>(null);

  const block = focus && day.blocks.find((b) => b.key === focus.key);
  if (!focus || !block) {
    return (
      <main className="pantalla">
        <a className="volver" href="#/hoy">Hoy</a>
        <header><h1 className="titulo">Foco</h1><p>No hay ningún foco corriendo. Elegí una meta en Hoy y tocá Entrar en foco.</p></header>
      </main>
    );
  }

  const area = AREAS[block.area];
  const delArea = day.blocks.filter((b) => b.area === block.area);
  const seg = focus.segs[focus.i];
  const pausado = focus.pausedAt != null;
  const llenos = Math.round(segProgress(focus, now) * TICKS);
  const ultimo = focus.i === focus.segs.length - 1;

  const terminar = () => {
    const hechos = focus.segs.slice(0, focus.i).concat(seg.type === 'focus' ? [{ ...seg, min: Math.round((seg.min * 60000 - segRemaining(focus, now)) / 60000) }] : []);
    logFocus(day.date, { key: block.key, plan: focus.plan, focusMin: focusMinutes(hechos), at: toHHMM(nowMin()) });
    setFocus(null);
    ir('hoy');
  };

  return (
    <main className="pantalla foco" style={{ ['--c' as string]: seg.type === 'focus' ? area.css : 'var(--salud)' }}>
      <div className="topbar">
        <a className="volver" href="#/hoy">Hoy</a>
        <span className="mono">{block.start} – {toHHMM(blockEnd(block))}</span>
      </div>
      <div className="kicker" style={{ color: area.css }}>
        {area.name} · bloque {delArea.indexOf(block) + 1} de {delArea.length}
      </div>
      <h1 className="titulo foco-t">{block.title.split(' · ')[0]}</h1>

      <div className="foco-reloj">
        <div className="foco-fila">
          <span className="sub">{pausado ? 'En pausa' : seg.type === 'focus' ? 'Concentración' : 'Descanso'}</span>
          <a className="subrayado mono" href={`#/elegir/${block.key}`}>{focus.plan} · cambiar</a>
        </div>
        <div className="foco-tiempo mono" role="timer" aria-live="off">{fmtClock(segRemaining(focus, now))}</div>
        <div className="ticks" aria-hidden="true">
          {Array.from({ length: TICKS }, (_, i) => <span key={i} className={i < llenos ? 'on' : ''} />)}
        </div>
        <div className="foco-botones">
          <button className="btn-borde" onClick={() => setFocus(pausado ? resume(focus, Date.now()) : pause(focus, Date.now()))}>
            {pausado ? 'Seguir' : 'Pausar'}
          </button>
          {seg.type === 'focus' ? (
            <button className="btn-principal" onClick={() => setFocus(restNow(focus, Date.now()))}>Descanso ahora</button>
          ) : ultimo ? (
            <button className="btn-principal" onClick={terminar}>Terminar</button>
          ) : (
            <button className="btn-principal" onClick={() => setFocus(skipRest(focus, Date.now()))}>Seguir ahora</button>
          )}
        </div>
      </div>

      <Tareas date={day.date} block={block} />
      <form
        className="nueva-tarea"
        onSubmit={(e) => {
          e.preventDefault();
          addTask(day.date, block.key, tarea);
          setTarea('');
        }}
      >
        <input className="campo-linea" placeholder="+ Tarea para este bloque" value={tarea} onChange={(e) => setTarea(e.target.value)} aria-label="Nueva tarea para este bloque" />
      </form>

      {nota == null ? (
        <button className="anotar" onClick={() => setNota('')}>Anotar algo para una tarjeta <span aria-hidden="true">→</span></button>
      ) : (
        <form
          className="anotar-form"
          onSubmit={(e) => {
            e.preventDefault();
            addNote(day.date, nota);
            setNota(null);
            toast({ title: 'Anotado', sub: 'Queda en el JSON del día para hacer la tarjeta', color: area.css }, false);
          }}
        >
          <textarea className="campo-texto" autoFocus rows={3} value={nota} onChange={(e) => setNota(e.target.value)} aria-label="Nota para una tarjeta" />
          <button className="btn-principal" type="submit" disabled={!nota.trim()}>Guardar nota</button>
        </form>
      )}

      <button className="terminar-foco" onClick={terminar}>Terminar el foco</button>
    </main>
  );
}
