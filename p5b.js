const p5pkg = process.env.P5B_P5_PATH || "p5";

// Adapter selection mirrors the P5B_P5_PATH convention used by each wrapper's
// _loadP5(): "p5" targets p5 v1, "p5-v2*" targets p5 v2 (any variant).
const { P5b, P5B_DEFAULTS, reorderBuffer } = p5pkg.startsWith("p5-v2")
    ? require("./p5b_v2")
    : require("./p5b_v1");

module.exports = { P5b, P5B_DEFAULTS, reorderBuffer };
