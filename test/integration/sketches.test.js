/* eslint-disable no-undef */
const { describe, it, expect } = require("bun:test");
const path = require("path");
const { P5b } = require("../../p5b");

const sketchesDir = path.join(__dirname, "../fixtures/sketches");

describe("P5b Real Sketch - Shapes", () => {
    it("should render shapes sketch successfully", (done) => {
        const p5b = new P5b({
            sketchPath: path.join(sketchesDir, "shapes.js"),
            width: 128,
            height: 128,
            fps: 30
        });

        let frameCount = 0;

        p5b.on("error", (err) => {
            p5b.stop();
            done(err.error);
        });

        p5b.on("frame", (buffer) => {
            expect(buffer).toBeInstanceOf(Uint8Array);
            expect(buffer.length).toBe(128 * 128 * 4);
            frameCount++;
            if (frameCount >= 1) {
                p5b.stop();
                done();
            }
        });

        p5b.run();
    });

    it("should render non-black pixels in shapes sketch", (done) => {
        const p5b = new P5b({
            sketchPath: path.join(sketchesDir, "shapes.js"),
            width: 64,
            height: 64,
            fps: 30
        });

        p5b.on("error", (err) => {
            p5b.stop();
            done(err.error);
        });

        p5b.on("frame", (buffer) => {
            let hasColor = false;
            for (let i = 0; i < Math.min(buffer.length, 256); i += 4) {
                const r = buffer[i];
                const g = buffer[i + 1];
                const b = buffer[i + 2];
                if (r > 0 || g > 0 || b > 0) {
                    hasColor = true;
                    break;
                }
            }
            expect(hasColor).toBe(true);
            p5b.stop();
            done();
        });

        p5b.run();
    });
});


