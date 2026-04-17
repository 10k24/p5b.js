// Concentric rings

let hexColors = [
    "#95E06C",
    "#FF785A",
    "#094D92",
    "#BBACC1"
];

let bgIdx = 0;
let fgIdx = 1;

function setup() {
    createCanvas(windowWidth, windowHeight);
    noStroke();
}

function draw() {
    background(hexColors[bgIdx]);

    const maxRadius = max(
        sqrt(2 * windowWidth * windowWidth),
        sqrt(2 * windowHeight * windowHeight)
    );

    const radius = (2 * frameCount) % maxRadius;

    fill(hexColors[fgIdx]);
    ellipse(windowWidth / 2, windowHeight / 2, radius * 1.5);

    fill(hexColors[bgIdx]);
    ellipse(windowWidth / 2, windowHeight / 2, radius * 1.2);

    fill(hexColors[fgIdx]);
    ellipse(windowWidth / 2, windowHeight / 2, radius);

    fill(hexColors[bgIdx]);
    ellipse(windowWidth / 2, windowHeight / 2, radius * 0.8);

    fill(hexColors[fgIdx]);
    ellipse(windowWidth / 2, windowHeight / 2, radius * 0.6);

    fill(hexColors[bgIdx]);
    ellipse(windowWidth / 2, windowHeight / 2, radius / 2);

    fill(hexColors[fgIdx]);
    ellipse(windowWidth / 2, windowHeight / 2, radius / 4);

    fill(hexColors[bgIdx]);
    ellipse(windowWidth / 2, windowHeight / 2, radius / 8);

    fill(hexColors[fgIdx]);
    ellipse(windowWidth / 2, windowHeight / 2, radius / 16);

    if (radius <= 1) {
        bgIdx = fgIdx;
        fgIdx = (fgIdx + 1) % hexColors.length;
    }
}
