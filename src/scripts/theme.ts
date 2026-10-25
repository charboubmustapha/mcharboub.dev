import {PALETTE, THEME_KEY, TOGGLE_LABEL, type Theme} from '../lib/theme';

export function currentTheme(): Theme {
  return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
}

function toggles(): NodeListOf<HTMLElement> {
  return document.querySelectorAll<HTMLElement>('[data-theme-toggle]');
}

function applyTheme(t: Theme) {
  document.documentElement.setAttribute('data-theme', t);
  try { localStorage.setItem(THEME_KEY, t); } catch { }
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', PALETTE[t].bg);
  toggles().forEach((b) => {
    b.setAttribute('aria-label', TOGGLE_LABEL[t]);
    b.title = TOGGLE_LABEL[t];
  });
}

export function setTheme(t: string) {
  if (t !== 'dark' && t !== 'light') return;
  const go = () => applyTheme(t);
  if (document.startViewTransition && t !== currentTheme()) document.startViewTransition(go);
  else go();
}

export function initThemeSwitch() {
  applyTheme(currentTheme());
  toggles().forEach((b) => {
    b.addEventListener('click', () => setTheme(currentTheme() === 'light' ? 'dark' : 'light'));
  });
}
