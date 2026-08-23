const dot = require("dot");
const { P5B_DEFAULTS } = require("../p5b.js");
const fs = require("fs");
const path = require("path");

// Configure doT to preserve whitespace
dot.templateSettings = {
    evaluate: /\{\{([\s\S]+?)\}\}/g,
    interpolate: /\{\{=([\s\S]+?)\}\}/g,
    encode: /\{\{!([\s\S]+?)\}\}/g,
    use: /\{\{#([\s\S]+?)\}\}/g,
    define: /\{\{##\s*([\w.$]+)\s*=\s*([\s\S]+?)\}\}/g,
    conditional: /\{\{\?(\?)?\s*([\s\S]+?)\s*\}\}/g,
    iterate: /\{\{~\s*(?:\}\}|([\s\S]+?)\s*:\s*([\w$]+)\s*(?:\s*:\s*([\w$]+))?\s*\}\})/g,
    varname: "it",
    strip: false,
    append: true,
    doNotSkipEncoded: false,
    globalAwait: false,
    inlineRuntimeFunctions: false,
    useWith: false
};

// Disable doT's internal logger; the CLI path emits each template's "Compiling" line
// next to its output path so the log reads top-down in the order things are compiled.
dot.log = false;

const descriptions = {
    width: "Canvas width in pixels",
    height: "Canvas height in pixels",
    fps: "Target frame rate",
    preload: "p5.js preload() function",
    setup: "p5.js setup() function",
    draw: "p5.js draw() function",
    sketchPath: "Path to sketch file, omit preload, setup, & draw parameters if using",
    maxPoolSize: "Max pooled createGraphics objects retained per width:height bucket (0 = no pooling)"
};

// Escape & < > for embedding stub code inside HTML <pre> blocks in the README
// (doT's {{! }} over-encodes "/", which would mangle // comments, so escape manually).
const escapeHtml = (s) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Write a generated file and log its repo-root-relative path (tab-delimited).
const writeOutput = (dest, content) => {
    fs.writeFileSync(path.join(process.cwd(), dest), content, "utf8");
    // eslint-disable-next-line no-console
    console.log(`\t- ${dest}`);
};

// Render every generated file (README + examples manifests) and return a
// { repo-root-relative-path: content } map. Shared by the CLI writer (npm run docs)
// and the render-compare validation gate (scripts/validate-docs.js) so both use the
// exact same logic. Root package.json is the source of truth for name/version.
function renderAll() {
    const { name, version } = require("../package.json");

    // Load stub files from version-specific subdirectories (templates/stubs/v1, /v2).
    // Each stub is rendered inside an HTML <pre> block in the README's v1|v2 tables.
    const stubs = { v1: {}, v2: {} };
    const stubsDir = path.join(process.cwd(), "templates", "stubs");
    for (const stubVersion of ["v1", "v2"]) {
        fs.readdirSync(path.join(stubsDir, stubVersion)).forEach(file => {
            if (file.startsWith("readme-") && file.endsWith(".js")) {
                const stubName = file.replace(/^readme-/, "").replace(/\.js$/, "");
                stubs[stubVersion][stubName] = escapeHtml(fs.readFileSync(path.join(stubsDir, stubVersion, file), "utf8").trim());
            }
        });
    }

    const dots = dot.process({ path: path.join(process.cwd(), "templates") });

    const defaults = Object.entries(P5B_DEFAULTS).map(([key, value]) => {
        if (!descriptions[key]) {
            throw new Error(`Missing description for default key: ${key}`);
        }

        let defaultValue;
        if (value === null) {
            defaultValue = "null";
        } else if (typeof value === "function") {
            defaultValue = "noop";
        } else {
            defaultValue = String(value);
        }

        const typeStr = key === "sketchPath" ? "string" : typeof value;
        return {
            key,
            type: typeStr,
            default: defaultValue,
            description: descriptions[key]
        };
    });

    // preload is a v1-only option — p5 v2 removed the preload() lifecycle and p5b rejects a
    // preload config under v2. It's not part of the shared P5B_DEFAULTS (v1 injects its own
    // noop default in the constructor), so document it as a v1-only config row below.
    const v1OnlyDefaults = ["preload"];
    for (const key of Object.keys(descriptions)) {
        if (!Object.prototype.hasOwnProperty.call(P5B_DEFAULTS, key) && !v1OnlyDefaults.includes(key)) {
            throw new Error(`Extra description with no matching default: ${key}`);
        }
    }

    defaults.push({
        key: "preload",
        type: "function",
        default: "noop",
        description: "p5.js preload() function (v1 only — rejected in p5 v2)"
    });

    // Create a map of defaults by key for easy access in template
    const defaultsByKey = {};
    defaults.forEach(d => {
        defaultsByKey[d.key] = d;
    });

    // Load examples with descriptions from first-line comments. Examples live in
    // version-specific subdirectories (examples/v1, examples/v2).
    const examplesDir = path.join(process.cwd(), "examples");

    const scanExamples = (dir) => {
        const fullDir = path.join(examplesDir, dir);
        const items = [];
        fs.readdirSync(fullDir)
            .filter(file => file.startsWith("ex-") && file.endsWith(".js"))
            .sort()
            .forEach(file => {
                const filePath = path.join(fullDir, file);
                const content = fs.readFileSync(filePath, "utf8");
                const firstLine = content.split("\n")[0];
                const match = firstLine.match(/^\/\/\s+(.+)$/);
                const description = match ? match[1] : "Example";
                items.push({
                    file: `examples/${dir}/${file}`,
                    name: file.replace(/\.js$/, ""),
                    description
                });
            });
        return items;
    };

    const v1Examples = scanExamples("v1");
    const v2Examples = scanExamples("v2");

    const readme = dots.README({ defaults, defaultsByKey, stubs, v1Examples, v2Examples });

    // Clean up extra blank lines in markdown (remove lines that are only whitespace between table rows or list items)
    const lines = readme.split("\n");
    const cleaned = [];
    let lastWasTableRow = false;
    let lastWasListItem = false;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const isTableRow = /^\|/.test(line.trim());
        const isListItem = /^-\s/.test(line.trim());
        const isBlankLine = line.trim() === "";

        // Skip blank lines that appear between table rows
        if (isBlankLine && lastWasTableRow && i + 1 < lines.length && /^\|/.test(lines[i + 1].trim())) {
            continue;
        }

        // Skip blank lines that appear between list items
        if (isBlankLine && lastWasListItem && i + 1 < lines.length && /^-\s/.test(lines[i + 1].trim())) {
            continue;
        }

        cleaned.push(line);
        lastWasTableRow = isTableRow;
        lastWasListItem = isListItem;
    }

    const cleanedReadme = cleaned.join("\n")
        // Collapse runs of 2+ blank lines down to a single blank line (3+ newlines -> 2),
        // so generated blocks (example lists, table sections) don't leave double blanks.
        .replace(/\n{3,}/g, "\n\n");

    // Compile the examples' package.json manifests from the single .dot template.
    // The per-version config below is the only irreducible data (dir + explicit p5 range,
    // which preserves the intentional ^1.11.0 floor for v1).
    const exampleVersions = [
        { dir: "v1", p5: "^1.11.0" },
        { dir: "v2", p5: "^2.0.0" },
    ];

    const examplesPkg = dots["examples-package"];

    // Convert [key, value][] pairs into template deps rows with a precomputed trailing comma
    // (avoids template conditionals, which are fragile to compile).
    const deps = (pairs) => pairs.map(([key, value], i) => ({
        key,
        value,
        comma: i < pairs.length - 1 ? "," : "",
    }));

    const files = { "README.md": cleanedReadme };
    for (const { dir, p5 } of exampleVersions) {
        const major = Number(dir.slice(1));
        files[`examples/${dir}/package.json`] = `${examplesPkg({
            name: `${name}-examples-${dir}`,
            version,
            description: `p5b examples for p5.js ${major}.x`,
            deps: deps([[name, version], ["p5", p5]]),
            // zeromq is optional: only the ZMQ example needs it (see ex-p5b-zmq.js).
            optionalDeps: deps([["zeromq", "^6.0.0"]]),
        })}\n`;
    }

    return files;
}

module.exports = { renderAll };

// CLI: write every generated file, logging each template's compile line next to its output.
if (require.main === module) {
    // eslint-disable-next-line no-console
    console.log("Compiling all doT templates...");
    const files = renderAll();

    // eslint-disable-next-line no-console
    console.log("Compiling README.dot to function");
    writeOutput("README.md", files["README.md"]);

    // eslint-disable-next-line no-console
    console.log("Compiling examples-package.json.dot to function");
    writeOutput("examples/v1/package.json", files["examples/v1/package.json"]);
    writeOutput("examples/v2/package.json", files["examples/v2/package.json"]);
}
