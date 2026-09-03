import { Game } from './game.js';
import { Input } from './input.js';
import { Renderer } from './render.js';
import { TouchControls } from './touch.js';
import { Audio } from './audio.js';

const canvas = document.getElementById('game');
const renderer = new Renderer(canvas);
const input = new Input();
const game = new Game();
const touch = new TouchControls(canvas, input, renderer, game);
const audio = new Audio();
game.soundOff = audio.muted;

// Browsers only allow audio to start inside a user gesture.
const unlock = () => audio.unlock();
for (const ev of ['keydown', 'pointerdown', 'pointerup', 'touchend', 'click']) {
  window.addEventListener(ev, unlock, { passive: true });
}
window.__game = game;   // handy for poking at state from the console
window.__input = input;
window.__touch = touch;
window.__audio = audio;

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

  if (touch.needsRotate()) {
    // Phone held in portrait: hold the game and ask for landscape.
    if (game.state === 'playing') game.paused = true;
    touch.releaseAll();
    input.flush();
    audio.stopLoops();
    acc = 0;
    renderer.begin();
    renderer.end();
    touch.drawRotatePrompt();
    requestAnimationFrame(frame);
    return;
  }

  if (input.justPressed('mute')) {
    audio.toggleMute();
    game.soundOff = audio.muted;
  }

  let steps = 0;
  while (acc >= STEP) {
    game.update(STEP, input);
    acc -= STEP;
    // Presses are consumed by the first step of the frame only.
    if (++steps === 1) input.flush();
  }

  for (const ev of game.events) audio.play(ev);
  game.events.length = 0;
  audio.sync(game, dt);

  game.draw(renderer);
  touch.draw();
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
