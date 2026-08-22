// Single source of truth for the static globals p5b binds in _bindGlobals().
// Imported by both the runtime (p5b-base.js) and the eslint config so the
// constant/function surface is never duplicated by hand.

const noop = () => {};

// True when fn is declared with the async keyword (async declarations, expressions,
// and arrows). Used by the v1 adapter to reject async lifecycle hooks. Never invokes fn.
const isAsyncFunction = (fn) =>
    typeof fn === "function" && fn.constructor.name === "AsyncFunction";

const mathFunctions = {
    abs: Math.abs, ceil: Math.ceil, floor: Math.floor, round: Math.round,
    pow: Math.pow, sqrt: Math.sqrt, exp: Math.exp, log: Math.log,
    max: Math.max, min: Math.min,
};

const mathConstants = {
    PI: Math.PI, TWO_PI: Math.PI * 2, HALF_PI: Math.PI / 2,
    QUARTER_PI: Math.PI / 4, TAU: Math.PI * 2,
};

const p5Constants = {
    DEGREES: "degrees", RADIANS: "radians", P2D: "p2d", WEBGL: "webgl", WEBGL2: "webgl2",
    CORNER: "corner", CORNERS: "corners", RADIUS: "radius", CENTER: "center",
    LEFT: "left", RIGHT: "right", TOP: "top", BOTTOM: "bottom", BASELINE: "alphabetic",
    CLOSE: "close", OPEN: "open", CHORD: "chord", PIE: "pie", ROUND: "round",
    SQUARE: "butt", PROJECT: "square", BEVEL: "bevel", MITER: "miter",
    POINTS: 0x0000, LINES: 0x0001, LINE_STRIP: 0x0003, LINE_LOOP: 0x0002,
    TRIANGLES: 0x0004, TRIANGLE_FAN: 0x0006, TRIANGLE_STRIP: 0x0005,
    QUADS: "quads", QUAD_STRIP: "quad_strip", TESS: "tess",
    LINEAR: "linear", QUADRATIC: "quadratic", BEZIER: "bezier", CURVE: "curve",
    RGB: "rgb", HSB: "hsb", HSL: "hsl",
    BLEND: "source-over", REMOVE: "destination-out", ADD: "lighter",
    DARKEST: "darken", LIGHTEST: "lighten", DIFFERENCE: "difference",
    SUBTRACT: "subtract", EXCLUSION: "exclusion", MULTIPLY: "multiply",
    SCREEN: "screen", REPLACE: "copy", OVERLAY: "overlay",
    HARD_LIGHT: "hard-light", SOFT_LIGHT: "soft-light",
    DODGE: "color-dodge", BURN: "color-burn",
    ARROW: "default", CROSS: "crosshair", HAND: "pointer",
    MOVE: "move", TEXT: "text", WAIT: "wait",
    ALT: 18, CONTROL: 17, SHIFT: 16, OPTION: 18,
    BACKSPACE: 8, DELETE: 46, TAB: 9, ENTER: 13, RETURN: 13, ESCAPE: 27,
    UP_ARROW: 38, DOWN_ARROW: 40, LEFT_ARROW: 37, RIGHT_ARROW: 39,
    NORMAL: "normal", ITALIC: "italic", BOLD: "bold", BOLDITALIC: "bold italic",
    CHAR: "CHAR", WORD: "WORD", AUTO: "auto",
    STROKE: "stroke", FILL: "fill", TEXTURE: "texture", IMMEDIATE: "immediate",
    NEAREST: "nearest", REPEAT: "repeat", CLAMP: "clamp", MIRROR: "mirror",
    FLAT: "flat", SMOOTH: "smooth", LANDSCAPE: "landscape", PORTRAIT: "portrait",
};

module.exports = { noop, isAsyncFunction, mathConstants, mathFunctions, p5Constants };
