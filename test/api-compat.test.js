const { describe, it, expect } = require("bun:test");
const { P5b } = require("../p5b.js");
const fs = require("fs");
const path = require("path");

describe("API Compatibility: loadJSON", () => {
    it("should load local JSON file", async (done) => {
        const testJsonPath = path.join(process.cwd(), "test-data.json");
        fs.writeFileSync(testJsonPath, JSON.stringify({ foo: "bar", value: 123 }));
        let loaded = null;
        const p5b = new P5b({
            preload: async function() {
                loaded = await loadJSON("test-data.json");
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

    it("should throw on missing file", async (done) => {
        let error = null;
        const p5b = new P5b({
            preload: async function() {
                try {
                    await loadJSON("does-not-exist.json");
                } catch (e) {
                    error = e;
                }
            },
            setup: function() {},
            draw: function() {}
        });
        p5b.on("frame", () => {
            expect(error).toBeDefined();
            // Accept ENOENT or custom error messages
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
