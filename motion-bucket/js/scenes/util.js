// Shared helpers for scenes.
import { W, H, clamp, lerp, rb } from '../stage.js';

export { W, H, clamp, lerp, rb };
export const ty = (y) => `translateY(${y}px)`;
export const tx = (x) => `translateX(${x}px)`;
export const tr = (x, y) => `translate(${x}px, ${y}px)`;
export const quiet = (p) => p && p.catch ? p.catch(() => {}) : p;

// Turn pointer drags and the mouse wheel into scrolling on a native overflow container, with a little momentum.
export function dragScroll(c, el, { onEnd, onScroll } = {}) {
  let s0 = 0, stopGlide = null, ended = 0;
  const settle = () => { clearTimeout(ended); ended = setTimeout(() => onEnd && onEnd(), 140); };
  c.on(el, 'scroll', () => { onScroll && onScroll(el.scrollTop); if (!down) settle(); });
  let down = false;
  c.drag(el, {
    start: () => { down = true; s0 = el.scrollTop; stopGlide && stopGlide(); },
    move: (dx, dy) => { el.scrollTop = s0 - dy; },
    end: (dx, dy, vx, vy) => {
      down = false;
      let v = -vy / 1000;
      if (Math.abs(v) < 0.1) { settle(); return; }
      let last = performance.now();
      stopGlide = c.raf((t) => {
        const dt = Math.min(32, t - last); last = t;
        v *= Math.pow(0.996, dt);
        const before = el.scrollTop;
        el.scrollTop += v * dt;
        if (Math.abs(v) < 0.03 || el.scrollTop === before) { settle(); return false; }
      });
    },
    tap: () => { down = false; },
  });
}

// Reorderable slots for drag-and-drop lists and grids.
export function slots(c, els, pos, { lift, drop, onChange } = {}) {
  const order = els.map((_, i) => i); // order[slot] = element index
  const place = (hero = false, skip = -1) => order.forEach((ei, s) => {
    if (ei === skip) return;
    const p = pos(s);
    c.anim(els[ei], [{ transform: `translate(${p.x}px, ${p.y}px)` }], { hero });
  });
  order.forEach((ei, s) => { const p = pos(s); els[ei].style.transform = `translate(${p.x}px, ${p.y}px)`; });
  const nearest = (x, y) => {
    let best = 0, bd = Infinity;
    order.forEach((_, s) => { const p = pos(s); const d = Math.hypot(p.x - x, p.y - y); if (d < bd) { bd = d; best = s; } });
    return best;
  };
  const moveTo = (ei, s) => {
    const cur = order.indexOf(ei);
    if (cur === s) return false;
    order.splice(cur, 1);
    order.splice(s, 0, ei);
    place(false, ei);
    onChange && onChange(order);
    return true;
  };
  return { order, pos, place, nearest, moveTo, slotOf: (ei) => order.indexOf(ei) };
}
