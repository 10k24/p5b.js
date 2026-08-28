// Fixture: async setup() is not supported in p5 v1. Used to verify the v1 adapter
// emits an error and stops rather than silently ignoring the returned promise.
async function setup() {
    createCanvas(64, 64);
}

function draw() {
    background(0);
}
