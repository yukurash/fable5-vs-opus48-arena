'use strict';
/* ============================================================
   RetroDesk 95 — デスクトップ・タスクバー・起動/終了・演出
   ============================================================ */

/* ============================================================
   デスクトップアイコン
   ============================================================ */
const Desktop = (() => {
  const KEY = 'retrodesk.desktop.v1';
  const GRID_W = 80, GRID_H = 88, ORIGIN_X = 8, ORIGIN_Y = 6;

  /* 既定のアイコン(col, row は初期配置) */
  const DEFS = [
    { id: 'computer', label: 'マイ コンピュータ', icon: 'computer', app: 'computer', col: 0, row: 0, protected: true },
    { id: 'notepad', label: 'メモ帳', icon: 'notepad', app: 'notepad', col: 0, row: 1 },
    { id: 'paint', label: 'ペイント', icon: 'paint', app: 'paint', col: 0, row: 2 },
    { id: 'mines', label: 'マインスイーパー', icon: 'mines', app: 'mines', col: 0, row: 3 },
    { id: 'internet', label: 'インターネット', icon: 'internet', app: 'internet', col: 0, row: 4 },
    { id: 'secret', label: 'README.txt', icon: 'doc', app: 'secret', col: 1, row: 0 },
    { id: 'bin', label: 'ごみ箱', icon: 'bin', app: 'bin', col: 0, row: 6, protected: true, isBin: true },
  ];

  let state = load();
  let binNode = null;
  const layer = () => document.getElementById('icon-layer');

  function load() {
    try {
      const s = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (s && s.pos) return { pos: s.pos, deleted: s.deleted || [], purged: s.purged || [] };
    } catch (e) {}
    return { pos: {}, deleted: [], purged: [] };
  }
  function save() { localStorage.setItem(KEY, JSON.stringify(state)); }

  const cellXY = (c, r) => [ORIGIN_X + c * GRID_W, ORIGIN_Y + r * GRID_H];
  const posOf = (def) => state.pos[def.id] || [def.col, def.row];
  const visibleDefs = () => DEFS.filter(d => !state.deleted.includes(d.id) && !state.purged.includes(d.id));

  function gridDims() {
    const d = document.getElementById('desktop');
    return {
      cols: Math.max(1, Math.floor((d.clientWidth - ORIGIN_X) / GRID_W)),
      rows: Math.max(1, Math.floor((d.clientHeight - ORIGIN_Y) / GRID_H)),
    };
  }

  function findFreeCell(prefC, prefR, exceptId) {
    const { cols, rows } = gridDims();
    const used = new Set(
      visibleDefs().filter(d => d.id !== exceptId).map(d => posOf(d).join(','))
    );
    prefC = Math.max(0, Math.min(cols - 1, prefC));
    prefR = Math.max(0, Math.min(rows - 1, prefR));
    if (!used.has(prefC + ',' + prefR)) return [prefC, prefR];
    let best = null, bestD = Infinity;
    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        if (used.has(c + ',' + r)) continue;
        const d = (c - prefC) ** 2 + (r - prefR) ** 2;
        if (d < bestD) { bestD = d; best = [c, r]; }
      }
    }
    return best || [prefC, prefR];
  }

  function render() {
    layer().innerHTML = '';
    binNode = null;
    visibleDefs().forEach(def => {
      const node = document.createElement('div');
      node.className = 'dicon';
      node.dataset.id = def.id;
      const iconSvg = def.isBin
        ? (state.deleted.length ? Icons.binFull : Icons.bin)
        : (Icons[def.icon] || Icons.doc);
      node.innerHTML = `<div class="dicon-img">${iconSvg}</div><span class="dicon-label"></span>`;
      node.querySelector('.dicon-label').textContent = def.label;
      const [c, r] = posOf(def);
      const [x, y] = cellXY(c, r);
      node.style.left = x + 'px';
      node.style.top = y + 'px';
      attach(node, def);
      layer().appendChild(node);
      if (def.isBin) binNode = node;
    });
  }

  function select(node) {
    layer().querySelectorAll('.dicon.selected').forEach(n => n.classList.remove('selected'));
    if (node) node.classList.add('selected');
  }

  const overBin = (x, y) => {
    if (!binNode) return false;
    const r = binNode.getBoundingClientRect();
    return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
  };

  function attach(node, def) {
    node.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) { select(node); return; }
      select(node);
      const sx = e.clientX, sy = e.clientY;
      const ol = node.offsetLeft, ot = node.offsetTop;
      let dragging = false;
      node.setPointerCapture(e.pointerId);
      const move = (ev) => {
        const dx = ev.clientX - sx, dy = ev.clientY - sy;
        if (!dragging && Math.hypot(dx, dy) > 4) {
          dragging = true;
          node.classList.add('dragging');
        }
        if (dragging) {
          node.style.left = (ol + dx) + 'px';
          node.style.top = (ot + dy) + 'px';
          if (!def.isBin && binNode) {
            binNode.classList.toggle('drop-hover', overBin(ev.clientX, ev.clientY));
          }
        }
      };
      const up = (ev) => {
        node.removeEventListener('pointermove', move);
        if (binNode) binNode.classList.remove('drop-hover');
        if (!dragging) return;
        node.classList.remove('dragging');
        if (!def.isBin && overBin(ev.clientX, ev.clientY)) {
          if (def.protected) {
            const [c, r] = posOf(def);
            const [x, y] = cellXY(c, r);
            node.style.left = x + 'px';
            node.style.top = y + 'px';
            WM.msgbox({
              title: 'ごみ箱', type: 'warn',
              text: '「マイ コンピュータ」はシステム アイコンのため削除できません。',
            });
          } else {
            deleteIcon(def.id);
          }
          return;
        }
        // グリッドにスナップ
        const c = Math.round((node.offsetLeft - ORIGIN_X) / GRID_W);
        const r = Math.round((node.offsetTop - ORIGIN_Y) / GRID_H);
        const cell = findFreeCell(c, r, def.id);
        state.pos[def.id] = cell;
        save();
        const [x, y] = cellXY(cell[0], cell[1]);
        node.style.left = x + 'px';
        node.style.top = y + 'px';
      };
      node.addEventListener('pointermove', move);
      node.addEventListener('pointerup', up, { once: true });
      node.addEventListener('pointercancel', up, { once: true });
    });

    node.addEventListener('dblclick', () => WM.open(def.app));
    node.addEventListener('keydown', (e) => { if (e.key === 'Enter') WM.open(def.app); });
  }

  function notifyBin() {
    window.dispatchEvent(new CustomEvent('bin-changed'));
  }

  function deleteIcon(id) {
    if (!state.deleted.includes(id)) state.deleted.push(id);
    save();
    Sound.recycle();
    render();
    notifyBin();
  }

  function restoreIcon(id) {
    state.deleted = state.deleted.filter(x => x !== id);
    const def = DEFS.find(d => d.id === id);
    if (def) {
      const [c, r] = state.pos[id] || [def.col, def.row];
      state.pos[id] = findFreeCell(c, r, id);
    }
    save();
    render();
    notifyBin();
  }

  function purgeDeleted() {
    state.purged.push(...state.deleted);
    state.deleted = [];
    save();
    render();
    notifyBin();
  }

  function deletedList() {
    return DEFS.filter(d => state.deleted.includes(d.id));
  }

  function arrange() {
    state.pos = {};
    save();
    render();
  }

  function clearSelection() { select(null); }

  return { render, deleteIcon, restoreIcon, purgeDeleted, deletedList, arrange, clearSelection };
})();

/* ============================================================
   システム演出(BSOD / シャットダウン / スクリーンセーバー)
   ============================================================ */
const System = (() => {
  const bsodEl = () => document.getElementById('bsod');

  function showBsod() {
    const el = bsodEl();
    el.hidden = false;
    Sound.error();
    const dismiss = () => {
      el.hidden = true;
      document.removeEventListener('keydown', dismiss, true);
      el.removeEventListener('pointerdown', dismiss);
    };
    setTimeout(() => {
      document.addEventListener('keydown', dismiss, true);
      el.addEventListener('pointerdown', dismiss);
    }, 350);
  }

  function shutdown(mode) {
    Sound.shutdown();
    const black = document.createElement('div');
    black.style.cssText = 'position:fixed;inset:0;background:#000;z-index:10400;opacity:0;transition:opacity .9s;display:flex;align-items:center;justify-content:center;color:#bbb;font-size:15px;';
    black.textContent = 'RetroDesk を終了しています...';
    document.body.appendChild(black);
    requestAnimationFrame(() => { black.style.opacity = '1'; });
    setTimeout(() => {
      if (mode === 'reboot') {
        location.reload();
      } else {
        black.remove();
        const sd = document.getElementById('shutdown-screen');
        sd.hidden = false;
        sd.addEventListener('pointerdown', () => location.reload(), { once: true });
      }
    }, 1500);
  }

  /* ---- スクリーンセーバー ---- */
  const Saver = (() => {
    const IDLE_MS = 90 * 1000;
    let lastInput = Date.now();
    let activeFlag = false;
    let raf = null;
    let moveAccum = 0;

    const el = () => document.getElementById('screensaver');
    const canvas = () => document.getElementById('ss-canvas');

    function start() {
      if (activeFlag) return;
      activeFlag = true;
      moveAccum = 0;
      const e = el();
      e.hidden = false;
      const cv = canvas();
      cv.width = innerWidth;
      cv.height = innerHeight;
      const ctx = cv.getContext('2d');
      const stars = Array.from({ length: 260 }, () => ({
        x: (Math.random() - 0.5) * cv.width,
        y: (Math.random() - 0.5) * cv.height,
        z: Math.random() * cv.width,
      }));
      const logoText = 'RetroDesk 95';
      let lx = 80, ly = 80, vx = 1.6, vy = 1.3, hue = 180;

      const frame = () => {
        if (!activeFlag) return;
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, cv.width, cv.height);
        const cx = cv.width / 2, cy = cv.height / 2;
        ctx.fillStyle = '#fff';
        for (const s of stars) {
          s.z -= 7;
          if (s.z <= 1) {
            s.x = (Math.random() - 0.5) * cv.width;
            s.y = (Math.random() - 0.5) * cv.height;
            s.z = cv.width;
          }
          const k = 280 / s.z;
          const px = cx + s.x * k, py = cy + s.y * k;
          if (px < 0 || px >= cv.width || py < 0 || py >= cv.height) continue;
          const sz = Math.max(0.6, 3.2 - (s.z / cv.width) * 3.2);
          ctx.fillRect(px, py, sz, sz);
        }
        ctx.font = 'bold italic 38px Verdana, sans-serif';
        const tw = ctx.measureText(logoText).width;
        lx += vx; ly += vy; hue = (hue + 0.6) % 360;
        if (lx < 10 || lx + tw > cv.width - 10) vx *= -1;
        if (ly < 50 || ly > cv.height - 20) vy *= -1;
        ctx.fillStyle = `hsl(${hue}, 90%, 60%)`;
        ctx.fillText(logoText, lx, ly);
        raf = requestAnimationFrame(frame);
      };
      raf = requestAnimationFrame(frame);
    }

    function stop() {
      if (!activeFlag) return;
      activeFlag = false;
      if (raf) cancelAnimationFrame(raf);
      el().hidden = true;
      lastInput = Date.now();
    }

    function onInput(e) {
      if (activeFlag) {
        if (e.type === 'pointermove') {
          moveAccum += Math.abs(e.movementX || 1) + Math.abs(e.movementY || 1);
          if (moveAccum < 18) return;
        }
        stop();
        return;
      }
      lastInput = Date.now();
    }

    ['pointermove', 'pointerdown', 'keydown', 'wheel'].forEach(t =>
      window.addEventListener(t, onInput, { passive: true })
    );
    setInterval(() => {
      if (!activeFlag && !document.getElementById('boot') && Date.now() - lastInput > IDLE_MS) start();
    }, 5000);

    return { start, stop };
  })();

  /* Ctrl+Alt+B で BSOD */
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.altKey && e.key.toLowerCase() === 'b') {
      e.preventDefault();
      showBsod();
    }
  });

  return { showBsod, shutdown, startSaver: Saver.start };
})();

/* ============================================================
   タスクバー(スタートメニュー・時計・サウンド)
   ============================================================ */
(() => {
  const startBtn = document.getElementById('start-button');
  const menuEl = document.getElementById('start-menu');
  const ctxEl = document.getElementById('ctx-menu');

  document.querySelector('.start-logo').innerHTML = Icons.logo;

  /* ---- スタートメニュー ---- */
  const MENU = [
    {
      label: 'プログラム', icon: Icons.folder, sub: [
        { label: 'ペイント', icon: Icons.paint, run: () => WM.open('paint') },
        { label: 'マインスイーパー', icon: Icons.mines, run: () => WM.open('mines') },
        { label: 'メモ帳', icon: Icons.notepad, run: () => WM.open('notepad') },
        { label: 'ダイヤルアップ接続', icon: Icons.internet, run: () => WM.open('internet') },
      ],
    },
    { label: 'マイ コンピュータ', icon: Icons.computer, run: () => WM.open('computer') },
    { label: 'ごみ箱', icon: Icons.bin, run: () => WM.open('bin') },
    { label: 'ヘルプ', icon: Icons.help, run: () => WM.open('help') },
    { label: 'ファイル名を指定して実行...', icon: Icons.run, run: () => WM.open('run') },
    { sep: true },
    { label: 'スクリーンセーバーの起動', icon: Icons.ssaver, run: () => System.startSaver() },
    { sep: true },
    { label: 'RetroDesk の終了...', icon: Icons.shutdown, run: () => WM.open('shutdown') },
  ];

  function buildMenu() {
    menuEl.innerHTML = '';
    const banner = document.createElement('div');
    banner.className = 'sm-banner';
    banner.innerHTML = '<span>RetroDesk 95</span>';
    const items = document.createElement('div');
    items.className = 'sm-items';
    MENU.forEach(m => {
      if (m.sep) {
        const s = document.createElement('div');
        s.className = 'sm-sep';
        items.appendChild(s);
        return;
      }
      const it = document.createElement('div');
      it.className = 'sm-item';
      it.innerHTML = `<span class="sm-icon">${m.icon}</span><span></span>${m.sub ? '<span class="sm-arrow">▶</span>' : ''}`;
      it.querySelector('span:nth-child(2)').textContent = m.label;
      if (m.sub) {
        const sub = document.createElement('div');
        sub.className = 'sm-sub';
        m.sub.forEach(sm => {
          const si = document.createElement('div');
          si.className = 'sm-item';
          si.innerHTML = `<span class="sm-icon">${sm.icon}</span><span></span>`;
          si.querySelector('span:nth-child(2)').textContent = sm.label;
          si.addEventListener('click', (e) => {
            e.stopPropagation();
            closeMenu();
            sm.run();
          });
          sub.appendChild(si);
        });
        it.appendChild(sub);
      } else {
        it.addEventListener('click', () => {
          closeMenu();
          m.run();
        });
      }
      items.appendChild(it);
    });
    menuEl.append(banner, items);
  }

  function openMenu() {
    buildMenu();
    menuEl.hidden = false;
    startBtn.classList.add('pressed');
    Sound.click();
  }
  function closeMenu() {
    menuEl.hidden = true;
    startBtn.classList.remove('pressed');
  }

  startBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (menuEl.hidden) openMenu(); else closeMenu();
  });
  menuEl.addEventListener('pointerdown', e => e.stopPropagation());
  document.addEventListener('pointerdown', (e) => {
    if (!menuEl.hidden && !menuEl.contains(e.target) && !startBtn.contains(e.target)) closeMenu();
    if (!ctxEl.hidden && !ctxEl.contains(e.target)) ctxEl.hidden = true;
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { closeMenu(); ctxEl.hidden = true; }
  });

  /* ---- デスクトップ右クリックメニュー ---- */
  const desktop = document.getElementById('desktop');
  desktop.addEventListener('contextmenu', (e) => {
    if (e.target.closest('.window') || e.target.closest('.dicon')) { e.preventDefault(); return; }
    e.preventDefault();
    ctxEl.innerHTML = '';
    [
      { label: 'アイコンの整列', run: () => Desktop.arrange() },
      { label: '最新の情報に更新', run: () => Desktop.render() },
      { sep: true },
      { label: 'RetroDesk のバージョン情報', run: () => WM.open('about') },
    ].forEach(m => {
      if (m.sep) {
        const s = document.createElement('div');
        s.className = 'sm-sep';
        ctxEl.appendChild(s);
        return;
      }
      const it = document.createElement('div');
      it.className = 'sm-item';
      it.textContent = m.label;
      it.addEventListener('click', () => { ctxEl.hidden = true; m.run(); });
      ctxEl.appendChild(it);
    });
    ctxEl.hidden = false;
    const mw = ctxEl.offsetWidth, mh = ctxEl.offsetHeight;
    ctxEl.style.left = Math.min(e.clientX, innerWidth - mw - 4) + 'px';
    ctxEl.style.top = Math.min(e.clientY, innerHeight - mh - 4) + 'px';
  });

  /* デスクトップ空白クリックでアイコン選択解除 */
  desktop.addEventListener('pointerdown', (e) => {
    if (e.target.id === 'desktop' || e.target.id === 'icon-layer') Desktop.clearSelection();
  });

  /* ---- 時計 ---- */
  const clockEl = document.getElementById('clock');
  function tick() {
    const d = new Date();
    clockEl.textContent = `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
    clockEl.title = d.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });
  }
  tick();
  setInterval(tick, 1000);
  clockEl.addEventListener('dblclick', () => WM.open('about'));

  /* ---- サウンドトグル ---- */
  const sndBtn = document.getElementById('sound-toggle');
  const syncSnd = () => { sndBtn.innerHTML = Sound.isMuted() ? Icons.speakerMute : Icons.speaker; };
  sndBtn.addEventListener('click', () => {
    Sound.setMuted(!Sound.isMuted());
    syncSnd();
    if (!Sound.isMuted()) Sound.ding();
  });
  syncSnd();
})();

/* ============================================================
   起動シーケンス
   ============================================================ */
(() => {
  const boot = document.getElementById('boot');
  const power = document.getElementById('boot-power');
  const bios = document.getElementById('boot-bios');
  const splash = document.getElementById('boot-splash');
  let finished = false;

  /* ロゴの 4 色グリッドを生成 */
  const COLORS = ['#ff3d2e', '#00a800', '#0050ef', '#ffc800'];
  document.querySelectorAll('.boot-logo-grid, .splash-logo-grid').forEach(g => {
    COLORS.forEach(c => {
      const d = document.createElement('div');
      d.style.background = c;
      g.appendChild(d);
    });
  });

  const BIOS_LINES = [
    'RetroDesk BIOS v4.51PG  (C) 1995-2026 RetroDesk Systems, Inc.',
    '',
    'CPU    : Pentium(R) 133MHz',
    'Memory : 65536 KB  ... OK',
    '',
    'Detecting IDE Drives ...',
    '  Primary Master  : RETRO-HDD 1.2GB',
    '  Primary Slave   : CD-ROM 8X',
    'Keyboard ........ OK',
    'Mouse ........... OK',
    'Sound Blaster 16 ... OK',
    '',
    'Starting RetroDesk 95 ...',
  ];

  function finish() {
    if (finished) return;
    finished = true;
    Desktop.render();
    Sound.chime();
    boot.classList.add('fading');
    setTimeout(() => {
      boot.remove();
      if (localStorage.getItem('retrodesk.hideWelcome') !== '1') WM.open('welcome');
    }, 620);
  }

  function showSplash() {
    bios.hidden = true;
    splash.hidden = false;
    setTimeout(finish, 2400);
  }

  function showBios() {
    power.hidden = true;
    bios.hidden = false;
    bios.textContent = '';
    let i = 0;
    const t = setInterval(() => {
      if (finished) { clearInterval(t); return; }
      bios.textContent += BIOS_LINES[i] + '\n';
      i++;
      if (i >= BIOS_LINES.length) {
        clearInterval(t);
        setTimeout(showSplash, 500);
      }
    }, 110);
  }

  let powerClick = false;
  power.addEventListener('pointerdown', () => {
    powerClick = true;
    setTimeout(() => { powerClick = false; }, 0);
    Sound.ensure();   // ユーザー操作のタイミングで AudioContext を有効化
    Sound.click();
    showBios();
  }, { once: true });

  /* BIOS / スプラッシュ中のクリックでスキップ */
  boot.addEventListener('pointerdown', () => {
    if (!power.hidden || finished || powerClick) return;
    finish();
  });

  /* 念のため: 自動でも進む(20 秒放置で強制起動) */
  setTimeout(() => { if (!finished && power.hidden) finish(); }, 20000);
})();
