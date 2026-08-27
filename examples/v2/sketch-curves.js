// Curves (bezier(), spline() — p5.js v2 renamed curve() to spline())

function setup() {
    createCanvas(200, 200);
}

function draw() {
    background(245);
    noFill();

    stroke(200, 0, 0);
    bezier(20, 180, 60, 40, 140, 40, 180, 180);

    stroke(0, 90, 200);
    spline(20, 20, 60, 180, 140, 180, 180, 20);
}
