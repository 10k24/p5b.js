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

---

## Missing Functionality

### Not Implemented

| Feature | Notes |
|---------|-------|
| `drawingContext` | Direct Canvas 2D API access — undefined after run() |
| `global:` config option | Shared sketch-scope variables across preload/setup/draw |

The `global:` config use case: sketches loaded via config (not `sketchPath`) cannot share variables across lifecycle functions without relying on `global.*` manually. A `global:` function in config would run before `preload` and inject variables into sketch scope.

---

## Low Priority (Internal)

### 1. Graphics Pool State on Reuse

Pooled graphics retain previous state (draw settings, transformations, pixel data) between frames.

**Location:** `p5b.js` — `createGraphics` pool checkout (~line 310)

**Fix:** Reset graphics state (transform, fill, stroke, etc.) when pulling from pool.

---

### 2. Graphics Pool Unbounded Growth

If a sketch creates graphics of many different sizes, the pool map grows indefinitely.

**Location:** `p5b.js` — pool management in `_initSketch` (~line 185)

**Fix:** Cap bucket size per key, or add LRU eviction across the pool map.

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
