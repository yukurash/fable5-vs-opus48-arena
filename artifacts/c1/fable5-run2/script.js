/* =========================================================
   絶対に押してはいけないボタン — エスカレーション制御
   ========================================================= */
"use strict";

// ---------- DOM ----------
const $ = (id) => document.getElementById(id);
const bigButton   = $("big-button");
const buttonAnchor = $("button-anchor");
const buttonBay   = $("button-bay");
const safetyCover = $("safety-cover");
const lcdText     = $("lcd-text");
const lcdStatus   = $("lcd-status");
const lcd         = document.querySelector(".lcd");
const odometer    = $("odometer");
const siren       = $("siren");

// ---------- 状態 ----------
let pressCount = 0;
let firstPressAt = null;
let coverOpened = false;
let dodgeMode = false;
let dodgesLeft = 0;
let sequenceRunning = false; // カウントダウン以降は入力を止める
let idleTimer = null;

// ---------- 効果音（WebAudio・外部ファイル不要） ----------
let audioCtx = null;

function ctx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === "suspended") audioCtx.resume();
  return audioCtx;
}

function beep(freq = 880, dur = 0.12, type = "square", vol = 0.08, when = 0) {
  const ac = ctx();
  const t = ac.currentTime + when;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  gain.gain.setValueAtTime(vol, t);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(gain).connect(ac.destination);
  osc.start(t);
  osc.stop(t + dur + 0.05);
}

function klaxon(times = 4) {
  for (let i = 0; i < times; i++) {
    beep(440, 0.28, "sawtooth", 0.07, i * 0.6);
    beep(330, 0.28, "sawtooth", 0.07, i * 0.6 + 0.3);
  }
}

function alarmSweep() {
  const ac = ctx();
  const t = ac.currentTime;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(300, t);
  osc.frequency.linearRampToValueAtTime(950, t + 0.45);
  osc.frequency.linearRampToValueAtTime(300, t + 0.9);
  gain.gain.setValueAtTime(0.06, t);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.95);
  osc.connect(gain).connect(ac.destination);
  osc.start(t);
  osc.stop(t + 1);
}

function boom() {
  const ac = ctx();
  const t = ac.currentTime;
  const len = ac.sampleRate * 1.6;
  const buf = ac.createBuffer(1, len, ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.2);
  }
  const src = ac.createBufferSource();
  src.buffer = buf;
  const filter = ac.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(900, t);
  filter.frequency.exponentialRampToValueAtTime(60, t + 1.4);
  const gain = ac.createGain();
  gain.gain.setValueAtTime(0.5, t);
  src.connect(filter).connect(gain).connect(ac.destination);
  src.start(t);
}

// ---------- LCD タイプライター ----------
let typeTimer = null;

function say(text, status) {
  if (status) lcdStatus.textContent = status;
  clearInterval(typeTimer);
  lcdText.textContent = "";
  let i = 0;
  typeTimer = setInterval(() => {
    lcdText.textContent = text.slice(0, ++i);
    if (i >= text.length) clearInterval(typeTimer);
  }, 38);
}

// ---------- 押下カウンター ----------
function updateOdometer() {
  const digits = String(pressCount).padStart(3, "0").split("");
  odometer.querySelectorAll(".digit").forEach((el, i) => {
    el.textContent = digits[i];
  });
}

// ---------- タブタイトルも巻き込む ----------
function setTitle(level) {
  const titles = [
    "絶対に押してはいけないボタン",
    "⚠ 押しましたね？",
    "⚠⚠ だから押すなと",
    "⚠⚠⚠ 警告中",
    "🚨 本当にやめてください",
    "🚨🚨 通報済み",
    "🚨🚨🚨 最終警告",
    "💥 自爆シーケンス進行中",
  ];
  document.title = titles[Math.min(level, titles.length - 1)];
}

// ---------- 暇つぶし煽り ----------
function armIdleTaunt() {
  clearTimeout(idleTimer);
  if (pressCount > 0 || sequenceRunning) return;
  idleTimer = setTimeout(() => {
    say(coverOpened
      ? "……押したいんでしょう？　知ってますよ。"
      : "……カバーの向こうが気になりますか？");
    armIdleTaunt();
  }, 16000);
}

// ---------- 安全カバー ----------
function openCover() {
  if (coverOpened) return;
  coverOpened = true;
  safetyCover.classList.add("open");
  safetyCover.setAttribute("aria-hidden", "true");
  beep(520, 0.08, "square", 0.06);
  say("カバーを開けましたね。嫌な予感がします。");
  armIdleTaunt();
}

safetyCover.addEventListener("click", openCover);
safetyCover.addEventListener("keydown", (e) => {
  if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openCover(); }
});

// ---------- ボタンの逃走 ----------
const dodgeQuips = ["逃げます。", "やです。", "触らないでください。", "こっち来ないで。"];

bigButton.addEventListener("pointerenter", (e) => {
  if (!dodgeMode || dodgesLeft <= 0 || sequenceRunning) return;
  if (e.pointerType !== "mouse") return; // タッチ端末では逃げない（押せなくなるので）
  dodgesLeft--;
  const bay = buttonBay.getBoundingClientRect();
  const maxX = Math.max(30, (bay.width - 240) / 2);
  const x = (Math.random() * 2 - 1) * maxX;
  const y = (Math.random() * 2 - 1) * 22;
  buttonAnchor.style.transform = `translate(${x.toFixed(0)}px, ${y.toFixed(0)}px)`;
  beep(1200 + Math.random() * 600, 0.06, "sine", 0.05);
  say(dodgeQuips[Math.floor(Math.random() * dodgeQuips.length)], "逃走中");
  if (dodgesLeft === 0) {
    setTimeout(() => {
      buttonAnchor.style.transform = "";
      say("……観念しました。好きにしてください。", "諦め");
    }, 700);
  }
});

// ---------- メイン：押下エスカレーション ----------
bigButton.addEventListener("click", () => {
  if (sequenceRunning) return;
  pressCount++;
  if (!firstPressAt) firstPressAt = Date.now();
  updateOdometer();
  bigButton.classList.add("pressed");
  setTimeout(() => bigButton.classList.remove("pressed"), 130);
  setTitle(pressCount);
  clearTimeout(idleTimer);

  switch (pressCount) {
    case 1:
      beep(220, 0.25, "sine", 0.09);
      say("……今、押しましたか？　気のせいですよね？");
      break;

    case 2:
      beep(220, 0.18, "sine", 0.09);
      beep(180, 0.25, "sine", 0.09, 0.2);
      say("二度目です。一度目は事故。二度目は故意です。", "注意");
      break;

    case 3:
      alarmSweep();
      siren.classList.add("active");
      document.body.classList.add("alert-mode");
      lcd.classList.add("danger");
      say("警告。操作はすべて記録されています。あなたの顔も。", "警戒");
      break;

    case 4:
      alarmSweep();
      dodgeMode = true;
      dodgesLeft = 4;
      say("もう自分の身は自分で守ることにしました。", "自衛");
      break;

    case 5:
      beep(700, 0.1, "square", 0.07);
      beep(700, 0.1, "square", 0.07, 0.15);
      showReportDialog();
      break;

    case 6:
      showFinalWarning();
      break;

    default:
      startCountdown();
      break;
  }
});

// ---------- 通報ダイアログ ----------
function showReportDialog() {
  const overlay = $("report-overlay");
  overlay.hidden = false;
  $("report-ok").focus();
  say("通報しました。もう知りませんからね。", "通報済");
}

$("report-ok").addEventListener("click", () => {
  $("report-overlay").hidden = true;
  beep(420, 0.1, "square", 0.06);
  say("反省したなら、もう押さないはずですよね？", "監視中");
});

// ---------- 最終警告 ----------
function showFinalWarning() {
  sequenceRunning = true;
  const fw = $("final-warning");
  fw.hidden = false;
  document.body.classList.add("shake");
  klaxon(5);
  setTimeout(() => {
    fw.hidden = true;
    document.body.classList.remove("shake");
    sequenceRunning = false;
    say("これが最終警告です。次はもう、警告すらしません。", "最終警告");
  }, 3000);
}

// ---------- カウントダウン → 滅亡 → 再起動 → 認定 ----------
const cdQuips = {
  8: "こうなることは6回くらい警告しました。",
  6: "今さら謝っても遅いです。",
  4: "走馬灯の準備はいいですか？",
  2: "せめて目を閉じていてください。",
};

function startCountdown() {
  sequenceRunning = true;
  setTitle(7);
  const overlay = $("countdown-overlay");
  const num = $("cd-number");
  const msg = $("cd-msg");
  overlay.hidden = false;
  document.body.classList.add("shake");

  let remaining = 10;
  let abortClicks = 0;

  const abortBtn = $("cd-abort");
  abortBtn.textContent = "中止";
  abortBtn.onclick = () => {
    abortClicks++;
    beep(180, 0.2, "square", 0.08);
    if (abortClicks === 1) {
      abortBtn.textContent = "中止（できません）";
      msg.textContent = "中止ボタンは飾りです。";
    } else {
      remaining = Math.max(remaining - 1, 1);
      abortBtn.textContent = "押すたびに加速します";
      msg.textContent = "なぜまだ押すんですか？　加速しました。";
    }
  };

  function render() {
    num.textContent = remaining;
    num.classList.remove("tick");
    void num.offsetWidth; // アニメーション再発火
    num.classList.add("tick");
    beep(remaining <= 3 ? 1100 : 880, 0.1, "square", 0.08);
    if (cdQuips[remaining]) msg.textContent = cdQuips[remaining];
  }

  render();
  const timer = setInterval(() => {
    remaining--;
    if (remaining <= 0) {
      clearInterval(timer);
      overlay.hidden = true;
      document.body.classList.remove("shake");
      detonate();
      return;
    }
    render();
  }, 1000);
}

function detonate() {
  boom();
  const flash = $("flash");
  flash.hidden = false;
  setTimeout(showBsod, 900);
  setTimeout(() => { flash.hidden = true; }, 1500);
}

function showBsod() {
  const bsod = $("bsod");
  const pct = $("bsod-pct");
  bsod.hidden = false;
  document.title = "💀 世界、再構築中…";
  let p = 0;
  const timer = setInterval(() => {
    p = Math.min(100, p + Math.ceil(Math.random() * 18));
    pct.textContent = p;
    if (p >= 100) {
      clearInterval(timer);
      setTimeout(() => {
        bsod.hidden = true;
        showReboot();
      }, 900);
    }
  }, 380);
}

function showReboot() {
  const overlay = $("reboot");
  const logEl = $("reboot-log");
  overlay.hidden = false;
  logEl.textContent = "";
  const lines = [
    "> SYSTEM REBOOT ...",
    "> 世界を再構築しています ...",
    "> 空を読み込み中 ............ OK",
    "> 海を読み込み中 ............ OK",
    "> 文明を読み込み中 .......... OK",
    "> あなたの罪を読み込み中 .... 完了（容量オーバー）",
    "> 起動完了。おかえりなさい。",
  ];
  let i = 0;
  const timer = setInterval(() => {
    logEl.textContent += lines[i] + "\n";
    beep(600 + i * 60, 0.05, "square", 0.04);
    i++;
    if (i >= lines.length) {
      clearInterval(timer);
      setTimeout(() => {
        overlay.hidden = true;
        showFinale();
      }, 1200);
    }
  }, 650);
}

// ---------- フィナーレ ----------
function formatElapsed(ms) {
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}秒`;
  return `${Math.floor(s / 60)}分${s % 60}秒`;
}

function showFinale() {
  const finale = $("finale");
  finale.hidden = false;
  document.title = "🎉 認定：押してしまった人";
  $("cert-count").textContent = pressCount;
  $("cert-time").textContent = firstPressAt ? formatElapsed(Date.now() - firstPressAt) : "計測不能";
  $("cert-serial").textContent = "No." + String(Math.floor(Math.random() * 9000000) + 1000000);
  startConfetti();
  // ファンファーレ（っぽい何か）
  [523, 659, 784, 1047].forEach((f, i) => beep(f, 0.22, "triangle", 0.09, i * 0.16));
}

$("reset-button").addEventListener("click", () => {
  beep(160, 0.3, "sine", 0.1);
  const btn = $("reset-button");
  btn.textContent = "……また押しましたね。";
  btn.disabled = true;
  setTimeout(() => location.reload(), 1300);
});

// ---------- 紙吹雪 ----------
let confettiRaf = null;

function startConfetti() {
  const canvas = $("confetti");
  const c = canvas.getContext("2d");
  const resize = () => {
    canvas.width = innerWidth;
    canvas.height = innerHeight;
  };
  resize();
  addEventListener("resize", resize);

  const colors = ["#ffc400", "#ff2a2a", "#7dff9a", "#5ab0ff", "#ffffff", "#ff8ad1"];
  const parts = Array.from({ length: 160 }, () => ({
    x: Math.random() * canvas.width,
    y: -Math.random() * canvas.height,
    w: 6 + Math.random() * 8,
    h: 8 + Math.random() * 10,
    vy: 1.6 + Math.random() * 3,
    vx: -1.2 + Math.random() * 2.4,
    rot: Math.random() * Math.PI,
    vr: -0.12 + Math.random() * 0.24,
    color: colors[Math.floor(Math.random() * colors.length)],
  }));

  function frame() {
    c.clearRect(0, 0, canvas.width, canvas.height);
    for (const p of parts) {
      p.x += p.vx + Math.sin(p.y * 0.02) * 0.6;
      p.y += p.vy;
      p.rot += p.vr;
      if (p.y > canvas.height + 20) {
        p.y = -20;
        p.x = Math.random() * canvas.width;
      }
      c.save();
      c.translate(p.x, p.y);
      c.rotate(p.rot);
      c.fillStyle = p.color;
      c.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      c.restore();
    }
    confettiRaf = requestAnimationFrame(frame);
  }
  cancelAnimationFrame(confettiRaf);
  frame();
}

// ---------- フッターの利用規約 ----------
$("terms-link").addEventListener("click", () => {
  const tip = $("terms-tip");
  tip.hidden = !tip.hidden;
});

// ---------- 起動 ----------
say("システム正常。本日もボタンは押されていません。");
armIdleTaunt();
