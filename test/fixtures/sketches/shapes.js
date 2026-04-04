function setup() {
    createCanvas(720, 400);
    angleMode(DEGREES);
    background("steelblue");
    strokeWeight(4);
    fill(200, 200, 255);
    stroke(20, 20, 100);
    square(20, 20, 100);
    stroke(100, 20, 20);
    rect(100, 40, 200, 100);
    colorMode(HSB);
    fill(120, 70, 90);
    stroke(120, 60, 30);
    ellipse(540, 100, 300, 100);
    fill(300, 90, 30);
    noStroke();
    circle(560, 100, 100);
    colorMode(HSL);
    fill(120, 70, 90);
    stroke(120, 60, 30);
    arc(540, 100, 300, 100, 180, 360, CHORD);
    push();
    colorMode(RGB);
    stroke(20, 10, 80);
    line(20, 200, 200, 350);
    pop();
    triangle(250, 350, 350, 200, 450, 350);
    stroke("#EFD8D8");
    noFill();
    quad(500, 250, 550, 200, 700, 300, 650, 350);
}

function draw() {
}

