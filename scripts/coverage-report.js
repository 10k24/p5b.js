// Generate a combined v1 + v2 HTML coverage report.
//
// Runs the p5b v1 and v2 test suites (each with bun's lcov coverage), merges the two
// lcov files, and renders a self-contained HTML report to coverage/html/index.html.
//
// Usage: bun run coverage:html

const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const COV_DIR = path.join(ROOT, "coverage");
const OUT_DIR = path.join(COV_DIR, "html");
const LCOV = path.join(COV_DIR, "lcov.info");

const ADAPTERS = [
    { env: "p5", file: "v1.info" },
    { env: "p5-v2", file: "v2.info" },
];

// --- Step 1: run each adapter suite and capture its lcov file ---
function collect() {
    fs.mkdirSync(COV_DIR, { recursive: true });
    for (const { env, file } of ADAPTERS) {
        const res = spawnSync("bun", ["test", "--coverage"], {
            cwd: ROOT,
            env: { ...process.env, P5B_P5_PKG: env },
            stdio: "inherit",
        });
        if (res.status !== 0) {
            console.error(`Coverage run failed for ${env}`);
            process.exit(1);
        }
        fs.copyFileSync(LCOV, path.join(COV_DIR, file));
    }
}

// --- Step 2: parse lcov text into records ---
function parseLcov(text) {
    const records = [];
    let cur = null;
    for (const line of text.split("\n")) {
        if (line === "end_of_record") {
            if (cur) records.push(cur);
            cur = null;
        } else if (line.startsWith("SF:")) {
            cur = { file: line.slice(3), fnf: 0, fnh: 0, lines: {} };
        } else if (cur) {
            if (line.startsWith("FNF:")) cur.fnf = parseInt(line.slice(4), 10);
            else if (line.startsWith("FNH:")) cur.fnh = parseInt(line.slice(4), 10);
            else if (line.startsWith("DA:")) {
                const [ln, hits] = line.slice(3).split(",");
                cur.lines[parseInt(ln, 10)] = parseInt(hits, 10);
            }
        }
    }
    return records;
}

// --- Step 3: merge records from both runs, keyed by file ---
function merge(records) {
    const map = new Map();
    for (const r of records) {
        const m = map.get(r.file) || { file: r.file, fnf: 0, fnh: 0, lines: {} };
        map.set(r.file, m);
        m.fnf = Math.max(m.fnf, r.fnf);
        m.fnh = Math.max(m.fnh, r.fnh);
        for (const [ln, hits] of Object.entries(r.lines)) {
            m.lines[ln] = (m.lines[ln] || 0) + hits;
        }
    }
    return [...map.values()].map((m) => {
        const lf = Object.keys(m.lines).length;
        const lh = Object.values(m.lines).filter((h) => h > 0).length;
        return { file: m.file, fnf: m.fnf, fnh: m.fnh, lf, lh, lines: m.lines };
    });
}

// --- Step 4: render a self-contained HTML report ---
function esc(s) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function pct(covered, total) {
    return total === 0 ? 100 : (covered / total) * 100;
}

function render(files) {
    const total = files.reduce((a, f) => ({ fnh: a.fnh + f.fnh, fnf: a.fnf + f.fnf, lh: a.lh + f.lh, lf: a.lf + f.lf }), { fnh: 0, fnf: 0, lh: 0, lf: 0 });
    const linePct = pct(total.lh, total.lf);
    const funcPct = pct(total.fnh, total.fnf);

    const summary = `
        <div class="summary">
            <div class="stat"><span class="num">${linePct.toFixed(2)}%</span><span class="label">Lines</span></div>
            <div class="stat"><span class="num">${funcPct.toFixed(2)}%</span><span class="label">Functions</span></div>
            <div class="stat"><span class="num">${total.lh}/${total.lf}</span><span class="label">Lines hit</span></div>
            <div class="stat"><span class="num">${total.fnh}/${total.fnf}</span><span class="label">Functions hit</span></div>
        </div>`;

    const indexRows = files.map((f) => {
        const lp = pct(f.lh, f.lf);
        const fp = pct(f.fnh, f.fnf);
        const cls = lp < 60 ? "low" : lp < 90 ? "mid" : "high";
        return `<tr>
            <td><a href="#${esc(f.file)}">${esc(f.file)}</a></td>
            <td class="${cls}">${lp.toFixed(2)}%</td>
            <td>${f.lh}/${f.lf}</td>
            <td class="${cls}">${fp.toFixed(2)}%</td>
            <td>${f.fnh}/${f.fnf}</td>
        </tr>`;
    }).join("");

    const fileBlocks = files.map((f) => {
        const src = fs.readFileSync(path.join(ROOT, f.file), "utf8").split("\n");
        const rows = src.map((text, i) => {
            const ln = i + 1;
            const hits = f.lines[ln];
            const cls = hits === undefined ? "blank" : hits > 0 ? "hit" : "miss";
            const count = hits === undefined ? "" : hits;
            return `<tr class="${cls}"><td class="ln">${ln}</td><td class="cnt">${count}</td><td class="code">${esc(text)}</td></tr>`;
        }).join("");
        const lp = pct(f.lh, f.lf);
        return `<section id="${esc(f.file)}">
            <h2>${esc(f.file)} <span class="filepct">${lp.toFixed(2)}% lines</span></h2>
            <table class="code"><tbody>${rows}</tbody></table>
        </section>`;
    }).join("");

    const title = "p5b coverage (v1 + v2 combined)";
    const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><title>${title}</title>
<style>
body { font-family: -apple-system, "Segoe UI", sans-serif; margin: 0; color: #222; }
header { padding: 16px 24px; background: #1f2430; color: #fff; }
header h1 { margin: 0; font-size: 20px; }
.summary { display: flex; gap: 24px; padding: 16px 24px; background: #f4f5f7; border-bottom: 1px solid #e0e0e0; }
.stat { display: flex; flex-direction: column; }
.stat .num { font-size: 26px; font-weight: 700; }
.stat .label { font-size: 12px; color: #666; }
main { padding: 24px; }
table.index { border-collapse: collapse; width: 100%; margin-bottom: 32px; }
table.index th, table.index td { border: 1px solid #e0e0e0; padding: 6px 12px; text-align: left; }
.high { color: #1a7f37; } .mid { color: #9a6700; } .low { color: #cf222e; }
section { margin-bottom: 40px; }
section h2 { font-size: 16px; font-family: monospace; border-bottom: 1px solid #ddd; padding-bottom: 6px; }
.filepct { color: #888; font-size: 13px; margin-left: 8px; }
table.code { border-collapse: collapse; width: 100%; font-family: monospace; font-size: 12px; }
table.code td { padding: 0 8px; white-space: pre; }
td.ln { width: 48px; text-align: right; color: #999; user-select: none; border-right: 1px solid #eee; }
td.cnt { width: 56px; text-align: right; color: #999; user-select: none; border-right: 1px solid #eee; }
tr.hit { background: #f0fff4; } tr.miss { background: #ffebe9; } tr.blank { background: #fafafa; }
</style></head>
<body>
<header><h1${title}</h1></header>
${summary}
<main>
<table class="index"><thead><tr><th>File</th><th>Lines</th><th>Hit</th><th>Funcs</th><th>Hit</th></tr></thead>
<tbody>${indexRows}</tbody></table>
${fileBlocks}
</main>
</body></html>`;

    fs.mkdirSync(OUT_DIR, { recursive: true });
    fs.writeFileSync(path.join(OUT_DIR, "index.html"), html);
    console.log(`HTML coverage report: ${path.join(OUT_DIR, "index.html")}`);
}

collect();
const merged = merge([...parseLcov(fs.readFileSync(path.join(COV_DIR, "v1.info"), "utf8")), ...parseLcov(fs.readFileSync(path.join(COV_DIR, "v2.info"), "utf8"))]);
render(merged);
