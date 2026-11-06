/* The theme switch, shared by every case study.

   The attribute is already on <html> before the first paint, set by the inline
   snippet in each page's head; this only wires the button to it and remembers
   the choice under the same key the homepage uses, so the two agree. Until
   someone chooses, the system's preference stands, and goes on standing if it
   changes mid-visit. */
(() => {
  const root = document.documentElement;
  const btn = document.querySelector('[data-theme-toggle]');
  if (!btn) return;
  const paint = t => {
    root.setAttribute('data-theme', t);
    btn.setAttribute('aria-pressed', String(t === 'light'));
    btn.setAttribute('aria-label', t === 'light' ? 'Switch to dark mode' : 'Switch to light mode');
  };
  paint(root.getAttribute('data-theme') || 'dark');
  btn.addEventListener('click', () => {
    const next = root.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
    paint(next);
    try { localStorage.setItem('theme', next); } catch (e) {}
  });
  matchMedia('(prefers-color-scheme: light)').addEventListener('change', e => {
    let chosen = null;
    try { chosen = localStorage.getItem('theme'); } catch (err) {}
    if (!chosen) paint(e.matches ? 'light' : 'dark');
  });
})();
