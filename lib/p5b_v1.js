const fs = require("fs");
const { P5bBase, P5B_DEFAULTS, request, fetchJSON, reorderBuffer, resolveAssetPath, resolveAssetUrl, splitLines } = require("./p5b-base");
const { isAsyncFunction, noop } = require("./globals");

// v1 lifecycle hooks are sync-only; find any that are async.
const asyncHookNames = (hooks) =>
    ["preload", "setup", "draw"].filter((name) => isAsyncFunction(hooks[name]));

class P5b extends P5bBase {
    constructor(config = {}) {
        // v1 supports preload(); default to noop without mutating shared P5B_DEFAULTS.
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
        // Sketch-file async hooks can't be rejected at construction — detect and halt.
        const asyncHooks = asyncHookNames(global);
        if (asyncHooks.length > 0) {
            const error = new Error(
                `async/await is not supported in p5.js v1 lifecycle hooks. Remove 'async' from: ${asyncHooks.join(", ")}`
            );
            this._emitRuntimeError(error, "setup");
            this.stop();
        }

        this._myP5.frameRate(this.fps);

        // p5 v1 calls global.preload() AND this._myP5.preload(); capture, then null global.
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

        // Inline mode: overwrite the sketch's preload (exec'd by super) with ours.
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

        // Sync p5.Image shell so loadImage works in preload.
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

        // v1: sync object shell, populated once loaded.
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

            // v1: sync array shell, populated once loaded.
            request(resolveAssetUrl(this.sketchPath, filePath), "text")
                .then((data) => {
                    // Native v1 line splitting (normalize to CR, split on CR).
                    const lines = data.replace(/\r\n/g, "\r").replace(/\n/g, "\r").split(/\r/);
                    // Chunked push avoids stack overflow on >100k-line files.
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

        // v1: sync object shell, populated once loaded.
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
