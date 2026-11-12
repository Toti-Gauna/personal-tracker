import { useMemo, useState } from 'react';
import { compareAnswer } from '../data/compare';
import { AREAS } from '../data/defaults';
import { DAY, fmtInterval, newSrs, preview, type Grade } from '../data/fsrs';
import { cardFront, dailyReview } from '../data/study';
import type { DayLog } from '../data/types';
import { getState, useStore } from '../state/store';
import { gradeCard, updateCard } from '../state/study';
import '../styles/estudio.css';
import '../styles/repaso.css';

type Modo = 'escribir' | 'decir' | 'pensar';
const MODOS: [Modo, string][] = [['escribir', 'Escribir'], ['decir', 'Decir en voz alta'], ['pensar', 'Pensar']];
const BOTONES: [Grade, string, string][] = [[1, 'Otra vez', 'var(--rutina)'], [2, 'Difícil', 'var(--tinta)'], [3, 'Bien', 'var(--tinta)'], [4, 'Fácil', 'var(--salud)']];

const leerModo = (): Modo => {
  try {
    const m = localStorage.getItem('trazo.modoTarjetas');
    if (m === 'escribir' || m === 'decir' || m === 'pensar') return m;
  } catch { /* sin storage */ }
  return 'escribir';
};

/** 3.3 Tarjetas con active recall: respondés antes de dar vuelta; Trazo marca lo que faltó y sugiere. */
export function Tarjetas({ day, frontId }: { day: DayLog; frontId?: string }) {
  const study = useStore((s) => s.study);
  // La cola se arma al entrar; lo que sale "Otra vez" vuelve al final.
  const [cola, setCola] = useState<string[]>(() => {
    const d = dailyReview(getState().study, day.date);
    return d.groups.filter((g) => !frontId || g.frontId === frontId).flatMap((g) => g.pending.map((c) => c.id));
  });
  const [total] = useState(cola.length);
  const [hechas, setHechas] = useState(0);
  const [modo, setModo] = useState<Modo>(leerModo);
  const [resp, setResp] = useState('');
  const [vuelta, setVuelta] = useState(false);
  const [editando, setEditando] = useState<string | null>(null);

  const card = study.cards.find((c) => c.id === cola[0]);
  // La hora se fija junto con la vista previa, así "1 día" no se lee como "1440 min".
  const { now, opciones } = useMemo(() => {
    const t = Date.now();
    return { now: t, opciones: card ? preview(card.srs ?? newSrs(t), t, study.rules.retention) : [] };
  }, [card, study.rules.retention]);
  const cmp = useMemo(() => (card && vuelta && modo === 'escribir' ? compareAnswer(resp, card.back) : null), [card, vuelta, modo, resp]);
  const front = card ? study.fronts.find((f) => f.id === cardFront(card, study.fronts)) : undefined;
  const color = front ? AREAS[front.color].css : 'var(--ing)';

  const cambiarModo = (m: Modo) => {
    setModo(m);
    try { localStorage.setItem('trazo.modoTarjetas', m); } catch { /* sin storage */ }
  };
  const calificar = (g: Grade) => {
    if (!card) return;
    gradeCard(day.date, card.id, g);
    setCola((q) => (g === 1 ? [...q.slice(1), q[0]] : q.slice(1)));
    if (g !== 1) setHechas((n) => n + 1);
    setResp('');
    setVuelta(false);
    setEditando(null);
  };

  const top = (
    <div className="tarj-top">
      <a className="btn-x" href="#/repaso" aria-label="Cerrar">×</a>
      <span className="tarj-segs" aria-hidden="true">
        {Array.from({ length: total }, (_, i) => <span key={i} className={i < hechas ? 'on' : ''} />)}
      </span>
      <span className="mono">{Math.min(hechas + (card ? 1 : 0), total)}/{total}</span>
    </div>
  );

  if (!card) {
    return (
      <main className="pantalla tarjetas">
        {top}
        <h1 className="titulo">{total ? 'Tarjetas de hoy, listas.' : 'No hay tarjetas para hoy.'}</h1>
        <p className="sub">{total ? `Repasaste ${total} ${total === 1 ? 'tarjeta' : 'tarjetas'}. El motor ya las reprogramó.` : 'Las que vencen aparecen acá. Podés crear tarjetas nuevas o importarlas.'}</p>
        <a className="btn-principal enlace" href="#/repaso">Volver al repaso</a>
        <a className="btn-borde enlace" href="#/tarjeta-nueva">Nueva tarjeta</a>
      </main>
    );
  }

  const srs = card.srs;
  const intervalo = srs && srs.last ? Math.max(1, Math.round((srs.due - srs.last) / DAY)) : 0;
  const sugerida = cmp?.suggested;

  return (
    <main className="pantalla tarjetas" style={{ ['--c' as string]: color }}>
      {top}
      <div className="segmentado" role="radiogroup" aria-label="Cómo respondés">
        {MODOS.map(([m, t]) => <button key={m} role="radio" aria-checked={modo === m} onClick={() => cambiarModo(m)}>{t}</button>)}
      </div>

      <article className="tarjeta">
        <div className="tarjeta-cab mono">
          <span>{front?.name ?? card.deck}{card.source ? ` · ${card.source.split(' · ')[0]}` : ''}</span>
          <span>{srs && srs.state !== 'new' ? `repaso ${srs.reps + 1}${intervalo ? ` · ${intervalo} ${intervalo === 1 ? 'día' : 'días'}` : ''}` : 'nueva'}</span>
        </div>
        <h1 className="tarjeta-frente">{card.front}</h1>

        {modo === 'escribir' && (
          <label className="tu-resp">
            <span className="sub">Tu respuesta, antes de ver</span>
            <textarea value={resp} onChange={(e) => setResp(e.target.value)} readOnly={vuelta} rows={2} autoFocus aria-label="Tu respuesta" />
          </label>
        )}
        {modo === 'decir' && !vuelta && <p className="sub">Decilo en voz alta, completo, antes de dar vuelta.</p>}
        {modo === 'pensar' && !vuelta && <p className="sub">Pensá la respuesta entera antes de dar vuelta.</p>}

        {vuelta && (
          <>
            <div className="sep mono"><span>respuesta</span></div>
            {editando != null ? (
              <div className="editar-dorso">
                <textarea className="campo-texto" value={editando} onChange={(e) => setEditando(e.target.value)} rows={3} aria-label="Editar respuesta" />
                <button className="btn-borde" onClick={() => { updateCard(card.id, { back: editando }); setEditando(null); }}>Guardar</button>
              </div>
            ) : (
              <p className="dorso">
                {cmp
                  ? cmp.tokens.map((t, i) => (t.missing ? <span key={i} className="trazo on" style={{ ['--c' as string]: 'var(--economia)' }}>{t.text}</span> : <span key={i}>{t.text}</span>))
                  : card.back}
              </p>
            )}
            <div className="tarjeta-pie">
              <span className="sub">{cmp ? (cmp.missing.length ? `Te faltó: ${cmp.missing.map((m) => `«${m}»`).join(', ')}` : 'No te faltó nada.') : 'Calificá cómo te salió.'}</span>
              {editando == null && <button className="subrayado" onClick={() => setEditando(card.back)}>Editar</button>}
            </div>
          </>
        )}
      </article>

      {!vuelta ? (
        <button className="btn-principal" onClick={() => setVuelta(true)}>Dar vuelta</button>
      ) : (
        <>
          <div className="calif" role="group" aria-label="Calificación">
            {BOTONES.map(([g, t, c], i) => (
              <button key={g} className={sugerida === g ? 'sugerida' : ''} onClick={() => calificar(g)}>
                <b style={{ color: c }}>{t}</b>
                <span className="mono" style={{ color: g === 1 || g === 4 ? c : undefined }}>{fmtInterval(opciones[i].due - now)}</span>
              </button>
            ))}
          </div>
          <p className="nota">{sugerida ? 'Si te faltó una parte clave, el motor sugiere Difícil.' : 'Otra vez vuelve en 10 minutos; las demás, según cuánto la recordás.'}</p>
        </>
      )}
    </main>
  );
}
