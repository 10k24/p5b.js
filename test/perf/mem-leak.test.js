/**
 * Memory leak test for p5b.js stop()/run() lifecycle.
 *
 * Run with: bun test test/perf/mem-leak.test.js
 *
 * Verifies that repeated stop()/run() cycles on a single P5b instance
 * do not cause unbounded RSS growth. Uses a large canvas (4096x4096)
 * to stress-test Cairo surface reuse.
 */

const { describe, it, expect } = require("bun:test");
const { P5b } = require("../../p5b.js");

const CANVAS_SIZE = 4096;
const CYCLE_INTERVAL_MS = 200;
const DURATION_MS = 30_000;
const WARM_UP_MS = 2_000;
// Baseline (~184MB for 4096x4096) + 50MB headroom
const RSS_GROWTH_LIMIT_MB = 50;

function mbRSS() {
    return process.memoryUsage().rss / 1024 / 1024;
}

describe("Memory - stop()/run() cycles do not leak", () => {
    it("RSS growth stays under 50MB over 30s of stop/run cycles at 4096x4096", (done) => {
        let baselineMB = null;
        let cycles = 0;

        const p5b = new P5b({
            width: 64, height: 64, fps: 60,
            setup: () => { createCanvas(CANVAS_SIZE, CANVAS_SIZE); },
            draw: () => { background(100, 150, 200); },
        });

        p5b.on("error", (e) => { p5b.remove(); done(e.error); });
        p5b.run();

        const cycleTimer = setInterval(() => {
            p5b.stop();
            p5b.run();
            cycles++;
        }, CYCLE_INTERVAL_MS);

        // Capture baseline after warmup
        setTimeout(() => {
            baselineMB = mbRSS();
        }, WARM_UP_MS);

        setTimeout(() => {
            clearInterval(cycleTimer);
            p5b.remove();

            const finalMB = mbRSS();
            const growth = finalMB - baselineMB;

            console.log(`  cycles:   ${cycles}`);
            console.log(`  baseline: ${baselineMB.toFixed(1)}MB`);
            console.log(`  final:    ${finalMB.toFixed(1)}MB`);
            console.log(`  growth:   ${growth.toFixed(1)}MB (limit: ${RSS_GROWTH_LIMIT_MB}MB)`);

            expect(growth).toBeLessThan(RSS_GROWTH_LIMIT_MB);
            done();
        }, DURATION_MS);
    }, 35_000);
});
