const canvas = require("canvas");
const { version } = require("./package.json");

const noop = () => {};
const spliceFrom = (arr, item) => {
    const idx = arr.indexOf(item);
    idx > -1 && arr.splice(idx, 1);
};

class P5bDOM {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this._bodyChildren = [];
        this._canvases = [];
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

        // Absorbs unguarded el.parentNode.removeChild(el) calls from p5.js internals
        // when an element has no real parent (matches silent browser behavior).
        const detachedParent = { removeChild: noop, appendChild: noop, insertBefore: noop };

        const makeStubElement = (tag) => {
            const el = {
                tagName: tag.toUpperCase(),
                id: "",
                style: {},
                dataset: {},
                classList: { add: noop, remove: noop, contains: () => false, toggle: noop },
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
            };
            return el;
        };

        const makeCanvas = () => {
            const c = canvas.createCanvas(1, 1);
            c.classList = { add: noop, remove: noop, contains: () => false, toggle: noop };
            c.dataset = {};
            c.setAttribute = noop;
            c.getAttribute = () => null;
            c.addEventListener = noop;
            c.removeEventListener = noop;
            c.dispatchEvent = () => true;
            c.getBoundingClientRect = () => ({ left: 0, top: 0, width: c.width, height: c.height, right: c.width, bottom: c.height });
            c.parentNode = detachedParent;
            // parentElement mirrors parentNode so RendererGL's textCanvas insertion
            // (this.canvas.parentElement.insertBefore) always has a valid target.
            Object.defineProperty(c, "parentElement", {
                get: () => c.parentNode,
                configurable: true,
            });
            c.style = {};

            // Intercept WebGL context requests and satisfy them with headless-gl.
            // The `canvas` package only provides 2D contexts; headless-gl provides
            // real WebGL 1/2 via native bindings so p5.js WEBGL mode works headlessly.
            const origGetContext = c.getContext.bind(c);
            c.getContext = (type, attrs) => {
                // headless-gl only supports WebGL 1. Return null for webgl2
                // so p5.js falls back to requesting webgl (WebGL 1).
                if (type === "webgl2") return null;
                if (type === "webgl" || type === "webgl-strict") {
                    if (!c._glCtx) {
                        const gl = require("gl");
                        c._glCtx = gl(c.width, c.height, { preserveDrawingBuffer: true });
                    }
                    return c._glCtx;
                }
                return origGetContext(type, attrs);
            };

            // Intercept canvas width/height writes so that when p5.js resizes the
            // canvas (e.g. after createCanvas(w, h, WEBGL)), the headless-gl
            // drawingbuffer is resized to match via the STACKGL extension.
            let _w = c.width, _h = c.height;
            Object.defineProperty(c, "width", {
                get: () => _w,
                set: (v) => {
                    _w = v;
                    // Resize underlying node-canvas buffer too
                    const desc = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(c), "width");
                    if (desc && desc.set) desc.set.call(c, v);
                    if (c._glCtx) {
                        const ext = c._glCtx.getExtension("STACKGL_resize_drawingbuffer");
                        if (ext) ext.resize(_w, _h);
                    }
                },
                configurable: true,
            });
            Object.defineProperty(c, "height", {
                get: () => _h,
                set: (v) => {
                    _h = v;
                    const desc = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(c), "height");
                    if (desc && desc.set) desc.set.call(c, v);
                    if (c._glCtx) {
                        const ext = c._glCtx.getExtension("STACKGL_resize_drawingbuffer");
                        if (ext) ext.resize(_w, _h);
                    }
                },
                configurable: true,
            });

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
                classList: { add: noop, remove: noop, contains: () => false, toggle: noop },
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
            documentElement: { style: {}, classList: { add: noop, remove: noop, contains: () => false }, clientWidth: this.width, clientHeight: this.height },
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
            ImageData: canvas.ImageData,
            performance: { now: () => Date.now() },
            fetch: global.fetch,
        };

        // Wrap win in a Proxy so p5.js strands can temporarily inject shader
        // hook functions (e.g. getPixelInputs) via `window[name] = fn`.
        // In a browser these land on the real global; here we forward them to
        // Node.js's global so they're accessible as bare names inside modify().
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
        global.document = document;
        global.screen = win.screen;

        const navDesc = Object.getOwnPropertyDescriptor(global, "navigator");
        if (!navDesc || navDesc.configurable) {
            Object.defineProperty(global, "navigator", {
                get: () => global.window.navigator,
                configurable: true,
                enumerable: true,
            });
        }
        global.HTMLCanvasElement = canvas.Canvas;
        global.ImageData = canvas.ImageData;
        global.requestAnimationFrame = (cb) => setImmediate(cb);
        global.cancelAnimationFrame = (id) => clearImmediate(id);
        global.Event = win.Event;
        global.MouseEvent = win.MouseEvent;
        // Stub browser font-loading API used by p5 v2's Font constructor
        global.FontFace = class FontFace { constructor(family) { this.family = family; } };
        // Stub XMLHttpRequest for font loading in headless environment
        const fs = require("fs");
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

module.exports = { P5bDOM };
