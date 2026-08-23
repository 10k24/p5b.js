// Stream p5.js sketch output to a ZMQ-based LED matrix broker.
//
// Requires the optional 'zeromq' dependency. Install with:
//   npm install --include=optional
//
// Usage:
//   node ex-p5b-zmq.js [host] [port]
//
// Defaults:
//   Host: localhost
//   Port: 60001
//
// Example:
//   node ex-p5b-zmq.js 192.168.1.100 5555
//
// The sketch draws an animated checkerboard pattern that scales from 400x400
// (draw resolution) to 32x32 (matrix size). Each frame is sent as a 4-byte RGBA
// buffer via ZMQ Request socket.
//
// Protocol:
//   - Sends: Uint8Array (32x32x4 bytes = 4096 bytes of RGBA pixel data)
//   - Receives: Single byte acknowledgment from broker
//   - Frame rate: 10 fps
//
// Press Ctrl+C to close the connection and exit.
const { P5b } = require("@10k24/p5b");
const { Request } = require("zeromq");
const { P5bZMQ } = require("../common/p5b-zmq");

const args = process.argv.slice(2);
const host = args[0] || "localhost";
const port = args[1] || "60001";

(async () => {
    const myP5b = new P5b({
        fps: 10,
        width: 32,
        height: 32,
        setup: () => {
            createCanvas(400, 400);
        },
        draw: () => {
            const squareSize = 50;
            for (let y = 0; y < 400; y += squareSize) {
                for (let x = 0; x < 400; x += squareSize) {
                    const isEven = ((x / squareSize) + (y / squareSize) + Math.floor(frameCount / 10)) % 2 === 0;
                    fill(isEven ? 255 : 0);
                    noStroke();
                    square(x, y, squareSize);
                }
            }
        }
    });

    const zmq = new P5bZMQ({ host, port, p: myP5b, Request });

    process.on("SIGINT", async () => {
        console.log("\nShutting down...");
        await zmq.disconnect();
        process.exit(0);
    });

    await zmq.connect();
})();
