const js = require("@eslint/js");

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
                path: "readonly"
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
            "no-unused-vars": "off"
        }
    }
];
