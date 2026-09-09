import type { DatabaseSync } from "node:sqlite";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { transaction } from "./database.js";
export function migrate(db: DatabaseSync): void {
  const version = Number(db.prepare("PRAGMA user_version").get()?.user_version);
  if (version > 2) throw new Error("unsupported_schema_version");
  if (version === 2) return;
  for (const [next, name] of [
    [1, "001-initial.sql"],
    [2, "002-shared-publications.sql"],
  ] as const) {
    if (version >= next) continue;
    const local = new URL(`./migrations/${name}`, import.meta.url);
    const file = existsSync(local)
      ? local
      : new URL(`./storage/migrations/${name}`, import.meta.url);
    transaction(db, () => {
      db.exec(readFileSync(fileURLToPath(file), "utf8"));
      db.exec(`PRAGMA user_version=${next}`);
    });
  }
}
