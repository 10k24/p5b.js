const js = require("@eslint/js");
const globals = require("globals");

// p5.js sketch globals used in tests and fixtures
const p5Globals = {
    createCanvas: "readonly",
    background: "readonly",
    createGraphics: "readonly",
    fill: "readonly",
    noStroke: "readonly",
    stroke: "readonly",
    rect: "readonly",
    circle: "readonly",
    ellipse: "readonly",
    image: "readonly",
    frameCount: "readonly",
    width: "readonly",
    height: "readonly",
    loadFont: "readonly",
    loadJSON: "readonly",
    loadImage: "readonly",
    noLoop: "readonly",
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
};

module.exports = [
    {
        files: ["**/*.js"],
        languageOptions: {
            ecmaVersion: "latest",
            sourceType: "commonjs",
            globals: {
                ...globals.node,
                document: "readonly",
                createCanvas: "readonly",
                background: "readonly",
                createGraphics: "readonly",
                fill: "readonly",
                noStroke: "readonly",
                rect: "readonly",
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
                ...globals.node,
                ...globals.browser,
                describe: "readonly",
                it: "readonly",
                expect: "readonly",
                path: "readonly",
                ...p5Globals,
            }
        },
        rules: {
            "no-console": "off",
            "no-unused-vars": "off"
        }
    },
    {
        files: ["test/**/*.mjs"],
        languageOptions: {
            ecmaVersion: "latest",
            sourceType: "module",
            globals: {
                ...globals.node,
                describe: "readonly",
                it: "readonly",
                expect: "readonly",
                ...p5Globals,
            }
        },
        rules: {
            "no-console": "off",
            "no-unused-vars": "off"
        }
    },
    {
        files: ["test/integration/**/*.js"],
        rules: {
            "no-undef": "off",
            "no-unused-vars": "off"
        }
    },
    {
        files: ["examples/**/*.js", "templates/stubs/**/*.js", "test/fixtures/sketches/**/*.js"],
        rules: {
            "no-console": "off",
            "no-undef": "off",
            "no-unused-vars": "off"
        }
    }
];
