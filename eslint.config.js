const js = require("@eslint/js");

module.exports = [
    {
        ignores: ["node_modules", "bun.lock", "package-lock.json", "test/fixtures/**"]
    },
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
            "no-console": ["warn"]
        }
    },
    {
        files: ["test/**/*.js"],
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
        files: ["examples/**/*.js"],
        rules: {
            "no-console": "off",
            "no-undef": "off"
        }
    },
    {
        files: ["test/fixtures/sketches/**/*.js"],
        rules: {
            "no-undef": "off"
        }
    }
];
