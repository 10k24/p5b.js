let hello = "I am a global variable";
let count = 42;

function setup() {
}

function draw() {
    global.found_hello = hello;
    global.found_count = count;
    noLoop();
}
