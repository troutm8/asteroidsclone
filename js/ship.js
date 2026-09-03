import { W, H, SHIP, BULLET, HYPER } from './config.js';
import { wrap, transformPoly, rand } from './geom.js';
import { Bullet } from './bullet.js';

// Local-space geometry, nose pointing along +x.
const NOSE = [14, 0];
const BACK_L = [-10, 9];
const BACK_R = [-10, -9];
// The rear "bar" sits on the two sides a little forward of the back corners.
const BAR_L = [-6.4, 7.65];
const BAR_R = [-6.4, -7.65];

export const SHIP_STROKES = [
  [NOSE, BACK_L],
  [NOSE, BACK_R],
  [BAR_L, BAR_R],
];
export const FLAME_STROKE = [[-6.4, 4.2], [-15, 0], [-6.4, -4.2]];
const HULL = [NOSE, BACK_L, BACK_R]; // collision polygon

export class Ship {
  constructor() {
    this.reset();
    this.alive = false;
  }

  reset() {
    this.x = W / 2;
    this.y = H / 2;
    this.vx = 0;
    this.vy = 0;
    this.angle = -Math.PI / 2; // facing up
    this.alive = true;
    this.thrusting = false;
    this.flameOn = false;
    this.flameClock = 0;
    this.inHyper = false;
    this.hyperTimer = 0;
  }

  // Returns an event name ('hyperOut', 'hyperIn', 'hyperDeath') or null.
  update(dt, input) {
    if (this.inHyper) {
      this.hyperTimer -= dt;
      if (this.hyperTimer > 0) return null;
      this.inHyper = false;
      this.x = rand(HYPER.MARGIN, W - HYPER.MARGIN);
      this.y = rand(HYPER.MARGIN, H - HYPER.MARGIN);
      this.vx = 0;
      this.vy = 0;
      return Math.random() < HYPER.DEATH_CHANCE ? 'hyperDeath' : 'hyperIn';
    }
    if (input.justPressed('hyper')) {
      this.inHyper = true;
      this.hyperTimer = HYPER.DURATION;
      this.thrusting = false;
      this.flameOn = false;
      return 'hyperOut';
    }

    if (input.isDown('left')) this.angle -= SHIP.ROT_SPEED * dt;
    if (input.isDown('right')) this.angle += SHIP.ROT_SPEED * dt;

    this.thrusting = input.isDown('thrust');
    if (this.thrusting) {
      this.vx += Math.cos(this.angle) * SHIP.THRUST * dt;
      this.vy += Math.sin(this.angle) * SHIP.THRUST * dt;
      this.flameClock += dt;
      this.flameOn = Math.floor(this.flameClock * 24) % 2 === 0;
    } else {
      this.flameOn = false;
    }

    const k = Math.exp(-SHIP.DRAG * dt);
    this.vx *= k;
    this.vy *= k;
    const speed = Math.hypot(this.vx, this.vy);
    if (speed > SHIP.MAX_SPEED) {
      const s = SHIP.MAX_SPEED / speed;
      this.vx *= s;
      this.vy *= s;
    }

    this.x += this.vx * dt;
    this.y += this.vy * dt;
    wrap(this, SHIP.RADIUS);
    return null;
  }

  verts() {
    return transformPoly(HULL, this.x, this.y, this.angle);
  }

  fireBullet() {
    const c = Math.cos(this.angle), s = Math.sin(this.angle);
    return new Bullet(
      this.x + c * NOSE[0],
      this.y + s * NOSE[0],
      this.vx + c * BULLET.SPEED,
      this.vy + s * BULLET.SPEED,
      BULLET.LIFE,
      'ship'
    );
  }
}
