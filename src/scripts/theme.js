const KEY = 'mdev-theme';
const BAR = { dark: '#0d0d0d', light: '#f4f4f2' };
const LABEL = { dark: 'Switch to light theme', light: 'Switch to dark theme' };

export function currentTheme() {
  return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
}

function applyTheme(t) {
  document.documentElement.setAttribute('data-theme', t);
  try { localStorage.setItem(KEY, t); } catch { }
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', BAR[t]);
  document.querySelectorAll('[data-theme-toggle]').forEach((b) => {
    b.setAttribute('aria-label', LABEL[t]);
    b.title = LABEL[t];
  });
}

export function setTheme(t) {
  if (t !== 'dark' && t !== 'light') return;
  const go = () => applyTheme(t);
  if (document.startViewTransition && t !== currentTheme()) document.startViewTransition(go);
  else go();
}

export function initThemeSwitch() {
  applyTheme(currentTheme());
  document.querySelectorAll('[data-theme-toggle]').forEach((b) => {
    b.addEventListener('click', () => setTheme(currentTheme() === 'light' ? 'dark' : 'light'));
  });
}
