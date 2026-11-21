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
  // Start where the pointer really is. The page before saves the last position (the window and so
  // the screen coordinates are the same), so coming back from a case study the cursor appears under
  // the mouse instead of in the middle of the screen. With no saved position it stays hidden, and
  // shows no state, until the mouse first moves.
  let x = innerWidth / 2, y = innerHeight / 2, seen = false;
  try {
    const p = JSON.parse(sessionStorage.getItem('cursorAt') || 'null');
    if (p && Date.now() - p.t < 60000 && p.x >= 0 && p.y >= 0 && p.x <= innerWidth && p.y <= innerHeight) {
      x = p.x; y = p.y; seen = true; cur.classList.add('is-on');
    }
  } catch (e) {}
  let cx = x, cy = y;
  const save = () => { if (seen) try { sessionStorage.setItem('cursorAt', JSON.stringify({ x, y, t: Date.now() })); } catch (e) {} };
  addEventListener('pagehide', save);
  addEventListener('pointerdown', save, true);   // a click that navigates may not reach pagehide in time
  addEventListener('pointermove', e => { x = e.clientX; y = e.clientY; seen = true; cur.classList.add('is-on'); });
  document.addEventListener('pointerleave', () => cur.classList.remove('is-on'));
  // Project label: follow whatever card is under the pointer, including while the page
  // scrolls a new card underneath a still mouse. Landing on a different project blinks the disc.
  let card = null, queued = false;
  const blink = () => {
    // a quick squeeze of the bubble, from its tail at the pointer (the scale property, so the
    // transform that carries the cursor's position is left alone)
    cur.animate([{ scale: 1 }, { scale: .86, offset: .4 }, { scale: 1 }], { duration: 260, easing: 'cubic-bezier(.3,.7,.2,1)' });
  };
  const sync = () => {
    queued = false;
    if (!seen) return;
    const hit = document.elementFromPoint(x, y);
    const el = hit ? hit.closest('[data-cursor]') : null;
    const dlg = hit ? hit.closest('dialog[open]') : null;
    const onBtn = !!(hit && hit.closest('.pill, button, [role="button"]'));
    const zoom = !el && !dlg && !!(hit && hit.closest('.zoom'));   // an image that opens larger: a disc with a plus, so the click has a promise
    const zoomOut = !el && !!dlg && !onBtn;                        // inside an open image, where a click anywhere closes it: the same disc with a minus
    const btn = !el && !zoom && onBtn;                             // buttons: the dot steps aside, the button's own hover shows
    cur.classList.toggle('is-hidden', !!(hit && hit.closest('[data-cursor-hide]')));   // e.g. the hero's 3D head, which reacts on its own
    cur.classList.toggle('is-zoom', zoom);
    cur.classList.toggle('is-zoomout', zoomOut);
    cur.classList.toggle('is-btn', btn);
    const disc = !el && !btn && hit ? hit.closest('[data-cursor-disc]') : null;   // a picture that opens something: the cursor itself says what
    if (disc && lab.textContent !== disc.dataset.cursorDisc) lab.textContent = disc.dataset.cursorDisc;   // only when it changes
    cur.classList.toggle('is-disc', !!disc);
    const arrow = !el && !btn && !disc && hit ? !!hit.closest('[data-cursor-arrow]') : false;   // a project picture: the cursor becomes a round arrow
    cur.classList.toggle('is-arrow', arrow);
    cur.classList.toggle('is-link', !el && !btn && !zoom && !zoomOut && !disc && !arrow && !!(hit && hit.closest('a[href], summary, label[for]')) && !hit.closest('[data-cursor-plain]'));   // plain areas (a case study's menu) keep the small dot
    if (el === card) return;
    if (el) {
      lab.textContent = el.dataset.cursor.replace(/<br\s*\/?>/gi, ' ');   // one line, as a speech bubble
      if (card) blink();                 // moved from one project straight onto another
      cur.classList.add('is-label');
    } else {
      cur.classList.remove('is-label');
    }
    card = el;
  };
  const queue = () => { if (!queued) { queued = true; requestAnimationFrame(sync); } };
  addEventListener('pageshow', e => {
    if (!e.persisted) return;
    try {
      const p = JSON.parse(sessionStorage.getItem('cursorAt') || 'null');
      if (p && Date.now() - p.t < 60000) { x = cx = p.x; y = cy = p.y; seen = true; queue(); }
    } catch (err) {}
  });
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
