const canvas = require("canvas");
const { version } = require("../package.json");
const fs = require("fs");
const { noop } = require("./globals");

const spliceFrom = (arr, item) => {
    const idx = arr.indexOf(item);
    idx > -1 && arr.splice(idx, 1);
};
const makeClassList = () => ({ add: noop, remove: noop, contains: () => false, toggle: noop });

// Functional Image (src setter, onload/onerror, drawImage) backed by node-canvas,
// satisfying p5.js's loadImage() which reads width/height on load.
class P5bImage extends canvas.Image {
    constructor() {
        super();
        this._onload = null;
        this._onerror = null;
        this.crossOrigin = "";
    }

    get onload() { return this._onload; }
    set onload(fn) { this._onload = fn; }
    get onerror() { return this._onerror; }
    set onerror(fn) { this._onerror = fn; }

    set src(url) {
        if (!url) return;
        this._load(url);
    }

    _load(url) {
        const setData = (data) => {
            super.src = data;
            if (this._onload) this._onload();
        };
        const onError = (e) => {
            if (this._onerror) this._onerror(e);
            else console.error(`Failed to load image: ${e.message}`);
        };

        try {
            if (url.startsWith("data:")) {
                const base64 = url.split(",")[1];
                setData(Buffer.from(base64, "base64"));
            } else if (url.startsWith("file://")) {
                setData(fs.readFileSync(url.replace(/^file:\/\//, "")));
            } else {
                global.fetch(url)
                    .then((response) => {
                        if (!response.ok) throw new Error(`Failed to load image: ${response.status}`);
                        return response.arrayBuffer();
                    })
                    .then((buf) => setData(Buffer.from(buf)))
                    .catch(onError);
            }
        } catch (e) {
            onError(e);
        }
    }
}

class P5bDOM {
    constructor(width, height, options = {}) {
        this.width = width;
        this.height = height;
        this.p5Version = options.p5Version;
        this._bodyChildren = [];
        this._canvases = [];

        if (options.p5Version === 2) {
            installPath2D();
            installColorCompat();
        }

        this._init();
    }

    getCanvas() {
        return global.document.querySelector("canvas");
    }

    removeTrackedCanvas(canvasEl) {
        spliceFrom(this._canvases, canvasEl);
        spliceFrom(this._bodyChildren, canvasEl);
    }

    clear() {
        this._bodyChildren.length = 0;
        this._canvases.length = 0;
    }

    resize(newWidth, newHeight) {
        this.width = newWidth;
        this.height = newHeight;
        this._bodyChildren.length = 0;
        this._canvases.length = 0;
        this._init();
    }

    _init() {
        const bodyChildren = this._bodyChildren;
        const allCanvases = this._canvases;

        // Absorbs unguarded el.parentNode.removeChild(el) calls from p5.js (silent in browsers).
        const detachedParent = { removeChild: noop, appendChild: noop, insertBefore: noop };

        const makeStubElement = (tag) => {
            const el = {
                tagName: tag.toUpperCase(),
                id: "",
                style: {},
                dataset: {},
                classList: makeClassList(),
                addEventListener: noop,
                removeEventListener: noop,
                dispatchEvent: () => true,
                appendChild: (child) => { el.childNodes.push(child); return child; },
                removeChild: (child) => {
                    spliceFrom(el.childNodes, child);
                    return child;
                },
                setAttribute: noop,
                getAttribute: () => null,
                getBoundingClientRect: () => ({ left: 0, top: 0, width: 0, height: 0, right: 0, bottom: 0 }),
                parentNode: detachedParent,
                childNodes: [],
                children: [],
                innerHTML: "",
                textContent: "",
                remove: () => {
                    if (el.parentNode && typeof el.parentNode.removeChild === "function") {
                        el.parentNode.removeChild(el);
                    }
                },
            };
            return el;
        };

        const makeCanvas = () => {
            const c = canvas.createCanvas(1, 1);
            c.classList = makeClassList();
            c.dataset = {};
            c.setAttribute = noop;
            c.getAttribute = () => null;
            c.addEventListener = noop;
            c.removeEventListener = noop;
            c.dispatchEvent = () => true;
            c.getBoundingClientRect = () => ({ left: 0, top: 0, width: c.width, height: c.height, right: c.width, bottom: c.height });
            c.parentNode = detachedParent;
            c.remove = () => {
                if (c.parentNode && typeof c.parentNode.removeChild === "function") {
                    c.parentNode.removeChild(c);
                }
            };
            // parentElement mirrors parentNode so RendererGL's textCanvas insertion always has a target.
            Object.defineProperty(c, "parentElement", {
                get: () => c.parentNode,
                configurable: true,
            });
            c.style = {};

            // Satisfy WebGL context requests with headless-gl (node-canvas only does 2D).
            const origGetContext = c.getContext.bind(c);
            c.getContext = (type, attrs) => {
                // headless-gl is WebGL 1 only; return null for webgl2 so p5.js falls back.
                if (type === "webgl2") return null;
                if (type === "webgl" || type === "webgl-strict") {
                    if (!c._glCtx) {
                        try {
                            const gl = require("gl");
                            c._glCtx = gl(c.width, c.height, { preserveDrawingBuffer: true });
                        } catch (_) {
                            return null;
                        }
                    }
                    return c._glCtx;
                }
                return origGetContext(type, attrs);
            };

            // Resize the headless-gl drawingbuffer via STACKGL when p5.js resizes the canvas.
            let _w = c.width, _h = c.height;
            const _syncStackGL = () => {
                if (c._glCtx) {
                    const ext = c._glCtx.getExtension("STACKGL_resize_drawingbuffer");
                    if (ext) ext.resize(_w, _h);
                }
            };
            const _setSize = (dim) => ({
                get: () => dim === "width" ? _w : _h,
                set: (v) => {
                    if (dim === "width") _w = v; else _h = v;
                    const desc = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(c), dim);
                    if (desc && desc.set) desc.set.call(c, v);
                    _syncStackGL();
                },
                configurable: true,
            });
            Object.defineProperty(c, "width", _setSize("width"));
            Object.defineProperty(c, "height", _setSize("height"));

            allCanvases.push(c);
            return c;
        };

        const document = {
            createElement: (tag) => {
                if (tag === "canvas") return makeCanvas();
                return makeStubElement(tag);
            },
            createElementNS: (_ns, tag) => makeStubElement(tag),
            body: {
                appendChild: (el) => { bodyChildren.push(el); if (el && typeof el === "object") el.parentNode = document.body; return el; },
                removeChild: (el) => {
                    spliceFrom(bodyChildren, el);
                    if (el && typeof el === "object") el.parentNode = detachedParent;
                    spliceFrom(allCanvases, el);
                    return el;
                },
                insertBefore: (el, _ref) => { bodyChildren.push(el); if (el && typeof el === "object") { el.parentNode = document.body; el.parentElement = document.body; } return el; },
                style: {},
                classList: makeClassList(),
                clientWidth: this.width,
                clientHeight: this.height,
                addEventListener: noop,
                removeEventListener: noop,
                dispatchEvent: () => true,
            },
            head: { appendChild: noop, removeChild: noop, getElementsByTagName: () => [] },
            querySelector: (sel) => {
                if (sel === "canvas") return allCanvases[0] || null;
                return null;
            },
            querySelectorAll: (sel) => {
                if (sel === "canvas") return allCanvases.slice();
                return [];
            },
            getElementById: (id) => bodyChildren.find((el) => el.id === id) || null,
            getElementsByTagName: (tag) => {
                const t = tag.toLowerCase();
                if (t === "canvas") return allCanvases.slice();
                if (t === "head") return [document.head];
                return bodyChildren.filter((el) => el.tagName && el.tagName.toLowerCase() === t);
            },
            documentElement: { style: {}, classList: makeClassList(), clientWidth: this.width, clientHeight: this.height },
            scripts: [],
            fonts: { add: noop, ready: Promise.resolve(), values: () => [][Symbol.iterator]() },
            readyState: "complete",
            addEventListener: noop,
            removeEventListener: noop,
            dispatchEvent: () => true,
            createEvent: () => ({ initEvent: noop }),
            hasFocus: () => true,
            hidden: false,
        };

        const stubStyle = { getPropertyValue: () => "", display: "block", width: "0px", height: "0px" };

        // file:// fetch shim (Node's undici fetch rejects file://; bun supports it). Install on
        // both win.fetch and global.fetch so p5.js loaders + p5b's request() read local assets
        // under either runtime. Non-file URLs delegate to the real fetch.
        const realFetch = global.fetch;
        const fetchImpl = (url, init) => {
            const target = (url instanceof global.Request) ? url.url : url;
            if (typeof target === "string" && target.startsWith("file://")) {
                const filePath = target.replace(/^file:\/\//, "");
                return fs.promises.readFile(filePath).then((data) => ({
                    ok: true,
                    status: 200,
                    url: target,
                    headers: new Map([["content-type", "application/octet-stream"]]),
                    arrayBuffer: () => Promise.resolve(data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength)),
                    text: () => Promise.resolve(data.toString("utf8")),
                    json: () => Promise.resolve(JSON.parse(data.toString("utf8"))),
                    blob: () => Promise.resolve(new Blob([data])),
                }));
            }
            return realFetch(url, init);
        };

        const win = {
            document,
            screen: { width: this.width, height: this.height },
            navigator: { userAgent: `p5b-dom/${version}`, languages: ["en"], language: "en", userLanguage: "en", mediaDevices: { getUserMedia: () => Promise.reject(new Error("getUserMedia not supported in headless")) } },
            addEventListener: noop,
            removeEventListener: noop,
            dispatchEvent: () => true,
            requestAnimationFrame: (cb) => setImmediate(cb),
            cancelAnimationFrame: (id) => clearImmediate(id),
            innerWidth: this.width,
            innerHeight: this.height,
            devicePixelRatio: 1,
            location: { search: "", pathname: "/", href: "http://localhost/", hash: "" },
            getComputedStyle: () => stubStyle,
            URL: { createObjectURL: () => "", revokeObjectURL: noop },
            Event: class Event { constructor(type) { this.type = type; this.bubbles = false; this.cancelable = false; } },
            MouseEvent: class MouseEvent { constructor(type) { this.type = type; } },
            HTMLCanvasElement: canvas.Canvas,
            Image: P5bImage,
            ImageData: canvas.ImageData,
            performance: { now: () => Date.now() },
            fetch: fetchImpl,
        };

        // Forward injected shader hooks (e.g. getPixelInputs) from window to global so they're
        // accessible as bare names inside modify(). v2-only: v1 has no 3D/shaders, and its
        // _globalInit would see window.setup/draw fall back to global and spawn a duplicate
        // global-mode instance. Use the plain win object for v1 so those names stay undefined.
        if (this.p5Version === 2) {
            const knownWinKeys = new Set(Object.keys(win));
            global.window = new Proxy(win, {
                set(target, key, value) {
                    target[key] = value;
                    // Forward non-window-specific properties to Node.js global so
                    // shader hook names are accessible as unqualified identifiers.
                    if (!knownWinKeys.has(key)) global[key] = value;
                    return true;
                },
                get(target, key) {
                    if (key in target) return target[key];
                    return global[key];
                },
            });
        } else {
            global.window = win;
        }
        global.document = document;
        global.screen = win.screen;
        // Also install the fetch shim as global.fetch for p5.js's own loaders.
        global.fetch = fetchImpl;

        const navDesc = Object.getOwnPropertyDescriptor(global, "navigator");
        if (!navDesc || navDesc.configurable) {
            Object.defineProperty(global, "navigator", {
                get: () => global.window.navigator,
                configurable: true,
                enumerable: true,
            });
        }
        global.HTMLCanvasElement = canvas.Canvas;
        global.Image = P5bImage;
        global.ImageData = canvas.ImageData;
        global.requestAnimationFrame = (cb) => setImmediate(cb);
        global.cancelAnimationFrame = (id) => clearImmediate(id);
        global.Event = win.Event;
        global.MouseEvent = win.MouseEvent;
        // Stub browser font-loading API used by p5.js v2's Font constructor
        global.FontFace = class FontFace { constructor(family) { this.family = family; } };
        // Stub XMLHttpRequest for font loading in headless environment
        global.XMLHttpRequest = class XMLHttpRequest {
            constructor() {
                this.readyState = 0;
                this.status = 0;
                this.response = null;
            }
            open(method, url) {
                this.method = method;
                this.url = url;
                this.readyState = 1;
            }
            send(_body) {
                try {
                    const resolvedPath = this.url.replace(/^file:\/\//, "");
                    const data = fs.readFileSync(resolvedPath);
                    // Create a copy of the buffer to avoid shared memory issues
                    this.response = Buffer.from(data).buffer;
                    this.readyState = 4;
                    this.status = 200;
                    if (this.onload) this.onload();
                } catch (e) {
                    this.readyState = 4;
                    this.status = 404;
                    if (this.onerror) this.onerror(e);
                }
            }
            setRequestHeader() {}
            addEventListener() {}
            getResponseHeader() { return null; }
        };

    }
}

/**
 * Node-canvas compatibility patches, required only for p5.js v2.
 *
 */

// p5.js v2 renders shapes/clip() via browser-only Path2D; polyfill it as a command
// recorder and replay the commands through node-canvas before fill/stroke/clip.
class P5bPath2D {
    constructor() { this.cmds = []; }
    moveTo(x, y) { this.cmds.push(["moveTo", x, y]); }
    lineTo(x, y) { this.cmds.push(["lineTo", x, y]); }
    bezierCurveTo(x1, y1, x2, y2, x3, y3) { this.cmds.push(["bezierCurveTo", x1, y1, x2, y2, x3, y3]); }
    quadraticCurveTo(x1, y1, x2, y2) { this.cmds.push(["quadraticCurveTo", x1, y1, x2, y2]); }
    arc(...args) { this.cmds.push(["arc", ...args]); }
    ellipse(...args) { this.cmds.push(["ellipse", ...args]); }
    rect(...args) { this.cmds.push(["rect", ...args]); }
    closePath() { this.cmds.push(["closePath"]); }
    addPath(other) { this.cmds.push(...other.cmds); }
}

// p5.js v2 emits HSB as CSS Color 4 percentage rgb() (e.g. rgb(100% 0% 0%)) which
// node-canvas rejects; normalize that one form to numeric rgb()/rgba().
const normalizeCssColor = (str) => {
    if (typeof str !== "string") return str;
    const m = /^rgba?\(\s*([-\d.]+)%\s+([-\d.]+)%\s+([-\d.]+)%\s*(?:\/\s*([-\d.]+))?\s*\)$/.exec(str);
    if (!m) return str;
    const r = Math.round(parseFloat(m[1]) * 2.55);
    const g = Math.round(parseFloat(m[2]) * 2.55);
    const b = Math.round(parseFloat(m[3]) * 2.55);
    return m[4] !== undefined ? `rgba(${r}, ${g}, ${b}, ${parseFloat(m[4])})` : `rgb(${r}, ${g}, ${b})`;
};

let p5bColorCompatInstalled = false;
function installColorCompat() {
    if (p5bColorCompatInstalled) return;
    p5bColorCompatInstalled = true;
    const proto = canvas.CanvasRenderingContext2D.prototype;
    for (const prop of ["fillStyle", "strokeStyle"]) {
        const desc = Object.getOwnPropertyDescriptor(proto, prop);
        if (!desc || !desc.set) continue;
        Object.defineProperty(proto, prop, {
            get: desc.get,
            set: function (value) {
                desc.set.call(this, normalizeCssColor(value));
            },
            configurable: true
        });
    }
}

let p5bPath2DInstalled = false;
function installPath2D() {
    if (p5bPath2DInstalled || typeof global.Path2D !== "undefined") return;
    p5bPath2DInstalled = true;
    global.Path2D = P5bPath2D;
    const proto = canvas.CanvasRenderingContext2D.prototype;
    const replay = (ctx, p) => {
        ctx.beginPath();
        for (const [cmd, ...args] of p.cmds) ctx[cmd](...args);
    };
    const origFill = proto.fill;
    const origStroke = proto.stroke;
    const origClip = proto.clip;
    proto.fill = function (path) {
        if (path && path.cmds) { replay(this, path); return origFill.call(this); }
        return origFill.call(this, path);
    };
    proto.stroke = function (path) {
        if (path && path.cmds) { replay(this, path); return origStroke.call(this); }
        return origStroke.call(this, path);
    };
    proto.clip = function (path) {
        if (path && path.cmds) { replay(this, path); return origClip.call(this); }
        return origClip.call(this, path);
    };
}

module.exports = { P5bDOM };
