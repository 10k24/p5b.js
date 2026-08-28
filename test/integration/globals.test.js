const { describe, it, expect } = require("bun:test");
const { P5b } = require("../../p5b.js");
const { findP5Version } = require("../../lib/globals");

// p5.js v2 removed string utility functions (join, split, trim) that wrapped native JS
// equivalents. P5b shims them back to v1 semantics in v2 mode.
const isP5v2 = findP5Version() === 2;

describe("P5b Globals - p5.js v1.x Compatibility", () => {
    describe("Trigonometry Constants", () => {
        it("should have PI", (done) => {
            const p5b = new P5b({
                width: 16, height: 16,
                setup: () => {
                    expect(PI).toBe(Math.PI);
                },
                draw: () => { background(0); noLoop(); }
            });
            p5b.on("frame", () => { p5b.stop(); done(); });
            p5b.run();
        });

        it("should have TWO_PI", (done) => {
            const p5b = new P5b({
                width: 16, height: 16,
                setup: () => {
                    expect(TWO_PI).toBe(Math.PI * 2);
                },
                draw: () => { background(0); noLoop(); }
            });
            p5b.on("frame", () => { p5b.stop(); done(); });
            p5b.run();
        });

        it("should have HALF_PI", (done) => {
            const p5b = new P5b({
                width: 16, height: 16,
                setup: () => {
                    expect(HALF_PI).toBe(Math.PI / 2);
                },
                draw: () => { background(0); noLoop(); }
            });
            p5b.on("frame", () => { p5b.stop(); done(); });
            p5b.run();
        });

        it("should have QUARTER_PI", (done) => {
            const p5b = new P5b({
                width: 16, height: 16,
                setup: () => {
                    expect(QUARTER_PI).toBe(Math.PI / 4);
                },
                draw: () => { background(0); noLoop(); }
            });
            p5b.on("frame", () => { p5b.stop(); done(); });
            p5b.run();
        });

        it("should have TAU", (done) => {
            const p5b = new P5b({
                width: 16, height: 16,
                setup: () => {
                    expect(TAU).toBe(Math.PI * 2);
                },
                draw: () => { background(0); noLoop(); }
            });
            p5b.on("frame", () => { p5b.stop(); done(); });
            p5b.run();
        });

        it("should have DEGREES", (done) => {
            const p5b = new P5b({
                width: 16, height: 16,
                setup: () => {
                    expect(DEGREES).toBe("degrees");
                },
                draw: () => { background(0); noLoop(); }
            });
            p5b.on("frame", () => { p5b.stop(); done(); });
            p5b.run();
        });

        it("should have RADIANS", (done) => {
            const p5b = new P5b({
                width: 16, height: 16,
                setup: () => {
                    expect(RADIANS).toBe("radians");
                },
                draw: () => { background(0); noLoop(); }
            });
            p5b.on("frame", () => { p5b.stop(); done(); });
            p5b.run();
        });
    });

    describe("Graphics Renderer Constants", () => {
        it("should have P2D", (done) => {
            const p5b = new P5b({
                width: 16, height: 16,
                setup: () => {
                    expect(P2D).toBe("p2d");
                },
                draw: () => { background(0); noLoop(); }
            });
            p5b.on("frame", () => { p5b.stop(); done(); });
            p5b.run();
        });

        it("should have WEBGL", (done) => {
            const p5b = new P5b({
                width: 16, height: 16,
                setup: () => {
                    expect(WEBGL).toBe("webgl");
                },
                draw: () => { background(0); noLoop(); }
            });
            p5b.on("frame", () => { p5b.stop(); done(); });
            p5b.run();
        });

        it("should have WEBGL2", (done) => {
            const p5b = new P5b({
                width: 16, height: 16,
                setup: () => {
                    expect(WEBGL2).toBe("webgl2");
                },
                draw: () => { background(0); noLoop(); }
            });
            p5b.on("frame", () => { p5b.stop(); done(); });
            p5b.run();
        });
    });

    describe("Shape/Mode Constants", () => {
        it("should have CORNER, CORNERS, RADIUS, CENTER", (done) => {
            const p5b = new P5b({
                width: 16, height: 16,
                setup: () => {
                    expect(CORNER).toBe("corner");
                    expect(CORNERS).toBe("corners");
                    expect(RADIUS).toBe("radius");
                    expect(CENTER).toBe("center");
                },
                draw: () => { background(0); noLoop(); }
            });
            p5b.on("frame", () => { p5b.stop(); done(); });
            p5b.run();
        });

        it("should have LEFT, RIGHT, TOP, BOTTOM, BASELINE", (done) => {
            const p5b = new P5b({
                width: 16, height: 16,
                setup: () => {
                    expect(LEFT).toBe("left");
                    expect(RIGHT).toBe("right");
                    expect(TOP).toBe("top");
                    expect(BOTTOM).toBe("bottom");
                    expect(BASELINE).toBe("alphabetic");
                },
                draw: () => { background(0); noLoop(); }
            });
            p5b.on("frame", () => { p5b.stop(); done(); });
            p5b.run();
        });

        it("should have CLOSE, OPEN, CHORD, PIE", (done) => {
            const p5b = new P5b({
                width: 16, height: 16,
                setup: () => {
                    expect(CLOSE).toBe("close");
                    expect(OPEN).toBe("open");
                    expect(CHORD).toBe("chord");
                    expect(PIE).toBe("pie");
                },
                draw: () => { background(0); noLoop(); }
            });
            p5b.on("frame", () => { p5b.stop(); done(); });
            p5b.run();
        });

        it("should have ROUND, SQUARE, PROJECT, BEVEL, MITER", (done) => {
            const p5b = new P5b({
                width: 16, height: 16,
                setup: () => {
                    expect(ROUND).toBe("round");
                    expect(SQUARE).toBe("butt");
                    expect(PROJECT).toBe("square");
                    expect(BEVEL).toBe("bevel");
                    expect(MITER).toBe("miter");
                },
                draw: () => { background(0); noLoop(); }
            });
            p5b.on("frame", () => { p5b.stop(); done(); });
            p5b.run();
        });

        it("should have POINTS, LINES, LINE_STRIP, LINE_LOOP", (done) => {
            const p5b = new P5b({
                width: 16, height: 16,
                setup: () => {
                    expect(POINTS).toBe(0x0000);
                    expect(LINES).toBe(0x0001);
                    expect(LINE_STRIP).toBe(0x0003);
                    expect(LINE_LOOP).toBe(0x0002);
                },
                draw: () => { background(0); noLoop(); }
            });
            p5b.on("frame", () => { p5b.stop(); done(); });
            p5b.run();
        });

        it("should have TRIANGLES, TRIANGLE_FAN, TRIANGLE_STRIP", (done) => {
            const p5b = new P5b({
                width: 16, height: 16,
                setup: () => {
                    expect(TRIANGLES).toBe(0x0004);
                    expect(TRIANGLE_FAN).toBe(0x0006);
                    expect(TRIANGLE_STRIP).toBe(0x0005);
                },
                draw: () => { background(0); noLoop(); }
            });
            p5b.on("frame", () => { p5b.stop(); done(); });
            p5b.run();
        });

        it("should have LINEAR, QUADRATIC, BEZIER, CURVE", (done) => {
            const p5b = new P5b({
                width: 16, height: 16,
                setup: () => {
                    expect(LINEAR).toBe("linear");
                    expect(QUADRATIC).toBe("quadratic");
                    expect(BEZIER).toBe("bezier");
                    expect(CURVE).toBe("curve");
                },
                draw: () => { background(0); noLoop(); }
            });
            p5b.on("frame", () => { p5b.stop(); done(); });
            p5b.run();
        });
    });

    describe("Color Constants", () => {
        it("should have RGB, HSB, HSL", (done) => {
            const p5b = new P5b({
                width: 16, height: 16,
                setup: () => {
                    expect(RGB).toBe("rgb");
                    expect(HSB).toBe("hsb");
                    expect(HSL).toBe("hsl");
                },
                draw: () => { background(0); noLoop(); }
            });
            p5b.on("frame", () => { p5b.stop(); done(); });
            p5b.run();
        });
    });

    describe("Blend Mode Constants", () => {
        it("should have basic blend modes", (done) => {
            const p5b = new P5b({
                width: 16, height: 16,
                setup: () => {
                    expect(BLEND).toBe("source-over");
                    expect(ADD).toBe("lighter");
                    expect(REMOVE).toBe("destination-out");
                },
                draw: () => { background(0); noLoop(); }
            });
            p5b.on("frame", () => { p5b.stop(); done(); });
            p5b.run();
        });

        it("should have blend modes", (done) => {
            const p5b = new P5b({
                width: 16, height: 16,
                setup: () => {
                    expect(DARKEST).toBe("darken");
                    expect(LIGHTEST).toBe("lighten");
                    expect(DIFFERENCE).toBe("difference");
                    expect(SUBTRACT).toBe("subtract");
                    expect(EXCLUSION).toBe("exclusion");
                    expect(MULTIPLY).toBe("multiply");
                    expect(SCREEN).toBe("screen");
                    expect(REPLACE).toBe("copy");
                },
                draw: () => { background(0); noLoop(); }
            });
            p5b.on("frame", () => { p5b.stop(); done(); });
            p5b.run();
        });

        it("should have advanced blend modes", (done) => {
            const p5b = new P5b({
                width: 16, height: 16,
                setup: () => {
                    expect(OVERLAY).toBe("overlay");
                    expect(HARD_LIGHT).toBe("hard-light");
                    expect(SOFT_LIGHT).toBe("soft-light");
                    expect(DODGE).toBe("color-dodge");
                    expect(BURN).toBe("color-burn");
                },
                draw: () => { background(0); noLoop(); }
            });
            p5b.on("frame", () => { p5b.stop(); done(); });
            p5b.run();
        });
    });

    describe("Cursor/Input Constants", () => {
        it("should have cursor constants", (done) => {
            const p5b = new P5b({
                width: 16, height: 16,
                setup: () => {
                    expect(ARROW).toBe("default");
                    expect(CROSS).toBe("crosshair");
                    expect(HAND).toBe("pointer");
                    expect(MOVE).toBe("move");
                    expect(TEXT).toBe("text");
                    expect(WAIT).toBe("wait");
                },
                draw: () => { background(0); noLoop(); }
            });
            p5b.on("frame", () => { p5b.stop(); done(); });
            p5b.run();
        });

        it("should have key code constants", (done) => {
            const p5b = new P5b({
                width: 16, height: 16,
                setup: () => {
                    expect(ALT).toBe(18);
                    expect(CONTROL).toBe(17);
                    expect(SHIFT).toBe(16);
                    expect(OPTION).toBe(18);
                    expect(BACKSPACE).toBe(8);
                    expect(DELETE).toBe(46);
                    expect(TAB).toBe(9);
                    expect(ENTER).toBe(13);
                    expect(RETURN).toBe(13);
                    expect(ESCAPE).toBe(27);
                },
                draw: () => { background(0); noLoop(); }
            });
            p5b.on("frame", () => { p5b.stop(); done(); });
            p5b.run();
        });

        it("should have arrow key constants", (done) => {
            const p5b = new P5b({
                width: 16, height: 16,
                setup: () => {
                    expect(UP_ARROW).toBe(38);
                    expect(DOWN_ARROW).toBe(40);
                    expect(LEFT_ARROW).toBe(37);
                    expect(RIGHT_ARROW).toBe(39);
                },
                draw: () => { background(0); noLoop(); }
            });
            p5b.on("frame", () => { p5b.stop(); done(); });
            p5b.run();
        });
    });

    describe("Typography Constants", () => {
        it("should have typography constants", (done) => {
            const p5b = new P5b({
                width: 16, height: 16,
                setup: () => {
                    expect(NORMAL).toBe("normal");
                    expect(ITALIC).toBe("italic");
                    expect(BOLD).toBe("bold");
                    expect(BOLDITALIC).toBe("bold italic");
                    expect(CHAR).toBe("CHAR");
                    expect(WORD).toBe("WORD");
                },
                draw: () => { background(0); noLoop(); }
            });
            p5b.on("frame", () => { p5b.stop(); done(); });
            p5b.run();
        });
    });

    describe("Other Constants", () => {
        it("should have AUTO", (done) => {
            const p5b = new P5b({
                width: 16, height: 16,
                setup: () => {
                    expect(AUTO).toBe("auto");
                },
                draw: () => { background(0); noLoop(); }
            });
            p5b.on("frame", () => { p5b.stop(); done(); });
            p5b.run();
        });

        it("should have STROKE, FILL, TEXTURE, IMMEDIATE", (done) => {
            const p5b = new P5b({
                width: 16, height: 16,
                setup: () => {
                    expect(STROKE).toBe("stroke");
                    expect(FILL).toBe("fill");
                    expect(TEXTURE).toBe("texture");
                    expect(IMMEDIATE).toBe("immediate");
                },
                draw: () => { background(0); noLoop(); }
            });
            p5b.on("frame", () => { p5b.stop(); done(); });
            p5b.run();
        });

        it("should have NEAREST, REPEAT, CLAMP, MIRROR", (done) => {
            const p5b = new P5b({
                width: 16, height: 16,
                setup: () => {
                    expect(NEAREST).toBe("nearest");
                    expect(REPEAT).toBe("repeat");
                    expect(CLAMP).toBe("clamp");
                    expect(MIRROR).toBe("mirror");
                },
                draw: () => { background(0); noLoop(); }
            });
            p5b.on("frame", () => { p5b.stop(); done(); });
            p5b.run();
        });

        it("should have FLAT, SMOOTH", (done) => {
            const p5b = new P5b({
                width: 16, height: 16,
                setup: () => {
                    expect(FLAT).toBe("flat");
                    expect(SMOOTH).toBe("smooth");
                },
                draw: () => { background(0); noLoop(); }
            });
            p5b.on("frame", () => { p5b.stop(); done(); });
            p5b.run();
        });

        it("should have LANDSCAPE, PORTRAIT", (done) => {
            const p5b = new P5b({
                width: 16, height: 16,
                setup: () => {
                    expect(LANDSCAPE).toBe("landscape");
                    expect(PORTRAIT).toBe("portrait");
                },
                draw: () => { background(0); noLoop(); }
            });
            p5b.on("frame", () => { p5b.stop(); done(); });
            p5b.run();
        });
    });

    describe("Math Functions (Pass-through)", () => {
        it("should have abs as Math.abs", (done) => {
            const p5b = new P5b({
                width: 16, height: 16,
                setup: () => {
                    expect(abs).toBe(Math.abs);
                    expect(abs(-5)).toBe(5);
                },
                draw: () => { background(0); noLoop(); }
            });
            p5b.on("frame", () => { p5b.stop(); done(); });
            p5b.run();
        });

        it("should have ceil as Math.ceil", (done) => {
            const p5b = new P5b({
                width: 16, height: 16,
                setup: () => {
                    expect(ceil).toBe(Math.ceil);
                    expect(ceil(4.2)).toBe(5);
                },
                draw: () => { background(0); noLoop(); }
            });
            p5b.on("frame", () => { p5b.stop(); done(); });
            p5b.run();
        });

        it("should have floor as Math.floor", (done) => {
            const p5b = new P5b({
                width: 16, height: 16,
                setup: () => {
                    expect(floor).toBe(Math.floor);
                    expect(floor(4.8)).toBe(4);
                },
                draw: () => { background(0); noLoop(); }
            });
            p5b.on("frame", () => { p5b.stop(); done(); });
            p5b.run();
        });

        it("should have round as Math.round", (done) => {
            const p5b = new P5b({
                width: 16, height: 16,
                setup: () => {
                    expect(round).toBe(Math.round);
                    expect(round(4.5)).toBe(5);
                },
                draw: () => { background(0); noLoop(); }
            });
            p5b.on("frame", () => { p5b.stop(); done(); });
            p5b.run();
        });

        it("should have pow as Math.pow", (done) => {
            const p5b = new P5b({
                width: 16, height: 16,
                setup: () => {
                    expect(pow).toBe(Math.pow);
                    expect(pow(2, 3)).toBe(8);
                },
                draw: () => { background(0); noLoop(); }
            });
            p5b.on("frame", () => { p5b.stop(); done(); });
            p5b.run();
        });

        it("should have sqrt as Math.sqrt", (done) => {
            const p5b = new P5b({
                width: 16, height: 16,
                setup: () => {
                    expect(sqrt).toBe(Math.sqrt);
                    expect(sqrt(16)).toBe(4);
                },
                draw: () => { background(0); noLoop(); }
            });
            p5b.on("frame", () => { p5b.stop(); done(); });
            p5b.run();
        });

        it("should have exp as Math.exp", (done) => {
            const p5b = new P5b({
                width: 16, height: 16,
                setup: () => {
                    expect(exp).toBe(Math.exp);
                    expect(exp(1)).toBeCloseTo(Math.E, 5);
                },
                draw: () => { background(0); noLoop(); }
            });
            p5b.on("frame", () => { p5b.stop(); done(); });
            p5b.run();
        });

        it("should have log as Math.log", (done) => {
            const p5b = new P5b({
                width: 16, height: 16,
                setup: () => {
                    expect(log).toBe(Math.log);
                    expect(log(Math.E)).toBeCloseTo(1, 5);
                },
                draw: () => { background(0); noLoop(); }
            });
            p5b.on("frame", () => { p5b.stop(); done(); });
            p5b.run();
        });

        it("should have max as Math.max", (done) => {
            const p5b = new P5b({
                width: 16, height: 16,
                setup: () => {
                    expect(max).toBe(Math.max);
                    expect(max(1, 5, 3)).toBe(5);
                },
                draw: () => { background(0); noLoop(); }
            });
            p5b.on("frame", () => { p5b.stop(); done(); });
            p5b.run();
        });

        it("should have min as Math.min", (done) => {
            const p5b = new P5b({
                width: 16, height: 16,
                setup: () => {
                    expect(min).toBe(Math.min);
                    expect(min(1, 5, 3)).toBe(1);
                },
                draw: () => { background(0); noLoop(); }
            });
            p5b.on("frame", () => { p5b.stop(); done(); });
            p5b.run();
        });

        it("should respect angle mode in trig functions", (done) => {
            const p5b = new P5b({
                width: 16, height: 16,
                setup: () => {
                    expect(sin(Math.PI / 2)).toBeCloseTo(1);
                    angleMode(DEGREES);
                    expect(sin(90)).toBeCloseTo(1);
                    expect(cos(0)).toBeCloseTo(1);
                    expect(tan(45)).toBeCloseTo(1);
                    angleMode(RADIANS);
                    expect(sin(Math.PI / 2)).toBeCloseTo(1);
                    expect(asin(1)).toBeCloseTo(Math.PI / 2);
                },
                draw: () => { background(0); noLoop(); }
            });
            p5b.on("frame", () => { p5b.stop(); done(); });
            p5b.run();
        });

        it("should have sq", (done) => {
            const p5b = new P5b({
                width: 16, height: 16,
                setup: () => {
                    expect(sq).toBeDefined();
                    expect(sq(4)).toBe(16);
                    expect(sq(-3)).toBe(9);
                },
                draw: () => { background(0); noLoop(); }
            });
            p5b.on("frame", () => { p5b.stop(); done(); });
            p5b.run();
        });

        it("should have mag", (done) => {
            const p5b = new P5b({
                width: 16, height: 16,
                setup: () => {
                    expect(mag).toBeDefined();
                    expect(mag(3, 4)).toBe(5);
                },
                draw: () => { background(0); noLoop(); }
            });
            p5b.on("frame", () => { p5b.stop(); done(); });
            p5b.run();
        });

        it("should have fract", (done) => {
            const p5b = new P5b({
                width: 16, height: 16,
                setup: () => {
                    expect(fract).toBeDefined();
                    expect(fract(1.5)).toBe(0.5);
                    expect(fract(-1.5)).toBe(0.5);
                },
                draw: () => { background(0); noLoop(); }
            });
            p5b.on("frame", () => { p5b.stop(); done(); });
            p5b.run();
        });
    });

    describe("Random/Noise Functions", () => {
        it("should have random", (done) => {
            const p5b = new P5b({
                width: 16, height: 16,
                setup: () => {
                    expect(random).toBeDefined();
                    const r = random();
                    expect(typeof r).toBe("number");
                    expect(r).toBeGreaterThanOrEqual(0);
                    expect(r).toBeLessThan(1);
                },
                draw: () => { background(0); noLoop(); }
            });
            p5b.on("frame", () => { p5b.stop(); done(); });
            p5b.run();
        });

        it("should have randomSeed", (done) => {
            const p5b = new P5b({
                width: 16, height: 16,
                setup: () => {
                    expect(randomSeed).toBeDefined();
                },
                draw: () => { background(0); noLoop(); }
            });
            p5b.on("frame", () => { p5b.stop(); done(); });
            p5b.run();
        });

        it("should have randomGaussian", (done) => {
            const p5b = new P5b({
                width: 16, height: 16,
                setup: () => {
                    expect(randomGaussian).toBeDefined();
                    const r = randomGaussian();
                    expect(typeof r).toBe("number");
                },
                draw: () => { background(0); noLoop(); }
            });
            p5b.on("frame", () => { p5b.stop(); done(); });
            p5b.run();
        });

        it("should have noise", (done) => {
            const p5b = new P5b({
                width: 16, height: 16,
                setup: () => {
                    expect(noise).toBeDefined();
                    const n = noise(0);
                    expect(typeof n).toBe("number");
                    expect(n).toBeGreaterThanOrEqual(0);
                    expect(n).toBeLessThanOrEqual(1);
                },
                draw: () => { background(0); noLoop(); }
            });
            p5b.on("frame", () => { p5b.stop(); done(); });
            p5b.run();
        });

        it("should have noiseSeed", (done) => {
            const p5b = new P5b({
                width: 16, height: 16,
                setup: () => {
                    expect(noiseSeed).toBeDefined();
                },
                draw: () => { background(0); noLoop(); }
            });
            p5b.on("frame", () => { p5b.stop(); done(); });
            p5b.run();
        });

        it("should have noiseDetail", (done) => {
            const p5b = new P5b({
                width: 16, height: 16,
                setup: () => {
                    expect(noiseDetail).toBeDefined();
                },
                draw: () => { background(0); noLoop(); }
            });
            p5b.on("frame", () => { p5b.stop(); done(); });
            p5b.run();
        });
    });

    describe("Utility Functions", () => {
        it("should have map", (done) => {
            const p5b = new P5b({
                width: 16, height: 16,
                setup: () => {
                    expect(map).toBeDefined();
                    expect(map(50, 0, 100, 0, 1000)).toBe(500);
                    expect(map(0, 0, 100, -10, 10)).toBe(-10);
                },
                draw: () => { background(0); noLoop(); }
            });
            p5b.on("frame", () => { p5b.stop(); done(); });
            p5b.run();
        });

        it("should have lerp", (done) => {
            const p5b = new P5b({
                width: 16, height: 16,
                setup: () => {
                    expect(lerp).toBeDefined();
                    expect(lerp(0, 100, 0.5)).toBe(50);
                },
                draw: () => { background(0); noLoop(); }
            });
            p5b.on("frame", () => { p5b.stop(); done(); });
            p5b.run();
        });

        it("should have constrain", (done) => {
            const p5b = new P5b({
                width: 16, height: 16,
                setup: () => {
                    expect(constrain).toBeDefined();
                    expect(constrain(150, 0, 100)).toBe(100);
                    expect(constrain(50, 0, 100)).toBe(50);
                },
                draw: () => { background(0); noLoop(); }
            });
            p5b.on("frame", () => { p5b.stop(); done(); });
            p5b.run();
        });

        it("should have dist", (done) => {
            const p5b = new P5b({
                width: 16, height: 16,
                setup: () => {
                    expect(dist).toBeDefined();
                    expect(dist(0, 0, 3, 4)).toBe(5);
                },
                draw: () => { background(0); noLoop(); }
            });
            p5b.on("frame", () => { p5b.stop(); done(); });
            p5b.run();
        });

        it("should have lerpColor", (done) => {
            const p5b = new P5b({
                width: 16, height: 16,
                setup: () => {
                    expect(lerpColor).toBeDefined();
                },
                draw: () => { background(0); noLoop(); }
            });
            p5b.on("frame", () => { p5b.stop(); done(); });
            p5b.run();
        });
    });

    describe("String Formatting Functions", () => {
        it("should have nf", (done) => {
            const p5b = new P5b({
                width: 16, height: 16,
                setup: () => {
                    expect(nf).toBeDefined();
                },
                draw: () => { background(0); noLoop(); }
            });
            p5b.on("frame", () => { p5b.stop(); done(); });
            p5b.run();
        });

        it("should have nfc", (done) => {
            const p5b = new P5b({
                width: 16, height: 16,
                setup: () => {
                    expect(nfc).toBeDefined();
                },
                draw: () => { background(0); noLoop(); }
            });
            p5b.on("frame", () => { p5b.stop(); done(); });
            p5b.run();
        });

        it("should have nfp", (done) => {
            const p5b = new P5b({
                width: 16, height: 16,
                setup: () => {
                    expect(nfp).toBeDefined();
                },
                draw: () => { background(0); noLoop(); }
            });
            p5b.on("frame", () => { p5b.stop(); done(); });
            p5b.run();
        });

        it("should have nfs", (done) => {
            const p5b = new P5b({
                width: 16, height: 16,
                setup: () => {
                    expect(nfs).toBeDefined();
                },
                draw: () => { background(0); noLoop(); }
            });
            p5b.on("frame", () => { p5b.stop(); done(); });
            p5b.run();
        });

        it.skipIf(isP5v2)("should have join", (done) => {
            const p5b = new P5b({
                width: 16, height: 16,
                setup: () => {
                    expect(join).toBeDefined();
                },
                draw: () => { background(0); noLoop(); }
            });
            p5b.on("frame", () => { p5b.stop(); done(); });
            p5b.run();
        });

        it.skipIf(!isP5v2)("v2: join is not defined (removed in p5 v2)", (done) => {
            const p5b = new P5b({
                width: 16, height: 16,
                setup: () => {
                    expect(typeof join).toBe("undefined");
                },
                draw: () => { background(0); noLoop(); }
            });
            p5b.on("frame", () => { p5b.stop(); done(); });
            p5b.run();
        });

        it.skipIf(isP5v2)("should have split", (done) => {
            const p5b = new P5b({
                width: 16, height: 16,
                setup: () => {
                    expect(split).toBeDefined();
                },
                draw: () => { background(0); noLoop(); }
            });
            p5b.on("frame", () => { p5b.stop(); done(); });
            p5b.run();
        });

        it.skipIf(!isP5v2)("v2: split is not defined (removed in p5 v2)", (done) => {
            const p5b = new P5b({
                width: 16, height: 16,
                setup: () => {
                    expect(typeof split).toBe("undefined");
                },
                draw: () => { background(0); noLoop(); }
            });
            p5b.on("frame", () => { p5b.stop(); done(); });
            p5b.run();
        });

        it("should have splitTokens", (done) => {
            const p5b = new P5b({
                width: 16, height: 16,
                setup: () => {
                    expect(splitTokens).toBeDefined();
                },
                draw: () => { background(0); noLoop(); }
            });
            p5b.on("frame", () => { p5b.stop(); done(); });
            p5b.run();
        });

        it.skipIf(isP5v2)("should have trim", (done) => {
            const p5b = new P5b({
                width: 16, height: 16,
                setup: () => {
                    expect(trim).toBeDefined();
                },
                draw: () => { background(0); noLoop(); }
            });
            p5b.on("frame", () => { p5b.stop(); done(); });
            p5b.run();
        });

        it.skipIf(!isP5v2)("v2: trim is not defined (removed in p5 v2)", (done) => {
            const p5b = new P5b({
                width: 16, height: 16,
                setup: () => {
                    expect(typeof trim).toBe("undefined");
                },
                draw: () => { background(0); noLoop(); }
            });
            p5b.on("frame", () => { p5b.stop(); done(); });
            p5b.run();
        });
    });

    describe("Other Functions", () => {
        it("should have createVector", (done) => {
            const p5b = new P5b({
                width: 16, height: 16,
                setup: () => {
                    expect(createVector).toBeDefined();
                },
                draw: () => { background(0); noLoop(); }
            });
            p5b.on("frame", () => { p5b.stop(); done(); });
            p5b.run();
        });
    });
});
