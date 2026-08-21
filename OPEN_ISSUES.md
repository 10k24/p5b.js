# Open Issues - p5b.js

## Next Up (v1.3.0)

These are the top priorities for the next release.

### 1. Global Alpha Override

Add an `alpha` property to P5b config (integer in [0, 255]) to apply a constant opacity to every emitted frame.

**Fix:** Scale the alpha channel of the RGBA frame buffer by `alpha / 255` in `toFrame()`.

---

## Released

- `loadImage()` canvas v3 fixes (async decode wait + ArrayBuffer slice) shipped in [1.2.2](CHANGELOG.md).
- v1 `loadJSON()` now matches real p5 v1 semantics: returns a data object synchronously, supports `loadJSON(path, callback, errorCallback)`, errors go to `errorCallback` (not a rejected promise). Resolves the former "loadJSON Callback Compatibility" API gap (v1).
- v2 fidelity + dedup cleanup: removed v1-normalizing `join()`/`split()`/`trim()` shims and the `loadTable()` TableRow patch so p5b v2 matches real p5 v2 browser behavior (incl. upstream quirks); extracted shared helpers to `p5b-base.js` (`_fetchJson`, `_readTextLines`, `_wrapSetup`, `_syncCanvasGlobals`, `_preloadHandle`, `_readFont`, `_removeGraphics`, `_pixels`, `_letterbox`) and centralized `resolveAssetPath`/`resolveAssetUrl`/`splitLines`; `noop` moved to `globals.js`. This resolves the former "Asset Path/URL Duplication", "Preload Counter Duplication", and "`fetch` Bound at Init Time" backlog items.

---

## Backlog

Lower priority issues identified during code review. Not scoped to any specific release.

### Code Quality

#### `async preload()` Semantics
If a sketch uses `async function preload() { await loadJSON(...) }`, p5.js never awaits the returned promise. p5b mitigates this: v1 load functions use `_preloadHandle()` to increment/decrement p5's own preload counter, so p5's lifecycle blocks until p5b-managed loads settle. Native p5 (WebGL/`loadFont` in v1) loads inside an async preload are not tracked. Should detect and warn. **v1-only** — v2 rejects `preload` configs entirely.

#### `loadFont()` vs `loadJSON()` Inconsistency
`loadFont()` is synchronous (blocking file I/O). `loadJSON()` is async. Surprising difference for users familiar with p5.js where both use the same callback/preload pattern. Accepted as a known design tradeoff.

### API Gaps

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

These require browser APIs unavailable in Node.js.

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

Status differs by adapter:

- **v1** (`p5b_v1.js`): `createCanvas(w, h, WEBGL)` throws by design.
- **v2** (`p5b_v2.js`): WebGL 1 works headlessly via `headless-gl` (context interception in `p5b-dom.js`; `isP3D` read path in `toFrame()`). WebGL 2 is not supported (headless-gl is WebGL 1 only). Known caveat: shader sketches can leak memory — see `MEMLEAK.md`.
