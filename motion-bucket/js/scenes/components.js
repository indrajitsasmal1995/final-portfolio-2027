// Components and screen transitions.
import { W, H, clamp, lerp, rb, ty, tx, quiet } from './util.js';
import { ico, photo, row, rows, nav, tabbar, btn, sw, mailRow, av } from '../kit.js';

const settingsIcon = (name, color) => `<span style="width:30px;height:30px;border-radius:8px;background:${color};color:#fff;display:grid;place-items:center;flex:none">${ico(name, 17)}</span>`;
const androidIcon = (name) => `<span style="width:30px;display:grid;place-items:center;color:var(--s-ink-2);flex:none">${ico(name, 22)}</span>`;
const sIcon = (c, name, color) => (c.ios ? settingsIcon(name, color) : androidIcon(name));

function tabSwitch(c, bar, i, hero = true) {
  const tabs = [...bar.querySelectorAll('.k-tab')];
  const prev = tabs.findIndex((t) => t.classList.contains('on'));
  if (prev === i) return null;
  tabs.forEach((t, j) => t.classList.toggle('on', j === i));
  if (c.ios) {
    const icon = tabs[i].querySelector('.k-ico');
    return c.anim(icon, [{ transform: 'scale(0.8)' }, { transform: 'scale(1)' }], { hero });
  }
  if (prev >= 0) c.anim(tabs[prev].querySelector('.k-pill'), [{ opacity: 1 }, { opacity: 0 }], { ms: 120, easing: 'out' });
  return c.anim(tabs[i].querySelector('.k-pill'), [{ opacity: 0.4, transform: 'scaleX(0.3)' }, { opacity: 1, transform: 'scaleX(1)' }], { hero });
}

export default {
  /* ------------------------------------------------ bottom sheet */
  sheet: {
    build(c) {
      const v = c.variant, list = v === 3;
      c.root.style.background = '#000';
      c.html(`
        <div class="k-page sh-app" style="transform-origin:50% 0">${nav('Places', { large: true })}${rows(7, { chev: true })}</div>
        <div class="k-scrim"></div>
        <div class="k-sheet">
          <div class="k-grab"></div>
          <div style="padding:${c.ios ? 8 : 0}px 18px 12px;display:flex;justify-content:space-between;align-items:flex-start">
            <div><div class="k-h" style="font-size:20px">${list ? 'Nearby' : 'Coffee Lab'}</div><div class="k-sub">${list ? '12 places open now' : 'Open until 6 pm · 0.4 km'}</div></div>
            <span style="width:30px;height:30px;border-radius:50%;background:var(--s-surface-2);display:grid;place-items:center;color:var(--s-ink-2)">${ico('x', 16)}</span>
          </div>
          ${list ? `<div class="sh-list" style="flex:1;overflow:hidden"><div class="sh-inner">${rows(11, { start: 2 })}</div></div>` : `
          <div style="display:flex;gap:8px;padding:0 16px 14px">${btn(ico('send', 16) + 'Go', 'filled', 'style="flex:1.3;padding:0 10px"')}${btn('Call', 'tonal', 'style="flex:1;padding:0 10px"')}${btn('Save', 'tonal', 'style="flex:1;padding:0 10px"')}</div>
          <div style="display:grid;grid-template-columns:2fr 1fr;grid-template-rows:80px 80px;gap:4px;margin:0 16px;border-radius:14px;overflow:hidden"><div style="grid-row:span 2">${photo(0)}</div><div>${photo(1)}</div><div>${photo(2)}</div></div>
          <div style="padding:16px 18px;display:flex;flex-direction:column;gap:10px"><div class="k-bar" style="width:86%"></div><div class="k-bar" style="width:64%"></div><div class="k-bar" style="width:74%"></div></div>`}
        </div>`);
      const sheet = c.$('.k-sheet'), scrim = c.$('.k-scrim'), app = c.$('.sh-app');
      const D = { closed: H + 20, medium: 300, large: 56 };
      const scrimFor = (y) => (y <= D.medium ? lerp(0.1, 0.32, clamp((D.medium - y) / (D.medium - D.large))) : lerp(0, 0.1, clamp((D.closed - y) / (D.closed - D.medium))));
      const appFor = (y) => {
        if (!c.ios) return { transform: 'none', borderRadius: '0px' };
        const t = clamp((D.medium - y) / (D.medium - D.large));
        return { transform: `translateY(${t * 6}px) scale(${1 - 0.07 * t})`, borderRadius: `${t * 14}px` };
      };
      let y = c.mode === 'try' ? D.medium : D.closed;
      const paint = (yy) => { y = yy; sheet.style.transform = ty(yy); scrim.style.opacity = scrimFor(yy); Object.assign(app.style, appFor(yy)); };
      paint(y);
      const to = (yy, o = {}) => {
        y = yy;
        const a = c.anim(sheet, [{ transform: ty(yy) }], { hero: true, ...o });
        c.anim(scrim, [{ opacity: scrimFor(yy) }], o);
        c.anim(app, [appFor(yy)], o);
        return a;
      };
      const follow = (yy, ms, easing = 'inout') => {
        y = yy;
        c.anim(sheet, [{ transform: ty(yy) }], { ms, easing });
        c.anim(scrim, [{ opacity: scrimFor(yy) }], { ms, easing });
        c.anim(app, [appFor(yy)], { ms, easing });
      };
      const rowAt = (i) => c.pos(c.$$('.sh-app .k-row')[i]);
      return {
        async play() {
          await c.wait(450);
          const r = rowAt(1);
          await c.F.tap(r.x, r.y);
          if (v === 0 || v === 1) {
            await c.done(to(v === 0 ? D.medium : D.large));
            await c.wait(1400);
            await c.done(to(D.closed));
            return;
          }
          await c.done(to(D.medium));
          await c.wait(600);
          if (v === 2) {
            c.F.down([[150, D.medium + 16]]); await c.wait(140);
            follow(120, 520); await c.F.move([[150, 136]], 520); c.F.up();
            await c.done(to(D.large, { v0: 1.2 }));
            await c.wait(900);
            c.F.down([[150, D.large + 16]]); await c.wait(140);
            follow(240, 480); await c.F.move([[150, 256]], 480); c.F.up();
            await c.done(to(D.medium, { v0: 0.6 }));
            await c.wait(800);
            c.F.down([[150, D.medium + 16]]); await c.wait(120);
            follow(380, 150, 'in'); await c.F.move([[150, 396]], 150, 'in'); c.F.up();
            await c.done(to(D.closed, { v0: 3 }));
          } else {
            const inner = c.$('.sh-inner');
            c.F.down([[150, D.medium + 150]]); await c.wait(140);
            follow(D.large, 500); await c.F.move([[150, D.large + 150]], 500);
            c.anim(inner, [{ transform: ty(-160) }], { ms: 420, easing: 'inout' });
            await c.F.move([[150, D.large - 10]], 420); c.F.up();
            await c.done(c.anim(inner, [{ transform: ty(-220) }], { hero: true, v0: 1.5 }));
            await c.wait(900);
            c.anim(inner, [{ transform: ty(0) }], { ms: 360, easing: 'out' });
            await c.wait(380);
            await c.done(to(D.closed));
          }
        },
        interact() {
          c.$$('.sh-app .k-row').forEach((r) => c.tap(r, () => { if (y > D.medium + 10) to(D.medium); }));
          let y0 = 0;
          c.drag(sheet, {
            start: () => { y0 = c.hold(sheet).m42; c.hold(scrim); c.hold(app); },
            move: (dx, dy) => { let yy = y0 + dy; if (yy < D.large) yy = D.large - rb(D.large - yy, 140); paint(yy); },
            end: (dx, dy, vx, vy) => {
              const proj = y + vy * 0.2;
              const target = [D.large, D.medium, D.closed].reduce((a, b) => (Math.abs(b - proj) < Math.abs(a - proj) ? b : a));
              const dist = target - y;
              to(target, { v0: Math.abs(dist) > 2 ? vy / dist : 0 });
              if (target === D.closed) quiet(c.wait(900).then(() => to(D.medium)));
            },
          });
        },
      };
    },
  },

  /* ------------------------------------------------ card reveal */
  cardReveal: {
    build(c) {
      const v = c.variant;
      const labels = [['EDITORS’ PICK', 'Slow mornings'], ['NEW THIS WEEK', 'Weekend walks'], ['COLLECTION', 'Quiet places']];
      c.html(`<div class="k-page">${nav(c.ios ? 'Today' : 'For you', { large: c.ios })}
        <div style="padding:2px 16px 0;display:flex;flex-direction:column;gap:12px">
          ${labels.map(([k, t], i) => `<div class="k-card cr" style="height:${i === 0 ? 200 : 118}px;opacity:0;box-shadow:var(--s-shadow);border-radius:${c.ios ? 18 : 16}px">
            <div style="position:absolute;inset:0">${photo(i + 1)}</div>
            <div style="position:absolute;inset:0;background:linear-gradient(transparent 40%,rgba(0,0,0,.45))"></div>
            <div style="position:absolute;left:16px;bottom:14px;color:#fff">
              <div style="font-size:10.5px;font-weight:700;letter-spacing:.07em;opacity:.85">${k}</div>
              <div style="font-size:${i === 0 ? 23 : 18}px;font-weight:700;line-height:1.15">${t}</div>
            </div></div>`).join('')}
        </div></div>`);
      const cards = c.$$('.cr');
      const from = v === 1 ? { opacity: 0, transform: 'scale(0.86)' } : { opacity: 0, transform: 'translateY(46px)' };
      return {
        async play() {
          await c.wait(450);
          const a = cards.map((el, i) => c.anim(el, [from, { opacity: 1, transform: 'none' }], { hero: i === 0, delay: v === 2 ? i * 110 : v === 1 ? i * 50 : 0 }));
          await c.done(a[2]);
          await c.wait(1500);
          cards.forEach((el) => c.anim(el, [{ opacity: 0 }], { ms: 240, easing: 'out' }));
          await c.wait(350);
        },
      };
    },
  },

  /* ------------------------------------------------ card flip */
  cardFlip: {
    build(c) {
      const axis = c.variant === 1 ? 'rotateX' : 'rotateY';
      const facts = [['Holder', 'Ana Ruiz'], ['Valid until', '31 Dec'], ['Rides left', '7 of 10'], ['Zone', 'Harbour, North']];
      c.html(`<div class="k-page">${nav('Wallet', { large: c.ios })}
        <div style="flex:1;display:grid;place-items:center;perspective:900px;padding-bottom:70px">
          <div class="fl" style="position:relative;width:216px;height:300px;transform-style:preserve-3d;cursor:pointer">
            <div style="position:absolute;inset:0;-webkit-backface-visibility:hidden;backface-visibility:hidden;border-radius:20px;overflow:hidden;box-shadow:var(--s-shadow)">${photo(1)}
              <div style="position:absolute;left:18px;top:18px;color:#fff;font-weight:700;font-size:12px;letter-spacing:.1em">HARBOR LINE</div>
              <div style="position:absolute;left:18px;bottom:18px;color:#fff"><div style="font-size:12px;opacity:.85">Ferry pass</div><div style="font-size:24px;font-weight:700">10 rides</div></div>
              <div style="position:absolute;right:16px;bottom:18px;color:#fff;opacity:.9;font-size:11px">Tap to flip</div></div>
            <div style="position:absolute;inset:0;-webkit-backface-visibility:hidden;backface-visibility:hidden;border-radius:20px;background:var(--s-surface);box-shadow:var(--s-shadow);transform:${axis}(180deg);padding:18px;display:flex;flex-direction:column;gap:11px">
              <div class="k-h">Pass details</div>
              ${facts.map(([a, b]) => `<div style="display:flex;justify-content:space-between;font-size:13px"><span class="k-sub">${a}</span><span>${b}</span></div>`).join('')}
              <div style="margin-top:auto;align-self:center;width:104px;height:104px;border-radius:8px;background:repeating-conic-gradient(var(--s-ink) 0 25%, transparent 0 50%) 0 0/13px 13px;opacity:.85"></div>
            </div>
          </div></div></div>`);
      const card = c.$('.fl');
      let flipped = false;
      const flip = () => {
        flipped = !flipped;
        return c.anim(card, [{ transform: `${axis}(${flipped ? 0 : 180}deg)` }, { transform: `${axis}(${flipped ? 180 : 0}deg)` }], { hero: true });
      };
      return {
        async play() {
          await c.wait(500);
          const p = c.pos(card);
          await c.F.tap(p.x, p.y);
          await c.done(flip());
          await c.wait(1500);
          await c.F.tap(p.x, p.y);
          await c.done(flip());
          await c.wait(500);
        },
        interact() { c.tap(card, flip); },
      };
    },
  },

  /* ------------------------------------------------ accordion */
  accordion: {
    build(c) {
      const one = c.variant === 0;
      const data = [
        ['Shipping', 'Free over $50. Orders leave the studio within two working days and arrive in three to five.'],
        ['Returns', 'Send anything back within 30 days using the prepaid label in the box.'],
        ['Care', 'Hand wash in cool water. Dry flat, away from direct heat.'],
        ['Warranty', 'Two years on stitching and hardware. Keep your receipt.'],
      ];
      c.html(`<div class="k-page">${nav('Product', { back: 'Shop' })}
        <div style="padding:8px 16px 16px;display:flex;gap:14px;align-items:center"><div style="width:66px;height:66px;border-radius:12px;overflow:hidden;flex:none">${photo(4)}</div><div><div class="k-h">Dot grid notebook</div><div class="k-sub">A5 · 120 pages · $18</div></div></div>
        <div class="k-list">${data.map(([t, b], i) => `<div class="ac-i" style="${i ? 'border-top:0.5px solid var(--s-line)' : ''}">
          <div class="k-row ac-h" style="min-height:52px;cursor:pointer"><div class="k-tx"><div class="k-t1">${t}</div></div><span class="ac-chev" style="color:var(--s-ink-2);display:flex">${ico('chevD', 18)}</span></div>
          <div class="ac-b" style="height:0;overflow:hidden;background:var(--s-surface)"><div style="padding:0 16px 14px;font-size:13.5px;line-height:1.45;color:var(--s-ink-2)">${b}</div></div></div>`).join('')}</div></div>`);
      const items = c.$$('.ac-i'), open = items.map(() => false);
      const toggle = (i, hero = true) => {
        const it = items[i], body = it.querySelector('.ac-b'), chev = it.querySelector('.ac-chev');
        const h = body.firstElementChild.offsetHeight, cur = body.offsetHeight;
        open[i] = !open[i];
        body.getAnimations().forEach((a) => a.cancel());
        const a = c.anim(body, [{ height: cur + 'px' }, { height: (open[i] ? h : 0) + 'px' }], { hero });
        c.anim(chev, [{ transform: `rotate(${open[i] ? 0 : 180}deg)` }, { transform: `rotate(${open[i] ? 180 : 0}deg)` }]);
        if (one && open[i]) open.forEach((o, j) => { if (o && j !== i) toggle(j, false); });
        return a;
      };
      const head = (i) => c.pos(items[i].querySelector('.ac-h'));
      return {
        async play() {
          await c.wait(500);
          let p = head(0); await c.F.tap(p.x, p.y); toggle(0);
          await c.wait(1200);
          p = head(2); await c.F.tap(p.x, p.y); toggle(2);
          await c.wait(1300);
          p = head(2); await c.F.tap(p.x, p.y); await c.done(toggle(2));
          if (open[0]) { await c.wait(300); await c.done(toggle(0)); }
          await c.wait(500);
        },
        interact() { items.forEach((it, i) => c.tap(it.querySelector('.ac-h'), () => toggle(i))); },
      };
    },
  },

  /* ------------------------------------------------ chips */
  chips: {
    build(c) {
      const single = c.variant === 1;
      const names = ['Open now', 'Outdoor seats', 'Wi-Fi', 'Quiet', 'Pet friendly', 'Late hours', 'Top rated'];
      c.html(`<div class="k-page">${nav('Explore', { large: c.ios })}
        <div class="k-chips" style="padding:4px 16px 8px">${names.map((n, i) => `<span class="k-chip" data-i="${i}"><span class="k-chip-fill"></span>${c.android ? `<span class="k-chip-check">${ico('check', 16)}</span>` : ''}${n}</span>`).join('')}</div>
        <div class="k-section">Results <span class="cnt">· 24</span></div>
        ${rows(5, { start: 3 })}</div>`);
      const chips = c.$$('.k-chip'), on = chips.map(() => false);
      const set = (i, val, hero = true) => {
        const ch = chips[i];
        on[i] = val;
        ch.classList.toggle('on', val);
        const fill = ch.querySelector('.k-chip-fill'), chk = ch.querySelector('.k-chip-check');
        const a = c.anim(fill, [{ opacity: val ? 0 : 1, transform: val ? 'scale(0.55)' : 'none' }, { opacity: val ? 1 : 0, transform: 'none' }], { hero });
        if (chk) c.anim(chk, [{ width: val ? '0px' : '22px' }, { width: val ? '22px' : '0px' }]);
        c.anim(ch, [{ transform: 'scale(0.92)' }, { transform: 'scale(1)' }]);
        c.$('.cnt').textContent = '· ' + Math.max(3, 24 - on.filter(Boolean).length * 6);
        return a;
      };
      const press = (i) => {
        if (single) {
          if (on[i]) return;
          on.forEach((o, j) => { if (o) set(j, false, false); });
          set(i, true);
        } else set(i, !on[i]);
      };
      return {
        async play() {
          await c.wait(500);
          for (const i of single ? [0, 3, 1] : [0, 2, 4, 2]) {
            const p = c.pos(chips[i]);
            await c.F.tap(p.x, p.y);
            press(i);
            await c.wait(750);
          }
          await c.wait(400);
        },
        interact() { chips.forEach((ch, i) => c.tap(ch, () => press(i))); },
      };
    },
  },

  /* ------------------------------------------------ context menu (appear + lift) */
  contextMenu: {
    build(c) {
      const lift = c.item.id === 'context-menu-lift';
      const byButton = !lift && c.variant === 1;
      const items = [['Copy', 'copy'], ['Share', 'share'], ['Favourite', 'heart'], ['Delete', 'trash']];
      const more = c.ios ? `<span class="k-navbtn cm-more">${ico('more', 24)}</span>` : `<span class="k-ib cm-more">${ico('more', 22)}</span>`;
      c.html(`<div class="k-page">${nav('Library', { large: c.ios, right: more })}
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;padding:0 16px">${[0, 1, 2, 3, 4, 5].map((i) => `<div class="cm-ph" data-i="${i}" style="height:118px;border-radius:12px;overflow:hidden;cursor:pointer">${photo(i)}</div>`).join('')}</div>
        </div>
        <div class="cm-blur" style="position:absolute;inset:0;z-index:15;opacity:0;pointer-events:none;${c.ios ? '-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px);background:rgba(0,0,0,.14)' : 'background:rgba(0,0,0,.18)'}"></div>
        <div class="cm-lift" style="position:absolute;z-index:16;display:none;border-radius:12px;overflow:hidden;box-shadow:0 16px 40px rgba(0,0,0,.28)"></div>
        <div class="k-menu cm-menu" style="opacity:0;pointer-events:none">${items.map(([t, ic], i) => `<div class="k-mi ${i === 3 ? 'danger' : ''}"><span>${t}</span>${ico(ic, 18)}</div>`).join('')}</div>`);
      const blur = c.$('.cm-blur'), lifted = c.$('.cm-lift'), menu = c.$('.cm-menu');
      let state = null;
      const menuH = c.ios ? 176 : 200;
      const open = (target) => {
        if (state) return;
        const menuAnim = [{ opacity: 0, transform: 'scale(0.4)' }, { opacity: 1, transform: 'scale(1)' }];
        if (byButton) {
          const b = c.pos(c.$('.cm-more'));
          Object.assign(menu.style, { right: '12px', left: 'auto', top: b.t + b.h + 4 + 'px', transformOrigin: 'top right', pointerEvents: 'auto' });
          state = { target: null };
          c.anim(blur, [{ opacity: 0.4 }], { ms: 200, easing: 'out' });
          return c.anim(menu, menuAnim, { hero: true });
        }
        const r = c.pos(target);
        target.style.visibility = 'hidden';
        lifted.innerHTML = photo(+target.dataset.i);
        Object.assign(lifted.style, { display: 'block', left: r.l + 'px', top: r.t + 'px', width: r.w + 'px', height: r.h + 'px' });
        const s = lift ? 1.12 : 1.04;
        const below = r.t + r.h * (1 + (s - 1) / 2) + 10;
        const fits = below + menuH < H - 30;
        const top = fits ? below : r.t - r.h * ((s - 1) / 2) - 10 - menuH;
        const left = clamp(r.l, 12, W - 12 - (c.ios ? 214 : 190));
        Object.assign(menu.style, { left: left + 'px', right: 'auto', top: top + 'px', transformOrigin: fits ? 'top left' : 'bottom left', pointerEvents: 'auto' });
        state = { target };
        blur.style.pointerEvents = 'auto';
        c.anim(blur, [{ opacity: 0 }, { opacity: 1 }], { ms: 260, easing: 'out' });
        const a = c.anim(lifted, [{ transform: 'scale(0.97)' }, { transform: `scale(${s})` }], { hero: true });
        c.anim(menu, menuAnim, { delay: 40 });
        return a;
      };
      const close = () => {
        if (!state) return null;
        const { target } = state;
        state = null;
        menu.style.pointerEvents = 'none';
        blur.style.pointerEvents = 'none';
        c.anim(menu, [{ opacity: 0, transform: 'scale(0.7)' }], { ms: 170, easing: 'in' });
        c.anim(blur, [{ opacity: 0 }], { ms: 220, easing: 'out' });
        if (!target) return null;
        const a = c.anim(lifted, [{ transform: 'scale(1)' }], { hero: true });
        a.finished.then(() => { lifted.style.display = 'none'; target.style.visibility = ''; }).catch(() => {});
        return a;
      };
      const photos = c.$$('.cm-ph');
      return {
        async play() {
          await c.wait(500);
          if (byButton) {
            const b = c.pos(c.$('.cm-more'));
            await c.F.tap(b.x, b.y);
            await c.done(open());
            await c.wait(1300);
            const mi = c.pos(menu.children[1]);
            await c.F.tap(mi.x, mi.y);
            close();
            await c.wait(600);
            return;
          }
          const t = photos[2], p = c.pos(t);
          c.F.down([[p.x, p.y]]);
          c.anim(t, [{ transform: 'scale(0.96)' }], { ms: 420, easing: 'out' });
          await c.wait(460);
          t.style.transform = '';
          open(t);
          c.F.up();
          await c.wait(1600);
          await c.F.tap(W / 2, 80);
          await c.done(close());
          await c.wait(500);
        },
        interact() {
          if (byButton) c.tap(c.$('.cm-more'), () => (state ? close() : open()));
          let timer = 0;
          photos.forEach((ph) => {
            c.on(ph, 'pointerdown', () => {
              c.anim(ph, [{ transform: 'scale(0.96)' }], { ms: 420, easing: 'out' });
              timer = setTimeout(() => { ph.getAnimations().forEach((a) => a.cancel()); ph.style.transform = ''; if (!byButton) open(ph); }, 450);
            });
            const cancel = () => { clearTimeout(timer); if (!state || state.target !== ph) c.anim(ph, [{ transform: 'scale(1)' }], { ms: 200, easing: 'out' }); };
            c.on(ph, 'pointerup', cancel);
            c.on(ph, 'pointerleave', cancel);
          });
          c.on(blur, 'pointerdown', () => close());
          [...menu.children].forEach((mi) => c.tap(mi, () => close()));
        },
      };
    },
  },

  /* ------------------------------------------------ toggle */
  toggle: {
    build(c) {
      const bouncy = c.item.id === 'toggle-micro-bounce';
      const single = bouncy || c.variant === 0;
      if (single) {
        c.html(`<div class="k-page">${nav('Display', { back: 'Settings' })}
          <div style="flex:1;display:grid;place-items:center;padding-bottom:90px">
            <div style="display:flex;flex-direction:column;align-items:center;gap:20px">
              <div class="tg-orb" style="width:100px;height:100px;border-radius:50%;display:grid;place-items:center;background:var(--s-surface-2);color:var(--s-ink-2);transition:background .3s,color .3s">${ico('moon', 42)}</div>
              <div style="text-align:center"><div class="k-h">Night shift</div><div class="k-sub tg-state">Off</div></div>
              <div style="transform:scale(1.75);margin-top:16px">${sw(false)}</div>
            </div></div></div>`);
      } else {
        const list = [['Wi-Fi', 'wifi', '#007AFF', true], ['Bluetooth', 'bt', '#007AFF', false], ['Do Not Disturb', 'moon', '#5856D6', false], ['Low Power', 'bolt', '#FF9500', false], ['Notifications', 'bell', '#FF3B30', true]];
        c.html(`<div class="k-page">${nav('Settings', { large: c.ios })}<div class="k-section">Connectivity</div>
          <div class="k-list">${list.map(([t, ic, col, on]) => `<div class="k-row" style="min-height:52px">${sIcon(c, ic, col)}<div class="k-tx"><div class="k-t1">${t}</div></div>${sw(on)}</div>`).join('')}</div></div>`);
      }
      const sws = c.$$('.k-switch'), st = sws.map((s) => s.classList.contains('on'));
      const knobT = (on, pressed) => (c.ios ? `translateX(${on ? (pressed ? 12 : 20) : 0}px)` : `translateX(${on ? 20 : 0}px) scale(${pressed ? 1.17 : on ? 1 : 0.667})`);
      sws.forEach((s, i) => { s.querySelector('.k-knob').style.transform = knobT(st[i]); });
      const press = (i) => {
        const k = sws[i].querySelector('.k-knob');
        c.hold(k);
        c.anim(k, [{ transform: knobT(st[i], true), width: c.ios ? '35px' : '24px' }], { ms: 140, easing: 'out' });
      };
      const flip = (i, hero = true) => {
        const s = sws[i], k = s.querySelector('.k-knob'), f = s.querySelector('.k-sw-fill');
        st[i] = !st[i];
        s.classList.toggle('on', st[i]);
        c.hold(k);
        const a = c.anim(k, [{ transform: knobT(st[i]), width: c.ios ? '27px' : '24px' }], { hero });
        c.anim(f, [{ opacity: st[i] ? 0 : 1 }, { opacity: st[i] ? 1 : 0 }], { ms: 220, easing: 'out' });
        if (single) {
          c.$('.tg-state').textContent = st[i] ? 'On until 7 am' : 'Off';
          const orb = c.$('.tg-orb');
          orb.style.background = st[i] ? 'var(--s-orange)' : 'var(--s-surface-2)';
          orb.style.color = st[i] ? '#fff' : 'var(--s-ink-2)';
        }
        return a;
      };
      return {
        async play() {
          await c.wait(500);
          const seq = single ? [0, 0] : [1, 2, 0];
          for (const i of seq) {
            const p = c.pos(sws[i]);
            if (bouncy || c.android) {
              c.F.down([[p.x, p.y]]); press(i); await c.wait(bouncy ? 260 : 120); c.F.up();
            } else await c.F.tap(p.x, p.y);
            flip(i);
            await c.wait(single ? 1300 : 800);
          }
        },
        interact() {
          sws.forEach((s, i) => {
            const target = single ? s : s.closest('.k-row');
            c.drag(target, { start: () => press(i), tap: () => flip(i), end: () => flip(i) });
          });
        },
      };
    },
  },

  /* ------------------------------------------------ FAB menu */
  fabMenu: {
    build(c) {
      const ext = c.variant === 1;
      const notes = [['Groceries', 'Oat milk, lemons, bread'], ['Trip ideas', 'Ridge Trail, the north pier at dusk'], ['Gift list', 'Notebook for Ana'], ['Books', 'Two to finish before June'], ['Recipes', 'Miso aubergine, rice'], ['Plants', 'Repot the fern'], ['Errands', 'Return the lamp']];
      const items = [['Text note', 'pen'], ['Checklist', 'list'], ['Photo', 'camera'], ['Voice memo', 'mic']];
      c.html(`<div class="k-page">${nav(c.ios ? 'Notes' : 'Notes', { large: c.ios, menu: true })}
          <div class="fm-list" style="display:flex;flex-direction:column;gap:8px;padding:0 14px">${notes.map(([t, s]) => `<div class="k-card" style="padding:12px 14px;box-shadow:none;border:${c.ios ? 0 : 1}px solid var(--s-line)"><div class="k-t1">${t}</div><div class="k-t2">${s}</div></div>`).join('')}</div></div>
        <div class="k-scrim fm-scrim" style="z-index:5"></div>
        ${ext ? `<div class="k-fab fm-ext" style="right:16px;bottom:38px;width:auto;display:flex;align-items:center;padding:0 18px 0 16px;column-gap:10px">${ico('pen', 22)}<span class="fm-l" style="font-weight:600;font-size:15px;white-space:nowrap;overflow:hidden;display:inline-block">New note</span></div>`
          : `${items.map(([t, ic], i) => `<div class="fm-it" style="position:absolute;right:26px;bottom:${112 + i * 54}px;display:flex;align-items:center;gap:12px;opacity:0;z-index:6;transform-origin:right center">
              <span style="background:var(--s-surface);padding:7px 11px;border-radius:9px;font-size:13.5px;font-weight:500;box-shadow:0 2px 8px rgba(0,0,0,.16)">${t}</span>
              <span style="width:42px;height:42px;border-radius:${c.ios ? 21 : 12}px;background:var(--s-surface);color:var(--s-accent);display:grid;place-items:center;box-shadow:0 2px 8px rgba(0,0,0,.18)">${ico(ic, 20)}</span></div>`).join('')}
            <div class="k-fab fm-fab" style="right:18px;bottom:38px;transition:background .25s,color .25s">${ico('plus', 26)}</div>`}`);
      if (ext) {
        const fab = c.$('.fm-ext'), label = c.$('.fm-l'), list = c.$('.fm-list');
        const fullW = label.offsetWidth;
        let extended = true;
        const set = (e) => {
          extended = e;
          c.anim(label, [{ maxWidth: (e ? 0 : fullW) + 'px', opacity: e ? 0 : 1 }, { maxWidth: (e ? fullW : 0) + 'px', opacity: e ? 1 : 0 }], { hero: true });
          return c.anim(fab, [{ columnGap: e ? '0px' : '10px', paddingLeft: e ? '17px' : '16px', paddingRight: e ? '17px' : '18px' }, { columnGap: e ? '10px' : '0px', paddingLeft: e ? '16px' : '17px', paddingRight: e ? '18px' : '17px' }]);
        };
        return {
          async play() {
            await c.wait(600);
            c.F.down([[150, 420]]); await c.wait(100);
            c.anim(list, [{ transform: ty(-150) }], { ms: 520, easing: 'out' });
            await c.F.move([[150, 300]], 300, 'out'); c.F.up();
            await c.done(set(false));
            await c.wait(1200);
            c.F.down([[150, 300]]); await c.wait(100);
            c.anim(list, [{ transform: ty(0) }], { ms: 520, easing: 'out' });
            await c.F.move([[150, 420]], 300, 'out'); c.F.up();
            await c.done(set(true));
            await c.wait(700);
          },
          interact() { c.tap(fab, () => set(!extended)); },
        };
      }
      const fab = c.$('.fm-fab'), icon = fab.querySelector('.k-ico'), scrim = c.$('.fm-scrim'), its = c.$$('.fm-it');
      let open = false;
      const set = (o) => {
        open = o;
        scrim.style.pointerEvents = o ? 'auto' : 'none';
        if (c.android) { fab.style.background = o ? 'var(--s-accent)' : ''; fab.style.color = o ? 'var(--s-on-accent)' : ''; }
        c.anim(scrim, [{ opacity: o ? 0.28 : 0 }], { ms: 220, easing: 'out' });
        its.forEach((it, i) => c.anim(it, [
          { opacity: o ? 0 : 1, transform: o ? 'translateY(18px) scale(0.6)' : 'none' },
          { opacity: o ? 1 : 0, transform: o ? 'none' : 'translateY(10px) scale(0.85)' },
        ], o ? { delay: i * 45 } : { ms: 160, easing: 'in', delay: (3 - i) * 20 }));
        return c.anim(icon, [{ transform: `rotate(${o ? 0 : 45}deg)` }, { transform: `rotate(${o ? 45 : 0}deg)` }], { hero: true });
      };
      return {
        async play() {
          await c.wait(500);
          const p = c.pos(fab);
          await c.F.tap(p.x, p.y);
          set(true);
          await c.wait(1500);
          await c.F.tap(p.x, p.y);
          await c.done(set(false));
          await c.wait(500);
        },
        interact() {
          c.tap(fab, () => set(!open));
          c.on(scrim, 'pointerdown', () => open && set(false));
          its.forEach((it) => c.tap(it, () => set(false)));
        },
      };
    },
  },

  /* ------------------------------------------------ dropdown */
  dropdown: {
    build(c) {
      const opts = ['Distance', 'Rating', 'Price, low to high', 'Newest'];
      c.html(`<div class="k-page">${nav('Search', { large: c.ios })}
        <div style="padding:4px 16px 4px;position:relative;z-index:12">
          <div class="k-sub" style="margin:0 0 6px 2px">Sort by</div>
          <div class="k-input dd-field" style="justify-content:space-between;cursor:pointer"><span class="dd-val">Distance</span><span class="dd-chev" style="color:var(--s-ink-2);display:flex">${ico('chevD', 18)}</span></div>
          <div class="k-menu dd-menu" style="left:16px;right:16px;width:auto;top:${c.ios ? 78 : 86}px;transform-origin:top center;opacity:0;pointer-events:none">${opts.map((o, i) => `<div class="k-mi dd-o" style="flex-direction:row;justify-content:space-between"><span>${o}</span><span class="dd-ck" style="color:var(--s-accent);display:${i === 0 ? 'flex' : 'none'}">${ico('check', 18)}</span></div>`).join('')}</div>
        </div>
        <div class="k-section">24 places</div>${rows(5)}</div>`);
      const field = c.$('.dd-field'), menu = c.$('.dd-menu'), chev = c.$('.dd-chev'), val = c.$('.dd-val'), os = c.$$('.dd-o');
      let open = false;
      const set = (o) => {
        open = o;
        menu.style.pointerEvents = o ? 'auto' : 'none';
        field.style.boxShadow = o ? 'inset 0 0 0 2px var(--s-accent)' : '';
        c.anim(chev, [{ transform: `rotate(${o ? 0 : 180}deg)` }, { transform: `rotate(${o ? 180 : 0}deg)` }]);
        return c.anim(menu, [{ opacity: o ? 0 : 1, transform: o ? 'translateY(-8px) scaleY(0.6)' : 'none' }, { opacity: o ? 1 : 0, transform: o ? 'none' : 'translateY(-6px) scaleY(0.8)' }], o ? { hero: true } : { hero: true, ms: 170, easing: 'in' });
      };
      const pick = async (i) => {
        val.textContent = opts[i];
        c.$$('.dd-ck').forEach((k, j) => { k.style.display = j === i ? 'flex' : 'none'; });
        c.anim(os[i], [{ background: 'var(--s-accent-soft)' }, { background: 'transparent' }], { ms: 300, easing: 'out' });
        await c.wait(140);
        set(false);
      };
      return {
        async play() {
          await c.wait(500);
          const f = c.pos(field);
          await c.F.tap(f.x, f.y);
          set(true);
          await c.wait(1000);
          if (c.variant === 0) {
            const o = c.pos(os[2]);
            await c.F.tap(o.x, o.y);
            await pick(2);
          } else {
            await c.F.tap(140, 470);
            set(false);
          }
          await c.wait(900);
        },
        interact() {
          c.tap(field, () => set(!open));
          os.forEach((o, i) => c.tap(o, () => quiet(pick(i))));
          c.tap(c.root, (e) => { if (open && !e.target.closest('.dd-menu, .dd-field')) set(false); });
        },
      };
    },
  },

  /* ------------------------------------------------ inline banner */
  banner: {
    build(c) {
      const overlay = c.variant === 1;
      const B = `<div style="display:flex;gap:10px;align-items:flex-start;padding:12px 12px 12px 14px;border-radius:12px;background:var(--s-accent-cont);color:var(--s-on-accent-cont)">${ico('wifi', 18)}<div style="flex:1;font-size:13.5px;line-height:1.35"><b style="font-weight:600">You’re offline.</b> Changes will sync when you reconnect.</div><span class="bn-x" style="opacity:.7;cursor:pointer">${ico('x', 18)}</span></div>`;
      c.html(`<div class="k-page">${nav('Inbox', { large: c.ios, menu: true })}
        ${overlay ? '' : `<div class="bn-wrap" style="height:0;overflow:hidden;flex:none"><div class="bn-in" style="padding:2px 14px 10px">${B}</div></div>`}
        <div>${[0, 1, 2, 3, 4, 5].map((i) => mailRow(i)).join('')}</div>
        ${overlay ? `<div class="bn-ov" style="position:absolute;left:12px;right:12px;top:${c.ios ? 98 : 102}px;z-index:5;border-radius:12px;box-shadow:var(--s-shadow);opacity:0;transform:translateY(-120px)">${B}</div>` : ''}</div>`);
      const show = (on) => {
        if (overlay) return c.anim(c.$('.bn-ov'), [{ opacity: on ? 1 : 0, transform: on ? 'none' : 'translateY(-120px)' }], { hero: true });
        const wrap = c.$('.bn-wrap'), h = c.$('.bn-in').offsetHeight;
        c.anim(c.$('.bn-in'), [{ opacity: on ? 0 : 1, transform: on ? 'translateY(-12px)' : 'none' }, { opacity: on ? 1 : 0, transform: on ? 'none' : 'translateY(-12px)' }]);
        return c.anim(wrap, [{ height: (on ? 0 : h) + 'px' }, { height: (on ? h : 0) + 'px' }], { hero: true });
      };
      return {
        async play() {
          await c.wait(700);
          await c.done(show(true));
          await c.wait(1900);
          const x = c.pos(c.$('.bn-x'));
          await c.F.tap(x.x, x.y);
          await c.done(show(false));
          await c.wait(500);
        },
      };
    },
  },

  /* ------------------------------------------------ push / pop */
  push: {
    build(c) {
      const startPushed = c.variant === 1;
      const items = [['General', 'gear', '#8E8E93'], ['Display', 'image', '#007AFF'], ['Sounds', 'music', '#FF2D55'], ['Privacy', 'lock', '#5856D6'], ['Battery', 'bolt', '#34C759']];
      c.html(`<div class="k-page ps-a">${nav('Settings', { large: c.ios })}<div class="k-list">${items.map(([t, ic, col], i) => `<div class="k-row ps-r" data-i="${i}" style="min-height:52px;cursor:pointer">${sIcon(c, ic, col)}<div class="k-tx"><div class="k-t1">${t}</div></div>${c.ios ? `<span class="k-chev">${ico('chevR', 16)}</span>` : ''}</div>`).join('')}</div></div>
        <div class="ps-dim" style="position:absolute;inset:0;background:#000;opacity:0;pointer-events:none;z-index:1"></div>
        <div class="k-page ps-b" style="z-index:2;${c.ios ? 'box-shadow:-12px 0 30px rgba(0,0,0,.14)' : ''}">${nav('Display', { back: 'Settings' })}
          <div class="k-section">Appearance</div>
          <div class="k-list"><div class="k-row" style="min-height:52px"><div class="k-tx"><div class="k-t1">Dark mode</div></div>${sw(true)}</div><div class="k-row" style="min-height:52px"><div class="k-tx"><div class="k-t1">Text size</div></div><span class="k-sub">Default</span></div></div>
          <div class="k-section">Brightness</div>
          <div class="k-list"><div class="k-row" style="min-height:52px;gap:10px">${ico('image', 16)}<div style="flex:1;height:4px;border-radius:2px;background:linear-gradient(to right,var(--s-accent) 62%,var(--s-surface-2) 62%)"></div>${ico('image', 22)}</div></div></div>`);
      const a = c.$('.ps-a'), b = c.$('.ps-b'), dim = c.$('.ps-dim');
      const S = (pushed) => (c.ios
        ? { a: { transform: pushed ? tx(-W * 0.3) : 'none' }, b: { transform: pushed ? 'none' : tx(W + 20) }, d: { opacity: pushed ? 0.1 : 0 } }
        : { a: { transform: pushed ? tx(-W * 0.22) : 'none', opacity: pushed ? 0 : 1 }, b: { transform: pushed ? 'none' : tx(W * 0.22), opacity: pushed ? 1 : 0 }, d: { opacity: 0 } });
      let pushed = startPushed;
      const s0 = S(pushed);
      Object.assign(a.style, s0.a); Object.assign(b.style, s0.b); Object.assign(dim.style, s0.d);
      const go = (p) => {
        pushed = p;
        const s = S(p);
        c.anim(a, [s.a]); c.anim(dim, [s.d]);
        return c.anim(b, [s.b], { hero: true });
      };
      const back = () => c.pos(c.$('.ps-b [data-act="back"]'));
      const rowP = () => c.pos(c.$$('.ps-r')[1]);
      return {
        async play() {
          await c.wait(500);
          if (!startPushed) {
            let p = rowP(); await c.F.tap(p.x, p.y); await c.done(go(true));
            await c.wait(1300);
            p = back(); await c.F.tap(p.x, p.y); await c.done(go(false));
          } else {
            let p = back(); await c.F.tap(p.x, p.y); await c.done(go(false));
            await c.wait(1300);
            p = rowP(); await c.F.tap(p.x, p.y); await c.done(go(true));
          }
          await c.wait(500);
        },
        interact() {
          c.$$('.ps-r').forEach((r) => c.tap(r, () => !pushed && go(true)));
          c.tap(c.$('.ps-b [data-act="back"]'), () => pushed && go(false));
        },
      };
    },
  },

  /* ------------------------------------------------ modal */
  modal: {
    build(c) {
      const v = c.variant;
      const openBtn = c.ios ? `<span class="k-navbtn md-open">${ico('pen', 21)}</span>` : `<span class="k-ib md-open">${ico('pen', 22)}</span>`;
      const sheetTop = c.ios ? 50 : 0;
      const sheet = `<div class="md-sheet" style="position:absolute;left:0;right:0;top:${sheetTop}px;bottom:0;z-index:10;background:var(--s-sheet);border-radius:${c.ios ? '12px 12px 0 0' : '0'};box-shadow:0 -4px 30px rgba(0,0,0,.18);display:flex;flex-direction:column;padding-top:${c.ios ? 0 : 36}px">
          <div style="display:flex;align-items:center;justify-content:space-between;height:52px;padding:0 14px">
            ${c.ios ? '<span class="k-navbtn md-close" style="padding:0">Cancel</span><b style="font-size:16px">New message</b><span class="k-navbtn md-close" style="padding:0;font-weight:600">Send</span>' : `<span class="k-ib md-close">${ico('x', 22)}</span><span style="flex:1;font-size:20px;padding-left:6px">New message</span><span class="k-ib md-close" style="color:var(--s-accent)">${ico('send', 22)}</span>`}
          </div>
          ${['To', 'Subject'].map((l, i) => `<div style="display:flex;gap:8px;padding:12px 16px;border-bottom:0.5px solid var(--s-line);font-size:14.5px"><span class="k-sub" style="font-size:14.5px">${l}</span><span>${i === 0 ? 'Maya Chen' : 'Saturday'}</span></div>`).join('')}
          <div style="padding:16px;display:flex;flex-direction:column;gap:10px"><div class="k-bar" style="width:90%"></div><div class="k-bar" style="width:76%"></div><div class="k-bar" style="width:52%"></div></div>
        </div>`;
      const dialog = c.ios
        ? `<div class="md-dlg" style="position:absolute;left:50%;top:50%;width:250px;margin:-75px 0 0 -125px;z-index:10;border-radius:14px;overflow:hidden;background:var(--s-menu);-webkit-backdrop-filter:blur(24px);backdrop-filter:blur(24px);text-align:center;opacity:0">
            <div style="padding:18px 16px 16px"><div style="font-weight:600;font-size:16px">Delete all mail?</div><div style="font-size:13px;margin-top:4px;color:var(--s-ink-2)">This can’t be undone.</div></div>
            <div style="display:flex;border-top:0.5px solid var(--s-line)"><span class="md-close" style="flex:1;padding:12px;color:var(--s-accent);font-size:16px;cursor:pointer">Cancel</span><span class="md-close" style="flex:1;padding:12px;color:var(--s-danger);font-size:16px;font-weight:600;border-left:0.5px solid var(--s-line);cursor:pointer">Delete</span></div></div>`
        : `<div class="md-dlg" style="position:absolute;left:28px;right:28px;top:50%;margin-top:-90px;z-index:10;border-radius:28px;background:var(--s-surface-3);padding:24px;opacity:0">
            <div style="font-size:22px">Delete all mail?</div><div style="font-size:14px;margin-top:14px;color:var(--s-ink-2);line-height:1.45">Every message in this inbox will be removed. This can’t be undone.</div>
            <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:22px;color:var(--s-accent);font-weight:500;font-size:14px"><span class="md-close" style="padding:10px 12px;cursor:pointer">Cancel</span><span class="md-close" style="padding:10px 12px;cursor:pointer">Delete</span></div></div>`;
      c.root.style.background = '#000';
      c.html(`<div class="k-page md-app" style="transform-origin:50% 0">${nav('Inbox', { large: c.ios, right: openBtn })}${[0, 1, 2, 3, 4, 5].map((i) => mailRow(i)).join('')}
          ${v === 2 ? `<div style="position:absolute;left:16px;right:16px;bottom:40px">${btn('Delete all', 'tonal', 'style="width:100%;color:var(--s-danger)" data-del')}</div>` : ''}</div>
        <div class="k-scrim"></div>${v === 2 ? dialog : sheet}`);
      const app = c.$('.md-app'), scrim = c.$('.k-scrim');
      if (v === 2) {
        const dlg = c.$('.md-dlg');
        let shown = false;
        const set = (on) => {
          shown = on;
          dlg.style.pointerEvents = on ? 'auto' : 'none';
          c.anim(scrim, [{ opacity: on ? (c.ios ? 0.3 : 0.32) : 0 }], { ms: 250, easing: 'out' });
          const from = c.ios ? 'scale(1.18)' : 'scale(0.82)';
          return c.anim(dlg, on ? [{ opacity: 0, transform: from }, { opacity: 1, transform: 'none' }] : [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: c.ios ? 'scale(0.96)' : 'scale(0.92)' }], on ? { hero: true } : { hero: true, ms: 180, easing: 'in' });
        };
        return {
          async play() {
            await c.wait(500);
            const p = c.pos(c.$('[data-del]'));
            await c.F.tap(p.x, p.y);
            await c.done(set(true));
            await c.wait(1500);
            const x = c.pos(c.$$('.md-close')[0]);
            await c.F.tap(x.x, x.y);
            await c.done(set(false));
            await c.wait(500);
          },
          interact() {
            c.tap(c.$('[data-del]'), () => !shown && set(true));
            c.$$('.md-close').forEach((b) => c.tap(b, () => shown && set(false)));
          },
        };
      }
      const sh = c.$('.md-sheet');
      const S = (on) => ({
        s: { transform: on ? 'none' : ty(H) },
        a: c.ios ? { transform: on ? 'translateY(14px) scale(0.92)' : 'none', borderRadius: on ? '12px' : '0px' } : { transform: 'none' },
        sc: { opacity: on && c.ios ? 0.12 : 0 },
      });
      let shown = v === 1;
      const s0 = S(shown);
      Object.assign(sh.style, s0.s); Object.assign(app.style, s0.a); Object.assign(scrim.style, s0.sc);
      const set = (on) => {
        shown = on;
        const s = S(on);
        c.anim(app, [s.a]); c.anim(scrim, [s.sc]);
        return c.anim(sh, [s.s], { hero: true });
      };
      return {
        async play() {
          await c.wait(500);
          const o = () => c.pos(c.$('.md-open')), x = () => c.pos(c.$('.md-close'));
          if (v === 0) {
            let p = o(); await c.F.tap(p.x, p.y); await c.done(set(true));
            await c.wait(1500);
            p = x(); await c.F.tap(p.x, p.y); await c.done(set(false));
          } else {
            let p = x(); await c.F.tap(p.x, p.y); await c.done(set(false));
            await c.wait(1300);
            p = o(); await c.F.tap(p.x, p.y); await c.done(set(true));
          }
          await c.wait(500);
        },
        interact() {
          c.tap(c.$('.md-open'), () => !shown && set(true));
          c.$$('.md-close').forEach((b) => c.tap(b, () => shown && set(false)));
        },
      };
    },
  },

  /* ------------------------------------------------ full screen overlay */
  overlay: {
    build(c) {
      const reveal = c.variant === 0;
      const recent = ['Coffee near me', 'Ridge Trail parking', 'Ferry times', 'Bookshops open late', 'Night Market menu'];
      c.html(`<div class="k-page">${nav('Discover', { large: c.ios })}${rows(6)}</div>
        <div class="k-fab ov-btn" style="right:18px;bottom:38px">${ico('search', 24)}</div>
        <div class="ov" style="position:absolute;inset:0;z-index:20;background:var(--s-bg);padding-top:var(--sb);display:flex;flex-direction:column;visibility:hidden">
          <div style="display:flex;align-items:center;gap:8px;padding:8px 12px 8px 14px"><div class="k-input" style="flex:1;height:40px;gap:8px;color:var(--s-ink-2)">${ico('search', 18)}<span style="font-size:14.5px">Search places</span><span class="k-caret" style="display:inline-block"></span></div><span class="ov-x k-navbtn" style="padding:0 4px">${c.ios ? 'Cancel' : ico('x', 22)}</span></div>
          <div class="k-section">Recent</div>
          <div class="k-list">${recent.map((t) => `<div class="k-row" style="min-height:46px"><span style="color:var(--s-ink-3);display:flex">${ico('search', 16)}</span><div class="k-tx"><div class="k-t1" style="font-weight:400">${t}</div></div></div>`).join('')}</div>
        </div>`);
      const ov = c.$('.ov'), fab = c.$('.ov-btn');
      const f = { x: W - 18 - 28, y: H - 38 - 28 }, R = Math.hypot(f.x, f.y) + 10;
      let open = false;
      const set = (on) => {
        open = on;
        ov.style.visibility = 'visible';
        ov.style.pointerEvents = on ? 'auto' : 'none';
        c.anim(fab, [{ opacity: on ? 0 : 1, transform: on ? 'scale(0.6)' : 'none' }], { ms: 160, easing: 'out' });
        let a;
        if (reveal) {
          const k = (r) => ({ clipPath: `circle(${r}px at ${f.x}px ${f.y}px)` });
          a = c.anim(ov, on ? [k(0), k(R)] : [k(R), k(0)], { hero: true });
        } else {
          ov.style.transformOrigin = `${f.x}px ${f.y}px`;
          a = c.anim(ov, on ? [{ opacity: 0, transform: 'scale(0.85)' }, { opacity: 1, transform: 'none' }] : [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'scale(0.85)' }], { hero: true });
        }
        return a;
      };
      return {
        async play() {
          await c.wait(500);
          await c.F.tap(f.x, f.y);
          await c.done(set(true));
          await c.wait(1500);
          const x = c.pos(c.$('.ov-x'));
          await c.F.tap(x.x, x.y);
          await c.done(set(false));
          await c.wait(500);
        },
        interact() {
          c.tap(fab, () => !open && set(true));
          c.tap(c.$('.ov-x'), () => open && set(false));
        },
      };
    },
  },

  /* ------------------------------------------------ fade through */
  fadeThrough: {
    build(c) {
      const pages = [
        `${nav('Photos', { large: c.ios })}<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:2px">${Array.from({ length: 15 }, (_, i) => `<div style="aspect-ratio:1">${photo(i)}</div>`).join('')}</div>`,
        `${nav('Albums', { large: c.ios })}<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;padding:0 16px">${['Trips', 'Family', 'Food', 'Pets'].map((t, i) => `<div><div style="aspect-ratio:1;border-radius:10px;overflow:hidden">${photo(i + 2)}</div><div class="k-t1" style="font-size:14px;margin-top:6px">${t}</div><div class="k-t2">${[124, 86, 41, 233][i]} items</div></div>`).join('')}</div>`,
        `${nav('Search', { large: c.ios })}<div style="padding:0 16px 10px"><div class="k-input" style="height:40px;gap:8px;color:var(--s-ink-2)">${ico('search', 18)}Places, people, things</div></div><div class="k-section">Suggested</div>${rows(4, { start: 5 })}`,
      ];
      c.html(`<div style="position:absolute;inset:0">${pages.map((p, i) => `<div class="k-page ft-p" style="opacity:${i ? 0 : 1};visibility:${i ? 'hidden' : 'visible'}">${p}</div>`).join('')}</div>${tabbar([['Photos', 'image'], ['Albums', 'folder'], ['Search', 'search']], 0)}`);
      const ps = c.$$('.ft-p'), bar = c.$('.k-tabbar, .k-navbar'), tabs = c.$$('.k-tab');
      let cur = 0;
      const go = (i) => {
        if (i === cur) return null;
        const out = ps[cur], inn = ps[i], d = c.m.ms;
        cur = i;
        tabSwitch(c, bar, i, false);
        inn.style.visibility = 'visible';
        c.anim(out, [{ opacity: 1 }, { opacity: 0 }], { ms: d * 0.3, easing: 'linear' });
        return c.anim(inn, [{ opacity: 0, transform: 'scale(0.92)' }, { opacity: 1, transform: 'none' }], { hero: true, delay: d * 0.3, ms: d * 0.7 });
      };
      return {
        async play() {
          await c.wait(500);
          for (const i of [1, 2, 0]) {
            const p = c.pos(tabs[i]);
            await c.F.tap(p.x, p.y);
            go(i);
            await c.wait(1300);
          }
        },
        interact() { tabs.forEach((t, i) => c.tap(t, () => go(i))); },
      };
    },
  },

  /* ------------------------------------------------ shared axis X / Y */
  sharedAxis: {
    build(c) {
      const ax = c.variant === 1 ? 'Y' : 'X';
      const steps = [['Pick your places', 'Save cafés, trails and shops you want to visit.'], ['Plan the day', 'Drag places into a route that fits your time.'], ['Go together', 'Share the plan and see who is coming.']];
      c.html(`<div class="k-page">
          <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 18px"><span class="k-sub sa-n">Step 1 of 3</span><span class="k-navbtn" style="padding:0">Skip</span></div>
          <div style="position:relative;flex:1;overflow:hidden">${steps.map(([t, s], i) => `<div class="sa-s" style="position:absolute;inset:0;padding:10px 24px;display:flex;flex-direction:column;gap:14px;opacity:${i ? 0 : 1}">
            <div style="height:250px;border-radius:24px;overflow:hidden">${photo(i + 1)}</div>
            <div style="font-size:24px;font-weight:700;line-height:1.15;margin-top:8px">${t}</div><div class="k-sub" style="font-size:14.5px;line-height:1.45">${s}</div></div>`).join('')}</div>
          <div style="display:flex;gap:10px;padding:14px 18px 40px">${btn('Back', 'tonal', 'style="flex:1" data-b')}${btn('Next', 'filled', 'style="flex:1.4" data-n')}</div></div>`);
      const S = c.$$('.sa-s');
      let cur = 0;
      const D = 34, t = (d) => `translate${ax}(${d}px)`;
      const go = (dir) => {
        const next = cur + dir;
        if (next < 0 || next > 2) return null;
        const out = S[cur], inn = S[next], d = c.m.ms;
        cur = next;
        c.$('.sa-n').textContent = `Step ${cur + 1} of 3`;
        c.anim(out, [{ transform: 'none' }, { transform: t(-dir * D) }]);
        c.anim(out, [{ opacity: 1 }, { opacity: 0 }], { ms: d * 0.35, easing: 'linear' });
        c.anim(inn, [{ opacity: 0 }, { opacity: 1 }], { ms: d * 0.65, delay: d * 0.35, easing: 'linear' });
        return c.anim(inn, [{ transform: t(dir * D) }, { transform: 'none' }], { hero: true });
      };
      const nb = () => c.pos(c.$('[data-n]')), bb = () => c.pos(c.$('[data-b]'));
      return {
        async play() {
          await c.wait(500);
          for (const dir of [1, 1, -1]) {
            const p = dir > 0 ? nb() : bb();
            await c.F.tap(p.x, p.y);
            go(dir);
            await c.wait(1200);
          }
        },
        interact() {
          c.tap(c.$('[data-n]'), () => go(1));
          c.tap(c.$('[data-b]'), () => go(-1));
        },
      };
    },
  },

  /* ------------------------------------------------ shared axis Z (context cue) */
  sharedAxisZ: {
    build(c) {
      const startChild = c.variant === 1;
      const folders = [['Projects', 12], ['Invoices', 8], ['Photos', 341], ['Recipes', 23], ['Travel', 17]];
      c.html(`<div class="k-page sz-p" style="opacity:${startChild ? 0 : 1};transform:${startChild ? 'scale(1.1)' : 'none'}">${nav('Files', { large: c.ios })}<div class="k-list">${folders.map(([t, n], i) => `<div class="k-row sz-f" data-i="${i}" style="min-height:54px;cursor:pointer"><span style="color:var(--s-accent);display:flex">${ico('folder', 26)}</span><div class="k-tx"><div class="k-t1">${t}</div><div class="k-t2">${n} items</div></div>${c.ios ? `<span class="k-chev">${ico('chevR', 16)}</span>` : ''}</div>`).join('')}</div></div>
        <div class="k-page sz-c" style="opacity:${startChild ? 1 : 0};transform:${startChild ? 'none' : 'scale(0.8)'};pointer-events:${startChild ? 'auto' : 'none'}">${nav('Projects', { back: 'Files' })}
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;padding:6px 16px">${['Brand refresh', 'Shop photos', 'Menu cards', 'Signage'].map((t, i) => `<div><div style="aspect-ratio:1.1;border-radius:12px;overflow:hidden">${photo(i + 1)}</div><div class="k-t1" style="font-size:13.5px;margin-top:6px">${t}</div><div class="k-t2">Edited ${i + 2}d ago</div></div>`).join('')}</div></div>`);
      const P = c.$('.sz-p'), C = c.$('.sz-c');
      let deep = startChild;
      const go = (forward) => {
        deep = forward;
        const d = c.m.ms;
        C.style.pointerEvents = forward ? 'auto' : 'none';
        if (forward) {
          c.anim(P, [{ transform: 'none' }, { transform: 'scale(1.1)' }]);
          c.anim(P, [{ opacity: 1 }, { opacity: 0 }], { ms: d * 0.35, easing: 'linear' });
          c.anim(C, [{ opacity: 0 }, { opacity: 1 }], { ms: d * 0.65, delay: d * 0.35, easing: 'linear' });
          return c.anim(C, [{ transform: 'scale(0.8)' }, { transform: 'none' }], { hero: true });
        }
        c.anim(C, [{ transform: 'none' }, { transform: 'scale(0.8)' }]);
        c.anim(C, [{ opacity: 1 }, { opacity: 0 }], { ms: d * 0.35, easing: 'linear' });
        c.anim(P, [{ opacity: 0 }, { opacity: 1 }], { ms: d * 0.65, delay: d * 0.35, easing: 'linear' });
        return c.anim(P, [{ transform: 'scale(1.1)' }, { transform: 'none' }], { hero: true });
      };
      const fp = () => c.pos(c.$$('.sz-f')[0]), bp = () => c.pos(c.$('.sz-c [data-act="back"]'));
      return {
        async play() {
          await c.wait(500);
          for (const fwd of startChild ? [false, true] : [true, false]) {
            const p = fwd ? fp() : bp();
            await c.F.tap(p.x, p.y);
            await c.done(go(fwd));
            await c.wait(1200);
          }
        },
        interact() {
          c.$$('.sz-f').forEach((f) => c.tap(f, () => !deep && go(true)));
          c.tap(c.$('.sz-c [data-act="back"]'), () => deep && go(false));
        },
      };
    },
  },

  /* ------------------------------------------------ tabs */
  tabs: {
    build(c) {
      const seg = c.variant === 0;
      const names = ['Today', 'This week', 'Saved'];
      const segW = (W - 32 - 4) / 3;
      const head = seg
        ? `<div class="tb-seg" style="position:relative;margin:4px 16px 12px;height:34px;border-radius:${c.ios ? 9 : 17}px;background:var(--s-surface-2);display:flex;padding:2px">
            <div class="tb-thumb" style="position:absolute;left:2px;top:2px;bottom:2px;width:${segW}px;border-radius:${c.ios ? 7 : 15}px;background:${c.ios ? 'var(--s-surface)' : 'var(--s-sec-cont)'};box-shadow:${c.ios ? '0 2px 6px rgba(0,0,0,.12)' : 'none'}"></div>
            ${names.map((n, i) => `<div class="tb-t" data-i="${i}" style="flex:1;position:relative;display:grid;place-items:center;font-size:13px;font-weight:${c.ios ? 600 : 500};cursor:pointer">${n}</div>`).join('')}</div>`
        : `<div class="tb-row" style="position:relative;display:flex;border-bottom:1px solid var(--s-line);margin-bottom:6px">${names.map((n, i) => `<div class="tb-t" data-i="${i}" style="flex:1;text-align:center;padding:12px 0;font-size:14px;font-weight:500;cursor:pointer;color:${i ? 'var(--s-ink-2)' : 'var(--s-accent)'}">${n}</div>`).join('')}
            <div class="tb-ind" style="position:absolute;bottom:-1px;left:0;height:3px;border-radius:3px 3px 0 0;background:var(--s-accent)"></div></div>`;
      c.html(`<div class="k-page">${nav('Activity', { large: c.ios })}${head}
        <div style="flex:1;position:relative;overflow:hidden"><div class="tb-strip" style="position:absolute;top:0;bottom:0;left:0;width:${W * 3}px;display:flex">${[0, 3, 6].map((s) => `<div style="width:${W}px">${rows(6, { start: s })}</div>`).join('')}</div></div></div>`);
      const strip = c.$('.tb-strip'), ts = c.$$('.tb-t');
      const indGeo = (i) => { const r = c.pos(ts[i]); const w = 44; return { left: r.l + r.w / 2 - w / 2, w }; };
      if (!seg) { const g = indGeo(0); Object.assign(c.$('.tb-ind').style, { left: '0px', width: g.w + 'px', transform: tx(g.left) }); }
      let cur = 0;
      const go = (i) => {
        if (i === cur) return null;
        cur = i;
        c.anim(strip, [{ transform: tx(-i * W) }]);
        if (seg) return c.anim(c.$('.tb-thumb'), [{ transform: tx(i * segW) }], { hero: true });
        ts.forEach((t, j) => { t.style.color = j === i ? 'var(--s-accent)' : 'var(--s-ink-2)'; });
        const g = indGeo(i);
        return c.anim(c.$('.tb-ind'), [{ transform: tx(g.left) }], { hero: true });
      };
      return {
        async play() {
          await c.wait(500);
          for (const i of [1, 2, 0]) {
            const p = c.pos(ts[i]);
            await c.F.tap(p.x, p.y);
            go(i);
            await c.wait(1200);
          }
        },
        interact() { ts.forEach((t, i) => c.tap(t, () => go(i))); },
      };
    },
  },

  /* ------------------------------------------------ pager */
  pager: {
    build(c) {
      const pages = [['Find good places', 'Cafés, trails and late bookshops near you.'], ['Make a plan', 'Line up a day that fits the time you have.'], ['Bring friends', 'Share it and see who is in.']];
      c.html(`<div class="k-page">
        <div style="flex:1;position:relative;overflow:hidden;margin-top:10px"><div class="pg-strip" style="position:absolute;top:0;bottom:0;left:0;width:${W * 3}px;display:flex">${pages.map(([t, s], i) => `<div style="width:${W}px;padding:10px 24px;display:flex;flex-direction:column;gap:14px"><div style="height:290px;border-radius:26px;overflow:hidden">${photo(i + 3)}</div><div style="font-size:24px;font-weight:700;margin-top:6px">${t}</div><div class="k-sub" style="font-size:14.5px;line-height:1.45">${s}</div></div>`).join('')}</div></div>
        <div style="display:flex;justify-content:center;gap:8px;padding:6px 0 18px">${[0, 1, 2].map((i) => `<span class="pg-d" style="width:8px;height:8px;border-radius:4px;background:${i ? 'var(--s-ink-3)' : 'var(--s-accent)'};transition:background .25s"></span>`).join('')}</div>
        <div style="padding:0 18px 42px">${btn('Get started', 'filled', 'style="width:100%"')}</div></div>`);
      const strip = c.$('.pg-strip'), dots = c.$$('.pg-d');
      let x = 0, idx = 0;
      const setDots = () => dots.forEach((d, i) => { d.style.background = i === idx ? 'var(--s-accent)' : 'var(--s-ink-3)'; });
      const snap = (i, v0 = 0) => { idx = clamp(i, 0, 2); const from = x; x = -idx * W; setDots(); return c.anim(strip, [{ transform: tx(x) }], { hero: true, v0: x !== from ? v0 : 0 }); };
      const follow = (nx, ms, e = 'inout') => { x = nx; return c.anim(strip, [{ transform: tx(nx) }], { ms, easing: e }); };
      return {
        async play() {
          await c.wait(600);
          for (const target of [1, 2]) {
            c.F.down([[220, 300]]); await c.wait(100);
            follow(x - 130, 420); await c.F.move([[90, 300]], 420); c.F.up();
            await c.done(snap(target, 1.2));
            await c.wait(1000);
          }
          c.F.down([[70, 300]]); await c.wait(90);
          follow(x + 90, 150, 'linear'); await c.F.move([[160, 300]], 150, 'linear'); c.F.up();
          await c.done(snap(1, 3));
          await c.wait(700);
        },
        interact() {
          let x0 = 0;
          c.drag(c.$('.pg-strip').parentElement, {
            start: () => { x0 = c.hold(strip).m41; x = x0; },
            move: (dx) => {
              let nx = x0 + dx;
              if (nx > 0) nx = rb(nx, 200); else if (nx < -2 * W) nx = -2 * W - rb(-2 * W - nx, 200);
              x = nx; strip.style.transform = tx(nx);
            },
            end: (dx, dy, vx) => {
              const proj = x + vx * 0.22;
              const t = clamp(Math.round(-proj / W), idx - 1, idx + 1);
              const dist = -clamp(t, 0, 2) * W - x;
              snap(t, Math.abs(dist) > 2 ? vx / dist : 0);
            },
          });
        },
      };
    },
  },
};
