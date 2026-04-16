const { describe, it, expect } = require("bun:test");
const path = require("path");
const { P5b, P5B_DEFAULTS } = require("../p5b.js");

describe("P5b Exports", () => {
    it("should export P5b class", () => {
        expect(P5b).toBeDefined();
    });

    it("should export P5B_DEFAULTS", () => {
        expect(P5B_DEFAULTS).toBeDefined();
        expect(P5B_DEFAULTS.width).toBe(32);
        expect(P5B_DEFAULTS.height).toBe(32);
        expect(P5B_DEFAULTS.fps).toBe(60);
    });
});

describe("P5b API Surface", () => {
    it("should have public methods", () => {
        expect(typeof P5b.prototype.run).toBe("function");
        expect(typeof P5b.prototype.stop).toBe("function");
        expect(typeof P5b.prototype.toFrame).toBe("function");
        expect(typeof P5b.prototype.getMetrics).toBe("function");
    });

    it("should be an EventEmitter", () => {
        expect(typeof P5b.prototype.on).toBe("function");
        expect(typeof P5b.prototype.emit).toBe("function");
        expect(typeof P5b.prototype.listenerCount).toBe("function");
    });
});

describe("P5B_DEFAULTS shape", () => {
    it("should have all required default properties", () => {
        expect(P5B_DEFAULTS).toHaveProperty("sketchPath");
        expect(P5B_DEFAULTS).toHaveProperty("width");
        expect(P5B_DEFAULTS).toHaveProperty("height");
        expect(P5B_DEFAULTS).toHaveProperty("fps");
        expect(P5B_DEFAULTS).toHaveProperty("preload");
        expect(P5B_DEFAULTS).toHaveProperty("setup");
        expect(P5B_DEFAULTS).toHaveProperty("draw");
    });

    it("should have valid default values", () => {
        expect(P5B_DEFAULTS.sketchPath).toBeNull();
        expect(P5B_DEFAULTS.width).toBe(32);
        expect(P5B_DEFAULTS.height).toBe(32);
        expect(P5B_DEFAULTS.fps).toBe(60);
        expect(typeof P5B_DEFAULTS.preload).toBe("function");
        expect(typeof P5B_DEFAULTS.setup).toBe("function");
        expect(typeof P5B_DEFAULTS.draw).toBe("function");
    });
});

describe("P5b Configuration Validation", () => {
    it("should reject invalid fps values", () => {
        expect(() => new P5b({ fps: 0 })).toThrow("fps must be a positive number");
        expect(() => new P5b({ fps: -1 })).toThrow("fps must be a positive number");
        expect(() => new P5b({ fps: Infinity })).toThrow("fps must be a positive number");
        expect(() => new P5b({ fps: NaN })).toThrow("fps must be a positive number");
    });

    it("should reject invalid width values", () => {
        expect(() => new P5b({ width: 0 })).toThrow("width must be a positive integer");
        expect(() => new P5b({ width: -10 })).toThrow("width must be a positive integer");
        expect(() => new P5b({ width: 3.14 })).toThrow("width must be a positive integer");
    });

    it("should reject invalid height values", () => {
        expect(() => new P5b({ height: 0 })).toThrow("height must be a positive integer");
        expect(() => new P5b({ height: -10 })).toThrow("height must be a positive integer");
        expect(() => new P5b({ height: 3.14 })).toThrow("height must be a positive integer");
    });

    it("should reject non-function preload", () => {
        expect(() => new P5b({ preload: "not a function" })).toThrow("preload must be a function");
    });

    it("should reject non-function setup", () => {
        expect(() => new P5b({ setup: 42 })).toThrow("setup must be a function");
    });

    it("should reject non-function draw", () => {
        expect(() => new P5b({ draw: {} })).toThrow("draw must be a function");
    });
});

describe("P5b Instance Management", () => {
    it("should throw if run() is called after remove()", (done) => {
        const p5b = new P5b({
            width: 32, height: 32,
            setup: () => { createCanvas(64, 64); },
            draw: () => { background(0); }
        });

        p5b.on("frame", () => {
            p5b.remove();
            expect(() => p5b.run()).toThrow("removed");
            done();
        });

        p5b.run();
    });

    it("should properly cleanup when removed", (done) => {
        const p5b = new P5b({
            width: 32, height: 32,
            setup: () => { createCanvas(64, 64); },
            draw: () => { background(255); }
        });

        p5b.on("frame", () => {
            p5b.remove();

            // After remove, internal state should be cleared
            expect(p5b._myP5).toBeNull();
            expect(p5b._destCanvas).toBeNull();
            expect(p5b._gfxActive.length).toBe(0);
            expect(p5b._gfxPool.size).toBe(0);
            done();
        });

        p5b.run();
    });

    it("should throw toFrame error when canvas not initialized", () => {
        const p5b = new P5b({
            width: 32, height: 32,
            setup: () => { createCanvas(64, 64); },
            draw: () => { background(0); }
        });

        expect(() => p5b.toFrame()).toThrow("Canvas not initialized");
    });

    it("should handle toFrame with cached canvas efficiently", (done) => {
        const p5b = new P5b({
            width: 32, height: 32,
            setup: () => { createCanvas(64, 64); },
            draw: () => { background(100, 150, 200); }
        });

        let frameCount = 0;
        p5b.on("frame", (buffer) => {
            frameCount++;
            if (frameCount === 1) {
                // First frame establishes cache
                expect(p5b._destCanvas).toBeDefined();
                const cachedCanvas = p5b._destCanvas;
                
                // Second frame should reuse same canvas
                p5b.toFrame();
                expect(p5b._destCanvas).toBe(cachedCanvas);
                
                p5b.stop();
                done();
            }
        });

        p5b.run();
    });
});

describe("P5b Error Handling", () => {
    it("should track error count in metrics", (done) => {
        const p5b = new P5b({
            width: 32, height: 32,
            fps: 30,
            setup: () => { createCanvas(64, 64); },
            draw: () => { throw new Error("Test draw error"); }
        });

        let errorCount = 0;
        p5b.on("error", (evt) => {
            errorCount++;
            if (errorCount === 1) {
                const metrics = p5b.getMetrics();
                expect(metrics.errors).toBeGreaterThan(0);
                p5b.stop();
                done();
            }
        });

        p5b.run();
    });

    it("should emit error event when preload throws", (done) => {
        const p5b = new P5b({
            width: 32, height: 32,
            fps: 30,
            preload: () => { throw new Error("Preload error"); },
            setup: () => { createCanvas(64, 64); },
            draw: () => { background(0); }
        });

        p5b.on("error", (evt) => {
            expect(evt.phase).toBe("preload");
            expect(evt.error).toBeDefined();
            p5b.stop();
            done();
        });

        p5b.run();
    });
});

describe("P5b Global Bindings", () => {
    it("should bind all p5 methods and properties to global", (done) => {
        const p5b = new P5b({
            width: 32, height: 32,
            setup: () => {
                createCanvas(64, 64);
                // Verify p5 properties are accessible globally
                expect(typeof fill).toBe("function");
                expect(typeof stroke).toBe("function");
                expect(typeof rect).toBe("function");
                expect(typeof circle).toBe("function");
                expect(typeof background).toBe("function");
                expect(typeof frameCount).toBe("number");
                expect(typeof width).toBe("number");
                expect(typeof height).toBe("number");
            },
            draw: () => { background(100); }
        });

        p5b.on("frame", () => {
            p5b.stop();
            done();
        });

        p5b.run();
    });

    it("should throw when loadFont is called with non-existent path", (done) => {
        const p5b = new P5b({
            width: 32, height: 32,
            setup: () => {
                createCanvas(64, 64);
                expect(() => loadFont("/nonexistent/path/to/font.ttf")).toThrow();
            },
            draw: () => { background(100); }
        });

        p5b.on("frame", () => {
            p5b.stop();
            done();
        });

        p5b.run();
    });

    it("should load a valid font file successfully", (done) => {
        const fontPath = path.join(process.cwd(), "test/fixtures/font/SourceCodePro-Regular.ttf");
        let loadedFont = null;

        const p5b = new P5b({
            width: 32, height: 32,
            setup: () => {
                createCanvas(64, 64);
                loadedFont = loadFont(fontPath);
            },
            draw: () => { background(100); }
        });

        p5b.on("frame", () => {
            expect(loadedFont).toBeDefined();
            expect(loadedFont.font).toBeDefined();
            expect(loadedFont.font.names).toBeDefined();
            p5b.stop();
            done();
        });

        p5b.run();
    });

    it("should throw with friendly message when font file not found", (done) => {
        const p5b = new P5b({
            width: 32, height: 32,
            setup: () => {
                createCanvas(64, 64);
                try {
                    loadFont("/nonexistent/path/to/font.ttf");
                } catch (error) {
                    expect(error.message).toContain("Failed to load font");
                    expect(error.message).toContain("file not found");
                }
            },
            draw: () => { background(100); }
        });

        p5b.on("frame", () => {
            p5b.stop();
            done();
        });

        p5b.run();
    });

    it("should track graphics in pool after removal", (done) => {
        let frameCount = 0;
        const p5b = new P5b({
            width: 32, height: 32,
            setup: () => { createCanvas(64, 64); },
            draw: () => {
                if (frameCount === 0) {
                    const pg1 = createGraphics(20, 20);
                    const pg2 = createGraphics(20, 20);
                    const pg3 = createGraphics(30, 30);
                    
                    // Remove them to return to pool
                    pg1.remove();
                    pg2.remove();
                    pg3.remove();
                }
            }
        });

        p5b.on("frame", () => {
            frameCount++;
            if (frameCount === 1) {
                // After first frame, graphics should be in pool
                const pool20x20 = p5b._gfxPool.get("20:20");
                const pool30x30 = p5b._gfxPool.get("30:30");
                
                expect(pool20x20).toBeDefined();
                expect(pool20x20.length).toBe(2);
                expect(pool30x30).toBeDefined();
                expect(pool30x30.length).toBe(1);
                
                p5b.stop();
                done();
            }
        });

        p5b.run();
    });
});
