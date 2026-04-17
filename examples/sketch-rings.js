// Concentric rings

const WIDTH = global.WIDTH;
const HEIGHT = global.HEIGHT;

let hexColors = [
    "#95E06C",
    "#FF785A",
    "#094D92",
    "#BBACC1"
];

let bgIdx = 0;
let fgIdx = 1;

function setup() {
    createCanvas(WIDTH, HEIGHT);
    noStroke();
}

function draw() {
    background(hexColors[bgIdx]);

    const maxRadius = max(
        sqrt(2 * WIDTH * WIDTH),
        sqrt(2 * HEIGHT * HEIGHT)
    );

    const radius = (2 * frameCount) % maxRadius;

    fill(hexColors[fgIdx]);
    ellipse(WIDTH / 2, HEIGHT / 2, radius * 1.5);

    fill(hexColors[bgIdx]);
    ellipse(WIDTH / 2, HEIGHT / 2, radius * 1.2);

    fill(hexColors[fgIdx]);
    ellipse(WIDTH / 2, HEIGHT / 2, radius);

    fill(hexColors[bgIdx]);
    ellipse(WIDTH / 2, HEIGHT / 2, radius * 0.8);

    fill(hexColors[fgIdx]);
    ellipse(WIDTH / 2, HEIGHT / 2, radius * 0.6);

    fill(hexColors[bgIdx]);
    ellipse(WIDTH / 2, HEIGHT / 2, radius / 2);

    fill(hexColors[fgIdx]);
    ellipse(WIDTH / 2, HEIGHT / 2, radius / 4);

    fill(hexColors[bgIdx]);
    ellipse(WIDTH / 2, HEIGHT / 2, radius / 8);

    fill(hexColors[fgIdx]);
    ellipse(WIDTH / 2, HEIGHT / 2, radius / 16);

    if (radius <= 1) {
        bgIdx = fgIdx;
        fgIdx = (fgIdx + 1) % hexColors.length;
    }
}