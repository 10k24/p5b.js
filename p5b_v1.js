const canvas = require("canvas");
const fs = require("fs");
const opentype = require("opentype.js");
const { P5bBase, P5B_DEFAULTS, reorderBuffer } = require("./p5b-base");

const noop = () => {};

class P5b extends P5bBase {
    constructor(config = {}) {
        // v1 owns the preload default: p5 v1 supports preload() as a lifecycle hook,
        // and the binding in _bindGlobals() reads this.preload. Inject a noop default
        // here instead of mutating the shared P5B_DEFAULTS (which p5b_v2.js also exports).
        super({ ...config, preload: config.preload ?? noop, p5Major: 1 });
    }

    toFrame() {
        const srcCanvas = this._myP5?.canvas;
        if (!srcCanvas) {
            throw new Error("Canvas not initialized. Call run() first.");
        }

        // Happy path: canvas dimensions match p5b config — skip drawImage blit.
        // node-canvas getImageData() (used by loadPixels) already returns RGBA, no swap needed.
        if (srcCanvas.width === this.width && srcCanvas.height === this.height) {
            this._myP5.loadPixels();
            return new Uint8Array(this._myP5.pixels.buffer);
        }

        // Canvas resizing only happens if sketch code manually resizes,
        // the performance and memory impact here should be negligible if not zero.
        if (!this._destCanvas || this._destCanvas.width !== this.width || this._destCanvas.height !== this.height) {
            this._destCanvas = canvas.createCanvas(this.width, this.height);
        }

        const ctx = this._destCanvas.getContext("2d");

        // Fit to destination, do not stretch
        const xRatio = this.width / srcCanvas.width;
        const yRatio = this.height / srcCanvas.height;
        const scaleFactor = Math.min(xRatio, yRatio);

        ctx.drawImage(
            srcCanvas,
            0, 0, srcCanvas.width, srcCanvas.height,
            0, 0, srcCanvas.width * scaleFactor, srcCanvas.height * scaleFactor
        );

        return reorderBuffer(this._destCanvas.toBuffer("raw"));
    }

    _loadP5() {
        global.performance = {
            now: () => Date.now()
        };
        const p5pkg = process.env.P5B_P5_PATH || "p5";
        return require(p5pkg).default || require(p5pkg);
    }

    _initSketch() {
        this._myP5.frameRate(this.fps);

        // p5 v1 in Node.js calls global.preload() directly (window===global) AND this._myP5.preload().
        // Null out global.preload after capturing it so p5's direct call is a noop; wrapper owns the call.
        const _userPreload = global.preload;
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

        // p5 v1 calls global.draw() directly from its animation loop (not this._myP5.draw),
        // so the try-catch wrapper must live in global.draw, not just this._myP5.draw.
        // Capture after _bindGlobals() runs (sketch may have overwritten global.draw via vm).
        const _userDraw = global.draw;
        const _wrappedDraw = () => {
            if (!this._myP5) return;
            try {
                // Block animation loop calls when stopped, but always allow redraw() through
                if (!this._redrawing && this._metrics.framesDrawn > 0 && !this._myP5.isLooping()) {
                    return;
                }

                const elemsBefore = this._myP5._elements.length;
                _userDraw.call(this._myP5);

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
        global.draw = _wrappedDraw;
        this._myP5.draw = _wrappedDraw;
    }

    _propertySetter(key, val) { if (this._myP5) this._myP5[key] = val; }

    _bindGlobals() {
        super._bindGlobals();

        // Inline config preload binds here, AFTER super's sketchPath vm exec (which
        // wrote the sketch's own preload to global.preload). Gating on sketchPath lets
        // the sketch's preload win; for inline mode this overwrites any stale sketch
        // preload from a prior sketchPath instance.
        if (!this.sketchPath) {
            global.preload = this.preload;
        }

        global.loadFont = (function(that) {
            return function(fontPath) {
                const resolvedPath = global._resolveAssetPath(that.sketchPath, fontPath);
                let fontData;
                try {
                    fontData = fs.readFileSync(resolvedPath);
                } catch (error) {
                    if (error.code === "ENOENT") {
                        throw new Error(`Failed to load font: file not found at ${resolvedPath}`);
                    }
                    throw new Error(`Failed to load font: ${error.message}`);
                }
                const parsedFont = opentype.parse(
                    fontData.buffer.slice(fontData.byteOffset, fontData.byteOffset + fontData.byteLength)
                );
                const p5Font = new (that._loadP5()).Font(that._myP5);
                p5Font.font = parsedFont;
                return p5Font;
            };
        })(this);

        // loadImage: mirrors p5.js's original loadImage contract exactly.
        // Returns a p5.Image shell synchronously (so img = loadImage(path) works
        // in preload and img.width/height are usable in setup/draw after the
        // preload counter clears). The shell is backed by a node-canvas Canvas,
        // so p5.js's image() function can draw it via img.canvas/.drawingContext.
        // p5 v1 rebinds preload methods (loadImage, loadJSON, etc.) to global just before
        // calling this.preload(), overwriting our custom implementations. Use defineProperty
        // with a no-op setter so those rebind assignments are silently ignored.
        const _p5bLoadImage = (function(that) {
            return function(filePath, onSuccess, onError) {
                const p5 = that._myP5;
                if (!p5) {
                    throw new Error("P5 instance is broken, did you call p5b.stop()?");
                }

                p5._incrementPreload();

                const resolvedPath = global._resolveAssetPath(that.sketchPath, filePath);
                const url = filePath.startsWith("http") ? filePath : `file://${resolvedPath}`;
                let pImg;

                const loadImageData = (imageData) => {
                    const rawImg = new canvas.Image();
                    rawImg.onload = () => {
                        pImg = new (that._loadP5()).Image(rawImg.width, rawImg.height);
                        pImg.drawingContext.drawImage(rawImg, 0, 0);
                        // Ignoring for now, only needed for webGL to refresh textures
                        // pImg.modified = true;
                        if (onSuccess) onSuccess(pImg);
                        setImmediate(() => p5._decrementPreload());
                    };
                    rawImg.onerror = (err) => handleError(err instanceof Error ? err : new Error(String(err)));
                    rawImg.src = Buffer.from(imageData);
                };

                const handleError = (error) => {
                    setImmediate(() => p5._decrementPreload());
                    if (onError) onError(error);
                    else console.error(`Failed to load image: ${error.message}`);
                };

                if (url.startsWith("file://")) {
                    try {
                        const buf = fs.readFileSync(resolvedPath);
                        loadImageData(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
                    } catch (error) {
                        handleError(error);
                    }
                } else {
                    global.fetch(url)
                        .then(response => {
                            if (!response.ok) throw new Error(`Failed to load image: ${response.status} ${response.statusText}`);
                            return response.arrayBuffer();
                        })
                        .then(buf => loadImageData(buf))
                        .catch(handleError);
                }

                return pImg;
            };
        })(this);
        global.loadImage = _p5bLoadImage;

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

        global.loadJSON = (function(that) {
            return async function(filePath) {
                const p5 = that._myP5;
                p5._incrementPreload();
                try {
                    const resolvedPath = global._resolveAssetPath(that.sketchPath, filePath);
                    const url = filePath.startsWith("http") ? filePath : `file://${resolvedPath}`;
                    const response = await global.fetch(url);
                    if (!response.ok) {
                        throw new Error(`Failed to load JSON: ${response.status} ${response.statusText}`);
                    }
                    return await response.json();
                } finally {
                    setImmediate(() => p5._decrementPreload());
                }
            };
        })(this);

        global.createCanvas = (function(that, cc) {
            return function(w, h, renderer) {
                const r = renderer === undefined ? "" : String(renderer);
                if (r.toLowerCase() === "webgl") {
                    throw new Error("WEBGL mode is not supported in p5b. Use P2D or omit the renderer.");
                }
                const result = cc(w, h, renderer);
                that._myP5.windowWidth = w;
                that._myP5.windowHeight = h;
                global.drawingContext = that._myP5.drawingContext;
                return result;
            };
        })(this, global.createCanvas);

        global.loadStrings = (function(that) {
            return function(filePath, callback, errorCallback) {
                const p5 = that._myP5;
                p5._incrementPreload();
                try {
                    const resolvedPath = global._resolveAssetPath(that.sketchPath, filePath);
                    const content = fs.readFileSync(resolvedPath, "utf8");
                    const lines = content
                        .replace(/\r\n/g, "\r")
                        .replace(/\n/g, "\r")
                        .split(/\r/);
                    if (lines.length > 0 && lines[lines.length - 1] === "") lines.pop();
                    if (callback) callback(lines);
                    setImmediate(() => p5._decrementPreload());
                    return lines;
                } catch (error) {
                    setImmediate(() => p5._decrementPreload());
                    if (errorCallback) errorCallback(error);
                    else console.error(`Failed to load strings: ${error.message}`);
                }
            };
        })(this);

        global.loadTable = (function(that) {
            return function(filePath, ...args) {
                const p5 = that._myP5;
                p5._incrementPreload();

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
                    const resolvedPath = global._resolveAssetPath(that.sketchPath, filePath);
                    const content = fs.readFileSync(resolvedPath, "utf8");
                    const lines = content
                        .replace(/\r\n/g, "\r")
                        .replace(/\n/g, "\r")
                        .split(/\r/)
                        .filter(l => l.length > 0);

                    const P5 = that._loadP5();
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
                    setImmediate(() => p5._decrementPreload());
                    return table;
                } catch (error) {
                    setImmediate(() => p5._decrementPreload());
                    if (errorCallback) errorCallback(error);
                    else console.error(`Failed to load table: ${error.message}`);
                }
            };
        })(this);
    }

    _emitRuntimeError(error, phase) {
        this._metrics.errors++;
        this.emit("error", { phase, error });
    }

    _validateConfig() {
        super._validateConfig();
        if (this.preload && typeof this.preload !== "function") {
            throw new Error("Invalid config: preload must be a function.");
        }
    }
}

module.exports = { P5b, P5B_DEFAULTS };
