export type ThemePref = 'dark' | 'light' | 'system';
export type Theme = 'dark' | 'light';

const KEY = 'trazo.theme';
const THEME_COLOR: Record<Theme, string> = { dark: '#0E0F10', light: '#F2F3EF' };

export function getThemePref(): ThemePref {
  try {
    const t = localStorage.getItem(KEY);
    if (t === 'light' || t === 'dark' || t === 'system') return t;
  } catch { /* sin storage */ }
  return 'dark';
}

/** El tema que se ve: "sistema" sigue al del teléfono. */
export function resolveTheme(p: ThemePref): Theme {
  if (p !== 'system') return p;
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

export const getTheme = (): Theme => resolveTheme(getThemePref());

let unlisten: (() => void) | null = null;

export function applyTheme(p: ThemePref) {
  const t = resolveTheme(p);
  document.documentElement.dataset.theme = t;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLOR[t]);
  try { localStorage.setItem(KEY, p); } catch { /* sin storage */ }
  unlisten?.();
  unlisten = null;
  if (p === 'system' && window.matchMedia) {
    const mq = window.matchMedia('(prefers-color-scheme: light)');
    const on = () => applyTheme('system');
    mq.addEventListener?.('change', on);
    unlisten = () => mq.removeEventListener?.('change', on);
  }
}
