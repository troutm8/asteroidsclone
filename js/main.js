import { Game } from './game.js';
import { Input } from './input.js';
import { Renderer } from './render.js';

const canvas = document.getElementById('game');
const renderer = new Renderer(canvas);
const input = new Input();
const game = new Game();
window.__game = game;   // handy for poking at state from the console
window.__input = input;

window.addEventListener('blur', () => game.onBlur());

// Fixed-timestep simulation so the game plays the same at 60 Hz and 120 Hz.
const STEP = 1 / 120;
const MAX_FRAME = 0.1;
let last = performance.now();
let acc = 0;

function frame(now) {
  let dt = (now - last) / 1000;
  last = now;
  if (dt > MAX_FRAME) dt = MAX_FRAME;
  acc += dt;

  let steps = 0;
  while (acc >= STEP) {
    game.update(STEP, input);
    acc -= STEP;
    // Presses are consumed by the first step of the frame only.
    if (++steps === 1) input.flush();
  }

  game.draw(renderer);
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
