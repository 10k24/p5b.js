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
        this._p5Instance = null;
        this._scaleCanvas = null;
        this._graphicsPool = new Map();
        this._checkedOutFromPool = [];
        this._metrics = {
            framesDrawn: 0,
            errors: 0
        };
        this._validateConfig();
        this._dom = new P5bDOM(this.width, this.height);
    }

    run() {
        if (this._p5Instance) {
            throw new Error("P5b is already running. Call stop() before run().");
        }

        const sketch = (pInstance) => {
            this._p5Instance = pInstance;
            this._bindGlobals();
            this._initSketch();
        };

        new (this.getP5())(sketch);
    }

    stop() {
        this._p5Instance?.remove();
        this._p5Instance = null;
        this._dom.clear();
        this._scaleCanvas = null;
        this._graphicsPool.clear();
        this._checkedOutFromPool = [];
    }

    toFrame() {
        const canvasEl = this._dom.getCanvas();
        if (!canvasEl) {
            throw new Error("Canvas not initialized. Call run() first.");
        }

        const srcWidth = canvasEl.width;
        const srcHeight = canvasEl.height;
        const dstWidth = this.width;
        const dstHeight = this.height;

        // Lazy-init permanent small canvas — allocated once, reused every frame
        if (!this._scaleCanvas) {
            this._scaleCanvas = canvas.createCanvas(dstWidth, dstHeight);
        }

        // Cairo handles all scaling natively — same-size case is a direct blit
        const scaleCtx = this._scaleCanvas.getContext("2d");
        scaleCtx.drawImage(canvasEl, 0, 0, srcWidth, srcHeight, 0, 0, dstWidth, dstHeight);

        // toBuffer('raw') on the tiny canvas only — always dstWidth*dstHeight*4 bytes (e.g. 4KB for 32×32)
        // This stays in V8 young-gen and is collected by cheap minor GC, not major mark-compact
        const ret = new Uint8Array(this._scaleCanvas.toBuffer("raw"));

        // Swap pixel data order BGRA -> RGBA
        for (let i = 0; i < ret.length; i += 4) {
            const swapRB = ret[i];
            const swapBR = ret[i + 2];
            ret[i] = swapBR;
            ret[i + 2] = swapRB;
        }

        return ret;
    }

    getMetrics() {
        return this._metrics;
    }

    _initSketch() {
        this._p5Instance.frameRate(this.fps);

        this._p5Instance.preload = () => {
            try {
                global.preload();
            } catch (error) {
                this._emitRuntimeError(error, "preload");
                this.stop();
            }
        };

        this._p5Instance.setup = () => {
            try {
                global.setup();
            } catch (error) {
                this._emitRuntimeError(error, "setup");
                this.stop();
            }
        };

        this._p5Instance.draw = () => {
            try {
                const elemsBefore = this._p5Instance._elements.length;
                global.draw();

                // Return pool-checked-out graphics objects back to the pool
                for (const { pg, key } of this._checkedOutFromPool) {
                    const bucket = this._graphicsPool.get(key);
                    if (bucket) bucket.push(pg);
                }
                this._checkedOutFromPool = [];

                // Pool any newly created graphics objects (from _elements growth).
                // Remove their canvases from the DOM helper's tracking lists.
                while (this._p5Instance._elements.length > elemsBefore) {
                    const el = this._p5Instance._elements.pop();
                    if (el && el.elt) {
                        this._dom.removeTrackedCanvas(el.elt);
                        const key = `${el.elt.width}:${el.elt.height}`;
                        if (!this._graphicsPool.has(key)) this._graphicsPool.set(key, []);
                        this._graphicsPool.get(key).push(el);
                    }
                }

                this._metrics.framesDrawn++;
                this.emit("frame", this.toFrame());
            } catch (error) {
                this._checkedOutFromPool = [];
                this._emitRuntimeError(error, "draw");
                this.stop();
            }
        };
    }

    _bindGlobals() {
        // Walk prototype chain to bind all functions and key properties
        for (const key in this._p5Instance) {
            const value = this._p5Instance[key];
            if (typeof value === "function") {
                global[key] = value.bind(this._p5Instance);
            } else if (!key.startsWith("_")) {
                // Bind non-private properties (like frameCount, width, height)
                Object.defineProperty(global, key, {
                    get: () => this._p5Instance[key],
                    set: (val) => { this._p5Instance[key] = val; },
                    configurable: true
                });
            }
        }

        global.loadFont = (function(that) {
            const P5Constructor = that.getP5();
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
                const p5Font = new P5Constructor.Font(that._p5Instance);
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
                const bucket = that._graphicsPool.get(key);
                if (bucket && bucket.length > 0) {
                    const pg = bucket.pop();
                    that._checkedOutFromPool.push({ pg, key });
                    return pg;
                }
                return cg(w, h, ...rest);
            };
        })(this, global.createGraphics);
    }

    _emitRuntimeError(error, phase) {
        this._metrics.errors++;
        this.emit("error", { phase, error });
    }

    getP5() {
        return require("p5").default || require("p5");
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
