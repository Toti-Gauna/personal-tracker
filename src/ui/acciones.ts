import { blockDone, fmtPct, mejoraDia, valorMeta } from '../data/mejora';
import { AREAS } from '../data/defaults';
import { getState, toggleTask } from '../state/store';
import { toast } from './avisos';
import { play } from './sound';

/** Marca una tarea y, si con eso se cumple la meta, avisa cuánto suma. */
export function marcarTarea(date: string, key: string, id: string) {
  const before = getState().days[date]?.blocks.find((b) => b.key === key);
  const wasDone = before ? blockDone(before) : false;
  toggleTask(date, key, id);
  const hecha = getState().days[date]?.blocks.find((x) => x.key === key)?.tasks.find((t) => t.id === id)?.done;
  const day = getState().days[date];
  const b = day?.blocks.find((x) => x.key === key);
  if (day && b && !wasDone && blockDone(b)) {
    toast({
      title: `Meta ${b.n} cumplida · +${fmtPct(valorMeta(day), 3)} %`,
      sub: `Hoy llevás +${fmtPct(mejoraDia(day))} % de mejora`,
      color: AREAS[b.area].css,
      evento: 'tarea',
    });
  } else if (hecha) play('tarea');
}
