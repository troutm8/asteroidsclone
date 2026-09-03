import { W, H, SHIP, BULLET, WAVE, GAME, SAUCER } from './config.js';
import { Ship } from './ship.js';
import { Asteroid } from './asteroid.js';
import { Saucer } from './saucer.js';
import { Bullet } from './bullet.js';
import { Particles } from './particles.js';
import { pointInPoly, polysIntersect, dist2, rand } from './geom.js';

const HI_KEY = 'asteroids.highscore';
const SCORES_KEY = 'asteroids.scores';
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

function loadHigh() {
  try { return Number(localStorage.getItem(HI_KEY)) || 0; } catch { return 0; }
}
function saveHigh(v) {
  try { localStorage.setItem(HI_KEY, String(v)); } catch { /* private mode etc. */ }
}
function loadScores() {
  try {
    const raw = JSON.parse(localStorage.getItem(SCORES_KEY) || '[]');
    if (Array.isArray(raw)) {
      return raw
        .filter((e) => e && typeof e.score === 'number' && typeof e.name === 'string')
        .map((e) => ({ name: e.name.slice(0, 3), score: e.score }))
        .sort((a, b) => b.score - a.score)
        .slice(0, GAME.MAX_SCORES);
    }
  } catch { /* fall through */ }
  return [];
}
function saveScores(list) {
  try { localStorage.setItem(SCORES_KEY, JSON.stringify(list)); } catch { /* ignore */ }
}

export class Game {
  constructor() {
    // 'attract' | 'playing' | 'gameover' | 'entry'
    this.state = 'attract';
    this.attractPhase = 'start'; // 'start' | 'scores'
    this.phaseTimer = 0;
    this.score = 0;
    this.scores = loadScores();
    const oldHigh = loadHigh();
    if (this.scores.length === 0 && oldHigh > 0) {
      // Carry over a high score from before the table existed.
      this.scores.push({ name: '---', score: oldHigh });
      saveScores(this.scores);
    }
    this.highScore = Math.max(oldHigh, this.scores[0] ? this.scores[0].score : 0);
    this.lives = 0;
    this.wave = 0;
    this.nextBonus = GAME.BONUS_EVERY;
    this.ship = new Ship();
    this.rocks = [];
    this.bullets = [];
    this.saucer = null;
    this.saucerTimer = 0;
    this.particles = new Particles();
    this.entry = null;
    this.respawnTimer = 0;
    this.waveTimer = 0;
    this.stateTimer = 0;
    this.paused = false;
    this.touchMode = false; // set by TouchControls on touch devices
    this.soundOff = false;  // mirrored from Audio each frame for the HUD
    this.events = [];       // sound events drained by main each frame
    this.waveMass = 1;      // rock "mass" at wave start, for the heartbeat
    this.waveTime = 0;
    this.time = 0;
    this.spawnAttractField();
  }

  emit(name) {
    this.events.push(name);
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
    this.saucer = null;
    this.saucerTimer = rand(...SAUCER.FIRST_DELAY);
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
    this.waveMass = n * 4;
    this.waveTime = 0;
  }

  toAttract() {
    this.state = 'attract';
    this.saucer = null;
    this.attractPhase = this.scores.length ? 'scores' : 'start';
    this.phaseTimer = 0;
    if (this.rocks.length < 4) this.spawnAttractField();
  }

  onBlur() {
    if (this.state === 'playing') this.paused = true;
  }

  update(dt, input) {
    this.time += dt;

    switch (this.state) {
      case 'attract':
        if (input.justPressed('start')) {
          this.startGame();
          return;
        }
        this.phaseTimer += dt;
        if (this.phaseTimer >= GAME.ATTRACT_PHASE && this.scores.length) {
          this.phaseTimer = 0;
          this.attractPhase = this.attractPhase === 'start' ? 'scores' : 'start';
        }
        break;
      case 'playing':
        if (input.justPressed('pause')) this.paused = !this.paused;
        if (this.paused) return;
        this.waveTime += dt;
        this.updateShip(dt, input);
        this.updateSaucerSpawn(dt);
        break;
      case 'gameover':
        this.stateTimer -= dt;
        if (this.stateTimer <= 0 ||
            (input.justPressed('start') && this.stateTimer <= GAME.GAMEOVER_DELAY - GAME.GAMEOVER_SKIP_AFTER)) {
          this.finishGameOver();
          return;
        }
        break;
      case 'entry':
        this.updateEntry(dt, input);
        break;
    }

    for (const r of this.rocks) r.update(dt);
    for (const b of this.bullets) b.update(dt);
    this.bullets = this.bullets.filter((b) => !b.dead);
    if (this.saucer) {
      const fire = this.saucer.update(dt);
      if (this.saucer.gone) {
        this.saucer = null;
        this.resetSaucerTimer();
      } else if (fire && this.state === 'playing') {
        this.saucerFire();
      }
    }
    this.particles.update(dt);

    if (this.state === 'playing') {
      this.collide();
      this.checkWave(dt);
    }
  }

  updateShip(dt, input) {
    const ship = this.ship;
    if (ship.alive) {
      const ev = ship.update(dt, input);
      if (ev === 'hyperDeath') {
        this.shipDie();
        return;
      }
      if (!ship.inHyper && input.justPressed('fire')) {
        const inFlight = this.bullets.reduce((n, b) => n + (b.owner === 'ship'), 0);
        if (inFlight < BULLET.MAX) {
          this.bullets.push(ship.fireBullet());
          this.emit('fire');
        }
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
    if (this.saucer) {
      const d = SHIP.SAFE_RADIUS + this.saucer.r;
      if (dist2(this.saucer.x, this.saucer.y, cx, cy) < d * d) return false;
    }
    return true;
  }

  // ---- game over and high scores ----

  qualifies(score) {
    if (score <= 0) return false;
    if (this.scores.length < GAME.MAX_SCORES) return true;
    return score > this.scores[this.scores.length - 1].score;
  }

  finishGameOver() {
    if (this.qualifies(this.score)) {
      this.state = 'entry';
      this.entry = { name: ['A', 'A', 'A'], slot: 0, hold: 0 };
    } else {
      this.toAttract();
    }
  }

  // Arcade-style initials: rotate to pick a letter, fire/hyperspace to accept.
  // Keyboard players can also type letters directly and use Backspace.
  updateEntry(dt, input) {
    const e = this.entry;
    const typed = input.typed.find((ch) => LETTERS.includes(ch));
    if (typed) {
      e.name[e.slot] = typed;
      this.emit('select');
      this.advanceEntry();
      return;
    }
    if (input.justPressed('back')) {
      if (e.slot > 0) e.slot--;
      return;
    }
    let dir = 0;
    if (input.justPressed('left')) dir = -1;
    else if (input.justPressed('right')) dir = 1;
    if (dir) {
      e.hold = 0;
    } else if (input.isDown('left') || input.isDown('right')) {
      e.hold += dt;
      if (e.hold > 0.4) {          // held: auto-repeat every 0.1 s
        e.hold = 0.3;
        dir = input.isDown('left') ? -1 : 1;
      }
    } else {
      e.hold = 0;
    }
    if (dir) {
      const i = LETTERS.indexOf(e.name[e.slot]);
      e.name[e.slot] = LETTERS[(i + dir + LETTERS.length) % LETTERS.length];
      this.emit('select');
    }
    if (input.justPressed('hyper') || input.justPressed('fire') || input.justPressed('start')) {
      this.emit('select');
      this.advanceEntry();
    }
  }

  advanceEntry() {
    this.entry.slot++;
    if (this.entry.slot >= 3) this.commitEntry();
  }

  commitEntry() {
    this.scores.push({ name: this.entry.name.join(''), score: this.score });
    this.scores.sort((a, b) => b.score - a.score);
    this.scores.length = Math.min(this.scores.length, GAME.MAX_SCORES);
    saveScores(this.scores);
    this.entry = null;
    this.toAttract();
  }

  // ---- saucers ----

  resetSaucerTimer() {
    this.saucerTimer = rand(...SAUCER.DELAY);
  }

  updateSaucerSpawn(dt) {
    if (this.saucer) return;
    this.saucerTimer -= dt;
    if (this.saucerTimer <= 0) this.spawnSaucer();
  }

  spawnSaucer() {
    const span = SAUCER.SMALL_FULL_SCORE - SAUCER.SMALL_START_SCORE;
    const t = Math.min(1, Math.max(0, (this.score - SAUCER.SMALL_START_SCORE) / span));
    const pSmall = SAUCER.SMALL_MIN_PROB + (1 - SAUCER.SMALL_MIN_PROB) * t;
    this.saucer = new Saucer(Math.random() < pSmall ? 'S' : 'L');
  }

  saucerFire() {
    const s = this.saucer;
    const inFlight = this.bullets.reduce((n, b) => n + (b.owner === 'saucer'), 0);
    if (inFlight >= SAUCER.MAX_BULLETS) return;
    const target = this.ship.alive && !this.ship.inHyper ? this.ship : null;
    const a = s.aim(target, this.score);
    const c = Math.cos(a), sn = Math.sin(a);
    this.bullets.push(new Bullet(
      s.x + c * (s.r + 2), s.y + sn * (s.r + 2),
      c * SAUCER.BULLET_SPEED, sn * SAUCER.BULLET_SPEED,
      SAUCER.BULLET_LIFE, 'saucer'
    ));
  }

  destroySaucer(award) {
    const s = this.saucer;
    if (!s) return;
    this.particles.burst(s.x, s.y, s.vx, s.vy, s.size === 'L' ? 10 : 7);
    this.emit('saucerExplode');
    if (award) this.addScore(s.score);
    this.saucer = null;
    this.resetSaucerTimer();
  }

  // ---- collisions ----

  shipVulnerable() {
    return this.ship.alive && !this.ship.inHyper;
  }

  collide() {
    const rocks = this.rocks;
    const ship = this.ship;

    // Bullets vs rocks, ship bullets vs saucer, saucer bullets vs ship.
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      let hit = false;
      for (let j = rocks.length - 1; j >= 0; j--) {
        const r = rocks[j];
        const reach = r.r + 4;
        if (dist2(b.x, b.y, r.x, r.y) > reach * reach) continue;
        if (pointInPoly(b.x, b.y, r.verts())) {
          this.destroyRock(j, b.owner === 'ship');
          hit = true;
          break;
        }
      }
      if (!hit && b.owner === 'ship' && this.saucer) {
        const s = this.saucer;
        const reach = s.r + 4;
        if (dist2(b.x, b.y, s.x, s.y) <= reach * reach && pointInPoly(b.x, b.y, s.verts())) {
          this.destroySaucer(true);
          hit = true;
        }
      }
      if (!hit && b.owner === 'saucer' && this.shipVulnerable()) {
        const reach = SHIP.RADIUS + 4;
        if (dist2(b.x, b.y, ship.x, ship.y) <= reach * reach && pointInPoly(b.x, b.y, ship.verts())) {
          this.shipDie();
          hit = true;
        }
      }
      if (hit) this.bullets.splice(i, 1);
    }

    // Saucer vs rocks: both are destroyed, no points.
    if (this.saucer) {
      const s = this.saucer;
      const sv = s.verts();
      for (let j = rocks.length - 1; j >= 0; j--) {
        const r = rocks[j];
        const reach = r.r + s.r;
        if (dist2(s.x, s.y, r.x, r.y) > reach * reach) continue;
        if (polysIntersect(sv, r.verts())) {
          this.destroyRock(j, false);
          this.destroySaucer(false);
          break;
        }
      }
    }

    // Ship vs rocks.
    if (this.shipVulnerable()) {
      const sv = ship.verts();
      for (let j = rocks.length - 1; j >= 0; j--) {
        const r = rocks[j];
        const reach = r.r + SHIP.RADIUS;
        if (dist2(ship.x, ship.y, r.x, r.y) > reach * reach) continue;
        if (polysIntersect(sv, r.verts())) {
          this.destroyRock(j, true);
          this.shipDie();
          break;
        }
      }
    }

    // Ship vs saucer: both die, points awarded.
    if (this.shipVulnerable() && this.saucer) {
      const s = this.saucer;
      const reach = s.r + SHIP.RADIUS;
      if (dist2(ship.x, ship.y, s.x, s.y) <= reach * reach && polysIntersect(ship.verts(), s.verts())) {
        this.destroySaucer(true);
        this.shipDie();
      }
    }
  }

  destroyRock(index, award = true) {
    const rock = this.rocks[index];
    this.rocks.splice(index, 1);
    if (award) this.addScore(rock.score);
    this.particles.rockBurst(rock);
    this.emit('explode' + rock.size);
    this.rocks.push(...rock.split());
  }

  addScore(points) {
    this.score += points;
    if (this.score >= this.nextBonus) {
      this.lives++;
      this.nextBonus += GAME.BONUS_EVERY;
      this.emit('extraLife');
    }
    if (this.score > this.highScore) this.highScore = this.score;
  }

  shipDie() {
    const ship = this.ship;
    this.particles.shipBurst(ship);
    this.emit('shipExplode');
    ship.alive = false;
    ship.inHyper = false;
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

  // ---- drawing ----

  draw(r) {
    r.begin();

    for (const rock of this.rocks) r.rock(rock);
    if (this.saucer) r.saucer(this.saucer);
    for (const b of this.bullets) r.dot(b.x, b.y);
    r.particles(this.particles);
    if (this.shipVulnerable() && this.state === 'playing') r.ship(this.ship);

    // HUD
    const scoreText = this.score === 0 ? '00' : String(this.score);
    const highText = this.highScore === 0 ? '00' : String(this.highScore);
    r.text(scoreText, 40, 24, 28, 'left');
    r.text(highText, W / 2, 24, 13, 'center');
    if (this.state === 'playing') r.lifeIcons(this.lives, 52, 74);

    const blink = Math.floor(this.time * 1.6) % 2 === 0;
    const startHint = this.touchMode ? 'TAP TO START' : 'PRESS ENTER';
    switch (this.state) {
      case 'attract':
        if (this.attractPhase === 'scores') this.drawScores(r, blink);
        else this.drawStartScreen(r, blink, startHint);
        break;
      case 'gameover':
        r.text('GAME OVER', W / 2, H / 2 - 14, 28, 'center');
        if (this.stateTimer <= GAME.GAMEOVER_DELAY - GAME.GAMEOVER_SKIP_AFTER && blink) {
          r.text(startHint, W / 2, H / 2 + 40, 13, 'center');
        }
        break;
      case 'entry':
        this.drawEntry(r, blink);
        break;
      case 'playing':
        if (this.paused) {
          r.text('PAUSED', W / 2, H / 2 - 14, 28, 'center');
          if (this.touchMode) r.text('TAP TO RESUME', W / 2, H / 2 + 40, 13, 'center');
        }
        break;
    }
    if (this.state !== 'attract' && this.soundOff) r.text('SOUND OFF', W / 2, H - 36, 11, 'center');

    r.end();
  }

  drawStartScreen(r, blink, startHint) {
    if (blink) r.text('PUSH START', W / 2, H / 2 - 14, 28, 'center');
    r.text(startHint, W / 2, H / 2 + 40, 13, 'center');
    if (!this.touchMode) r.text(this.soundOff ? 'M - SOUND OFF' : 'M - SOUND ON', W / 2, H - 36, 11, 'center');
    else if (this.soundOff) r.text('SOUND OFF', W / 2, H - 36, 11, 'center');
  }

  drawScores(r, blink) {
    r.text('HIGH SCORES', W / 2, 120, 20, 'center');
    const top = 180, step = 34, size = 16;
    this.scores.forEach((e, i) => {
      const y = top + i * step;
      r.text(`${i + 1}.`, W / 2 - 90, y, size, 'right');
      r.text(String(e.score), W / 2 + 40, y, size, 'right');
      r.text(e.name, W / 2 + 70, y, size, 'left');
    });
    if (blink) r.text('PUSH START', W / 2, H - 80, 16, 'center');
  }

  drawEntry(r, blink) {
    const e = this.entry;
    const y0 = 150;
    r.text('YOUR SCORE IS ONE OF THE TEN BEST', W / 2, y0, 14, 'center');
    r.text('PLEASE ENTER YOUR INITIALS', W / 2, y0 + 36, 14, 'center');
    if (this.touchMode) {
      r.text('PUSH ROTATE TO SELECT LETTER', W / 2, y0 + 90, 12, 'center');
      r.text('PUSH FIRE WHEN LETTER IS CORRECT', W / 2, y0 + 116, 12, 'center');
    } else {
      r.text('LEFT/RIGHT OR TYPE TO SELECT LETTER', W / 2, y0 + 90, 12, 'center');
      r.text('PRESS FIRE OR ENTER WHEN LETTER IS CORRECT', W / 2, y0 + 116, 12, 'center');
    }
    const size = 36, spacing = 56, y = H / 2 + 40;
    for (let i = 0; i < 3; i++) {
      const x = W / 2 + (i - 1) * spacing;
      const current = i === e.slot;
      if (i < e.slot || (current && blink)) r.text(e.name[i], x, y, size, 'center');
      if (current) r.text('_', x, y + 8, size, 'center');
    }
  }
}
