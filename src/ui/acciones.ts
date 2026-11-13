import { blockDone, fmtPct, mejoraDia, valorMeta } from '../data/mejora';
import { AREAS } from '../data/defaults';
import { getState, toggleTask } from '../state/store';
import { toast } from './avisos';
import { syncBlockRuta } from '../state/ruta';
import { BIMS, laneById, laneOfItem } from '../data/ruta';
import { ir } from '../lib/routes';
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
  // La meta con ruta mueve su carril.
  const r = syncBlockRuta(date, key);
  if (r && r.delta > 0) {
    const item = BIMS.flatMap((x) => x.items).find((i) => i.id === r.item);
    toast({
      title: r.closed ? `Hito cerrado · ${item?.title ?? 'piloto'}` : `Ruta: avanzó ${item ? laneById(laneOfItem(item)).name : 'Piloto'}`,
      sub: item ? item.title : 'Una llamada más para el piloto',
      color: item ? laneById(laneOfItem(item)).color : 'var(--economia)',
      action: { label: 'Ver ruta', run: () => ir('metas/ruta') },
    }, false);
  }
}
