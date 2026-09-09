import { it, expect } from "vitest";
import { mkdtempSync, mkdirSync, cpSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";
it("setup upgrades without resetting data; cleanup previews then removes only the selected private area while preserving shared snapshots and access", () => {
  const root = mkdtempSync(join(tmpdir(), "vibe-demo-commands-"));
  const script = (name: string) =>
    fileURLToPath(new URL(`../../scripts/${name}`, import.meta.url));
  const env = {
    ...process.env,
    AWS_BEARER_TOKEN_BEDROCK: "",
    VIBE_ZOO_DATA_DIR: join(root, ".local/state"),
    VIBE_ZOO_TLS_CERT_PATH: join(root, ".local/tls/localhost.crt"),
    VIBE_ZOO_TLS_KEY_PATH: join(root, ".local/tls/localhost.key"),
  };
  const run = (name: string, args: string[] = []) =>
    execFileSync(process.execPath, [script(name), ...args], {
      cwd: root,
      env,
      encoding: "utf8",
    });
  try {
    mkdirSync(join(root, "src/backend/storage"), { recursive: true });
    cpSync(
      fileURLToPath(
        new URL("../../src/backend/storage/migrations", import.meta.url),
      ),
      join(root, "src/backend/storage/migrations"),
      { recursive: true },
    );
    run("demo-setup.mjs");
    const access = readFileSync(join(root, ".local/demo-access.json"), "utf8");
    let db = new DatabaseSync(join(root, ".local/state/vibe-zoo.sqlite"));
    expect(db.prepare("PRAGMA user_version").get()!.user_version).toBe(2);
    db.prepare("INSERT INTO assets VALUES(?,?,?,?)").run(
      "own",
      "demo-keeper",
      0,
      "{}",
    );
    db.prepare("INSERT INTO assets VALUES(?,?,?,?)").run(
      "other",
      "demo-colleague",
      0,
      "{}",
    );
    db.prepare("INSERT INTO publications VALUES(?,?,?,?)").run(
      "pub",
      "demo-keeper",
      "version",
      "{}",
    );
    db.close();
    run("demo-setup.mjs");
    expect(readFileSync(join(root, ".local/demo-access.json"), "utf8")).toBe(
      access,
    );
    const preview = JSON.parse(
      run("demo-cleanup.mjs", ["--owner", "demo-keeper"]),
    );
    expect(preview.mode).toBe("preview");
    expect(preview.counts.assets).toBe(1);
    db = new DatabaseSync(join(root, ".local/state/vibe-zoo.sqlite"));
    expect(db.prepare("SELECT count(*) AS n FROM assets").get()!.n).toBe(2);
    db.close();
    expect(
      JSON.parse(run("demo-cleanup.mjs", ["--owner", "demo-keeper", "--apply"]))
        .mode,
    ).toBe("applied");
    db = new DatabaseSync(join(root, ".local/state/vibe-zoo.sqlite"));
    expect(db.prepare("SELECT id FROM assets").all()).toEqual([
      { id: "other" },
    ]);
    expect(db.prepare("SELECT count(*) AS n FROM publications").get()!.n).toBe(
      1,
    );
    expect(db.prepare("SELECT count(*) AS n FROM actors").get()!.n).toBe(2);
    db.close();
    expect(JSON.parse(run("demo-stop.mjs")).backends).toBe(0);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
