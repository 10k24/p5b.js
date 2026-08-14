# p5.js v2.x Support Notes

## Status

p5b supports p5 v1.11.x and p5 v2.2.x via two adapters — `p5b_v1.js` and `p5b_v2.js`. Adapter selection is by package name via the `P5B_P5_PATH` env var ("p5" → v1, "p5-v2" → v2). v2 support is verified by `bun run test:v2` and the CI matrix.

---

## Breaking Changes (v1 → v2) Relevant to p5b

| API | v1 | v2 | p5b Impact | Status |
|-----|----|----|-----------|--------|
| `_incrementPreload()` / `_decrementPreload()` | Static methods on p5 | **Removed** | Critical — used in all 4 load* functions | Handled — v2 wrapper tracks `_pendingLoads` (`p5b_v2.js`) |
| Module format | CJS/UMD | ES Module | Requires updated require() logic | Handled — `require(pkg).default \|\| require(pkg)` |
| Addon registration | `p5.prototype.x = fn` | `p5.registerAddon()` | No direct p5b impact | — |
| File loading lifecycle | preload counter | native async/await | Requires conditional code path | Handled — p5b wraps user `preload()` inside an async setup shim; `_waitForPreloads()` blocks setup until loads settle |

## Still Compatible in v2

`_elements`, `isLooping()`, `windowWidth/Height`, `_loop`, `noLoop()`, `loop()`, `remove()`, `redraw()`, constructor signature `new p5(sketch, node)` — all confirmed present in v2.2.3.

---

## Adapter Selection (`p5b.js`)

Selection is a package-name convention, not version sniffing:

```js
const { P5b, P5B_DEFAULTS } = p5pkg === "p5-v2"
    ? require("./p5b_v2")
    : require("./p5b_v1");
```

The previously planned `_detectP5Version()` helper was dropped by design: reading the p5 major version would require either `require("${pkg}/package.json")` (blocked by p5 v2's `exports` map under Node) or loading the full p5 module at import time. Name mapping avoids both. Each wrapper's `_loadP5()` reads `P5B_P5_PATH` itself.

## Preload / Asset Loading

- **v2 wrapper** (`p5b_v2.js`): `_preloadIncrement()` / `_preloadDecrement()` maintain `_pendingLoads`; `_waitForPreloads()` polls until it drains (with a 10s timeout). The setup shim invokes the user `preload()` then awaits `_waitForPreloads()` before calling the user `setup()`.
- **v1 wrapper** (`p5b_v1.js`): uses p5 v1's native `_incrementPreload()` / `_decrementPreload()`.

No runtime `this._p5Major` branching was needed — each adapter is version-specific.

## Dependency Management

Done:

- `p5` moved from `dependencies` to `peerDependencies` (`"^1.11.0 || ^2.0.0"`).
- Both versions shipped as `devDependencies`: `p5` (^1.11.12) and `p5-v2` (`npm:p5@^2.0.0`).

## Tests

- Scripts: `test:v1`, `test:v2`, `test:all` (both, sequentially).
- CI (`.github/workflows/test.yml`) runs a `[v1, v2]` matrix.
- Tests detect the active version via `P5B_P5_PATH` (e.g. `isP5v2` in `test/integration/globals.test.js` and `integration.test.js`). The version-loop harness originally planned for `test/helpers/p5-versions.js` was not built — env-driven detection is simpler and was used instead.

## Docs

- README: compatibility table, `P5B_P5_PATH` documentation, v2 limitations list, and async `setup()` note. Done.

---

## Decisions

- No `p5Path` constructor option — `P5B_P5_PATH` env var only. (The constructor option originally planned for `_loadP5()` was intentionally dropped.)
- No CHANGELOG entry for v2 support.

## Remaining Work

- **Align `p5b_v2.js` naming with `p5b_v1.js`** — reconcile variable names and convenience-variable assignments in `p5b_v2.js` to match `p5b_v1.js` so the two adapters stay structurally parallel and diffs between them stay small. Investigate a static-analysis approach (e.g. a diff/structural-comparison script) to keep drift in check. **Do not modify `p5b_v1.js`.**
- p5b_v2.js: need async/await support in v2 API; only do this once all other work is addressed for v2

### Addressed (2026-08-12)

- `colorMode(HSB)` — was: p5 v2 serializes HSB colors as CSS Color 4 percentage `rgb()` (e.g. `rgb(100% 0% 0%)`), which node-canvas's color parser rejects (silently defaulting to transparent black). Now: p5b normalizes percentage `rgb()/rgba()` to numeric form in the node-canvas `fillStyle`/`strokeStyle` setters, matching what p5 v2 expects the browser canvas to accept. HSB `fill`/`stroke`/`background` now render identically to v1.
- `beginShape`/`endShape`/`vertex` — was: v2 renders custom shapes via `Path2D` (browser-only), which threw. Now: p5b polyfills `Path2D` and patches node-canvas's `CanvasRenderingContext2D` fill/stroke/clip to replay recorded path commands. Also unlocks `clip()`/`beginClip()`/`endClip()`. (The `Path2D` and color-normalization patches live in `p5b-dom.js`, installed only for p5 v2 via the `p5Major` option.)
- `join()`/`split()`/`trim()` globals — was: removed in p5 v2. Now: shimmed to v1 semantics in `_bindGlobals`.
- `loadTable()` + string column lookups — was: v2 `TableRow.get/getNum/getString` read `obj[columns.indexOf(column)]`, returning stale values after `set()`. Now: p5b patches `TableRow.prototype` to read `obj[column]` and seeds name-keyed entries in loaded rows.

---

## Verification Checklist

1. `bun run test:v1` — all tests pass against p5 v1
2. `bun run test:v2` — all tests pass against p5 v2
3. Manual: sketch using `loadImage` in `preload()` works under v1
4. Manual: sketch using `async setup()` with `await loadImage()` works under v2
5. `P5B_P5_PATH=p5-v2 bun test test/integration/sketches.test.js` passes

All items currently pass.
