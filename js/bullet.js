import { wrap } from './geom.js';

export class Bullet {
  constructor(x, y, vx, vy, life, owner) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.life = life;
    this.owner = owner; // 'ship' | 'saucer'
  }

  update(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.life -= dt;
    wrap(this, 2);
  }

  get dead() { return this.life <= 0; }
}
