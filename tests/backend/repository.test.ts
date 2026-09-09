import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  openDatabase,
  transaction,
} from "../../src/backend/storage/database.js";
import { migrate } from "../../src/backend/storage/migrate.js";
import { Repository } from "../../src/backend/storage/repository.js";
import { job } from "../helpers/fixtures.js";
import type { PersonalAsset, Version } from "../../src/shared/asset-schema.js";
let dir: string;
let repo: Repository;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "vibe-zoo-test-"));
  repo = new Repository(openDatabase(join(dir, "test.sqlite")));
  migrate(repo.db);
  repo.actor("alice", "hash-a");
  repo.actor("bob", "hash-b");
});
afterEach(() => {
  repo.db.close();
  rmSync(dir, { recursive: true, force: true });
});
function candidate() {
  const j = repo.createJob(job());
  const asset: PersonalAsset = {
    id: "asset",
    owner: "alice",
    currentVersionId: null,
    previousVersionId: null,
    name: "목록",
    description: "",
    defaults: {},
    enabled: false,
    revision: 0,
    siteKey: "synthetic",
  };
  repo.createAsset(asset);
  const v: Version = {
    id: "version",
    assetId: asset.id,
    owner: "alice",
    kind: "tool",
    siteKey: "synthetic",
    content: {
      name: "inspect",
      description: "목록 확인",
      inputContract: [],
      adapter: {
        operations: [{ kind: "observe" }],
        postconditions: [
          {
            locator: { by: "text", value: { literal: "합성" } },
            assert: "visible",
          },
        ],
      },
    },
    evidence: "합성 검사",
    createdAt: 0,
  };
  repo.saveVersion(v);
  repo.saveValidation({
    id: "report",
    owner: "alice",
    jobId: j.id,
    versionId: v.id,
    caseKind: "different_input",
    inputs: {},
    status: "passed",
    actionIds: [],
    createdAt: 0,
  });
  return { j, asset, v };
}
describe("Repository boundaries and durable state", () => {
  it("isolates owners and rejects idempotency key with a different payload", () => {
    const j = repo.createJob(job());
    expect(() => repo.getJob("bob", j.id)).toThrow("not_found");
    expect(repo.createJob({ ...j, id: "ignored" }).id).toBe(j.id);
    expect(() => repo.createJob({ ...j, fingerprint: "different" })).toThrow(
      "conflict",
    );
  });
  it("deduplicates active generation without retargeting", () => {
    const a = repo.createJob(job(), "same-purpose");
    const b = repo.createJob(
      job("alice", { binding: { ...a.binding, tabId: 2 } }),
      "same-purpose",
    );
    expect(b.id).toBe(a.id);
    expect(b.binding.tabId).toBe(1);
  });
  it("blocks activation after cancellation, including stale control", () => {
    const { j, v } = candidate();
    repo.cancel("alice", j.id, 0);
    expect(() => repo.activate("alice", j.id, 0, v.id, 0)).toThrow("cancelled");
    expect(repo.asset("alice", "asset").currentVersionId).toBeNull();
  });
  it("preserves off and rejects stale settings updates", () => {
    const { j, v } = candidate();
    const a = repo.activate("alice", j.id, 0, v.id, 0);
    expect(a.enabled).toBe(false);
    expect(() => repo.editAsset("alice", a.id, 0, (x) => x)).toThrow(
      "conflict",
    );
  });
  it("rolls back failed transactions including deferred commit errors", () => {
    expect(() =>
      transaction(repo.db, () => {
        repo.actor("rollback", "x");
        throw Error("fail");
      }),
    ).toThrow();
    expect(
      repo.db.prepare("SELECT id FROM actors WHERE id=?").get("rollback"),
    ).toBeUndefined();
    repo.db.exec(
      "CREATE TABLE deferred_test(owner TEXT REFERENCES actors(id) DEFERRABLE INITIALLY DEFERRED)",
    );
    expect(() =>
      transaction(repo.db, () =>
        repo.db.prepare("INSERT INTO deferred_test VALUES(?)").run("missing"),
      ),
    ).toThrow();
    expect(repo.db.prepare("SELECT * FROM deferred_test").all()).toHaveLength(
      0,
    );
  });
  it("reopens state without clearing immutable versions or settings", () => {
    candidate();
    repo.db.close();
    repo = new Repository(openDatabase(join(dir, "test.sqlite")));
    migrate(repo.db);
    expect(repo.version("alice", "version").id).toBe("version");
    expect(repo.asset("alice", "asset").enabled).toBe(false);
    expect(repo.db.prepare("PRAGMA synchronous").get()?.synchronous).toBe(2);
  });
  it("rejects late results after owner deletion", () => {
    const { j, v } = candidate();
    repo.deleteOwner("alice");
    expect(() => repo.activate("alice", j.id, 0, v.id, 0)).toThrow("not_found");
    expect(repo.jobs("alice")).toHaveLength(0);
  });
});
