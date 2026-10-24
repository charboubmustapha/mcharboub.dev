const KEY = 'mdev-theme';
const BAR = { dark: '#0d0d0d', light: '#f4f4f2' };

export function currentTheme() {
  return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
}

export function applyTheme(t) {
  document.documentElement.setAttribute('data-theme', t);
  try { localStorage.setItem(KEY, t); } catch { }
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', BAR[t]);
  document.querySelectorAll('.theme button[data-theme-pick]').forEach((b) => {
    b.setAttribute('aria-pressed', String(b.dataset.themePick === t));
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
  document.querySelectorAll('.theme button[data-theme-pick]').forEach((b) => {
    b.addEventListener('click', () => setTheme(b.dataset.themePick));
  });
}
