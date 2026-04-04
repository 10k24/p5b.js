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

const descriptions = {
    width: "Canvas width in pixels",
    height: "Canvas height in pixels",
    fps: "Target frame rate",
    preload: "p5.js preload() function",
    setup: "p5.js setup() function",
    draw: "p5.js draw() function",
    sketchPath: "Path to sketch file, omit preload, setup, & draw parameters if using"
};

// Load stub files
const stubs = {};
const stubsDir = path.join(process.cwd(), "templates", "stubs");
fs.readdirSync(stubsDir).forEach(file => {
    if (file.startsWith("readme-") && file.endsWith(".js")) {
        const name = file.replace(/^readme-/, "").replace(/\.js$/, "");
        stubs[name] = fs.readFileSync(path.join(stubsDir, file), "utf8").trim();
    }
});

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

for (const key of Object.keys(descriptions)) {
    if (!Object.prototype.hasOwnProperty.call(P5B_DEFAULTS, key)) {
        throw new Error(`Extra description with no matching default: ${key}`);
    }
}

// Create a map of defaults by key for easy access in template
const defaultsByKey = {};
defaults.forEach(d => {
    defaultsByKey[d.key] = d;
});

// Load examples with descriptions from first-line comments
const examplesDir = path.join(process.cwd(), "examples");
const examples = [];
fs.readdirSync(examplesDir)
    .filter(file => file.startsWith("ex-") && file.endsWith(".js"))
    .sort()
    .forEach(file => {
        const filePath = path.join(examplesDir, file);
        const content = fs.readFileSync(filePath, "utf8");
        const firstLine = content.split("\n")[0];
        const match = firstLine.match(/^\/\/\s+(.+)$/);
        const description = match ? match[1] : "Example";
        examples.push({
            file,
            name: file.replace(/\.js$/, ""),
            description
        });
    });

const readme = dots.README({ defaults, defaultsByKey, stubs, examples });

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

const cleanedReadme = cleaned.join("\n");
fs.writeFileSync(path.join(process.cwd(), "README.md"), cleanedReadme, "utf8");
