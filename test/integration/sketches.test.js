 
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
