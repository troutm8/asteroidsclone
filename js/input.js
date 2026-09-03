// Keyboard input mapped to game actions. Touch controls (stage 2) will drive
// the same press()/release() API so the game never needs to know the source.

const KEYS = {
  left:   ['ArrowLeft', 'KeyA'],
  right:  ['ArrowRight', 'KeyD'],
  thrust: ['ArrowUp', 'KeyW'],
  fire:   ['Space'],
  hyper:  ['ShiftLeft', 'ShiftRight'],
  start:  ['Enter'],
  pause:  ['KeyP'],
  mute:   ['KeyM'],
};

// Some browsers and virtual keyboards report an empty e.code; fall back to e.key.
const KEY_FALLBACK = {
  ArrowLeft: 'left', a: 'left', A: 'left',
  ArrowRight: 'right', d: 'right', D: 'right',
  ArrowUp: 'thrust', w: 'thrust', W: 'thrust',
  ' ': 'fire',
  Shift: 'hyper',
  Enter: 'start',
  p: 'pause', P: 'pause',
  m: 'mute', M: 'mute',
};

export class Input {
  constructor() {
    this.down = new Set();
    this.pressed = new Set();
    this.codeToAction = new Map();
    for (const [action, codes] of Object.entries(KEYS)) {
      for (const code of codes) this.codeToAction.set(code, action);
    }
    window.addEventListener('keydown', (e) => this.onKey(e, true));
    window.addEventListener('keyup', (e) => this.onKey(e, false));
    window.addEventListener('blur', () => this.down.clear());
  }

  onKey(e, isDown) {
    const action = this.codeToAction.get(e.code) || KEY_FALLBACK[e.key];
    if (!action) return;
    e.preventDefault();
    if (isDown) {
      if (!e.repeat) this.press(action);
    } else {
      this.release(action);
    }
  }

  press(action) {
    if (!this.down.has(action)) this.pressed.add(action);
    this.down.add(action);
  }

  release(action) {
    this.down.delete(action);
  }

  isDown(action) { return this.down.has(action); }
  justPressed(action) { return this.pressed.has(action); }

  // Called once per frame after the first physics step has consumed presses.
  flush() { this.pressed.clear(); }
}
