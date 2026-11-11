// Confetti: particle bursts, cannons, rain, emoji, fireworks and celebrations.
// Each piece's flight is solved up front (gravity + air drag) and played as WAAPI keyframes,
// so slow motion and curve scrubbing work on every piece.
import { W, H, clamp, tr, quiet } from './util.js';
import { ico, photo, rows, nav, btn, av } from '../kit.js';
import { ballistic, stiffnessOf } from '../motion.js';

const COLORS = ['#FF4F00', '#FFB800', '#2EC4B6', '#7A5CFA', '#FF4D8D', '#3A86FF', '#34C759'];
const LAYER = '<div class="cf-layer" style="position:absolute;inset:0;pointer-events:none;z-index:30;overflow:hidden"></div>';
const svgShape = (d, color) => `<svg viewBox="0 0 24 24" width="100%" height="100%" style="display:block;fill:${color};stroke:none"><path d="${d}"/></svg>`;
const STAR = 'M12 2l2.9 6.6 7.1.6-5.4 4.7 1.6 7L12 17.3 5.8 20.9l1.6-7L2 9.2l7.1-.6z';
const HEART = 'M12 21l-1.4-1.3C5.4 15 2 11.9 2 8.1 2 5 4.4 2.6 7.5 2.6c1.7 0 3.4.8 4.5 2.1 1.1-1.3 2.8-2.1 4.5-2.1C19.6 2.6 22 5 22 8.1c0 3.8-3.4 6.9-8.6 11.6z';

// Small seeded random, so a replay draws the same confetti.
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function piece(shape, color, R) {
  const el = document.createElement('i');
  let w = 8, h = 8, css = '';
  switch (shape) {
    case 'rect': w = 6 + R() * 3; h = 9 + R() * 5; css = `background:${color};border-radius:1.5px`; break;
    case 'circle': w = h = 6 + R() * 3; css = `background:${color};border-radius:50%`; break;
    case 'strip': w = 3.5; h = 16 + R() * 10; css = `background:${color};border-radius:2px`; break;
    case 'star': w = h = 11 + R() * 5; el.innerHTML = svgShape(STAR, color); break;
    case 'heart': w = h = 22 + R() * 10; el.innerHTML = svgShape(HEART, color); break;
    case 'spark': w = h = 3.5 + R() * 2.5; css = `background:${color};border-radius:50%;box-shadow:0 0 7px 1px ${color}`; break;
    default: w = h = 26 + R() * 8; el.textContent = shape; css = `font-size:${(w * 0.82).toFixed(0)}px;line-height:${h}px;text-align:center`;
  }
  el.style.cssText = `position:absolute;left:0;top:0;width:${w}px;height:${h}px;margin:${-h / 2}px 0 0 ${-w / 2}px;will-change:transform,opacity;${css}`;
  return el;
}

// Fire one burst. Options override the interaction's (or the tuned) burst spec.
// The first piece flies exactly at the spec's angle and speed and drives the curve.
function emit(c, layer, o = {}) {
  const sp = { ...c.spec, ...(o.spec || {}) };
  if (sp.type !== 'burst') return Promise.resolve();
  [...layer.children].forEach((ch) => {
    const an = ch.getAnimations();
    if (!an.length || an.every((a) => a.playState === 'finished')) ch.remove();
  });
  const R = rng(o.seed ?? 11);
  const n = Math.max(1, Math.round(o.count ?? sp.count));
  const shapes = o.shapes || ['rect', 'circle'];
  const colors = o.colors || COLORS;
  const fadeAt = o.fadeAt ?? 0.72;
  let last = null, lastEnd = 0;
  for (let i = 0; i < n; i++) {
    const lead = i === 0 && o.hero !== false;
    const ang = (((o.angle ?? sp.angle) + (i === 0 ? 0 : (R() - 0.5) * sp.spread)) * Math.PI) / 180;
    const spd = sp.speed * (i === 0 ? 1 : 0.45 + R() * 0.6);
    const fly = ballistic(Math.cos(ang) * spd, Math.sin(ang) * spd, sp.gravity, sp.drag);
    const x0 = typeof o.x === 'function' ? o.x(R, i) : o.x;
    const y0 = typeof o.y === 'function' ? o.y(R, i) : o.y;
    const life = sp.life * (i === 0 ? 1 : 0.75 + R() * 0.4);
    const spin = (R() - 0.5) * (o.flat ? 120 : 1100), r0 = o.flat ? (R() - 0.5) * 30 : R() * 360;
    const flutter = 1.2 + R() * 3.5, phase = R() * 360;
    const sway = (o.sway || 0) * (0.5 + R() * 0.8), swayHz = 0.6 + R() * 1.2;
    const frames = [];
    for (let k = 0, N = 32; k <= N; k++) {
      const p = k / N, t = (p * life) / 1000, [dx, dy] = fly(t);
      const x = x0 + dx + sway * Math.sin(t * swayHz * Math.PI * 2 + phase);
      const y = y0 - dy;
      const s = o.grow ? Math.min(1, 0.3 + p * 6) : 1;
      frames.push({
        transform: `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) rotate(${(r0 + spin * t).toFixed(0)}deg)${o.flat ? '' : ` rotateX(${(phase + flutter * 360 * t).toFixed(0)}deg)`} scale(${s.toFixed(2)})`,
        opacity: p < fadeAt ? 1 : 1 - (p - fadeAt) / (1 - fadeAt),
      });
    }
    const el = piece(shapes[Math.floor(R() * shapes.length)], colors[Math.floor(R() * colors.length)], R);
    layer.appendChild(el);
    const delay = o.delay ? o.delay(R, i) : 0;
    const a = c.anim(el, frames, { easing: 'linear', ms: life, delay, hero: lead });
    if (delay + life > lastEnd) { lastEnd = delay + life; last = a; }
  }
  return c.done(last);
}

const fixedSpring = (response, z) => ({ type: 'spring', k: Math.round(stiffnessOf(response)), z });

export default {
  /* ------------------------------------------------ confetti burst */
  confettiBurst: {
    build(c) {
      const shapes = [['rect', 'circle'], ['strip', 'strip', 'rect'], ['rect', 'circle', 'strip', 'star']][c.variant] || ['rect', 'circle'];
      c.html(`<div class="k-page">${nav('Rewards', { large: c.ios })}
          <div style="margin:4px 16px 0;padding:22px 18px 20px;border-radius:20px;background:var(--s-surface);text-align:center;box-shadow:var(--s-shadow)">
            <div style="width:62px;height:62px;margin:0 auto 10px;border-radius:50%;background:#FFB800;color:#fff;display:grid;place-items:center">${ico('star', 30)}</div>
            <div style="font-size:40px;font-weight:800;letter-spacing:-0.02em;line-height:1.1">500</div>
            <div class="k-sub" style="font-size:14px;margin-top:4px">points for finishing the trail challenge</div></div>
          <div class="k-list" style="margin-top:14px">${['Ridge Trail, 4.2 km', 'Seven days in a row', 'First photo shared'].map((t) => `<div class="k-row" style="min-height:46px"><span style="color:var(--s-ok);display:flex">${ico('check', 18)}</span><div class="k-tx"><div class="k-t1" style="font-weight:400">${t}</div></div></div>`).join('')}</div>
          <div style="position:absolute;left:20px;right:20px;bottom:44px">${btn('Claim reward', 'filled', 'style="width:100%" data-claim')}</div></div>${LAYER}`);
      const layer = c.$('.cf-layer'), b = c.$('[data-claim]');
      const pop = () => c.anim(b, [{ transform: 'scale(0.93)' }, { transform: 'scale(1)' }], { spec: fixedSpring(0.3, 0.45) });
      let seed = 3;
      const fire = (x, y) => emit(c, layer, { x, y, shapes, seed: seed++ });
      return {
        async play() {
          await c.wait(500);
          const p = c.pos(b);
          await c.F.tap(p.x, p.y);
          pop();
          await fire(p.x, p.t);
          await c.wait(300);
        },
        interact() {
          c.tap(c.root, (e, p) => {
            if (e.target.closest('[data-claim]')) { pop(); const q = c.pos(b); quiet(fire(q.x, q.t)); }
            else quiet(fire(p.x, p.y));
          });
        },
      };
    },
  },

  /* ------------------------------------------------ side cannons */
  confettiCannons: {
    build(c) {
      const both = c.variant === 0;
      const C = 2 * Math.PI * 58;
      c.html(`<div class="k-page">${nav('Activity', { large: c.ios })}
          <div style="display:grid;place-items:center;padding:12px 0 10px"><div style="position:relative;width:156px;height:156px">
            <svg width="156" height="156" viewBox="0 0 156 156" style="transform:rotate(-90deg)"><circle cx="78" cy="78" r="58" stroke="var(--s-surface-2)" stroke-width="16" fill="none"/><circle class="cc-ring" cx="78" cy="78" r="58" stroke="var(--s-accent)" stroke-width="16" fill="none" stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="${C * 0.14}"/></svg>
            <div style="position:absolute;inset:0;display:grid;place-items:center;text-align:center"><div><div class="cc-n" style="font-size:26px;font-weight:800">8,612</div><div class="k-sub">steps today</div></div></div></div></div>
          <div class="cc-t" style="text-align:center;font-size:21px;font-weight:700;opacity:0">Goal reached</div>
          <div class="k-list" style="margin-top:16px">${[['Distance', '7.4 km'], ['Active minutes', '64 min']].map(([a, v]) => `<div class="k-row" style="min-height:48px"><div class="k-tx"><div class="k-t1" style="font-weight:400">${a}</div></div><b style="font-weight:600">${v}</b></div>`).join('')}</div></div>${LAYER}`);
      const layer = c.$('.cf-layer'), ring = c.$('.cc-ring');
      let seed = 21;
      const fire = () => {
        const s = seed; seed += 2;
        const shapes = ['rect', 'circle', 'strip'];
        const left = emit(c, layer, { x: -6, y: H - 34, shapes, seed: s });
        if (!both) return left;
        const right = emit(c, layer, { x: W + 6, y: H - 34, angle: 180 - c.spec.angle, shapes, seed: s + 1, hero: false });
        return Promise.all([left, right]);
      };
      const finish = () => {
        c.$('.cc-n').textContent = '10,000';
        c.anim(c.$('.cc-t'), [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { ms: 300, easing: 'out' });
        return c.anim(ring, [{ strokeDashoffset: 0 }], { ms: 700, easing: 'out' });
      };
      return {
        async play() {
          await c.wait(500);
          await c.done(finish());
          await fire();
          await c.wait(300);
        },
        interact() { finish(); quiet(fire()); c.tap(c.root, () => quiet(fire())); },
      };
    },
  },

  /* ------------------------------------------------ confetti rain */
  confettiRain: {
    build(c) {
      const heavy = c.variant === 1;
      const bubble = (me, t, cls = '', style = '') => `<div class="${cls}" style="align-self:${me ? 'flex-end' : 'flex-start'};max-width:76%;padding:9px 13px;border-radius:19px;font-size:14.5px;line-height:1.35;background:${me ? 'var(--s-accent)' : 'var(--s-surface-2)'};color:${me ? 'var(--s-on-accent)' : 'var(--s-ink)'};${style}">${t}</div>`;
      c.html(`<div class="k-page">${nav('Maya', { back: c.ios ? ' ' : true })}
          <div style="flex:1;display:flex;flex-direction:column;gap:8px;padding:12px;justify-content:flex-end;padding-bottom:96px">
            ${bubble(0, 'Wait, is it today?')}${bubble(1, 'It is!')}${bubble(1, 'Happy birthday! 🎉', 'cr-b', 'opacity:0')}
            <div class="cr-cap k-sub" style="align-self:flex-end;font-size:11.5px;opacity:0">Sent with Confetti</div></div>
          <div style="position:absolute;left:12px;right:12px;bottom:34px;height:38px;border-radius:19px;box-shadow:inset 0 0 0 1px var(--s-line);display:flex;align-items:center;padding:0 14px" class="k-sub">Message</div></div>${LAYER}`);
      const layer = c.$('.cf-layer');
      let seed = 5;
      const rain = () => emit(c, layer, {
        x: (R, i) => (i === 0 ? W / 2 : R() * W),
        y: (R, i) => (i === 0 ? -16 : -16 - R() * 40),
        delay: (R, i) => (i === 0 ? 0 : R() * 1700),
        sway: 20,
        count: (heavy ? 2 : 1) * c.spec.count,
        shapes: ['rect', 'circle', 'strip'],
        seed: seed++,
      });
      const send = () => {
        c.anim(c.$('.cr-b'), [{ opacity: 0, transform: 'translateY(16px) scale(0.92)' }, { opacity: 1, transform: 'none' }], { spec: fixedSpring(0.35, 0.75) });
        c.anim(c.$('.cr-cap'), [{ opacity: 0 }, { opacity: 1 }], { ms: 250, easing: 'out', delay: 200 });
      };
      return {
        async play() {
          await c.wait(400);
          send();
          await c.wait(280);
          await rain();
          await c.wait(300);
        },
        interact() { send(); quiet(rain()); c.tap(c.root, () => quiet(rain())); },
      };
    },
  },

  /* ------------------------------------------------ emoji burst */
  emojiBurst: {
    build(c) {
      const pop = c.variant === 1;
      const emojis = ['😍', '🔥', '👏', '🎉'];
      c.dark(true);
      c.root.style.background = '#000';
      c.html(`<div class="k-fill">${photo(4)}</div><div class="k-fill" style="background:linear-gradient(rgba(0,0,0,.4),transparent 28%,transparent 55%,rgba(0,0,0,.6))"></div>
        <div style="position:absolute;left:14px;top:52px;display:flex;align-items:center;gap:8px;color:#fff">${av('Leo', '#3F7FE0', 30)}<b style="font-size:13.5px;font-weight:600">leo.park</b><span style="background:#FF2D55;font-size:10.5px;font-weight:700;padding:3px 7px;border-radius:5px;letter-spacing:.05em">LIVE</span><span style="font-size:12px;opacity:.9">1.2k watching</span></div>
        <div style="position:absolute;left:14px;bottom:${pop ? 124 : 92}px;display:flex;flex-direction:column;gap:8px;color:#fff;font-size:13px;max-width:200px">${[['ana', 'that light 😍'], ['sam.o', 'where is this?'], ['maya', 'North Pier!']].map(([u, t]) => `<div><b style="font-weight:600;margin-right:6px">${u}</b>${t}</div>`).join('')}</div>
        ${pop ? `<div style="position:absolute;left:14px;right:70px;bottom:64px;display:flex;gap:10px">${emojis.map((e) => `<span class="eb-e" style="width:44px;height:44px;border-radius:22px;background:rgba(255,255,255,.18);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);display:grid;place-items:center;font-size:24px;cursor:pointer">${e}</span>`).join('')}</div>` : ''}
        <div style="position:absolute;left:14px;right:70px;bottom:20px;height:36px;border-radius:18px;box-shadow:inset 0 0 0 1px rgba(255,255,255,.5);color:rgba(255,255,255,.8);display:flex;align-items:center;padding:0 14px;font-size:13px">Add a comment</div>
        <span class="eb-h" style="position:absolute;right:14px;bottom:18px;width:42px;height:42px;border-radius:21px;background:rgba(255,255,255,.2);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);display:grid;place-items:center;color:#fff;cursor:pointer">${ico('heart', 22)}</span>
        ${LAYER}`);
      const layer = c.$('.cf-layer'), heartBtn = c.$('.eb-h'), es = c.$$('.eb-e');
      let seed = 40;
      const tapFx = (el) => c.anim(el, [{ transform: 'scale(0.85)' }, { transform: 'scale(1)' }], { spec: fixedSpring(0.3, 0.45) });
      const hearts = () => {
        const p = c.pos(heartBtn);
        tapFx(heartBtn);
        return emit(c, layer, { x: (R) => p.x + (R() - 0.5) * 10, y: p.y - 24, shapes: ['heart'], colors: ['#FF2D55', '#FF4D8D', '#FF8A3D', '#FFB800', '#B57BFF'], flat: true, grow: true, sway: 16, fadeAt: 0.55, seed: seed++ });
      };
      const burst = (el) => {
        const p = c.pos(el);
        tapFx(el);
        return emit(c, layer, { x: p.x, y: p.y, shapes: [el.textContent], flat: true, grow: true, count: 14, fadeAt: 0.6, seed: seed++, spec: { speed: 620, gravity: 900, drag: 2.2, spread: 360, life: 1500 } });
      };
      return {
        async play() {
          await c.wait(500);
          if (!pop) {
            let last;
            for (let i = 0; i < 5; i++) {
              const p = c.pos(heartBtn);
              await c.F.tap(p.x, p.y);
              last = hearts();
              await c.wait(230);
            }
            await last;
          } else {
            for (const i of [0, 3]) {
              const p = c.pos(es[i]);
              await c.F.tap(p.x, p.y);
              await burst(es[i]);
            }
          }
          await c.wait(300);
        },
        interact() {
          c.tap(heartBtn, () => quiet(hearts()));
          es.forEach((e) => c.tap(e, () => quiet(burst(e))));
        },
      };
    },
  },

  /* ------------------------------------------------ fireworks */
  fireworks: {
    build(c) {
      const finale = c.variant === 1;
      c.dark(true);
      c.root.style.background = '#070B1F';
      const R = rng(9);
      const stars = Array.from({ length: 34 }, () => `<i style="position:absolute;left:${(R() * W).toFixed(0)}px;top:${(40 + R() * 380).toFixed(0)}px;width:${R() < 0.2 ? 2.5 : 1.5}px;height:${R() < 0.2 ? 2.5 : 1.5}px;border-radius:50%;background:#fff;opacity:${(0.3 + R() * 0.6).toFixed(2)}"></i>`).join('');
      const skyline = Array.from({ length: 11 }, (_, i) => { const h = 40 + ((i * 53) % 70); return `<rect x="${i * 26}" y="${130 - h}" width="${22 + (i % 3) * 4}" height="${h}" />`; }).join('');
      c.html(`<div class="k-fill" style="background:linear-gradient(#070B1F, #1A1F4A 70%, #2C2459)">${stars}</div>
        <svg width="${W}" height="130" viewBox="0 0 ${W} 130" style="position:absolute;left:0;bottom:0;fill:#05060F;stroke:none">${skyline}</svg>
        <div class="fw-t" style="position:absolute;left:0;right:0;top:${H / 2 + 40}px;text-align:center;color:#fff;opacity:0"><div style="font-size:28px;font-weight:800;letter-spacing:-0.01em">Happy New Year</div><div style="font-size:13.5px;opacity:.75;margin-top:4px">Tap the sky for more</div></div>
        ${LAYER}`);
      const layer = c.$('.cf-layer');
      const palette = ['#FFB800', '#FF4D8D', '#2EC4B6', '#B57BFF', '#FF6A26'];
      let seed = 70, ci = 0;
      const launch = async (x, y, color, hero = true) => {
        const s = seed++;
        const rk = document.createElement('i');
        rk.style.cssText = `position:absolute;left:0;top:0;width:4px;height:16px;margin:-8px 0 0 -2px;border-radius:2px;background:linear-gradient(#fff, ${color} 40%, transparent);box-shadow:0 0 8px ${color}`;
        layer.appendChild(rk);
        await c.done(c.anim(rk, [{ transform: tr(x, H - 70) }, { transform: tr(x, y) }], { ms: 760, easing: 'out' }));
        rk.remove();
        const flash = document.createElement('i');
        flash.style.cssText = `position:absolute;left:0;top:0;width:40px;height:40px;margin:-20px 0 0 -20px;border-radius:50%;background:radial-gradient(circle, #fff, ${color} 40%, transparent 70%)`;
        layer.appendChild(flash);
        c.anim(flash, [{ transform: `${tr(x, y)} scale(0.2)`, opacity: 1 }, { transform: `${tr(x, y)} scale(2.4)`, opacity: 0 }], { ms: 380, easing: 'out' }).finished.then(() => flash.remove()).catch(() => {});
        return emit(c, layer, { x, y, shapes: ['spark'], colors: [color, color, '#FFFFFF', '#FFE9A8'], flat: true, fadeAt: 0.45, seed: s, hero });
      };
      const title = () => c.anim(c.$('.fw-t'), [{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }], { ms: 500, easing: 'out' });
      return {
        async play() {
          await c.wait(300);
          if (!finale) {
            const a = launch(140, 200, palette[0]);
            a.catch(() => {});
            await c.wait(900);
            title();
            await a;
          } else {
            const a = launch(80, 230, palette[1]); a.catch(() => {});
            await c.wait(380);
            const b = launch(205, 175, palette[2], false); b.catch(() => {});
            await c.wait(330);
            const d = launch(140, 270, palette[0], false); d.catch(() => {});
            await c.wait(500);
            title();
            await Promise.all([a, b, d]);
          }
          await c.wait(400);
        },
        interact() {
          title();
          c.tap(c.root, (e, p) => { launch(p.x, clamp(p.y, 90, 420), palette[ci++ % palette.length]).catch(() => {}); });
        },
      };
    },
  },

  /* ------------------------------------------------ achievement unlock */
  achievement: {
    build(c) {
      c.html(`<div class="k-page">${nav('Learn', { large: c.ios })}${rows(6)}</div>
        <div class="ac-s" style="position:absolute;inset:0;z-index:5;background:rgba(0,0,0,.6);opacity:0"></div>
        <div style="position:absolute;left:0;right:0;top:110px;z-index:6;display:flex;flex-direction:column;align-items:center;text-align:center;color:#fff">
          <div style="position:relative;width:220px;height:220px;display:grid;place-items:center">
            <div class="ac-r" style="position:absolute;inset:0;border-radius:50%;background:repeating-conic-gradient(rgba(255,214,102,.55) 0 9deg, transparent 9deg 30deg);-webkit-mask:radial-gradient(circle, #000 25%, transparent 70%);mask:radial-gradient(circle, #000 25%, transparent 70%);opacity:0"></div>
            <div class="ac-b" style="position:relative;width:116px;height:116px;border-radius:50%;background:radial-gradient(circle at 35% 30%, #FFE7A6, #FFB800 55%, #DB8400);box-shadow:0 12px 30px rgba(255,184,0,.45), inset 0 -6px 0 rgba(0,0,0,.12);display:grid;place-items:center;color:#fff;transform:scale(0)">${ico('bolt', 54)}</div></div>
          <div class="ac-t" style="opacity:0"><div style="font-size:26px;font-weight:800">7-day streak</div><div style="font-size:14px;opacity:.85;margin-top:4px">You practised every day this week.</div></div></div>
        <div class="ac-c" style="position:absolute;left:24px;right:24px;bottom:46px;z-index:6;opacity:0">${btn('Continue', 'filled', 'style="width:100%"')}</div>${LAYER}`);
      const layer = c.$('.cf-layer'), badge = c.$('.ac-b'), rays = c.$('.ac-r');
      let seed = 90;
      const run = () => {
        c.anim(c.$('.ac-s'), [{ opacity: 0 }, { opacity: 1 }], { ms: 260, easing: 'out' });
        c.anim(badge, [{ transform: 'scale(0) rotate(-30deg)' }, { transform: 'scale(1) rotate(0deg)' }], { spec: fixedSpring(0.55, 0.5) });
        c.anim(rays, [{ opacity: 0 }, { opacity: 1 }], { ms: 500, easing: 'out', delay: 120 });
        c.anim(rays, [{ transform: 'rotate(0deg)' }, { transform: 'rotate(360deg)' }], { ms: 9000, easing: 'linear', iterations: Infinity });
        c.anim(c.$('.ac-t'), [{ opacity: 0, transform: 'translateY(12px)' }, { opacity: 1, transform: 'none' }], { ms: 360, easing: 'out', delay: 220 });
        c.anim(c.$('.ac-c'), [{ opacity: 0 }, { opacity: 1 }], { ms: 300, easing: 'out', delay: 420 });
        const p = c.pos(badge);
        return emit(c, layer, { x: p.x, y: p.y, shapes: ['rect', 'circle', 'star'], seed: seed++ });
      };
      return {
        async play() { await c.wait(400); await run(); await c.wait(900); },
        interact() { quiet(run()); c.tap(c.root, () => quiet(run())); },
      };
    },
  },

  /* ------------------------------------------------ confetti and reduce motion */
  reducedConfetti: {
    build(c) {
      const reduced = c.variant === 1;
      const spots = [[-34, 8], [128, 2], [-18, 104], [140, 92], [52, -38], [60, 146]];
      c.html(`<div class="k-page" style="align-items:center;padding-top:calc(var(--sb) + 70px)">
          <div style="position:relative;width:120px;height:120px">
            <div class="rc-g" style="position:absolute;inset:-36px;border-radius:50%;background:radial-gradient(circle, rgba(52,199,89,.38), transparent 65%);opacity:0"></div>
            <div class="rc-c" style="position:absolute;inset:0;border-radius:50%;background:var(--s-ok);display:grid;place-items:center;color:#fff;opacity:0">${ico('check', 56)}</div>
            ${spots.map(([x, y], i) => `<span class="rc-s" style="position:absolute;left:${x}px;top:${y}px;width:${14 + (i % 3) * 4}px;height:${14 + (i % 3) * 4}px;opacity:0">${svgShape(STAR, COLORS[i % COLORS.length])}</span>`).join('')}
          </div>
          <div class="rc-t" style="margin-top:34px;text-align:center;opacity:0"><div style="font-size:24px;font-weight:700">Order placed</div><div class="k-sub" style="margin-top:4px">Arrives Thursday</div></div>
          <div style="margin-top:22px"><span class="k-badge" style="${reduced ? 'background:var(--s-accent-soft);color:var(--s-accent)' : ''}">Reduce Motion: ${reduced ? 'On' : 'Off'}</span></div></div>${LAYER}`);
      const layer = c.$('.cf-layer'), check = c.$('.rc-c'), text = c.$('.rc-t');
      return {
        async play() {
          await c.wait(500);
          if (reduced) {
            c.anim(check, [{ opacity: 0 }, { opacity: 1 }], { ms: 250, easing: 'linear' });
            c.anim(text, [{ opacity: 0 }, { opacity: 1 }], { ms: 300, easing: 'linear', delay: 150 });
            c.$$('.rc-s').forEach((s, i) => c.anim(s, [{ opacity: 0 }, { opacity: 1, offset: 0.35 }, { opacity: 0 }], { ms: 1400, easing: 'linear', delay: 120 + i * 90 }));
            await c.done(c.anim(c.$('.rc-g'), [{ opacity: 0 }, { opacity: 1, offset: 0.4 }, { opacity: 0.55 }], { hero: true, ms: 1200, easing: 'inout' }));
            await c.wait(1600);
            return;
          }
          c.anim(check, [{ opacity: 0, transform: 'scale(0)' }, { opacity: 1, transform: 'scale(1)' }], { spec: fixedSpring(0.45, 0.55) });
          c.anim(text, [{ opacity: 0, transform: 'translateY(12px)' }, { opacity: 1, transform: 'none' }], { ms: 360, easing: 'out', delay: 160 });
          await emit(c, layer, {
            x: (R, i) => (i === 0 ? W / 2 : R() * W),
            y: (R, i) => (i === 0 ? -16 : -16 - R() * 40),
            delay: (R, i) => (i === 0 ? 0 : R() * 1200),
            sway: 18,
            shapes: ['rect', 'circle', 'strip'],
            seed: 13,
          });
          await c.wait(500);
        },
      };
    },
  },
};
