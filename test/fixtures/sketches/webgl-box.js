// Minimal WebGL smoke test: no custom shader, just the built-in material shader.
function setup() {
    createCanvas(64, 64, WEBGL);
}

function draw() {
    background(30);
    box(20);
}
