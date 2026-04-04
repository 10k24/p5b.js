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
