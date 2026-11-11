// Small UI kit for drawing believable iOS and Android screens inside the device.

let OS = 'ios';
export const setKitOS = (os) => { OS = os; };
export const isIOS = () => OS === 'ios';

const P = {
  chevR: '<path d="M9 6l6 6-6 6"/>',
  chevL: '<path d="M15 6l-6 6 6 6"/>',
  chevD: '<path d="M6 9l6 6 6-6"/>',
  back: '<path d="M19 12H5M12 19l-7-7 7-7"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  x: '<path d="M18 6L6 18M6 6l12 12"/>',
  check: '<path d="M20 6L9 17l-5-5"/>',
  heart: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8z"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>',
  home: '<path d="M3 10.5L12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  bell: '<path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.9 1.9 0 0 0 3.4 0"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  more: '<circle cx="5" cy="12" r="1.3" fill="currentColor"/><circle cx="12" cy="12" r="1.3" fill="currentColor"/><circle cx="19" cy="12" r="1.3" fill="currentColor"/>',
  trash: '<path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/>',
  archive: '<path d="M3 4h18v4H3zM5 8v12h14V8M10 12h4"/>',
  share: '<path d="M12 3v13M7 8l5-5 5 5M5 14v6h14v-6"/>',
  copy: '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>',
  undo: '<path d="M9 14L4 9l5-5M4 9h11a5 5 0 0 1 0 10h-3"/>',
  redo: '<path d="M15 14l5-5-5-5M20 9H9a5 5 0 0 0 0 10h3"/>',
  star: '<path d="M12 3l2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z"/>',
  folder: '<path d="M3 6a1 1 0 0 1 1-1h5l2 2h9a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
  image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/>',
  music: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
  wifi: '<path d="M5 12.5a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0M12 19.5h.01M2 9a14 14 0 0 1 20 0"/>',
  moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
  up: '<path d="M12 19V5M5 12l7-7 7 7"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  clipboard: '<rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>',
  flag: '<path d="M4 22V4M4 4h13l-2 4 2 4H4"/>',
  send: '<path d="M22 2L11 13M22 2l-7 20-4-9-9-4z"/>',
  handle: '<path d="M5 9h14M5 15h14"/>',
  pen: '<path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  mic: '<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0 0 14 0M12 17v5"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
  camera: '<path d="M3 7h4l2-3h6l2 3h4v13H3z"/><circle cx="12" cy="13" r="4"/>',
  compass: '<circle cx="12" cy="12" r="10"/><path d="M16 8l-2.5 5.5L8 16l2.5-5.5z"/>',
  bolt: '<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>',
  bt: '<path d="M7 7l10 10-5 5V2l5 5L7 17"/>',
  play: '<path d="M7 4v16l13-8z" fill="currentColor"/>',
  globe: '<circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20"/>',
  book: '<path d="M4 4h6a3 3 0 0 1 3 3v14a2 2 0 0 0-2-2H4zM20 4h-6a3 3 0 0 0-3 3v14a2 2 0 0 1 2-2h7z"/>',
  card: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/>',
  tag: '<path d="M20.6 13.4L13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8z"/><circle cx="7.5" cy="7.5" r="1.5"/>',
};

export const ico = (name, size = 20, cls = '') =>
  `<svg class="k-ico ${cls}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[name] || ''}</svg>`;

export const PLACES = [
  ['Coffee Lab', 'Open until 6 pm · 0.4 km', '#E07A3F'],
  ['Field Notes', 'Stationery · 0.9 km', '#3F7FE0'],
  ['Night Market', 'Food hall · 1.2 km', '#8A57D6'],
  ['Ridge Trail', 'Park · 2.5 km', '#3E9B5B'],
  ['Studio Four', 'Gallery · 1.6 km', '#D6457A'],
  ['Paper Mill', 'Bookshop · 0.7 km', '#C9952B'],
  ['Harbor Line', 'Ferry · 3.1 km', '#2A9CA8'],
  ['Moss & Stone', 'Plants · 1.1 km', '#5E8C3A'],
  ['Late Edition', 'Records · 2.0 km', '#B5523A'],
  ['North Pier', 'Viewpoint · 4.2 km', '#4D6BD1'],
  ['Kiln House', 'Ceramics · 1.8 km', '#A0643A'],
  ['Small Hours', 'Bar · 0.5 km', '#6C4AB6'],
];

export const MAIL = [
  ['Maya Chen', 'Saturday plans', 'Are we still on for the market at ten?', '#D6457A'],
  ['Studio Four', 'Opening night', 'Your invitation for Friday at 7 pm', '#8A57D6'],
  ['Leo Park', 'Photos from the trip', 'I picked the best forty, have a look', '#3F7FE0'],
  ['Field Notes', 'Order shipped', 'Your notebook is on its way', '#C9952B'],
  ['Ana Ruiz', 'Draft review', 'Left a few comments on page two', '#3E9B5B'],
  ['Harbor Line', 'Timetable change', 'Weekend ferries now leave at 8:15', '#2A9CA8'],
  ['Sam Okafor', 'Lunch?', 'Thai place near the office, 1 pm', '#E07A3F'],
  ['Kiln House', 'Class reminder', 'Wheel throwing starts Tuesday', '#A0643A'],
];

const PAL = [
  ['#FDE2C4', '#F59E5B', '#D9632B', '#8A3A17'],
  ['#D9E8F5', '#86B6E3', '#3C78B8', '#1C3D63'],
  ['#E3F1DF', '#9BCB8F', '#4A9150', '#22522A'],
  ['#F3E1F1', '#DDA3D3', '#A3559A', '#55234F'],
  ['#FFF1C7', '#F4C95D', '#CF9223', '#6E4709'],
  ['#E0E4F7', '#A9B4EC', '#5D6BC8', '#2B3373'],
];

export function photo(i = 0, cls = '', style = '') {
  const p = PAL[((i % PAL.length) + PAL.length) % PAL.length];
  const sx = 25 + ((i * 37) % 55);
  return `<svg class="k-photo ${cls}" style="${style}" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><rect width="100" height="100" fill="${p[0]}"/><circle cx="${sx}" cy="32" r="11" fill="${p[1]}"/><path d="M0 72 Q22 48 46 63 T100 54 V100 H0Z" fill="${p[2]}"/><path d="M0 86 Q30 70 62 81 T100 77 V100 H0Z" fill="${p[3]}"/></svg>`;
}

export const av = (name, color, size = 36) =>
  `<div class="k-av" style="background:${color};width:${size}px;height:${size}px">${name[0]}</div>`;

export function row(i, o = {}) {
  const [t, s, col] = PLACES[i % PLACES.length];
  return `<div class="k-row ${o.cls || ''}" data-i="${i}">${o.noAv ? '' : av(t, col, o.av || 36)}<div class="k-tx"><div class="k-t1">${t}</div>${o.noSub ? '' : `<div class="k-t2">${s}</div>`}</div>${o.right || ''}${o.chev ? `<span class="k-chev">${ico('chevR', 16)}</span>` : ''}${o.handle ? `<span class="k-handle">${ico('handle', 18)}</span>` : ''}</div>`;
}

export const rows = (n, o = {}) => `<div class="k-list ${o.cls || ''}">${Array.from({ length: n }, (_, k) => row((o.start || 0) + k, o)).join('')}</div>`;

export function mailRow(i, o = {}) {
  const [from, subj, body, col] = MAIL[i % MAIL.length];
  return `<div class="k-mail ${o.cls || ''}" data-i="${i}">${av(from, col, 36)}<div class="k-tx"><div class="k-mail-top"><span class="k-t1">${from}</span><span class="k-time">${9 + (i % 3)}:${String((i * 17) % 60).padStart(2, '0')}</span></div><div class="k-mail-s">${subj}</div><div class="k-t2">${body}</div></div></div>`;
}

// Top bar. iOS: inline title with optional large title. Android: top app bar.
export function nav(title, o = {}) {
  if (isIOS()) {
    const left = o.back ? `<span class="k-back" data-act="back">${ico('chevL', 22)}<span>${o.back}</span></span>` : (o.left || '<span></span>');
    const right = o.right || '<span></span>';
    return `<div class="k-nav ${o.cls || ''}">${left}<div class="k-nav-t ${o.large ? 'hide' : ''}">${title}</div>${right}</div>${o.large ? `<div class="k-large">${title}</div>` : ''}`;
  }
  const lead = o.back ? `<span class="k-ib" data-act="back">${ico('back', 22)}</span>` : o.menu ? `<span class="k-ib" data-act="menu">${ico('menu', 22)}</span>` : '';
  return `<div class="k-appbar ${o.cls || ''}">${lead}<div class="k-appbar-t">${title}</div>${o.right || ''}</div>`;
}

export function tabbar(items, active = 0) {
  const cls = isIOS() ? 'k-tabbar' : 'k-navbar';
  return `<div class="${cls}">${items.map(([label, icon], i) => `<div class="k-tab ${i === active ? 'on' : ''}" data-i="${i}"><span class="k-tab-ic"><span class="k-pill"></span>${ico(icon, 22)}</span><span class="k-tab-l">${label}</span></div>`).join('')}</div>`;
}

export const btn = (label, kind = 'filled', extra = '') => `<button class="k-btn k-${kind}" ${extra}>${label}</button>`;

export function sw(on = false) {
  return `<span class="k-switch ${on ? 'on' : ''}"><span class="k-sw-fill"></span><span class="k-knob">${isIOS() ? '' : ico('check', 14)}</span></span>`;
}

export function field(label, value = '', o = {}) {
  return `<div class="k-field ${o.cls || ''}"><label>${label}</label><div class="k-input">${value}<span class="k-caret"></span></div>${o.help ? `<div class="k-help">${o.help}</div>` : ''}</div>`;
}

export function appIcon(i, label) {
  const [, , col] = PLACES[i % PLACES.length];
  const icons = ['camera', 'mail', 'music', 'image', 'book', 'globe', 'bell', 'gear', 'map', 'star', 'folder', 'card', 'mic', 'tag', 'list', 'compass'];
  return `<div class="k-app-icon" data-i="${i}"><div class="k-app-glyph" style="background:${col}">${ico(icons[i % icons.length] in P ? icons[i % icons.length] : 'star', 22)}</div><span>${label}</span></div>`;
}

export const APPNAMES = ['Camera', 'Mail', 'Music', 'Photos', 'Books', 'Browser', 'Alerts', 'Settings', 'Maps', 'Stars', 'Files', 'Wallet', 'Voice', 'Shop', 'Tasks', 'Compass'];

export function spinner(cls = '') {
  if (isIOS()) {
    return `<span class="k-spin-ios ${cls}">${Array.from({ length: 8 }, (_, i) => `<i style="transform:rotate(${i * 45}deg);opacity:${0.25 + i * 0.1}"></i>`).join('')}</span>`;
  }
  return `<svg class="k-spin-md ${cls}" viewBox="0 0 48 48"><circle cx="24" cy="24" r="18" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-dasharray="80 200"/></svg>`;
}

export const hud = (icon, label) => `<div class="k-hud">${ico(icon, 16)}<span>${label}</span></div>`;
