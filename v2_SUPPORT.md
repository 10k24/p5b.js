# p5.js v2.x Support Notes

## Status

p5b supports p5 v1.11.x and p5 v2.2.x via two adapters — `p5b_v1.js` and `p5b_v2.js`. Adapter selection is by package name via the `P5B_P5_PATH` env var ("p5" → v1, "p5-v2" → v2). v2 support is verified by `bun run test:v2` and the CI matrix.

---

## Breaking Changes (v1 → v2) Relevant to p5b

| API | v1 | v2 | p5b Impact | Status |
|-----|----|----|-----------|--------|
| `_incrementPreload()` / `_decrementPreload()` | Static methods on p5 | **Removed** | Critical — used in all 4 load* functions | v2 uses native `async`/`await` instead |
| Module format | CJS/UMD | ES Module | Requires updated require() logic | Handled — `require(pkg).default \|\| require(pkg)` |
| Addon registration | `p5.prototype.x = fn` | `p5.registerAddon()` | No direct p5b impact | — |
| File loading lifecycle | preload counter | native async/await | Requires conditional code path | v2 uses native `async`/`await` — `preload` is **v1-only** |

## Still Compatible in v2

`_elements`, `isLooping()`, `windowWidth/Height`, `_loop`, `noLoop()`, `loop()`, `remove()`, `redraw()`, constructor signature `new p5(sketch, node)` — all confirmed present in v2.2.3.

---

## Adapter Selection (`p5b.js`)

Selection is a package-name convention, not version sniffing:

```js
const { P5b, P5B_DEFAULTS } = p5pkg.startsWith("p5-v2")
    ? require("./p5b_v2")
    : require("./p5b_v1");
```

The previously planned `_detectP5Version()` helper was dropped by design: reading the p5 major version would require either `require("${pkg}/package.json")` (blocked by p5 v2's `exports` map under Node) or loading the full p5 module at import time. Name mapping avoids both. Each wrapper's `_loadP5()` reads `P5B_P5_PATH` itself.

## Preload / Asset Loading

- **v2 wrapper** (`p5b_v2.js`): No preload tracking. v2 sketches use `await` in `async setup()` to load assets. `preload` is **v1-only**: `_validateConfig()` rejects any `preload` config (p5 v2 removed the lifecycle).
- **v1 wrapper** (`p5b_v1.js`): uses p5 v1's native `_incrementPreload()` / `_decrementPreload()`.

No runtime `this._p5Version` branching was needed — each adapter is version-specific.

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

None currently.

### Addressed (2026-08-19)

- **v2 `loadImage()` returns Promise** — `loadImage()` now returns a `Promise<p5.Image>` so `await loadImage()` works in async `setup()`. Legacy `onSuccess`/`onError` callbacks still fire. v1 loadImage unchanged (sync, preload-based).
- **Full async/await support in v2** — Both `setup()` and `draw()` support `async` functions. The v2 adapter overrides `_initDrawWrapper()` to detect async draw and await it before emitting frames. Preload tracking (`_pendingLoads`, `_preloadIncrement`/`_preloadDecrement`, `_waitForPreloads`) removed — v2 sketches use `await` in `async setup()` instead.

---

## Verification Checklist

1. `bun run test:v1` — all tests pass against p5 v1
2. `bun run test:v2` — all tests pass against p5 v2
3. Manual: sketch using `loadImage` in `preload()` works under v1
4. Manual: `preload` config throws under v2 ("preload is not supported in p5.js v2")
5. Manual: sketch using `async setup()` with `await loadImage()` works under v2
6. `P5B_P5_PATH=p5-v2 bun test test/integration/sketches.test.js` passes

All items currently pass.
