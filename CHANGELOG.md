# Changelog

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
- `remove()` / `clear()` fully tears down the p5 instance and frees resources

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
