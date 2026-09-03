import { W, H, ROCK, WAVE } from './config.js';
import { wrap, rand, choice, TAU, transformPoly, dist2 } from './geom.js';

// Four rock outlines, as [angle in degrees, radius fraction] pairs.
const POLAR_SHAPES = [
  [[0,1],[35,.75],[70,1],[110,.85],[140,.55],[175,.9],[210,.8],[245,1],[280,.7],[310,.95],[340,.8]],
  [[10,.9],[50,1],[80,.7],[120,.95],[160,.8],[190,1],[225,.65],[255,.9],[290,.75],[325,1]],
  [[0,.8],[30,1],[65,.85],[95,.6],[130,.95],[170,.75],[200,.9],[240,1],[270,.7],[300,.85],[335,.6]],
  [[15,1],[55,.8],[90,.95],[125,.7],[150,1],[195,.85],[230,.6],[260,.9],[300,.8],[330,.95]],
];

const SHAPES = POLAR_SHAPES.map((polar) =>
  polar.map(([deg, r]) => {
    const a = (deg * Math.PI) / 180;
    return [Math.cos(a) * r, Math.sin(a) * r];
  })
);

const NEXT_SIZE = { L: 'M', M: 'S', S: null };

export class Asteroid {
  constructor(size, x, y, angle, speed) {
    this.size = size;
    this.r = ROCK[size].r;
    this.x = x;
    this.y = y;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.angle = rand(0, TAU);
    this.spin = rand(-1.2, 1.2);
    this.shape = SHAPES[Math.floor(Math.random() * SHAPES.length)];
    this._verts = null;
  }

  // Spawn a rock on a random screen edge, away from the given point.
  static atEdge(size, avoid = null) {
    const [lo, hi] = ROCK[size].speed;
    let x = 0, y = 0;
    for (let tries = 0; tries < 20; tries++) {
      if (Math.random() < 0.5) {
        x = rand(0, W);
        y = choice([0, H]);
      } else {
        x = choice([0, W]);
        y = rand(0, H);
      }
      if (!avoid || dist2(x, y, avoid.x, avoid.y) > WAVE.SPAWN_CLEARANCE ** 2) break;
    }
    return new Asteroid(size, x, y, rand(0, TAU), rand(lo, hi));
  }

  update(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.angle += this.spin * dt;
    wrap(this, this.r);
    this._verts = null;
  }

  verts() {
    if (!this._verts) {
      this._verts = transformPoly(this.shape, this.x, this.y, this.angle, this.r);
    }
    return this._verts;
  }

  get score() { return ROCK[this.size].score; }

  // Returns the two smaller rocks this one breaks into (or none for small).
  split() {
    const next = NEXT_SIZE[this.size];
    if (!next) return [];
    const [lo, hi] = ROCK[next].speed;
    return [0, 1].map(() => new Asteroid(next, this.x, this.y, rand(0, TAU), rand(lo, hi)));
  }
}
