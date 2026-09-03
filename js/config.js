// Logical playfield size. The original arcade display was 4:3.
export const W = 1024;
export const H = 768;

export const SHIP = {
  ROT_SPEED: 4.6,      // radians per second
  THRUST: 380,         // px per second^2
  DRAG: 0.4,           // exponential drag per second
  MAX_SPEED: 520,      // px per second
  RADIUS: 14,          // for broad-phase collision checks
  RESPAWN_DELAY: 2,    // seconds before a new ship can appear
  SAFE_RADIUS: 160,    // centre must be clear of rocks within this radius
};

export const BULLET = {
  SPEED: 640,
  LIFE: 1.15,          // seconds
  MAX: 4,              // max ship bullets on screen
};

export const ROCK = {
  L: { r: 44, score: 20,  speed: [40, 95]   },
  M: { r: 24, score: 50,  speed: [70, 150]  },
  S: { r: 12, score: 100, speed: [110, 220] },
};

export const WAVE = {
  START: 4,            // large rocks in wave 1
  CAP: 11,             // max large rocks in a wave
  DELAY: 2.5,          // seconds between clearing a wave and the next one
  SPAWN_CLEARANCE: 220 // new rocks spawn at least this far from the ship
};

export const GAME = {
  LIVES: 3,
  BONUS_EVERY: 10000,
  GAMEOVER_DELAY: 4,
};

export const SAUCER = {
  L: { r: 22, score: 200,  speed: 110, fireInterval: 1.2 },
  S: { r: 12, score: 1000, speed: 150, fireInterval: 0.9 },
  FIRST_DELAY: [8, 14],   // seconds after a game starts before the first saucer
  DELAY: [7, 14],         // seconds between saucers
  MAX_BULLETS: 2,
  BULLET_SPEED: 420,
  BULLET_LIFE: 1.2,
  SMALL_MIN_PROB: 0.15,   // chance a saucer is small at low scores
  SMALL_START_SCORE: 5000,
  SMALL_FULL_SCORE: 35000, // from here on, only small saucers
  AIM_ERROR_MAX: 0.35,    // radians, small saucer aim error at score 0
  AIM_ERROR_MIN: 0.04,    // radians, at SMALL_FULL_SCORE
};

export const HYPER = {
  DURATION: 0.9,          // seconds the ship is gone
  DEATH_CHANCE: 1 / 12,   // chance of exploding on re-entry
  MARGIN: 60,             // keep re-entry away from the edges
};
