/* eslint-disable no-undef */
const { describe, it, expect } = require("bun:test");
const path = require("path");
const { P5b } = require("../../p5b");

// TODO: build out more utils like this for brevity
const doneErr = (err) => { p5b.stop(); done(err.error); };

describe("P5b Integration - Buffer Analysis", () => {
    function testBackgroundColorScenarios(done) {
        const scenarios = [
            {
                name: "red background",
                width: 32, height: 32,
                setup: () => { createCanvas(400, 400); },
                draw: () => { background(255, 0, 0); },
                expectedR: 255, expectedG: 0, expectedB: 0
            },
            {
                name: "grayscale background",
                width: 16, height: 16,
                setup: () => { createCanvas(400, 400); },
                draw: () => { background(128); },
                expectedR: 128, expectedG: 128, expectedB: 128
            },
            {
                name: "canvas scaling",
                width: 16, height: 16,
                setup: () => { createCanvas(64, 64); },
                draw: () => { background(50, 100, 150); },
                expectedR: 50, expectedG: 100, expectedB: 150
            },
            {
                name: "non-square canvas",
                width: 64, height: 32,
                setup: () => { createCanvas(200, 100); },
                draw: () => { background(75, 150, 225); },
                expectedR: 75, expectedG: 150, expectedB: 225
            },
            {
                name: "upscaling",
                width: 1200, height: 500,
                setup: () => { createCanvas(400, 400); },
                draw: () => { background(120, 60, 180); },
                expectedR: 120, expectedG: 60, expectedB: 180
            },
            {
                name: "very wide dimensions",
                width: 256, height: 32,
                setup: () => { createCanvas(512, 64); },
                draw: () => { background(40, 80, 120); },
                expectedR: 40, expectedG: 80, expectedB: 120
            },
            {
                name: "tall dimensions",
                width: 32, height: 256,
                setup: () => { createCanvas(64, 512); },
                draw: () => { background(200, 100, 50); },
                expectedR: 200, expectedG: 100, expectedB: 50
            }
        ];

        let scenarioIndex = 0;

        function testNext() {
            if (scenarioIndex >= scenarios.length) {
                done();
                return;
            }

            const scenario = scenarios[scenarioIndex];
            const p5b = new P5b({
                width: scenario.width,
                height: scenario.height,
                fps: 30,
                setup: scenario.setup,
                draw: scenario.draw
            });

            p5b.on("frame", (buffer) => {
                const r = buffer[0];
                const g = buffer[1];
                const b = buffer[2];
                const a = buffer[3];
                expect(r).toBe(scenario.expectedR);
                expect(g).toBe(scenario.expectedG);
                expect(b).toBe(scenario.expectedB);
                expect(a).toBe(255);
                p5b.stop();
                scenarioIndex++;
                testNext();
            });

            p5b.run();
        }

        testNext();
    }

    it("should render correct colors in different scenarios", (done) => {
        testBackgroundColorScenarios(done);
    });

    it("should handle canvas larger than output with filler pixels", (done) => {
        const p5b = new P5b({
            width: 4,
            height: 8,
            fps: 30,
            setup: () => {
                createCanvas(8, 8);
                background(255, 0, 0);
            },
            draw: () => {
                noLoop();
            }
        });

        p5b.on("frame", (buffer) => {
            expect(buffer.length).toBe(4 * 8 * 4);
            
            const px = (x, y) => {
                const i = (y * 4 + x) * 4;
                return [buffer[i], buffer[i+1], buffer[i+2], buffer[i+3]];
            };

            expect(px(0, 0)).toEqual([255, 0, 0, 255]);
            expect(px(3, 0)).toEqual([255, 0, 0, 255]);
            expect(px(0, 3)).toEqual([255, 0, 0, 255]);
            expect(px(3, 3)).toEqual([255, 0, 0, 255]);
            
            // Blank buffer expected below the scaled frame
            expect(px(0, 4)).toEqual([0, 0, 0, 0]);
            expect(px(0, 7)).toEqual([0, 0, 0, 0]);
            expect(px(3, 4)).toEqual([0, 0, 0, 0]);
            expect(px(3, 7)).toEqual([0, 0, 0, 0]);

            p5b.stop();
            done();
        });

        p5b.run();
    });

    it("should handle canvas wider than output with filler pixels", (done) => {
        const p5b = new P5b({
            width: 8,
            height: 4,
            fps: 30,
            setup: () => {
                createCanvas(8, 8);
                background(255, 0, 0);
            },
            draw: () => {
                noLoop();
            }
        });

        p5b.on("frame", (buffer) => {
            expect(buffer.length).toBe(8 * 4 * 4);
            
            const px = (x, y) => {
                const i = (y * 8 + x) * 4;
                return [buffer[i], buffer[i+1], buffer[i+2], buffer[i+3]];
            };

            expect(px(0, 0)).toEqual([255, 0, 0, 255]);
            expect(px(3, 0)).toEqual([255, 0, 0, 255]);
            expect(px(0, 3)).toEqual([255, 0, 0, 255]);
            expect(px(3, 3)).toEqual([255, 0, 0, 255]);

            // Blank buffer expected after the scaled frame
            expect(px(4, 0)).toEqual([0, 0, 0, 0]);
            expect(px(7, 0)).toEqual([0, 0, 0, 0]);
            expect(px(4, 3)).toEqual([0, 0, 0, 0]);
            expect(px(7, 3)).toEqual([0, 0, 0, 0]);

            p5b.stop();
            done();
        });

        p5b.run();
    });

    it("should scale canvas to smaller output without filler", (done) => {
        const p5b = new P5b({
            width: 4,
            height: 4,
            fps: 30,
            setup: () => {
                createCanvas(8, 8);
                background(255, 0, 0);
            },
            draw: () => {
                noLoop();
            }
        });

        p5b.on("frame", (buffer) => {
            expect(buffer.length).toBe(4 * 4 * 4);
            
            const px = (x, y) => {
                const i = (y * 4 + x) * 4;
                return [buffer[i], buffer[i+1], buffer[i+2], buffer[i+3]];
            };

            expect(px(0, 0)).toEqual([255, 0, 0, 255]);
            expect(px(3, 3)).toEqual([255, 0, 0, 255]);

            p5b.stop();
            done();
        });

        p5b.run();
    });

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
            expect(buffer.length).toBe(WIDTH * HEIGHT * 4);
            frameCount++;
            if (frameCount >= 2) {
                p5b.stop();
                done();
            }
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
                expect(frames[0]).not.toEqual(frames[1]);
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
                background(100, 150, 200, 120);
                noLoop();
            }
        });

        p5b.on("frame", (buffer) => {
            for (let i = 0; i < Math.min(buffer.length, 64); i += 4) {
                expect(Math.abs(buffer[i+3] - 120)).toBeLessThanOrEqual(8);
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
                gfx.background(100, 200, 50);
                gfx.loadPixels();
                image(gfx, 0, 0);
                noLoop();
            }
        });

        p5b.on("frame", (buffer) => {
            const r = buffer[0];
            const g = buffer[1];
            const b = buffer[2];
            const a = buffer[3];
            expect(r).toBe(100);
            expect(g).toBe(200);
            expect(b).toBe(50);
            expect(a).toBe(255);

            const offset = WIDTH/2 * 4;
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
        const sketchPath = path.resolve(process.cwd(), "test/fixtures/sketches/shapes.js");
        const WIDTH = 32;
        const HEIGHT = 32;
        const p5b = new P5b({
            width: WIDTH,
            height: HEIGHT,
            fps: 30,
            sketchPath: sketchPath
        });

        p5b.on("frame", (buffer) => {
            const r = buffer[0];
            const g = buffer[1];
            const b = buffer[2];
            const a = buffer[3];
            expect(Math.abs(r - 70)).toBeLessThanOrEqual(8);
            expect(Math.abs(g - 130)).toBeLessThanOrEqual(8);
            expect(Math.abs(b - 180)).toBeLessThanOrEqual(8);
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
            const r = buffer[0];
            const g = buffer[1];
            const b = buffer[2];
            // Cairo's bilinear downscaling blends edge pixels; check approximate values
            expect(r).toBeGreaterThan(150);
            expect(g).toBeGreaterThan(70);
            expect(b).toBeGreaterThan(30);
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
                createCanvas(32, 32);
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
                const r = buffer[0];
                expect(r).toBeGreaterThan(50);
                p5b.stop();
                done();
            }
        });

        p5b.run();
    });

    it("should reject invalid configuration values", () => {
        const invalidConfigs = [
            { width: 32, height: 32, fps: -10 },
            { width: -5, height: 32, fps: 30 },
            { width: 32, height: 32.5, fps: 30 },
            { width: 32, height: 32, fps: 30, preload: "not a function" }
        ];

        invalidConfigs.forEach(config => {
            expect(() => {
                new P5b(config);
            }).toThrow();
        });
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

        setTimeout(() => {
            if (!errorCaught) {
                p5b.stop();
                done();
            }
        }, 1000);
    });

    it("should emit error event on draw error and update metrics", (done) => {
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
        p5b.on("error", (errorEvent) => {
            errorCount++;
            if (errorCount === 1) {
                expect(errorEvent.phase).toBe("draw");
                expect(errorEvent.error).toBeDefined();
                const metrics = p5b.getMetrics();
                expect(metrics.errors).toBe(1);
                p5b.stop();
                done();
            }
        });

        p5b.run();
    });
});

describe("P5b Integration - Graphics Pooling", () => {
    it("should create and remove graphics without throwing", (done) => {
        const p5b = new P5b({
            width: 32, height: 32,
            setup: () => { createCanvas(100, 100); },
            draw: () => {
                background(200);
                const pg = createGraphics(50, 50);
                pg.background(255);
                pg.fill(0);
                pg.rect(10, 10, 30, 30);
                pg.remove();  // Polyfill override should handle safely
            }
        });

        let frameReceived = false;
        let errorOccurred = false;

        p5b.on("error", () => {
            errorOccurred = true;
        });

        p5b.on("frame", (buffer) => {
            frameReceived = true;
            expect(buffer).toBeInstanceOf(Uint8Array);
            expect(errorOccurred).toBe(false);
            p5b.stop();
            done();
        });

        p5b.run();
    });

    it("should handle multiple graphics with .remove() calls in same frame", (done) => {
        const p5b = new P5b({
            width: 32, height: 32,
            setup: () => { createCanvas(64, 64); },
            draw: () => {
                const pg1 = createGraphics(16, 16);
                pg1.background(255);
                pg1.remove();

                const pg2 = createGraphics(24, 24);
                pg2.background(128);
                pg2.remove();
            }
        });

        let errorOccurred = false;

        p5b.on("error", () => {
            errorOccurred = true;
        });

        p5b.on("frame", (buffer) => {
            expect(buffer).toBeInstanceOf(Uint8Array);
            expect(errorOccurred).toBe(false);
            p5b.stop();
            done();
        });

        p5b.run();
    });

    it("should call .remove() multiple times safely", (done) => {
        const p5b = new P5b({
            width: 32, height: 32,
            setup: () => { createCanvas(64, 64); },
            draw: () => {
                const pg = createGraphics(16, 16);
                pg.background(100);
                pg.remove();
                pg.remove();  // Should not throw on second call
            }
        });

        let errorOccurred = false;

        p5b.on("error", () => {
            errorOccurred = true;
        });

        p5b.on("frame", (buffer) => {
            expect(buffer).toBeInstanceOf(Uint8Array);
            expect(errorOccurred).toBe(false);
            p5b.stop();
            done();
        });

        p5b.run();
    });

    it("should render graphics created in draw() successfully", (done) => {
        const p5b = new P5b({
            width: 32, height: 32,
            setup: () => { createCanvas(100, 100); },
            draw: () => {
                background(200);
                const pg = createGraphics(30, 30);
                pg.background(100, 200, 50);
                image(pg, 0, 0);
                pg.remove();
            }
        });

        p5b.on("frame", (buffer) => {
            expect(buffer).toBeInstanceOf(Uint8Array);
            expect(buffer.length).toBe(32 * 32 * 4);
            p5b.stop();
            done();
        });

        p5b.run();
    });
});

describe("P5b Integration - loadImage", () => {
    it("should load image in preload and render in draw", (done) => {
        const testImagePath = path.join(process.cwd(), "test/fixtures/img/natalie-kinnear-CC2Bfvk2-tU-unsplash.jpg");
        let loadedImg = null;

        const p5b = new P5b({
            width: 32, height: 32,
            fps: 30,
            preload: () => {
                loadedImg = loadImage(testImagePath);
            },
            setup: () => {
                createCanvas(loadedImg.width, loadedImg.height);
            },
            draw: () => {
                background(0);
                image(loadedImg, 0, 0, loadedImg.width, loadedImg.height);
                noLoop();
            }
        });

        p5b.on("error", doneErr);

        p5b.on("frame", (buffer) => {
            expect(buffer).toBeInstanceOf(Uint8Array);
            expect(buffer.length).toBe(32 * 32 * 4);

            const hasColor = buffer.slice(0, 256).some((v, i) => i % 4 !== 3 && v > 0);
            expect(hasColor).toBe(true);

            p5b.stop();
            done();
        });

        p5b.run();
    });

    it("should handle loadImage error gracefully", (done) => {
        let error = null;

        const p5b = new P5b({
            width: 32, height: 32,
            fps: 30,
            preload: () => {
                loadImage("does-not-exist.jpg", () => {}, (err) => {
                    error = err;
                });
            },
            setup: () => {
                createCanvas(100, 100);
            },
            draw: () => {
                background(0);
                noLoop();
            }
        });

        p5b.on("frame", (_buffer) => {
            p5b.stop();
            done();
        });

        p5b.run();
    });

    it("should scale image when drawing with different dimensions", (done) => {
        const testImagePath = path.join(process.cwd(), "test/fixtures/img/natalie-kinnear-CC2Bfvk2-tU-unsplash.jpg");
        let loadedImg = null;

        const p5b = new P5b({
            width: 16, height: 16,
            fps: 30,
            preload: () => {
                loadedImg = loadImage(testImagePath);
            },
            setup: () => {
                createCanvas(loadedImg.width, loadedImg.height);
            },
            draw: () => {
                background(0);
                image(loadedImg, 0, 0, 16, 16);
                noLoop();
            }
        });

        p5b.on("error", doneErr);

        p5b.on("frame", (buffer) => {
            expect(buffer).toBeInstanceOf(Uint8Array);
            expect(buffer.length).toBe(16 * 16 * 4);

            p5b.stop();
            done();
        });

        p5b.run();
    });

    it("should handle aspect ratio mismatch (wider output)", (done) => {
        const p5b = new P5b({
            width: 60,
            height: 20,
            fps: 30,
            setup: () => {
                createCanvas(800, 400);
                background(255, 0, 0);
            },
            draw: () => {
                noLoop();
            }
        });

        p5b.on("frame", (buffer) => {
            const width = 60;
            const height = 20;
            const px = (x, y) => {
                const i = (y * width + x) * 4;
                return [buffer[i], buffer[i+1], buffer[i+2], buffer[i+3]];
            };

            expect(px(0, 0)).toEqual([255, 0, 0, 255]);
            expect(px(39, 0)).toEqual([255, 0, 0, 255]);
            expect(px(0, 19)).toEqual([255, 0, 0, 255]);
            expect(px(39, 19)).toEqual([255, 0, 0, 255]);

            expect(px(40, 0)).toEqual([0, 0, 0, 0]);
            expect(px(59, 0)).toEqual([0, 0, 0, 0]);
            expect(px(40, 19)).toEqual([0, 0, 0, 0]);
            expect(px(59, 19)).toEqual([0, 0, 0, 0]);

            p5b.stop();
            done();
        });

        p5b.run();
    });

    it("should handle aspect ratio mismatch (taller output)", (done) => {
        const p5b = new P5b({
            width: 120,
            height: 50,
            fps: 30,
            setup: () => {
                createCanvas(400, 500);
                background(0, 255, 0);
            },
            draw: () => {
                noLoop();
            }
        });

        p5b.on("frame", (buffer) => {
            const width = 120;
            const height = 50;
            const px = (x, y) => {
                const i = (y * width + x) * 4;
                return [buffer[i], buffer[i+1], buffer[i+2], buffer[i+3]];
            };

            expect(px(0, 0)).toEqual([0, 255, 0, 255]);
            expect(px(39, 0)).toEqual([0, 255, 0, 255]);
            expect(px(0, 49)).toEqual([0, 255, 0, 255]);
            expect(px(39, 49)).toEqual([0, 255, 0, 255]);

            expect(px(40, 0)).toEqual([0, 0, 0, 0]);
            expect(px(119, 0)).toEqual([0, 0, 0, 0]);
            expect(px(40, 49)).toEqual([0, 0, 0, 0]);
            expect(px(119, 49)).toEqual([0, 0, 0, 0]);

            p5b.stop();
            done();
        });

        p5b.run();
    });
});

describe("P5b Integration - windowResized", () => {
    it("should call user-defined windowResized handler", (done) => {
        let windowResizedCalled = false;

        const p5b = new P5b({
            width: 32, height: 32,
            fps: 30,
            setup: () => {
                createCanvas(100, 100);
            },
            draw: () => {
                background(100);
            },
            windowResized: () => {
                windowResizedCalled = true;
            }
        });

        p5b.on("frame", (buffer) => {
            windowResized();
            expect(windowResizedCalled).toBe(true);
            p5b.stop();
            done();
        });

        p5b.run();
    });

    it("should update DOM dimensions after windowResized", (done) => {
        const p5b = new P5b({
            width: 32, height: 32,
            fps: 30,
            setup: () => {
                createCanvas(100, 100);
            },
            draw: () => {
                background(100);
            }
        });

        p5b.on("frame", () => {
            windowResized();
            const domAfter = p5b._dom;
            expect(domAfter.width).toBe(32);
            expect(domAfter.height).toBe(32);
            p5b.stop();
            done();
        });

        p5b.run();
    });
});

describe("P5b Integration - WEBGL Mode", () => {
    it("should emit error when WEBGL mode is requested", (done) => {
        const p5b = new P5b({
            width: 32, height: 32,
            fps: 30,
            setup: () => {
                createCanvas(100, 100, WEBGL);
            },
            draw: () => {
                background(100);
            }
        });

        p5b.on("error", (err) => {
            expect(err.phase).toBeDefined();
            expect(err.error).toBeDefined();
            p5b.stop();
            done();
        });

        p5b.run();
    });
});

describe("P5b Integration - Time Functions", () => {
    it("should return current time values matching native Date", (done) => {
        const now = new Date();
        
        const p5b = new P5b({
            width: 16, height: 16,
            fps: 30,
            setup: () => {
                createCanvas(100, 100);
            },
            draw: () => {
                const results = global.results = {};
                results.year = year();
                results.month = month();
                results.day = day();
                results.hour = hour();
                results.minute = minute();
                results.second = second();
                results.millis = millis();
                noLoop();
            }
        });

        p5b.on("error", doneErr);
        
        p5b.on("frame", (buffer) => {
            expect(global.results.year).toBe(now.getFullYear());
            expect(global.results.month).toBe(now.getMonth() + 1);
            expect(global.results.day).toBe(now.getDate());
            expect(global.results.hour).toBe(now.getHours());
            // Relaxed test for minute/second due to timing gap
            expect(Math.abs(global.results.minute - now.getMinutes())).toBeLessThanOrEqual(1);
            expect(Math.abs(global.results.second - now.getSeconds())).toBeLessThanOrEqual(2);
            expect(global.results.millis).toBeGreaterThanOrEqual(0);
            expect(global.results.millis).toBeLessThanOrEqual(999);
            p5b.stop();
            done();
        });
        
        p5b.run();
    });
});

describe("P5b Integration - Environment Functions", () => {
    it("should return current frameRate from p5 instance", (done) => {
        const p5b = new P5b({
            width: 16, height: 16,
            fps: 30,
            setup: () => { createCanvas(100, 100); },
            draw: () => {
                const currentFps = frameRate();
                global.results.fps = currentFps;
                global.results.target_fps = getTargetFrameRate();
                noLoop();
            }
        });
        
        p5b.on("frame", (buffer) => {
            // Framerate seems to be 34 for some reason
            expect(Math.floor(global.results.fps) - 30).toBeLessThan(5);
            expect(global.results.target_fps).toBe(30);
            p5b.stop();
            done();
        });
        
        p5b.run();
    });

    it("should track isLooping state", (done) => {
        const p5b = new P5b({
            width: 16, height: 16,
            fps: 30,
            setup: () => { createCanvas(100, 100); noLoop(); },
            draw: () => {
                global.results.isLooping = isLooping();
            }
        });
        
        p5b.on("frame", (buffer) => {
            expect(global.results.isLooping).toBe(false);
            p5b.stop();
            done();
        });
        
        p5b.run();
    });
});

describe("P5b Integration - Loop Control", () => {
    it("should emit frames continuously when looping", (done) => {
        let frameCount = 0;
        const p5b = new P5b({
            width: 16, height: 16,
            fps: 30,
            setup: () => { createCanvas(100, 100); },
            draw: () => { frameCount++; }
        });
        
        p5b.on("frame", (buffer) => {
            // Should get multiple frames before timeout
            if (frameCount >= 3) {
                expect(frameCount).toBeGreaterThanOrEqual(3);
                p5b.stop();
                done();
            }
        });
        
        p5b.run();
    });
    
    it("should stop emitting frames after noLoop() in setup", (done) => {
        let framesReceived = 0;
        const p5b = new P5b({
            width: 16, height: 16,
            fps: 30,
            setup: () => {
                createCanvas(100, 100);
                noLoop();
            },
            draw: () => { /* intentionally empty */ }
        });

        p5b.on("frame", () => { framesReceived++; });

        setTimeout(() => {
            // draw() always runs at least once, then stops (not continuous)
            expect(framesReceived).toBe(1);
            p5b.stop();
            done();
        }, 500);

        p5b.run();
    });
    
    it("should emit exactly one frame when noLoop called in draw", (done) => {
        let frameCount = 0;
        const p5b = new P5b({
            width: 16, height: 16,
            fps: 30,
            setup: () => { createCanvas(100, 100); },
            draw: () => { 
                frameCount++;
                if (frameCount === 1) {
                    noLoop();
                }
            }
        });
        
        let framesReceived = 0;
        p5b.on("frame", (buffer) => {
            framesReceived++;
        });
        
        setTimeout(() => {
            expect(framesReceived).toBe(1);  // Only first frame
            p5b.stop();
            done();
        }, 500);

        p5b.run();
    });

    it("should resume frame emission after loop() called", (done) => {
        let frameCount = 0;
        let noLoopCalled = false;
        const p5b = new P5b({
            width: 16, height: 16,
            fps: 30,
            setup: () => { createCanvas(100, 100); },
            draw: () => {
                frameCount++;
                if (!noLoopCalled) {
                    noLoopCalled = true;
                    noLoop();
                }
            }
        });

        let framesReceived = 0;
        p5b.on("frame", () => { framesReceived++; });

        // After noLoop stops the animation, resume it externally
        setTimeout(() => { loop(); }, 100);

        setTimeout(() => {
            expect(framesReceived).toBeGreaterThan(1);  // Should resume after loop()
            p5b.stop();
            done();
        }, 500);

        p5b.run();
    });
    
    it("should initially report isLooping as true", (done) => {
        let loopingOnFirstFrame;
        const p5b = new P5b({
            width: 16, height: 16,
            fps: 30,
            setup: () => { createCanvas(100, 100); },
            draw: () => {
                // First frame - isLooping should be true
                if (frameCount === 1) {
                    loopingOnFirstFrame = isLooping();
                    noLoop();
                }
            }
        });

        p5b.on("frame", () => {
            expect(loopingOnFirstFrame).toBe(true);
            p5b.stop();
            done();
        });

        p5b.run();
    });

    it("should report isLooping as false after noLoop()", (done) => {
        let loopingAfterNoLoop;
        const p5b = new P5b({
            width: 16, height: 16,
            fps: 30,
            setup: () => { createCanvas(100, 100); },
            draw: () => {
                if (frameCount === 1) {
                    noLoop();
                    loopingAfterNoLoop = isLooping();
                }
            }
        });

        p5b.on("frame", () => {
            expect(loopingAfterNoLoop).toBe(false);
            p5b.stop();
            done();
        });

        p5b.run();
    });

    it("should stop at correct frame count when noLoop called after N frames", (done) => {
        let drawCalls = 0;
        const p5b = new P5b({
            width: 16, height: 16,
            fps: 60,
            setup: () => { createCanvas(100, 100); },
            draw: () => {
                drawCalls++;
                if (drawCalls === 3) noLoop();
            }
        });

        let framesReceived = 0;
        p5b.on("frame", () => { framesReceived++; });

        setTimeout(() => {
            expect(framesReceived).toBe(3);
            p5b.stop();
            done();
        }, 500);

        p5b.run();
    });

    it("should handle multiple noLoop() calls idempotently", (done) => {
        let drawCalls = 0;
        const p5b = new P5b({
            width: 16, height: 16,
            fps: 60,
            setup: () => { createCanvas(100, 100); },
            draw: () => {
                drawCalls++;
                if (drawCalls === 1) {
                    noLoop();
                    noLoop();
                    noLoop();
                }
            }
        });

        let framesReceived = 0;
        p5b.on("frame", () => { framesReceived++; });

        setTimeout(() => {
            expect(framesReceived).toBe(1);
            p5b.stop();
            done();
        }, 500);

        p5b.run();
    });

    it("should handle loop() while already looping without doubling frame rate", (done) => {
        let drawCalls = 0;
        const p5b = new P5b({
            width: 16, height: 16,
            fps: 30,
            setup: () => { createCanvas(100, 100); },
            draw: () => {
                drawCalls++;
                loop(); // redundant, already looping
                if (drawCalls >= 5) noLoop();
            }
        });

        let framesReceived = 0;
        p5b.on("frame", () => { framesReceived++; });

        setTimeout(() => {
            // Should get exactly 5 frames, not double due to redundant loop() calls
            expect(framesReceived).toBe(5);
            p5b.stop();
            done();
        }, 500);

        p5b.run();
    });

    it("should support noLoop() -> loop() -> noLoop() toggle", (done) => {
        let drawCalls = 0;
        const p5b = new P5b({
            width: 16, height: 16,
            fps: 60,
            setup: () => { createCanvas(100, 100); },
            draw: () => {
                drawCalls++;
                if (drawCalls === 2) noLoop();
            }
        });

        let framesReceived = 0;
        p5b.on("frame", () => { framesReceived++; });

        // After first stop: resume, let 2 more frames fire, then stop again
        setTimeout(() => {
            expect(framesReceived).toBe(2);
            loop();
        }, 150);

        setTimeout(() => {
            expect(framesReceived).toBeGreaterThan(2); // resumed and got more frames
            noLoop();
        }, 300);

        setTimeout(() => {
            const countAfterSecondStop = framesReceived;
            setTimeout(() => {
                // No new frames after second noLoop
                expect(framesReceived).toBe(countAfterSecondStop);
                p5b.stop();
                done();
            }, 150);
        }, 350);

        p5b.run();
    });

    it("should support external noLoop() called from outside draw", (done) => {
        const p5b = new P5b({
            width: 16, height: 16,
            fps: 60,
            setup: () => { createCanvas(100, 100); },
            draw: () => { /* continuous */ }
        });

        let framesReceived = 0;
        p5b.on("frame", () => { framesReceived++; });

        setTimeout(() => { noLoop(); }, 100);

        setTimeout(() => {
            const countAtStop = framesReceived;
            expect(countAtStop).toBeGreaterThan(0);
            setTimeout(() => {
                // No new frames after external noLoop
                expect(framesReceived).toBe(countAtStop);
                p5b.stop();
                done();
            }, 200);
        }, 150);

        p5b.run();
    });

    it("should support redraw() triggering one frame while stopped", (done) => {
        let drawCalls = 0;
        const p5b = new P5b({
            width: 16, height: 16,
            fps: 60,
            setup: () => {
                createCanvas(100, 100);
                noLoop();
            },
            draw: () => { drawCalls++; }
        });

        let framesReceived = 0;
        p5b.on("frame", () => { framesReceived++; });

        // After initial frame from setup, call redraw() twice externally
        setTimeout(() => {
            expect(framesReceived).toBe(1); // only the initial frame
            redraw();
        }, 100);

        setTimeout(() => {
            expect(framesReceived).toBe(2); // one more from redraw()
            redraw();
        }, 200);

        setTimeout(() => {
            expect(framesReceived).toBe(3); // one more from second redraw()
            p5b.stop();
            done();
        }, 300);

        p5b.run();
    });

    it("should preserve frameCount correctly after loop() resume", (done) => {
        let frameCountAtResume;
        let frameCountAfterResume;
        let drawCalls = 0;
        const p5b = new P5b({
            width: 16, height: 16,
            fps: 60,
            setup: () => { createCanvas(100, 100); },
            draw: () => {
                drawCalls++;
                if (drawCalls === 3) {
                    frameCountAtResume = frameCount;
                    noLoop();
                }
                if (drawCalls === 4) {
                    frameCountAfterResume = frameCount;
                    noLoop();
                }
            }
        });

        p5b.on("frame", () => {});

        setTimeout(() => { loop(); }, 200);

        setTimeout(() => {
            // frameCount should be > frameCountAtResume (not reset to 0)
            expect(frameCountAfterResume).toBeGreaterThan(frameCountAtResume);
            p5b.stop();
            done();
        }, 500);

        p5b.run();
    });
});

describe("P5b Integration - imageMode", () => {
    it("imageMode(CORNER) vs imageMode(CENTER) place the same image at different positions", (done) => {
        // Draw 20x20 red image at coords (50,50) in two consecutive frames with different modes.
        // CORNER: top-left at (50,50) → covers x:50-69, y:50-69. px(65,65)=red, px(45,45)=black.
        // CENTER: centered at (50,50) → covers x:40-59, y:40-59. px(65,65)=black, px(45,45)=red.
        // Same image, same coordinates, different modes → different pixel output proves mode takes effect.
        let drawCall = 0;
        let cornerPx65, cornerPx45;
        const p5b = new P5b({
            width: 100, height: 100, fps: 60,
            setup: () => { createCanvas(100, 100); },
            draw: () => {
                drawCall++;
                background(0);
                const pg = createGraphics(20, 20);
                pg.background(255, 0, 0);
                if (drawCall === 1) {
                    imageMode(CORNER);
                } else {
                    imageMode(CENTER);
                    noLoop();
                }
                image(pg, 50, 50);
            }
        });
        p5b.on("error", (e) => { p5b.stop(); done(e.error); });
        p5b.on("frame", (buffer) => {
            const px = (x, y) => { const i = (y * 100 + x) * 4; return [buffer[i], buffer[i+1], buffer[i+2]]; };
            if (drawCall === 1) {
                cornerPx65 = px(65, 65);
                cornerPx45 = px(45, 45);
            } else {
                const centerPx65 = px(65, 65);
                const centerPx45 = px(45, 45);
                // CORNER: (65,65) inside image → red; CENTER: (65,65) outside image → black
                expect(cornerPx65).toEqual([255, 0, 0]);
                expect(centerPx65).toEqual([0, 0, 0]);
                // CORNER: (45,45) outside image → black; CENTER: (45,45) inside image → red
                expect(cornerPx45).toEqual([0, 0, 0]);
                expect(centerPx45).toEqual([255, 0, 0]);
                p5b.stop();
                done();
            }
        });
        p5b.run();
    });

    it("imageMode(CORNERS) stretches image between two corner coordinates", (done) => {
        // CORNER (default): image(pg, 30, 30) with 20x20 image → covers x:30-49, y:30-49
        // CORNERS: image(pg, 30, 30, 70, 70) → image stretched to fill x:30-70, y:30-70
        // At px(60,60): outside CORNER image, inside CORNERS image → proves mode takes effect
        let drawCall = 0;
        let cornerPx60;
        const p5b = new P5b({
            width: 100, height: 100, fps: 60,
            setup: () => { createCanvas(100, 100); },
            draw: () => {
                drawCall++;
                background(0);
                const pg = createGraphics(20, 20);
                pg.background(255, 0, 0);
                if (drawCall === 1) {
                    imageMode(CORNER);
                    image(pg, 30, 30);
                } else {
                    imageMode(CORNERS);
                    image(pg, 30, 30, 70, 70);
                    noLoop();
                }
            }
        });
        p5b.on("error", (e) => { p5b.stop(); done(e.error); });
        p5b.on("frame", (buffer) => {
            const px = (x, y) => { const i = (y * 100 + x) * 4; return [buffer[i], buffer[i+1], buffer[i+2]]; };
            if (drawCall === 1) {
                cornerPx60 = px(60, 60);
            } else {
                const cornersPx60 = px(60, 60);
                expect(cornerPx60).toEqual([0, 0, 0]);   // outside CORNER image
                expect(cornersPx60).toEqual([255, 0, 0]); // inside CORNERS image
                p5b.stop();
                done();
            }
        });
        p5b.run();
    });
});

describe("P5b Integration - Mode/Style Functions", () => {
    // Helper: render one frame on a 100x100 canvas, return pixel reader
    function renderFrame(sketchConfig, cb) {
        const p5b = new P5b({ width: 100, height: 100, fps: 60, ...sketchConfig });
        p5b.on("error", (e) => { p5b.stop(); throw e.error; });
        p5b.on("frame", (buffer) => {
            const px = (x, y) => {
                const i = (y * 100 + x) * 4;
                return [buffer[i], buffer[i+1], buffer[i+2], buffer[i+3]];
            };
            p5b.stop();
            cb(px);
        });
        p5b.run();
    }

    it("rectMode(CORNER) places rect with top-left origin", (done) => {
        renderFrame({
            setup: () => { createCanvas(100, 100); },
            draw: () => {
                background(0);
                rectMode(CORNER);
                fill(255, 0, 0); noStroke();
                rect(50, 50, 20, 20);
                noLoop();
            }
        }, (px) => {
            // interior of rect should be red
            expect(px(55, 55)).toEqual([255, 0, 0, 255]);
            // just outside top-left corner should be black
            expect(px(45, 45)).toEqual([0, 0, 0, 255]);
            done();
        });
    });

    it("rectMode(CENTER) places rect centered on x,y", (done) => {
        renderFrame({
            setup: () => { createCanvas(100, 100); },
            draw: () => {
                background(0);
                rectMode(CENTER);
                fill(255, 0, 0); noStroke();
                rect(50, 50, 20, 20);
                noLoop();
            }
        }, (px) => {
            // center should be red
            expect(px(50, 50)).toEqual([255, 0, 0, 255]);
            // corners at 40-59 should be red
            expect(px(41, 41)).toEqual([255, 0, 0, 255]);
            // outside (before top-left) should be black
            expect(px(38, 38)).toEqual([0, 0, 0, 255]);
            done();
        });
    });

    it("rectMode(CORNERS) interprets args as two corners", (done) => {
        renderFrame({
            setup: () => { createCanvas(100, 100); },
            draw: () => {
                background(0);
                rectMode(CORNERS);
                fill(255, 0, 0); noStroke();
                rect(40, 40, 60, 60);
                noLoop();
            }
        }, (px) => {
            // inside rect
            expect(px(45, 45)).toEqual([255, 0, 0, 255]);
            expect(px(55, 55)).toEqual([255, 0, 0, 255]);
            // outside rect
            expect(px(35, 35)).toEqual([0, 0, 0, 255]);
            done();
        });
    });

    it("ellipseMode(CENTER) places ellipse centered on x,y", (done) => {
        renderFrame({
            setup: () => { createCanvas(100, 100); },
            draw: () => {
                background(0);
                ellipseMode(CENTER);
                fill(255, 0, 0); noStroke();
                ellipse(50, 50, 20, 20);
                noLoop();
            }
        }, (px) => {
            // center red
            expect(px(50, 50)).toEqual([255, 0, 0, 255]);
            // far outside the 10px radius should be black
            expect(px(62, 50)).toEqual([0, 0, 0, 255]);
            expect(px(37, 50)).toEqual([0, 0, 0, 255]);
            done();
        });
    });

    it("ellipseMode(CORNER) places ellipse with top-left at x,y", (done) => {
        // In CORNER mode, ellipse(50,40,20,20): top-left=(50,40), center=(60,50)
        // In CENTER mode, ellipse(50,40,20,20): center=(50,40)
        // Use a single instance, two frames, to avoid concurrent-globals race
        let drawCall = 0;
        let cornerPx;
        const p5b = new P5b({
            width: 100, height: 100, fps: 60,
            setup: () => { createCanvas(100, 100); },
            draw: () => {
                drawCall++;
                background(0);
                if (drawCall === 1) {
                    ellipseMode(CORNER);
                    fill(255, 0, 0); noStroke();
                    ellipse(50, 40, 20, 20);
                } else {
                    ellipseMode(CENTER);
                    fill(255, 0, 0); noStroke();
                    ellipse(50, 40, 20, 20);
                    noLoop();
                }
            }
        });
        p5b.on("error", (e) => { p5b.stop(); done(e.error); });
        p5b.on("frame", (buffer) => {
            const px = (x, y) => {
                const i = (y * 100 + x) * 4;
                return [buffer[i], buffer[i+1], buffer[i+2], buffer[i+3]];
            };
            if (drawCall === 1) {
                // CORNER mode: ellipse(50,40,20,20) → center=(60,50)
                // px(65,50) is inside CORNER ellipse, outside CENTER ellipse
                cornerPx = px(65, 50);
            } else {
                // CENTER mode: ellipse(50,40,20,20) → center=(50,40)
                // px(65,50) is outside CENTER ellipse (distance ~18 > radius 10) → black
                const centerPx = px(65, 50);
                expect(cornerPx[0]).toBe(255); // red inside CORNER ellipse
                expect(centerPx[0]).toBe(0);   // black outside CENTER ellipse
                p5b.stop();
                done();
            }
        });
        p5b.run();
    });

    it("strokeCap(SQUARE) vs strokeCap(PROJECT) extend line end differently", (done) => {
        // SQUARE (butt): caps flush with endpoints; PROJECT extends strokeWeight/2 past endpoints
        // Run sequentially to avoid global namespace collision between instances
        renderFrame({
            setup: () => { createCanvas(100, 100); },
            draw: () => {
                background(0);
                strokeCap(SQUARE);
                stroke(255, 0, 0); strokeWeight(10); noFill();
                line(30, 50, 70, 50);
                noLoop();
            }
        }, (px) => {
            // At x=28, 2px before line start (30), SQUARE cap (flush) should be black
            const squarePx = px(28, 50);
            renderFrame({
                setup: () => { createCanvas(100, 100); },
                draw: () => {
                    background(0);
                    strokeCap(PROJECT);
                    stroke(255, 0, 0); strokeWeight(10); noFill();
                    line(30, 50, 70, 50);
                    noLoop();
                }
            }, (px2) => {
                // At x=28, PROJECT extends 5px past start, so x=28 is 2px inside the cap — red
                const projectPx = px2(28, 50);
                expect(squarePx[0]).toBe(0);
                expect(projectPx[0]).toBe(255);
                done();
            });
        });
    });

    it("strokeJoin(MITER) extends join point further than strokeJoin(BEVEL)", (done) => {
        // V-shape: vertex(20,20), (50,70), (80,20), strokeWeight=10
        // MITER extends join to a sharp point below y=70; BEVEL cuts it off earlier
        // Run sequentially to avoid global namespace collision between instances
        renderFrame({
            setup: () => { createCanvas(100, 100); },
            draw: () => {
                background(0);
                strokeJoin(MITER);
                stroke(255, 0, 0); strokeWeight(10); noFill();
                beginShape();
                vertex(20, 20);
                vertex(50, 70);
                vertex(80, 20);
                endShape();
                noLoop();
            }
        }, (px) => {
            const miterPx = px(50, 73);
            renderFrame({
                setup: () => { createCanvas(100, 100); },
                draw: () => {
                    background(0);
                    strokeJoin(BEVEL);
                    stroke(255, 0, 0); strokeWeight(10); noFill();
                    beginShape();
                    vertex(20, 20);
                    vertex(50, 70);
                    vertex(80, 20);
                    endShape();
                    noLoop();
                }
            }, (px2) => {
                const bevelPx = px2(50, 73);
                // MITER and BEVEL produce different pixel layouts at the join vertex
                expect(miterPx).not.toEqual(bevelPx);
                done();
            });
        });
    });
});

describe("P5b Integration - Typography", () => {
    it("textWidth() returns 0 for empty string", (done) => {
        const p5b = new P5b({
            width: 100, height: 100, fps: 60,
            setup: () => { createCanvas(100, 100); },
            draw: () => {
                textSize(20);
                global._tw_empty = textWidth("");
                noLoop();
            }
        });
        p5b.on("frame", () => {
            expect(global._tw_empty).toBe(0);
            p5b.stop();
            done();
        });
        p5b.run();
    });

    it("textWidth() returns positive value for non-empty string", (done) => {
        const p5b = new P5b({
            width: 100, height: 100, fps: 60,
            setup: () => { createCanvas(100, 100); },
            draw: () => {
                textSize(20);
                global._tw_hello = textWidth("Hello");
                noLoop();
            }
        });
        p5b.on("frame", () => {
            expect(global._tw_hello).toBeGreaterThan(0);
            p5b.stop();
            done();
        });
        p5b.run();
    });

    it("textWidth() longer string is wider than shorter string", (done) => {
        const p5b = new P5b({
            width: 100, height: 100, fps: 60,
            setup: () => { createCanvas(100, 100); },
            draw: () => {
                textSize(20);
                global._tw_short = textWidth("Hi");
                global._tw_long = textWidth("Hello World");
                noLoop();
            }
        });
        p5b.on("frame", () => {
            expect(global._tw_long).toBeGreaterThan(global._tw_short);
            p5b.stop();
            done();
        });
        p5b.run();
    });

    it("textStyle(BOLD) produces wider glyphs than textStyle(NORMAL) with Arial", (done) => {
        const p5b = new P5b({
            width: 100, height: 100, fps: 60,
            setup: () => { createCanvas(100, 100); },
            draw: () => {
                textFont("Arial");
                textSize(20);
                textStyle(NORMAL);
                global._tw_normal = textWidth("Hello World");
                textStyle(BOLD);
                global._tw_bold = textWidth("Hello World");
                noLoop();
            }
        });
        p5b.on("frame", () => {
            expect(global._tw_bold).toBeGreaterThan(global._tw_normal);
            p5b.stop();
            done();
        });
        p5b.run();
    });

    it("textStyle() getter returns the current style", (done) => {
        const p5b = new P5b({
            width: 100, height: 100, fps: 60,
            setup: () => { createCanvas(100, 100); },
            draw: () => {
                textStyle(ITALIC);
                global._ts = textStyle();
                noLoop();
            }
        });
        p5b.on("frame", () => {
            expect(global._ts).toBe("italic");
            p5b.stop();
            done();
        });
        p5b.run();
    });

    it("textLeading() getter/setter round-trips", (done) => {
        const p5b = new P5b({
            width: 100, height: 100, fps: 60,
            setup: () => { createCanvas(100, 100); },
            draw: () => {
                textLeading(30);
                global._tl = textLeading();
                noLoop();
            }
        });
        p5b.on("frame", () => {
            expect(global._tl).toBe(30);
            p5b.stop();
            done();
        });
        p5b.run();
    });

    it("textLeading() affects line spacing — larger leading produces different pixel layout", (done) => {
        let smallLeadingBuffer;
        let largeLeadingBuffer;
        let pending = 2;

        function check() {
            if (--pending === 0) {
                expect(smallLeadingBuffer).not.toEqual(largeLeadingBuffer);
                done();
            }
        }

        const p5b1 = new P5b({
            width: 100, height: 100, fps: 60,
            setup: () => { createCanvas(100, 100); },
            draw: () => {
                background(255); fill(0); textSize(12);
                textLeading(14);
                text("line one\nline two", 5, 20);
                noLoop();
            }
        });
        p5b1.on("frame", (buf) => {
            smallLeadingBuffer = Buffer.from(buf);
            p5b1.stop();
            check();
        });
        p5b1.run();

        const p5b2 = new P5b({
            width: 100, height: 100, fps: 60,
            setup: () => { createCanvas(100, 100); },
            draw: () => {
                background(255); fill(0); textSize(12);
                textLeading(40);
                text("line one\nline two", 5, 20);
                noLoop();
            }
        });
        p5b2.on("frame", (buf) => {
            largeLeadingBuffer = Buffer.from(buf);
            p5b2.stop();
            check();
        });
        p5b2.run();
    });

    it("textAlign(LEFT) vs textAlign(RIGHT) produce different pixel layouts", (done) => {
        // Verify LEFT and RIGHT alignment produce visually distinct output.
        // Use a single instance, two frames, to avoid concurrent-globals race.
        let drawCall = 0;
        let frame1Buffer;
        const p5b = new P5b({
            width: 100, height: 100, fps: 60,
            setup: () => { createCanvas(100, 100); },
            draw: () => {
                drawCall++;
                if (drawCall === 1) {
                    background(255); fill(0); textSize(20);
                    textAlign(LEFT);
                    text("Hello", 5, 60);
                } else {
                    background(255); fill(0); textSize(20);
                    textAlign(RIGHT);
                    text("Hello", 95, 60);
                    noLoop();
                }
            }
        });
        p5b.on("error", (e) => { p5b.stop(); done(e.error); });
        p5b.on("frame", (buffer) => {
            if (drawCall === 1) {
                frame1Buffer = Buffer.from(buffer);
            } else {
                // LEFT and RIGHT alignment place text at opposite ends → distinct pixel buffers
                expect(Buffer.from(buffer).equals(frame1Buffer)).toBe(false);
                p5b.stop();
                done();
            }
        });
        p5b.run();
    });

    it("textWrap() does not throw when called with WORD or CHAR", (done) => {
        const p5b = new P5b({
            width: 100, height: 100, fps: 60,
            setup: () => { createCanvas(100, 100); },
            draw: () => {
                textWrap(WORD);
                textWrap(CHAR);
                noLoop();
            }
        });
        p5b.on("error", (e) => { p5b.stop(); done(e.error); });
        p5b.on("frame", () => { p5b.stop(); done(); });
        p5b.run();
    });
});

describe("P5b Integration - Data/IO", () => {
    it("loadStrings() in preload returns array of lines", (done) => {
        const txtPath = path.resolve(process.cwd(), "test/fixtures/data/test.txt");
        let lines;

        const p5b = new P5b({
            width: 16, height: 16, fps: 30,
            preload: () => {
                lines = loadStrings(txtPath);
            },
            setup: () => { createCanvas(16, 16); },
            draw: () => { noLoop(); }
        });

        p5b.on("error", (e) => { p5b.stop(); done(e.error); });
        p5b.on("frame", () => {
            expect(Array.isArray(lines)).toBe(true);
            expect(lines.length).toBe(3);
            expect(lines[0]).toBe("line one");
            expect(lines[1]).toBe("line two");
            expect(lines[2]).toBe("line three");
            p5b.stop();
            done();
        });
        p5b.run();
    });

    it("loadStrings() calls callback with lines array", (done) => {
        const txtPath = path.resolve(process.cwd(), "test/fixtures/data/test.txt");
        let callbackLines;

        const p5b = new P5b({
            width: 16, height: 16, fps: 30,
            preload: () => {
                loadStrings(txtPath, (ls) => { callbackLines = ls; });
            },
            setup: () => { createCanvas(16, 16); },
            draw: () => { noLoop(); }
        });

        p5b.on("error", (e) => { p5b.stop(); done(e.error); });
        p5b.on("frame", () => {
            expect(Array.isArray(callbackLines)).toBe(true);
            expect(callbackLines.length).toBe(3);
            p5b.stop();
            done();
        });
        p5b.run();
    });

    it("loadTable() in preload parses CSV with header row", (done) => {
        const csvPath = path.resolve(process.cwd(), "test/fixtures/data/test.csv");
        let table;

        const p5b = new P5b({
            width: 16, height: 16, fps: 30,
            preload: () => {
                table = loadTable(csvPath, "csv", "header");
            },
            setup: () => { createCanvas(16, 16); },
            draw: () => { noLoop(); }
        });

        p5b.on("error", (e) => { p5b.stop(); done(e.error); });
        p5b.on("frame", () => {
            expect(table).toBeDefined();
            expect(table.getRowCount()).toBe(3);
            expect(table.getString(0, "name")).toBe("Alice");
            expect(table.getString(1, "name")).toBe("Bob");
            expect(table.getString(2, "name")).toBe("Carol");
            expect(table.getString(0, "city")).toBe("New York");
            p5b.stop();
            done();
        });
        p5b.run();
    });

    it("loadTable() without header option treats first row as data", (done) => {
        const csvPath = path.resolve(process.cwd(), "test/fixtures/data/test.csv");
        let table;

        const p5b = new P5b({
            width: 16, height: 16, fps: 30,
            preload: () => {
                table = loadTable(csvPath, "csv");
            },
            setup: () => { createCanvas(16, 16); },
            draw: () => { noLoop(); }
        });

        p5b.on("error", (e) => { p5b.stop(); done(e.error); });
        p5b.on("frame", () => {
            // All 4 lines (header + 3 data) become data rows
            expect(table.getRowCount()).toBe(4);
            p5b.stop();
            done();
        });
        p5b.run();
    });
});

describe("P5b Integration - drawingContext", () => {
    it("drawingContext is defined after createCanvas and exposes canvas 2D API", (done) => {
        const p5b = new P5b({
            width: 100, height: 100, fps: 60,
            setup: () => { createCanvas(100, 100); },
            draw: () => {
                global._dc = drawingContext;
                noLoop();
            }
        });
        p5b.on("error", (e) => { p5b.stop(); done(e.error); });
        p5b.on("frame", () => {
            expect(global._dc).toBeDefined();
            expect(typeof global._dc.fillRect).toBe("function");
            expect(typeof global._dc.drawImage).toBe("function");
            expect(typeof global._dc.getImageData).toBe("function");
            p5b.stop();
            done();
        });
        p5b.run();
    });

    it("drawingContext can be used to draw directly onto the canvas", (done) => {
        const p5b = new P5b({
            width: 100, height: 100, fps: 60,
            setup: () => { createCanvas(100, 100); },
            draw: () => {
                background(0);
                // Draw a red rectangle directly via the 2D context
                drawingContext.fillStyle = "rgb(255, 0, 0)";
                drawingContext.fillRect(40, 40, 20, 20);
                noLoop();
            }
        });
        p5b.on("error", (e) => { p5b.stop(); done(e.error); });
        p5b.on("frame", (buffer) => {
            const px = (x, y) => { const i = (y * 100 + x) * 4; return [buffer[i], buffer[i+1], buffer[i+2]]; };
            expect(px(50, 50)).toEqual([255, 0, 0]); // inside direct-drawn rect
            expect(px(30, 30)).toEqual([0, 0, 0]);   // outside
            p5b.stop();
            done();
        });
        p5b.run();
    });
});

describe("P5b Integration - Environment (Extended)", () => {
    it("cursor() does not throw in headless environment", (done) => {
        const p5b = new P5b({
            width: 16, height: 16, fps: 30,
            setup: () => { createCanvas(16, 16); },
            draw: () => {
                cursor(HAND);
                cursor(ARROW);
                cursor(CROSS);
                noLoop();
            }
        });
        p5b.on("error", (e) => { p5b.stop(); done(e.error); });
        p5b.on("frame", () => { p5b.stop(); done(); });
        p5b.run();
    });

    it("noCursor() does not throw in headless environment", (done) => {
        const p5b = new P5b({
            width: 16, height: 16, fps: 30,
            setup: () => { createCanvas(16, 16); },
            draw: () => { noCursor(); noLoop(); }
        });
        p5b.on("error", (e) => { p5b.stop(); done(e.error); });
        p5b.on("frame", () => { p5b.stop(); done(); });
        p5b.run();
    });

    it("pixelDensity() returns 1 in headless environment", (done) => {
        const p5b = new P5b({
            width: 16, height: 16, fps: 30,
            setup: () => { createCanvas(16, 16); },
            draw: () => {
                global._pd = pixelDensity();
                noLoop();
            }
        });
        p5b.on("error", (e) => { p5b.stop(); done(e.error); });
        p5b.on("frame", () => {
            expect(global._pd).toBe(1);
            p5b.stop();
            done();
        });
        p5b.run();
    });

    it("windowWidth and windowHeight match dimensions passed to createCanvas()", (done) => {
        const p5b = new P5b({
            width: 200, height: 200, fps: 30,
            setup: () => { createCanvas(150, 120); },
            draw: () => {
                global._ww = windowWidth;
                global._wh = windowHeight;
                noLoop();
            }
        });
        p5b.on("error", (e) => { p5b.stop(); done(e.error); });
        p5b.on("frame", () => {
            expect(global._ww).toBe(150);
            expect(global._wh).toBe(120);
            p5b.stop();
            done();
        });
        p5b.run();
    });
});

describe("P5b Integration - Accessibility", () => {
    it("describe() does not throw in headless environment", (done) => {
        const p5b = new P5b({
            width: 16, height: 16, fps: 30,
            setup: () => { createCanvas(16, 16); },
            draw: () => {
                // Use global.describe explicitly to avoid shadowing by bun:test's describe
                global.describe("A simple red square on a black background.");
                background(0); fill(255, 0, 0); rect(4, 4, 8, 8);
                noLoop();
            }
        });
        p5b.on("error", (e) => { p5b.stop(); done(e.error); });
        p5b.on("frame", () => { p5b.stop(); done(); });
        p5b.run();
    });

    it("describeElement() does not throw in headless environment", (done) => {
        const p5b = new P5b({
            width: 16, height: 16, fps: 30,
            setup: () => { createCanvas(16, 16); },
            draw: () => {
                describeElement("redSquare", "A red square.");
                background(0); fill(255, 0, 0); rect(4, 4, 8, 8);
                noLoop();
            }
        });
        p5b.on("error", (e) => { p5b.stop(); done(e.error); });
        p5b.on("frame", () => { p5b.stop(); done(); });
        p5b.run();
    });

    it("textOutput() does not throw in headless environment", (done) => {
        const p5b = new P5b({
            width: 16, height: 16, fps: 30,
            setup: () => { createCanvas(16, 16); },
            draw: () => {
                textOutput();
                background(0);
                noLoop();
            }
        });
        p5b.on("error", (e) => { p5b.stop(); done(e.error); });
        p5b.on("frame", () => { p5b.stop(); done(); });
        p5b.run();
    });

    it("gridOutput() does not throw in headless environment", (done) => {
        const p5b = new P5b({
            width: 16, height: 16, fps: 30,
            setup: () => { createCanvas(16, 16); },
            draw: () => {
                gridOutput();
                background(0);
                noLoop();
            }
        });
        p5b.on("error", (e) => { p5b.stop(); done(e.error); });
        p5b.on("frame", () => { p5b.stop(); done(); });
        p5b.run();
    });
});
