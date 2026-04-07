const canvas = require("canvas");

class P5bDOM {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.domBodyChildren = [];
        this.allCanvases = [];
        this.p5 = null;
        this._init();
    }

    _init() {
        const bodyChildren = this.domBodyChildren;
        const allCanvases = this.allCanvases;

        const makeStubElement = (tag) => {
            const el = {
                tagName: tag.toUpperCase(),
                id: "",
                style: {},
                dataset: {},
                classList: { add: () => {}, remove: () => {}, contains: () => false, toggle: () => {} },
                addEventListener: () => {},
                removeEventListener: () => {},
                dispatchEvent: () => true,
                appendChild: (child) => { el.childNodes.push(child); return child; },
                removeChild: (child) => {
                    const i = el.childNodes.indexOf(child);
                    if (i > -1) el.childNodes.splice(i, 1);
                    return child;
                },
                setAttribute: () => {},
                getAttribute: () => null,
                getBoundingClientRect: () => ({ left: 0, top: 0, width: 0, height: 0, right: 0, bottom: 0 }),
                parentNode: null,
                childNodes: [],
                children: [],
                innerHTML: "",
                textContent: "",
            };
            return el;
        };

        const makeCanvas = () => {
            const c = canvas.createCanvas(1, 1);
            c.classList = { add: () => {}, remove: () => {}, contains: () => false, toggle: () => {} };
            c.dataset = {};
            c.setAttribute = () => {};
            c.getAttribute = () => null;
            c.addEventListener = () => {};
            c.removeEventListener = () => {};
            c.dispatchEvent = () => true;
            c.getBoundingClientRect = () => ({ left: 0, top: 0, width: c.width, height: c.height, right: c.width, bottom: c.height });
            c.parentNode = null;
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
                    const i = bodyChildren.indexOf(el);
                    if (i > -1) bodyChildren.splice(i, 1);
                    if (el && typeof el === "object") el.parentNode = null;
                    const ci = allCanvases.indexOf(el);
                    if (ci > -1) allCanvases.splice(ci, 1);
                    return el;
                },
                style: {},
                classList: { add: () => {}, remove: () => {}, contains: () => false, toggle: () => {} },
                clientWidth: this.width,
                clientHeight: this.height,
                addEventListener: () => {},
                removeEventListener: () => {},
                dispatchEvent: () => true,
            },
            head: { appendChild: () => {}, removeChild: () => {}, getElementsByTagName: () => [] },
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
            documentElement: { style: {}, classList: { add: () => {}, remove: () => {}, contains: () => false }, clientWidth: this.width, clientHeight: this.height },
            readyState: "complete",
            addEventListener: () => {},
            removeEventListener: () => {},
            dispatchEvent: () => true,
            createEvent: () => ({ initEvent: () => {} }),
            hasFocus: () => true,
            hidden: false,
        };

        const stubStyle = { getPropertyValue: () => "", display: "block", width: "0px", height: "0px" };

        const win = {
            document,
            screen: { width: this.width, height: this.height },
            navigator: { userAgent: "Node.js", languages: ["en"], language: "en", userLanguage: "en", mediaDevices: null },
            addEventListener: () => {},
            removeEventListener: () => {},
            dispatchEvent: () => true,
            requestAnimationFrame: (cb) => setImmediate(cb),
            cancelAnimationFrame: (id) => clearImmediate(id),
            innerWidth: this.width,
            innerHeight: this.height,
            devicePixelRatio: 1,
            performance: { now: () => performance.now() },
            location: { search: "", pathname: "/", href: "http://localhost/", hash: "" },
            getComputedStyle: () => stubStyle,
            URL: { createObjectURL: () => "", revokeObjectURL: () => {} },
            Event: class Event { constructor(type) { this.type = type; this.bubbles = false; this.cancelable = false; } },
            MouseEvent: class MouseEvent { constructor(type) { this.type = type; } },
            HTMLCanvasElement: canvas.Canvas,
            ImageData: canvas.ImageData,
        };

        global.window = win;
        global.document = document;
        global.screen = win.screen;
        if (!Object.getOwnPropertyDescriptor(global, "navigator")) {
            Object.defineProperty(global, "navigator", {
                get: () => global.window.navigator,
                configurable: true
            });
        }
        global.HTMLCanvasElement = canvas.Canvas;
        global.ImageData = canvas.ImageData;
        global.requestAnimationFrame = (cb) => setImmediate(cb);
        global.cancelAnimationFrame = (id) => clearImmediate(id);
        global.Event = win.Event;
        global.MouseEvent = win.MouseEvent;

        this.p5 = require("p5");
    }
}

module.exports = { P5bDOM };
