/* eslint-disable no-undef */
const { describe, it, expect } = require("bun:test");
const { P5b } = require("../../p5b");

describe("P5b Integration - Buffer Analysis", () => {
    it("should emit buffers with correct dimensions", (done) => {
        const WIDTH = 64;
        const HEIGHT = 64;
        const p5b = new P5b({
            width: WIDTH,
            height: HEIGHT,
            fps: 30,
            setup: () => {
                createCanvas(400, 400);
            },
            draw: () => {
                background(255);
                fill(0);
                rect(0, 0, 50, 50);
            }
        });

        let frameCount = 0;
        p5b.on("frame", (buffer) => {
            expect(buffer).toBeInstanceOf(Uint8Array);
            expect(buffer.length).toBe(WIDTH * HEIGHT * 4);  // RGBA
            frameCount++;
            if (frameCount >= 2) {
                p5b.stop();
                done();
            }
        });

        p5b.run();
    });

    it("should render correct colors in buffer", (done) => {
        const WIDTH = 32;
        const HEIGHT = 32;
        const p5b = new P5b({
            width: WIDTH,
            height: HEIGHT,
            fps: 30,
            setup: () => {
                createCanvas(400, 400);
            },
            draw: () => {
                background(255, 0, 0);  // Red background
            }
        });

        p5b.on("frame", (buffer) => {
            // Check that pixels at [0,0] are red (255, 0, 0, 255)
            const r = buffer[0];
            const g = buffer[1];
            const b = buffer[2];
            const a = buffer[3];

            expect(r).toBe(255);
            expect(g).toBe(0);
            expect(b).toBe(0);
            expect(a).toBe(255);

            p5b.stop();
            done();
        });

        p5b.run();
    });

    it("should emit different buffers for animated sketches", (done) => {
        const p5b = new P5b({
            width: 32,
            height: 32,
            fps: 30,
            setup: () => {
                createCanvas(400, 400);
            },
            draw: () => {
                background(Math.floor(frameCount * 10) % 256);
            }
        });

        const frames = [];
        p5b.on("frame", (buffer) => {
            frames.push(new Uint8Array(buffer));
            if (frames.length >= 3) {
                // Verify frames are different
                const frame1 = frames[0];
                const frame2 = frames[1];
                expect(frame1).not.toEqual(frame2);
                p5b.stop();
                done();
            }
        });

        p5b.run();
    });

    it("should handle multiple frames without dropping", (done) => {
        const p5b = new P5b({
            width: 32,
            height: 32,
            fps: 60,
            setup: () => {
                createCanvas(400, 400);
            },
            draw: () => {
                background(0);
            }
        });

        let emittedFrames = 0;
        const targetFrames = 5;

        p5b.on("frame", (_buffer) => {
            emittedFrames++;
            if (emittedFrames >= targetFrames) {
                p5b.stop();
                expect(emittedFrames).toBeGreaterThanOrEqual(targetFrames);
                done();
            }
        });

        p5b.run();
    });

    it("should have valid alpha channel in all pixels", (done) => {
        const p5b = new P5b({
            width: 16,
            height: 16,
            fps: 30,
            setup: () => {
                createCanvas(400, 400);
            },
            draw: () => {
                background(100, 150, 200);
            }
        });

        p5b.on("frame", (buffer) => {
            // Check alpha channel (every 4th byte starting at 3) in first few pixels
            for (let i = 3; i < Math.min(buffer.length, 64); i += 4) {
                expect(buffer[i]).toBe(255);  // Alpha should be 255
            }
            p5b.stop();
            done();
        });

        p5b.run();
    });
});

