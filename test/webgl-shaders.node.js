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

// Read the renderer's isP3D flag (white-box, matching toFrame()'s Boolean(isP3D))
// for a real sketch after its first frame.
function getIsP3D(file, width, height) {
    return new Promise((resolve, reject) => {
        const sketchPath = path.resolve(process.cwd(), `test/fixtures/sketches/${file}`);
        const p5b = new P5b({ width, height, fps: 30, sketchPath });

        p5b.on("error", (e) => {
            p5b.remove();
            reject(e.error);
        });
        p5b.on("frame", () => {
            const isP3D = Boolean(p5b._myP5?._renderer?.isP3D);
            p5b.remove();
            resolve(isP3D);
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

test("isP3D is true for a WEBGL sketch (3D renderer)", async () => {
    const isP3D = await getIsP3D("webgl-box.js", 64, 64);
    assert.strictEqual(isP3D, true, "WEBGL sketch should report a P3D renderer");
});

test("isP3D is false for a 2D sketch (2D renderer)", async () => {
    const isP3D = await getIsP3D("shapes.js", 128, 128);
    assert.strictEqual(isP3D, false, "2D sketch should not report a P3D renderer");
});
