// Render a p5b sketch in the terminal using truecolor ANSI half-block characters.
// Works in any truecolor terminal (Ghostty, Kitty, iTerm2, WezTerm, etc.)
const { P5b } = require("../p5b.js");

// Each character cell = 1 col × 2 rows of pixels, so HEIGHT must be even.
// Reserve 1 row to prevent scroll (which breaks cursor-home positioning).
const WIDTH = process.stdout.columns || 80;
const HEIGHT = ((process.stdout.rows || 30) - 1) * 2;

// Hide cursor during animation; restore on exit
process.stdout.write("\x1b[?25l");
process.on("exit", () => process.stdout.write("\x1b[?25h"));
process.on("SIGINT", () => { process.stdout.write("\x1b[?25h"); process.exit(); });

let hexColors = [
    "#95E06C",
    "#FF785A",
    "#094D92",
    "#BBACC1"
];

let bgIdx = 0;
let fgIdx = 1;

const p5b = new P5b({
    width: WIDTH,
    height: HEIGHT,
    fps: 60,
    setup() {
        createCanvas(WIDTH, HEIGHT);
        noStroke();
    },
    draw() {
        background(hexColors[bgIdx]);

        // Pythagorean theorem
        const maxRadius = max(
            sqrt(2 * WIDTH*WIDTH),
            sqrt(2 * HEIGHT*HEIGHT)
        );

        const radius = (2*frameCount) % maxRadius;

        fill(hexColors[fgIdx]);
        ellipse(WIDTH / 2, HEIGHT / 2, radius*1.5);

        fill(hexColors[bgIdx]);
        ellipse(WIDTH / 2, HEIGHT / 2, radius*1.2);

        fill(hexColors[fgIdx]);
        ellipse(WIDTH / 2, HEIGHT / 2, radius);

        fill(hexColors[bgIdx]);
        ellipse(WIDTH / 2, HEIGHT / 2, radius*.8);

        fill(hexColors[fgIdx]);
        ellipse(WIDTH / 2, HEIGHT / 2, radius*.6);

        fill(hexColors[bgIdx]);
        ellipse(WIDTH / 2, HEIGHT / 2, radius/2);

        fill(hexColors[fgIdx]);
        ellipse(WIDTH / 2, HEIGHT / 2, radius/4);

        fill(hexColors[bgIdx]);
        ellipse(WIDTH / 2, HEIGHT / 2, radius/8);

        fill(hexColors[fgIdx]);
        ellipse(WIDTH / 2, HEIGHT / 2, radius/16);

        // Change once edge of circle hits the corner, not the side
        if (radius <= 1) {
            bgIdx = fgIdx;
            fgIdx = (fgIdx + 1) % hexColors.length;
        }
    }
});

// Each character = 2 vertical pixels: bg = top pixel, fg = bottom pixel (▄)
function frameToAnsi(buf, w, h) {
    const parts = ["\x1b[H"];
    for (let y = 0; y < h; y += 2) {
        for (let x = 0; x < w; x++) {
            const t = (y * w + x) * 4;
            const b = ((y + 1) * w + x) * 4;
            parts.push(
                `\x1b[48;2;${buf[t]};${buf[t+1]};${buf[t+2]}m\x1b[38;2;${buf[b]};${buf[b+1]};${buf[b+2]}m▄`
            );
        }
        parts.push("\x1b[0m\n");
    }
    return parts.join("");
}

p5b.on("frame", (buffer) => {
    process.stdout.write(frameToAnsi(buffer, WIDTH, HEIGHT));
});

p5b.run();
