/* eslint-disable no-console */
/**
 * WebGL / headless-gl tests.
 *
 * headless-gl is a native addon compiled for the Node ABI; it does NOT load under bun
 * (different NODE_MODULE_VERSION), so these tests are gated on gl availability. They run
 * under plain node (where headless-gl works and p5-v2 loads) and skip cleanly under bun.
 * WebGL is v2-only — the v1 adapter throws on createCanvas(..., WEBGL) by design.
 */

const { describe, it } = require("bun:test");
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

const isP5v2 = (process.env.P5B_P5_PATH || "p5") !== "p5";

describe("WebGL / headless-gl", () => {
    if (!glAvailable) {
        it("skips: headless-gl not loadable in this runtime", () => {
            console.log(`  (skipping WebGL tests: headless-gl not loadable: ${glError})`);
        });
        return;
    }

    if (!isP5v2) {
        it("skips: WebGL is v2-only", () => {
            console.log("  (skipping WebGL tests: p5 v1 throws on WEBGL by design)");
        });
        return;
    }

    it("renders a shader sketch and emits frames without error", (done) => {
        const sketchPath = path.resolve(process.cwd(), "test/fixtures/sketches/webgl-geometry.js");
        const p5b = new P5b({ width: 64, height: 64, fps: 30, sketchPath });

        let frames = 0;
        p5b.on("error", (e) => { p5b.remove(); done(e.error); });
        p5b.on("frame", () => {
            frames++;
            if (frames >= 5) {
                p5b.remove();
                done();
            }
        });
        p5b.run();
    });
});
