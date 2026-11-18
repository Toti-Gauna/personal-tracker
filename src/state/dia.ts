/** Ola 25 · Hoy editable: acciones sobre el día (solo ese día; la rutina no se toca). */
import { reprogramar, sumarMeta, type MetaNueva, type Modo, type Resultado } from '../data/editar-dia';
import { nowMin, toHHMM } from '../data/time';
import type { Block, Task } from '../data/types';
import { getState, updateDay } from './store';

function updateBlock(date: string, key: string, fn: (b: Block) => Block) {
  updateDay(date, (d) => ({ ...d, blocks: d.blocks.map((b) => (b.key === key ? fn(b) : b)) }));
}

/** Cambia el texto de una submeta. */
export function editarTarea(date: string, key: string, id: string, texto: string) {
  const t = texto.trim();
  if (!t) return;
  updateBlock(date, key, (b) => ({ ...b, tasks: b.tasks.map((x) => (x.id === id ? { ...x, t } : x)) }));
}

/** Borra una submeta (las agregadas y las de fábrica). Devuelve lo necesario para deshacer. */
export function borrarTarea(date: string, key: string, id: string): { tarea: Task; i: number } | null {
  const b = getState().days[date]?.blocks.find((x) => x.key === key);
  const i = b?.tasks.findIndex((x) => x.id === id) ?? -1;
  if (!b || i < 0) return null;
  const tarea = b.tasks[i];
  updateBlock(date, key, (x) => ({ ...x, tasks: x.tasks.filter((t) => t.id !== id) }));
  return { tarea, i };
}

/** Vuelve a poner una submeta borrada en su lugar. */
export function restaurarTarea(date: string, key: string, tarea: Task, i: number) {
  updateBlock(date, key, (b) => {
    if (b.tasks.some((t) => t.id === tarea.id)) return b;
    const tasks = [...b.tasks];
    tasks.splice(Math.min(i, tasks.length), 0, tarea);
    return { ...b, tasks };
  });
}

/** Da el bloque por hecho aunque queden submetas, con una nota opcional de en qué se usó. */
export function darPorHecho(date: string, key: string, nota?: string) {
  const n = nota?.trim();
  updateBlock(date, key, (b) => ({ ...b, salteado: undefined, hecho: { at: toHHMM(nowMin()), ...(n ? { nota: n } : {}) } }));
}

export function deshacerHecho(date: string, key: string) {
  updateBlock(date, key, (b) => { const { hecho: _h, ...resto } = b; return resto; });
}

/** Saltea (o deja de saltear) un bloque hoy: no cuenta en la mejora. */
export function saltear(date: string, key: string, si: boolean) {
  updateBlock(date, key, (b) => { const { salteado: _s, hecho: _h, ...resto } = b; return si ? { ...resto, salteado: true } : { ...resto, ...(b.hecho ? { hecho: b.hecho } : {}) }; });
}

function aplicar(date: string, r: Resultado): Resultado {
  if (r.ok) updateDay(date, (d) => ({ ...d, blocks: r.blocks }));
  return r;
}

/** Cambia el horario de un bloque solo por hoy y reacomoda los que siguen. */
export function cambiarHorario(date: string, key: string, start: string, min: number, modo: Modo): Resultado {
  const d = getState().days[date];
  if (!d) return { ok: false, error: 'No hay día.', exceso: 0 };
  return aplicar(date, reprogramar(d.blocks, key, start, min, modo));
}

/** Suma una meta para hoy y reacomoda los que siguen. */
export function agregarMetaHoy(date: string, m: MetaNueva, modo: Modo): Resultado {
  const d = getState().days[date];
  if (!d) return { ok: false, error: 'No hay día.', exceso: 0 };
  return aplicar(date, sumarMeta(d.blocks, m, modo));
}

/** Saca una meta que sumaste hoy (las de la rutina se saltean, no se borran). */
export function quitarMetaPropia(date: string, key: string) {
  updateDay(date, (d) => ({ ...d, blocks: d.blocks.filter((b) => !(b.key === key && b.propia)).map((b, i) => ({ ...b, n: i + 1 })) }));
}
