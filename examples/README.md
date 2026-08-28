# P5b Examples

Example p5b sketches for p5.js 1.x (`v1/`) and p5.js 2.x (`v2/`).

## Layout

- `v1/` — examples for p5.js 1.x
- `v2/` — the same examples for p5.js 2.x (async/await, no `preload()`)
- `common/` — shared utilities used by both example sets

## Setup

Each version directory is self-contained. Install its dependencies and run from that
directory:

```bash
cd v1 && bun install   # p5.js 1.x
cd v2 && bun install   # p5.js 2.x
```

`zeromq` is an **optional** dependency of each version set — only `ex-p5b-zmq.js` needs it.
If it wasn't installed, run `npm install --include=optional` in the relevant directory.

## v1 — p5.js 1.x

- `ex-file-based.js` — Load a p5.js sketch from a .js file
- `ex-inline.js` — Inline setup()/draw() callbacks
- `ex-kitty-cli.js` — Render a p5.js sketch in the Kitty terminal (Kitty graphics protocol), with pixel resolution.
- `ex-p5b-zmq.js` — Stream frames over ZeroMQ
- `ex-terminal-cli.js` — Render a p5.js sketch in the terminal (truecolor ANSI half-blocks)

Sketches:

- `sketch-basic.js` — Red rectangle on a gray canvas
- `sketch-color.js` — Color modes (HSB) and lerpColor()
- `sketch-curves.js` — Curves (bezier(), curve())
- `sketch-noise.js` — Generative noise()/random() field
- `sketch-primitives.js` — Drawing primitives (triangle(), quad(), arc(), line(), point(), rect(), ellipse())
- `sketch-rings.js` — Animated concentric rings
- `sketch-text.js` — Text rendering (text(), textSize(), textAlign(), textStyle(), textWidth())
- `sketch-transform.js` — Transformations (push()/pop(), translate(), rotate())

## v2 — p5.js 2.x

- `ex-file-based.js` — Load a p5.js sketch from a .js file
- `ex-inline.js` — Inline callbacks with async setup()
- `ex-kitty-cli.js` — Render a p5.js sketch in the Kitty terminal (Kitty graphics protocol), with pixel resolution.
- `ex-p5b-zmq.js` — Stream frames over ZeroMQ
- `ex-terminal-cli.js` — Render a p5.js sketch in the terminal (truecolor ANSI half-blocks)

Sketches:

- `sketch-basic.js` — Red rectangle on a gray canvas
- `sketch-color.js` — Color modes (HSB) and lerpColor()
- `sketch-curves.js` — Curves (bezier(), spline() — p5.js v2 renamed curve() to spline())
- `sketch-noise.js` — Generative noise()/random() field
- `sketch-primitives.js` — Drawing primitives (triangle(), quad(), arc(), line(), point(), rect(), ellipse())
- `sketch-rings.js` — Animated concentric rings
- `sketch-text.js` — Text rendering (text(), textSize(), textAlign(), textStyle(), textWidth())
- `sketch-transform.js` — Transformations (push()/pop(), translate(), rotate())
- `sketch-world.js` — WebGL shader globe
