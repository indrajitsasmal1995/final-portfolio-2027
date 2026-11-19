/* Hero stars for the case studies: the same sparse field of tiny dots as the homepage hero, drawn over
   the first screen of the page, behind its content. Each dot has a depth and drifts slowly across the
   screen in its own direction, wrapping round; the pointer shifts the field a little (near dots more)
   and dots right under it ease aside. Dark pages get dots in the page's ink; light pages get a few soft
   colours. The theme is read from the page's own background, so it works with any page's tokens.
   Still under reduced motion; paused once scrolled past. Load it at the end of the body. */
(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const cv = document.createElement('canvas');
  cv.className = 'hero-stars';
  cv.setAttribute('aria-hidden', 'true');
  cv.style.cssText = 'position:absolute;left:0;top:0;width:100%;z-index:-1;pointer-events:none;display:block;';
  document.body.prepend(cv);
  const ctx = cv.getContext('2d');
  const HUES = ['79,214,150', '96,150,255', '255,128,170', '255,176,64', '160,120,255'];
  let W = 0, H = 0, dpr = 1, dots = [], raf = 0, live = true, px = -1e4, py = -1e4, ox = 0, oy = 0, tox = 0, toy = 0;
  let light = false, ink = '241,237,230';

  // light or dark from the page's background, and the dot colour from its text colour
  // any CSS colour (rgb, hex, oklch...) to [r, g, b, a] by painting one pixel, so every page's tokens work
  const px1 = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
  const rgbOf = c => { px1.clearRect(0, 0, 1, 1); px1.fillStyle = '#000'; px1.fillStyle = c; px1.fillRect(0, 0, 1, 1); return [...px1.getImageData(0, 0, 1, 1).data]; };
  const theme = () => {
    let bg = rgbOf(getComputedStyle(document.body).backgroundColor);
    if (bg[3] < 10) bg = rgbOf(getComputedStyle(document.documentElement).backgroundColor);
    light = (0.2126 * bg[0] + 0.7152 * bg[1] + 0.0722 * bg[2]) / 255 > .5;
    const t = rgbOf(getComputedStyle(document.body).color);
    ink = t.slice(0, 3).join(',');
  };

  const build = () => {
    dpr = Math.min(2, devicePixelRatio || 1);
    W = document.documentElement.clientWidth; H = innerHeight;
    cv.style.height = H + 'px'; cv.width = W * dpr; cv.height = H * dpr;
    const n = Math.min(70, Math.round(W * H / 22000));
    dots = Array.from({ length: n }, () => {
      const z = .25 + Math.random() * .75, ang = Math.random() * 6.2832, sp = (.18 + Math.random() * .3) * (.55 + z * .45);
      return { x: Math.random() * W, y: Math.random() * H, z, r: .6 + z * 1.1, a: .12 + z * .3, c: (Math.random() * 5) | 0,
        vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, dx: 0, dy: 0, ph: Math.random() * 6.28 };
    });
  };

  const draw = t => {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
    ox += (tox - ox) * .04; oy += (toy - oy) * .04;
    const top = cv.getBoundingClientRect().top, mx = px, my = py - top;
    for (const d of dots) {
      if (!reduced) {
        d.x += d.vx; d.y += d.vy;
        if (d.x < -10) d.x = W + 10; else if (d.x > W + 10) d.x = -10;
        if (d.y < -10) d.y = H + 10; else if (d.y > H + 10) d.y = -10;
      }
      const bx = d.x + ox * d.z, by = d.y + oy * d.z;
      const ex = bx - mx, ey = by - my, dd = ex * ex + ey * ey, R = 110;
      let fx = 0, fy = 0;
      if (dd < R * R) { const m = Math.sqrt(dd) || 1, k = (1 - m / R) * 18 * d.z; fx = ex / m * k; fy = ey / m * k; }
      d.dx += (fx - d.dx) * .08; d.dy += (fy - d.dy) * .08;
      const tw = reduced ? 1 : .75 + .25 * Math.sin(t / 1400 + d.ph);
      ctx.fillStyle = light ? `rgba(${HUES[d.c]},${Math.min(1, d.a * 1.6 * tw).toFixed(3)})` : `rgba(${ink},${(d.a * tw).toFixed(3)})`;
      ctx.beginPath(); ctx.arc(bx + d.dx, by + d.dy, d.r, 0, 6.2832); ctx.fill();
    }
    raf = (live && !reduced && !document.hidden) ? requestAnimationFrame(draw) : 0;
  };
  const start = () => { if (!raf) raf = requestAnimationFrame(draw); };

  theme(); build(); start();
  let rs = 0; addEventListener('resize', () => { clearTimeout(rs); rs = setTimeout(() => { build(); start(); }, 150); });
  addEventListener('pointermove', e => {
    px = e.clientX; py = e.clientY;
    tox = (e.clientX / innerWidth - .5) * -40; toy = (e.clientY / innerHeight - .5) * -28;
  }, { passive: true });
  document.addEventListener('pointerleave', () => { px = py = -1e4; tox = toy = 0; });
  new IntersectionObserver(([e]) => { live = e.isIntersecting; if (live) start(); }).observe(cv);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) start(); });
  // the theme toggle changes the page's background; read it again a moment after
  new MutationObserver(() => setTimeout(() => { theme(); if (reduced) start(); }, 60))
    .observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'class'] });
})();
