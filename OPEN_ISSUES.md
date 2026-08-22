# Open Issues - p5b.js

## Priority 1 — API Gaps & Semantics

### DOM Functions Behavior Unverified
p5.js may auto-bind DOM functions (`createButton()`, `createCheckbox()`, `createRadio()`,
`createSlider()`, `createColorPicker()`, `createInput()`, `createFileInput()`,
`createSelect()`, `createDiv()`, `createP()`, `createSpan()`, `createImg()`, `createA()`,
`createVideo()`, `createCapture()`, `createTextarea()`) via `_bindGlobals()`. Their actual
behavior in headless has not been tested. Need to audit what p5.js exposes and whether
calls succeed, silently fail, or crash.

### select(), selectAll(), removeElements() Not Implemented
These query/manipulate p5-created DOM elements. In headless, all elements live in the DOM
shim — these should query/manipulate the shim's tracked elements rather than a real DOM.
Non-trivial to implement correctly.

> Accepted tradeoff (not a task): `loadFont()` is synchronous (blocking file I/O) while
> `loadJSON()` is async. Known inconsistency vs browser p5.js where both share the
> callback/preload pattern.

---

## Priority 2 — headless-gl WebGL Memory Leak

**RESOLVED — no reproducible leak in the current architecture.** Measured under node
(via `scripts/gl-diag.js`, forced GC, RSS + live GL-object counts) across 600 frames:

- **Minimal WebGL** (`box()`): RSS plateaus ~7MB, GL counts flat.
- **Geometry stress** (`webgl-geometry.js`: per-frame `createGraphics` text → many `ellipse()`):
  RSS plateaus ~12MB, GL counts flat (no new shader/program/texture/buffer/framebuffer).
- **Scale path** (output ≠ canvas), both pre- and post-cache: RSS plateaus ~4–11MB, no growth.
- `loadPixels()`/`readPixelsWebGL` reuse the pixels buffer; `createGraphics` is pooled;
  geometry is bounded. No path accumulates native memory across frames.

The reported ">600MB" figure predates the split architecture (WEBGL_TASKS/MEMLEAK prototype)
and is **not reproducible** with the current p5-v2 under node+headless-gl. The `toFrame()`
read-back-canvas cache (below) remains as a cleanup/optimization, not a leak fix.

**Environment constraint:** headless-gl is a native addon compiled for the Node ABI
(NODE_MODULE_VERSION 127); bun requires 137, so it **cannot load under bun** — WebGL
requires plain `node`. The `bun test` suite can't exercise it; `test/webgl.test.js` gates
WebGL tests on gl availability (run under node, skip under bun).

> Note: under node, p5-v2 fails to load without the `gifenc` `exports` patch (gifenc is a
> transitive dep of p5-v2; node's ESM resolver can't find its named exports). bun resolves
> it fine. The patch is now applied and kept (see Priority 3 gifenc item).

**Diagnostic tooling added:** `scripts/gl-diag.js` (`P5B_P5_PATH=p5-v2 node --expose-gc
scripts/gl-diag.js [sketch] [frames] [every] [outW] [outH]`).

**Already applied:** `toFrame()` caches the WebGL read-back canvas (`_glReadCanvas`,
recreated only on size change) instead of allocating a fresh node-canvas surface per frame;
cleared on `remove()`.

**Fix criteria (met):** RSS stable across 100+ frames of a WEBGL sketch — confirmed via
`scripts/gl-diag.js` for box, geometry, and scale paths.

---

## Priority 3 — Lower Priority / Future Work

### Create `lib` directory
Only `p5b.js` and `p5b.mjs` should be in the root. Other JS files should move under `lib`. Leave `eslint.config.js` where it is.
Update all require and import paths to match their new location.

### Global Alpha Override
Add an `alpha` property to P5b config (integer in [0, 255]) to apply constant opacity to
every emitted frame. **Fix:** scale the RGBA frame buffer alpha channel by `alpha / 255`
in `toFrame()`. (Next v1.3.0 candidate.)

### loadXML() (future work)
`loadXML()` is not implemented. Calls throw `"loadXML is not defined"` with no helpful error.
Blocked on a browser-only dependency: both p5 v1 (`httpDo(..., 'xml')`) and p5 v2
(`new DOMParser().parseFromString(...)`) parse XML via the `DOMParser` global, which Node
doesn't provide. Faithful support needs a `DOMParser` shim or third-party XML→DOM parser,
plus the `p5.XML` wrapper API (children/attributes traversal). Same class of browser-API gap
as sound/video. Would also conflict with p5b's minimal-dependency philosophy.

### Canvas Rendering Optimization
Render headless CPU-only 2D (1 sketch at a time, no GPU). Current stack: `node-canvas`
(Cairo); bottleneck Cairo rasterization + BGRA→RGBA swap.
- **Tier 1 (2–3x over Cairo):** swap `canvas` → `skia-canvas` or `@napi-rs/canvas`; near drop-in; minimal p5b changes.
- **Tier 2 (2–3x over Skia):** `tiny-skia` (pure Rust) — no existing node bindings; needs custom napi addon.
- **Tier 3 (5–8x over Cairo):** custom Rust napi addon w/ SIMD rasterization; significant effort; only after Tier 1 shows Skia insufficient.
- **Ruled out:** GPU rasterization (Vello/WebGPU) — GPU→CPU readback (~1–5ms/frame) negates gain for single-buffer output. Worker threads — improve batch throughput, not single-frame latency.
- **Recommended path:** (1) benchmark node-canvas on representative sketches; (2) swap to Skia, re-benchmark; (3) evaluate vs target FPS; (4) only pursue Tier 2/3 if Skia falls short. At 30fps Cairo handles simple/moderate; 60fps complex hits the wall — Skia gives headroom.

### gifenc exports (node-only)
p5-v2 transitively depends on `gifenc` (no `exports` field), so node's ESM resolver can't
find its named exports (`GIFEncoder`/`quantize`) and p5-v2 fails to load under node.
**bun resolves gifenc fine** (via the `module` field), so it's a non-issue for the bun-based
test suite. The `patches/gifenc@1.0.3.patch` + `patchedDependencies` fix is now **applied and
kept** (needed to run p5-v2 WebGL under node — see Priority 2). Inert under bun.

---

## Known Unsupported (By Design)

Require browser APIs unavailable in Node.js.

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
- **v1:** `createCanvas(w, h, WEBGL)` throws by design (`p5b_v1.js`).
- **v2:** WebGL 1 works headlessly via `headless-gl` (context intercept in `p5b-dom.js`;
  `isP3D` read path in `toFrame()`). WebGL 2 unsupported (headless-gl is WebGL 1 only).
  Caveat: shader sketches can leak memory — see Priority 2.

---

# Completed Items

- **WebGL memleak investigated & resolved (node)** — measured via `scripts/gl-diag.js`
  (forced GC, RSS + live GL-object counts) under node + headless-gl + p5-v2 across 600 frames:
  no path leaks (box, per-frame geometry, and scale paths all plateau; GL counts flat). The
  ">600MB" figure was stale prototype data, not reproducible now. `toFrame()` caches the
  read-back canvas (`_glReadCanvas`) as a cleanup. Added `test/webgl.test.js` (gl-gated) +
  `webgl-box.js`/`webgl-geometry.js` fixtures + gifenc patch (node p5-v2 load).
- **`loadBytes()` (v1 + v2)** — implemented via the shared `request(url, "arrayBuffer")`
  helper (new `arrayBuffer` response type). v1 mirrors native p5 v1 (returns `{}` shell with
  `.bytes` as `Uint8Array`, preload-counter-gated); v2 mirrors native p5 v2 (Promise resolving
  to `Uint8Array`). HTTP URLs + local files both work. Resolves the "loadBytes() Missing" gap.
- **`loadStrings()` HTTP-capable (v1 + v2)** — both adapters now fetch via the shared
  `request(url, type)` helper (`fetchJSON` delegates to it), supporting HTTP URLs + local
  files through the DOM fetch shim, with no `async`/`await` in the v1 codepath. v1 mirrors
  native p5 v1 (returns `[]` shell synchronously, preload-counter-gated, native CR→split +
  chunked push); v2 mirrors native p5 v2 (`split(/\r?\n/)`). Resolves the "loadStrings() HTTP Support" gap.
- **v1 rejects async lifecycle hooks** — `preload`/`setup`/`draw` declared `async` throw
  `"async/await is not supported in p5.js v1 lifecycle hooks"`. Config-sourced hooks rejected
  synchronously in `_validateConfig()`; sketch-file-sourced hooks detected in `_initSketch()`
  (emit `"error"` + `stop()`). Uses non-invoking `isAsyncFunction` from `globals.js`. Resolves
  the former "async preload() Semantics (v1)" detection item. Covered by v1-only tests + fixture.
- **`loadImage()` canvas v3 fixes** — async decode wait + ArrayBuffer slice (shipped 1.2.2).
- **v1 `loadJSON()` real p5 v1 semantics** — returns data object synchronously; supports
  `loadJSON(path, callback, errorCallback)`; errors via `errorCallback` (not rejected promise).
- **v2 fidelity + dedup cleanup** — removed v1-normalizing `join()`/`split()`/`trim()` shims
  and the `loadTable()` TableRow patch; centralized `resolveAssetPath`/`resolveAssetUrl`/
  `splitLines` + standalone `fetchJSON`; extracted base helpers `_readTextLines`,
  `_syncCanvasGlobals`, `_preloadHandle`, `_readFont`, `_removeGraphics`, `_pixels`,
  `_letterbox`; `noop` moved to `globals.js`.
- **async/await contained to v2** — base/dom/v1 are async-keyword-free; `fetchJSON` is a
  standalone `.then()`-based loader; removed `_fetchJson` method and `_wrapSetup` wrapper;
  v1 keeps a sync setup wrapper; dom `_load` rewritten to `.then()` with sync-throw→`onError`.
- **`p5Version` config** — renamed from `p5Major`; adapter-forced (1/2); validated in base
  via `[1, 2].includes(this.p5Version)`; covered by tests (incl. rejection of 99/"2").
- **Asset-loading dedup (CLEANUP.md)** — URL/asset-path resolution single-sourced; shared
  `file://` response shim confirmed in dom; error semantics normalized (v2 loadJSON try/catch
  removed, v2 rejects, v1 falls through to errorCallback, preload counter always clears).
- **`noop` dedup** — single definition in `globals.js`, imported by base/adapters/dom.
- **`_propertySetter` reconciled** — base owns the readonly-prop swallow; adapters supply only
  the p5 instance.
- **v2 `loadImage()` returns Promise** — `await loadImage()` works in async `setup()`;
  legacy `onSuccess`/`onError` still fire.
- **Full async/await in v2** — `setup()` and `draw()` support async; v2 `_initDrawWrapper()`
  awaits async draw before emitting frames; preload tracking (`_pendingLoads`,
  `_preloadIncrement`/`_preloadDecrement`, `_waitForPreloads`) removed; v2 `preload` config rejected.
- **v2 WebGL shims (WEBGL_TASKS 1–6)** — canvas `parentElement` mirror + `insertBefore` on
  `detachedParent`/`document.body`; `getContext` intercept routing WebGL to `headless-gl`
  (returns null for `webgl2`); width/height `STACKGL_resize_drawingbuffer` resize; `window`
  Proxy forwarding shader hooks to `global`; `document.fonts` API; `toFrame()` `isP3D` read path.
- **Adapter selection (V2_SUPPORT.md)** — package-name convention via `P5B_P5_PATH`
  (`p5` → v1, `p5-v2` → v2); `_detectP5Version()` dropped by design; p5 moved to
  `peerDependencies` `^1.11.0 || ^2.0.0`; both shipped as `devDependencies`.
- **Tests & CI (V2_SUPPORT.md)** — `test:v1`, `test:v2`, `test:all`; CI `[v1, v2]` matrix;
  env-driven version detection; README compatibility table, `P5B_P5_PATH` docs, v2
  limitations, async `setup()` note.
- **Coverage HTML report** — `coverage:html` script (`scripts/coverage-report.js`) runs both
  suites, merges lcov, renders `coverage/html/index.html`; `coverage/` is gitignored.