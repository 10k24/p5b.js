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

const CASES = [
    {
        name: "custom toon shader (loadShader + shader()/resetShader + lit primitives)",
        file: "webgl-toon.js",
        width: 128,
        height: 128,
        minLitFraction: 0.05,
    },
    {
        name: "geometry lit (3D primitives + all light/material types)",
        file: "webgl-geometry-lit.js",
        width: 200,
        height: 240,
        minLitFraction: 0.1,
    },
];

function runSketch(file, width, height, minLitFraction) {
    return new Promise((resolve, reject) => {
        const sketchPath = path.resolve(process.cwd(), `test/fixtures/sketches/${file}`);
        const p5b = new P5b({ width, height, fps: 30, sketchPath });

        const counts = [];
        p5b.on("error", (e) => {
            p5b.remove();
            reject(e.error);
        });
        p5b.on("frame", (buf) => {
            let lit = 0;
            for (let i = 0; i < buf.length; i += 4) {
                if (buf[i] > 8 || buf[i + 1] > 8 || buf[i + 2] > 8) lit++;
            }
            counts.push(lit / (buf.length / 4));
            if (counts.length >= 5) {
                p5b.remove();
                resolve(counts);
            }
        });
        p5b.run();
    });
}

test("headless-gl loads under node", () => {
    assert.ok(glAvailable, `headless-gl not loadable: ${glError}`);
});

for (const c of CASES) {
    test(c.name, async () => {
        const litFractions = await runSketch(c.file, c.width, c.height, c.minLitFraction);
        assert.ok(litFractions.length >= 5, `expected >=5 frames, got ${litFractions.length}`);
        const median = [...litFractions].sort((a, b) => a - b)[Math.floor(litFractions.length / 2)];
        assert.ok(
            median >= c.minLitFraction,
            `median lit-pixel fraction ${median.toFixed(3)} below threshold ${c.minLitFraction}`
        );
    });
}
