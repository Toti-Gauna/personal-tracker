export type Theme = 'dark' | 'light';

const KEY = 'trazo.theme';
const THEME_COLOR: Record<Theme, string> = { dark: '#0E0F10', light: '#F2F3EF' };

export function getTheme(): Theme {
  try {
    const t = localStorage.getItem(KEY);
    if (t === 'light' || t === 'dark') return t;
  } catch { /* sin storage */ }
  return 'dark';
}

export function applyTheme(t: Theme) {
  document.documentElement.dataset.theme = t;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLOR[t]);
  try { localStorage.setItem(KEY, t); } catch { /* sin storage */ }
}
