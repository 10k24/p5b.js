const { describe, it, expect } = require("bun:test");
const { P5b } = require("../p5b.js");
const fs = require("fs");
const path = require("path");
const { findP5Version } = require("../lib/globals");

const isP5v2 = findP5Version() === 2;

describe("API Compatibility: loadJSON", () => {
    it.skipIf(isP5v2)("should load local JSON file", (done) => {
        const testJsonPath = path.join(process.cwd(), "test-data.json");
        fs.writeFileSync(testJsonPath, JSON.stringify({ foo: "bar", value: 123 }));
        let loaded = null;
        const p5b = new P5b({
            preload: function() {
                // p5 v1 idiom: returns a data object synchronously, populated before setup.
                loaded = loadJSON(testJsonPath);
            },
            setup: function() {},
            draw: function() {}
        });
        p5b.on("frame", () => {
            expect(loaded).toBeDefined();
            expect(loaded.foo).toBe("bar");
            expect(loaded.value).toBe(123);
            fs.unlinkSync(testJsonPath);
            p5b.stop();
            done();
        });
        p5b.run();
    });

    it.skipIf(isP5v2)("should report missing file via errorCallback", (done) => {
        let error = null;
        const p5b = new P5b({
            preload: function() {
                loadJSON(path.join(process.cwd(), "does-not-exist.json"), null, (e) => { error = e; });
            },
            setup: function() {},
            draw: function() {}
        });
        p5b.on("frame", () => {
            expect(error).toBeDefined();
            expect(
                /Failed to load JSON|Error loading JSON|ENOENT/.test(error.message)
            ).toBe(true);
            p5b.stop();
            done();
        });
        p5b.run();
    });
});

describe("API Compatibility: Noop Functions", () => {
    it("should not throw for saveCanvas, saveJSON, print", (done) => {
        const p5b = new P5b({
            setup: function() {
                expect(() => saveCanvas()).not.toThrow();
                expect(() => saveJSON({ a: 1 }, "file.json")).not.toThrow();
                expect(() => print("hello")).not.toThrow();
            },
            draw: function() {}
        });
        p5b.on("frame", () => { p5b.stop(); done(); });
        p5b.run();
    });

    it("should not throw for event handler noops", (done) => {
        const p5b = new P5b({
            setup: function() {
                expect(() => mousePressed()).not.toThrow();
                expect(() => keyPressed()).not.toThrow();
                expect(() => touchStarted()).not.toThrow();
            },
            draw: function() {}
        });
        p5b.on("frame", () => { p5b.stop(); done(); });
        p5b.run();
    });
});

describe("API Compatibility: Mouse/Keyboard Properties", () => {
    it("should provide default values for mouse/keyboard globals", (done) => {
        const p5b = new P5b({
            setup: function() {
                expect(mouseX).toBe(0);
                expect(mouseY).toBe(0);
                expect(key).toBe("");
                expect(keyCode).toBe(0);
                expect(accelerationX).toBe(0);
                expect(accelerationY).toBe(0);
                expect(accelerationZ).toBe(0);
            },
            draw: function() {}
        });
        p5b.on("frame", () => { p5b.stop(); done(); });
        p5b.run();
    });
});

describe("API Compatibility: loadImage", () => {
    it.skipIf(isP5v2)("should load a local image file", (done) => {
        const testImagePath = path.join(process.cwd(), "test/fixtures/img", "natalie-kinnear-CC2Bfvk2-tU-unsplash.jpg");
        let loadedImg = null;
        const p5b = new P5b({
            preload: function() {
                loadedImg = loadImage(testImagePath);
            },
            setup: function() {},
            draw: function() {}
        });
        p5b.on("frame", () => {
            expect(loadedImg).toBeDefined();
            expect(loadedImg.width).toBeGreaterThan(0);
            expect(loadedImg.height).toBeGreaterThan(0);
            p5b.stop();
            done();
        });
        p5b.run();
    });

    it.skipIf(isP5v2)("should load a local PNG file with correct pixel data", (done) => {
        const testImagePath = path.join(process.cwd(), "test/fixtures/img", "test-red-pixel.png");
        let loadedImg = null;
        const p5b = new P5b({
            preload: function() {
                loadedImg = loadImage(testImagePath);
            },
            setup: function() {},
            draw: function() {}
        });
        p5b.on("frame", () => {
            expect(loadedImg).toBeDefined();
            expect(loadedImg.width).toBe(4);
            expect(loadedImg.height).toBe(4);
            // Verify top-left pixel is red — catches buffer corruption and async load bugs
            loadedImg.loadPixels();
            expect(loadedImg.pixels[0]).toBe(255); // R
            expect(loadedImg.pixels[1]).toBe(0);   // G
            expect(loadedImg.pixels[2]).toBe(0);   // B
            expect(loadedImg.pixels[3]).toBe(255); // A
            p5b.stop();
            done();
        });
        p5b.run();
    });

    it.skipIf(isP5v2)("should call failureCallback on missing image file", (done) => {
        let error = null;
        const p5b = new P5b({
            preload: function() {
                loadImage("does-not-exist.jpg", null, function(err) { error = err; });
            },
            setup: function() {},
            draw: function() {}
        });
        p5b.on("frame", () => {
            expect(error).toBeDefined();
            expect(/Failed to load image|ENOENT/.test(error.message)).toBe(true);
            p5b.stop();
            done();
        });
        p5b.run();
    });

    it.skipIf(!isP5v2)("v2: await loadImage() returns a valid p5.Image", (done) => {
        const testImagePath = path.join(process.cwd(), "test/fixtures/img", "test-red-pixel.png");
        let loadedImg = null;
        const p5b = new P5b({
            setup: async () => {
                loadedImg = await loadImage(testImagePath);
            },
            draw: () => {}
        });
        p5b.on("frame", () => {
            expect(loadedImg).toBeDefined();
            expect(loadedImg.width).toBe(4);
            expect(loadedImg.height).toBe(4);
            loadedImg.loadPixels();
            expect(loadedImg.pixels[0]).toBe(255);
            expect(loadedImg.pixels[1]).toBe(0);
            expect(loadedImg.pixels[2]).toBe(0);
            expect(loadedImg.pixels[3]).toBe(255);
            p5b.stop();
            done();
        });
        p5b.run();
    });

    it.skipIf(!isP5v2)("v2: async draw() completes before frame emits", (done) => {
        let drawCompleted = false;
        const p5b = new P5b({
            setup: () => {},
            draw: async () => {
                await new Promise((r) => setImmediate(r));
                drawCompleted = true;
            }
        });
        p5b.on("frame", () => {
            expect(drawCompleted).toBe(true);
            p5b.stop();
            done();
        });
        p5b.run();
    });

    it.skipIf(!isP5v2)("v2: async draw() error emits error event", (done) => {
        const p5b = new P5b({
            setup: () => {},
            draw: async () => {
                throw new Error("async draw failure");
            }
        });
        p5b.on("error", (e) => {
            expect(e.error.message).toBe("async draw failure");
            p5b.stop();
            done();
        });
        p5b.run();
    });

    it.skipIf(!isP5v2)("v2: sync draw() still works", (done) => {
        const p5b = new P5b({
            setup: () => {},
            draw: () => { background(100); }
        });
        p5b.on("frame", () => {
            const pixels = p5b.toFrame();
            expect(pixels[0]).toBe(100);
            p5b.stop();
            done();
        });
        p5b.run();
    });
});
