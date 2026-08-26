// Color modes (HSB) and lerpColor

function setup() {
    createCanvas(200, 200);
    colorMode(HSB, 360, 100, 100);
    noStroke();
}

function draw() {
    background(0, 0, 95);

    for (let i = 0; i < 10; i++) {
        const a = color((frameCount + i * 36) % 360, 80, 90);
        const b = color((frameCount + i * 36 + 60) % 360, 80, 90);
        fill(lerpColor(a, b, 0.5));
        rect(i * 20, 20, 18, 160);
    }
}
