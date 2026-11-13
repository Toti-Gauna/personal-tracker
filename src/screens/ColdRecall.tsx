import { useEffect, useMemo, useState } from 'react';
import { compareAnswer } from '../data/compare';
import { dailyReview } from '../data/study';
import { CONAMAT_PUNTOS } from '../data/study-catalog';
import type { StudyState } from '../data/study-types';
import type { DayLog } from '../data/types';
import { useStore } from '../state/store';
import { saveColdRecall } from '../state/study';
import { toast } from '../ui/avisos';
import { Casilla } from '../ui/Casilla';
import '../styles/estudio.css';
import '../styles/repaso.css';

/**
 * Contra qué se compara: los puntos clave del capítulo (los tuyos o los del libro). Es el
 * calentamiento del test del día 2, así que todavía no hay test ni tesis.
 * Sin capítulo (un libro sin unidades), tus puntos o tus tarjetas.
 */
function puntosDe(study: StudyState, actId: string, unit?: number) {
  const key = `${actId}:${unit}`;
  const capitulo = study.points[key]?.length ? study.points[key] : actId === 'conamat' && unit != null ? CONAMAT_PUNTOS[unit] ?? [] : [];
  if (capitulo.length) return { puntos: capitulo, fuente: 'el capítulo' };
  const cards = study.cards.filter((c) => c.activityId === actId && c.unit === unit);
  if (cards.length) return { puntos: cards.map((c) => `${c.front} :: ${c.back}`), fuente: 'tus tarjetas' };
  return { puntos: [] as string[], fuente: '' };
}

/** 3.2 Cold recall: el día 2, antes del test, escribís sin mirar lo de ayer y lo comparás con el capítulo. */
export function ColdRecall({ day, itemId }: { day: DayLog; itemId?: string }) {
  const study = useStore((s) => s.study);
  const item = study.reviews.find((r) => r.id === itemId && r.kind === 'cold');
  const pendientes = study.reviews.filter((r) => r.kind === 'cold' && (r.doneOn === day.date || (!r.doneOn && r.due <= day.date)));
  const [texto, setTexto] = useState('');
  const [fase, setFase] = useState<'escribir' | 'comparar'>('escribir');
  const [inicio] = useState(() => Date.now());
  const [ahora, setAhora] = useState(() => Date.now());
  useEffect(() => {
    if (fase !== 'escribir') return;
    const id = setInterval(() => setAhora(Date.now()), 1000);
    return () => clearInterval(id);
  }, [fase]);

  const base = useMemo(() => (item ? puntosDe(study, item.activityId, item.unit) : { puntos: [], fuente: '' }), [item, study]);
  const [puntos, setPuntos] = useState<string[]>(base.puntos);
  const [nuevos, setNuevos] = useState('');
  const [sumar, setSumar] = useState(false);
  const [marcas, setMarcas] = useState<boolean[]>([]);
  const grupoHoy = useMemo(() => dailyReview(study, day.date).groups.find((g) => g.pending.length > 0), [study, day.date]);
  const tarjetasHoy = !!grupoHoy;
  const enSesion = useStore((s) => !!s.focus?.tramos && s.focus.date === day.date);

  if (!item) {
    return <main className="pantalla"><a className="volver" href="#/repaso">Repaso</a><p>No encontré ese cold recall.</p></main>;
  }
  const titulo = item.label.replace(/^Cold recall · /, '');
  const seg = Math.floor((ahora - inicio) / 1000);
  const rules = study.rules;
  const ok = marcas.filter(Boolean).length;
  const pct = puntos.length ? ok / puntos.length : 0;
  const idx = pendientes.findIndex((r) => r.id === item.id);

  const comparar = () => {
    // Trazo marca solo lo que aparece en lo que escribiste; vos corregís.
    setMarcas(puntos.map((p) => {
      const [, back = p] = p.split('::');
      return compareAnswer(texto, p.includes('::') ? back : p).coverage >= 0.6;
    }));
    setFase('comparar');
  };
  const agregar = () => {
    const ps = nuevos.split('\n').map((l) => l.trim()).filter(Boolean);
    if (!ps.length) return;
    const all = [...puntos, ...ps];
    setPuntos(all);
    setMarcas(all.map((p, i) => marcas[i] ?? compareAnswer(texto, p.split('::').pop() ?? p).coverage >= 0.6));
    setNuevos('');
  };
  const guardar = () => {
    const s = saveColdRecall(day.date, item.id, puntos, marcas);
    toast({ title: `Cold recall · ${Math.round(s * 100)} %`, sub: s >= rules.coldSkipAt ? 'Lo tenés: no hace falta releer' : s < rules.rereadBelow ? 'Mañana: lo olvidado como tarjeta y una relectura corta' : 'Lo olvidado vuelve mañana como tarjeta', color: 'var(--economia)' }, false);
    if (enSesion) history.length > 1 ? history.back() : (location.hash = '#/estudio');
    else if (grupoHoy) location.hash = `#/tarjetas/${grupoHoy.frontId}`;
    else if (item.unit != null) location.hash = `#/test/${item.activityId}/${item.unit}`;
    else history.length > 1 ? history.back() : (location.hash = '#/estudio');
  };

  return (
    <main className="pantalla recall">
      <div className="tarj-top">
        <a className="btn-x" href="#/estudio" aria-label="Cerrar">×</a>
        <span className="tarj-prog"><span style={{ width: `${((idx + 1) / Math.max(1, pendientes.length)) * 100}%`, background: 'var(--economia)' }} /></span>
        <span className="mono">{idx + 1}/{pendientes.length}</span>
      </div>
      <div className="kicker" style={{ color: 'var(--economia)' }}>Cold recall · día 2 · antes del test</div>
      <h1 className="titulo">{titulo}</h1>
      <p className="sub">Escribí todo lo que recuerdes de ayer. No importa el orden ni que esté perfecto.</p>

      <textarea className="cuaderno" rows={7} value={texto} onChange={(e) => setTexto(e.target.value)} readOnly={fase === 'comparar'} aria-label="Lo que recordás" />
      <div className="fila-t sub"><span>{Math.floor(seg / 60)} min {seg % 60} s</span><span>dictar con el teclado también vale</span></div>

      {fase === 'escribir' ? (
        <button className="btn-principal" disabled={!texto.trim()} onClick={comparar}>Comparar</button>
      ) : (
        <>
          <div className="fila-t rep-t">
            <span className="etiqueta">Contra {base.fuente || 'tus puntos clave'}</span>
            {puntos.length > 0 && <span className="mono"><b>{ok} de {puntos.length} · {Math.round(pct * 100)} %</b></span>}
          </div>
          {puntos.length === 0 && <p className="sub">Todavía no hay puntos clave de este tema. Ahora sí abrí el libro y anotá los puntos clave, uno por línea; quedan guardados para los próximos repasos.</p>}
          <ul className="tareas puntos">
            {puntos.map((p, i) => {
              const [t, d] = p.split('::').map((x) => x.trim());
              return (
                <li key={i} className={marcas[i] ? '' : 'no'}>
                  <Casilla checked={!!marcas[i]} label={`${t}: ${marcas[i] ? 'lo recordaste' : 'no lo recordaste'}`} onChange={() => setMarcas((m) => puntos.map((_, j) => (j === i ? !m[j] : !!m[j])))} />
                  <span className="tarjeta-t"><b className={`trazo${marcas[i] ? ' on' : ''}`} style={{ ['--c' as string]: 'var(--economia)' }}>{t}</b>{d && <small>{d[0].toUpperCase() + d.slice(1)}</small>}</span>
                </li>
              );
            })}
          </ul>
          {puntos.length === 0 || sumar ? (
            <div className="agregar-puntos">
              <textarea className="campo-texto" rows={2} value={nuevos} onChange={(e) => setNuevos(e.target.value)} placeholder="Punto clave (o «tema :: detalle»)" aria-label="Agregar puntos clave" />
              <button className="btn-borde" onClick={agregar} disabled={!nuevos.trim()}>Agregar puntos</button>
            </div>
          ) : (
            <button className="sumar-punto" onClick={() => setSumar(true)}>+ Agregar un punto que falta</button>
          )}
          {puntos.length > 0 && (
            <div className="aviso-recall">
              {pct >= rules.coldSkipAt
                ? `Llegaste al ${Math.round(rules.coldSkipAt * 100)} %: no hace falta releer. Seguí con el test.`
                : pct < rules.rereadBelow
                  ? `Quedó debajo del ${Math.round(rules.rereadBelow * 100)} %: lo que olvidaste vuelve mañana como tarjeta y el motor te agenda releer esas partes del capítulo.`
                  : 'Lo que olvidaste vuelve mañana como tarjeta.'}
            </div>
          )}
          <button className="btn-principal" disabled={!puntos.length} onClick={guardar}>{tarjetasHoy ? 'Seguir con las tarjetas' : item.unit != null ? 'Seguir con el test' : 'Guardar y seguir'}</button>
        </>
      )}
    </main>
  );
}
