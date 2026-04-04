import { describe, it, expect } from "bun:test";
import { P5b } from "../p5b.mjs";

describe("P5b ESM Import", () => {
    it("should import P5b using ESM syntax", () => {
        expect(typeof P5b).toBe("function");
    });

    it("should instantiate P5b with ESM import", (done) => {
        const p5b = new P5b({
            width: 32,
            height: 32,
            fps: 30,
            setup: () => {
                createCanvas(400, 400);
            },
            draw: () => {
                background(100, 150, 200);
            }
        });

        p5b.on("frame", (buffer) => {
            expect(buffer).toBeInstanceOf(Uint8Array);
            expect(buffer.length).toBe(32 * 32 * 4);
            
            // Verify background color
            const r = buffer[0];
            const g = buffer[1];
            const b = buffer[2];
            expect(r).toBe(100);
            expect(g).toBe(150);
            expect(b).toBe(200);

            p5b.stop();
            done();
        });

        p5b.run();
    });
});
