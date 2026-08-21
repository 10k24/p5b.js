const js = require("@eslint/js");
const { mathConstants, mathFunctions, p5Constants } = require("./globals");

// Names of the static globals p5b binds in _bindGlobals() (single source: globals.js)
const p5StaticGlobals = Object.keys({ ...mathConstants, ...mathFunctions, ...p5Constants });

module.exports = [
    {
        files: ["**/*.js"],
        languageOptions: {
            ecmaVersion: "latest",
            sourceType: "commonjs",
            globals: {
                global: "readonly",
                console: "readonly",
                process: "readonly",
                document: "readonly",
                setImmediate: "readonly",
                clearImmediate: "readonly",
                Buffer: "readonly",
                setInterval: "readonly",
                clearInterval: "readonly",
                setTimeout: "readonly",
                createCanvas: "readonly",
                background: "readonly",
                createGraphics: "readonly",
                fill: "readonly",
                noStroke: "readonly",
                rect: "readonly"
            }
        },
        rules: {
            ...js.configs.recommended.rules,
            "indent": ["error", 4],
            "linebreak-style": ["error", "unix"],
            "quotes": ["error", "double"],
            "semi": ["error", "always"],
            "no-unused-vars": ["error", { argsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" }],
            "no-console": ["warn"],
            "eol-last": ["error", "always"],
            "no-multiple-empty-lines": ["error", { "max": 1, "maxEOF": 0 }]
        }
    },
    {
        files: ["test/**/*.js"],
        languageOptions: {
            ecmaVersion: "latest",
            sourceType: "commonjs",
            globals: {
                describe: "readonly",
                it: "readonly",
                expect: "readonly",
                createCanvas: "readonly",
                background: "readonly",
                fill: "readonly",
                stroke: "readonly",
                rect: "readonly",
                circle: "readonly",
                frameCount: "readonly",
                width: "readonly",
                height: "readonly",
                createGraphics: "readonly",
                loadFont: "readonly",
                loadJSON: "readonly",
                noStroke: "readonly",
                ellipse: "readonly",
                image: "readonly",
                saveCanvas: "readonly",
                saveJSON: "readonly",
                print: "readonly",
                mouseX: "readonly",
                mouseY: "readonly",
                key: "readonly",
                keyCode: "readonly",
                mousePressed: "readonly",
                keyPressed: "readonly",
                touchStarted: "readonly",
                accelerationX: "readonly",
                accelerationY: "readonly",
                accelerationZ: "readonly",
                loadImage: "readonly",
                noLoop: "readonly",
                path: "readonly",
                // Static constants + Math pass-throughs (single source: globals.js)
                ...Object.fromEntries(p5StaticGlobals.map((name) => [name, "readonly"])),
                // p5 instance functions (bound from the p5 instance, not statically)
                sin: "readonly", cos: "readonly", tan: "readonly",
                asin: "readonly", acos: "readonly", atan: "readonly",
                atan2: "readonly", sq: "readonly", mag: "readonly",
                fract: "readonly", angleMode: "readonly", radians: "readonly",
                degrees: "readonly",
                // Random / noise functions
                random: "readonly", randomSeed: "readonly",
                randomGaussian: "readonly", noise: "readonly",
                noiseSeed: "readonly", noiseDetail: "readonly",
                // Utility functions
                map: "readonly", lerp: "readonly", constrain: "readonly",
                dist: "readonly", norm: "readonly", lerpColor: "readonly",
                createVector: "readonly",
                // String formatting functions
                nf: "readonly", nfc: "readonly", nfp: "readonly", nfs: "readonly",
                join: "readonly", split: "readonly", splitTokens: "readonly",
                trim: "readonly",
                // Fixture-exposed test data (set by test/fixtures/sketches)
                results: "readonly", found_hello: "readonly",
                found_count: "readonly", window_width_at_top_level: "readonly",
                window_height_at_top_level: "readonly", canvas_width: "readonly"
            }
        },
        rules: {
            "no-unused-vars": "off"
        }
    },
    {
        files: ["test/**/*.mjs"],
        languageOptions: {
            ecmaVersion: "latest",
            sourceType: "module",
            globals: {
                describe: "readonly",
                it: "readonly",
                expect: "readonly",
                createCanvas: "readonly",
                background: "readonly",
                fill: "readonly",
                stroke: "readonly",
                rect: "readonly",
                circle: "readonly",
                frameCount: "readonly",
                width: "readonly",
                height: "readonly",
                createGraphics: "readonly",
                loadFont: "readonly",
                loadJSON: "readonly",
                noStroke: "readonly",
                ellipse: "readonly",
                image: "readonly",
                saveCanvas: "readonly",
                saveJSON: "readonly",
                print: "readonly",
                mouseX: "readonly",
                mouseY: "readonly",
                key: "readonly",
                keyCode: "readonly",
                mousePressed: "readonly",
                keyPressed: "readonly",
                touchStarted: "readonly",
                accelerationX: "readonly",
                accelerationY: "readonly",
                accelerationZ: "readonly",
                loadImage: "readonly"
            }
        },
        rules: {
            "no-unused-vars": "off"
        }
    },
    {
        files: ["examples/**/*.js", "templates/stubs/**/*.js", "test/fixtures/sketches/**/*.js"],
        rules: {
            "no-console": "off",
            "no-undef": "off",
            "no-unused-vars": "off",
            "no-global-assign": "off"
        }
    }
];
