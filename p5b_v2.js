const canvas = require("canvas");
const fs = require("fs");
const path = require("path");
const opentype = require("opentype.js");
const { P5bBase, P5B_DEFAULTS, reorderBuffer } = require("./p5b-base");

// TODO: need async/await support in v2 API

class P5b extends P5bBase {
    constructor(config = {}) {
        super({ ...config, p5Major: 2 });
        this._pendingLoads = 0;
    }

    // toFrameNew() {
    //     const isP3D = Boolean(this._myP5._renderer?.isP3D);
    //     if (isP3D) {
    //         this._myP5.loadPixels();
    //         srcDrawable = canvas.createCanvas(srcCanvas.width, srcCanvas.height);
    //         srcDrawable.getContext("2d").putImageData(
    //             new canvas.ImageData(new Uint8ClampedArray(this._myP5.pixels.buffer), srcCanvas.width, srcCanvas.height),
    //             0, 0
    //         );

    //         // TODO: maybe need some util functions for resize here

    //         return new Uint8Array(ctx.getImageData(0, 0, this.width, this.height).data.buffer);
    //     } else {
    //         return super.toFrame(); // TODO: needs to be added to p5b-base    
    //     }
    // }

    toFrame() {
        const srcCanvas = this._myP5?.canvas;
        if (!srcCanvas) {
            throw new Error("Canvas not initialized. Call run() first.");
        }

        const isP3D = Boolean(this._myP5._renderer?.isP3D);

        // Happy path: canvas dimensions match p5b config — return RGBA pixels directly.
        // node-canvas getImageData() (used by loadPixels) and p5 WebGL loadPixels both return RGBA.
        if (srcCanvas.width === this.width && srcCanvas.height === this.height) {
            this._myP5.loadPixels();
            return new Uint8Array(this._myP5.pixels.buffer);
        }

        // Scale path: letterbox source into _destCanvas at the p5b target dimensions.
        // WebGL canvas can't be passed to drawImage directly; read pixels via loadPixels
        // and copy into a temporary 2D canvas. 2D canvas can be used as-is.
        let srcDrawable;
        if (isP3D) {
            this._myP5.loadPixels();
            srcDrawable = canvas.createCanvas(srcCanvas.width, srcCanvas.height);
            srcDrawable.getContext("2d").putImageData(
                new canvas.ImageData(new Uint8ClampedArray(this._myP5.pixels.buffer), srcCanvas.width, srcCanvas.height),
                0, 0
            );
        } else {
            srcDrawable = srcCanvas;
        }

        // Canvas resizing only happens if sketch code manually resizes; negligible overhead.
        if (!this._destCanvas || this._destCanvas.width !== this.width || this._destCanvas.height !== this.height) {
            this._destCanvas = canvas.createCanvas(this.width, this.height);
        }

        const ctx = this._destCanvas.getContext("2d");

        // Fit to destination preserving aspect ratio, top-left aligned (do not stretch).
        // The region outside the fitted frame stays transparent (blank filler).
        const xRatio = this.width / srcCanvas.width;
        const yRatio = this.height / srcCanvas.height;
        const scaleFactor = Math.min(xRatio, yRatio);

        ctx.drawImage(
            srcDrawable,
            0, 0, srcCanvas.width, srcCanvas.height,
            0, 0, srcCanvas.width * scaleFactor, srcCanvas.height * scaleFactor
        );

        if (isP3D) {
            // getImageData returns RGBA — no channel reorder needed.
            return new Uint8Array(ctx.getImageData(0, 0, this.width, this.height).data.buffer);
        }

        return reorderBuffer(this._destCanvas.toBuffer("raw"));
    }

    _loadP5() {
        global.performance = {
            now: () => Date.now()
        };
        const p5pkg = process.env.P5B_P5_PATH || "p5";
        const p5 = require(p5pkg).default || require(p5pkg);
        // Disable p5.js 2.x FES features that require a real browser environment
        // (sketch_verifier fetches <script> tags; fes_core checks for removed APIs).
        // Neither is meaningful in a headless Node.js context.
        p5.disableFriendlyErrors = true;
        return p5;
    }

    _initSketch() {
        this._myP5.frameRate(this.fps);

        // p5.js 2.x removed preload() — _validateConfig() rejects any preload config
        // and _bindGlobals() never assigns it on the p5 instance (the FES would throw
        // before setup runs). Preload is a v1-only lifecycle hook.
        this._myP5.setup = async () => {
            try {
                // Wait for pending loads (loadImage/loadStrings/loadTable) to settle
                // before running setup, preserving the v1-style sync-shell contract.
                await this._waitForPreloads();
                // Await in case sketch setup is async (e.g. uses await loadFont())
                await global.setup();
            } catch (error) {
                this._emitRuntimeError(error, "setup");
                this.stop();
            }
        };

        global.redraw = (...args) => {
            // p5 2.x redraw() is async: it awaits lifecycle hooks before calling draw(),
            // so the _redrawing flag must stay set until the redraw settles. Otherwise the
            // stopped-state guard in _wrappedDraw would block the redraw frame entirely.
            this._redrawing = true;
            try {
                const result = this._myP5.redraw(...args);
                if (result && typeof result.then === "function") {
                    return result.finally(() => { this._redrawing = false; });
                }
                this._redrawing = false;
                return result;
            } catch (error) {
                this._redrawing = false;
                throw error;
            }
        };

        this._initDrawWrapper();
    }

    _propertySetter(key, val) { if (this._myP5) try { this._myP5[key] = val; } catch (_) { /* readonly in p5 2.x */ } }

    _bindGlobals() {
        super._bindGlobals();

        global.loadFont = (function(that) {
            // p5.js 2.x loadFont is async (fetch + FontFace.load), but p5b's shell contract is
            // synchronous: sketches assign font = loadFont(path) in preload/setup and use
            // font.font immediately, and missing files must throw synchronously. opentype.js
            // parses TTF/OTF synchronously and its font objects expose the same .names metadata
            // p5 v1 exposes. The FontFace family matches the node-canvas registration so 2D
            // canvas text rendering (createGraphics + textFont) can rasterize the glyphs.
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
                const family = parsedFont.names?.fontFamily?.en
                    || parsedFont.names?.fullName?.en
                    || path.basename(fontPath, path.extname(fontPath));
                const fontFace = new global.FontFace(family, fontData);
                // Register with node-canvas so 2D canvas text rendering (createGraphics, pg.text) works
                canvas.registerFont(resolvedPath, { family });
                const p5Font = new (that._loadP5()).Font(that._myP5, fontFace, family, fontPath, parsedFont);
                // hasGlyphData() checks textFont.font.data — set .data to the raw bytes so
                // textToPoints()/WEBGL glyph helpers treat the font as having glyph data.
                p5Font.font = parsedFont;
                p5Font.font.data = fontData;
                return p5Font;
            };
        })(this);

        // loadImage: mirrors p5.js's original loadImage contract exactly.
        // Returns a p5.Image shell synchronously (so img = loadImage(path) works
        // in preload and img.width/height are usable in setup/draw after the
        // preload counter clears). The shell is backed by a node-canvas Canvas,
        // so p5.js's image() function can draw it via img.canvas/.drawingContext.
        const _p5bLoadImage = (function(that) {
            return function(filePath, onSuccess, onError) {
                const p5 = that._myP5;
                if (!p5) {
                    throw new Error("P5 instance is broken, did you call p5b.stop()?");
                }

                that._preloadIncrement();

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
                        setImmediate(() => that._preloadDecrement());
                    };
                    rawImg.onerror = (err) => handleError(err instanceof Error ? err : new Error(String(err)));
                    rawImg.src = Buffer.from(imageData);
                };

                const handleError = (error) => {
                    setImmediate(() => that._preloadDecrement());
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
                const pg = that._gfxAcquire(key);
                if (pg) return pg;
                
                const ret = cg(w, h, ...rest);
                ret.remove = () => {
                    if (ret.elt && ret.elt.parentNode) {
                        ret.elt.parentNode.removeChild(ret.elt);
                    }
                    if (ret.elt) that._dom.removeTrackedCanvas(ret.elt);
                    that._gfxReturnToPool(key, ret);
                };
                return ret;
            };
        })(this, global.createGraphics);

        global.loadJSON = (function(that) {
            return async function(filePath) {
                try {
                    const resolvedPath = global._resolveAssetPath(that.sketchPath, filePath);
                    // Support both URLs and local file paths
                    const url = filePath.startsWith("http") ? filePath : `file://${resolvedPath}`;
                    const response = await global.fetch(url);
                    if (!response.ok) {
                        throw new Error(`Failed to load JSON: ${response.status} ${response.statusText}`);
                    }
                    return await response.json();
                } catch (error) {
                    console.error(`Error loading JSON from ${filePath}:`, error.message);
                    throw error;
                }
            };
        })(this);

        // TODO: confirm if this assumption is valid, seems wrong
        // p5 v2 removed the v1 string helper globals; shim v1 semantics so
        // existing sketches using join()/split()/trim() keep working.
        global.join = (list, separator) => list.join(separator);
        global.split = (str, delim) => str.split(delim);
        global.trim = (str) => (str instanceof Array ? str.map((s) => s.trim()) : str.trim());

        global.createCanvas = (function(that, cc) {
            return function(w, h, renderer) {
                const result = cc(w, h, renderer);
                // windowWidth/windowHeight are read-only in p5.js 2.x — skip the assignment.
                try { that._myP5.windowWidth = w; } catch (_) { /* readonly */ }
                try { that._myP5.windowHeight = h; } catch (_) { /* readonly */ }
                // drawingContext may not exist yet in WEBGL mode until renderer is ready.
                try { global.drawingContext = that._myP5.drawingContext; } catch (_) { /* readonly */ }
                return result;
            };
        })(this, global.createCanvas);

        global.loadStrings = (function(that) {
            return function(filePath, callback, errorCallback) {
                that._preloadIncrement();
                try {
                    const resolvedPath = global._resolveAssetPath(that.sketchPath, filePath);
                    const content = fs.readFileSync(resolvedPath, "utf8");
                    const lines = content
                        .replace(/\r\n/g, "\r")
                        .replace(/\n/g, "\r")
                        .split(/\r/);
                    if (lines.length > 0 && lines[lines.length - 1] === "") lines.pop();
                    if (callback) callback(lines);
                    setImmediate(() => that._preloadDecrement());
                    return lines;
                } catch (error) {
                    setImmediate(() => that._preloadDecrement());
                    if (errorCallback) errorCallback(error);
                    else console.error(`Failed to load strings: ${error.message}`);
                }
            };
        })(this);

        global.loadTable = (function(that) {
            return function(filePath, ...args) {
                that._preloadIncrement();

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

                    // Mirror p5 v2's native loadTable: set columns directly and build rows
                    // via new TableRow(cells). Table.addRow() with no arguments would hit
                    // `new p5.TableRow()` inside the v2 bundle, which throws a
                    // ReferenceError ("p5 is not defined") in the headless build.
                    const P5 = that._loadP5();
                    
                    // p5 v2 TableRow.get/getNum/getString look up string columns via
                    // this.obj[this.table.columns.indexOf(column)] — broken because obj is
                    // keyed by numeric position, so name lookups read the wrong slot (e.g.
                    // returning stale data after set()). Patch the prototype once to read
                    // this.obj[column] instead, matching p5 v1 semantics.
                    if (!that._tableRowPatched) {
                        that._tableRowPatched = true;
                        const proto = P5.TableRow.prototype;
                        proto.get = function (column) {
                            return typeof column === "string" ? this.obj[column] : this.arr[column];
                        };
                        proto.getString = function (column) {
                            return (typeof column === "string" ? this.obj[column] : this.arr[column]).toString();
                        };
                        proto.getNum = function (column) {
                            const value = typeof column === "string" ? this.obj[column] : this.arr[column];
                            const ret = parseFloat(value);
                            if (ret.toString() === "NaN") {
                                throw `Error: ${value} is NaN (Not a Number)`;
                            }
                            return ret;
                        };
                    }
                    const table = new P5.Table();

                    let startRow = 0;
                    if (hasHeader && lines.length > 0) {
                        table.columns = lines[0].split(separator).map(h => h.trim());
                        startRow = 1;
                    }

                    for (let i = startRow; i < lines.length; i++) {
                        const cells = lines[i].split(separator).map(c => c.trim());
                        // Auto-add columns on first data row when no header was provided
                        if (table.columns.length === 0) {
                            table.columns = cells.map((_, j) => String(j));
                        }
                        const row = new P5.TableRow(cells);
                        // Seed name-keyed entries so string column lookups work; v2's
                        // TableRow constructor only keys obj by numeric position.
                        table.columns.forEach((name, j) => { row.obj[name] = cells[j]; });
                        table.addRow(row);
                    }

                    if (callback) callback(table);
                    setImmediate(() => that._preloadDecrement());
                    return table;
                } catch (error) {
                    setImmediate(() => that._preloadDecrement());
                    if (errorCallback) errorCallback(error);
                    else console.error(`Failed to load table: ${error.message}`);
                }
            };
        })(this);
    }

    _validateConfig() {
        super._validateConfig();
        if (this.preload) {
            throw new Error("Invalid config: preload is not supported in p5.js v2 (p5 v2 removed preload()).");
        }

        // TODO: once full async/await support is added, consider adding async function validation; e.g.
        // theFunction.constructor.name === 'AsyncFunction'
    }

    // --- v2-only helpers (not present in p5b_v1.js; tracked preload lifecycle) ---

    _preloadIncrement() {
        this._pendingLoads++;
    }

    _preloadDecrement() {
        this._pendingLoads = Math.max(0, this._pendingLoads - 1);
    }

    _waitForPreloads(timeoutMs = 10000) {
        const startedAt = Date.now();
        return new Promise((resolve, reject) => {
            const poll = () => {
                if (this._pendingLoads <= 0) return resolve();
                if (Date.now() - startedAt >= timeoutMs) {
                    return reject(new Error(`Timed out waiting for preload to finish (${timeoutMs}ms). ${this._pendingLoads} load(s) pending.`));
                }
                setImmediate(poll);
            };
            poll();
        });
    }
}

module.exports = { P5b, P5B_DEFAULTS };
