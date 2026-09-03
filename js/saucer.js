import { W, H, SAUCER } from './config.js';
import { rand, choice, TAU, transformPoly } from './geom.js';

// Classic saucer outline in unit coordinates (y down): hexagonal hull,
// a line across the middle, and a dome on top.
const HULL = [[-1, 0], [-0.4, -0.4], [-0.2, -0.8], [0.2, -0.8], [0.4, -0.4], [1, 0], [0.4, 0.4], [-0.4, 0.4]];
export const SAUCER_STROKES = [
  [[-1, 0], [-0.4, 0.4], [0.4, 0.4], [1, 0], [0.4, -0.4], [-0.4, -0.4], [-1, 0]],
  [[-1, 0], [1, 0]],
  [[-0.4, -0.4], [-0.2, -0.8], [0.2, -0.8], [0.4, -0.4]],
];

export class Saucer {
  constructor(size) {
    const cfg = SAUCER[size];
    this.size = size;
    this.r = cfg.r;
    this.speed = cfg.speed;
    this.fireInterval = cfg.fireInterval;
    this.dir = Math.random() < 0.5 ? 1 : -1;
    this.x = this.dir > 0 ? -this.r : W + this.r;
    this.y = rand(H * 0.15, H * 0.85);
    this.vx = this.dir * this.speed;
    this.vy = 0;
    this.turnTimer = rand(0.5, 1.5);
    this.fireTimer = this.fireInterval * rand(0.6, 1);
    this.gone = false;
    this._verts = null;
  }

  get score() { return SAUCER[this.size].score; }

  // Returns true when the saucer wants to fire this tick.
  update(dt) {
    this.turnTimer -= dt;
    if (this.turnTimer <= 0) {
      this.turnTimer = rand(0.6, 1.6);
      this.vy = choice([-1, 0, 1]) * this.speed * 0.7;
    }
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    if (this.y < -this.r) this.y += H + this.r * 2;
    else if (this.y > H + this.r) this.y -= H + this.r * 2;
    // Crosses the screen once and leaves; no horizontal wrap.
    if ((this.dir > 0 && this.x > W + this.r) || (this.dir < 0 && this.x < -this.r)) this.gone = true;
    this._verts = null;

    this.fireTimer -= dt;
    if (this.fireTimer <= 0) {
      this.fireTimer = this.fireInterval * rand(0.7, 1.3);
      return true;
    }
    return false;
  }

  verts() {
    if (!this._verts) this._verts = transformPoly(HULL, this.x, this.y, 0, this.r);
    return this._verts;
  }

  // Large saucers fire at random; small ones aim at the ship, more accurately
  // as the score rises.
  aim(target, score) {
    if (this.size === 'L' || !target) return rand(0, TAU);
    const base = Math.atan2(target.y - this.y, target.x - this.x);
    const t = Math.min(1, Math.max(0, score / SAUCER.SMALL_FULL_SCORE));
    const err = SAUCER.AIM_ERROR_MAX + (SAUCER.AIM_ERROR_MIN - SAUCER.AIM_ERROR_MAX) * t;
    return base + rand(-err, err);
  }
}
