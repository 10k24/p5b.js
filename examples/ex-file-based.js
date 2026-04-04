// Loading sketch from file
const { P5b } = require("../p5b.js");

const p5b = new P5b({
    width: 200,
    height: 200,
    fps: 60,
    sketchPath: "./examples/sketch.js"
});

p5b.on("frame", (buffer) => {
    console.log(`Rendered ${buffer.length} bytes`);
});

p5b.on("error", (err) => {
    console.error("Sketch error:", err);
});

p5b.run();
