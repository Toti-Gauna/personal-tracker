import { useState } from 'react';
import { AREAS, BUILTIN_PRESETS } from '../data/defaults';
import { addMinutes, pause, resume, segProgress, segRemaining } from '../data/focus';
import { STEP_LABEL, presetName, rePomodoro, studyPreset, sumMin } from '../data/study';
import type { Tramo } from '../data/study-types';
import { fmtClock, fmtDur, toHHMM, toMin } from '../data/time';
import type { DayLog } from '../data/types';
import { ir } from '../lib/routes';
import { setFocus, useStore } from '../state/store';
import { saveActivity } from '../state/study';
import { toast } from '../ui/avisos';
import { startStudy, tramoHecho } from '../ui/estudio-acciones';
import { useNow } from '../ui/useNow';
import { useStudyPlan } from '../ui/useStudy';
import '../styles/estudio.css';
import '../styles/foco.css';

const TRAMO_COLOR: Record<string, string> = {
  cold: 'var(--economia)', releer: 'var(--economia)', tarjetas: 'var(--ing)', tesis: 'var(--handyx)',
  ejercicios: 'var(--economia)', examen: 'var(--economia)', capitulo: 'var(--c)', descanso: 'var(--linea)', test: 'var(--eclipse)',
};

/** "Terminó el cold recall", "Terminó la tesis"… */
const TERMINO: Record<Tramo['kind'], string> = {
  cold: 'el cold recall', releer: 'la relectura', tarjetas: 'las tarjetas', tesis: 'la tesis', ejercicios: 'los ejercicios',
  examen: 'el examen corto', capitulo: 'el pomodoro', descanso: 'el descanso', test: 'el test',
};

/** 2.2 Sesión de estudio: el timer propio de cada meta de estudio, tramo por tramo. */
export function SesionEstudio({ day, id }: { day: DayLog; id?: string }) {
  const focus = useStore((s) => s.focus);
  const study = useStore((s) => s.study);
  const presets = useStore((s) => s.settings?.presets ?? []);
  const plan = useStudyPlan(day);
  const now = useNow(250);
  const [cerrado, setCerrado] = useState(-1);
  const [elegir, setElegir] = useState(false);
  const c = plan.contenidos.find((x) => x.id === id);
  const activa = focus?.tramos && focus.activityId === id && focus.date === day.date ? focus : null;
  const a = study.activities.find((x) => x.id === id);
  const front = study.fronts.find((f) => f.id === a?.front);
  const color = id === 'repaso' ? 'var(--economia)' : front ? AREAS[front.color].css : 'var(--ing)';
  const meta = day.blocks.find((b) => b.key === (c?.blockKey ?? a?.block));
  const kicker = `${meta ? `Meta ${meta.n} · ` : ''}${front?.name ?? 'Repaso'}${a ? ` · ${a.title.split(' · ')[0]}` : ''}`;
  const tr = activa?.tramos ?? c?.tramos ?? [];
  const iLearn = tr.findIndex((x) => x.kind === 'capitulo');
  const preset = a ? studyPreset(a, presets) : null;

  const cambiar = (pid: string) => {
    if (!a) return;
    saveActivity({ ...a, pomodoro: pid });
    setElegir(false);
    const p = [...BUILTIN_PRESETS, ...presets].find((x) => x.id === pid)!;
    if (!activa) return;
    const otros = sumMin(tr.filter((x) => x.step !== 'estudiar'));
    const avail = meta ? meta.min - otros : sumMin(tr.filter((x) => x.step === 'estudiar'));
    const nuevos = rePomodoro(tr, activa.i, p, avail);
    if (!nuevos) return toast({ title: `Pomodoro ${presetName(p)}`, sub: 'Ya empezaste a estudiar: se aplica desde la próxima sesión', color }, false);
    setFocus({ ...activa, tramos: nuevos, segs: nuevos.map((t) => ({ type: t.kind === 'descanso' ? 'rest' : 'focus', min: t.min })) });
  };

  const Pomodoro = () =>
    a && iLearn >= 0 && preset ? (
      <>
        <button className="fila-link fila-boton" aria-expanded={elegir} onClick={() => setElegir((v) => !v)}>
          <span>Cambiar el pomodoro del tramo {iLearn + 1}</span>
          <span className="mono sub">{presetName(preset)} <span aria-hidden="true">→</span></span>
        </button>
        {elegir && (
          <div className="chips elegir-pomo" role="radiogroup" aria-label="Pomodoro para estudiar">
            {[...BUILTIN_PRESETS, ...presets].map((p) => (
              <button key={p.id} role="radio" aria-checked={p.id === preset.id} onClick={() => cambiar(p.id)}>{p.builtin ? presetName(p) : p.name}</button>
            ))}
          </div>
        )}
      </>
    ) : null;

  if (!activa) {
    return (
      <main className="pantalla sesion" style={{ ['--c' as string]: color }}>
        <div className="topbar"><a className="volver" href="#/hoy">Hoy</a>{meta && <span className="mono">{meta.start} – {toHHMM(toMin(meta.start) + meta.min)}</span>}</div>
        <div className="kicker">{kicker}</div>
        <h1 className="titulo">Sesión de estudio</h1>
        {c && c.tramos.length > 0 ? (
          <>
            <p className="sub">{c.title}: {c.tramos.length} tramos, {fmtDur(c.total)}. Primero lo que vence, después el capítulo y al final el test.</p>
            <Lista tramos={c.tramos} actual={-1} />
            <Pomodoro />
            <button className="btn-principal" onClick={() => startStudy(day.date, c.id, c.blockKey, c.tramos)}>Empezar · {fmtDur(c.total)}</button>
          </>
        ) : (
          <p className="sub">No hay sesión para este contenido hoy.</p>
        )}
      </main>
    );
  }

  const t = tr[activa.i];
  const prev = activa.i > 0 ? tr[activa.i - 1] : null;
  const pausado = activa.pausedAt != null;
  const total = sumMin(tr);

  const accion = () => {
    if (t.kind === 'tesis') return ir(`tesis/${t.ref.slice(4)}`);
    if (t.kind === 'cold') return ir(`recall/${t.ref.slice(4)}`);
    if (t.kind === 'tarjetas') return ir(`tarjetas/${t.ref.slice(6)}`);
    if (t.kind === 'test') {
      const [, act, n] = t.ref.split(':');
      return ir(`test/${act}/${n}`);
    }
    tramoHecho(activa);
  };
  const accionLabel = t.kind === 'tesis' ? 'Abrir tesis' : t.kind === 'cold' ? 'Escribir' : t.kind === 'tarjetas' ? 'Abrir tarjetas' : t.kind === 'test' ? 'Abrir test' : t.kind === 'descanso' ? 'Seguir ahora' : 'Hecho';

  return (
    <main className="pantalla sesion" style={{ ['--c' as string]: color }}>
      <div className="topbar">
        <a className="volver" href="#/hoy">Hoy</a>
        {meta && <span className="mono">{meta.start} – {toHHMM(toMin(meta.start) + meta.min)}</span>}
      </div>
      {prev && cerrado !== activa.i && (
        <div className="aviso-tramo" role="status" style={{ ['--a' as string]: TRAMO_COLOR[prev.kind] }}>
          <span><b>Terminó {TERMINO[prev.kind]}</b><small>Sigue: {t.title} · {fmtDur(t.min)}</small></span>
          <button aria-label="Cerrar aviso" onClick={() => setCerrado(activa.i)}>×</button>
        </div>
      )}
      <div className="kicker">{kicker}</div>
      <h1 className="titulo">Sesión de estudio</h1>

      <div className="tramos-barra" aria-hidden="true">
        {tr.map((x, i) => (
          <span key={i} style={{ flexGrow: x.min, background: TRAMO_COLOR[x.kind], opacity: i <= activa.i ? 1 : x.kind === 'descanso' ? 0.6 : 0.4 }} />
        ))}
      </div>

      <div className="tramo-actual">
        <div className="foco-fila">
          <span className="sub">Tramo {activa.i + 1} de {tr.length} · {t.kind === 'descanso' ? 'Descanso' : STEP_LABEL[t.step] ?? ''}{pausado ? ' · en pausa' : ''}</span>
          <span className="mono sub">de {fmtClock(t.min * 60000)}</span>
        </div>
        <h2 className="tramo-t">{t.title}</h2>
        <div className="foco-tiempo mono" role="timer">{fmtClock(segRemaining(activa, now))}</div>
        <div className="tramo-prog"><span style={{ width: `${segProgress(activa, now) * 100}%`, background: TRAMO_COLOR[t.kind] === 'var(--linea)' ? 'var(--sub)' : TRAMO_COLOR[t.kind] }} /></div>
        <div className="tres-botones">
          <button className="btn-borde" onClick={() => setFocus(pausado ? resume(activa, Date.now()) : pause(activa, Date.now()))}>{pausado ? 'Seguir' : 'Pausar'}</button>
          <button className="btn-borde" onClick={() => setFocus(addMinutes(activa, 5))}>+5 min</button>
          <button className="btn-principal" onClick={accion}>{accionLabel}</button>
        </div>
      </div>

      <div className="fila-t">
        <span className="etiqueta">La sesión</span>
        <span className="mono sub">{fmtDur(total)}{meta ? ` de ${fmtDur(meta.min)}` : ''}</span>
      </div>
      <Lista tramos={tr} actual={activa.i} />
      <Pomodoro />
      {(t.kind === 'tesis' || t.kind === 'test' || t.kind === 'cold' || t.kind === 'tarjetas') && (
        <button className="terminar-foco" onClick={() => tramoHecho(activa)}>Pasar al siguiente tramo</button>
      )}
      <button className="terminar-foco" onClick={() => { setFocus(null); ir('estudio'); }}>Terminar la sesión</button>
    </main>
  );
}

function Lista({ tramos, actual }: { tramos: { title: string; sub: string; min: number; kind: string }[]; actual: number }) {
  return (
    <ol className="tramos">
      {tramos.map((x, i) => (
        <li key={i} className={i < actual ? 'pasado' : i === actual ? 'actual' : ''}>
          <span className="tramo-n mono">{i < actual ? '✓' : i + 1}</span>
          <span className="tramo-txt"><b>{x.title}</b><small>{x.sub}</small></span>
          <span className="mono sub">{fmtDur(x.min)}</span>
        </li>
      ))}
    </ol>
  );
}
