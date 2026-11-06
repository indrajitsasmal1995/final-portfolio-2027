/* The theme switch and, on smaller screens, the sections menu: shared by every case study.

   The theme attribute is already on <html> before the first paint, set by the inline snippet
   in each page's head; this wires the switches to it and remembers the choice under the same
   key the homepage uses, so the two agree. Until someone chooses, the system's preference
   stands, and goes on standing if it changes mid-visit. */

/* Smaller screens (below 1240px, where the rail down the left is hidden): the corner the theme
   switch holds becomes a menu button. It opens the rail itself as a panel from the top (Go back,
   then the sections, with the one you are in marked by the rail's own script), and the theme
   switch moves into the foot of that panel. Built here so no page needs extra markup. */
(() => {
  const toc = document.querySelector('.toc');
  if (!toc) return;
  const root = document.documentElement;
  toc.id = toc.id || 'case-menu';
  toc.setAttribute('data-lenis-prevent', '');   // the open panel scrolls itself, not the page

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'case-menu-btn';
  btn.setAttribute('aria-controls', toc.id);
  btn.setAttribute('aria-expanded', 'false');
  btn.setAttribute('aria-label', 'Open sections menu');
  btn.innerHTML = '<span aria-hidden="true"></span><span aria-hidden="true"></span>';
  document.body.appendChild(btn);

  const theme = document.createElement('button');
  theme.type = 'button';
  theme.className = 'toc__theme';
  theme.setAttribute('data-theme-toggle', '');
  theme.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle class="t-sun" cx="12" cy="12" r="4.6"/>'
    + '<g class="t-rays" stroke-linecap="round"><path d="M12 2.4v2.4M12 19.2v2.4M2.4 12h2.4M19.2 12h2.4M5.2 5.2l1.7 1.7M17.1 17.1l1.7 1.7M18.8 5.2l-1.7 1.7M6.9 17.1l-1.7 1.7"/></g>'
    + '<path class="t-moon" d="M20.2 14.4A8.6 8.6 0 0 1 9.6 3.8a8.6 8.6 0 1 0 10.6 10.6Z"/></svg><span class="toc__theme-label"></span>';
  toc.appendChild(theme);

  const isOpen = () => root.classList.contains('case-menu-open');
  const set = open => {
    root.classList.toggle('case-menu-open', open);
    btn.setAttribute('aria-expanded', String(open));
    btn.setAttribute('aria-label', open ? 'Close sections menu' : 'Open sections menu');
    const lenis = window.__lenis;
    if (lenis) open ? lenis.stop() : lenis.start();   // the page holds still behind the panel
  };
  btn.addEventListener('click', () => set(!isOpen()));
  // a section link closes the panel first, then the page's own handler glides to the section
  toc.addEventListener('click', e => { if (isOpen() && e.target.closest('a')) set(false); });
  addEventListener('keydown', e => { if (e.key === 'Escape' && isOpen()) { set(false); btn.focus(); } });
  addEventListener('pointerdown', e => { if (isOpen() && !toc.contains(e.target) && !btn.contains(e.target)) set(false); });
  matchMedia('(min-width: 1240px)').addEventListener('change', e => { if (e.matches && isOpen()) set(false); });
})();

(() => {
  const root = document.documentElement;
  const btns = [...document.querySelectorAll('[data-theme-toggle]')];
  if (!btns.length) return;
  const paint = t => {
    root.setAttribute('data-theme', t);
    btns.forEach(b => {
      b.setAttribute('aria-pressed', String(t === 'light'));
      b.setAttribute('aria-label', t === 'light' ? 'Switch to dark mode' : 'Switch to light mode');
      const label = b.querySelector('.toc__theme-label');
      if (label) label.textContent = t === 'light' ? 'Dark mode' : 'Light mode';
    });
  };
  paint(root.getAttribute('data-theme') || 'dark');
  btns.forEach(b => b.addEventListener('click', () => {
    const next = root.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
    paint(next);
    try { localStorage.setItem('theme', next); } catch (e) {}
  }));
  matchMedia('(prefers-color-scheme: light)').addEventListener('change', e => {
    let chosen = null;
    try { chosen = localStorage.getItem('theme'); } catch (err) {}
    if (!chosen) paint(e.matches ? 'light' : 'dark');
  });
})();
