const { describe, it, expect } = require("bun:test");
const { P5b } = require("../../p5b.js");

describe("P5b Globals - p5.js v1.x Compatibility", () => {
    describe("Trigonometry Constants", () => {
        it("should have PI", (done) => {
            const p5b = new P5b({
                width: 16, height: 16,
                setup: () => {
                    expect(global.PI).toBe(Math.PI);
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
                    expect(global.TWO_PI).toBe(Math.PI * 2);
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
                    expect(global.HALF_PI).toBe(Math.PI / 2);
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
                    expect(global.QUARTER_PI).toBe(Math.PI / 4);
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
                    expect(global.TAU).toBe(Math.PI * 2);
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
                    expect(global.DEGREES).toBe("degrees");
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
                    expect(global.RADIANS).toBe("radians");
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
                    expect(global.P2D).toBe("p2d");
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
                    expect(global.WEBGL).toBe("webgl");
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
                    expect(global.WEBGL2).toBe("webgl2");
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
                    expect(global.CORNER).toBe("corner");
                    expect(global.CORNERS).toBe("corners");
                    expect(global.RADIUS).toBe("radius");
                    expect(global.CENTER).toBe("center");
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
                    expect(global.LEFT).toBe("left");
                    expect(global.RIGHT).toBe("right");
                    expect(global.TOP).toBe("top");
                    expect(global.BOTTOM).toBe("bottom");
                    expect(global.BASELINE).toBe("alphabetic");
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
                    expect(global.CLOSE).toBe("close");
                    expect(global.OPEN).toBe("open");
                    expect(global.CHORD).toBe("chord");
                    expect(global.PIE).toBe("pie");
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
                    expect(global.ROUND).toBe("round");
                    expect(global.SQUARE).toBe("butt");
                    expect(global.PROJECT).toBe("square");
                    expect(global.BEVEL).toBe("bevel");
                    expect(global.MITER).toBe("miter");
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
                    expect(global.POINTS).toBe(0x0000);
                    expect(global.LINES).toBe(0x0001);
                    expect(global.LINE_STRIP).toBe(0x0003);
                    expect(global.LINE_LOOP).toBe(0x0002);
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
                    expect(global.TRIANGLES).toBe(0x0004);
                    expect(global.TRIANGLE_FAN).toBe(0x0006);
                    expect(global.TRIANGLE_STRIP).toBe(0x0005);
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
                    expect(global.LINEAR).toBe("linear");
                    expect(global.QUADRATIC).toBe("quadratic");
                    expect(global.BEZIER).toBe("bezier");
                    expect(global.CURVE).toBe("curve");
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
                    expect(global.RGB).toBe("rgb");
                    expect(global.HSB).toBe("hsb");
                    expect(global.HSL).toBe("hsl");
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
                    expect(global.BLEND).toBe("source-over");
                    expect(global.ADD).toBe("lighter");
                    expect(global.REMOVE).toBe("destination-out");
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
                    expect(global.DARKEST).toBe("darken");
                    expect(global.LIGHTEST).toBe("lighten");
                    expect(global.DIFFERENCE).toBe("difference");
                    expect(global.SUBTRACT).toBe("subtract");
                    expect(global.EXCLUSION).toBe("exclusion");
                    expect(global.MULTIPLY).toBe("multiply");
                    expect(global.SCREEN).toBe("screen");
                    expect(global.REPLACE).toBe("copy");
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
                    expect(global.OVERLAY).toBe("overlay");
                    expect(global.HARD_LIGHT).toBe("hard-light");
                    expect(global.SOFT_LIGHT).toBe("soft-light");
                    expect(global.DODGE).toBe("color-dodge");
                    expect(global.BURN).toBe("color-burn");
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
                    expect(global.ARROW).toBe("default");
                    expect(global.CROSS).toBe("crosshair");
                    expect(global.HAND).toBe("pointer");
                    expect(global.MOVE).toBe("move");
                    expect(global.TEXT).toBe("text");
                    expect(global.WAIT).toBe("wait");
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
                    expect(global.ALT).toBe(18);
                    expect(global.CONTROL).toBe(17);
                    expect(global.SHIFT).toBe(16);
                    expect(global.OPTION).toBe(18);
                    expect(global.BACKSPACE).toBe(8);
                    expect(global.DELETE).toBe(46);
                    expect(global.TAB).toBe(9);
                    expect(global.ENTER).toBe(13);
                    expect(global.RETURN).toBe(13);
                    expect(global.ESCAPE).toBe(27);
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
                    expect(global.UP_ARROW).toBe(38);
                    expect(global.DOWN_ARROW).toBe(40);
                    expect(global.LEFT_ARROW).toBe(37);
                    expect(global.RIGHT_ARROW).toBe(39);
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
                    expect(global.NORMAL).toBe("normal");
                    expect(global.ITALIC).toBe("italic");
                    expect(global.BOLD).toBe("bold");
                    expect(global.BOLDITALIC).toBe("bold italic");
                    expect(global.CHAR).toBe("CHAR");
                    expect(global.WORD).toBe("WORD");
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
                    expect(global.AUTO).toBe("auto");
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
                    expect(global.STROKE).toBe("stroke");
                    expect(global.FILL).toBe("fill");
                    expect(global.TEXTURE).toBe("texture");
                    expect(global.IMMEDIATE).toBe("immediate");
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
                    expect(global.NEAREST).toBe("nearest");
                    expect(global.REPEAT).toBe("repeat");
                    expect(global.CLAMP).toBe("clamp");
                    expect(global.MIRROR).toBe("mirror");
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
                    expect(global.FLAT).toBe("flat");
                    expect(global.SMOOTH).toBe("smooth");
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
                    expect(global.LANDSCAPE).toBe("landscape");
                    expect(global.PORTRAIT).toBe("portrait");
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
                    expect(global.abs).toBe(Math.abs);
                    expect(global.abs(-5)).toBe(5);
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
                    expect(global.ceil).toBe(Math.ceil);
                    expect(global.ceil(4.2)).toBe(5);
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
                    expect(global.floor).toBe(Math.floor);
                    expect(global.floor(4.8)).toBe(4);
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
                    expect(global.round).toBe(Math.round);
                    expect(global.round(4.5)).toBe(5);
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
                    expect(global.pow).toBe(Math.pow);
                    expect(global.pow(2, 3)).toBe(8);
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
                    expect(global.sqrt).toBe(Math.sqrt);
                    expect(global.sqrt(16)).toBe(4);
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
                    expect(global.exp).toBe(Math.exp);
                    expect(global.exp(1)).toBeCloseTo(Math.E, 5);
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
                    expect(global.log).toBe(Math.log);
                    expect(global.log(Math.E)).toBeCloseTo(1, 5);
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
                    expect(global.max).toBe(Math.max);
                    expect(global.max(1, 5, 3)).toBe(5);
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
                    expect(global.min).toBe(Math.min);
                    expect(global.min(1, 5, 3)).toBe(1);
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
                    expect(global.sq).toBeDefined();
                    expect(global.sq(4)).toBe(16);
                    expect(global.sq(-3)).toBe(9);
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
                    expect(global.mag).toBeDefined();
                    expect(global.mag(3, 4)).toBe(5);
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
                    expect(global.fract).toBeDefined();
                    expect(global.fract(1.5)).toBe(0.5);
                    expect(global.fract(-1.5)).toBe(0.5);
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
                    expect(global.random).toBeDefined();
                    const r = global.random();
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
                    expect(global.randomSeed).toBeDefined();
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
                    expect(global.randomGaussian).toBeDefined();
                    const r = global.randomGaussian();
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
                    expect(global.noise).toBeDefined();
                    const n = global.noise(0);
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
                    expect(global.noiseSeed).toBeDefined();
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
                    expect(global.noiseDetail).toBeDefined();
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
                    expect(global.map).toBeDefined();
                    expect(global.map(50, 0, 100, 0, 1000)).toBe(500);
                    expect(global.map(0, 0, 100, -10, 10)).toBe(-10);
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
                    expect(global.lerp).toBeDefined();
                    expect(global.lerp(0, 100, 0.5)).toBe(50);
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
                    expect(global.constrain).toBeDefined();
                    expect(global.constrain(150, 0, 100)).toBe(100);
                    expect(global.constrain(50, 0, 100)).toBe(50);
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
                    expect(global.dist).toBeDefined();
                    expect(global.dist(0, 0, 3, 4)).toBe(5);
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
                    expect(global.lerpColor).toBeDefined();
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
                    expect(global.nf).toBeDefined();
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
                    expect(global.nfc).toBeDefined();
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
                    expect(global.nfp).toBeDefined();
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
                    expect(global.nfs).toBeDefined();
                },
                draw: () => { background(0); noLoop(); }
            });
            p5b.on("frame", () => { p5b.stop(); done(); });
            p5b.run();
        });

        it("should have join", (done) => {
            const p5b = new P5b({
                width: 16, height: 16,
                setup: () => {
                    expect(global.join).toBeDefined();
                },
                draw: () => { background(0); noLoop(); }
            });
            p5b.on("frame", () => { p5b.stop(); done(); });
            p5b.run();
        });

        it("should have split", (done) => {
            const p5b = new P5b({
                width: 16, height: 16,
                setup: () => {
                    expect(global.split).toBeDefined();
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
                    expect(global.splitTokens).toBeDefined();
                },
                draw: () => { background(0); noLoop(); }
            });
            p5b.on("frame", () => { p5b.stop(); done(); });
            p5b.run();
        });

        it("should have trim", (done) => {
            const p5b = new P5b({
                width: 16, height: 16,
                setup: () => {
                    expect(global.trim).toBeDefined();
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
                    expect(global.createVector).toBeDefined();
                },
                draw: () => { background(0); noLoop(); }
            });
            p5b.on("frame", () => { p5b.stop(); done(); });
            p5b.run();
        });
    });
});
