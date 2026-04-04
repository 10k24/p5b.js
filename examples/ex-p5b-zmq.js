const { P5b } = require("../p5b");
const { P5bZMQ } = require("./lib/p5b-zmq");

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

    const zmq = new P5bZMQ({ host, port, p: myP5b });
    
    process.on("SIGINT", async () => {
        console.log("\nShutting down...");
        await zmq.disconnect();
        process.exit(0);
    });
    
    await zmq.connect();
})();