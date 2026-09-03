// On-screen touch controls for phones and tablets. Buttons are laid out in
// screen space (CSS pixels) so they can sit in the letterbox bars on wide
// phones, and feed the same Input actions the keyboard uses.
import { TAU } from './geom.js';
import { drawText } from './vecfont.js';
import { SHIP_STROKES, FLAME_STROKE } from './ship.js';

const PHONE_MAX_SIDE = 600;              // shorter side below this = phone
const HOLD = new Set(['left', 'right', 'thrust']); // actions a thumb can slide between

const TRI_LEFT = [[0.35, -0.45], [-0.4, 0], [0.35, 0.45]];
const TRI_RIGHT = [[-0.35, -0.45], [0.4, 0], [-0.35, 0.45]];
const PAUSE_BARS = [[[-0.22, -0.4], [-0.22, 0.4]], [[0.22, -0.4], [0.22, 0.4]]];
const SPEAKER = [[-0.5, -0.18], [-0.25, -0.18], [0.05, -0.45], [0.05, 0.45], [-0.25, 0.18], [-0.5, 0.18], [-0.5, -0.18]];
const MUTE_X = [[[0.22, -0.2], [0.5, 0.2]], [[0.5, -0.2], [0.22, 0.2]]];

export class TouchControls {
  constructor(canvas, input, renderer, game) {
    this.canvas = canvas;
    this.input = input;
    this.r = renderer;
    this.game = game;
    this.enabled = navigator.maxTouchPoints > 0 || 'ontouchstart' in window;
    this.buttons = [];
    this.pointers = new Map(); // pointerId -> action currently held (or null)
    this.insets = { top: 0, right: 0, bottom: 0, left: 0 };
    if (!this.enabled) return;

    game.touchMode = true;
    canvas.addEventListener('pointerdown', (e) => this.onDown(e));
    canvas.addEventListener('pointermove', (e) => this.onMove(e));
    canvas.addEventListener('pointerup', (e) => this.onUp(e));
    canvas.addEventListener('pointercancel', (e) => this.onUp(e));
    // Belt and braces against iOS scrolling, pinch zoom and long-press menus.
    const opts = { passive: false };
    document.addEventListener('touchmove', (e) => e.preventDefault(), opts);
    document.addEventListener('gesturestart', (e) => e.preventDefault(), opts);
    document.addEventListener('contextmenu', (e) => e.preventDefault());
    window.addEventListener('blur', () => this.releaseAll());
    this.readInsets();
    window.addEventListener('resize', () => this.readInsets());
  }

  readInsets() {
    const cs = getComputedStyle(document.documentElement);
    const px = (v) => parseFloat(cs.getPropertyValue(v)) || 0;
    this.insets = { top: px('--sat'), right: px('--sar'), bottom: px('--sab'), left: px('--sal') };
  }

  // Phones must be held in landscape.
  needsRotate() {
    const w = window.innerWidth, h = window.innerHeight;
    return this.enabled && h > w && Math.min(w, h) < PHONE_MAX_SIDE;
  }

  layout() {
    const w = this.r.cssW, h = this.r.cssH;
    const ins = this.insets;
    const ml = 14 + ins.left, mr = 14 + ins.right, mb = 12 + ins.bottom, mt = 10 + ins.top;
    let r = Math.max(24, Math.min(46, Math.min(w, h) * 0.11));
    // If the letterbox bars are wide enough, shrink to fit the cluster inside them.
    const bar = this.r.ox;
    if (bar > 0) {
      const fit = (bar - ml - 6) / 4.3;
      if (fit >= 24) r = Math.min(r, fit);
    }
    const y = h - mb - r;
    const gap = 2.3 * r;
    this.buttons = [
      { action: 'left',   x: ml + r,             y, r },
      { action: 'right',  x: ml + r + gap,       y, r },
      { action: 'thrust', x: w - mr - r - gap,   y, r },
      { action: 'fire',   x: w - mr - r,         y, r },
      { action: 'hyper',  x: w - mr - r,         y: y - gap, r: r * 0.8 },
    ];
    this.buttons.push({ action: 'mute', x: w - mr - 18 - 44, y: mt + 18, r: 18 });
    if (this.game.state === 'playing') {
      this.buttons.push({ action: 'pause', x: w - mr - 18, y: mt + 18, r: 18 });
    }
  }

  hit(x, y) {
    let best = null, bestD = Infinity;
    for (const b of this.buttons) {
      const d = Math.hypot(x - b.x, y - b.y);
      if (d < b.r * 1.35 && d < bestD) { best = b; bestD = d; }
    }
    return best;
  }

  pos(e) {
    const rect = this.canvas.getBoundingClientRect();
    return [e.clientX - rect.left, e.clientY - rect.top];
  }

  isHeldByOther(action, pointerId) {
    for (const [id, a] of this.pointers) if (id !== pointerId && a === action) return true;
    return false;
  }

  hold(pointerId, action) {
    this.pointers.set(pointerId, action);
    if (action) this.input.press(action);
  }

  drop(pointerId) {
    const action = this.pointers.get(pointerId);
    this.pointers.delete(pointerId);
    if (action && !this.isHeldByOther(action, pointerId)) this.input.release(action);
  }

  onDown(e) {
    e.preventDefault();
    const [x, y] = this.pos(e);
    const b = this.hit(x, y);
    if (b) {
      this.hold(e.pointerId, b.action);
    } else if (this.game.state === 'attract' || this.game.state === 'gameover') {
      this.hold(e.pointerId, 'start');      // tap anywhere to start
    } else if (this.game.paused) {
      this.hold(e.pointerId, 'pause');      // tap anywhere to resume
    } else {
      this.pointers.set(e.pointerId, null);
    }
  }

  onMove(e) {
    if (!this.pointers.has(e.pointerId)) return;
    const cur = this.pointers.get(e.pointerId);
    if (cur && !HOLD.has(cur)) return;      // taps don't slide
    const [x, y] = this.pos(e);
    const b = this.hit(x, y);
    const next = b && HOLD.has(b.action) ? b.action : null;
    if (next === cur) return;
    this.drop(e.pointerId);
    this.hold(e.pointerId, next);
  }

  onUp(e) {
    this.drop(e.pointerId);
  }

  releaseAll() {
    for (const id of [...this.pointers.keys()]) this.drop(id);
  }

  heldActions() {
    return new Set(this.pointers.values());
  }

  draw() {
    if (!this.enabled) return;
    this.layout();
    const ctx = this.r.ctx;
    const held = this.heldActions();
    this.r.screenSpace();
    for (const b of this.buttons) {
      ctx.globalAlpha = held.has(b.action) ? 0.95 : 0.4;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, TAU);
      ctx.stroke();
      this.glyph(ctx, b);
    }
    ctx.globalAlpha = 1;
  }

  glyph(ctx, b) {
    const { x, y, r } = b;
    switch (b.action) {
      case 'left':   this.r.strokes([TRI_LEFT.concat([TRI_LEFT[0]])], x, y, 0, r); break;
      case 'right':  this.r.strokes([TRI_RIGHT.concat([TRI_RIGHT[0]])], x, y, 0, r); break;
      case 'thrust': this.r.strokes([...SHIP_STROKES, FLAME_STROKE], x, y + r * 0.05, -Math.PI / 2, r / 26); break;
      case 'fire':   ctx.beginPath(); ctx.arc(x, y, r * 0.13, 0, TAU); ctx.fill(); break;
      case 'hyper':  drawText(ctx, 'H', x, y - r * 0.42, r * 0.85, 'center'); break;
      case 'pause':  this.r.strokes(PAUSE_BARS, x, y, 0, r); break;
      case 'mute':
        this.r.strokes([SPEAKER], x, y, 0, r);
        if (this.game.soundOff) {
          this.r.strokes(MUTE_X, x, y, 0, r);
        } else {
          ctx.beginPath(); ctx.arc(x + r * 0.05, y, r * 0.3, -0.9, 0.9); ctx.stroke();
          ctx.beginPath(); ctx.arc(x + r * 0.05, y, r * 0.5, -0.9, 0.9); ctx.stroke();
        }
        break;
    }
  }

  drawRotatePrompt() {
    const ctx = this.r.ctx;
    const w = this.r.cssW, h = this.r.cssH;
    this.r.screenSpace();
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#fff';
    const cx = w / 2, cy = h / 2;
    // A landscape phone outline.
    ctx.strokeRect(cx - 50, cy - 70, 100, 58);
    ctx.beginPath(); ctx.arc(cx + 42, cy - 41, 3, 0, TAU); ctx.stroke();
    drawText(ctx, 'ROTATE YOUR DEVICE', cx, cy + 10, 16, 'center');
    drawText(ctx, 'PLAY IN LANDSCAPE', cx, cy + 40, 10, 'center');
  }
}
