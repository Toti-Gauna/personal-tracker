import { useEffect } from 'react';
import { AREAS } from '../data/defaults';
import { extend, tick } from '../data/focus';
import { blockDone, fmtPct, valorMeta } from '../data/mejora';
import { focusMinutes } from '../data/pomodoro';
import { fmtDur, nowMin, toHHMM } from '../data/time';
import { ir } from '../lib/routes';
import { carryPending, getState, logFocus, setFocus } from '../state/store';
import { showModal, toast } from './avisos';
import { avisoTramo, finSesion, onTramosEnded, sesionVencida } from './estudio-acciones';
import { abrirEstadoEstudio, hayQuePreguntar } from './EstadoEstudio';

/** Ola 28: más de esto pasado el fin de un tramo, la sesión se considera abandonada (no se cobra sola). */
export const VENCIDA_MS = 10 * 60000;

/** Corre el foco en segundo plano: avanza tramos, avisa y frena al terminar el bloque. */
export function useFocusRunner() {
  useEffect(() => {
    const run = () => {
      const s = getState();
      const f = s.focus;
      if (!f) return;
      const r = tick(f, Date.now());
      if (!r.ended.length) return;
      if (f.tramos) {
        // Ola 28: si el reloj siguió sin vos (más de 10 min pasado el fin de un tramo), no se da nada por hecho.
        const fin = r.finished ? r.state.segStart + r.state.segs[r.state.i].min * 60000 : r.state.segStart;
        if (Date.now() - fin > VENCIDA_MS) {
          setFocus(null);
          sesionVencida(f);
          return;
        }
        const idx = Array.from({ length: (r.finished ? f.segs.length : r.state.i) - f.i }, (_, k) => f.i + k);
        onTramosEnded(f, idx);
        if (r.finished) {
          setFocus(null);
          finSesion(f);
        } else {
          setFocus(r.state);
          avisoTramo(r.state, r.state.i);
        }
        return;
      }
      const day = s.days[f.date];
      const block = day?.blocks.find((b) => b.key === f.key);
      const color = block ? AREAS[block.area].css : undefined;

      if (!r.finished) {
        setFocus(r.state);
        const next = r.state.segs[r.state.i];
        const last = r.ended[r.ended.length - 1];
        toast({
          title: last.type === 'focus' ? 'Terminó el tramo de foco' : 'Terminó el descanso',
          sub: `Sigue: ${next.type === 'focus' ? 'foco' : 'descanso'} de ${fmtDur(next.min)}`,
          color,
          action: { label: 'Ver', run: () => ir('foco') },
          evento: last.type === 'focus' ? 'pomodoro' : 'descanso',
        });
        return;
      }

      setFocus(null);
      logFocus(f.date, { key: f.key, plan: f.plan, focusMin: focusMinutes(f.segs), at: toHHMM(nowMin()) });
      if (!block || !day) return;
      // Ola 28: al cerrar el bloque de matemática, en qué estado quedó el capítulo (no avanza solo).
      if (block.rama === 'matematica' && hayQuePreguntar(f.date)) {
        abrirEstadoEstudio(f.date);
        return;
      }
      const pending = block.tasks.filter((t) => !t.done);
      const nombre = block.title.split(' · ')[0];
      if (pending.length) {
        showModal({
          kicker: 'Fin del bloque',
          color,
          title: `Terminó ${nombre}.`,
          body: `${pending.length === 1 ? 'Quedó 1 tarea' : `Quedaron ${pending.length} tareas`}: ${pending.map((t) => t.t).join(', ')}. ¿${pending.length === 1 ? 'La pasás' : 'Las pasás'} a mañana o ${pending.length === 1 ? 'la hacés' : 'las hacés'} ahora?`,
          primary: { label: 'Pasar a mañana', run: () => { carryPending(f.date, f.key); ir('hoy'); } },
          secondary: { label: `${pending.length === 1 ? 'Hacerla' : 'Hacerlas'} ahora · 10 min`, run: () => { setFocus(extend(r.state, 10, Date.now())); ir('foco'); } },
        });
      } else {
        showModal({
          kicker: 'Fin del bloque',
          color,
          title: `Terminó ${nombre}.`,
          body: `${focusMinutes(f.segs)} min de foco.${blockDone(block) ? ` Meta ${block.n} cumplida: +${fmtPct(valorMeta(day), 3)} %.` : ''}`,
          primary: { label: 'Volver a Hoy', run: () => ir('hoy') },
          secondary: { label: 'Seguir 10 min más', run: () => { setFocus(extend(r.state, 10, Date.now())); ir('foco'); } },
        });
      }
    };
    run();
    const id = setInterval(run, 1000);
    document.addEventListener('visibilitychange', run);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', run);
    };
  }, []);
}
