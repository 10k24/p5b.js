const { describe, it, expect } = require("bun:test");
const { P5b, P5B_DEFAULTS } = require("../p5b.js");
const { P5bDOM } = require("../p5b-dom.js");

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
