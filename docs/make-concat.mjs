import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const dir = path.join(root, "docs", "test-results");
const folders = fs
  .readdirSync(dir)
  .filter((f) => fs.existsSync(path.join(dir, f, "video.webm")))
  .sort();

const lines = folders.map((f) => {
  const p = path.join(dir, f, "video.webm").replace(/\\/g, "/");
  return `file '${p}'`;
});

fs.writeFileSync(path.join(root, "docs", "concat-list.txt"), lines.join("\n") + "\n");
console.log("videos:", folders.length);
