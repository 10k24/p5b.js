# @10k24/p5b

Render p5.js sketches to RGBA pixel buffers in Node.js.

## p5.js Compatibility

| p5.js version | Status |
|---|---|
| v1.9+ | Fully supported |
| v2.x | Supported (see v2 notes below) |

**p5.js v2 headless shims** — p5b provides browser-API compatibility so p5 v2 runs headlessly:
- `Path2D` — p5 v2 renders custom shapes via the browser-only `Path2D`; p5b polyfills it and replays path commands through node-canvas
- `colorMode(HSB)` — p5 v2 emits CSS Color 4 percentage `rgb()` strings that node-canvas rejects; p5b normalizes them at the canvas boundary

**Unsupported in all versions:**
- video
- sound
- third party plugins or extensions

**WebGL:** v1 throws on `createCanvas(w, h, WEBGL)` by design. v2 supports WebGL 1 headlessly via `headless-gl` (WebGL 2 unsupported); shader sketches may leak memory.

## Installation

```bash
npm install @10k24/p5b
```

## Quick Start

**Inline mode** — define setup/draw callbacks directly:

<table>
<tr><th>v1</th><th>v2</th></tr>
<tr><td><pre><code class="language-javascript">const { P5b } = require("@10k24/p5b");

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

p5b.on("frame", (buffer) =&gt; {
    // Process frame buffer
});

p5b.run();</code></pre></td><td><pre><code class="language-javascript">const { P5b } = require("@10k24/p5b");

const p5b = new P5b({
    width: 400,
    height: 400,
    fps: 60,
    async setup() {
    // p5 setup code (async supported in v2)
    },
    draw() {
    // p5 draw code
    }
});

p5b.on("frame", (buffer) =&gt; {
    // Process frame buffer
});

p5b.run();</code></pre></td></tr>
</table>

**Sketch file mode** — load a `.js` sketch file (defines `setup`/`draw` as globals):

<table>
<tr><th>v1</th><th>v2</th></tr>
<tr><td><pre><code class="language-javascript">const { P5b } = require("@10k24/p5b");

const p5b = new P5b({
    width: 400,
    height: 400,
    fps: 60,
    sketchPath: "./my-sketch.js"
});

p5b.on("frame", (buffer) =&gt; {
    // Process frame buffer
});

p5b.run();</code></pre></td><td><pre><code class="language-javascript">const { P5b } = require("@10k24/p5b");

const p5b = new P5b({
    width: 400,
    height: 400,
    fps: 60,
    sketchPath: "./my-sketch.js"
});

p5b.on("frame", (buffer) =&gt; {
    // Process frame buffer
});

p5b.run();</code></pre></td></tr>
</table>

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
| `setup` | function | noop | p5.js setup() function |
| `draw` | function | noop | p5.js draw() function |
| `maxPoolSize` | number | 4 | Max pooled createGraphics objects retained per width:height bucket (0 = no pooling) |
| `preload` | function | noop | p5.js preload() function (v1 only — rejected in p5 v2) |

### Methods

#### `run()`

Start or resume sketch execution. On first call, initializes the p5 instance. After `stop()`, resumes the draw loop. Throws if called after `remove()`.

<table>
<tr><th>v1</th><th>v2</th></tr>
<tr><td><pre><code class="language-javascript">p5b.run();</code></pre></td><td><pre><code class="language-javascript">p5b.run();</code></pre></td></tr>
</table>

#### `stop()`

Pause sketch execution. The p5 instance and canvas are kept alive. Call `run()` to resume.

<table>
<tr><th>v1</th><th>v2</th></tr>
<tr><td><pre><code class="language-javascript">p5b.stop();</code></pre></td><td><pre><code class="language-javascript">p5b.stop();</code></pre></td></tr>
</table>

#### `remove()`

Fully tear down the p5 instance and free all resources. Calling `run()` after `remove()` throws.

<table>
<tr><th>v1</th><th>v2</th></tr>
<tr><td><pre><code class="language-javascript">p5b.remove(); // or p5b.clear()</code></pre></td><td><pre><code class="language-javascript">p5b.remove(); // or p5b.clear()</code></pre></td></tr>
</table>

`clear()` is an alias for `remove()`.

#### `toFrame()`

Get current canvas as a Uint8Array RGBA buffer.

<table>
<tr><th>v1</th><th>v2</th></tr>
<tr><td><pre><code class="language-javascript">const buffer = p5b.toFrame();
// buffer.length === width * height * 4</code></pre></td><td><pre><code class="language-javascript">const buffer = p5b.toFrame();
// buffer.length === width * height * 4</code></pre></td></tr>
</table>

Throws if canvas not initialized (call `run()` first).

#### `getMetrics()`

Get execution metrics.

<table>
<tr><th>v1</th><th>v2</th></tr>
<tr><td><pre><code class="language-javascript">const { framesDrawn, errors } = p5b.getMetrics();</code></pre></td><td><pre><code class="language-javascript">const { framesDrawn, errors } = p5b.getMetrics();</code></pre></td></tr>
</table>

Returns: `{ framesDrawn: number, errors: number }`

### Events

#### `'frame'` event

Emitted after each draw cycle with the rendered frame buffer.

<table>
<tr><th>v1</th><th>v2</th></tr>
<tr><td><pre><code class="language-javascript">p5b.on("frame", (buffer) =&gt; {
    // buffer is Uint8Array(width * height * 4)
    // RGBA format: [R0, G0, B0, A0, R1, G1, B1, A1, ...]
});</code></pre></td><td><pre><code class="language-javascript">p5b.on("frame", (buffer) =&gt; {
    // buffer is Uint8Array(width * height * 4)
    // RGBA format: [R0, G0, B0, A0, R1, G1, B1, A1, ...]
});</code></pre></td></tr>
</table>

#### `'error'` event

Emitted when an error occurs in preload, setup, or draw.

<table>
<tr><th>v1</th><th>v2</th></tr>
<tr><td><pre><code class="language-javascript">p5b.on("error", ({ phase, error }) =&gt; {
    console.error(`Error in ${phase}:`, error);
});</code></pre></td><td><pre><code class="language-javascript">p5b.on("error", ({ phase, error }) =&gt; {
    console.error(`Error in ${phase}:`, error);
});</code></pre></td></tr>
</table>

## Examples

Two example sets, one per supported p5.js version, plus shared utilities:

- [examples/v1/](examples/v1/) — p5.js 1.x examples
- [examples/v2/](examples/v2/) — p5.js 2.x examples (async/await, no `preload()`)
- [examples/common/](examples/common/) — shared utilities for both sets

### v1 — p5.js 1.x

- [examples/v1/ex-file-based.js](examples/v1/ex-file-based.js) — Loading sketch from file
- [examples/v1/ex-inline.js](examples/v1/ex-inline.js) — Using setup/draw callbacks
- [examples/v1/ex-p5b-zmq.js](examples/v1/ex-p5b-zmq.js) — Stream p5.js sketch output to a ZMQ-based LED matrix broker.
- [examples/v1/ex-terminal-cli.js](examples/v1/ex-terminal-cli.js) — Render a p5.js sketch in the terminal using truecolor ANSI half-block characters.

### v2 — p5.js 2.x

- [examples/v2/ex-file-based.js](examples/v2/ex-file-based.js) — Loading sketch from file
- [examples/v2/ex-inline.js](examples/v2/ex-inline.js) — Using setup/draw callbacks (async setup)
- [examples/v2/ex-p5b-zmq.js](examples/v2/ex-p5b-zmq.js) — Stream p5.js sketch output to a ZMQ-based LED matrix broker.
- [examples/v2/ex-terminal-cli.js](examples/v2/ex-terminal-cli.js) — Render a p5.js sketch in the terminal using truecolor ANSI half-block characters.

## Buffer Format

Frames are emitted as `Uint8Array` in RGBA format with automatic scaling to match `width` and `height` options.

```
[R0, G0, B0, A0, R1, G1, B1, A1, ..., Rn, Gn, Bn, An]
```

- Pixel at (x, y) starts at byte index: `(y * width + x) * 4`
- Buffer length: `width * height * 4` bytes
- Each component (R, G, B, A): 0–255

Example: read pixel at (x, y):

<table>
<tr><th>v1</th><th>v2</th></tr>
<tr><td><pre><code class="language-javascript">const x = 10, y = 20;
const idx = (y * width + x) * 4;
const [r, g, b, a] = buffer.slice(idx, idx + 4);</code></pre></td><td><pre><code class="language-javascript">const x = 10, y = 20;
const idx = (y * width + x) * 4;
const [r, g, b, a] = buffer.slice(idx, idx + 4);</code></pre></td></tr>
</table>

## Performance

- Default: 32×32 at 60 fps
- Frame rendering is synchronous (v1); p5 v2's async `draw()` is awaited before the frame is emitted
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

For streaming frames to external systems, see [examples/v1/ex-p5b-zmq.js](examples/v1/ex-p5b-zmq.js) for a ZeroMQ adapter reference.

## p5.js Version Selection

By default p5b loads whichever `p5` package is installed. Set `P5B_P5_PATH` to use a different package name:

```bash
P5B_P5_PATH=p5-v2 node my-sketch.js
```

**p5.js v2 async setup:** p5 v2 removed the `preload()` lifecycle. p5b **rejects** a `preload` config under v2 (the `preload` option is v1-only) — for v2 sketches, use `async setup()` directly:

```javascript
async function setup() {
    const img = await loadImage("photo.png");
    createCanvas(400, 400);
    image(img, 0, 0);
}
```

## Environment

**Node.js only.** p5b uses a custom headless DOM shim with native Node.js APIs and `canvas`. Browsers are not supported.

## Credits

Inspired by [p5.node](https://github.com/ericrav/p5.node).

## Author

Copyright © 2026 [10k24](https://10k24.com)
