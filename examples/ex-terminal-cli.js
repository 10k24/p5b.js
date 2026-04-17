// Render a p5b sketch in the terminal using truecolor ANSI half-block characters.
// Works in any truecolor terminal (Ghostty, Kitty, iTerm2, WezTerm, etc.)
const { P5b } = require("../p5b.js");

const sketchPath = process.argv[2];

if (!sketchPath) {
    console.error("Usage: node ex-terminal-cli.js <sketch-path>");
    process.exit(1);
}

// Set sketch size based on terminal dimensions
// Each character cell = 1 col × 2 rows of pixels, so HEIGHT must be even.
// Reserve 1 row to prevent scroll (which breaks cursor-home positioning).
global.WIDTH = process.stdout.columns || 80;
global.HEIGHT = ((process.stdout.rows || 30) - 1) * 2;

process.stdout.write("\x1b[?25l");
process.on("exit", () => process.stdout.write("\x1b[?25h"));
process.on("SIGINT", () => {
    process.stdout.write("\x1b[?25h");
    process.exit();
});

const p5b = new P5b({
    width: WIDTH,
    height: HEIGHT,
    sketchPath: sketchPath
});

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