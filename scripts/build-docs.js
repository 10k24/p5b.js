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

// Compile a canonical single-source example/stub template for one p5 version.
// Supports the `{{?it.v2}}A{{??}}B{{?}}` (if/else) and `{{?it.v2}}A{{?}}` (if-only)
// forms. Purpose-built (rather than doT) because these are raw JS files — doT's
// greedy `evaluate` regex would misread their plain `{`/`}` braces.
const compileVersion = (src, v2) => {
    let out = src.replace(
        /\{\{\?it\.v2\}\}([\s\S]*?)\{\{\?\?\}\}([\s\S]*?)\{\{\?\}\}/g,
        (_, ifBody, elseBody) => (v2 ? ifBody : elseBody)
    );
    out = out.replace(
        /\{\{\?it\.v2\}\}([\s\S]*?)\{\{\?\}\}/g,
        (_, ifBody) => (v2 ? ifBody : "")
    );
    return out;
};

// Example sketches that are genuinely v2-only (e.g. WebGL shaders) — not emitted for v1.
const V2_ONLY_EXAMPLES = ["sketch-world"];

// Render the README code-sample stubs from canonical single-source templates
// (templates/stubs/src/*.dot -> templates/stubs/{v1,v2}/readme-*.js).
// Returns { v1: {name: html}, v2: {name: html}, files: {path: content} }.
const renderStubs = () => {
    const srcDir = path.join(process.cwd(), "templates", "stubs", "src");
    const result = { v1: {}, v2: {}, files: {} };
    for (const file of fs.readdirSync(srcDir).filter((f) => f.startsWith("readme-") && f.endsWith(".dot")).sort()) {
        const name = file.replace(/^readme-/, "").replace(/\.dot$/, "");
        const source = fs.readFileSync(path.join(srcDir, file), "utf8");
        for (const ver of ["v1", "v2"]) {
            const content = compileVersion(source, ver === "v2").trim();
            result[ver][name] = escapeHtml(content);
            result.files[`templates/stubs/${ver}/readme-${name}.js`] = `${content}\n`;
        }
    }
    return result;
};

// Render the example sketches from canonical single-source templates
// (templates/stubs/examples/*.dot -> examples/{v1,v2}/<name>.js). Each rendered file carries
// the first-line comment the README lists it under, so the examples section stays in sync.
// Returns { v1: [{file, name, description}], v2: [...], files: {path: content} }.
const renderExamples = () => {
    const srcDir = path.join(process.cwd(), "templates", "stubs", "examples");
    const byVersion = { v1: [], v2: [] };
    const files = {};
    for (const file of fs.readdirSync(srcDir).filter((f) => f.endsWith(".dot")).sort()) {
        const name = file.replace(/\.dot$/, "");
        const source = fs.readFileSync(path.join(srcDir, file), "utf8");
        for (const ver of ["v1", "v2"]) {
            if (ver === "v1" && V2_ONLY_EXAMPLES.includes(name)) continue;
            const content = compileVersion(source, ver === "v2");
            const firstLine = content.split("\n")[0];
            const match = firstLine.match(/^\/\/\s+(.+)$/);
            byVersion[ver].push({
                file: `examples/${ver}/${name}.js`,
                name,
                description: match ? match[1] : "Example"
            });
            // Ensure exactly one trailing newline (matches hand-written examples; eol-last).
            files[`examples/${ver}/${name}.js`] = content.endsWith("\n") ? content : `${content}\n`;
        }
    }
    return { v1: byVersion.v1, v2: byVersion.v2, files };
};

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

    // Load stub files from canonical single-source templates. Each rendered stub is
    // embedded in an HTML <pre> block in the README's v1|v2 tables.
    const stubs = renderStubs();

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

    // Examples come from canonical single-source templates (see renderExamples); the
    // rendered files' first-line comments drive the README descriptions.
    const { v1: v1Examples, v2: v2Examples, files: exampleFiles } = renderExamples();

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
    // which preserves the verified ^1.6.0 floor for v1).
    const exampleVersions = [
        { dir: "v1", p5: "^1.6.0" },
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

    const files = {
        "README.md": cleanedReadme,
        ...stubs.files,
        ...exampleFiles
    };
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
    for (const [dest, content] of Object.entries(files)) {
        writeOutput(dest, content);
    }
}
