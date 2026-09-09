import { readdir, readFile, realpath } from "node:fs/promises";
import { resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { config } from "dotenv";
config({ path: ".env", quiet: true });
const args = process.argv.slice(2);
const index = args.indexOf("--owner");
const owner = index >= 0 ? args[index + 1] : undefined;
if (
  !owner ||
  !/^demo-(keeper|colleague)$/.test(owner) ||
  args.some((a, i) => a !== "--owner" && a !== "--apply" && i !== index + 1)
) {
  console.log(
    "Usage: npm run demo:cleanup -- --owner demo-keeper [--apply]. Default: preview only. Stop the backend before --apply. Shared publications and webapp data are preserved.",
  );
  process.exitCode = 1;
} else {
  const apply = args.includes("--apply");
  if (apply) {
    const root = await realpath(process.cwd());
    for (const pid of await readdir("/proc")) {
      if (!/^\d+$/.test(pid)) continue;
      try {
        const cwd = await realpath(`/proc/${pid}/cwd`);
        const cmd = (await readFile(`/proc/${pid}/cmdline`, "utf8")).split(
          "\0",
        );
        if (
          cwd === root &&
          cmd.some(
            (a) =>
              a === "dist/backend/main.js" ||
              a === resolve(root, "dist/backend/main.js"),
          )
        )
          throw Error("Stop this backend before cleanup.");
      } catch (e) {
        if (!["ENOENT", "ESRCH", "EACCES"].includes(e.code)) throw e;
      }
    }
  }
  const db = new DatabaseSync(
    resolve(process.env.VIBE_ZOO_DATA_DIR ?? ".local/state", "vibe-zoo.sqlite"),
    { readOnly: !apply },
  );
  db.exec("PRAGMA foreign_keys=ON; PRAGMA busy_timeout=3000");
  if (Number(db.prepare("PRAGMA user_version").get().user_version) !== 2)
    throw Error("Run demo:setup first.");
  if (!db.prepare("SELECT id FROM actors WHERE id=?").get(owner))
    throw Error("Selected demo owner does not exist.");
  const tables = ["sessions", "installations", "messages", "jobs", "assets"];
  const counts = Object.fromEntries(
    tables.map((t) => [
      t,
      db.prepare(`SELECT count(*) AS n FROM ${t} WHERE owner=?`).get(owner).n,
    ]),
  );
  if (apply) {
    db.exec("BEGIN IMMEDIATE");
    try {
      for (const table of tables)
        db.prepare(`DELETE FROM ${table} WHERE owner=?`).run(owner);
      db.exec("COMMIT");
    } catch (e) {
      db.exec("ROLLBACK");
      throw e;
    }
  }
  db.close();
  console.log(
    JSON.stringify({
      mode: apply ? "applied" : "preview",
      owner,
      counts,
      preserved: [
        "demo access code",
        "other owner",
        "shared publications",
        "MinIO data",
      ],
    }),
  );
}
