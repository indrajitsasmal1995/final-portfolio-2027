import { CATEGORIES, ITEMS, byId } from './catalog.js';
import { resolve, character, code, CURVES, responseOf, stiffnessOf, apexOf } from './motion.js';
import { Stage } from './stage.js';
import { setKitOS } from './kit.js';
import SCENES from './scenes/index.js';

const $ = (s) => document.querySelector(s);
const store = {
  get(k, d) { try { const v = localStorage.getItem('motion-bucket:' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('motion-bucket:' + k, JSON.stringify(v)); } catch (e) { /* storage blocked */ } },
};
const pad2 = (n) => String(n).padStart(2, '0');
// One colour per category, used for the index swatches and the crumb chip.
const HUES = ['#FF5A1F', '#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#06B6D4', '#6366F1', '#EC4899', '#EF4444', '#14B8A6', '#D946EF'];
const PROP_LABEL = { translateY: 'Vertical offset', translateX: 'Horizontal offset', scale: 'Scale', opacity: 'Opacity', rotateY: '3D rotation', rotate: 'Rotation', height: 'Height', width: 'Width', blur: 'Blur radius', elevation: 'Elevation', scroll: 'Scroll position', particles: 'Particles' };

const state = {
  id: ITEMS[0].id,
  os: store.get('os', 'ios') === 'android' ? 'android' : 'ios',
  variant: 0,
  mode: 'demo',
  speed: 1,
  loop: true,
  q: '',
  tabs: { ios: 'swiftui', android: 'compose' },
  overrides: store.get('overrides', {}),
  collapsed: new Set(store.get('collapsed', [])), // sections hidden in the index
  qClosed: new Set(), // sections hidden while a search is active (not saved)
  theme: store.get('theme', 'auto'),
  autoOpened: null, // an index section that Next/Previous opened, closed again on leaving it
};

const els = {
  list: $('#list'), q: $('#q'), crumb: $('#crumb'), title: $('#title'), summary: $('#summary'), variants: $('#variants'),
  bench: $('#bench'), wrap: $('#deviceWrap'), device: $('#device'), screen: $('#screen'), scr: $('#scr'), touch: $('#touch'),
  label: $('#deviceLabel'), stTime: $('#stTime'), hint: $('#tryHint'),
  osSeg: $('#osSeg'), modeSeg: $('#modeSeg'), speedSeg: $('#speedSeg'), loop: $('#loop'), replay: $('#replay'),
  feel: $('#feelWord'), tunedChip: $('#tunedChip'), fType: $('#fType'), fDur: $('#fDur'), fProp: $('#fProp'), fOs: $('#fOs'),
  plot: $('#plot'), rT: $('#rT'), rV: $('#rV'), typeSeg: $('#typeSeg'), tune: $('#tuneFields'), derived: $('#derived'), reset: $('#reset'), resetCode: $('#resetCode'),
  tuneStatus: $('#tuneStatus'), tsText: $('#tsText'), codeNote: $('#codeNote'),
  api: $('#api'), apiK: $('#apiK'), codeTabs: $('#codeTabs'), code: $('#code'), copy: $('#copy'),
  listCount: $('#listCount'), foldAll: $('#foldAll'),
  index: $('#index'), indexScrim: $('#indexScrim'), toast: $('#toast'), theme: $('#theme'),
};

const stage = new Stage({
  screen: els.screen, root: els.scr, touch: els.touch, device: els.device,
  onHero: () => {}, onEnd: () => {},
});

const item = () => byId[state.id];
const okey = () => `${state.id}:${state.os}`;
const spec = () => state.overrides[okey()] || item().motion[state.os];
const canTry = () => !!item().tryHint;

/* ---------------- index ---------------- */

function filtered() {
  const q = state.q.trim().toLowerCase();
  if (!q) return ITEMS;
  return ITEMS.filter((x) => (x.name + ' ' + CATEGORIES[x.cat] + ' ' + x.sum).toLowerCase().includes(q));
}

// Sections can be folded away. A search starts with every matching section open.
const closedSet = () => (state.q.trim() ? state.qClosed : state.collapsed);
const isClosed = (ci) => closedSet().has(ci);
const CHEVRON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>';

function renderList() {
  const list = filtered();
  els.listCount.textContent = state.q.trim() ? `${list.length} of ${ITEMS.length} match` : `${ITEMS.length} interactions`;
  if (!list.length) { els.list.innerHTML = `<div class="list-empty">Nothing matches “${escapeHtml(state.q)}”.</div>`; updateFoldAll(); return; }
  let html = '';
  CATEGORIES.forEach((cat, ci) => {
    const items = list.filter((x) => x.cat === ci);
    if (!items.length) return;
    const all = ITEMS.filter((x) => x.cat === ci);
    const closed = isClosed(ci), hasOn = items.some((x) => x.id === state.id);
    html += `<div class="cat ${closed ? 'closed' : ''} ${hasOn ? 'has-on' : ''}" data-cat="${ci}" style="--hue:${HUES[ci]}">
      <button class="cat-h" type="button" aria-expanded="${!closed}" aria-controls="cat-${ci}" title="${closed ? 'Show' : 'Hide'} ${cat}"><i class="sw"></i><span>${cat}</span><span class="cat-dot"></span><span class="cat-n">${state.q.trim() ? items.length + '/' : ''}${all.length}</span>${CHEVRON}</button>
      <div class="cat-body" id="cat-${ci}"><div class="cat-inner">`;
    items.forEach((x) => {
      const n = all.indexOf(x) + 1;
      html += `<button class="item ${x.id === state.id ? 'on' : ''}" data-id="${x.id}"><span class="n">${pad2(n)}</span><span>${x.name}</span></button>`;
    });
    html += '</div></div></div>';
  });
  els.list.innerHTML = html;
  updateFoldAll();
}

function setClosed(ci, closed) {
  const set = closedSet();
  if (closed) set.add(ci); else set.delete(ci);
  if (set === state.collapsed) store.set('collapsed', [...set]);
  const el = els.list.querySelector(`.cat[data-cat="${ci}"]`);
  if (el) {
    el.classList.toggle('closed', closed);
    const h = el.querySelector('.cat-h');
    h.setAttribute('aria-expanded', String(!closed));
    h.title = `${closed ? 'Show' : 'Hide'} ${CATEGORIES[ci]}`;
  }
  updateFoldAll();
}

function shownCats() { return [...els.list.querySelectorAll('.cat')].map((el) => +el.dataset.cat); }
function updateFoldAll() {
  const cats = shownCats();
  const allClosed = cats.length > 0 && cats.every((ci) => isClosed(ci));
  els.foldAll.textContent = allClosed ? 'Expand all' : 'Collapse all';
  els.foldAll.disabled = !cats.length;
}

function markActive() {
  els.list.querySelectorAll('.item').forEach((b) => b.classList.toggle('on', b.dataset.id === state.id));
  els.list.querySelectorAll('.cat').forEach((el) => el.classList.toggle('has-on', !!el.querySelector('.item.on')));
  const on = els.list.querySelector('.item.on');
  if (on && !on.closest('.cat.closed')) on.scrollIntoView({ block: 'nearest' });
}

/* ---------------- selection ---------------- */

function select(id, { push = true, fromStep = false } = {}) {
  if (!byId[id]) id = ITEMS[0].id;
  state.id = id;
  state.variant = 0;
  // Open the section the new interaction lives in. When Next/Previous had to open
  // one, fold it away again once browsing moves on to another section.
  const cat = byId[id].cat, prevAuto = state.autoOpened;
  state.autoOpened = null;
  if (isClosed(cat)) { setClosed(cat, false); if (fromStep) state.autoOpened = cat; }
  else if (fromStep && prevAuto === cat) state.autoOpened = cat;
  if (fromStep && prevAuto != null && prevAuto !== cat) setClosed(prevAuto, true);
  if (!canTry()) state.mode = 'demo';
  if (push) history.replaceState(null, '', location.pathname + location.search + '#/' + id); // explicit path: the deployed page has a <base>
  markActive();
  renderHead();
  renderControls();
  renderSpec(true);
  load();
  closeIndex();
}

// Next/Previous run through every interaction in order, section after section,
// and wrap from the last back to the first. A search narrows it to the matches.
function step(dir) {
  let list = filtered();
  if (!list.some((x) => x.id === state.id)) list = ITEMS;
  const i = list.findIndex((x) => x.id === state.id);
  const next = list[(i + dir + list.length) % list.length] || ITEMS[0];
  select(next.id, { fromStep: true });
}

function renderHead() {
  const it = item();
  const inCat = ITEMS.filter((x) => x.cat === it.cat);
  els.crumb.innerHTML = `<span class="chip" style="--hue:${HUES[it.cat]}"><i></i>${CATEGORIES[it.cat]}</span><span class="crumb-n">${inCat.indexOf(it) + 1} / ${inCat.length}</span>`;
  els.title.textContent = it.name;
  els.summary.textContent = it.sum;
  document.title = `${it.name} · Motion Bucket`;
  els.variants.innerHTML = (it.variants.length > 1 ? it.variants : []).map((v, i) => `<button class="var ${i === state.variant ? 'on' : ''}" data-i="${i}" role="tab" aria-selected="${i === state.variant}">${v}</button>`).join('');
}

function renderControls() {
  setSeg(els.osSeg, 'os', state.os);
  setSeg(els.modeSeg, 'mode', state.mode);
  setSeg(els.speedSeg, 'speed', String(state.speed));
  els.modeSeg.querySelector('[data-mode="try"]').disabled = !canTry();
  els.modeSeg.querySelector('[data-mode="try"]').title = canTry() ? item().tryHint : 'This one is demo only';
  els.loop.setAttribute('aria-pressed', String(state.loop));
  els.device.classList.toggle('os-ios', state.os === 'ios');
  els.device.classList.toggle('os-android', state.os === 'android');
  els.stTime.textContent = state.os === 'ios' ? '9:41' : '12:30';
  els.label.textContent = state.os === 'ios' ? 'iPhone · 390 × 844 pt' : 'Pixel · 412 × 915 dp';
}

function setSeg(seg, key, val) {
  seg.querySelectorAll('button').forEach((b) => b.setAttribute('aria-checked', String(b.dataset[key] === val)));
}

let hintTimer = 0;
function load() {
  setKitOS(state.os);
  stage.loop = state.loop;
  stage.load({ item: item(), scene: SCENES[item().scene] || SCENES._missing, os: state.os, spec: spec(), variant: state.variant, mode: state.mode, speed: state.speed });
  clearTimeout(hintTimer);
  if (state.mode === 'try' && canTry()) {
    els.hint.textContent = item().tryHint;
    els.hint.classList.add('show');
    hintTimer = setTimeout(() => els.hint.classList.remove('show'), 4200);
  } else {
    els.hint.classList.remove('show');
  }
}

/* ---------------- spec column ---------------- */

function renderSpec(full) {
  const it = item(), sp = spec(), r = resolve(sp, state.os);
  const ch = character(sp, r.ms);
  els.feel.textContent = ch.word;
  els.fType.textContent = sp.type === 'spring' ? 'Spring' : sp.type === 'burst' ? `Burst · ${sp.count} pieces` : r.curve.label;
  els.fDur.textContent = (sp.type === 'spring' ? '≈ ' : '') + r.ms + ' ms' + (sp.type === 'burst' ? ' life' : '');
  els.fProp.textContent = PROP_LABEL[it.prop] || it.prop;
  els.fOs.textContent = state.os === 'ios' ? 'iOS' : 'Android';
  drawPlot(r);
  if (full) renderTune();
  renderDerived(sp, r);
  renderTuned();
  els.apiK.textContent = sp.type === 'burst'
    ? (state.os === 'ios' ? 'Build with · Core Animation' : 'Build with · Konfetti (open source)')
    : (state.os === 'ios' ? 'Native API · SwiftUI' : 'Native API · Jetpack Compose');
  els.api.textContent = it.api[state.os];
  renderCode();
}

// Whether this motion has been tuned away from the platform default.
function renderTuned() {
  const tuned = !!state.overrides[okey()];
  els.reset.disabled = !tuned;
  els.tuneStatus.classList.toggle('on', tuned);
  els.tsText.textContent = tuned ? 'Tuned by you' : (state.os === 'ios' ? 'iOS default' : 'Android default');
  els.tunedChip.hidden = !tuned;
  els.codeNote.hidden = !tuned;
}

/* plot */
const PW = 336, PH = 196, PL = 30, PR = 12, PT = 14, PB = 28;
let plotGeo = null;
function drawPlot(r) {
  const n = 140, vals = [];
  for (let i = 0; i <= n; i++) vals.push(r.ease(i / n));
  let lo = Math.min(0, ...vals), hi = Math.max(1, ...vals);
  const padV = (hi - lo) * 0.08; lo -= padV; hi += padV;
  const w = PW - PL - PR, h = PH - PT - PB;
  const X = (t) => PL + t * w, Y = (v) => PT + (1 - (v - lo) / (hi - lo)) * h;
  plotGeo = { X, Y, w, ms: r.ms, ease: r.ease, label: r.type === 'burst' ? 'height' : 'progress' };
  const pts = vals.map((v, i) => `${X(i / n).toFixed(1)},${Y(v).toFixed(1)}`);
  let g = '';
  for (let i = 0; i <= 8; i++) g += `<line class="g" x1="${X(i / 8)}" x2="${X(i / 8)}" y1="${PT}" y2="${PT + h}"/>`;
  for (let i = 0; i <= 6; i++) g += `<line class="g" x1="${PL}" x2="${PL + w}" y1="${PT + (i * h) / 6}" y2="${PT + (i * h) / 6}"/>`;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => `<text class="ax" x="${X(t)}" y="${PH - 9}" text-anchor="${t === 0 ? 'start' : t === 1 ? 'end' : 'middle'}">${Math.round(t * r.ms)}${t === 1 ? ' ms' : ''}</text>`).join('');
  els.plot.innerHTML = `<svg viewBox="0 0 ${PW} ${PH}" role="img" aria-label="Motion curve, ${r.ms} milliseconds">
    <defs>
      <linearGradient id="pGrad" x1="0" y1="0" x2="1" y2="0"><stop offset="0" style="stop-color:var(--accent)"/><stop offset="1" style="stop-color:var(--accent-2)"/></linearGradient>
      <linearGradient id="pArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--accent-2);stop-opacity:0.2"/><stop offset="1" style="stop-color:var(--accent);stop-opacity:0"/></linearGradient>
    </defs>
    ${g}
    <rect class="frame" x="${PL}" y="${PT}" width="${w}" height="${h}" fill="none"/>
    <line class="g0" x1="${PL}" x2="${PL + w}" y1="${Y(0)}" y2="${Y(0)}"/>
    <line class="g0" x1="${PL}" x2="${PL + w}" y1="${Y(1)}" y2="${Y(1)}"/>
    <text class="ax" x="${PL - 6}" y="${Y(0) + 3}" text-anchor="end">0</text>
    <text class="ax" x="${PL - 6}" y="${Y(1) + 3}" text-anchor="end">1</text>
    <line class="ghost" x1="${X(0)}" y1="${Y(0)}" x2="${X(1)}" y2="${Y(1)}"/>
    <path class="area" d="M${X(0)},${Y(0)} L${pts.join(' L')} L${X(1)},${Y(0)} Z"/>
    <polyline class="curve" points="${pts.join(' ')}"/>
    ${ticks}
    <line class="head" id="pHead" x1="${X(0)}" x2="${X(0)}" y1="${PT}" y2="${PT + h}"/>
    <circle class="dot" id="pDot" r="5.5" cx="${X(0)}" cy="${Y(vals[0])}"/>
  </svg>`;
  setPlayhead(lastP);
}

let lastP = 0;
function setPlayhead(p) {
  if (!plotGeo) return;
  lastP = p;
  const v = plotGeo.ease(p);
  const dot = document.getElementById('pDot'), head = document.getElementById('pHead');
  if (!dot) return;
  const x = plotGeo.X(p);
  dot.setAttribute('cx', x); dot.setAttribute('cy', plotGeo.Y(v));
  head.setAttribute('x1', x); head.setAttribute('x2', x);
  els.rT.textContent = `${Math.round(p * plotGeo.ms)} ms`;
  els.rV.textContent = `${plotGeo.label} ${Math.round(v * 100)}%`;
}

let scrubbing = false, scrubHinted = false;
function plotP(e) {
  const r = els.plot.getBoundingClientRect();
  const x = ((e.clientX - r.left) / r.width) * PW;
  return Math.min(1, Math.max(0, (x - PL) / (PW - PL - PR)));
}
els.plot.addEventListener('pointerdown', (e) => {
  scrubbing = true;
  els.plot.setPointerCapture(e.pointerId);
  const p = plotP(e); stage.seek(p); setPlayhead(p);
  if (!scrubHinted) { scrubHinted = true; toast('Paused on this frame. Replay to carry on.'); }
});
els.plot.addEventListener('pointermove', (e) => { if (!scrubbing) return; const p = plotP(e); stage.seek(p); setPlayhead(p); });
els.plot.addEventListener('pointerup', () => { scrubbing = false; });
els.plot.addEventListener('pointercancel', () => { scrubbing = false; });

(function tick() {
  if (!scrubbing) {
    const p = stage.heroProgress();
    if (p != null && p !== lastP) setPlayhead(p);
  }
  requestAnimationFrame(tick);
})();

/* tune */
function renderTune() {
  const sp = spec();
  setSeg(els.typeSeg, 'type', sp.type);
  els.typeSeg.hidden = sp.type === 'burst';
  if (sp.type === 'burst') {
    els.tune.innerHTML =
      slider('speed', 'Launch speed', 60, 1800, 10, sp.speed, (v) => Math.round(v) + ' px/s') +
      slider('gravity', 'Gravity', -800, 2400, 10, sp.gravity, (v) => Math.round(v) + ' px/s²') +
      slider('drag', 'Air drag', 0, 5, 0.1, sp.drag, (v) => v.toFixed(1)) +
      slider('life', 'Lifetime', 600, 5000, 100, sp.life, (v) => Math.round(v) + ' ms') +
      slider('spread', 'Spread', 0, 360, 5, sp.spread, (v) => Math.round(v) + '°') +
      slider('count', 'Pieces', 2, 160, 1, sp.count, (v) => Math.round(v));
  } else if (sp.type === 'spring') {
    els.tune.innerHTML = slider('k', 'Stiffness', 30, 1500, 1, sp.k, (v) => Math.round(v)) + slider('z', 'Damping ratio', 0.1, 1.5, 0.01, sp.z, (v) => v.toFixed(2));
  } else {
    const opts = Object.entries(CURVES[state.os]).map(([k, c]) => `<option value="${k}" ${k === sp.curve ? 'selected' : ''}>${c.label}</option>`).join('');
    els.tune.innerHTML = slider('ms', 'Duration', 50, 1500, 10, sp.ms, (v) => Math.round(v) + ' ms') + `<div class="tf"><div class="tf-top"><label for="tf-curve">Curve</label></div><select id="tf-curve" data-k="curve">${opts}</select></div>`;
  }
  els.tune.querySelectorAll('input[type=range]').forEach(fillRange);
}
function slider(k, label, min, max, stepv, val, fmt) {
  slider.fmt = slider.fmt || {};
  slider.fmt[k] = fmt;
  return `<div class="tf"><div class="tf-top"><label for="tf-${k}">${label}</label><output id="out-${k}">${fmt(+val)}</output></div><input id="tf-${k}" type="range" min="${min}" max="${max}" step="${stepv}" value="${val}" data-k="${k}"></div>`;
}
function fillRange(inp) {
  const p = ((inp.value - inp.min) / (inp.max - inp.min)) * 100;
  inp.style.setProperty('--fill', p + '%');
}
let reloadTimer = 0;
function setOverride(next) {
  state.overrides[okey()] = next;
  store.set('overrides', state.overrides);
  renderSpec(false);
  clearTimeout(reloadTimer);
  reloadTimer = setTimeout(load, 260);
}
els.tune.addEventListener('input', (e) => {
  const t = e.target, k = t.dataset.k;
  if (!k) return;
  const sp = { ...spec() };
  if (k === 'curve') sp.curve = t.value;
  else sp[k] = +t.value;
  if (t.type === 'range') { fillRange(t); const o = document.getElementById('out-' + k); if (o) o.textContent = slider.fmt[k](+t.value); }
  setOverride(sp);
});
els.typeSeg.addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  const sp = spec();
  if (b.dataset.type === sp.type) return;
  const r = resolve(sp, state.os);
  const next = b.dataset.type === 'tween'
    ? { type: 'tween', ms: Math.max(100, Math.round(r.ms / 10) * 10), curve: state.os === 'ios' ? 'easeInOut' : 'emphasized' }
    : { type: 'spring', k: Math.round(stiffnessOf(Math.max(0.2, (sp.ms / 1000) * 0.9))), z: 0.9 };
  setOverride(next);
  renderTune();
});
function resetTune() {
  if (!state.overrides[okey()]) return;
  delete state.overrides[okey()];
  store.set('overrides', state.overrides);
  clearTimeout(reloadTimer);
  renderSpec(true);
  load();
  toast('Back to the default motion');
}
els.reset.addEventListener('click', resetTune);
els.resetCode.addEventListener('click', resetTune);

function renderDerived(sp, r) {
  let cells;
  if (sp.type === 'burst') {
    const ap = apexOf(sp);
    cells = [['Peak', ap ? Math.round(ap.h) + ' px' : 'None'], ['Peak at', ap ? Math.round(ap.t * 1000) + ' ms' : 'None'], ['Falls at', sp.drag > 0 && sp.gravity > 0 ? Math.round(sp.gravity / sp.drag) + ' px/s' : 'Speeds up']];
  } else if (sp.type === 'spring') {
    cells = state.os === 'ios'
      ? [['Response', responseOf(sp.k).toFixed(2) + ' s'], ['Damping', (2 * sp.z * Math.sqrt(sp.k)).toFixed(1)], ['Settles', r.ms + ' ms']]
      : [['Stiffness', Math.round(sp.k)], ['Bounce', Math.round(Math.max(0, 1 - sp.z) * 100) + '%'], ['Settles', r.ms + ' ms']];
  } else {
    cells = [['Frames', Math.round(sp.ms / 16.67) + ' @ 60'], ['Bezier', r.curve.p.join(' ')], ['Overshoot', 'None']];
  }
  els.derived.innerHTML = cells.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('');
}

/* code */
let tabsCache = [];
function renderCode() {
  const it = item();
  tabsCache = code(spec(), state.os, it.prop, it.api[state.os]);
  let cur = state.tabs[state.os];
  if (!tabsCache.find((t) => t.id === cur)) cur = state.tabs[state.os] = tabsCache[0].id;
  els.codeTabs.innerHTML = tabsCache.map((t) => `<button role="tab" data-tab="${t.id}" aria-selected="${t.id === cur}">${t.label}</button>`).join('');
  const t = tabsCache.find((x) => x.id === cur);
  els.code.innerHTML = highlight(t.code);
}
els.codeTabs.addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  state.tabs[state.os] = b.dataset.tab;
  renderCode();
});
els.copy.addEventListener('click', async () => {
  const t = tabsCache.find((x) => x.id === state.tabs[state.os]) || tabsCache[0];
  try { await navigator.clipboard.writeText(t.code); toast(`${t.label} copied`); }
  catch (e) { toast('Copy blocked by the browser'); }
});

function escapeHtml(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function highlight(src) {
  const re = /(\/\/[^\n]*)|("(?:[^"\\\n]|\\.)*")|\b(\d+(?:\.\d+)?f?)\b|\b(let|var|val|func|private|return|true|false|nil|apply|if|else|by|transition)\b/g;
  return escapeHtml(src).replace(re, (m, c, s, n, k) =>
    c ? `<span class="c">${c}</span>` : s ? `<span class="s">${s}</span>` : n ? `<span class="num">${n}</span>` : k ? `<span class="kw">${k}</span>` : m);
}

/* ---------------- controls ---------------- */

els.list.addEventListener('click', (e) => {
  const h = e.target.closest('.cat-h');
  if (h) { const ci = +h.parentElement.dataset.cat; setClosed(ci, !isClosed(ci)); return; }
  const b = e.target.closest('.item');
  if (b) select(b.dataset.id);
});
els.foldAll.addEventListener('click', () => {
  const cats = shownCats();
  const close = !cats.every((ci) => isClosed(ci));
  cats.forEach((ci) => setClosed(ci, close));
});
els.q.addEventListener('input', () => { state.q = els.q.value; state.qClosed.clear(); renderList(); });
els.q.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') { const f = filtered()[0]; if (f) { select(f.id); els.q.blur(); } }
  if (e.key === 'Escape') { els.q.value = ''; state.q = ''; renderList(); markActive(); els.q.blur(); }
});
$('#prev').addEventListener('click', () => step(-1));
$('#next').addEventListener('click', () => step(1));
els.variants.addEventListener('click', (e) => {
  const b = e.target.closest('.var');
  if (!b) return;
  state.variant = +b.dataset.i;
  els.variants.querySelectorAll('.var').forEach((x, i) => { x.classList.toggle('on', i === state.variant); x.setAttribute('aria-selected', String(i === state.variant)); });
  load();
});
function setOS(os) {
  if (os === state.os) return;
  state.os = os;
  store.set('os', os);
  renderControls();
  renderSpec(true);
  load();
}
function setMode(mode) {
  if (mode === 'try' && !canTry()) return;
  state.mode = mode;
  renderControls();
  load();
}
els.osSeg.addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) setOS(b.dataset.os); });
els.modeSeg.addEventListener('click', (e) => { const b = e.target.closest('button'); if (b && !b.disabled) setMode(b.dataset.mode); });
els.speedSeg.addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  state.speed = +b.dataset.speed;
  renderControls();
  load();
});
els.loop.addEventListener('click', () => {
  state.loop = !state.loop;
  stage.loop = state.loop;
  els.loop.setAttribute('aria-pressed', String(state.loop));
  if (state.loop && state.mode === 'demo') load();
});
els.replay.addEventListener('click', () => load());

// Touching the screen while it plays the demo hands it to you.
els.screen.addEventListener('pointerdown', (e) => {
  if (state.mode !== 'demo') return;
  e.stopPropagation();
  e.preventDefault();
  if (canTry()) setMode('try');
  else load();
}, true);

/* index drawer on narrow screens */
function openIndex() { els.index.classList.add('open'); els.indexScrim.classList.add('open'); }
function closeIndex() { els.index.classList.remove('open'); els.indexScrim.classList.remove('open'); }
$('#openIndex').addEventListener('click', openIndex);
$('#closeIndex').addEventListener('click', closeIndex);
els.indexScrim.addEventListener('click', closeIndex);

/* keyboard */
document.addEventListener('keydown', (e) => {
  const typing = e.target.matches('input, select, textarea');
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  if (e.key === '/' && !typing) { e.preventDefault(); els.q.focus(); els.q.select(); return; }
  if (e.key === 'ArrowDown' && (!typing || e.target === els.q)) { e.preventDefault(); step(1); return; }
  if (e.key === 'ArrowUp' && (!typing || e.target === els.q)) { e.preventDefault(); step(-1); return; }
  if (typing) return;
  const k = e.key.toLowerCase();
  if (k === 'j') step(1);
  else if (k === 'k') step(-1);
  else if (k === 'r') load();
  else if (k === 'p') setOS(state.os === 'ios' ? 'android' : 'ios');
  else if (k === 't') setMode(state.mode === 'try' ? 'demo' : 'try');
  else if (k === 'l') els.loop.click();
  else if (k === 'escape') closeIndex();
  else if (/^[1-4]$/.test(k) && item().variants[+k - 1] && item().variants.length > 1) els.variants.querySelectorAll('.var')[+k - 1].click();
});

/* theme */
const mq = matchMedia('(prefers-color-scheme: dark)');
function applyTheme() {
  const t = state.theme;
  if (t === 'auto') delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = t;
  const dark = t === 'dark' || (t === 'auto' && mq.matches);
  els.device.dataset.scheme = dark ? 'dark' : 'light';
  els.theme.textContent = 'Theme · ' + t[0].toUpperCase() + t.slice(1);
}
els.theme.addEventListener('click', () => {
  state.theme = { auto: 'light', light: 'dark', dark: 'auto' }[state.theme];
  store.set('theme', state.theme);
  applyTheme();
});
mq.addEventListener('change', applyTheme);

/* fit the device to the bench */
function fit() {
  const bw = els.bench.clientWidth, bh = els.bench.clientHeight;
  const s = Math.min(1.08, (bw - 70) / 306, (bh - 64) / 650);
  els.wrap.style.transform = `translate(-50%, -50%) scale(${Math.max(0.4, s)})`;
}
new ResizeObserver(fit).observe(els.bench);

let toastTimer = 0;
function toast(msg) {
  els.toast.textContent = msg;
  els.toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => els.toast.classList.remove('show'), 2200);
}

/* boot */
window.addEventListener('hashchange', () => {
  const id = location.hash.replace(/^#\/?/, '');
  if (id && id !== state.id && byId[id]) select(id, { push: false });
});
applyTheme();
renderList();
const initial = location.hash.replace(/^#\/?/, '');
select(byId[initial] ? initial : ITEMS[0].id);
fit();
