import { it, expect } from "vitest";
import {
  mkdtempSync,
  mkdirSync,
  cpSync,
  readFileSync,
  writeFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";

it("setup admits the release Extension while preserving local IDs and existing private credentials", () => {
  const dir = mkdtempSync(join(tmpdir(), "vibe-distribution-"));
  try {
    for (const folder of [
      "scripts",
      "config",
      "src/backend/storage/migrations",
    ]) {
      mkdirSync(join(dir, folder), { recursive: true });
    }
    cpSync("scripts/demo-setup.mjs", join(dir, "scripts/demo-setup.mjs"));
    cpSync("config", join(dir, "config"), { recursive: true });
    cpSync(
      "src/backend/storage/migrations",
      join(dir, "src/backend/storage/migrations"),
      { recursive: true },
    );
    // Resolve dotenv from the installed project without copying runtime state.
    const setup = readFileSync(
      join(dir, "scripts/demo-setup.mjs"),
      "utf8",
    ).replace(
      'from "dotenv"',
      `from ${JSON.stringify(new URL("../../node_modules/dotenv/lib/main.js", import.meta.url).href)}`,
    );
    writeFileSync(join(dir, "scripts/demo-setup.mjs"), setup);
    const env = { ...process.env };
    for (const key of Object.keys(env))
      if (key.startsWith("VIBE_ZOO_") || key === "AWS_BEARER_TOKEN_BEDROCK")
        delete env[key];
    const run = () =>
      execFileSync(process.execPath, ["scripts/demo-setup.mjs"], {
        cwd: dir,
        env,
        stdio: "pipe",
      });
    run();
    const configPath = join(dir, ".local/config.json");
    const config = JSON.parse(readFileSync(configPath, "utf8"));
    const publicKey = readFileSync(
      "config/release-extension-public-key.txt",
      "utf8",
    ).trim();
    const id = Array.from(
      createHash("sha256")
        .update(Buffer.from(publicKey, "base64"))
        .digest()
        .subarray(0, 16),
    )
      .map((b) => String.fromCharCode(97 + (b >> 4), 97 + (b & 15)))
      .join("");
    expect(config.extensionIds).toContain(id);
    expect(config.extensionIds).toHaveLength(2);
    config.extensionIds.push("a".repeat(32));
    writeFileSync(configPath, JSON.stringify(config));
    const credentialFile = join(dir, ".local/demo-access.json");
    const credentials = readFileSync(credentialFile, "utf8");
    run();
    expect(JSON.parse(readFileSync(configPath, "utf8")).extensionIds).toContain(
      "a".repeat(32),
    );
    expect(readFileSync(credentialFile, "utf8")).toBe(credentials);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
