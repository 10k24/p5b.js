const fs = require("fs");
const { P5bBase, P5B_DEFAULTS, request, fetchJSON, reorderBuffer, resolveAssetPath, resolveAssetUrl, splitLines } = require("./p5b-base");
const { isAsyncFunction, noop } = require("./globals");

// Names of the lifecycle hooks that are async functions. v1 does not support
// async/await in preload/setup/draw.
const asyncHookNames = (hooks) =>
    ["preload", "setup", "draw"].filter((name) => isAsyncFunction(hooks[name]));

class P5b extends P5bBase {
    constructor(config = {}) {
        // v1 owns the preload default: p5 v1 supports preload() as a lifecycle hook,
        // and the binding in _bindGlobals() reads this.preload. Inject a noop default
        // here instead of mutating the shared P5B_DEFAULTS (which p5b_v2.js also exports).
        super({ ...config, preload: config.preload ?? noop, p5Version: 1 });
    }

    toFrame() {
        const srcCanvas = this._myP5?.canvas;
        if (!srcCanvas) {
            throw new Error("Canvas not initialized. Call run() first.");
        }

        if (srcCanvas.width === this.width && srcCanvas.height === this.height) {
            return this._pixels();
        }

        return reorderBuffer(this._letterbox(srcCanvas, srcCanvas.width, srcCanvas.height).toBuffer("raw"));
    }

    _initSketch() {
        // Sketch-file lifecycle hooks (bound by the vm exec in _bindGlobals) can't be
        // rejected at construction. Detect async preload/setup/draw here, emit an error,
        // and halt the sketch.
        const asyncHooks = asyncHookNames(global);
        if (asyncHooks.length > 0) {
            const error = new Error(
                `async/await is not supported in p5.js v1 lifecycle hooks. Remove 'async' from: ${asyncHooks.join(", ")}`
            );
            this._emitRuntimeError(error, "setup");
            this.stop();
        }

        this._myP5.frameRate(this.fps);

        // p5 v1 in Node.js calls global.preload() directly (window===global) AND this._myP5.preload().
        // Null out global.preload after capturing it so p5's direct call is a noop; wrapper owns the call.
        // Guard with noop: a sketchPath sketch with no preload() leaves global.preload undefined.
        const _userPreload = global.preload || noop;
        global.preload = noop;
        this._myP5.preload = () => {
            try {
                _userPreload();
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

        global.redraw = (...args) => {
            this._redrawing = true;
            try { this._myP5.redraw(...args); }
            finally { this._redrawing = false; }
        };

        this._initDrawWrapper();
    }

    _bindGlobals() {
        super._bindGlobals();

        // Inline config preload binds here, AFTER super's sketchPath vm exec (which
        // wrote the sketch's own preload to global.preload). Gating on sketchPath lets
        // the sketch's preload win; for inline mode this overwrites any stale sketch
        // preload from a prior sketchPath instance.
        if (!this.sketchPath) {
            global.preload = this.preload;
        }

        global.loadFont = (fontPath) => {
            const resolvedPath = resolveAssetPath(this.sketchPath, fontPath);
            const { parsedFont } = this._readFont(resolvedPath);
            const p5Font = new (this._loadP5()).Font(this._myP5);
            p5Font.font = parsedFont;
            return p5Font;
        };

        // loadImage: mirrors p5.js's original loadImage contract exactly.
        // Returns a p5.Image shell synchronously (so img = loadImage(path) works
        // in preload and img.width/height are usable in setup/draw after the
        // preload counter clears). The shell is backed by a node-canvas Canvas,
        // so p5.js's image() function can draw it via img.canvas/.drawingContext.
        global.loadImage = (filePath, onSuccess, onError) => {
            const p5 = this._myP5;
            if (!p5) {
                throw new Error("P5 instance is broken, did you call p5b.stop()?");
            }

            const done = this._preloadHandle();
            const url = resolveAssetUrl(this.sketchPath, filePath);
            let pImg;

            const img = new global.Image();
            img.onload = () => {
                pImg = this._imageFromCanvas(img);
                if (onSuccess) onSuccess(pImg);
                done();
            };
            img.onerror = (err) => {
                done();
                if (onError) onError(err);
                else console.error(`Failed to load image: ${err.message}`);
            };
            img.src = url;

            return pImg;
        };

        // Pool-based createGraphics: reuse Graphics objects across frames instead of
        // allocating new Cairo surfaces every draw call. On first use a new object is
        // created normally; on subsequent uses the pooled object is returned directly,
        // avoiding any allocation at all.
        const _origCreateGraphics = global.createGraphics;
        global.createGraphics = (w, h, ...rest) => {
            const key = `${w}:${h}`;
            const pg = this._gfxAcquire(key);
            if (pg) return pg;

            const ret = _origCreateGraphics(w, h, ...rest);
            ret.remove = () => this._removeGraphics(ret, key);
            return ret;
        };

        // p5 v1 semantics: returns a data object synchronously, populated once loaded;
        // the preload counter blocks setup until it settles. Errors go to errorCallback
        // (or console) — not a rejected promise.
        global.loadJSON = (filePath, callback, errorCallback) => {
            const done = this._preloadHandle();
            const data = {};
            fetchJSON(resolveAssetUrl(this.sketchPath, filePath))
                .then((result) => { Object.assign(data, result); if (callback) callback(result); })
                .catch((error) => { if (errorCallback) errorCallback(error); else console.error(`Failed to load JSON: ${error.message}`); })
                .then(done);
            return data;
        };

        const _origCreateCanvas = global.createCanvas;
        global.createCanvas = (w, h, renderer) => {
            const r = renderer === undefined ? "" : String(renderer);
            if (r.toLowerCase() === "webgl") {
                throw new Error("WEBGL mode is not supported in p5b. Use P2D or omit the renderer.");
            }
            const result = _origCreateCanvas(w, h, renderer);
            this._syncCanvasGlobals(w, h);
            return result;
        };

        global.loadStrings = (filePath, callback, errorCallback) => {
            const done = this._preloadHandle();
            const ret = [];

            // Matches native p5 v1: returns an empty array synchronously, populated once
            // loaded via request() (HTTP URLs + local files through the DOM fetch shim);
            // the preload counter blocks setup until it settles.
            request(resolveAssetUrl(this.sketchPath, filePath), "text")
                .then((data) => {
                    // Native p5 v1 line splitting: normalize CRLF/CR/LF to CR, split on CR.
                    const lines = data.replace(/\r\n/g, "\r").replace(/\n/g, "\r").split(/\r/);
                    // Chunked push (as native v1 does) avoids stack overflow on >100k-line files.
                    const QUANTUM = 32768;
                    for (let i = 0; i < lines.length; i += QUANTUM) {
                        Array.prototype.push.apply(ret, lines.slice(i, Math.min(i + QUANTUM, lines.length)));
                    }
                    if (callback) callback(ret);
                })
                .catch((error) => {
                    if (errorCallback) errorCallback(error);
                    else console.error(`Failed to load strings: ${error.message}`);
                })
                .then(done);
            return ret;
        };

        // Matches native p5 v1: returns an empty object synchronously, populated once
        // loaded via request() (HTTP URLs + local files through the DOM fetch shim);
        // the preload counter blocks setup until it settles.
        global.loadBytes = (file, callback, errorCallback) => {
            const done = this._preloadHandle();
            const ret = {};
            request(resolveAssetUrl(this.sketchPath, file), "arrayBuffer")
                .then((arrayBuffer) => { ret.bytes = new Uint8Array(arrayBuffer); if (callback) callback(ret); })
                .catch((error) => { if (errorCallback) errorCallback(error); else console.error(`Failed to load bytes: ${error.message}`); })
                .then(done);
            return ret;
        };

        global.loadTable = (filePath, ...args) => {
            const done = this._preloadHandle();

            // Parse variadic args: loadTable(path, [options], [header], callback, errorCallback)
            let options = "";
            let hasHeader = false;
            let callback = null;
            let errorCallback = null;
            for (const arg of args) {
                if (typeof arg === "function") {
                    if (!callback) callback = arg;
                    else errorCallback = arg;
                } else if (typeof arg === "string") {
                    if (arg === "header") hasHeader = true;
                    else options = arg; // "csv", "tsv", "ssv"
                }
            }

            let separator = ",";
            if (options === "tsv") separator = "\t";
            else if (options === "ssv") separator = ";";

            try {
                const resolvedPath = resolveAssetPath(this.sketchPath, filePath);
                const lines = splitLines(fs.readFileSync(resolvedPath, "utf8")).filter(l => l.length > 0);

                const P5 = this._loadP5();
                const table = new P5.Table();

                let startRow = 0;
                if (hasHeader && lines.length > 0) {
                    const headers = lines[0].split(separator);
                    headers.forEach(h => table.addColumn(h.trim()));
                    startRow = 1;
                }

                for (let i = startRow; i < lines.length; i++) {
                    const cells = lines[i].split(separator);
                    // Auto-add columns on first data row when no header was provided
                    if (table.columns.length === 0) {
                        cells.forEach((_, j) => table.addColumn(String(j)));
                    }
                    const row = table.addRow();
                    cells.forEach((cell, j) => row.set(j, cell.trim()));
                }

                if (callback) callback(table);
                done();
                return table;
            } catch (error) {
                done();
                if (errorCallback) errorCallback(error);
                else console.error(`Failed to load table: ${error.message}`);
            }
        };

        // loadShader/loadModel: resolve sketch-relative paths to file:// URLs
        // (read headlessly by the p5b-dom fetch shim under both bun and node), then
        // delegate to the native p5 method so behavior matches p5.js exactly.
        global.loadShader = (vertPath, fragPath, successCallback, failureCallback) =>
            this._myP5.loadShader(
                resolveAssetUrl(this.sketchPath, vertPath),
                resolveAssetUrl(this.sketchPath, fragPath),
                successCallback,
                failureCallback
            );

        global.loadModel = (modelPath, ...rest) =>
            this._myP5.loadModel(resolveAssetUrl(this.sketchPath, modelPath), ...rest);

        // loadXML: XML parsing needs the browser-only DOMParser API (not available in
        // Node.js), so throw a clear error rather than a cryptic native failure.
        global.loadXML = () => {
            throw new Error("loadXML() is not supported in p5b: XML parsing requires the browser-only DOMParser API, which is not available in Node.js.");
        };
    }

    _validateConfig() {
        super._validateConfig();
        if (this.preload && typeof this.preload !== "function") {
            throw new Error("Invalid config: preload must be a function.");
        }

        const asyncHooks = asyncHookNames(this);
        if (asyncHooks.length > 0) {
            throw new Error(
                `async/await is not supported in p5.js v1 lifecycle hooks. Remove 'async' from: ${asyncHooks.join(", ")}`
            );
        }
    }
}

module.exports = { P5b, P5B_DEFAULTS };
