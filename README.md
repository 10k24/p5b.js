# @10k24/p5b

[![npm](https://img.shields.io/npm/v/@10k24/p5b)](https://www.npmjs.com/package/@10k24/p5b)

Render p5.js sketches to RGBA pixel buffers in Node.js.

NOTE: several features are untested or unsupported, including the following:
- p5.js v2.x
- webgl
- shaders
- video
- sound
- third party plugins or extensions

## Installation

```bash
npm install @10k24/p5b
```

## Quick Start

**Inline mode** — define setup/draw callbacks directly:

```javascript
const { P5b } = require("@10k24/p5b");

const p5b = new P5b({
    width: 400,
    height: 400,
    fps: 60,
    setup() {
    // p5 setup code
    },
    draw() {
    // p5 draw code
    }
});

p5b.on("frame", (buffer) => {
    // Process frame buffer
});

p5b.run();
```

**Sketch file mode** — load a `.js` sketch file (defines `setup`/`draw` as globals):

```javascript
const { P5b } = require("@10k24/p5b");

const p5b = new P5b({
    width: 400,
    height: 400,
    fps: 60,
    sketchPath: "./my-sketch.js"
});

p5b.on("frame", (buffer) => {
    // Process frame buffer
});

p5b.run();
```

## API

### Constructor

`new P5b(options)`

Creates a new P5b instance with the given options.

#### Options

| Key | Type | Default | Description |
| --- | --- | --- | --- |
| `sketchPath` | string | null | Path to sketch file, omit preload, setup, & draw parameters if using |
| `width` | number | 32 | Canvas width in pixels |
| `height` | number | 32 | Canvas height in pixels |
| `fps` | number | 60 | Target frame rate |
| `preload` | function | noop | p5.js preload() function |
| `setup` | function | noop | p5.js setup() function |
| `draw` | function | noop | p5.js draw() function |

### Methods

#### `run()`

Start or resume sketch execution. On first call, initializes the p5 instance. After `stop()`, resumes the draw loop. Throws if called after `remove()`.

```javascript
p5b.run();
```

#### `stop()`

Pause sketch execution. The p5 instance and canvas are kept alive. Call `run()` to resume.

```javascript
p5b.stop();
```

#### `remove()`

Fully tear down the p5 instance and free all resources. Calling `run()` after `remove()` throws.

```javascript
p5b.remove(); // or p5b.clear()
```

`clear()` is an alias for `remove()`.

#### `toFrame()`

Get current canvas as a Uint8Array RGBA buffer.

```javascript
const buffer = p5b.toFrame();
// buffer.length === width * height * 4
```

Throws if canvas not initialized (call `run()` first).

#### `getMetrics()`

Get execution metrics.

```javascript
const { framesDrawn, errors } = p5b.getMetrics();
```

Returns: `{ framesDrawn: number, errors: number }`

### Events

#### `'frame'` event

Emitted after each draw cycle with the rendered frame buffer.

```javascript
p5b.on("frame", (buffer) => {
    // buffer is Uint8Array(width * height * 4)
    // RGBA format: [R0, G0, B0, A0, R1, G1, B1, A1, ...]
});
```

#### `'error'` event

Emitted when an error occurs in preload, setup, or draw.

```javascript
p5b.on("error", ({ phase, error }) => {
    console.error(`Error in ${phase}:`, error);
});
```

## Examples

See [examples/](examples/) for runnable examples:

- [examples/ex-file-based.js](examples/ex-file-based.js) — Loading sketch from file
- [examples/ex-inline.js](examples/ex-inline.js) — Using setup/draw callbacks
- [examples/ex-kitty-cli.js](examples/ex-kitty-cli.js) — Render a p5.js sketch in the Kitty terminal at pixel resolution.
- [examples/ex-p5b-zmq.js](examples/ex-p5b-zmq.js) — ZeroMQ frame transport
- [examples/ex-terminal-cli.js](examples/ex-terminal-cli.js) — Render a p5.js sketch in the terminal using truecolor ANSI half-block characters.


## Buffer Format

Frames are emitted as `Uint8Array` in RGBA format with automatic scaling to match `width` and `height` options.

```
[R0, G0, B0, A0, R1, G1, B1, A1, ..., Rn, Gn, Bn, An]
```

- Pixel at (x, y) starts at byte index: `(y * width + x) * 4`
- Buffer length: `width * height * 4` bytes
- Each component (R, G, B, A): 0–255

Example: read pixel at (x, y):

```javascript
const x = 10, y = 20;
const idx = (y * width + x) * 4;
const [r, g, b, a] = buffer.slice(idx, idx + 4);
```

## Performance

- Default: 32×32 at 60 fps
- Frame rendering is synchronous
- For high-res or intensive sketches, consider:
  - Reducing `fps`
  - Reducing `width` / `height`
  - Optimizing `draw()` logic

### Happy Path Optimization

When your sketch calls `createCanvas(w, h)` with dimensions that exactly match the p5b `width` and `height` config, p5b reads pixels directly from the canvas without any resizing step. This is ~2× faster per frame.

```javascript
// Fast: canvas matches p5b output dimensions — no resize
const p5b = new P5b({ width: 512, height: 512, ... });
// In sketch: createCanvas(512, 512)

// Slower: canvas is larger than p5b output — resized every frame
const p5b = new P5b({ width: 256, height: 256, ... });
// In sketch: createCanvas(512, 512)
```

### Browser Preview (p5.js Web Editor)

p5b sets `navigator.userAgent` to `"p5b-dom/<version>"` so sketches can detect the headless environment. Use this to scale up the canvas for a readable preview when running in the browser, while keeping the output dimensions small for p5b:

```javascript
function setup() {
  createCanvas(64, 64);
  if (!navigator.userAgent.includes('p5b')) {
    resizeCanvas(
      floor(min(windowWidth, windowHeight) / width) * width,
      floor(min(windowWidth, windowHeight) / height) * height
    );
  }
}
```

This scales the canvas to the largest integer multiple that fits the window — no CSS, no interpolation artifacts.

## Transport Layer

For streaming frames to external systems, see [examples/ex-p5b-zmq.js](examples/ex-p5b-zmq.js) for a ZeroMQ adapter reference.

## Environment

**Node.js only.** p5b uses a custom headless DOM shim with native Node.js APIs and `canvas`. Browsers are not supported.

## Credits

Inspired by [p5.node](https://github.com/ericrav/p5.node).

## Author

Copyright © 2026 [10k24](https://10k24.com)
