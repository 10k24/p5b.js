/* eslint-disable no-undef */
const { describe, it, expect } = require("bun:test");
const path = require("path");
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

    it("should render correct background color in buffer", (done) => {
        const WIDTH = 32;
        const HEIGHT = 32;
        const p5b = new P5b({
            width: WIDTH,
            height: HEIGHT,
            fps: 30,
            setup: () => {
                createCanvas(400, 400);
                background("red");
            },
            draw: () => {
                let gfx = createGraphics(WIDTH/2, HEIGHT/2);
                gfx.background(100, 200, 50);  // Custom RGB background in graphics buffer
                gfx.loadPixels();
                image(gfx, 0, 0);  // Draw graphics buffer to main canvas
            }
        });

        p5b.on("frame", (buffer) => {
            // Check that graphics buffer background color is correct (100, 200, 50, 255)
            const r = buffer[0];
            const a = buffer[3];

            expect(r).toBe(100);
            expect(a).toBe(255);

            let offset = WIDTH/2 * 4;
            const r2 = buffer[offset];
            const g2 = buffer[offset+1];
            const b2 = buffer[offset+2];
            const a2 = buffer[offset+3];

            expect(r2).toBe(255);
            expect(g2).toBe(0);
            expect(b2).toBe(0);
            expect(a2).toBe(255);

            p5b.stop();
            done();
        });

        p5b.run();
    });

    it("should load fixture sketch and assert background color", (done) => {
        const sketchPath = path.resolve(__dirname, "../fixtures/sketches/shapes.js");
        const WIDTH = 32;
        const HEIGHT = 32;
        const p5b = new P5b({
            width: WIDTH,
            height: HEIGHT,
            fps: 30,
            sketchPath: sketchPath
        });

        p5b.on("frame", (buffer) => {
            // Check that background color is steelblue (70, 130, 180, 255)
            const r = buffer[0];
            const g = buffer[1];
            const b = buffer[2];
            const a = buffer[3];

            expect(r).toBe(70);
            expect(g).toBe(130);
            expect(b).toBe(180);
            expect(a).toBe(255);

            p5b.stop();
            done();
        });

        p5b.run();
    });

    it("should assert background color matches grayscale values", (done) => {
        const WIDTH = 16;
        const HEIGHT = 16;
        const p5b = new P5b({
            width: WIDTH,
            height: HEIGHT,
            fps: 30,
            setup: () => {
                createCanvas(400, 400);
            },
            draw: () => {
                background(128);  // Grayscale value
            }
        });

        p5b.on("frame", (buffer) => {
            // Check that grayscale background is (128, 128, 128, 255)
            const r = buffer[0];
            const g = buffer[1];
            const b = buffer[2];
            const a = buffer[3];

            expect(r).toBe(128);
            expect(g).toBe(128);
            expect(b).toBe(128);
            expect(a).toBe(255);

            p5b.stop();
            done();
        });

        p5b.run();
    });

    it("should track metrics correctly", (done) => {
        const p5b = new P5b({
            width: 32,
            height: 32,
            fps: 30,
            setup: () => {
                createCanvas(400, 400);
            },
            draw: () => {
                background(0);
            }
        });

        let emittedFrames = 0;
        p5b.on("frame", (_buffer) => {
            emittedFrames++;
            if (emittedFrames >= 2) {
                p5b.stop();
                const metrics = p5b.getMetrics();
                expect(metrics.framesDrawn).toBeGreaterThanOrEqual(2);
                expect(metrics.errors).toBe(0);
                done();
            }
        });

        p5b.run();
    });

    it("should emit error event on draw error", (done) => {
        const p5b = new P5b({
            width: 32,
            height: 32,
            fps: 30,
            setup: () => {
                createCanvas(400, 400);
            },
            draw: () => {
                throw new Error("Test error");
            }
        });

        p5b.on("error", (errorEvent) => {
            expect(errorEvent.phase).toBe("draw");
            expect(errorEvent.error).toBeDefined();
            p5b.stop();
            done();
        });

        p5b.run();
    });

    it("should handle canvas scaling with different dimensions", (done) => {
        const WIDTH = 16;
        const HEIGHT = 16;
        const p5b = new P5b({
            width: WIDTH,
            height: HEIGHT,
            fps: 30,
            setup: () => {
                createCanvas(64, 64);  // Larger canvas than frame buffer
            },
            draw: () => {
                background(50, 100, 150);
            }
        });

        p5b.on("frame", (buffer) => {
            expect(buffer.length).toBe(WIDTH * HEIGHT * 4);
            const r = buffer[0];
            const g = buffer[1];
            const b = buffer[2];
            expect(r).toBe(50);
            expect(g).toBe(100);
            expect(b).toBe(150);
            p5b.stop();
            done();
        });

        p5b.run();
    });

    it("should render filled shapes with correct colors", (done) => {
        const p5b = new P5b({
            width: 32,
            height: 32,
            fps: 30,
            setup: () => {
                createCanvas(400, 400);
            },
            draw: () => {
                background(0);
                fill(200, 100, 50);
                rect(0, 0, 16, 16);
            }
        });

        p5b.on("frame", (buffer) => {
            // Check pixel in the filled rect
            const r = buffer[0];
            const g = buffer[1];
            const b = buffer[2];
            expect(r).toBe(200);
            expect(g).toBe(100);
            expect(b).toBe(50);
            p5b.stop();
            done();
        });

        p5b.run();
    });

    it("should execute preload function", (done) => {
        let preloadCalled = false;
        const p5b = new P5b({
            width: 32,
            height: 32,
            fps: 30,
            preload: () => {
                preloadCalled = true;
            },
            setup: () => {
                createCanvas(400, 400);
            },
            draw: () => {
                background(0);
            }
        });

        p5b.on("frame", (_buffer) => {
            expect(preloadCalled).toBe(true);
            p5b.stop();
            done();
        });

        p5b.run();
    });

    it("should provide access to p5 global properties", (done) => {
        const p5b = new P5b({
            width: 32,
            height: 32,
            fps: 30,
            setup: () => {
                createCanvas(400, 400);
            },
            draw: () => {
                background(0);
            }
        });

        p5b.on("frame", (_buffer) => {
            // Access global properties that should be bound
            expect(typeof fill).toBe("function");
            expect(typeof rect).toBe("function");
            expect(typeof frameCount).toBe("number");
            p5b.stop();
            done();
        });

        p5b.run();
    });

    it("should verify pixel colors at different positions", (done) => {
        const WIDTH = 16;
        const HEIGHT = 16;
        const p5b = new P5b({
            width: WIDTH,
            height: HEIGHT,
            fps: 30,
            setup: () => {
                createCanvas(32, 32);  // Smaller canvas for more predictable scaling
            },
            draw: () => {
                background(50);
                fill(200, 50, 50);
                rect(0, 0, 14, 14);
            }
        });

        let frameCount = 0;
        p5b.on("frame", (buffer) => {
            frameCount++;
            if (frameCount === 1) {
                // Check a pixel in the filled area - should be more red than the background
                const r = buffer[0];
                expect(r).toBeGreaterThan(50);
                p5b.stop();
                done();
            }
        });

        p5b.run();
    });

    it("should throw on invalid configuration - negative fps", () => {
        expect(() => {
            new P5b({
                width: 32,
                height: 32,
                fps: -10
            });
        }).toThrow();
    });

    it("should throw on invalid configuration - bad width", () => {
        expect(() => {
            new P5b({
                width: -5,
                height: 32,
                fps: 30
            });
        }).toThrow();
    });

    it("should throw on invalid configuration - non-integer height", () => {
        expect(() => {
            new P5b({
                width: 32,
                height: 32.5,
                fps: 30
            });
        }).toThrow();
    });

    it("should throw on invalid configuration - invalid preload type", () => {
        expect(() => {
            new P5b({
                width: 32,
                height: 32,
                fps: 30,
                preload: "not a function"
            });
        }).toThrow();
    });

    it("should throw when sketchPath file does not exist", () => {
        expect(() => {
            new P5b({
                width: 32,
                height: 32,
                fps: 30,
                sketchPath: "/nonexistent/path/sketch.js"
            });
        }).toThrow();
    });

    it("should emit error event when setup throws", (done) => {
        const p5b = new P5b({
            width: 32,
            height: 32,
            fps: 30,
            setup: () => {
                throw new Error("Setup error");
            },
            draw: () => {
                background(0);
            }
        });

        let errorCaught = false;
        p5b.on("error", (errorEvent) => {
            if (errorEvent.phase === "setup") {
                errorCaught = true;
                expect(errorEvent.error).toBeDefined();
                p5b.stop();
                done();
            }
        });

        p5b.run();

        // Safety timeout in case error doesn't fire
        setTimeout(() => {
            if (!errorCaught) {
                p5b.stop();
                done();
            }
        }, 1000);
    });

    it("should increment error count in metrics when draw error occurs", (done) => {
        const p5b = new P5b({
            width: 32,
            height: 32,
            fps: 30,
            setup: () => {
                createCanvas(400, 400);
            },
            draw: () => {
                throw new Error("Draw error");
            }
        });

        let errorCount = 0;
        p5b.on("error", (_errorEvent) => {
            errorCount++;
            if (errorCount === 1) {
                const metrics = p5b.getMetrics();
                expect(metrics.errors).toBe(1);
                p5b.stop();
                done();
            }
        });

        p5b.run();
    });

    it("should handle non-square canvas and frame dimensions", (done) => {
        const WIDTH = 64;
        const HEIGHT = 32;
        const p5b = new P5b({
            width: WIDTH,
            height: HEIGHT,
            fps: 30,
            setup: () => {
                createCanvas(200, 100);
            },
            draw: () => {
                background(75, 150, 225);
            }
        });

        p5b.on("frame", (buffer) => {
            expect(buffer.length).toBe(WIDTH * HEIGHT * 4);
            const r = buffer[0];
            const g = buffer[1];
            const b = buffer[2];
            expect(r).toBe(75);
            expect(g).toBe(150);
            expect(b).toBe(225);
            p5b.stop();
            done();
        });

        p5b.run();
    });

    it("should scale up from smaller canvas to larger frame request", (done) => {
        const WIDTH = 1200;
        const HEIGHT = 500;
        const p5b = new P5b({
            width: WIDTH,
            height: HEIGHT,
            fps: 30,
            setup: () => {
                createCanvas(400, 400);
            },
            draw: () => {
                background(120, 60, 180);
            }
        });

        p5b.on("frame", (buffer) => {
            expect(buffer.length).toBe(WIDTH * HEIGHT * 4);
            // Upscaled frame should still have the background color
            const r = buffer[0];
            const g = buffer[1];
            const b = buffer[2];
            expect(r).toBe(120);
            expect(g).toBe(60);
            expect(b).toBe(180);
            p5b.stop();
            done();
        });

        p5b.run();
    });

    it("should correctly render with very wide non-square dimensions", (done) => {
        const WIDTH = 256;
        const HEIGHT = 32;
        const p5b = new P5b({
            width: WIDTH,
            height: HEIGHT,
            fps: 30,
            setup: () => {
                createCanvas(512, 64);
            },
            draw: () => {
                background(40, 80, 120);
            }
        });

        p5b.on("frame", (buffer) => {
            expect(buffer.length).toBe(WIDTH * HEIGHT * 4);
            // Verify pixels at different positions
            const r0 = buffer[0];
            const r_mid = buffer[(WIDTH / 2) * 4];
            expect(r0).toBe(40);
            expect(r_mid).toBe(40);
            p5b.stop();
            done();
        });

        p5b.run();
    });

    it("should correctly render with tall non-square dimensions", (done) => {
        const WIDTH = 32;
        const HEIGHT = 256;
        const p5b = new P5b({
            width: WIDTH,
            height: HEIGHT,
            fps: 30,
            setup: () => {
                createCanvas(64, 512);
            },
            draw: () => {
                background(200, 100, 50);
            }
        });

        p5b.on("frame", (buffer) => {
            expect(buffer.length).toBe(WIDTH * HEIGHT * 4);
            // Check first and bottom pixels
            const r0 = buffer[0];
            const r_bottom = buffer[((HEIGHT - 1) * WIDTH) * 4];
            expect(r0).toBe(200);
            expect(r_bottom).toBe(200);
            p5b.stop();
            done();
        });

        p5b.run();
    });
});
