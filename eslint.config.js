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
                clearInterval: "readonly"
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
                expect: "readonly"
            }
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
                expect: "readonly"
            }
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
