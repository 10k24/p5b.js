const { describe, it, expect } = require("bun:test");
const path = require("path");
const { P5b, P5B_DEFAULTS } = require("../p5b.js");
const { P5bBase } = require("../lib/p5b-base");

const isP5v2 = (process.env.P5B_P5_PATH || "p5") !== "p5";

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

describe("P5b p5Version", () => {
    it("reports the p5 version the adapter targets", () => {
        const p5b = new P5b({});
        expect(p5b.p5Version).toBe(isP5v2 ? 2 : 1);
    });

    it("is set by the adapter and not overridable via config", () => {
        const p5b = new P5b({ p5Version: 99 });
        expect(p5b.p5Version).toBe(isP5v2 ? 2 : 1);
    });

    it("rejects an invalid p5Version at the base validation layer", () => {
        expect(() => new P5bBase({ p5Version: 99 })).toThrow("Invalid config: p5Version must be 1 or 2.");
        expect(() => new P5bBase({ p5Version: "2" })).toThrow("Invalid config: p5Version must be 1 or 2.");
    });
});

describe("P5B_DEFAULTS shape", () => {
    it("should have all required default properties", () => {
        expect(P5B_DEFAULTS).toHaveProperty("sketchPath");
        expect(P5B_DEFAULTS).toHaveProperty("width");
        expect(P5B_DEFAULTS).toHaveProperty("height");
        expect(P5B_DEFAULTS).toHaveProperty("fps");
        expect(P5B_DEFAULTS).toHaveProperty("setup");
        expect(P5B_DEFAULTS).toHaveProperty("draw");
    });

    it("should have valid default values", () => {
        expect(P5B_DEFAULTS.sketchPath).toBeNull();
        expect(P5B_DEFAULTS.width).toBe(32);
        expect(P5B_DEFAULTS.height).toBe(32);
        expect(P5B_DEFAULTS.fps).toBe(60);
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

    it.skipIf(isP5v2)("should reject non-function preload", () => {
        expect(() => new P5b({ preload: "not a function" })).toThrow("preload must be a function");
    });

    it.skipIf(!isP5v2)("should reject any preload config", () => {
        expect(() => new P5b({ preload: () => {} })).toThrow("preload is not supported in p5.js v2");
    });

    it("should reject non-function setup", () => {
        expect(() => new P5b({ setup: 42 })).toThrow("setup must be a function");
    });

    it("should reject non-function draw", () => {
        expect(() => new P5b({ draw: {} })).toThrow("draw must be a function");
    });

    it.skipIf(isP5v2)("should reject async setup", () => {
        expect(() => new P5b({ setup: async () => {} })).toThrow("async/await is not supported in p5.js v1");
    });

    it.skipIf(isP5v2)("should reject async draw", () => {
        expect(() => new P5b({ draw: async () => {} })).toThrow("async/await is not supported in p5.js v1");
    });

    it.skipIf(isP5v2)("should reject async preload", () => {
        expect(() => new P5b({ preload: async () => {} })).toThrow("async/await is not supported in p5.js v1");
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

        expect(() => p5b.toFrame()).toThrow();
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
    it("should track error count in metrics", async () => {
        const p5b = new P5b({
            width: 32, height: 32,
            fps: 30,
            setup: () => { createCanvas(64, 64); },
            draw: () => { throw new Error("Test draw error"); }
        });

        await new Promise((resolve) => {
            p5b.on("error", resolve);
            p5b.run();
        });

        const metrics = p5b.getMetrics();
        p5b.stop();

        expect(metrics.errors).toBe(1);
    });

    it.skipIf(isP5v2)("should emit error event when preload throws", (done) => {
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

        // loadFont is synchronous in p5 v1, async in p5 v2. v1 rejects async setup,
        // so select the matching setup form for the active adapter.
        const setup = isP5v2
            ? async () => { createCanvas(64, 64); loadedFont = await loadFont(fontPath); }
            : () => { createCanvas(64, 64); loadedFont = loadFont(fontPath); };

        const p5b = new P5b({
            width: 32, height: 32,
            setup,
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
        const setup = isP5v2
            ? async () => {
                createCanvas(64, 64);
                try {
                    await loadFont("/nonexistent/path/to/font.ttf");
                } catch (error) {
                    expect(error.message).toContain("Failed to load font");
                    expect(error.message).toContain("file not found");
                }
            }
            : () => {
                createCanvas(64, 64);
                try {
                    loadFont("/nonexistent/path/to/font.ttf");
                } catch (error) {
                    expect(error.message).toContain("Failed to load font");
                    expect(error.message).toContain("file not found");
                }
            };

        const p5b = new P5b({
            width: 32, height: 32,
            setup,
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

    it("should reset graphics state on pool checkout", (done) => {
        let frameCount = 0;
        const p5b = new P5b({
            width: 32, height: 32,
            setup: () => { createCanvas(64, 64); },
            draw: () => {
                if (frameCount === 0) {
                    const pg = createGraphics(25, 25);
                    pg.fill(0, 0, 255);
                    pg.stroke(255, 0, 0);
                    pg.translate(10, 10);
                    pg.remove();
                }
                if (frameCount === 1) {
                    const pg = createGraphics(25, 25);
                    // After clear(), all pixels should be transparent
                    const pixels = pg.get(0, 0);
                    expect(pixels[0]).toBe(0);
                    expect(pixels[1]).toBe(0);
                    expect(pixels[2]).toBe(0);
                    expect(pixels[3]).toBe(0);
                    pg.remove();
                    p5b.stop();
                    done();
                }
            }
        });

        p5b.on("frame", () => { frameCount++; });
        p5b.run();
    });

    it("should cap bucket size at maxPoolSize", (done) => {
        let frameCount = 0;
        const p5b = new P5b({
            width: 32, height: 32,
            maxPoolSize: 4,
            setup: () => { createCanvas(64, 64); },
            draw: () => {
                if (frameCount === 0) {
                    // Create all distinct graphics first, then remove them all, so the pool
                    // fills with 5 distinct objects (capped at maxPoolSize). Removing each as
                    // it's created would instead reuse a single pooled object.
                    const pgs = [];
                    for (let i = 0; i < 5; i++) pgs.push(createGraphics(20, 20));
                    pgs.forEach((pg) => pg.remove());
                }
            }
        });

        p5b.on("frame", () => {
            frameCount++;
            if (frameCount === 1) {
                const pool = p5b._gfxPool.get("20:20");
                expect(pool).toBeDefined();
                expect(pool.length).toBe(4);
                p5b.stop();
                done();
            }
        });
        p5b.run();
    });

    it("should throw on invalid maxPoolSize", () => {
        expect(() => new P5b({ maxPoolSize: -1 })).toThrow("maxPoolSize must be a number >= 0");
        expect(() => new P5b({ maxPoolSize: "foo" })).toThrow("maxPoolSize must be a number >= 0");
    });
});
