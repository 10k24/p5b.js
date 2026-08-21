// Test sketch: access windowWidth at top-level
const w = windowWidth;
const h = windowHeight;
window_width_at_top_level = w;
window_height_at_top_level = h;

function setup() {
    canvas_width = createCanvas(w || 100, h || 100).width;
}
