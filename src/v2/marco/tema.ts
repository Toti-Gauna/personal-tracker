/**
 * Trazo · el tema sigue al teléfono mientras no elijas uno. La preferencia vive en `trazo.theme.v2`. Quien venía de la 1.0 con
 * Claro o Sistema elegidos (`trazo.theme`) arranca con eso; "Oscuro" ahí no cuenta, porque la 1.0 lo grababa siempre al abrir.
 * index.html repite esta lectura antes de cargar nada, para que el primer cuadro ya tenga el tema bien.
 */
import { useEffect } from 'react';

export type ThemePref = 'dark' | 'light' | 'system';

const CLAVE = 'trazo.theme.v2';
const CLAVE_VIEJA = 'trazo.theme';
const COLOR = { dark: '#0c0d0e', light: '#f3f2ec' } as const;

/** La preferencia: la guardada, o la de la 1.0 si era una elección de verdad, o "Sistema". */
export function temaV2(): ThemePref {
  try {
    const t = localStorage.getItem(CLAVE);
    if (t === 'dark' || t === 'light' || t === 'system') return t;
    const v1 = localStorage.getItem(CLAVE_VIEJA);
    if (v1 === 'light' || v1 === 'system') return v1;
  } catch { /* sin storage */ }
  return 'system';
}

const claro = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-color-scheme: light)').matches;

/** Pinta el tema (el atributo de html y el color de la barra del navegador). */
export function pintarTema(p: ThemePref) {
  const t = p === 'system' ? (claro() ? 'light' : 'dark') : p;
  document.documentElement.dataset.theme = t;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', COLOR[t]);
}

/** Elegir tema: se guarda y se ve en el acto. */
export function aplicarTemaV2(p: ThemePref) {
  try { localStorage.setItem(CLAVE, p); } catch { /* sin storage */ }
  pintarTema(p);
}

/** Con "Sistema", sigue al teléfono si cambia mientras la app está abierta. */
export function useTemaV2() {
  useEffect(() => {
    pintarTema(temaV2());
    const mq = window.matchMedia?.('(prefers-color-scheme: light)');
    const cambio = () => { if (temaV2() === 'system') pintarTema('system'); };
    mq?.addEventListener?.('change', cambio);
    return () => mq?.removeEventListener?.('change', cambio);
  }, []);
}
