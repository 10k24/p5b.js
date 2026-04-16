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

## Backlog

Lower priority issues identified during code review. Not scoped to any specific release.

#### Remote font loading

Add an example to test importing fonts via pure JS solution from Adobe & Google fonts. Something like...

```js
const link = document.createElement('link');
link.href = 'https://fonts.googleapis.com/css2?family=Roboto';
link.rel = 'stylesheet';
document.head.appendChild(link);

const font = new FontFace('Roboto', 'url(https://fonts.googleapis.com/...)');
await font.load();
document.fonts.add(font);
```

### Code Quality

#### Asset Path / URL Duplication
`filePath.startsWith("http")` and `file://` URL construction duplicated across `loadImage`, `loadJSON`, `loadStrings`, `loadTable`. Extract to a shared helper.

#### Preload Counter Duplication
`p5._incrementPreload()` / `setImmediate(p5._decrementPreload())` pattern repeated across `loadImage`, `loadStrings`, `loadTable`. Extract to a helper.

#### `fetch` Bound at Init Time
`p5b-dom.js` sets `fetch: global.fetch` at construction time. If `fetch` isn't available yet (Node < 18 without polyfill), it's permanently `undefined`. Should be a getter: `get fetch() { return global.fetch; }`.

#### `loadFont()` vs `loadJSON()` Inconsistency
`loadFont()` is synchronous (blocking file I/O). `loadJSON()` is async. Surprising difference for users familiar with p5.js where both use the same callback/preload pattern.

#### `async preload()` Silently Broken
If a sketch uses `async function preload() { await loadJSON(...) }`, p5.js never awaits the returned promise. Assets will not be loaded before `setup()` runs. Should detect and warn.

### API Gaps

#### `loadJSON()` Callback Compatibility
p5.js `loadJSON()` supports `loadJSON(path, successCallback, errorCallback)`. p5b's implementation is async-only. Sketches using the callback pattern will silently get no data.

#### `loadStrings()` HTTP Support
`loadStrings()` supports local files only. `loadImage()` and `loadJSON()` both support HTTP URLs. Inconsistent.

#### `loadBytes()` Missing
`loadBytes()` is not implemented. Calls will throw `"loadBytes is not defined"` with no helpful error.

#### `loadXML()` Missing
`loadXML()` is not implemented. Calls will throw `"loadXML is not defined"` with no helpful error.

#### DOM Functions Behavior Unverified
p5.js may auto-bind DOM functions (`createButton()`, `createCheckbox()`, `createRadio()`, `createSlider()`, `createColorPicker()`, `createInput()`, `createFileInput()`, `createSelect()`, `createDiv()`, `createP()`, `createSpan()`, `createImg()`, `createA()`, `createVideo()`, `createCapture()`, `createTextarea()`) via `_bindGlobals()`. Their actual behavior in headless has not been tested. Need to audit what p5.js exposes and whether calls succeed, silently fail, or crash.

#### `select()`, `selectAll()`, `removeElements()` Not Implemented
These query and manipulate p5-created DOM elements. In headless, all elements live in the DOM shim — these functions should query/manipulate the shim's tracked elements rather than a real browser DOM. Non-trivial to implement correctly.

---

## Known Unsupported (By Design)

These require browser APIs unavailable in Node.js:

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
