// Using setup/draw callbacks
const { P5b } = require("../p5b.js");

const p5b = new P5b({
    width: 200,
    height: 200,
    fps: 60,
    setup() {
        createCanvas(200, 200);
        background(240);
    },
    draw() {
        fill(255, 0, 0);
        noStroke();
        ellipse(100, 100, frameCount % 100);
    }
});

p5b.on("frame", (buffer) => {
    console.log(`Frame: ${p5b.getMetrics().framesDrawn}`);
});

p5b.run();
