// Validation gate for generated docs/examples/stubs. Runs renderAll() — the exact same
// logic as `npm run docs` — and fails if any committed generated file is out of date, so
// the single-source templates can't drift from what's checked in.
const fs = require("fs");
const path = require("path");
const { renderAll } = require("./build-docs");

const files = renderAll();
const diffs = [];

for (const [dest, expected] of Object.entries(files)) {
    const abs = path.join(process.cwd(), dest);
    let actual;
    try {
        actual = fs.readFileSync(abs, "utf8");
    } catch (_) {
        diffs.push(`missing: ${dest}`);
        continue;
    }
    if (actual !== expected) {
        diffs.push(`changed: ${dest}`);
    }
}

// Non-generated install artifacts in example dirs (mirrors .gitignore).
const INSTALL_ARTIFACTS = ["bun.lock", "package-lock.json"];

// Orphan pass: flag any file sitting in a generated dir that the generator no longer
// produces (e.g. a renamed example). Scan dirs derived from the files map (any generated
// path containing a "/"); an entry is valid iff it's generated, a directory (node_modules),
// or an install artifact.
const generatedDirs = new Set(
    Object.keys(files)
        .map((dest) => dest.split("/").slice(0, -1).join("/"))
        .filter((dir) => dir.length > 0)
);

for (const dir of generatedDirs) {
    const abs = path.join(process.cwd(), dir);
    let entries;
    try {
        entries = fs.readdirSync(abs);
    } catch (_) {
        continue; // missing dir is already reported by the content pass
    }
    for (const entry of entries) {
        const rel = `${dir}/${entry}`;
        if (files[rel]) continue;
        if (fs.statSync(path.join(abs, entry)).isDirectory()) continue;
        if (INSTALL_ARTIFACTS.includes(entry)) continue;
        diffs.push(`orphan: ${rel}`);
    }
}

if (diffs.length > 0) {
    const changed = diffs.filter((d) => d.startsWith("changed") || d.startsWith("missing"));
    const orphans = diffs.filter((d) => d.startsWith("orphan"));
    const lines = [];
    if (changed.length > 0) {
        lines.push(`Generated files out of sync (run "npm run docs"):\n${changed.map((d) => `  - ${d}`).join("\n")}`);
    }
    if (orphans.length > 0) {
        lines.push(`Stale generated files (remove them, they are no longer generated):\n${orphans.map((d) => `  - ${d}`).join("\n")}`);
    }
    // eslint-disable-next-line no-console
    console.error(lines.join("\n"));
    process.exit(1);
}

// eslint-disable-next-line no-console
console.log("Docs, examples, and stubs are in sync.");
