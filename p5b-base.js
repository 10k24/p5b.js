const canvas = require("canvas");
const { EventEmitter } = require("events");
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { P5bDOM } = require("./p5b-dom");

const noop = () => {};

// TODO: function? for any global functions to exec outside of preload/setup/draw?
const P5B_DEFAULTS = {
    sketchPath: null,
    width: 32,
    height: 32,
    fps: 60,
    setup: noop,
    draw: noop
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
        this._dom = new P5bDOM(this.width, this.height, { p5Major: this.p5Major });
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
        if (this.setup && typeof this.setup !== "function") {
            throw new Error("Invalid config: setup must be a function.");
        }
        if (this.draw && typeof this.draw !== "function") {
            throw new Error("Invalid config: draw must be a function.");
        }
    }

    // TODO: is this needed?
    _propertySetter(_key, _value) {
        throw new Error("_propertySetter(key, value) must be implemented.");
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
    }
}

module.exports = { P5bBase, P5B_DEFAULTS, reorderBuffer };
