import { rand, TAU } from './geom.js';
import { SHIP_STROKES } from './ship.js';

// Debris: dots for rock explosions, drifting line segments for the ship.
export class Particles {
  constructor() {
    this.dots = [];
    this.segs = [];
  }

  clear() {
    this.dots.length = 0;
    this.segs.length = 0;
  }

  burst(x, y, vx, vy, n) {
    for (let i = 0; i < n; i++) {
      const a = rand(0, TAU);
      const s = rand(25, 120);
      this.dots.push({
        x, y,
        vx: vx * 0.3 + Math.cos(a) * s,
        vy: vy * 0.3 + Math.sin(a) * s,
        life: rand(0.4, 0.9),
      });
    }
  }

  rockBurst(rock) {
    const n = rock.size === 'L' ? 12 : rock.size === 'M' ? 9 : 6;
    this.burst(rock.x, rock.y, rock.vx, rock.vy, n);
  }

  shipBurst(ship) {
    const c = Math.cos(ship.angle), s = Math.sin(ship.angle);
    for (const [[ax, ay], [bx, by]] of SHIP_STROKES) {
      const mx = (ax + bx) / 2, my = (ay + by) / 2;
      const a = rand(0, TAU);
      const sp = rand(15, 50);
      this.segs.push({
        x: ship.x + mx * c - my * s,
        y: ship.y + mx * s + my * c,
        dx: (bx - ax) / 2, dy: (by - ay) / 2, // half-vector of the segment, local
        angle: ship.angle,
        spin: rand(-2.5, 2.5),
        vx: ship.vx * 0.4 + Math.cos(a) * sp,
        vy: ship.vy * 0.4 + Math.sin(a) * sp,
        life: 2.5,
      });
    }
  }

  update(dt) {
    for (const d of this.dots) {
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      d.life -= dt;
    }
    for (const s of this.segs) {
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.angle += s.spin * dt;
      s.life -= dt;
    }
    this.dots = this.dots.filter((d) => d.life > 0);
    this.segs = this.segs.filter((s) => s.life > 0);
  }
}
