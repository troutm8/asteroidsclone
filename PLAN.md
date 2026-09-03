# Asteroids Clone — Plan

A faithful browser recreation of Atari's 1979 *Asteroids*, playable on a
computer with a keyboard and on iPhone/iPad with on-screen touch buttons.
Hosted on GitHub Pages at https://troutm8.github.io/asteroidsclone/

## Constraints

- Plain HTML, CSS, and JavaScript with a `<canvas>` element.
- No build step, no dependencies, no frameworks. Push to `main` deploys.
- Runs in Safari on iPhone and iPad, and in desktop browsers.
- Keep it as simple as possible. No difficulty selector, gamepad support,
  two-player mode, or colour/theme options.

## Gameplay (faithful to the 1979 original)

- **Look:** black background, crisp white vector lines, no fills, no sprites.
  4:3 playfield letterboxed inside the window.
- **Ship:** rotate left/right, thrust with momentum and slow drag, screen wrap.
  Max 4 shots on screen; each shot has a short fixed lifetime.
- **Hyperspace:** ship vanishes and reappears at a random spot, with a small
  chance of destruction.
- **Asteroids:** large → 2 medium → 2 small → gone. Wave 1 starts with 4 large;
  each wave adds one, up to a cap. Next wave starts when the field is clear.
- **Saucers:** large saucer fires randomly; small saucer aims at the player and
  appears more often as score rises.
- **Lives:** 3 ships to start, bonus ship every 10,000 points. Respawn only
  when the centre of the screen is clear.
- **Scoring:** large asteroid 20, medium 50, small 100, large saucer 200,
  small saucer 1000.
- **Sound:** synthesized with the Web Audio API (no audio files), on by
  default, with a mute toggle. Heartbeat that speeds up as rocks get scarce,
  thrust, fire, three explosion sizes, saucer warble.
- **High scores:** top-ten table with three-initial entry, saved in the
  browser's localStorage per device.

## Controls

**Keyboard (computer)**

| Action      | Keys              |
|-------------|-------------------|
| Rotate      | Left/Right or A/D |
| Thrust      | Up or W           |
| Fire        | Space             |
| Hyperspace  | Shift             |
| Start       | Enter             |
| Pause       | P                 |
| Mute        | M                 |

**Touch (iPhone / iPad)**

- On-screen buttons drawn on the canvas, shown only on touch devices.
- Left thumb: rotate left, rotate right. Right thumb: thrust, fire, hyperspace.
- Full multi-touch so you can turn while thrusting and firing.
- Pinch-zoom, scroll bounce, and double-tap zoom disabled.
- Audio unlocks on the first tap (iOS requirement).
- Landscape only on phones, with a "rotate your device" prompt in portrait.
- Web-app manifest so "Add to Home Screen" gives a full-screen icon.

## Technical structure

- `index.html`, `style.css`, `manifest.webmanifest`, and plain JS modules
  under `js/`, split by concern: game loop, input, ship, asteroids, saucer,
  bullets, collision, rendering, audio, high scores.
- Fixed-timestep physics driven by `requestAnimationFrame`, so speed is the
  same at 60 Hz and 120 Hz.
- Canvas sized to the device pixel ratio for crisp lines.

## Build stages

Each stage is committed and playable on its own.

1. Ship, asteroids, bullets, collisions, waves, score, lives — keyboard only.
2. Touch controls, landscape prompt, iOS quirks, home-screen manifest.
3. Saucers and hyperspace.
4. Synthesized sound and mute toggle.
5. High-score table, attract/title screen, pause, polish.

## Hosting

GitHub Pages, deploying from the root of the `main` branch.
