/* ───────────────────────────────────────────────────────────────────────────
   Page transitions — the moving half.

   Two panels and one sweep. On the page being left, a panel comes in and covers
   it, and it navigates under that cover; on the page being landed on, a second
   panel — the same element, built the same way — carries on in the same
   direction and leaves, uncovering the new page. Opening a project and coming
   back out of one are therefore the same move, once in each direction.

   The page being landed on is covered before its first paint by the head
   snippet's own pseudo-element. That is only there to hold the screen: as soon
   as this script runs it puts a real panel over the top and drops the
   pseudo-element, so what does the travelling is the same thing on both sides
   of the gap rather than a pseudo-element imitating it.

   All that crosses between the two documents is one sessionStorage entry
   holding the direction of travel, which is also what tells the second panel
   which way to go.
   ─────────────────────────────────────────────────────────────────────────── */
(() => {
  const root = document.documentElement;
  const KEY = 'ptHop';

  const IN = 500;    // the first panel's travel, on the page being left
  const OUT = 560;   // and the second's, on the page being landed on

  let busy = false;

  const clear = () => {
    root.classList.remove('pt-held');
    root.removeAttribute('data-pt');
    document.querySelectorAll('.pt').forEach(el => el.remove());
  };

  // one panel, however it is being used: which way it is going, whether it is
  // arriving or leaving, and how long it has to do it
  const panel = (dir, phase, ms) => {
    const el = document.createElement('div');
    el.className = 'pt';
    el.dataset.dir = dir;
    el.dataset.phase = phase;
    el.setAttribute('aria-hidden', 'true');
    el.style.setProperty('--pt-move', 'pt-' + phase + '-' + dir);
    el.style.setProperty('--pt-span', ms + 'ms');
    return el;
  };

  // Arriving. The direction the first panel was going is in the attribute the
  // head snippet set; this one goes the same way and off the far side, so the
  // two are one pass rather than a there and back.
  if (root.classList.contains('pt-held')) {
    const dir = root.getAttribute('data-pt') === 'up' ? 'up' : 'down';
    const el = panel(dir, 'out', OUT);
    requestAnimationFrame(() => {
      // the real panel goes up before the holding cover comes down, in the one
      // frame, or there is a gap between them to flash through
      document.body.append(el);
      root.classList.remove('pt-held');
      root.removeAttribute('data-pt');
      setTimeout(clear, OUT + 140);
    });
  } else {
    // No hold on this page, so any direction still sitting in storage belongs to a
    // navigation that never arrived here: a click whose 480ms wait the reader cut short
    // with the back button, or a page the browser served from its own cache without
    // running the head snippet that consumes the key. Left there it would make the next
    // page that does load cold play an uncovering sweep over nothing.
    try { sessionStorage.removeItem(KEY); } catch (err) {}
  }

  // A page restored from the back/forward cache is restored exactly as it was
  // left — which, on the way out, was covered. Strip the panel on the way in and
  // on the way out, or going back lands on a blank screen.
  addEventListener('pageshow', e => {
    if (!e.persisted) return;
    clear();
    busy = false;                       // the click that left this page never completed
    try { sessionStorage.removeItem(KEY); } catch (err) {}
  });
  addEventListener('pagehide', e => { if (e.persisted) clear(); });

  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  // Which links this applies to: same-site pages, left-clicked, no modifiers,
  // not the page we are already on.
  const page = a => {
    if (!a || a.target || a.hasAttribute('download') || a.dataset.ptSkip != null) return null;
    const href = a.getAttribute('href');
    if (!href || href[0] === '#') return null;
    if (/^[a-z]+:/i.test(href) && !/^https?:/i.test(href)) return null;   // mailto:, tel:, …
    let u;
    try { u = new URL(a.href, location.href); } catch (e) { return null; }
    if (u.origin !== location.origin) return null;
    if (u.pathname === location.pathname) return null;          // same page, just a hash
    // a page is a .html file, a folder, or a clean URL with no extension at all (the live site
    // serves /dhs-tutor for dhs-tutor.html); anything else with an extension is a file
    if (!/(\.html?|\/)$|\/[^\/.]+$/.test(u.pathname)) return null;
    return u;
  };

  // Fetch the destination while the pointer is still travelling toward it, so
  // the sweep and the page load overlap instead of queueing.
  const warmed = new Set();
  const warm = a => {
    const u = page(a);
    if (!u || warmed.has(u.href)) return;
    warmed.add(u.href);
    const l = document.createElement('link');
    l.rel = 'prefetch';
    l.as = 'document';
    l.href = u.href;
    document.head.append(l);
  };
  const near = e => { const a = e.target.closest && e.target.closest('a[href]'); if (a) warm(a); };
  addEventListener('pointerover', near, { passive: true });
  addEventListener('focusin', near, { passive: true });

  addEventListener('click', e => {
    if (busy || e.defaultPrevented || e.button !== 0) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = e.target.closest && e.target.closest('a[href]');
    const u = page(a);
    if (!u) return;

    e.preventDefault();
    busy = true;

    // Home is up, everywhere else is down, so the way back out of a project is
    // the sweep reversed rather than the same sweep twice.
    const home = u.pathname === '/' || /(^|\/)index\.html?$/.test(u.pathname);
    const dir = a.dataset.ptDir || (home ? 'up' : 'down');

    document.body.append(panel(dir, 'in', IN));

    // Start the fetch now rather than at the end of the sweep. On a mouse the pointer has
    // usually warmed it already, but a tap or a keyboard activation never fires
    // pointerover, and those were sitting out the whole cover before asking for the page.
    warm(a);

    // Stamped with the time, because the key is the only thing that crosses between the two
    // documents and nothing guarantees the second one ever loads. A reader who hits back
    // inside the 480ms leaves the direction behind; without a stamp the next page to load
    // cold would find it and uncover itself from a sweep that never covered anything.
    try { sessionStorage.setItem(KEY, dir + '|' + Date.now()); } catch (err) {}
    setTimeout(() => { location.href = u.href; }, IN - 20);
  });
})();
