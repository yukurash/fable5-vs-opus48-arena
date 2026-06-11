'use strict';
/* ============================================================
   RetroDesk 95 — アプリケーション
   ============================================================ */

/* ============================================================
   メモ帳
   ============================================================ */
WM.register('notepad', {
  title: 'メモ帳 - メモ.txt',
  icon: Icons.notepad,
  width: 480, height: 380,
  resizable: true, minW: 280, minH: 180,
  init(body, win) {
    const KEY = 'retrodesk.notepad.v1';
    let dirty = false;

    body.innerHTML = '';
    const ta = document.createElement('textarea');
    ta.className = 'notepad-text';
    ta.spellcheck = false;
    ta.wrap = 'off';

    const status = document.createElement('div');
    status.className = 'statusbar';
    status.innerHTML = '<span class="np-state"></span><span class="fit np-count"></span>';
    const stateEl = status.querySelector('.np-state');
    const countEl = status.querySelector('.np-count');

    const refresh = () => {
      WM.setTitle(win, (dirty ? '*' : '') + 'メモ帳 - メモ.txt');
      countEl.textContent = `${ta.value.length} 文字`;
    };

    const load = () => {
      try {
        const saved = JSON.parse(localStorage.getItem(KEY) || 'null');
        if (saved && typeof saved.text === 'string') {
          ta.value = saved.text;
          stateEl.textContent = saved.t
            ? `前回の保存: ${new Date(saved.t).toLocaleString('ja-JP')}`
            : '保存データを読み込みました';
        } else {
          stateEl.textContent = '新しいドキュメント';
        }
      } catch (e) { stateEl.textContent = '新しいドキュメント'; }
      dirty = false;
      refresh();
    };

    const save = () => {
      localStorage.setItem(KEY, JSON.stringify({ text: ta.value, t: Date.now() }));
      dirty = false;
      stateEl.textContent = `保存しました ${new Date().toLocaleTimeString('ja-JP')}`;
      refresh();
    };

    const menubar = WM.buildMenubar([
      {
        label: 'ファイル',
        items: [
          { label: '上書き保存', accel: 'Ctrl+S', onClick: save },
          { label: '保存した内容を読み込む', onClick: load },
          { sep: true },
          {
            label: '本文をクリア',
            onClick: () => { ta.value = ''; dirty = true; stateEl.textContent = 'クリアしました(未保存)'; refresh(); },
          },
          { sep: true },
          { label: '閉じる', onClick: () => WM.close(win) },
        ],
      },
      {
        label: '編集',
        items: [
          { label: 'すべて選択', accel: 'Ctrl+A', onClick: () => { ta.focus(); ta.select(); } },
          {
            label: '日付と時刻', accel: 'F5',
            onClick: () => {
              const s = new Date().toLocaleString('ja-JP');
              const p = ta.selectionStart;
              ta.setRangeText(s, ta.selectionStart, ta.selectionEnd, 'end');
              dirty = true; refresh(); ta.focus();
            },
          },
        ],
      },
    ]);

    body.append(menubar, ta, status);

    ta.addEventListener('input', () => {
      if (!dirty) { dirty = true; stateEl.textContent = '編集中(未保存)'; }
      refresh();
    });
    ta.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.key.toLowerCase() === 's') { e.preventDefault(); save(); }
      if (e.key === 'F5') {
        e.preventDefault();
        ta.setRangeText(new Date().toLocaleString('ja-JP'), ta.selectionStart, ta.selectionEnd, 'end');
        dirty = true; refresh();
      }
    });

    win.onBeforeClose = () => {
      if (!dirty) return true;
      WM.msgbox({
        title: 'メモ帳',
        text: 'メモ.txt への変更を保存しますか?',
        type: 'question',
        buttons: [
          { label: 'はい', value: 'yes', def: true },
          { label: 'いいえ', value: 'no' },
          { label: 'キャンセル', value: 'cancel' },
        ],
        onResult(v) {
          if (v === 'yes') { save(); WM.close(win, true); }
          else if (v === 'no') WM.close(win, true);
        },
      });
      return false;
    };

    load();
    setTimeout(() => ta.focus(), 60);
  },
});

/* ============================================================
   ペイント
   ============================================================ */
WM.register('paint', {
  title: 'ペイント - 無題',
  icon: Icons.paint,
  width: 596, height: 452,
  init(body, win) {
    const CW = 480, CH = 300;
    let tool = 'pen';
    let size = 3;
    let color = '#000000';
    let drawing = false;
    let last = null;
    let lineStart = null;
    let snapshot = null;
    let sprayTimer = null;

    body.innerHTML = '';

    const menubar = WM.buildMenubar([
      {
        label: 'ファイル',
        items: [
          { label: '新規(キャンバスをクリア)', onClick: () => clearCanvas() },
          { label: 'PNG として保存...', onClick: () => savePng() },
          { sep: true },
          { label: '閉じる', onClick: () => WM.close(win) },
        ],
      },
      {
        label: 'ヘルプ',
        items: [{
          label: '使い方',
          onClick: () => WM.msgbox({
            title: 'ペイントのヘルプ', type: 'info',
            text: '左のツールを選んでキャンバスをドラッグすると描けます。\n下のパレットで色を選択。「クリア」で全消去できます。',
          }),
        }],
      },
    ]);

    const main = document.createElement('div');
    main.className = 'paint-main';

    /* ツール */
    const tools = document.createElement('div');
    tools.className = 'paint-tools';
    const toolDefs = [
      ['pen', Icons.toolPen, 'ペン'],
      ['line', Icons.toolLine, '直線'],
      ['fill', Icons.toolFill, '塗りつぶし'],
      ['spray', Icons.toolSpray, 'スプレー'],
      ['eraser', Icons.toolEraser, '消しゴム'],
    ];
    const toolGrid = document.createElement('div');
    toolGrid.className = 'paint-tool-grid';
    const toolBtns = {};
    toolDefs.forEach(([id, icon, name]) => {
      const b = document.createElement('button');
      b.className = 'btn95 paint-tool';
      b.title = name;
      b.innerHTML = icon;
      b.addEventListener('click', () => {
        tool = id;
        Object.values(toolBtns).forEach(x => x.classList.remove('on'));
        b.classList.add('on');
      });
      toolBtns[id] = b;
      toolGrid.appendChild(b);
    });
    toolBtns.pen.classList.add('on');

    const sizes = document.createElement('div');
    sizes.className = 'paint-sizes bevel-in';
    [1, 3, 6, 10].forEach(s => {
      const d = document.createElement('div');
      d.className = 'paint-size' + (s === size ? ' on' : '');
      d.innerHTML = `<span style="height:${Math.max(1, Math.round(s * 0.8))}px"></span>`;
      d.addEventListener('click', () => {
        size = s;
        sizes.querySelectorAll('.paint-size').forEach(x => x.classList.remove('on'));
        d.classList.add('on');
      });
      sizes.appendChild(d);
    });

    const clearBtn = document.createElement('button');
    clearBtn.className = 'btn95';
    clearBtn.style.justifyContent = 'center';
    clearBtn.textContent = 'クリア';
    clearBtn.addEventListener('click', () => clearCanvas());

    tools.append(toolGrid, sizes, clearBtn);

    /* キャンバス */
    const wrap = document.createElement('div');
    wrap.className = 'paint-canvas-wrap';
    const canvas = document.createElement('canvas');
    canvas.width = CW;
    canvas.height = CH;
    wrap.appendChild(canvas);
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, CW, CH);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    main.append(tools, wrap);

    /* パレット */
    const bottom = document.createElement('div');
    bottom.className = 'paint-bottom';
    const current = document.createElement('div');
    current.className = 'paint-current';
    current.innerHTML = '<span></span>';
    const currentSwatch = current.querySelector('span');
    currentSwatch.style.background = color;

    const palette = document.createElement('div');
    palette.className = 'paint-palette';
    const COLORS = [
      '#000000', '#808080', '#800000', '#808000', '#008000', '#008080', '#000080', '#800080', '#804000', '#ff8000', '#ffffff', '#c0c0c0',
      '#ff0000', '#ffff00', '#00ff00', '#00ffff', '#0000ff', '#ff00ff', '#ffc0c0', '#ffe0a0', '#c0ffc0', '#a0ffff', '#c0c0ff', '#ffc0ff',
    ];
    COLORS.forEach(c => {
      const s = document.createElement('div');
      s.className = 'paint-swatch';
      s.style.background = c;
      s.title = c;
      s.addEventListener('click', () => {
        color = c;
        currentSwatch.style.background = c;
      });
      palette.appendChild(s);
    });
    bottom.append(current, palette);

    const status = document.createElement('div');
    status.className = 'statusbar';
    status.innerHTML = `<span class="paint-pos">ツール: ペン</span><span class="fit">${CW} × ${CH} px</span>`;
    const posEl = status.querySelector('.paint-pos');

    body.append(menubar, main, bottom, status);

    /* ---- 描画処理 ---- */
    const pos = (e) => {
      const r = canvas.getBoundingClientRect();
      return {
        x: Math.round((e.clientX - r.left) * (CW / r.width)),
        y: Math.round((e.clientY - r.top) * (CH / r.height)),
      };
    };

    function strokeSeg(a, b) {
      ctx.strokeStyle = tool === 'eraser' ? '#ffffff' : color;
      ctx.lineWidth = tool === 'eraser' ? size * 2.4 : size;
      ctx.beginPath();
      ctx.moveTo(a.x + 0.01, a.y + 0.01);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }

    function spray(p) {
      ctx.fillStyle = color;
      const r = size * 3 + 4;
      for (let i = 0; i < 18; i++) {
        const a = Math.random() * Math.PI * 2;
        const d = Math.random() * r;
        ctx.fillRect(p.x + Math.cos(a) * d, p.y + Math.sin(a) * d, 1, 1);
      }
    }

    function hexToUint32(hex) {
      const n = parseInt(hex.slice(1), 16);
      const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
      return (255 << 24) | (b << 16) | (g << 8) | r; // リトルエンディアン RGBA
    }

    function floodFill(p) {
      if (p.x < 0 || p.y < 0 || p.x >= CW || p.y >= CH) return;
      const img = ctx.getImageData(0, 0, CW, CH);
      const data = new Uint32Array(img.data.buffer);
      const target = data[p.y * CW + p.x];
      const fill = hexToUint32(color);
      if (target === fill) return;
      const stack = [p.y * CW + p.x];
      while (stack.length) {
        const i = stack.pop();
        if (data[i] !== target) continue;
        data[i] = fill;
        const x = i % CW;
        if (x > 0) stack.push(i - 1);
        if (x < CW - 1) stack.push(i + 1);
        if (i >= CW) stack.push(i - CW);
        if (i < CW * (CH - 1)) stack.push(i + CW);
      }
      ctx.putImageData(img, 0, 0);
    }

    canvas.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      const p = pos(e);
      canvas.setPointerCapture(e.pointerId);
      if (tool === 'fill') { floodFill(p); return; }
      drawing = true;
      last = p;
      if (tool === 'line') {
        lineStart = p;
        snapshot = ctx.getImageData(0, 0, CW, CH);
      } else if (tool === 'spray') {
        spray(p);
        sprayTimer = setInterval(() => last && spray(last), 50);
      } else {
        strokeSeg(p, p);
      }
    });

    canvas.addEventListener('pointermove', (e) => {
      const p = pos(e);
      posEl.textContent = `ツール: ${ { pen: 'ペン', line: '直線', fill: '塗りつぶし', spray: 'スプレー', eraser: '消しゴム' }[tool] }  (${p.x}, ${p.y})`;
      if (!drawing) return;
      if (tool === 'line') {
        ctx.putImageData(snapshot, 0, 0);
        ctx.strokeStyle = color;
        ctx.lineWidth = size;
        ctx.beginPath();
        ctx.moveTo(lineStart.x, lineStart.y);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
      } else if (tool === 'spray') {
        last = p;
        spray(p);
      } else {
        strokeSeg(last, p);
        last = p;
      }
    });

    const endStroke = () => {
      drawing = false;
      last = null;
      lineStart = null;
      snapshot = null;
      if (sprayTimer) { clearInterval(sprayTimer); sprayTimer = null; }
    };
    canvas.addEventListener('pointerup', endStroke);
    canvas.addEventListener('pointercancel', endStroke);
    canvas.addEventListener('contextmenu', e => e.preventDefault());

    function clearCanvas() {
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, CW, CH);
    }

    function savePng() {
      const a = document.createElement('a');
      a.href = canvas.toDataURL('image/png');
      a.download = 'retrodesk-paint.png';
      a.click();
    }

    win.onClose = () => { if (sprayTimer) clearInterval(sprayTimer); };
  },
});

/* ============================================================
   マインスイーパー
   ============================================================ */
WM.register('mines', {
  title: 'マインスイーパー',
  icon: Icons.mines,
  noMax: true,
  init(body, win) {
    const LEVELS = {
      easy: { w: 9, h: 9, m: 10, name: '初級' },
      mid: { w: 16, h: 16, m: 40, name: '中級' },
      hard: { w: 30, h: 16, m: 99, name: '上級' },
    };
    let level = 'easy';
    let W, H, M;
    let cells;            // {mine, open, flag(0/1/2), n}
    let state = 'ready';  // ready | play | win | lose
    let opened = 0;
    let flags = 0;
    let time = 0;
    let timer = null;

    body.innerHTML = '';
    const menubar = WM.buildMenubar([
      {
        label: 'ゲーム',
        items: [
          { label: '新しいゲーム', accel: 'F2', onClick: () => newGame() },
          { sep: true },
          { label: '初級 (9×9・地雷10)', checked: () => level === 'easy', onClick: () => { level = 'easy'; newGame(); } },
          { label: '中級 (16×16・地雷40)', checked: () => level === 'mid', onClick: () => { level = 'mid'; newGame(); } },
          { label: '上級 (30×16・地雷99)', checked: () => level === 'hard', onClick: () => { level = 'hard'; newGame(); } },
          { sep: true },
          { label: '閉じる', onClick: () => WM.close(win) },
        ],
      },
      {
        label: 'ヘルプ',
        items: [{
          label: '遊び方',
          onClick: () => WM.msgbox({
            title: 'マインスイーパー', type: 'info',
            text: '左クリック: マスを開く\n右クリック: 旗 → ? → 解除\n数字の上でダブルクリック: 周囲をまとめて開く\n地雷以外のマスをすべて開けば勝ちです。',
          }),
        }],
      },
    ]);

    const outer = document.createElement('div');
    outer.className = 'mines-outer';
    outer.innerHTML = `
      <div class="mines-panel">
        <span class="mines-lcd mines-count">010</span>
        <button class="btn95 mines-face">${Icons.faceSmile}</button>
        <span class="mines-lcd mines-time">000</span>
      </div>
      <div class="mines-board"></div>
    `;
    body.append(menubar, outer);

    const countEl = outer.querySelector('.mines-count');
    const timeEl = outer.querySelector('.mines-time');
    const faceBtn = outer.querySelector('.mines-face');
    const boardEl = outer.querySelector('.mines-board');

    faceBtn.addEventListener('click', () => newGame());

    const lcd = (n) => {
      n = Math.max(-99, Math.min(999, n));
      return n < 0 ? '-' + String(-n).padStart(2, '0') : String(n).padStart(3, '0');
    };

    const updatePanel = () => {
      countEl.textContent = lcd(M - flags);
      timeEl.textContent = lcd(time);
    };

    const setFace = (svg) => { faceBtn.innerHTML = svg; };

    const stopTimer = () => { if (timer) { clearInterval(timer); timer = null; } };
    const startTimer = () => {
      stopTimer();
      timer = setInterval(() => {
        if (time < 999) { time++; updatePanel(); }
      }, 1000);
    };

    const neighbors = (i) => {
      const x = i % W, y = (i / W) | 0;
      const out = [];
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (!dx && !dy) continue;
          const nx = x + dx, ny = y + dy;
          if (nx >= 0 && nx < W && ny >= 0 && ny < H) out.push(ny * W + nx);
        }
      }
      return out;
    };

    function newGame() {
      W = LEVELS[level].w; H = LEVELS[level].h; M = LEVELS[level].m;
      cells = Array.from({ length: W * H }, () => ({ mine: false, open: false, flag: 0, n: 0 }));
      state = 'ready';
      opened = 0; flags = 0; time = 0;
      stopTimer();
      setFace(Icons.faceSmile);
      boardEl.style.gridTemplateColumns = `repeat(${W}, 21px)`;
      boardEl.innerHTML = '';
      for (let i = 0; i < W * H; i++) {
        const c = document.createElement('div');
        c.className = 'cell';
        c.dataset.i = i;
        boardEl.appendChild(c);
      }
      updatePanel();
    }

    function placeMines(safe) {
      const avoid = new Set([safe, ...neighbors(safe)]);
      const pool = [];
      for (let i = 0; i < W * H; i++) if (!avoid.has(i)) pool.push(i);
      // 避けた結果地雷を置ききれない場合はクリックマスのみ除外
      if (pool.length < M) {
        pool.length = 0;
        for (let i = 0; i < W * H; i++) if (i !== safe) pool.push(i);
      }
      for (let k = 0; k < M; k++) {
        const j = k + ((Math.random() * (pool.length - k)) | 0);
        [pool[k], pool[j]] = [pool[j], pool[k]];
        cells[pool[k]].mine = true;
      }
      for (let i = 0; i < W * H; i++) {
        cells[i].n = neighbors(i).filter(j => cells[j].mine).length;
      }
    }

    const cellEl = (i) => boardEl.children[i];

    function paintCell(i) {
      const c = cells[i];
      const el = cellEl(i);
      el.className = 'cell';
      el.innerHTML = '';
      if (c.open) {
        el.classList.add('open');
        if (c.mine) {
          el.innerHTML = Icons.mineCell;
          if (c.boom) el.classList.add('boom');
        } else if (c.n) {
          el.classList.add('n' + c.n);
          el.textContent = c.n;
        }
      } else if (c.flag === 1) {
        el.innerHTML = Icons.flag;
        if (state === 'lose' && !c.mine) el.classList.add('wrong');
      } else if (c.flag === 2) {
        el.classList.add('q');
        el.textContent = '?';
      }
    }

    function reveal(i) {
      const queue = [i];
      while (queue.length) {
        const k = queue.pop();
        const c = cells[k];
        if (c.open || c.flag === 1) continue;
        c.open = true;
        c.flag = 0;
        opened++;
        paintCell(k);
        if (!c.mine && c.n === 0) {
          for (const j of neighbors(k)) if (!cells[j].open) queue.push(j);
        }
      }
    }

    function lose(clicked) {
      state = 'lose';
      stopTimer();
      cells[clicked].boom = true;
      for (let i = 0; i < W * H; i++) {
        if (cells[i].mine && cells[i].flag !== 1) cells[i].open = true;
        paintCell(i);
      }
      setFace(Icons.faceDead);
      Sound.boom();
    }

    function checkWin() {
      if (opened !== W * H - M) return;
      state = 'win';
      stopTimer();
      for (let i = 0; i < W * H; i++) {
        if (cells[i].mine) { cells[i].flag = 1; paintCell(i); }
      }
      flags = M;
      updatePanel();
      setFace(Icons.faceCool);
      Sound.tada();
      const bestKey = 'retrodesk.mines.best.' + level;
      const best = +localStorage.getItem(bestKey) || Infinity;
      if (time < best) {
        localStorage.setItem(bestKey, time);
        WM.msgbox({
          title: 'マインスイーパー', type: 'info',
          text: `クリア! ${LEVELS[level].name}の新記録です。\nタイム: ${time} 秒`,
        });
      } else {
        WM.msgbox({
          title: 'マインスイーパー', type: 'info',
          text: `クリア! タイム: ${time} 秒\n(自己ベスト: ${best} 秒)`,
        });
      }
    }

    function clickCell(i) {
      const c = cells[i];
      if (state === 'win' || state === 'lose' || c.open || c.flag === 1) return;
      if (state === 'ready') {
        placeMines(i);
        state = 'play';
        startTimer();
      }
      if (c.mine) { c.open = true; opened++; lose(i); return; }
      reveal(i);
      checkWin();
    }

    function chord(i) {
      const c = cells[i];
      if (!c.open || !c.n || state !== 'play') return;
      const ns = neighbors(i);
      const fl = ns.filter(j => cells[j].flag === 1).length;
      if (fl !== c.n) return;
      for (const j of ns) {
        if (cells[j].open || cells[j].flag === 1) continue;
        if (cells[j].mine) { cells[j].open = true; opened++; lose(j); return; }
        reveal(j);
      }
      checkWin();
    }

    boardEl.addEventListener('contextmenu', e => e.preventDefault());
    boardEl.addEventListener('pointerdown', (e) => {
      const el = e.target.closest('.cell');
      if (!el) return;
      const i = +el.dataset.i;
      if (e.button === 2) {
        if (state === 'win' || state === 'lose' || cells[i].open) return;
        const c = cells[i];
        if (c.flag === 1) flags--;
        c.flag = (c.flag + 1) % 3;
        if (c.flag === 1) flags++;
        paintCell(i);
        updatePanel();
      } else if (e.button === 0 && state !== 'win' && state !== 'lose') {
        setFace(Icons.faceOh);
      }
    });
    boardEl.addEventListener('pointerup', (e) => {
      if (state === 'win' || state === 'lose') return;
      setFace(Icons.faceSmile);
      const el = e.target.closest('.cell');
      if (el && e.button === 0) clickCell(+el.dataset.i);
    });
    boardEl.addEventListener('dblclick', (e) => {
      const el = e.target.closest('.cell');
      if (el) chord(+el.dataset.i);
    });

    win.el.addEventListener('keydown', (e) => {
      if (e.key === 'F2') { e.preventDefault(); newGame(); }
    });

    win.onClose = stopTimer;
    newGame();
  },
});

/* ============================================================
   ごみ箱
   ============================================================ */
WM.register('bin', {
  title: 'ごみ箱',
  icon: Icons.bin,
  width: 440, height: 330,
  resizable: true, minW: 300, minH: 200,
  init(body, win) {
    let selected = null;

    body.innerHTML = `
      <div class="folder-toolbar">
        <button class="btn95" data-cmd="restore">元に戻す</button>
        <button class="btn95" data-cmd="restoreAll">すべて元に戻す</button>
        <button class="btn95" data-cmd="empty">ごみ箱を空にする</button>
      </div>
      <div class="folder-view"></div>
      <div class="statusbar"><span class="bin-status"></span></div>
    `;
    const view = body.querySelector('.folder-view');
    const statusEl = body.querySelector('.bin-status');
    const btnRestore = body.querySelector('[data-cmd="restore"]');
    const btnRestoreAll = body.querySelector('[data-cmd="restoreAll"]');
    const btnEmpty = body.querySelector('[data-cmd="empty"]');

    function render() {
      const items = Desktop.deletedList();
      selected = null;
      view.innerHTML = '';
      if (!items.length) {
        view.innerHTML = '<div class="folder-empty">ごみ箱は空です</div>';
      }
      items.forEach(ic => {
        const d = document.createElement('div');
        d.className = 'fitem';
        d.innerHTML = `<div class="fitem-img">${Icons[ic.icon] || Icons.doc}</div><span class="fitem-label"></span>`;
        d.querySelector('.fitem-label').textContent = ic.label;
        d.addEventListener('click', () => {
          view.querySelectorAll('.fitem').forEach(x => x.classList.remove('selected'));
          d.classList.add('selected');
          selected = ic.id;
          sync();
        });
        d.addEventListener('dblclick', () => Desktop.restoreIcon(ic.id));
        view.appendChild(d);
      });
      statusEl.textContent = `${items.length} 個のオブジェクト`;
      sync();
    }

    function sync() {
      const n = Desktop.deletedList().length;
      btnRestore.disabled = !selected;
      btnRestoreAll.disabled = !n;
      btnEmpty.disabled = !n;
    }

    btnRestore.addEventListener('click', () => { if (selected) Desktop.restoreIcon(selected); });
    btnRestoreAll.addEventListener('click', () => {
      Desktop.deletedList().slice().forEach(ic => Desktop.restoreIcon(ic.id));
    });
    btnEmpty.addEventListener('click', () => {
      WM.msgbox({
        title: 'ごみ箱を空にする',
        text: 'これらの項目を完全に削除しますか?\n(元に戻せなくなります)',
        type: 'question',
        buttons: [
          { label: 'はい', value: 'yes' },
          { label: 'いいえ', value: 'no', def: true },
        ],
        onResult(v) { if (v === 'yes') Desktop.purgeDeleted(); },
      });
    });

    const onChange = () => render();
    window.addEventListener('bin-changed', onChange);
    win.onClose = () => window.removeEventListener('bin-changed', onChange);
    render();
  },
});

/* ============================================================
   マイ コンピュータ
   ============================================================ */
WM.register('computer', {
  title: 'マイ コンピュータ',
  icon: Icons.computer,
  width: 420, height: 350,
  resizable: true, minW: 320, minH: 240,
  init(body, win) {
    body.innerHTML = `
      <div class="folder-view" style="flex:0 0 auto; padding:6px 4px;">
        <div class="drive-list" style="width:100%">
          <div class="drive-row" data-msg="floppy"><span class="drive-icon">${Icons.floppy}</span><span>3.5 インチ FD (A:)</span></div>
          <div class="drive-row" data-msg="c"><span class="drive-icon">${Icons.drive}</span><span>ローカルディスク (C:)</span></div>
          <div class="drive-row" data-msg="d"><span class="drive-icon">${Icons.drive}</span><span>CD-ROM (D:)</span></div>
        </div>
      </div>
      <div class="sysinfo">
        <b>RetroDesk 95</b><br>
        バージョン 4.00.950 B<br>
        CPU: Pentium(r) 133MHz 相当(気持ち)<br>
        メモリ: 64.0 MB の RAM<br>
        システムリソース: 残り 95% (たぶん)
      </div>
      <div class="statusbar"><span>3 個のオブジェクト</span></div>
    `;
    body.querySelectorAll('.drive-row').forEach(row => {
      row.addEventListener('click', () => {
        body.querySelectorAll('.drive-row').forEach(x => x.classList.remove('selected'));
        row.classList.add('selected');
      });
      row.addEventListener('dblclick', () => {
        const m = row.dataset.msg;
        if (m === 'floppy') {
          WM.msgbox({ title: 'A:\\ にアクセスできません', type: 'error', text: 'ドライブにディスクを挿入してください。' });
        } else if (m === 'c') {
          WM.msgbox({ title: 'ローカルディスク (C:)', type: 'warn', text: 'アクセスが拒否されました。\n大事なものが入っているので開けません。' });
        } else {
          WM.msgbox({ title: 'CD-ROM (D:)', type: 'info', text: 'トレイは開きましたが、CD が見つかりません。\n(お気に入りの CD を入れてお楽しみください)' });
        }
      });
    });
  },
});

/* ============================================================
   インターネット(ダイヤルアップごっこ)
   ============================================================ */
WM.register('internet', {
  title: 'ダイヤルアップ ネットワーク',
  icon: Icons.internet,
  width: 340, height: 190,
  noMax: true,
  init(body, win) {
    body.innerHTML = `
      <div class="dialup-body">
        <div>「retronet」 に接続しています...</div>
        <div class="dialup-anim">📞</div>
        <div class="dialup-state">ダイヤル中: 0570-95-1995</div>
      </div>
    `;
    const state = body.querySelector('.dialup-state');
    const anim = body.querySelector('.dialup-anim');
    Sound.modem();
    let step = 0;
    const frames = ['・', '・・', '・・・', '・・・・'];
    const t1 = setInterval(() => { anim.textContent = frames[step++ % frames.length]; }, 280);
    const t2 = setTimeout(() => { state.textContent = 'ユーザー名とパスワードを確認しています...'; }, 1600);
    const t3 = setTimeout(() => {
      WM.close(win, true);
      WM.msgbox({
        title: 'ダイヤルアップ ネットワーク',
        type: 'error',
        text: '回線がビジー状態です。しばらくしてからやり直してください。\n(エラー 678: 1995 年からの応答がありません)',
      });
    }, 3300);
    win.onClose = () => { clearInterval(t1); clearTimeout(t2); clearTimeout(t3); };
  },
});

/* ============================================================
   ファイル名を指定して実行
   ============================================================ */
WM.register('run', {
  title: 'ファイル名を指定して実行',
  icon: Icons.run,
  width: 380,
  dialog: true,
  init(body, win) {
    body.innerHTML = `
      <div class="run-body">
        <span class="dlg-icon">${Icons.run}</span>
        <div class="run-fields">
          <p>実行したいプログラム名を入力してください。<br><small>ヒント: bsod / winver / mines / paint / notepad / format c:</small></p>
          <div class="run-row">
            <label>名前:</label>
            <input type="text" spellcheck="false">
          </div>
        </div>
      </div>
      <div class="dlg-buttons">
        <button class="btn95 run-ok">OK</button>
        <button class="btn95 run-cancel">キャンセル</button>
      </div>
    `;
    const input = body.querySelector('input');
    const exec = () => {
      const cmd = input.value.trim().toLowerCase();
      if (!cmd) return;
      WM.close(win, true);
      if (cmd === 'bsod' || cmd === 'blue') { System.showBsod(); return; }
      if (cmd === 'winver' || cmd === 'ver') { WM.open('about'); return; }
      if (cmd === 'mines' || cmd === 'minesweeper') { WM.open('mines'); return; }
      if (cmd === 'paint' || cmd === 'mspaint') { WM.open('paint'); return; }
      if (cmd === 'notepad' || cmd === 'memo') { WM.open('notepad'); return; }
      if (cmd === 'format c:' || cmd === 'format c') {
        WM.msgbox({
          title: 'フォーマット', type: 'warn',
          text: 'C: をフォーマットしますか?\n……冗談です。そんな機能はありません。',
        });
        return;
      }
      WM.msgbox({
        title: 'RetroDesk', type: 'error',
        text: `'${input.value.trim()}' が見つかりません。名前を確認して、やり直してください。`,
      });
    };
    body.querySelector('.run-ok').addEventListener('click', exec);
    body.querySelector('.run-cancel').addEventListener('click', () => WM.close(win, true));
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') exec();
      if (e.key === 'Escape') WM.close(win, true);
    });
    setTimeout(() => input.focus(), 60);
  },
});

/* ============================================================
   バージョン情報
   ============================================================ */
WM.register('about', {
  title: 'RetroDesk のバージョン情報',
  icon: Icons.logo,
  width: 420,
  dialog: true,
  init(body, win) {
    body.innerHTML = `
      <div class="about-body">
        <span class="about-logo">${Icons.logo}</span>
        <div class="about-text">
          <h2>RetroDesk 95</h2>
          <p>バージョン 4.00.950 B<br>Copyright © 1995-2026 RetroDesk Systems, Inc.</p>
          <div class="about-rule"></div>
          <p>この RetroDesk 95 は次のユーザーにライセンスされています:<br>
          <b>なつかしさを大切にするあなた</b></p>
          <p style="margin-top:8px">使用可能な物理メモリ: 65,536 KB(自己申告)</p>
        </div>
      </div>
      <div class="dlg-buttons"><button class="btn95 about-ok">OK</button></div>
    `;
    body.querySelector('.about-ok').addEventListener('click', () => WM.close(win, true));
  },
});

/* ============================================================
   ヘルプ
   ============================================================ */
WM.register('help', {
  title: 'RetroDesk ヘルプ',
  icon: Icons.help,
  width: 470, height: 420,
  resizable: true, minW: 340, minH: 240,
  init(body, win) {
    body.innerHTML = `
      <div class="viewer-pre">【RetroDesk 95 操作ガイド】

■ デスクトップ
  ・アイコンをダブルクリック ……… アプリを起動
  ・アイコンをドラッグ ……………… 自由に移動(グリッドに吸着)
  ・アイコンをごみ箱へドラッグ …… 削除(ごみ箱から復元可能)
  ・デスクトップを右クリック ……… 整列などのメニュー

■ ウィンドウ
  ・タイトルバーをドラッグ ………… 移動
  ・タイトルバーをダブルクリック … 最大化 / 元に戻す
  ・右下のグリップ …………………… サイズ変更(対応ウィンドウ)

■ タスクバー
  ・[スタート] からアプリを起動
  ・タスクバーのボタンで最小化 / 復元
  ・右端のスピーカーでサウンドの ON/OFF

■ アプリ
  ・メモ帳 …… Ctrl+S で保存(ブラウザに保存されます)
  ・ペイント … 左のツールと下のパレットでお絵かき
  ・マインスイーパー … 右クリックで旗、F2 で新規ゲーム

■ ひみつ
  ・「ファイル名を指定して実行」で bsod / winver / format c:
  ・しばらく放置するとスクリーンセーバーが起動
  ・デスクトップの「README.txt」も読んでみてください
</div>
      <div class="dlg-buttons" style="justify-content:flex-end; padding:8px 6px 4px;">
        <button class="btn95 help-reset">デスクトップを初期状態に戻す</button>
        <button class="btn95 help-ok">閉じる</button>
      </div>
    `;
    body.querySelector('.help-ok').addEventListener('click', () => WM.close(win));
    body.querySelector('.help-reset').addEventListener('click', () => {
      WM.msgbox({
        title: '確認', type: 'question',
        text: 'アイコンの配置・ごみ箱の中身を初期状態に戻して再起動しますか?\n(メモ帳の保存内容は残ります)',
        buttons: [
          { label: 'はい', value: 'yes' },
          { label: 'いいえ', value: 'no', def: true },
        ],
        onResult(v) {
          if (v === 'yes') { localStorage.removeItem('retrodesk.desktop.v1'); location.reload(); }
        },
      });
    });
  },
});

/* ============================================================
   README(イースターエッグ案内)
   ============================================================ */
WM.register('secret', {
  title: 'README.txt - メモ帳ビューア',
  icon: Icons.doc,
  width: 440, height: 360,
  resizable: true, minW: 300, minH: 200,
  init(body) {
    body.innerHTML = `<div class="viewer-pre">RetroDesk 95 をお買い上げいただき
ありがとうございます。

1995 年へようこそ。ここでは時間が
ゆっくり流れます。モデムの音に耳を
すませて、お茶でもどうぞ。

▼ 開発チームからのひみつのメモ
 ・スタート → ファイル名を指定して実行 →
   「bsod」と入力すると、なつかしの
   青い画面に会えます。
 ・「インターネット」は今日も回線が
   混み合っています。
 ・90 秒さわらずにいると星空が
   流れはじめます。

それでは、よい一日を。
RetroDesk Systems, Inc.</div>`;
  },
});

/* ============================================================
   ようこそ
   ============================================================ */
WM.register('welcome', {
  title: 'RetroDesk 95 へようこそ',
  icon: Icons.logo,
  width: 470, height: 350,
  noMax: true,
  init(body, win) {
    body.innerHTML = `
      <div class="welcome-head">RetroDesk 95 へようこそ
        <small>はじめての方のためのワンポイント</small>
      </div>
      <ul class="welcome-tips">
        <li>デスクトップのアイコンは<b>ダブルクリック</b>で起動、<b>ドラッグ</b>で移動できます。</li>
        <li>いらないアイコンは<b>ごみ箱へドラッグ</b>。ごみ箱を開けば元に戻せます。</li>
        <li><b>メモ帳</b>は Ctrl+S でブラウザに保存され、次回も復元されます。</li>
        <li><b>マインスイーパー</b>は右クリックで旗を立てられます。</li>
        <li>困ったら [スタート] → [ヘルプ] をどうぞ。</li>
      </ul>
      <div class="welcome-foot">
        <label><input type="checkbox" class="welcome-skip"> 次回からこの画面を表示しない</label>
        <button class="btn95">閉じる</button>
      </div>
    `;
    const chk = body.querySelector('.welcome-skip');
    chk.checked = localStorage.getItem('retrodesk.hideWelcome') === '1';
    chk.addEventListener('change', () => {
      localStorage.setItem('retrodesk.hideWelcome', chk.checked ? '1' : '0');
    });
    body.querySelector('.welcome-foot .btn95').addEventListener('click', () => WM.close(win));
  },
});

/* ============================================================
   シャットダウンダイアログ
   ============================================================ */
WM.register('shutdown', {
  title: 'RetroDesk の終了',
  icon: Icons.shutdown,
  width: 380,
  dialog: true,
  init(body, win) {
    body.innerHTML = `
      <div class="shutdown-body">
        <span class="dlg-icon">${Icons.shutdown}</span>
        <div>
          <p style="margin-bottom:10px">どの方法で終了しますか?</p>
          <div class="shutdown-opts">
            <label><input type="radio" name="sd" value="off" checked> コンピュータの電源を切る</label>
            <label><input type="radio" name="sd" value="reboot"> 再起動する</label>
            <label class="off"><input type="radio" name="sd" disabled> MS-DOS モードで再起動する(未収録)</label>
          </div>
        </div>
      </div>
      <div class="dlg-buttons">
        <button class="btn95 sd-ok">OK</button>
        <button class="btn95 sd-cancel">キャンセル</button>
      </div>
    `;
    body.querySelector('.sd-cancel').addEventListener('click', () => WM.close(win, true));
    body.querySelector('.sd-ok').addEventListener('click', () => {
      const mode = body.querySelector('input[name="sd"]:checked').value;
      WM.close(win, true);
      System.shutdown(mode);
    });
  },
});
