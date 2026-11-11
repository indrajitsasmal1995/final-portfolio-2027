// Gestures and direct manipulation.
import { W, H, clamp, lerp, rb, ty, tx, tr, quiet, slots } from './util.js';
import { ico, photo, row, rows, nav, btn, mailRow, av, appIcon, APPNAMES, spinner, hud } from '../kit.js';

const heart = (size) => `<svg class="k-ico" width="${size}" height="${size}" viewBox="0 0 24 24" style="fill:currentColor;stroke:none" aria-hidden="true"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8z"/></svg>`;
const viewer = (c, inner, extra = '') => {
  c.dark(true);
  return `<div class="k-fill vw-bg" style="background:#000"></div>${inner}${extra}`;
};
const showHud = (c, el, icon, label) => {
  el.innerHTML = `${ico(icon, 16)}<span>${label}</span>`;
  c.anim(el, [{ opacity: 0, transform: 'translateX(-50%) scale(0.85)' }, { opacity: 1, transform: 'translateX(-50%) scale(1)' }], { hero: true });
  c.anim(el, [{ opacity: 0 }], { ms: 260, easing: 'out', delay: 1300 });
};

export default {
  /* ------------------------------------------------ tap */
  tap: {
    build(c) {
      const rowsV = c.variant === 1;
      if (!rowsV) {
        c.html(`<div class="k-page">${nav('Checkout', { back: 'Cart' })}
          <div style="padding:8px 16px;display:flex;flex-direction:column;gap:12px">
            <div class="k-card" style="padding:14px;display:flex;gap:12px;align-items:center;box-shadow:none"><div style="width:56px;height:56px;border-radius:10px;overflow:hidden;flex:none">${photo(4)}</div><div class="k-tx"><div class="k-t1">Dot grid notebook</div><div class="k-t2">Qty 1 · $18.00</div></div></div>
            <div style="height:6px"></div>
            ${btn('Place order', 'filled', 'data-t')}${btn('Save for later', 'tonal', 'data-t')}${btn('Keep shopping', 'outline', 'data-t')}
          </div></div>`);
      } else {
        c.html(`<div class="k-page">${nav('Settings', { large: c.ios })}<div class="k-list">${[0, 1, 2, 3, 4, 5].map((i) => row(i, { chev: c.ios, cls: 'tp-row' })).join('')}</div></div>`);
        c.$$('.tp-row').forEach((r) => { r.dataset.t = ''; r.style.overflow = 'hidden'; });
      }
      const targets = c.$$('[data-t]');
      const down = (el, p) => {
        const r = c.pos(el);
        if (c.ios) {
          let hl = el.querySelector('.k-hl');
          if (!hl) { hl = document.createElement('span'); hl.className = 'k-hl'; el.appendChild(hl); }
          c.hold(hl);
          c.anim(hl, [{ opacity: rowsV ? 0.1 : 0.18 }], { ms: 60, easing: 'linear' });
          return () => c.anim(hl, [{ opacity: 0 }], { hero: true });
        }
        const rip = document.createElement('span');
        rip.className = 'k-ripple';
        const x = p.x - r.l, y = p.y - r.t, R = Math.hypot(Math.max(x, r.w - x), Math.max(y, r.h - y));
        rip.style.cssText = `left:${x - R}px;top:${y - R}px;width:${2 * R}px;height:${2 * R}px`;
        el.appendChild(rip);
        c.anim(rip, [{ transform: 'scale(0)' }, { transform: 'scale(1)' }], { hero: true, keep: true });
        return () => c.anim(rip, [{ opacity: 0.16 }, { opacity: 0 }], { ms: 240, easing: 'out', delay: 140 }).finished.then(() => rip.remove()).catch(() => {});
      };
      return {
        async play() {
          await c.wait(500);
          for (const el of rowsV ? [targets[1], targets[3]] : targets) {
            const p = c.pos(el);
            const q = { x: p.x + (rowsV ? 40 : -30), y: p.y };
            c.F.down([[q.x, q.y]]);
            const release = down(el, q);
            await c.wait(150);
            c.F.up();
            release();
            await c.wait(800);
          }
        },
        interact() {
          targets.forEach((el) => {
            let release = null;
            c.drag(el, { start: (p) => { release = down(el, p); }, end: () => release && release(), tap: () => release && release() });
          });
        },
      };
    },
  },

  /* ------------------------------------------------ double tap */
  doubleTap: {
    build(c) {
      const zoom = c.variant === 1;
      if (zoom) {
        c.html(viewer(c, `<div class="dt-img" style="position:absolute;left:0;top:195px;width:${W}px;height:210px;cursor:zoom-in">${photo(1)}</div>`,
          `<div style="position:absolute;left:0;right:0;top:44px;display:flex;justify-content:space-between;padding:8px 14px;color:#fff">${ico('x', 22)}<span style="font-size:14px;font-weight:600">North Pier</span>${ico('share', 20)}</div>`));
      } else {
        c.html(`<div class="k-page">${nav('Feed', {})}
          <div style="display:flex;align-items:center;gap:10px;padding:4px 14px 10px">${av('Leo', '#3F7FE0', 32)}<div><div class="k-t1" style="font-size:14px">leo.park</div><div class="k-t2">North Pier</div></div></div>
          <div class="dt-img" style="position:relative;height:290px;cursor:pointer">${photo(1)}<div class="dt-heart" style="position:absolute;left:50%;top:50%;width:100px;height:100px;margin:-50px;color:#fff;opacity:0;filter:drop-shadow(0 6px 16px rgba(0,0,0,.3));pointer-events:none">${heart(100)}</div></div>
          <div style="display:flex;gap:18px;padding:12px 14px 6px;align-items:center"><span class="dt-like" style="display:flex">${ico('heart', 25)}</span>${ico('send', 23)}<span style="margin-left:auto">${ico('star', 23)}</span></div>
          <div style="padding:0 14px;font-size:13.5px"><b class="dt-n" style="font-weight:600">128 likes</b> <span class="k-sub">· 2 hours ago</span></div></div>`);
      }
      const img = c.$('.dt-img');
      let z = false, liked = false;
      const act = (p) => {
        if (zoom) {
          const r = c.pos(img), s = 2.4;
          z = !z;
          const dx = p.x - (r.l + r.w / 2) / 1, dy = p.y - (r.t + r.h / 2);
          const end = z ? `translate(${-dx * (s - 1)}px, ${-dy * (s - 1)}px) scale(${s})` : 'none';
          return c.anim(img, [{ transform: end }], { hero: true });
        }
        const h = c.$('.dt-heart'), like = c.$('.dt-like');
        const a = c.anim(h, [{ opacity: 0, transform: 'scale(0.2)' }, { opacity: 1, transform: 'scale(1)' }], { hero: true });
        c.anim(h, [{ opacity: 0, transform: 'scale(1.15)' }], { ms: 220, easing: 'in', delay: 750 });
        if (!liked) {
          liked = true;
          like.innerHTML = heart(25);
          like.style.color = '#FF3040';
          c.$('.dt-n').textContent = '129 likes';
          c.anim(like, [{ transform: 'scale(0.4)' }, { transform: 'scale(1)' }]);
        }
        return a;
      };
      const ctr = () => { const r = c.pos(img); return { x: r.x + (zoom ? 40 : 0), y: r.y - (zoom ? 30 : 0) }; };
      return {
        async play() {
          await c.wait(600);
          const p = ctr();
          await c.F.tap(p.x, p.y); await c.wait(40); await c.F.tap(p.x, p.y);
          await c.done(act(p));
          await c.wait(1500);
          if (zoom) {
            await c.F.tap(p.x, p.y); await c.wait(40); await c.F.tap(p.x, p.y);
            await c.done(act(p));
            await c.wait(600);
          }
        },
        interact() {
          let last = 0;
          c.tap(img, (e, p) => { const now = performance.now(); if (now - last < 330) { act(p); last = 0; } else last = now; });
        },
      };
    },
  },

  /* ------------------------------------------------ long press */
  longPress: {
    build(c) {
      if (c.variant === 1) {
        c.html(`<div class="k-page">${nav('Account', { back: 'Settings' })}
          <div style="padding:30px 24px;display:flex;flex-direction:column;align-items:center;text-align:center;gap:10px">
            <div style="width:84px;height:84px;border-radius:50%;background:var(--s-surface-2);display:grid;place-items:center;color:var(--s-danger)">${ico('trash', 36)}</div>
            <div class="k-h" style="font-size:20px;margin-top:8px">Delete account</div>
            <div class="k-sub" style="font-size:14px;line-height:1.45">Your places, plans and photos will be removed. Hold the button to confirm.</div></div>
          <div style="position:absolute;left:20px;right:20px;bottom:56px">
            <div class="lp-btn" style="position:relative;height:54px;border-radius:${c.ios ? 14 : 27}px;overflow:hidden;background:var(--s-surface-2);display:grid;place-items:center;cursor:pointer">
              <div class="lp-fill" style="position:absolute;inset:0;background:var(--s-danger);transform-origin:left;transform:scaleX(0)"></div>
              <span class="lp-l" style="position:relative;font-weight:600;font-size:15.5px;color:var(--s-danger);display:flex;align-items:center;gap:8px">Hold to delete</span></div></div></div>`);
        const b = c.$('.lp-btn'), fill = c.$('.lp-fill'), label = c.$('.lp-l');
        let holdA = null, timer = 0, done = false;
        const start = () => {
          if (done) return;
          c.hold(fill);
          holdA = c.anim(fill, [{ transform: 'scaleX(1)' }], { ms: 1200, easing: 'linear' });
          timer = setTimeout(complete, 1200 / c.speed);
        };
        const complete = () => {
          done = true;
          label.innerHTML = `${ico('check', 20)}Deleted`;
          label.style.color = '#fff';
          return c.anim(label, [{ transform: 'scale(0.6)' }, { transform: 'scale(1)' }], { hero: true });
        };
        const cancel = () => {
          clearTimeout(timer);
          if (done) return;
          c.hold(fill);
          c.anim(fill, [{ transform: 'scaleX(0)' }], { hero: true });
        };
        return {
          async play() {
            await c.wait(500);
            const p = c.pos(b);
            c.F.down([[p.x, p.y]]); start();
            await c.wait(500); c.F.up(); cancel();
            await c.wait(900);
            c.F.down([[p.x, p.y]]); start();
            await c.wait(1300); c.F.up();
            await c.wait(1300);
          },
          interact() {
            c.on(b, 'pointerdown', start);
            c.on(b, 'pointerup', cancel);
            c.on(b, 'pointerleave', cancel);
          },
        };
      }
      const msgs = [[0, 'Are we still on for the market?'], [1, 'Yes! Ten works for me'], [0, 'Perfect. I’ll bring coffee'], [1, 'See you there']];
      c.html(`<div class="k-page">${nav('Maya', { back: c.ios ? ' ' : true })}
        <div style="flex:1;display:flex;flex-direction:column;gap:8px;padding:12px;justify-content:flex-end;padding-bottom:96px">${msgs.map(([me, t], i) => `<div class="lp-b" data-i="${i}" style="align-self:${me ? 'flex-end' : 'flex-start'};max-width:76%;padding:9px 13px;border-radius:19px;font-size:14.5px;line-height:1.35;position:relative;cursor:pointer;background:${me ? 'var(--s-accent)' : 'var(--s-surface-2)'};color:${me ? 'var(--s-on-accent)' : 'var(--s-ink)'}">${t}</div>`).join('')}</div>
        <div style="position:absolute;left:12px;right:12px;bottom:34px;height:38px;border-radius:19px;box-shadow:inset 0 0 0 1px var(--s-line);display:flex;align-items:center;padding:0 14px" class="k-sub">Message</div></div>
        <div class="lp-dim" style="position:absolute;inset:0;z-index:4;opacity:0;pointer-events:none;background:rgba(0,0,0,.2);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px)"></div>
        <div class="lp-react" style="position:absolute;z-index:6;display:flex;gap:6px;padding:6px 10px;border-radius:24px;background:var(--s-surface);box-shadow:0 8px 24px rgba(0,0,0,.2);opacity:0;font-size:22px;transform-origin:left bottom">${['❤️', '👍', '😂', '‼️', '❓'].map((e) => `<span style="width:34px;height:34px;display:grid;place-items:center">${e}</span>`).join('')}</div>`);
      const dim = c.$('.lp-dim'), react = c.$('.lp-react'), bubbles = c.$$('.lp-b');
      let lifted = null;
      const open = (b) => {
        lifted = b;
        const r = c.pos(b);
        b.style.zIndex = 5;
        Object.assign(react.style, { left: clamp(r.l, 10, W - 220) + 'px', top: r.t - 58 + 'px' });
        dim.style.pointerEvents = 'auto';
        c.anim(dim, [{ opacity: 1 }], { ms: 240, easing: 'out' });
        c.anim(react, [{ opacity: 0, transform: 'scale(0.5) translateY(10px)' }, { opacity: 1, transform: 'none' }], { delay: 60 });
        return c.anim(b, [{ transform: 'scale(0.96)' }, { transform: 'scale(1.05)' }], { hero: true });
      };
      const close = () => {
        if (!lifted) return null;
        const b = lifted;
        lifted = null;
        dim.style.pointerEvents = 'none';
        c.anim(dim, [{ opacity: 0 }], { ms: 200, easing: 'out' });
        c.anim(react, [{ opacity: 0, transform: 'scale(0.8)' }], { ms: 160, easing: 'in' });
        const a = c.anim(b, [{ transform: 'scale(1)' }], { hero: true });
        a.finished.then(() => { b.style.zIndex = ''; }).catch(() => {});
        return a;
      };
      return {
        async play() {
          await c.wait(500);
          const b = bubbles[2], p = c.pos(b);
          c.F.down([[p.x, p.y]]);
          c.anim(b, [{ transform: 'scale(0.96)' }], { ms: 450, easing: 'out' });
          await c.wait(480);
          open(b);
          c.F.up();
          await c.wait(1600);
          await c.F.tap(W / 2, 160);
          await c.done(close());
          await c.wait(500);
        },
        interact() {
          let timer = 0;
          bubbles.forEach((b) => {
            c.on(b, 'pointerdown', () => { c.anim(b, [{ transform: 'scale(0.96)' }], { ms: 450, easing: 'out' }); timer = setTimeout(() => open(b), 450); });
            const up = () => { clearTimeout(timer); if (lifted !== b) c.anim(b, [{ transform: 'scale(1)' }], { ms: 180, easing: 'out' }); };
            c.on(b, 'pointerup', up); c.on(b, 'pointerleave', up);
          });
          c.on(dim, 'pointerdown', () => close());
          c.tap(react, () => close());
        },
      };
    },
  },

  /* ------------------------------------------------ swipe card */
  swipeCard: {
    build(c) {
      const people = [['Maya', 29, 'Loves night markets', 3], ['Leo', 31, 'Film photos, long walks', 1], ['Ana', 27, 'Ceramics on Tuesdays', 2], ['Sam', 33, 'Will cook for you', 4]];
      let next = 0;
      const card = () => {
        const [n, a, s, ph] = people[next++ % people.length];
        const el = document.createElement('div');
        el.className = 'sc-card';
        el.style.cssText = `position:absolute;left:22px;top:${c.ios ? 92 : 100}px;width:236px;height:350px;border-radius:22px;overflow:hidden;box-shadow:0 8px 24px rgba(0,0,0,.18);background:#000;touch-action:none`;
        el.innerHTML = `${photo(ph)}<div style="position:absolute;inset:0;background:linear-gradient(transparent 55%,rgba(0,0,0,.6))"></div>
          <div style="position:absolute;left:16px;bottom:16px;color:#fff"><div style="font-size:24px;font-weight:700">${n}, ${a}</div><div style="font-size:13px;opacity:.9">${s}</div></div>
          <div class="sc-like" style="position:absolute;left:16px;top:20px;padding:4px 10px;border:3px solid #34C759;color:#34C759;font-weight:800;font-size:22px;border-radius:8px;transform:rotate(-14deg);opacity:0">LIKE</div>
          <div class="sc-nope" style="position:absolute;right:16px;top:20px;padding:4px 10px;border:3px solid #FF3B30;color:#FF3B30;font-weight:800;font-size:22px;border-radius:8px;transform:rotate(14deg);opacity:0">NOPE</div>`;
        return el;
      };
      c.html(`<div class="k-page">${nav('Discover', {})}<div class="sc-stack" style="position:absolute;inset:0"></div>
        <div style="position:absolute;left:0;right:0;bottom:46px;display:flex;justify-content:center;gap:28px">
          <span class="sc-no" style="width:58px;height:58px;border-radius:50%;background:var(--s-surface);box-shadow:var(--s-shadow);display:grid;place-items:center;color:#FF3B30;cursor:pointer">${ico('x', 26)}</span>
          <span class="sc-yes" style="width:58px;height:58px;border-radius:50%;background:var(--s-surface);box-shadow:var(--s-shadow);display:grid;place-items:center;color:#34C759;cursor:pointer">${heart(26)}</span></div></div>`);
      const stack = c.$('.sc-stack');
      const depth = (el, k) => { el.style.transform = `translateY(${k * 12}px) scale(${1 - k * 0.05})`; el.style.zIndex = 10 - k; };
      for (let k = 0; k < 3; k++) { const el = card(); depth(el, k); stack.prepend(el); }
      const top = () => stack.lastElementChild;
      const pose = (el, x, y) => {
        el.style.transform = `translate(${x}px, ${y}px) rotate(${x * 0.07}deg)`;
        el.querySelector('.sc-like').style.opacity = clamp(x / 80);
        el.querySelector('.sc-nope').style.opacity = clamp(-x / 80);
      };
      const promote = () => {
        const cards = [...stack.children].reverse();
        let a = null;
        cards.forEach((el, k) => { el.style.zIndex = 10 - k; const an = c.anim(el, [{ transform: `translateY(${k * 12}px) scale(${1 - k * 0.05})` }], { hero: k === 0 }); if (k === 0) a = an; });
        const el = card(); el.style.transform = 'translateY(24px) scale(0.9)'; el.style.zIndex = 7; el.style.opacity = 0; stack.prepend(el);
        c.anim(el, [{ opacity: 1 }], { ms: 200, easing: 'out' });
        return a;
      };
      const fling = (el, dir, x = 0, y = 0, vx = 0) => {
        const ex = dir * (W + 140), dist = ex - x;
        el.querySelector(dir > 0 ? '.sc-like' : '.sc-nope').style.opacity = 1;
        c.anim(el, [{ transform: `translate(${ex}px, ${y + 40}px) rotate(${dir * 26}deg)` }], { v0: Math.abs(dist) > 1 ? vx / dist : 0 })
          .finished.then(() => el.remove()).catch(() => {});
        return promote();
      };
      const back = (el, vx, x) => {
        c.anim(el.querySelector('.sc-like'), [{ opacity: 0 }], { ms: 150, easing: 'out' });
        c.anim(el.querySelector('.sc-nope'), [{ opacity: 0 }], { ms: 150, easing: 'out' });
        return c.anim(el, [{ transform: 'translateY(0px) scale(1)' }], { hero: true, v0: x ? -vx / x : 0 });
      };
      const dir = c.variant === 1 ? -1 : 1;
      return {
        async play() {
          await c.wait(600);
          let el = top();
          c.F.down([[140, 270]]); await c.wait(100);
          c.anim(el, [{ transform: `translate(${dir * 95}px, 10px) rotate(${dir * 6.6}deg)` }], { ms: 420, easing: 'inout' });
          c.anim(el.querySelector(dir > 0 ? '.sc-like' : '.sc-nope'), [{ opacity: 1 }], { ms: 420, easing: 'inout' });
          await c.F.move([[140 + dir * 95, 280]], 420); c.F.up();
          await c.done(fling(el, dir, dir * 95, 10, dir * 700));
          await c.wait(900);
          el = top();
          c.F.down([[140, 270]]); await c.wait(100);
          c.anim(el, [{ transform: `translate(${dir * 45}px, 4px) rotate(${dir * 3.1}deg)` }], { ms: 380, easing: 'inout' });
          await c.F.move([[140 + dir * 45, 274]], 380); c.F.up();
          await c.done(back(el, 0, dir * 45));
          await c.wait(700);
        },
        interact() {
          let x = 0, y = 0;
          c.drag(stack, {
            start: () => { const m = c.hold(top()); x = m.m41; y = m.m42; },
            move: (dx, dy) => pose(top(), x + dx, y + dy),
            end: (dx, dy, vx) => {
              const el = top(), nx = x + dx, proj = nx + vx * 0.25;
              if (Math.abs(proj) > 120) fling(el, Math.sign(proj), nx, y + dy, vx);
              else back(el, vx, nx);
            },
          });
          c.tap(c.$('.sc-yes'), () => fling(top(), 1));
          c.tap(c.$('.sc-no'), () => fling(top(), -1));
        },
      };
    },
  },

  /* ------------------------------------------------ multi-finger swipe */
  multiSwipe: {
    build(c) {
      const redo = c.variant === 1;
      c.html(`<div class="k-page">${nav('Notes', { back: 'Folders' })}
        <div style="padding:6px 20px;font-size:15.5px;line-height:1.55">
          <div style="font-size:22px;font-weight:700;margin-bottom:8px">Saturday</div>
          <p style="margin:0 0 10px">Pack the tote bag, the film camera and the blue scarf.</p>
          <p style="margin:0">Meet Maya at ten by the north gate<span class="ms-w" style="background:var(--s-accent-soft);border-radius:4px;${redo ? 'opacity:0' : ''}">, then lunch at the night market</span>.</p>
        </div></div><div class="k-hud ms-hud"></div>`);
      const w = c.$('.ms-w'), h = c.$('.ms-hud');
      const fire = () => {
        c.anim(w, [{ opacity: redo ? 1 : 0 }], { ms: 220, easing: 'out' });
        showHud(c, h, redo ? 'redo' : 'undo', redo ? 'Redo Typing' : 'Undo Typing');
      };
      return {
        async play() {
          await c.wait(700);
          const d = redo ? 1 : -1, x0 = redo ? 90 : 190;
          c.F.down([[x0 - 30, 330], [x0, 312], [x0 + 30, 330]]);
          await c.wait(140);
          await c.F.move([[x0 - 30 + d * 120, 330], [x0 + d * 120, 312], [x0 + 30 + d * 120, 330]], 320, 'out');
          c.F.up();
          fire();
          await c.wait(2100);
        },
      };
    },
  },

  /* ------------------------------------------------ pinch */
  pinch: {
    build(c) {
      const out = c.variant === 1;
      c.html(viewer(c, `<div class="pn-img" style="position:absolute;left:0;top:195px;width:${W}px;height:210px">${photo(2)}</div>`,
        `<div class="pn-r" style="position:absolute;left:50%;bottom:44px;transform:translateX(-50%);color:#fff;font-size:13px;font-weight:600;background:rgba(255,255,255,.16);padding:6px 12px;border-radius:14px">1.0×</div>`));
      const img = c.$('.pn-img'), r = c.$('.pn-r');
      const cx = 140, cy = 300;
      const f = (d) => [[cx - d, cy - d * 0.7], [cx + d, cy + d * 0.7]];
      return {
        async play() {
          await c.wait(600);
          const [d0, d1, s1, rest] = out ? [90, 32, 0.62, 1] : [30, 96, 2.7, 2];
          c.F.down(f(d0)); await c.wait(150);
          c.anim(img, [{ transform: `scale(${s1})` }], { ms: 720, easing: 'inout' });
          r.textContent = s1.toFixed(1) + '×';
          await c.F.move(f(d1), 720);
          c.F.up();
          r.textContent = rest.toFixed(1) + '×';
          await c.done(c.anim(img, [{ transform: `scale(${rest})` }], { hero: true }));
          await c.wait(900);
          c.anim(img, [{ transform: 'none' }], { ms: 300, easing: 'out' });
          r.textContent = '1.0×';
          await c.wait(500);
        },
      };
    },
  },

  /* ------------------------------------------------ rotate */
  rotate: {
    build(c) {
      const snap = c.variant === 1;
      const streets = Array.from({ length: 9 }, (_, i) => `<path d="M${i * 60 - 40} -20 L${i * 60 + 20} 460" stroke="var(--s-surface)" stroke-width="${i % 3 ? 5 : 9}"/><path d="M-20 ${i * 60 - 30} L460 ${i * 60 + 10}" stroke="var(--s-surface)" stroke-width="${i % 4 ? 5 : 9}"/>`).join('');
      c.html(`<div class="k-fill" style="background:var(--s-surface-2);overflow:hidden">
          <div class="rt-map" style="position:absolute;left:${W / 2 - 220}px;top:${300 - 220}px;width:440px;height:440px">
            <svg width="440" height="440" viewBox="0 0 440 440" style="display:block;fill:none"><rect width="440" height="440" fill="var(--s-surface-3)"/>
              <path d="M-20 300 C 120 250, 200 360, 460 280 L460 330 C 220 410, 120 300, -20 350Z" fill="#8EC5E8" stroke="none" opacity=".8"/>
              <rect x="250" y="70" width="110" height="80" rx="14" fill="#A8D5A0" stroke="none" opacity=".9"/><rect x="60" y="120" width="70" height="90" rx="12" fill="#A8D5A0" stroke="none" opacity=".9"/>
              ${streets}<circle cx="220" cy="220" r="9" fill="var(--s-accent)" stroke="#fff" stroke-width="3"/></svg></div>
          <div class="rt-comp" style="position:absolute;right:14px;top:58px;width:40px;height:40px;border-radius:50%;background:var(--s-surface);box-shadow:var(--s-shadow);display:grid;place-items:center;opacity:0;cursor:pointer">
            <svg class="rt-needle" width="18" height="26" viewBox="0 0 18 26" style="stroke:none"><path d="M9 0 L15 13 L3 13Z" fill="#FF3B30"/><path d="M9 26 L15 13 L3 13Z" fill="var(--s-ink-3)"/></svg></div>
          <div style="position:absolute;left:12px;right:12px;top:52px;height:44px;border-radius:12px;background:var(--s-surface);box-shadow:var(--s-shadow);display:flex;align-items:center;gap:8px;padding:0 12px;width:${W - 80}px" class="k-sub">${ico('search', 18)}Search here</div></div>`);
      const map = c.$('.rt-map'), comp = c.$('.rt-comp'), needle = c.$('.rt-needle');
      let angle = 0;
      const turn = (to, o = {}) => {
        const from = angle;
        angle = to;
        c.anim(needle, [{ transform: `rotate(${-from}deg)` }, { transform: `rotate(${-to}deg)` }], o);
        c.anim(comp, [{ opacity: to % 360 ? 1 : 0 }], { ms: 200, easing: 'out' });
        return c.anim(map, [{ transform: `rotate(${from}deg)` }, { transform: `rotate(${to}deg)` }], o);
      };
      const arc = (a0, a1, r = 72) => {
        const n = 12, f1 = [], f2 = [];
        for (let i = 1; i <= n; i++) {
          const a = ((a0 + ((a1 - a0) * i) / n) * Math.PI) / 180;
          f1.push([140 + Math.cos(a) * r, 300 + Math.sin(a) * r]);
          f2.push([140 - Math.cos(a) * r, 300 - Math.sin(a) * r]);
        }
        return [f1, f2];
      };
      return {
        async play() {
          await c.wait(600);
          const a0 = -35, rot = snap ? 58 : 50;
          c.F.down([[140 + Math.cos((a0 * Math.PI) / 180) * 72, 300 + Math.sin((a0 * Math.PI) / 180) * 72], [140 - Math.cos((a0 * Math.PI) / 180) * 72, 300 - Math.sin((a0 * Math.PI) / 180) * 72]]);
          await c.wait(150);
          turn(rot, { ms: 900, easing: 'inout' });
          await c.F.move(arc(a0, a0 + rot), 900);
          c.F.up();
          await c.done(turn(snap ? 90 : rot + 4, { hero: true }));
          await c.wait(1000);
          const p = c.pos(comp);
          await c.F.tap(p.x, p.y);
          await c.done(turn(0, { hero: true }));
          await c.wait(500);
        },
      };
    },
  },

  /* ------------------------------------------------ edge swipe */
  edgeSwipe: {
    build(c) {
      const cancel = c.variant === 1;
      c.html(`<div class="k-page es-under">${nav('Inbox', { large: c.ios, menu: true })}${[0, 1, 2, 3, 4, 5].map((i) => mailRow(i, { cls: 'es-row' })).join('')}</div>
        <div class="es-dim" style="position:absolute;inset:0;background:#000;opacity:0;pointer-events:none"></div>
        <div class="k-page es-top" style="box-shadow:-10px 0 30px rgba(0,0,0,.18);overflow:hidden">${nav('', { back: 'Inbox', right: c.ios ? `<span class="k-navbtn">${ico('trash', 20)}</span>` : `<span class="k-ib">${ico('trash', 22)}</span>` })}
          <div style="padding:6px 18px"><div style="font-size:21px;font-weight:700;line-height:1.2">Saturday plans</div>
            <div style="display:flex;gap:10px;align-items:center;margin:14px 0">${av('Maya', '#D6457A', 38)}<div><div class="k-t1" style="font-size:14px">Maya Chen</div><div class="k-t2">to me · 9:12</div></div></div>
            <div style="font-size:14.5px;line-height:1.55">Are we still on for the market at ten? I found a stall that sells the good pastries. Bring the tote, it gets busy.</div>
            <div style="margin-top:16px;display:flex;flex-direction:column;gap:9px"><div class="k-bar" style="width:92%"></div><div class="k-bar" style="width:80%"></div><div class="k-bar" style="width:60%"></div></div></div></div>
        <div class="es-arrow" style="position:absolute;left:-44px;top:300px;width:40px;height:40px;margin-top:-20px;border-radius:50%;background:var(--s-inverse);color:var(--s-on-inverse);display:${c.android ? 'grid' : 'none'};place-items:center;z-index:20">${ico('chevL', 22)}</div>
        <div class="es-edge" style="position:absolute;left:0;top:44px;bottom:0;width:26px;z-index:25;cursor:grab"></div>`);
      const top = c.$('.es-top'), under = c.$('.es-under'), dim = c.$('.es-dim'), arrow = c.$('.es-arrow');
      const pose = (x) => {
        const p = clamp(x / W);
        if (c.ios) return { top: { transform: tx(x) }, under: { transform: tx(-W * 0.3 * (1 - p)) }, dim: { opacity: 0.12 * (1 - p) }, arrow: {} };
        const q = clamp(p * 2.2);
        return { top: { transform: `translateX(${q * 14}px) scale(${1 - 0.1 * q})`, borderRadius: `${q * 28}px` }, under: { transform: 'none' }, dim: { opacity: 0.25 * (1 - q * 0.6) }, arrow: { transform: tx(44 + q * 14) } };
      };
      const apply = (s, o) => {
        if (o) { c.anim(top, [s.top], o); c.anim(under, [s.under], o); c.anim(dim, [s.dim], o); if (c.android) c.anim(arrow, [s.arrow], o); return; }
        Object.assign(top.style, s.top); Object.assign(under.style, s.under); Object.assign(dim.style, s.dim); if (c.android) Object.assign(arrow.style, s.arrow);
      };
      apply(pose(0));
      let gone = false;
      const finish = (complete, v0 = 0) => {
        gone = complete;
        if (complete) {
          c.anim(dim, [{ opacity: 0 }]); c.anim(under, [{ transform: 'none' }]);
          if (c.android) c.anim(arrow, [{ transform: 'none' }], { ms: 150, easing: 'in' });
          const end = c.ios ? { transform: tx(W + 30) } : { transform: `translateX(${W * 0.7}px) scale(0.86)`, opacity: 0, borderRadius: '28px' };
          return c.anim(top, [end], { hero: true, v0 });
        }
        const s = pose(0);
        c.anim(under, [s.under]); c.anim(dim, [{ opacity: 0 }]);
        if (c.android) c.anim(arrow, [{ transform: 'none' }], { ms: 180, easing: 'in' });
        return c.anim(top, [{ ...s.top, opacity: 1 }], { hero: true, v0 });
      };
      return {
        async play() {
          await c.wait(600);
          const end = cancel ? 85 : 175;
          c.F.down([[6, 330]]); await c.wait(130);
          apply(pose(end - 6), { ms: 620, easing: 'inout' });
          await c.F.move([[end, 330]], 620);
          c.F.up();
          await c.done(finish(!cancel, cancel ? 0 : 0.8));
          await c.wait(1300);
        },
        interact() {
          let x = 0;
          c.drag(c.$('.es-edge'), {
            start: () => { c.hold(top); c.hold(under); c.hold(dim); c.hold(arrow); },
            move: (dx) => { x = Math.max(0, dx); apply(pose(x)); },
            end: (dx, dy, vx) => {
              const done = x > W * 0.4 || vx > 500;
              const dist = (done ? W : 0) - x;
              finish(done, Math.abs(dist) > 1 ? vx / dist : 0);
            },
          });
          c.$$('.es-row').forEach((r) => c.tap(r, () => { if (gone) { gone = false; c.anim(top, [{ transform: 'none', opacity: 1, borderRadius: '0px' }], { hero: true }); } }));
        },
      };
    },
  },

  /* ------------------------------------------------ hold and move */
  holdMove: {
    build(c) {
      c.html(`<div class="k-fill" style="background:linear-gradient(160deg,#F6C28B,#E06C75 45%,#7B5EA7);"></div>
        <div class="hm-grid" style="position:absolute;inset:0"></div>
        <div class="hm-done" style="position:absolute;right:14px;top:50px;padding:5px 12px;border-radius:14px;background:rgba(255,255,255,.3);color:#fff;font-weight:600;font-size:13px;opacity:0;cursor:pointer">Done</div>
        <div style="position:absolute;left:14px;right:14px;bottom:24px;height:84px;border-radius:28px;background:rgba(255,255,255,.28);-webkit-backdrop-filter:blur(16px);backdrop-filter:blur(16px)"></div>`);
      c.dark(true);
      const grid = c.$('.hm-grid');
      const n = 12;
      grid.innerHTML = Array.from({ length: n }, (_, i) => appIcon(i, APPNAMES[i])).join('');
      const els = [...grid.children];
      els.forEach((el) => { el.style.cssText += ';position:absolute;left:0;top:0;color:#fff;text-shadow:0 1px 3px rgba(0,0,0,.3);cursor:grab'; });
      const pos = (s) => ({ x: 10 + (s % 4) * 65, y: 70 + Math.floor(s / 4) * 92 });
      const sl = slots(c, els, pos);
      let held = -1;
      const jiggle = (on) => { grid.classList.toggle('jiggle', on && c.ios); c.anim(c.$('.hm-done'), [{ opacity: on ? 1 : 0 }], { ms: 200, easing: 'out' }); };
      const lift = (ei) => {
        held = ei;
        els[ei].style.zIndex = 5;
        jiggle(true);
        const p = pos(sl.slotOf(ei));
        c.anim(els[ei], [{ transform: `translate(${p.x}px, ${p.y}px) scale(1.15)`, filter: 'drop-shadow(0 10px 14px rgba(0,0,0,.3))' }], { ms: 180, easing: 'out' });
      };
      const drop = () => {
        const ei = held;
        held = -1;
        const p = pos(sl.slotOf(ei));
        const a = c.anim(els[ei], [{ transform: `translate(${p.x}px, ${p.y}px) scale(1)`, filter: 'drop-shadow(0 0 0 rgba(0,0,0,0))' }], { hero: true });
        a.finished.then(() => { els[ei].style.zIndex = ''; }).catch(() => {});
        return a;
      };
      return {
        async play() {
          await c.wait(600);
          const from = pos(1), to = pos(6);
          const cx = (p) => [p.x + 30, p.y + 26];
          c.F.down([cx(from)]);
          await c.wait(520);
          lift(1);
          await c.wait(260);
          c.anim(els[1], [{ transform: `translate(${to.x}px, ${to.y}px) scale(1.15)` }], { ms: 900, easing: 'inout' });
          const mv = c.F.move([cx(to)], 900);
          await c.wait(450);
          sl.moveTo(1, 5);
          await c.wait(300);
          sl.moveTo(1, 6);
          await mv;
          await c.wait(200);
          c.F.up();
          await c.done(drop());
          await c.wait(1100);
          jiggle(false);
          await c.wait(400);
        },
        interact() {
          let timer = 0, ox = 0, oy = 0;
          els.forEach((el, ei) => {
            c.drag(el, {
              start: () => { timer = setTimeout(() => lift(ei), 400); const p = pos(sl.slotOf(ei)); ox = p.x; oy = p.y; },
              move: (dx, dy) => {
                if (held !== ei) { if (Math.hypot(dx, dy) > 8) clearTimeout(timer); return; }
                if (el.getAnimations().length) c.hold(el);
                const x = ox + dx, y = oy + dy;
                el.style.transform = `translate(${x}px, ${y}px) scale(1.15)`;
                sl.moveTo(ei, sl.nearest(x, y));
              },
              end: () => { clearTimeout(timer); if (held === ei) drop(); },
              tap: () => clearTimeout(timer),
            });
          });
          c.tap(c.$('.hm-done'), () => jiggle(false));
        },
      };
    },
  },

  /* ------------------------------------------------ multi-finger text editing */
  multiText: {
    build(c) {
      const v = c.variant;
      c.html(`<div class="k-page">${nav('Notes', { back: 'Folders' })}
        <div style="padding:6px 20px;font-size:15.5px;line-height:1.6">
          <div style="font-size:22px;font-weight:700;margin-bottom:8px">Pier walk</div>
          <p style="margin:0 0 10px">We met at <span class="mt-sel" style="border-radius:3px;${v === 0 ? 'background:var(--s-accent-soft);box-shadow:-2px 0 0 var(--s-accent), 2px 0 0 var(--s-accent)' : ''}">golden hour</span> by the north pier.</p>
          <p style="margin:0">Next time, bring the film camera and go at <span class="mt-ins" style="border-radius:3px;${v === 1 ? 'display:none' : ''}">golden hour</span><span class="mt-caret" style="display:${v === 1 ? 'inline-block' : 'none'};width:2px;height:19px;background:var(--s-accent);vertical-align:-3px;animation:kblink 1s steps(1) infinite"></span>.</p>
        </div></div><div class="k-hud mt-hud"></div>`);
      const h = c.$('.mt-hud'), ins = c.$('.mt-ins');
      const fire = () => {
        if (v === 0) { showHud(c, h, 'copy', 'Copy'); return; }
        if (v === 1) {
          ins.style.display = 'inline';
          c.anim(ins, [{ background: 'var(--s-accent-soft)', opacity: 0 }, { background: 'var(--s-accent-soft)', opacity: 1, offset: 0.3 }, { background: 'transparent', opacity: 1 }], { ms: 900, easing: 'out' });
          showHud(c, h, 'clipboard', 'Paste');
          return;
        }
        c.anim(ins, [{ opacity: 0 }], { ms: 200, easing: 'out' });
        showHud(c, h, 'undo', 'Undo');
      };
      const tri = (cx, cy, d) => [[cx - d, cy + d * 0.5], [cx, cy - d * 0.6], [cx + d, cy + d * 0.5]];
      return {
        async play() {
          await c.wait(700);
          if (v === 2) {
            c.F.down([[160, 330], [190, 312], [220, 330]]); await c.wait(140);
            await c.F.move([[40, 330], [70, 312], [100, 330]], 320, 'out');
          } else {
            const [a, b] = v === 0 ? [70, 22] : [22, 70];
            c.F.down(tri(140, 340, a)); await c.wait(160);
            await c.F.move(tri(140, 340, b), 380);
          }
          c.F.up();
          fire();
          await c.wait(2100);
        },
      };
    },
  },

  /* ------------------------------------------------ drag and drop list */
  dragList: {
    build(c) {
      const n = 6, rh = c.ios ? 56 : 60, top = c.ios ? 140 : 110;
      c.html(`<div class="k-page">${nav('Up next', { large: c.ios, right: c.ios ? '<span class="k-navbtn" style="font-weight:600">Done</span>' : '' })}</div>
        <div class="dl-box" style="position:absolute;left:${c.ios ? 14 : 0}px;right:${c.ios ? 14 : 0}px;top:${top}px;height:${n * rh}px;${c.ios ? 'border-radius:11px;background:var(--s-surface)' : ''}"></div>`);
      const box = c.$('.dl-box');
      box.innerHTML = Array.from({ length: n }, (_, i) => `<div class="dl-r" style="position:absolute;left:0;right:0;top:0;height:${rh}px;border-radius:${c.ios ? 11 : 0}px;background:${c.ios ? 'var(--s-surface)' : 'var(--s-bg)'};cursor:grab">${row(i, { handle: true, cls: 'dl-in' })}</div>`).join('');
      const els = c.$$('.dl-r');
      els.forEach((el) => { const r = el.firstElementChild; r.style.background = 'transparent'; r.style.minHeight = rh + 'px'; });
      const sl = slots(c, els, (s) => ({ x: 0, y: s * rh }));
      let held = -1;
      const lift = (ei) => {
        held = ei;
        els[ei].style.zIndex = 5;
        const p = sl.pos(sl.slotOf(ei));
        c.anim(els[ei], [{ transform: `translate(0px, ${p.y}px) scale(1.03)`, boxShadow: '0 12px 28px rgba(0,0,0,.2)' }], { ms: 160, easing: 'out' });
      };
      const drop = () => {
        const ei = held;
        held = -1;
        const p = sl.pos(sl.slotOf(ei));
        const a = c.anim(els[ei], [{ transform: `translate(0px, ${p.y}px) scale(1)`, boxShadow: '0 0 0 rgba(0,0,0,0)' }], { hero: true });
        a.finished.then(() => { els[ei].style.zIndex = ''; }).catch(() => {});
        return a;
      };
      return {
        async play() {
          await c.wait(600);
          const hx = W - 34, y0 = top + rh * 1 + rh / 2;
          c.F.down([[hx, y0]]);
          await c.wait(160);
          lift(1);
          await c.wait(200);
          for (let s = 2; s <= 4; s++) {
            c.anim(els[1], [{ transform: `translate(0px, ${s * rh}px) scale(1.03)` }], { ms: 320, easing: 'inout' });
            await c.F.move([[hx, top + s * rh + rh / 2]], 320);
            sl.moveTo(1, s);
          }
          await c.wait(150);
          c.F.up();
          await c.done(drop());
          await c.wait(1100);
        },
        interact() {
          els.forEach((el, ei) => {
            let oy = 0;
            c.drag(el, {
              start: () => { oy = sl.pos(sl.slotOf(ei)).y; lift(ei); },
              move: (dx, dy) => {
                if (el.getAnimations().length) c.hold(el);
                const y = clamp(oy + dy, -10, (n - 1) * rh + 10);
                el.style.transform = `translate(0px, ${y}px) scale(1.03)`;
                sl.moveTo(ei, clamp(Math.round(y / rh), 0, n - 1));
              },
              end: () => drop(),
              tap: () => drop(),
            });
          });
        },
      };
    },
  },

  /* ------------------------------------------------ drag and drop grid */
  dragGrid: {
    build(c) {
      const size = 80, gap = 6, left = (W - size * 3 - gap * 2) / 2, top = c.ios ? 150 : 120;
      c.html(`<div class="k-page">${nav('Album', { large: c.ios, right: c.ios ? '<span class="k-navbtn">Select</span>' : '' })}</div><div class="dg-g" style="position:absolute;inset:0"></div>
        <div class="k-sub" style="position:absolute;left:0;right:0;top:${top + 3 * (size + gap) + 18}px;text-align:center">Hold and drag to rearrange</div>`);
      const g = c.$('.dg-g');
      g.innerHTML = Array.from({ length: 9 }, (_, i) => `<div style="position:absolute;left:0;top:0;width:${size}px;height:${size}px;border-radius:12px;overflow:hidden;cursor:grab">${photo(i)}</div>`).join('');
      const els = [...g.children];
      const pos = (s) => ({ x: left + (s % 3) * (size + gap), y: top + Math.floor(s / 3) * (size + gap) });
      const sl = slots(c, els, pos);
      let held = -1;
      const lift = (ei) => {
        held = ei;
        els[ei].style.zIndex = 5;
        const p = pos(sl.slotOf(ei));
        c.anim(els[ei], [{ transform: `translate(${p.x}px, ${p.y}px) scale(1.12)`, boxShadow: '0 14px 30px rgba(0,0,0,.28)' }], { ms: 170, easing: 'out' });
      };
      const drop = () => {
        const ei = held;
        held = -1;
        const p = pos(sl.slotOf(ei));
        const a = c.anim(els[ei], [{ transform: `translate(${p.x}px, ${p.y}px) scale(1)`, boxShadow: '0 0 0 rgba(0,0,0,0)' }], { hero: true });
        a.finished.then(() => { els[ei].style.zIndex = ''; }).catch(() => {});
        return a;
      };
      return {
        async play() {
          await c.wait(600);
          const ctr = (s) => { const p = pos(s); return [p.x + size / 2, p.y + size / 2]; };
          c.F.down([ctr(0)]); await c.wait(350);
          lift(0); await c.wait(200);
          for (const s of [4, 8]) {
            const p = pos(s);
            c.anim(els[0], [{ transform: `translate(${p.x}px, ${p.y}px) scale(1.12)` }], { ms: 480, easing: 'inout' });
            await c.F.move([ctr(s)], 480);
            sl.moveTo(0, s);
            await c.wait(120);
          }
          c.F.up();
          await c.done(drop());
          await c.wait(1100);
        },
        interact() {
          els.forEach((el, ei) => {
            let ox = 0, oy = 0;
            c.drag(el, {
              start: () => { const p = pos(sl.slotOf(ei)); ox = p.x; oy = p.y; lift(ei); },
              move: (dx, dy) => {
                if (el.getAnimations().length) c.hold(el);
                const x = ox + dx, y = oy + dy;
                el.style.transform = `translate(${x}px, ${y}px) scale(1.12)`;
                sl.moveTo(ei, sl.nearest(x, y));
              },
              end: () => drop(),
              tap: () => drop(),
            });
          });
        },
      };
    },
  },

  /* ------------------------------------------------ drag to dismiss + velocity dismissal */
  dragDismiss: {
    build(c) {
      const vel = c.item.id === 'velocity-dismissal';
      const thumbI = 4, size = (W - 4) / 3;
      c.html(`<div class="k-page">${nav('Photos', { large: c.ios })}<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:2px">${Array.from({ length: 12 }, (_, i) => `<div class="dd-th" style="aspect-ratio:1;cursor:pointer">${photo(i)}</div>`).join('')}</div></div>
        <div class="dd-bg" style="position:absolute;inset:0;background:#000;z-index:10"></div>
        <div class="dd-ph" style="position:absolute;left:0;top:195px;width:${W}px;height:210px;z-index:11;touch-action:none;cursor:grab">${photo(thumbI)}</div>
        ${vel ? '<div class="dd-v" style="position:absolute;left:50%;bottom:48px;transform:translateX(-50%);z-index:12;color:#fff;font:600 12.5px/1 var(--s-font);background:rgba(255,255,255,.16);padding:8px 12px;border-radius:14px;white-space:nowrap">Release speed decides</div>' : ''}`);
      c.dark(true);
      const bg = c.$('.dd-bg'), ph = c.$('.dd-ph'), vr = c.$('.dd-v');
      let open = true;
      const thumbT = () => {
        const t = c.pos(c.$$('.dd-th')[thumbI]);
        const s = t.w / W;
        return `translate(${t.x - W / 2}px, ${t.y - 300}px) scale(${s}, ${t.h / 210})`;
      };
      const pose = (x, y) => {
        const p = clamp(y / 350);
        ph.style.transform = `translate(${x}px, ${y}px) scale(${1 - Math.max(0, y) / 900})`;
        bg.style.opacity = 1 - p;
      };
      const say = (v, out) => { if (vr) vr.textContent = `${Math.round(Math.abs(v))} px/s · ${out ? 'dismiss' : 'stay'}`; };
      const dismiss = (v0 = 0) => {
        open = false;
        c.dark(false);
        c.anim(bg, [{ opacity: 0 }], { ms: 260, easing: 'out' });
        bg.style.pointerEvents = 'none';
        return c.anim(ph, [{ transform: thumbT() }], { hero: true, v0 });
      };
      const restore = (v0 = 0) => {
        c.anim(bg, [{ opacity: 1 }]);
        return c.anim(ph, [{ transform: 'none' }], { hero: true, v0 });
      };
      const reopen = () => {
        open = true;
        c.dark(true);
        bg.style.pointerEvents = 'auto';
        c.anim(bg, [{ opacity: 1 }], { ms: 250, easing: 'out' });
        return c.anim(ph, [{ transform: thumbT() }, { transform: 'none' }], { hero: true });
      };
      const decide = (dy, vy) => dy + vy * 0.25 > 170;
      return {
        async play() {
          await c.wait(700);
          const v = c.variant;
          const [dy, ms, easing, pause] = vel ? (v === 0 ? [150, 1300, 'linear', 300] : [70, 110, 'linear', 0]) : (v === 0 ? [190, 620, 'linear', 0] : [80, 600, 'inout', 0]);
          const vy = pause ? 0 : easing === 'linear' ? (dy / ms) * 1000 : 0;
          c.F.down([[140, 300]]); await c.wait(120);
          c.anim(ph, [{ transform: `translate(8px, ${dy}px) scale(${1 - dy / 900})` }], { ms, easing });
          c.anim(bg, [{ opacity: 1 - clamp(dy / 350) }], { ms, easing });
          await c.F.move([[148, 300 + dy]], ms, easing);
          if (pause) await c.wait(pause);
          c.F.up();
          const out = decide(dy, vy);
          say(vy, out);
          await c.done(out ? dismiss(vy / 500) : restore(dy ? -vy / dy : 0));
          await c.wait(1300);
        },
        interact() {
          let x0 = 0, y0 = 0, x = 0, y = 0;
          c.drag(ph, {
            start: () => { if (!open) return; const m = c.hold(ph); c.hold(bg); x0 = m.m41; y0 = m.m42; },
            move: (dx, dy) => { if (!open) return; x = x0 + dx; y = y0 + dy; pose(x, y); },
            end: (dx, dy, vx, vy) => {
              if (!open) return;
              const out = decide(y, vy);
              say(vy, out);
              if (out) dismiss(vy / 400); else restore(y ? -vy / y : 0);
            },
            tap: () => { if (!open) reopen(); },
          });
          c.$$('.dd-th').forEach((t) => c.tap(t, () => { if (!open) reopen(); }));
        },
      };
    },
  },

  /* ------------------------------------------------ pull to refresh */
  ptr: {
    build(c) {
      const headH = c.ios ? 44 + 44 + 44 : 36 + 60;
      c.html(`<div class="k-page">${nav('Inbox', { large: c.ios, menu: true })}
        <div style="position:relative;flex:1">
          ${c.ios ? `<div class="pt-sp" style="position:absolute;left:0;right:0;top:14px;display:flex;justify-content:center;opacity:0">${spinner()}</div>` : ''}
          <div class="pt-c" style="position:absolute;inset:0;background:var(--s-bg)"><div class="pt-new" style="height:0;overflow:hidden">${mailRow(7)}</div>${[0, 1, 2, 3, 4, 5].map((i) => mailRow(i)).join('')}</div>
          ${c.android ? `<div class="pt-md" style="position:absolute;left:50%;top:-50px;width:40px;height:40px;margin-left:-20px;border-radius:50%;background:var(--s-surface-3);box-shadow:0 2px 6px rgba(0,0,0,.2);display:grid;place-items:center;z-index:3">
              <svg class="pt-arc" width="24" height="24" viewBox="0 0 24 24" style="color:var(--s-accent)"><circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-dasharray="38 100"/></svg></div>` : ''}
        </div></div>`);
      const content = c.$('.pt-c'), sp = c.$('.pt-sp'), md = c.$('.pt-md'), arc = c.$('.pt-arc');
      const pull = (d) => {
        if (c.ios) { content.style.transform = ty(d); sp.style.opacity = clamp(d / 70); sp.style.transform = `rotate(${d * 2}deg)`; }
        else { md.style.transform = `translateY(${Math.min(d, 110) * 0.9}px)`; arc.style.transform = `rotate(${d * 3}deg)`; md.style.opacity = clamp(d / 40); }
      };
      const followTo = (d, ms, e) => {
        if (c.ios) { c.anim(content, [{ transform: ty(d) }], { ms, easing: e }); c.anim(sp, [{ opacity: clamp(d / 70) }], { ms, easing: e }); }
        else { c.anim(md, [{ transform: `translateY(${Math.min(d, 110) * 0.9}px)`, opacity: clamp(d / 40) }], { ms, easing: e }); c.anim(arc, [{ transform: `rotate(${d * 3}deg)` }], { ms, easing: e }); }
      };
      const refresh = async () => {
        if (c.ios) c.anim(content, [{ transform: ty(56) }]);
        else { c.anim(md, [{ transform: 'translateY(66px)', opacity: 1 }]); arc.style.animation = 'kspin 0.9s linear infinite'; }
        await c.wait(1300);
        const nw = c.$('.pt-new');
        c.anim(nw, [{ height: '0px' }, { height: nw.firstElementChild.offsetHeight + 'px' }]);
        if (c.ios) { c.anim(sp, [{ opacity: 0 }], { ms: 150, easing: 'out' }); return c.anim(content, [{ transform: ty(0) }], { hero: true }); }
        return c.anim(md, [{ transform: 'translateY(66px) scale(0)', opacity: 1 }], { hero: true });
      };
      const cancel = () => (c.ios ? c.anim(content, [{ transform: ty(0) }], { hero: true }) : c.anim(md, [{ transform: 'translateY(0px)', opacity: 0 }], { hero: true }));
      return {
        async play() {
          await c.wait(600);
          c.F.down([[150, 230]]); await c.wait(120);
          followTo(rb(140, 260), 700, 'inout');
          await c.F.move([[150, 370]], 700);
          c.F.up();
          await c.done(await refresh());
          await c.wait(1100);
        },
        interact() {
          let busy = false, d = 0;
          c.drag(content, {
            start: () => { if (!busy) { c.hold(content); if (md) { c.hold(md); arc.style.animation = ''; } } },
            move: (dx, dy) => { if (busy) return; d = rb(Math.max(0, dy), 260); pull(d); },
            end: async () => {
              if (busy) return;
              if (d > 64) { busy = true; try { await refresh(); } catch (e) { /* cancelled */ } busy = false; }
              else cancel();
              d = 0;
            },
          });
        },
      };
    },
  },

  /* ------------------------------------------------ scroll inertia + momentum */
  inertia: {
    build(c) {
      const mom = c.item.id === 'momentum-scroll';
      const rate = mom && c.variant === 1 ? 0.99 : 0.998;
      const over = !mom && c.variant === 1;
      const n = 28, rh = c.ios ? 56 : 60;
      const viewTop = c.ios ? 132 : 96, viewH = H - viewTop;
      const minY = -(n * rh + (c.ios ? 20 : 0) - viewH + 20);
      c.html(`<div class="k-page">${nav(mom ? 'Library' : 'Places', { large: c.ios })}</div>
        <div class="in-view" style="position:absolute;left:0;right:0;top:${viewTop}px;bottom:0;overflow:hidden;cursor:grab"><div class="in-c" style="padding-bottom:20px">${rows(n)}</div></div>
        ${mom ? `<div class="in-r" style="position:absolute;left:50%;bottom:40px;transform:translateX(-50%);z-index:5;font:600 12px/1 var(--s-font);background:var(--s-inverse);color:var(--s-on-inverse);padding:9px 13px;border-radius:16px;white-space:nowrap">Rate ${rate} per ms</div>` : ''}`);
      const view = c.$('.in-view'), content = c.$('.in-c'), rd = c.$('.in-r');
      let y = 0;
      const set = (v) => { y = v; content.style.transform = ty(v); };
      const edge = (v) => (y > 0 ? 0 : minY);
      const bounce = (v) => {
        const bound = y > 0 ? 0 : minY, sign = y > 0 ? 1 : -1;
        if (c.ios) {
          const kick = sign * Math.min(110, Math.abs(v) * 60 + Math.abs(y - bound));
          y = bound;
          return c.anim(content, [{ transform: ty(bound + kick) }], { ms: 130, easing: 'out' }).finished.then(() => c.done(c.anim(content, [{ transform: ty(bound) }], { hero: true }))).catch(() => {});
        }
        y = bound;
        content.style.transformOrigin = sign > 0 ? '50% 0' : '50% 100%';
        content.style.transform = ty(bound);
        const s = 1 + Math.min(0.09, Math.abs(v) * 0.03 + 0.03);
        return c.anim(content, [{ transform: `${ty(bound)} scaleY(${s})` }], { ms: 120, easing: 'out' }).finished.then(() => c.done(c.anim(content, [{ transform: `${ty(bound)} scaleY(1)` }], { hero: true }))).catch(() => {});
      };
      const glide = (v) => new Promise((res) => {
        if (rd) rd.textContent = `${Math.round(Math.abs(v) * 1000)} px/s · glides ${Math.round(Math.abs(v * (rate / (1 - rate))))} px`;
        let last = performance.now();
        c.raf((t) => {
          const dt = Math.min(32, t - last) * c.speed; last = t;
          v *= Math.pow(rate, dt);
          set(y + v * dt);
          if (y > 0 || y < minY) { quiet(bounce(v)).then(res); return false; }
          if (Math.abs(v) < 0.015) { res(); return false; }
        });
      });
      return {
        async play() {
          await c.wait(600);
          if (over) {
            c.F.down([[150, 230]]); await c.wait(120);
            const d = c.ios ? rb(130, 280) : 0;
            if (c.ios) c.anim(content, [{ transform: ty(d) }], { ms: 600, easing: 'inout' });
            else { content.style.transformOrigin = '50% 0'; c.anim(content, [{ transform: 'scaleY(1.08)' }], { ms: 600, easing: 'inout' }); }
            await c.F.move([[150, 360]], 600);
            c.F.up();
            await c.done(c.anim(content, [{ transform: c.ios ? ty(0) : 'scaleY(1)' }], { hero: true }));
            await c.wait(900);
            return;
          }
          c.F.down([[150, 470]]); await c.wait(100);
          c.anim(content, [{ transform: ty(-110) }], { ms: 90, easing: 'linear' });
          await c.F.move([[150, 360]], 90, 'linear');
          c.F.up();
          content.getAnimations().forEach((a) => a.cancel());
          set(-110);
          await glide(-2.2);
          await c.wait(900);
          await c.done(c.anim(content, [{ transform: ty(0) }], { ms: 500, easing: 'inout' }));
          await c.wait(300);
        },
        interact() {
          let y0 = 0, stop = null;
          c.drag(view, {
            start: () => { stop && stop(); const m = c.hold(content); y0 = m.m42; y = y0; content.style.transform = ty(y0); },
            move: (dx, dy) => {
              let v = y0 + dy;
              if (c.ios) { if (v > 0) v = rb(v, 280); else if (v < minY) v = minY - rb(minY - v, 280); set(v); }
              else {
                if (v > 0 || v < minY) {
                  const b = v > 0 ? 0 : minY, o = Math.abs(v - b);
                  content.style.transformOrigin = v > 0 ? '50% 0' : '50% 100%';
                  y = b; content.style.transform = `${ty(b)} scaleY(${1 + rb(o, 300) / 700})`;
                } else set(v);
              }
            },
            end: (dx, dy, vx, vy) => {
              if (y > 0 || y < minY || /scaleY/.test(content.style.transform)) {
                const b = y > 0 ? 0 : y < minY ? minY : y;
                y = b;
                c.anim(content, [{ transform: `${ty(b)}${c.android ? ' scaleY(1)' : ''}` }], { hero: true });
                return;
              }
              if (Math.abs(vy) > 60) glide(vy / 1000);
            },
          });
        },
      };
    },
  },

  /* ------------------------------------------------ card tilt */
  tilt: {
    build(c) {
      c.html(`<div class="k-page">${nav('Wallet', { large: c.ios })}
        <div style="flex:1;display:grid;place-items:center;perspective:700px;padding-bottom:80px">
          <div class="tl-card" style="position:relative;width:220px;height:310px;border-radius:22px;overflow:hidden;box-shadow:0 18px 40px rgba(0,0,0,.25);cursor:grab;touch-action:none">${photo(5)}
            <div style="position:absolute;left:18px;top:18px;color:#fff;font-weight:800;letter-spacing:.12em;font-size:12px">MEMBER</div>
            <div style="position:absolute;left:18px;bottom:18px;color:#fff"><div style="font-size:12px;opacity:.85">Studio Four</div><div style="font-size:22px;font-weight:700">Ana Ruiz</div></div>
            <div class="tl-glare" style="position:absolute;inset:-40%;background:radial-gradient(circle at 50% 50%, rgba(255,255,255,.55), transparent 45%);opacity:0;pointer-events:none"></div>
          </div></div></div>`);
      const card = c.$('.tl-card'), glare = c.$('.tl-glare');
      const T = (dx, dy) => `rotateX(${-dy * 16}deg) rotateY(${dx * 16}deg) scale(1.03)`;
      const G = (dx, dy) => `translate(${dx * 30}%, ${dy * 30}%)`;
      const geo = () => c.pos(card);
      const at = (p, g) => [clamp((p[0] - g.x) / (g.w / 2), -1, 1), clamp((p[1] - g.y) / (g.h / 2), -1, 1)];
      return {
        async play() {
          await c.wait(600);
          const g = geo();
          const path = [[g.x - 80, g.y - 110], [g.x + 85, g.y + 115], [g.x + 85, g.y - 110], [g.x - 30, g.y + 40]];
          c.F.down([[g.x, g.y]]);
          await c.wait(120);
          const frames = [[g.x, g.y], ...path].map((p) => { const [dx, dy] = at(p, g); return { transform: T(dx, dy) }; });
          const gf = [[g.x, g.y], ...path].map((p) => { const [dx, dy] = at(p, g); return { transform: G(dx, dy), opacity: 0.4 + Math.hypot(dx, dy) * 0.3 }; });
          c.anim(card, frames, { ms: 1600, easing: 'inout' });
          c.anim(glare, gf, { ms: 1600, easing: 'inout' });
          await c.F.move([path], 1600);
          c.F.up();
          c.anim(glare, [{ opacity: 0 }], { ms: 300, easing: 'out' });
          await c.done(c.anim(card, [{ transform: 'rotateX(0deg) rotateY(0deg) scale(1)' }], { hero: true }));
          await c.wait(700);
        },
        interact() {
          let g = null;
          const set = (p) => { const [dx, dy] = at([p.x, p.y], g); card.style.transform = T(dx, dy); glare.style.transform = G(dx, dy); glare.style.opacity = 0.4 + Math.hypot(dx, dy) * 0.3; };
          c.drag(card, {
            start: (p) => { c.hold(card); c.hold(glare); g = geo(); set(p); },
            move: (dx, dy, p) => set(p),
            end: () => { c.anim(glare, [{ opacity: 0 }], { ms: 300, easing: 'out' }); c.anim(card, [{ transform: 'rotateX(0deg) rotateY(0deg) scale(1)' }], { hero: true }); },
            tap: () => { c.anim(glare, [{ opacity: 0 }], { ms: 300, easing: 'out' }); c.anim(card, [{ transform: 'rotateX(0deg) rotateY(0deg) scale(1)' }], { hero: true }); },
          });
        },
      };
    },
  },

  /* ------------------------------------------------ image pinch and drag */
  panZoom: {
    build(c) {
      const S = 2, lim = (W * S - W) / 2, limY = Math.max(0, (210 * S - 470) / 2);
      c.html(viewer(c, `<div class="pz-img" style="position:absolute;left:0;top:195px;width:${W}px;height:210px;transform:scale(${S});cursor:grab;touch-action:none">${photo(3)}</div>`,
        `<div style="position:absolute;left:50%;bottom:44px;transform:translateX(-50%);color:#fff;font-size:13px;font-weight:600;background:rgba(255,255,255,.16);padding:6px 12px;border-radius:14px">2.0× · drag to look around</div>`));
      const img = c.$('.pz-img');
      let x = 0, y = 0;
      const T = (xx, yy) => `translate(${xx}px, ${yy}px) scale(${S})`;
      const band = (v, l) => (v > l ? l + rb(v - l, 220) : v < -l ? -l - rb(-l - v, 220) : v);
      return {
        async play() {
          await c.wait(600);
          c.F.down([[160, 300]]); await c.wait(120);
          c.anim(img, [{ transform: T(-90, 0) }], { ms: 520, easing: 'inout' });
          await c.F.move([[70, 300]], 520);
          await c.wait(250);
          const raw = -90 + 250, shown = band(raw, lim);
          c.anim(img, [{ transform: T(shown, 0) }], { ms: 760, easing: 'inout' });
          await c.F.move([[250, 300]], 760);
          c.F.up();
          await c.done(c.anim(img, [{ transform: T(lim, 0) }], { hero: true }));
          await c.wait(900);
          await c.done(c.anim(img, [{ transform: T(0, 0) }], { ms: 450, easing: 'inout' }));
          await c.wait(300);
        },
        interact() {
          let x0 = 0, y0 = 0;
          c.drag(img, {
            start: () => { const m = c.hold(img); x0 = m.m41; y0 = m.m42; },
            move: (dx, dy) => { x = band(x0 + dx, lim); y = band(y0 + dy, limY); img.style.transform = T(x, y); },
            end: (dx, dy, vx, vy) => {
              const tx2 = clamp(x + vx * 0.15, -lim, lim), ty2 = clamp(y + vy * 0.15, -limY, limY);
              c.anim(img, [{ transform: T(tx2, ty2) }], { hero: true });
            },
          });
        },
      };
    },
  },
};
