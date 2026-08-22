/* eslint-disable no-console */
/**
 * v1-specific 3D / shader behavior.
 *
 * p5 v1 has no WebGL renderer in p5b: `createCanvas(w, h, WEBGL)` throws by design.
 * These tests run under the bun v1 suite (and would also run under node) — no
 * headless-gl needed, because the WEBGL path throws before any context is created.
 *
 * Coverage verified:
 *   - createCanvas(..., WEBGL) emits the deliberate "WEBGL mode is not supported" error.
 *   - A 2D sketch's renderer is never P3D (isP3D === false), so toFrame() takes the
 *     non-P3D path.
 *   - loadShader() is bound (the v1 adapter wires it to the native sync loader), even
 *     though it cannot be applied without a WebGL renderer.
 */

const { describe, it, expect } = require("bun:test");
const path = require("path");
const { P5b } = require("../../p5b.js");

const isP5v2 = (process.env.P5B_P5_PATH || "p5") !== "p5";

const sketch = (name) => path.resolve(process.cwd(), `test/fixtures/sketches/${name}`);

describe("P5b v1 - 3D / shader is unavailable (by design)", () => {
    if (isP5v2) {
        it("skips: v1-only (WebGL is supported in v2)", () => {
            console.log("  (skipping v1 3D/shader tests under p5 v2)");
        });
        return;
    }

    it("createCanvas(WEBGL) throws the deliberate 3D-not-supported error", (done) => {
        const p5b = new P5b({ width: 64, height: 64, fps: 30, sketchPath: sketch("webgl-box.js") });

        p5b.on("error", (e) => {
            p5b.stop();
            try {
                expect(e.error.message).toContain("WEBGL mode is not supported");
                done();
            } catch (err) {
                done(err);
            }
        });
        p5b.on("frame", () => {
            p5b.stop();
            done(new Error("expected a WEBGL error, but a frame was emitted"));
        });
        p5b.run();
    });

    it("a 2D sketch's renderer is never P3D (isP3D === false)", (done) => {
        const p5b = new P5b({ width: 32, height: 32, fps: 30, sketchPath: sketch("webgl-v1-2d.js") });

        p5b.on("error", (e) => { p5b.stop(); done(e.error); });
        p5b.on("frame", () => {
            p5b.stop();
            try {
                // Renderer2D has no isP3D flag; toFrame() does Boolean(isP3D). Assert falsy.
                expect(Boolean(p5b._myP5?._renderer?.isP3D)).toBe(false);
                done();
            } catch (err) {
                done(err);
            }
        });
        p5b.run();
    });

    it("loadShader() is bound (present), though it needs WebGL to be usable", (done) => {
        const p5b = new P5b({ width: 32, height: 32, fps: 30, sketchPath: sketch("webgl-v1-2d.js") });

        p5b.on("error", (e) => { p5b.stop(); done(e.error); });
        p5b.on("frame", () => {
            p5b.stop();
            try {
                expect(typeof global.loadShader).toBe("function");
                done();
            } catch (err) {
                done(err);
            }
        });
        p5b.run();
    });
});
