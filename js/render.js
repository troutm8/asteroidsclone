import { W, H } from './config.js';
import { drawText } from './vecfont.js';
import { SHIP_STROKES, FLAME_STROKE } from './ship.js';

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.cssW = 0;
    this.cssH = 0;
    this.dpr = 0;
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  // Cheap per-frame check so a missed resize event (hidden tab, iOS toolbar
  // show/hide, rotation) never leaves the canvas at a stale size.
  checkSize() {
    const dpr = window.devicePixelRatio || 1;
    const cw = this.canvas.clientWidth, ch = this.canvas.clientHeight;
    if (cw !== this.cssW || ch !== this.cssH || dpr !== this.dpr) this.resize();
  }

  resize() {
    const dpr = window.devicePixelRatio || 1;
    const cw = this.canvas.clientWidth || window.innerWidth;
    const ch = this.canvas.clientHeight || window.innerHeight;
    this.cssW = cw;
    this.cssH = ch;
    this.canvas.width = Math.round(cw * dpr);
    this.canvas.height = Math.round(ch * dpr);
    this.dpr = dpr;
    this.scale = Math.min(cw / W, ch / H);
    this.ox = (cw - W * this.scale) / 2;
    this.oy = (ch - H * this.scale) / 2;
    // ~1.5 CSS px lines regardless of playfield scale.
    this.lineWidth = 1.5 / this.scale;
  }

  begin() {
    this.checkSize();
    const { ctx, canvas } = this;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    const s = this.scale * this.dpr;
    ctx.setTransform(s, 0, 0, s, this.ox * this.dpr, this.oy * this.dpr);
    ctx.beginPath();
    ctx.rect(0, 0, W, H);
    ctx.clip();
    ctx.strokeStyle = '#fff';
    ctx.fillStyle = '#fff';
    ctx.lineWidth = this.lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }

  end() {
    const { ctx } = this;
    ctx.restore();
    // Faint outline so the wrap edges are visible inside the letterbox.
    const s = this.scale * this.dpr;
    ctx.setTransform(s, 0, 0, s, this.ox * this.dpr, this.oy * this.dpr);
    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.lineWidth = this.lineWidth;
    ctx.strokeRect(0, 0, W, H);
  }

  // Switch to CSS-pixel coordinates for overlays (touch buttons, prompts).
  screenSpace() {
    const { ctx } = this;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.strokeStyle = '#fff';
    ctx.fillStyle = '#fff';
    ctx.lineWidth = 1.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }

  poly(points, closed = true) {
    const { ctx } = this;
    ctx.beginPath();
    for (let i = 0; i < points.length; i++) {
      const [x, y] = points[i];
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    if (closed) ctx.closePath();
    ctx.stroke();
  }

  strokes(strokes, x, y, angle, scale = 1) {
    const { ctx } = this;
    const c = Math.cos(angle) * scale, s = Math.sin(angle) * scale;
    ctx.beginPath();
    for (const stroke of strokes) {
      for (let i = 0; i < stroke.length; i++) {
        const [px, py] = stroke[i];
        const wx = x + px * c - py * s;
        const wy = y + px * s + py * c;
        if (i === 0) ctx.moveTo(wx, wy); else ctx.lineTo(wx, wy);
      }
    }
    ctx.stroke();
  }

  ship(ship) {
    this.strokes(SHIP_STROKES, ship.x, ship.y, ship.angle);
    if (ship.flameOn) this.strokes([FLAME_STROKE], ship.x, ship.y, ship.angle);
  }

  rock(rock) {
    this.poly(rock.verts());
  }

  dot(x, y, r = 1.4) {
    const { ctx } = this;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  particles(p) {
    for (const d of p.dots) this.dot(d.x, d.y, 1.2);
    const { ctx } = this;
    ctx.beginPath();
    for (const s of p.segs) {
      const c = Math.cos(s.angle), sn = Math.sin(s.angle);
      const hx = s.dx * c - s.dy * sn, hy = s.dx * sn + s.dy * c;
      ctx.moveTo(s.x - hx, s.y - hy);
      ctx.lineTo(s.x + hx, s.y + hy);
    }
    ctx.stroke();
  }

  text(str, x, y, size, align = 'left') {
    drawText(this.ctx, str, x, y, size, align);
  }

  lifeIcons(count, x, y) {
    for (let i = 0; i < count; i++) {
      this.strokes(SHIP_STROKES, x + i * 22, y, -Math.PI / 2, 0.8);
    }
  }
}
