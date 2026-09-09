import { it, expect } from "vitest";
import { openDatabase } from "../../src/backend/storage/database.js";
import { migrate } from "../../src/backend/storage/migrate.js";
import { Repository } from "../../src/backend/storage/repository.js";
import { Settings } from "../../src/backend/assets/settings.js";
import { Registry } from "../../src/backend/assets/registry.js";
import { serveJobTools } from "../../src/backend/mcp/server.js";
import { connectJobMcp } from "../../src/backend/mcp/client.js";
import type { Version } from "../../src/shared/asset-schema.js";
const content = {
  name: "find_item",
  description: "Find synthetic item",
  inputContract: [
    {
      name: "item",
      description: "name",
      type: "string" as const,
      required: true,
    },
  ],
  adapter: {
    operations: [{ kind: "observe" as const }],
    postconditions: [
      {
        locator: { by: "text" as const, value: { input: "item" } },
        assert: "visible" as const,
      },
    ],
  },
};
it("saves personal settings with CAS and typed defaults; off excludes future snapshots while existing snapshots stay pinned", () => {
  const db = openDatabase(":memory:");
  migrate(db);
  const repo = new Repository(db);
  repo.actor("alice", "a");
  repo.actor("bob", "b");
  repo.createAsset({
    id: "asset",
    owner: "alice",
    name: content.name,
    description: content.description,
    siteKey: "site",
    currentVersionId: "version",
    previousVersionId: null,
    defaults: {},
    enabled: true,
    revision: 0,
  });
  repo.saveVersion({
    id: "version",
    assetId: "asset",
    owner: "alice",
    kind: "tool",
    siteKey: "site",
    content,
    evidence: "synthetic",
    createdAt: 0,
  });
  const settings = new Settings(repo);
  const registry = new Registry(repo);
  const before = registry.select("alice", "site");
  const edit = {
    revision: 0,
    name: "내 조회",
    description: "설명",
    defaults: { item: "new" },
    enabled: true,
  };
  settings.save("alice", "asset", edit);
  expect(registry.select("alice", "site")[0]?.defaults).toEqual({
    item: "new",
  });
  expect(before[0]?.defaults).toEqual({});
  expect(() => settings.save("alice", "asset", edit)).toThrow();
  expect(() => settings.save("bob", "asset", edit)).toThrow();
  expect(() =>
    settings.save("alice", "asset", {
      ...edit,
      revision: 1,
      defaults: { item: 42 },
    }),
  ).toThrow();
  settings.save("alice", "asset", { ...edit, revision: 1, enabled: false });
  expect(registry.select("alice", "site")).toEqual([]);
  expect(before[0]?.versionId).toBe("version");
  db.close();
});
it("MCP accepts omitted defaulted required values but explicit arguments override frozen defaults", async () => {
  const version: Version = {
    id: "v",
    assetId: "a",
    owner: "alice",
    kind: "tool",
    siteKey: "site",
    content,
    evidence: "synthetic",
    createdAt: 0,
  };
  const seen: string[] = [];
  const server = await serveJobTools(
    [version],
    async (_v, args) => {
      seen.push(String(args.item));
      return { status: "success", completed: [0], reason: "synthetic" };
    },
    new Map([[version.id, { defaults: { item: "saved" }, name: "내 조회" }]]),
  );
  const client = await connectJobMcp(server);
  try {
    expect((await client.listTools()).tools[0]?.description).toContain(
      "내 조회",
    );
    expect(
      (await client.callTool({ name: content.name, arguments: {} })).isError,
    ).not.toBe(true);
    expect(
      (
        await client.callTool({
          name: content.name,
          arguments: { item: "explicit" },
        })
      ).isError,
    ).not.toBe(true);
    expect(seen).toEqual(["saved", "explicit"]);
  } finally {
    await client.close();
    await server.close();
  }
});
