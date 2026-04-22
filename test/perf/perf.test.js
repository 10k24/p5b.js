/**
 * Performance tests for p5b.js toFrame() paths.
 *
 * Run with: bun test test/perf/perf.test.js
 *
 * Compares happy path (canvas dims == p5b dims, uses loadPixels)
 * vs scale path (canvas dims != p5b dims, uses drawImage + BGRA swap).
 * The happy path should be measurably faster.
 */

const { P5b } = require("../../p5b.js");

const FRAMES = 200;
const WARM_UP = 20;

function runBench(p5bInstance) {
    return new Promise((resolve, reject) => {
        let count = 0;
        let start = null;

        p5bInstance.on("error", (e) => { p5bInstance.stop(); reject(e.error); });
        p5bInstance.on("frame", () => {
            count++;
            if (count === WARM_UP) {
                start = performance.now();
            }
            if (count === WARM_UP + FRAMES) {
                const elapsed = performance.now() - start;
                p5bInstance.stop();
                resolve(elapsed / FRAMES);
            }
        });
        p5bInstance.run();
    });
}

describe("Performance - toFrame() happy path vs scale path", () => {
    it("happy path is faster than scale path", async () => {
        const happyP5b = new P5b({
            width: 512, height: 512, fps: 10000,
            setup: () => { createCanvas(512, 512); },
            draw: () => { background(100, 150, 200); },
        });

        const scaleP5b = new P5b({
            width: 256, height: 256, fps: 10000,
            setup: () => { createCanvas(512, 512); },
            draw: () => { background(100, 150, 200); },
        });

        const scaleMs = await runBench(scaleP5b);
        const happyMs = await runBench(happyP5b);

        console.log(`  happy path: ${happyMs.toFixed(3)}ms/frame`);
        console.log(`  scale path: ${scaleMs.toFixed(3)}ms/frame`);
        console.log(`  speedup:    ${(scaleMs / happyMs).toFixed(2)}x`);

        expect(happyMs).toBeLessThan(scaleMs);
    }, 60000);
});
