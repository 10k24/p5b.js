const { spawnSync } = require("child_process");

const result = spawnSync("bun", ["run", "lint"], { stdio: "inherit" });
if (result.status !== 0) {
    console.error("Lint failed");
    process.exit(1);
}

spawnSync("bun", ["run", "docs"], { stdio: "inherit" });
console.log("Preload complete");
