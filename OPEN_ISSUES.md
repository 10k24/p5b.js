# Open Issues - p5b.js

## Priority 0 - do this before v2 beta release

**8. Adapter-selection convention is inconsistent across runtime and tests**
`p5b.js` and the tests decide "is this p5 v1 or v2?" with different rules on the same
`P5B_P5_PATH` env var, so they can disagree. `p5b.js` uses `P5B_P5_PATH.startsWith("p5-v2")`
(unknown names default to v1); every test uses `isP5v2 = (P5B_P5_PATH || "p5") !== "p5"`
(unknown names default to v2). They agree only for the shipped values (`p5` → v1,
`p5-v2` → v2). Any non-`"p5"`, non-`"p5-v2"*` value (e.g. `p5-next`, `@scope/p5-v2`,
`p5@2.x`) makes the runtime load the **v1 adapter** while the test harness runs in **v2 mode** —
silently running the wrong adapter against the wrong p5 version. **Fix:** add a single source
of truth, e.g. `isP5v2(env)` in `lib/globals.js`, and use it in `p5b.js` and every test.
Canonical rule: `P5B_P5_PATH && P5B_P5_PATH !== "p5"` → v2 (`_loadP5()` already `require`s
whatever name is set). **Update Accordingly:** `p5b.js`, `p5b.mjs` (if it branches on version),
and every `isP5v2` in `test/**`. Verify `test:v1` + `test:v2` pass.

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

### API Gap Inventory (p5.js vs p5b)
`_bindGlobals()` walks the p5 instance prototype chain and binds every function to global,
so the surface is gated by what p5b noops, and by functions that bind but need a browser
API absent headless. Categorized gaps:

**1. Explicitly noop'd — present but silently swallow calls (`lib/p5b-base.js`):**
- Accessibility: `describe`, `describeElement`, `textOutput`, `gridOutput`
- Save/export: `saveCanvas`, `saveFrames`, `saveJSON`, `saveStrings`, `saveTable`, `saveImage`, `save`
- Input handlers (no headless input): `mousePressed`, `mouseReleased`, `mouseMoved`,
  `mouseDragged`, `mouseWheel`, `keyPressed`, `keyReleased`, `touchStarted`, `touchEnded`,
  `touchMoved`
- Cursor: `cursor`, `noCursor`
- Audio (p5.sound): `loadSound`, `loadAudio`, `createAudio`, `getAudioContext`,
  `userStartAudio`, `soundFormats`
- Input/accel state forced to zero: `mouseX/Y`, `pmouseX/Y`, `key`, `keyCode`,
  `accelerationX/Y/Z`

**2. Bind via prototype walk but fail/misbehave headless (no explicit handling):**
- DOM creation (unverified): `createButton`, `createCheckbox`, `createRadio`, `createSlider`,
  `createColorPicker`, `createInput`, `createFileInput`, `createSelect`, `createDiv`,
  `createP`, `createSpan`, `createImg`, `createA`, `createVideo`, `createCapture`,
  `createTextarea` — should use the DOM shim's tracked elements; behavior untested.
- `select()`, `selectAll()`, `removeElements()` — not implemented (item above).
- `loadXML()` — now throws a helpful error (`"loadXML() is not supported in p5b..."`); full
  support still needs a `DOMParser` shim (see Priority 3).
- `fullscreen()`, `pixelDensity()` — bind, but fullscreen needs real DOM; pixelDensity
  partially works.
- `loadFont()` — documented sync/async inconsistency vs browser callback+preload pattern
  (accepted tradeoff).

**3. WebGL (version-dependent):**
- v1: `createCanvas(..., WEBGL)` **throws by design**; `loadShader`/`loadModel` bound but unusable.
- v2: WebGL 1 works via headless-gl; WebGL 2 unsupported (headless-gl is WebGL-1 only).

**4. Known-unsupported by design (browser APIs):** sound, video/capture
(`createCapture`, `createVideo`).

**5. Curves / vertices (version-dependent):**
- v2 renamed the 2D curve API: `curve()`→`spline()`, `curveVertex()`→`splineVertex()`,
  `curvePoint()`→`splinePoint()`; `quadraticVertex()` no longer exists in v2.
- v2 `bezierVertex()` **fails** inside p5's own shape visitor (`custom_shapes.js
  visitBezierSegment` throws `TypeError: undefined is not an object (evaluating 'v2.position')`),
  so it cannot render headlessly. v1 `bezierVertex()` works. Standalone `bezier()` works in both
  (and exercises the v2 Path2D bezier replay).

**Dominant gap category:** browser-DOM-dependent APIs — intentional headless noops (input,
sound, save) plus the actionable items: `select`/`selectAll`/`removeElements` and the
DOM-function audit.

> Accepted tradeoff (not a task): `loadFont()` is synchronous (blocking file I/O) while
> `loadJSON()` is async. Known inconsistency vs browser p5.js where both share the
> callback/preload pattern.

**6. p5.js Strands support**
- Add an example for using p5 strands, only supported in v2.x. This is a new way of writing shader code with JS directly. Reference examples in the p5.js repo.

**7. Add save* support**
- In headless environments it may desirable to run saveImage(), saveJSON(), etc. 

---

## Priority 3 — Lower Priority / Future Work

### Global Alpha Override
Add an `alpha` property to P5b config (integer in [0, 255]) to apply constant opacity to
every emitted frame. **Fix:** scale the RGBA frame buffer alpha channel by `alpha / 255`
in `toFrame()`. Keep the scaling logic **inlined** in each adapter's `toFrame()` (no shared
helper). Held for now; target 2.0.0+.

### loadXML() (full support — bandaged for now)
`loadXML()` is not implemented. As a bandage, both adapters now throw a helpful error
(`"loadXML() is not supported in p5b: XML parsing requires the browser-only DOMParser API..."`)
instead of the earlier cryptic `"loadXML is not defined"`; covered by an integration test using
an inline `setup()` calling `loadXML()`. Full support is blocked on a browser-only dependency: both p5 v1
(`httpDo(..., 'xml')`) and p5 v2 (`new DOMParser().parseFromString(...)`) parse XML via the
`DOMParser` global, which Node doesn't provide. Faithful support needs a `DOMParser` shim or
third-party XML→DOM parser, plus the `p5.XML` wrapper API (children/attributes traversal).
Same class of browser-API gap as sound/video. Would also conflict with p5b's minimal-dependency
philosophy.

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
kept** (needed to run p5-v2 WebGL under node — see Completed Items). Inert under bun.

### Manual review of README content (via the template)
`README.md` is generated by `npm run docs` from `templates/README.dot` (plus the v1/v2 stub
files and the compiled examples manifests), so it's not covered by unit tests. Requires a
manual human review of the generated prose for accuracy, tone, and completeness before a
release — including the compatibility claims (e.g. the `v1.9+` cutoff), the WebGL caveat, the
async-setup guidance, and the example descriptions. Review the template, not just the output.

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
- **v1:** `createCanvas(w, h, WEBGL)` throws by design (`lib/p5b_v1.js`).
- **v2:** WebGL 1 works headlessly via `headless-gl` (context intercept in `lib/p5b-dom.js`;
  `isP3D` read path in `toFrame()`). WebGL 2 unsupported (headless-gl is WebGL 1 only).
  Caveat: shader sketches can leak memory — see Completed Items.

---

# Completed Items

- **load\* binding de-dup (Option A)** — moved the byte-identical bindings
  (`createGraphics`, `loadShader`, `loadModel`, `loadXML`) from `p5b_v1.js`/`p5b_v2.js` into
  the shared `P5bBase._bindGlobals()`. Version-divergent loaders (`loadFont`, `loadImage`,
  `loadJSON`, `loadStrings`, `loadBytes`, `loadTable`, `createCanvas`, `loadBlob`) stay in
  their adapters — v1 uses sync shells + `_preloadHandle()`, v2 uses async promises, so forcing
  them together would create a shallow module full of version branches (Special-General
  Mixture). v2-only `loadBlob` retained in `p5b_v2.js`.
- **True p5 v1 floor verified = 1.6.0** — binary-searched p5 1.x against the v1 suite. The only
  sub-1.6 failure is `getTargetFrameRate()` (a p5 API added in v1.6.0); 1.6.0 passes the full
  v1 suite (237/0). `peerDependencies` lowered from `^1.11.0` to `^1.6.0`; README compatibility
  table and the examples/v1 manifest floor aligned.
- **`save()` noop** — added plain `save()` to the headless noop list in `lib/p5b-base.js` (was
  binding and attempting a DOM download). Corrected the stale OPEN_ISSUES note accordingly.
- **lib directory refactor** — moved `globals.js`, `p5b-base.js`, `p5b_v1.js`, `p5b_v2.js`,
  `p5b-dom.js` under `lib/` (only `p5b.js`/`p5b.mjs` remain in root; `eslint.config.js` stays).
  Updated all require/import paths (`p5b.js`, `eslint.config.js`, `test/p5b.test.js`,
  `scripts/compare-adapters.js`; fixed `lib/p5b-dom.js` package.json require). `package.json`
  `files` now ships `lib/*` incl. the previously-missing `lib/globals.js`. Verified: lint clean,
  bun v1/v2 suites, node webgl, `npm pack` dry-run, full `act .`.
- **WebGL memleak investigated & resolved (node)** — **no reproducible leak** in the current
  architecture. Measured via `scripts/gl-diag.js` (forced GC, RSS + live GL-object counts)
  under node + headless-gl + p5-v2 across 600 frames: box (~7MB, flat), geometry stress
  (~12MB, flat GL counts), and scale path (pre/post-cache, ~4–11MB, no growth) all plateau;
  `loadPixels`/`readPixelsWebGL` reuse the pixels buffer, `createGraphics` is pooled, geometry
  is bounded. The ">600MB" figure predates the split architecture and is not reproducible.
  `toFrame()` caches the read-back canvas (`_glReadCanvas`, recreated only on size change,
  cleared on `remove()`) as a cleanup/optimization. **Fix criteria met:** RSS stable across
  100+ frames of a WEBGL sketch, confirmed for box, geometry, and scale paths. Added
  `test/webgl.test.js` (gl-gated) + `webgl-box.js`/`webgl-geometry.js` fixtures + gifenc patch
  (node p5-v2 load).
- **Environment constraint (WebGL):** headless-gl is a native addon compiled for the Node ABI
  (NODE_MODULE_VERSION 127); bun requires 137, so it cannot load under bun — WebGL requires
  plain `node`. The `bun test` suite can't exercise it; `test/webgl.test.js` gates WebGL tests
  on gl availability (run under node, skip under bun). Diagnostic tooling: `scripts/gl-diag.js`
  (`P5B_P5_PATH=p5-v2 node --expose-gc scripts/gl-diag.js [sketch] [frames] [every] [outW] [outH]`).
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
  (emit `"error"` + `stop()`). Uses non-invoking `isAsyncFunction` from `lib/globals.js`. Resolves
  the former "async preload() Semantics (v1)" detection item. Covered by v1-only tests + fixture.
- **`loadImage()` canvas v3 fixes** — async decode wait + ArrayBuffer slice (shipped 1.2.2).
- **v1 `loadJSON()` real p5 v1 semantics** — returns data object synchronously; supports
  `loadJSON(path, callback, errorCallback)`; errors via `errorCallback` (not rejected promise).
- **v2 fidelity + dedup cleanup** — removed v1-normalizing `join()`/`split()`/`trim()` shims
  and the `loadTable()` TableRow patch; centralized `resolveAssetPath`/`resolveAssetUrl`/
  `splitLines` + standalone `fetchJSON`; extracted base helpers `_readTextLines`,
  `_syncCanvasGlobals`, `_preloadHandle`, `_readFont`, `_removeGraphics`, `_pixels`,
  `_letterbox`; `noop` moved to `lib/globals.js`.
- **async/await contained to v2** — base/dom/v1 are async-keyword-free; `fetchJSON` is a
  standalone `.then()`-based loader; removed `_fetchJson` method and `_wrapSetup` wrapper;
  v1 keeps a sync setup wrapper; dom `_load` rewritten to `.then()` with sync-throw→`onError`.
- **`p5Version` config** — renamed from `p5Major`; adapter-forced (1/2); validated in base
  via `[1, 2].includes(this.p5Version)`; covered by tests (incl. rejection of 99/"2").
- **Asset-loading dedup (CLEANUP.md)** — URL/asset-path resolution single-sourced; shared
  `file://` response shim confirmed in dom; error semantics normalized (v2 loadJSON try/catch
  removed, v2 rejects, v1 falls through to errorCallback, preload counter always clears).
- **`noop` dedup** — single definition in `lib/globals.js`, imported by base/adapters/dom.
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