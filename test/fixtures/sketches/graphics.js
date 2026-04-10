// Test sketch that uses createGraphics to test pooling behavior
function setup() {
    createCanvas(400, 300);
    background(100, 150, 200);  // Steel blue background
}

function draw() {
    // Create a graphics buffer and draw on it
    const pg = createGraphics(150, 150);
    pg.background(255, 100, 50);  // Orange
    pg.fill(50, 150, 255);        // Blue
    pg.rect(20, 20, 100, 100);
    
    // Draw the graphics onto the main canvas
    image(pg, 50, 50);
    
    // Create another graphics buffer
    const pg2 = createGraphics(100, 100);
    pg2.background(100, 255, 50);  // Green
    pg2.fill(255, 50, 100);        // Pink
    pg2.circle(50, 50, 40);
    
    // Draw second graphics
    image(pg2, 200, 100);
    
    // Call remove on both (tests polyfill)
    pg.remove();
    pg2.remove();
    
    // Stop after first frame
    if (frameCount === 1) {
        noLoop();
    }
}
