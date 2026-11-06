// uniwave: live radio from every country on a flat world map, powered by the Radio Browser API.
(() => {
  'use strict';

  // ---------- Config ----------
  const API_MIRRORS = [
    'https://de1.api.radio-browser.info',
    'https://de2.api.radio-browser.info',
    'https://fi1.api.radio-browser.info',
    'https://nl1.api.radio-browser.info',
  ];
  const GEOJSON_URL = 'https://cdn.jsdelivr.net/npm/globe.gl@2.46.2/example/datasets/ne_110m_admin_0_countries.geojson';
  // Natural Earth leaves a few ISO_A2 codes as -99.
  const ISO_FIX = { France: 'FR', Norway: 'NO', 'Northern Cyprus': 'CY', Somaliland: 'SO' };
  const FAV_KEY = 'uniwave:favorites';
  const VOL_KEY = 'uniwave:volume';
  const FAMOUS_KEY = 'uniwave:famous';
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');

  const ICON = {
    play: '<svg class="fill" viewBox="0 0 24 24"><polygon points="6 3 20 12 6 21 6 3"/></svg>',
    disc: '<svg viewBox="0 0 24 24"><path d="M3 5.4h10.4"/><path d="M3 10.65h10.4"/><path d="M3 15.85h6.3"/><path d="M17.8 16.6V6.6a1.5 1.5 0 0 1 1.5-1.5h1.7"/><circle cx="15.6" cy="16.6" r="2.4" fill="currentColor"/></svg>',
    music: '<svg viewBox="0 0 24 24"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>',
    lines: '<svg class="eq-icon" viewBox="0 0 24 24"><path d="M2 10v3"/><path d="M6 6v11"/><path d="M10 3v18"/><path d="M14 8v7"/><path d="M18 5v13"/><path d="M22 10v3"/></svg>',
    heart: '<svg viewBox="0 0 24 24"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>',
    radio: '<svg viewBox="0 0 24 24"><path d="M4.929 4.929A10 10 0 0 0 4.929 19.071"/><path d="M7.757 7.757A6 6 0 0 0 7.757 16.243"/><circle cx="12" cy="12" r="2"/><path d="M16.243 7.757A6 6 0 0 1 16.243 16.243"/><path d="M19.071 4.929A10 10 0 0 1 19.071 19.071"/></svg>',
    speaker: '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>',
    maximize: '<polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" x2="14" y1="3" y2="10"/><line x1="3" x2="10" y1="21" y2="14"/>',
    minimize: '<polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/><line x1="14" x2="21" y1="10" y2="3"/><line x1="3" x2="10" y1="21" y2="14"/>',
  };

  // ---------- State ----------
  const state = {
    counts: {},            // ISO2 -> stations listed in the directory
    countries: [],         // [{ cc, name, count }], most stations first
    features: [],
    byIso: new Map(),      // ISO2 -> map feature
    selected: null,        // ISO2
    hovered: null,         // feature
    mode: 'explore',       // 'explore' | 'favorites' | 'genres' (the list of genres to browse)
    genre: null,           // a genre picked from the search: its stations from around the world
    stations: [],
    loading: false,
    loadError: false,
    query: '',
    tag: null,             // a genre the open list is narrowed to
    queue: [],
    current: null,
    playing: false,
    connecting: false,
    favorites: loadFavs(),
  };

  const $ = (id) => document.getElementById(id);
  const el = {
    main: $('main'), mapArea: $('map-area'), map: $('map'), horizon: $('map-horizon'), tip: $('hover-tip'),
    tabFavs: $('tab-favs'), tabGenres: $('tab-genres'), famous: $('famous'),
    cSearch: $('country-search'), cResults: $('country-results'),
    searchbar: $('searchbar'), finder: $('finder'), finderBody: $('finder-body'), finderClose: $('finder-close'),
    eyebrow: $('side-eyebrow'), mark: $('side-mark'), title: $('side-title'), sub: $('side-sub'),
    list: $('stations'),
    shuffle: $('side-shuffle'), genres: $('side-genres'),
    pFav: $('p-fav'),
    pShuffle: $('p-shuffle'), prev: $('p-prev'), play: $('p-play'), next: $('p-next'), live: $('p-live'),
    quality: $('p-quality'), mute: $('p-mute'), volIcon: $('vol-icon'), volume: $('p-volume'),
    output: $('p-output'), expand: $('p-expand'), expandIcon: $('expand-icon'), toast: $('toast'),
    np: $('np'), npLabel: $('np-label'), npName: $('np-name'), npCountry: $('np-country'), npTags: $('np-tags'),
    npGenreRow: $('np-genre-row'), npStreamRow: $('np-stream-row'), pin: $('pin'), pinLogo: $('pin-logo'),
  };

  // ---------- Helpers ----------
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const isoOf = (f) => (f.properties.ISO_A2 !== '-99' ? f.properties.ISO_A2 : ISO_FIX[f.properties.ADMIN]);
  const fmt = (n) => n.toLocaleString('en');
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const possessive = (n) => (/s$/i.test(n) ? `${n}’` : `${n}’s`);
  const titleCase = (t) => t.replace(/(^|[\s-])\S/g, (c) => c.toUpperCase());
  const setTip = (btn, label) => { btn.dataset.tip = label; btn.setAttribute('aria-label', label); };
  const regionNames = (() => { try { return new Intl.DisplayNames(['en'], { type: 'region' }); } catch { return null; } })();

  // Short, familiar country names ("United Kingdom", not the directory's long official form).
  function nameOf(cc, fallback) {
    try { const n = regionNames?.of(cc); if (n && n !== cc) return n; } catch { /* unknown code */ }
    return fallback || state.byIso.get(cc)?.properties.ADMIN || cc;
  }

  // Flag images rather than emoji, which Windows doesn't render.
  function flagImg(cc, large) {
    if (!cc || !/^[a-z]{2}$/i.test(cc)) return '';
    const c = cc.toLowerCase(), w = large ? 80 : 40;
    return `<img class="flag${large ? ' lg' : ''}" src="https://flagcdn.com/w${w}/${c}.png" srcset="https://flagcdn.com/w${w * 2}/${c}.png 2x" alt="" loading="lazy" onerror="this.style.visibility='hidden'">`;
  }

  const tagsOf = (s) => (s.tags || '').split(',').map((t) => t.trim()).filter((t) => t && t.length < 20);
  function metaOf(s, withCountry) {
    const parts = tagsOf(s).slice(0, 2).map(titleCase);
    if (withCountry) parts.push(nameOf(s.countrycode, s.country));
    else if (s.state && s.state.trim().length < 28) parts.push(s.state.trim());
    return parts.join(' · ') || 'Live radio';
  }

  // The same line for a list row, with a small flag before the country when it's shown.
  function metaHtml(s, withCountry) {
    if (!withCountry || !s.countrycode) return esc(metaOf(s, withCountry));
    const tags = tagsOf(s).slice(0, 2).map(titleCase).join(' · ');
    return `${tags ? `${esc(tags)} · ` : ''}${flagImg(s.countrycode)}${esc(nameOf(s.countrycode, s.country))}`;
  }

  let toastTimer;
  function toast(msg) {
    el.toast.textContent = msg;
    el.toast.classList.remove('hidden');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.toast.classList.add('hidden'), 2800);
  }

  // ---------- Favorites ----------
  function loadFavs() {
    try { return JSON.parse(localStorage.getItem(FAV_KEY)) || []; } catch { return []; }
  }
  function saveFavs() {
    try { localStorage.setItem(FAV_KEY, JSON.stringify(state.favorites)); } catch { /* storage unavailable */ }
    const n = state.favorites.length;
    el.tabFavs.setAttribute('aria-label', n ? `Favorites, ${n} saved` : 'Favorites');
    updateFavNow();
  }
  const isFav = (s) => state.favorites.some((f) => f.stationuuid === s.stationuuid);
  function toggleFav(s) {
    if (isFav(s)) {
      state.favorites = state.favorites.filter((f) => f.stationuuid !== s.stationuuid);
    } else {
      const { stationuuid, name, url_resolved, favicon, tags, countrycode, country, state: region, codec, bitrate, hls, geo_lat, geo_long } = s;
      state.favorites.unshift({ stationuuid, name, url_resolved, favicon, tags, countrycode, country, state: region, codec, bitrate, hls, geo_lat, geo_long });
      toast(`Saved ${s.name.trim()} to favorites`);
    }
    saveFavs();
  }

  // ---------- API ----------
  let mirror = 0;
  async function api(path) {
    for (let i = 0; i < API_MIRRORS.length; i++) {
      const base = API_MIRRORS[(mirror + i) % API_MIRRORS.length];
      try {
        const res = await fetch(base + path);
        if (!res.ok) throw new Error(res.status);
        mirror = (mirror + i) % API_MIRRORS.length;
        return await res.json();
      } catch { /* try the next mirror */ }
    }
    throw new Error('Radio directory unreachable');
  }

  // The genres offered when the search opens, with the directory tag each one looks for.
  const GENRES = [
    ['Pop', 'pop'], ['Rock', 'rock'], ['Jazz', 'jazz'], ['Classical', 'classical'], ['Electronic', 'electronic'],
    ['Dance', 'dance'], ['Hip hop', 'hip hop'], ['Chillout', 'chillout'], ['Lounge', 'lounge'], ['Ambient', 'ambient'],
    ['Lo-fi', 'lofi'], ['Indie', 'indie'], ['Metal', 'metal'], ['Blues', 'blues'], ['Soul', 'soul'], ['Reggae', 'reggae'],
    ['Latin', 'latin'], ['Country', 'country'], ['Folk', 'folk'], ['80s', '80s'], ['Oldies', 'oldies'], ['News', 'news'], ['Talk', 'talk'],
  ];
  GENRES.sort((a, b) => a[0].localeCompare(b[0], 'en', { numeric: true })); // listed A to Z

  const dedupe = (raw, max) => {
    const seen = new Set();
    return raw.filter((s) => {
      const key = s.name.trim().toLowerCase();
      if (!s.url_resolved || !key || seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0, max);
  };

  // A genre's most listened stations from every country.
  async function fetchGenre(tag) {
    return dedupe(await api(`/json/stations/search?tag=${encodeURIComponent(tag)}&hidebroken=true&order=clickcount&reverse=true&limit=600`), 500);
  }

  async function fetchStations(cc) {
    return dedupe(await api(`/json/stations/search?countrycode=${cc}&hidebroken=true&order=clickcount&reverse=true&limit=400`), 300);
  }

  // ---------- Map ----------
  const svg = d3.select('#map-svg');
  const root = svg.append('g');
  const land = root.append('g');
  // Highlights are copies drawn on top, so the base countries never reorder under the pointer.
  const overlay = root.append('g').attr('class', 'overlay');
  // The selected country lifts off the map: its shape floats a few pixels above where it sits.
  const SEL_LIFT = 7; // how far it rises, in screen px at any zoom
  const selShape = d3.select('#map-svg defs').append('path').attr('id', 'sel-shape');
  // The hover highlight sits beneath the selection, so the selected country is always on top; it only goes above
  // when it's the selected country itself being hovered.
  const hoverOutline = overlay.append('path').attr('class', 'ol ol-hover').style('display', 'none');
  const sel3d = overlay.append('g').attr('class', 'sel3d').style('display', 'none');
  const selTop = sel3d.append('use').attr('href', '#sel-shape').attr('class', 'sel-top');
  let selRise = 0, riseTimer = null; // 0 → 1 as a newly picked country pops up
  let projection = null, geoPath = null, zoom = null, transform = d3.zoomIdentity, dragging = false;

  // d3 expects clockwise outer rings; flip any that would otherwise cover the whole sphere.
  function rewind(f) {
    const g = f.geometry;
    const fix = (poly) => (d3.geoArea({ type: 'Polygon', coordinates: poly }) > 2 * Math.PI ? poly.map((r) => r.slice().reverse()) : poly);
    if (g.type === 'Polygon') g.coordinates = fix(g.coordinates);
    else if (g.type === 'MultiPolygon') g.coordinates = g.coordinates.map(fix);
    return f;
  }

  // The country's largest landmass, so labels and zooming ignore far-flung islands and territories.
  function mainPart(f) {
    if (f.__main) return f.__main;
    const g = f.geometry;
    let poly = g.coordinates;
    if (g.type === 'MultiPolygon') {
      poly = g.coordinates.reduce((best, p) => (d3.geoArea({ type: 'Polygon', coordinates: p }) > d3.geoArea({ type: 'Polygon', coordinates: best }) ? p : best));
    }
    f.__main = { type: 'Feature', geometry: { type: 'Polygon', coordinates: poly } };
    return f.__main;
  }

  function buildMap() {
    land.selectAll('path').data(state.features).join('path')
      .attr('class', (f) => 'country' + (state.counts[isoOf(f)] ? '' : ' empty'))
      .on('pointerenter', (e, f) => { if (!dragging) setHover(f, e); })
      .on('pointermove', (e, f) => { if (dragging) return; if (state.hovered !== f) setHover(f, e); moveTip(e); })
      .on('pointerleave', () => setHover(null))
      .on('click', (e, f) => { const cc = isoOf(f); if (cc) selectCountry(cc); });

    zoom = d3.zoom().scaleExtent([0.7, 10]).clickDistance(4).constrain(constrain)
      .on('zoom', (e) => {
        transform = e.transform;
        root.attr('transform', transform);
        const t = e.sourceEvent?.type;
        if (t === 'mousemove' || t === 'touchmove') {
          if (!dragging) { dragging = true; svg.classed('dragging', true); setHover(null); }
        }
        scaleEffects();
        markMoving();
        if (e.sourceEvent) scheduleDots(); else drawNow(); // the app's own moves are drawn in the same frame, so nothing lags
        placePin();
      })
      .on('end', () => { dragging = false; svg.classed('dragging', false); });
    svg.call(zoom);
  }

  // The top bar is transparent and floats over the map, so views are centred below it.
  const headHeight = () => document.querySelector('.topbar').offsetHeight;

  // How much of the map's right side the open station list covers (0 when closed, or on phones where it covers the whole map).
  // Read from the CSS rather than the box, which may still be growing.
  const phone = matchMedia('(max-width: 680px)');
  function panelInset() { // where the open panel ends up (not where it is mid-animation)
    if (!el.finder.classList.contains('open') || phone.matches) return 0;
    const css = getComputedStyle(document.documentElement);
    return parseFloat(css.getPropertyValue('--panel-right')) + parseFloat(css.getPropertyValue('--side-w'));
  }

  // The map drags freely, but at least 20% of it (te = the world's bounds) stays on screen, outside the panel.
  // Zoomed in far enough that 20% is bigger than the screen, the map simply fills it.
  const KEEP_VISIBLE = 0.2;
  function constrain(t, extent, te) {
    const pull = (lo, hi, vlo, vhi) => { // map edges and viewport edges along one axis, in screen px
      const need = Math.min(KEEP_VISIBLE * (hi - lo), vhi - vlo);
      if (hi < vlo + need) return vlo + need - hi;
      if (lo > vhi - need) return vhi - need - lo;
      return 0;
    };
    const dx = pull(t.applyX(te[0][0]), t.applyX(te[1][0]), extent[0][0], extent[1][0] - panelInset());
    const dy = pull(t.applyY(te[0][1]), t.applyY(te[1][1]), extent[0][1], extent[1][1]);
    return dx || dy ? t.translate(dx / t.k, dy / t.k) : t;
  }

  // Keep shadows and the hover lift the same on screen at any zoom level.
  function scaleEffects() {
    const k = transform.k;
    d3.select('#lift-shadow').attr('stdDeviation', 3 / k).attr('dy', 2 / k);
    d3.select('#glow-shadow').attr('stdDeviation', 4 / k);
    placeSelection();
  }

  function placeSelection() {
    const k = transform.k, lift = (SEL_LIFT * selRise) / k;
    selTop.attr('transform', `translate(0, ${-lift})`);
    // the hover highlight sits on whatever it covers: the raised top face, or the flat map
    const onSel = hoverOutline.classed('on-sel');
    hoverOutline.attr('transform', onSel ? `translate(0, ${-lift})` : null); // other countries stay at map level
    if (onSel) hoverOutline.raise(); else hoverOutline.lower();
  }

  function riseSelection() {
    riseTimer?.stop();
    if (reduceMotion.matches) { selRise = 1; placeSelection(); return; }
    const ease = d3.easeBackOut.overshoot(1.6);
    riseTimer = d3.timer((elapsed) => {
      const p = Math.min(1, elapsed / 420);
      selRise = ease(p);
      placeSelection();
      if (p === 1) riseTimer.stop();
    });
  }

  // The main land: the big landmasses, from the far south of South America up to the Arctic coasts. The starting view
  // fits this rather than everything, so the world shows larger: the high Arctic islands and small far-flung islands
  // simply run a little past its edges.
  const MAIN_NORTH = 72, MAIN_SOUTH = -57, MAIN_MIN_KM2 = 50000;
  let mainLand = null;
  function mainLandOf(features) {
    const pts = [], min = MAIN_MIN_KM2 / 6371 ** 2; // in steradians
    for (const f of features) {
      const g = f.geometry, polys = g.type === 'Polygon' ? [g.coordinates] : g.type === 'MultiPolygon' ? g.coordinates : [];
      for (const poly of polys) {
        if (d3.geoArea({ type: 'Polygon', coordinates: poly }) < min) continue;
        for (const [lon, lat] of poly[0]) if (lat <= MAIN_NORTH && lat >= MAIN_SOUTH) pts.push([lon, lat]);
      }
    }
    return { type: 'MultiPoint', coordinates: pts };
  }

  function layout() {
    const w = el.map.clientWidth, h = el.map.clientHeight;
    if (!w || !h || !state.features.length) return;
    svg.attr('viewBox', `0 0 ${w} ${h}`);
    // The starting view centres the main land in the open space between the top bar and the heading with its cards.
    const head = headHeight(), padX = Math.max(24, w * 0.11), gap = clamp((h - head) * 0.05, 16, 44);
    const introTop = document.querySelector('.intro-text')?.offsetTop || h; // laid out even while hidden
    const bottom = introTop - head > h * 0.35 ? introTop - gap : h - clamp(h * 0.22, 40, 240); // fall back if the heading takes too much room
    projection = d3.geoNaturalEarth1().fitExtent([[padX, head + gap], [w - padX, bottom]], mainLand ||= mainLandOf(state.features));
    geoPath = d3.geoPath(projection);
    land.selectAll('path').attr('d', geoPath);
    if (state.selected && state.byIso.has(state.selected)) selShape.attr('d', geoPath(state.byIso.get(state.selected)));
    zoom.extent([[0, 0], [w, h]]).translateExtent(geoPath.bounds({ type: 'FeatureCollection', features: state.features }));
    svg.call(zoom.transform, d3.zoomIdentity);
    projectDots();
    projectEarth();
    scheduleDots();
    placePin();
  }

  // ---------- Station dots ----------
  // One dot per spot with stations (from dots.json), sized by how many share it. Drawn on a canvas: thousands of SVG circles stutter while zooming.
  const dotsCanvas = $('dots'), dctx = dotsCanvas.getContext('2d');
  let dots = null, dotXY = null, dotR = null, dotsFrame = 0;

  // A soft lime dot, rendered once and stamped at every location.
  const dotSprite = (() => {
    const c = document.createElement('canvas'), n = 64, g = c.getContext('2d');
    c.width = c.height = n;
    const grad = g.createRadialGradient(n / 2, n / 2, 0, n / 2, n / 2, n / 2);
    grad.addColorStop(0, 'rgba(244, 255, 214, 1)');
    grad.addColorStop(0.56, 'rgba(207, 245, 110, 1)'); // solid lime-cream core…
    grad.addColorStop(0.66, 'rgba(207, 245, 110, 0.38)'); // …with a faint glow around it
    grad.addColorStop(1, 'rgba(207, 245, 110, 0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, n, n);
    return c;
  })();

  function projectDots() {
    if (!dots || !projection) return;
    dotXY = new Float32Array(dots.length * 2);
    dotR = new Float32Array(dots.length);
    dots.forEach(([lon, lat, n], i) => {
      const p = projection([lon, lat]) || [NaN, NaN];
      dotXY[2 * i] = p[0];
      dotXY[2 * i + 1] = p[1];
      dotR[i] = Math.min(2, 0.7 + 0.3 * Math.log2(n)); // 1 station → 0.7px, 20+ → 2px
    });
  }

  function scheduleDots() { if (!dotsFrame) dotsFrame = requestAnimationFrame(drawDots); }
  // While the map moves, the selected country's glow and the hover shadow are left off: SVG filters are redrawn
  // in full on every frame of movement, which is what makes zooming and flying stutter on big screens.
  let movingTimer = 0;
  function markMoving() {
    if (!movingTimer) el.map.classList.add('moving');
    clearTimeout(movingTimer);
    movingTimer = setTimeout(() => { movingTimer = 0; el.map.classList.remove('moving'); }, 160);
  }
  function drawNow() { if (dotsFrame) { cancelAnimationFrame(dotsFrame); dotsFrame = 0; } drawDots(); }

  // ---------- Earth texture ----------
  // NASA's Blue Marble (terrain) and Black Marble (city lights), reprojected onto the map with WebGL: a grid of
  // latitude/longitude points is put through the map's own projection, so the picture lines up exactly at any zoom.
  // The light is recoloured in the palette's evergreens. It shows only on land: the country outlines are first drawn
  // into the stencil buffer (each ring as a triangle fan that flips the stencil bit, so overlaps and holes come out
  // right), then the picture is painted where the bit is set. All on the graphics card, every frame, with no copying.
  // If WebGL or the images aren't available, the flat map stays.
  const EARTH_IMG = 'https://cdn.jsdelivr.net/npm/three-globe@2.31.0/example/img/';
  const earthCanvas = $('earth');
  const earth = { gl: null, prog: null, mask: null, tex: [], ready: false, grid: null, land: null };
  function initEarth() {
    const gl = earthCanvas.getContext('webgl', { antialias: true, stencil: true, alpha: true, premultipliedAlpha: true });
    if (!gl) return false;
    const shader = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; };
    const program = (vs, fs) => {
      const p = gl.createProgram();
      gl.attachShader(p, shader(gl.VERTEX_SHADER, vs));
      gl.attachShader(p, shader(gl.FRAGMENT_SHADER, fs));
      gl.linkProgram(p);
      return gl.getProgramParameter(p, gl.LINK_STATUS) ? p : null;
    };
    const place = 'uniform vec3 u_t; uniform vec2 u_size; vec4 place(vec2 a) { vec2 p = a * u_t.x + u_t.yz; return vec4(p.x / u_size.x * 2.0 - 1.0, 1.0 - p.y / u_size.y * 2.0, 0.0, 1.0); }';
    const prog = program(`attribute vec2 a_pos; attribute vec2 a_uv; varying vec2 v_uv; ${place}
      void main() { gl_Position = place(a_pos); v_uv = a_uv; }`, `
      precision mediump float; uniform sampler2D u_day; uniform sampler2D u_night; varying vec2 v_uv;
      void main() {
        vec3 day = texture2D(u_day, v_uv).rgb;
        float lum = dot(day, vec3(0.299, 0.587, 0.114));
        float t = min(pow(smoothstep(0.04, 0.70, lum), 1.3), 0.85);                 // more contrast; ice kept from glaring
        vec3 col = mix(vec3(0.034, 0.068, 0.050), vec3(0.250, 0.360, 0.290), t); // deep evergreen to sage
        col = col * 0.84 + day * 0.07;                                             // a hint of the real colours
        float lights = smoothstep(0.34, 0.95, texture2D(u_night, v_uv).r);
        col += vec3(1.0, 0.86, 0.6) * lights * 0.26;                               // warm city lights
        gl_FragColor = vec4(col, 1.0);
      }`);
    const mask = program(`attribute vec2 a_pos; ${place} void main() { gl_Position = place(a_pos); }`,
      'precision mediump float; void main() { gl_FragColor = vec4(0.0); }');
    if (!prog || !mask) return false;
    Object.assign(earth, { gl, prog, mask });
    return true;
  }
  async function loadEarth() {
    if (!window.createImageBitmap || !initEarth()) return;
    const small = matchMedia('(hover: none) and (pointer: coarse)').matches; // phones get half-size pictures, to spare memory
    // Each picture is decoded off the main thread and cut into strips, so the upload can be spread over quiet frames.
    const STRIPS = 8;
    const get = async (file, half) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = EARTH_IMG + file;
      await img.decode();
      const pic = await createImageBitmap(img, half ? { resizeWidth: 2048, resizeHeight: 1024, resizeQuality: 'high' } : {});
      const h = pic.height / STRIPS;
      const strips = await Promise.all(Array.from({ length: STRIPS }, (_, i) => createImageBitmap(pic, 0, i * h, pic.width, h)));
      const size = [pic.width, pic.height];
      pic.close?.();
      return { size, strips, h };
    };
    let pics;
    try { pics = await Promise.all([get('earth-blue-marble.jpg', small), get('earth-night.jpg', true)]); } catch { return; } // the lights need less detail
    // Uploading them is a short freeze on the main thread, so it's spread over quiet moments: while the app is still
    // loading when the pictures arrive in time (the map then wears them from its first appearance), and never while
    // the logo plays (a late upload waits until the app has landed).
    const { gl, prog } = earth;
    gl.useProgram(prog);
    earth.tex = [];
    const quiet = async () => {
      if (introStarted) await afterIntro();
      await new Promise((r) => (window.requestIdleCallback ? requestIdleCallback(r, { timeout: 400 }) : setTimeout(r, 60)));
    };
    for (const [i, pic] of pics.entries()) earth.tex.push(await upload(pic, i)); // a strip per quiet moment: no long freeze
    async function upload({ size, strips, h }, i) {
      const tex = gl.createTexture();
      gl.activeTexture(gl.TEXTURE0 + i);
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, size[0], size[1], 0, gl.RGB, gl.UNSIGNED_BYTE, null);
      for (const [n, strip] of strips.entries()) {
        await quiet();
        gl.activeTexture(gl.TEXTURE0 + i);
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, n * h, gl.RGB, gl.UNSIGNED_BYTE, strip);
        strip.close?.();
      }
      await quiet();
      gl.activeTexture(gl.TEXTURE0 + i);
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.generateMipmap(gl.TEXTURE_2D); // smooth when zoomed out, as sharp as the picture allows when zoomed in
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      const aniso = gl.getExtension('EXT_texture_filter_anisotropic');
      if (aniso) gl.texParameterf(gl.TEXTURE_2D, aniso.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(8, gl.getParameter(aniso.MAX_TEXTURE_MAX_ANISOTROPY_EXT)));
      return tex;
    }
    gl.useProgram(prog);
    gl.uniform1i(gl.getUniformLocation(prog, 'u_day'), 0);
    gl.uniform1i(gl.getUniformLocation(prog, 'u_night'), 1);
    earth.ready = true;
    projectEarth();
    scheduleDots();
    // the countries' flat fill gives way to the picture: at once while the app is still loading (nothing to see yet)
    const unseen = !introStarted && document.body.classList.contains('intro-hold');
    if (unseen) el.map.classList.add('instant');
    el.map.classList.add('textured');
    if (unseen) requestAnimationFrame(() => requestAnimationFrame(() => el.map.classList.remove('instant')));
  }
  // The grid and the land's outlines, through the projection, once per layout.
  function projectEarth() {
    if (!earth.ready || !projection) return;
    const { gl } = earth, STEP = 1.5, LAT_N = 86, LAT_S = -60;
    const cols = Math.round(360 / STEP) + 1, rows = Math.round((LAT_N - LAT_S) / STEP) + 1;
    const pos = new Float32Array(cols * rows * 2), uv = new Float32Array(cols * rows * 2);
    for (let r = 0; r < rows; r++) {
      const lat = LAT_N - r * STEP;
      for (let c = 0; c < cols; c++) {
        const lon = -180 + c * STEP, i = r * cols + c, p = projection([lon, lat]);
        pos[2 * i] = p[0]; pos[2 * i + 1] = p[1];
        uv[2 * i] = (lon + 180) / 360; uv[2 * i + 1] = (90 - lat) / 180;
      }
    }
    const idx = new Uint16Array((cols - 1) * (rows - 1) * 6);
    let k = 0;
    for (let r = 0; r < rows - 1; r++) for (let c = 0; c < cols - 1; c++) {
      const a = r * cols + c, b = a + 1, d = a + cols, e = d + 1;
      idx.set([a, b, d, b, e, d], k); k += 6;
    }
    // the land: the outlines exactly as the map draws them (cut at the date line and all), as triangle fans
    const rings = [];
    let ring = null;
    d3.geoPath(projection, {
      moveTo(x, y) { ring = [x, y]; rings.push(ring); }, lineTo(x, y) { ring.push(x, y); },
      closePath() {}, arc() {}, beginPath() {},
    })({ type: 'FeatureCollection', features: state.features });
    const fans = [];
    for (const r of rings) for (let i = 2; i + 3 < r.length; i += 2) fans.push(r[0], r[1], r[i], r[i + 1], r[i + 2], r[i + 3]);
    const buffer = (data, target = gl.ARRAY_BUFFER) => { const b = gl.createBuffer(); gl.bindBuffer(target, b); gl.bufferData(target, data, gl.STATIC_DRAW); return b; };
    for (const old of [earth.grid?.pos, earth.grid?.uv, earth.grid?.idx, earth.land?.buf]) if (old) gl.deleteBuffer(old);
    earth.grid = { pos: buffer(pos), uv: buffer(uv), idx: buffer(idx, gl.ELEMENT_ARRAY_BUFFER), count: idx.length };
    earth.land = { buf: buffer(new Float32Array(fans)), count: fans.length / 2 };
  }
  // Drawn at whole steps of resolution, and never larger than the graphics card allows, so the canvas isn't resized
  // every frame while the map moves (and a capped canvas can't shift the picture out of line).
  function canvasScale(W, H, want, max) { return Math.max(0.5, Math.min(want, max / W, max / H)); }
  function drawEarth(W, H, dpr) {
    if (!earth.ready || !earth.grid) return;
    const { gl, prog, mask, grid, land } = earth;
    const s = canvasScale(W, H, dpr, earth.maxSize ||= Math.min(4096, gl.getParameter(gl.MAX_RENDERBUFFER_SIZE), ...gl.getParameter(gl.MAX_VIEWPORT_DIMS)));
    const cw = Math.round(W * s), ch = Math.round(H * s);
    if (earthCanvas.width !== cw || earthCanvas.height !== ch) { earthCanvas.width = cw; earthCanvas.height = ch; }
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    gl.clearColor(0, 0, 0, 0);
    gl.clearStencil(0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.STENCIL_BUFFER_BIT);
    const use = (p) => {
      gl.useProgram(p);
      gl.uniform3f(gl.getUniformLocation(p, 'u_t'), transform.k, transform.x, transform.y);
      gl.uniform2f(gl.getUniformLocation(p, 'u_size'), W, H);
    };
    const attr = (p, name, buf) => {
      const loc = gl.getAttribLocation(p, name);
      if (loc < 0) return;
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    };
    // 1. the land into the stencil
    gl.enable(gl.STENCIL_TEST);
    gl.colorMask(false, false, false, false);
    gl.stencilMask(1);
    gl.stencilFunc(gl.ALWAYS, 0, 1);
    gl.stencilOp(gl.KEEP, gl.KEEP, gl.INVERT);
    use(mask);
    const uvLoc = gl.getAttribLocation(prog, 'a_uv');
    if (uvLoc >= 0) gl.disableVertexAttribArray(uvLoc); // the outline pass has no picture coordinates
    attr(mask, 'a_pos', land.buf);
    gl.drawArrays(gl.TRIANGLES, 0, land.count);
    // 2. the picture, only there
    gl.colorMask(true, true, true, true);
    gl.stencilFunc(gl.EQUAL, 1, 1);
    gl.stencilOp(gl.KEEP, gl.KEEP, gl.KEEP);
    use(prog);
    attr(prog, 'a_pos', grid.pos);
    attr(prog, 'a_uv', grid.uv);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, grid.idx);
    gl.drawElements(gl.TRIANGLES, grid.count, gl.UNSIGNED_SHORT, 0);
    gl.disable(gl.STENCIL_TEST);
  }

  function drawDots() {
    dotsFrame = 0;
    const W = el.map.clientWidth, H = el.map.clientHeight;
    const dpr = canvasScale(W, H, Math.min(2, window.devicePixelRatio || 1), 4096);
    if (dotsCanvas.width !== Math.round(W * dpr) || dotsCanvas.height !== Math.round(H * dpr)) {
      dotsCanvas.width = Math.round(W * dpr);
      dotsCanvas.height = Math.round(H * dpr);
    }
    dctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    dctx.clearRect(0, 0, W, H);
    drawEarth(W, H, dpr);
    if (!dotXY) return;
    const { k, x: tx, y: ty } = transform;
    const s = clamp(0.7 + 0.12 * Math.log2(k), 0.7, 1.05); // dots grow a little as you zoom in
    for (let i = 0, n = dotR.length; i < n; i++) {
      const g = dotR[i] * s * 1.7; // glow radius
      const x = tx + k * dotXY[2 * i], y = ty + k * dotXY[2 * i + 1];
      if (!(x > -g && y > -g && x < W + g && y < H + g)) continue; // off screen (or unprojectable)
      dctx.drawImage(dotSprite, x - g, y - g, g * 2, g * 2);
    }
  }

  function setHover(f, e) {
    if (f && camState === 'in') f = null; // no country highlights while the idle camera moves the map under a still pointer
    if (f === state.hovered) return;
    state.hovered = f;
    if (!f) {
      hoverOutline.style('display', 'none');
      el.tip.classList.add('hidden');
      return;
    }
    const cc = isoOf(f);
    hoverOutline.attr('d', geoPath(f)).style('display', null)
      .classed('on-sel', cc === state.selected).classed('empty', !state.counts[cc]);
    placeSelection();
    if (cc === state.selected) { el.tip.classList.add('hidden'); return; }
    const n = state.counts[cc] || 0;
    el.tip.innerHTML = `${flagImg(cc)}<b>${esc(nameOf(cc))}</b><span>· ${n ? `${fmt(n)} station${n === 1 ? '' : 's'}` : 'No stations listed'}</span>`;
    el.tip.classList.remove('hidden');
    if (e) moveTip(e);
  }

  function moveTip(e) {
    if (el.tip.classList.contains('hidden')) return;
    const r = el.map.getBoundingClientRect();
    const w = el.tip.offsetWidth, h = el.tip.offsetHeight;
    let x = e.clientX - r.left + 14, y = e.clientY - r.top + 16;
    if (x + w > r.width - 6) x = e.clientX - r.left - w - 14;
    if (y + h > r.height - 6) y = e.clientY - r.top - h - 12;
    el.tip.style.transform = `translate(${clamp(x, 6, r.width - w - 6)}px, ${clamp(y, 6, r.height - h - 6)}px)`;
  }

  function markSelected(cc) {
    const f = state.byIso.get(cc);
    if (f && geoPath) {
      selShape.attr('d', geoPath(f));
      sel3d.style('display', null);
      selRise = 0;
      riseSelection();
    } else {
      riseTimer?.stop();
      sel3d.style('display', 'none');
    }
    if (state.hovered) {
      const onSel = isoOf(state.hovered) === cc;
      hoverOutline.classed('on-sel', onSel);
      if (onSel) el.tip.classList.add('hidden');
    }
    placeSelection();
  }

  // Centre the country in the part of the map the panel leaves visible.
  function zoomToCountry(cc) {
    const f = state.byIso.get(cc);
    if (!f || !geoPath) return;
    const [[x0, y0], [x1, y1]] = geoPath.bounds(mainPart(f));
    const W = el.map.clientWidth, H = el.map.clientHeight, R = panelInset(), T = headHeight();
    const k = clamp(0.5 / Math.max((x1 - x0) / (W - R), (y1 - y0) / (H - T)), 1, 8);
    const t = d3.zoomIdentity.translate((W - R) / 2, (T + H) / 2).scale(k).translate(-(x0 + x1) / 2, -(y0 + y1) / 2);
    svg.transition().duration(reduceMotion.matches ? 0 : 750).call(zoom.transform, constrain(t, [[0, 0], [W, H]], zoom.translateExtent()));
  }

  // A country clicked near the right edge would end up under the station list, so slide the map along.
  function revealCountry(cc) {
    const f = state.byIso.get(cc), R = panelInset();
    if (!f || !geoPath || !R) return;
    const dx = el.map.clientWidth - R - 24 - transform.applyX(geoPath.bounds(mainPart(f))[1][0]);
    if (dx < 0) svg.transition().duration(reduceMotion.matches ? 0 : 500).call(zoom.translateBy, dx / transform.k, 0);
  }

  // ---------- Sidebar ----------
  function setMode(mode, render = true) {
    state.mode = mode;
    state.query = '';
    state.tag = null;
    el.genres.scrollLeft = 0; // a new list starts its pills from the beginning
    syncTabs();
    if (render) renderSide();
  }
  // The heart is lit for favorites; the disc for the genre list and for a genre's stations.
  function syncTabs() {
    const favs = state.mode === 'favorites', genres = state.mode === 'genres' || !!state.genre;
    el.tabFavs.classList.toggle('active', favs);
    el.tabFavs.setAttribute('aria-pressed', favs);
    el.tabGenres.classList.toggle('active', genres);
    el.tabGenres.setAttribute('aria-pressed', genres);
  }

  function setShuffle(label) {
    el.shuffle.classList.toggle('hidden', !label);
    if (label) el.shuffle.setAttribute('aria-label', label); // e.g. "Shuffle blues stations"; the button just says Shuffle
  }

  // Genre pills for the open list: the genres its own stations carry, most common first, to narrow it down.
  const hasTag = (s, tag) => (s.tags || '').toLowerCase().includes(tag);
  function renderGenres(base) {
    const counts = GENRES.filter((g) => g[0] !== state.genre?.[0])
      .map((g) => [g, base.filter((s) => hasTag(s, g[1])).length])
      .filter(([, n]) => n >= 2 && n < base.length).sort((a, b) => b[1] - a[1]).slice(0, 10);
    if (state.tag && !counts.some(([g]) => g[1] === state.tag)) state.tag = null;
    el.genres.classList.toggle('hidden', counts.length < 2);
    const keep = el.genres.scrollLeft; // picking a pill doesn't scroll the row back
    el.genres.innerHTML = `<button type="button" class="pill${state.tag ? '' : ' on'}" data-tag="">All</button>`
      + counts.map(([g, n]) => `<button type="button" class="pill${state.tag === g[1] ? ' on' : ''}" data-tag="${esc(g[1])}">${esc(g[0])} <span>${n}</span></button>`).join('');
    el.genres.scrollLeft = keep;
    requestAnimationFrame(() => edgeFade(el.genres));
  }
  // A sideways-scrolling row fades at its right edge until its last item is in view.
  function edgeFade(row) {
    row.classList.toggle('fade', row.scrollLeft + row.clientWidth < row.scrollWidth - 2);
    row.classList.toggle('fade-start', row.scrollLeft > 2);
  }
  // Sideways rows scroll with a mouse wheel too, and can be dragged; a drag doesn't count as a click on a pill.
  // With `smooth`, wheel steps and drag releases glide on a critically damped spring: each move eases in from rest and
  // eases out to a stop, never overshooting. `loop` gives the width of one lap for a row that repeats its content.
  function sideScroll(row, onScroll, { smooth = false, loop = null } = {}) {
    const glide = { x: 0, v: 0, target: 0, frame: 0, at: 0 };
    const GLIDE = 7.5; // spring rate, per second: lower is softer and slower
    const glideStep = (now) => {
      const dt = Math.min(0.05, glide.at ? (now - glide.at) / 1000 : 1 / 60);
      glide.at = now;
      glide.v += (GLIDE * GLIDE * (glide.target - glide.x) - 2 * GLIDE * glide.v) * dt;
      glide.x += glide.v * dt;
      const lap = loop?.() || 0;
      if (lap) { // carry on round the loop instead of hitting an end
        if (glide.x >= lap) { glide.x -= lap; glide.target -= lap; } else if (glide.x < 0) { glide.x += lap; glide.target += lap; }
      } else {
        const max = row.scrollWidth - row.clientWidth;
        glide.target = clamp(glide.target, 0, max);
        if ((glide.x <= 0 && glide.v < 0) || (glide.x >= max && glide.v > 0)) glide.v = 0;
        glide.x = clamp(glide.x, 0, max);
      }
      row.scrollLeft = glide.x;
      if (Math.abs(glide.target - glide.x) < 0.4 && Math.abs(glide.v) < 4) { glide.frame = 0; return; }
      glide.frame = requestAnimationFrame(glideStep);
    };
    const glideBy = (delta, velocity = null) => {
      if (reduceMotion.matches) { row.scrollLeft += delta; return; }
      if (!glide.frame) { glide.x = glide.target = row.scrollLeft; glide.v = 0; glide.at = 0; glide.frame = requestAnimationFrame(glideStep); }
      if (velocity !== null) glide.v = velocity;
      glide.target += delta;
    };
    const stopGlide = () => { cancelAnimationFrame(glide.frame); glide.frame = 0; };
    row.addEventListener('wheel', (e) => {
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY) || row.scrollWidth <= row.clientWidth) return; // trackpads already scroll sideways
      e.preventDefault();
      const delta = e.deltaY * (e.deltaMode === 1 ? 32 : e.deltaMode === 2 ? row.clientWidth : 1);
      if (smooth) glideBy(delta * 1.4);
      else row.scrollBy({ left: delta, behavior: e.deltaMode ? 'smooth' : 'auto' });
    }, { passive: false });
    let drag = null;
    row.addEventListener('pointerdown', (e) => {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      stopGlide();
      drag = { x: e.clientX, left: row.scrollLeft, moved: false, vx: 0, lastX: e.clientX, lastAt: performance.now() };
    });
    addEventListener('pointermove', (e) => {
      if (!drag) return;
      const dx = e.clientX - drag.x, now = performance.now();
      if (Math.abs(dx) > 4) drag.moved = true;
      if (now > drag.lastAt) { drag.vx = 0.7 * drag.vx + 0.3 * ((e.clientX - drag.lastX) / (now - drag.lastAt)) * 1000; drag.lastX = e.clientX; drag.lastAt = now; }
      if (drag.moved) { row.scrollLeft = drag.left - dx; row.classList.add('dragging'); }
    });
    let dragEnd = 0;
    const endDrag = () => {
      if (drag?.moved) {
        dragEnd = performance.now();
        const fling = performance.now() - drag.lastAt < 80 ? -drag.vx : 0; // a flick keeps going and eases to a stop
        if (smooth && Math.abs(fling) > 60) glideBy(fling * 0.32, fling);
      }
      drag = null;
      row.classList.remove('dragging');
    };
    addEventListener('pointerup', endDrag);
    addEventListener('pointercancel', endDrag);
    addEventListener('blur', endDrag);
    row.addEventListener('click', (e) => { if (performance.now() - dragEnd < 80) { e.stopPropagation(); e.preventDefault(); } }, true);
    row.addEventListener('scroll', onScroll, { passive: true });
  }

  // The stations actually in the list, and how many the genre filter leaves.
  function stationsSub(shown) {
    if (!shown) return state.loadError ? 'Couldn’t load stations' : 'No stations listed yet';
    const n = state.tag ? visibleStations().length : shown;
    return state.tag ? `${fmt(n)} of ${fmt(shown)} stations` : `${fmt(shown)} station${shown === 1 ? '' : 's'}`;
  }

  // The panel opens for a selected country, a genre or the favorites tab; otherwise the map has the full width.
  function renderSide() {
    const open = state.mode === 'favorites' || state.mode === 'genres' || !!state.selected || !!state.genre;
    const iconMode = state.mode === 'favorites' || state.mode === 'genres'; // opened from an icon: no search box at the top
    syncTabs();
    el.finder.classList.toggle('open', open); // it drops in under the icons (CSS), and lifts away on closing
    if (open) el.finder.classList.toggle('favs', iconMode); // (kept while it closes, so its layout doesn't jump)
    el.finderBody.inert = !open;
    el.main.classList.toggle('panel-open', open);
    if (!open) return; // keep the last content while the panel fades out
    if (state.mode === 'genres') {
      el.eyebrow.classList.add('hidden'); // like favorites: the title sits at the top beside the close button
      el.sub.classList.remove('hidden');
      el.mark.innerHTML = `<span class="genre-mark">${ICON.disc}</span>`;
      el.title.textContent = 'Genres';
      el.sub.textContent = `${GENRES.length} genres, from every country`;
      setShuffle(null);
      el.genres.classList.add('hidden');
      loadGenreCounts();
    } else if (state.mode === 'favorites') {
      const n = state.favorites.length;
      el.eyebrow.classList.add('hidden');
      el.mark.innerHTML = ICON.heart;
      el.title.textContent = 'Favorites';
      el.sub.textContent = n ? `${n} saved station${n === 1 ? '' : 's'}` : '';
      el.sub.classList.toggle('hidden', !n); // the empty list already says nothing's saved
      setShuffle(n > 1 ? 'Shuffle your favorites' : null);
      renderGenres(state.favorites);
    } else if (state.genre) {
      const name = state.genre[0];
      el.eyebrow.classList.add('hidden'); // the title sits at the top, like favorites
      el.sub.classList.remove('hidden');
      el.mark.innerHTML = `<span class="genre-mark">${ICON.music}</span>`;
      el.title.textContent = name;
      el.sub.textContent = state.loading ? 'Finding stations…' : stationsSub(state.stations.length);
      setShuffle(state.stations.length > 1 ? `Shuffle ${name.toLowerCase()} stations` : null);
      state.tag = null;
      el.genres.classList.add('hidden'); // a genre's own list doesn't need genre pills (they're for countries and favorites)
    } else {
      const cc = state.selected, name = nameOf(cc);
      el.eyebrow.classList.remove('hidden');
      el.sub.classList.remove('hidden');
      el.eyebrow.textContent = 'You’re exploring';
      el.mark.innerHTML = flagImg(cc, true);
      el.title.textContent = name;
      el.sub.textContent = state.loading ? 'Loading stations…' : stationsSub(state.stations.length);
      setShuffle(state.stations.length > 1 ? `Shuffle ${possessive(name)} stations` : null);
      renderGenres(state.loading ? [] : state.stations);
    }
    renderList();
  }

  function visibleStations() {
    let base = state.mode === 'favorites' ? state.favorites : state.stations;
    if (state.tag) base = base.filter((s) => hasTag(s, state.tag));
    const q = state.query.toLowerCase();
    if (!q) return base;
    return base.filter((s) => s.name.toLowerCase().includes(q) || (s.tags || '').toLowerCase().includes(q) || (s.state || '').toLowerCase().includes(q));
  }

  const isCurrent = (s) => !!state.current && state.current.stationuuid === s.stationuuid;

  function rowHtml(s, i) {
    const fav = isFav(s), cur = isCurrent(s), live = cur && state.playing;
    const name = esc(s.name.trim());
    return `<li class="row${cur ? ' current' : ''}" data-i="${i}">
      <button class="row-play${s.favicon ? ' has-logo' : ''}${cur && state.connecting ? ' loading' : ''}" data-icon="${live ? 'lines' : 'play'}" aria-label="${live ? 'Pause' : 'Play'} ${name}">
        <span class="row-initial">${esc((s.name.match(/[A-Za-z0-9]/) || ['♪'])[0].toUpperCase())}</span>${s.favicon ? `<img class="row-logo" src="${esc(s.favicon)}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer" onload="if(this.naturalWidth>8)this.classList.add('ok');else this.onerror()" onerror="this.parentNode.classList.remove('has-logo');this.remove()">` : ''}<span class="row-icon">${live ? ICON.lines : ICON.play}</span>
      </button>
      <div class="row-info"><div class="row-name">${name}</div><div class="row-meta">${metaHtml(s, state.mode === 'favorites' || !!state.genre)}</div></div>
      <button class="row-fav${fav ? ' on' : ''}" data-fav="${i}" aria-pressed="${fav}" aria-label="${fav ? 'Remove from' : 'Add to'} favorites">${ICON.heart}</button>
    </li>`;
  }

  // The list fades at its top once scrolled, and at its bottom until the end is reached.
  function listFade() {
    const l = el.list;
    l.classList.toggle('fade-top', l.scrollTop > 2);
    l.classList.toggle('fade-bottom', l.scrollTop + l.clientHeight < l.scrollHeight - 2);
  }

  function renderList() {
    requestAnimationFrame(listFade); // once the new rows are in
    if (state.mode === 'genres') { el.list.innerHTML = GENRES.map(genreRow).join(''); return; }
    if (state.mode === 'explore' && state.loading) { el.list.innerHTML = '<li class="skeleton"></li>'.repeat(6); return; }
    const list = visibleStations();
    if (!list.length) {
      let note;
      if (state.query) note = `No stations match “${esc(state.query)}”.`;
      else if (state.mode === 'favorites') note = 'Nothing saved yet.<br>Tap the heart on any station to keep it here.';
      else if (state.genre && !state.loadError) note = 'No working stations found for this genre right now.';
      else if (state.loadError) note = 'Couldn’t reach the radio directory.<br>Try again in a moment.';
      else note = 'The directory doesn’t list any working stations here yet.<br>Try a neighbouring country.';
      el.list.innerHTML = `<li class="list-note">${note}</li>`;
      return;
    }
    el.list.innerHTML = list.map(rowHtml).join('');
  }

  // Refresh playing / favourite marks without rebuilding the list (keeps scroll and focus).
  function updateRows() {
    if (state.mode === 'explore' && ((!state.selected && !state.genre) || state.loading)) return;
    const list = visibleStations();
    el.list.querySelectorAll('.row[data-i]').forEach((li) => {
      const s = list[li.dataset.i];
      if (!s) return;
      const cur = isCurrent(s), live = cur && state.playing, fav = isFav(s);
      li.classList.toggle('current', cur);
      const btn = li.querySelector('.row-play');
      btn.classList.toggle('loading', cur && state.connecting);
      const icon = live ? 'lines' : 'play';
      if (btn.dataset.icon !== icon) { btn.querySelector('.row-icon').innerHTML = ICON[icon]; btn.dataset.icon = icon; }
      btn.setAttribute('aria-label', `${live ? 'Pause' : 'Play'} ${s.name.trim()}`);
      const favBtn = li.querySelector('.row-fav');
      favBtn.classList.toggle('on', fav);
      favBtn.setAttribute('aria-pressed', fav);
      favBtn.setAttribute('aria-label', `${fav ? 'Remove from' : 'Add to'} favorites`);
    });
  }

  let selectToken = 0;
  async function selectCountry(cc, opts = {}) {
    if (!cc) return;
    const token = ++selectToken;
    state.selected = cc;
    state.genre = null;
    setMode('explore', false);
    markSelected(cc);
    state.stations = [];
    state.loading = true;
    state.loadError = false;
    renderSide(); // opens the panel first, so the map can make room for it
    if (opts.zoom) zoomToCountry(cc); else revealCountry(cc);
    try {
      const list = await fetchStations(cc);
      if (token !== selectToken) return;
      state.stations = list;
    } catch {
      if (token !== selectToken) return;
      state.loadError = true;
    }
    state.loading = false;
    renderSide();
    return state.stations;
  }

  // The genre list: one row per genre, with how many stations the directory tags with it.
  let genreCounts = null, genreCountsLoading = false;
  async function loadGenreCounts() {
    if (genreCounts || genreCountsLoading) return;
    genreCountsLoading = true;
    try {
      const tags = await api('/json/tags?order=stationcount&reverse=true&hidebroken=true&limit=600');
      genreCounts = Object.fromEntries(tags.map((t) => [t.name.toLowerCase(), t.stationcount]));
      if (state.mode === 'genres') renderList();
    } catch { /* counts are a nicety; the list works without them */ }
    genreCountsLoading = false;
  }
  function genreRow(g, i) {
    const n = genreCounts?.[g[1]] || genreCounts?.[g[1].replace(/\s+/g, '')];
    return `<li class="row genre-row" data-genre="${i}" role="button" tabindex="0" aria-label="${esc(g[0])} stations">
      <span class="genre-ico">${ICON.music}</span>
      <div class="row-info"><div class="row-name">${esc(g[0])}</div><div class="row-meta">${n ? `${fmt(n)} stations` : 'Stations from every country'}</div></div>
      <svg class="genre-chev" viewBox="0 0 24 24"><path d="m9 18 6-6-6-6"/></svg>
    </li>`;
  }
  el.list.addEventListener('keydown', (e) => {
    const g = e.target.closest?.('[data-genre]');
    if (g && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); selectGenre(GENRES[g.dataset.genre]); }
  });

  // A genre lists its stations from every country; the map clears its selection while it's open.
  async function selectGenre(g) {
    const token = ++selectToken;
    state.selected = null;
    state.genre = g;
    setMode('explore', false);
    markSelected(null);
    state.stations = [];
    state.loading = true;
    state.loadError = false;
    renderSide();
    try {
      const list = await fetchGenre(g[1]);
      if (token !== selectToken) return;
      state.stations = list;
    } catch {
      if (token !== selectToken) return;
      state.loadError = true;
    }
    state.loading = false;
    renderSide();
  }

  // Clicking empty map (or the close button) clears the selection and gives the map its full width back.
  function closePanel() {
    if (!state.selected && !state.genre && state.mode === 'explore') return;
    ++selectToken; // drop a station list that's still loading
    state.selected = null;
    state.genre = null;
    state.stations = [];
    state.loading = false;
    markSelected(null);
    setMode('explore');
  }

  // ---------- Country search ----------
  let results = [], activeIdx = 0;
  function searchCountries(q) {
    q = q.trim().toLowerCase();
    if (!q) return [];
    const starts = [], contains = [];
    for (const c of state.countries) {
      const n = c.name.toLowerCase();
      if (n.startsWith(q) || c.cc.toLowerCase() === q) starts.push(c);
      else if (n.includes(q)) contains.push(c);
    }
    return starts.concat(contains).slice(0, 8);
  }
  // Stations are searched by name across the whole directory, a moment after typing stops.
  let stationHits = [], stationQuery = '', stationTimer = 0, stationToken = 0;
  function searchStations(q) {
    clearTimeout(stationTimer);
    if (q.length < 2) { stationHits = []; stationQuery = q; return; }
    if (q === stationQuery) return;
    const token = ++stationToken;
    stationTimer = setTimeout(async () => {
      try {
        const raw = await api(`/json/stations/search?name=${encodeURIComponent(q)}&hidebroken=true&order=clickcount&reverse=true&limit=12`);
        if (token !== stationToken) return;
        const seen = new Set();
        stationHits = raw.filter((s) => s.url_resolved && !seen.has(s.name.trim().toLowerCase()) && seen.add(s.name.trim().toLowerCase())).slice(0, 6);
        stationQuery = q;
        if (el.cSearch.value.trim() === q) renderResults();
      } catch { /* directory unreachable: countries still work */ }
    }, 280);
  }

  function renderResults() {
    const q = el.cSearch.value.trim();
    searchStations(q);
    const countries = searchCountries(q), stations = q === stationQuery ? stationHits : [];
    const lq = q.toLowerCase(), genres = !q ? [] : GENRES.filter((g) => g[0].toLowerCase().startsWith(lq) || g[1].includes(lq)).slice(0, 4);
    results = [...countries.map((c) => ({ c })), ...genres.map((g) => ({ g })), ...stations.map((s) => ({ s }))];
    const open = !!q;
    el.cResults.classList.toggle('hidden', !open);
    el.cSearch.setAttribute('aria-expanded', open);
    if (!open) { el.cSearch.removeAttribute('aria-activedescendant'); return; }
    if (!results.length) {
      el.cResults.innerHTML = `<li class="none">${q.length >= 2 && q !== stationQuery ? 'Searching…' : 'No matching country, station or genre'}</li>`;
      return;
    }
    activeIdx = clamp(activeIdx, 0, results.length - 1);
    const item = (r, i) => {
      const cls = i === activeIdx ? 'active' : '', attrs = `role="option" id="cr-${i}" data-i="${i}" class="${cls}" aria-selected="${i === activeIdx}"`;
      if (r.c) return `<li ${attrs}>${flagImg(r.c.cc)}<span>${esc(r.c.name)}</span><span class="count">${fmt(r.c.count)}</span></li>`;
      if (r.g) return `<li ${attrs}><span class="res-genre">${ICON.disc}</span><span>${esc(r.g[0])}</span><span class="count">Genre</span></li>`;
      return `<li ${attrs}>${flagImg(r.s.countrycode)}<span>${esc(r.s.name.trim())}</span><span class="count">${esc(nameOf(r.s.countrycode, r.s.country))}</span></li>`;
    };
    // a heading where genres or stations start, below other results
    const kind = (r) => (r.c ? 'c' : r.g ? 'g' : 's');
    el.cResults.innerHTML = results.map((r, i) => (i > 0 && kind(r) !== kind(results[i - 1]) ? `<li class="group">${kind(r) === 'g' ? 'Genres' : 'Stations'}</li>` : '') + item(r, i)).join('');
    el.cSearch.setAttribute('aria-activedescendant', `cr-${activeIdx}`);
  }
  function pickResult(r) {
    if (!r) return;
    el.cSearch.value = '';
    renderResults();
    el.cSearch.blur();
    el.searchbar.classList.remove('searching');
    if (r.c) selectCountry(r.c.cc, { zoom: true });
    else if (r.g) selectGenre(r.g);
    else tune(r.s, stationHits);
  }

  // ---------- Player ----------
  // Two players. Most streams allow the page to read their audio, so they play through Web Audio and the glow
  // can follow the beat; the rest refuse that and play on a plain element instead (a page can't analyse those).
  const fxAudio = new Audio(), plainAudio = new Audio();
  fxAudio.crossOrigin = 'anonymous';
  fxAudio.preload = plainAudio.preload = 'none';
  let audio = plainAudio; // whichever is playing now
  let hls = null, actx = null, analyser = null, gain = null;
  const sound = { volume: 0.8, muted: false };
  try { const v = parseFloat(localStorage.getItem(VOL_KEY) ?? '0.8'); if (Number.isFinite(v)) sound.volume = clamp(v, 0, 1); } catch { /* storage unavailable */ }
  el.volume.value = sound.volume;

  // Built on the first play (browsers only allow audio to start from a click).
  // Phones and tablets suspend Web Audio when the browser is minimised or the screen locks, which would stop the music,
  // so there everything plays on the plain player (it keeps going in the background) and the ring drifts on its own.
  const backgroundSafe = matchMedia('(hover: none) and (pointer: coarse)').matches;
  function ensureGraph() {
    if (actx || !window.AudioContext || backgroundSafe) return;
    try {
      actx = new AudioContext();
      analyser = actx.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.5;
      analyser.minDecibels = -85;
      analyser.maxDecibels = -20;
      gain = actx.createGain();
      actx.createMediaElementSource(fxAudio).connect(analyser);
      analyser.connect(gain);
      gain.connect(actx.destination);
    } catch { actx = analyser = gain = null; }
    applyVolume();
  }

  // Volume is applied after the analyser, so the glow doesn't fade when the music is turned down.
  function applyVolume() {
    const v = sound.muted ? 0 : sound.volume;
    plainAudio.volume = v;
    if (gain) { fxAudio.volume = 1; gain.gain.value = v; } else fxAudio.volume = v;
  }
  applyVolume();

  function setPlayIcon(mode) { // 'play' | 'pause' | 'loading'
    state.connecting = mode === 'loading';
    el.play.classList.toggle('loading', mode === 'loading');
    el.play.classList.toggle('is-pause', mode !== 'play');
    setTip(el.play, mode === 'play' ? 'Play' : mode === 'loading' ? 'Stop' : 'Pause');
  }

  let artFor;
  // The station logo becomes the CD's label.
  function setArt(s) {
    el.npLabel.style.removeProperty('--art');
    el.pinLogo.style.removeProperty('--art');
    el.np.classList.remove('has-art');
    el.npLabel.innerHTML = s ? esc((s.name.match(/[A-Za-z0-9]/) || ['♪'])[0].toUpperCase()) : ICON.radio;
    artFor = s?.stationuuid;
    if (!s?.favicon) return;
    const img = new Image();
    img.onload = () => {
      if (artFor !== s.stationuuid || img.naturalWidth <= 8) return;
      el.npLabel.style.setProperty('--art', `url("${img.src.replace(/"/g, '%22')}")`);
      el.pinLogo.style.setProperty('--art', `url("${img.src.replace(/"/g, '%22')}")`);
      el.np.classList.add('has-art');
      el.npLabel.textContent = '';
    };
    img.src = s.favicon;
  }


  function updateFavNow() {
    const s = state.current, on = !!s && isFav(s);
    el.pFav.disabled = !s;
    el.pFav.classList.toggle('on', on);
    setTip(el.pFav, on ? 'Remove from favorites' : 'Add to favorites');
  }

  let npFor;
  function updateNowPlaying() {
    const s = state.current;
    if ((s?.stationuuid) !== artFor || !s) setArt(s);
    if (npFor !== (s?.stationuuid ?? null)) { // station details only change with the station
      npFor = s?.stationuuid ?? null;
      el.npName.textContent = s ? s.name.trim() : 'Nothing playing';
      el.npCountry.innerHTML = s ? `${flagImg(s.countrycode)}<span>${esc(nameOf(s.countrycode, s.country))}</span>` : '';
      el.npTags.textContent = s ? tagsOf(s).slice(0, 3).map(titleCase).join(' · ') : '';
      el.npGenreRow.classList.toggle('hidden', !el.npTags.textContent);
      if (s) setTip(el.pShuffle, `Shuffle ${possessive(nameOf(s.countrycode, s.country))} stations`);
      if (s) requestAnimationFrame(() => { placePin(); dropPin(); }); // once the pin has moved to the new spot
    }
    el.np.classList.toggle('idle', !s);
    el.main.classList.toggle('has-player', !!s);
    el.quality.textContent = s ? [s.codec && s.codec !== 'UNKNOWN' ? s.codec : null, s.bitrate ? `${s.bitrate} kbps` : null].filter(Boolean).join(' · ') : '';
    el.npStreamRow.classList.toggle('hidden', !el.quality.textContent);
    el.np.classList.toggle('on', state.playing);
    el.np.classList.toggle('connecting', state.connecting);
    el.live.textContent = state.playing ? '● LIVE' : state.connecting ? '● TUNING' : s ? '○ PAUSED' : '○ OFF AIR';
    const idx = state.queue.findIndex((q) => q.stationuuid === s?.stationuuid);
    el.prev.disabled = idx <= 0;
    el.next.disabled = idx < 0 || idx >= state.queue.length - 1;
    el.play.disabled = !s;
    document.title = s && state.playing ? `${s.name.trim()} · uniwave` : 'uniwave';
    startViz(); // fades in when playing, out when not
    updateIdleCamera();
    placePin();
    updateFavNow();
    updateRows();
  }

  let tuneToken = 0;
  async function tune(s, queue) {
    const token = ++tuneToken;
    state.current = s;
    if (queue) state.queue = queue.slice();
    state.playing = false;
    setPlayIcon('loading');
    updateNowPlaying();

    stopAudio();
    ensureGraph();
    if (actx?.state === 'suspended') actx.resume().catch(() => {});

    // Try the analysed player first; a stream that doesn't allow it refuses to load there, so fall back to the plain one.
    for (const player of analyser ? [fxAudio, plainAudio] : [plainAudio]) {
      try {
        await startStream(player, s);
        if (token !== tuneToken) return;
        state.playing = true;
        setPlayIcon('pause');
        updateNowPlaying();
        setMediaSession(s);
        api(`/json/url/${s.stationuuid}`).catch(() => {}); // register the click with the directory
        return;
      } catch (e) {
        if (token !== tuneToken || e?.name === 'AbortError') return;
        stopAudio();
      }
    }
    onStreamError();
  }

  function startStream(player, s) {
    audio = player;
    const url = s.url_resolved;
    let timer;
    const timeout = new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('timeout')), 15000); });
    let started;
    if ((s.hls == 1 || /\.m3u8(\?|$)/i.test(url)) && window.Hls?.isSupported()) {
      const h = hls = new Hls();
      started = new Promise((resolve, reject) => {
        h.on(Hls.Events.ERROR, (_, d) => { if (d.fatal) reject(new Error('hls')); });
        h.loadSource(url);
        h.attachMedia(player);
        player.play().then(resolve, reject);
      });
    } else {
      player.src = url;
      started = player.play();
    }
    return Promise.race([started, timeout]).finally(() => clearTimeout(timer));
  }

  function stopAudio() {
    if (hls) { hls.destroy(); hls = null; }
    for (const p of [fxAudio, plainAudio]) {
      p.pause();
      if (p.hasAttribute('src')) { p.removeAttribute('src'); p.load(); } // stop downloading
    }
  }

  function onStreamError() {
    const s = state.current;
    state.playing = false;
    setPlayIcon('play');
    updateNowPlaying();
    const idx = state.queue.findIndex((q) => q.stationuuid === s?.stationuuid);
    if (idx >= 0 && idx < state.queue.length - 1) {
      toast(`${s.name.trim()} is off air, tuning the next station`);
      setTimeout(() => tune(state.queue[idx + 1]), 600);
    } else {
      toast(`${s?.name.trim() || 'That station'} is off air`);
    }
  }

  // Only the active player's events count; failures while connecting are handled in tune().
  for (const p of [fxAudio, plainAudio]) {
    p.addEventListener('error', () => { if (p === audio && state.playing) onStreamError(); });
    p.addEventListener('waiting', () => { if (p === audio && state.playing) { setPlayIcon('loading'); updateNowPlaying(); } });
    p.addEventListener('playing', () => { if (p === audio && (state.playing || state.connecting)) { state.playing = true; setPlayIcon('pause'); updateNowPlaying(); } });
  }

  function togglePlay() {
    if (!state.current) return;
    if (state.playing || state.connecting) {
      ++tuneToken; // cancels a station that's still connecting
      stopAudio();
      state.playing = false;
      setPlayIcon('play');
      updateNowPlaying();
    } else {
      tune(state.current); // reconnect at the live edge rather than resuming a stale buffer
    }
  }

  function step(dir) {
    const idx = state.queue.findIndex((q) => q.stationuuid === state.current?.stationuuid);
    const next = state.queue[idx + dir];
    if (idx >= 0 && next) tune(next);
  }

  function setMediaSession(s) {
    if (!('mediaSession' in navigator)) return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: s.name.trim(), artist: nameOf(s.countrycode, s.country), album: 'uniwave',
      artwork: s.favicon ? [{ src: s.favicon }] : [],
    });
    navigator.mediaSession.setActionHandler('play', togglePlay);
    navigator.mediaSession.setActionHandler('pause', togglePlay);
    navigator.mediaSession.setActionHandler('previoustrack', () => step(-1));
    navigator.mediaSession.setActionHandler('nexttrack', () => step(1));
  }

  function updateVolIcon() {
    const v = sound.muted ? 0 : sound.volume;
    el.volIcon.innerHTML = ICON.speaker + (v === 0
      ? '<line x1="22" x2="16" y1="9" y2="15"/><line x1="16" x2="22" y1="9" y2="15"/>'
      : '<path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>' + (v >= 0.5 ? '<path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>' : ''));
    el.volume.style.setProperty('--v', `${sound.volume * 100}%`);
    el.volume.classList.toggle('muted', v === 0);
    setTip(el.mute, v === 0 ? 'Unmute' : 'Mute');
  }

  // ---------- Spectrum ----------
  // Reads the music (when the stream allows it) and draws it as a faint ring around the station logo.
  const ringCanvas = $('np-ring'), rctx = ringCanvas.getContext('2d');
  const BANDS = 40;
  const level = new Float32Array(BANDS);
  let freq = null, bandStart = null, vizFrame = 0, vizLast = 0, vizFade = 0, bassAvg = 0, pulse = 0, lastBeat = 0;

  function startViz() {
    if (vizFrame || reduceMotion.matches) return;
    vizLast = performance.now();
    vizFrame = requestAnimationFrame(drawViz);
  }

  // Log-spaced bands from 35 Hz to 14 kHz, as FFT bin indexes.
  function setupBands() {
    freq = new Uint8Array(analyser.frequencyBinCount);
    const hz = actx.sampleRate / analyser.fftSize;
    bandStart = Array.from({ length: BANDS + 1 }, (_, i) => Math.max(1, Math.round(35 * Math.pow(14000 / 35, i / BANDS) / hz)));
  }

  function readSpectrum(dt, now) {
    if (!freq) setupBands();
    analyser.getByteFrequencyData(freq);
    const attack = 1 - Math.exp(-dt * 14), release = 1 - Math.exp(-dt * 4); // smooth, so it breathes rather than flickers
    let bass = 0;
    for (let i = 0; i < BANDS; i++) {
      let peak = 0;
      for (let b = bandStart[i], end = Math.max(b + 1, bandStart[i + 1]); b < end; b++) peak = Math.max(peak, freq[b]);
      const target = Math.pow(peak / 255, 1.5) * (1 + i / BANDS * 0.6); // lift the treble a little, it's naturally quieter
      level[i] += (target - level[i]) * (target > level[i] ? attack : release);
      if (i >= 2 && i < 9) bass += target / 7; // roughly 45–130 Hz: kick drums and bass lines
    }
    // A beat is a jump in bass well above its recent average.
    bassAvg += (bass - bassAvg) * (1 - Math.exp(-dt * 2.5));
    if (bass > bassAvg * 1.25 + 0.035 && now - lastBeat > 180) { pulse = Math.min(1, 0.55 + (bass - bassAvg) * 3); lastBeat = now; }
  }

  // Streams that can't be analysed get a slow, gentle drift instead of a fake beat.
  function driftSpectrum(dt, now) {
    const t = now / 1000, ease = 1 - Math.exp(-dt * 3);
    for (let i = 0; i < BANDS; i++) {
      const target = 0.16 + 0.12 * (0.5 + 0.5 * Math.sin(t * 0.8 + i * 0.33)) * (0.6 + 0.4 * Math.sin(t * 0.31 - i * 0.12));
      level[i] += (target - level[i]) * ease;
    }
  }

  // The circular spectrum around the logo: fine bars, bass at the top, higher notes running down both sides.
  function drawRing() {
    const W = ringCanvas.clientWidth, H = ringCanvas.clientHeight;
    if (!W) return;
    const cx = W / 2, cy = H / 2, r0 = ringCanvas.parentElement.clientWidth / 2 + 6, PER_SIDE = 36;
    rctx.lineCap = 'round';
    rctx.lineWidth = 1.4;
    for (let side = -1; side <= 1; side += 2) {
      for (let j = 0; j < PER_SIDE; j++) {
        const v = level[Math.round((j / (PER_SIDE - 1)) * (BANDS - 1))];
        const angle = -Math.PI / 2 + side * ((j + 0.5) / PER_SIDE) * Math.PI;
        const len = (1 + v * 12 + pulse * 1.5) * vizFade;
        const x = Math.cos(angle), y = Math.sin(angle);
        rctx.strokeStyle = `rgba(207, 245, 110, ${(0.12 + v * 0.4) * vizFade})`;
        rctx.beginPath();
        rctx.moveTo(cx + x * r0, cy + y * r0);
        rctx.lineTo(cx + x * (r0 + len), cy + y * (r0 + len));
        rctx.stroke();
      }
    }
  }

  function fitCanvas(c, ctx2, W, H, dpr) {
    if (c.width !== Math.round(W * dpr) || c.height !== Math.round(H * dpr)) { c.width = Math.round(W * dpr); c.height = Math.round(H * dpr); }
    ctx2.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx2.clearRect(0, 0, W, H);
  }

  function drawViz(now) {
    vizFrame = 0;
    const dt = Math.min(0.05, (now - vizLast) / 1000);
    vizLast = now;
    const live = state.playing && !audio.paused;
    vizFade += ((live ? 1 : 0) - vizFade) * (1 - Math.exp(-dt * (live ? 3 : 2.2)));
    pulse *= Math.exp(-dt * 4);
    const mode = !live ? 'off' : audio === fxAudio && analyser ? 'beat' : 'ambient';
    if (el.np.dataset.spectrum !== mode) el.np.dataset.spectrum = mode;
    if (mode === 'beat') readSpectrum(dt, now);
    else if (mode === 'ambient') driftSpectrum(dt, now);
    else for (let i = 0; i < BANDS; i++) level[i] *= Math.exp(-dt * 4);

    fitCanvas(ringCanvas, rctx, ringCanvas.clientWidth, ringCanvas.clientHeight, Math.min(2, window.devicePixelRatio || 1));
    if (vizFade < 0.004 && !live) return; // faded out: stop until something plays
    drawRing();
    vizFrame = requestAnimationFrame(drawViz);
  }

  // ---------- Idle camera ----------
  // While music plays and the app is left alone, a camera drifts in on the station that's playing: it zooms in very
  // slowly while the map tilts back into perspective and swings a little to one side, crab-walking toward the
  // station, then holds at the closest zoom. The moment you move, it flies back to exactly where you left the map,
  // untilting as it zooms out. The pointer and country highlights stay out of the way while it runs.
  const IDLE_MS = 10000;
  const CAM_HI = Math.log2(7);  // the closest zoom it goes to, then holds
  const CAM_SPEED = 0.018;      // octaves of zoom per second once cruising
  const CAM_EASE = 4;           // seconds to get up to speed, and to settle at the end
  const CAM_SPRING = 0.45;      // how briskly it glides over to the station (gentle, no overshoot)
  const TILT = 40, YAW = -12;   // degrees of perspective tilt and sideways swing at full zoom
  const CAM_TILT_IN = 9;        // seconds for the camera to settle into its angle
  let idleTimer = 0, idle = false, camFrame = 0, camLast = 0, camZ = 0, camV = 0, camFocus = null, camVel = [0, 0];
  let camHome = null, camFrom = 0, camTilt = 0, camT = 0, camState = 'off'; // 'off' | 'in' (zooming / holding) | 'out' (flying home)

  // The playing station's own location, when the directory has one.
  function stationGeo(s) {
    const lat = parseFloat(s?.geo_lat), lon = parseFloat(s?.geo_long);
    return projection && Number.isFinite(lat) && Number.isFinite(lon) ? projection([lon, lat]) : null;
  }
  // …or its country's centre, for the camera to aim at when it hasn't.
  function stationPoint() {
    const s = state.current;
    if (!s || !projection) return null;
    const p = stationGeo(s);
    if (p) return p;
    const f = state.byIso.get(s.countrycode);
    return f ? projection(d3.geoCentroid(mainPart(f))) : null;
  }

  // The middle of the map space left visible by the top bar and the station list.
  // On phones and tablets the player covers the lower part of the screen, so the middle is taken between the top bar
  // and the player: the station lands in the open space, not behind it.
  const compact = matchMedia('(max-width: 980px)');
  function camView() {
    const H = el.map.clientHeight;
    let top = headHeight(), bottom = H;
    if (compact.matches) {
      const area = el.mapArea.getBoundingClientRect(); // (the map itself may be tilted; its container never is)
      if (!el.np.classList.contains('idle')) bottom = Math.min(bottom, el.np.getBoundingClientRect().top - area.top);
      if (bottom - top < H * 0.2) { top = headHeight(); bottom = H; } // no sensible gap: use the whole map
    }
    return [(el.map.clientWidth - panelInset()) / 2, (top + bottom) / 2];
  }

  // The perspective: the map tips back around the middle of the view and turns slightly, by p (0 = flat, 1 = full).
  // It's enlarged as it tips so its corners stay off-screen, and its far edge fades out like a haze on the horizon.
  // (The opening shot borrows it with a steeper angle, lower down the screen.)
  let tiltAng = TILT, yawAng = YAW, tiltZoom = 0.5, tiltDrop = 0;
  let openDrift = 0; // the opening shot's slow slide, in map px (done by the GPU, so the map isn't redrawn every frame)
  const tiltCSS = (p) => `translateY(${tiltDrop * p}px) perspective(1200px) rotateX(${tiltAng * p}deg) rotateZ(${yawAng * p}deg) scale(${1 + tiltZoom * p})${openDrift ? ` translateX(${(-openDrift).toFixed(2)}px)` : ''}`;
  function setTilt(p) {
    camTilt = p;
    const st = el.map.style;
    if (p < 0.001) {
      st.transform = st.transformOrigin = st.maskImage = st.webkitMaskImage = '';
    } else {
      const [vx, vy] = camView();
      st.transformOrigin = `${vx}px ${vy}px`;
      st.transform = tiltCSS(p);
    }
    // The far edge fades into the dark. For the idle camera the fade sits on the map itself, so it follows the edge at
    // every angle; the intro uses a cheaper still shade over the top of the screen.
    const onMap = camState !== 'off' && p >= 0.001;
    st.maskImage = st.webkitMaskImage = onMap ? `linear-gradient(to bottom, rgba(0, 0, 0, ${1 - p}) 0%, rgba(0, 0, 0, ${1 - 0.7 * p}) 14%, #000 36%)` : '';
    el.horizon.style.opacity = onMap ? '0' : p.toFixed(3);
    placePin();
  }

  function updateIdleCamera() {
    const run = idle && state.playing && !!zoom && openState === 'off' && !reduceMotion.matches && !(phone.matches && el.finder.classList.contains('open'));
    if (run && camState === 'off') {
      camHome = transform; // where to return to
      camFocus = transform.invert(camView());
      camVel = [0, 0];
      camZ = camFrom = Math.log2(transform.k);
      camT = 0;
      camV = 0;
      camState = 'in';
      camLast = performance.now();
      camFrame = requestAnimationFrame(camStep);
      setHover(null);
      el.main.classList.add('cam');
    } else if (run && camState === 'in' && !camFrame) { // settled, and something changed (another station): move again
      camLast = performance.now();
      camFrame = requestAnimationFrame(camStep);
    } else if (!run && camState === 'in') {
      flyHome();
    }
  }

  function camStep(now) {
    const dt = Math.min(0.1, (now - camLast) / 1000);
    camLast = now;
    // Glide toward the station on a gentle spring: it sets off from rest and settles without overshooting.
    const target = stationPoint();
    if (target) {
      for (let i = 0; i < 2; i++) {
        camVel[i] += (CAM_SPRING * CAM_SPRING * (target[i] - camFocus[i]) - 2 * CAM_SPRING * camVel[i]) * dt;
        camFocus[i] += camVel[i] * dt;
      }
    }
    // Zoom in at a slow, steady speed and ease to a stop exactly at the closest zoom, then hold (already closer: it holds there).
    const aim = camZ < CAM_HI && CAM_HI - camZ > camV * CAM_EASE ? CAM_SPEED : 0;
    camV += (aim - camV) * (1 - Math.exp(-dt / CAM_EASE));
    camZ = Math.min(Math.max(CAM_HI, camFrom), camZ + camV * dt);
    // The angle comes in from the very first moment, together with the glide and the zoom, over CAM_TILT_IN seconds.
    camT = Math.min(1, camT + dt / CAM_TILT_IN);
    setTilt(camT * camT * (3 - 2 * camT));
    const [vx, vy] = camView();
    svg.call(zoom.transform, d3.zoomIdentity.translate(vx, vy).scale(2 ** camZ).translate(-camFocus[0], -camFocus[1]));
    // Once everything has settled it simply holds, without redrawing every frame.
    const still = camT >= 1 && camV < 1e-5 && (!target || Math.hypot(target[0] - camFocus[0], target[1] - camFocus[1], camVel[0], camVel[1]) < 0.02);
    camFrame = still ? 0 : requestAnimationFrame(camStep);
  }

  // Back to where the map was before the camera started, untilting along the way.
  function flyHome() {
    cancelAnimationFrame(camFrame);
    camFrame = 0;
    camState = 'out';
    el.main.classList.remove('cam');
    const from = camTilt;
    const done = () => { setTilt(0); camState = 'off'; };
    svg.transition().duration(reduceMotion.matches ? 0 : 2200).ease(d3.easeCubicInOut)
      .call(zoom.transform, camHome)
      .tween('tilt', () => (t) => setTilt(from * (1 - t)))
      .on('end', done).on('interrupt', done);
  }

  // ---------- Opening shot ----------
  // While the logo plays, the map lies far back on a steep angle in the lower part of the dark screen, drifting slowly
  // east. As the logo flies up to the top bar, the camera swings down into the usual flat view and the controls fade in.
  const OPEN = { tilt: 62, yaw: -18, zoom: 0.45, drop: 0.2, k: 1.9, lat: 34, lon: -38, drift: 6 }; // drift: degrees east per second
  const OPEN_DIM = 0.5; // the map is dimmed during the shot, a faint world in the dark
  let openFrame = 0, openFade = null, openRoll = null, openState = 'waiting'; // 'waiting' (for the map) | 'on' | 'landing' | 'off'
  function openShot() { // once the map is built: placed at its angle, unseen until the logo starts
    if (openState !== 'waiting' || !document.body.classList.contains('intro-hold')) return;
    openState = 'on';
    [tiltAng, yawAng, tiltZoom, tiltDrop] = [OPEN.tilt, OPEN.yaw, OPEN.zoom, el.map.clientHeight * OPEN.drop];
    openFade = el.map.animate([{ opacity: 0 }, { opacity: OPEN_DIM }], { duration: 1400, easing: 'ease-out', fill: 'forwards' });
    openFade.pause(); // held at nothing while the rest gets ready
    // The map is placed once; the drift east is a slide of the whole tilted layer, so nothing is redrawn while it plays.
    const p = projection([OPEN.lon, OPEN.lat]), [vx, vy] = camView();
    const pxPerSec = OPEN.drift * (projection([OPEN.lon + 1, OPEN.lat])[0] - p[0]) * OPEN.k;
    svg.call(zoom.transform, d3.zoomIdentity.translate(vx, vy).scale(OPEN.k).translate(-p[0], -p[1]));
    openDrift = 0;
    setTilt(1);
    openRoll = () => { // as the logo starts: the map fades in and begins its drift
      openRoll = null;
      openFade.play();
      const t0 = performance.now();
      const step = (now) => {
        openDrift = (pxPerSec * (now - t0)) / 1000;
        el.map.style.transform = tiltCSS(1);
        openFrame = requestAnimationFrame(step);
      };
      openFrame = requestAnimationFrame(step);
    };
  }
  // Heavy one-off jobs (building the station cards, uploading the earth pictures) are done while the app loads. One that
  // comes late waits until the intro and its landing are over, and for a quiet moment, so it never freezes an animation.
  async function afterIntro() {
    while (openState === 'waiting' || openState === 'on' || openState === 'landing' || document.body.classList.contains('intro-hold')) {
      await new Promise((r) => setTimeout(r, 150));
    }
    await new Promise((r) => (window.requestIdleCallback ? requestIdleCallback(r, { timeout: 800 }) : setTimeout(r, 200)));
  }

  // As the map settles, everything else comes in together: the top bar's icons, the heading, the station cards and
  // the zoom buttons, in one soft fade. (The cards fade themselves: fading the heading's box would stop their glass
  // from blurring the map behind them until it ended.)
  const REVEAL = { duration: 900, easing: 'cubic-bezier(.2, .8, .2, 1)' };
  function revealUI() {
    if (!document.body.classList.contains('intro-hold')) return;
    document.body.classList.remove('intro-hold');
    for (const node of document.querySelectorAll('.map-intro, .searchbar, .tabs, .intro-text h1, .intro-text p, .map-foot')) {
      node.animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { ...REVEAL, fill: 'backwards' });
    }
    if (el.famous.children.length) {
      el.famous.classList.add('in', 'entering');
      setTimeout(() => el.famous.classList.remove('entering'), REVEAL.duration + 100);
    }
    if (openState === 'off') startFamousAuto(); // else once the map has landed
  }
  function landShot(duration) { // the logo is leaving
    if (openState !== 'on') { openState = 'off'; revealUI(); return; }
    cancelAnimationFrame(openFrame);
    openState = 'landing';
    if (openDrift) { // hand the slide back to the map's own position, in one step, before it lands
      const d = openDrift;
      openDrift = 0;
      svg.call(zoom.transform, transform.translate(-d / transform.k, 0));
      setTilt(1);
    }
    const from = getComputedStyle(el.map).opacity; // brightens to full as it lands
    openFade?.cancel();
    el.map.animate([{ opacity: from }, { opacity: 1 }], { duration, easing: 'cubic-bezier(.4, 0, .2, 1)' });
    // The landing is one GPU animation of the whole layer: the map is redrawn once at its final, flat view, and the
    // layer starts out transformed so it looks exactly like the tilted shot, then eases to no transform at all.
    const [ox, oy] = camView(), { k, x, y } = transform;
    const shot = `${tiltCSS(1)} translate(${-ox}px, ${-oy}px) matrix(${k}, 0, 0, ${k}, ${x}, ${y}) translate(${ox}px, ${oy}px)`;
    const flat = `translateY(0px) perspective(1200px) rotateX(0deg) rotateZ(0deg) scale(1) translate(${-ox}px, ${-oy}px) matrix(1, 0, 0, 1, 0, 0) translate(${ox}px, ${oy}px)`;
    svg.call(zoom.transform, d3.zoomIdentity); // drawn once, flat
    el.map.style.transformOrigin = `${ox}px ${oy}px`;
    el.map.style.transform = shot;
    const ease = 'cubic-bezier(.65, 0, .35, 1)';
    const land = el.map.animate([{ transform: shot }, { transform: flat }], { duration, easing: ease, fill: 'forwards' });
    el.horizon.animate([{ opacity: 1 }, { opacity: 0 }], { duration: duration * 0.7, easing: ease, fill: 'forwards' });
    const done = () => {
      if (openState !== 'landing') return;
      land.cancel();
      el.horizon.getAnimations().forEach((a) => a.cancel());
      setTilt(0);
      [tiltAng, yawAng, tiltZoom, tiltDrop] = [TILT, YAW, 0.5, 0];
      openState = 'off';
      revealUI();
      startFamousAuto(); // the cards start gliding once everything is still
    };
    land.onfinish = done;
    land.oncancel = done;
    setTimeout(revealUI, duration * 0.6); // the controls arrive while it settles
  }

  // ---------- Station pin ----------
  // The active station's location (or its country's centre), shown as a pin for as long as the station is on: dropped
  // on the spot when the station is picked, at any zoom, and carried through the idle camera's tilt.
  const PIN_SIZE = 0.68; // the pin's size against its full drawing
  function dropPin() {
    if (reduceMotion.matches || !stationPoint()) return;
    el.pin.classList.remove('drop');
    void el.pin.offsetWidth; // restart the drop
    el.pin.classList.add('drop');
  }
  el.pin.addEventListener('animationend', (e) => { if (e.animationName === 'pin-drop') el.pin.classList.remove('drop'); });
  function placePin() {
    const p = stationPoint(); // its own location, or its country's centre when the directory has none
    el.pin.classList.toggle('show', !!p);
    if (!p) return;
    let x = transform.applyX(p[0]), y = transform.applyY(p[1]), size = PIN_SIZE;
    if (camTilt > 0.001) { // project the spot through the camera's tilt; the pin stays upright, smaller with distance
      const [ox, oy] = camView();
      const q = new DOMMatrix(tiltCSS(camTilt)).transformPoint(new DOMPoint(x - ox, y - oy, 0, 1));
      x = ox + q.x / q.w;
      y = oy + q.y / q.w;
      size = (PIN_SIZE * (1 + 0.5 * camTilt)) / q.w;
    }
    el.pin.style.transform = `translate(${x}px, ${y}px) scale(${size})`;
    el.pin.style.setProperty('--flat', Math.cos((TILT * camTilt * Math.PI) / 180).toFixed(3));
  }

  function wake() {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => { idle = true; updateIdleCamera(); }, IDLE_MS);
    if (idle) { idle = false; updateIdleCamera(); }
  }
  for (const type of ['pointermove', 'pointerdown', 'wheel', 'keydown', 'touchstart']) addEventListener(type, wake, { passive: true, capture: true });
  wake();

  // ---------- Shuffle ----------
  // The player's shuffle: another station from the same country as the one playing.
  async function shuffleCountry() {
    const s = state.current;
    if (!s) return;
    const cc = s.countrycode;
    let list = state.selected === cc && !state.loading && state.stations.length ? state.stations : null;
    if (!list && cc) {
      try { list = await fetchStations(cc); } catch { toast('Couldn’t reach the radio directory'); return; }
      if (state.current !== s) return; // something else started meanwhile
    }
    const pool = (list || state.queue).filter((x) => x.stationuuid !== s.stationuuid);
    if (pool.length) tune(pool[Math.floor(Math.random() * pool.length)], list || state.queue);
    else toast(`No other stations in ${nameOf(cc, s.country)}`);
  }

  function shuffleList() {
    const list = visibleStations().filter((s) => !isCurrent(s));
    if (list.length) tune(list[Math.floor(Math.random() * list.length)], visibleStations());
  }

  // A longer band of popular stations, with countries spread across the first pass.
  let famous = [];
  const FAMOUS_COUNTRIES = ['US', 'GB', 'FR', 'DE', 'JP', 'IT', 'ES', 'BR', 'CA', 'AU', 'IN', 'NL', 'KR', 'MX', 'SE', 'CH', 'IE', 'AR', 'NZ', 'AT', 'BE', 'NO', 'DK', 'PT'];
  // A logo counts when it loads within a few seconds and is big enough not to look like a blurry favicon.
  function logoLoads(src) {
    return new Promise((resolve) => {
      const img = new Image(), done = (v) => { clearTimeout(t); img.onload = img.onerror = null; resolve(v); };
      const t = setTimeout(() => done(false), 5000);
      img.referrerPolicy = 'no-referrer';
      img.onload = () => { const w = img.naturalWidth, h = img.naturalHeight; done(w >= 64 && h >= 64 && w / h > 0.75 && w / h < 1.33); }; // square-ish, like a logo tile
      img.onerror = () => done(false);
      img.src = src;
    });
  }
  async function pickFamous() {
    // Well-known countries only, best-loved stations first, and only those whose logo actually loads at a decent size.
    const raw = dedupe(await api('/json/stations/topvote?hidebroken=true&limit=500'), 500)
      .filter((s) => FAMOUS_COUNTRIES.includes(s.countrycode) && /^https?:\/\//.test(s.favicon || '') && !/favicon\.ico(\?|$)/i.test(s.favicon)); // a site's favicon.ico is usually its host's, not the station's
    const byCountry = new Map(FAMOUS_COUNTRIES.map((cc) => [cc, []]));
    for (const s of raw) if (byCountry.get(s.countrycode).length < 3) byCountry.get(s.countrycode).push(s);
    const candidates = [...byCountry.values()].flat();
    const ok = new Set((await Promise.all(candidates.map((s) => logoLoads(s.favicon).then((good) => good && s.stationuuid)))).filter(Boolean));
    const good = [...byCountry.values()].map((list) => list.filter((s) => ok.has(s.stationuuid)));
    // one per country in order of fame, then a second round if there's room
    return [...good.map((l) => l[0]), ...good.map((l) => l[1])].filter(Boolean).slice(0, 24);
  }
  // The cards are made while the app loads, so they're there the moment it lands: from the last visit's pick when there
  // is one (the pick is then refreshed for next time), otherwise picked now.
  async function loadFamous() {
    let cached = null;
    try {
      const c = JSON.parse(localStorage.getItem(FAMOUS_KEY));
      if (c && Date.now() - c.at < 7 * 864e5 && Array.isArray(c.list) && c.list.length) cached = c.list;
    } catch { /* storage unavailable */ }
    const keep = (list) => { try { if (list.length) localStorage.setItem(FAMOUS_KEY, JSON.stringify({ at: Date.now(), list })); } catch { /* storage unavailable */ } };
    if (cached) {
      famous = cached;
      afterIntro().then(pickFamous).then(keep).catch(() => {});
    } else {
      try { famous = await pickFamous(); } catch { return; }
      keep(famous);
    }
    if (!famous.length) return;
    const cards = famous.map((s, i) => `<button type="button" class="famous-card" data-i="${i}" aria-label="Play ${esc(s.name.trim())}, ${esc(nameOf(s.countrycode, s.country))}">
      <span class="famous-logo"><span>${esc((s.name.match(/[A-Za-z0-9]/) || ['♪'])[0].toUpperCase())}</span>${s.favicon ? `<img src="${esc(s.favicon)}" alt="" draggable="false" decoding="async" referrerpolicy="no-referrer" onload="if(this.naturalWidth<8)this.remove()" onerror="this.remove()">` : ''}</span>
      <span class="famous-play">${ICON.play}</span>
      <span class="famous-name">${esc(s.name.trim())}</span>
      <span class="famous-country">${flagImg(s.countrycode)}<span>${esc(nameOf(s.countrycode, s.country))}</span></span></button>`).join('');
    if (introStarted) await afterIntro(); // building the cards is a short freeze: never while the logo plays
    el.famous.innerHTML = cards.repeat(2);
    measureFamous();
    famousFade();
    // they come in with everything else as the app lands; ones that arrive later come in on their own
    if (!document.body.classList.contains('intro-hold')) requestAnimationFrame(() => { el.famous.classList.add('in'); startFamousAuto(); });
  }
  let famousCards = [], famousFrame = 0, famousAmount = 0;
  let famousLastLeft = 0, famousLastAt = 0, famousVelocity = 0, famousFrameAt = 0;
  const FAMOUS_AUTO_SPEED = 34; // pixels per second; one station takes about five seconds
  let famousAutoFrame = 0, famousAutoAt = 0, famousAutoLeft = 0, famousAutoSpeed = 0, famousLoopWidth = 0;
  let famousAutoUntil = 0, famousHover = false, famousPointerDown = false;
  function measureFamous() {
    const row = el.famous;
    famousLoopWidth = famous.length && row.children[famous.length]
      ? row.children[famous.length].offsetLeft - row.children[0].offsetLeft : 0;
    // Keep enough repeated content beyond the seam even on very wide screens.
    while (famousLoopWidth && row.scrollWidth < famousLoopWidth + row.clientWidth + 2) {
      [...row.children].slice(0, famous.length).forEach((card) => row.append(card.cloneNode(true)));
    }
    famousCards = [...el.famous.children].map((card) => ({ card, left: card.offsetLeft, width: card.offsetWidth }));
    famousLastLeft = el.famous.scrollLeft;
    famousAutoLeft = el.famous.scrollLeft;
    if (famousFrame) famousLastAt = performance.now();
  }
  function stopFamousAuto() {
    cancelAnimationFrame(famousAutoFrame);
    famousAutoFrame = famousAutoAt = famousAutoSpeed = 0;
  }
  function startFamousAuto() {
    if (famousAutoFrame || !famousLoopWidth || reduceMotion.matches || document.hidden) return;
    famousAutoAt = 0;
    famousAutoLeft = el.famous.scrollLeft;
    famousAutoFrame = requestAnimationFrame(advanceFamousAuto);
  }
  function pauseFamousAuto(delay = 1500, immediate = false) {
    famousAutoUntil = performance.now() + delay;
    if (immediate) famousAutoSpeed = 0;
    startFamousAuto();
  }
  function advanceFamousAuto(now) {
    famousAutoFrame = 0;
    if (reduceMotion.matches || document.hidden || el.main.classList.contains('has-player')) { stopFamousAuto(); return; }
    const row = el.famous, dt = Math.min(48, now - famousAutoAt || 16);
    famousAutoAt = now;
    const paused = famousHover || famousPointerDown || row.contains(document.activeElement) || now < famousAutoUntil || !row.classList.contains('in');
    famousAutoSpeed += ((paused ? 0 : FAMOUS_AUTO_SPEED) - famousAutoSpeed) * (1 - Math.exp(-dt / 260));
    if (famousAutoSpeed > .1) {
      if (Math.abs(row.scrollLeft - famousAutoLeft) > 2) famousAutoLeft = row.scrollLeft;
      famousAutoLeft += famousAutoSpeed * dt / 1000;
      if (famousAutoLeft >= famousLoopWidth) {
        const loops = Math.floor(famousAutoLeft / famousLoopWidth);
        famousAutoLeft -= loops * famousLoopWidth;
        famousLastLeft -= loops * famousLoopWidth; // the seam is not a reverse-scroll gesture
      }
      row.scrollLeft = famousAutoLeft;
    } else if (paused && now >= famousAutoUntil && row.classList.contains('in')) {
      // A pointer or keyboard pause can sleep until its matching resume event.
      stopFamousAuto();
      return;
    }
    famousAutoFrame = requestAnimationFrame(advanceFamousAuto);
  }
  function resetFamousMotion() {
    cancelAnimationFrame(famousFrame);
    famousFrame = 0;
    famousAmount = famousVelocity = 0;
    famousLastLeft = el.famous.scrollLeft;
    famousLastAt = 0;
    famousCards.forEach(({ card }) => {
      card.style.removeProperty('--card-transform');
    });
    el.famous.classList.remove('scrolling');
  }
  function drawFamous(now) {
    const dt = Math.min(48, now - famousFrameAt || 16);
    famousFrameAt = now;
    const moving = now - famousLastAt < 140 && !document.hidden && !el.main.classList.contains('has-player');
    const target = moving ? Math.tanh(famousVelocity * .75) * .75 : 0; // only your own scrolling bends the band
    famousAmount += (target - famousAmount) * (1 - Math.exp(-dt / (moving ? 145 : 240)));
    if (reduceMotion.matches || (!moving && Math.abs(famousAmount) < .001)) { resetFamousMotion(); return; }

    // The band curves round like the side of a drum: cards turn away and sink back the further they are from the middle,
    // leaning a touch with the scroll. Pure 3D transforms, so the logos and text stay crisp (no pixel-warping filter).
    const row = el.famous, width = row.clientWidth, origin = row.offsetLeft;
    const center = width / 2, amount = Math.abs(famousAmount);
    for (const { card, left, width: cardWidth } of famousCards) {
      const x = left - origin - row.scrollLeft + cardWidth / 2 - center;
      if (Math.abs(x) > center + cardWidth) { card.style.removeProperty('--card-transform'); continue; }
      const edge = clamp(x / Math.max(center, 1), -1.2, 1.2);
      const turn = edge * 26 * amount + famousAmount * 4, sink = -edge * edge * 70 * amount;
      card.style.setProperty('--card-transform', `perspective(900px) translateZ(${sink.toFixed(2)}px) rotateY(${turn.toFixed(3)}deg) rotateX(${(4 * amount).toFixed(3)}deg)`);
    }
    famousFrame = requestAnimationFrame(drawFamous);
  }
  function scrollFamous() {
    famousFade();
    const now = performance.now(), left = el.famous.scrollLeft, delta = left - famousLastLeft;
    if (!delta || reduceMotion.matches) { famousLastLeft = left; return; }
    // the slow auto-drift keeps the band flat: a scroll that lands where the drift put it isn't a gesture
    if (famousAutoSpeed > .1 && Math.abs(left - famousAutoLeft) < 1.5) { famousLastLeft = left; return; }
    if (famousLoopWidth && Math.abs(delta) > famousLoopWidth / 2) { famousLastLeft = left; return; } // wrapping round the loop isn't a reversal
    const dt = famousLastAt ? clamp(now - famousLastAt, 8, 64) : 16;
    famousVelocity = delta / dt;
    famousLastLeft = left;
    famousLastAt = now;
    if (!famousFrame) {
      famousFrameAt = now;
      el.famous.classList.add('scrolling');
      famousFrame = requestAnimationFrame(drawFamous);
    }
  }
  // The row's edges fade the cards out. A mask on the row itself would stop the cards' glass from blurring the map
  // (a masked parent becomes the limit of what a backdrop blur can see), so each card carries its own slice of the fade.
  function famousFade() {
    const row = el.famous;
    edgeFade(row);
    const W = row.clientWidth, start = row.classList.contains('fade-start') ? 36 : 0, end = row.classList.contains('fade') ? 72 : 0;
    const origin = row.offsetLeft, left = row.scrollLeft;
    for (const { card, left: cardLeft, width } of famousCards) {
      const x = cardLeft - origin - left; // the card's left edge, in the row's visible strip
      if (x + width < -8 || x > W + 8) continue; // off screen
      const inStart = start && x < start, inEnd = end && x + width > W - end;
      const m = inStart || inEnd
        ? `linear-gradient(90deg, transparent ${(-x).toFixed(1)}px, #000 ${(start - x).toFixed(1)}px, #000 ${(W - end - x).toFixed(1)}px, transparent ${(W - x).toFixed(1)}px)`
        : '';
      if (card.style.maskImage !== m) { card.style.maskImage = m; card.style.webkitMaskImage = m; }
    }
  }
  sideScroll(el.famous, scrollFamous, { smooth: true, loop: () => famousLoopWidth });
  addEventListener('resize', () => { stopFamousAuto(); resetFamousMotion(); measureFamous(); famousFade(); startFamousAuto(); });
  reduceMotion.addEventListener('change', () => { stopFamousAuto(); resetFamousMotion(); startFamousAuto(); });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { stopFamousAuto(); resetFamousMotion(); famousPointerDown = false; }
    else startFamousAuto();
  });
  el.famous.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') { famousHover = true; startFamousAuto(); } });
  el.famous.addEventListener('pointerleave', () => { famousHover = false; startFamousAuto(); });
  el.famous.addEventListener('focusin', () => startFamousAuto());
  el.famous.addEventListener('focusout', () => startFamousAuto());
  el.famous.addEventListener('wheel', () => pauseFamousAuto(1800, true), { passive: true });
  el.famous.addEventListener('pointerdown', () => { famousPointerDown = true; pauseFamousAuto(1800, true); }, { passive: true });
  const releaseFamous = () => {
    if (!famousPointerDown) return;
    famousPointerDown = false;
    pauseFamousAuto(1200, true);
  };
  addEventListener('pointerup', releaseFamous);
  addEventListener('pointercancel', releaseFamous);
  addEventListener('blur', releaseFamous);
  el.famous.addEventListener('dragstart', (e) => e.preventDefault());
  el.famous.addEventListener('keydown', (e) => {
    if (e.altKey || e.ctrlKey || e.metaKey || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
    e.preventDefault();
    pauseFamousAuto(1800, true);
    const row = el.famous, step = (famousCards[0]?.width || 148) + 10;
    const left = e.key === 'Home' ? 0 : e.key === 'End' ? row.scrollWidth : row.scrollLeft + (e.key === 'ArrowRight' ? step : -step);
    row.scrollTo({ left, behavior: reduceMotion.matches ? 'auto' : 'smooth' });
  });
  el.famous.addEventListener('click', (e) => {
    const b = e.target.closest('[data-i]');
    if (b) tune(famous[b.dataset.i], famous);
  });

  // ---------- Events ----------
  el.tabFavs.onclick = () => (state.mode === 'favorites' ? closePanel() : setMode('favorites'));
  // The disc opens the genre list; from a genre's stations it goes back to the list; on the list it closes it.
  el.tabGenres.onclick = () => {
    if (state.mode === 'genres') { closePanel(); return; }
    ++selectToken;
    Object.assign(state, { selected: null, genre: null, stations: [], loading: false });
    markSelected(null);
    setMode('genres');
  };
  el.finderClose.onclick = closePanel;
  // Drags don't count: d3-zoom swallows the click that ends one.
  el.mapArea.addEventListener('click', (e) => {
    if (!e.target.closest('.country, button, input, .country-search')) closePanel();
  });

  el.list.addEventListener('click', (e) => {
    const g = e.target.closest('[data-genre]');
    if (g) { selectGenre(GENRES[g.dataset.genre]); return; }
    const list = visibleStations();
    const favBtn = e.target.closest('[data-fav]');
    if (favBtn) {
      const s = list[favBtn.dataset.fav];
      if (!s) return;
      toggleFav(s);
      if (state.mode === 'favorites') renderSide(); else updateRows();
      return;
    }
    const li = e.target.closest('.row[data-i]');
    if (!li) return;
    const s = list[li.dataset.i];
    if (isCurrent(s) && (state.playing || state.connecting)) togglePlay();
    else tune(s, list);
  });

  el.shuffle.onclick = shuffleList;
  el.genres.addEventListener('click', (e) => {
    const b = e.target.closest('[data-tag]');
    if (!b) return;
    state.tag = b.dataset.tag || null;
    el.list.scrollTop = 0;
    renderSide();
  });
  sideScroll(el.genres, () => edgeFade(el.genres), { smooth: true });
  el.list.addEventListener('scroll', listFade, { passive: true });
  new ResizeObserver(listFade).observe(el.list); // the panel grows open, or the window changes

  el.cSearch.addEventListener('input', () => { activeIdx = 0; renderResults(); });
  el.cSearch.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (results.length) { activeIdx = (activeIdx + (e.key === 'ArrowDown' ? 1 : -1) + results.length) % results.length; renderResults(); }
    } else if (e.key === 'Enter') {
      pickResult(results[activeIdx]);
    } else if (e.key === 'Escape') {
      el.cSearch.value = '';
      renderResults();
      el.cSearch.blur();
    }
  });
  el.cSearch.addEventListener('blur', () => {
    el.cResults.classList.add('hidden');
    el.cSearch.setAttribute('aria-expanded', false);
    if (!el.cSearch.value.trim()) el.searchbar.classList.remove('searching'); // empty: back to just the icon
  });
  // The search icon opens out into the bar (also when the input is reached with Tab or the / key).
  el.cSearch.addEventListener('focus', () => el.searchbar.classList.add('searching'), true);
  el.searchbar.addEventListener('click', (e) => { if (!e.target.closest('.results')) el.cSearch.focus(); });
  el.cSearch.addEventListener('focus', () => { if (el.cSearch.value.trim()) renderResults(); });
  el.cResults.addEventListener('mousedown', (e) => {
    e.preventDefault(); // keep focus so the click lands
    const li = e.target.closest('li[data-i]');
    if (li) pickResult(results[li.dataset.i]);
  });

  $('zoom-in').onclick = () => svg.transition().duration(300).call(zoom.scaleBy, 1.6);
  $('zoom-out').onclick = () => svg.transition().duration(300).call(zoom.scaleBy, 1 / 1.6);
  $('fit').onclick = () => svg.transition().duration(reduceMotion.matches ? 0 : 650).ease(d3.easeCubicInOut).call(zoom.transform, d3.zoomIdentity); // the whole world again

  el.play.onclick = togglePlay;
  el.prev.onclick = () => step(-1);
  el.next.onclick = () => step(1);
  el.pShuffle.onclick = shuffleCountry;
  el.pFav.onclick = () => {
    if (!state.current) return;
    toggleFav(state.current);
    if (state.mode === 'favorites') renderSide(); else updateRows();
  };
  el.volume.addEventListener('input', () => {
    sound.volume = +el.volume.value;
    sound.muted = false;
    applyVolume();
    updateVolIcon();
    try { localStorage.setItem(VOL_KEY, el.volume.value); } catch { /* storage unavailable */ }
  });
  el.mute.onclick = () => {
    if (sound.muted || sound.volume === 0) {
      sound.muted = false;
      if (sound.volume === 0) { sound.volume = 0.5; el.volume.value = 0.5; }
    } else {
      sound.muted = true;
    }
    applyVolume();
    updateVolIcon();
  };

  // Choosing a speaker is only possible in browsers that support it (currently Firefox).
  if (navigator.mediaDevices?.selectAudioOutput && 'setSinkId' in HTMLMediaElement.prototype) {
    el.output.classList.remove('hidden');
    el.output.onclick = async () => {
      try {
        const device = await navigator.mediaDevices.selectAudioOutput();
        await Promise.all([plainAudio.setSinkId(device.deviceId), fxAudio.setSinkId(device.deviceId), actx?.setSinkId?.(device.deviceId)]);
        toast(`Playing through ${device.label || 'the selected output'}`);
      } catch { /* cancelled */ }
    };
  }

  if (document.documentElement.requestFullscreen) {
    el.expand.onclick = () => (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen());
    document.addEventListener('fullscreenchange', () => {
      const fs = !!document.fullscreenElement;
      el.expandIcon.innerHTML = fs ? ICON.minimize : ICON.maximize;
      setTip(el.expand, fs ? 'Exit full screen' : 'Full screen');
    });
  } else {
    el.expand.classList.add('hidden');
  }

  document.addEventListener('keydown', (e) => {
    if (e.target.closest('input, textarea') || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === '/') { e.preventDefault(); if (state.mode !== 'explore') setMode('explore'); el.cSearch.focus(); }
    else if (e.code === 'Space' && !e.target.closest('button')) { e.preventDefault(); togglePlay(); }
    else if (e.key === 'ArrowRight') step(1);
    else if (e.key === 'ArrowLeft') step(-1);
    else if (e.key === 'Escape') closePanel();
  });

  let lastSize = '';
  new ResizeObserver(() => {
    const size = `${el.map.clientWidth}x${el.map.clientHeight}`;
    if (size !== lastSize) { lastSize = size; requestAnimationFrame(layout); }
  }).observe(el.map);

  // ---------- Boot ----------
  let mapBuilt = () => {}, introStarted = false;
  const mapReady = new Promise((r) => { mapBuilt = r; });
  let famousLoaded = null, earthLoaded = null;
  (async () => {
    saveFavs();
    updateVolIcon();
    if (window.UNIWAVE_DOTS) { // from dots.js, loaded before this script
      dots = window.UNIWAVE_DOTS.points.filter((p) => p[1] > -60); // nothing below the map's southern edge
      projectDots();
      scheduleDots();
    }
    updateNowPlaying();
    renderSide();
    famousLoaded = loadFamous().catch(() => {});
    earthLoaded = loadEarth().catch(() => {});
    try {
      const [geo, countries] = await Promise.all([
        fetch(GEOJSON_URL).then((r) => r.json()),
        api('/json/countries').catch(() => []),
      ]);
      const apiName = {};
      for (const c of countries) {
        state.counts[c.iso_3166_1] = (state.counts[c.iso_3166_1] || 0) + c.stationcount;
        apiName[c.iso_3166_1] ||= c.name;
      }
      state.features = geo.features.filter((f) => f.properties.ISO_A2 !== 'AQ').map(rewind);
      for (const f of state.features) {
        const cc = isoOf(f);
        if (cc && !state.byIso.has(cc)) state.byIso.set(cc, f);
      }
      state.countries = Object.entries(state.counts)
        .filter(([cc, n]) => n > 0 && /^[A-Z]{2}$/.test(cc))
        .map(([cc, count]) => ({ cc, count, name: nameOf(cc, apiName[cc]) }))
        .sort((a, b) => b.count - a.count);
      // On a slow connection the logo may already be animating: then the map is built once the intro is over
      // (building it is a short freeze), and simply appears as the controls do, without the opening shot.
      if (introStarted && openState === 'waiting') await afterIntro();
      buildMap();
      layout();
      $('map-loading').remove();
      openShot();
      mapBuilt();
      renderSide();
      if (!countries.length) toast('Couldn’t reach the radio directory. Station counts will appear when it’s back.');
    } catch {
      $('map-loading').textContent = 'Couldn’t load the map. Check your connection and reload.';
    }
  })();

  // A CSS-style cubic-bezier easing curve, for animations driven frame by frame.
  function bezier(x1, y1, x2, y2) {
    const at = (a, b, t) => 3 * a * (1 - t) ** 2 * t + 3 * b * (1 - t) * t * t + t ** 3;
    return (x) => {
      let lo = 0, hi = 1, t = x;
      for (let i = 0; i < 24; i++) { t = (lo + hi) / 2; if (at(x1, x2, t) < x) lo = t; else hi = t; }
      return at(y1, y2, t);
    };
  }

  // ---------- Intro ----------
  // On a dark screen the logo's circle appears and sends out a double beat of signal; then its two rings of waves make a half
  // turn in opposite directions. The logo glides left as the name appears beside it, and the pair
  // flies into the top bar as the screen dissolves into the map. It can't be skipped: clicks and keys wait until it's done.
  (async () => {
    const box = $('intro');
    if (!box) { landShot(0); return; }
    const finish = () => { box.remove(); document.body.classList.remove('intro-on'); };
    if (reduceMotion.matches || !box.animate) { finish(); landShot(0); return; }
    // measure with the real font, but don't keep anyone waiting for it
    await Promise.race([document.fonts?.ready, new Promise((r) => setTimeout(r, 900))]);
    // and everything the app lands on is made ready first, on the still-dark screen, so nothing stalls the logo or
    // arrives late: the map, the station cards and the earth's pictures. A slow connection gets 3s; the rest then
    // catches up once the app has landed.
    await Promise.race([Promise.all([mapReady, famousLoaded, earthLoaded]), new Promise((r) => setTimeout(r, 3000))]);
    introStarted = true;
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    openRoll?.();

    const mark = $('intro-mark'), icon = box.querySelector('.intro-icon'), word = box.querySelector('.intro-word');
    const ease = { out: 'cubic-bezier(.2, .8, .2, 1)', inOut: 'cubic-bezier(.65, 0, .35, 1)', fly: 'cubic-bezier(.7, 0, .2, 1)' };
    const anims = [];
    const play = (node, frames, opts) => { const an = node.animate(frames, { fill: 'both', ...opts }); anims.push(an); return an; };

    // 1. The circle, then 2. two beats of signal and a half turn. All on one clock (ms from the start), as a double
    //    heartbeat: each beat the circle swells and the inner, then the outer, wave springs out of it with a little
    //    overshoot. Between the beats the waves ebb back towards the circle. Then the two rings make a half turn in
    //    opposite directions and settle.
    const T = 2250, at = (ms) => ms / T;
    const spring = 'cubic-bezier(.2, .8, .25, 1)', settle = 'cubic-bezier(.4, 0, .2, 1)';
    const BEATS = [700, 1220]; // when each beat's inner wave leaves the circle; the outer one follows 100ms later
    const TURN = 1650;          // the half turn, from here to the end
    const frames = (keys) => keys.map(([ms, f]) => ({ offset: at(ms), ...f }));

    play(box.querySelector('.i-dot'), frames([
      [0, { opacity: 0, transform: 'scale(0.4)' }],
      [250, { opacity: 0, transform: 'scale(0.4)', easing: spring }],
      [520, { opacity: 1, transform: 'scale(1.15)', easing: settle }],
      [640, { opacity: 1, transform: 'scale(1)' }],
      ...BEATS.flatMap((b) => [ // swells just as the waves leave it
        [b - 60, { opacity: 1, transform: 'scale(1)', easing: spring }],
        [b + 40, { opacity: 1, transform: 'scale(1.32)', easing: settle }],
        [b + 200, { opacity: 1, transform: 'scale(1)' }],
      ]),
      [T, { opacity: 1, transform: 'scale(1)' }],
    ]), { duration: T });

    box.querySelectorAll('.i-arc').forEach((arc) => {
      const outer = arc.classList.contains('i-out'), lag = outer ? 100 : 0, turn = outer ? -180 : 180;
      const [b1, b2] = BEATS.map((b) => b + lag);
      const pose = (op, sc, deg = 0) => ({ opacity: op, transform: `rotate(${deg}deg) scale(${sc})` });
      play(arc, frames([
        [0, pose(0, 0.55)],
        [b1, { ...pose(0, 0.55), easing: spring }],
        [b1 + 170, { ...pose(1, 1.07), easing: settle }],     // first beat: springs out past its place…
        [b1 + 300, { ...pose(1, 1), easing: settle }],        // …and settles
        [b2 - 40, { ...pose(0.35, 0.93), easing: spring }],   // ebbs back towards the circle
        [b2 + 170, { ...pose(1, 1.07), easing: settle }],     // second beat
        [b2 + 300, pose(1, 1)],
        [TURN, { ...pose(1, 1), easing: ease.inOut }],
        [T, pose(1, 1, turn)],                                // a half turn, and settle
      ]), { duration: T });
    });

    // 3. The name: its box widens beside the logo while the lockup stays centred, so the logo glides left exactly
    //    as fast as the letters arrive, coming into focus with a soft leading edge.
    const clip = box.querySelector('.intro-clip');
    const full = parseFloat(getComputedStyle(word).marginLeft) + word.offsetWidth + 2;
    const clipAnim = play(clip, [{ width: '0px' }, { width: `${full}px` }], { delay: 2200, duration: 850, easing: ease.inOut });
    play(box.querySelector('.intro-glow'), [{ opacity: 0, transform: 'scale(.85)' }, { opacity: 1, transform: 'scale(1)' }], { delay: 2200, duration: 1300, easing: 'cubic-bezier(.33, 0, .2, 1)' }); // the light rises with the name
    play(word, [
      { WebkitMaskPosition: '110% 0', maskPosition: '110% 0', filter: 'blur(6px)', opacity: 0.35 },
      { WebkitMaskPosition: '0% 0', maskPosition: '0% 0', filter: 'blur(0)', opacity: 1 },
    ], { delay: 2200, duration: 850, easing: ease.inOut });

    // 4. Fly into the top bar and dissolve the screen.
    let flying = false, holdTimer;
    const fly = (duration) => {
      if (flying) return;
      flying = true;
      clearTimeout(holdTimer);
      removeEventListener('keydown', hold, true);
      box.style.pointerEvents = 'none'; // the app is usable as soon as it's revealed
      anims.forEach((an) => an.finish());
      landShot(duration * 3); // the map swings down into place as the logo flies up
      const target = document.querySelector('.wordmark svg').getBoundingClientRect();
      const mr = mark.getBoundingClientRect(), fi = icon.getBoundingClientRect(), k = target.width / fi.width;
      const tx = target.left - mr.left - (fi.left - mr.left) * k, ty = target.top - mr.top - (fi.top - mr.top) * k;
      // Shrink the lockup by its real size, frame by frame, rather than scaling a snapshot of it: the browser redraws
      // the logo and the letters as vectors at every size, so they stay crisp all the way into the top bar.
      clip.style.width = 'auto'; // the name's box follows the text as it shrinks
      clipAnim.cancel();
      Object.assign(mark.style, { position: 'fixed', left: `${mr.left}px`, top: `${mr.top}px`, margin: '0' });
      const curve = bezier(0.7, 0, 0.2, 1), t0 = performance.now();
      const step = (now) => {
        const p = Math.min(1, (now - t0) / duration), e = curve(p);
        mark.style.setProperty('--s', 1 + (k - 1) * e);
        mark.style.transform = `translate(${(tx * e).toFixed(2)}px, ${(ty * e).toFixed(2)}px)`;
        if (p < 1) requestAnimationFrame(step); else finish();
      };
      requestAnimationFrame(step);
      for (const layer of box.querySelectorAll('.intro-bg, .intro-glow')) {
        layer.animate([{ opacity: getComputedStyle(layer).opacity }, { opacity: 0 }], { delay: duration * 0.15, duration: duration * 0.85, easing: 'ease-out', fill: 'forwards' });
      }
    };
    // Locked while it plays: the screen takes the clicks, and keys don't reach the app's shortcuts underneath.
    const hold = (e) => { e.preventDefault(); e.stopImmediatePropagation(); };
    addEventListener('keydown', hold, true);
    holdTimer = setTimeout(() => fly(820), 3500);
  })();


  // Station logos are kept in the browser's cache by a small service worker, so lists load instantly next time.
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => {});
})();
