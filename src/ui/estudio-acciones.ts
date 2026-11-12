import { AREAS } from '../data/defaults';
import { advance, lastLearnIndex, startFocus } from '../data/focus';
import { STEP_LABEL, sumMin } from '../data/study';
import type { Tramo } from '../data/study-types';
import { fmtDur } from '../data/time';
import type { FocusState } from '../data/types';
import { ir } from '../lib/routes';
import { getState, setFocus } from '../state/store';
import { logStudy, tramoDone } from '../state/study';
import { showModal, toast } from './avisos';

const colorOf = (activityId?: string) => {
  const st = getState().study;
  const a = st.activities.find((x) => x.id === activityId);
  const f = st.fronts.find((x) => x.id === a?.front);
  return f ? AREAS[f.color].css : 'var(--economia)';
};

export function startStudy(date: string, activityId: string, blockKey: string, tramos: Tramo[]) {
  const segs = tramos.map((t) => ({ type: t.kind === 'descanso' ? ('rest' as const) : ('focus' as const), min: t.min }));
  const f: FocusState = { ...startFocus(date, blockKey, 'Sesión de estudio', segs, Date.now()), tramos, activityId };
  setFocus(f);
  ir(`sesion/${activityId}`);
}

/** Efectos de los tramos que terminaron (por tiempo o con "Hecho"). */
export function onTramosEnded(f: FocusState, idx: number[], used?: number) {
  if (!f.tramos) return;
  const last = lastLearnIndex(f);
  for (const i of idx) {
    const t = f.tramos[i];
    if (!t) continue;
    if (t.kind !== 'descanso') logStudy(f.date, t.activityId, i === idx[idx.length - 1] && used != null ? used : t.min);
    tramoDone(f.date, t, i === last);
  }
}

export function avisoTramo(f: FocusState, next: number) {
  const t = f.tramos?.[next - 1];
  const n = f.tramos?.[next];
  if (!t || !n) return;
  toast({
    title: `Terminó: ${t.title}`,
    sub: `Sigue: ${n.title} · ${fmtDur(n.min)}`,
    color: colorOf(f.activityId === 'repaso' ? n.activityId : f.activityId),
    action: { label: 'Seguir', run: () => ir(`sesion/${f.activityId}`) },
    evento: t.kind === 'descanso' ? 'descanso' : 'pomodoro',
  });
}

/** Cerrar: el último paso de la sesión. */
export function finSesion(f: FocusState) {
  const tr = f.tramos ?? [];
  const rep = sumMin(tr.filter((t) => t.step === 'repasar'));
  const learn = tr.find((t) => t.kind === 'capitulo');
  const test = tr.find((t) => t.step === 'comprobar');
  const partes = [rep ? `Repasaste ${rep} min` : '', learn ? `avanzaste ${learn.title}` : ''].filter(Boolean);
  showModal({
    kicker: 'Fin de la sesión',
    color: colorOf(f.activityId === 'repaso' ? tr[0]?.activityId : f.activityId),
    title: 'Estudio de hoy, listo.',
    body: `${partes.join(' y ') || 'Sesión cerrada'}.${test ? ` ${STEP_LABEL.comprobar}: cargá el resultado del test si no lo hiciste.` : ''}`,
    primary: { label: 'Volver a Hoy', run: () => ir('hoy') },
    secondary: test
      ? { label: 'Registrar el test', run: () => ir(`test/${test.ref.split(':')[1]}/${test.ref.split(':')[2]}`) }
      : { label: 'Ver Estudio', run: () => ir('estudio') },
  });
}

/** "Hecho" en la sesión: termina el tramo actual ya. */
export function tramoHecho(f: FocusState) {
  const r = advance(f, Date.now());
  onTramosEnded(r.state, [f.i], r.usedMin);
  if (r.finished) {
    setFocus(null);
    finSesion(r.state);
  } else setFocus(r.state);
}
