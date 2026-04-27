const canvas = require("canvas");
const fs = require("fs");
const path = require("path");
const vm = require("vm");
// const opentype = require("opentype.js");
const { P5bBase, P5B_DEFAULTS } = require("./p5b-base");

const noop = () => {};

class P5b extends P5bBase {
    constructor(config = {}) {
        super(config);
        this._pendingLoads = 0;
    }

    _buildFont(fontPath, arrayBuffer, parsedFont) {
        // v2: Font constructor requires (p, fontFace, name, path, data)
        // Pass a FontFace stub so the instanceof check passes, then attach opentype data.
        // Use the actual font family name so multiple loaded fonts don't collide on the same CSS family.
        const family = parsedFont.names?.fontFamily?.en || parsedFont.names?.fullName?.en || "font";
        const fontFace = new global.FontFace(family, arrayBuffer);
        const p5Font = new (this._loadP5()).Font(this._myP5, fontFace, family, fontPath, arrayBuffer);
        p5Font.font = parsedFont;
        return p5Font;
    }

    _loadP5() {
        global.performance = {
            now: () => Date.now()
        };
        // p5.js 2.x Font constructor checks `instanceof FontFace` (browser Web Font API).
        // Provide a minimal stub: stores family/source, exposes status='loaded' and
        // the descriptor properties (weight, stretch, style) that p5.js reads.
        if (!global.FontFace) {
            global.FontFace = class FontFace {
                constructor(family, source, descriptors = {}) {
                    this.family = family;
                    this.status = "loaded";
                    this.weight = descriptors.weight || "normal";
                    this.stretch = descriptors.stretch || "normal";
                    this.style = descriptors.style || "normal";
                }
                load() { return Promise.resolve(this); }
            };
        }
        const p5 = require("p5").default || require("p5");
        // Disable p5.js 2.x FES features that require a real browser environment
        // (sketch_verifier fetches <script> tags; fes_core checks for removed APIs).
        // Neither is meaningful in a headless Node.js context.
        p5.disableFriendlyErrors = true;
        return p5;
    }

    _onCanvasCreated(w, h) {
        // v2: windowWidth/windowHeight are instance properties cached at construction from
        // window.innerWidth/Height. Update both the cached instance values and the DOM shim
        // so sketches see canvas dimensions as window dimensions (headless compatibility).
        if (global.window) {
            global.window.innerWidth = w;
            global.window.innerHeight = h;
        }
        this._myP5.windowWidth = w;
        this._myP5.windowHeight = h;
    }

    _trackNewGraphics(ret, key) {
        // v2: createGraphics no longer pushes to _elements, so pool via remove() override
        if (!this._gfxPool.has(key)) this._gfxPool.set(key, []);
        ret.remove = () => this._gfxPool.get(key).push(ret);
    }

    _preloadIncrement() {
        this._pendingLoads++;
    }

    _preloadDecrement() {
        this._pendingLoads = Math.max(0, this._pendingLoads - 1);
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

    toFrame() {
        const srcCanvas = this._myP5?.canvas;
        if (!srcCanvas) {
            throw new Error("Canvas not initialized. Call run() first.");
        }

        const srcW = srcCanvas.width;
        const srcH = srcCanvas.height;
        const isP3D = Boolean(this._myP5._renderer?.isP3D);

        // Happy path: canvas dimensions match p5b config — return RGBA pixels directly.
        // node-canvas getImageData() (used by loadPixels) and p5 WebGL loadPixels both return RGBA.
        if (srcW === this.width && srcH === this.height) {
            this._myP5.loadPixels();
            return new Uint8Array(this._myP5.pixels.buffer);
        }

        // Scale path: letterbox source into _destCanvas at the p5b target dimensions.
        // WebGL canvas can't be passed to drawImage directly; read pixels via loadPixels
        // and copy into a temporary 2D canvas. 2D canvas can be used as-is.
        let srcDrawable;
        if (isP3D) {
            this._myP5.loadPixels();
            srcDrawable = canvas.createCanvas(srcW, srcH);
            srcDrawable.getContext("2d").putImageData(
                new canvas.ImageData(new Uint8ClampedArray(this._myP5.pixels.buffer), srcW, srcH),
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

        // Stretch source to fill destination exactly.
        ctx.drawImage(srcDrawable, 0, 0, srcW, srcH, 0, 0, this.width, this.height);

        if (isP3D) {
            // getImageData returns RGBA — no channel reorder needed.
            return new Uint8Array(ctx.getImageData(0, 0, this.width, this.height).data.buffer);
        }

        // node-canvas toBuffer("raw") returns BGRA; swap to RGBA.
        const raw = this._destCanvas.toBuffer("raw");
        const out = new Uint8Array(raw);
        for (let i = 0; i < out.length; i += 4) {
            const b = out[i]; out[i] = out[i + 2]; out[i + 2] = b;
        }
        return out;
    }

    _initSketch() {
        this._myP5.frameRate(this.fps);

        // p5.js 2.x removed preload() — do not assign it on the p5 instance or
        // the FES will throw before setup runs. If the user provided a preload
        // function, invoke it synchronously before setup as a best-effort shim.
        const userPreload = this.preload;
        const hasUserPreload = typeof userPreload === "function" && userPreload !== noop;

        this._myP5.setup = async () => {
            if (hasUserPreload) {
                try { userPreload(); } catch (error) {
                    this._emitRuntimeError(error, "preload");
                    this.stop();
                    return;
                }
            }
            try {
                // Await in case sketch setup is async (e.g. uses await loadFont())
                await global.setup();
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

        this._myP5.draw = () => {
            try {
                // Block animation loop calls when stopped, but always allow redraw() through
                if (!this._redrawing && this._metrics.framesDrawn > 0 && !this._myP5.isLooping()) {
                    return;
                }

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
                    set: (val) => { try { this._myP5[key] = val; } catch (_) { /* readonly in p5 2.x */ } },
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
            // p5.js 2.x uses Typr (not opentype.js) internally for WEBGL glyph rendering.
            // p5.Font.data and _positionGlyphs both expect a Typr-parsed font object.
            // We read the file with fs, pass raw bytes to p5's own parseFontData (which
            // uses Typr), then construct a proper p5.Font. We also register the font with
            // node-canvas so 2D graphics (createGraphics + textFont) can render it.
            return async function(fontPath) {
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
                const bytes = new Uint8Array(fontData);
                // parseFontData accepts Uint8Array directly, skipping fetch, parses with Typr
                const rawFont = await that._myP5.parseFontData(bytes);
                const fontName = path.basename(fontPath, path.extname(fontPath));
                const fontFace = new global.FontFace(fontName, bytes);
                // Register with node-canvas so 2D canvas text rendering (createGraphics, pg.text) works
                canvas.registerFont(resolvedPath, { family: fontName });
                const p5Font = new (that._loadP5()).Font(that._myP5, fontFace, fontName, fontPath, rawFont);
                // hasGlyphData() checks textFont.font.data — font.font must be the Typr-parsed font
                // and Typr fonts expose their data via the object itself (not .data property),
                // so we set .data to a truthy sentinel to satisfy the check.
                p5Font.font = rawFont;
                p5Font.font.data = bytes;
                return p5Font;
            };
        })(this);

        // loadImage: mirrors p5.js's original loadImage contract exactly.
        // Returns a p5.Image shell synchronously (so img = loadImage(path) works
        // in preload and img.width/height are usable in setup/draw after the
        // preload counter clears). The shell is backed by a node-canvas Canvas,
        // so p5.js's image() function can draw it via img.canvas/.drawingContext.
        global.loadImage = (function(that) {
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
}

module.exports = { P5b, P5B_DEFAULTS };
