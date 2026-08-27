// Render a p5.js sketch in the Kitty terminal (Kitty graphics protocol), with pixel resolution.
// Uses the Kitty graphics protocol for true pixel-accurate output.
//
// Usage:
//   node ex-kitty-cli.js <sketch-path>
//
// Example:
//   node ex-kitty-cli.js sketch-rings.js
//
// Requirements:
//   - Kitty terminal (other terminals with Kitty graphics protocol support may work)
//   - Terminal must report pixel dimensions (not just character grid)
//   - `node-termios` package for getting terminal size
//
// Behavior:
//   - Renders at 50% of terminal pixel resolution for performance
//   - Uses the Kitty graphics protocol for true pixel-accurate output
//   - Frame rate: 60 fps
//
// Included Sketch: sketch-rings.js — Animated concentric rings pattern.
// Currently only works in Kitty terminal due to animation support.
//
// Press Ctrl+C to exit.

const { native: termios } = require("node-termios");
const { P5b } = require("../../p5b.js");

const sketchPath = process.argv[2];
if (!sketchPath) {
    console.error("Usage: node ex-kitty-cli.js <sketch-path>");
    process.exit(1);
}

function getTerminalSize() {
    // Attempt to get terminal size with pixel dimensions.
    // Try stdout (fd=1) first, then stdin (fd=0) as fallback.
    // node-termios provides xpixel/ypixel for true resolution.
    let size;
    try {
        size = termios.tcgetwinsize(1);
    } catch (e) {
        try {
            size = termios.tcgetwinsize(0);
        } catch (e2) {
            console.error("Error: Could not get terminal size.");
            process.exit(1);
        }
    }

    if (size.xpixel <= 0 || size.ypixel <= 0) {
        console.error("Error: Terminal pixel size not available.");
        process.exit(1);
    }

    return {
        w: size.xpixel,
        h: size.ypixel
    };
}

async function main() {
    let size = getTerminalSize();

    // Scale down to 50% of terminal resolution for performance.
    // Full resolution is often too slow for real-time rendering.
    const scaleFactor = 0.5;
    global.windowWidth = Math.floor(size.w * scaleFactor);
    global.windowHeight = Math.floor(size.h * scaleFactor);

    // Hide cursor: CSI ? 25 l (lowercase L)
    // Prevents cursor from obscuring rendered graphics
    process.stdout.write("\x1b[?25l");

    process.on("exit", () => {
        // Show cursor: CSI ? 25 h
        process.stdout.write("\x1b[?25h");
        // Clear screen: CSI 2 J (clears entire screen)
        process.stdout.write("\x1b[2J");
        // Clear Kitty graphics: ESC G a=d,i=1 (delete image with id=1)
        // ESC \ is the terminator for primary datastream
        process.stdout.write("\x1b_Ga=d,i=1\x1b\\");
    });

    process.on("SIGINT", () => {
        // Show cursor: CSI ? 25 h
        process.stdout.write("\x1b[?25h");
        // Clear Kitty graphics: ESC G a=d,i=1 (delete image with id=1)
        process.stdout.write("\x1b_Ga=d,i=1\x1b\\");
        process.exit();
    });

    const cols = process.stdout.columns;
    const rows = process.stdout.rows;

    const p5b = new P5b({
        width: windowWidth,
        height: windowHeight,
        fps: 60,
        sketchPath: sketchPath
    });

    p5b.on("frame", (buffer) => {
        const internalCanvas = p5b._destCanvas || p5b._myP5?.canvas;
        if (!internalCanvas) return;

        const b64Buffer = internalCanvas.toBuffer("image/png").toString("base64");

        // Kitty graphics protocol transmission:
        //   ESC G a=T        - action: transmit (upload image)
        //   i=1              - image id: 1 (reuse same slot)
        //   f=100            - frame: 100 (animation frame number)
        //   c=cols           - columns (terminal cell width)
        //   r=rows           - rows (terminal cell height)
        //   q=1              - quality: lossy (1)
        //   ;b64Buffer       - base64-encoded PNG data follows
        //   ESC \             - end of primary datastream
        process.stdout.write(`\x1b_Ga=T,i=1,f=100,c=${cols},r=${rows},q=1;${b64Buffer}\x1b\\`);
    });

    p5b.run();
}

main();
