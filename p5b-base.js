const { EventEmitter } = require("events");
const { P5bDOM } = require("./p5b-dom");

const noop = () => {};

// TODO: function? for any global functions to exec outside of preload/setup/draw?
const P5B_DEFAULTS = {
    sketchPath: null,
    width: 32,
    height: 32,
    fps: 60,
    preload: noop,
    setup: noop,
    draw: noop
};

// TODO: define common globals in this file

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
        if (this.preload && typeof this.preload !== "function") {
            throw new Error("Invalid config: preload must be a function.");
        }
        if (this.setup && typeof this.setup !== "function") {
            throw new Error("Invalid config: setup must be a function.");
        }
        if (this.draw && typeof this.draw !== "function") {
            throw new Error("Invalid config: draw must be a function.");
        }

        global.setup = this.setup;
        global.draw = this.draw;
    }
}

module.exports = { P5bBase, P5B_DEFAULTS, reorderBuffer };
