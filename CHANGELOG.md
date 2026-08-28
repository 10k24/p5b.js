# Changelog

## [2.0.0-beta]

### Breaking Changes

- `p5` is now a **peer dependency**. If you wish to use multiple versions, install the p5.js version via an npm alias (`"p5-v2": "npm:p5@^2.0.0"`).
- `P5B_P5_PKG` names the p5.js package to load, defaulting to `p5`. The p5b implementation is auto-selected from the installed p5.js version.

### New Features

- **p5.js v2.x support** — async/await support in `setup()`/`draw()`; v1 still uses sync lifecycle.
- **Headless WebGL 1** (p5.js v2 via `headless-gl`) — shaders render headlessly. WebGL 2 is unsupported.
- p5.js v2 headless shims:
  - `Path2D` polyfill — custom shapes replay through node-canvas.
  - `colorMode(HSB)` CSS Color 4 string normalization.
- `loadBytes()`, `loadStrings()` / `loadJSON()` — load from HTTP URLs or local files.
- config changes:
    - `maxPoolSize` config — caps pooled `createGraphics` objects by dimension buckets (`0` disables pooling).
    - `preload` config is **rejected** under v2 (p5.js v2 removed the `preload()` lifecycle).

### Bug Fixes

- `loadXML()` throws a descriptive error as it is not implemented.

### Internal & Refactor

- Sources reorganized under `lib/`.
- Shared asset-loading helpers; `async`/`await` contained to the v2 p5b implementation.
- Generated docs + examples build pipeline (`build-docs` + `validate:docs`).

### Examples

- Restructured into `examples/v1`, `examples/v2`, `examples/common`.
- New sketch examples and a Kitty terminal renderer example.

## [1.2.2]

### Bug Fixes

- Fixed `loadImage()` failing due to canvas v3 async image decoding (`rawImg.onload` not awaited before `drawImage`)
- Fixed `loadImage()` passing entire Node.js memory pool buffer to canvas instead of exact file size

### Minor Changes

- Relax runtime requirement from Node.js v22 to v20

## [1.2.1]

### Bug Fixes

- Fixed `windowWidth`/`windowHeight` being undefined when accessed at top-level in `sketchPath` mode

### Examples

- Added terminal renderer CLI example (`ex-terminal-cli.js`)

## [1.2.0]

### Breaking Changes

- `stop()` now pauses the sketch (`noLoop()`); call `run()` to resume
- `remove()` / `clear()` fully tears down the p5.js instance and frees resources

### New Features

- `loadImage()` — local files and HTTP URLs, works in `preload` with `image()` in draw
- `loadJSON()` — local and remote JSON files
- `loadStrings()` — local text files as array of lines
- `loadTable()` — CSV/TSV/SSV files as `p5.Table` with optional header parsing
- `drawingContext` — direct Canvas 2D API access after `createCanvas()`
- Math constants and functions (`PI`, `TWO_PI`, `abs`, `sin`, `cos`, etc.) explicitly bound
- p5.js constants (`CORNER`, `CENTER`, `RGB`, `HSB`, blend modes, key codes, etc.) explicitly bound
- Accessibility, save, audio, and input event functions stubbed to prevent crashes

### Performance

- ~2× faster frame reads when sketch canvas dimensions match p5b output dimensions
- Fixed memory leak in `stop()`/`run()` cycles by reusing the sketch canvas

### Bug Fixes

- Fixed p5.js initialization crashes (`parentNode`, `mediaDevices`, `navigator`)
- `loadFont()` now throws a descriptive error on missing files
- WEBGL mode now throws a clear unsupported error instead of crashing

## [1.1.1]

- Fix unbounded memory leak when running sketches
- Replace the `jsdom` dependency with a minimal DOM stub

## [1.0.1]

New package name.

## [1.0.0]

Broken release
