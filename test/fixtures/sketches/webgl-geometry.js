// WebGL geometry stress: no custom shader. Per-frame createGraphics text drives many
// distinct ellipse() calls (varying positions → potential p5 geometry-cache growth).
let myFont;

async function setup() {
    myFont = await loadFont("../font/SourceCodePro-Regular.ttf");
    createCanvas(64, 64, WEBGL);
    textFont(myFont);
    noStroke();
}

function led(x, y, w, h) {
    ellipse(x + w / 2, y + h / 2, w / 2, h / 2);
}

function textToShapes(str, x, y, size) {
    const pg = createGraphics(64, 24);
    pg.pixelDensity(4);
    pg.background(0);
    pg.fill(255);
    pg.noStroke();
    pg.textFont(myFont);
    pg.textSize(size);
    pg.text(str, x, y);
    pg.loadPixels();
    const d = pg.pixelDensity();
    const physW = pg.width * d;
    for (let row = 0; row < pg.height; row++) {
        for (let col = 0; col < pg.width; col++) {
            const i = (row * d * physW + col * d) * 4;
            if (pg.pixels[i] > 128) led(col, row, 1, 1);
        }
    }
    pg.remove();
}

function draw() {
    background(30);
    push();
    translate(-width / 2, -height / 2);
    fill(255);
    noStroke();
    textToShapes("Hello", 2, 6, 12);
    pop();
}
