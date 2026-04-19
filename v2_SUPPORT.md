# p5.js v2.x Support Notes

## Context

p5b.js currently targets p5 v1.11.x. p5.js v2 (v2.2.3) is a major architectural rewrite. This document captures the audit findings and implementation plan for backwards-compatible v2 support.

---

## Breaking Changes (v1 → v2) Relevant to p5b

| API | v1 | v2 | p5b Impact |
|-----|----|----|-----------|
| `_incrementPreload()` / `_decrementPreload()` | Static methods on p5 | **Removed** | Critical — used in all 4 load* functions |
| Module format | CJS/UMD | ES Module | Requires updated require() logic |
| Addon registration | `p5.prototype.x = fn` | `p5.registerAddon()` | No direct p5b impact |
| File loading lifecycle | preload counter | native async/await | Requires conditional code path |

## Still Compatible in v2

`_elements`, `isLooping()`, `windowWidth/Height`, `_loop`, `noLoop()`, `loop()`, `remove()`, `redraw()`, constructor signature `new p5(sketch, node)` — all confirmed present in v2.2.3.

---

## Implementation Plan

### 1. Dependency management — `package.json`

Move `p5` from `dependencies` to `peerDependencies`. Ship both versions as `devDependencies`.

```json
"peerDependencies": {
  "p5": ">=1.11.0 <3.0.0"
},
"peerDependenciesMeta": {
  "p5": { "optional": false }
},
"devDependencies": {
  "p5": "^1.11.12",
  "p5-v2": "npm:p5@^2.0.0"
}
```

Pattern: same approach used by React testing libraries, Storybook, and ESLint plugins that support multiple host versions.

### 2. Version detection — inside `p5b.js`

Add `_detectP5Version(p5)` helper after `_loadP5()` resolves:

```javascript
_detectP5Version(p5) {
    const ver = p5.VERSION || "0.0.0";
    const major = parseInt(ver.split(".")[0], 10);
    return major; // 1 or 2
}
```

Store result as `this._p5Major` on the P5b instance.

### 3. Preload adapter — replace `_incrementPreload` / `_decrementPreload`

In v2, sketches use `async setup()` instead of preload counter. Add adapter methods:

```javascript
_preloadIncrement() {
    if (this._p5Major < 2) {
        this._myP5._incrementPreload();
    } else {
        this._pendingLoads = (this._pendingLoads || 0) + 1;
    }
}

_preloadDecrement() {
    if (this._p5Major < 2) {
        this._myP5._decrementPreload();
    } else {
        this._pendingLoads = Math.max(0, (this._pendingLoads || 1) - 1);
    }
}
```

Replace all 8 direct callsites in `p5b.js`:
- `loadImage` (~lines 290, 304, 308)
- `loadJSON` (~lines 332-368)
- `loadStrings` (~lines 574, 584, 587)
- `loadTable` (~lines 597, 648, 651)

### 4. ESM import fix — `_loadP5()`

v2 ships as pure ESM. Add `P5B_P5_PATH` env var support and optional `p5Path` constructor option:

```javascript
_loadP5() {
    const pkg = process.env.P5B_P5_PATH || this._options.p5Path || "p5";
    return require(pkg).default || require(pkg);
}
```

Also check if p5 v2 ships a CJS build in `dist/` — if so, require it directly.

### 5. Dynamic test suite

**Pattern:** parameterized runner (used by Babel, ESLint, TypeScript for multi-version testing).

`test/helpers/p5-versions.js`:
```javascript
const versions = [
    { label: "p5 v1", pkg: "p5" },
    { label: "p5 v2", pkg: "p5-v2" },
];
module.exports = versions;
```

New npm scripts:
```json
"test:v1": "P5B_P5_PATH=p5 bun test",
"test:v2": "P5B_P5_PATH=p5-v2 bun test",
"test:all": "bun run test:v1 && bun run test:v2"
```

Wrap existing test files with a version loop using `P5B_P5_PATH` injection — no Bun module cache hacks needed.

### 6. README + CHANGELOG

- Remove "p5.js v2.x (unsupported/untested)" from unsupported list
- Add compatibility table: v1.9+, v2.x
- Document `P5B_P5_PATH` env var
- Note async `setup()` as preferred pattern for asset loading in v2

---

## Files to Modify

| File | Change |
|------|--------|
| `package.json` | peerDeps, devDeps for both versions, new test scripts |
| `p5b.js` | `_detectP5Version`, `_preloadIncrement/Decrement`, `_loadP5` env var support |
| `test/helpers/p5-versions.js` | New — version list |
| `test/p5b.test.js` | Version loop |
| `test/api-compat.test.js` | Version loop |
| `test/integration/*.test.js` | Version loop |
| `README.md` | Remove v2 from unsupported, add compat table |
| `CHANGELOG.md` | Document v2 support |

---

## Verification Checklist

1. `bun run test:v1` — all tests pass against p5 v1
2. `bun run test:v2` — all tests pass against p5 v2
3. Manual: sketch using `loadImage` in `preload()` works under v1
4. Manual: sketch using `async setup()` with `await loadImage()` works under v2
5. `P5B_P5_PATH=p5-v2 bun test test/integration/sketches.test.js` passes
