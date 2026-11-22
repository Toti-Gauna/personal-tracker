/**
 * Trazo 2.0 · tarjetas con active recall (#/tarjetas): respondés antes de dar vuelta. La tarjeta gira de verdad (una cara con la
 * pregunta y tu respuesta, la otra con la respuesta y lo que te faltó resaltado) y se califica con cuándo vuelve a aparecer.
 * Misma cola, mismo motor de repaso y mismas calificaciones que la 1.0.
 */
import { useMemo, useState } from 'react';
import { compareAnswer } from '../../data/compare';
import { AREAS } from '../../data/defaults';
import { DAY, fmtInterval, newSrs, preview, type Grade } from '../../data/fsrs';
import { cardFront, dailyReview } from '../../data/study';
import { getState, useStore } from '../../state/store';
import { gradeCard, updateCard } from '../../state/study';
import { colorV2 } from '../hoy/datos';
import { Boton, CampoTexto, Segmentado } from '../kit/controles';
import { Vacio } from '../kit/superficies';
import { Marco } from '../marco/Marco';
import { haptico, reducido } from '../movimiento/movimiento';
import type { PropsV2 } from '../registro';
import '../proyecto/proyecto.css';
import './estudio.css';

type Modo = 'escribir' | 'decir' | 'pensar';
const MODOS: [Modo, string][] = [['escribir', 'Escribir'], ['decir', 'Decir'], ['pensar', 'Pensar']];
const BOTONES: [Grade, string][] = [[1, 'Otra vez'], [2, 'Difícil'], [3, 'Bien'], [4, 'Fácil']];

const leerModo = (): Modo => {
  try { const m = localStorage.getItem('trazo.modoTarjetas'); if (m === 'escribir' || m === 'decir' || m === 'pensar') return m; } catch { /* sin storage */ }
  return 'escribir';
};

/** "libro:act" o "cap:act:n": repasa las tarjetas de ese libro o capítulo, venzan o no. */
export function parseFiltro(p?: string): { act: string; n?: number } | null {
  if (!p) return null;
  const [k, act, n] = p.split(':');
  if (k === 'libro' && act) return { act };
  if (k === 'cap' && act && n && Number.isFinite(Number(n))) return { act, n: Number(n) };
  return null;
}

const INFO = (
  <>
    <p className="t-cuerpo-l">Respondés antes de dar vuelta la tarjeta.</p>
    <p className="t-cuerpo">Escribir, decir en voz alta o pensar: lo que importa es sacar la respuesta de tu cabeza antes de verla.</p>
    <p className="t-cuerpo">Después elegís cómo te salió. Cada botón muestra cuándo vuelve la tarjeta: "Otra vez" en minutos, "Fácil" en semanas.</p>
  </>
);

export function TarjetasV2({ day, param }: { day: PropsV2['day']; param?: string }) {
  const study = useStore((s) => s.study);
  const filtro = parseFiltro(param);
  const frontId = filtro ? undefined : param || undefined;
  // La cola se arma al entrar; lo que sale "Otra vez" vuelve al final.
  const [cola, setCola] = useState<string[]>(() => {
    const st = getState().study;
    if (filtro) {
      const ahora = Date.now();
      const cs = st.cards.filter((c) => c.activityId === filtro.act && (filtro.n == null || c.unit === filtro.n));
      const vence = (c: (typeof cs)[number]) => !c.srs || c.srs.state === 'new' || c.srs.due <= ahora;
      return [...cs].sort((x, y) => Number(vence(y)) - Number(vence(x)) || (x.srs?.due ?? 0) - (y.srs?.due ?? 0)).map((c) => c.id);
    }
    return dailyReview(st, day.date).groups.filter((g) => !frontId || g.frontId === frontId).flatMap((g) => g.pending.map((c) => c.id));
  });
  const volver = filtro ? `#/estudio/mate/libro/${filtro.act}${filtro.n != null ? `/${filtro.n}` : ''}` : '#/repaso';
  const [total] = useState(cola.length);
  const [hechas, setHechas] = useState(0);
  const [modo, setModo] = useState<Modo>(leerModo);
  const [resp, setResp] = useState('');
  const [vuelta, setVuelta] = useState(false);
  const [editando, setEditando] = useState<string | null>(null);
  const card = study.cards.find((c) => c.id === cola[0]);
  // La hora se fija junto con la vista previa, así "1 día" no se lee como "1440 min".
  const { now, opciones } = useMemo(() => { const t = Date.now(); return { now: t, opciones: card ? preview(card.srs ?? newSrs(t), t, study.rules.retention) : [] }; }, [card, study.rules.retention]);
  const cmp = useMemo(() => (card && vuelta && modo === 'escribir' ? compareAnswer(resp, card.back) : null), [card, vuelta, modo, resp]);
  const front = card ? study.fronts.find((f) => f.id === cardFront(card, study.fronts)) : undefined;
  const area = front ? colorV2(AREAS[front.color].css) : 'var(--a-ing)';

  const cambiarModo = (m: Modo) => { setModo(m); try { localStorage.setItem('trazo.modoTarjetas', m); } catch { /* sin storage */ } };
  const calificar = (g: Grade) => {
    if (!card) return;
    gradeCard(day.date, card.id, g);
    haptico(g === 1 ? 'leve' : 'exito');
    setCola((q) => (g === 1 ? [...q.slice(1), q[0]] : q.slice(1)));
    if (g !== 1) setHechas((n) => n + 1);
    setResp(''); setVuelta(false); setEditando(null);
  };

  const segmentos = (
    <div className="es-progreso" aria-label={`${Math.min(hechas + (card ? 1 : 0), total)} de ${total} tarjetas`}>
      <span className="es-segs" aria-hidden="true">{Array.from({ length: Math.min(total, 40) }, (_, i) => <i key={i} className={i < hechas ? 'on' : undefined} />)}</span>
      <span className="t-dato">{Math.min(hechas + (card ? 1 : 0), total)}/{total}</span>
    </div>
  );

  if (!card) {
    return (
      <Marco className="es" titulo="Tarjetas" volver={{ href: volver, nombre: filtro ? 'Libro' : 'Repaso' }}>
        {segmentos}
        <Vacio ilustracion="repaso" titulo={total ? (filtro ? 'Las repasaste todas' : 'Tarjetas de hoy, listas') : filtro ? 'No hay tarjetas acá' : 'No hay tarjetas para hoy'}
          texto={total ? `Repasaste ${total} ${total === 1 ? 'tarjeta' : 'tarjetas'}. El motor ya las reprogramó.` : 'Se crean solas con el cold recall, la tesis y los errores de los tests.'}
          accion={<><Boton variante="primario" href={volver}>{filtro ? 'Volver' : 'Volver al repaso'}</Boton><Boton variante="secundario" icono="mas" href="#/tarjeta-nueva">Nueva tarjeta</Boton></>} />
      </Marco>
    );
  }

  const srs = card.srs;
  const intervalo = srs && srs.last ? Math.max(1, Math.round((srs.due - srs.last) / DAY)) : 0;
  const sugerida = cmp?.suggested;
  const cabeza = `${front?.name ?? card.deck}${card.source ? ` · ${card.source.split(' · ')[0]}` : ''}`;
  const estado = srs && srs.state !== 'new' ? `repaso ${srs.reps + 1}${intervalo ? ` · ${intervalo} ${intervalo === 1 ? 'día' : 'días'}` : ''}` : 'nueva';
  return (
    <Marco className="es" titulo="Tarjetas" info={INFO} volver={{ href: volver, nombre: filtro ? 'Libro' : 'Repaso' }}>
      {segmentos}
      <Segmentado etiqueta="Cómo respondés" opciones={MODOS} valor={modo} onCambio={cambiarModo} />

      <div key={card.id} className={`es-escena${vuelta ? ' vuelta' : ''}${reducido() ? ' plana' : ''}`} style={{ ['--area' as string]: area }}>
        <article className="es-carta">
          <div className="es-cara frente" aria-hidden={vuelta || undefined} inert={vuelta || undefined}>
            <div className="es-carta-cab t-rotulo"><span>{cabeza}</span><span>{estado}</span></div>
            <h2 className="es-pregunta">{card.front}</h2>
            {modo === 'escribir' && <CampoTexto etiqueta="Tu respuesta, antes de ver" valor={resp} onCambio={setResp} multilinea />}
            {modo === 'decir' && <p className="t-nota">Decilo en voz alta, completo, antes de dar vuelta.</p>}
            {modo === 'pensar' && <p className="t-nota">Pensá la respuesta entera antes de dar vuelta.</p>}
          </div>
          <div className="es-cara dorso" aria-hidden={!vuelta || undefined} inert={!vuelta || undefined}>
            <div className="es-carta-cab t-rotulo"><span>Respuesta</span><span>{estado}</span></div>
            <h2 className="es-pregunta chica">{card.front}</h2>
            {editando != null ? (
              <div className="es-editar">
                <CampoTexto etiqueta="Editar la respuesta" valor={editando} onCambio={setEditando} multilinea />
                <Boton variante="secundario" onClick={() => { updateCard(card.id, { back: editando }); setEditando(null); }}>Guardar</Boton>
              </div>
            ) : (
              <p className="es-respuesta t-cuerpo-l">
                {cmp ? cmp.tokens.map((t, i) => (t.missing ? <mark key={i}>{t.text}</mark> : <span key={i}>{t.text}</span>)) : card.back}
              </p>
            )}
            <div className="es-carta-pie">
              <span className="t-nota">{cmp ? (cmp.missing.length ? `Te faltó: ${cmp.missing.map((m) => `«${m}»`).join(', ')}` : 'No te faltó nada.') : 'Calificá cómo te salió.'}</span>
              {editando == null && <button type="button" className="pt-enlace" onClick={() => setEditando(card.back)}>Editar</button>}
            </div>
          </div>
        </article>
      </div>

      {!vuelta ? (
        <Boton variante="primario" icono="repaso" ancho onClick={() => { setVuelta(true); haptico('leve'); }}>Dar vuelta</Boton>
      ) : (
        <>
          <div className="es-calif" role="group" aria-label="Calificación">
            {BOTONES.map(([g, t], i) => (
              <button key={g} type="button" className={`g${g}${sugerida === g ? ' sugerida' : ''}`} onClick={() => calificar(g)}>
                <b>{t}</b>
                <span className="t-dato">{fmtInterval(opciones[i].due - now)}</span>
              </button>
            ))}
          </div>
          <p className="t-nota es-pie">{sugerida ? 'Si te faltó una parte clave, el motor sugiere Difícil.' : 'Otra vez vuelve en 10 minutos; las demás, según cuánto la recordás.'}</p>
        </>
      )}
    </Marco>
  );
}
