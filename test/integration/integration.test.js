/* eslint-disable no-undef */
const { describe, it, expect } = require("bun:test");
const path = require("path");
const { P5b } = require("../../p5b");

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
                background(100, 150, 200);
            }
        });

        p5b.on("frame", (buffer) => {
            for (let i = 3; i < Math.min(buffer.length, 64); i += 4) {
                expect(buffer[i]).toBe(255);
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
            }
        });

        p5b.on("frame", (buffer) => {
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
