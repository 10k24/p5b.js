const { EventEmitter } = require('events');
const { JSDOM } = require('jsdom');
const canvas = require('canvas');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const opentype = require('opentype.js');

let p5 = null;

function ensureRuntimeEnvironment() {
    const dom = new JSDOM('<!DOCTYPE html>');
    global.window = dom.window;
    global.document = dom.window.document;
    try {
        Object.defineProperty(global.document, 'readyState', {
            value: 'complete',
            writable: true,
            configurable: true
        });
    } catch (error) {
        // Ignore non-configurable property edge cases across repeated runs.
    }
    global.screen = dom.window.screen;
    global.navigator = dom.window.navigator;
    global.HTMLCanvasElement = dom.window.HTMLCanvasElement;
    global.ImageData = canvas.ImageData;

    if (typeof global.window.requestAnimationFrame !== 'function') {
        global.window.requestAnimationFrame = (callback) => {
            return setTimeout(() => callback(Date.now()), 16);
        };
    }
    if (typeof global.window.cancelAnimationFrame !== 'function') {
        global.window.cancelAnimationFrame = (id) => clearTimeout(id);
    }
    global.requestAnimationFrame = global.window.requestAnimationFrame.bind(global.window);
    global.cancelAnimationFrame = global.window.cancelAnimationFrame.bind(global.window);

    if (!p5) {
        p5 = require('p5');
    }
}

function getCanvas() {
    const canvasEl = document.querySelector('canvas');
    if (!canvasEl) throw new Error('No canvas found');
    return canvasEl;
}

class P5bConfig {
    sketchPath = null;
    assetPath = null;
    width = 32;
    height = 32;
    fps = 60;
    preload = null;
    setup = null;
    draw = null;
    subscribers = [];
};

class P5b extends EventEmitter {
    _p5Instance = null;
    _canvas = null;
    _sketchDir = null;
    _assetDir = null;
    _state = 'idle';
    _latestFrame = null;
    _metrics = {
        framesProduced: 0,
        framesDelivered: 0,
        framesDropped: 0,
        errors: 0
    };
    _globalBackup = null;

    constructor(config = {}) {
        super();

        if (config.sketchPath && config.sketch) {
            throw new Error('Cannot use both sketchPath and sketch object. Choose one.');
        }

        this.c = { ...new P5bConfig(), ...config };
        this.c.subscribers = [...(this.c.subscribers || [])];
        this._validateConfig();

        if (this.c.sketchPath) {
            this._sketchDir = path.dirname(path.resolve(this.c.sketchPath));
        }
        if (this.c.assetPath) {
            this._assetDir = path.resolve(this.c.assetPath);
        } else if (this._sketchDir) {
            this._assetDir = this._sketchDir;
        } else {
            this._assetDir = process.cwd();
        }
    }

    _validateConfig() {
        if (!Number.isFinite(this.c.fps) || this.c.fps <= 0) {
            throw new Error('Invalid config: fps must be a positive number.');
        }
        if (!Number.isInteger(this.c.width) || this.c.width <= 0) {
            throw new Error('Invalid config: width must be a positive integer.');
        }
        if (!Number.isInteger(this.c.height) || this.c.height <= 0) {
            throw new Error('Invalid config: height must be a positive integer.');
        }
    }

    getState() {
        return this._state;
    }

    getMetrics() {
        return { ...this._metrics };
    }

    getLatestFrame() {
        if (!this._latestFrame) {
            return null;
        }
        return new Uint8Array(this._latestFrame);
    }

    interval() {
        return 1000 / this.c.fps;
    }

    _getSketch() {
        const sketch = {};

        if (this.c.sketch && typeof this.c.sketch === 'object') {
            sketch.preload = this.c.sketch.preload || null;
            sketch.setup = this.c.sketch.setup || null;
            sketch.draw = this.c.sketch.draw || null;
        } else {
            sketch.preload = this.c.preload || null;
            sketch.setup = this.c.setup || null;
            sketch.draw = this.c.draw || null;
        }

        if (!sketch.setup && typeof setup === 'function') sketch.setup = setup;
        if (!sketch.draw && typeof draw === 'function') sketch.draw = draw;
        if (!sketch.preload && typeof preload === 'function') sketch.preload = preload;

        return sketch;
    }

    _emitRuntimeError(error, phase) {
        this._metrics.errors += 1;
        const payload = { phase, error, state: this._state };
        if (this.listenerCount('error') > 0) {
            this.emit('error', payload);
        } else {
            console.error(`[p5b:${phase}]`, error);
        }
    }

    _resolveSketchFunctions() {
        if (!this.c.sketchPath) {
            return this._getSketch();
        }

        const absoluteSketchPath = path.resolve(this.c.sketchPath);
        const code = fs.readFileSync(absoluteSketchPath, 'utf8');

        const previous = {
            preload: global.preload,
            setup: global.setup,
            draw: global.draw
        };

        this._globalBackup = previous;
        global.preload = undefined;
        global.setup = undefined;
        global.draw = undefined;

        vm.runInThisContext(code, { filename: absoluteSketchPath });

        return {
            preload: typeof global.preload === 'function' ? global.preload : null,
            setup: typeof global.setup === 'function' ? global.setup : null,
            draw: typeof global.draw === 'function' ? global.draw : null
        };
    }

    _restoreSketchGlobals() {
        if (!this._globalBackup) {
            return;
        }

        global.preload = this._globalBackup.preload;
        global.setup = this._globalBackup.setup;
        global.draw = this._globalBackup.draw;
        this._globalBackup = null;
    }

    _installAssetShims() {
        const assetDir = this._assetDir || process.cwd();

        opentype.load = (fontPath, callback) => {
            const resolvedPath = path.isAbsolute(fontPath)
                ? fontPath
                : path.resolve(assetDir, fontPath);
            try {
                const font = opentype.loadSync(resolvedPath);
                callback(null, font);
            } catch (err) {
                callback(err, null);
            }
        };

        global.XMLHttpRequest = class XMLHttpRequest {
            constructor() {
                this.onload = null;
                this.onerror = null;
                this._url = null;
                this.response = null;
                this.responseType = 'arraybuffer';
                this.status = 0;
                this.readyState = 0;
            }

            open(method, url) {
                this._url = url;
                this.readyState = 1;
            }

            send() {
                try {
                    const filePath = path.isAbsolute(this._url)
                        ? this._url
                        : path.resolve(assetDir, this._url);
                    const fileData = fs.readFileSync(filePath);
                    const start = fileData.byteOffset;
                    const end = fileData.byteOffset + fileData.byteLength;
                    this.response = fileData.buffer.slice(start, end);
                    this.status = 200;
                    this.readyState = 4;
                    if (this.onload) {
                        this.onload();
                    }
                } catch (error) {
                    this.status = 404;
                    this.readyState = 4;
                    if (this.onerror) {
                        this.onerror(error);
                    }
                }
            }
        };

        global.createFilterShader = () => null;
    }

    _resolveAssetPath(inputPath) {
        if (path.isAbsolute(inputPath)) {
            return inputPath;
        }
        const assetDir = this._assetDir || process.cwd();
        return path.resolve(assetDir, inputPath);
    }

    _createLoadFontBridge(pInstance) {
        return (fontPath, onSuccess, onError) => {
            try {
                const resolvedPath = this._resolveAssetPath(fontPath);
                const fontData = fs.readFileSync(resolvedPath);
                const start = fontData.byteOffset;
                const end = fontData.byteOffset + fontData.byteLength;
                const arrayBuffer = fontData.buffer.slice(start, end);
                const parsedFont = opentype.parse(arrayBuffer);
                const p5Font = new p5.Font(pInstance);
                p5Font.font = parsedFont;

                if (typeof onSuccess === 'function') {
                    onSuccess(p5Font);
                }

                return p5Font;
            } catch (error) {
                if (typeof onError === 'function') {
                    onError(error);
                } else {
                    console.error(error);
                }
                return null;
            }
        };
    }

    _scaleToMatrix(srcBuffer, srcWidth, srcHeight, dstWidth, dstHeight) {
        const expectedSourceSize = srcWidth * srcHeight * 4;
        if (srcBuffer.length !== expectedSourceSize) {
            throw new Error(`Invalid source buffer size: ${srcBuffer.length} != ${expectedSourceSize}`);
        }

        const dst = new Uint8Array(dstWidth * dstHeight * 4);

        if (srcWidth === dstWidth && srcHeight === dstHeight) {
            return new Uint8Array(srcBuffer);
        }

        const scaleX = srcWidth / dstWidth;
        const scaleY = srcHeight / dstHeight;

        for (let y = 0; y < dstHeight; y++) {
            for (let x = 0; x < dstWidth; x++) {
                const srcX = Math.min(Math.floor((x + 0.5) * scaleX), srcWidth - 1);
                const srcY = Math.min(Math.floor((y + 0.5) * scaleY), srcHeight - 1);
                const srcIdx = (srcY * srcWidth + srcX) * 4;
                const dstIdx = (y * dstWidth + x) * 4;

                dst[dstIdx] = srcBuffer[srcIdx];
                dst[dstIdx + 1] = srcBuffer[srcIdx + 1];
                dst[dstIdx + 2] = srcBuffer[srcIdx + 2];
                dst[dstIdx + 3] = srcBuffer[srcIdx + 3];
            }
        }

        return dst;
    }

    toFrame() {
        if (!this._canvas) {
            throw new Error('Canvas not initialized. Call run() first.');
        }

        const ctx = this._canvas.getContext('2d');
        const imageData = ctx.getImageData(0, 0, this._canvas.width, this._canvas.height);
        const srcBuffer = new Uint8Array(imageData.data);

        const frame = this._scaleToMatrix(
            srcBuffer,
            this._canvas.width,
            this._canvas.height,
            this.c.width,
            this.c.height
        );

        const expectedSize = this.c.width * this.c.height * 4;
        if (!(frame instanceof Uint8Array) || frame.length !== expectedSize) {
            throw new Error(`Invalid frame output size: ${frame.length} != ${expectedSize}`);
        }

        return frame;
    }

    _notifySubscribers(frame) {
        for (const subscriber of this.c.subscribers) {
            try {
                subscriber(frame);
                this._metrics.framesDelivered += 1;
            } catch (error) {
                this._state = 'faulted';
                this._emitRuntimeError(error, 'subscriber');
                this.stop();
                return;
            }
        }
    }

    _bindP5Globals(pInstance) {
        for (const key in pInstance) {
            const value = pInstance[key];
            if (typeof value === 'function') {
                global[key] = value.bind(pInstance);
            } else {
                global[key] = value;
            }
        }

        // Use deterministic Node-side font loading to avoid browser XHR edge cases.
        global.loadFont = this._createLoadFontBridge(pInstance);
    }

    run() {
        if (this._state === 'starting' || this._state === 'running') {
            throw new Error('P5b is already running. Call stop() before run().');
        }

        this._validateConfig();
        ensureRuntimeEnvironment();
        this._installAssetShims();

        const resolvedSketch = this._resolveSketchFunctions();
        const preloadFn = resolvedSketch.preload;
        const setupFn = resolvedSketch.setup;
        const drawFn = resolvedSketch.draw;

        this._state = 'starting';

        const sketch = (pInstance) => {
            if (typeof preloadFn === 'function') {
                pInstance.preload = () => {
                    try {
                        this._bindP5Globals(pInstance);
                        preloadFn();
                    } catch (error) {
                        this._state = 'faulted';
                        this._emitRuntimeError(error, 'preload');
                        this.stop();
                    }
                };
            }

            pInstance.setup = () => {
                if (this._state !== 'starting') {
                    return;
                }

                try {
                    this._bindP5Globals(pInstance);

                    if (typeof setupFn === 'function') {
                        setupFn();
                    }

                    this._canvas = getCanvas();
                    this._state = 'running';
                    this.emit('start', {
                        width: this.c.width,
                        height: this.c.height,
                        fps: this.c.fps
                    });
                } catch (error) {
                    this._state = 'faulted';
                    this._emitRuntimeError(error, 'setup');
                    this.stop();
                }
            };

            pInstance.draw = () => {
                if (this._state !== 'running') {
                    return;
                }

                try {
                    this._bindP5Globals(pInstance);

                    if (typeof drawFn === 'function') {
                        drawFn();
                    }

                    const frame = this.toFrame();
                    this._latestFrame = frame;
                    this._metrics.framesProduced += 1;
                    this.emit('frame', frame);
                    this._notifySubscribers(frame);

                    if (!drawFn) {
                        this.noLoop();
                    }
                } catch (error) {
                    if (this._state !== 'faulted') {
                        this._state = 'faulted';
                        this._emitRuntimeError(error, 'draw');
                    }
                    this.stop();
                }
            };
        };

        this._p5Instance = new p5(sketch);
        this._p5Instance.frameRate(this.c.fps);
    }

    noLoop() {
        if (this._p5Instance) {
            this._p5Instance.noLoop();
        }
    }

    redraw() {
        if (this._p5Instance) {
            this._p5Instance.redraw();
        }
    }

    loop() {
        if (this._p5Instance) {
            this._p5Instance.loop();
        }
    }

    stop() {
        if (this._p5Instance && typeof this._p5Instance.remove === 'function') {
            this._p5Instance.remove();
        }

        this._p5Instance = null;
        this._canvas = null;
        this._restoreSketchGlobals();

        if (this._state !== 'stopped') {
            this._state = 'stopped';
            this.emit('stop', this.getMetrics());
        }
    }

    addSubscriber(subscriber) {
        if (typeof subscriber === 'function') {
            this.c.subscribers.push(subscriber);
        }
    }

    removeSubscriber(subscriber) {
        const index = this.c.subscribers.indexOf(subscriber);
        if (index > -1) {
            this.c.subscribers.splice(index, 1);
        }
    }

    getSubscribers() {
        return [...this.c.subscribers];
    }
}

module.exports = { P5b, P5bConfig };


sadfasdf 