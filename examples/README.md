# P5b Examples

Examples demonstrating p5b usage with various backends and integrations.

## Setup

Each example has its own dependencies. Install them in this directory:

```bash
cd examples
bun install
```

## ZMQ LED Matrix Example

Streams p5.js sketch output to a ZMQ-based LED matrix broker.

**Usage:**

```bash
bun run zmq [host] [port]
```

**Default:**
- Host: `localhost`
- Port: `60001`

**Example:**

```bash
bun run zmq 192.168.1.100 5555
```

The sketch draws an animated checkerboard pattern that scales from 400x400 (draw resolution) to 32x32 (matrix size). Each frame is sent as a 4-byte RGBA buffer via ZMQ Request socket.

**Protocol:**
- Sends: `Uint8Array` (32×32×4 bytes = 4096 bytes of RGBA pixel data)
- Receives: Single byte acknowledgment from broker
- Frame rate: 10 fps

Press `Ctrl+C` to close the connection and exit.

## Terminal Renderer (CLI) Examples

Renders a p5.js sketch from a file in the terminal using truecolor ANSI half-block characters.

**Usage:**

```bash
node ex-terminal-cli.js <sketch-path>
```

**Example:**

```bash
node ex-terminal-cli.js sketch-rings.js
```

**Requirements:**
- Truecolor terminal (Ghostty, Kitty, iTerm2, WezTerm, etc.)
- A sketch file that defines `setup()` and `draw()` functions

**Included Sketch:** `sketch-rings.js` - Animated concentric rings pattern

Press `Ctrl+C` to exit.

## Kitty Terminal Example

Renders a p5.js sketch in the Kitty terminal using pixel-accurate graphics protocol.

**Usage:**

```bash
node ex-kitty-cli.js <sketch-path>
```

**Example:**

```bash
node ex-kitty-cli.js sketch-rings.js
```

**Requirements:**
- Kitty terminal (other terminals with Kitty graphics protocol support may work)
- Terminal must report pixel dimensions (not just character grid)
- `node-termios` package for getting terminal size

**Behavior:**
- Renders at 50% of terminal pixel resolution for performance
- Uses Kitty graphics protocol for true pixel-accurate output
- Frame rate: 60 fps

**Included Sketch:** `sketch-rings.js` - Animated concentric rings pattern

Press `Ctrl+C` to exit.
