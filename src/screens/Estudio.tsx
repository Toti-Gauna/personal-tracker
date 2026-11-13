import { useEffect, useState } from 'react';
import { AREAS } from '../data/defaults';
import { KIND_LABEL, STEP_LABEL, unitPhases, type PlanStep } from '../data/study';
import { addDays, fmtDur } from '../data/time';
import type { ReviewItem } from '../data/study-types';
import type { DayLog } from '../data/types';
import { ir } from '../lib/routes';
import { useStore } from '../state/store';
import { completeLearn, completeReview, uncompleteReview } from '../state/study';
import { Casilla } from '../ui/Casilla';
import { startStudy } from '../ui/estudio-acciones';
import { useStudyPlan, type Contenido } from '../ui/useStudy';
import { WeekChart } from '../ui/WeekChart';
import '../styles/estudio.css';

/** Qué pasa al tocar la casilla de un paso. */
function tocar(date: string, s: PlanStep, done: boolean) {
  const [tipo, a, b] = s.ref.split(':');
  if (tipo === 'cards') return ir(`tarjetas/${a}`);
  if (tipo === 'rev') {
    if (s.kind === 'tesis') return ir(`tesis/${a}`);
    if (s.kind === 'cold' && !done) return ir(`recall/${a}`);
    return done ? uncompleteReview(date, a) : completeReview(date, a);
  }
  if (tipo === 'learn' && !done) return completeLearn(date, a, b ? Number(b) : undefined);
  if (tipo === 'test') return ir(`test/${a}/${b}`);
}

function Panel({ c, day, skipped }: { c: Contenido; day: DayLog; skipped: ReviewItem[] }) {
  const focus = useStore((s) => s.focus);
  const study = useStore((s) => s.study);
  const enSesion = focus?.activityId === c.id && focus.date === day.date;
  const fases = c.activity ? unitPhases(c.activity, study, day.date) : null;
  // La fase en la que estás: la del primer paso que falta, en el orden de la sesión.
  const ahora = c.steps.find((s) => !c.done(s))?.step;
  return (
    <section className="plan" style={{ ['--c' as string]: AREAS[c.color as keyof typeof AREAS].css }} aria-labelledby="plan-t">
      <div className="plan-cab">
        <h2 id="plan-t">{c.activity ? <a href={`#/actividad/${c.id}`}>{c.title}</a> : c.title}</h2>
        {c.start && <span className="mono">{c.start} – {c.end}</span>}
      </div>
      {fases && (
        <ol className="fases" aria-label="Qué capítulo toca hoy en cada fase">
          {fases.map((f) => (
            <li key={f.name} aria-current={f.step === ahora ? 'step' : undefined} className={f.when === '—' ? 'nada' : ''}>
              <small>{f.when}</small>
              <b>{f.name}</b>
            </li>
          ))}
        </ol>
      )}
      <ul className="pasos-plan">
        {c.steps.map((s) => {
          const done = c.done(s);
          return (
            <li key={s.ref} className={done ? 'hecho' : ''}>
              <Casilla checked={done} label={`${STEP_LABEL[s.step]}: ${s.title}`} onChange={() => tocar(day.date, s, done)} />
              <div className="paso-t">
                <span className="etiqueta">{STEP_LABEL[s.step]} · {KIND_LABEL[s.kind]}</span>
                <span className="paso-nombre">{s.title}</span>
              </div>
              <div className="paso-min">
                <span className="mono">{fmtDur(s.ver)}</span>
                {s.paper != null && <span className="chip-papel">{s.paper ? 'en papel' : 'en la app'}</span>}
              </div>
            </li>
          );
        })}
      </ul>
      {c.id === 'repaso' && skipped.length > 0 && (
        <div className="no-toca">
          <span className="etiqueta">Hoy no toca · tope de 20 min</span>
          {skipped.map((r) => <p key={r.id}>{r.label} <span className="sub">· vuelve mañana</span></p>)}
        </div>
      )}
      {c.id === 'repaso' && <a className="fila-link" href="#/repaso">Ver el repaso de hoy <span aria-hidden="true">→</span></a>}
      {c.falta === 0 ? (
        <p className="listo">Listo por hoy.</p>
      ) : (
        <button
          className="btn-principal"
          onClick={() => (enSesion ? ir(`sesion/${c.id}`) : startStudy(day.date, c.id, c.blockKey, c.tramos))}
        >
          {enSesion ? 'Volver a la sesión' : `Entrar en foco · ${fmtDur(c.falta)}`}
        </button>
      )}
    </section>
  );
}

/** 2.1 Estudio: los contenidos de hoy, qué falta de cada uno y la semana. */
export function Estudio({ day }: { day: DayLog }) {
  const plan = useStudyPlan(day);
  const study = useStore((s) => s.study);
  const days = useStore((s) => s.days);
  const [sel, setSel] = useState<string | null>(null);
  const actual = plan.contenidos.find((c) => c.id === sel) ?? plan.contenidos.find((c) => c.falta > 0 && c.id !== 'repaso') ?? plan.contenidos[0];
  useEffect(() => { if (actual && sel == null) setSel(actual.id); }, [actual, sel]);

  const conamat = study.activities.find((a) => a.id === 'conamat');
  const aprobados = conamat?.units?.filter((u) => study.units.conamat?.[u.n]?.approvedOn).length ?? 0;
  const tests = Object.values(study.units).flatMap((u) => Object.values(u).flatMap((x) => x.tests));
  const prom = tests.length ? Math.round((tests.reduce((s, t) => s + t.score / t.total, 0) / tests.length) * 100) : null;
  const log30 = study.log.filter((l) => l.date >= addDays(day.date, -30));
  const recordas = log30.length ? Math.round((log30.filter((l) => l.grade > 1).length / log30.length) * 100) : null;

  return (
    <main className="pantalla estudio">
      <header>
        <h1 className="titulo">Estudio</h1>
        <p>Hoy tenés {plan.contenidos.length} {plan.contenidos.length === 1 ? 'contenido' : 'contenidos'} y {fmtDur(plan.total)} de estudio. Elegí uno para ver qué te falta.</p>
      </header>

      <div className="fila-t">
        <span className="etiqueta">Hoy</span>
        <span className="mono sub">{plan.stepsDone} de {plan.stepsTotal} hecho · falta {fmtDur(plan.falta)}</span>
      </div>
      <div className="contenidos" role="tablist" aria-label="Contenidos de hoy">
        {plan.contenidos.map((c) => {
          const pct = c.total ? Math.round(((c.total - c.falta) / c.total) * 100) : 0;
          return (
            <button key={c.id} role="tab" aria-selected={actual?.id === c.id} className="contenido" style={{ ['--c' as string]: AREAS[c.color as keyof typeof AREAS].css }} onClick={() => setSel(c.id)}>
              <span className="cont-frente"><i />{c.front}</span>
              <b className={actual?.id === c.id ? 'trazo on' : ''}>{c.title}</b>
              <span className="cont-barra"><span style={{ width: `${pct}%` }} /></span>
              <span className="mono sub">{c.falta ? `falta ${fmtDur(c.falta)}` : 'listo'}</span>
            </button>
          );
        })}
      </div>
      {plan.contenidos.length === 0 && <p className="sub">Hoy no tenés estudio programado.</p>}

      {actual && <Panel c={actual} day={day} skipped={plan.skipped} />}

      <WeekChart days={days} date={day.date} fronts={study.fronts} />

      <div className="numeros">
        <div><b className="mono">{aprobados}/{conamat?.units?.length ?? 11}</b><span>capítulos de Aritmética</span></div>
        <div><b className="mono">{prom == null ? '—' : `${prom} %`}</b><span>promedio de tests</span></div>
        <div><b className="mono">{recordas == null ? study.cards.length : `${recordas} %`}</b><span>{recordas == null ? 'tarjetas creadas' : 'tarjetas que recordás'}</span></div>
      </div>

      <div className="dos-botones">
        <a className="btn-borde" href="#/como">Cómo funciona</a>
        <a className="btn-borde" href="#/unidades">Plan del bimestre</a>
      </div>
      <a className="sumar" href="#/actividad">+ Sumar algo de estudio a hoy</a>
    </main>
  );
}
