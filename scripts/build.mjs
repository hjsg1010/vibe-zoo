import { build } from "esbuild";
import {
  mkdir,
  copyFile,
  cp,
  access,
  readFile,
  writeFile,
} from "node:fs/promises";
const targets = process.argv.slice(2);
const selected = targets.length ? targets : ["backend", "extension", "store"];
for (const target of selected) {
  if (!["backend", "extension", "store"].includes(target))
    throw new Error("Unknown build target");
  const out = `dist/${target}`;
  await mkdir(out, { recursive: true });
  if (target === "backend") {
    await build({
      entryPoints: ["src/backend/main.ts"],
      outdir: out,
      bundle: true,
      platform: "node",
      format: "esm",
      target: "node24",
      packages: "external",
    });
    await cp("src/backend/storage/migrations", `${out}/migrations`, {
      recursive: true,
    });
  } else if (target === "extension") {
    await build({
      entryPoints: [
        "src/extension/background.ts",
        "src/extension/panel/main.tsx",
      ],
      outbase: "src/extension",
      outdir: out,
      bundle: true,
      format: "esm",
      platform: "browser",
      target: "chrome120",
    });
    await build({
      entryPoints: ["src/extension/content.ts"],
      outdir: out,
      bundle: true,
      format: "iife",
      platform: "browser",
      target: "chrome120",
    });
    const manifest = JSON.parse(
      await readFile("config/extension-manifest.json", "utf8"),
    );
    try {
      manifest.key = (
        await readFile(".local/extension-public-key.txt", "utf8")
      ).trim();
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
    await writeFile(`${out}/manifest.json`, JSON.stringify(manifest, null, 2));
    await copyFile("src/extension/panel/index.html", `${out}/panel/index.html`);
  } else {
    await build({
      entryPoints: ["src/store/main.tsx"],
      outdir: out,
      bundle: true,
      format: "esm",
      platform: "browser",
      target: "chrome120",
    });
    await copyFile("src/store/index.html", `${out}/index.html`);
  }
  await access(out);
  console.log(`Built ${target}`);
}
