const fs = require("fs");
const path = require("path");

const gifencExportMap = {
    ".": {
        import: "./dist/gifenc.esm.js",
        require: "./dist/gifenc.js",
    },
};

function findGifencDirs(nodeModules) {
    if (!fs.existsSync(nodeModules)) {
        return [];
    }
    const out = [];
    const walk = (dir) => {
        const name = path.basename(dir);
        if (name === "gifenc") {
            out.push(dir);
            return;
        }
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
            if (entry.name === ".bin" || entry.name.startsWith(".")) {
                continue;
            }
            if (entry.isDirectory()) {
                walk(path.join(dir, entry.name));
            }
        }
    };
    walk(nodeModules);
    return out;
}

const rootNodeModules = path.join(process.cwd(), "node_modules");
const gifencDirs = findGifencDirs(rootNodeModules);

if (gifencDirs.length === 0) {
    console.log("p5b: gifenc not installed, skipping patch");
    process.exit(0);
}

for (const dir of gifencDirs) {
    const pkgPath = path.join(dir, "package.json");
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
    if (pkg.exports) {
        console.log(`p5b: gifenc already patched (${path.relative(rootNodeModules, dir)})`);
        continue;
    }
    pkg.exports = gifencExportMap;
    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 4) + "\n");
    console.log(`p5b: patched gifenc package.json with exports map (${path.relative(rootNodeModules, dir)})`);
}
