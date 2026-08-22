const { test } = require("node:test");
const assert = require("node:assert");
const path = require("path");
const { P5b } = require("../../p5b.js");

let glAvailable = true;
let glError = null;
try {
    require("gl");
} catch (e) {
    glAvailable = false;
    glError = e.message;
}

test("headless-gl loads under node", () => {
    assert.ok(glAvailable, `headless-gl not loadable: ${glError}`);
});

test("renders a WebGL sketch and emits frames without error", async () => {
    const sketchPath = path.resolve(process.cwd(), "test/fixtures/sketches/webgl-geometry.js");
    const p5b = new P5b({ width: 64, height: 64, fps: 30, sketchPath });

    const frames = await new Promise((resolve, reject) => {
        let count = 0;
        p5b.on("error", (e) => {
            p5b.remove();
            reject(e.error);
        });
        p5b.on("frame", () => {
            count++;
            if (count >= 5) {
                p5b.remove();
                resolve(count);
            }
        });
        p5b.run();
    });

    assert.ok(frames >= 5, `expected >= 5 frames, got ${frames}`);
});
