/* ============================================================
   RetroDesk 95 — system.js
   ユーティリティ / サウンド / アイコン / ウィンドウマネージャ /
   タスクバー / メニュー / ダイアログ
   ============================================================ */
'use strict';

/* ---------- ユーティリティ ---------- */
const $ = (sel, root) => (root || document).querySelector(sel);
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const RD = 'retrodesk:';

function el(tag, cls, html) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html != null) e.innerHTML = html;
  return e;
}
function store(key, val) {
  try { localStorage.setItem(RD + key, JSON.stringify(val)); } catch (e) {}
}
function load(key, fallback) {
  try {
    const v = localStorage.getItem(RD + key);
    return v == null ? fallback : JSON.parse(v);
  } catch (e) { return fallback; }
}

// JSエラーを隠し要素に記録(デバッグ用・画面には出ない)
window.addEventListener('error', ev => {
  const d = el('div', '__jserr');
  d.textContent = 'JSERR: ' + ev.message + ' @' + (ev.filename || '') + ':' + (ev.lineno || '');
  document.body && document.body.appendChild(d);
});

/* ---------- サウンド (WebAudio 合成) ---------- */
const Sound = {
  ctx: null,
  muted: false,
  ac() {
    try {
      if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return this.ctx;
    } catch (e) { return null; }
  },
  tone(freq, dur, opt) {
    if (this.muted) return;
    const ctx = this.ac();
    if (!ctx) return;
    opt = opt || {};
    const t0 = ctx.currentTime + (opt.when || 0);
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = opt.type || 'square';
    osc.frequency.setValueAtTime(freq, t0);
    if (opt.slide) osc.frequency.linearRampToValueAtTime(opt.slide, t0 + dur);
    const vol = opt.vol || 0.08;
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + (opt.attack || 0.005));
    g.gain.exponentialRampToValueAtTime(0.0008, t0 + dur);
    osc.connect(g).connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  },
  noise(dur, opt) {
    if (this.muted) return;
    const ctx = this.ac();
    if (!ctx) return;
    opt = opt || {};
    const t0 = ctx.currentTime + (opt.when || 0);
    const len = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const f = ctx.createBiquadFilter();
    f.type = opt.filter || 'bandpass';
    f.frequency.value = opt.freq || 1800;
    const g = ctx.createGain();
    g.gain.value = opt.vol || 0.12;
    src.connect(f).connect(g).connect(ctx.destination);
    src.start(t0);
  },
  startup() {
    // 起動チャイム(柔らかいアルペジオ + 低音パッド)
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((n, i) =>
      this.tone(n, 1.5 - i * 0.12, { type: 'triangle', vol: 0.07, when: i * 0.17, attack: 0.03 }));
    this.tone(130.81, 2.2, { type: 'sine', vol: 0.06, attack: 0.1 });
    this.tone(196.0, 2.2, { type: 'sine', vol: 0.045, attack: 0.1 });
  },
  shutdown() {
    const notes = [783.99, 587.33, 392.0, 261.63];
    notes.forEach((n, i) =>
      this.tone(n, 0.8, { type: 'triangle', vol: 0.07, when: i * 0.16, attack: 0.02 }));
  },
  error() {
    this.tone(720, 0.09, { type: 'square', vol: 0.06 });
    this.tone(480, 0.16, { type: 'square', vol: 0.06, when: 0.09 });
  },
  ding() {
    this.tone(880, 0.4, { type: 'triangle', vol: 0.07, attack: 0.01 });
    this.tone(1318.5, 0.5, { type: 'triangle', vol: 0.05, when: 0.05 });
  },
  click() { this.tone(2400, 0.025, { type: 'square', vol: 0.025 }); },
  open() { this.tone(660, 0.06, { type: 'square', vol: 0.03 }); this.tone(990, 0.06, { type: 'square', vol: 0.03, when: 0.05 }); },
  minimize() { this.tone(990, 0.06, { type: 'square', vol: 0.03 }); this.tone(660, 0.06, { type: 'square', vol: 0.03, when: 0.05 }); },
  trash() { this.noise(0.22, { freq: 2400, vol: 0.14 }); },
  boom() {
    this.noise(0.5, { freq: 220, vol: 0.3, filter: 'lowpass' });
    this.tone(110, 0.4, { type: 'sawtooth', vol: 0.1, slide: 40 });
  },
  win() {
    [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((n, i) =>
      this.tone(n, 0.22, { type: 'square', vol: 0.05, when: i * 0.09 }));
  }
};

/* ---------- アイコン (インライン SVG) ---------- */
const SVG_OPEN = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" shape-rendering="crispEdges">';
const ICONS = {
  computer: SVG_OPEN +
    '<rect x="3.5" y="3.5" width="25" height="18" fill="#c0c0c0" stroke="#000"/>' +
    '<path d="M5 20V5h22" fill="none" stroke="#fff"/>' +
    '<rect x="7.5" y="6.5" width="17" height="12" fill="#008080" stroke="#000"/>' +
    '<rect x="9" y="8" width="7" height="4" fill="#3ccccc"/>' +
    '<rect x="12.5" y="23.5" width="7" height="2.5" fill="#c0c0c0" stroke="#000"/>' +
    '<rect x="8.5" y="26" width="15" height="3.5" fill="#c0c0c0" stroke="#000"/>' +
    '<rect x="10.5" y="27.5" width="4" height="1" fill="#008000"/></svg>',
  notepad: SVG_OPEN +
    '<path d="M7.5 3.5h13l6 6v19h-19z" fill="#fff" stroke="#000"/>' +
    '<path d="M20.5 3.5v6h6z" fill="#c0c0c0" stroke="#000"/>' +
    '<g stroke="#3a6ea5"><path d="M10.5 14h11M10.5 17h11M10.5 20h11M10.5 23h6"/></g>' +
    '<path d="M19.5 19.5l7 7-1.5 3-3-1.5-6-6z" fill="#ffd24a" stroke="#000"/>' +
    '<path d="M25 28.5l1.5-3 2 2z" fill="#000"/></svg>',
  paint: SVG_OPEN +
    '<path d="M9.5 14.5h13v11.5a2 2 0 0 1-2 2h-9a2 2 0 0 1-2-2z" fill="#c0c0c0" stroke="#000"/>' +
    '<path d="M8.5 11.5h15l-1 3h-13z" fill="#dfdfdf" stroke="#000"/>' +
    '<rect x="12" y="18" width="8" height="6" fill="#fff" stroke="#808080"/>' +
    '<path d="M13.5 18.5h2v5h-2zM16.5 18.5h1.5v5h-1.5z" fill="#e02020"/>' +
    '<path d="M20.5 2.5l6.5 4.5-7 9.5-5.5-3.5z" fill="#b04020" stroke="#000"/>' +
    '<path d="M14.5 13l5.5 3.5-3 4.5c-3.5 1.5-6-1-4.5-4.5z" fill="#2040c0" stroke="#000"/>' +
    '<circle cx="7" cy="28" r="2" fill="#e02020"/><circle cx="26" cy="24" r="1.6" fill="#f2b410"/></svg>',
  mine: SVG_OPEN +
    '<g stroke="#000" stroke-width="2"><path d="M15 7V3M15 29v4M4 18H0M26 18h5M8 11L5 8M22 25l3 3M8 25l-3 3M22 11l3-3"/></g>' +
    '<circle cx="15" cy="18" r="9" fill="#202020" stroke="#000"/>' +
    '<circle cx="12" cy="15" r="2.6" fill="#fff"/>' +
    '<path d="M21 11c2.5-3.5 4.5-2.5 6-6.5" fill="none" stroke="#804000" stroke-width="2"/>' +
    '<path d="M27 5.5l1-3.5 1 3 3.5 1.2-3.3 1-1.2 3.3-1-3.2-3.2-1z" fill="#ffd24a" stroke="#c08000"/></svg>',
  bin: SVG_OPEN +
    '<ellipse cx="16" cy="9.5" rx="9.5" ry="3" fill="#dfdfdf" stroke="#000"/>' +
    '<path d="M7.5 10.5l2.7 18h11.6l2.7-18" fill="#ececec" stroke="#000"/>' +
    '<g stroke="#9a9a9a"><path d="M9 13l13 11M22.5 13l-13 11M9.7 18l11.5 0M10.5 23h10"/></g>' +
    '<text x="16" y="23" font-size="9" text-anchor="middle" fill="#007000" font-weight="bold">♻</text></svg>',
  binFull: SVG_OPEN +
    '<path d="M9 7l4-4 3 3.5L20.5 4l2 4.5L25 7l-1 4H9z" fill="#fff" stroke="#000"/>' +
    '<path d="M12 6.5h3M17 6h3M11 9h10" stroke="#aaa"/>' +
    '<ellipse cx="16" cy="11" rx="9.5" ry="2.8" fill="#dfdfdf" stroke="#000"/>' +
    '<path d="M7.5 12l2.7 16.5h11.6l2.7-16.5" fill="#ececec" stroke="#000"/>' +
    '<g stroke="#9a9a9a"><path d="M9.5 14.5l12.5 10M22 14.5l-12.5 10"/></g>' +
    '<text x="16" y="24" font-size="9" text-anchor="middle" fill="#007000" font-weight="bold">♻</text></svg>',
  ie: SVG_OPEN +
    '<circle cx="16" cy="17" r="10.5" fill="#fff" stroke="#9ec4e8"/>' +
    '<text x="16" y="25" text-anchor="middle" font-family="Times New Roman,serif" font-size="24" font-style="italic" font-weight="bold" fill="#1577d0">e</text>' +
    '<ellipse cx="16" cy="15" rx="14.5" ry="5" fill="none" stroke="#e8a020" stroke-width="2.2" transform="rotate(-16 16 15)"/></svg>',
  folder: SVG_OPEN +
    '<path d="M3.5 8.5h9.5l2.5 3h13v15h-25z" fill="#fcd76e" stroke="#000"/>' +
    '<path d="M4.5 12.5h26l-2.5 14h-23z" fill="#ffe9a0" stroke="#000"/></svg>',
  warning: SVG_OPEN +
    '<path d="M16 3L30.5 28.5H1.5z" fill="#ffff00" stroke="#000"/>' +
    '<rect x="14.4" y="11" width="3.2" height="9.5" fill="#000"/>' +
    '<rect x="14.4" y="23" width="3.2" height="3.2" fill="#000"/></svg>',
  question: SVG_OPEN +
    '<circle cx="16" cy="16" r="13" fill="#fff" stroke="#808080"/>' +
    '<text x="16" y="24" text-anchor="middle" font-size="20" font-weight="bold" font-family="Times New Roman,serif" fill="#000080">?</text></svg>',
  info: SVG_OPEN +
    '<circle cx="16" cy="16" r="13" fill="#fff" stroke="#808080"/>' +
    '<text x="16" y="24" text-anchor="middle" font-size="20" font-weight="bold" font-family="Times New Roman,serif" fill="#000080">i</text></svg>',
  run: SVG_OPEN +
    '<rect x="4.5" y="6.5" width="23" height="17" fill="#c0c0c0" stroke="#000"/>' +
    '<rect x="4.5" y="6.5" width="23" height="4" fill="#000080"/>' +
    '<rect x="7.5" y="13.5" width="17" height="6" fill="#fff" stroke="#000"/>' +
    '<path d="M14 28l6-6 1.5 1.5-6 6z" fill="#000"/></svg>',
  shutdown: SVG_OPEN +
    '<rect x="6.5" y="5.5" width="19" height="14" fill="#c0c0c0" stroke="#000"/>' +
    '<rect x="9" y="8" width="14" height="9" fill="#000080"/>' +
    '<rect x="10.5" y="21.5" width="11" height="2" fill="#c0c0c0" stroke="#000"/>' +
    '<circle cx="16" cy="26" r="3.6" fill="none" stroke="#c00000" stroke-width="2"/>' +
    '<rect x="15" y="21.5" width="2" height="5" fill="#c00000"/></svg>',
  display: SVG_OPEN +
    '<rect x="3.5" y="4.5" width="25" height="18" fill="#c0c0c0" stroke="#000"/>' +
    '<rect x="6.5" y="7.5" width="19" height="12" fill="#008080" stroke="#000"/>' +
    '<rect x="8" y="9" width="8" height="5" fill="#1084d0"/>' +
    '<rect x="18" y="12" width="6" height="6" fill="#fcd76e"/>' +
    '<rect x="11.5" y="24.5" width="9" height="2" fill="#c0c0c0" stroke="#000"/>' +
    '<rect x="8.5" y="27" width="15" height="2.5" fill="#c0c0c0" stroke="#000"/></svg>',
  hdd: SVG_OPEN +
    '<rect x="3.5" y="11.5" width="25" height="9" fill="#c0c0c0" stroke="#000"/>' +
    '<path d="M5 19v-6h22" fill="none" stroke="#fff"/>' +
    '<circle cx="25" cy="16" r="1.4" fill="#00c000"/>' +
    '<rect x="6" y="14.5" width="12" height="2" fill="#808080"/></svg>',
  floppy: SVG_OPEN +
    '<rect x="6.5" y="5.5" width="19" height="21" fill="#3a3a5a" stroke="#000"/>' +
    '<rect x="11" y="5.5" width="9" height="7" fill="#c0c0c0" stroke="#000"/>' +
    '<rect x="16" y="7" width="3" height="4" fill="#3a3a5a"/>' +
    '<rect x="9.5" y="16.5" width="13" height="9" fill="#fff" stroke="#000"/>' +
    '<path d="M11.5 19h9M11.5 21.5h9" stroke="#808080"/></svg>',
  cdrom: SVG_OPEN +
    '<circle cx="16" cy="16" r="11.5" fill="#d8d8e8" stroke="#000"/>' +
    '<circle cx="16" cy="16" r="11.5" fill="none" stroke="#fff" stroke-dasharray="3 5"/>' +
    '<path d="M7 10a11 11 0 0 1 6-4l2 7z" fill="#9ec4e8" opacity=".8"/>' +
    '<path d="M25 22a11 11 0 0 1-6 4l-2-7z" fill="#e8b0c8" opacity=".8"/>' +
    '<circle cx="16" cy="16" r="3.4" fill="#fff" stroke="#808080"/></svg>',
  cpanel: SVG_OPEN +
    '<rect x="4.5" y="7.5" width="23" height="17" fill="#c0c0c0" stroke="#000"/>' +
    '<path d="M6 23V9h20" fill="none" stroke="#fff"/>' +
    '<path d="M9 11v9M16 11v9M23 11v9" stroke="#808080" stroke-width="2"/>' +
    '<rect x="7" y="16" width="4" height="3" fill="#e02020" stroke="#000"/>' +
    '<rect x="14" y="12" width="4" height="3" fill="#2040c0" stroke="#000"/>' +
    '<rect x="21" y="15" width="4" height="3" fill="#00a000" stroke="#000"/></svg>',
  flag16: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">' +
    '<path d="M8.5 2v11" stroke="#000" stroke-width="1.6"/>' +
    '<path d="M8.5 2L2.5 4.5 8.5 7z" fill="#e00000"/>' +
    '<rect x="4.5" y="12.5" width="8" height="2" fill="#000"/></svg>',
  mine16: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">' +
    '<path d="M8 1v14M1 8h14M3 3l10 10M13 3L3 13" stroke="#000" stroke-width="1.4"/>' +
    '<circle cx="8" cy="8" r="4.6" fill="#000"/>' +
    '<circle cx="6.6" cy="6.6" r="1.2" fill="#fff"/></svg>',
  logo: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">' +
    '<g transform="rotate(-8 8 8)">' +
    '<rect x="1.4" y="1.9" width="13.2" height="13.2" fill="#000"/>' +
    '<rect x="2" y="2.5" width="5.6" height="5.6" fill="#e03c2d"/>' +
    '<rect x="8.4" y="2.5" width="5.6" height="5.6" fill="#61b233"/>' +
    '<rect x="2" y="8.9" width="5.6" height="5.6" fill="#2e63c8"/>' +
    '<rect x="8.4" y="8.9" width="5.6" height="5.6" fill="#f2b410"/>' +
    '</g></svg>',
  speaker: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">' +
    '<path d="M2 6h3l4-3.5v11L5 10H2z" fill="#000"/>' +
    '<path d="M11 5.5a4 4 0 0 1 0 5M13 4a6.5 6.5 0 0 1 0 8" fill="none" stroke="#000" stroke-width="1.3" class="sp-wave"/></svg>',
  speakerMute: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">' +
    '<path d="M2 6h3l4-3.5v11L5 10H2z" fill="#000"/>' +
    '<path d="M11 5l4 6M15 5l-4 6" stroke="#c00000" stroke-width="1.5"/></svg>'
};
function iconHTML(name, size) {
  return '<span class="icon" style="width:' + size + 'px;height:' + size + 'px">' + (ICONS[name] || '') + '</span>';
}

/* タイトルバーボタンのグリフ */
const GLYPH = {
  min: '<svg viewBox="0 0 10 9"><rect x="1" y="6.5" width="6" height="2" fill="#000"/></svg>',
  max: '<svg viewBox="0 0 10 9"><path d="M0.5 0.5h9v8h-9z" fill="none" stroke="#000"/><path d="M0.5 1h9" stroke="#000" stroke-width="2"/></svg>',
  restore: '<svg viewBox="0 0 10 9"><path d="M2.5 3.5v-3h7v5h-2" fill="none" stroke="#000"/><path d="M2.5 1h7" stroke="#000" stroke-width="1.6"/><path d="M0.5 3.5h6v5h-6z" fill="#c0c0c0" stroke="#000"/><path d="M0.5 4h6" stroke="#000" stroke-width="1.6"/></svg>',
  close: '<svg viewBox="0 0 10 9"><path d="M1 0.8l7.4 7M8.4 0.8L1 7.8" stroke="#000" stroke-width="1.7"/></svg>'
};

/* ============================================================
   ウィンドウマネージャ
   ============================================================ */
const WM = {
  wins: new Set(),
  byApp: {},
  z: 100,
  active: null,
  cascade: 0,
  desk() { return $('#windows'); }
};

function updateTaskbarState() {
  WM.wins.forEach(w => {
    if (w.tbBtn) w.tbBtn.classList.toggle('pressed', w === WM.active && !w.minimized);
  });
}

function setActive(win) {
  WM.active = win;
  WM.wins.forEach(w => w.el.classList.toggle('active', w === win));
  updateTaskbarState();
}

function createWindow(o) {
  const deskEl = WM.desk();
  const win = { opts: o, minimized: false, maximized: false, prevRect: null };
  const elw = el('div', 'window' + (o.className ? ' ' + o.className : '') + (o.dialog ? ' dialog' : ''));
  if (o.width) elw.style.width = o.width + 'px';
  if (o.height) elw.style.height = o.height + 'px';

  const btns = (o.buttons === 'close')
    ? '<button class="tbtn t-close" title="閉じる">' + GLYPH.close + '</button>'
    : '<button class="tbtn t-min" title="最小化">' + GLYPH.min + '</button>' +
      '<button class="tbtn t-max" title="最大化">' + GLYPH.max + '</button>' +
      '<button class="tbtn t-close" title="閉じる">' + GLYPH.close + '</button>';

  elw.innerHTML =
    '<div class="titlebar">' +
      (o.icon ? '<span class="t-icon">' + (ICONS[o.icon] || '') + '</span>' : '') +
      '<span class="t-text"></span>' +
      '<span class="t-btns">' + btns + '</span>' +
    '</div><div class="window-body"></div>';

  const titlebar = $('.titlebar', elw);
  const body = $('.window-body', elw);
  $('.t-text', elw).textContent = o.title || '';
  win.el = elw;
  win.body = body;

  /* --- メソッド --- */
  win.setTitle = t => {
    $('.t-text', elw).textContent = t;
    if (win.tbBtn) $('.tt', win.tbBtn).textContent = t;
  };
  win.setMenus = menus => {
    if (win.menubar) win.menubar.remove();
    win.menubar = buildMenubar(menus);
    elw.insertBefore(win.menubar, body);
  };
  win.focus = () => {
    if (win.minimized) {
      win.minimized = false;
      elw.style.display = '';
    }
    WM.z += 1;
    elw.style.zIndex = WM.z;
    setActive(win);
  };
  win.minimize = () => {
    win.minimized = true;
    elw.style.display = 'none';
    if (WM.active === win) WM.active = null;
    updateTaskbarState();
    Sound.minimize();
  };
  win.toggleMax = () => {
    if (!win.maximized) {
      const r = elw.getBoundingClientRect();
      const dr = deskEl.getBoundingClientRect();
      win.prevRect = { left: r.left - dr.left, top: r.top - dr.top, width: r.width, height: r.height };
      win.maximized = true;
      elw.classList.add('maximized');
      elw.style.left = '0px';
      elw.style.top = '0px';
      elw.style.width = '100%';
      elw.style.height = '100%';
    } else {
      win.maximized = false;
      elw.classList.remove('maximized');
      const p = win.prevRect;
      elw.style.left = p.left + 'px';
      elw.style.top = p.top + 'px';
      elw.style.width = p.width + 'px';
      elw.style.height = p.height + 'px';
    }
    const maxBtn = $('.t-max', elw);
    if (maxBtn) {
      maxBtn.innerHTML = win.maximized ? GLYPH.restore : GLYPH.max;
      maxBtn.title = win.maximized ? '元のサイズに戻す' : '最大化';
    }
  };
  win.close = () => {
    if (o.onClose) { try { o.onClose(win); } catch (e) {} }
    WM.wins.delete(win);
    if (o.app && WM.byApp[o.app] === win) delete WM.byApp[o.app];
    if (win.tbBtn) win.tbBtn.remove();
    elw.remove();
    if (WM.active === win) {
      WM.active = null;
      let top = null;
      WM.wins.forEach(w => {
        if (!w.minimized && (!top || +w.el.style.zIndex > +top.el.style.zIndex)) top = w;
      });
      if (top) top.focus();
    }
    updateTaskbarState();
  };

  /* --- タイトルバーボタン --- */
  $('.t-close', elw).addEventListener('click', ev => { ev.stopPropagation(); win.close(); });
  const minBtn = $('.t-min', elw);
  if (minBtn) minBtn.addEventListener('click', ev => { ev.stopPropagation(); win.minimize(); });
  const maxBtn = $('.t-max', elw);
  if (maxBtn) maxBtn.addEventListener('click', ev => { ev.stopPropagation(); win.toggleMax(); });

  /* --- フォーカス --- */
  elw.addEventListener('pointerdown', () => { if (WM.active !== win) win.focus(); });

  /* --- ドラッグ移動 --- */
  titlebar.addEventListener('pointerdown', e => {
    if (e.button !== 0 || e.target.closest('.tbtn') || win.maximized) return;
    const r = elw.getBoundingClientRect();
    const dr = deskEl.getBoundingClientRect();
    const ox = e.clientX - r.left;
    const oy = e.clientY - r.top;
    const move = ev => {
      const x = clamp(ev.clientX - ox - dr.left, -r.width + 70, dr.width - 70);
      const y = clamp(ev.clientY - oy - dr.top, 0, dr.height - 24);
      elw.style.left = x + 'px';
      elw.style.top = y + 'px';
    };
    const up = () => {
      titlebar.removeEventListener('pointermove', move);
      titlebar.removeEventListener('pointerup', up);
    };
    titlebar.setPointerCapture(e.pointerId);
    titlebar.addEventListener('pointermove', move);
    titlebar.addEventListener('pointerup', up);
  });
  if (o.buttons !== 'close') {
    titlebar.addEventListener('dblclick', e => {
      if (!e.target.closest('.tbtn')) win.toggleMax();
    });
  }

  /* --- リサイズ --- */
  if (o.resizable) {
    elw.classList.add('resizable');
    const grip = el('div', 'resize-grip');
    elw.appendChild(grip);
    grip.addEventListener('pointerdown', e => {
      if (e.button !== 0 || win.maximized) return;
      e.stopPropagation();
      const r = elw.getBoundingClientRect();
      const sw = r.width, sh = r.height, sx = e.clientX, sy = e.clientY;
      const move = ev => {
        elw.style.width = Math.max(o.minWidth || 240, sw + ev.clientX - sx) + 'px';
        elw.style.height = Math.max(o.minHeight || 140, sh + ev.clientY - sy) + 'px';
      };
      const up = () => {
        grip.removeEventListener('pointermove', move);
        grip.removeEventListener('pointerup', up);
      };
      grip.setPointerCapture(e.pointerId);
      grip.addEventListener('pointermove', move);
      grip.addEventListener('pointerup', up);
    });
  }

  /* --- コンテンツ生成 --- */
  if (o.content) o.content(body, win);

  deskEl.appendChild(elw);

  /* --- 配置 --- */
  const dr = deskEl.getBoundingClientRect();
  const ew = elw.offsetWidth, eh = elw.offsetHeight;
  let x, y;
  if (o.x != null) { x = o.x; y = o.y; }
  else if (o.dialog || o.center) {
    x = Math.max(10, (dr.width - ew) / 2);
    y = Math.max(10, (dr.height - eh) / 2.4);
  } else {
    x = 34 + (WM.cascade % 7) * 28;
    y = 24 + (WM.cascade % 7) * 26;
    WM.cascade++;
  }
  elw.style.left = clamp(x, 0, Math.max(0, dr.width - ew)) + 'px';
  elw.style.top = clamp(y, 0, Math.max(0, dr.height - 60)) + 'px';

  WM.wins.add(win);
  if (o.app) WM.byApp[o.app] = win;
  if (o.taskbar !== false) addTaskButton(win);
  win.focus();
  return win;
}

/* ---------- タスクバー ---------- */
function addTaskButton(win) {
  const btn = el('button', 'taskbtn');
  btn.innerHTML = iconHTML(win.opts.icon || 'folder', 16) + '<span class="tt"></span>';
  $('.tt', btn).textContent = win.opts.title || '';
  btn.addEventListener('click', () => {
    if (win.minimized) win.focus();
    else if (WM.active === win) win.minimize();
    else win.focus();
  });
  win.tbBtn = btn;
  $('#task-buttons').appendChild(btn);
  updateTaskbarState();
}

/* ---------- メニューバー ---------- */
function buildMenubar(menus) {
  const bar = el('div', 'menubar');
  const closeAll = () => bar.querySelectorAll('.mitem.open').forEach(m => m.classList.remove('open'));

  menus.forEach(m => {
    const it = el('div', 'mitem');
    it.appendChild(document.createTextNode(m.label));
    const pop = el('div', 'menu-popup');
    m.items.forEach(x => {
      if (x === '-') { pop.appendChild(el('div', 'menu-sep')); return; }
      const row = el('div', 'menu-row' + (x.disabled ? ' disabled' : ''));
      row.innerHTML =
        (x.checked ? '<span class="mcheck">✓</span>' : '') +
        '<span></span>' + (x.key ? '<span class="mkey"></span>' : '');
      row.children[x.checked ? 1 : 0].textContent = x.label;
      if (x.key) row.lastChild.textContent = x.key;
      row.addEventListener('click', ev => {
        ev.stopPropagation();
        if (x.disabled) return;
        closeAll();
        Sound.click();
        if (x.action) x.action();
      });
      pop.appendChild(row);
    });
    it.appendChild(pop);
    it.addEventListener('pointerdown', ev => {
      if (ev.target.closest('.menu-popup')) return;
      const wasOpen = it.classList.contains('open');
      closeAll();
      if (!wasOpen) it.classList.add('open');
    });
    it.addEventListener('pointerenter', () => {
      if (bar.querySelector('.mitem.open') && !it.classList.contains('open')) {
        closeAll();
        it.classList.add('open');
      }
    });
    bar.appendChild(it);
  });

  const outside = ev => {
    if (!bar.isConnected) { document.removeEventListener('pointerdown', outside); return; }
    if (!bar.contains(ev.target)) closeAll();
  };
  document.addEventListener('pointerdown', outside);
  return bar;
}

/* ---------- コンテキストメニュー ---------- */
function showContextMenu(items, x, y) {
  closeContextMenu();
  const m = el('div', 'ctx-menu');
  m.id = 'ctx-menu';
  items.forEach(x2 => {
    if (x2 === '-') { m.appendChild(el('div', 'menu-sep')); return; }
    const row = el('div', 'menu-row' + (x2.disabled ? ' disabled' : ''));
    const lbl = el('span');
    lbl.textContent = x2.label;
    row.appendChild(lbl);
    if (x2.bold) row.style.fontWeight = 'bold';
    row.addEventListener('click', () => {
      closeContextMenu();
      if (!x2.disabled && x2.action) x2.action();
    });
    m.appendChild(row);
  });
  document.body.appendChild(m);
  const mw = m.offsetWidth, mh = m.offsetHeight;
  m.style.left = clamp(x, 0, window.innerWidth - mw - 2) + 'px';
  m.style.top = clamp(y, 0, window.innerHeight - mh - 2) + 'px';
}
function closeContextMenu() {
  const old = document.getElementById('ctx-menu');
  if (old) old.remove();
}
document.addEventListener('pointerdown', ev => {
  if (!ev.target.closest('#ctx-menu')) closeContextMenu();
});

/* ---------- ダイアログ ---------- */
function dialog(opt) {
  const buttons = opt.buttons || [{ label: 'OK' }];
  let win;
  win = createWindow({
    title: opt.title || 'RetroDesk',
    width: opt.width || 360,
    dialog: true,
    taskbar: false,
    buttons: 'close',
    content(body) {
      const main = el('div', 'dlg-main');
      if (opt.icon !== null) main.appendChild(el('span', 'dlg-icon', ICONS[opt.icon || 'warning']));
      if (opt.contentEl) {
        const wrap = el('div', 'dlg-msg');
        wrap.appendChild(opt.contentEl);
        main.appendChild(wrap);
      } else {
        const msg = el('div', 'dlg-msg');
        msg.textContent = opt.message || '';
        main.appendChild(msg);
      }
      body.appendChild(main);
      const row = el('div', 'dlg-btns');
      buttons.forEach((b, i) => {
        const btn = el('button', 'btn');
        btn.textContent = b.label;
        btn.addEventListener('click', () => {
          win.close();
          if (b.action) b.action();
        });
        row.appendChild(btn);
        if (i === 0) setTimeout(() => { try { btn.focus(); } catch (e) {} }, 0);
      });
      body.appendChild(row);
    }
  });
  return win;
}
function errorDialog(msg, title) {
  Sound.error();
  return dialog({ title: title || 'エラー', icon: 'warning', message: msg });
}
function infoDialog(msg, title) {
  Sound.ding();
  return dialog({ title: title || 'RetroDesk', icon: 'info', message: msg });
}
function confirmDialog(msg, onYes, title) {
  Sound.ding();
  return dialog({
    title: title || '確認',
    icon: 'question',
    message: msg,
    buttons: [{ label: 'はい', action: onYes }, { label: 'いいえ' }]
  });
}

/* ---------- 時計 ---------- */
function startClock() {
  const c = $('#clock');
  const tick = () => {
    const d = new Date();
    c.textContent = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
    c.title = d.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });
  };
  tick();
  setInterval(tick, 1000);
}
