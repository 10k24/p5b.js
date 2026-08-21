#!/usr/bin/env node
// Informational drift report between p5b_v1.js and p5b_v2.js.
//
// Compares the two adapter classes: method order and per-method body equality.
// Methods defined on P5bBase (p5b-base.js) are excluded from the v1-only report
// because both adapters inherit them. Methods whose bodies are 100% identical
// are flagged as candidates to extract into p5b-base.js (single source of truth).
//
// Informational only: always exits 0 (no CI gate).

const fs = require("fs");
const { P5bBase } = require("../p5b-base");

const BASE_METHODS = new Set(Object.getOwnPropertyNames(P5bBase.prototype));

// Extract class methods: signatures indented exactly 4 spaces at class-body level.
const METHOD_RE = /^ {4}([A-Za-z_$][\w$]*)\s*\([^)]*\)\s*\{/gm;

function parseMethods(file) {
    // Strip block comments first so commented-out methods (e.g. p5b_v2.js's
    // preserved run/stop/remove/clear) aren't mistaken for real definitions.
    const src = fs.readFileSync(file, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    const methods = [];
    let m;
    while ((m = METHOD_RE.exec(src)) !== null) {
        let depth = 1;
        let i = m.index + m[0].length; // m[0] ends at the method's opening brace
        const bodyStart = i;
        while (depth > 0 && i < src.length) {
            if (src[i] === "{") depth++;
            else if (src[i] === "}") depth--;
            i++;
        }
        methods.push({ name: m[1], body: src.slice(bodyStart, i - 1) });
    }
    return methods;
}

// Body of a P5bBase.prototype method via its source, for drift-checking overrides.
const fnBody = (name) => {
    const src = P5bBase.prototype[name]?.toString() || "";
    const open = src.indexOf("{");
    const close = src.lastIndexOf("}");
    if (open === -1 || close <= open) return "";
    return src.slice(open + 1, close);
};

// Normalize so indentation/blank-line drift doesn't mask real differences.
const normalize = (body) =>
    body.split("\n").map((l) => l.trim()).filter((l) => l.length > 0).join("\n");

const v1 = parseMethods(require.resolve("../p5b_v1.js"));
const v2 = parseMethods(require.resolve("../p5b_v2.js"));

const v1Names = v1.map((m) => m.name);
const v2Names = v2.map((m) => m.name);

console.log("== p5b adapter drift report ==");
console.log("");

// --- Method order ---
// Align on methods v1 defines itself (skip P5bBase-inherited ones, which v2
// inherits too and never redefines). v2-only helpers must come after all shared
// methods for the order to be considered aligned.
const INHERITED = new Set(BASE_METHODS);
INHERITED.delete("constructor"); // both adapters define their own constructor
const align = v1Names.filter((n) => !INHERITED.has(n));

console.log("Method order (v1 method -> position in v2):");
const maxLen = Math.max(...v1Names.map((n) => n.length), ...v2Names.map((n) => n.length));
let prevIdx = -1;
let orderOk = true;
for (const name of align) {
    const idx = v2Names.indexOf(name);
    const ok = idx > prevIdx && idx !== -1;
    if (!ok) orderOk = false;
    prevIdx = idx;
    console.log(`  ${name.padEnd(maxLen)}  v2[${idx}]  ${ok ? "ok" : "MISMATCH"}`);
}

const v2Only = v2Names.filter((n) => !v1Names.includes(n));
if (v2Only.length) {
    console.log("");
    console.log(`v2-only methods (expected v2 extensions, after shared methods): ${v2Only.join(", ")}`);
}
console.log("");
console.log(`Order: ${orderOk ? "aligned" : "NOT aligned"} (${align.length} shared methods in v1 order)`);

// --- Per-method body comparison ---
console.log("");
console.log("Body comparison (shared methods):");
let identical = [];
let differs = [];
const v2ByName = new Map(v2.map((m) => [m.name, m]));
for (const { name, body } of v1) {
    const other = v2ByName.get(name);
    if (!other) {
        if (BASE_METHODS.has(name)) {
            // v1 overrides a base method; verify the override still matches base.
            const matchesBase = normalize(body) === normalize(fnBody(name));
            console.log(`  ${name.padEnd(maxLen)}  v1-only — inherits P5bBase, override ${matchesBase ? "matches base" : "DIVERGES from base"}`);
        } else {
            console.log(`  ${name.padEnd(maxLen)}  v1-only — DRIFT`);
        }
        continue;
    }
    const same = normalize(body) === normalize(other.body);
    if (same) {
        identical.push(name);
        console.log(`  ${name.padEnd(maxLen)}  identical  [candidate: extract to p5b-base.js]`);
    } else {
        differs.push(name);
        console.log(`  ${name.padEnd(maxLen)}  DIFFERS`);
    }
}

const compared = identical.length + differs.length;
console.log("");
console.log(`Summary: ${identical.length}/${compared} shared methods are 100% identical, ${differs.length} differ.`);
if (identical.length) {
    console.log("");
    console.log("Identical — consider moving into p5b-base.js:");
    console.log(`  ${identical.join(", ")}`);
}

console.log("");
console.log("exit 0 (informational — no CI gate)");
