'use strict';
/* ============================================================
   RetroDesk 95 — ウィンドウマネージャ
   ============================================================ */
const WM = (() => {
  const registry = new Map();   // appId -> 定義
  const windows = new Map();    // winId -> win
  let zTop = 10;
  let seq = 0;
  let openCount = 0;
  let active = null;

  const layer = () => document.getElementById('window-layer');
  const desktop = () => document.getElementById('desktop');
  const taskButtons = () => document.getElementById('task-buttons');
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  function register(id, def) {
    registry.set(id, Object.assign({ appId: id }, def));
  }

  function open(appId, arg) {
    const def = registry.get(appId);
    if (!def) return null;
    if (def.single !== false) {
      for (const w of windows.values()) {
        if (w.appId === appId) { restore(w); focus(w); return w; }
      }
    }
    return create(def, arg);
  }

  /* ---- ウィンドウ生成 ---- */
  function create(def, arg) {
    const win = {
      id: 'w' + (++seq),
      appId: def.appId || ('adhoc' + seq),
      def,
      minimized: false,
      maximized: false,
      prevRect: null,
      taskBtn: null,
      onBeforeClose: null,
      onClose: null,
    };

    const el = document.createElement('div');
    el.className = 'window';
    el.tabIndex = -1;
    el.innerHTML = `
      <div class="titlebar">
        <span class="titlebar-icon">${def.icon || Icons.logo}</span>
        <span class="titlebar-text"></span>
        <span class="titlebar-btns">
          ${def.dialog ? '' : `
            <button class="tbtn" data-act="min" title="最小化">${Icons.btnMin}</button>
            ${def.noMax ? '' : `<button class="tbtn" data-act="max" title="最大化">${Icons.btnMax}</button>`}
          `}
          <button class="tbtn tbtn-close" data-act="close" title="閉じる">${Icons.btnClose}</button>
        </span>
      </div>
      <div class="window-body"></div>
      ${def.resizable ? '<div class="resize-grip"></div>' : ''}
    `;
    win.el = el;
    win.titlebar = el.querySelector('.titlebar');
    win.titleText = el.querySelector('.titlebar-text');
    win.body = el.querySelector('.window-body');
    setTitle(win, def.title || 'ウィンドウ');

    if (def.width) el.style.width = def.width + 'px';
    if (def.height) el.style.height = def.height + 'px';

    layer().appendChild(el);
    windows.set(win.id, win);

    /* 位置: ダイアログは中央、通常はカスケード */
    requestAnimationFrame(() => {
      const dw = desktop().clientWidth, dh = desktop().clientHeight;
      const w = el.offsetWidth, h = el.offsetHeight;
      if (def.dialog || def.center) {
        el.style.left = Math.max(8, (dw - w) / 2) + 'px';
        el.style.top = Math.max(8, (dh - h) / 2.4) + 'px';
      } else {
        const off = (openCount++ % 8) * 26;
        el.style.left = clamp(34 + off, 0, Math.max(8, dw - w - 8)) + 'px';
        el.style.top = clamp(26 + off, 0, Math.max(8, dh - h - 8)) + 'px';
      }
    });

    /* フォーカス */
    el.addEventListener('pointerdown', () => focus(win), true);

    /* タイトルバーのボタン */
    el.querySelectorAll('.tbtn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const act = btn.dataset.act;
        if (act === 'min') minimize(win);
        else if (act === 'max') toggleMax(win);
        else if (act === 'close') close(win);
      });
      btn.addEventListener('pointerdown', e => e.stopPropagation());
    });

    /* タイトルバードラッグ */
    win.titlebar.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 || win.maximized || e.target.closest('.tbtn')) return;
      const sx = e.clientX, sy = e.clientY;
      const ol = el.offsetLeft, ot = el.offsetTop;
      win.titlebar.setPointerCapture(e.pointerId);
      const move = (ev) => {
        const dw = desktop().clientWidth, dh = desktop().clientHeight;
        el.style.left = clamp(ol + ev.clientX - sx, -el.offsetWidth + 64, dw - 64) + 'px';
        el.style.top = clamp(ot + ev.clientY - sy, 0, dh - 24) + 'px';
      };
      const up = () => {
        win.titlebar.removeEventListener('pointermove', move);
      };
      win.titlebar.addEventListener('pointermove', move);
      win.titlebar.addEventListener('pointerup', up, { once: true });
      win.titlebar.addEventListener('pointercancel', up, { once: true });
    });

    /* タイトルバーのダブルクリックで最大化 */
    if (!def.dialog && !def.noMax) {
      win.titlebar.addEventListener('dblclick', (e) => {
        if (!e.target.closest('.tbtn')) toggleMax(win);
      });
    }

    /* リサイズグリップ */
    const grip = el.querySelector('.resize-grip');
    if (grip) {
      grip.addEventListener('pointerdown', (e) => {
        if (e.button !== 0) return;
        e.stopPropagation();
        focus(win);
        const sx = e.clientX, sy = e.clientY;
        const sw = el.offsetWidth, sh = el.offsetHeight;
        grip.setPointerCapture(e.pointerId);
        const minW = def.minW || 220, minH = def.minH || 140;
        const move = (ev) => {
          el.style.width = Math.max(minW, sw + ev.clientX - sx) + 'px';
          el.style.height = Math.max(minH, sh + ev.clientY - sy) + 'px';
        };
        grip.addEventListener('pointermove', move);
        grip.addEventListener('pointerup', () => grip.removeEventListener('pointermove', move), { once: true });
      });
    }

    /* タスクバーボタン */
    if (!def.dialog) {
      const btn = document.createElement('button');
      btn.className = 'btn95 task-btn';
      btn.innerHTML = `<span class="tb-icon">${def.icon || Icons.logo}</span><span class="tb-label"></span>`;
      btn.querySelector('.tb-label').textContent = win.title;
      btn.addEventListener('click', () => {
        if (win.minimized) { restore(win); focus(win); }
        else if (active === win) minimize(win);
        else focus(win);
      });
      taskButtons().appendChild(btn);
      win.taskBtn = btn;
    }

    /* アプリ初期化 */
    if (def.init) def.init(win.body, win, arg);

    focus(win);
    return win;
  }

  function setTitle(win, text) {
    win.title = text;
    win.titleText.textContent = text;
    if (win.taskBtn) win.taskBtn.querySelector('.tb-label').textContent = text;
  }

  function focus(win) {
    if (!windows.has(win.id) || win.minimized) { refreshChrome(); return; }
    active = win;
    win.el.style.zIndex = ++zTop;
    refreshChrome();
  }

  function refreshChrome() {
    if (active && (!windows.has(active.id) || active.minimized)) active = null;
    for (const w of windows.values()) {
      w.el.classList.toggle('active', w === active);
      if (w.taskBtn) w.taskBtn.classList.toggle('pressed', w === active && !w.minimized);
    }
  }

  /* ---- 最小化(タスクバーへ吸い込まれるアニメーション) ---- */
  function minimize(win) {
    if (win.minimized || win.def.dialog) return;
    win.minimized = true;
    if (active === win) active = null;
    animateTo(win, true, () => { win.el.style.display = 'none'; });
    focusTopmost();
  }

  function restore(win) {
    if (!win.minimized) { if (win.el.style.display === 'none') win.el.style.display = ''; return; }
    win.minimized = false;
    win.el.style.display = '';
    animateTo(win, false);
    refreshChrome();
  }

  function animateTo(win, shrink, done) {
    const btn = win.taskBtn;
    if (!btn || !win.el.animate) { if (done) done(); return; }
    const br = btn.getBoundingClientRect();
    const wr = win.el.getBoundingClientRect();
    const dx = br.left + br.width / 2 - (wr.left + wr.width / 2);
    const dy = br.top + br.height / 2 - (wr.top + wr.height / 2);
    const small = { transform: `translate(${dx}px, ${dy}px) scale(.06)`, opacity: 0 };
    const big = { transform: 'translate(0,0) scale(1)', opacity: 1 };
    win.el.classList.add('animating');
    const anim = win.el.animate(shrink ? [big, small] : [small, big], { duration: 170, easing: 'ease-in' });
    anim.onfinish = () => {
      win.el.classList.remove('animating');
      if (done) done();
    };
  }

  /* ---- 最大化 ---- */
  function toggleMax(win) {
    if (win.def.noMax || win.def.dialog) return;
    const btn = win.el.querySelector('[data-act="max"]');
    if (!win.maximized) {
      win.prevRect = {
        l: win.el.offsetLeft, t: win.el.offsetTop,
        w: win.el.style.width, h: win.el.style.height,
      };
      win.maximized = true;
      win.el.classList.add('maximized');
      if (btn) { btn.innerHTML = Icons.btnRestore; btn.title = '元のサイズに戻す'; }
    } else {
      win.maximized = false;
      win.el.classList.remove('maximized');
      const r = win.prevRect;
      if (r) {
        win.el.style.left = r.l + 'px';
        win.el.style.top = r.t + 'px';
        win.el.style.width = r.w;
        win.el.style.height = r.h;
      }
      if (btn) { btn.innerHTML = Icons.btnMax; btn.title = '最大化'; }
    }
    focus(win);
  }

  /* ---- 閉じる ---- */
  function close(win, force) {
    if (!windows.has(win.id)) return;
    if (!force && win.onBeforeClose && win.onBeforeClose() === false) return;
    windows.delete(win.id);
    if (win.onClose) { try { win.onClose(); } catch (e) {} }
    if (win.def.onClose) { try { win.def.onClose(win); } catch (e) {} }
    win.el.remove();
    if (win.taskBtn) win.taskBtn.remove();
    if (active === win) active = null;
    focusTopmost();
  }

  function focusTopmost() {
    let top = null, topZ = -1;
    for (const w of windows.values()) {
      if (w.minimized) continue;
      const z = +w.el.style.zIndex || 0;
      if (z > topZ) { topZ = z; top = w; }
    }
    if (top) focus(top); else refreshChrome();
  }

  function isOpen(appId) {
    for (const w of windows.values()) if (w.appId === appId) return w;
    return null;
  }

  /* ============================================================
     メッセージボックス
     buttons: [{label, value, def}] / type: error|warn|info|question
     ============================================================ */
  const DLG_ICONS = {
    error: () => Icons.dlgError,
    warn: () => Icons.dlgWarn,
    info: () => Icons.dlgInfo,
    question: () => Icons.dlgQuestion,
  };

  function msgbox({ title = 'RetroDesk', text = '', type = 'info', buttons = [{ label: 'OK', value: 'ok', def: true }], onResult } = {}) {
    if (type === 'error' || type === 'warn') Sound.error(); else Sound.ding();
    const win = create({
      appId: 'msgbox',
      title,
      icon: Icons.logo,
      dialog: true,
    });
    const iconSvg = (DLG_ICONS[type] || DLG_ICONS.info)();
    win.body.innerHTML = `
      <div class="dlg-body">
        <span class="dlg-icon">${iconSvg}</span>
        <div class="dlg-text"></div>
      </div>
      <div class="dlg-buttons"></div>
    `;
    win.body.querySelector('.dlg-text').innerHTML = String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/\n/g, '<br>');
    const btnRow = win.body.querySelector('.dlg-buttons');
    let defBtn = null;
    buttons.forEach(b => {
      const btn = document.createElement('button');
      btn.className = 'btn95';
      btn.textContent = b.label;
      btn.addEventListener('click', () => {
        close(win, true);
        if (onResult) onResult(b.value);
      });
      btnRow.appendChild(btn);
      if (b.def || !defBtn) defBtn = btn;
    });
    win.el.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        close(win, true);
        if (onResult) onResult(null);
      }
    });
    requestAnimationFrame(() => defBtn && defBtn.focus());
    return win;
  }

  /* ============================================================
     アプリ用メニューバー
     spec: [{label, items:[{label, accel, onClick, sep, checked, disabled}]}]
     ============================================================ */
  function buildMenubar(spec) {
    const bar = document.createElement('div');
    bar.className = 'menubar';
    let openItem = null;

    const closeAll = () => {
      if (openItem) { openItem.classList.remove('open'); openItem = null; }
    };

    spec.forEach(menu => {
      const item = document.createElement('div');
      item.className = 'menubar-item';
      item.textContent = menu.label;
      const drop = document.createElement('div');
      drop.className = 'menu-drop';
      item.appendChild(drop);

      const build = () => {
        drop.innerHTML = '';
        menu.items.forEach(it => {
          if (it.sep) {
            const s = document.createElement('div');
            s.className = 'menu-sep';
            drop.appendChild(s);
            return;
          }
          const e = document.createElement('div');
          e.className = 'menu-entry';
          const disabled = typeof it.disabled === 'function' ? it.disabled() : it.disabled;
          if (disabled) e.classList.add('disabled');
          const checked = typeof it.checked === 'function' ? it.checked() : it.checked;
          e.innerHTML = `${checked ? '<span class="check">✓</span>' : ''}<span></span>${it.accel ? `<span class="accel">${it.accel}</span>` : ''}`;
          e.querySelector('span:not(.check):not(.accel)').textContent = it.label;
          if (!disabled) {
            e.addEventListener('click', (ev) => {
              ev.stopPropagation();
              closeAll();
              it.onClick && it.onClick();
            });
          }
          drop.appendChild(e);
        });
      };

      item.addEventListener('pointerdown', (e) => {
        if (e.target.closest('.menu-drop')) return;
        e.stopPropagation();
        if (openItem === item) { closeAll(); return; }
        closeAll();
        build();
        item.classList.add('open');
        openItem = item;
      });
      item.addEventListener('pointerenter', () => {
        if (openItem && openItem !== item) {
          closeAll();
          build();
          item.classList.add('open');
          openItem = item;
        }
      });
      bar.appendChild(item);
    });

    document.addEventListener('pointerdown', (e) => {
      if (!bar.contains(e.target)) closeAll();
    });
    return bar;
  }

  return {
    register, open, create, close, focus, minimize, restore, toggleMax,
    setTitle, msgbox, buildMenubar, isOpen,
    get activeWindow() { return active; },
  };
})();
