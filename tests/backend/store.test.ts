import { it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { openDatabase } from "../../src/backend/storage/database.js";
import { migrate } from "../../src/backend/storage/migrate.js";
import {
  Repository,
  fingerprint,
} from "../../src/backend/storage/repository.js";
import { Coordinator } from "../../src/backend/jobs/coordinator.js";
import { Registry } from "../../src/backend/assets/registry.js";
import { Validator } from "../../src/backend/mcp/validation.js";
import { AssetStore } from "../../src/backend/assets/store.js";
import { binding, job } from "../helpers/fixtures.js";
import type { Version } from "../../src/shared/asset-schema.js";
function setup() {
  const db = openDatabase(":memory:");
  migrate(db);
  const repo = new Repository(db);
  repo.actor("alice", "a");
  repo.actor("bob", "b");
  const seen: { owner: string; item: unknown }[] = [];
  const c = new Coordinator(
    repo,
    {
      current: () => binding,
      enqueue: async (owner, command) => {
        seen.push({ owner, item: command.inputs.item });
        return {
          type: "receipt",
          actionId: command.actionId,
          jobId: command.jobId,
          controlRevision: command.controlRevision,
          binding: command.binding,
          outcome: {
            status: "success",
            completed: [0],
            reason: "explicit synthetic evidence",
          },
        };
      },
    },
    new Registry(repo),
  );
  const j = repo.createJob(
    job("alice", {
      learning: {
        recordRevision: 1,
        sourceInputs: { item: "private-demonstration" },
        validationStarted: true,
      },
    }),
  );
  const siteKey = fingerprint(binding.origin);
  const tool: Version = {
    id: "private-tool-version",
    assetId: "tool",
    owner: "alice",
    kind: "tool",
    siteKey,
    createdAt: 0,
    evidence: "private.example.org evidence",
    content: {
      name: "find_item",
      description: "Find item",
      inputContract: [
        { name: "item", description: "name", type: "string", required: true },
      ],
      adapter: {
        operations: [{ kind: "observe" }],
        postconditions: [
          {
            locator: { by: "text", value: { input: "item" } },
            assert: "visible",
          },
        ],
      },
    },
  };
  const skill: Version = {
    ...tool,
    id: "private-skill-version",
    assetId: "skill",
    kind: "personal_skill",
    content: {
      name: "Find my item",
      description: "Find selected item",
      inputContract: tool.content.inputContract,
      steps: [
        {
          toolVersionId: tool.id,
          arguments: { item: "private-demonstration" },
          bindings: { item: "item" },
        },
      ],
    },
  };
  for (const v of [tool, skill]) {
    repo.createAsset({
      id: v.assetId,
      owner: "alice",
      name: v.content.name,
      description: v.content.description,
      siteKey,
      defaults: { item: "private-default" },
      enabled: true,
      revision: 0,
      currentVersionId: null,
      previousVersionId: null,
    });
    repo.saveVersion(v);
    repo.saveValidation({
      id: `report-${v.id}`,
      owner: "alice",
      jobId: j.id,
      versionId: v.id,
      caseKind: "different_input",
      inputs: { item: "other" },
      status: "passed",
      actionIds: [],
      createdAt: 0,
    });
    repo.activate("alice", j.id, 0, v.id, 0);
  }
  const store = new AssetStore(c, new Validator(c), binding.origin);
  const request = {
    versionId: skill.id,
    revision: 1,
    name: "Shared lookup",
    description: "Find a supplied item",
    author: "Demo team",
  };
  return { db, repo, c, store, request, seen };
}
it("publishes immutable selected versions without private data; remapped dependencies preserve effective bound arguments", async () => {
  const s = setup();
  const preview = s.store.preview("alice", "skill", s.request);
  const data = { ...s.request, previewDigest: preview.digest };
  const pub = s.store.publish("alice", "skill", data);
  for (const forbidden of [
    "private-default",
    "private-demonstration",
    "private.example.org",
    "private-tool-version",
  ])
    expect(JSON.stringify(pub)).not.toContain(forbidden);
  expect(s.store.publish("alice", "skill", data).id).toBe(pub.id);
  expect(() => s.store.publish("bob", "skill", data)).toThrow();
  const installed = s.store.install("bob", pub.id);
  expect(s.store.install("bob", pub.id)).toEqual(installed);
  expect(
    s.repo
      .assets("bob")
      .every(
        (a) =>
          a.currentVersionId === null && Object.keys(a.defaults).length === 0,
      ),
  ).toBe(true);
  const dep = Object.values(installed.versions).find(
    (id) => id !== installed.versionId,
  )!;
  let j = s.c.prepare(
    "bob",
    {
      requestKey: "install",
      conversationId: "b",
      binding,
      purpose: "Synthetic installation validation",
      inputs: { item: "own-skill" },
    },
    "install",
  );
  j = s.repo.updateJob("bob", j.id, j.controlRevision, (x) => ({
    ...x,
    installation: {
      publicationId: pub.id,
      dependencyInputs: { [dep]: { item: "own-tool" } },
    },
  }));
  await s.store.validate(j);
  expect(s.repo.getJob("bob", j.id).status).toBe("completed");
  expect(s.seen).toEqual([
    { owner: "bob", item: "own-tool" },
    { owner: "bob", item: "own-skill" },
  ]);
  s.repo.deleteOwner("alice");
  expect(s.store.publication(pub.id)).toEqual(pub);
  expect(s.repo.asset("bob", installed.assetId).currentVersionId).toBe(
    installed.versionId,
  );
  s.db.close();
});
it("rejects publication of live private defaults or unsupported absolute host references instead of silently changing behavior", () => {
  const s = setup();
  expect(() =>
    s.store.preview("alice", "skill", {
      ...s.request,
      description: "private-default",
    }),
  ).toThrow();
  expect(() =>
    s.store.preview("alice", "skill", {
      ...s.request,
      description: "https://private.example.org",
    }),
  ).toThrow();
  expect(() =>
    s.store.publish("alice", "skill", { ...s.request, previewDigest: "stale" }),
  ).toThrow();
  s.db.close();
});
it("migrates existing publication/install relationships and preserves shared snapshots after deleting a publisher", () => {
  const db = openDatabase(":memory:");
  db.exec(
    readFileSync(
      new URL(
        "../../src/backend/storage/migrations/001-initial.sql",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  db.exec("PRAGMA user_version=1");
  db.prepare("INSERT INTO actors VALUES(?,?,?)").run("a", "a", 0);
  db.prepare("INSERT INTO actors VALUES(?,?,?)").run("b", "b", 0);
  db.prepare("INSERT INTO publications VALUES(?,?,?,?)").run(
    "p",
    "a",
    "v",
    "{}",
  );
  db.prepare("INSERT INTO installations VALUES(?,?,?,?)").run(
    "i",
    "b",
    "p",
    "{}",
  );
  migrate(db);
  db.prepare("DELETE FROM actors WHERE id=?").run("a");
  expect(db.prepare("SELECT id FROM publications").get()?.id).toBe("p");
  expect(db.prepare("PRAGMA foreign_key_check").all()).toEqual([]);
  db.close();
});
