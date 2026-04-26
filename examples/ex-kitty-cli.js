// Render a p5.js sketch in the Kitty terminal at pixel resolution.
// Currently only works in  Kitty terminal due to animation support
const { native: termios } = require("node-termios");
const { P5b } = require("../p5b.js");

const sketchPath = process.argv[2];
if (!sketchPath) {
    console.error("Usage: node ex-kitty-cli.js <sketch-path>");
    process.exit(1);
}

function getTerminalSize() {
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

    const scaleFactor = 0.5;
    global.windowWidth = Math.floor(size.w * scaleFactor);
    global.windowHeight = Math.floor(size.h * scaleFactor);

    process.stdout.write("\x1b[?25l");

    process.on("exit", () => {
        process.stdout.write("\x1b[?25h");
        process.stdout.write("\x1b[2J");
        process.stdout.write("\x1b_Ga=d,i=1\x1b\\");
    });

    process.on("SIGINT", () => {
        process.stdout.write("\x1b[?25h");
        process.stdout.write("\x1b_Ga=d,i=1\x1b\\");
        process.exit();
    });

    const cols = process.stdout.columns;
    const rows = process.stdout.rows;

    const p5b = new P5b({
        width: windowWidth,
        height: windowHeight,
        framerate: 60,
        sketchPath: sketchPath
    });

    p5b.on("frame", (buffer) => {
        const internalCanvas = p5b._destCanvas || p5b._myP5?.canvas;
        if (!internalCanvas) return;
        
        const b64Buffer = internalCanvas.toBuffer("image/png").toString("base64");

        process.stdout.write(`\x1b_Ga=T,i=1,f=100,c=${cols},r=${rows},q=1;${b64Buffer}\x1b\\`);
    });

    p5b.run();
}

main();
