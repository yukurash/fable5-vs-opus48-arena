'use strict';
/* ============================================================
   RetroDesk 95 — サウンド (Web Audio で合成・外部ファイル不要)
   ============================================================ */
const Sound = (() => {
  let ctx = null;
  let master = null;
  let muted = localStorage.getItem('retrodesk.muted') === '1';

  function ensure() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.55;
      master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return true;
  }

  function ok() { return !muted && ensure(); }

  /* 単音(エンベロープ付き) */
  function tone(freq, start, dur, { type = 'sine', vol = 0.12, attack = 0.01, glide = 0 } = {}) {
    const t0 = ctx.currentTime + start;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (glide) osc.frequency.exponentialRampToValueAtTime(glide, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g).connect(master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  /* ノイズバースト */
  function noise(start, dur, { vol = 0.2, lp = 8000 } = {}) {
    const t0 = ctx.currentTime + start;
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(lp, t0);
    f.frequency.exponentialRampToValueAtTime(Math.max(120, lp / 16), t0 + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f).connect(g).connect(master);
    src.start(t0);
  }

  /* ---- 各効果音 ---- */
  const fx = {
    /* 起動チャイム(The Microsoft Sound 風の浮遊コード) */
    chime() {
      if (!ok()) return;
      const notes = [277.18, 415.3, 554.37, 622.25, 830.61, 1108.73, 1244.51];
      notes.forEach((f, i) => tone(f, i * 0.14, 2.8 - i * 0.12, { vol: 0.085, attack: 0.05 }));
      tone(138.59, 0, 3.0, { vol: 0.1, attack: 0.2 });
      tone(2217.46, 1.0, 1.4, { vol: 0.02, attack: 0.3 });
    },
    /* 終了音(下降) */
    shutdown() {
      if (!ok()) return;
      [830.61, 622.25, 415.3, 277.18].forEach((f, i) => tone(f, i * 0.18, 1.4, { vol: 0.09, attack: 0.04 }));
    },
    /* エラー(コード打音) */
    error() {
      if (!ok()) return;
      tone(740, 0, 0.22, { type: 'square', vol: 0.05 });
      tone(587, 0, 0.22, { type: 'square', vol: 0.05 });
      tone(440, 0.02, 0.26, { type: 'square', vol: 0.045 });
    },
    /* 警告・通知のディン */
    ding() {
      if (!ok()) return;
      tone(988, 0, 0.5, { vol: 0.08 });
      tone(1480, 0, 0.4, { vol: 0.035 });
    },
    /* 地雷爆発 */
    boom() {
      if (!ok()) return;
      noise(0, 0.55, { vol: 0.4, lp: 2200 });
      tone(80, 0, 0.5, { type: 'sawtooth', vol: 0.18, glide: 32 });
    },
    /* 勝利ファンファーレ */
    tada() {
      if (!ok()) return;
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, i * 0.09, 0.42, { type: 'triangle', vol: 0.1 }));
      tone(1318.5, 0.36, 0.7, { type: 'triangle', vol: 0.09 });
    },
    /* ごみ箱(紙くしゃ) */
    recycle() {
      if (!ok()) return;
      noise(0, 0.16, { vol: 0.18, lp: 6000 });
      noise(0.08, 0.12, { vol: 0.1, lp: 3500 });
    },
    /* クリック */
    click() {
      if (!ok()) return;
      noise(0, 0.03, { vol: 0.1, lp: 6000 });
    },
    /* モデム接続音(ダイヤルアップ風) */
    modem() {
      if (!ok()) return;
      [697, 770, 852, 941, 697, 852].forEach((f, i) => {
        tone(f, i * 0.13, 0.1, { type: 'sine', vol: 0.07 });
        tone(f * 1.45, i * 0.13, 0.1, { type: 'sine', vol: 0.07 });
      });
      tone(1200, 0.9, 0.5, { type: 'square', vol: 0.03 });
      tone(2250, 1.0, 0.45, { type: 'square', vol: 0.025, glide: 1800 });
      noise(1.45, 0.7, { vol: 0.06, lp: 4000 });
    },
  };

  return Object.assign({
    ensure,
    isMuted: () => muted,
    setMuted(v) {
      muted = !!v;
      localStorage.setItem('retrodesk.muted', muted ? '1' : '0');
    },
  }, fx);
})();
