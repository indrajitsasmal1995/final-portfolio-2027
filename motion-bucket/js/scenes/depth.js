// Depth & hierarchy, micro interactions, physics and accessibility.
import { W, H, clamp, lerp, rb, ty, tx, tr, quiet } from './util.js';
import { ico, photo, row, rows, nav, btn, mailRow, av, sw, PLACES } from '../kit.js';
import { resolve, CURVES, bezier, stiffnessOf } from '../motion.js';

const arrowCursor = '<svg viewBox="0 0 18 22" width="18" height="22"><path d="M1 1 L1 17 L5.5 13 L8.5 20 L11.5 18.8 L8.6 12 L14.5 12 Z"/></svg>';
function cursor(c) {
  const el = document.createElement('div');
  el.className = 'k-cursor ' + (c.ios ? 'round' : 'arrow');
  if (c.android) el.innerHTML = arrowCursor;
  el.style.translate = '40px 470px';
  el._p = [40, 470];
  c.root.appendChild(el);
  return {
    el,
    move(x, y, ms = 520) { const from = el._p; el._p = [x, y]; return c.done(c.anim(el, [{ translate: `${from[0]}px ${from[1]}px` }, { translate: `${x}px ${y}px` }], { ms, easing: 'inout' })); },
    show(on, ms = 150) { return c.anim(el, [{ opacity: on ? 1 : 0, scale: on ? '1' : '0.6' }], { ms, easing: 'out' }); },
  };
}
const ELEV = [
  '0 0 0 0 rgba(0,0,0,0), 0 0 0 0 rgba(0,0,0,0)',
  '0 1px 2px 0 rgba(0,0,0,.3), 0 1px 3px 1px rgba(0,0,0,.15)',
  '0 1px 2px 0 rgba(0,0,0,.3), 0 2px 6px 2px rgba(0,0,0,.15)',
  '0 1px 3px 0 rgba(0,0,0,.3), 0 4px 8px 3px rgba(0,0,0,.15)',
  '0 2px 3px 0 rgba(0,0,0,.3), 0 6px 10px 4px rgba(0,0,0,.15)',
  '0 4px 4px 0 rgba(0,0,0,.3), 0 8px 12px 6px rgba(0,0,0,.15)',
];

export default {
  /* ------------------------------------------------ layering blur */
  blur: {
    build(c) {
      const recede = c.variant === 1;
      c.root.style.background = '#000';
      c.html(`<div class="k-page bl-bg" style="transform-origin:50% 40%">${nav('Home', { large: c.ios })}
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;padding:0 16px">${[0, 1, 2, 3, 4, 5].map((i) => `<div class="bl-c" style="height:120px;border-radius:16px;overflow:hidden;position:relative;cursor:pointer">${photo(i)}<span style="position:absolute;left:10px;bottom:8px;color:#fff;font-weight:600;font-size:13px;text-shadow:0 1px 4px rgba(0,0,0,.4)">${PLACES[i][0]}</span></div>`).join('')}</div></div>
        <div class="bl-dim" style="position:absolute;inset:0;background:#000;opacity:0;pointer-events:none"></div>
        <div class="bl-m" style="position:absolute;left:30px;right:30px;top:170px;z-index:5;border-radius:24px;background:var(--s-surface);box-shadow:0 20px 50px rgba(0,0,0,.3);padding:18px;opacity:0;pointer-events:none">
          <div style="height:120px;border-radius:14px;overflow:hidden">${photo(2)}</div>
          <div class="k-h" style="margin-top:12px">Night Market</div><div class="k-sub">Food hall · open until midnight</div>
          <div style="display:flex;gap:8px;margin-top:14px">${btn('Directions', 'filled', 'style="flex:1;padding:0;height:40px;font-size:14px"')}${btn('Save', 'tonal', 'style="flex:1;padding:0;height:40px;font-size:14px"')}</div></div>`);
      const bg = c.$('.bl-bg'), dim = c.$('.bl-dim'), m = c.$('.bl-m');
      const set = (on) => {
        m.style.pointerEvents = on ? 'auto' : 'none';
        c.anim(dim, [{ opacity: on ? 0.18 : 0 }]);
        c.anim(m, [{ opacity: on ? 0 : 1, transform: on ? 'scale(0.9) translateY(20px)' : 'none' }, { opacity: on ? 1 : 0, transform: on ? 'none' : 'scale(0.94)' }]);
        return c.anim(bg, [{ filter: on ? 'blur(14px)' : 'blur(0px)', transform: on && recede ? 'scale(0.92)' : 'none', borderRadius: on && recede ? '24px' : '0px' }], { hero: true });
      };
      return {
        async play() {
          await c.wait(500);
          const p = c.pos(c.$$('.bl-c')[2]);
          await c.F.tap(p.x, p.y);
          await c.done(set(true));
          await c.wait(1500);
          await c.F.tap(140, 520);
          await c.done(set(false));
          await c.wait(500);
        },
      };
    },
  },

  /* ------------------------------------------------ card elevation */
  elevation: {
    build(c) {
      const base = c.ios ? '0 2px 8px rgba(0,0,0,.08), 0 0 0 rgba(0,0,0,0)' : ELEV[1];
      const up = c.ios ? '0 14px 30px rgba(0,0,0,.2), 0 2px 6px rgba(0,0,0,.08)' : ELEV[4];
      c.html(`<div class="k-page">${nav(c.ios ? 'Today' : 'Apps', { large: c.ios })}
        <div style="display:flex;flex-direction:column;gap:16px;padding:6px 18px">${[0, 1].map((i) => `<div class="ev-c" style="border-radius:${c.ios ? 18 : 12}px;overflow:hidden;background:var(--s-surface);box-shadow:${base};cursor:pointer">
          <div style="height:${i ? 110 : 150}px">${photo(i + 3)}</div><div style="padding:12px 14px"><div class="k-t1">${['Weekend walks', 'Field Notes'][i]}</div><div class="k-t2">${['Six routes under two hours', 'Notebooks and pens'][i]}</div></div></div>`).join('')}</div></div>`);
      const cards = c.$$('.ev-c');
      const press = (el) => c.anim(el, [{ transform: c.ios ? 'translateY(-4px) scale(1.02)' : 'translateY(-3px)', boxShadow: up }], { hero: true });
      const release = (el) => c.anim(el, [{ transform: 'none', boxShadow: base }], { hero: true });
      return {
        async play() {
          await c.wait(500);
          for (const el of cards) {
            const p = c.pos(el);
            c.F.down([[p.x + 20, p.y]]);
            press(el);
            await c.wait(800);
            c.F.up();
            await c.done(release(el));
            await c.wait(500);
          }
        },
        interact() { cards.forEach((el) => c.drag(el, { start: () => press(el), end: () => release(el), tap: () => release(el) })); },
      };
    },
  },

  /* ------------------------------------------------ z-depth */
  zdepth: {
    build(c) {
      const DP = [0, 1, 3, 6, 8, 12], TINT = [0, 0.05, 0.08, 0.11, 0.12, 0.14];
      c.html(`<div class="k-page">${nav('Elevation', { back: 'Styles' })}
        <div style="flex:1;display:grid;place-items:center;padding-bottom:30px">
          <div class="zd-c" style="position:relative;width:200px;height:150px;border-radius:16px;background:var(--s-bg);box-shadow:${ELEV[0]};display:grid;place-items:center;overflow:hidden">
            <div class="zd-t" style="position:absolute;inset:0;background:var(--s-accent);opacity:0"></div>
            <div style="position:relative;text-align:center"><div class="zd-l" style="font-size:20px;font-weight:600">Level 0</div><div class="k-sub zd-dp">0 dp</div></div></div></div>
        <div style="display:flex;justify-content:center;gap:8px;padding:0 0 70px">${DP.map((d, i) => `<span class="zd-b" data-i="${i}" style="width:36px;height:36px;border-radius:18px;display:grid;place-items:center;font-size:13px;font-weight:600;cursor:pointer;box-shadow:inset 0 0 0 1px var(--s-line);${i === 0 ? 'background:var(--s-accent);color:var(--s-on-accent)' : ''}">${i}</span>`).join('')}</div></div>`);
      const card = c.$('.zd-c'), tint = c.$('.zd-t'), bs = c.$$('.zd-b');
      const set = (L) => {
        bs.forEach((b, i) => { b.style.background = i === L ? 'var(--s-accent)' : ''; b.style.color = i === L ? 'var(--s-on-accent)' : ''; });
        c.$('.zd-l').textContent = `Level ${L}`;
        c.$('.zd-dp').textContent = `${DP[L]} dp`;
        c.anim(tint, [{ opacity: c.android ? TINT[L] : 0 }]);
        return c.anim(card, [{ boxShadow: ELEV[L], transform: ty(-DP[L] * 0.6) }], { hero: true });
      };
      return {
        async play() {
          await c.wait(500);
          for (const L of c.variant === 0 ? [1, 2, 3, 0] : [5, 0]) {
            const p = c.pos(bs[L]);
            await c.F.tap(p.x, p.y);
            await c.done(set(L));
            await c.wait(L === 0 ? 500 : 800);
          }
        },
        interact() { bs.forEach((b, i) => c.tap(b, () => set(i))); },
      };
    },
  },

  /* ------------------------------------------------ dimmed backgrounds */
  dim: {
    build(c) {
      const sheet = c.variant === 1;
      const dlg = c.ios
        ? `<div class="dm-x" style="position:absolute;left:50%;top:50%;width:250px;margin:-70px 0 0 -125px;z-index:10;border-radius:14px;overflow:hidden;background:var(--s-menu);-webkit-backdrop-filter:blur(24px);backdrop-filter:blur(24px);text-align:center;opacity:0"><div style="padding:18px 16px 16px"><b style="font-size:16px">Leave this plan?</b><div style="font-size:13px;margin-top:4px;color:var(--s-ink-2)">Maya will be told you left.</div></div><div style="display:flex;border-top:0.5px solid var(--s-line)"><span class="dm-c" style="flex:1;padding:12px;color:var(--s-accent);font-size:16px;cursor:pointer">Stay</span><span class="dm-c" style="flex:1;padding:12px;color:var(--s-danger);font-weight:600;font-size:16px;border-left:0.5px solid var(--s-line);cursor:pointer">Leave</span></div></div>`
        : `<div class="dm-x" style="position:absolute;left:28px;right:28px;top:50%;margin-top:-80px;z-index:10;border-radius:28px;background:var(--s-surface-3);padding:24px;opacity:0"><div style="font-size:22px">Leave this plan?</div><div style="font-size:14px;margin-top:12px;color:var(--s-ink-2)">Maya will be told you left.</div><div style="display:flex;justify-content:flex-end;gap:6px;margin-top:20px;color:var(--s-accent);font-weight:500;font-size:14px"><span class="dm-c" style="padding:10px 12px;cursor:pointer">Stay</span><span class="dm-c" style="padding:10px 12px;cursor:pointer">Leave</span></div></div>`;
      const sh = `<div class="dm-x" style="position:absolute;left:0;right:0;bottom:0;z-index:10;border-radius:${c.ios ? 14 : 28}px ${c.ios ? 14 : 28}px 0 0;background:var(--s-sheet);padding:${c.ios ? 10 : 6}px 16px 40px;transform:translateY(100%)"><div class="k-grab"></div><div class="k-h" style="margin:8px 0 12px">Share plan</div>${['Copy link', 'Message', 'Mail'].map((t, i) => `<div class="dm-c" style="display:flex;align-items:center;gap:14px;height:48px;cursor:pointer">${ico(['copy', 'send', 'mail'][i], 20)}<span>${t}</span></div>`).join('')}</div>`;
      c.html(`<div class="k-page">${nav('Saturday', { back: 'Plans' })}
        <div style="height:160px;margin:4px 16px 12px;border-radius:16px;overflow:hidden">${photo(2)}</div>
        <div class="k-list">${[0, 1, 2].map((i) => row(i)).join('')}</div>
        <div style="padding:18px 16px">${btn(sheet ? 'Share plan' : 'Leave plan', 'tonal', `style="width:100%;${sheet ? '' : 'color:var(--s-danger)'}" data-o`)}</div></div>
        <div class="k-scrim"></div>${sheet ? sh : dlg}`);
      const scrim = c.$('.k-scrim'), x = c.$('.dm-x');
      let on = false;
      const set = (o) => {
        on = o;
        scrim.style.pointerEvents = o ? 'auto' : 'none';
        if (sheet) c.anim(x, [{ transform: o ? 'none' : 'translateY(100%)' }], o ? {} : { ms: 220, easing: 'in' });
        else c.anim(x, o ? [{ opacity: 0, transform: c.ios ? 'scale(1.15)' : 'scale(0.85)' }, { opacity: 1, transform: 'none' }] : [{ opacity: 0, transform: 'scale(0.95)' }], o ? {} : { ms: 160, easing: 'in' });
        return c.anim(scrim, [{ opacity: o ? (c.ios ? 0.4 : 0.32) : 0 }], { hero: true });
      };
      return {
        async play() {
          await c.wait(500);
          const p = c.pos(c.$('[data-o]'));
          await c.F.tap(p.x, p.y);
          await c.done(set(true));
          await c.wait(1500);
          const q = c.pos(c.$$('.dm-c')[0]);
          await c.F.tap(q.x, q.y);
          await c.done(set(false));
          await c.wait(500);
        },
      };
    },
  },

  /* ------------------------------------------------ chip hover */
  chipHover: {
    build(c) {
      const names = ['All', 'Cafés', 'Parks', 'Books', 'Records', 'Ceramics', 'Late night', 'Free entry'];
      c.html(`<div class="k-page">${nav('Explore', { large: c.ios })}
        <div style="position:relative;padding:4px 16px 8px"><div class="chv-hl" style="position:absolute;left:0;top:0;border-radius:${c.ios ? 17 : 8}px;background:var(--s-ink);opacity:0;pointer-events:none"></div>
          <div class="k-chips chv-row" style="position:relative">${names.map((n) => `<span class="k-chip" style="cursor:pointer"><span class="k-chip-fill" style="background:var(--s-ink);opacity:0"></span>${n}</span>`).join('')}</div></div>
        <div class="k-section">Pointer devices</div><div class="k-sub" style="padding:0 ${c.ios ? 32 : 16}px;line-height:1.5">On iPad the round pointer morphs into the hovered control. With a mouse on Android, a light state layer appears instead.</div></div>`);
      const chips = c.$$('.k-chip'), hl = c.$('.chv-hl'), wrap = hl.parentElement;
      let cur = null, curEl = null;
      const geo = (ch) => { const a = c.pos(ch), b = c.pos(wrap); return { x: a.l - b.l - 4, y: a.t - b.t - 3, w: a.w + 8, h: a.h + 6 }; };
      const hover = (ch, cursorObj) => {
        if (ch === curEl) return null;
        const prev = curEl;
        curEl = ch;
        if (c.ios) {
          if (cursorObj) cursorObj.show(!ch);
          if (!ch) return c.anim(hl, [{ opacity: 0 }], { ms: 150, easing: 'out' });
          const g = geo(ch);
          const fromHidden = !prev;
          if (fromHidden) Object.assign(hl.style, { transform: tr(g.x + g.w / 2 - 10, g.y + g.h / 2 - 10), width: '20px', height: '20px' });
          return c.anim(hl, [{ opacity: 0.1, transform: tr(g.x, g.y), width: g.w + 'px', height: g.h + 'px' }], { hero: true });
        }
        if (prev) c.anim(prev.querySelector('.k-chip-fill'), [{ opacity: 0 }], { ms: 120, easing: 'out' });
        if (ch) return c.anim(ch.querySelector('.k-chip-fill'), [{ opacity: 0.08 }], { hero: true });
        return null;
      };
      return {
        async play() {
          await c.wait(400);
          const cur2 = cursor(c);
          for (const i of [1, 2, 5, 6]) {
            const p = c.pos(chips[i]);
            await cur2.move(p.x + 4, p.y + 2);
            hover(chips[i], cur2);
            await c.wait(650);
          }
          await cur2.move(150, 470);
          hover(null, cur2);
          await c.wait(600);
        },
        interact() {
          chips.forEach((ch) => {
            c.on(ch, 'pointerenter', () => hover(ch));
            c.on(ch, 'pointerleave', () => setTimeout(() => { if (curEl === ch) hover(null); }, 30));
          });
        },
      };
    },
  },

  /* ------------------------------------------------ card hover */
  cardHover: {
    build(c) {
      c.html(`<div class="k-page">${nav('Apps', { large: c.ios })}
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;padding:6px 16px">${[0, 1, 2, 3].map((i) => `<div class="cv-c" style="border-radius:${c.ios ? 16 : 12}px;overflow:hidden;background:var(--s-surface);box-shadow:0 1px 3px rgba(0,0,0,.1);cursor:pointer;position:relative">
          <div style="height:96px">${photo(i)}</div><div style="padding:9px 10px"><div class="k-t1" style="font-size:13.5px">${PLACES[i * 2][0]}</div><div class="k-t2">${['Featured', 'New', 'Popular', 'Editors’ pick'][i]}</div></div>
          <div class="cv-g" style="position:absolute;inset:0;background:linear-gradient(135deg,rgba(255,255,255,.35),transparent 55%);opacity:0;pointer-events:none"></div></div>`).join('')}</div>
        <div class="k-sub" style="padding:18px 20px">Hover lifts what you can click.</div></div>`);
      const cards = c.$$('.cv-c');
      let cur = null;
      const lift = (el, on) => {
        c.anim(el.querySelector('.cv-g'), [{ opacity: on && c.ios ? 1 : 0 }], { ms: 200, easing: 'out' });
        return c.anim(el, [{ transform: on ? (c.ios ? 'translateY(-6px) scale(1.04)' : 'translateY(-4px)') : 'none', boxShadow: on ? '0 16px 32px rgba(0,0,0,.2)' : '0 1px 3px rgba(0,0,0,.1)' }], { hero: true });
      };
      const hover = (el) => { if (el === cur) return; if (cur) lift(cur, false); cur = el; if (el) lift(el, true); };
      return {
        async play() {
          await c.wait(400);
          const k = cursor(c);
          for (const i of [0, 1, 3, 2]) {
            const p = c.pos(cards[i]);
            await k.move(p.x + 10, p.y + 8);
            hover(cards[i]);
            await c.wait(700);
          }
          await k.move(150, 500);
          hover(null);
          await c.wait(600);
        },
        interact() { cards.forEach((el) => { c.on(el, 'pointerenter', () => hover(el)); c.on(el, 'pointerleave', () => { if (cur === el) hover(null); }); }); },
      };
    },
  },

  /* ------------------------------------------------ press down micro bounce */
  pressBounce: {
    build(c) {
      c.html(`<div class="k-page">${nav('Workout', { large: c.ios })}
        <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:34px;padding-bottom:80px">
          <div class="pb-b" style="width:160px;height:160px;border-radius:50%;background:var(--s-accent);color:var(--s-on-accent);display:grid;place-items:center;font-size:22px;font-weight:700;box-shadow:0 14px 34px rgba(0,0,0,.2);cursor:pointer">Start</div>
          <div style="display:flex;gap:22px">${['music', 'bolt', 'heart'].map((i) => `<span class="pb-b" style="width:58px;height:58px;border-radius:${c.ios ? 29 : 18}px;background:var(--s-surface-2);display:grid;place-items:center;cursor:pointer">${ico(i, 24)}</span>`).join('')}</div></div></div>`);
      const bs = c.$$('.pb-b');
      const down = (el) => { c.hold(el); return c.anim(el, [{ transform: 'scale(0.92)' }], { ms: 110, easing: 'out' }); };
      const up = (el) => c.anim(el, [{ transform: 'scale(1)' }], { hero: true });
      return {
        async play() {
          await c.wait(500);
          for (const el of [bs[0], bs[2], bs[0]]) {
            const p = c.pos(el);
            c.F.down([[p.x, p.y]]);
            down(el);
            await c.wait(260);
            c.F.up();
            await c.done(up(el));
            await c.wait(500);
          }
        },
        interact() { bs.forEach((el) => c.drag(el, { start: () => down(el), end: () => up(el), tap: () => up(el) })); },
      };
    },
  },

  /* ------------------------------------------------ swipe actions */
  swipeActions: {
    build(c) {
      const AW = 74;
      c.html(`<div class="k-page">${nav('Inbox', { large: c.ios, menu: true })}<div class="sw-l">${[0, 1, 2, 3, 4, 5].map((i) => `<div class="sw-r" style="position:relative;overflow:hidden">
          <div class="sw-a" style="position:absolute;top:0;bottom:0;right:0;display:flex;justify-content:flex-end;width:100%">
            <span class="sw-flag" style="width:${AW}px;background:${c.ios ? '#FF9500' : 'var(--s-sec-cont)'};color:${c.ios ? '#fff' : 'var(--s-on-sec-cont)'};display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;font-size:12px;font-weight:500">${ico('flag', 19)}Flag</span>
            <span class="sw-del" style="width:${AW}px;background:${c.ios ? '#FF3B30' : 'var(--s-danger)'};color:#fff;display:flex;flex-direction:column;align-items:flex-start;justify-content:center;padding-left:22px;gap:3px;font-size:12px;font-weight:500;cursor:pointer">${ico('trash', 19)}Delete</span></div>
          <div class="sw-f" style="position:relative;touch-action:pan-y">${mailRow(i)}</div></div>`).join('')}</div></div>`);
      const rowsEl = c.$$('.sw-r');
      let openRow = null;
      const parts = (r) => ({ f: r.querySelector('.sw-f'), del: r.querySelector('.sw-del'), flag: r.querySelector('.sw-flag') });
      const pose = (r, x) => {
        const { f, del } = parts(r);
        f.style.transform = tx(x);
        del.style.width = Math.max(AW, -x - AW) + 'px';
      };
      const settle = (r, x, v0 = 0) => {
        const { f, del } = parts(r);
        openRow = x ? r : openRow === r ? null : openRow;
        c.anim(del, [{ width: AW + 'px' }], { v0 });
        return c.anim(f, [{ transform: tx(x) }], { hero: true, v0 });
      };
      const remove = (r, v0 = 0) => {
        const { f, del } = parts(r);
        if (openRow === r) openRow = null;
        c.anim(del, [{ width: W + 'px' }], { ms: 200, easing: 'out' });
        const a = c.anim(f, [{ transform: tx(-W) }], { hero: true, v0 });
        a.finished.then(() => c.anim(r, [{ height: r.offsetHeight + 'px' }, { height: '0px' }], { ms: 260, easing: 'inout' })).catch(() => {});
        return a;
      };
      return {
        async play() {
          await c.wait(600);
          const r = rowsEl[1], p = c.pos(r);
          const full = c.variant === 1;
          c.F.down([[220, p.y]]); await c.wait(110);
          const end = full ? -220 : -140;
          c.anim(parts(r).f, [{ transform: tx(end) }], { ms: full ? 520 : 440, easing: 'inout' });
          if (full) c.anim(parts(r).del, [{ width: -end - AW + 'px' }], { ms: 520, easing: 'inout' });
          await c.F.move([[220 + end, p.y]], full ? 520 : 440);
          c.F.up();
          if (full) { await c.done(remove(r, 0.5)); await c.wait(1300); return; }
          await c.done(settle(r, -2 * AW, 0.8));
          await c.wait(1400);
          const q = c.pos(rowsEl[3]);
          await c.F.tap(q.x, q.y);
          await c.done(settle(r, 0));
          await c.wait(600);
        },
        interact() {
          rowsEl.forEach((r) => {
            let x0 = 0, x = 0;
            const { f, del } = parts(r);
            c.drag(f, {
              start: () => { if (openRow && openRow !== r) settle(openRow, 0); x0 = c.hold(f).m41; c.hold(del); },
              move: (dx) => { x = x0 + dx; if (x > 0) x = rb(x, 60); pose(r, x); },
              end: (dx, dy, vx) => {
                const proj = x + vx * 0.2;
                if (x < -W * 0.62) remove(r, Math.abs(vx) / 300);
                else { const t = proj < -AW ? -2 * AW : 0; const d = t - x; settle(r, t, Math.abs(d) > 2 ? vx / d : 0); }
              },
              tap: () => { if (openRow) settle(openRow, 0); },
            });
            c.tap(del, () => remove(r));
          });
        },
      };
    },
  },

  /* ------------------------------------------------ carousel snap */
  carousel: {
    build(c) {
      const CW = 196, GAP = 12, STEP = CW + GAP, n = 5, left = (W - CW) / 2;
      c.html(`<div class="k-page">${nav(c.ios ? 'Discover' : 'Discover', { large: c.ios })}
        <div class="k-section" style="padding-top:4px">This week</div>
        <div class="cs-v" style="position:relative;height:300px;overflow:hidden;touch-action:pan-y;cursor:grab">${Array.from({ length: n }, (_, i) => `<div class="cs-c" style="position:absolute;left:${left}px;top:10px;width:${CW}px;height:270px;border-radius:${c.ios ? 20 : 28}px;overflow:hidden;box-shadow:0 8px 20px rgba(0,0,0,.15)">${photo(i + 1)}<div style="position:absolute;left:14px;bottom:14px;color:#fff;text-shadow:0 1px 6px rgba(0,0,0,.4)"><div style="font-size:11px;font-weight:700;letter-spacing:.06em;opacity:.9">NO. ${i + 1}</div><div style="font-size:19px;font-weight:700">${PLACES[i + 2][0]}</div></div></div>`).join('')}</div>
        ${rows(2, { start: 6 })}</div>`);
      const cards = c.$$('.cs-c');
      let x = 0, idx = 0;
      const setX = (v) => {
        x = v;
        cards.forEach((el, i) => {
          const off = i * STEP + x, d = Math.min(1, Math.abs(off) / STEP);
          el.style.transform = `translateX(${off}px) scale(${1 - d * 0.1})`;
          el.style.opacity = 1 - d * 0.25;
        });
      };
      setX(0);
      const snap = (i, v0 = 0) => {
        idx = clamp(i, 0, n - 1);
        const from = x, to = -idx * STEP;
        return c.tween((e) => setX(from + (to - from) * e), { hero: true, v0: to !== from ? v0 : 0 });
      };
      const follow = (dx, ms, e = 'inout') => { const from = x; return c.tween((p) => setX(from + dx * p), { ms, easing: e }); };
      return {
        async play() {
          await c.wait(600);
          for (const t of [1, 2]) {
            c.F.down([[210, 260]]); await c.wait(90);
            const mv = c.F.move([[100, 260]], 420);
            await follow(-110, 420); await mv; c.F.up();
            await snap(t, 1.1);
            await c.wait(900);
          }
          c.F.down([[80, 260]]); await c.wait(80);
          const mv = c.F.move([[160, 260]], 140, 'linear');
          await follow(80, 140, 'linear'); await mv; c.F.up();
          await snap(0, 3.5);
          await c.wait(700);
        },
        interact() {
          let x0 = 0, stopping = null;
          c.drag(c.$('.cs-v'), {
            start: () => { c.root.querySelectorAll('.k-proxy').forEach((p) => p.getAnimations().forEach((a) => a.cancel())); x0 = x; },
            move: (dx) => { let v = x0 + dx; const lo = -(n - 1) * STEP; if (v > 0) v = rb(v, 160); else if (v < lo) v = lo - rb(lo - v, 160); setX(v); },
            end: (dx, dy, vx) => { const proj = x + vx * 0.25; const t = Math.round(-proj / STEP); const d = -clamp(t, 0, n - 1) * STEP - x; snap(t, Math.abs(d) > 2 ? vx / d : 0); },
          });
        },
      };
    },
  },

  /* ------------------------------------------------ page indicator */
  dots: {
    build(c) {
      const worm = c.variant === 1, n = 5;
      c.html(`<div class="k-page">
        <div style="flex:1;position:relative;overflow:hidden;margin-top:20px"><div class="dt-s" style="position:absolute;top:0;bottom:0;left:0;width:${W * n}px;display:flex">${Array.from({ length: n }, (_, i) => `<div style="width:${W}px;padding:10px 24px"><div style="height:330px;border-radius:26px;overflow:hidden">${photo(i)}</div><div style="font-size:22px;font-weight:700;margin-top:18px">${['Save places', 'Plan a day', 'Invite friends', 'Get reminders', 'Go'][i]}</div></div>`).join('')}</div></div>
        <div class="dt-d" style="position:relative;display:flex;justify-content:center;gap:8px;padding:6px 0 70px">${Array.from({ length: n }, (_, i) => `<span class="dt-i" style="height:8px;width:${!worm && i === 0 ? 22 : 8}px;border-radius:4px;background:${!worm && i === 0 ? 'var(--s-accent)' : 'var(--s-ink-3)'};cursor:pointer"></span>`).join('')}
          ${worm ? '<span class="dt-w" style="position:absolute;top:6px;left:0;height:8px;width:8px;border-radius:4px;background:var(--s-accent)"></span>' : ''}</div></div>`);
      const strip = c.$('.dt-s'), ds = c.$$('.dt-i'), wEl = c.$('.dt-w');
      const dx = (i) => c.pos(ds[i]).l - c.pos(c.$('.dt-d')).l;
      if (worm) wEl.style.left = dx(0) + 'px';
      let cur = 0;
      const go = (i) => {
        if (i === cur) return null;
        const prev = cur;
        cur = i;
        c.anim(strip, [{ transform: tx(-i * W) }]);
        if (!worm) {
          c.anim(ds[prev], [{ width: '8px', background: 'var(--s-ink-3)' }]);
          return c.anim(ds[i], [{ width: '22px', background: 'var(--s-accent)' }], { hero: true });
        }
        const a = dx(prev), b = dx(i);
        const l = Math.min(a, b), wd = Math.abs(b - a) + 8;
        const mid = i > prev ? { left: a + 'px', width: wd + 'px', offset: 0.5 } : { left: b + 'px', width: wd + 'px', offset: 0.5 };
        return c.anim(wEl, [{ left: a + 'px', width: '8px' }, mid, { left: b + 'px', width: '8px' }], { hero: true });
      };
      return {
        async play() {
          await c.wait(700);
          for (const i of [1, 2, 3]) { go(i); await c.wait(1100); }
          const p = c.pos(ds[0]);
          await c.F.tap(p.x, p.y);
          go(0);
          await c.wait(1000);
        },
        interact() { ds.forEach((d, i) => c.tap(d, () => go(i))); },
      };
    },
  },

  /* ------------------------------------------------ spring lab */
  springLab: {
    build(c) {
      const sp = c.spec, isSpring = sp.type === 'spring';
      const k = isSpring ? sp.k : 158, z = isSpring ? sp.z : 0.8;
      const lanes = c.variant === 0
        ? [['Yours', sp], ...[0.3, 0.55, 1].map((d) => [`Damping ${d}`, { type: 'spring', k, z: d }])]
        : [['Yours', sp], ...[0.25, 0.5, 0.9].map((r) => [`Response ${r}s`, { type: 'spring', k: Math.round(stiffnessOf(r)), z }])];
      c.html(`<div class="k-page">${nav('Spring lab', { large: c.ios })}
        <div class="k-sub" style="padding:0 ${c.ios ? 16 : 16}px 14px;line-height:1.45">${c.variant === 0 ? 'Same speed, different damping. Lower damping, more bounce.' : 'Same damping, different response. Shorter response, faster move.'}</div>
        <div style="display:flex;flex-direction:column;gap:12px;padding:0 16px">${lanes.map(([l], i) => `<div style="padding:10px 12px 12px;border-radius:12px;background:var(--s-surface);${i === 0 ? 'box-shadow:inset 0 0 0 2px var(--s-accent)' : ''}"><div style="font-size:12px;font-weight:600;color:${i === 0 ? 'var(--s-accent)' : 'var(--s-ink-2)'}">${l}</div>
          <div style="position:relative;height:30px;margin-top:6px"><div style="position:absolute;left:12px;right:12px;top:14px;height:2px;background:var(--s-line)"></div><div style="position:absolute;right:11px;top:6px;width:2px;height:18px;background:var(--s-ink-3)"></div>
          <div class="sl-b" style="position:absolute;left:0;top:3px;width:24px;height:24px;border-radius:12px;background:${i === 0 ? 'var(--s-accent)' : 'var(--s-ink-2)'}"></div></div></div>`).join('')}</div></div>`);
      const balls = c.$$('.sl-b'), D = W - 32 - 24 - 24;
      const run = (to) => Promise.all(balls.map((b, i) => c.done(c.anim(b, [{ transform: tx(to ? 0 : D) }, { transform: tx(to ? D : 0) }], { spec: lanes[i][1], hero: i === 0 }))));
      return {
        async play() {
          await c.wait(600);
          await run(true);
          await c.wait(700);
          await run(false);
          await c.wait(500);
        },
      };
    },
  },

  /* ------------------------------------------------ easing lab */
  easingLab: {
    build(c) {
      const sp = c.spec, ms = sp.type === 'tween' ? sp.ms : 500;
      const T = (curve) => ({ type: 'tween', ms, curve });
      const sets = c.ios
        ? [[['Ease in-out', T('easeInOut')], ['Ease out', T('easeOut')], ['Ease in', T('easeIn')], ['Linear', T('linear')]],
          [['.smooth', { type: 'spring', k: Math.round(stiffnessOf(0.5)), z: 1 }], ['.snappy', { type: 'spring', k: Math.round(stiffnessOf(0.5)), z: 0.85 }], ['.bouncy', { type: 'spring', k: Math.round(stiffnessOf(0.5)), z: 0.7 }], ['Linear', T('linear')]]]
        : [[['Standard', T('standard')], ['Standard decelerate', T('standardDecelerate')], ['Standard accelerate', T('standardAccelerate')], ['Linear', T('linear')]],
          [['Emphasized decelerate', T('emphasizedDecelerate')], ['Emphasized accelerate', T('emphasizedAccelerate')], ['Legacy', T('legacy')], ['Linear', T('linear')]]];
      const lanes = [['Yours', sp], ...sets[c.variant]];
      const mini = (s) => {
        const r = resolve(s, c.os);
        const pts = Array.from({ length: 21 }, (_, i) => `${(i / 20) * 26 + 1},${19 - r.ease(i / 20) * 16}`).join(' ');
        return `<svg width="28" height="20" viewBox="0 0 28 20" style="flex:none"><polyline points="${pts}" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>`;
      };
      c.html(`<div class="k-page">${nav('Easing', { large: c.ios })}
        <div style="display:flex;flex-direction:column;gap:10px;padding:0 16px">${lanes.map(([l, s], i) => `<div style="padding:9px 12px 11px;border-radius:12px;background:var(--s-surface);${i === 0 ? 'box-shadow:inset 0 0 0 2px var(--s-accent)' : ''}">
          <div style="display:flex;align-items:center;gap:8px;font-size:12px;font-weight:600;color:${i === 0 ? 'var(--s-accent)' : 'var(--s-ink-2)'}">${mini(s)}${l}</div>
          <div style="position:relative;height:26px;margin-top:5px"><div style="position:absolute;left:10px;right:10px;top:12px;height:2px;background:var(--s-line)"></div>
          <div class="el-b" style="position:absolute;left:0;top:2px;width:22px;height:22px;border-radius:${c.ios ? 11 : 6}px;background:${i === 0 ? 'var(--s-accent)' : 'var(--s-ink-2)'}"></div></div></div>`).join('')}</div></div>`);
      const balls = c.$$('.el-b'), D = W - 32 - 24 - 22;
      const run = (to) => Promise.all(balls.map((b, i) => c.done(c.anim(b, [{ transform: tx(to ? 0 : D) }, { transform: tx(to ? D : 0) }], { spec: lanes[i][1], hero: i === 0 }))));
      return {
        async play() { await c.wait(600); await run(true); await c.wait(700); await run(false); await c.wait(500); },
      };
    },
  },

  /* ------------------------------------------------ elastic deformation */
  elastic: {
    build(c) {
      const stretch = c.variant === 1;
      if (stretch) {
        c.html(`<div class="k-page">${nav('Places', { large: c.ios })}<div class="ed-v" style="flex:1;overflow:hidden;cursor:grab;touch-action:none"><div class="ed-c" style="transform-origin:50% 0">${rows(8)}</div></div></div>`);
        const content = c.$('.ed-c');
        return {
          async play() {
            await c.wait(600);
            c.F.down([[150, 230]]); await c.wait(120);
            c.anim(content, [{ transform: 'scaleY(1.12)' }], { ms: 640, easing: 'inout' });
            await c.F.move([[150, 380]], 640); c.F.up();
            await c.done(c.anim(content, [{ transform: 'scaleY(1)' }], { hero: true }));
            await c.wait(900);
          },
          interact() {
            c.drag(c.$('.ed-v'), {
              start: () => c.hold(content),
              move: (dx, dy) => { content.style.transformOrigin = dy > 0 ? '50% 0' : '50% 100%'; content.style.transform = `scaleY(${1 + rb(Math.abs(dy), 300) / 600})`; },
              end: () => c.anim(content, [{ transform: 'scaleY(1)' }], { hero: true }),
            });
          },
        };
      }
      const L = 110, B = 70;
      c.html(`<div class="k-page">${nav('Elastic', { large: c.ios })}
        <div class="k-sub" style="padding:0 16px 20px;line-height:1.45">The block can move ${L} points. Past that, each extra point costs more effort, and the block stretches.</div>
        <div style="position:relative;height:120px;margin:10px 20px">
          <div style="position:absolute;left:0;right:0;top:59px;height:2px;background:var(--s-line)"></div>
          <div style="position:absolute;left:${L + B}px;top:30px;width:2px;height:60px;background:var(--s-danger);opacity:.6"></div>
          <div class="k-sub" style="position:absolute;left:${L + B - 18}px;top:96px;font-size:11px">limit</div>
          <div class="ed-b" style="position:absolute;left:0;top:${60 - B / 2}px;width:${B}px;height:${B}px;border-radius:18px;background:var(--s-accent);transform-origin:0 50%;cursor:grab;touch-action:none;box-shadow:0 8px 20px rgba(0,0,0,.18)"></div></div></div>`);
      const b = c.$('.ed-b');
      const T = (x) => {
        const over = Math.max(0, x - L), shown = x > L ? L + rb(over, 160) : Math.max(0, x);
        const sx = 1 + Math.min(0.28, rb(over, 160) / 220), sy = 1 - Math.min(0.14, rb(over, 160) / 440);
        return `translateX(${shown}px) scale(${sx}, ${sy})`;
      };
      return {
        async play() {
          await c.wait(600);
          const p = c.pos(b);
          c.F.down([[p.x, p.y]]); await c.wait(120);
          const frames = [0, 0.25, 0.5, 0.75, 1].map((t) => ({ transform: T(t * 260) }));
          c.anim(b, frames, { ms: 1000, easing: 'inout' });
          await c.F.move([[p.x + L + rb(150, 160), p.y]], 1000);
          c.F.up();
          await c.done(c.anim(b, [{ transform: `translateX(${L}px) scale(1, 1)` }], { hero: true }));
          await c.wait(800);
          await c.done(c.anim(b, [{ transform: 'translateX(0px) scale(1, 1)' }], { ms: 500, easing: 'inout' }));
          await c.wait(300);
        },
        interact() {
          let x0 = 0, x = 0;
          c.drag(b, {
            start: () => { x0 = c.hold(b).m41; },
            move: (dx) => { x = x0 + dx; b.style.transform = T(x); },
            end: () => c.anim(b, [{ transform: `translateX(${clamp(x, 0, L)}px) scale(1, 1)` }], { hero: true }),
          });
        },
      };
    },
  },

  /* ------------------------------------------------ PiP snap points */
  pip: {
    build(c) {
      const PW = 104, PH = 150, M = 12;
      const A = [[M, 54], [W - PW - M, 54], [M, H - PH - 120], [W - PW - M, H - PH - 120]];
      c.root.style.background = '#111';
      c.dark(true);
      c.html(`<div class="k-fill">${photo(5)}</div><div class="k-fill" style="background:linear-gradient(transparent 60%,rgba(0,0,0,.5))"></div>
        <div style="position:absolute;left:0;right:0;bottom:36px;display:flex;justify-content:center;gap:18px">${[['mic', 'rgba(255,255,255,.22)'], ['camera', 'rgba(255,255,255,.22)'], ['x', '#FF3B30']].map(([i, bg]) => `<span style="width:54px;height:54px;border-radius:50%;background:${bg};-webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px);color:#fff;display:grid;place-items:center">${ico(i, 22)}</span>`).join('')}</div>
        <div style="position:absolute;left:0;right:0;top:${H / 2 - 20}px;text-align:center;color:#fff;font-weight:600;text-shadow:0 1px 6px rgba(0,0,0,.4)">Maya Chen<div style="font-weight:400;font-size:13px;opacity:.85">04:12</div></div>
        <div class="pp" style="position:absolute;left:0;top:0;width:${PW}px;height:${PH}px;border-radius:14px;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,.4);transform:${tr(...A[0])};cursor:grab;touch-action:none;border:2px solid rgba(255,255,255,.7)">${photo(2)}</div>`);
      const pp = c.$('.pp');
      let pos = [...A[0]];
      const go = (p, v = [0, 0]) => {
        const d = [p[0] - pos[0], p[1] - pos[1]], len2 = d[0] * d[0] + d[1] * d[1];
        const v0 = len2 > 4 ? (v[0] * d[0] + v[1] * d[1]) / len2 : 0;
        pos = [...p];
        return c.anim(pp, [{ transform: tr(...p) }], { hero: true, v0 });
      };
      const nearest = (x, y) => A.reduce((best, a) => (Math.hypot(a[0] - x, a[1] - y) < Math.hypot(best[0] - x, best[1] - y) ? a : best));
      const fling = async (from, dx, dy, ms) => {
        const sx = from[0] + PW / 2, sy = from[1] + PH / 2;
        c.F.down([[sx, sy]]); await c.wait(100);
        const np = [from[0] + dx, from[1] + dy];
        c.anim(pp, [{ transform: tr(...np) }], { ms, easing: 'linear' });
        await c.F.move([[sx + dx, sy + dy]], ms, 'linear');
        c.F.up();
        pos = np;
        const v = [(dx / ms) * 1000, (dy / ms) * 1000];
        await c.done(go(nearest(np[0] + v[0] * 0.25, np[1] + v[1] * 0.25), v));
      };
      return {
        async play() {
          await c.wait(600);
          await fling(A[0], 46, 62, 130);
          await c.wait(1000);
          await fling(A[3], -10, -70, 120);
          await c.wait(1000);
          await fling(A[1], -60, 10, 140);
          await c.wait(700);
        },
        interact() {
          let p0 = [0, 0];
          c.drag(pp, {
            start: () => { const m = c.hold(pp); p0 = [m.m41, m.m42]; },
            move: (dx, dy) => { pos = [p0[0] + dx, p0[1] + dy]; pp.style.transform = tr(...pos); },
            end: (dx, dy, vx, vy) => go(nearest(pos[0] + vx * 0.25, pos[1] + vy * 0.25), [vx, vy]),
          });
        },
      };
    },
  },

  /* ------------------------------------------------ replace motion with fade */
  a11yFade: {
    build(c) {
      const reduce = c.variant === 1;
      const badge = `<span class="k-badge" style="${reduce ? 'background:var(--s-accent-soft);color:var(--s-accent)' : ''}">Reduce Motion: ${reduce ? 'On' : 'Off'}</span>`;
      c.html(`<div class="k-page a1-a">${nav('Settings', { large: c.ios, right: c.ios ? '' : '' })}<div style="padding:0 16px 12px">${badge}</div><div class="k-list">${['Wi-Fi', 'Display', 'Sounds', 'Battery'].map((t, i) => `<div class="k-row a1-r" style="min-height:52px;cursor:pointer"><div class="k-tx"><div class="k-t1">${t}</div></div>${c.ios ? `<span class="k-chev">${ico('chevR', 16)}</span>` : ''}</div>`).join('')}</div></div>
        <div class="k-page a1-b" style="${reduce ? 'opacity:0' : `transform:${tx(W + 20)}`};${c.ios && !reduce ? 'box-shadow:-10px 0 30px rgba(0,0,0,.14)' : ''}">${nav('Display', { back: 'Settings' })}<div style="padding:0 16px 12px">${badge}</div>
          <div class="k-list"><div class="k-row" style="min-height:52px"><div class="k-tx"><div class="k-t1">Dark mode</div></div>${sw(true)}</div><div class="k-row" style="min-height:52px"><div class="k-tx"><div class="k-t1">Text size</div></div><span class="k-sub">Default</span></div></div></div>`);
      const a = c.$('.a1-a'), b = c.$('.a1-b');
      b.style.pointerEvents = 'none';
      let pushed = false;
      const go = (p) => {
        pushed = p;
        b.style.pointerEvents = p ? 'auto' : 'none';
        if (reduce) return c.anim(b, [{ opacity: p ? 1 : 0 }], { hero: true });
        c.anim(a, [{ transform: p ? tx(-W * 0.3) : 'none' }]);
        return c.anim(b, [{ transform: p ? 'none' : tx(W + 20) }], { hero: true });
      };
      return {
        async play() {
          await c.wait(500);
          let p = c.pos(c.$$('.a1-r')[1]);
          await c.F.tap(p.x, p.y);
          await c.done(go(true));
          await c.wait(1300);
          p = c.pos(c.$('.a1-b [data-act="back"]'));
          await c.F.tap(p.x, p.y);
          await c.done(go(false));
          await c.wait(600);
        },
      };
    },
  },

  /* ------------------------------------------------ remove bounce */
  noBounce: {
    build(c) {
      const removed = c.variant === 1;
      const sp = c.spec;
      const k = sp.type === 'spring' ? sp.k : 195;
      const spec = removed ? sp : { type: 'spring', k, z: 0.42 };
      c.html(`<div class="k-page">${nav('Wallet', { large: c.ios })}
        <div style="padding:0 16px 12px"><span class="k-badge" style="${removed ? 'background:var(--s-accent-soft);color:var(--s-accent)' : ''}">Reduce Motion: ${removed ? 'On' : 'Off'}</span></div>
        <div class="nb-c" style="margin:10px 20px;height:180px;border-radius:20px;overflow:hidden;box-shadow:var(--s-shadow);transform:translateY(420px)">${photo(1)}<div style="position:absolute"></div></div>
        <div class="nb-t k-sub" style="text-align:center;margin-top:16px;opacity:0">${removed ? 'Settles without overshoot' : 'Overshoots, then settles'}</div></div>`);
      const card = c.$('.nb-c'), t = c.$('.nb-t');
      return {
        async play() {
          await c.wait(600);
          c.anim(t, [{ opacity: 1 }], { ms: 300, easing: 'out', delay: 200 });
          await c.done(c.anim(card, [{ transform: 'translateY(420px)' }, { transform: 'none' }], { hero: true, spec }));
          await c.wait(1300);
          c.anim(t, [{ opacity: 0 }], { ms: 200, easing: 'out' });
          await c.done(c.anim(card, [{ transform: 'translateY(420px)' }], { ms: 300, easing: 'in' }));
          await c.wait(300);
        },
      };
    },
  },
};
