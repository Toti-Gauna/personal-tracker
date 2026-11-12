import { AREAS } from '../data/defaults';
import { forecast } from '../data/study';
import { fmtDur, fmtFecha, parseDate } from '../data/time';
import type { DayLog } from '../data/types';
import { ir } from '../lib/routes';
import { useStore } from '../state/store';
import { completeExercises } from '../state/study';
import { startStudy } from '../ui/estudio-acciones';
import { useStudyPlan } from '../ui/useStudy';
import '../styles/estudio.css';
import '../styles/repaso.css';

const DIAS = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];

/** 3.1 Repaso de hoy: solo lo que vence, con tope. Lo que no toca, y cuándo vuelve. */
export function Repaso({ day }: { day: DayLog }) {
  const study = useStore((s) => s.study);
  const plan = useStudyPlan(day);
  const { daily } = plan;
  const cap = study.rules.cap;
  const contenido = plan.contenidos.find((c) => c.id === 'repaso');
  const colorOf = (frontId?: string) => AREAS[study.fronts.find((f) => f.id === frontId)?.color ?? 'ing'].css;
  const frontOfAct = (id: string) => study.activities.find((a) => a.id === id)?.front;

  const cold = daily.today.filter((r) => r.kind === 'cold' || r.kind === 'releer');
  const tesis = daily.today.filter((r) => r.kind === 'tesis');
  const ejercicios = daily.today.filter((r) => r.kind === 'ejercicios' || r.kind === 'examen');
  const cardsMin = daily.groups.reduce((s, g) => s + g.min, 0);
  const cardsN = daily.groups.reduce((s, g) => s + g.cards.length, 0);
  const sumOf = (xs: { min: number }[]) => xs.reduce((s, x) => s + x.min, 0);

  // Hoy no toca: lo que no entró en el tope, los cold recall de ayer que salieron bien y lo próximo.
  const ayer = study.reviews.filter((r) => r.kind === 'cold' && r.doneOn && r.doneOn < day.date && (r.score ?? 0) >= study.rules.coldSkipAt);
  const proxEj = study.reviews.filter((r) => (r.kind === 'ejercicios' || r.kind === 'examen') && !r.doneOn && r.due > day.date).sort((a, b) => a.due.localeCompare(b.due))[0];
  const releerPend = study.reviews.some((r) => r.kind === 'releer' && !r.doneOn);
  const fc = forecast(study, day.date);
  const max = Math.max(cap, ...fc.map((f) => f.min));
  const done = (ref: string) => (day.studyDone ?? []).includes(ref);

  let paso = 0;
  const Seccion = ({ titulo, desc, min, children }: { titulo: string; desc: string; min: number; children: React.ReactNode }) => {
    paso++;
    return (
      <section className="rep-paso">
        <span className={`rep-n mono${paso === 1 ? ' on' : ''}`}>{paso}</span>
        <div>
          <div className="rep-cab"><h2>{titulo}</h2><span className="mono">{min} min</span></div>
          <p className="sub">{desc}</p>
          <ul className="rep-items">{children}</ul>
        </div>
      </section>
    );
  };

  return (
    <main className="pantalla repaso">
      <div className="topbar">
        <a className="volver" href="#/estudio">Estudio</a>
        <a className="subrayado" href="#/como">Cómo funciona</a>
      </div>
      <header>
        <h1 className="titulo">Repaso de hoy</h1>
        <p>{daily.min ? `${daily.min} minutos: solo lo que vence hoy. Lo que ya sabés quedó afuera.` : 'Hoy no vence nada: no hay repaso.'}</p>
      </header>

      <div className="tope">
        <div className="tope-barra" role="img" aria-label={`${daily.min} de ${cap} minutos del tope`}>
          {sumOf(cold) > 0 && <span style={{ width: `${(sumOf(cold) / cap) * 100}%`, background: 'var(--economia)' }} />}
          {sumOf(tesis) > 0 && <span style={{ width: `${(sumOf(tesis) / cap) * 100}%`, background: 'var(--eclipse)' }} />}
          {cardsMin > 0 && <span style={{ width: `${(cardsMin / cap) * 100}%`, background: 'var(--ing)' }} />}
          {sumOf(ejercicios) > 0 && <span style={{ width: `${(sumOf(ejercicios) / cap) * 100}%`, background: 'var(--handyx)' }} />}
        </div>
        <div className="fila-t mono sub"><span>{daily.min} de {cap} min de tope</span><span>{[cold.length && 'cold recall', tesis.length && 'tesis', cardsN && 'tarjetas', ejercicios.length && 'ejercicios'].filter(Boolean).join(' · ')}</span></div>
      </div>

      {cold.length > 0 && (
        <Seccion titulo="Cold recall" desc="Lo nuevo de ayer, sin mirar. Escribís lo que recuerdes y lo comparás punto por punto." min={sumOf(cold)}>
          {cold.map((r) => (
            <li key={r.id} className={done(`rev:${r.id}`) ? 'hecho' : ''}>
              <a href={r.kind === 'cold' ? `#/recall/${r.id}` : '#/estudio'}>
                <i style={{ background: colorOf(frontOfAct(r.activityId)) }} />
                <span><b>{r.label.replace(/^Cold recall · /, '')}</b><small>{r.kind === 'releer' ? 'Relectura corta de lo que faltó' : done(`rev:${r.id}`) ? `Hecho · ${Math.round((r.score ?? 0) * 100)} %` : 'Ayer: capítulo nuevo'}</small></span>
                <span className="mono">{r.min} min</span>
              </a>
            </li>
          ))}
        </Seccion>
      )}
      {tesis.length > 0 && (
        <Seccion titulo="Tesis" desc="Llega a los 3 días del capítulo: lo explicás con tus palabras y salen tarjetas." min={sumOf(tesis)}>
          {tesis.map((r) => (
            <li key={r.id} className={done(`rev:${r.id}`) ? 'hecho' : ''}>
              <a href={`#/tesis/${r.id}`}>
                <i style={{ background: colorOf(frontOfAct(r.activityId)) }} />
                <span><b>{r.label}</b><small>{done(`rev:${r.id}`) ? 'Hecha' : 'Día +3 · primer repaso'}</small></span>
                <span className="mono">{r.min} min</span>
              </a>
            </li>
          ))}
        </Seccion>
      )}
      {daily.groups.length > 0 && (
        <Seccion titulo="Tarjetas" desc={`Escribís la respuesta antes de darla vuelta. Solo las ${cardsN} que tocan hoy.`} min={cardsMin}>
          {daily.groups.map((g) => (
            <li key={g.frontId} className={g.pending.length ? '' : 'hecho'}>
              <a href={`#/tarjetas/${g.frontId}`}>
                <i style={{ background: colorOf(g.frontId) }} />
                <span><b>{g.name}</b><small>{g.pending.length ? `${g.pending.length} de ${g.cards.length} tarjetas` : `${g.cards.length} tarjetas · listo`}</small></span>
                <span className="mono">{g.min} min</span>
              </a>
            </li>
          ))}
        </Seccion>
      )}
      {ejercicios.length > 0 && (
        <Seccion titulo="Ejercicios espaciados" desc="3 a 5 ejercicios mixtos sin mirar. Si salen perfectos, el próximo es más corto." min={sumOf(ejercicios)}>
          {ejercicios.map((r) => (
            <li key={r.id} className={done(`rev:${r.id}`) ? 'hecho' : ''}>
              <div className="rep-ej">
                <i style={{ background: colorOf(frontOfAct(r.activityId)) }} />
                <span><b>{r.label}</b><small>{done(`rev:${r.id}`) ? (r.perfect ? 'Perfecto' : 'Hecho') : `${r.min} min`}</small></span>
                {!done(`rev:${r.id}`) && (
                  <span className="rep-botones">
                    <button onClick={() => completeExercises(day.date, r.id, false)}>Hecho</button>
                    <button onClick={() => completeExercises(day.date, r.id, true)}>Perfecto</button>
                  </span>
                )}
              </div>
            </li>
          ))}
        </Seccion>
      )}

      <div className="etiqueta rep-t">Hoy no toca</div>
      <ul className="no-toca-lista">
        {daily.skipped.map((r) => <li key={r.id}><span>{r.label}<small>No entró en el tope de {cap} min</small></span><span className="mono">mañana</span></li>)}
        {daily.skippedCards > 0 && <li><span>{daily.skippedCards} tarjetas<small>Las menos olvidadas esperan</small></span><span className="mono">mañana</span></li>}
        {ayer.slice(-3).map((r) => (
          <li key={r.id}><span>{r.label}<small>Sacaste {Math.round((r.score ?? 0) * 100)} %</small></span><span className="mono">{nextOf(study.reviews, r)}</span></li>
        ))}
        {!ejercicios.length && (
          <li><span>Ejercicios espaciados<small>Ningún capítulo cumple +7, +21 o +60 hoy</small></span><span className="mono">{proxEj ? `${fmtFecha(proxEj.due).split(' ').slice(0, 2).join(' ').toLowerCase()}` : '—'}</span></li>
        )}
        {!releerPend && <li><span>Releer<small>No quedó nada por debajo del {Math.round(study.rules.rereadBelow * 100)} %</small></span><span className="mono">—</span></li>}
      </ul>

      <div className="fila-t rep-t"><span className="etiqueta">Minutos de repaso que vienen</span><span className="mono sub">tope {cap}</span></div>
      <div className="pronostico" role="img" aria-label={fc.map((f, i) => `${i ? DIAS[parseDate(f.date).getDay()] : 'Hoy'}: ${f.min} min`).join(', ')}>
        <div className="meta-linea" style={{ bottom: `${22 + (cap / max) * 100}px` }} />
        {fc.map((f, i) => (
          <div key={f.date} className={`pron${i === 0 ? ' hoy' : ''}`}>
            <span className="pron-area">
              <span className="mono">{f.min ? `${f.min}'` : '—'}</span>
              <span className="pron-barra" style={{ height: `${(f.min / max) * 100}px` }} />
            </span>
            <span className="mono sub">{i === 0 ? 'Hoy' : DIAS[parseDate(f.date).getDay()]}</span>
          </div>
        ))}
      </div>

      {contenido && contenido.falta > 0 ? (
        <button className="btn-principal" onClick={() => startStudy(day.date, 'repaso', contenido.blockKey, contenido.tramos)}>Empezar · {fmtDur(contenido.total)}</button>
      ) : (
        <p className="listo">{daily.min ? 'Repaso de hoy, listo.' : 'Nada para repasar hoy.'}</p>
      )}
      <div className="dos-botones" style={{ marginTop: 16 }}>
        <a className="btn-borde" href="#/tarjeta-nueva">Nueva tarjeta</a>
        <a className="btn-borde" href="#/motor">Motor</a>
      </div>
      <button className="terminar-foco" onClick={() => ir('estudio')}>Volver a Estudio</button>
    </main>
  );
}

function nextOf(reviews: { activityId: string; unit?: number; due: string; doneOn?: string; kind: string }[], r: { activityId: string; unit?: number }) {
  const n = reviews.filter((x) => x.activityId === r.activityId && x.unit === r.unit && !x.doneOn && x.kind !== 'retest').sort((a, b) => a.due.localeCompare(b.due))[0];
  return n ? `vuelve el ${fmtFecha(n.due).split(' ').slice(1).join(' ')}` : 'al día';
}

