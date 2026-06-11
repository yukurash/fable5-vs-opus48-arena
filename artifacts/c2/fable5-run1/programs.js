/* ============================================================
   RetroDesk 95 — programs.js
   アプリケーション(メモ帳 / ペイント / マインスイーパ /
   マイコンピュータ / ごみ箱 / IE / 実行 / バージョン情報 / 画面)
   ============================================================ */
'use strict';

const APPS = {};

function launch(appId) {
  const existing = WM.byApp[appId];
  if (existing) { existing.focus(); return existing; }
  if (APPS[appId]) {
    Sound.open();
    return APPS[appId].open();
  }
  errorDialog('アプリケーション "' + appId + '" が見つかりません。');
  return null;
}

/* ============================================================
   メモ帳
   ============================================================ */
APPS.notepad = {
  title: 'メモ帳', icon: 'notepad',
  open() {
    return createWindow({
      app: 'notepad', title: '無題 - メモ帳', icon: 'notepad',
      width: 500, height: 380, resizable: true, minWidth: 280, minHeight: 180,
      content(body, win) {
        let dirty = false;
        const ta = el('textarea', 'notepad-ta');
        ta.spellcheck = false;
        ta.value = load('notepad', '');
        const status = el('div', 'statusbar');
        const stMsg = el('div', 'cell');
        const stLen = el('div', 'cell narrow');
        status.append(stMsg, stLen);

        const updateTitle = () => win.setTitle((dirty ? '*' : '') + '無題 - メモ帳');
        const updateLen = () => { stLen.textContent = ta.value.length + ' 文字'; };
        const save = () => {
          store('notepad', ta.value);
          dirty = false;
          updateTitle();
          const d = new Date();
          stMsg.textContent = '保存しました (' +
            String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0') + ':' +
            String(d.getSeconds()).padStart(2, '0') + ') — 次回起動時に復元されます';
          Sound.click();
        };

        win.setMenus([
          {
            label: 'ファイル', items: [
              {
                label: '新規作成', action: () => {
                  const doNew = () => { ta.value = ''; dirty = true; updateTitle(); updateLen(); stMsg.textContent = '新規作成しました'; };
                  if (ta.value) confirmDialog('現在の内容を破棄して新規作成しますか?', doNew, 'メモ帳');
                  else doNew();
                }
              },
              { label: '上書き保存', key: 'Ctrl+S', action: save },
              '-',
              { label: 'メモ帳の終了', action: () => win.close() }
            ]
          },
          {
            label: '編集', items: [
              {
                label: '日付と時刻', key: 'F5', action: () => {
                  const d = new Date();
                  const s = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0') +
                    ' ' + d.getFullYear() + '/' + (d.getMonth() + 1) + '/' + d.getDate();
                  const p = ta.selectionStart;
                  ta.value = ta.value.slice(0, p) + s + ta.value.slice(ta.selectionEnd);
                  ta.selectionStart = ta.selectionEnd = p + s.length;
                  ta.dispatchEvent(new Event('input'));
                  ta.focus();
                }
              },
              { label: 'すべて選択', key: 'Ctrl+A', action: () => { ta.focus(); ta.select(); } }
            ]
          },
          {
            label: 'ヘルプ', items: [
              { label: 'バージョン情報', action: () => infoDialog('メモ帳  Version 4.00.950\n\n本文は localStorage に保存され、\n次にメモ帳を開いたとき復元されます。', 'メモ帳について') }
            ]
          }
        ]);

        ta.addEventListener('input', () => {
          if (!dirty) { dirty = true; updateTitle(); }
          updateLen();
        });
        ta.addEventListener('keydown', e => {
          if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); save(); }
          if (e.key === 'F5') { e.preventDefault(); }
        });

        stMsg.textContent = ta.value ? '前回保存した内容を復元しました' : '準備完了';
        updateLen();
        body.append(ta, status);
        setTimeout(() => ta.focus(), 0);
      }
    });
  }
};

/* ============================================================
   ペイント
   ============================================================ */
APPS.paint = {
  title: 'ペイント', icon: 'paint',
  open() {
    const CW = 432, CH = 300;
    const PALETTE = [
      '#000000', '#808080', '#800000', '#808000', '#008000', '#008080', '#000080', '#800080',
      '#808040', '#004040', '#0080ff', '#004080', '#8000ff', '#804000',
      '#ffffff', '#c0c0c0', '#ff0000', '#ffff00', '#00ff00', '#00ffff', '#0000ff', '#ff00ff',
      '#ffff80', '#00ff80', '#80ffff', '#8080ff', '#ff0080', '#ff8040'
    ];
    const TOOL_SVGS = {
      pencil: '<svg viewBox="0 0 17 17"><path d="M3 14l1-4 8-8 3 3-8 8z" fill="#ffd24a" stroke="#000"/><path d="M3 14l4-1-3-3z" fill="#000"/></svg>',
      brush: '<svg viewBox="0 0 17 17"><path d="M10 1l5 3-5 7-4-2.5z" fill="#b04020" stroke="#000"/><path d="M6 8.5l4 2.5-2 4c-3 1.5-5-1-4-3.5z" fill="#2040c0" stroke="#000"/></svg>',
      eraser: '<svg viewBox="0 0 17 17"><path d="M2 11l7-7 6 4-7 7H5z" fill="#ffb0c8" stroke="#000"/><path d="M5 8l6 4" stroke="#000"/></svg>',
      fill: '<svg viewBox="0 0 17 17"><path d="M8 2l6 6-5 5-6-6z" fill="#c0c0c0" stroke="#000"/><path d="M3 7l6 6" stroke="#000"/><path d="M14 10c1.5 2 2 3 2 4a2 2 0 1 1-4 0c0-1 .5-2 2-4z" fill="#2040c0"/></svg>',
      line: '<svg viewBox="0 0 17 17"><path d="M2 14L14 3" stroke="#000" stroke-width="1.6"/></svg>',
      rect: '<svg viewBox="0 0 17 17"><rect x="2.5" y="3.5" width="11" height="9" fill="none" stroke="#000" stroke-width="1.4"/></svg>',
      ellipse: '<svg viewBox="0 0 17 17"><ellipse cx="8.5" cy="8.5" rx="6" ry="4.5" fill="none" stroke="#000" stroke-width="1.4"/></svg>'
    };
    const TOOLS = ['pencil', 'brush', 'eraser', 'fill', 'line', 'rect', 'ellipse'];
    const TOOL_NAMES = {
      pencil: '鉛筆', brush: 'ブラシ', eraser: '消しゴム', fill: '塗りつぶし',
      line: '直線', rect: '四角形', ellipse: '楕円'
    };

    return createWindow({
      app: 'paint', title: '無題 - ペイント', icon: 'paint',
      content(body, win) {
        let tool = 'pencil', size = 3, color = '#000000';
        let drawing = false, sx = 0, sy = 0, snapshot = null, drawColor = '#000000';

        const canvas = el('canvas', 'paint-canvas');
        canvas.width = CW;
        canvas.height = CH;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, CW, CH);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        const clearCanvas = () => {
          ctx.fillStyle = '#fff';
          ctx.fillRect(0, 0, CW, CH);
          Sound.click();
        };
        const savePNG = () => {
          const a = document.createElement('a');
          a.download = 'retrodesk-paint.png';
          a.href = canvas.toDataURL('image/png');
          a.click();
        };

        win.setMenus([
          {
            label: 'ファイル', items: [
              { label: '新規 (クリア)', action: () => confirmDialog('キャンバスをクリアしますか?', clearCanvas, 'ペイント') },
              { label: '名前を付けて保存 (PNG)', action: savePNG },
              '-',
              { label: 'ペイントの終了', action: () => win.close() }
            ]
          },
          {
            label: '変形', items: [
              { label: '白黒反転', action: () => { ctx.globalCompositeOperation = 'difference'; ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, CW, CH); ctx.globalCompositeOperation = 'source-over'; } }
            ]
          },
          {
            label: 'ヘルプ', items: [
              { label: 'バージョン情報', action: () => infoDialog('ペイント  Version 4.00.950\n\n左ドラッグで描画、右ドラッグで背景色(白)。\n道具箱からツールと色を選べます。', 'ペイントについて') }
            ]
          }
        ]);

        /* --- レイアウト --- */
        const main = el('div', 'paint-main');
        const toolsBox = el('div', 'paint-tools');
        const toolBtns = {};
        TOOLS.forEach(t => {
          const b = el('button', 'ptool' + (t === tool ? ' sel' : ''), TOOL_SVGS[t]);
          b.title = TOOL_NAMES[t];
          b.addEventListener('click', () => {
            tool = t;
            Object.values(toolBtns).forEach(x => x.classList.remove('sel'));
            b.classList.add('sel');
            stTool.textContent = TOOL_NAMES[t];
          });
          toolBtns[t] = b;
          toolsBox.appendChild(b);
        });
        const clearBtn = el('button', 'ptool', '<svg viewBox="0 0 17 17"><rect x="2.5" y="2.5" width="12" height="12" fill="#fff" stroke="#000"/><path d="M5 5l7 7M12 5l-7 7" stroke="#c00" stroke-width="1.6"/></svg>');
        clearBtn.title = 'すべてクリア';
        clearBtn.addEventListener('click', () => confirmDialog('キャンバスをクリアしますか?', clearCanvas, 'ペイント'));
        toolsBox.appendChild(clearBtn);

        const sizesBox = el('div', 'paint-sizes');
        [1, 2, 3, 5, 8].forEach(s => {
          const row = el('div', 'psize' + (s === size ? ' sel' : ''));
          const bar = el('i');
          bar.style.height = Math.min(s, 9) + 'px';
          row.appendChild(bar);
          row.addEventListener('click', () => {
            size = s;
            sizesBox.querySelectorAll('.psize').forEach(x => x.classList.remove('sel'));
            row.classList.add('sel');
          });
          sizesBox.appendChild(row);
        });
        toolsBox.appendChild(sizesBox);

        const wrap = el('div', 'paint-canvas-wrap');
        wrap.appendChild(canvas);
        main.append(toolsBox, wrap);

        const colorsRow = el('div', 'paint-colors');
        const current = el('div', 'paint-current', '<div class="pc2"></div><div class="pc1"></div>');
        const pc1 = $('.pc1', current);
        const palette = el('div', 'paint-palette');
        PALETTE.forEach(c => {
          const sw = el('div', 'pswatch' + (c === color ? ' sel' : ''));
          sw.style.background = c;
          sw.title = c;
          sw.addEventListener('click', () => {
            color = c;
            pc1.style.background = c;
            palette.querySelectorAll('.pswatch').forEach(x => x.classList.remove('sel'));
            sw.classList.add('sel');
          });
          palette.appendChild(sw);
        });
        colorsRow.append(current, palette);

        const status = el('div', 'statusbar');
        const stTool = el('div', 'cell narrow');
        stTool.textContent = TOOL_NAMES[tool];
        stTool.style.minWidth = '90px';
        const stPos = el('div', 'cell');
        stPos.textContent = CW + ' × ' + CH + ' px';
        status.append(stTool, stPos);

        body.append(main, colorsRow, status);

        /* --- 描画ロジック --- */
        const pos = e => {
          const r = canvas.getBoundingClientRect();
          return {
            x: Math.round((e.clientX - r.left) * (canvas.width / r.width)),
            y: Math.round((e.clientY - r.top) * (canvas.height / r.height))
          };
        };
        const colorToU32 = c => {
          const t = document.createElement('canvas');
          t.width = t.height = 1;
          const tc = t.getContext('2d');
          tc.fillStyle = c;
          tc.fillRect(0, 0, 1, 1);
          const d = tc.getImageData(0, 0, 1, 1).data;
          return new Uint32Array(new Uint8ClampedArray([d[0], d[1], d[2], 255]).buffer)[0];
        };
        const floodFill = (x, y, c) => {
          if (x < 0 || y < 0 || x >= CW || y >= CH) return;
          const img = ctx.getImageData(0, 0, CW, CH);
          const data = new Uint32Array(img.data.buffer);
          const target = data[y * CW + x];
          const fill = colorToU32(c);
          if (target === fill) return;
          const stack = [x + y * CW];
          while (stack.length) {
            const p = stack.pop();
            if (data[p] !== target) continue;
            data[p] = fill;
            const px = p % CW;
            if (px > 0) stack.push(p - 1);
            if (px < CW - 1) stack.push(p + 1);
            if (p >= CW) stack.push(p - CW);
            if (p < CW * (CH - 1)) stack.push(p + CW);
          }
          ctx.putImageData(img, 0, 0);
        };
        const strokeShape = (x, y) => {
          ctx.putImageData(snapshot, 0, 0);
          ctx.strokeStyle = drawColor;
          ctx.lineWidth = size;
          ctx.beginPath();
          if (tool === 'line') {
            ctx.moveTo(sx, sy);
            ctx.lineTo(x, y);
          } else if (tool === 'rect') {
            ctx.rect(Math.min(sx, x), Math.min(sy, y), Math.abs(x - sx), Math.abs(y - sy));
          } else {
            ctx.ellipse((sx + x) / 2, (sy + y) / 2, Math.abs(x - sx) / 2, Math.abs(y - sy) / 2, 0, 0, Math.PI * 2);
          }
          ctx.stroke();
        };

        canvas.addEventListener('contextmenu', e => e.preventDefault());
        canvas.addEventListener('pointerdown', e => {
          if (e.button !== 0 && e.button !== 2) return;
          e.preventDefault();
          const p = pos(e);
          drawColor = e.button === 2 ? '#ffffff' : color;
          if (tool === 'fill') { floodFill(p.x, p.y, drawColor); return; }
          drawing = true;
          sx = p.x; sy = p.y;
          canvas.setPointerCapture(e.pointerId);
          if (tool === 'line' || tool === 'rect' || tool === 'ellipse') {
            snapshot = ctx.getImageData(0, 0, CW, CH);
          } else {
            ctx.strokeStyle = tool === 'eraser' ? '#ffffff' : drawColor;
            ctx.lineWidth = tool === 'pencil' ? 1 : tool === 'eraser' ? size * 3 : size;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p.x + 0.01, p.y + 0.01);
            ctx.stroke();
          }
        });
        canvas.addEventListener('pointermove', e => {
          const p = pos(e);
          stPos.textContent = p.x + ', ' + p.y + ' px';
          if (!drawing) return;
          if (tool === 'line' || tool === 'rect' || tool === 'ellipse') strokeShape(p.x, p.y);
          else { ctx.lineTo(p.x, p.y); ctx.stroke(); }
        });
        const finish = e => {
          if (!drawing) return;
          drawing = false;
          if (tool === 'line' || tool === 'rect' || tool === 'ellipse') {
            const p = pos(e);
            strokeShape(p.x, p.y);
            snapshot = null;
          }
        };
        canvas.addEventListener('pointerup', finish);
        canvas.addEventListener('pointercancel', () => { drawing = false; snapshot = null; });
      }
    });
  }
};

/* ============================================================
   マインスイーパ
   ============================================================ */
APPS.mine = {
  title: 'マインスイーパ', icon: 'mine',
  open() {
    const DIFF = {
      easy: { label: '初級', w: 9, h: 9, m: 10 },
      mid: { label: '中級', w: 16, h: 16, m: 40 },
      hard: { label: '上級', w: 30, h: 16, m: 99 }
    };
    return createWindow({
      app: 'mine', title: 'マインスイーパ', icon: 'mine',
      content(body, win) {
        let diff = 'easy';
        let W, H, M, mines, openArr, flagArr, started, dead, won, opened, flags, timerId, time;

        body.classList.add('ms-body');
        const panel = el('div', 'ms-panel');
        const statusRow = el('div', 'ms-status');
        const lcdMines = el('div', 'ms-lcd', '010');
        const face = el('button', 'ms-face', '🙂');
        face.title = '新しいゲーム';
        const lcdTime = el('div', 'ms-lcd', '000');
        statusRow.append(lcdMines, face, lcdTime);
        const grid = el('div', 'ms-grid');
        panel.append(statusRow, grid);
        body.appendChild(panel);

        const pad3 = n => {
          n = clamp(n, -99, 999);
          return n < 0 ? '-' + String(-n).padStart(2, '0') : String(n).padStart(3, '0');
        };
        const idx = (x, y) => y * W + x;
        const neighbors = i => {
          const x = i % W, y = (i / W) | 0, out = [];
          for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
            if (!dx && !dy) continue;
            const nx = x + dx, ny = y + dy;
            if (nx >= 0 && nx < W && ny >= 0 && ny < H) out.push(idx(nx, ny));
          }
          return out;
        };
        const stopTimer = () => { if (timerId) { clearInterval(timerId); timerId = null; } };
        const startTimer = () => {
          stopTimer();
          time = 0;
          lcdTime.textContent = '000';
          timerId = setInterval(() => {
            time = Math.min(999, time + 1);
            lcdTime.textContent = pad3(time);
          }, 1000);
        };

        const cells = [];
        const buildGrid = () => {
          grid.innerHTML = '';
          grid.style.gridTemplateColumns = 'repeat(' + W + ', 24px)';
          cells.length = 0;
          for (let i = 0; i < W * H; i++) {
            const c = el('div', 'ms-cell');
            c.dataset.i = i;
            cells.push(c);
            grid.appendChild(c);
          }
        };

        const newGame = (d) => {
          if (d) diff = d;
          const cfg = DIFF[diff];
          W = cfg.w; H = cfg.h; M = cfg.m;
          mines = new Array(W * H).fill(false);
          openArr = new Array(W * H).fill(false);
          flagArr = new Array(W * H).fill(false);
          started = dead = won = false;
          opened = flags = 0;
          stopTimer();
          time = 0;
          lcdTime.textContent = '000';
          lcdMines.textContent = pad3(M);
          face.textContent = '🙂';
          buildGrid();
          // ウィンドウがデスクトップからはみ出さないよう位置を補正
          requestAnimationFrame(() => {
            const dr = WM.desk().getBoundingClientRect();
            const r = win.el.getBoundingClientRect();
            win.el.style.left = clamp(r.left - dr.left, 0, Math.max(0, dr.width - r.width)) + 'px';
            win.el.style.top = clamp(r.top - dr.top, 0, Math.max(0, dr.height - r.height)) + 'px';
          });
        };

        const placeMines = (safe) => {
          const banned = new Set([safe, ...neighbors(safe)]);
          let placed = 0;
          while (placed < M) {
            const p = (Math.random() * W * H) | 0;
            if (mines[p] || banned.has(p)) continue;
            mines[p] = true;
            placed++;
          }
        };
        const countAround = i => neighbors(i).filter(n => mines[n]).length;

        const renderOpen = (i, n) => {
          const c = cells[i];
          c.classList.add('open');
          if (n > 0) {
            c.classList.add('n' + n);
            c.textContent = n;
          }
        };

        const reveal = (start) => {
          const stack = [start];
          while (stack.length) {
            const i = stack.pop();
            if (openArr[i] || flagArr[i]) continue;
            openArr[i] = true;
            opened++;
            const n = countAround(i);
            renderOpen(i, n);
            if (n === 0) neighbors(i).forEach(x => stack.push(x));
          }
        };

        const lose = (hit) => {
          dead = true;
          stopTimer();
          face.textContent = '😵';
          for (let i = 0; i < W * H; i++) {
            if (mines[i] && !flagArr[i]) {
              cells[i].classList.add('open');
              cells[i].innerHTML = ICONS.mine16;
            }
            if (!mines[i] && flagArr[i]) cells[i].classList.add('wrong');
          }
          cells[hit].classList.add('boom');
          Sound.boom();
        };

        const checkWin = () => {
          if (opened !== W * H - M) return;
          won = dead = true;
          stopTimer();
          face.textContent = '😎';
          for (let i = 0; i < W * H; i++) {
            if (mines[i] && !flagArr[i]) {
              flagArr[i] = true;
              cells[i].innerHTML = ICONS.flag16;
            }
          }
          lcdMines.textContent = '000';
          Sound.win();
          const best = load('mine-best-' + diff, null);
          if (best == null || time < best) {
            store('mine-best-' + diff, time);
            infoDialog(DIFF[diff].label + ' を ' + time + ' 秒でクリア!\n最速記録を更新しました 🏆', 'マインスイーパ');
          } else {
            infoDialog(DIFF[diff].label + ' を ' + time + ' 秒でクリア!\n(最速記録: ' + best + ' 秒)', 'マインスイーパ');
          }
        };

        const openCell = (i) => {
          if (dead || flagArr[i] || openArr[i]) return;
          if (!started) {
            started = true;
            placeMines(i);
            startTimer();
          }
          if (mines[i]) { openArr[i] = true; lose(i); return; }
          reveal(i);
          Sound.click();
          checkWin();
        };

        const chord = (i) => {
          if (dead || !openArr[i]) return;
          const n = countAround(i);
          if (!n) return;
          const around = neighbors(i);
          if (around.filter(x => flagArr[x]).length !== n) return;
          for (const x of around) {
            if (flagArr[x] || openArr[x]) continue;
            if (mines[x]) { openArr[x] = true; lose(x); return; }
            reveal(x);
          }
          checkWin();
        };

        const toggleFlag = (i) => {
          if (dead || openArr[i]) return;
          flagArr[i] = !flagArr[i];
          flags += flagArr[i] ? 1 : -1;
          cells[i].innerHTML = flagArr[i] ? ICONS.flag16 : '';
          lcdMines.textContent = pad3(M - flags);
          Sound.click();
        };

        grid.addEventListener('contextmenu', e => {
          e.preventDefault();
          const c = e.target.closest('.ms-cell');
          if (c) toggleFlag(+c.dataset.i);
        });
        grid.addEventListener('pointerdown', e => {
          if (e.button !== 0 || dead) return;
          const c = e.target.closest('.ms-cell');
          if (c && !openArr[+c.dataset.i]) face.textContent = '😮';
        });
        document.addEventListener('pointerup', () => {
          if (!dead && face.textContent === '😮') face.textContent = '🙂';
        });
        grid.addEventListener('click', e => {
          const c = e.target.closest('.ms-cell');
          if (!c) return;
          const i = +c.dataset.i;
          if (openArr[i]) chord(i);
          else openCell(i);
        });
        face.addEventListener('click', () => newGame());

        win.setMenus([
          {
            label: 'ゲーム', items: [
              { label: '新しいゲーム', key: 'F2', action: () => newGame() },
              '-',
              { label: '初級 (9×9・地雷10)', action: () => newGame('easy') },
              { label: '中級 (16×16・地雷40)', action: () => newGame('mid') },
              { label: '上級 (30×16・地雷99)', action: () => newGame('hard') },
              '-',
              { label: '終了', action: () => win.close() }
            ]
          },
          {
            label: 'ヘルプ', items: [
              {
                label: '遊び方', action: () => infoDialog(
                  '左クリック: マスを開く\n右クリック: 旗を立てる / はずす\n数字マスをクリック: 周囲の旗が数字と一致していれば残りを一括で開く\n\n地雷以外のマスをすべて開けば勝ちです。', 'マインスイーパ ヘルプ')
              },
              { label: 'バージョン情報', action: () => infoDialog('マインスイーパ  Version 4.00.950', 'バージョン情報') }
            ]
          }
        ]);

        win.el.addEventListener('keydown', e => { if (e.key === 'F2') { e.preventDefault(); newGame(); } });
        win.opts.onClose = () => stopTimer();
        newGame('easy');
      }
    });
  }
};

/* ============================================================
   ごみ箱
   ============================================================ */
APPS.bin = {
  title: 'ごみ箱', icon: 'bin',
  open() {
    return createWindow({
      app: 'bin', title: 'ごみ箱', icon: 'bin',
      width: 430, height: 320, resizable: true, minWidth: 320, minHeight: 200,
      content(body, win) {
        const toolbar = el('div', 'pane-toolbar');
        const info = el('span');
        const spacer = el('span', 'spacer');
        const emptyBtn = el('button', 'btn');
        emptyBtn.textContent = 'ごみ箱を空にする';
        emptyBtn.addEventListener('click', () => {
          if (!getTrashedItems().length) return;
          confirmDialog('ごみ箱の中身を完全に削除しますか?\nこの操作は元に戻せません。', () => emptyTrash(), 'ごみ箱を空にする');
        });
        toolbar.append(info, spacer, emptyBtn);
        const list = el('div', 'list-pane');
        body.append(toolbar, list);

        win.renderBin = () => {
          const items = getTrashedItems();
          info.textContent = items.length ? items.length + ' 個のオブジェクト' : '0 個のオブジェクト';
          list.innerHTML = '';
          if (!items.length) {
            list.appendChild(el('div', 'bin-empty-msg', 'ごみ箱は空です。<br>デスクトップのアイコンをごみ箱までドラッグすると、ここに入ります。'));
            return;
          }
          items.forEach(it => {
            const row = el('div', 'bin-row');
            row.innerHTML = iconHTML(it.icon, 24) + '<span class="nm"></span>';
            $('.nm', row).textContent = it.label;
            const btn = el('button', 'btn');
            btn.textContent = '元に戻す';
            btn.addEventListener('click', () => restoreFromTrash(it.id));
            row.appendChild(btn);
            list.appendChild(row);
          });
        };
        win.renderBin();
      }
    });
  }
};
function refreshBinWindow() {
  const w = WM.byApp.bin;
  if (w && w.renderBin) w.renderBin();
}

/* ============================================================
   マイ コンピュータ
   ============================================================ */
APPS.mycomputer = {
  title: 'マイ コンピュータ', icon: 'computer',
  open() {
    return createWindow({
      app: 'mycomputer', title: 'マイ コンピュータ', icon: 'computer',
      width: 420, height: 300, resizable: true, minWidth: 300, minHeight: 180,
      content(body, win) {
        const list = el('div', 'list-pane');
        const grid = el('div', 'fi-grid');
        list.appendChild(grid);
        const status = el('div', 'statusbar');
        const st = el('div', 'cell');
        st.textContent = '4 個のオブジェクト';
        status.appendChild(st);
        body.append(list, status);

        const items = [
          {
            icon: 'floppy', label: '3.5 インチ FD (A:)',
            open: () => errorDialog('A:\\ にアクセスできません。\nデバイスの準備ができていません。', 'ドライブにアクセスできません')
          },
          {
            icon: 'hdd', label: 'Retrodesk95 (C:)',
            open: () => infoDialog('Retrodesk95 (C:)\n\n種類: ローカル ディスク\n合計サイズ: 540 MB\n空き領域: 12.4 MB\n\nファイル システム: FAT16', 'Retrodesk95 (C:) のプロパティ')
          },
          {
            icon: 'cdrom', label: 'CD-ROM (D:)',
            open: () => errorDialog('D:\\ にアクセスできません。\nディスクを挿入してください。', 'ディスクがありません')
          },
          { icon: 'cpanel', label: 'コントロール パネル', open: () => launch('display') }
        ];
        items.forEach(it => {
          const f = el('div', 'fitem');
          f.innerHTML = '<div class="ic">' + ICONS[it.icon] + '</div><span class="lbl"></span>';
          $('.lbl', f).textContent = it.label;
          f.addEventListener('click', () => {
            grid.querySelectorAll('.fitem').forEach(x => x.classList.remove('selected'));
            f.classList.add('selected');
            st.textContent = it.label;
          });
          f.addEventListener('dblclick', it.open);
          grid.appendChild(f);
        });
      }
    });
  }
};

/* ============================================================
   インターネット エクスプローラ (もちろん繋がらない)
   ============================================================ */
APPS.ie = {
  title: 'インターネット エクスプローラ', icon: 'ie',
  open() {
    return createWindow({
      app: 'ie', title: 'ページを表示できません - インターネット エクスプローラ', icon: 'ie',
      width: 540, height: 420, resizable: true, minWidth: 360, minHeight: 240,
      content(body, win) {
        const toolbar = el('div', 'ie-toolbar');
        ['戻る', '進む', '中止', '更新', 'ホーム'].forEach((t, i) => {
          const b = el('button', 'btn');
          b.textContent = t;
          if (i < 2) b.disabled = true;
          else b.addEventListener('click', () => {
            Sound.error();
            errorDialog('ダイヤルアップ ネットワーク エラー 678:\nリモート コンピュータが応答しません。\n\nモデムの電源と電話線を確認してください。', 'ダイヤルアップ ネットワーク');
          });
          toolbar.appendChild(b);
        });
        const addr = el('div', 'ie-addr');
        addr.appendChild(el('span', null, 'アドレス:'));
        const input = el('input', 'tfield');
        input.value = 'http://www.retrodesk.example/welcome.html';
        input.addEventListener('keydown', e => {
          if (e.key === 'Enter') errorDialog('サーバーが見つかりません。\nダイヤルアップ接続が確立されていません。', 'インターネット エクスプローラ');
        });
        addr.appendChild(input);
        const page = el('div', 'ie-page',
          '<h1>ページを表示できません</h1>' +
          '<p>検索中のページは現在、利用できません。Web サイトに技術的な問題が発生しているか、ブラウザの設定を調整する必要があります。<br>……というのは建前で、<b>このパソコンは 2026 年のブラウザの中で動いています。</b>外の世界には繋がっていません。</p>' +
          '<hr><p>次のことを試してください:</p>' +
          '<p>・モデムのダイヤル音を懐かしむ<br>・<b>ピーーヒョロロロ…… ガーーッ</b> と口ずさむ<br>・あきらめてマインスイーパで遊ぶ</p>');
        const status = el('div', 'statusbar');
        const st = el('div', 'cell');
        st.textContent = 'インターネットに接続していません';
        status.appendChild(st);
        body.append(toolbar, addr, page, status);
      }
    });
  }
};

/* ============================================================
   ファイル名を指定して実行
   ============================================================ */
APPS.run = {
  title: 'ファイル名を指定して実行', icon: 'run',
  open() {
    const wrap = el('div');
    wrap.innerHTML = '<div style="margin-bottom:8px">実行したいアプリケーション名を入力してください。<br><span style="color:#606060">(例: notepad, mspaint, winmine, iexplore, explorer)</span></div>';
    const input = el('input', 'tfield');
    input.style.width = '100%';
    wrap.appendChild(input);
    const MAP = {
      notepad: 'notepad', memo: 'notepad', 'メモ帳': 'notepad',
      mspaint: 'paint', paint: 'paint', 'ペイント': 'paint',
      winmine: 'mine', mine: 'mine', minesweeper: 'mine', 'マインスイーパ': 'mine',
      iexplore: 'ie', ie: 'ie', internet: 'ie',
      explorer: 'mycomputer', mycomputer: 'mycomputer',
      bin: 'bin', trash: 'bin', 'ごみ箱': 'bin',
      control: 'display', display: 'display',
      about: 'about', ver: 'about'
    };
    const go = () => {
      const cmd = input.value.trim().toLowerCase();
      if (!cmd) return;
      if (MAP[cmd]) launch(MAP[cmd]);
      else errorDialog('"' + input.value.trim() + '" が見つかりません。\nファイル名を確認して、やり直してください。', 'ファイル名を指定して実行');
    };
    const w = dialog({
      title: 'ファイル名を指定して実行',
      icon: 'run',
      width: 380,
      contentEl: wrap,
      buttons: [{ label: 'OK', action: go }, { label: 'キャンセル' }]
    });
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') { w.close(); go(); }
    });
    setTimeout(() => input.focus(), 0);
    return w;
  }
};

/* ============================================================
   バージョン情報
   ============================================================ */
APPS.about = {
  title: 'バージョン情報', icon: 'info',
  open() {
    Sound.ding();
    return dialog({
      title: 'RetroDesk のバージョン情報',
      icon: 'info',
      width: 400,
      message:
        'RetroDesk 95\nVersion 4.00.950 (Build 2026.06)\n\n' +
        'このコンピュータには次のものが搭載されています:\n' +
        '　メモリ: 65,536 KB の RAM\n' +
        '　CPU: Claude Fable 5 @ 33MHz\n\n' +
        '静的な HTML / CSS / JavaScript のみで動作しています。\n' +
        'Copyright (C) 1995-2026 RetroDesk Corp.'
    });
  }
};

/* ============================================================
   画面のプロパティ
   ============================================================ */
APPS.display = {
  title: '画面のプロパティ', icon: 'display',
  open() {
    return createWindow({
      app: 'display', title: '画面のプロパティ', icon: 'display',
      width: 280,
      content(body, win) {
        const COLORS = ['#008080', '#3a6ea5', '#000080', '#2f4f4f', '#808000', '#6b2f6b', '#555555', '#005c30'];
        const cur = load('deskbg', '#008080');
        const pad = el('div', 'pad');
        pad.appendChild(el('div', 'disp-label', '背景色:'));
        const grid = el('div', 'disp-swatches');
        COLORS.forEach(c => {
          const sw = el('div', 'disp-sw' + (c === cur ? ' sel' : ''));
          sw.style.background = c;
          sw.addEventListener('click', () => {
            grid.querySelectorAll('.disp-sw').forEach(x => x.classList.remove('sel'));
            sw.classList.add('sel');
            $('#desktop').style.background = c;
            store('deskbg', c);
            Sound.click();
          });
          grid.appendChild(sw);
        });
        pad.appendChild(grid);
        const row = el('div', 'dlg-btns');
        const ok = el('button', 'btn');
        ok.textContent = '閉じる';
        ok.addEventListener('click', () => win.close());
        row.appendChild(ok);
        body.append(pad, row);
      }
    });
  }
};
