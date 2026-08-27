// Loading sketch from file
const path = require("path");
const { P5b } = require("@10k24/p5b");

const p5b = new P5b({
    width: 200,
    height: 200,
    fps: 60,
    sketchPath: path.join(__dirname, "sketch-basic.js")
});

p5b.on("frame", (buffer) => {
    console.log(`Rendered ${buffer.length} bytes`);
});

p5b.on("error", (err) => {
    console.error("Sketch error:", err);
});

p5b.run();
