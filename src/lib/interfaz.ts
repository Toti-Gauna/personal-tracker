/**
 * UX 2.0 · qué interfaz se ve. La preferencia vive en `settings.interfaz` (sin valor: la 1.0) y la dirección
 * puede forzarla sin tocar los datos: `?ui=1` vuelve a la 1.0 (la salida de emergencia) y `?ui=2` prueba la 2.0.
 */
export type Interfaz = 'v1' | 'v2';

export const INTERFACES: [Interfaz, string][] = [['v1', '1.0 · actual'], ['v2', '2.0 · en construcción']];

/** La interfaz que pide la dirección (`?ui=1` o `?ui=2`), si pide alguna. */
export function forzadaPorUrl(search: string = typeof window === 'undefined' ? '' : window.location.search): Interfaz | null {
  const v = new URLSearchParams(search).get('ui');
  return v === '1' ? 'v1' : v === '2' ? 'v2' : null;
}

/** La que se ve: la de la dirección manda sobre la guardada. */
export function interfazActiva(guardada: Interfaz | undefined, search?: string): Interfaz {
  return forzadaPorUrl(search) ?? (guardada === 'v2' ? 'v2' : 'v1');
}
