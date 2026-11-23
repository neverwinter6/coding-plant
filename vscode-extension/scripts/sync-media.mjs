import { copyFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const siteRoot = path.resolve(here, "..", "..");
const mediaRoot = path.resolve(here, "..", "media");
const files = ["index.html", "styles.css", "main.js", "tree.js", "favicon.svg"];

await mkdir(mediaRoot, { recursive: true });
for (const file of files) {
  await copyFile(path.join(siteRoot, file), path.join(mediaRoot, file));
  console.log(`synced ${file}`);
}

console.log(`\nPerennial webview media is ready at ${mediaRoot}`);
