# Open Issues - p5b.js

## Staged Fixes

Fixed and staged for next release.

### `loadImage` Broken in canvas v3

Two bugs in `loadImageData` caused image loading to fail.

**Bug 1 — No `onload` wait:** `drawImage(rawImg)` was called immediately after `rawImg.src = buffer`, before the image finished decoding. canvas v3 decodes asynchronously → `"Image given has not completed loading"`.

**Bug 2 — Wrong ArrayBuffer slice:** `fs.readFileSync` returns a pooled `Buffer`. Passing `buf.buffer` gave canvas the entire memory pool instead of just the file bytes → `"Unsupported image type"`.

**Fix:** Wrap draw logic in `rawImg.onload`; pass `buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)` to isolate file bytes.

**Location:** `p5b.js` — `loadImageData` closure in `global.loadImage` (~line 296)

---

## Next Up (v1.3.0)

These are the top priorities for the next release.

### 0. Global alpha override

Add an `alpha` property and validation int [0, 255] to P5b config.

**Fix:** Reset graphics state (transform, fill, stroke, etc.) when pulling from pool.

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
