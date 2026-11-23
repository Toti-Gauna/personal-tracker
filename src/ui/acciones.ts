import { blockDone, fmtPct, mejoraDia, valorMeta } from '../data/mejora';
import { AREAS } from '../data/defaults';
import { getState, toggleTask } from '../state/store';
import { toast } from './avisos';
import { syncBlockRuta } from '../state/ruta';
import { BIMS, laneById, laneOfItem } from '../data/ruta';
import { ir } from '../lib/routes';
import { play } from './sound';
import { abrirCorrida } from './checkins';
import { abrirEstadoEstudio } from './estado-estudio';
import { hayQuePreguntar } from './estudio-acciones';
import type { Block } from '../data/types';

/** Ola 28: al cerrar la meta de matemática, en qué estado quedó el capítulo (no avanza solo). */
export function preguntarSiEsMate(date: string, b: Pick<Block, 'rama'>) {
  if (b.rama === 'matematica' && hayQuePreguntar(date)) abrirEstadoEstudio(date);
}

/** Marca una tarea y, si con eso se cumple la meta, avisa cuánto suma. */
export function marcarTarea(date: string, key: string, id: string) {
  const before = getState().days[date]?.blocks.find((b) => b.key === key);
  const wasDone = before ? blockDone(before) : false;
  toggleTask(date, key, id);
  const tarea = getState().days[date]?.blocks.find((x) => x.key === key)?.tasks.find((t) => t.id === id);
  const hecha = tarea?.done;
  // Ola 13: al tildar "Correr" pregunta cuánto corriste (si todavía no cargaste la de hoy).
  if (hecha && tarea && /\bcorrer\b/i.test(tarea.t) && !getState().train.runs.some((r) => r.date === date)) abrirCorrida(date);
  const day = getState().days[date];
  const b = day?.blocks.find((x) => x.key === key);
  if (day && b && !wasDone && blockDone(b)) {
    toast({
      title: `Meta ${b.n} cumplida · +${fmtPct(valorMeta(day), 3)} %`,
      sub: `Hoy llevás +${fmtPct(mejoraDia(day))} % de mejora`,
      color: AREAS[b.area].css,
      evento: 'tarea',
    });
    preguntarSiEsMate(date, b);
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
