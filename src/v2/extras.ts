/**
 * Trazo 2.0 · todas las entradas que se suman a las de `registro.ts` (tanda 3.3). Una pantalla puede tener varias: la principal y,
 * si esa no cubre la ruta, la primera de estas que sí. Cada familia declara las suyas en su propio `entradas.ts`.
 */
import type { Pantalla } from '../lib/routes';
import type { EntradaV2 } from './registro';
import { ENTRADAS as ajustes } from './ajustes/entradas';
import { ENTRADAS as clipping } from './clipping/entradas';
import { ENTRADAS as metas } from './metas/entradas';
import { ENTRADAS as programa } from './programa/entradas';
import { ENTRADAS as sesiones } from './sesiones/entradas';
import { ENTRADAS as temas } from './temas/entradas';
import { ENTRADAS as trabajo } from './trabajo/entradas';

export type ExtrasV2 = Partial<Record<Pantalla, EntradaV2[]>>;

function reunir(...familias: { pantalla: Pantalla; entrada: EntradaV2 }[][]): ExtrasV2 {
  const out: ExtrasV2 = {};
  for (const f of familias) for (const { pantalla, entrada } of f) (out[pantalla] ??= []).push(entrada);
  return out;
}

export const EXTRAS_V2: ExtrasV2 = reunir(ajustes, sesiones, programa, temas, metas, trabajo, clipping);
