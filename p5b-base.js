const canvas = require("canvas");
const { EventEmitter } = require("events");
const fs = require("fs");
const opentype = require("opentype.js");
const path = require("path");
const vm = require("vm");
const { P5bDOM } = require("./p5b-dom");
const { noop, mathConstants, mathFunctions, p5Constants } = require("./globals");

const P5B_DEFAULTS = {
    sketchPath: null,
    width: 32,
    height: 32,
    fps: 60,
    setup: noop,
    draw: noop,
    maxPoolSize: 4
};

// Swap pixel data order BGRA -> RGBA. Shared by both adapters' toFrame() scale path
// (node-canvas toBuffer("raw") emits BGRA). Single source of truth for the adapters.
const reorderBuffer = (buf) => {
    const ret = new Uint8Array(buf);
    for (let i = 0; i < ret.length; i += 4) {
        const b = ret[i];
        ret[i] = ret[i + 2];
        ret[i + 2] = b;
    }
    return ret;
};

// Resolve a sketch-relative asset path to an absolute filesystem path.
const resolveAssetPath = (sketchPath, filePath) => {
    const assetDir = sketchPath
        ? path.dirname(path.resolve(sketchPath))
        : process.cwd();
    return path.isAbsolute(filePath)
        ? filePath
        : path.resolve(assetDir, filePath);
};

// Resolve an asset path to a loadable URL (http passthrough, else file://).
const resolveAssetUrl = (sketchPath, filePath) => {
    const resolvedPath = resolveAssetPath(sketchPath, filePath);
    return filePath.startsWith("http") ? filePath : `file://${resolvedPath}`;
};

// Split file content into lines, normalizing CRLF/CR/LF. Shared by loadStrings/loadTable.
const splitLines = (content) =>
    content.replace(/\r\n/g, "\r").replace(/\n/g, "\r").split(/\r/);

// Fetch a resource and parse it as the requested type ('json' | 'text' | 'arrayBuffer'),
// throwing a descriptive error on non-OK responses. Shared by v1/v2 loadJSON/loadStrings/
// loadBytes (module-level: stateless). Mirrors p5 v2's request() helper.
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

// Fetch and parse a JSON resource (v1/v2 loadJSON). Thin wrapper over request().
const fetchJSON = (url) => request(url, "json");

class P5bBase extends EventEmitter {
    constructor(config = {}) {
        super();
        Object.assign(this, P5B_DEFAULTS, config);
        this._myP5 = null;
        this._destCanvas = null;
        this._gfxPool = new Map();
        this._gfxActive = [];
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
        this._dom.clear();
        this._gfxPool.clear();
        this._gfxActive = [];
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

    // Read the p5 canvas pixels (RGBA, no channel reorder needed).
    _pixels() {
        this._myP5.loadPixels();
        return new Uint8Array(this._myP5.pixels.buffer);
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

    // v1 preload counter: increment now, return a done() that decrements (async).
    _preloadHandle() {
        const p5 = this._myP5;
        p5._incrementPreload();
        return () => setImmediate(() => p5._decrementPreload());
    }

    // After createCanvas(), mirror size/context onto the p5 instance. Tolerant of
    // readonly properties in p5 v2. Shared by v1/v2 createCanvas.
    _syncCanvasGlobals(w, h) {
        this._propertySetter("windowWidth", w);
        this._propertySetter("windowHeight", h);
        // drawingContext is a plain global (not a bound accessor), so assign it
        // directly; wrapping in try/catch tolerates v2's not-ready/readonly states.
        try {
            global.drawingContext = this._myP5?.drawingContext;
        } catch (_) { /* not ready / readonly */ }
    }

    // Read and parse a font file (shared by v1/v2 loadFont).
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
            } catch (_) { /* readonly in p5 2.x */ }
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

        // Bind windowWidth/windowHeight explicitly - they may not exist on p5 instance
        // until createCanvas() is called, but should still be accessible
        // Use ?? 0 fallback to match p5.js behavior before createCanvas()
        for (const prop of ["windowWidth", "windowHeight"]) {
            Object.defineProperty(global, prop, {
                get: () => this._myP5?.[prop] ?? 0,
                configurable: true
            });
        }

        global.performance = {
            now: () => Date.now()
        };

        // Execute sketch if provided (overwrites globals)
        if (this.sketchPath) {
            const absoluteSketchPath = path.resolve(this.sketchPath);
            const code = fs.readFileSync(absoluteSketchPath, "utf8");
            vm.runInThisContext(code, { filename: absoluteSketchPath });
        }

        // Standalone math functions (pure Math pass-throughs)
        // Trig functions are NOT listed here - they come from the p5 instance
        // via the prototype loop above, which respects angle mode (DEGREES/RADIANS)
        for (const [k, v] of Object.entries(mathFunctions)) global[k] = v;

        // Math constants are module exports in p5 v1 (not on the instance)
        for (const [k, v] of Object.entries(mathConstants)) global[k] = v;

        // p5.js constants
        for (const [k, v] of Object.entries(p5Constants)) global[k] = v;

        // Accessibility functions - noop in headless environment (no DOM/screen readers)
        // File I/O functions - noop in headless environment
        // Mouse/keyboard event handlers - noop in headless environment
        for (const fn of [
            "describe", "describeElement", "textOutput", "gridOutput",
            "saveCanvas", "saveFrames", "saveJSON", "saveStrings", "saveTable", "saveImage",
            "mousePressed", "mouseReleased", "mouseMoved", "mouseDragged", "mouseWheel",
            "keyPressed", "keyReleased", "touchStarted", "touchEnded", "touchMoved",
            "cursor", "noCursor",
        ]) global[fn] = noop;
        global.print = (msg) => console.log(msg);

        // Mouse/keyboard properties - all zero in headless
        // Audio functions - noop in headless environment (p5.sound)
        for (const [k, v] of Object.entries({
            mouseX: 0, mouseY: 0, pmouseX: 0, pmouseY: 0,
            key: "", keyCode: 0,
            accelerationX: 0, accelerationY: 0, accelerationZ: 0,
        })) global[k] = v;
        for (const fn of ["loadSound", "loadAudio", "createAudio", "getAudioContext", "userStartAudio", "soundFormats"]) {
            global[fn] = noop;
        }

        const _prevWindowResized = global.windowResized;
        global.windowResized = () => {
            this._dom.resize(this.width, this.height);
            this._destCanvas = canvas.createCanvas(this.width, this.height);
            if (typeof this.windowResized === "function") {
                this.windowResized();
            }
            if (typeof _prevWindowResized === "function") _prevWindowResized();
        };
    }

    _gfxAcquire(key) {
        const bucket = this._gfxPool.get(key);
        if (!bucket || bucket.length === 0) return null;
        const pg = bucket.pop();
        this._gfxActive.push({ pg, key });
        this._resetGraphics(pg);
        return pg;
    }

    _gfxReturnToPool(key, pg) {
        const bucket = this._gfxPool.get(key) || [];
        this._gfxPool.set(key, bucket);
        if (bucket.length < this.maxPoolSize) bucket.push(pg);
    }

    // TODO: need better function naming scheme on all of these + _gfx*
    // Full cleanup for a graphics object on remove(): detach DOM, untrack from the DOM,
    // remove from _elements/_gfxActive so _afterDraw won't re-pool it, then return to pool.
    _removeGraphics(ret, key) {
        if (ret.elt && ret.elt.parentNode) ret.elt.parentNode.removeChild(ret.elt);
        if (ret.elt) this._dom.removeTrackedCanvas(ret.elt);
        const ei = this._myP5._elements.indexOf(ret);
        if (ei !== -1) this._myP5._elements.splice(ei, 1);
        const ai = this._gfxActive.findIndex((e) => e.pg === ret);
        if (ai !== -1) this._gfxActive.splice(ai, 1);
        this._gfxReturnToPool(key, ret);
    }

    _resetGraphics(pg) {
        pg.clear();
        pg.resetMatrix();
        pg.fill(255);
        pg.stroke(0);
        pg.noTint();
    }

    _initDrawWrapper() {
        const _userDraw = global.draw;

        const _afterDraw = (elemsBefore) => {
            for (const { pg, key } of this._gfxActive) {
                this._gfxReturnToPool(key, pg);
            }
            this._gfxActive = [];

            while (this._myP5._elements.length > elemsBefore) {
                const el = this._myP5._elements.pop();
                if (el && el.elt) {
                    this._dom.removeTrackedCanvas(el.elt);
                    const key = `${el.elt.width}:${el.elt.height}`;
                    this._gfxReturnToPool(key, el);
                }
            }

            this._metrics.framesDrawn++;
            this.emit("frame", this.toFrame());
        };

        const _handleDrawError = (error) => {
            this._gfxActive = [];
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

        const _wrappedDraw = () => _executeDraw(() => _userDraw.call(this._myP5));
        global.draw = _wrappedDraw;
        this._myP5.draw = _wrappedDraw;
    }
}

module.exports = { P5bBase, P5B_DEFAULTS, request, fetchJSON, reorderBuffer, resolveAssetPath, resolveAssetUrl, splitLines };
