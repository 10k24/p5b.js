const p5Version = require("p5/package.json").version;
const majorVersion = parseInt(p5Version.split(".")[0], 10);

const { P5b, P5B_DEFAULTS } = majorVersion >= 2
    ? require("./p5b_v2")
    : require("./p5b_v1");

module.exports = { P5b, P5B_DEFAULTS };
