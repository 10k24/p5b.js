const { EventEmitter } = require("events");
const canvas = require("canvas");
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const opentype = require("opentype.js");
const { P5bDOM } = require("./p5b-dom");

const noop = () => {};

const P5B_DEFAULTS = {
    sketchPath: null,
    width: 32,
    height: 32,
    fps: 60,
    preload: noop,
    setup: noop,
    draw: noop
};

class P5b extends EventEmitter {
    constructor(config = {}) {
        super();
        Object.assign(this, P5B_DEFAULTS, config);
        this._myP5 = null;
        this._destCanvas = null;
        this._gfxPool = new Map();
        this._gfxActive = [];
        this._metrics = {
            framesDrawn: 0,
            errors: 0
        };
        this._validateConfig();
        this._dom = new P5bDOM(this.width, this.height);
    }

    run() {
        if (this._myP5) {
            throw new Error("P5b is already running. Call stop() before run().");
        }

        const sketch = (pInstance) => {
            this._myP5 = pInstance;
            this._bindGlobals();
            this._initSketch();
        };

        new (this._loadP5())(sketch);
    }

    stop() {
        this._myP5?.remove();
        this._myP5 = null;
        this._destCanvas = null;
        this._dom.clear();
        this._gfxPool.clear();
        this._gfxActive = [];
    }

    toFrame() {
        const srcCanvas = this._dom.getCanvas();
        if (!srcCanvas) {
            throw new Error("Canvas not initialized. Call run() first.");
        }

        if (!this._destCanvas) {
            this._destCanvas = canvas.createCanvas(this.width, this.height);
        }

        this._destCanvas.getContext("2d").drawImage(srcCanvas, 0, 0, srcCanvas.width, srcCanvas.height, 0, 0, this.width, this.height);

        const ret = new Uint8Array(this._destCanvas.toBuffer("raw"));

        // Swap pixel data order BGRA -> RGBA
        for (let i = 0; i < ret.length; i += 4) {
            const swapR2B = ret[i];
            const swapB2R = ret[i + 2];
            ret[i] = swapB2R;
            ret[i + 2] = swapR2B;
        }

        return ret;
    }

    getMetrics() {
        return this._metrics;
    }

    _loadP5() {
        return require("p5").default || require("p5");
    }

    _initSketch() {
        this._myP5.frameRate(this.fps);

        this._myP5.preload = () => {
            try {
                global.preload();
            } catch (error) {
                this._emitRuntimeError(error, "preload");
                this.stop();
            }
        };

        this._myP5.setup = () => {
            try {
                global.setup();
            } catch (error) {
                this._emitRuntimeError(error, "setup");
                this.stop();
            }
        };

        this._myP5.draw = () => {
            try {
                const elemsBefore = this._myP5._elements.length;
                global.draw();

                // Return pool-checked-out graphics objects back to the pool
                for (const { pg, key } of this._gfxActive) {
                    const bucket = this._gfxPool.get(key);
                    if (bucket) bucket.push(pg);
                }
                this._gfxActive = [];

                // Pool any newly created graphics objects (from _elements growth).
                // Remove their canvases from the DOM helper's tracking lists.
                while (this._myP5._elements.length > elemsBefore) {
                    const el = this._myP5._elements.pop();
                    if (el && el.elt) {
                        this._dom.removeTrackedCanvas(el.elt);
                        const key = `${el.elt.width}:${el.elt.height}`;
                        if (!this._gfxPool.has(key)) this._gfxPool.set(key, []);
                        this._gfxPool.get(key).push(el);
                    }
                }

                this._metrics.framesDrawn++;
                this.emit("frame", this.toFrame());
            } catch (error) {
                this._gfxActive = [];
                this._emitRuntimeError(error, "draw");
                this.stop();
            }
        };
    }

    _bindGlobals() {
        // Walk prototype chain to bind all functions and key properties
        for (const key in this._myP5) {
            const value = this._myP5[key];
            if (typeof value === "function") {
                global[key] = value.bind(this._myP5);
            } else if (!key.startsWith("_")) {
                // Bind non-private properties (like frameCount, width, height)
                Object.defineProperty(global, key, {
                    get: () => this._myP5[key],
                    set: (val) => { this._myP5[key] = val; },
                    configurable: true
                });
            }
        }

        global.loadFont = (function(that) {
            const P5Constructor = that._loadP5();
            return function(fontPath) {
                const assetDir = that.sketchPath
                    ? path.dirname(path.resolve(that.sketchPath))
                    : process.cwd();
                const fontData = fs.readFileSync(
                    path.isAbsolute(fontPath)
                        ? fontPath
                        : path.resolve(assetDir, fontPath)
                );
                const parsedFont = opentype.parse(
                    fontData.buffer.slice(fontData.byteOffset, fontData.byteOffset + fontData.byteLength)
                );
                const p5Font = new P5Constructor.Font(that._myP5);
                p5Font.font = parsedFont;
                return p5Font;
            };
        })(this);

        // Pool-based createGraphics: reuse Graphics objects across frames instead of
        // allocating new Cairo surfaces every draw call. On first use a new object is
        // created normally; on subsequent uses the pooled object is returned directly,
        // avoiding any allocation at all.
        global.createGraphics = (function(that, cg) {
            return function(w, h, ...rest) {
                const key = `${w}:${h}`;
                const bucket = that._gfxPool.get(key);
                if (bucket && bucket.length > 0) {
                    const pg = bucket.pop();
                    that._gfxActive.push({ pg, key });
                    return pg;
                }
                
                const ret = cg(w, h, ...rest);
                // Override .remove() on new graphics before they're used
                ret.remove = function() {
                    if (this.elt && this.elt.parentNode) {
                        this.elt.parentNode.removeChild(this.elt);
                    }
                };
                return ret;
            };
        })(this, global.createGraphics);
    }

    _emitRuntimeError(error, phase) {
        this._metrics.errors++;
        this.emit("error", { phase, error });
    }    

    _validateConfig() {
        if (!Number.isFinite(this.fps) || this.fps <= 0) {
            throw new Error("Invalid config: fps must be a positive number.");
        }
        if (!Number.isInteger(this.width) || this.width <= 0) {
            throw new Error("Invalid config: width must be a positive integer.");
        }
        if (!Number.isInteger(this.height) || this.height <= 0) {
            throw new Error("Invalid config: height must be a positive integer.");
        }
        if (this.preload && typeof this.preload !== "function") {
            throw new Error("Invalid config: preload must be a function.");
        }
        if (this.setup && typeof this.setup !== "function") {
            throw new Error("Invalid config: setup must be a function.");
        }
        if (this.draw && typeof this.draw !== "function") {
            throw new Error("Invalid config: draw must be a function.");
        }

        global.preload = this.preload;
        global.setup = this.setup;
        global.draw = this.draw;

        // Execute sketch if provided (overwrites globals)
        if (this.sketchPath) {
            const absoluteSketchPath = path.resolve(this.sketchPath);
            const code = fs.readFileSync(absoluteSketchPath, "utf8");
            vm.runInThisContext(code, { filename: absoluteSketchPath });
        }
    }
}

module.exports = { P5b, P5B_DEFAULTS };
