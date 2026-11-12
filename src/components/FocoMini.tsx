import { AREAS } from '../data/defaults';
import { focusIndex, pause, resume, segProgress, segRemaining } from '../data/focus';
import { fmtClock } from '../data/time';
import { ir } from '../lib/routes';
import { setFocus, useStore } from '../state/store';
import { useNow } from '../ui/useNow';
import { MiniPlayer } from './MiniPlayer';

/** Conecta el mini reproductor con el foco que está corriendo. */
export function FocoMini() {
  const focus = useStore((s) => s.focus);
  const block = useStore((s) => (s.focus ? s.days[s.focus.date]?.blocks.find((b) => b.key === s.focus!.key) : undefined));
  const now = useNow(1000);
  if (!focus || !block) return null;
  const { n, m } = focusIndex(focus);
  const seg = focus.segs[focus.i];
  const pausado = focus.pausedAt != null;
  return (
    <MiniPlayer
      foco={{
        bloque: focus.tramos ? focus.tramos[focus.i].title : block.title.split(' · ')[0] + (seg.type === 'rest' ? ' · descanso' : ''),
        detalle: focus.tramos ? `Sesión de estudio · tramo ${focus.i + 1} de ${focus.tramos.length}` : `${focus.plan} · ${n} de ${m}`,
        restante: fmtClock(segRemaining(focus, now)),
        avance: segProgress(focus, now),
        color: AREAS[block.area].css,
        pausado,
      }}
      onVolver={() => ir(focus.tramos ? `sesion/${focus.activityId}` : 'foco')}
      onPausar={() => setFocus(pausado ? resume(focus, Date.now()) : pause(focus, Date.now()))}
    />
  );
}
