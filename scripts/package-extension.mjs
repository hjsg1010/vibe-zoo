import { execFileSync } from "node:child_process";
import { readFile, writeFile, mkdir, rm, readdir } from "node:fs/promises";
import { resolve, relative } from "node:path";
import { createHash } from "node:crypto";
const root = resolve("dist/release-extension");
// This dedicated output never replaces the developer's installed dist/extension.
await rm(root, { recursive: true, force: true });
execFileSync(process.execPath, ["scripts/build.mjs", "extension"], {
  env: { ...process.env, VIBE_ZOO_RELEASE_BUILD: "1" },
  stdio: "inherit",
});
const expected = [
  "background.js",
  "content.js",
  "manifest.json",
  "panel/index.html",
  "panel/main.css",
  "panel/main.js",
].sort();
const actual = [];
async function walk(path) {
  for (const entry of await readdir(path, { withFileTypes: true })) {
    const full = resolve(path, entry.name);
    if (entry.isDirectory()) await walk(full);
    else actual.push(relative(root, full));
  }
}
await walk(root);
if (JSON.stringify(actual.sort()) !== JSON.stringify(expected))
  throw Error("Unexpected files in release Extension");
const manifest = JSON.parse(
  await readFile(resolve(root, "manifest.json"), "utf8"),
);
const pkg = JSON.parse(await readFile("package.json", "utf8"));
if (manifest.version !== pkg.version)
  throw Error("Manifest/package version mismatch");
const extensionId = Array.from(
  createHash("sha256")
    .update(Buffer.from(manifest.key, "base64"))
    .digest()
    .subarray(0, 16),
)
  .map((b) => String.fromCharCode(97 + (b >> 4), 97 + (b & 15)))
  .join("");
await mkdir("dist/releases", { recursive: true });
const filename = `vibe-zoo-keeper-v${manifest.version}.zip`;
const archive = resolve("dist/releases", filename);
await rm(archive, { force: true });
execFileSync("zip", ["-q", "-X", archive, ...expected], {
  cwd: root,
  stdio: "inherit",
});
const digest = createHash("sha256")
  .update(await readFile(archive))
  .digest("hex");
await writeFile(`${archive}.sha256`, `${digest}  ${filename}\n`);
await writeFile(
  resolve("dist/releases", "INSTALL.txt"),
  `Vibe Zoo Keeper ${manifest.version}\n\n1. Extract ${filename}.\n2. Chrome: chrome://extensions -> Developer mode -> Load unpacked.\n3. Select the extracted folder containing manifest.json. Do not load the ZIP directly.\n4. Backend operator: run npm ci, configure .env, npm run demo:setup, npm run build, npm run demo.\n5. Open Backend /health and trust its local certificate. Open Keeper in your logged-in target webapp tab.\n6. Enter the Backend URL and your privately supplied demo access code.\n\nRelease Extension ID (public): ${extensionId}\nRun demo:setup again on an existing Backend to allow this release ID without changing existing data. If VIBE_ZOO_ALLOWED_EXTENSION_IDS is explicitly set, append this ID to its comma-separated list.\nThe Extension contains no Backend account, model key or business data.\nInstructions: https://github.com/hjsg1010/vibe-zoo#readme\n`,
);
console.log(
  `Packaged ${filename} (${expected.length} files). Extension ID: ${extensionId}`,
);
