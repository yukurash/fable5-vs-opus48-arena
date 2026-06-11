/* ============================================================
   絶対に押してはいけないボタン — 演出エンジン
   ============================================================ */
"use strict";

const $ = (sel) => document.querySelector(sel);

const body       = document.body;
const theButton  = $("#the-button");
const cover      = $("#cover");
const lcd        = $("#screen");
const lcdText    = $("#lcd-text");
const pressEl    = $("#press-count");
const totalEl    = $("#total-count");
const levelEl    = $("#alert-level");
const assembly   = $("#button-assembly");
const muteBtn    = $("#mute-btn");
const muteIcon   = $("#mute-icon");

/* ---------------- 状態 ---------------- */
let presses   = 0;
let busy      = false;   // カットシーン中は入力無視
let dodging   = false;
let dodgesLeft = 0;
let muted     = false;
let errSpawned = 0;
let errOpen    = 0;
let idleTimer  = null;
let epilogueIdx = 0;

let totalEver = 0;
try { totalEver = parseInt(localStorage.getItem("forbidden-total") || "0", 10) || 0; } catch (e) {}
totalEl.textContent = totalEver;

/* ---------------- サウンド (WebAudio・素材不要) ---------------- */
let actx = null;
function audio() {
  if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)();
  if (actx.state === "suspended") actx.resume();
  return actx;
}
function tone(freq, dur, type = "square", vol = 0.18, when = 0) {
  if (muted) return;
  const ctx = audio();
  const t = ctx.currentTime + when;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(ctx.destination);
  o.start(t);
  o.stop(t + dur + 0.05);
}
function thunk() { // ボタンを押した「ゴッ」という音
  if (muted) return;
  const ctx = audio();
  const t = ctx.currentTime;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = "sine";
  o.frequency.setValueAtTime(150, t);
  o.frequency.exponentialRampToValueAtTime(40, t + 0.12);
  g.gain.setValueAtTime(0.5, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
  o.connect(g).connect(ctx.destination);
  o.start(t); o.stop(t + 0.2);
}
function klaxon(cycles = 3) { // 警報「ファンファン」
  for (let i = 0; i < cycles; i++) {
    tone(620, 0.34, "sawtooth", 0.10, i * 0.7);
    tone(440, 0.34, "sawtooth", 0.10, i * 0.7 + 0.35);
  }
}
function glitchNoise() {
  if (muted) return;
  const ctx = audio();
  const len = ctx.sampleRate * 0.4;
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ctx.createBufferSource();
  const g = ctx.createGain();
  g.gain.value = 0.12;
  src.buffer = buf;
  src.connect(g).connect(ctx.destination);
  src.start();
}
function fanfare() {
  [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.5, "triangle", 0.14, i * 0.16));
  tone(1319, 0.9, "triangle", 0.14, 0.66);
}

/* ---------------- LCDタイプライター ---------------- */
let typeTimer = null;
function say(text, mood = "") {
  clearInterval(typeTimer);
  lcd.classList.remove("warn", "danger");
  if (mood) lcd.classList.add(mood);
  lcdText.textContent = "";
  let i = 0;
  typeTimer = setInterval(() => {
    lcdText.textContent = text.slice(0, ++i);
    if (i % 2 === 0) tone(2400, 0.015, "square", 0.015);
    if (i >= text.length) clearInterval(typeTimer);
  }, 34);
}

/* ---------------- 各種エフェクト ---------------- */
function shake(hard = false) {
  body.classList.remove("shake", "shake-hard");
  void body.offsetWidth; // アニメーション再始動
  body.classList.add(hard ? "shake-hard" : "shake");
}
function setLevel(n) {
  levelEl.textContent = n;
  levelEl.classList.remove("bump"); void levelEl.offsetWidth;
  levelEl.classList.add("bump");
}
function bumpCounter() {
  pressEl.textContent = String(presses).padStart(2, "0");
  pressEl.classList.remove("bump"); void pressEl.offsetWidth;
  pressEl.classList.add("bump");
  totalEl.textContent = ++totalEver;
  try { localStorage.setItem("forbidden-total", String(totalEver)); } catch (e) {}
}

const TITLES = [
  "絶対に押してはいけないボタン",
  "押しましたね?",
  "押すなと言った",
  "おい",
  "本気で怒るよ",
  "⚠ 警戒態勢 ⚠",
  "上司に報告済み",
  "ボタンにも人権を",
  "逃げるボタン",
  "悟ったボタン",
  "自爆(未遂)",
  "猫がくしゃみ",
  "猫、迷惑",
  "ｼｽﾃﾑ異常",
  "演出でした",
  "エラー祭り",
  "閉じても無駄",
  "施設、傾く",
  "次で最後に",
  "次、押したら終わり",
  "世界、再起動",
];
function setTitle(n) {
  document.title = TITLES[Math.min(n, TITLES.length - 1)];
}

/* ---- ボタンが逃げる ---- */
function enableDodge() {
  dodging = true;
  dodgesLeft = 4;
}
function disableDodge() {
  dodging = false;
  assembly.style.transform = "";
}
theButton.addEventListener("pointerenter", () => {
  if (!dodging || busy) return;
  if (dodgesLeft-- <= 0) { assembly.style.transform = ""; return; }
  const stage = $("#button-stage").getBoundingClientRect();
  const maxX = Math.max(20, (stage.width - 210) / 2);
  const x = (Math.random() * 2 - 1) * maxX;
  const y = (Math.random() * 2 - 1) * 28;
  assembly.style.transform = `translate(${x.toFixed(0)}px, ${y.toFixed(0)}px)`;
  tone(880 + Math.random() * 400, 0.08, "square", 0.06);
});

/* ---- カウントダウン(自爆未遂) ---- */
function runCountdown(thenSay) {
  busy = true;
  const ov = $("#countdown");
  const num = $("#cd-number");
  ov.classList.remove("hidden");
  let n = 10;
  const step = () => {
    if (n === 0) {
      ov.classList.add("hidden");
      busy = false;
      say(thenSay, "warn");
      setTitle(10);
      return;
    }
    num.textContent = n;
    num.classList.remove("tick"); void num.offsetWidth;
    num.classList.add("tick");
    tone(n <= 3 ? 1200 : 880, 0.18, "square", 0.15);
    shake(n <= 3);
    n--;
    setTimeout(step, n === 0 ? 1300 : 850);
  };
  step();
}

/* ---- エラーダイアログ祭り ---- */
const ERR_TEXTS = [
  "押すなと言いました.exe は応答していません。",
  "常識が見つかりません。(エラー404)",
  "好奇心が制御不能です。再起動しても直りません。",
  "reality.dll の読み込みに失敗しました。",
  "警告文の既読がつきません。読んでください。",
  "ボタンの気持ちを考えたことはありますか?",
  "あなたの自制心は移動または削除された可能性があります。",
];
function spawnError(count = 1) {
  const layer = $("#error-layer");
  for (let i = 0; i < count; i++) {
    if (errSpawned >= 12) return;
    errSpawned++; errOpen++;
    const d = document.createElement("div");
    d.className = "err-dialog";
    d.style.left = 8 + Math.random() * Math.max(40, window.innerWidth - 330) + "px";
    d.style.top = 8 + Math.random() * Math.max(40, window.innerHeight - 200) + "px";
    d.innerHTML = `
      <div class="err-title"><span>重大なエラー</span><button class="err-x">✕</button></div>
      <div class="err-body"><span class="err-icon">⛔</span><span>${ERR_TEXTS[errSpawned % ERR_TEXTS.length]}</span></div>
      <button class="err-ok">OK(よくない)</button>`;
    const close = () => {
      d.remove();
      errOpen--;
      tone(330, 0.1, "square", 0.08);
      if (errSpawned < 12) spawnError(2); // 閉じると増える、お約束
      else if (errOpen === 0) say("……全部閉じましたね。律儀な人だ。少し見直しました。でも押すな。", "warn");
    };
    d.querySelector(".err-x").addEventListener("click", close);
    d.querySelector(".err-ok").addEventListener("click", close);
    layer.appendChild(d);
    tone(660, 0.12, "square", 0.1, i * 0.08);
  }
}

/* ---- 世界の再起動シーケンス ---- */
const REBOOT_LINES = [
  "WORLD BIOS v2.6 — SAIKIDO SYSTEMS",
  "",
  "メモリチェック ............... OK",
  "物理法則 ..................... 読込済",
  "重力 ......................... ON",
  "海 ........................... 注水完了",
  "猫 ........................... 12匹 くしゃみから復旧",
  "人類の常識 ................... 見つかりません(スキップ)",
  "押してはいけないボタン ....... 再設置済(なぜ)",
  "",
  "世界を再起動しています ...",
];
function worldReboot() {
  busy = true;
  body.classList.remove("tilted", "alert");

  // 1) ブルースクリーン
  const bsod = $("#bsod");
  const pct = $("#bsod-pct");
  bsod.classList.remove("hidden");
  glitchNoise();
  let p = 0;
  const pctTimer = setInterval(() => {
    p = Math.min(100, p + Math.floor(Math.random() * 9) + 1);
    pct.textContent = p;
    if (p >= 100) clearInterval(pctTimer);
  }, 180);

  // 2) 再起動コンソール
  setTimeout(() => {
    bsod.classList.add("hidden");
    const reboot = $("#reboot");
    const log = $("#reboot-log");
    log.textContent = "";
    reboot.classList.remove("hidden");
    REBOOT_LINES.forEach((line, i) => {
      setTimeout(() => {
        log.textContent += line + "\n";
        if (line) tone(1500, 0.03, "square", 0.04);
      }, 320 * i);
    });

    // 3) 認定証
    setTimeout(() => {
      reboot.classList.add("hidden");
      $("#certificate").classList.remove("hidden");
      fanfare();
      setTimeout(() => $(".cert-stamp").classList.add("stamped"), 900);
      setTimeout(() => tone(90, 0.25, "sine", 0.3, 0), 950); // 押印「ドン」
    }, 320 * REBOOT_LINES.length + 1200);
  }, 4200);
}

$("#cert-close").addEventListener("click", () => {
  $("#certificate").classList.add("hidden");
  busy = false;
  document.title = "絶対に押してはいけないボタン(再設置)";
  say("世界は無事に再起動しました。ボタンも再設置しました。今度こそ、絶対に押さないでください。……いや、もう期待していませんが。");
});

/* ---------------- エスカレーション台本 ---------------- */
const EPILOGUE = [
  "もう何も言いません。好きにしてください。",
  "(管理者は退職しました)",
  "(後任はまだ決まっていません)",
  "(求人:ボタン監視員。経験不問。心の強い方)",
  "(ボタンだけが、今日も押されている)",
];

function handlePress() {
  if (busy) return;
  presses++;
  bumpCounter();
  thunk();
  shake();
  setTitle(presses);

  switch (presses) {
    case 1:
      say("……今、押しましたよね? 見ていましたよ。");
      break;
    case 2:
      say("気のせいだと思いたい。もう一度だけ言います。絶対に、押さないでください。");
      break;
    case 3:
      say("『絶対に』という日本語の意味、ご存知ですか? 辞書をお貸ししましょうか。");
      break;
    case 4:
      setLevel(1);
      say("警告レベルを引き上げます。これは脅しではありません。手続きです。", "warn");
      break;
    case 5:
      setLevel(2);
      body.classList.add("alert");
      klaxon(3);
      shake(true);
      say("⚠ 第二警戒態勢を発令しました ⚠ サイレンの電気代はあなたに請求されます。", "danger");
      break;
    case 6:
      say("上層部に報告しました。あなたの座席の位置と、お昼に食べていたものも添えて。", "warn");
      break;
    case 7:
      say("……ボタン側にも、防衛の権利があります。", "warn");
      enableDodge();
      break;
    case 8:
      say("逃げるボタンを追い回して、楽しいですか? 楽しいでしょうね。知っています。", "warn");
      enableDodge();
      break;
    case 9:
      disableDodge();
      say("ボタンは逃げることをやめました。悟りの境地に達したそうです。あなたも見習ってください。");
      break;
    case 10:
      setLevel(3);
      klaxon(4);
      runCountdown("……失礼しました。自爆装置はメンテナンス中でした。担当者は連休を取っています。");
      break;
    case 11:
      say("言い忘れていましたが、このボタンを押すたびに世界のどこかで猫が1匹くしゃみをしています。");
      break;
    case 12:
      say("くしゃみ12回。猫たちは大変迷惑しています。猫に謝ってください。");
      break;
    case 13:
      setLevel(4);
      body.classList.add("glitch");
      glitchNoise();
      say("ｼ ｽ ﾃ ﾑ ﾆ ｲ ｼﾞ ｮ ｳ ｶﾞ ﾊ ｯ ｾ ｲ ｼ ﾃ ｲ ﾏ … …", "danger");
      setTimeout(() => body.classList.remove("glitch"), 1800);
      break;
    case 14:
      say("……あ、直りました。今のは演出です。驚きました? 驚いたなら、もう押さないでくださいね。");
      break;
    case 15:
      setLevel(5);
      say("やめろと言ったのに!!", "danger");
      spawnError(3);
      break;
    case 16:
      say("エラーを閉じても無駄です。あなたの行いは履歴に残ります。永遠に。", "warn");
      spawnError(2);
      break;
    case 17:
      body.classList.add("tilted");
      tone(60, 0.8, "sine", 0.3);
      shake(true);
      say("報告します。施設が物理的に傾き始めました。比喩ではありません。", "danger");
      break;
    case 18:
      setLevel(6);
      say("次で最後にしてください。お願いします。もう敬語を使う余裕もなくなってきました。", "warn");
      break;
    case 19:
      setLevel(7);
      klaxon(5);
      body.classList.add("alert");
      say("警告ではなく予告です。次に押すと、世界が再起動します。保存していないものは、消えます。", "danger");
      break;
    case 20:
      setLevel(9);
      worldReboot();
      break;
    default:
      say(EPILOGUE[epilogueIdx++ % EPILOGUE.length]);
      break;
  }
}

theButton.addEventListener("click", handlePress);

/* ---------------- 安全カバー ---------------- */
function openCover() {
  if (cover.classList.contains("open")) return;
  cover.classList.add("open");
  tone(220, 0.15, "sawtooth", 0.1);
  tone(180, 0.2, "sawtooth", 0.08, 0.1);
  say("……カバーを開けましたね。嫌な予感しかしません。言っておきますが、開けることと押すことは別の罪です。");
  document.title = "カバーを開けるな";
  // しばらく押さない人へのお小言
  idleTimer = setTimeout(() => {
    if (presses === 0 && !busy) {
      say("……押さないんですか? いえ、押すなと言ったのは私ですが。その自制心、嫌いじゃないです。");
    }
  }, 15000);
}
cover.addEventListener("click", openCover);
cover.addEventListener("keydown", (e) => {
  if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openCover(); }
});

/* ---------------- ミュート ---------------- */
muteBtn.addEventListener("click", () => {
  muted = !muted;
  muteBtn.classList.toggle("muted", muted);
  muteIcon.textContent = muted ? "✕" : "♪";
  if (!muted) tone(880, 0.1, "triangle", 0.1);
});

/* ---------------- 起動 ---------------- */
window.addEventListener("DOMContentLoaded", () => {
  const opening = totalEver > 20
    ? `おかえりなさい。あなたの累計違反は ${totalEver} 回です。今日こそ押さないでくださいね。`
    : "ようこそ。目の前にあるのは、絶対に押してはいけないボタンです。確認はそれだけです。お引き取りください。";
  setTimeout(() => say(opening), 400);
});
