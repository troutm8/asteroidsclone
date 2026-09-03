import { W, H, SHIP, BULLET, ROCK, WAVE, GAME } from './config.js';
import { Ship } from './ship.js';
import { Asteroid } from './asteroid.js';
import { Particles } from './particles.js';
import { pointInPoly, polysIntersect, dist2 } from './geom.js';

const HI_KEY = 'asteroids.highscore';

function loadHigh() {
  try { return Number(localStorage.getItem(HI_KEY)) || 0; } catch { return 0; }
}
function saveHigh(v) {
  try { localStorage.setItem(HI_KEY, String(v)); } catch { /* private mode etc. */ }
}

export class Game {
  constructor() {
    this.state = 'attract'; // 'attract' | 'playing' | 'gameover'
    this.score = 0;
    this.highScore = loadHigh();
    this.lives = 0;
    this.wave = 0;
    this.nextBonus = GAME.BONUS_EVERY;
    this.ship = new Ship();
    this.rocks = [];
    this.bullets = [];
    this.particles = new Particles();
    this.respawnTimer = 0;
    this.waveTimer = 0;
    this.stateTimer = 0;
    this.paused = false;
    this.touchMode = false; // set by TouchControls on touch devices
    this.time = 0;
    this.spawnAttractField();
  }

  spawnAttractField() {
    this.rocks = [];
    for (let i = 0; i < 6; i++) this.rocks.push(Asteroid.atEdge('L'));
  }

  startGame() {
    this.state = 'playing';
    this.score = 0;
    this.lives = GAME.LIVES;
    this.wave = 0;
    this.nextBonus = GAME.BONUS_EVERY;
    this.rocks = [];
    this.bullets = [];
    this.particles.clear();
    this.paused = false;
    this.waveTimer = 0;
    this.ship.reset();
    this.startWave();
  }

  startWave() {
    this.wave++;
    const n = Math.min(WAVE.START + this.wave - 1, WAVE.CAP);
    const avoid = this.ship.alive ? this.ship : { x: W / 2, y: H / 2 };
    for (let i = 0; i < n; i++) this.rocks.push(Asteroid.atEdge('L', avoid));
  }

  onBlur() {
    if (this.state === 'playing') this.paused = true;
  }

  update(dt, input) {
    this.time += dt;

    if (this.state === 'attract' && input.justPressed('start')) {
      this.startGame();
      return;
    }
    if (this.state === 'playing' && input.justPressed('pause')) {
      this.paused = !this.paused;
    }
    if (this.paused) return;

    if (this.state === 'playing') this.updateShip(dt, input);

    for (const r of this.rocks) r.update(dt);
    for (const b of this.bullets) b.update(dt);
    this.bullets = this.bullets.filter((b) => !b.dead);
    this.particles.update(dt);

    if (this.state === 'playing') {
      this.collide();
      this.checkWave(dt);
    } else if (this.state === 'gameover') {
      this.stateTimer -= dt;
      if (this.stateTimer <= 0) {
        this.state = 'attract';
        if (this.rocks.length < 4) this.spawnAttractField();
      }
    }
  }

  updateShip(dt, input) {
    const ship = this.ship;
    if (ship.alive) {
      ship.update(dt, input);
      if (input.justPressed('fire')) {
        const inFlight = this.bullets.reduce((n, b) => n + (b.owner === 'ship'), 0);
        if (inFlight < BULLET.MAX) this.bullets.push(ship.fireBullet());
      }
    } else if (this.lives > 0) {
      this.respawnTimer -= dt;
      if (this.respawnTimer <= 0 && this.centerClear()) ship.reset();
    }
  }

  centerClear() {
    const cx = W / 2, cy = H / 2;
    for (const r of this.rocks) {
      const d = SHIP.SAFE_RADIUS + r.r;
      if (dist2(r.x, r.y, cx, cy) < d * d) return false;
    }
    return true;
  }

  collide() {
    const rocks = this.rocks;

    // Ship bullets vs rocks.
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      if (b.owner !== 'ship') continue;
      for (let j = rocks.length - 1; j >= 0; j--) {
        const r = rocks[j];
        const reach = r.r + 4;
        if (dist2(b.x, b.y, r.x, r.y) > reach * reach) continue;
        if (pointInPoly(b.x, b.y, r.verts())) {
          this.bullets.splice(i, 1);
          this.destroyRock(j);
          break;
        }
      }
    }

    // Ship vs rocks.
    const ship = this.ship;
    if (ship.alive) {
      const sv = ship.verts();
      for (let j = rocks.length - 1; j >= 0; j--) {
        const r = rocks[j];
        const reach = r.r + SHIP.RADIUS;
        if (dist2(ship.x, ship.y, r.x, r.y) > reach * reach) continue;
        if (polysIntersect(sv, r.verts())) {
          this.destroyRock(j);
          this.shipDie();
          break;
        }
      }
    }
  }

  destroyRock(index) {
    const rock = this.rocks[index];
    this.rocks.splice(index, 1);
    this.addScore(rock.score);
    this.particles.rockBurst(rock);
    this.rocks.push(...rock.split());
  }

  addScore(points) {
    this.score += points;
    if (this.score >= this.nextBonus) {
      this.lives++;
      this.nextBonus += GAME.BONUS_EVERY;
    }
    if (this.score > this.highScore) this.highScore = this.score;
  }

  shipDie() {
    const ship = this.ship;
    this.particles.shipBurst(ship);
    ship.alive = false;
    this.lives--;
    if (this.lives <= 0) {
      this.state = 'gameover';
      this.stateTimer = GAME.GAMEOVER_DELAY;
      saveHigh(this.highScore);
    } else {
      this.respawnTimer = SHIP.RESPAWN_DELAY;
    }
  }

  checkWave(dt) {
    if (this.rocks.length > 0) {
      this.waveTimer = 0;
      return;
    }
    this.waveTimer += dt;
    if (this.waveTimer >= WAVE.DELAY) {
      this.waveTimer = 0;
      this.startWave();
    }
  }

  draw(r) {
    r.begin();

    for (const rock of this.rocks) r.rock(rock);
    for (const b of this.bullets) r.dot(b.x, b.y);
    r.particles(this.particles);
    if (this.ship.alive && this.state === 'playing') r.ship(this.ship);

    // HUD
    const scoreText = this.score === 0 ? '00' : String(this.score);
    const highText = this.highScore === 0 ? '00' : String(this.highScore);
    r.text(scoreText, 40, 24, 28, 'left');
    r.text(highText, W / 2, 24, 13, 'center');
    if (this.state === 'playing') r.lifeIcons(this.lives, 52, 74);

    const blink = Math.floor(this.time * 1.6) % 2 === 0;
    if (this.state === 'attract') {
      if (blink) r.text('PUSH START', W / 2, H / 2 - 14, 28, 'center');
      r.text(this.touchMode ? 'TAP TO START' : 'PRESS ENTER', W / 2, H / 2 + 40, 13, 'center');
    } else if (this.state === 'gameover') {
      r.text('GAME OVER', W / 2, H / 2 - 14, 28, 'center');
    } else if (this.paused) {
      r.text('PAUSED', W / 2, H / 2 - 14, 28, 'center');
      if (this.touchMode) r.text('TAP TO RESUME', W / 2, H / 2 + 40, 13, 'center');
    }

    r.end();
  }
}
