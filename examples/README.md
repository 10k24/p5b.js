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

## Notes

- Examples require dependencies installed separately and do NOT affect the core p5b library installation
- Each example is self-contained and can be run independently
