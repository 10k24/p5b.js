let hello = "I am a global variable";
let count = 42;

function setup() {
}

function draw() {
    found_hello = hello;
    found_count = count;
    noLoop();
}
