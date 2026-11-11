import { AREAS } from '../data/defaults';
import { addMinutes, pause, resume, segProgress, segRemaining } from '../data/focus';
import { STEP_LABEL, sumMin } from '../data/study';
import { fmtClock, fmtDur, toHHMM, toMin } from '../data/time';
import type { DayLog } from '../data/types';
import { ir } from '../lib/routes';
import { setFocus, useStore } from '../state/store';
import { startStudy, tramoHecho } from '../ui/estudio-acciones';
import { useNow } from '../ui/useNow';
import { useStudyPlan } from '../ui/useStudy';
import '../styles/estudio.css';
import '../styles/foco.css';

const TRAMO_COLOR: Record<string, string> = {
  cold: 'var(--economia)', tesis: 'var(--economia)', ejercicios: 'var(--economia)', examen: 'var(--economia)',
  capitulo: 'var(--c)', descanso: 'var(--linea)', test: 'var(--eclipse)',
};

/** 2.2 Sesión de estudio: el timer propio de cada meta de estudio, tramo por tramo. */
export function SesionEstudio({ day, id }: { day: DayLog; id?: string }) {
  const focus = useStore((s) => s.focus);
  const study = useStore((s) => s.study);
  const plan = useStudyPlan(day);
  const now = useNow(250);
  const c = plan.contenidos.find((x) => x.id === id);
  const activa = focus?.tramos && focus.activityId === id && focus.date === day.date ? focus : null;
  const a = study.activities.find((x) => x.id === id);
  const front = study.fronts.find((f) => f.id === a?.front);
  const color = id === 'repaso' ? 'var(--economia)' : front ? AREAS[front.color].css : 'var(--ing)';
  const meta = day.blocks.find((b) => b.key === (c?.blockKey ?? a?.block));

  if (!activa) {
    return (
      <main className="pantalla sesion" style={{ ['--c' as string]: color }}>
        <div className="topbar"><a className="volver" href="#/estudio">Estudio</a></div>
        <div className="kicker">{meta ? `Meta ${meta.n} · ` : ''}{front?.name ?? 'Repaso'}</div>
        <h1 className="titulo">Sesión de estudio</h1>
        {c && c.tramos.length > 0 ? (
          <>
            <p className="sub">{c.title}: {c.tramos.length} tramos, {fmtDur(c.total)}. Repasar → Aprender → Comprobar.</p>
            <Lista tramos={c.tramos} actual={-1} />
            <button className="btn-principal" onClick={() => startStudy(day.date, c.id, c.blockKey, c.tramos)}>Empezar · {fmtDur(c.total)}</button>
          </>
        ) : (
          <p className="sub">No hay sesión para este contenido hoy.</p>
        )}
      </main>
    );
  }

  const tr = activa.tramos!;
  const t = tr[activa.i];
  const pausado = activa.pausedAt != null;
  const pasados = sumMin(tr.slice(0, activa.i));
  const inicio = meta && toMin(meta.start) ? toMin(meta.start) : null;
  const total = sumMin(tr);

  const accion = () => {
    if (t.kind === 'tesis') return ir(`tesis/${t.ref.slice(4)}`);
    if (t.kind === 'test') {
      const [, act, n] = t.ref.split(':');
      return ir(`test/${act}/${n}`);
    }
    tramoHecho(activa);
  };
  const accionLabel = t.kind === 'tesis' ? 'Abrir tesis' : t.kind === 'test' ? 'Registrar test' : t.kind === 'descanso' ? 'Seguir ahora' : 'Hecho';

  return (
    <main className="pantalla sesion" style={{ ['--c' as string]: color }}>
      <div className="topbar">
        <a className="volver" href="#/estudio">Estudio</a>
        {meta && <span className="mono">{meta.start} – {toHHMM(toMin(meta.start) + meta.min)}</span>}
      </div>
      <div className="kicker">{meta ? `Meta ${meta.n} · ` : ''}{front?.name ?? 'Repaso'} · {c?.title ?? ''}</div>
      <h1 className="titulo">Sesión de estudio</h1>

      <div className="tramos-barra" aria-hidden="true">
        {tr.map((x, i) => (
          <span key={i} style={{ flexGrow: x.min, background: TRAMO_COLOR[x.kind], opacity: i < activa.i ? 1 : i === activa.i ? 0.9 : 0.35 }} />
        ))}
      </div>

      <div className="tramo-actual">
        <div className="foco-fila">
          <span className="sub">Tramo {activa.i + 1} de {tr.length} · {t.kind === 'descanso' ? 'Descanso' : STEP_LABEL[t.step]}{pausado ? ' · en pausa' : ''}</span>
          {inicio != null && <span className="mono sub">de {toHHMM(inicio + pasados)}</span>}
        </div>
        <h2 className="tramo-t">{t.title}</h2>
        <div className="foco-tiempo mono" role="timer">{fmtClock(segRemaining(activa, now))}</div>
        <div className="tramo-prog"><span style={{ width: `${segProgress(activa, now) * 100}%` }} /></div>
        <div className="tres-botones">
          <button className="btn-borde" onClick={() => setFocus(pausado ? resume(activa, Date.now()) : pause(activa, Date.now()))}>{pausado ? 'Seguir' : 'Pausar'}</button>
          <button className="btn-borde" onClick={() => setFocus(addMinutes(activa, 5))}>+5 min</button>
          <button className="btn-principal" onClick={accion}>{accionLabel}</button>
        </div>
        {(t.kind === 'tesis' || t.kind === 'test') && (
          <button className="terminar-foco" onClick={() => tramoHecho(activa)}>Pasar al siguiente tramo</button>
        )}
      </div>

      <div className="fila-t">
        <span className="etiqueta">La sesión</span>
        <span className="mono sub">{fmtDur(total)}{meta ? ` de ${fmtDur(meta.min)}` : ''}</span>
      </div>
      <Lista tramos={tr} actual={activa.i} />

      {tr.some((x) => x.kind === 'capitulo') && a && (
        <a className="fila-link" href={`#/elegir/${a.block}`}>
          <span>Cambiar el pomodoro de aprender</span><span aria-hidden="true">→</span>
        </a>
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
