import { useEffect } from 'react';
import { AREAS } from '../data/defaults';
import { extend, tick } from '../data/focus';
import { blockDone, fmtPct, valorMeta } from '../data/mejora';
import { focusMinutes } from '../data/pomodoro';
import { fmtDur, nowMin, toHHMM } from '../data/time';
import { ir } from '../lib/routes';
import { carryPending, getState, logFocus, setFocus } from '../state/store';
import { showModal, toast } from './avisos';

/** Corre el foco en segundo plano: avanza tramos, avisa y frena al terminar el bloque. */
export function useFocusRunner() {
  useEffect(() => {
    const run = () => {
      const s = getState();
      const f = s.focus;
      if (!f) return;
      const r = tick(f, Date.now());
      if (!r.ended.length) return;
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
        });
        return;
      }

      setFocus(null);
      logFocus(f.date, { key: f.key, plan: f.plan, focusMin: focusMinutes(f.segs), at: toHHMM(nowMin()) });
      if (!block || !day) return;
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
