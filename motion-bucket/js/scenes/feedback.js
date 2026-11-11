// Feedback & status, and navigation patterns.
import { W, H, clamp, lerp, rb, ty, tx, quiet, dragScroll } from './util.js';
import { ico, photo, row, rows, nav, tabbar, btn, field, mailRow, av, spinner, PLACES } from '../kit.js';
import { impulseAt } from '../motion.js';

const cssVar = (c, name) => getComputedStyle(c.root).getPropertyValue(name).trim();

export default {
  /* ------------------------------------------------ toast / snackbar */
  toast: {
    build(c) {
      const action = c.variant === 0;
      const msg = action ? 'Conversation archived' : 'Link copied';
      const t = c.ios
        ? `<div class="k-pilltoast to-t" style="opacity:0;transform:translateX(-50%) translateY(-90px);${action ? '' : 'padding-right:16px'}">${ico(action ? 'archive' : 'check', 18)}<span>${msg}</span>${action ? '<b class="to-undo">Undo</b>' : ''}</div>`
        : `<div class="k-snack to-t" style="opacity:0;transform:translateY(90px)"><span>${msg}</span>${action ? '<b class="to-undo">Undo</b>' : ''}</div>`;
      const share = c.ios ? `<span class="k-navbtn to-share">${ico('share', 20)}</span>` : `<span class="k-ib to-share">${ico('share', 22)}</span>`;
      c.html(`<div class="k-page">${nav('Inbox', { large: c.ios, menu: true, right: share })}
        <div>${[0, 1, 2, 3, 4, 5].map((i) => `<div class="to-r" style="overflow:hidden;position:relative">${mailRow(i)}<span class="to-arc" style="position:absolute;right:14px;top:50%;transform:translateY(-50%);color:var(--s-ink-2);display:${action ? 'flex' : 'none'};cursor:pointer">${ico('archive', 19)}</span></div>`).join('')}</div></div>${t}`);
      const toast = c.$('.to-t'), first = c.$('.to-r');
      const hidden = c.ios ? 'translateX(-50%) translateY(-90px)' : 'translateY(90px)';
      const shown = c.ios ? 'translateX(-50%) translateY(0px)' : 'translateY(0px)';
      let up = false;
      const show = (on) => { up = on; return c.anim(toast, [{ opacity: on ? 1 : 0, transform: on ? shown : hidden }], on ? { hero: true } : { hero: true, ms: 200, easing: 'in' }); };
      const archive = (on) => {
        const h = first.firstElementChild.offsetHeight;
        return c.anim(first, [{ height: (on ? h : 0) + 'px', opacity: on ? 1 : 0 }, { height: (on ? 0 : h) + 'px', opacity: on ? 0 : 1 }], { ms: 260, easing: 'inout' });
      };
      return {
        async play() {
          await c.wait(600);
          if (action) {
            const p = c.pos(c.$('.to-arc'));
            await c.F.tap(p.x, p.y);
            await c.done(archive(true));
            await c.done(show(true));
            await c.wait(1600);
            const u = c.pos(c.$('.to-undo'));
            await c.F.tap(u.x, u.y);
            show(false);
            await c.done(archive(false));
          } else {
            const p = c.pos(c.$('.to-share'));
            await c.F.tap(p.x, p.y);
            await c.done(show(true));
            await c.wait(1800);
            await c.done(show(false));
          }
          await c.wait(600);
        },
      };
    },
  },

  /* ------------------------------------------------ progress */
  progress: {
    build(c) {
      const v = c.variant;
      const card = (inner) => `<div class="k-page">${nav('Updates', { large: c.ios })}<div style="padding:8px 16px">${inner}</div></div>`;
      if (v === 0) {
        c.html(card(`<div class="k-card" style="padding:16px;box-shadow:none">
          <div style="display:flex;gap:12px;align-items:center"><div style="width:54px;height:54px;border-radius:13px;overflow:hidden;flex:none">${photo(1)}</div><div class="k-tx"><div class="k-t1">Field Notes</div><div class="k-t2 pr-l">Waiting…</div></div><span class="pr-pct" style="font-weight:600;font-size:14px">0%</span></div>
          <div style="margin-top:16px;height:${c.ios ? 5 : 4}px;border-radius:3px;background:var(--s-surface-2);overflow:hidden"><div class="pr-f" style="height:100%;background:var(--s-accent);transform-origin:left;transform:scaleX(0);border-radius:3px"></div></div></div>
          ${rows(3, { start: 4 })}`));
        const f = c.$('.pr-f'), l = c.$('.pr-l'), pct = c.$('.pr-pct');
        return {
          async play() {
            await c.wait(500);
            for (const p of [0.18, 0.46, 0.73, 1]) {
              l.textContent = p < 1 ? `${(9.8 * p).toFixed(1)} of 9.8 MB` : 'Installed';
              pct.textContent = Math.round(p * 100) + '%';
              await c.done(c.anim(f, [{ transform: `scaleX(${p})` }], { hero: true }));
              await c.wait(450);
            }
            await c.wait(900);
          },
        };
      }
      if (v === 1) {
        const C = 2 * Math.PI * 44;
        c.html(card(`<div style="display:grid;place-items:center;padding:30px 0 20px"><div style="position:relative;width:120px;height:120px">
          <svg width="120" height="120" viewBox="0 0 120 120" style="transform:rotate(-90deg)"><circle cx="60" cy="60" r="44" stroke="var(--s-surface-2)" stroke-width="10" fill="none"/><circle class="pr-ring" cx="60" cy="60" r="44" stroke="var(--s-accent)" stroke-width="10" fill="none" stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="${C}"/></svg>
          <div class="pr-pct" style="position:absolute;inset:0;display:grid;place-items:center;font-size:24px;font-weight:700">0%</div></div>
          <div class="k-sub" style="margin-top:14px">Backing up 342 photos</div></div>`));
        const ring = c.$('.pr-ring'), pct = c.$('.pr-pct');
        return {
          async play() {
            await c.wait(500);
            for (const p of [0.22, 0.5, 0.81, 1]) {
              pct.textContent = Math.round(p * 100) + '%';
              await c.done(c.anim(ring, [{ strokeDashoffset: C * (1 - p) }], { hero: true }));
              await c.wait(450);
            }
            await c.wait(900);
          },
        };
      }
      c.html(card(`<div style="display:flex;flex-direction:column;align-items:center;gap:26px;padding:40px 0">
        <div style="transform:scale(1.6)">${spinner()}</div>
        <div style="width:100%;height:4px;border-radius:2px;background:var(--s-surface-2);overflow:hidden;position:relative"><div class="pr-seg" style="position:absolute;top:0;bottom:0;left:0;width:40%;background:var(--s-accent);border-radius:2px;transform:translateX(-100%)"></div></div>
        <div class="k-sub">Connecting to the studio…</div></div>`));
      const seg = c.$('.pr-seg');
      return {
        async play() {
          await c.wait(400);
          for (let i = 0; i < 3; i++) {
            await c.done(c.anim(seg, [{ transform: 'translateX(-100%)' }, { transform: 'translateX(250%)' }], { hero: true, ms: Math.max(600, c.m.ms * 2) }));
          }
          await c.wait(300);
        },
      };
    },
  },

  /* ------------------------------------------------ button loading */
  btnLoading: {
    build(c) {
      const BW = W - 40;
      c.html(`<div class="k-page">${nav('Checkout', { back: 'Bag' })}
        <div class="k-list" style="margin-top:8px">${[['Subtotal', '$22.00'], ['Shipping', 'Free'], ['Tax', '$2.00'], ['Total', '$24.00']].map(([a, b], i) => `<div class="k-row" style="min-height:48px"><div class="k-tx"><div class="k-t1" style="font-weight:${i === 3 ? 600 : 400}">${a}</div></div><span style="font-weight:${i === 3 ? 700 : 400}">${b}</span></div>`).join('')}</div>
        <div class="bl-b k-btn k-filled" style="position:absolute;left:50%;bottom:44px;width:${BW}px;height:52px;transform:translateX(-50%);border-radius:${c.ios ? 14 : 26}px;padding:0">
          <span class="bl-l" style="display:flex;align-items:center;gap:8px">Pay $24.00</span>
          <span class="bl-s" style="position:absolute;opacity:0;color:currentColor">${c.ios ? '<span class="k-spin-ios" style="color:#fff"><i style="transform:rotate(0deg);opacity:.25"></i><i style="transform:rotate(45deg);opacity:.35"></i><i style="transform:rotate(90deg);opacity:.45"></i><i style="transform:rotate(135deg);opacity:.55"></i><i style="transform:rotate(180deg);opacity:.65"></i><i style="transform:rotate(225deg);opacity:.75"></i><i style="transform:rotate(270deg);opacity:.85"></i><i style="transform:rotate(315deg);opacity:.95"></i></span>' : '<svg class="k-spin-md" viewBox="0 0 48 48" style="color:currentColor;width:26px;height:26px"><circle cx="24" cy="24" r="18" fill="none" stroke="currentColor" stroke-width="4.5" stroke-linecap="round" stroke-dasharray="80 200"/></svg>'}</span></div></div>`);
      const b = c.$('.bl-b'), l = c.$('.bl-l'), s = c.$('.bl-s');
      const ok = cssVar(c, '--s-ok');
      let busy = false;
      const run = async () => {
        if (busy) return;
        busy = true;
        c.anim(l, [{ opacity: 0 }], { ms: 120, easing: 'out' });
        await c.done(c.anim(b, [{ width: '52px', borderRadius: '26px' }], { hero: true }));
        c.anim(s, [{ opacity: 1 }], { ms: 150, easing: 'out' });
        await c.wait(1400);
        c.anim(s, [{ opacity: 0 }], { ms: 120, easing: 'out' });
        l.innerHTML = `${ico('check', 20)}Paid`;
        c.anim(b, [{ background: ok }], { ms: 200, easing: 'out' });
        c.anim(l, [{ opacity: 0, transform: 'scale(0.7)' }, { opacity: 1, transform: 'none' }], { delay: 80 });
        await c.done(c.anim(b, [{ width: BW + 'px', borderRadius: (c.ios ? 14 : 26) + 'px' }], { hero: true }));
        await c.wait(1300);
        l.innerHTML = 'Pay $24.00';
        c.anim(b, [{ background: cssVar(c, '--s-accent') }], { ms: 250, easing: 'out' });
        busy = false;
      };
      return {
        async play() {
          await c.wait(600);
          const p = c.pos(b);
          await c.F.tap(p.x, p.y);
          await run();
          await c.wait(400);
        },
        interact() { c.tap(b, () => quiet(run())); },
      };
    },
  },

  /* ------------------------------------------------ error shake */
  shake: {
    build(c) {
      c.html(`<div class="k-page" style="padding-left:20px;padding-right:20px">
        <div style="margin:40px 0 26px;display:flex;flex-direction:column;align-items:center;gap:10px"><div style="width:62px;height:62px;border-radius:16px;background:var(--s-accent);color:var(--s-on-accent);display:grid;place-items:center">${ico('book', 30)}</div><div style="font-size:24px;font-weight:700">Welcome back</div></div>
        <div style="display:flex;flex-direction:column;gap:14px">${field('Email', 'ana@fieldnotes.co')}
        <div class="sh-f">${field('Password', '••••••••', { cls: 'sh-pw' })}<div class="sh-err" style="height:0;overflow:hidden"><div style="color:var(--s-danger);font-size:12.5px;padding:6px 2px 0">Incorrect password. Try again.</div></div></div></div>
        <div style="margin-top:26px">${btn('Sign in', 'filled', 'style="width:100%" data-go')}</div>
        <div class="k-sub" style="text-align:center;margin-top:16px;color:var(--s-accent)">Forgot password?</div></div>`);
      const pw = c.$('.sh-pw'), err = c.$('.sh-err'), go = c.$('[data-go]');
      const shake = () => {
        pw.classList.add('error');
        const h = err.firstElementChild.offsetHeight;
        c.anim(err, [{ height: '0px' }, { height: h + 'px' }], { ms: 220, easing: 'out' });
        const sp = c.spec;
        if (sp.type === 'spring') {
          const f = impulseAt(sp.k, sp.z), w0 = Math.sqrt(sp.k), dur = Math.min(1600, (Math.log(200) / (Math.min(sp.z, 0.95) * w0)) * 1000);
          const n = 48, frames = Array.from({ length: n + 1 }, (_, i) => ({ transform: tx(i === n ? 0 : 14 * f((i / n) * (dur / 1000))) }));
          return c.anim(pw, frames, { hero: true, easing: 'linear', ms: dur });
        }
        return c.anim(pw, [0, -14, 14, -10, 10, -6, 6, -2, 0].map((x) => ({ transform: tx(x) })), { hero: true });
      };
      const clear = () => {
        pw.classList.remove('error');
        c.anim(err, [{ height: '0px' }], { ms: 200, easing: 'out' });
      };
      return {
        async play() {
          await c.wait(600);
          const p = c.pos(go);
          await c.F.tap(p.x, p.y);
          await c.done(shake());
          await c.wait(1400);
          clear();
          await c.wait(500);
        },
        interact() { c.tap(go, () => { clear(); setTimeout(shake, 30); }); },
      };
    },
  },

  /* ------------------------------------------------ success check */
  check: {
    build(c) {
      c.html(`<div class="k-page" style="align-items:center;justify-content:center;padding-bottom:60px;cursor:pointer">
        <div style="position:relative;width:120px;height:120px">
          ${Array.from({ length: 8 }, (_, i) => `<i class="ck-dot" style="position:absolute;left:56px;top:56px;width:8px;height:8px;border-radius:50%;background:var(--s-ok);opacity:0;--a:${i * 45}deg"></i>`).join('')}
          <div class="ck-c" style="position:absolute;inset:0;border-radius:50%;background:var(--s-ok);transform:scale(0)"></div>
          <svg width="120" height="120" viewBox="0 0 120 120" style="position:absolute;inset:0"><path class="ck-p" d="M38 62 L54 77 L84 45" stroke="#fff" stroke-width="10" fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="70" stroke-dashoffset="70"/></svg>
        </div>
        <div class="ck-t" style="text-align:center;margin-top:26px;opacity:0"><div style="font-size:22px;font-weight:700">Payment sent</div><div class="k-sub" style="margin-top:4px">$24.00 to Field Notes</div></div></div>`);
      const circ = c.$('.ck-c'), path = c.$('.ck-p'), text = c.$('.ck-t'), dots = c.$$('.ck-dot');
      const run = async () => {
        circ.style.transform = 'scale(0)'; path.style.strokeDashoffset = 70; text.style.opacity = 0;
        const a = c.anim(circ, [{ transform: 'scale(0)' }, { transform: 'scale(1)' }], { hero: true });
        c.anim(path, [{ strokeDashoffset: 70 }, { strokeDashoffset: 0 }], { ms: 320, easing: 'out', delay: Math.min(260, c.m.ms * 0.4) });
        dots.forEach((d, i) => {
          const ang = (i * 45 * Math.PI) / 180;
          c.anim(d, [{ opacity: 1, transform: 'translate(0,0) scale(1)' }, { opacity: 0, transform: `translate(${Math.cos(ang) * 82}px, ${Math.sin(ang) * 82}px) scale(0.4)` }], { ms: 600, easing: 'out', delay: 120 });
        });
        c.anim(text, [{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }], { ms: 360, easing: 'out', delay: 250 });
        await c.done(a);
      };
      return {
        async play() { await c.wait(500); await run(); await c.wait(1800); },
        interact() { c.tap(c.root, () => quiet(run())); quiet(run()); },
      };
    },
  },

  /* ------------------------------------------------ haptic ripple */
  haptic: {
    build(c) {
      const lvl = c.variant;
      c.html(`<div class="k-page">${nav('Haptics', { back: 'Sounds' })}
        <div style="flex:1;display:grid;place-items:center;padding-bottom:80px"><div style="position:relative;width:130px;height:130px">
          <div class="hp-rings" style="position:absolute;inset:0"></div>
          <div class="hp-pad" style="position:absolute;inset:0;border-radius:50%;background:var(--s-accent);color:var(--s-on-accent);display:grid;place-items:center;font-weight:600;font-size:17px;cursor:pointer;box-shadow:0 10px 30px rgba(0,0,0,.18)">Tap</div></div></div>
        <div class="k-sub" style="text-align:center;padding-bottom:60px">${['Light', 'Medium', 'Heavy'][lvl]} impact</div></div>`);
      const pad = c.$('.hp-pad'), rings = c.$('.hp-rings');
      const hit = () => {
        c.anim(pad, [{ transform: 'scale(0.92)' }, { transform: 'scale(1)' }], { spec: { type: 'spring', k: 600, z: 0.5 } });
        c.shakeDevice(lvl + 1);
        let first = null;
        for (let i = 0; i <= lvl; i++) {
          const r = document.createElement('div');
          r.style.cssText = `position:absolute;inset:0;border-radius:50%;border:${3 - i * 0.5}px solid var(--s-accent)`;
          rings.appendChild(r);
          const a = c.anim(r, [{ transform: 'scale(1)', opacity: 0.7 }, { transform: `scale(${1.9 + lvl * 0.3})`, opacity: 0 }], { hero: i === 0, delay: i * 90, keep: true });
          a.finished.then(() => r.remove()).catch(() => r.remove());
          if (!i) first = a;
        }
        return first;
      };
      return {
        async play() {
          await c.wait(500);
          for (let i = 0; i < 3; i++) {
            const p = c.pos(pad);
            await c.F.tap(p.x + (i - 1) * 14, p.y);
            hit();
            await c.wait(950);
          }
        },
        interact() { c.tap(pad, hit); },
      };
    },
  },

  /* ------------------------------------------------ live validation */
  validation: {
    build(c) {
      c.html(`<div class="k-page" style="padding-left:20px;padding-right:20px">${nav('', { back: 'Back' })}
        <div style="font-size:26px;font-weight:700;margin:6px 0 20px">Create account</div>
        <div style="display:flex;flex-direction:column;gap:16px">${field('Name', 'Ana Ruiz')}
          <div>${field('Email', '<span class="vl-v"></span>', { cls: 'vl-f focus' })}<div class="vl-h" style="height:0;overflow:hidden"><div class="vl-m" style="font-size:12.5px;padding:7px 2px 0;display:flex;align-items:center;gap:6px"></div></div></div>
          ${field('Password', '')}</div>
        <div style="margin-top:26px">${btn('Continue', 'filled', 'style="width:100%"')}</div></div>`);
      const v = c.$('.vl-v'), f = c.$('.vl-f'), h = c.$('.vl-h'), msg = c.$('.vl-m');
      let state = null;
      const set = (s) => {
        if (s === state) return null;
        const was = state;
        state = s;
        f.classList.toggle('error', s === 'err');
        f.classList.toggle('ok', s === 'ok');
        msg.innerHTML = s === 'err' ? `${ico('x', 14)}Enter a full email, like name@site.com` : `${ico('check', 14)}Looks good`;
        msg.style.color = s === 'err' ? 'var(--s-danger)' : 'var(--s-ok)';
        if (!was) return c.anim(h, [{ height: '0px' }, { height: msg.offsetHeight + 'px' }], { hero: true });
        return c.anim(msg, [{ opacity: 0, transform: 'translateY(-6px)' }, { opacity: 1, transform: 'none' }], { hero: true });
      };
      const type = async (s) => { for (const ch of s) { v.textContent += ch; await c.wait(75); } };
      return {
        async play() {
          await c.wait(500);
          await type(c.variant === 0 ? 'ana@fieldnotes' : 'ana@');
          await c.wait(350);
          await c.done(set('err'));
          await c.wait(1000);
          if (c.variant === 0) {
            await type('.co');
            await c.wait(300);
            await c.done(set('ok'));
          }
          await c.wait(1400);
        },
      };
    },
  },

  /* ------------------------------------------------ auto dismiss banner */
  autoBanner: {
    build(c) {
      const card = c.ios
        ? `<div style="display:flex;gap:11px;align-items:center;padding:12px 14px"><div style="width:38px;height:38px;border-radius:9px;background:#34C759;color:#fff;display:grid;place-items:center;flex:none">${ico('mail', 20)}</div><div class="k-tx"><div style="display:flex;justify-content:space-between"><b style="font-size:14px">Maya Chen</b><span class="k-sub" style="font-size:12px">now</span></div><div style="font-size:13.5px">Are we still on for 7?</div></div></div>`
        : `<div style="padding:12px 16px 10px"><div style="display:flex;align-items:center;gap:6px;font-size:12px;color:var(--s-ink-2)"><span style="width:18px;height:18px;border-radius:50%;background:var(--s-accent);color:var(--s-on-accent);display:grid;place-items:center">${ico('mail', 11)}</span>Messages · now</div><div style="font-weight:500;font-size:14.5px;margin-top:6px">Maya Chen</div><div style="font-size:13.5px;color:var(--s-ink-2)">Are we still on for 7?</div><div style="display:flex;gap:18px;margin-top:8px;font-size:13.5px;font-weight:500;color:var(--s-accent)"><span>Reply</span><span>Mark as read</span></div></div>`;
      c.html(`<div class="k-page">${nav('Music', { large: c.ios })}${rows(5, { start: 6 })}
          <div style="padding:16px">${btn('Send a test notification', 'tonal', 'style="width:100%" data-send')}</div></div>
        <div class="ab-b" style="position:absolute;left:8px;right:8px;top:${c.ios ? 10 : 40}px;z-index:35;border-radius:${c.ios ? 22 : 24}px;overflow:hidden;background:var(--s-menu);-webkit-backdrop-filter:blur(24px);backdrop-filter:blur(24px);box-shadow:0 10px 30px rgba(0,0,0,.2);transform:translateY(-170px);touch-action:none;cursor:grab">
          ${card}<div class="ab-t" style="height:2px;background:var(--s-accent);transform-origin:left;opacity:.7"></div></div>`);
      const b = c.$('.ab-b'), timerBar = c.$('.ab-t');
      let up = false, timer = 0;
      const hide = (v0 = 0) => { up = false; clearTimeout(timer); timerBar.getAnimations().forEach((a) => a.cancel()); return c.anim(b, [{ transform: 'translateY(-170px)' }], { hero: true, v0 }); };
      const show = () => {
        up = true;
        c.anim(timerBar, [{ transform: 'scaleX(1)' }, { transform: 'scaleX(0)' }], { ms: 3000, easing: 'linear' });
        if (c.mode === 'try') timer = setTimeout(() => up && hide(), 3000 / c.speed);
        return c.anim(b, [{ transform: 'translateY(-170px)' }, { transform: 'translateY(0px)' }], { hero: true });
      };
      return {
        async play() {
          await c.wait(500);
          await c.done(show());
          await c.wait(2700);
          await c.done(hide());
          await c.wait(700);
          show();
          await c.wait(1000);
          c.F.down([[150, 80]]); await c.wait(100);
          c.anim(b, [{ transform: 'translateY(-36px)' }], { ms: 140, easing: 'in' });
          await c.F.move([[150, 44]], 140, 'in'); c.F.up();
          await c.done(hide(3));
          await c.wait(500);
        },
        interact() {
          c.tap(c.$('[data-send]'), () => !up && show());
          let y0 = 0;
          c.drag(b, {
            start: () => { clearTimeout(timer); y0 = c.hold(b).m42; },
            move: (dx, dy) => { const y = y0 + dy; b.style.transform = ty(y > 0 ? rb(y, 120) : y); },
            end: (dx, dy, vx, vy) => { const y = y0 + dy; if (y < -30 || vy < -300) hide(Math.abs(vy) / 170); else { c.anim(b, [{ transform: ty(0) }], { hero: true }); timer = setTimeout(() => up && hide(), 2000); } },
          });
        },
      };
    },
  },

  /* ------------------------------------------------ collapsing header */
  collapsing: {
    build(c) {
      const n = 22;
      if (c.ios) {
        c.html(`<div class="k-page" style="padding-top:0">
          <div class="ch-bar" style="position:absolute;left:0;right:0;top:0;height:88px;padding-top:44px;z-index:5">
            <div class="ch-bg" style="position:absolute;inset:0;background:var(--s-glass);-webkit-backdrop-filter:blur(20px);backdrop-filter:blur(20px);border-bottom:0.5px solid var(--s-line);opacity:0"></div>
            <div class="ch-t" style="position:relative;text-align:center;font-weight:600;font-size:16px;line-height:44px;opacity:0">Settings</div></div>
          <div class="k-scroll ch-s" style="position:absolute;inset:0;padding-top:88px"><div class="k-large ch-l">Settings</div>
            <div style="padding:0 16px 12px"><div class="k-input" style="height:38px;gap:8px;color:var(--s-ink-2);box-shadow:none;background:var(--s-surface-2)">${ico('search', 16)}Search</div></div>${rows(n, { chev: true })}<div style="height:40px"></div></div></div>`);
      } else {
        c.html(`<div class="k-page" style="padding-top:0">
          <div class="ch-bar" style="position:absolute;left:0;right:0;top:0;height:${36 + 152}px;padding-top:36px;z-index:5;background:var(--s-bg)">
            <div style="position:absolute;left:4px;top:44px" class="k-ib">${ico('back', 22)}</div>
            <div class="ch-t" style="position:absolute;left:16px;top:${36 + 100}px;font-size:28px;transform-origin:0 0;white-space:nowrap">Settings</div></div>
          <div class="k-scroll ch-s" style="position:absolute;inset:0;padding-top:${36 + 152}px">${rows(n)}<div style="height:${88 + 40}px"></div></div></div>`);
      }
      const s = c.$('.ch-s'), bar = c.$('.ch-bar'), title = c.$('.ch-t'), bg = c.$('.ch-bg');
      const RANGE = c.ios ? 46 : 88;
      const paint = (st) => {
        if (c.ios) {
          title.style.opacity = clamp((st - 28) / 14);
          bg.style.opacity = clamp((st - 30) / 14);
          const l = c.$('.ch-l');
          l.style.transform = st < 0 ? `scale(${1 + Math.min(0.12, -st / 400)})` : 'none';
        } else {
          const f = clamp(st / RANGE);
          bar.style.height = 36 + 152 - RANGE * f + 'px';
          bar.style.boxShadow = f >= 1 ? '0 1px 0 var(--s-line)' : 'none';
          bar.style.background = f >= 1 ? 'var(--s-surface-3)' : 'var(--s-bg)';
          title.style.transform = `translate(${44 * f}px, ${-79 * f}px) scale(${1 - 0.215 * f})`;
        }
      };
      c.on(s, 'scroll', () => paint(s.scrollTop));
      paint(0);
      const scrollTo = (to, o) => { const from = s.scrollTop; return c.tween((v) => { s.scrollTop = from + (to - from) * v; }, o); };
      const snap = () => { const st = s.scrollTop; if (st > 0 && st < RANGE) return scrollTo(st > RANGE / 2 ? RANGE : 0, { hero: true }); return null; };
      return {
        async play() {
          await c.wait(600);
          c.F.down([[150, 440]]); await c.wait(100);
          const mv = c.F.move([[150, 412]], 520);
          await scrollTo(RANGE * 0.62, { ms: 520, easing: 'inout' });
          await mv; c.F.up();
          await snap();
          await c.wait(900);
          c.F.down([[150, 460]]); await c.wait(80);
          const mv2 = c.F.move([[150, 380]], 160, 'linear');
          await scrollTo(RANGE + 260, { ms: 800, easing: 'out' });
          await mv2; c.F.up();
          await c.wait(800);
          await scrollTo(0, { ms: 700, easing: 'inout' });
          await c.wait(500);
        },
        interact() { dragScroll(c, s, { onEnd: () => snap() }); },
      };
    },
  },

  /* ------------------------------------------------ search reveal on pull */
  searchReveal: {
    build(c) {
      const SH = c.ios ? 50 : 72;
      const search = c.ios
        ? `<div style="height:${SH}px;padding:6px 16px 8px"><div class="sr-in k-input" style="height:36px;gap:8px;color:var(--s-ink-2);box-shadow:none;background:var(--s-surface-2)">${ico('search', 16)}<span>Search</span><span class="k-caret"></span></div></div>`
        : `<div style="height:${SH}px;padding:8px 16px"><div class="sr-in" style="height:56px;border-radius:28px;background:var(--s-surface-3);display:flex;align-items:center;gap:14px;padding:0 16px;color:var(--s-ink-2)">${ico('menu', 22)}<span style="flex:1">Search in mail</span><span class="k-caret" style="display:none"></span>${av('Ana', '#3E9B5B', 30)}</div></div>`;
      c.html(`<div class="k-page">${nav('Mailboxes', { large: c.ios })}
        <div style="position:relative;flex:1;overflow:hidden" class="sr-clip"><div class="sr-c" style="transform:${ty(-SH)}"><div class="sr-s" style="opacity:0">${search}</div>${[0, 1, 2, 3, 4, 5, 6].map((i) => mailRow(i)).join('')}</div></div></div>`);
      const content = c.$('.sr-c'), srch = c.$('.sr-s'), clip = c.$('.sr-clip');
      let off = -SH;
      const paint = (o) => { off = o; content.style.transform = ty(o); srch.style.opacity = clamp(1 + o / SH); srch.style.transform = `scale(${0.94 + 0.06 * clamp(1 + o / SH)})`; };
      const snapTo = (o, v0 = 0) => {
        off = o;
        c.anim(srch, [{ opacity: o === 0 ? 1 : 0, transform: o === 0 ? 'scale(1)' : 'scale(0.94)' }]);
        return c.anim(content, [{ transform: ty(o) }], { hero: true, v0 });
      };
      return {
        async play() {
          await c.wait(600);
          c.F.down([[150, 260]]); await c.wait(120);
          c.anim(content, [{ transform: ty(-SH + 36) }], { ms: 520, easing: 'inout' });
          c.anim(srch, [{ opacity: 36 / SH, transform: `scale(${0.94 + 0.06 * (36 / SH)})` }], { ms: 520, easing: 'inout' });
          await c.F.move([[150, 296]], 520); c.F.up();
          await c.done(snapTo(0));
          await c.wait(700);
          const p = c.pos(c.$('.sr-in'));
          await c.F.tap(p.x, p.y);
          c.$('.sr-in').classList.add('focus');
          c.$('.sr-in .k-caret').style.display = 'inline-block';
          await c.wait(1200);
          c.$('.sr-in .k-caret').style.display = 'none';
          c.F.down([[150, 330]]); await c.wait(100);
          c.anim(content, [{ transform: ty(-40) }], { ms: 220, easing: 'out' });
          await c.F.move([[150, 290]], 220, 'out'); c.F.up();
          await c.done(snapTo(-SH));
          await c.wait(600);
        },
        interact() {
          let o0 = 0;
          c.drag(clip, {
            start: () => { o0 = c.hold(content).m42; c.hold(srch); },
            move: (dx, dy) => { let o = o0 + dy; if (o > 0) o = rb(o, 200); paint(Math.max(-SH - 60, o)); },
            end: (dx, dy, vx, vy) => { const proj = off + vy * 0.15; const t = proj > -SH / 2 ? 0 : -SH; const d = t - off; snapTo(t, Math.abs(d) > 2 ? vy / d : 0); },
          });
        },
      };
    },
  },

  /* ------------------------------------------------ scroll to top */
  scrollTop: {
    build(c) {
      c.html(`<div class="k-page">${nav('Photos', { large: c.ios })}
        <div class="k-scroll st-s" style="flex:1"><div style="display:grid;grid-template-columns:repeat(3,1fr);gap:2px">${Array.from({ length: 66 }, (_, i) => `<div style="aspect-ratio:1;position:relative">${photo(i)}${i % 9 === 0 ? `<span style="position:absolute;left:6px;top:6px;color:#fff;font-size:11px;font-weight:700;text-shadow:0 1px 4px rgba(0,0,0,.4)">${['Jun', 'May', 'Apr', 'Mar', 'Feb', 'Jan', 'Dec', 'Nov'][i / 9]}</span>` : ''}</div>`).join('')}</div></div></div>
        <div class="st-hit" style="position:absolute;left:0;right:0;top:0;height:44px;z-index:25;cursor:pointer"></div>
        ${c.android ? `<div class="st-fab k-btn k-tonal" style="position:absolute;left:50%;bottom:40px;transform:translateX(-50%);z-index:6;height:40px;padding:0 16px;box-shadow:0 3px 10px rgba(0,0,0,.18)">${ico('up', 18)}Top</div>` : ''}`);
      const s = c.$('.st-s');
      s.scrollTop = 1500;
      const toTop = () => { const from = s.scrollTop; return c.tween((v) => { s.scrollTop = from * (1 - v); }, { hero: true }); };
      const target = () => (c.ios ? { x: 70, y: 20 } : c.pos(c.$('.st-fab')));
      return {
        async play() {
          await c.wait(700);
          const p = target();
          await c.F.tap(p.x, p.y);
          await toTop();
          await c.wait(1200);
          const from = s.scrollTop;
          await c.tween((v) => { s.scrollTop = from + (1500 - from) * v; }, { ms: 700, easing: 'inout' });
          await c.wait(300);
        },
        interact() {
          c.tap(c.$('.st-hit'), () => quiet(toTop()));
          const fab = c.$('.st-fab');
          if (fab) c.tap(fab, () => quiet(toTop()));
          dragScroll(c, s);
        },
      };
    },
  },

  /* ------------------------------------------------ nav bar expand / shrink */
  barsHide: {
    build(c) {
      const shrink = c.variant === 1;
      const article = `<div style="padding:16px 18px 120px;font-size:14.5px;line-height:1.6">
        <div class="k-sub" style="font-size:12px;letter-spacing:.06em">TRAVEL · 6 MIN READ</div>
        <div style="font-size:25px;font-weight:700;line-height:1.15;margin:6px 0 12px">The slow way along the north coast</div>
        <div style="height:170px;border-radius:12px;overflow:hidden;margin-bottom:14px">${photo(1)}</div>
        ${Array.from({ length: 16 }, (_, i) => `<div class="k-bar" style="width:${[96, 88, 92, 70][i % 4]}%;margin:9px 0;height:9px"></div>`).join('')}</div>`;
      const top = c.ios
        ? ''
        : `<div class="bh-top" style="position:absolute;left:0;right:0;top:0;padding-top:36px;z-index:5;background:var(--s-surface-3)"><div style="height:56px;display:flex;align-items:center;gap:10px;padding:0 10px"><div class="bh-url" style="flex:1;height:40px;border-radius:20px;background:var(--s-bg);display:flex;align-items:center;gap:8px;padding:0 14px;font-size:14px;color:var(--s-ink-2)">${ico('lock', 14)}<span>fieldnotes.co/coast</span></div>${ico('more', 22)}</div></div>`;
      const bottom = c.ios
        ? `<div class="bh-bot" style="position:absolute;left:0;right:0;bottom:0;z-index:5;background:var(--s-glass);-webkit-backdrop-filter:blur(20px);backdrop-filter:blur(20px);border-top:0.5px solid var(--s-line);padding:8px 12px 28px">
            <div class="bh-url" style="height:44px;border-radius:12px;background:var(--s-surface);box-shadow:0 1px 4px rgba(0,0,0,.08);display:flex;align-items:center;justify-content:center;gap:6px;font-size:15px;transform-origin:50% 100%">${ico('lock', 13)}fieldnotes.co</div>
            <div class="bh-tools" style="display:flex;justify-content:space-between;padding:10px 10px 0;color:var(--s-accent)">${['chevL', 'chevR', 'share', 'book', 'copy'].map((i) => ico(i, 22)).join('')}</div></div>`
        : `<div class="bh-bot" style="position:absolute;left:0;right:0;bottom:0;z-index:5;background:var(--s-surface-3);height:64px;display:flex;justify-content:space-around;align-items:center;color:var(--s-ink-2);padding-bottom:12px">${['home', 'search', 'copy', 'user'].map((i) => ico(i, 22)).join('')}</div>`;
      c.html(`<div class="k-page" style="padding-top:0"><div class="k-scroll bh-s" style="position:absolute;inset:0;padding-top:${c.ios ? 44 : 92}px">${article}</div>${top}${bottom}</div>`);
      const s = c.$('.bh-s'), bot = c.$('.bh-bot'), topEl = c.$('.bh-top'), url = c.$('.bh-url'), tools = c.$('.bh-tools');
      let hidden = false, last = 0;
      const set = (h) => {
        if (h === hidden) return null;
        hidden = h;
        if (shrink) {
          if (c.ios) {
            c.anim(tools, [{ opacity: h ? 0 : 1, height: h ? '0px' : '32px', paddingTop: h ? '0px' : '10px' }]);
            c.anim(bot, [{ paddingBottom: h ? '20px' : '28px', paddingTop: h ? '2px' : '8px' }]);
            return c.anim(url, [{ transform: h ? 'scale(0.78)' : 'none', height: h ? '28px' : '44px', boxShadow: h ? 'none' : '0 1px 4px rgba(0,0,0,.08)', background: h ? 'transparent' : '' }], { hero: true });
          }
          c.anim(bot, [{ transform: h ? ty(64) : 'none' }]);
          return c.anim(topEl, [{ transform: h ? ty(-40) : 'none' }], { hero: true });
        }
        if (topEl) c.anim(topEl, [{ transform: h ? ty(-100) : 'none' }]);
        return c.anim(bot, [{ transform: h ? `translateY(100%)` : 'none' }], { hero: true });
      };
      c.on(s, 'scroll', () => { const st = s.scrollTop, d = st - last; last = st; if (d > 4 && st > 40) set(true); else if (d < -4 || st < 10) set(false); });
      const scrollBy = (to, ms, e) => { const from = s.scrollTop; return c.tween((v) => { s.scrollTop = from + (to - from) * v; }, { ms, easing: e }); };
      return {
        async play() {
          await c.wait(600);
          c.F.down([[150, 440]]); await c.wait(80);
          const m1 = c.F.move([[150, 280]], 700, 'out');
          await scrollBy(380, 900, 'out'); await m1; c.F.up();
          await c.wait(1100);
          c.F.down([[150, 300]]); await c.wait(80);
          const m2 = c.F.move([[150, 360]], 300, 'out');
          await scrollBy(320, 400, 'out'); await m2; c.F.up();
          await c.wait(1200);
          await scrollBy(0, 500, 'inout');
          await c.wait(400);
        },
        interact() { dragScroll(c, s); },
      };
    },
  },

  /* ------------------------------------------------ bottom nav tab switch */
  bottomNav: {
    build(c) {
      const tabsData = [['Home', 'home'], ['Search', 'search'], ['Library', 'book'], ['Profile', 'user']];
      const pages = [
        `${nav('Home', { large: c.ios })}${rows(5)}`,
        `${nav('Search', { large: c.ios })}<div style="padding:0 16px 12px"><div class="k-input" style="height:40px;gap:8px;color:var(--s-ink-2)">${ico('search', 18)}Artists, songs, places</div></div>${rows(4, { start: 4 })}`,
        `${nav('Library', { large: c.ios })}<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;padding:0 16px">${[0, 1, 2, 3].map((i) => `<div><div style="aspect-ratio:1;border-radius:10px;overflow:hidden">${photo(i + 1)}</div><div class="k-t1" style="font-size:13.5px;margin-top:6px">${PLACES[i + 3][0]}</div></div>`).join('')}</div>`,
        `${nav('Profile', { large: c.ios })}<div style="display:flex;flex-direction:column;align-items:center;gap:8px;padding:16px">${av('Ana', '#3E9B5B', 84)}<div class="k-h">Ana Ruiz</div><div class="k-sub">142 places saved</div></div>${rows(2, { start: 8 })}`,
      ];
      c.html(`<div style="position:absolute;inset:0">${pages.map((p, i) => `<div class="k-page bn-p" style="opacity:${i ? 0 : 1};visibility:${i ? 'hidden' : 'visible'}">${p}</div>`).join('')}</div>${tabbar(tabsData, 0)}`);
      const ps = c.$$('.bn-p'), tabs = c.$$('.k-tab');
      let cur = 0;
      const go = (i) => {
        if (i === cur) return null;
        const prev = cur;
        cur = i;
        tabs.forEach((t, j) => t.classList.toggle('on', j === i));
        ps[i].style.visibility = 'visible';
        c.anim(ps[prev], [{ opacity: 0 }], { ms: 120, easing: 'out' });
        c.anim(ps[i], [{ opacity: 0 }, { opacity: 1 }], { ms: 160, easing: 'out', delay: 60 });
        if (c.ios) return c.anim(tabs[i].querySelector('.k-ico'), [{ transform: 'scale(0.78) translateY(2px)' }, { transform: 'none' }], { hero: true });
        c.anim(tabs[prev].querySelector('.k-pill'), [{ opacity: 1 }, { opacity: 0 }], { ms: 100, easing: 'out' });
        return c.anim(tabs[i].querySelector('.k-pill'), [{ opacity: 0.5, transform: 'scaleX(0.3)' }, { opacity: 1, transform: 'scaleX(1)' }], { hero: true });
      };
      return {
        async play() {
          await c.wait(500);
          for (const i of [1, 2, 3, 0]) {
            const p = c.pos(tabs[i]);
            await c.F.tap(p.x, p.y - 6);
            go(i);
            await c.wait(1000);
          }
        },
        interact() { tabs.forEach((t, i) => c.tap(t, () => go(i))); },
      };
    },
  },

  /* ------------------------------------------------ side panel */
  drawer: {
    build(c) {
      const DW = 240;
      const items = [['Inbox', 'mail', 12], ['Starred', 'star', 0], ['Sent', 'send', 0], ['Drafts', 'pen', 2], ['Archive', 'archive', 0], ['Trash', 'trash', 0]];
      const menuBtn = c.ios ? `<span class="k-navbtn dr-m">${ico('menu', 22)}</span>` : '';
      c.html(`<div class="k-page">${c.ios ? nav('Inbox', { left: menuBtn }) : nav('Inbox', { menu: true })}${[0, 1, 2, 3, 4, 5, 6].map((i) => mailRow(i)).join('')}</div>
        <div class="k-scrim dr-s" style="z-index:9"></div>
        <div class="dr-d" style="position:absolute;left:0;top:0;bottom:0;width:${DW}px;z-index:10;background:${c.ios ? 'var(--s-surface)' : 'var(--s-surface)'};border-radius:${c.ios ? '0' : '0 16px 16px 0'};padding:calc(var(--sb) + 14px) 12px 20px;transform:${tx(-DW - 20)};box-shadow:4px 0 24px rgba(0,0,0,.15);touch-action:none">
          <div style="font-size:${c.ios ? 22 : 20}px;font-weight:${c.ios ? 700 : 500};padding:4px 12px 16px">Mail</div>
          ${items.map(([t, ic, n], i) => `<div class="dr-i" style="display:flex;align-items:center;gap:14px;height:48px;padding:0 14px;border-radius:${c.ios ? 10 : 24}px;cursor:pointer;${i === 0 ? `background:${c.ios ? 'var(--s-accent-soft)' : 'var(--s-sec-cont)'};color:${c.ios ? 'var(--s-accent)' : 'var(--s-on-sec-cont)'};font-weight:600` : ''}">${ico(ic, 20)}<span style="flex:1;font-size:14.5px">${t}</span>${n ? `<span style="font-size:12.5px">${n}</span>` : ''}</div>`).join('')}</div>`);
      const d = c.$('.dr-d'), s = c.$('.dr-s'), m = c.$(c.ios ? '.dr-m' : '[data-act="menu"]');
      let open = false;
      const set = (o, v0 = 0) => {
        open = o;
        s.style.pointerEvents = o ? 'auto' : 'none';
        c.anim(s, [{ opacity: o ? 0.32 : 0 }], { v0 });
        return c.anim(d, [{ transform: o ? 'none' : tx(-DW - 20) }], { hero: true, v0 });
      };
      return {
        async play() {
          await c.wait(500);
          const p = c.pos(m);
          await c.F.tap(p.x, p.y);
          await c.done(set(true));
          await c.wait(1400);
          await c.F.tap(262, 330);
          await c.done(set(false));
          await c.wait(500);
        },
        interact() {
          c.tap(m, () => set(true));
          c.on(s, 'pointerdown', () => open && set(false));
          c.$$('.dr-i').forEach((it) => c.tap(it, () => set(false)));
          let x0 = 0, x = 0;
          c.drag(d, {
            start: () => { x0 = c.hold(d).m41; c.hold(s); },
            move: (dx) => { x = Math.min(0, x0 + dx); d.style.transform = tx(x > 0 ? rb(x, 80) : x); s.style.opacity = 0.32 * (1 + x / DW); },
            end: (dx, dy, vx) => { const close = x < -DW * 0.35 || vx < -400; const dist = (close ? -DW - 20 : 0) - x; set(!close, Math.abs(dist) > 2 ? vx / dist : 0); },
          });
        },
      };
    },
  },
};
