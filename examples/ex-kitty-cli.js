const { P5b } = require("../p5b.js");

const sketchPath = process.argv[2];
if (!sketchPath) {
    console.error("Usage: node ex-kitty-cli.js <sketch-path>");
    process.exit(1);
}

async function main() {
    let size;
    try {
        const { native: termios } = await import("node-termios");
        size = getTerminalSize(termios);
    } catch (e) {
        console.error("No terminal available, using default size");
        size = { canvasWidth: 800, canvasHeight: 600 };
    }

    const scaleFactor = 0.5;

    const scaledWidth = Math.floor(size.canvasWidth * scaleFactor);
    const scaledHeight = Math.floor(size.canvasHeight * scaleFactor);

    global.windowWidth = scaledWidth;
    global.windowHeight = scaledHeight;

    // const cellsWide = Math.floor(size.canvasWidth / 8);
    // const cellsHigh = Math.floor(size.canvasHeight / 16);
    const cellsWide = Math.floor(scaledWidth / 8);
    const cellsHigh = Math.floor(scaledHeight / 16);

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

    const cols = process.stdout.columns; // 210
    const rows = process.stdout.rows;    // 70

    const p5b = new P5b({
        width: scaledWidth,
        height: scaledHeight,
        framerate: 60,
        sketchPath: sketchPath
    });

    p5b.on("frame", (buffer) => {
        const internalCanvas = p5b._destCanvas || p5b._myP5?.canvas;
        if (!internalCanvas) return;
        
        const pngBuffer = internalCanvas.toBuffer("image/png");
        const base64 = pngBuffer.toString('base64');

        // process.stdout.write(`\x1b_Ga=T,i=1,f=100,c=210,r=70,q=1;${base64}\x1b\\`);
        process.stdout.write(`\x1b_Ga=T,i=1,f=100,c=${cols},r=${rows},q=1;${base64}\x1b\\`);
    });

    p5b.run();

    function getTerminalSize(termios) {
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
            canvasWidth: size.xpixel,
            canvasHeight: size.ypixel
        };
    }
}

main();