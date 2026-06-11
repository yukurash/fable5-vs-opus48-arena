/* ============================================================
   RetroDesk 95  —  app.js
   ブラウザで動く Windows 95 風デスクトップ（ビルド不要・単体動作）
   ============================================================ */
(function () {
"use strict";

/* ============================================================
   0. ユーティリティ
   ============================================================ */
const $  = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const el = (tag, cls, html) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (html != null) n.innerHTML = html;
  return n;
};
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const store = {
  get(k, d) { try { const v = localStorage.getItem("retrodesk." + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem("retrodesk." + k, JSON.stringify(v)); } catch (e) {} },
  del(k)    { try { localStorage.removeItem("retrodesk." + k); } catch (e) {} },
};

/* ============================================================
   1. アイコン素材（ピクセル風 SVG / data-URI）
   ============================================================ */
function svg(inner, w = 32, h = 32) {
  return "data:image/svg+xml," + encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" shape-rendering="crispEdges">${inner}</svg>`);
}
const ICONS = {
  computer: svg(`<rect x="4" y="4" width="24" height="18" fill="#c0c0c0" stroke="#000"/>
    <rect x="6" y="6" width="20" height="13" fill="#008080"/><rect x="7" y="7" width="9" height="5" fill="#00a0a0"/>
    <rect x="10" y="22" width="12" height="3" fill="#9a9a9a" stroke="#000"/>
    <rect x="6" y="25" width="20" height="5" fill="#c0c0c0" stroke="#000"/>
    <rect x="9" y="27" width="10" height="1" fill="#808080"/><circle cx="23" cy="27.5" r="1" fill="#4cd964"/>`),
  recycle: svg(`<rect x="9" y="8" width="14" height="3" fill="#9aa" stroke="#445"/>
    <path d="M10 11 L12 28 L20 28 L22 11 Z" fill="#aab4be" stroke="#445"/>
    <rect x="13" y="6" width="6" height="3" fill="#8a96a0" stroke="#445"/>
    <rect x="13" y="13" width="1.5" height="13" fill="#7a868f"/><rect x="16" y="13" width="1.5" height="13" fill="#7a868f"/><rect x="19" y="13" width="1.5" height="13" fill="#7a868f"/>`),
  recyclefull: svg(`<rect x="11" y="3" width="10" height="8" fill="#fff" stroke="#888"/><path d="M13 5h6M13 7h6M13 9h4" stroke="#08c" stroke-width="0.8"/>
    <rect x="9" y="8" width="14" height="3" fill="#9aa" stroke="#445"/>
    <path d="M10 11 L12 28 L20 28 L22 11 Z" fill="#aab4be" stroke="#445"/>
    <rect x="13" y="6" width="6" height="3" fill="#8a96a0" stroke="#445"/>
    <rect x="13" y="13" width="1.5" height="13" fill="#7a868f"/><rect x="16" y="13" width="1.5" height="13" fill="#7a868f"/><rect x="19" y="13" width="1.5" height="13" fill="#7a868f"/>`),
  paint: svg(`<path d="M16 4 a12 10 0 1 0 0.1 0 c-2 0 -2 2 -1 3 c1 1 1 3 -1 3 a4 4 0 0 0 0 8 z" fill="#e8e8e8" stroke="#000"/>
    <circle cx="11" cy="9" r="1.6" fill="#f00"/><circle cx="20" cy="8" r="1.6" fill="#ff0"/><circle cx="24" cy="14" r="1.6" fill="#0c0"/><circle cx="22" cy="20" r="1.6" fill="#08f"/><circle cx="9" cy="15" r="1.6" fill="#f0f"/>
    <rect x="14" y="17" width="3" height="11" fill="#c90" stroke="#000" transform="rotate(12 15 22)"/>`),
  mine: svg(`<rect x="3" y="3" width="26" height="26" fill="#c0c0c0" stroke="#808080"/>
    <circle cx="16" cy="16" r="8" fill="#111"/>
    <rect x="15" y="4" width="2" height="24" fill="#111"/><rect x="4" y="15" width="24" height="2" fill="#111"/>
    <line x1="8" y1="8" x2="24" y2="24" stroke="#111" stroke-width="2"/><line x1="24" y1="8" x2="8" y2="24" stroke="#111" stroke-width="2"/>
    <circle cx="13" cy="13" r="2" fill="#fff"/>`),
  notepad: svg(`<rect x="7" y="3" width="18" height="26" fill="#fff" stroke="#000"/>
    <rect x="7" y="3" width="18" height="4" fill="#1084d0"/>
    <path d="M10 11h12M10 14h12M10 17h12M10 20h12M10 23h8" stroke="#3a6ea5" stroke-width="1"/>`),
  txt: svg(`<rect x="8" y="3" width="16" height="26" fill="#fff" stroke="#000"/>
    <path d="M11 9h10M11 12h10M11 15h10M11 18h7" stroke="#888" stroke-width="1"/>
    <text x="13" y="27" font-size="9" font-family="monospace" fill="#0a0">A</text>`),
  info: svg(`<circle cx="16" cy="16" r="12" fill="#0050c8" stroke="#002a7a"/><circle cx="16" cy="16" r="12" fill="none" stroke="#4ea0ff" stroke-width="1"/>
    <circle cx="16" cy="10" r="2" fill="#fff"/><rect x="14.5" y="14" width="3" height="9" fill="#fff"/>`),
  folder: svg(`<path d="M4 9 h9 l2 2 h13 v15 h-24 z" fill="#ffcf6b" stroke="#7a5b00"/><path d="M4 11 h24 v15 h-24 z" fill="#ffe08a" stroke="#7a5b00"/>`),
  drive: svg(`<rect x="4" y="9" width="24" height="15" rx="1" fill="#c0c0c0" stroke="#000"/>
    <rect x="6" y="11" width="20" height="6" fill="#a0a0a0"/><circle cx="22" cy="20.5" r="1.4" fill="#4cd964"/><rect x="7" y="19" width="8" height="2" fill="#808080"/>`),
  start: svg(`<rect x="1" y="1" width="7" height="6" fill="#ff3b30"/><rect x="8" y="1" width="7" height="6" fill="#4cd964"/><rect x="1" y="8" width="7" height="6" fill="#007aff"/><rect x="8" y="8" width="7" height="6" fill="#ffcc00"/>`, 16, 16),
  shutdown: svg(`<circle cx="16" cy="17" r="10" fill="#c0c0c0" stroke="#000"/><path d="M16 6 v9" stroke="#c00" stroke-width="3"/><path d="M9 12 a9 9 0 1 0 14 0" fill="none" stroke="#069" stroke-width="3"/>`),
  help: svg(`<circle cx="16" cy="16" r="12" fill="#0050c8"/><text x="11" y="23" font-size="16" font-family="serif" fill="#fff" font-weight="bold">?</text>`),
  run: svg(`<rect x="4" y="6" width="24" height="20" fill="#c0c0c0" stroke="#000"/><rect x="4" y="6" width="24" height="4" fill="#000080"/><rect x="7" y="13" width="14" height="9" fill="#fff" stroke="#888"/><text x="8" y="20" font-size="7" font-family="monospace" fill="#000">&gt;_</text>`),
  saver: svg(`<rect x="3" y="5" width="26" height="18" fill="#000" stroke="#888"/><circle cx="9" cy="11" r="1" fill="#fff"/><circle cx="20" cy="9" r="1" fill="#fff"/><circle cx="24" cy="16" r="1" fill="#fff"/><circle cx="13" cy="18" r="1" fill="#fff"/><rect x="11" y="24" width="10" height="2" fill="#888"/><rect x="8" y="26" width="16" height="3" fill="#c0c0c0" stroke="#000"/>`),
};
function iconFor(name) { return ICONS[name] || ICONS.txt; }

/* ============================================================
   2. サウンドエンジン（Web Audio・素材不要）
   ============================================================ */
const Sound = (() => {
  let ctx = null, enabled = store.get("sound", true);
  function ac() { if (!ctx) { try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} } if (ctx && ctx.state === "suspended") ctx.resume(); return ctx; }
  function tone(freq, start, dur, type = "square", gain = 0.12) {
    const c = ac(); if (!c) return;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.value = freq;
    o.connect(g); g.connect(c.destination);
    const t0 = c.currentTime + start;
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(gain, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.start(t0); o.stop(t0 + dur + 0.02);
  }
  const api = {
    get on() { return enabled; },
    toggle() { enabled = !enabled; store.set("sound", enabled); if (enabled) api.click(); return enabled; },
    startup() { if (!enabled) return; const n = [[523,0],[659,.13],[784,.26],[1047,.39]]; n.forEach(([f, t]) => tone(f, t, 0.5, "triangle", 0.14)); tone(784, .39, .7, "sine", .1); },
    click()   { if (enabled) tone(220, 0, 0.04, "square", 0.05); },
    open()    { if (enabled) { tone(440, 0, .07, "square", .07); tone(660, .05, .08, "square", .07); } },
    close()   { if (enabled) { tone(660, 0, .06, "square", .06); tone(440, .05, .08, "square", .06); } },
    error()   { if (enabled) { tone(200, 0, .18, "square", .12); tone(150, .2, .25, "square", .12); } },
    tada()    { if (!enabled) return; [[523,0],[523,.12],[523,.24],[659,.36],[784,.6]].forEach(([f, t]) => tone(f, t, .3, "triangle", .12)); },
    boom()    { if (!enabled) return; const c = ac(); if (!c) return; const o = c.createOscillator(), g = c.createGain(); o.type = "sawtooth"; o.frequency.setValueAtTime(180, c.currentTime); o.frequency.exponentialRampToValueAtTime(40, c.currentTime + .4); g.gain.setValueAtTime(.2, c.currentTime); g.gain.exponentialRampToValueAtTime(.001, c.currentTime + .5); o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime + .5); },
    init: ac,
  };
  return api;
})();

/* ============================================================
   3. ウィンドウマネージャ
   ============================================================ */
const desktop = $("#desktop");
const WM = (() => {
  let z = 100, seq = 0, activeId = null;
  const windows = new Map();

  function deskRect() { return desktop.getBoundingClientRect(); }

  function create(opts) {
    const id = "win" + (++seq);
    const w = el("div", "window");
    w.style.width  = (opts.width  || 400) + "px";
    w.style.height = (opts.height || 300) + "px";
    const dr = deskRect();
    let x = opts.x, y = opts.y;
    if (x == null) x = clamp(40 + (seq * 22) % 220, 0, dr.width  - (opts.width  || 400));
    if (y == null) y = clamp(30 + (seq * 22) % 160, 0, dr.height - (opts.height || 300));
    w.style.left = x + "px"; w.style.top = y + "px";

    w.innerHTML =
      `<div class="title-bar">
         <div class="title-bar-text"><img src="${iconFor(opts.icon)}" alt=""><span>${opts.title}</span></div>
         <div class="title-bar-controls">
           <button class="tb-btn min" title="最小化"><svg width="8" height="8"><rect x="0" y="6" width="7" height="2" fill="#000"/></svg></button>
           <button class="tb-btn max" title="最大化"><svg width="8" height="8"><rect x="0" y="0" width="8" height="8" fill="none" stroke="#000" stroke-width="1"/><rect x="0" y="0" width="8" height="2" fill="#000"/></svg></button>
           <button class="tb-btn close" title="閉じる"><svg width="8" height="8"><path d="M0 0 L7 7 M7 0 L0 7" stroke="#000" stroke-width="1.4"/></svg></button>
         </div>
       </div>
       <div class="window-body"></div>`;

    const body = $(".window-body", w);
    if (opts.resizable !== false) {
      const rh = el("div", "resize-handle");
      w.appendChild(rh);
      makeResizable(w, rh, opts);
    }
    desktop.appendChild(w);

    const winObj = { id, el: w, body, opts, title: opts.title, icon: opts.icon, minimized: false, maximized: false, prevRect: null, appKey: opts.appKey, instance: opts.instance };
    windows.set(id, winObj);

    // build content
    if (typeof opts.build === "function") opts.build(body, winObj);

    // title bar drag
    makeDraggable(w, $(".title-bar", w), winObj);
    // controls
    $(".min", w).addEventListener("click", (e) => { e.stopPropagation(); minimize(winObj); });
    $(".max", w).addEventListener("click", (e) => { e.stopPropagation(); toggleMax(winObj); });
    $(".close", w).addEventListener("click", (e) => { e.stopPropagation(); close(winObj); });
    $(".title-bar", w).addEventListener("dblclick", (e) => { if (!e.target.closest(".tb-btn")) toggleMax(winObj); });
    w.addEventListener("mousedown", () => focus(winObj));

    // taskbar button
    const btn = el("button", "task-button", `<img src="${iconFor(opts.icon)}" alt=""><span>${opts.title}</span>`);
    btn.addEventListener("click", () => {
      if (winObj.minimized) { restore(winObj); focus(winObj); }
      else if (activeId === id) { minimize(winObj); }
      else { focus(winObj); }
    });
    winObj.taskBtn = btn;
    $("#task-buttons").appendChild(btn);

    Sound.open();
    focus(winObj);
    return winObj;
  }

  function focus(win) {
    if (win.minimized) restore(win);
    activeId = win.id;
    win.el.style.zIndex = ++z;
    windows.forEach((o) => o.el.classList.toggle("inactive", o.id !== win.id));
    refreshTaskbar();
  }

  function minimize(win) {
    win.minimized = true;
    win.el.style.display = "none";
    if (activeId === win.id) {
      activeId = null;
      // focus next visible top window
      let top = null;
      windows.forEach((o) => { if (!o.minimized && (!top || +o.el.style.zIndex > +top.el.style.zIndex)) top = o; });
      if (top) focus(top);
    }
    refreshTaskbar();
    Sound.close();
  }
  function restore(win) {
    win.minimized = false;
    win.el.style.display = "flex";
    refreshTaskbar();
  }
  function toggleMax(win) {
    const dr = deskRect();
    if (!win.maximized) {
      win.prevRect = { left: win.el.style.left, top: win.el.style.top, width: win.el.style.width, height: win.el.style.height };
      win.el.classList.add("maximized");
      win.el.style.left = "0px"; win.el.style.top = "0px";
      win.el.style.width = dr.width + "px"; win.el.style.height = dr.height + "px";
      win.maximized = true;
    } else {
      win.el.classList.remove("maximized");
      Object.assign(win.el.style, win.prevRect);
      win.maximized = false;
    }
    focus(win);
    if (win.opts.onResize) win.opts.onResize(win);
  }
  function close(win) {
    if (win.opts.onClose && win.opts.onClose(win) === false) return;
    win.el.remove();
    win.taskBtn.remove();
    windows.delete(win.id);
    if (activeId === win.id) {
      activeId = null;
      let top = null;
      windows.forEach((o) => { if (!o.minimized && (!top || +o.el.style.zIndex > +top.el.style.zIndex)) top = o; });
      if (top) focus(top); else refreshTaskbar();
    }
    Sound.close();
  }

  function refreshTaskbar() {
    windows.forEach((o) => {
      o.taskBtn.classList.toggle("active", o.id === activeId && !o.minimized);
    });
  }

  function makeDraggable(win, handle, winObj) {
    let sx, sy, ox, oy, dragging = false;
    handle.addEventListener("mousedown", (e) => {
      if (e.target.closest(".tb-btn")) return;
      if (winObj.maximized) return;
      dragging = true;
      sx = e.clientX; sy = e.clientY;
      ox = parseInt(win.style.left); oy = parseInt(win.style.top);
      e.preventDefault();
      const move = (ev) => {
        if (!dragging) return;
        const dr = deskRect();
        let nx = ox + (ev.clientX - sx);
        let ny = oy + (ev.clientY - sy);
        nx = clamp(nx, -win.offsetWidth + 60, dr.width - 40);
        ny = clamp(ny, 0, dr.height - 24);
        win.style.left = nx + "px"; win.style.top = ny + "px";
      };
      const up = () => { dragging = false; document.removeEventListener("mousemove", move); document.removeEventListener("mouseup", up); };
      document.addEventListener("mousemove", move);
      document.addEventListener("mouseup", up);
    });
  }

  function makeResizable(win, handle, opts) {
    handle.addEventListener("mousedown", (e) => {
      e.preventDefault(); e.stopPropagation();
      const sx = e.clientX, sy = e.clientY;
      const sw = win.offsetWidth, sh = win.offsetHeight;
      const move = (ev) => {
        win.style.width  = Math.max(opts.minW || 200, sw + ev.clientX - sx) + "px";
        win.style.height = Math.max(opts.minH || 120, sh + ev.clientY - sy) + "px";
      };
      const up = () => {
        document.removeEventListener("mousemove", move); document.removeEventListener("mouseup", up);
        const wo = [...windows.values()].find((o) => o.el === win);
        if (wo && wo.opts.onResize) wo.opts.onResize(wo);
      };
      document.addEventListener("mousemove", move);
      document.addEventListener("mouseup", up);
    });
  }

  return { create, close, focus, windows, deskRect };
})();

/* ============================================================
   4. メニュー / ダイアログ
   ============================================================ */
function openDropdown(items, x, y) {
  closeAllPopups();
  const dd = el("div", "dropdown");
  buildMenuItems(dd, items, dd);
  document.body.appendChild(dd);
  dd.style.left = x + "px"; dd.style.top = y + "px";
  // keep on screen
  const r = dd.getBoundingClientRect();
  if (r.right > innerWidth)  dd.style.left = (innerWidth  - r.width  - 2) + "px";
  if (r.bottom > innerHeight) dd.style.top = (y - r.height) + "px";
  setTimeout(() => document.addEventListener("mousedown", function h(ev) {
    if (!dd.contains(ev.target)) { dd.remove(); document.removeEventListener("mousedown", h); }
  }), 0);
  return dd;
}
function buildMenuItems(container, items, rootMenu) {
  items.forEach((it) => {
    if (it === "---" || it.divider) { container.appendChild(el("div", "ctx-divider")); return; }
    const item = el("div", "ctx-item" + (it.disabled ? " disabled" : ""), (it.icon ? `<img src="${iconFor(it.icon)}" style="width:16px;height:16px;vertical-align:-3px;margin-right:6px">` : "") + it.label + (it.sub ? '<span class="arrow" style="float:right">▸</span>' : ""));
    if (!it.disabled) item.addEventListener("click", (e) => {
      e.stopPropagation();
      if (it.action) { rootMenu.remove(); closeAllPopups(); it.action(); }
    });
    container.appendChild(item);
  });
}

function closeAllPopups() {
  $$(".dropdown").forEach((d) => d.remove());
  $("#context-menu").classList.remove("open");
  closeStartMenu();
}

function contextMenu(items, x, y) {
  const cm = $("#context-menu");
  cm.innerHTML = "";
  items.forEach((it) => {
    if (it === "---") { cm.appendChild(el("div", "ctx-divider")); return; }
    const item = el("div", "ctx-item" + (it.disabled ? " disabled" : ""), it.label);
    if (!it.disabled && it.action) item.addEventListener("click", () => { cm.classList.remove("open"); it.action(); });
    cm.appendChild(item);
  });
  cm.style.left = clamp(x, 0, innerWidth - 160) + "px";
  cm.style.top  = clamp(y, 0, innerHeight - 30 - items.length * 24) + "px";
  cm.classList.add("open");
}

// Dialog system
function showDialog({ title = "メッセージ", icon = "ℹ️", iconImg = null, message = "", buttons = [{ label: "OK", value: true }], width = 320 }) {
  return new Promise((resolve) => {
    const layer = $("#dialog-layer");
    layer.classList.add("show");
    const dlg = el("div", "dialog");
    dlg.style.minWidth = width + "px";
    dlg.innerHTML =
      `<div class="title-bar">
         <div class="title-bar-text"><span>${title}</span></div>
         <div class="title-bar-controls"><button class="tb-btn close"><svg width="8" height="8"><path d="M0 0 L7 7 M7 0 L0 7" stroke="#000" stroke-width="1.4"/></svg></button></div>
       </div>
       <div class="dialog-content">
         ${iconImg ? `<img class="dialog-icon" src="${iconFor(iconImg)}" style="width:32px;height:32px">` : `<div class="dialog-icon">${icon}</div>`}
         <div class="dialog-msg">${message}</div>
       </div>
       <div class="dialog-buttons"></div>`;
    const bwrap = $(".dialog-buttons", dlg);
    function done(v) { dlg.remove(); if (!$(".dialog", layer)) layer.classList.remove("show"); resolve(v); }
    buttons.forEach((b) => {
      const btn = el("button", "w95-btn", b.label);
      btn.addEventListener("click", () => done(b.value));
      bwrap.appendChild(btn);
      if (b.default) setTimeout(() => btn.focus(), 0);
    });
    $(".close", dlg).addEventListener("click", () => done(false));
    layer.appendChild(dlg);
    // make dialog draggable + on top
    let sx, sy, ox, oy, drag = false;
    const tb = $(".title-bar", dlg);
    dlg.style.left = "50%"; dlg.style.top = "42%"; dlg.style.transform = "translate(-50%,-50%)";
    tb.addEventListener("mousedown", (e) => {
      if (e.target.closest(".tb-btn")) return;
      const r = dlg.getBoundingClientRect();
      dlg.style.transform = "none"; dlg.style.left = r.left + "px"; dlg.style.top = r.top + "px";
      drag = true; sx = e.clientX; sy = e.clientY; ox = r.left; oy = r.top;
      const mv = (ev) => { if (drag) { dlg.style.left = (ox + ev.clientX - sx) + "px"; dlg.style.top = (oy + ev.clientY - sy) + "px"; } };
      const up = () => { drag = false; document.removeEventListener("mousemove", mv); document.removeEventListener("mouseup", up); };
      document.addEventListener("mousemove", mv); document.addEventListener("mouseup", up);
    });
  });
}
function alertBox(message, title = "RetroDesk", icon = "ℹ️") { Sound.error(); return showDialog({ title, message, icon, buttons: [{ label: "OK", value: true, default: true }] }); }
function confirmBox(message, title = "確認") { return showDialog({ title, message, icon: "❓", buttons: [{ label: "はい", value: true, default: true }, { label: "いいえ", value: false }] }); }

/* ============================================================
   5. アプリ定義
   ============================================================ */
const APPS = {};

/* ---------- ペイント ---------- */
APPS.paint = {
  title: "ペイント", icon: "paint",
  open(arg) {
    const palette = ["#000000","#808080","#800000","#808000","#008000","#008080","#000080","#800080",
                     "#808040","#004040","#0080ff","#004080","#8000ff","#804000","#ffffff","#c0c0c0",
                     "#ff0000","#ffff00","#00ff00","#00ffff","#0000ff","#ff00ff","#ffff80","#00ff80",
                     "#80ffff","#8080ff","#ff0080","#ff8040","#ffc0c0","#a0a0a0","#ff8000","#404040"];
    let fg = "#000000", bg = "#ffffff", tool = "pencil", size = 2;
    let ctx, drawing = false, last = null, startPt = null, snapshot = null;
    WM.create({
      title: "無題 - ペイント", icon: "paint", width: 540, height: 420, minW: 360, minH: 280, appKey: "paint",
      build(body) {
        body.innerHTML =
          `<div class="paint-app">
             <div class="menubar"></div>
             <div class="paint-main">
               <div class="paint-tools"></div>
               <div class="paint-canvas-wrap"><canvas width="640" height="480"></canvas></div>
             </div>
             <div class="paint-bottom">
               <div class="paint-sizes"></div>
               <div class="paint-current"><div class="swatch-fg"></div><div class="swatch-bg"></div></div>
               <div class="paint-palette"></div>
             </div>
           </div>`;
        const canvas = $("canvas", body);
        ctx = canvas.getContext("2d");
        ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.lineCap = "round"; ctx.lineJoin = "round";

        // menubar
        const mb = $(".menubar", body);
        const menus = [
          { label: "ファイル", items: [
            { label: "新規", action: clearCanvas },
            { label: "名前を付けて保存(PNG)", action: () => { const a = document.createElement("a"); a.download = "retrodesk-paint.png"; a.href = canvas.toDataURL(); a.click(); } },
            "---",
            { label: "閉じる", action: () => { /* handled by window */ } },
          ] },
          { label: "編集", items: [{ label: "すべてクリア", action: clearCanvas }] },
          { label: "ヘルプ", items: [{ label: "ペイントについて", action: () => alertBox("RetroDesk ペイント<br>マウスで描いて、色を選んで、クリアできます。", "ペイントについて") }] },
        ];
        menus.forEach((m) => {
          const mi = el("div", "menu-item", m.label);
          mi.addEventListener("click", () => {
            const r = mi.getBoundingClientRect();
            openDropdown(m.items, r.left, r.bottom);
          });
          mb.appendChild(mi);
        });

        // tools
        const tools = [
          { k: "pencil", g: "✏️", t: "鉛筆" }, { k: "brush", g: "🖌️", t: "ブラシ" },
          { k: "eraser", g: "🧽", t: "消しゴム" }, { k: "fill", g: "🪣", t: "塗りつぶし" },
          { k: "line", g: "📏", t: "直線" }, { k: "rect", g: "▭", t: "四角形" },
          { k: "ellipse", g: "◯", t: "楕円" }, { k: "picker", g: "💉", t: "スポイト" },
        ];
        const tw = $(".paint-tools", body);
        tools.forEach((t) => {
          const b = el("div", "paint-tool" + (t.k === tool ? " active" : ""), t.g);
          b.title = t.t;
          b.addEventListener("click", () => { tool = t.k; $$(".paint-tool", tw).forEach((x) => x.classList.remove("active")); b.classList.add("active"); });
          tw.appendChild(b);
        });

        // sizes
        const sw = $(".paint-sizes", body);
        [1, 2, 4, 8].forEach((s) => {
          const d = el("div", "paint-size-dot" + (s === size ? " active" : ""));
          const dot = el("i"); dot.style.width = dot.style.height = Math.min(14, s + 2) + "px"; d.appendChild(dot);
          d.addEventListener("click", () => { size = s; $$(".paint-size-dot", sw).forEach((x) => x.classList.remove("active")); d.classList.add("active"); });
          sw.appendChild(d);
        });

        // palette
        const pal = $(".paint-palette", body);
        const fgEl = $(".swatch-fg", body), bgEl = $(".swatch-bg", body);
        fgEl.style.background = fg; bgEl.style.background = bg;
        palette.forEach((c) => {
          const s = el("div", "swatch"); s.style.background = c;
          s.addEventListener("click", () => { fg = c; fgEl.style.background = c; });
          s.addEventListener("contextmenu", (e) => { e.preventDefault(); bg = c; bgEl.style.background = c; });
          pal.appendChild(s);
        });

        function clearCanvas() { ctx.fillStyle = bg; ctx.fillRect(0, 0, canvas.width, canvas.height); Sound.click(); }

        function pos(e) {
          const r = canvas.getBoundingClientRect();
          return { x: Math.round((e.clientX - r.left) * canvas.width / r.width), y: Math.round((e.clientY - r.top) * canvas.height / r.height) };
        }
        function drawDot(p) { ctx.fillStyle = tool === "eraser" ? bg : fg; ctx.beginPath(); ctx.arc(p.x, p.y, size / 2, 0, Math.PI * 2); ctx.fill(); }
        function drawLine(a, b) {
          ctx.strokeStyle = tool === "eraser" ? bg : fg; ctx.lineWidth = size;
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        }
        function floodFill(p, fillColor) {
          const w = canvas.width, h = canvas.height;
          const img = ctx.getImageData(0, 0, w, h), data = img.data;
          const idx = (x, y) => (y * w + x) * 4;
          const i0 = idx(p.x, p.y);
          const tgt = [data[i0], data[i0 + 1], data[i0 + 2], data[i0 + 3]];
          const fc = hexToRgb(fillColor);
          if (tgt[0] === fc.r && tgt[1] === fc.g && tgt[2] === fc.b) return;
          const stack = [[p.x, p.y]];
          const match = (i) => Math.abs(data[i] - tgt[0]) < 8 && Math.abs(data[i + 1] - tgt[1]) < 8 && Math.abs(data[i + 2] - tgt[2]) < 8 && Math.abs(data[i + 3] - tgt[3]) < 8;
          while (stack.length) {
            const [x, y] = stack.pop();
            if (x < 0 || y < 0 || x >= w || y >= h) continue;
            const i = idx(x, y);
            if (!match(i)) continue;
            data[i] = fc.r; data[i + 1] = fc.g; data[i + 2] = fc.b; data[i + 3] = 255;
            stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
          }
          ctx.putImageData(img, 0, 0);
        }
        function pickColor(p) {
          const d = ctx.getImageData(p.x, p.y, 1, 1).data;
          fg = "#" + [d[0], d[1], d[2]].map((n) => n.toString(16).padStart(2, "0")).join("");
          fgEl.style.background = fg;
        }

        canvas.addEventListener("mousedown", (e) => {
          if (e.button !== 0) return;
          const p = pos(e);
          if (tool === "fill") { floodFill(p, fg); return; }
          if (tool === "picker") { pickColor(p); return; }
          drawing = true; last = p; startPt = p;
          if (tool === "line" || tool === "rect" || tool === "ellipse") {
            snapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
          } else { drawDot(p); }
        });
        canvas.addEventListener("mousemove", (e) => {
          if (!drawing) return;
          const p = pos(e);
          if (tool === "line" || tool === "rect" || tool === "ellipse") {
            ctx.putImageData(snapshot, 0, 0);
            ctx.strokeStyle = fg; ctx.lineWidth = size; ctx.beginPath();
            if (tool === "line") { ctx.moveTo(startPt.x, startPt.y); ctx.lineTo(p.x, p.y); }
            else if (tool === "rect") { ctx.rect(startPt.x, startPt.y, p.x - startPt.x, p.y - startPt.y); }
            else { ctx.ellipse((startPt.x + p.x) / 2, (startPt.y + p.y) / 2, Math.abs(p.x - startPt.x) / 2, Math.abs(p.y - startPt.y) / 2, 0, 0, Math.PI * 2); }
            ctx.stroke();
          } else { drawLine(last, p); last = p; }
        });
        document.addEventListener("mouseup", () => { drawing = false; });
        canvas.addEventListener("contextmenu", (e) => e.preventDefault());
      },
    });
  },
};

/* ---------- マインスイーパー ---------- */
APPS.mines = {
  title: "マインスイーパー", icon: "mine",
  open() {
    const LEVELS = { easy: { r: 9, c: 9, m: 10, n: "初級" }, med: { r: 16, c: 16, m: 40, n: "中級" }, hard: { r: 16, c: 30, m: 99, n: "上級" } };
    let level = "easy", grid = [], rows, cols, mines, started, dead, won, flags, timer = 0, tInt = null, revealed = 0;

    WM.create({
      title: "マインスイーパー", icon: "mine", resizable: false, appKey: "mines", width: 240, height: 320,
      onClose() { clearInterval(tInt); },
      build(body, win) {
        body.innerHTML =
          `<div class="mine-app">
             <div class="menubar"><div class="menu-item" data-m="game">ゲーム</div><div class="menu-item" data-m="help">ヘルプ</div></div>
             <div class="mine-frame bevel-in" style="background:#c0c0c0">
               <div class="mine-head bevel-in">
                 <div class="mine-counter" id="ms-mines">010</div>
                 <div class="mine-face" id="ms-face">🙂</div>
                 <div class="mine-counter" id="ms-time">000</div>
               </div>
               <div class="mine-grid bevel-in" id="ms-grid"></div>
             </div>
           </div>`;
        const gridEl = $("#ms-grid", body), faceEl = $("#ms-face", body), minesEl = $("#ms-mines", body), timeEl = $("#ms-time", body);

        $('[data-m="game"]', body).addEventListener("click", (e) => {
          const r = e.target.getBoundingClientRect();
          openDropdown([
            { label: "新規ゲーム", action: () => reset() },
            "---",
            { label: (level === "easy" ? "● " : "　") + "初級 (9×9, 10)", action: () => { level = "easy"; reset(); } },
            { label: (level === "med" ? "● " : "　") + "中級 (16×16, 40)", action: () => { level = "med"; reset(); } },
            { label: (level === "hard" ? "● " : "　") + "上級 (16×30, 99)", action: () => { level = "hard"; reset(); } },
          ], r.left, r.bottom);
        });
        $('[data-m="help"]', body).addEventListener("click", (e) => {
          const r = e.target.getBoundingClientRect();
          openDropdown([{ label: "遊び方", action: () => alertBox("左クリック: 開く<br>右クリック: 旗 / ? を立てる<br>数字: 周囲8マスの地雷数<br>地雷以外を全部開けたら勝ち！", "マインスイーパーの遊び方") }], r.left, r.bottom);
        });
        faceEl.addEventListener("click", () => reset());

        function setCounter(elm, v) { elm.textContent = String(Math.max(-99, Math.min(999, v))).replace("-", "-").padStart(3, v < 0 ? "" : "0"); if (v < 0) elm.textContent = "-" + String(Math.abs(v)).padStart(2, "0"); }

        function reset() {
          const L = LEVELS[level]; rows = L.r; cols = L.c; mines = L.m;
          grid = []; started = false; dead = false; won = false; flags = 0; revealed = 0; timer = 0;
          clearInterval(tInt); timeEl.textContent = "000";
          faceEl.textContent = "🙂";
          setCounter(minesEl, mines);
          for (let r = 0; r < rows; r++) { grid[r] = []; for (let c = 0; c < cols; c++) grid[r][c] = { mine: false, n: 0, open: false, flag: 0 }; }
          gridEl.style.gridTemplateColumns = `repeat(${cols}, 20px)`;
          gridEl.innerHTML = "";
          for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
            const cell = el("div", "mine-cell"); cell.dataset.r = r; cell.dataset.c = c;
            gridEl.appendChild(cell);
          }
          // resize window to fit
          win.el.style.width = (cols * 20 + 30) + "px";
          win.el.style.height = (rows * 20 + 120) + "px";
        }

        function placeMines(sr, sc) {
          let placed = 0;
          while (placed < mines) {
            const r = Math.floor(Math.random() * rows), c = Math.floor(Math.random() * cols);
            if (grid[r][c].mine) continue;
            if (Math.abs(r - sr) <= 1 && Math.abs(c - sc) <= 1) continue; // 初回は安全
            grid[r][c].mine = true; placed++;
          }
          for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
            if (grid[r][c].mine) continue;
            let n = 0; neigh(r, c, (rr, cc) => { if (grid[rr][cc].mine) n++; });
            grid[r][c].n = n;
          }
        }
        function neigh(r, c, fn) {
          for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
            if (!dr && !dc) continue;
            const rr = r + dr, cc = c + dc;
            if (rr >= 0 && rr < rows && cc >= 0 && cc < cols) fn(rr, cc);
          }
        }
        function cellEl(r, c) { return gridEl.children[r * cols + c]; }
        function startTimer() { tInt = setInterval(() => { timer++; timeEl.textContent = String(Math.min(999, timer)).padStart(3, "0"); }, 1000); }

        function open(r, c) {
          const g = grid[r][c];
          if (g.open || g.flag === 1 || dead || won) return;
          if (!started) { started = true; placeMines(r, c); startTimer(); }
          g.open = true; revealed++;
          const ce = cellEl(r, c); ce.classList.add("revealed");
          if (g.mine) { ce.classList.add("mine"); ce.textContent = "💣"; return lose(r, c); }
          if (g.n > 0) { ce.textContent = g.n; ce.classList.add("mine-c" + g.n); }
          else { ce.textContent = ""; neigh(r, c, (rr, cc) => open(rr, cc)); }
          checkWin();
        }
        function chord(r, c) {
          const g = grid[r][c];
          if (!g.open || g.n === 0) return;
          let f = 0; neigh(r, c, (rr, cc) => { if (grid[rr][cc].flag === 1) f++; });
          if (f === g.n) neigh(r, c, (rr, cc) => { if (grid[rr][cc].flag !== 1) open(rr, cc); });
        }
        function toggleFlag(r, c) {
          const g = grid[r][c];
          if (g.open || dead || won) return;
          g.flag = (g.flag + 1) % 3; // 0 none, 1 flag, 2 question
          const ce = cellEl(r, c);
          ce.textContent = g.flag === 1 ? "🚩" : g.flag === 2 ? "❓" : "";
          flags += g.flag === 1 ? 1 : g.flag === 2 ? -1 : 0;
          setCounter(minesEl, mines - flags);
        }
        function lose(sr, sc) {
          dead = true; clearInterval(tInt); faceEl.textContent = "😵"; Sound.boom();
          for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
            const g = grid[r][c], ce = cellEl(r, c);
            if (g.mine && g.flag !== 1) { ce.classList.add("revealed"); ce.textContent = "💣"; }
            if (!g.mine && g.flag === 1) { ce.classList.add("revealed"); ce.textContent = "❌"; }
          }
          cellEl(sr, sc).classList.add("mine");
        }
        function checkWin() {
          if (revealed === rows * cols - mines && !dead) {
            won = true; clearInterval(tInt); faceEl.textContent = "😎"; Sound.tada();
            for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
              if (grid[r][c].mine && grid[r][c].flag !== 1) { grid[r][c].flag = 1; cellEl(r, c).textContent = "🚩"; }
            }
            setCounter(minesEl, 0);
            setTimeout(() => alertBox(`🎉 クリア！<br>タイム: ${timer} 秒`, "勝利！"), 200);
          }
        }

        gridEl.addEventListener("mousedown", (ev) => {
          const t = ev.target.closest(".mine-cell"); if (!t) return;
          if (!dead && !won) faceEl.textContent = "😮";
        });
        document.addEventListener("mouseup", () => { if (!dead && !won) faceEl.textContent = "🙂"; });
        gridEl.addEventListener("click", (ev) => {
          const t = ev.target.closest(".mine-cell"); if (!t) return;
          const r = +t.dataset.r, c = +t.dataset.c;
          if (grid[r][c].open) chord(r, c); else open(r, c);
        });
        gridEl.addEventListener("contextmenu", (ev) => {
          ev.preventDefault();
          const t = ev.target.closest(".mine-cell"); if (!t) return;
          toggleFlag(+t.dataset.r, +t.dataset.c);
        });

        reset();
      },
    });
  },
};

/* ---------- メモ帳 ---------- */
const README_TEXT =
`         ★ RetroDesk 95 へようこそ ★

このデスクトップは静的な HTML / CSS / JS だけで
動く Windows 95 風の環境です。ビルドは不要、
index.html を開くだけで動きます。

【できること】
 ・デスクトップアイコンをダブルクリックでアプリ起動
 ・アイコンはドラッグで移動、ごみ箱へ捨てて削除
 ・ウィンドウは移動 / 最小化 / 最大化 / 閉じる
 ・タスクバーとスタートメニュー、右下に時計
 ・ペイント / マインスイーパー / メモ帳

【メモ帳の保存】
 [ファイル]→[保存] で内容は localStorage に保存され、
 次に開いたとき自動で復元されます。

【ちょっとした遊び】
 ・60秒放置でスクリーンセーバー
 ・↑↑↓↓←→←→ B A でなにかが起きる…?
 ・スタートメニューにも仕掛けがあります

                         — RetroDesk 開発チーム`;

APPS.notepad = {
  title: "メモ帳", icon: "notepad",
  open(arg) {
    arg = arg || {};
    const isReadme = !!arg.readme;
    const storeKey = arg.key || "notepad";
    const fileName = arg.name || (isReadme ? "はじめにお読みください.txt" : "無題.txt");
    let wrap = store.get(storeKey + ".wrap", true);

    WM.create({
      title: fileName + " - メモ帳", icon: "notepad", width: 480, height: 360, minW: 260, minH: 160, appKey: "notepad",
      build(body, win) {
        body.innerHTML =
          `<div class="notepad-app">
             <div class="menubar"><div class="menu-item" data-m="file">ファイル</div><div class="menu-item" data-m="edit">編集</div><div class="menu-item" data-m="format">書式</div><div class="menu-item" data-m="help">ヘルプ</div></div>
             <textarea class="notepad-text" spellcheck="false"></textarea>
             <div class="notepad-status"></div>
           </div>`;
        const ta = $(".notepad-text", body), status = $(".notepad-status", body);
        ta.wrap = wrap ? "soft" : "off";
        ta.style.whiteSpace = wrap ? "pre-wrap" : "pre";
        const saved = store.get(storeKey + ".text", null);
        ta.value = isReadme ? README_TEXT : (saved != null ? saved : "");
        if (isReadme) status.textContent = "読み取り専用ではありません — 自由に編集できます";

        function save() {
          store.set(storeKey + ".text", ta.value);
          status.textContent = "保存しました (" + new Date().toLocaleTimeString("ja-JP") + ")";
          Sound.click();
        }
        function updateStatus() {
          const lines = ta.value.split("\n").length;
          status.textContent = `${ta.value.length} 文字 / ${lines} 行`;
        }
        ta.addEventListener("input", updateStatus);
        updateStatus();

        $('[data-m="file"]', body).addEventListener("click", (e) => {
          const r = e.target.getBoundingClientRect();
          openDropdown([
            { label: "新規", action: () => { if (ta.value && ta.value !== README_TEXT) { confirmBox("変更を保存しますか?").then((y) => { if (y) save(); ta.value = ""; updateStatus(); }); } else { ta.value = ""; updateStatus(); } } },
            { label: "保存          Ctrl+S", action: save },
            "---",
            { label: "閉じる", action: () => WM.close(win) },
          ], r.left, r.bottom);
        });
        $('[data-m="edit"]', body).addEventListener("click", (e) => {
          const r = e.target.getBoundingClientRect();
          openDropdown([
            { label: "すべて選択", action: () => { ta.focus(); ta.select(); } },
            { label: "時刻を挿入", action: () => { const p = ta.selectionStart; ta.value = ta.value.slice(0, p) + new Date().toLocaleString("ja-JP") + ta.value.slice(p); updateStatus(); } },
          ], r.left, r.bottom);
        });
        $('[data-m="format"]', body).addEventListener("click", (e) => {
          const r = e.target.getBoundingClientRect();
          openDropdown([
            { label: (wrap ? "● " : "　") + "右端で折り返す", action: () => { wrap = !wrap; store.set(storeKey + ".wrap", wrap); ta.wrap = wrap ? "soft" : "off"; ta.style.whiteSpace = wrap ? "pre-wrap" : "pre"; } },
          ], r.left, r.bottom);
        });
        $('[data-m="help"]', body).addEventListener("click", (e) => {
          const r = e.target.getBoundingClientRect();
          openDropdown([{ label: "メモ帳について", action: () => alertBox("RetroDesk メモ帳<br>内容は localStorage に保存され、次回自動で復元されます。", "メモ帳について") }], r.left, r.bottom);
        });

        ta.addEventListener("keydown", (e) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") { e.preventDefault(); save(); } });
        setTimeout(() => ta.focus(), 0);
      },
    });
  },
};

/* ---------- ごみ箱 ---------- */
APPS.recycle = {
  title: "ごみ箱", icon: "recycle",
  open() {
    WM.create({
      title: "ごみ箱", icon: "recycle", width: 420, height: 300, appKey: "recycle",
      build(body, win) {
        win._isRecycle = true;
        function render() {
          const recycled = Desktop.getDeleted();
          body.innerHTML =
            `<div style="display:flex;flex-direction:column;height:100%">
               <div class="menubar"><div class="menu-item" data-m="file">ファイル</div></div>
               <div class="bevel-in" style="flex:1;overflow:auto;background:#fff;margin:2px;padding:6px;display:flex;flex-wrap:wrap;align-content:flex-start;gap:10px">
                 ${recycled.length ? "" : '<div style="color:#666;padding:20px">ごみ箱は空です。<br><br>デスクトップのアイコンをここへドラッグすると削除できます。</div>'}
               </div>
               <div style="padding:4px;display:flex;gap:6px;justify-content:flex-end">
                 <button class="w95-btn" id="rb-restore-all">すべて元に戻す</button>
                 <button class="w95-btn" id="rb-empty">ごみ箱を空にする</button>
               </div>
             </div>`;
          const list = $(".bevel-in", body);
          recycled.forEach((ic) => {
            const item = el("div", "desktop-icon", `<img class="icon-img" src="${iconFor(ic.icon)}"><div class="icon-label" style="color:#000;text-shadow:none">${ic.label}</div>`);
            item.style.position = "static";
            item.title = "ダブルクリックで元に戻す";
            item.addEventListener("dblclick", () => { Desktop.restore(ic.id); render(); });
            item.addEventListener("click", () => { $$(".desktop-icon", list).forEach((x) => x.classList.remove("selected")); item.classList.add("selected"); });
            list.appendChild(item);
          });
          $("#rb-restore-all", body).addEventListener("click", () => { Desktop.getDeleted().slice().forEach((ic) => Desktop.restore(ic.id)); render(); });
          $("#rb-empty", body).addEventListener("click", () => {
            if (!Desktop.getDeleted().length) return alertBox("ごみ箱は空です。", "ごみ箱");
            confirmBox("ごみ箱を空にしますか?<br>アイコンは完全に削除されます。", "ごみ箱を空にする").then((y) => { if (y) { Desktop.empty(); render(); } });
          });
          $('[data-m="file"]', body).addEventListener("click", (e) => {
            const r = e.target.getBoundingClientRect();
            openDropdown([{ label: "ごみ箱を空にする", action: () => $("#rb-empty", body).click() }, "---", { label: "閉じる", action: () => WM.close(win) }], r.left, r.bottom);
          });
        }
        win._render = render;
        render();
      },
    });
  },
};

/* ---------- マイ コンピュータ ---------- */
APPS.mycomputer = {
  title: "マイ コンピュータ", icon: "computer",
  open() {
    WM.create({
      title: "マイ コンピュータ", icon: "computer", width: 460, height: 320, appKey: "mycomputer",
      build(body) {
        const items = [
          { icon: "drive", label: "ローカル ディスク (C:)", action: () => alertBox("ローカル ディスク (C:)<br>空き容量: 2.0 GB / 2.1 GB<br>※レトロ容量です", "C:") },
          { icon: "drive", label: "3.5 インチ FD (A:)", action: () => alertBox("ドライブ A: の準備ができていません。", "エラー", "⚠️") },
          { icon: "folder", label: "コントロール パネル", action: () => APPS.controls.open() },
          { icon: "paint", label: "ペイント", action: () => APPS.paint.open() },
          { icon: "mine", label: "マインスイーパー", action: () => APPS.mines.open() },
          { icon: "notepad", label: "メモ帳", action: () => APPS.notepad.open() },
        ];
        body.innerHTML = `<div class="bevel-in" style="height:100%;background:#fff;overflow:auto;padding:10px;display:flex;flex-wrap:wrap;align-content:flex-start;gap:14px"></div>`;
        const wrap = $(".bevel-in", body);
        items.forEach((it) => {
          const d = el("div", "desktop-icon", `<img class="icon-img" src="${iconFor(it.icon)}"><div class="icon-label" style="color:#000;text-shadow:none">${it.label}</div>`);
          d.style.position = "static";
          d.addEventListener("dblclick", it.action);
          d.addEventListener("click", () => { $$(".desktop-icon", wrap).forEach((x) => x.classList.remove("selected")); d.classList.add("selected"); });
          wrap.appendChild(d);
        });
      },
    });
  },
};

/* ---------- コントロール パネル ---------- */
APPS.controls = {
  title: "コントロール パネル", icon: "folder",
  open() {
    WM.create({
      title: "コントロール パネル", icon: "folder", width: 360, height: 260, appKey: "controls",
      build(body) {
        body.innerHTML = `<div class="app-pad"><h2>🎛️ コントロール パネル</h2></div>`;
        const pad = $(".app-pad", body);
        const sndBtn = el("button", "w95-btn", "サウンド: " + (Sound.on ? "ON 🔊" : "OFF 🔇"));
        sndBtn.style.display = "block"; sndBtn.style.margin = "6px 0"; sndBtn.style.minWidth = "180px";
        sndBtn.addEventListener("click", () => { const on = Sound.toggle(); sndBtn.textContent = "サウンド: " + (on ? "ON 🔊" : "OFF 🔇"); });
        pad.appendChild(sndBtn);

        const ssBtn = el("button", "w95-btn", "スクリーンセーバーを起動 🌌");
        ssBtn.style.display = "block"; ssBtn.style.margin = "6px 0"; ssBtn.style.minWidth = "180px";
        ssBtn.addEventListener("click", () => Screensaver.start());
        pad.appendChild(ssBtn);

        const rstBtn = el("button", "w95-btn", "デスクトップを初期化 ♻️");
        rstBtn.style.display = "block"; rstBtn.style.margin = "6px 0"; rstBtn.style.minWidth = "180px";
        rstBtn.addEventListener("click", () => confirmBox("アイコン配置・ごみ箱・保存データを初期化します。よろしいですか?", "初期化").then((y) => {
          if (y) { ["icons"].forEach((k) => store.del(k)); store.del("notepad.text"); location.reload(); }
        }));
        pad.appendChild(rstBtn);

        pad.appendChild(el("p", null, "<br>RetroDesk 95 — 設定はブラウザの localStorage に保存されます。"));
      },
    });
  },
};

/* ---------- 情報 ---------- */
APPS.about = {
  title: "RetroDesk について", icon: "info",
  open() {
    WM.create({
      title: "RetroDesk について", icon: "info", width: 380, height: 280, resizable: false, appKey: "about",
      build(body) {
        body.innerHTML =
          `<div class="app-pad" style="text-align:center">
             <div style="margin:6px auto 12px"><img src="${iconFor("info")}" style="width:48px;height:48px"></div>
             <h2 style="text-align:center">RetroDesk 95</h2>
             <p>Version 1.0 — ブラウザで動く Windows 95 風デスクトップ</p>
             <p style="color:#555;font-size:11px">HTML + CSS + JavaScript のみ / ビルド不要<br>外部ライブラリ・CDN 不使用</p>
             <hr style="border:0;border-top:1px solid #808080;border-bottom:1px solid #fff;margin:12px 24px">
             <p style="font-size:11px">物理メモリ: 640 KB（誰にとっても十分）<br>プロセッサ: RetroCPU 486DX</p>
             <p id="about-egg" style="font-size:11px;color:#008080;cursor:default">© 1995–2026 RetroDesk</p>
           </div>`;
        let clicks = 0;
        $("#about-egg", body).addEventListener("click", () => { if (++clicks >= 3) BSOD.show(); });
      },
    });
  },
};

/* ============================================================
   6. デスクトップアイコン + ごみ箱ロジック
   ============================================================ */
const Desktop = (() => {
  const DEFAULTS = [
    { id: "mycomputer", label: "マイ コンピュータ", icon: "computer", app: "mycomputer", deletable: false, x: 18, y: 16 },
    { id: "recycle", label: "ごみ箱", icon: "recycle", app: "recycle", deletable: false, x: 18, y: 110 },
    { id: "paint", label: "ペイント", icon: "paint", app: "paint", x: 18, y: 204 },
    { id: "mines", label: "マインスイーパー", icon: "mine", app: "mines", x: 18, y: 298 },
    { id: "notepad", label: "メモ帳", icon: "notepad", app: "notepad", x: 18, y: 392 },
    { id: "readme", label: "はじめにお読みください", icon: "txt", app: "notepad", arg: { readme: true, name: "はじめにお読みください.txt", key: "readme" }, x: 18, y: 486 },
    { id: "about", label: "RetroDesk について", icon: "info", app: "about", x: 110, y: 16 },
  ];
  let icons = [];

  function load() {
    const saved = store.get("icons", {});
    icons = DEFAULTS.map((d) => {
      const s = saved[d.id] || {};
      return Object.assign({}, d, { x: s.x != null ? s.x : d.x, y: s.y != null ? s.y : d.y, deleted: !!s.deleted, purged: !!s.purged });
    });
  }
  function persist() {
    const obj = {};
    icons.forEach((i) => { obj[i.id] = { x: i.x, y: i.y, deleted: i.deleted, purged: i.purged }; });
    store.set("icons", obj);
  }
  function recycleIconEl() {
    return $$(".desktop-icon", desktop).find((e) => e.dataset.id === "recycle");
  }
  function updateBin() {
    const binIcon = icons.find((i) => i.id === "recycle");
    const hasItems = icons.some((i) => i.deleted && !i.purged);
    const elc = recycleIconEl();
    if (elc) $(".icon-img", elc).src = iconFor(hasItems ? "recyclefull" : "recycle");
    binIcon.icon = hasItems ? "recyclefull" : "recycle";
  }

  function render() {
    $$(".desktop-icon", desktop).forEach((e) => e.remove());
    icons.filter((i) => !i.deleted).forEach((ic) => {
      const node = el("div", "desktop-icon", `<img class="icon-img" src="${iconFor(ic.icon)}" alt=""><div class="icon-label">${ic.label}</div>`);
      node.dataset.id = ic.id;
      node.style.left = ic.x + "px"; node.style.top = ic.y + "px";
      desktop.appendChild(node);
      wireIcon(node, ic);
    });
    updateBin();
  }

  function wireIcon(node, ic) {
    node.addEventListener("dblclick", () => launch(ic));
    node.addEventListener("mousedown", (e) => {
      if (e.button !== 0) return;
      // select
      $$(".desktop-icon.selected", desktop).forEach((x) => x.classList.remove("selected"));
      node.classList.add("selected");
      startDrag(node, ic, e);
    });
    node.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      const items = [{ label: "開く", action: () => launch(ic) }];
      if (ic.deletable !== false) items.push("---", { label: "削除", action: () => del(ic.id) });
      if (ic.id === "recycle") items.push({ label: "ごみ箱を空にする", action: () => empty() });
      contextMenu(items, e.clientX, e.clientY);
    });
  }

  function startDrag(node, ic, e) {
    const sx = e.clientX, sy = e.clientY;
    const ox = ic.x, oy = ic.y;
    let moved = false;
    const move = (ev) => {
      const dx = ev.clientX - sx, dy = ev.clientY - sy;
      if (!moved && Math.abs(dx) + Math.abs(dy) < 4) return;
      moved = true;
      const dr = desktop.getBoundingClientRect();
      node.style.left = clamp(ox + dx, 0, dr.width - 76) + "px";
      node.style.top  = clamp(oy + dy, 0, dr.height - 76) + "px";
      // highlight recycle if hovering
      const bin = recycleIconEl();
      if (bin && bin !== node) {
        const over = overlap(node, bin);
        bin.classList.toggle("drag-over", over && ic.deletable !== false);
      }
    };
    const up = (ev) => {
      document.removeEventListener("mousemove", move);
      document.removeEventListener("mouseup", up);
      const bin = recycleIconEl();
      if (bin) bin.classList.remove("drag-over");
      if (!moved) return;
      // dropped on recycle?
      if (bin && bin !== node && ic.deletable !== false && overlap(node, bin)) {
        del(ic.id);
        return;
      }
      ic.x = parseInt(node.style.left); ic.y = parseInt(node.style.top);
      persist();
    };
    document.addEventListener("mousemove", move);
    document.addEventListener("mouseup", up);
  }

  function overlap(a, b) {
    const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
    return !(ra.right < rb.left + 10 || ra.left > rb.right - 10 || ra.bottom < rb.top + 10 || ra.top > rb.bottom - 10);
  }

  function launch(ic) {
    const app = APPS[ic.app];
    if (app) app.open(ic.arg);
  }

  function del(id) {
    const ic = icons.find((i) => i.id === id);
    if (!ic || ic.deletable === false) return;
    ic.deleted = true; ic.purged = false; persist(); render();
    Sound.close();
    refreshRecycleWindows();
  }
  function restore(id) {
    const ic = icons.find((i) => i.id === id);
    if (!ic) return;
    ic.deleted = false; ic.purged = false; persist(); render();
    refreshRecycleWindows();
  }
  function empty() {
    icons.forEach((i) => { if (i.deleted) i.purged = true; });
    persist();
    refreshRecycleWindows();
    updateBin();
  }
  function getDeleted() { return icons.filter((i) => i.deleted && !i.purged); }
  function refreshRecycleWindows() {
    WM.windows.forEach((w) => { if (w._isRecycle && w._render) w._render(); });
  }
  function alignIcons() {
    let x = 18, y = 16;
    icons.filter((i) => !i.deleted).forEach((ic) => {
      ic.x = x; ic.y = y; y += 94;
      const dr = desktop.getBoundingClientRect();
      if (y > dr.height - 90) { y = 16; x += 92; }
    });
    persist(); render();
  }

  return { load, render, launch, del, restore, empty, getDeleted, alignIcons, all: () => icons };
})();

/* ============================================================
   7. タスクバー時計 + スタートメニュー
   ============================================================ */
function tickClock() {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  const c = $("#clock");
  c.textContent = hh + ":" + mm;
  c.title = now.toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric", weekday: "long" });
}
$("#clock").addEventListener("click", () => {
  const now = new Date();
  alertBox(now.toLocaleString("ja-JP", { dateStyle: "full", timeStyle: "medium" }), "日付と時刻", "🕒");
});

const startMenu = $("#start-menu"), startBtn = $("#start-button");
function buildStartMenu() {
  const items = $(".start-items", startMenu);
  items.innerHTML = "";
  const def = [
    { icon: "run", label: "プログラム", sub: [
      { icon: "paint", label: "ペイント", action: () => APPS.paint.open() },
      { icon: "mine", label: "マインスイーパー", action: () => APPS.mines.open() },
      { icon: "notepad", label: "メモ帳", action: () => APPS.notepad.open() },
      { icon: "computer", label: "マイ コンピュータ", action: () => APPS.mycomputer.open() },
    ] },
    { icon: "folder", label: "設定", sub: [
      { icon: "folder", label: "コントロール パネル", action: () => APPS.controls.open() },
    ] },
    { icon: "saver", label: "スクリーンセーバー", action: () => Screensaver.start() },
    { icon: "help", label: "ヘルプ", action: () => APPS.notepad.open({ readme: true, name: "はじめにお読みください.txt", key: "readme" }) },
    { icon: "run", label: "ファイル名を指定して実行...", action: runDialog },
    "divider",
    { icon: "info", label: "RetroDesk について", action: () => APPS.about.open() },
    { icon: "shutdown", label: "Windows の終了...", action: shutdownDialog },
  ];
  def.forEach((it) => {
    if (it === "divider") { items.appendChild(el("div", "start-divider")); return; }
    const node = el("div", "start-item", `<img src="${iconFor(it.icon)}">${it.label}` + (it.sub ? '<span class="arrow">▸</span>' : ""));
    node.addEventListener("mouseenter", () => {
      // any item hover closes a previously open submenu
      $$(".submenu").forEach((s) => s.remove());
      $$(".start-item.open", startMenu).forEach((n) => n.classList.remove("open"));
      if (!it.sub) return;
      node.classList.add("open");
      const sm = el("div", "submenu open");
      it.sub.forEach((s) => {
        const si = el("div", "start-item", `<img src="${iconFor(s.icon)}">${s.label}`);
        si.addEventListener("click", () => { closeStartMenu(); s.action(); });
        sm.appendChild(si);
      });
      document.body.appendChild(sm);
      const r = node.getBoundingClientRect();
      sm.style.left = (r.right - 2) + "px";
      sm.style.top = r.top + "px";
      const sr = sm.getBoundingClientRect();
      if (sr.bottom > innerHeight) sm.style.top = (innerHeight - sr.height - 32) + "px";
    });
    if (!it.sub) node.addEventListener("click", () => { closeStartMenu(); it.action && it.action(); });
    items.appendChild(node);
  });
}
function toggleStartMenu() {
  const open = startMenu.classList.toggle("open");
  startBtn.classList.toggle("active", open);
  if (!open) $$(".submenu").forEach((s) => s.remove());
  Sound.click();
}
function closeStartMenu() {
  startMenu.classList.remove("open");
  startBtn.classList.remove("active");
  $$(".submenu").forEach((s) => s.remove());
}
startBtn.addEventListener("click", (e) => { e.stopPropagation(); toggleStartMenu(); });
document.addEventListener("mousedown", (e) => {
  if (!startMenu.contains(e.target) && !startBtn.contains(e.target) && !e.target.closest(".submenu")) closeStartMenu();
  if (!$("#context-menu").contains(e.target)) $("#context-menu").classList.remove("open");
});

function runDialog() {
  let captured = "";
  showDialog({
    title: "ファイル名を指定して実行", icon: "🏃", width: 360,
    message: `実行したいプログラム名を入力してください:<br><br><input id="run-input" class="bevel-in" style="width:100%;padding:3px;font-family:monospace" placeholder="paint / mines / notepad / explorer ...">`,
    buttons: [{ label: "OK", value: "ok", default: true }, { label: "キャンセル", value: false }],
  }).then((v) => {
    if (v !== "ok") return;
    runCommand(captured);
  });
  setTimeout(() => {
    const input = $("#run-input");
    if (!input) return;
    input.focus();
    input.addEventListener("input", () => { captured = input.value; });
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") { captured = input.value; const okBtn = $(".dialog-buttons .w95-btn"); if (okBtn) okBtn.click(); }
    });
  }, 30);
}
function runCommand(raw) {
  const cmd = (raw || "").trim().toLowerCase().replace(/\.exe$/, "");
  if (!cmd) return;
  const map = { paint: "paint", mspaint: "paint", mines: "mines", winmine: "mines", notepad: "notepad", explorer: "mycomputer", control: "controls" };
  if (map[cmd]) APPS[map[cmd]].open();
  else if (cmd === "bsod" || cmd === "crash") BSOD.show();
  else alertBox(`'${raw}' が見つかりません。<br>名前を正しく入力したか確認してください。`, "ファイル名を指定して実行", "⚠️");
}

function shutdownDialog() {
  showDialog({
    title: "Windows の終了", iconImg: "shutdown", width: 360,
    message: `<b>Windows を終了する準備ができました。</b><br><br>次の中から選んでください:`,
    buttons: [{ label: "電源を切る", value: "off", default: true }, { label: "再起動", value: "reboot" }, { label: "キャンセル", value: false }],
  }).then((v) => {
    if (v === "off") doShutdown(false);
    else if (v === "reboot") doShutdown(true);
  });
}
function doShutdown(reboot) {
  Sound.close();
  const sd = $("#shutdown");
  sd.classList.add("show");
  if (reboot) {
    setTimeout(() => location.reload(), 1200);
  } else {
    sd.querySelector(".sd-sub").textContent = "クリックすると再起動します";
    sd.addEventListener("click", () => location.reload(), { once: true });
  }
}

/* ============================================================
   8. デスクトップ操作（コンテキストメニュー / 範囲選択）
   ============================================================ */
desktop.addEventListener("contextmenu", (e) => {
  if (e.target.closest(".desktop-icon") || e.target.closest(".window")) return;
  e.preventDefault();
  contextMenu([
    { label: "アイコンの整列", action: () => Desktop.alignIcons() },
    { label: "最新の情報に更新", action: () => Desktop.render() },
    "---",
    { label: "新規作成", disabled: true },
    "---",
    { label: "スクリーンセーバーを開始", action: () => Screensaver.start() },
    { label: "プロパティ", action: () => APPS.about.open() },
  ], e.clientX, e.clientY);
});
// click empty desktop deselect
desktop.addEventListener("mousedown", (e) => {
  if (e.target === desktop || e.target.id === "rubber-band") {
    $$(".desktop-icon.selected", desktop).forEach((x) => x.classList.remove("selected"));
    if (e.button === 0) rubberBand(e);
  }
});
function rubberBand(e) {
  const band = $("#rubber-band");
  const dr = desktop.getBoundingClientRect();
  const sx = e.clientX - dr.left, sy = e.clientY - dr.top;
  band.style.display = "block";
  const move = (ev) => {
    const cx = ev.clientX - dr.left, cy = ev.clientY - dr.top;
    const x = Math.min(sx, cx), y = Math.min(sy, cy), w = Math.abs(cx - sx), h = Math.abs(cy - sy);
    band.style.left = x + "px"; band.style.top = y + "px"; band.style.width = w + "px"; band.style.height = h + "px";
    $$(".desktop-icon", desktop).forEach((ic) => {
      const r = ic.getBoundingClientRect();
      const ix = r.left - dr.left, iy = r.top - dr.top;
      const hit = !(ix > x + w || ix + r.width < x || iy > y + h || iy + r.height < y);
      ic.classList.toggle("selected", hit);
    });
  };
  const up = () => { band.style.display = "none"; band.style.width = band.style.height = "0px"; document.removeEventListener("mousemove", move); document.removeEventListener("mouseup", up); };
  document.addEventListener("mousemove", move);
  document.addEventListener("mouseup", up);
}

/* ============================================================
   9. スクリーンセーバー（放置60秒）
   ============================================================ */
const Screensaver = (() => {
  const wrap = $("#screensaver"), canvas = $("#screensaver canvas");
  let ctx, raf = null, idle = null, active = false, stars = [], logo = { x: 100, y: 100, vx: 2, vy: 1.6 };
  const IDLE_MS = 60000;

  function resize() { canvas.width = innerWidth; canvas.height = innerHeight; }
  function start() {
    if (active) return;
    active = true; wrap.classList.add("show"); resize();
    ctx = canvas.getContext("2d");
    stars = Array.from({ length: 200 }, () => ({ x: (Math.random() - 0.5) * canvas.width, y: (Math.random() - 0.5) * canvas.height, z: Math.random() * canvas.width }));
    loop();
  }
  function stop() {
    if (!active) return;
    active = false; wrap.classList.remove("show");
    if (raf) cancelAnimationFrame(raf);
  }
  function loop() {
    if (!active) return;
    const w = canvas.width, h = canvas.height, cx = w / 2, cy = h / 2;
    ctx.fillStyle = "rgba(0,0,0,0.35)"; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#fff";
    stars.forEach((s) => {
      s.z -= 6; if (s.z <= 0) { s.z = w; s.x = (Math.random() - 0.5) * w; s.y = (Math.random() - 0.5) * h; }
      const k = 128 / s.z, px = s.x * k + cx, py = s.y * k + cy;
      if (px < 0 || px >= w || py < 0 || py >= h) return;
      const sz = (1 - s.z / w) * 3;
      ctx.fillRect(px, py, sz, sz);
    });
    // bouncing logo
    logo.x += logo.vx; logo.y += logo.vy;
    if (logo.x < 0 || logo.x > w - 160) logo.vx *= -1;
    if (logo.y < 0 || logo.y > h - 60) logo.vy *= -1;
    ctx.font = "bold 34px 'MS Sans Serif', sans-serif";
    ctx.fillStyle = `hsl(${(Date.now() / 20) % 360}, 90%, 65%)`;
    ctx.fillText("RetroDesk 95", logo.x, logo.y + 34);
    raf = requestAnimationFrame(loop);
  }
  function resetIdle() { clearTimeout(idle); if (active) stop(); idle = setTimeout(start, IDLE_MS); }
  ["mousemove", "mousedown", "keydown", "touchstart", "wheel"].forEach((ev) => document.addEventListener(ev, resetIdle, { passive: true }));
  window.addEventListener("resize", () => { if (active) resize(); });
  wrap.addEventListener("mousedown", stop);
  return { start, stop, resetIdle };
})();

/* ============================================================
   10. BSOD イースターエッグ + コナミコマンド
   ============================================================ */
const BSOD = (() => {
  const elm = $("#bsod");
  function show() {
    elm.classList.add("show");
    Sound.error();
    const dismiss = () => { elm.classList.remove("show"); elm.removeEventListener("mousedown", dismiss); document.removeEventListener("keydown", dismiss); };
    setTimeout(() => { elm.addEventListener("mousedown", dismiss); document.addEventListener("keydown", dismiss); }, 400);
  }
  return { show };
})();
(() => {
  const seq = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"];
  let i = 0;
  document.addEventListener("keydown", (e) => {
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (k === seq[i]) { i++; if (i === seq.length) { i = 0; konami(); } }
    else { i = (k === seq[0]) ? 1 : 0; }
  });
  function konami() {
    Sound.tada();
    alertBox("🎮 隠しコマンド発動！<br>RetroDesk へようこそ、上級ユーザーさん。<br><br>ボーナス: スクリーンセーバーを起動します。", "★ SECRET ★").then(() => Screensaver.start());
  }
})();

/* ============================================================
   11. 起動シーケンス
   ============================================================ */
function boot() {
  const bootEl = $("#boot"), bar = $("#boot .boot-bar i");
  let p = 0;
  let done = false;
  function finish() {
    if (done) return; done = true;
    bootEl.style.transition = "opacity .4s"; bootEl.style.opacity = "0";
    setTimeout(() => { bootEl.style.display = "none"; }, 420);
    Sound.startup();
    Screensaver.resetIdle();
  }
  const iv = setInterval(() => {
    p += Math.random() * 18 + 6;
    bar.style.width = Math.min(100, p) + "%";
    if (p >= 100) { clearInterval(iv); setTimeout(finish, 350); }
  }, 180);
  // skip with double click / key
  bootEl.addEventListener("dblclick", () => { Sound.init(); clearInterval(iv); finish(); });
  document.addEventListener("keydown", function sk() { clearInterval(iv); finish(); document.removeEventListener("keydown", sk); }, { once: true });
}

/* ============================================================
   12. 初期化
   ============================================================ */
function init() {
  Desktop.load();
  Desktop.render();
  buildStartMenu();
  tickClock();
  setInterval(tickClock, 1000);
  boot();
  // first gesture initialises audio
  document.addEventListener("pointerdown", () => Sound.init(), { once: true });
  // global click sound on buttons
  document.addEventListener("click", (e) => { if (e.target.closest(".w95-btn,button.w95,.tb-btn,.start-item,.menu-item,.task-button,#start-button")) Sound.click(); });
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
else init();

/* helpers */
function hexToRgb(hex) {
  hex = hex.replace("#", "");
  if (hex.length === 3) hex = hex.split("").map((c) => c + c).join("");
  const n = parseInt(hex, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

})();
