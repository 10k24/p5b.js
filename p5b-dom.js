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
        const detachedParent = { removeChild: noop, appendChild: noop };

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
            c.style = {};
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

        global.window = win;
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

    }
}

module.exports = { P5bDOM };
