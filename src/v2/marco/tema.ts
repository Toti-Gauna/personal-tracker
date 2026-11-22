/**
 * Trazo 2.0 · el tema sigue al teléfono mientras no elijas uno. La 2.0 guarda su preferencia aparte (`trazo.theme.v2`):
 * la 1.0 siempre graba "oscuro" al abrir, así que su clave no distingue "elegí oscuro" de "nunca elegí". Si en la 1.0
 * habías elegido Claro o Sistema, la 2.0 arranca con eso. Al volver a la 1.0, vuelve el tema de la 1.0, intacto.
 */
import { useEffect } from 'react';
import { applyTheme, getThemePref, type ThemePref } from '../../lib/theme';

const CLAVE = 'trazo.theme.v2';
const COLOR = { dark: '#0c0d0e', light: '#f3f2ec' } as const;

/** La preferencia de la 2.0: la suya, o la de la 1.0 si era una elección de verdad, o "Sistema". */
export function temaV2(): ThemePref {
  try {
    const t = localStorage.getItem(CLAVE);
    if (t === 'dark' || t === 'light' || t === 'system') return t;
  } catch { /* sin storage */ }
  const v1 = getThemePref();
  return v1 === 'light' || v1 === 'system' ? v1 : 'system';
}

const claro = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-color-scheme: light)').matches;

function pintar(p: ThemePref) {
  const t = p === 'system' ? (claro() ? 'light' : 'dark') : p;
  document.documentElement.dataset.theme = t;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', COLOR[t]);
}

/** Elegir tema en la 2.0: se guarda en su clave y se ve en el acto. */
export function aplicarTemaV2(p: ThemePref) {
  try { localStorage.setItem(CLAVE, p); } catch { /* sin storage */ }
  pintar(p);
}

export function useTemaV2() {
  useEffect(() => {
    pintar(temaV2());
    const mq = window.matchMedia?.('(prefers-color-scheme: light)');
    const cambio = () => { if (temaV2() === 'system') pintar('system'); };
    mq?.addEventListener?.('change', cambio);
    return () => {
      mq?.removeEventListener?.('change', cambio);
      applyTheme(getThemePref()); // de vuelta en la 1.0: su tema
    };
  }, []);
}
