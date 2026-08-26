// Drawing primitives: triangle, quad, arc, line, point, rect, ellipse

function setup() {
    createCanvas(200, 200);
}

function draw() {
    background(245);

    noFill();
    stroke(0);
    strokeWeight(1);

    triangle(20, 170, 60, 90, 100, 170);
    quad(120, 60, 180, 60, 160, 140, 110, 140);
    arc(60, 60, 40, 40, 0, HALF_PI);
    line(0, 200, 200, 0);
    point(150, 100);

    rectMode(CENTER);
    rect(150, 170, 40, 20);

    ellipseMode(CENTER);
    ellipse(40, 170, 40, 60);
}
