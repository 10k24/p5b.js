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
        this._myP5 = null;
        this._destCanvas = null;
        this._gfxPool = new Map();
        this._gfxActive = [];
        this._metrics = {
            framesDrawn: 0,
            errors: 0
        };
        this._validateConfig();
        this._dom = new P5bDOM(this.width, this.height);
    }

    run() {
        if (this._myP5) {
            throw new Error("P5b is already running. Call stop() before run().");
        }

        const sketch = (pInstance) => {
            this._myP5 = pInstance;
            this._bindGlobals();
            this._initSketch();
        };

        new (this._loadP5())(sketch);
    }

    stop() {
        this._myP5?.remove();
        this._myP5 = null;
        this._destCanvas = null;
        this._dom.clear();
        this._gfxPool.clear();
        this._gfxActive = [];
    }

    toFrame() {
        const srcCanvas = this._myP5?.canvas;
        if (!srcCanvas) {
            throw new Error("Canvas not initialized. Call run() first.");
        }

        if (!this._destCanvas) {
            this._destCanvas = canvas.createCanvas(this.width, this.height);
        }

        const ctx = this._destCanvas.getContext("2d");
        
        // Ensure a blank canvas on all pixels when not stretching source frame
        ctx.clearRect(0, 0, this.width, this.height);

        // Fit to destination, do not stretch
        const xRatio = this.width / srcCanvas.width;
        const yRatio = this.height / srcCanvas.height;
        const scaleFactor = Math.min(xRatio, yRatio);

        ctx.drawImage(
            srcCanvas,
            0, 0, srcCanvas.width, srcCanvas.height,
            0, 0, srcCanvas.width * scaleFactor, srcCanvas.height * scaleFactor
        );

        const ret = new Uint8Array(this._destCanvas.toBuffer("raw"));

        // Swap pixel data order BGRA -> RGBA
        for (let i = 0; i < ret.length; i += 4) {
            const swapR2B = ret[i];
            const swapB2R = ret[i + 2];
            ret[i] = swapB2R;
            ret[i + 2] = swapR2B;
        }

        return ret;
    }

    getMetrics() {
        return this._metrics;
    }

    _loadP5() {
        return require("p5").default || require("p5");
    }

    _initSketch() {
        this._myP5.frameRate(this.fps);

        this._myP5.preload = () => {
            try {
                global.preload();
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

        this._myP5.draw = () => {
            try {
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
                    set: (val) => { this._myP5[key] = val; },
                    configurable: true
                });
            }
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
            return function(fontPath) {
                const resolvedPath = global._resolveAssetPath(that.sketchPath, fontPath);
                const fontData = fs.readFileSync(resolvedPath);
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
                    rawImg.src = Buffer.from(imageData);
                    pImg = new (that._loadP5()).Image(rawImg.width, rawImg.height);
                    pImg.drawingContext.drawImage(rawImg, 0, 0);
                    // Ignoring for now, only needed for webGL to refresh textures
                    // pImg.modified = true;
                    if (onSuccess) onSuccess(pImg);
                    setImmediate(() => p5._decrementPreload());
                };

                const handleError = (error) => {
                    setImmediate(() => p5._decrementPreload());
                    if (onError) onError(error);
                    else console.error(`Failed to load image: ${error.message}`);
                };

                if (url.startsWith("file://")) {
                    try {
                        const buf = fs.readFileSync(resolvedPath);
                        loadImageData(buf.buffer);
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
    }

    _emitRuntimeError(error, phase) {
        this._metrics.errors++;
        this.emit("error", { phase, error });
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
