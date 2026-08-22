/* eslint-disable no-console */
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
const RUNS = 5;

function runBench(p5bInstance) {
    return new Promise((resolve, reject) => {
        let count = 0;
        let start = null;

        p5bInstance.on("error", (e) => { p5bInstance.stop(); reject(e.error); });
        p5bInstance.on("frame", () => {
            count++;
            if (count === WARM_UP) {
                start = Date.now();
            }
            if (count === WARM_UP + FRAMES) {
                const elapsed = Date.now() - start;
                p5bInstance.stop();
                resolve(elapsed / FRAMES);
            }
        });
        p5bInstance.run();
    });
}

describe("Performance - toFrame() happy path vs scale path", () => {
    it("happy path is faster than scale path", async () => {
        // Best-of-N (min) reduces noise from shared/emulated CI runners where a
        // single wall-clock sample of the two paths can flip ordering spuriously.
        const runs = [];
        for (let i = 0; i < RUNS; i++) {
            // Happy path: canvas size == p5b output size, so toFrame() does a direct
            // loadPixels copy with no scaling. Smallest output of the two.
            const happyP5b = new P5b({
                width: 256, height: 256, fps: 10000,
                setup: () => { createCanvas(256, 256); },
                draw: () => { background(100, 150, 200); },
            });
            runs.push({ happy: await runBench(happyP5b), scale: null });
        }
        for (let i = 0; i < RUNS; i++) {
            // Scale path: canvas (1024) differs from p5b output (512) so toFrame()
            // must downscale via drawImage + BGRA reorder. Deliberately a DIFFERENT
            // size than the happy path — that contrast is the point of the test.
            const scaleP5b = new P5b({
                width: 512, height: 512, fps: 10000,
                setup: () => { createCanvas(1024, 1024); },
                draw: () => { background(100, 150, 200); },
            });
            runs[i].scale = await runBench(scaleP5b);
        }

        const happyMs = Math.min(...runs.map((r) => r.happy));
        const scaleMs = Math.min(...runs.map((r) => r.scale));

        console.log(`  happy path (min of ${RUNS}): ${happyMs.toFixed(3)}ms/frame`);
        console.log(`  scale path (min of ${RUNS}): ${scaleMs.toFixed(3)}ms/frame`);
        console.log(`  speedup:    ${(scaleMs / happyMs).toFixed(2)}x`);

        expect(happyMs).toBeLessThan(scaleMs);
    }, 60000);
});
