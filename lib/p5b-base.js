const canvas = require("canvas");
const { EventEmitter } = require("events");
const fs = require("fs");
const opentype = require("opentype.js");
const path = require("path");
const vm = require("vm");
const { P5bDOM } = require("./p5b-dom");
const { noop, mathFunctions, p5Constants, noopFunctions } = require("./globals");

const P5B_DEFAULTS = {
    sketchPath: null,
    width: 32,
    height: 32,
    fps: 60,
    setup: noop,
    draw: noop,
    maxPoolSize: 4
};

// Swap node-canvas BGRA -> RGBA (shared by both adapters' scale path).
const reorderBuffer = (buf) => {
    const ret = new Uint8Array(buf);
    for (let i = 0; i < ret.length; i += 4) {
        const b = ret[i];
        ret[i] = ret[i + 2];
        ret[i + 2] = b;
    }
    return ret;
};

const resolveAssetPath = (sketchPath, filePath) => {
    const assetDir = sketchPath
        ? path.dirname(path.resolve(sketchPath))
        : process.cwd();
    return path.isAbsolute(filePath)
        ? filePath
        : path.resolve(assetDir, filePath);
};

const resolveAssetUrl = (sketchPath, filePath) => {
    const resolvedPath = resolveAssetPath(sketchPath, filePath);
    return filePath.startsWith("http") ? filePath : `file://${resolvedPath}`;
};

const splitLines = (content) =>
    content.replace(/\r\n/g, "\r").replace(/\n/g, "\r").split(/\r/);

const request = (url, type) =>
    global.fetch(url).then((response) => {
        if (!response.ok) {
            throw new Error(`Failed to load ${type}: ${response.status} ${response.statusText}`);
        }
        if (type === "json") return response.json();
        if (type === "text") return response.text();
        if (type === "arrayBuffer") return response.arrayBuffer();
        throw new Error(`Unsupported response type: ${type}`);
    });

const fetchJSON = (url) => request(url, "json");

class P5bBase extends EventEmitter {
    constructor(config = {}) {
        super();
        Object.assign(this, P5B_DEFAULTS, config);
        this._myP5 = null;
        this._destCanvas = null;
        this._gfxPool = new Map();
        this._activeGfx = [];
        this._redrawing = false;
        this._removed = false;
        this._metrics = {
            framesDrawn: 0,
            errors: 0
        };
        this._validateConfig();
        this._dom = new P5bDOM(this.width, this.height, { p5Version: this.p5Version });
    }

    getMetrics() {
        return this._metrics;
    }

    run() {
        if (this._removed) {
            throw new Error("P5b instance has been removed. Create a new instance to run again.");
        }

        // Resume after stop()
        if (this._myP5) {
            this._myP5.loop();
            this._myP5.redraw();
            return;
        }

        // First run
        const sketch = (pInstance) => {
            this._myP5 = pInstance;
            this._bindGlobals();
            this._initSketch();
        };

        try {
            new (this._loadP5())(sketch);
        } catch (error) {
            this._myP5 = null;
            this._emitRuntimeError(error, "setup");
            this._dom.clear();
        }
    }

    stop() {
        this._myP5?.noLoop();
    }

    remove() {
        this._myP5?.remove();
        this._myP5 = null;
        this._destCanvas = null;
        this._glReadCanvas = null;
        this._dom.clear();
        this._gfxPool.clear();
        this._activeGfx = [];
        this._removed = true;
    }

    clear() {
        this.remove();
    }

    _loadP5() {
        const p5pkg = process.env.P5B_P5_PATH || "p5";
        return require(p5pkg).default || require(p5pkg);
    }

    _imageFromCanvas(img) {
        const pImg = new (this._loadP5()).Image(img.width, img.height);
        pImg.drawingContext.drawImage(img, 0, 0);
        return pImg;
    }

    // Letterbox srcDrawable into the p5b target canvas (fit, no stretch).
    // Returns the destination canvas so callers can read pixels from it.
    _letterbox(srcDrawable, srcWidth, srcHeight) {
        if (!this._destCanvas || this._destCanvas.width !== this.width || this._destCanvas.height !== this.height) {
            this._destCanvas = canvas.createCanvas(this.width, this.height);
        }
        const ctx = this._destCanvas.getContext("2d");
        const scaleFactor = Math.min(this.width / srcWidth, this.height / srcHeight);
        ctx.drawImage(
            srcDrawable,
            0, 0, srcWidth, srcHeight,
            0, 0, srcWidth * scaleFactor, srcHeight * scaleFactor
        );
        return this._destCanvas;
    }

    _syncCanvasGlobals(w, h) {
        this._propertySetter("windowWidth", w);
        this._propertySetter("windowHeight", h);
        try {
            global.drawingContext = this._myP5?.drawingContext;
        } catch (_) { /* not ready / readonly in v2 */ }
    }

    // TODO: could use readFileAsync() if running as async
    // Read and parse a font file
    _readFont(resolvedPath) {
        let fontData;
        try {
            fontData = fs.readFileSync(resolvedPath);
        } catch (error) {
            const msg = error.code === "ENOENT" ? `file not found at ${resolvedPath}` : error.message;
            throw new Error(`Failed to load font: ${msg}`);
        }
        const parsedFont = opentype.parse(
            fontData.buffer.slice(fontData.byteOffset, fontData.byteOffset + fontData.byteLength)
        );
        return { fontData, parsedFont };
    }

    _emitRuntimeError(error, phase) {
        this._metrics.errors++;
        this.emit("error", { phase, error });
    }

    _validateConfig() {
        if (![1, 2].includes(this.p5Version)) {
            throw new Error("Invalid config: p5Version must be 1 or 2.");
        }
        if (!Number.isFinite(this.fps) || this.fps <= 0) {
            throw new Error("Invalid config: fps must be a positive number.");
        }
        if (!Number.isInteger(this.width) || this.width <= 0) {
            throw new Error("Invalid config: width must be a positive integer.");
        }
        if (!Number.isInteger(this.height) || this.height <= 0) {
            throw new Error("Invalid config: height must be a positive integer.");
        }
        if (this.setup && typeof this.setup !== "function") {
            throw new Error("Invalid config: setup must be a function.");
        }
        if (this.draw && typeof this.draw !== "function") {
            throw new Error("Invalid config: draw must be a function.");
        }
        if (!Number.isFinite(this.maxPoolSize) || this.maxPoolSize < 0) {
            throw new Error("Invalid config: maxPoolSize must be a number >= 0.");
        }
    }

    _propertySetter(key, val) {
        if (this._myP5) {
            try {
                this._myP5[key] = val;
            } catch (_) { /* readonly in p5.js 2.x */ }
        }
    }

    _bindGlobals() {
        global.setup = this.setup;
        global.draw = this.draw;

        // Walk prototype chain to bind all functions and key properties
        for (const key in this._myP5) {
            const value = this._myP5[key];
            if (typeof value === "function") {
                global[key] = value.bind(this._myP5);

            } else if (!key.startsWith("_")) {
                // Bind non-private properties (like frameCount, width, height)
                Object.defineProperty(global, key, {
                    get: () => this._myP5?.[key],
                    set: (val) => { this._propertySetter(key, val); },
                    configurable: true
                });
            }
        }

        // windowWidth/windowHeight may not exist until createCanvas(); ?? 0 matches p5.js.
        for (const prop of ["windowWidth", "windowHeight"]) {
            Object.defineProperty(global, prop, {
                get: () => this._myP5?.[prop] ?? 0,
                configurable: true
            });
        }

        global.performance = { now: () => Date.now() };
        global.print = (msg) => console.log(msg);

        for (const [k, v] of Object.entries(p5Constants)) global[k] = v;
        for (const fn of noopFunctions) global[fn] = noop;
        // Standalone math functions; trig comes from the p5.js instance (respects angle mode).
        for (const [k, v] of Object.entries(mathFunctions)) global[k] = v;

        // Reuse Graphics objects across frames.
        const _cg = global.createGraphics;
        global.createGraphics = (w, h, ...rest) => {
            const key = `${w}:${h}`;
            const pg = this._acquireGfx(key);
            if (pg) return pg;

            const ret = _cg(w, h, ...rest);
            ret.remove = () => this._removeGfx(ret, key);
            return ret;
        };

        // loadShader/loadModel delegate to native p5 via file:// URLs (read by the DOM
        // fetch shim), so behavior matches p5.js exactly.
        global.loadShader = (vertPath, fragPath, successCallback, failureCallback) =>
            this._myP5.loadShader(
                resolveAssetUrl(this.sketchPath, vertPath),
                resolveAssetUrl(this.sketchPath, fragPath),
                successCallback,
                failureCallback
            );

        global.loadModel = (modelPath, ...rest) =>
            this._myP5.loadModel(resolveAssetUrl(this.sketchPath, modelPath), ...rest);

        global.loadXML = () => {
            throw new Error("loadXML() is not supported in p5b: XML parsing requires the browser-only DOMParser API, which is not available in Node.js.");
        };

        const _wr = global.windowResized;
        global.windowResized = () => {
            this._dom.resize(this.width, this.height);
            this._destCanvas = canvas.createCanvas(this.width, this.height);
            if (typeof this.windowResized === "function") {
                this.windowResized();
            }
            if (typeof _wr === "function") _wr();
        };

        // Execute sketch if provided (overwrites globals)
        if (this.sketchPath) {
            const absoluteSketchPath = path.resolve(this.sketchPath);
            const code = fs.readFileSync(absoluteSketchPath, "utf8");
            vm.runInThisContext(code, { filename: absoluteSketchPath });
        }
    }

    _acquireGfx(key) {
        const bucket = this._gfxPool.get(key);
        if (!bucket || bucket.length === 0) return null;
        const pg = bucket.pop();
        this._activeGfx.push({ pg, key });
        this._resetGfx(pg);
        return pg;
    }

    _returnGfx(key, pg) {
        const bucket = this._gfxPool.get(key) || [];
        this._gfxPool.set(key, bucket);
        if (bucket.length < this.maxPoolSize) bucket.push(pg);
    }

    // Detach, untrack, and return a graphics object to the pool on remove().
    _removeGfx(ret, key) {
        if (ret.elt && ret.elt.parentNode) ret.elt.parentNode.removeChild(ret.elt);
        if (ret.elt) this._dom.removeTrackedCanvas(ret.elt);
        const idx = this._myP5._elements.indexOf(ret);
        if (idx !== -1) this._myP5._elements.splice(idx, 1);
        const activeIdx = this._activeGfx.findIndex((e) => e.pg === ret);
        if (activeIdx !== -1) this._activeGfx.splice(activeIdx, 1);
        this._returnGfx(key, ret);
    }

    _resetGfx(pg) {
        pg.clear();
        pg.resetMatrix();
        pg.fill(255);
        pg.stroke(0);
        pg.noTint();
    }

    _initDrawWrapper() {
        const _userDraw = global.draw;
        const _wrappedDraw = () => _executeDraw(() => _userDraw.call(this._myP5));
        global.draw = _wrappedDraw;
        this._myP5.draw = _wrappedDraw;

        const _afterDraw = (elemsBefore) => {
            for (const { pg, key } of this._activeGfx) {
                this._returnGfx(key, pg);
            }
            this._activeGfx = [];

            while (this._myP5._elements.length > elemsBefore) {
                const el = this._myP5._elements.pop();
                if (el && el.elt) {
                    this._dom.removeTrackedCanvas(el.elt);
                    const key = `${el.elt.width}:${el.elt.height}`;
                    this._returnGfx(key, el);
                }
            }

            this._metrics.framesDrawn++;
            this.emit("frame", this.toFrame());
        };

        const _handleDrawError = (error) => {
            this._activeGfx = [];
            this._emitRuntimeError(error, "draw");
            this.stop();
        };

        const _executeDraw = (drawFn) => {
            if (!this._myP5) return;
            try {
                if (!this._redrawing && this._metrics.framesDrawn > 0 && !this._myP5.isLooping()) return;
                const elemsBefore = this._myP5._elements.length;
                const result = drawFn();
                if (result && typeof result.then === "function") {
                    return result.then(() => _afterDraw(elemsBefore)).catch(_handleDrawError);
                }
                _afterDraw(elemsBefore);
            } catch (error) {
                _handleDrawError(error);
            }
        };
    }
}

module.exports = { P5bBase, P5B_DEFAULTS, request, fetchJSON, reorderBuffer, resolveAssetPath, resolveAssetUrl, splitLines };
