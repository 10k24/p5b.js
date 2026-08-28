// Ported from p5.js test/manual-test-examples/webgl/customShader (toonShader part).
// Adapted for headless: stripped the video + multiTexture sampler and mouse-driven
// uniforms; kept the real custom shader (loadShader + setUniform + shader/resetShader)
// and the lit 3D primitives (box, sphere) verbatim.
let toonShader;

async function setup() {
    toonShader = await loadShader("./webgl-shaders/toon.vert.glsl", "./webgl-shaders/toon.frag.glsl");
    createCanvas(128, 128, WEBGL);
    shader(toonShader);
    toonShader.setUniform("fraction", 1.0);
}

function draw() {
    background(0);

    // toon-shaded sphere with a directional light
    shader(toonShader);
    directionalLight(255, 204, 204, 1, 0, -1);
    ambientMaterial(0, 255, 255);
    push();
    sphere(100);
    pop();

    // default (phong) material box for contrast
    resetShader();
    noStroke();
    directionalLight(255, 255, 255, 0.5, 0, -1);
    ambientMaterial(255, 0, 0);
    push();
    translate(0, 0, 60);
    box(80);
    pop();
}
