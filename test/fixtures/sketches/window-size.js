// Test sketch: access windowWidth at top-level
const w = windowWidth;
const h = windowHeight;
global.window_width_at_top_level = w;
global.window_height_at_top_level = h;

function setup() {
    global.canvas_width = createCanvas(w || 100, h || 100).width;
}
