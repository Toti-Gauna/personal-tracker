/**
 * Trazo 2.0 · el foco que corre, fuera de la pantalla del foco: en el teléfono, una tarjeta que flota sobre la barra (volver y
 * pausar); en tablet y escritorio, al pie de la barra lateral (solo el tiempo en el riel, con nombre en la barra ancha).
 */
import { AREAS } from '../../data/defaults';
import { focusIndex, pause, resume, segProgress, segRemaining } from '../../data/focus';
import { fmtClock } from '../../data/time';
import { setFocus, useStore } from '../../state/store';
import { useNow } from '../../ui/useNow';
import { Icono } from '../iconos';
import { navegar } from '../movimiento/movimiento';

/** Lo que muestran las dos variantes: nombre, detalle, tiempo y avance del tramo. */
function useFocoVisible() {
  const focus = useStore((s) => s.focus);
  const block = useStore((s) => (s.focus ? s.days[s.focus.date]?.blocks.find((b) => b.key === s.focus!.key) : undefined));
  const now = useNow(1000);
  if (!focus || !block) return null;
  const { n, m } = focusIndex(focus);
  const seg = focus.segs[focus.i];
  const pausado = focus.pausedAt != null;
  return {
    focus,
    nombre: focus.tramos ? focus.tramos[focus.i].title : block.title.split(' · ')[0] + (seg.type === 'rest' ? ' · descanso' : ''),
    detalle: focus.tramos ? `Sesión de estudio · tramo ${focus.i + 1} de ${focus.tramos.length}` : `${focus.plan} · ${n} de ${m}`,
    restante: fmtClock(segRemaining(focus, now)),
    avance: segProgress(focus, now),
    area: AREAS[block.area].css,
    href: focus.tramos ? `#/sesion/${focus.activityId}` : '#/foco',
    pausado,
  };
}

/** La tarjeta del teléfono. En tablet y escritorio no se ve: el foco va en la barra lateral. */
export function MiniFoco() {
  const f = useFocoVisible();
  if (!f) return null;
  const { focus, pausado } = f;
  return (
    <div className={`mf capa-3${pausado ? ' en-pausa' : ''}`} style={{ ['--area' as string]: f.area }} data-v2-nav="">
      <button type="button" className="mf-ir" onClick={() => { void navegar(f.href); }} aria-label={`Volver al foco: ${f.nombre}, quedan ${f.restante}`}>
        <span className="mf-texto">
          <small className="t-rotulo mf-estado"><i aria-hidden="true" />{pausado ? 'En pausa' : 'En foco'}</small>
          <b className="mf-nombre">{f.nombre}</b>
          <small className="t-nota mf-detalle">{f.detalle}</small>
        </span>
        <span className="t-dato mf-tiempo" aria-hidden="true">{f.restante}</span>
      </button>
      <button type="button" className="mf-pausa" onClick={() => setFocus(pausado ? resume(focus, Date.now()) : pause(focus, Date.now()))} aria-label={pausado ? 'Seguir' : 'Pausar'}>
        <Icono nombre={pausado ? 'play' : 'pausa'} lado={22} />
      </button>
      <span className="mf-barra" aria-hidden="true"><span style={{ width: `${Math.round(f.avance * 100)}%` }} /></span>
    </div>
  );
}

/** El foco al pie de la barra lateral. */
export function FocoLateral() {
  const f = useFocoVisible();
  if (!f) return null;
  return (
    <a className="mf-lateral" href={f.href} style={{ ['--area' as string]: f.area }} aria-label={`Volver al foco: ${f.nombre}`}>
      <b>{f.nombre}</b>
      <span className="t-dato mf-lateral-tiempo">{f.restante}</span>
      <small className="t-nota">{f.detalle}{f.pausado ? ' · en pausa' : ''}</small>
      <i style={{ width: `${Math.round(f.avance * 100)}%` }} />
    </a>
  );
}
