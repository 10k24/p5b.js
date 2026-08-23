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

function textToShapes(str, shapeFn, x, y, size) {
    const pg = createGraphics(width / ppp, height / ppp);
    pg.pixelDensity(1);
    pg.background(0);
    pg.fill(255);
    pg.noStroke();
    pg.textFont(myFont);
    pg.textSize(10);
    pg.text(str, x / ppp, y / ppp);
    pg.loadPixels();

    for (let row = 0; row < pg.height; row++) {
        for (let col = 0; col < pg.width; col++) {
            if (pg.pixels[4 * (row * pg.width + col)] > 128) {
                shapeFn(col * ppp, row * ppp, ppp, ppp);
            }
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

    fill(255);
    textAlign(CENTER);
    textSize(9);
    text("Happy", 1, -8);
    text("earth", 1, 2);
    text("day!", 1, 12);
    // textToShapes("Happy", led, width/2, 0, 10);
    // textToShapes("earth", led, width/2, 10, 10);
    // textToShapes("day!", led, width/2, 20, 10);
}
