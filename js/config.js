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
