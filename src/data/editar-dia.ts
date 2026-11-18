/**
 * Ola 25 · Hoy editable: cambiar el horario de un bloque solo por hoy, sumar una meta nueva y
 * reacomodar los que siguen. Puro: recibe los bloques del día y devuelve los nuevos (o un error).
 * Dormir (el bloque `sueno`) no se mueve nunca: es el límite.
 */
import { newId } from './schedule';
import { toHHMM, toMin } from './time';
import type { Area, Block, RamaOMain } from './types';

/** Correr: los que siguen empiezan después (si hace falta). Acortar: los que siguen se achican para terminar donde terminaban. */
export type Modo = 'correr' | 'acortar';

/** Mínimo de un bloque al acortar. */
export const MIN_BLOQUE = 15;

export type Resultado = { ok: true; blocks: Block[] } | { ok: false; error: string; exceso: number };

const fin = (b: Pick<Block, 'start' | 'min'>) => toMin(b.start) + b.min;
const esSueno = (b: Block) => b.key === 'sueno';

/** Ordena por hora (dormir siempre al final) y numera de nuevo. */
function ordenar(blocks: Block[]): Block[] {
  return [...blocks].sort((a, b) => (esSueno(a) ? 1 : esSueno(b) ? -1 : toMin(a.start) - toMin(b.start))).map((b, i) => ({ ...b, n: i + 1 }));
}

/**
 * Pone un bloque en `start` con `min` minutos y reacomoda los que vienen después (hasta dormir).
 * - correr: cada uno arranca cuando termina el anterior si se pisan; si pasan de dormir, error.
 * - acortar: los que siguen se achican (parejo, de a 5 min, mínimo 15) para terminar a la hora en que
 *   terminaban antes del cambio; si ni así entran, error.
 */
export function reprogramar(blocks: Block[], key: string, start: string, min: number, modo: Modo): Resultado {
  const editado = blocks.find((b) => b.key === key);
  if (!editado) return { ok: false, error: 'No existe ese bloque.', exceso: 0 };
  const sueno = blocks.find(esSueno);
  if (esSueno(editado)) return { ok: false, error: `Dormir a las ${sueno?.start ?? '21:00'} no se mueve.`, exceso: 0 };
  const limite = sueno ? toMin(sueno.start) : 24 * 60;
  const nuevo = { ...editado, start, min, editado: true as const };
  const ini = toMin(start);
  if (ini + min > limite) return { ok: false, error: `Termina después de dormir (${toHHMM(limite)}).`, exceso: ini + min - limite };
  // Los que siguen: los que empiezan desde la hora nueva, sin dormir.
  const siguen = blocks.filter((b) => b.key !== key && !esSueno(b) && toMin(b.start) >= ini).sort((a, b) => toMin(a.start) - toMin(b.start));
  // El que estaba en curso a esa hora se corta ahí (lo interrumpe lo nuevo), si le quedan al menos 15 min.
  const pisado = blocks.find((b) => b.key !== key && !esSueno(b) && toMin(b.start) < ini && fin(b) > ini);
  if (pisado && ini - toMin(pisado.start) < MIN_BLOQUE) return { ok: false, error: `${pisado.title} quedaría con menos de ${MIN_BLOQUE} min: empezá después de las ${toHHMM(toMin(pisado.start) + MIN_BLOQUE)}.`, exceso: 0 };
  const resto = blocks.filter((b) => b.key !== key && !siguen.includes(b)).map((b) => (b === pisado ? { ...b, min: ini - toMin(b.start), editado: true as const } : b));
  const finOriginal = Math.max(fin(nuevo), ...siguen.map(fin), ...blocks.filter((b) => b.key === key).map(fin));
  let durs = siguen.map((b) => b.min);
  if (modo === 'acortar') {
    const disponible = finOriginal - fin(nuevo);
    const total = durs.reduce((s, d) => s + d, 0);
    // Gaps entre bloques: se respetan si entra todo; si no, se cierran y se achica.
    const conGaps = encadenar(siguen, durs, fin(nuevo));
    if (conGaps > finOriginal && total > 0) {
      const minimo = siguen.length * MIN_BLOQUE;
      if (minimo > disponible) return { ok: false, error: `No entran: los ${siguen.length} que siguen necesitan al menos ${minimo} min y quedan ${Math.max(0, disponible)}. Salteá alguno o corré en vez de acortar.`, exceso: minimo - disponible };
      const factor = disponible / total;
      durs = durs.map((d) => Math.max(MIN_BLOQUE, Math.floor((d * factor) / 5) * 5));
      // Ajuste fino: si sobra, se lo lleva el más largo; si falta, se le saca al más largo posible.
      let dif = disponible - durs.reduce((s, d) => s + d, 0);
      while (dif !== 0) {
        const i = dif > 0 ? durs.indexOf(Math.max(...durs)) : durs.findIndex((d) => d === Math.max(...durs.filter((x) => x > MIN_BLOQUE)));
        if (i < 0) break;
        const paso = dif > 0 ? dif : -Math.min(-dif, durs[i] - MIN_BLOQUE);
        durs[i] += paso;
        dif -= paso;
      }
      // Encadenados sin huecos desde el final del editado.
      let cursor = fin(nuevo);
      const movidos = siguen.map((b, i) => { const x = { ...b, start: toHHMM(cursor), min: durs[i] }; cursor += durs[i]; return x; });
      return { ok: true, blocks: ordenar([...resto, nuevo, ...movidos]) };
    }
  }
  let cursor = fin(nuevo);
  const movidos = siguen.map((b, i) => {
    const s = Math.max(toMin(b.start), cursor);
    cursor = s + durs[i];
    return s === toMin(b.start) && durs[i] === b.min ? b : { ...b, start: toHHMM(s), min: durs[i] };
  });
  if (cursor > limite) return { ok: false, error: `Los que siguen pasan de dormir (${toHHMM(limite)}) por ${cursor - limite} min: acortalos o salteá alguno (sin margen, lo primero que se recorta es el último bloque de programación).`, exceso: cursor - limite };
  return { ok: true, blocks: ordenar([...resto, nuevo, ...movidos]) };
}

/** Dónde termina la cadena si cada uno arranca en su hora o cuando termina el anterior. */
function encadenar(bs: Block[], durs: number[], desde: number) {
  let c = desde;
  bs.forEach((b, i) => { c = Math.max(toMin(b.start), c) + durs[i]; });
  return c;
}

/** El área (color) de una meta nueva según su rama. */
const AREA_DE: Record<RamaOMain | 'fuera', Area> = { programacion: 'ing', matematica: 'economia', trabajo: 'rutina', ingles: 'ing', handyx: 'handyx', salud: 'salud', main: 'rutina', fuera: 'economia' };

export interface MetaNueva { titulo: string; rama?: RamaOMain; start: string; min: number; tareas: string[] }

/** Suma una meta nueva al día en su hora y reacomoda los que siguen. */
export function sumarMeta(blocks: Block[], m: MetaNueva, modo: Modo): Resultado {
  const titulo = m.titulo.trim();
  if (!titulo) return { ok: false, error: 'Falta el título.', exceso: 0 };
  const b: Block = {
    key: `extra-${newId()}`, n: 0, title: titulo, short: titulo.toLowerCase(), area: AREA_DE[m.rama ?? 'fuera'], kind: 'pomodoro',
    start: m.start, min: m.min, fixed: false, focus: true, ...(m.rama ? { rama: m.rama } : {}),
    tasks: m.tareas.map((t) => t.trim()).filter(Boolean).map((t) => ({ id: newId(), t, done: false })), propia: true,
  };
  // Se suma con duración 0 y después se "edita" a su duración real: así los que siguen se reacomodan igual.
  return reprogramar([...blocks, { ...b, min: 0 }], b.key, m.start, m.min, modo);
}
