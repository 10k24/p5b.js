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
        this._canvas = null;
        this._domBodyChildren = null;
        this._scaleCanvas = null;
        this._scaleCtx = null;
        this._frameBuffer = null;
        this._graphicsPool = new Map();
        this._checkedOutFromPool = [];
        this._metrics = {
            framesDrawn: 0,
            errors: 0
        };
        this._validateConfig();
        this._dom = new P5bDOM(this.width, this.height);
        this._domBodyChildren = this._dom.domBodyChildren;
        this._allCanvases = this._dom.allCanvases;
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

        new this._dom.p5(sketch);
        // _p5Instance may be null if setup threw synchronously and stop() was called
        if (this._p5Instance) {
            this._p5Instance.frameRate(this.fps);
        }
    }

    stop() {
        if (this._p5Instance) {
            this._p5Instance.remove();
        }
        this._p5Instance = null;
        this._canvas = null;
        if (this._domBodyChildren) {
            this._domBodyChildren.length = 0;
        }
        if (this._allCanvases) {
            this._allCanvases.length = 0;
        }
        this._scaleCanvas = null;
        this._scaleCtx = null;
        this._graphicsPool.clear();
        this._checkedOutFromPool = [];
    }

    toFrame() {
        if (!this._canvas) {
            throw new Error("Canvas not initialized. Call run() first.");
        }

        const srcWidth = this._canvas.width;
        const srcHeight = this._canvas.height;
        const dstWidth = this.width;
        const dstHeight = this.height;

        // Lazy-init permanent small canvas — allocated once, reused every frame
        if (!this._scaleCanvas) {
            this._scaleCanvas = canvas.createCanvas(dstWidth, dstHeight);
            this._scaleCtx = this._scaleCanvas.getContext("2d");
            this._frameBuffer = Buffer.alloc(dstWidth * dstHeight * 4);
        }

        // Cairo handles all scaling natively — same-size case is a direct blit
        this._scaleCtx.drawImage(this._canvas, 0, 0, srcWidth, srcHeight, 0, 0, dstWidth, dstHeight);

        // toBuffer('raw') on the tiny canvas only — always dstWidth*dstHeight*4 bytes (e.g. 4KB for 32×32)
        // This stays in V8 young-gen and is collected by cheap minor GC, not major mark-compact
        const rawBuf = this._scaleCanvas.toBuffer("raw");

        // BGRA → RGBA into reusable frame buffer
        for (let i = 0; i < rawBuf.length; i += 4) {
            this._frameBuffer[i]     = rawBuf[i + 2]; // R ← B
            this._frameBuffer[i + 1] = rawBuf[i + 1]; // G
            this._frameBuffer[i + 2] = rawBuf[i];     // B ← R
            this._frameBuffer[i + 3] = rawBuf[i + 3]; // A
        }

        // Copy so callers can safely hold the buffer across async ZMQ sends
        return new Uint8Array(this._frameBuffer);
    }

    getMetrics() {
        return this._metrics;
    }

    _initSketch() {
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
                this._canvas = document.querySelector("canvas");
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
                // Remove their canvases from allCanvases and _domBodyChildren — they
                // live in the pool now and don't need DOM tracking.
                while (this._p5Instance._elements.length > elemsBefore) {
                    const el = this._p5Instance._elements.pop();
                    if (el && el.elt) {
                        const ai = this._allCanvases.indexOf(el.elt);
                        if (ai > -1) this._allCanvases.splice(ai, 1);
                        const bi = this._domBodyChildren.indexOf(el.elt);
                        if (bi > -1) this._domBodyChildren.splice(bi, 1);
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

        global.loadFont = (fontPath) => {
            const assetDir = this.sketchPath
                ? path.dirname(path.resolve(this.sketchPath))
                : process.cwd();
            const fontData = fs.readFileSync(
                path.isAbsolute(fontPath)
                    ? fontPath
                    : path.resolve(assetDir, fontPath)
            );
            const parsedFont = opentype.parse(
                fontData.buffer.slice(fontData.byteOffset, fontData.byteOffset + fontData.byteLength)
            );
            const p5Font = new this._dom.p5.Font(this._p5Instance);
            p5Font.font = parsedFont;
            return p5Font;
        };

        // Pool-based createGraphics: reuse Graphics objects across frames instead of
        // allocating new Cairo surfaces every draw call. On first use a new object is
        // created normally; on subsequent uses the pooled object is returned directly,
        // avoiding any allocation at all.
        const _cg = global.createGraphics;
        global.createGraphics = (w, h, ...rest) => {
            const key = `${w}:${h}`;
            const bucket = this._graphicsPool.get(key);
            if (bucket && bucket.length > 0) {
                const pg = bucket.pop();
                this._checkedOutFromPool.push({ pg, key });
                return pg;
            }
            return _cg(w, h, ...rest);
        };
    }

    _emitRuntimeError(error, phase) {
        this._metrics.errors++;
        if (this.listenerCount("error") > 0) {
            this.emit("error", { phase, error });
        }
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
