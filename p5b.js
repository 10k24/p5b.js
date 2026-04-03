const { EventEmitter } = require('events');
const { JSDOM } = require('jsdom');
const canvas = require('canvas');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const opentype = require('opentype.js');

let p5 = null;
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
        this._p5Instance = null;
        this._canvas = null;
        this._metrics = {
            framesDrawn: 0,
            errors: 0
        };
        this._validateConfig();
        this._initDOM();
    }

    run() {
        if (this._p5Instance) {
            throw new Error('P5b is already running. Call stop() before run().');
        }

        const sketch = (pInstance) => {
            this._p5Instance = pInstance;
            this._bindGlobals();
            this._initSketch();
        };

        new p5(sketch);
        this._p5Instance.frameRate(this.fps);
    }

    stop() {
        if (this._p5Instance) {
            this._p5Instance.remove();
        }
        this._p5Instance = null;
        this._canvas = null;
    }

    toFrame() {
        if (!this._canvas) {
            throw new Error('Canvas not initialized. Call run() first.');
        }

        const srcWidth = this._canvas.width;
        const srcHeight = this._canvas.height;
        const dstWidth = this.width;
        const dstHeight = this.height;
        const ctx = this._canvas.getContext('2d');
        const imageData = ctx.getImageData(0, 0, srcWidth, srcHeight);
        const srcBuffer = new Uint8Array(imageData.data);

        if (srcWidth === dstWidth && srcHeight === dstHeight) {
            return new Uint8Array(srcBuffer);
        }

        const frame = new Uint8Array(dstWidth * dstHeight * 4);
        const scaleX = srcWidth / dstWidth;
        const scaleY = srcHeight / dstHeight;

        for (let y = 0; y < dstHeight; y++) {
            for (let x = 0; x < dstWidth; x++) {
                const srcX = Math.min(Math.floor((x + 0.5) * scaleX), srcWidth - 1);
                const srcY = Math.min(Math.floor((y + 0.5) * scaleY), srcHeight - 1);
                const srcIdx = (srcY * srcWidth + srcX) * 4;
                const dstIdx = (y * dstWidth + x) * 4;

                frame[dstIdx] = srcBuffer[srcIdx];
                frame[dstIdx + 1] = srcBuffer[srcIdx + 1];
                frame[dstIdx + 2] = srcBuffer[srcIdx + 2];
                frame[dstIdx + 3] = srcBuffer[srcIdx + 3];
            }
        }

        return frame;
    }

    getMetrics() {
        return this._metrics;
    }

    _initSketch() {
        this._p5Instance.preload = () => {
            try {
                global.preload();
            } catch (error) {
                this._emitRuntimeError(error, 'preload');
                this.stop();
            }
        };

        this._p5Instance.setup = () => {
            try {
                global.setup();
                this._canvas = document.querySelector('canvas');
            } catch (error) {
                this._emitRuntimeError(error, 'setup');
                this.stop();
            }
        };

        this._p5Instance.draw = () => {
            try {
                global.draw();
                this._metrics.framesDrawn++;
                this.emit('frame', this.toFrame());
            } catch (error) {
                this._emitRuntimeError(error, 'draw');
                this.stop();
            }
        };
    }

    _bindGlobals() {
        for (const [key, value] of Object.entries(this._p5Instance)) {
            if (typeof value === 'function') {
                global[key] = value.bind(this._p5Instance);
            } else {
                global[key] = value;
            }
        }

        global.loadFont = (fontPath) => {
            const assetDir = this.sketchPath
                ? path.dirname(path.resolve(this.sketchPath))
                : process.cwd();
            const fontData = fs.readFileSync(
                path.isAbsolute(fontPath)
                    ? fontPath
                    : path.resolve(assetDir, fontPath)
            );
            const parsedFont = opentype.parse(
                fontData.buffer.slice(fontData.byteOffset, fontData.byteOffset + fontData.byteLength)
            );
            const p5Font = new p5.Font(this._p5Instance);
            p5Font.font = parsedFont;
            return p5Font;
        };
    }

    _emitRuntimeError(error, phase) {
        this._metrics.errors++;
        if (this.listenerCount('error') > 0) {
            this.emit('error', { phase, error });
        }
    }

    _validateConfig() {
        if (!Number.isFinite(this.fps) || this.fps <= 0) {
            throw new Error('Invalid config: fps must be a positive number.');
        }
        if (!Number.isInteger(this.width) || this.width <= 0) {
            throw new Error('Invalid config: width must be a positive integer.');
        }
        if (!Number.isInteger(this.height) || this.height <= 0) {
            throw new Error('Invalid config: height must be a positive integer.');
        }
        if (this.preload && typeof this.preload !== 'function') {
            throw new Error('Invalid config: preload must be a function.');
        }
        if (this.setup && typeof this.setup !== 'function') {
            throw new Error('Invalid config: setup must be a function.');
        }
        if (this.draw && typeof this.draw !== 'function') {
            throw new Error('Invalid config: draw must be a function.');
        }

        global.preload = this.preload;
        global.setup = this.setup;
        global.draw = this.draw;

        // Execute sketch if provided (overwrites globals)
        if (this.sketchPath) {
            const absoluteSketchPath = path.resolve(this.sketchPath);
            const code = fs.readFileSync(absoluteSketchPath, 'utf8');
            vm.runInThisContext(code, { filename: absoluteSketchPath });
        }
    }

    _initDOM() {
        // Create DOM environment
        const dom = new JSDOM('<!DOCTYPE html>');
        const window = dom.window;

        // Install DOM globals
        global.window = window;
        global.document = window.document;
        global.document.readyState = 'complete';
        global.screen = window.screen;
        global.navigator = window.navigator;
        global.HTMLCanvasElement = window.HTMLCanvasElement;
        global.ImageData = canvas.ImageData;

        // Install animation frame globals
        window.requestAnimationFrame = (callback) => setImmediate(callback);
        window.cancelAnimationFrame = (id) => clearImmediate(id);
        global.requestAnimationFrame = window.requestAnimationFrame.bind(window);
        global.cancelAnimationFrame = window.cancelAnimationFrame.bind(window);

        // Lazy-load p5
        if (!p5) {
            p5 = require('p5');
        }
    }
}

module.exports = { P5b, P5B_DEFAULTS };