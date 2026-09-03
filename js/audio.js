// All sound is synthesized with the Web Audio API; there are no audio files.
// The context is created lazily on the first user gesture (an iOS requirement).

const MUTE_KEY = 'asteroids.muted';

function loadMuted() {
  try { return localStorage.getItem(MUTE_KEY) === '1'; } catch { return false; }
}
function saveMuted(m) {
  try { localStorage.setItem(MUTE_KEY, m ? '1' : '0'); } catch { /* ignore */ }
}

const ROCK_MASS = { L: 4, M: 2, S: 1 };

export class Audio {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.noise = null;
    this.muted = loadMuted();
    this.thrustNode = null;
    this.saucerNode = null;
    this.saucerSize = null;
    this.beatTimer = 0;
    this.beatHigh = true;
    document.addEventListener('visibilitychange', () => {
      if (!this.ctx) return;
      if (document.hidden) {
        this.stopLoops();
        this.ctx.suspend();
      } else {
        this.ctx.resume();
      }
    });
  }

  // Call from a user-gesture handler. Safe to call repeatedly.
  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      const comp = this.ctx.createDynamicsCompressor();
      comp.threshold.value = -12;
      comp.ratio.value = 6;
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 1;
      this.master.connect(comp).connect(this.ctx.destination);
      this.noise = this.makeNoise();
    }
    if (this.ctx.state !== 'running') this.ctx.resume();
  }

  get ready() {
    return !!this.ctx && this.ctx.state === 'running';
  }

  toggleMute() {
    this.muted = !this.muted;
    saveMuted(this.muted);
    if (this.master) this.master.gain.value = this.muted ? 0 : 1;
  }

  makeNoise() {
    const len = this.ctx.sampleRate * 2;
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  // ---- one-shot sounds ----

  play(name) {
    if (!this.ctx || this.muted) return;
    switch (name) {
      case 'fire':          this.tone('square', 880, 110, 0.14, 0.18); break;
      case 'select':        this.tone('square', 1200, 1200, 0.04, 0.12); break;
      case 'explodeL':      this.noiseBurst(1.0, 500, 60, 0.7); break;
      case 'explodeM':      this.noiseBurst(0.6, 900, 120, 0.55); break;
      case 'explodeS':      this.noiseBurst(0.35, 1600, 250, 0.45); break;
      case 'shipExplode':   this.noiseBurst(1.4, 600, 50, 0.8); break;
      case 'saucerExplode': this.noiseBurst(0.7, 1200, 100, 0.6); break;
      case 'extraLife':
        for (let i = 0; i < 6; i++) this.tone('square', 1500, 1500, 0.05, 0.15, i * 0.11);
        break;
    }
  }

  tone(type, f0, f1, dur, vol, delay = 0) {
    const ctx = this.ctx;
    const t = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) osc.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(g).connect(this.master);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  noiseBurst(dur, f0, f1, vol) {
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    src.loop = true;
    const filt = ctx.createBiquadFilter();
    filt.type = 'lowpass';
    filt.frequency.setValueAtTime(f0, t);
    filt.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(filt).connect(g).connect(this.master);
    src.start(t);
    src.stop(t + dur + 0.05);
  }

  beat(high) {
    if (!this.ctx || this.muted) return;
    const f = high ? 68 : 54;
    this.tone('triangle', f, f * 0.8, 0.16, 0.7);
  }

  // ---- looping sounds ----

  setThrust(on) {
    if (!this.ctx) return;
    if (on && !this.thrustNode) {
      const ctx = this.ctx;
      const src = ctx.createBufferSource();
      src.buffer = this.noise;
      src.loop = true;
      const filt = ctx.createBiquadFilter();
      filt.type = 'lowpass';
      filt.frequency.value = 260;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.35, ctx.currentTime + 0.06);
      src.connect(filt).connect(g).connect(this.master);
      src.start();
      this.thrustNode = { src, g };
    } else if (!on && this.thrustNode) {
      const { src, g } = this.thrustNode;
      const t = this.ctx.currentTime;
      g.gain.cancelScheduledValues(t);
      g.gain.setValueAtTime(g.gain.value, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.1);
      src.stop(t + 0.12);
      this.thrustNode = null;
    }
  }

  setSaucer(size) {
    if (!this.ctx) return;
    if (size === this.saucerSize) return;
    if (this.saucerNode) {
      const { osc, lfo, g } = this.saucerNode;
      const t = this.ctx.currentTime;
      g.gain.cancelScheduledValues(t);
      g.gain.setValueAtTime(g.gain.value, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
      osc.stop(t + 0.07);
      lfo.stop(t + 0.07);
      this.saucerNode = null;
    }
    this.saucerSize = size;
    if (!size) return;
    const ctx = this.ctx;
    const big = size === 'L';
    const osc = ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.value = big ? 160 : 420;
    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = big ? 4 : 7;
    const depth = ctx.createGain();
    depth.gain.value = big ? 50 : 120;
    lfo.connect(depth).connect(osc.frequency);
    const g = ctx.createGain();
    g.gain.value = big ? 0.08 : 0.06;
    osc.connect(g).connect(this.master);
    osc.start();
    lfo.start();
    this.saucerNode = { osc, lfo, g };
  }

  stopLoops() {
    this.setThrust(false);
    this.setSaucer(null);
  }

  // ---- per-frame state sync ----

  sync(game, dt) {
    if (!this.ctx) return;
    const playing = game.state === 'playing' && !game.paused;
    const ship = game.ship;
    this.setThrust(playing && ship.alive && !ship.inHyper && ship.thrusting);
    this.setSaucer(game.state !== 'attract' && !game.paused && game.saucer ? game.saucer.size : null);

    if (playing) {
      this.beatTimer -= dt;
      if (this.beatTimer <= 0) {
        this.beat(this.beatHigh);
        this.beatHigh = !this.beatHigh;
        this.beatTimer = this.beatInterval(game);
      }
    } else {
      this.beatTimer = 0;
      this.beatHigh = true;
    }
  }

  // The heartbeat quickens as the wave is whittled down and as time passes.
  beatInterval(game) {
    let mass = 0;
    for (const r of game.rocks) mass += ROCK_MASS[r.size];
    const rockProgress = 1 - Math.min(1, mass / Math.max(1, game.waveMass));
    const timeProgress = Math.min(1, game.waveTime / 60) * 0.7;
    const p = Math.max(rockProgress, timeProgress);
    return 1.0 - 0.72 * p;
  }
}
