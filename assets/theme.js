/* Shared by every case study: the sections menu on smaller screens, and the theme.

   The theme attribute is already on <html> before the first paint, set by the inline snippet
   in each page's head from the choice made on the homepage (same storage key) or, failing
   that, the system's preference. The case studies have no switch of their own; until someone
   chooses on the homepage, a change in the system's preference mid-visit is followed here. */

/* Smaller screens (below 1240px, where the rail down the left is hidden): a menu button in the
   top right corner opens the rail itself as a panel from the top (Go back, then the sections,
   with the one you are in marked by the rail's own script). Built here so no page needs extra
   markup. */
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
  matchMedia('(prefers-color-scheme: light)').addEventListener('change', e => {
    let chosen = null;
    try { chosen = localStorage.getItem('theme'); } catch (err) {}
    if (!chosen) document.documentElement.setAttribute('data-theme', e.matches ? 'light' : 'dark');
  });
})();
