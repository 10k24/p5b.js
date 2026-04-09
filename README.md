# @10k24/p5b

Render p5.js sketches to RGBA pixel buffers in Node.js.

NOTE: several features are untested or unsupported, including the following:
- p5.js v2.x
- webgl
- shaders
- images
- video
- sound
- third party plugins or extensions

## Installation

```bash
npm install @10k24/p5b
```

## Quick Start

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

Start sketch execution and begin rendering frames.

```javascript
p5b.run();
```

Throws if already running.

#### `stop()`

Stop sketch execution and clean up resources.

```javascript
p5b.stop();
```

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
- [examples/ex-p5b-zmq.js](examples/ex-p5b-zmq.js) — ZeroMQ frame transport


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

## Transport Layer

For streaming frames to external systems, see [examples/ex-p5b-zmq.js](examples/ex-p5b-zmq.js) for a ZeroMQ adapter reference.

## Environment

**Node.js only.** p5b uses a custom headless DOM shim with native Node.js APIs and `canvas`. Browsers are not supported.

## Credits

Inspired by [p5.node](https://github.com/ericrav/p5.node).

## Author

Copyright © 2026 [10k24](https://10k24.com)
