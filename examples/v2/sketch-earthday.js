let globeShader;
let myFont;

const ppp = 1;

async function setup() {
    myFont = await loadFont("/Users/shakeelmohamed/work/git/clocks/sketches/referential_mono.ttf");
    createCanvas(32, 32, WEBGL);
    textFont(myFont);
    noStroke();

    globeShader = baseMaterialShader().modify(() => {
        const freq      = uniformFloat("freq",      3.0);
        const threshold = uniformFloat("threshold", 0.50);
        const time      = uniformFloat(() => millis() * 0.00008);

        // Fragment: colour ocean vs land using UV coords to drive noise
        getPixelInputs((inputs) => {
            let uv = inputs.texCoord;
            uv.x += time; // scroll left to right

            let nv = noise(uv.x * freq,           uv.y * freq)
           + 0.45 * noise(uv.x * freq * 2.1, uv.y * freq * 2.1)
           + 0.20 * noise(uv.x * freq * 4.3, uv.y * freq * 4.3);
            nv = nv / 1.65;

            if (nv > threshold) {
                let t = (nv - threshold) / (1.0 - threshold);
                inputs.color = mix([0.12, 0.55, 0.12, 1.0], [0.20, 0.72, 0.18, 1.0], t);
            } else {
                inputs.color = [0.06, 0.34, 0.72, 1.0];
            }

            return inputs;
        });
    });
}

function textToShapes(str, shapeFn, x, y, size, tracking = 0, align = LEFT) {
    const side = min(width, height);
    // Use pixelDensity(4) so p5.js renders text at 4× resolution internally,
    // giving readable glyphs at small canvas sizes. pg.pixels is at physical
    // resolution; sample one physical pixel per logical pixel for the threshold check.
    // Make pg wider than the canvas so text isn't clipped at the right edge.
    // Shapes beyond canvas bounds won't be visible in the translated WEBGL space.
    const pg = createGraphics((side * 2) / ppp, side / ppp);
    pg.pixelDensity(4);
    pg.background(0);
    pg.fill(255);
    pg.noStroke();
    pg.textFont(myFont);
    pg.textSize(size);
    // Render each character individually so we control inter-character spacing.
    // tracking < 0 tightens; tracking > 0 loosens (in logical pixels).
    // Respect the current textAlign() setting for horizontal placement.
    let totalWidth = 0;
    for (const ch of str) totalWidth += pg.textWidth(ch) + tracking;
    totalWidth -= tracking; // no trailing gap after last char

    let cx;
    switch (align) {
    case CENTER: cx = width / 2 - totalWidth / 2 + x / ppp - 1; break;
    case RIGHT:  cx = x / ppp - totalWidth; break;
    default:     cx = x / ppp; // LEFT
    }

    for (const ch of str) {
        pg.text(ch, cx, y / ppp);
        cx += pg.textWidth(ch) + tracking;
    }
    pg.loadPixels();

    const d = pg.pixelDensity();
    const physW = pg.width * d;
    for (let row = 0; row < pg.height; row++) {
        for (let col = 0; col < pg.width; col++) {
            const i = (row * d * physW + col * d) * 4;
            if (pg.pixels[i] > 128) shapeFn(col * ppp, row * ppp, ppp, ppp);
        }
    }

    pg.remove();
}

function led(x, y, w, h) {
    ellipse(x + w/2, y + h/2, w/2, h/2);
}

function draw() {
    background(15, 20, 35);

    noLights();

    shader(globeShader);
    plane(width, height);

    resetShader();
    // Shift origin to top-left so pixel coords from createGraphics map correctly into WEBGL space
    push();
    translate(-width/2, -height/2);
    fill(255);
    noStroke();
    textToShapes("Happy", led, 0, 6, 10, 1, CENTER);
    textToShapes("earth", led, 0, 14, 10, 1, CENTER);
    textToShapes("day!", led, 0, 22, 10, 1, CENTER);
    pop();
}
