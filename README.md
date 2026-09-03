# Asteroids

A faithful browser recreation of Atari's 1979 arcade *Asteroids*: black
screen, white vector lines, and the original rules. Plain HTML, CSS, and
JavaScript on a canvas, with no build step and no dependencies.

**Play it:** https://troutm8.github.io/asteroidsclone/

Works in a desktop browser with the keyboard, and on iPhone, iPad, and
Android with on-screen buttons. On a phone, use Safari's *Add to Home
Screen* for a full-screen app.

## Controls

| Action     | Keyboard            | Touch                    |
|------------|---------------------|--------------------------|
| Rotate     | Left/Right or A/D   | Left thumb buttons       |
| Thrust     | Up or W             | Ship button              |
| Fire       | Space               | Dot button               |
| Hyperspace | Shift               | H button                 |
| Start      | Enter               | Tap anywhere             |
| Pause      | P                   | Pause button, top right  |
| Mute       | M                   | Speaker button, top right|

Phones must be held in landscape.

## The game

- Rotate, thrust with momentum, and wrap around the screen edges.
- Four shots on screen at a time. Large rocks split into two medium,
  medium into two small.
- Waves start with four rocks and grow by one each wave.
- A large saucer fires at random; a small saucer aims at you and gets
  more accurate as your score climbs.
- Hyperspace jumps you to a random spot, with a small chance of not
  surviving the trip.
- Three ships to start and a bonus ship every 10,000 points.
- Scoring: large rock 20, medium 50, small 100, large saucer 200, small
  saucer 1000.
- Top-ten high scores with three-initial entry, kept in the browser.
- All sound is synthesized with the Web Audio API.

## Running locally

Browsers won't load JavaScript modules from a `file://` URL, so serve the
folder over HTTP:

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000/.

## Layout

```
index.html            page shell
style.css             full-screen canvas, safe-area insets
manifest.webmanifest  home-screen app metadata
icons/                app icons
js/main.js            game loop, wiring
js/game.js            rules, states, collisions, high scores
js/ship.js  asteroid.js  saucer.js  bullet.js  particles.js
js/input.js           keyboard
js/touch.js           on-screen buttons and landscape prompt
js/render.js          canvas drawing
js/vecfont.js         stroke font
js/audio.js           synthesized sound
js/config.js          tuning constants
js/geom.js            vector and collision helpers
```

Deployed by GitHub Pages from the root of the `main` branch.
