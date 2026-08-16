const canvas = require("canvas");
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const opentype = require("opentype.js");
const { P5bBase, P5B_DEFAULTS, reorderBuffer } = require("./p5b-base");

const noop = () => {};

// TODO: need async/await support in v2 API

class P5b extends P5bBase {
    constructor(config = {}) {
        super({ ...config, p5Major: 2 });
        this._pendingLoads = 0;
    }

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

        // p5.js 2.x removed preload() — do not assign it on the p5 instance or
        // the FES will throw before setup runs. If the user provided a preload
        // function, invoke it synchronously before setup as a best-effort shim.
        // Config preload wins; for sketchPath mode the sketch's own preload is
        // written to global.preload by vm.runInThisContext() in _bindGlobals().
        // Compare against P5B_DEFAULTS.preload (not this module's noop) so the
        // default no-op preload isn't mistaken for a user-provided one.
        const _userPreload = (typeof this.preload === "function" && this.preload !== P5B_DEFAULTS.preload)
            ? this.preload
            // Only sketchPath mode writes the sketch's preload to global.preload (via vm).
            // Gating on sketchPath prevents a stale preload from a prior sketchPath instance
            // leaking into inline-config instances when test files share one process.
            : (this.sketchPath && typeof global.preload === "function" ? global.preload : this.preload);
        const hasUserPreload = typeof _userPreload === "function" && _userPreload !== P5B_DEFAULTS.preload;

        this._myP5.setup = async () => {
            if (hasUserPreload) {
                try { _userPreload(); } catch (error) {
                    this._emitRuntimeError(error, "preload");
                    this.stop();
                    return;
                }
            }
            try {
                // Wait for pending preload loads (loadImage/loadStrings/loadTable) to settle
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

        // p5 v2 may call global.draw() directly; wrap user draw in global.draw so errors
        // are caught regardless of which code path p5 uses to invoke draw.
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

    _bindGlobals() {
        // Walk prototype chain to bind all functions and key properties
        for (const key in this._myP5) {
            const value = this._myP5[key];
            if (typeof value === "function") {
                global[key] = value.bind(this._myP5);

            } else if (!key.startsWith("_")) {
                // Bind non-private properties (like frameCount, width, height)
                Object.defineProperty(global, key, {
                    get: () => this._myP5?.[key],
                    set: (val) => { if (this._myP5) try { this._myP5[key] = val; } catch (_) { /* readonly in p5 2.x */ } },
                    configurable: true
                });
            }
        }

        // Bind windowWidth/windowHeight explicitly - they may not exist on p5 instance
        // until createCanvas() is called, but should still be accessible
        // Use ?? 0 fallback to match p5.js behavior before createCanvas()
        Object.defineProperty(global, "windowWidth", {
            get: () => this._myP5?.windowWidth ?? 0,
            configurable: true
        });
        Object.defineProperty(global, "windowHeight", {
            get: () => this._myP5?.windowHeight ?? 0,
            configurable: true
        });

        // Execute sketch if provided (overwrites globals)
        if (this.sketchPath) {
            const absoluteSketchPath = path.resolve(this.sketchPath);
            const code = fs.readFileSync(absoluteSketchPath, "utf8");
            vm.runInThisContext(code, { filename: absoluteSketchPath });
        }

        global._resolveAssetPath = function(sketchPath, filePath) {
            const assetDir = sketchPath
                ? path.dirname(path.resolve(sketchPath))
                : process.cwd();
            return path.isAbsolute(filePath)
                ? filePath
                : path.resolve(assetDir, filePath);
        };
        
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
                const bucket = that._gfxPool.get(key);
                if (bucket && bucket.length > 0) {
                    const pg = bucket.pop();
                    that._gfxActive.push({ pg, key });
                    return pg;
                }
                
                const ret = cg(w, h, ...rest);
                // Override .remove() on new graphics so they return to the pool.
                // v2: createGraphics no longer pushes to _elements, so pooling happens
                // entirely through this override (v1 pools via _elements growth checks).
                if (!that._gfxPool.has(key)) that._gfxPool.set(key, []);
                ret.remove = () => {
                    if (ret.elt && ret.elt.parentNode) {
                        ret.elt.parentNode.removeChild(ret.elt);
                    }
                    if (ret.elt) that._dom.removeTrackedCanvas(ret.elt);
                    that._gfxPool.get(key).push(ret);
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

        // p5.js standalone math functions (pass-through to Math)
        global.abs = Math.abs;
        global.ceil = Math.ceil;
        global.floor = Math.floor;
        global.round = Math.round;
        global.pow = Math.pow;
        global.sqrt = Math.sqrt;
        global.exp = Math.exp;
        global.log = Math.log;
        global.max = Math.max;
        global.min = Math.min;
        global.sin = Math.sin;
        global.cos = Math.cos;
        global.tan = Math.tan;
        global.asin = Math.asin;
        global.acos = Math.acos;
        global.atan = Math.atan;
        global.atan2 = Math.atan2;
        global.PI = Math.PI;
        global.TWO_PI = Math.PI * 2;
        global.HALF_PI = Math.PI / 2;
        global.QUARTER_PI = Math.PI / 4;
        global.TAU = Math.PI * 2;

        // p5.js constants
        global.DEGREES = "degrees";
        global.RADIANS = "radians";
        global.P2D = "p2d";
        global.WEBGL = "webgl";
        global.WEBGL2 = "webgl2";
        global.CORNER = "corner";
        global.CORNERS = "corners";
        global.RADIUS = "radius";
        global.CENTER = "center";
        global.LEFT = "left";
        global.RIGHT = "right";
        global.TOP = "top";
        global.BOTTOM = "bottom";
        global.BASELINE = "alphabetic";
        global.CLOSE = "close";
        global.OPEN = "open";
        global.CHORD = "chord";
        global.PIE = "pie";
        global.ROUND = "round";
        global.SQUARE = "butt";
        global.PROJECT = "square";
        global.BEVEL = "bevel";
        global.MITER = "miter";
        global.POINTS = 0x0000;
        global.LINES = 0x0001;
        global.LINE_STRIP = 0x0003;
        global.LINE_LOOP = 0x0002;
        global.TRIANGLES = 0x0004;
        global.TRIANGLE_FAN = 0x0006;
        global.TRIANGLE_STRIP = 0x0005;
        global.QUADS = "quads";
        global.QUAD_STRIP = "quad_strip";
        global.TESS = "tess";
        global.LINEAR = "linear";
        global.QUADRATIC = "quadratic";
        global.BEZIER = "bezier";
        global.CURVE = "curve";
        global.RGB = "rgb";
        global.HSB = "hsb";
        global.HSL = "hsl";
        global.BLEND = "source-over";
        global.REMOVE = "destination-out";
        global.ADD = "lighter";
        global.DARKEST = "darken";
        global.LIGHTEST = "lighten";
        global.DIFFERENCE = "difference";
        global.SUBTRACT = "subtract";
        global.EXCLUSION = "exclusion";
        global.MULTIPLY = "multiply";
        global.SCREEN = "screen";
        global.REPLACE = "copy";
        global.OVERLAY = "overlay";
        global.HARD_LIGHT = "hard-light";
        global.SOFT_LIGHT = "soft-light";
        global.DODGE = "color-dodge";
        global.BURN = "color-burn";
        global.ARROW = "default";
        global.CROSS = "crosshair";
        global.HAND = "pointer";
        global.MOVE = "move";
        global.TEXT = "text";
        global.WAIT = "wait";
        global.ALT = 18;
        global.CONTROL = 17;
        global.SHIFT = 16;
        global.OPTION = 18;
        global.BACKSPACE = 8;
        global.DELETE = 46;
        global.TAB = 9;
        global.ENTER = 13;
        global.RETURN = 13;
        global.ESCAPE = 27;
        global.UP_ARROW = 38;
        global.DOWN_ARROW = 40;
        global.LEFT_ARROW = 37;
        global.RIGHT_ARROW = 39;
        global.NORMAL = "normal";
        global.ITALIC = "italic";
        global.BOLD = "bold";
        global.BOLDITALIC = "bold italic";
        global.CHAR = "CHAR";
        global.WORD = "WORD";
        global.AUTO = "auto";
        global.STROKE = "stroke";
        global.FILL = "fill";
        global.TEXTURE = "texture";
        global.IMMEDIATE = "immediate";
        global.NEAREST = "nearest";
        global.REPEAT = "repeat";
        global.CLAMP = "clamp";
        global.MIRROR = "mirror";
        global.FLAT = "flat";
        global.SMOOTH = "smooth";
        global.LANDSCAPE = "landscape";
        global.PORTRAIT = "portrait";

        // Accessibility functions - noop in headless environment (no DOM/screen readers)
        global.describe = noop;
        global.describeElement = noop;
        global.textOutput = noop;
        global.gridOutput = noop;

        // File I/O functions - noop in headless environment
        global.saveCanvas = noop;
        global.saveFrames = noop;
        global.saveJSON = noop;
        global.saveStrings = noop;
        global.saveTable = noop;
        global.saveImage = noop;
        global.print = (msg) => console.log(msg);

        // p5 v2 removed the v1 string helper globals; shim v1 semantics so
        // existing sketches using join()/split()/trim() keep working.
        global.join = (list, separator) => list.join(separator);
        global.split = (str, delim) => str.split(delim);
        global.trim = (str) => (str instanceof Array ? str.map((s) => s.trim()) : str.trim());
        
        // Mouse/keyboard event handlers - noop in headless environment
        global.mousePressed = noop;
        global.mouseReleased = noop;
        global.mouseMoved = noop;
        global.mouseDragged = noop;
        global.mouseWheel = noop;
        global.keyPressed = noop;
        global.keyReleased = noop;
        global.touchStarted = noop;
        global.touchEnded = noop;
        global.touchMoved = noop;
        global.cursor = noop;
        global.noCursor = noop;
        
        // Mouse/keyboard properties - all zero in headless
        global.mouseX = 0;
        global.mouseY = 0;
        global.pmouseX = 0;
        global.pmouseY = 0;
        global.key = "";
        global.keyCode = 0;
        global.accelerationX = 0;
        global.accelerationY = 0;
        global.accelerationZ = 0;

        // Audio functions - noop in headless environment (p5.sound)
        global.loadSound = noop;
        global.loadAudio = noop;
        global.createAudio = noop;
        global.getAudioContext = noop;
        global.userStartAudio = noop;
        global.soundFormats = noop;

        global.windowResized = (function(that, wr) {
            return function() {
                that._dom.resize(that.width, that.height);
                that._destCanvas = canvas.createCanvas(that.width, that.height);
                if (typeof that.windowResized === "function") {
                    that.windowResized();
                }
                if (typeof wr === "function") wr();
            };
        })(this, global.windowResized);

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
