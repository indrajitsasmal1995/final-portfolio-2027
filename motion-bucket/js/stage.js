// Runs a scene inside the device screen: builds it, plays the scripted demo, loops,
// hands over to "try it" mode, and tracks the hero animation for the curve timeline.
import { resolve } from './motion.js';

export const CANCEL = Symbol('cancel');
export const W = 280, H = 600;
export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const rb = (x, d = 300) => (x < 0 ? -rb(-x, d) : (1 - 1 / ((x * 0.55) / d + 1)) * d);

const EASE = {
  inout: 'cubic-bezier(0.45, 0, 0.4, 1)',
  out: 'cubic-bezier(0.2, 0.7, 0.3, 1)',
  in: 'cubic-bezier(0.5, 0, 0.75, 0.2)',
  linear: 'linear',
};

const SKIP = new Set(['offset', 'easing', 'composite', 'computedOffset']);
// Freeze any running animation on el that touches the same properties, so the newest one owns them.
function settleOverlaps(el, frames, except) {
  const want = new Set();
  frames.forEach((f) => Object.keys(f).forEach((k) => { if (!SKIP.has(k)) want.add(k); }));
  el.getAnimations().forEach((a) => {
    if (a === except || !a.effect || a.effect.target !== el) return;
    const kf = a.effect.getKeyframes();
    if (kf.some((f) => Object.keys(f).some((k) => want.has(k)))) commit(a);
  });
}

function commit(a) {
  try { if (a.effect && a.effect.target && a.effect.target.isConnected) a.commitStyles(); } catch (e) { /* not rendered */ }
  try { a.cancel(); } catch (e) { /* gone */ }
}

// Animations created in the same synchronous block share a tick id.
let tick = 0, tickOpen = false;
function stamp(a) {
  if (!tickOpen) { tick++; tickOpen = true; queueMicrotask(() => { tickOpen = false; }); }
  a._tick = tick;
}

export class Stage {
  constructor({ screen, root, touch, device, onHero, onEnd }) {
    Object.assign(this, { screen, root, touch, device, onHero, onEnd });
    this.token = 0;
    this.ctx = null;
    this.hero = [];
    this.peers = [];
    this.heroTick = -1;
    this.heroMeta = null;
    this.loop = true;
    this.frozen = false;
  }

  load(opts) {
    this.opts = opts; // { item, scene, os, spec, variant, mode, speed }
    this.run();
  }

  replay() { if (this.opts) this.run(); }

  stop() {
    this.token++;
    this.dispose();
  }

  dispose() {
    if (this.ctx) this.ctx._dispose();
    this.ctx = null;
    this.hero = [];
    this.peers = [];
    this.heroTick = -1;
    this.heroMeta = null;
    this.frozen = false;
  }

  async run() {
    const token = ++this.token;
    for (;;) {
      this.dispose();
      const c = this.makeCtx(token);
      this.ctx = c;
      let scene;
      try {
        scene = this.opts.scene.build(c) || {};
      } catch (e) {
        console.error(e);
        return;
      }
      if (c.mode === 'try') {
        try { scene.interact && scene.interact(); } catch (e) { console.error(e); }
        return;
      }
      try {
        if (scene.play) await scene.play();
      } catch (e) {
        if (token !== this.token) return;
        if (e !== CANCEL && e && e.name !== 'AbortError') console.error(e);
        return;
      }
      if (token !== this.token) return;
      if (!this.loop) { this.onEnd && this.onEnd(); return; }
      await new Promise((r) => setTimeout(r, 1100));
      if (token !== this.token || this.frozen) return;
    }
  }

  /* ---- hero timeline ---- */

  _trackHero(a, metaMs) {
    if (!this._collecting) {
      this.hero.forEach(commit);
      this.peers.forEach(commit);
      this.hero = [];
      this.peers = [];
      this.heroTick = a._tick;
      this._collecting = true;
      queueMicrotask(() => { this._collecting = false; });
      this.heroMeta = { ms: metaMs };
      this.onHero && this.onHero();
    }
    this.heroMeta.ms = Math.max(this.heroMeta.ms, metaMs);
    this.hero.push(a);
  }

  // Raw progress (0 to 1) through the hero animation, or null.
  heroProgress() {
    const a = this.hero.find((x) => x.playState !== 'idle');
    if (!a) return null;
    const t = a.effect.getComputedTiming();
    const delay = a.effect.getTiming().delay || 0;
    const dur = t.activeDuration || 1;
    const local = t.localTime == null ? dur + delay : t.localTime;
    return clamp((local - delay) / dur);
  }

  freeze() {
    if (this.frozen) return;
    this.frozen = true;
    this.token++; // stop the scripted demo
    if (this.ctx) this.ctx._stopScript();
    this.root.getAnimations({ subtree: true }).forEach((a) => { try { a.pause(); } catch (e) {} });
    this.touch.getAnimations({ subtree: true }).forEach((a) => { try { a.pause(); } catch (e) {} });
  }

  // Peers are animations started in the same moment as the hero; they scrub with it.
  seek(p) {
    this.freeze();
    const lead = this.hero.find((a) => a.playState !== 'idle');
    if (!lead) return;
    const d = lead.effect.getTiming();
    const t = (d.delay || 0) + p * d.duration;
    for (const a of this.hero) if (a.playState !== 'idle') a.currentTime = (a.effect.getTiming().delay || 0) + p * a.effect.getTiming().duration;
    this.root.getAnimations({ subtree: true }).forEach((a) => {
      if (this.hero.includes(a) || a._tick !== this.heroTick) return;
      try { a.currentTime = t; } catch (e) {}
    });
  }

  /* ---- scene context ---- */

  makeCtx(token) {
    const stage = this;
    const { item, os, spec, variant, mode, speed } = this.opts;
    const root = this.root, touch = this.touch;
    let alive = true, scripted = true;
    const cancelers = new Set();
    const cleanups = [];
    const m = resolve(spec, os);

    const isAlive = () => alive && token === stage.token;
    const scale = () => {
      const r = root.getBoundingClientRect();
      return r.width / root.offsetWidth || 1;
    };
    const local = (e) => {
      const r = root.getBoundingClientRect(), s = r.width / root.offsetWidth || 1;
      return { x: (e.clientX - r.left) / s, y: (e.clientY - r.top) / s };
    };

    const c = {
      W, H, os, ios: os === 'ios', android: os === 'android', item, spec, m, mode, speed,
      variant, variantName: (item.variants || [])[variant] || '',
      top: 44, root, EASE,
      get alive() { return isAlive(); },

      html(str) { root.innerHTML = str; return root; },
      $(sel) { return root.querySelector(sel); },
      $$(sel) { return [...root.querySelectorAll(sel)]; },

      // Centre of an element in screen coordinates.
      pos(el) {
        const r = root.getBoundingClientRect(), s = r.width / root.offsetWidth || 1, b = el.getBoundingClientRect();
        return { x: (b.left - r.left + b.width / 2) / s, y: (b.top - r.top + b.height / 2) / s, w: b.width / s, h: b.height / s, l: (b.left - r.left) / s, t: (b.top - r.top) / s };
      },

      // Run a WAAPI animation with the interaction's motion (or an override).
      anim(el, frames, o = {}) {
        if (!isAlive() || !el) return { finished: Promise.resolve(), cancel() {}, effect: null };
        let ms, easing;
        if (o.easing) { ms = o.ms ?? m.ms; easing = EASE[o.easing] || o.easing; }
        else if (o.spec || o.v0) {
          const r = resolve(o.spec || spec, os, o.v0 ? clamp(o.v0, -40, 40) : 0);
          ms = o.ms ?? r.ms; easing = r.easing;
        } else { ms = o.ms ?? m.ms; easing = m.easing; }
        if (!o.delay) settleOverlaps(el, frames);
        const a = el.animate(frames, { duration: Math.max(1, ms / speed), delay: (o.delay || 0) / speed, easing, fill: 'both', iterations: o.iterations || 1 });
        stamp(a);
        if (o.delay) {
          // A queued animation takes ownership of its properties when it actually starts.
          const id = setTimeout(() => { if (isAlive() && a.playState === 'running') settleOverlaps(el, frames, a); }, o.delay / speed);
          cleanups.push(() => clearTimeout(id));
        }
        if (o.hero) stage._trackHero(a, ms);
        else if (o.iterations !== Infinity) {
          a.finished.then(() => {
            if (o.keep) return;
            // Hold animations that started with the current hero so the timeline can scrub them too.
            if (a._tick === stage.heroTick && stage.hero.length) stage.peers.push(a);
            else commit(a);
          }).catch(() => {});
        }
        return a;
      },

      // Drive a JS callback with the motion curve (scroll positions and so on).
      tween(fn, o = {}) {
        if (!isAlive()) return Promise.resolve();
        const proxy = document.createElement('i');
        proxy.className = 'k-proxy';
        root.appendChild(proxy);
        const r = o.easing ? null : resolve(o.spec || spec, os, o.v0 ? clamp(o.v0, -40, 40) : 0);
        const ms = o.ms ?? (r ? r.ms : m.ms);
        const ease = o.easing ? (t) => t : r.ease;
        const a = proxy.animate([{ opacity: 0 }, { opacity: 1 }], { duration: Math.max(1, ms / speed), delay: (o.delay || 0) / speed, easing: o.easing ? (EASE[o.easing] || o.easing) : 'linear', fill: 'both' });
        stamp(a);
        if (o.hero) stage._trackHero(a, ms);
        let last = -1;
        const tick = () => {
          if (!proxy.isConnected || a.playState === 'idle') return;
          const tm = a.effect.getComputedTiming();
          const p = o.easing ? (tm.progress ?? 1) : clamp(((tm.localTime ?? 0) - (o.delay || 0) / speed) / (ms / speed));
          if (p !== last) { last = p; fn(o.easing ? p : ease(p), p); }
          if (a.playState !== 'finished' || o.hero) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
        return a.finished.then(() => { fn(1, 1); if (!o.hero) proxy.remove(); }).catch(() => {});
      },

      done(a) { return a && a.finished ? a.finished : Promise.resolve(); },

      wait(ms) {
        return new Promise((res, rej) => {
          if (!isAlive() || !scripted) return rej(CANCEL);
          const id = setTimeout(() => { cancelers.delete(cancel); isAlive() && scripted ? res() : rej(CANCEL); }, ms / speed);
          const cancel = () => { clearTimeout(id); rej(CANCEL); };
          cancelers.add(cancel);
        });
      },

      raf(fn) {
        let id = 0, on = true;
        const loop = (t) => { if (!on || !isAlive()) return; if (fn(t) !== false) id = requestAnimationFrame(loop); };
        id = requestAnimationFrame(loop);
        const stop = () => { on = false; cancelAnimationFrame(id); };
        cleanups.push(stop);
        return stop;
      },

      on(el, type, fn, opt) {
        el.addEventListener(type, fn, opt);
        cleanups.push(() => el.removeEventListener(type, fn, opt));
      },

      // Current transform of an element, with running animations frozen into inline style.
      hold(el) {
        const mtx = new DOMMatrix(getComputedStyle(el).transform);
        el.getAnimations().forEach((a) => commit(a));
        return mtx;
      },

      tap(el, fn) {
        let sx = 0, sy = 0, t0 = 0;
        c.on(el, 'pointerdown', (e) => { sx = e.clientX; sy = e.clientY; t0 = performance.now(); });
        c.on(el, 'pointerup', (e) => {
          if (Math.hypot(e.clientX - sx, e.clientY - sy) < 8 * scale() && performance.now() - t0 < 600) fn(e, local(e));
        });
      },

      // Pointer drag with velocity (px/s, screen space).
      drag(el, h) {
        let on = false, sx = 0, sy = 0, samples = [], t0 = 0, moved = false;
        c.on(el, 'pointerdown', (e) => {
          if (e.button !== 0) return;
          on = true; moved = false; t0 = performance.now();
          const p = local(e); sx = p.x; sy = p.y;
          samples = [{ t: t0, x: p.x, y: p.y }];
          try { el.setPointerCapture(e.pointerId); } catch (err) {}
          h.start && h.start(p, e);
          e.preventDefault();
        });
        c.on(el, 'pointermove', (e) => {
          if (!on) return;
          const p = local(e), now = performance.now();
          samples.push({ t: now, x: p.x, y: p.y });
          while (samples.length > 2 && now - samples[0].t > 100) samples.shift();
          if (Math.hypot(p.x - sx, p.y - sy) > 4) moved = true;
          h.move && h.move(p.x - sx, p.y - sy, p, e);
        });
        const end = (e) => {
          if (!on) return;
          on = false;
          const p = local(e), now = performance.now();
          samples.push({ t: now, x: p.x, y: p.y });
          const s0 = samples.find((s) => now - s.t <= 90) || samples[0];
          const dt = Math.max(0.016, (now - s0.t) / 1000);
          let vx = (p.x - s0.x) / dt, vy = (p.y - s0.y) / dt;
          if (now - samples[samples.length - 2].t > 80) { vx = 0; vy = 0; }
          if (!moved && now - t0 < 500 && h.tap) h.tap(p, e);
          else h.end && h.end(p.x - sx, p.y - sy, vx, vy, p, e);
        };
        c.on(el, 'pointerup', end);
        c.on(el, 'pointercancel', end);
      },

      dark(on) { stage.screen.classList.toggle('light-status', !!on); },
      shakeDevice(px) {
        if (!stage.device) return;
        const k = [0, -px, px, -px * 0.6, px * 0.6, 0].map((x) => ({ transform: `translateX(${x}px)` }));
        stage.device.animate(k, { duration: 180, easing: 'linear' });
        try { navigator.vibrate && navigator.vibrate(px * 8); } catch (e) {}
      },

      // Scripted finger(s) for demos.
      F: {
        dots: [],
        down(pts) {
          if (!isAlive()) return;
          this.up(true);
          this.dots = pts.map(([x, y]) => {
            const d = document.createElement('div');
            d.className = 'finger';
            d.style.translate = `${x}px ${y}px`;
            d._p = [x, y];
            touch.appendChild(d);
            d.animate([{ opacity: 0, scale: '1.5' }, { opacity: 1, scale: '1' }], { duration: 120 / speed, easing: 'ease-out', fill: 'both' });
            return d;
          });
        },
        move(targets, ms, easing = 'inout') {
          if (!isAlive()) return Promise.reject(CANCEL);
          const anims = this.dots.map((d, i) => {
            const t = targets[i] || targets[0];
            const path = Array.isArray(t[0]) ? t : [t];
            const frames = [d._p, ...path].map(([x, y]) => ({ translate: `${x}px ${y}px` }));
            d._p = path[path.length - 1];
            const a = d.animate(frames, { duration: ms / speed, easing: EASE[easing] || easing, fill: 'forwards' });
            return a.finished;
          });
          return Promise.all(anims).catch(() => { throw CANCEL; });
        },
        up(instant) {
          const old = this.dots;
          this.dots = [];
          old.forEach((d) => {
            if (instant) return d.remove();
            const a = d.animate([{ opacity: 1 }, { opacity: 0, scale: '1.4' }], { duration: 180 / speed, easing: 'ease-out', fill: 'forwards' });
            a.finished.then(() => d.remove()).catch(() => d.remove());
          });
        },
        async tap(x, y) {
          this.down([[x, y]]);
          await c.wait(110);
          this.up();
        },
        async drag(from, to, ms, easing = 'inout') {
          this.down([from]);
          await c.wait(90);
          await this.move([to], ms, easing);
          this.up();
        },
      },

      _stopScript() {
        scripted = false;
        cancelers.forEach((f) => f());
        cancelers.clear();
      },
      _dispose() {
        alive = false;
        c._stopScript();
        cleanups.forEach((f) => { try { f(); } catch (e) {} });
        root.getAnimations({ subtree: true }).forEach((a) => { try { a.cancel(); } catch (e) {} });
        touch.innerHTML = '';
        root.innerHTML = '';
        root.removeAttribute('style');
        stage.screen.classList.remove('light-status');
      },
    };
    return c;
  }
}
