'use strict';
/* ============================================================
   RetroDesk 95 — アイコン (インライン SVG)
   ============================================================ */
const Icons = (() => {
  const svg = (body, vb = '0 0 32 32', crisp = true) =>
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}"${crisp ? ' shape-rendering="crispEdges"' : ''} aria-hidden="true">${body}</svg>`;

  /* ---- RetroDesk ロゴ(4色フラッグ) ---- */
  const logo = svg(
    `<rect x="1" y="1" width="6.4" height="6.4" fill="#ff3d2e"/>
     <rect x="8.6" y="1" width="6.4" height="6.4" fill="#00a82d"/>
     <rect x="1" y="8.6" width="6.4" height="6.4" fill="#0050ef"/>
     <rect x="8.6" y="8.6" width="6.4" height="6.4" fill="#ffc800"/>`,
    '0 0 16 16');

  /* ---- マイ コンピュータ ---- */
  const computer = svg(
    `<rect x="3" y="2" width="26" height="20" fill="#000"/>
     <rect x="4" y="3" width="24" height="18" fill="#c0c0c0"/>
     <rect x="5" y="4" width="22" height="1" fill="#fff"/>
     <rect x="5" y="4" width="1" height="15" fill="#fff"/>
     <rect x="6" y="6" width="20" height="13" fill="#000"/>
     <rect x="7" y="7" width="18" height="11" fill="#008080"/>
     <rect x="9" y="9" width="12" height="7" fill="#fff"/>
     <rect x="9" y="9" width="12" height="2" fill="#000080"/>
     <rect x="8" y="8" width="2" height="1" fill="#b0ffff"/>
     <rect x="13" y="22" width="6" height="2" fill="#808080"/>
     <rect x="6" y="24" width="20" height="5" fill="#000"/>
     <rect x="7" y="25" width="18" height="3" fill="#c0c0c0"/>
     <rect x="9" y="26" width="8" height="1" fill="#606060"/>
     <rect x="21" y="26" width="2" height="1" fill="#00b000"/>`);

  /* ---- ごみ箱 ---- */
  const binBase = (extra) => svg(
    `${extra}
     <path d="M7.5 9 L10 27.5 Q16 30 22 27.5 L24.5 9 Z" fill="#cacaca" stroke="#000" stroke-width="1"/>
     <path d="M11.4 11 L12.6 26" stroke="#8a8a8a" fill="none"/>
     <path d="M16 11.4 L16 26.6" stroke="#8a8a8a" fill="none"/>
     <path d="M20.6 11 L19.4 26" stroke="#8a8a8a" fill="none"/>
     <ellipse cx="16" cy="8.6" rx="9" ry="2.9" fill="#9a9a9a" stroke="#000"/>
     <ellipse cx="16" cy="8.6" rx="6.4" ry="1.7" fill="#555"/>
     <path d="M14 20.5 l2 -3.4 2 3.4 z M13.4 21.8 h5.2 l-1.1 1.9 h-3 z" fill="#0a7a2a"/>`,
    '0 0 32 32', false);

  const bin = binBase('');
  const binFull = binBase(
    `<circle cx="11.5" cy="5.6" r="3.1" fill="#fff" stroke="#000"/>
     <path d="M9.8 5.2 l1.6 1 1.4 -1.4" stroke="#999" fill="none"/>
     <polygon points="16,1.6 21.4,3.4 19.8,7.6 15,6.4" fill="#ffe9a8" stroke="#000"/>
     <circle cx="23.4" cy="6.4" r="2.5" fill="#e8e8e8" stroke="#000"/>`);

  /* ---- メモ帳 ---- */
  const notepad = svg(
    `<rect x="6" y="2" width="20" height="28" fill="#000"/>
     <rect x="7" y="3" width="18" height="26" fill="#fff"/>
     <polygon points="19,3 25,9 25,3" fill="#b8b8b8"/>
     <rect x="9" y="9" width="13" height="1" fill="#6868c8"/>
     <rect x="9" y="12" width="13" height="1" fill="#6868c8"/>
     <rect x="9" y="15" width="13" height="1" fill="#6868c8"/>
     <rect x="9" y="18" width="13" height="1" fill="#6868c8"/>
     <rect x="9" y="21" width="9" height="1" fill="#6868c8"/>
     <rect x="9" y="5" width="7" height="2" fill="#000080"/>`);

  /* ---- ドキュメント ---- */
  const doc = svg(
    `<rect x="7" y="2" width="18" height="28" fill="#000"/>
     <rect x="8" y="3" width="16" height="26" fill="#fff"/>
     <polygon points="18,3 24,9 24,3" fill="#b8b8b8"/>
     <rect x="10" y="11" width="11" height="1" fill="#444"/>
     <rect x="10" y="14" width="11" height="1" fill="#444"/>
     <rect x="10" y="17" width="11" height="1" fill="#444"/>
     <rect x="10" y="20" width="11" height="1" fill="#444"/>
     <rect x="10" y="23" width="7" height="1" fill="#444"/>`);

  /* ---- ペイント ---- */
  const paint = svg(
    `<ellipse cx="14.5" cy="19" rx="12" ry="9.4" fill="#d8b078" stroke="#000"/>
     <ellipse cx="19" cy="21.6" rx="3.2" ry="2.3" fill="#efe0c4" stroke="#000"/>
     <circle cx="7.6" cy="15.6" r="2.2" fill="#ff0000" stroke="#000" stroke-width=".6"/>
     <circle cx="12.4" cy="12.4" r="2.2" fill="#ffd000" stroke="#000" stroke-width=".6"/>
     <circle cx="18.6" cy="13.2" r="2.2" fill="#0040ff" stroke="#000" stroke-width=".6"/>
     <circle cx="7.8" cy="21.8" r="2.2" fill="#00a000" stroke="#000" stroke-width=".6"/>
     <line x1="27" y1="3" x2="20" y2="13" stroke="#000" stroke-width="3.6"/>
     <line x1="26.6" y1="3.6" x2="20.4" y2="12.4" stroke="#8a4a10" stroke-width="2"/>
     <line x1="21.6" y1="10.8" x2="20.4" y2="12.6" stroke="#c0c0c0" stroke-width="2.4"/>
     <polygon points="20.6,11.6 21.6,13.4 18.4,16.2 17.6,14.4" fill="#ff0000" stroke="#000" stroke-width=".5"/>`,
    '0 0 32 32', false);

  /* ---- マインスイーパー ---- */
  const mines = svg(
    `<line x1="16" y1="4" x2="16" y2="28" stroke="#000" stroke-width="2.4"/>
     <line x1="4" y1="16" x2="28" y2="16" stroke="#000" stroke-width="2.4"/>
     <line x1="8" y1="8" x2="24" y2="24" stroke="#000" stroke-width="2"/>
     <line x1="24" y1="8" x2="8" y2="24" stroke="#000" stroke-width="2"/>
     <circle cx="16" cy="16" r="8.4" fill="#000"/>
     <rect x="12.4" y="12.4" width="3.4" height="3.4" fill="#fff"/>`,
    '0 0 32 32', false);

  /* ---- インターネット ---- */
  const internet = svg(
    `<circle cx="16" cy="16" r="12.4" fill="#2a6fdb" stroke="#000"/>
     <path d="M8 10 q4.4 -4.4 9 -2.2 q2.4 2 -.8 4.2 q-5.6 1.4 -8.2 -2 z" fill="#3fae49"/>
     <path d="M18 18.6 q5.4 -1.2 6.6 3 q-1.8 5.4 -6.4 3.4 q-2.4 -3.2 -.2 -6.4 z" fill="#3fae49"/>
     <path d="M7 21 q2.4 -1.6 4 .4 q.6 2.4 -1.8 3 q-2.2 -.8 -2.2 -3.4 z" fill="#3fae49"/>
     <ellipse cx="16" cy="16" rx="12.4" ry="4.8" fill="none" stroke="#9cc3ff" stroke-width=".9"/>
     <ellipse cx="16" cy="16" rx="5.4" ry="12.4" fill="none" stroke="#9cc3ff" stroke-width=".9"/>`,
    '0 0 32 32', false);

  /* ---- ヘルプ ---- */
  const help = svg(
    `<circle cx="16" cy="16" r="11.6" fill="#ffd83d" stroke="#000"/>
     <text x="16" y="22.4" text-anchor="middle" font-size="17" font-weight="bold" font-family="Verdana,sans-serif" fill="#000080">?</text>`,
    '0 0 32 32', false);

  /* ---- ファイル名を指定して実行 ---- */
  const run = svg(
    `<rect x="3" y="7" width="26" height="18" fill="#000"/>
     <rect x="4" y="8" width="24" height="16" fill="#c0c0c0"/>
     <rect x="4" y="8" width="24" height="4" fill="#000080"/>
     <rect x="6" y="14" width="14" height="8" fill="#fff"/>
     <rect x="6" y="14" width="14" height="8" fill="none" stroke="#808080" stroke-width="1"/>
     <polygon points="20,28 20,16 28,24 23.6,24 26,29.4 23.4,30.4 21.2,25.4" fill="#fff" stroke="#000"/>`,
    '0 0 32 32', false);

  /* ---- シャットダウン ---- */
  const shutdown = svg(
    `<circle cx="16" cy="17.4" r="9.6" fill="none" stroke="#c00000" stroke-width="3.4"/>
     <rect x="14.3" y="3.4" width="3.4" height="11" fill="#c00000"/>
     <rect x="13.6" y="2.8" width="4.8" height="1" fill="#800000"/>`,
    '0 0 32 32', false);

  /* ---- スクリーンセーバー ---- */
  const ssaver = svg(
    `<rect x="3" y="2" width="26" height="20" fill="#000"/>
     <rect x="4" y="3" width="24" height="18" fill="#c0c0c0"/>
     <rect x="6" y="5" width="20" height="14" fill="#000020"/>
     <rect x="9" y="8" width="2" height="2" fill="#fff"/>
     <rect x="16" y="6" width="1" height="1" fill="#ffe080"/>
     <rect x="21" y="10" width="2" height="2" fill="#80c0ff"/>
     <rect x="12" y="14" width="1" height="1" fill="#fff"/>
     <rect x="19" y="16" width="2" height="2" fill="#ffe080"/>
     <rect x="13" y="22" width="6" height="2" fill="#808080"/>
     <rect x="6" y="24" width="20" height="5" fill="#000"/>
     <rect x="7" y="25" width="18" height="3" fill="#c0c0c0"/>`);

  /* ---- フォルダ(プログラム) ---- */
  const folder = svg(
    `<polygon points="3,7 13,7 15,10 29,10 29,26 3,26" fill="#000"/>
     <polygon points="4,8 12.5,8 14.5,11 28,11 28,25 4,25" fill="#ffd768"/>
     <rect x="4" y="11" width="24" height="2" fill="#ffe9a8"/>`);

  /* ---- ドライブ ---- */
  const drive = svg(
    `<rect x="3" y="11" width="26" height="10" fill="#000"/>
     <rect x="4" y="12" width="24" height="8" fill="#c0c0c0"/>
     <rect x="4" y="12" width="24" height="1" fill="#fff"/>
     <rect x="22" y="16" width="2" height="2" fill="#00b000"/>
     <rect x="6" y="16" width="10" height="1" fill="#606060"/>`);

  const floppy = svg(
    `<rect x="5" y="6" width="22" height="20" fill="#000"/>
     <rect x="6" y="7" width="20" height="18" fill="#303060"/>
     <rect x="10" y="7" width="12" height="7" fill="#c0c0c0"/>
     <rect x="17" y="8" width="3" height="5" fill="#303060"/>
     <rect x="9" y="17" width="14" height="8" fill="#fff"/>
     <rect x="11" y="19" width="10" height="1" fill="#888"/>
     <rect x="11" y="21" width="10" height="1" fill="#888"/>`);

  /* ---- スピーカー ---- */
  const speaker = svg(
    `<polygon points="2,6 5.4,6 9.6,2.4 9.6,13.6 5.4,10 2,10" fill="#000"/>
     <path d="M11.4 5 q2.6 3 0 6" stroke="#000" fill="none" stroke-width="1.2"/>
     <path d="M13.2 3.4 q4 4.6 0 9.2" stroke="#000" fill="none" stroke-width="1.2"/>`,
    '0 0 16 16', false);

  const speakerMute = svg(
    `<polygon points="2,6 5.4,6 9.6,2.4 9.6,13.6 5.4,10 2,10" fill="#000"/>
     <path d="M11 5.6 L15 10.4 M15 5.6 L11 10.4" stroke="#c00" stroke-width="1.6"/>`,
    '0 0 16 16', false);

  /* ---- タイトルバーのボタン ---- */
  const btnMin = svg(`<rect x="2" y="7" width="6" height="2" fill="#000"/>`, '0 0 12 10');
  const btnMax = svg(
    `<rect x="1" y="1" width="9" height="8" fill="none" stroke="#000"/>
     <rect x="1" y="1" width="9" height="2" fill="#000"/>`, '0 0 12 10');
  const btnRestore = svg(
    `<rect x="3" y="0" width="8" height="6" fill="none" stroke="#000"/>
     <rect x="3" y="0" width="8" height="2" fill="#000"/>
     <rect x="1" y="3" width="8" height="7" fill="#c0c0c0" stroke="#000"/>
     <rect x="1" y="3" width="8" height="2" fill="#000"/>`, '0 0 12 10');
  const btnClose = svg(
    `<path d="M2.5 1.5 L9.5 8.5 M9.5 1.5 L2.5 8.5" stroke="#000" stroke-width="1.6"/>`,
    '0 0 12 10', false);

  /* ---- マインスイーパーの顔 ---- */
  const faceBase = (feat) => svg(
    `<circle cx="10" cy="10" r="8.6" fill="#ffd83d" stroke="#000" stroke-width="1.1"/>${feat}`,
    '0 0 20 20', false);
  const faceSmile = faceBase(
    `<circle cx="7" cy="8" r="1.2" fill="#000"/><circle cx="13" cy="8" r="1.2" fill="#000"/>
     <path d="M6.4 12.4 q3.6 3.6 7.2 0" stroke="#000" fill="none" stroke-width="1.2"/>`);
  const faceOh = faceBase(
    `<circle cx="7" cy="7.6" r="1.3" fill="#000"/><circle cx="13" cy="7.6" r="1.3" fill="#000"/>
     <circle cx="10" cy="13.4" r="2.2" fill="none" stroke="#000" stroke-width="1.2"/>`);
  const faceDead = faceBase(
    `<path d="M5.4 6.4 l3 3 M8.4 6.4 l-3 3 M11.6 6.4 l3 3 M14.6 6.4 l-3 3" stroke="#000" stroke-width="1.1"/>
     <path d="M6.6 14.8 q3.4 -3 6.8 0" stroke="#000" fill="none" stroke-width="1.2"/>`);
  const faceCool = faceBase(
    `<rect x="3.4" y="6" width="13.2" height="1.4" fill="#000"/>
     <path d="M4.6 7.4 h4.6 l-.7 2.4 a1.8 1.8 0 0 1 -3.2 0 z" fill="#000"/>
     <path d="M10.8 7.4 h4.6 l-.7 2.4 a1.8 1.8 0 0 1 -3.2 0 z" fill="#000"/>
     <path d="M6.8 13.6 q3.2 3 6.4 0" stroke="#000" fill="none" stroke-width="1.2"/>`);

  /* ---- マインスイーパーのセル ---- */
  const flag = svg(
    `<rect x="8" y="2" width="1.6" height="9" fill="#000"/>
     <polygon points="9.6,2 9.6,7.4 3.4,4.7" fill="#f00"/>
     <rect x="5" y="11" width="8" height="1.6" fill="#000"/>
     <rect x="3.6" y="12.6" width="10.8" height="1.6" fill="#000"/>`,
    '0 0 17 16', false);

  const mineCell = svg(
    `<line x1="8" y1="1.4" x2="8" y2="14.6" stroke="#000" stroke-width="1.4"/>
     <line x1="1.4" y1="8" x2="14.6" y2="8" stroke="#000" stroke-width="1.4"/>
     <line x1="3.4" y1="3.4" x2="12.6" y2="12.6" stroke="#000" stroke-width="1.2"/>
     <line x1="12.6" y1="3.4" x2="3.4" y2="12.6" stroke="#000" stroke-width="1.2"/>
     <circle cx="8" cy="8" r="4.6" fill="#000"/>
     <rect x="6" y="6" width="1.8" height="1.8" fill="#fff"/>`,
    '0 0 16 16', false);

  /* ---- ダイアログアイコン ---- */
  const dlgError = svg(
    `<circle cx="18" cy="18" r="15.4" fill="#ff0000" stroke="#800000"/>
     <path d="M11.6 11.6 L24.4 24.4 M24.4 11.6 L11.6 24.4" stroke="#fff" stroke-width="3.4"/>`,
    '0 0 36 36', false);
  const dlgWarn = svg(
    `<polygon points="18,2.6 34.4,32.4 1.6,32.4" fill="#ffe14d" stroke="#000"/>
     <rect x="16.2" y="12" width="3.6" height="10.4" fill="#000"/>
     <rect x="16.2" y="25.4" width="3.6" height="3.6" fill="#000"/>`,
    '0 0 36 36', false);
  const dlgInfo = svg(
    `<circle cx="18" cy="18" r="15.4" fill="#fff" stroke="#000080"/>
     <rect x="16" y="14.4" width="4" height="13" fill="#000080"/>
     <circle cx="18" cy="9.6" r="2.6" fill="#000080"/>`,
    '0 0 36 36', false);
  const dlgQuestion = svg(
    `<circle cx="18" cy="18" r="15.4" fill="#fff" stroke="#000080"/>
     <text x="18" y="26" text-anchor="middle" font-size="22" font-weight="bold" font-family="Verdana,sans-serif" fill="#000080">?</text>`,
    '0 0 36 36', false);

  /* ---- ペイントのツール ---- */
  const toolPen = svg(
    `<polygon points="12.2,1.2 14.8,3.8 6,12.6 2.6,13.4 3.4,10" fill="#ffd000" stroke="#000" stroke-width=".9"/>
     <polygon points="3.4,10 6,12.6 2.6,13.4" fill="#000"/>`,
    '0 0 16 16', false);
  const toolLine = svg(
    `<line x1="2" y1="14" x2="14" y2="2" stroke="#000" stroke-width="1.8"/>`,
    '0 0 16 16', false);
  const toolFill = svg(
    `<path d="M7.6 1.6 L14 8 L8 14 L1.6 7.6 Z" fill="#c0c0c0" stroke="#000"/>
     <path d="M7.6 1.6 L7.6 9" stroke="#000"/>
     <path d="M13.4 10.4 q2 2.6 .4 4 q-1.8 1 -2.4 -1.2 q.4 -1.8 2 -2.8 z" fill="#0050ef"/>`,
    '0 0 16 16', false);
  const toolSpray = svg(
    `<rect x="6" y="5" width="6" height="9" fill="#9a9a9a" stroke="#000"/>
     <rect x="7.6" y="2.6" width="2.8" height="2.4" fill="#000"/>
     <rect x="1.6" y="1.6" width="1.4" height="1.4" fill="#000"/>
     <rect x="4" y="3" width="1.4" height="1.4" fill="#000"/>
     <rect x="1.6" y="5" width="1.4" height="1.4" fill="#000"/>
     <rect x="13.6" y="7" width="1.4" height="1.4" fill="#000"/>`,
    '0 0 16 16', false);
  const toolEraser = svg(
    `<polygon points="4,9 9.6,3.4 14.6,8.4 9,14 4,14" fill="#ffb0c8" stroke="#000"/>
     <polygon points="4,9 9,9 9,14 4,14" fill="#e88aa8" stroke="#000"/>`,
    '0 0 16 16', false);

  return {
    logo, computer, bin, binFull, notepad, doc, paint, mines, internet, help,
    run, shutdown, ssaver, folder, drive, floppy, speaker, speakerMute,
    btnMin, btnMax, btnRestore, btnClose,
    faceSmile, faceOh, faceDead, faceCool, flag, mineCell,
    dlgError, dlgWarn, dlgInfo, dlgQuestion,
    toolPen, toolLine, toolFill, toolSpray, toolEraser,
  };
})();
