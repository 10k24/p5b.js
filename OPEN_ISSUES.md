# Open Issues - p5b.js

## Completed & Tested

The following are implemented and have passing test coverage:

- **Math Constants**: PI, TWO_PI, HALF_PI, QUARTER_PI, TAU, DEGREES, RADIANS
- **Math Functions**: abs, ceil, floor, round, pow, sqrt, exp, log, max, min, sin, cos, tan, asin, acos, atan, atan2, sq, mag, fract
- **Random/Noise**: random, randomSeed, randomGaussian, noise, noiseSeed, noiseDetail
- **Utility Functions**: map, lerp, lerpColor, constrain, dist, createVector
- **String Functions**: nf, nfc, nfp, nfs, join, split, splitTokens, trim
- **Shape Constants**: CORNER, CORNERS, RADIUS, CENTER, LEFT, RIGHT, TOP, BOTTOM, BASELINE, CLOSE, OPEN, CHORD, PIE, POINTS, LINES, TRIANGLES, etc.
- **Blend Mode Constants**: BLEND, ADD, REMOVE, DARKEST, LIGHTEST, DIFFERENCE, SUBTRACT, EXCLUSION, MULTIPLY, SCREEN, REPLACE, OVERLAY, HARD_LIGHT, SOFT_LIGHT, DODGE, BURN
- **Cursor/Input Constants**: ARROW, CROSS, HAND, MOVE, TEXT, WAIT, key codes, arrow keys
- **Typography Constants**: NORMAL, ITALIC, BOLD, BOLDITALIC, CHAR, WORD
- **Other Constants**: AUTO, STROKE, FILL, TEXTURE, IMMEDIATE, NEAREST, REPEAT, CLAMP, MIRROR, FLAT, SMOOTH, LANDSCAPE, PORTRAIT
- **Time Functions**: year(), month(), day(), hour(), minute(), second()
- **Environment**: frameRate(), loop(), noLoop(), isLooping(), redraw()
- **Loop lifecycle**: noLoop() in setup, noLoop() in draw, redraw() while stopped, loop()/noLoop() toggle, external control, frameCount preservation
- **Mode/Style**: rectMode(), ellipseMode(), strokeCap(), strokeJoin()
- **Typography**: textLeading(), textStyle(), textWidth(), textAlign(), textWrap()
- **Data/IO**: loadStrings(), loadTable()
- **Environment (Extended)**: cursor(), noCursor(), pixelDensity(), windowWidth, windowHeight
- **Accessibility**: describe(), describeElement(), textOutput(), gridOutput() (all noops in headless)
- **imageMode()**: CORNER, CENTER, CORNERS
- **drawingContext**: direct Canvas 2D API access after createCanvas()

---

## Blockers (v1.2.0)

### `_cleanupGlobals()` — Broken, Not Called

`_cleanupGlobals()` exists in `p5b.js` but is never called. It cannot safely be called in `stop()` as-is because:

1. It deletes DOM globals (`window`, `document`, etc.) owned by `_dom`, breaking any subsequent `run()` call on any P5b instance
2. It does NOT clean the p5 function globals (`background`, `fill`, `stroke`, ...) set by `_bindGlobals()` — the actual leak

**Fix:** Either rewrite to only delete p5 function globals (by tracking what `_bindGlobals()` set), or confirm `_myP5.remove()` handles p5's own teardown and delete `_cleanupGlobals()` entirely.

---

## Next Up (v1.3.0)

These are the top priorities for the next release.

### 1. Graphics Pool State on Reuse

Pooled graphics retain previous state (draw settings, transformations, pixel data) between frames.

**Location:** `p5b.js` — `createGraphics` pool checkout (~line 310)

**Fix:** Reset graphics state (transform, fill, stroke, etc.) when pulling from pool.

---

### 2. Graphics Pool Unbounded Growth

If a sketch creates graphics of many different sizes, the pool map grows indefinitely.

**Location:** `p5b.js` — pool management in `_initSketch` (~line 185)

**Fix:** Cap bucket size per key, or add LRU eviction across the pool map.

### 3. `run()` → `stop()` → `run()` Lifecycle Test

Calling `run()`, then `stop()`, then `run()` again on the same P5b instance should work without issues. The logic flow needs to be audited and a test written to cover this scenario.

---

### 3. `global:` Config Option

Shared sketch-scope variables across `preload`/`setup`/`draw` when using inline config functions (no `sketchPath`).

**Root cause:** When config supplies `{preload, setup, draw}` as functions, p5b assigns each to `global.*`. These functions are defined in the caller's closure — a `let x` inside `preload` is invisible to `setup`. Users must write `global.x = ...` explicitly to share state across lifecycle functions.

By contrast, `sketchPath` sketches run via `vm.runInThisContext`, so top-level variables in the sketch file are shared naturally.

**Fix:** Add a `global:` function to config that runs before `preload` and declares shared variables into global scope:

```js
new P5b({
  global: () => { myImage = null; },
  preload: () => { myImage = loadImage('img.png'); },
  setup: () => { image(myImage, 0, 0); },
  draw: () => {},
});
```

---

## Known Unsupported (By Design)

These require browser APIs unavailable in Node.js:

### DOM Creation

| Function | Notes |
|----------|-------|
| `createDiv()`, `createButton()`, `createSlider()` | No real DOM in headless |
| `createSelect()`, `createInput()`, `createFileInput()` | No real DOM in headless |
| `select()`, `selectAll()` | No real DOM in headless |

### Sound (p5.sound)

| Missing |
|---------|
| `loadSound`, `loadAudio`, `createAudio` |
| `Oscillator`, `p5.AudioIn`, `p5.FFT`, `p5.Amplitude` |
| `play`, `pause`, `loop`, `stop`, `jump`, `rate`, `amp` |

### Video/Capture

| Missing |
|---------|
| `createCapture(VIDEO/AUDIO)`, `createVideo()` |

### 3D/WebGL

WEBGL renderer throws by design.

| Missing |
|---------|
| `createCanvas(w, h, WEBGL)` |
| `plane`, `box`, `sphere`, `cylinder`, `cone`, `torus` |
| `loadModel`, `ambientLight`, `directionalLight`, `camera`, `orbitControl` |
