/* Cursor follower, shared by the homepage and the case studies (styles in assets/cursor.css).
   Load it at the end of the body. It uses the page's .cursor element, or adds one. */
(() => {
  if (!matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  let cur = document.querySelector('.cursor');
  if (!cur) {
    cur = document.createElement('div');
    cur.className = 'cursor';
    cur.setAttribute('aria-hidden', 'true');
    cur.appendChild(document.createElement('span'));
    document.body.appendChild(cur);
  }
  const lab = cur.querySelector('span');
  document.documentElement.classList.add('has-cursor');
  let x = innerWidth / 2, y = innerHeight / 2, cx = x, cy = y;
  addEventListener('pointermove', e => { x = e.clientX; y = e.clientY; cur.classList.add('is-on'); });
  document.addEventListener('pointerleave', () => cur.classList.remove('is-on'));
  document.querySelectorAll('.hero-title').forEach(el => {
    el.addEventListener('pointerenter', () => cur.classList.add('is-big'));
    el.addEventListener('pointerleave', () => cur.classList.remove('is-big'));
  });
  // Project label: follow whatever card is under the pointer, including while the page
  // scrolls a new card underneath a still mouse. Landing on a different project blinks the disc.
  let card = null, queued = false;
  const blink = () => {
    // a quick squeeze, fully opaque. The cursor's transform carries its position, so the
    // disc's own size is animated (margins keep it centred) and the label scales inside it
    cur.animate([
      { width: '120px', height: '120px', margin: '-60px 0 0 -60px' },
      { width: '92px', height: '92px', margin: '-46px 0 0 -46px', offset: .4 },
      { width: '120px', height: '120px', margin: '-60px 0 0 -60px' }
    ], { duration: 260, easing: 'cubic-bezier(.3,.7,.2,1)' });
    lab.animate([{ scale: 1 }, { scale: .78, offset: .4 }, { scale: 1 }], { duration: 260, easing: 'cubic-bezier(.3,.7,.2,1)' });
  };
  const sync = () => {
    queued = false;
    const hit = document.elementFromPoint(x, y);
    const el = hit ? hit.closest('[data-cursor]') : null;
    const dlg = hit ? hit.closest('dialog[open]') : null;
    const onBtn = !!(hit && hit.closest('.pill, button, [role="button"]'));
    const zoom = !el && !dlg && !!(hit && hit.closest('.zoom'));   // an image that opens larger: a disc with a plus, so the click has a promise
    const zoomOut = !el && !!dlg && !onBtn;                        // inside an open image, where a click anywhere closes it: the same disc with a minus
    const btn = !el && !zoom && onBtn;                             // buttons: the dot steps aside, the button's own hover shows
    cur.classList.toggle('is-zoom', zoom);
    cur.classList.toggle('is-zoomout', zoomOut);
    cur.classList.toggle('is-btn', btn);
    cur.classList.toggle('is-link', !el && !btn && !zoom && !zoomOut && !!(hit && hit.closest('a[href], summary, label[for]')));
    if (el === card) return;
    if (el) {
      lab.innerHTML = el.dataset.cursor;
      if (card) blink();                 // moved from one project straight onto another
      cur.classList.add('is-label');
    } else {
      cur.classList.remove('is-label');
    }
    card = el;
  };
  const queue = () => { if (!queued) { queued = true; requestAnimationFrame(sync); } };
  addEventListener('pointermove', queue, { passive: true });
  addEventListener('scroll', queue, { passive: true });
  // An open image is a modal dialog, which the browser draws in its top layer, above any z-index.
  // The disc goes in with it while it is open, so it can follow there, and comes back out after.
  const home = () => {
    const host = document.querySelector('dialog[open]') || document.body;
    if (cur.parentNode !== host) host.appendChild(cur);
    queue();
  };
  document.querySelectorAll('dialog').forEach(d => {
    new MutationObserver(home).observe(d, { attributes: true, attributeFilter: ['open'] });
    d.addEventListener('close', home);
  });
  const loop = () => {
    cx += (x - cx) * 0.18; cy += (y - cy) * 0.18;
    cur.style.transform = `translate3d(${cx}px, ${cy}px, 0)`;
    requestAnimationFrame(loop);
  };
  loop();
})();
