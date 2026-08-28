// Transformations (push()/pop(), translate(), rotate())

function setup() {
    createCanvas(200, 200);
    angleMode(DEGREES);
    noStroke();
}

function draw() {
    background(20, 30, 50);

    translate(width / 2, height / 2);
    rotate(frameCount * 2);

    for (let i = 0; i < 6; i++) {
        push();
        rotate(i * 60);
        fill(255, 200 - i * 20, 100);
        rect(0, -18, 50, 12, 4);
        pop();
    }
}
