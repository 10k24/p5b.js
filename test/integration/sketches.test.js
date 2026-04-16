
const { describe, it, expect } = require("bun:test");
const path = require("path");
const { P5b } = require("../../p5b");

const sketchesDir = path.join(process.cwd(), "test/fixtures/sketches");

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

describe("P5b Real Sketch - Graphics Pooling", () => {
    it("should render graphics sketch with createGraphics successfully", (done) => {
        const p5b = new P5b({
            sketchPath: path.join(sketchesDir, "graphics.js"),
            width: 128,
            height: 128,
            fps: 30
        });

        p5b.on("error", (err) => {
            p5b.stop();
            done(err.error);
        });

        p5b.on("frame", (buffer) => {
            expect(buffer).toBeInstanceOf(Uint8Array);
            expect(buffer.length).toBe(128 * 128 * 4);
            p5b.stop();
            done();
        });

        p5b.run();
    });

    it("should verify graphics.remove() calls work in sketch", (done) => {
        const p5b = new P5b({
            sketchPath: path.join(sketchesDir, "graphics.js"),
            width: 64,
            height: 64,
            fps: 30
        });

        let errorOccurred = false;

        p5b.on("error", (err) => {
            errorOccurred = true;
            p5b.stop();
            done(err.error);
        });

        p5b.on("frame", (buffer) => {
            expect(buffer).toBeInstanceOf(Uint8Array);
            expect(buffer.length).toBe(64 * 64 * 4);
            
            // Verify the buffer contains the expected colors from graphics layers
            // Background: 100, 150, 200
            // Graphics1 (orange): 255, 100, 50
            // Graphics2 (green): 100, 255, 50
            let hasExpectedColors = false;
            
            for (let i = 0; i < buffer.length; i += 4) {
                const r = buffer[i];
                const g = buffer[i + 1];
                const b = buffer[i + 2];
                
                // Check for background color (approximate due to scaling)
                if (Math.abs(r - 100) < 50 && Math.abs(g - 150) < 50 && Math.abs(b - 200) < 50) {
                    hasExpectedColors = true;
                    break;
                }
                // Check for graphics colors
                if ((r > 150 && g < 150 && b < 150) ||  // Orange/red
                    (r < 150 && g > 150 && b < 150)) {   // Green
                    hasExpectedColors = true;
                    break;
                }
            }
            
            expect(hasExpectedColors).toBe(true);
            expect(errorOccurred).toBe(false);
            p5b.stop();
            done();
        });

        p5b.run();
    });
});

describe("P5b Real Sketch - loadImage", () => {
    it("should render image with correct pixel colors at 32x32", (done) => {
        const p5b = new P5b({
            sketchPath: path.join(sketchesDir, "loadimage.js"),
            width: 32,
            height: 32,
            fps: 30
        });

        p5b.on("error", (err) => {
            p5b.stop();
            done(err.error);
        });

        p5b.on("frame", (buffer) => {
            expect(buffer).toBeInstanceOf(Uint8Array);
            expect(buffer.length).toBe(32 * 32 * 4);

            const px = (x, y) => {
                const i = (y * 32 + x) * 4;
                return [buffer[i], buffer[i + 1], buffer[i + 2]];
            };

            // Verify image content is rendered (not empty)
            const topLeft = px(0, 0);
            expect(topLeft[0]).toBeGreaterThan(200);  // Image has color content
            expect(topLeft[1]).toBeGreaterThan(200);
            expect(topLeft[2]).toBeGreaterThan(200);

            // Verify specific positions have image content (not blue)
            const midImage = px(17, 14);
            expect(midImage[0]).toBeGreaterThan(190);
            expect(midImage[1]).toBeGreaterThan(190);
            expect(midImage[2]).toBeGreaterThan(180);

            // Verify blue background shows through in the bottom region
            // (canvas is 7954x7954, image is 7954x5305, so y > 21 in output is blue)
            const corner = px(31, 31);
            expect(corner).toEqual([0, 0, 255]);
            
            // Check a position definitely in blue region (y >= 22)
            const bottomArea = px(22, 22);
            expect(bottomArea).toEqual([0, 0, 255]);

            p5b.stop();
            done();
        });

        p5b.run();
    });
});

describe("P5b Real Sketch - Scaling", () => {
    it("should scale 4x4 canvas to 2x2 output", (done) => {
        const p5b = new P5b({
            sketchPath: path.join(sketchesDir, "scaling.js"),
            width: 2,
            height: 2,
            fps: 30
        });

        p5b.on("error", (err) => {
            p5b.stop();
            done(err.error);
        });

        p5b.on("frame", (buffer) => {
            expect(buffer).toBeInstanceOf(Uint8Array);
            expect(buffer.length).toBe(2 * 2 * 4);

            const px = (x, y) => {
                const i = (y * 2 + x) * 4;
                return [buffer[i], buffer[i + 1], buffer[i + 2]];
            };

            expect(px(0, 0)).toEqual([255, 0, 0]);     // red - top-left 2x2 region scaled to 1x1
            expect(px(1, 0)).toEqual([255, 255, 255]); // white - rest is white
            expect(px(0, 1)).toEqual([255, 255, 255]); // white
            expect(px(1, 1)).toEqual([255, 255, 255]); // white

            p5b.stop();
            done();
        });

        p5b.run();
    });
});

describe("P5b Real Sketch - Globals", () => {
    it("should verify all math globals work correctly in sketch", (done) => {
        const p5b = new P5b({
            sketchPath: path.join(sketchesDir, "globals.js"),
            width: 16,
            height: 16,
            fps: 30
        });
        p5b.on("error", (err) => {
            p5b.stop();
            done(err.error);
        });
        p5b.on("frame", (buffer) => {
            expect(global.results.pi).toBe(Math.PI);
            expect(global.results.two_pi).toBe(Math.PI * 2);
            expect(global.results.half_pi).toBe(Math.PI / 2);
            expect(global.results.quarter_pi).toBe(Math.PI / 4);
            expect(global.results.tau).toBe(Math.PI * 2);
            expect(global.results.degrees).toBe("degrees");
            expect(global.results.radians).toBe("radians");
            expect(global.results.abs).toBe(5);
            expect(global.results.ceil).toBe(5);
            expect(global.results.floor).toBe(4);
            expect(global.results.round).toBe(5);
            expect(global.results.pow).toBe(8);
            expect(global.results.sqrt).toBe(4);
            expect(global.results.exp).toBeCloseTo(Math.E, 5);
            expect(global.results.log).toBe(1);
            expect(global.results.max).toBe(5);
            expect(global.results.min).toBe(1);
            expect(global.results.sq).toBe(16);
            expect(global.results.sq_neg).toBe(9);
            expect(global.results.mag).toBe(5);
            expect(global.results.fract).toBe(0.5);
            expect(global.results.fract_int).toBe(0);
            expect(global.results.fract_neg).toBe(0.5);
            expect(global.results.map).toBe(500);
            expect(global.results.lerp).toBe(50);
            expect(global.results.constrain).toBe(100);
            expect(global.results.constrain_in_range).toBe(50);
            expect(global.results.dist).toBe(5);
            expect(global.results.dist_3d).toBeCloseTo(5.385, 0.01);
            expect(typeof global.results.random).toBe("number");
            expect(typeof global.results.noise).toBe("number");
            expect(global.results.norm).toBe(0.4);
            expect(global.results.abs_neg).toBe(1);
            expect(global.results.ceil_neg).toBe(-1);
            expect(global.results.floor_neg).toBe(-2);
            expect(global.results.dist_identical).toBe(0);
            expect(global.results.dist_identical_3d).toBe(0);
            expect(global.results.lerp_start).toBe(0);
            expect(global.results.lerp_stop).toBe(5);
            expect(global.results.lerp_avg).toBe(2.5);
            p5b.stop();
            done();
        });
        p5b.run();
    });
});

describe("P5b Real Sketch - global sketch", () => {
    it("should verify global scope variables are bound in sketch", (done) => {
        const p5b = new P5b({
            sketchPath: path.join(sketchesDir, "global-scope.js"),
            width: 16,
            height: 16,
            fps: 30
        });
        p5b.on("error", (err) => {
            p5b.stop();
            done(err.error);
        });
        p5b.on("frame", (buffer) => {
            expect(global.found_hello).toBe("I am a global variable");
            expect(global.found_count).toBe(42);
            p5b.stop();
            done();
        });

        p5b.run();
    });
});
