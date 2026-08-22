const canvas = require("canvas");
const path = require("path");
const { P5bBase, P5B_DEFAULTS, request, fetchJSON, reorderBuffer, resolveAssetPath, resolveAssetUrl } = require("./p5b-base");

class P5b extends P5bBase {
    constructor(config = {}) {
        super({ ...config, p5Version: 2 });
    }

    toFrame() {
        const srcCanvas = this._myP5?.canvas;
        if (!srcCanvas) {
            throw new Error("P5b canvas not initialized, call run() first.");
        }

        if (srcCanvas.width === this.width && srcCanvas.height === this.height) {
            return this._pixels();
        }

        // Scale path: WebGL canvas can't be passed to drawImage directly; read pixels via
        // loadPixels and copy into a temporary 2D canvas. 2D canvas can be used as-is.
        const isP3D = Boolean(this._myP5._renderer?.isP3D);
        let srcDrawable;
        if (isP3D) {
            this._myP5.loadPixels();
            // Cache the read-back canvas (recreated only on size change) instead of
            // allocating a new node-canvas surface every frame.
            if (!this._glReadCanvas || this._glReadCanvas.width !== srcCanvas.width || this._glReadCanvas.height !== srcCanvas.height) {
                this._glReadCanvas = canvas.createCanvas(srcCanvas.width, srcCanvas.height);
            }
            srcDrawable = this._glReadCanvas;
            srcDrawable.getContext("2d").putImageData(
                new canvas.ImageData(new Uint8ClampedArray(this._myP5.pixels.buffer), srcCanvas.width, srcCanvas.height),
                0, 0
            );
        } else {
            srcDrawable = srcCanvas;
        }

        const dest = this._letterbox(srcDrawable, srcCanvas.width, srcCanvas.height);

        if (isP3D) {
            // getImageData returns RGBA — no channel reorder needed.
            return new Uint8Array(dest.getContext("2d").getImageData(0, 0, this.width, this.height).data.buffer);
        }

        return reorderBuffer(dest.toBuffer("raw"));
    }

    _loadP5() {
        const p5 = super._loadP5();
        p5.disableFriendlyErrors = true;
        return p5;
    }

    _initSketch() {
        this._myP5.frameRate(this.fps);

        this._myP5.setup = async () => {
            try {
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

    _bindGlobals() {
        super._bindGlobals();

        global.loadFont = async (fontPath) => {
            const resolvedPath = resolveAssetPath(this.sketchPath, fontPath);
            const { fontData, parsedFont } = this._readFont(resolvedPath);
            const family = parsedFont.names?.fontFamily?.en
                || parsedFont.names?.fullName?.en
                || path.basename(fontPath, path.extname(fontPath));
            const fontFace = new global.FontFace(family, fontData);
            canvas.registerFont(resolvedPath, { family });
            const p5Font = new (this._loadP5()).Font(this._myP5, fontFace, family, fontPath, parsedFont);
            p5Font.font = parsedFont;
            p5Font.font.data = fontData;
            return p5Font;
        };

        // loadImage returns a Promise<p5.Image> for `await loadImage(path)` in async setup().
        // Legacy onSuccess/onError callbacks are still supported.
        global.loadImage = async (filePath, onSuccess, onError) => {
            if (!this._myP5) {
                throw new Error("P5 instance is broken, did you call p5b.stop()?");
            }

            try {
                const rawImg = new global.Image();
                await new Promise((resolve, reject) => {
                    rawImg.onload = resolve;
                    rawImg.onerror = (err) => reject(err instanceof Error ? err : new Error(String(err)));
                    rawImg.src = resolveAssetUrl(this.sketchPath, filePath);
                });

                const pImg = this._imageFromCanvas(rawImg);
                if (onSuccess) onSuccess(pImg);
                return pImg;
            } catch (error) {
                if (onError) onError(error);
                else console.error(`Failed to load image: ${error.message}`);
                throw error;
            }
        };

        // Pool-based createGraphics: reuse Graphics objects across frames
        const _origCreateGraphics = global.createGraphics;
        global.createGraphics = (w, h, ...rest) => {
            const key = `${w}:${h}`;
            const pg = this._gfxAcquire(key);
            if (pg) return pg;

            const ret = _origCreateGraphics(w, h, ...rest);
            ret.remove = () => this._removeGraphics(ret, key);
            return ret;
        };

        global.loadJSON = async (filePath) => {
            try {
                return await fetchJSON(resolveAssetUrl(this.sketchPath, filePath));
            } catch (error) {
                console.error(`Error loading JSON from ${filePath}:`, error.message);
                throw error;
            }
        };

        const _origCreateCanvas = global.createCanvas;
        global.createCanvas = (w, h, renderer) => {
            const result = _origCreateCanvas(w, h, renderer);
            this._syncCanvasGlobals(w, h);
            return result;
        };

        global.loadStrings = async (filePath, callback, errorCallback) => {
            try {
                // Matches native p5 v2: fetch-based (URLs + local files via the DOM shim),
                // split on LF/CRLF. Returns the lines array (or callback result).
                const data = await request(resolveAssetUrl(this.sketchPath, filePath), "text");
                const lines = data.split(/\r?\n/);
                if (callback) return callback(lines);
                return lines;
            } catch (error) {
                if (errorCallback) return errorCallback(error);
                throw error;
            }
        };

        global.loadBytes = async (file, callback, errorCallback) => {
            try {
                // Matches native p5 v2: returns a Promise resolving to a Uint8Array.
                const arrayBuffer = await request(resolveAssetUrl(this.sketchPath, file), "arrayBuffer");
                const bytes = new Uint8Array(arrayBuffer);
                if (callback) return callback(bytes);
                return bytes;
            } catch (error) {
                if (errorCallback) return errorCallback(error);
                throw error;
            }
        };

        global.loadTable = async (filePath, ...args) => {
            const url = resolveAssetUrl(this.sketchPath, filePath);

            const separatorMap = { csv: ",", tsv: "\t", ssv: ";" };
            let separator = ",";
            let header = false;
            const rest = [];
            for (const arg of args) {
                if (typeof arg === "string") {
                    if (arg === "header") { header = true; }
                    else if (separatorMap[arg]) { separator = separatorMap[arg]; }
                    else { rest.push(arg); }
                } else {
                    rest.push(arg);
                }
            }

            return this._myP5.loadTable(url, separator, header, ...rest);
        };

        // loadShader/loadModel/loadXML/loadBlob: resolve sketch-relative paths to file://
        // URLs (read headlessly by the p5b-dom fetch shim under both bun and node), then
        // delegate to the native p5 method so behavior matches p5.js exactly.
        global.loadShader = (vertPath, fragPath, successCallback, failureCallback) =>
            this._myP5.loadShader(
                resolveAssetUrl(this.sketchPath, vertPath),
                resolveAssetUrl(this.sketchPath, fragPath),
                successCallback,
                failureCallback
            );

        global.loadModel = (modelPath, ...rest) =>
            this._myP5.loadModel(resolveAssetUrl(this.sketchPath, modelPath), ...rest);

        global.loadXML = (filePath, successCallback, errorCallback) =>
            this._myP5.loadXML(resolveAssetUrl(this.sketchPath, filePath), successCallback, errorCallback);

        global.loadBlob = (filePath, successCallback, errorCallback) =>
            this._myP5.loadBlob(resolveAssetUrl(this.sketchPath, filePath), successCallback, errorCallback);
    }

    _validateConfig() {
        super._validateConfig();
        if (this.preload) {
            throw new Error("Invalid config: preload is not supported in p5.js v2).");
        }
    }
}

module.exports = { P5b, P5B_DEFAULTS };
