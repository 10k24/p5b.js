let img;

function preload() {
    img = loadImage("../img/natalie-kinnear-CC2Bfvk2-tU-unsplash.jpg");
}

function setup() {
    const theMax = max(img.width, img.height);
    createCanvas(theMax, theMax);
}

function draw() {
    background("#0000FF");
    image(img, 0, 0, img.width, img.height);
    noLoop();
}
