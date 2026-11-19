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
    if (disc) lab.textContent = disc.dataset.cursorDisc;
    cur.classList.toggle('is-disc', !!disc);
    cur.classList.toggle('is-link', !el && !btn && !zoom && !zoomOut && !disc && !!(hit && hit.closest('a[href], summary, label[for]')) && !hit.closest('[data-cursor-plain]'));   // plain areas (a case study's menu) keep the small dot
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
