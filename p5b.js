const { findP5Version } = require("./lib/globals");

// Select the adapter from the *installed* p5 package version (see findP5Version).
module.exports = require(`./lib/p5b_v${findP5Version()}`);
