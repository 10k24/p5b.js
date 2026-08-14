const p5pkg = process.env.P5B_P5_PATH || "p5";

// Adapter selection mirrors the P5B_P5_PATH convention used by each wrapper's
// _loadP5(): "p5" targets p5 v1, "p5-v2" targets p5 v2.
const { P5b, P5B_DEFAULTS } = p5pkg === "p5-v2"
    ? require("./p5b_v2")
    : require("./p5b_v1");

// Swap pixel data order BGRA -> RGBA
const reorderBuffer = (buf) => {
    const ret = new Uint8Array(buf);
    for (let i = 0; i < ret.length; i += 4) {
        const b = ret[i];
        ret[i] = ret[i + 2];
        ret[i + 2] = b;
    }
    return ret;
};

module.exports = { P5b, P5B_DEFAULTS, reorderBuffer };
