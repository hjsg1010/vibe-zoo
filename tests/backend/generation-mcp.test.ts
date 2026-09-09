import { it, expect } from "vitest";
import { serveJobTools } from "../../src/backend/mcp/server.js";
import { connectJobMcp } from "../../src/backend/mcp/client.js";
import {
  generatedBundleSchema,
  type Version,
} from "../../src/shared/asset-schema.js";
import { binding, job } from "../helpers/fixtures.js";
import { openDatabase } from "../../src/backend/storage/database.js";
import { migrate } from "../../src/backend/storage/migrate.js";
import {
  Repository,
  fingerprint,
} from "../../src/backend/storage/repository.js";
import { Registry } from "../../src/backend/assets/registry.js";
import { Coordinator } from "../../src/backend/jobs/coordinator.js";
import { ToolGenerator } from "../../src/backend/generation/tools.js";
import { Validator } from "../../src/backend/mcp/validation.js";
const tool = {
  name: "find_item",
  description: "합성 항목을 찾는다",
  inputContract: [
    {
      name: "item",
      description: "항목 이름",
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
it("uses actual MCP protocol with strictly business arguments and a trusted version closure", async () => {
  const version: Version = {
    id: "fixture-version",
    assetId: "fixture-asset",
    owner: "alice",
    kind: "tool",
    siteKey: "synthetic",
    content: tool,
    evidence: "synthetic",
    createdAt: 0,
  };
  const seen: string[] = [];
  const server = await serveJobTools([version], async (v, args) => {
    seen.push(v.id, String(args.item));
    return { status: "success", completed: [0], reason: "합성 사후 조건" };
  });
  const client = await connectJobMcp(server);
  try {
    expect((await client.listTools()).tools[0]?.name).toBe("find_item");
    const good = await client.callTool({
      name: "find_item",
      arguments: { item: "new-example" },
    });
    expect(good.isError).not.toBe(true);
    const bad = await client.callTool({
      name: "find_item",
      arguments: { item: "new-example", tabId: 99 },
    });
    expect(bad.isError).toBe(true);
    expect(seen).toEqual(["fixture-version", "new-example"]);
  } finally {
    await client.close();
    await server.close();
  }
});
it("rejects remote code and extra control fields in generated bundles", () => {
  const bundle = {
    tool,
    basicSkill: { name: "검색", description: "" },
    evidenceSummary: "합성",
    exampleInputs: { item: "old" },
    validationInputs: { item: "new" },
    skillValidationInputs: { item: "new-skill" },
  };
  expect(generatedBundleSchema.safeParse(bundle).success).toBe(true);
  expect(
    generatedBundleSchema.safeParse({
      ...bundle,
      tool: { ...tool, code: "eval(1)" },
    }).success,
  ).toBe(false);
});
it("discovers multiple independent tools on any site, appends without replacing assets, and creates Skills only afterwards (model/browser fixtures, real MCP)", async () => {
  const { createBasicSkill } =
    await import("../../src/backend/generation/basic-skill.js");
  const db = openDatabase(":memory:");
  migrate(db);
  const repo = new Repository(db);
  repo.actor("alice", "hash");
  const target = { ...binding, origin: "https://unregistered.example.org" };
  const c = new Coordinator(
    repo,
    {
      current: () => target,
      enqueue: async (_owner, command) => ({
        type: "receipt",
        actionId: command.actionId,
        jobId: command.jobId,
        controlRevision: command.controlRevision,
        binding: target,
        outcome: {
          status: "success",
          completed: [0],
          reason: "TEST FIXTURE ONLY",
          observation: {
            title: "Dashboard",
            path: "/",
            elements: [{ role: "heading", label: "", text: "Dashboard" }],
            limitations: [],
          },
        },
      }),
    },
    new Registry(repo),
  );
  const overview = {
    ...tool,
    name: "read_dashboard",
    inputContract: [],
    adapter: {
      operations: [{ kind: "observe" as const }],
      postconditions: [
        {
          locator: { by: "text" as const, value: { literal: "Dashboard" } },
          assert: "visible" as const,
        },
      ],
    },
  };
  const candidate = (t: typeof tool | typeof overview) => ({
    tool: t,
    evidenceSummary: "TEST FIXTURE ONLY",
    exampleInputs: t.inputContract.length ? { item: "old" } : {},
    validationInputs: t.inputContract.length ? { item: "new" } : {},
  });
  let calls = 0;
  const generator = new ToolGenerator(
    c,
    {
      converse: async () => {
        calls++;
        return {
          $metadata: {},
          stopReason: "tool_use",
          usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 },
          metrics: { latencyMs: 1 },
          output: {
            message: {
              role: "assistant",
              content: [
                {
                  toolUse: {
                    name: "freeze_discovery",
                    toolUseId: "fixture",
                    input: JSON.parse(
                      JSON.stringify({
                        tools:
                          calls === 1
                            ? [
                                candidate(tool),
                                candidate(overview),
                                { tool: { code: "arbitrary()" } },
                              ]
                            : [
                                candidate(tool),
                                candidate({
                                  ...tool,
                                  name: "find_details",
                                  adapter: {
                                    ...tool.adapter,
                                    operations: [
                                      { kind: "observe" },
                                      { kind: "observe" },
                                    ],
                                  },
                                }),
                              ],
                        remaining: [],
                        unsupported: [],
                        inspect: null,
                      }),
                    ),
                  },
                },
              ],
            },
          },
        };
      },
    },
    new Validator(c),
  );
  try {
    const source = repo.createJob(job("alice", { binding: target }));
    await generator.run(source);
    const assets = repo.assets("alice");
    expect(assets).toHaveLength(2);
    expect(
      repo.getJob("alice", source.id).discovery?.unsupported.join(" "),
    ).toContain("계약 오류");
    expect(assets.every((a) => !a.currentVersionId)).toBe(true);
    expect(assets.map((a) => repo.versions("alice", a.id)[0]!.kind)).toEqual([
      "tool",
      "tool",
    ]);
    expect(repo.actions("alice", source.id)).toHaveLength(1); // proposal never performs trial business work
    const versions = assets.map((a) => repo.versions("alice", a.id)[0]!);
    for (const version of versions) {
      const validation = repo.createJob(
        job("alice", {
          binding: target,
          assetValidation: {
            versionId: version.id,
            inputs: version.discovery!.validationInputs,
            sourceInputs: version.discovery!.exampleInputs,
            sourceJobId: source.id,
          },
        }),
      );
      await generator.run(validation);
      expect(repo.asset("alice", version.assetId).currentVersionId).toBe(
        version.id,
      );
      expect(repo.actions("alice", validation.id)).toHaveLength(1);
    }
    const read = versions.find((v) => !v.content.inputContract.length)!;
    expect(repo.reports("alice", read.id)[0]!.caseKind).toBe(
      "state_observation",
    );
    const skill = createBasicSkill(repo, "alice", read.assetId);
    expect(createBasicSkill(repo, "alice", read.assetId).id).toBe(skill.id);
    expect(repo.asset("alice", skill.assetId).currentVersionId).toBeNull();
    const validation = repo.createJob(
      job("alice", {
        binding: target,
        assetValidation: {
          versionId: skill.id,
          inputs: {},
          sourceInputs: {},
          sourceJobId: source.id,
        },
      }),
    );
    await generator.run(validation);
    expect(repo.asset("alice", skill.assetId).currentVersionId).toBe(skill.id);
    const original = repo.assets("alice");
    const extra = c.prepare("alice", {
      requestKey: "second",
      conversationId: "fixture",
      purpose: "Discover more",
      binding: target,
      inputs: {},
    });
    expect(extra.snapshots.length).toBeGreaterThan(0);
    await generator.run(extra);
    expect(calls).toBe(2);
    expect(repo.getJob("alice", extra.id).discovery?.versionIds).toHaveLength(
      1,
    );
    expect(repo.getJob("alice", extra.id).discovery?.reused).toBe(1);
    for (const a of original) expect(repo.asset("alice", a.id)).toEqual(a);
    expect(repo.assets("alice")).toHaveLength(4);
    const server = await serveJobTools(versions, (v, args) =>
      new Validator(c).executeTool("alice", validation.id, v, args),
    );
    const client = await connectJobMcp(server);
    try {
      expect((await client.listTools()).tools.map((t) => t.name)).toEqual(
        expect.arrayContaining(["find_item", "read_dashboard"]),
      );
    } finally {
      await client.close();
      await server.close();
    }
  } finally {
    db.close();
  }
});

it("roundtrips actual MCP results to the original model toolUseId and keeps owner-bound versions", async () => {
  const { Agent } = await import("../../src/backend/model/agent.js");
  const db = openDatabase(":memory:");
  migrate(db);
  const repo = new Repository(db);
  repo.actor("alice", "hash");
  repo.createAsset({
    id: "asset",
    owner: "alice",
    currentVersionId: "version",
    previousVersionId: null,
    name: "항목 검색",
    description: "합성",
    defaults: { item: "new" },
    enabled: true,
    revision: 0,
    siteKey: fingerprint(binding.origin),
  });
  repo.saveVersion({
    id: "version",
    assetId: "asset",
    owner: "alice",
    kind: "tool",
    siteKey: fingerprint(binding.origin),
    content: tool,
    evidence: "fixture",
    createdAt: 0,
  });
  const c = new Coordinator(
    repo,
    {
      current: () => binding,
      enqueue: async (_owner, cmd) => ({
        type: "receipt",
        actionId: cmd.actionId,
        jobId: cmd.jobId,
        controlRevision: cmd.controlRevision,
        binding,
        outcome: {
          status: "success",
          completed: [0],
          reason: "TEST FIXTURE ONLY",
        },
      }),
    },
    new Registry(repo),
  );
  let calls = 0;
  const model: import("../../src/backend/model/bedrock.js").ModelPort = {
    converse: async (_owner, _id, input) => {
      calls++;
      if (calls === 2) {
        const last = input.messages?.at(-1);
        expect(last?.content?.[0]?.toolResult?.toolUseId).toBe(
          "fixture-tool-use",
        );
        expect(last?.content?.[0]?.toolResult?.status).toBe("success");
      }
      return {
        $metadata: {},
        stopReason: calls === 1 ? "tool_use" : "end_turn",
        usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 },
        metrics: { latencyMs: 1 },
        output: {
          message: {
            role: "assistant",
            content:
              calls === 1
                ? [
                    {
                      toolUse: {
                        toolUseId: "fixture-tool-use",
                        name: "find_item",
                        input: { item: "new" },
                      },
                    },
                  ]
                : [{ text: "합성 도구 결과를 확인했습니다." }],
          },
        },
      };
    },
  };
  try {
    const j = repo.createJob(
      job("alice", {
        kind: "execution",
        snapshots: c.registry.select("alice", fingerprint(binding.origin)),
      }),
    );
    await new Agent(c, model, new Validator(c)).run(j);
    expect(calls).toBe(2);
    expect(repo.actions("alice", j.id)).toHaveLength(1);
    expect(repo.getJob("alice", j.id).outcome?.status).toBe("success");
  } finally {
    db.close();
  }
});

it.each([true, false])(
  "repairs only an observed business result role, rejects weakening and avoids replay (valid=%s)",
  async (valid) => {
    const db = openDatabase(":memory:");
    migrate(db);
    const repo = new Repository(db);
    repo.actor("alice", "hash");
    const siteKey = fingerprint(binding.origin);
    const originalTool: Version = {
      id: "original-tool",
      assetId: "tool-asset",
      owner: "alice",
      kind: "tool",
      siteKey,
      createdAt: 0,
      evidence: "TEST FIXTURE",
      content: {
        ...tool,
        adapter: {
          operations: [{ kind: "navigate", path: "/list" }],
          postconditions: [
            {
              locator: { by: "role", role: "cell", value: { input: "item" } },
              assert: "visible",
            },
          ],
        },
      },
    };
    const originalSkill: Version = {
      id: "original-skill",
      assetId: "skill-asset",
      owner: "alice",
      kind: "basic_skill",
      siteKey,
      createdAt: 0,
      evidence: "TEST FIXTURE",
      content: {
        name: "Synthetic Skill",
        description: "fixture",
        inputContract: tool.inputContract,
        steps: [
          {
            toolVersionId: originalTool.id,
            arguments: {},
            bindings: { item: "item" },
          },
        ],
      },
    };
    for (const v of [originalTool, originalSkill]) {
      repo.createAsset({
        id: v.assetId,
        owner: "alice",
        currentVersionId: null,
        previousVersionId: null,
        name: "Fixture",
        description: "Fixture",
        defaults: {},
        enabled: true,
        revision: 0,
        siteKey,
      });
      repo.saveVersion(v);
    }
    const seen: { kind: string; item: unknown }[] = [];
    const c = new Coordinator(
      repo,
      {
        current: () => binding,
        enqueue: async (_o, command) => {
          seen.push({
            kind: command.operation.kind,
            item: command.inputs.item,
          });
          return {
            type: "receipt",
            actionId: command.actionId,
            jobId: command.jobId,
            controlRevision: command.controlRevision,
            binding,
            outcome: {
              status: seen.length === 1 ? "unknown" : "success",
              completed: [0],
              reason: "TEST FIXTURE ONLY",
              observation: {
                title: "Synthetic",
                path: "/",
                limitations: [],
                elements: [
                  {
                    role: "heading",
                    label: "",
                    text: String(command.inputs.item),
                  },
                ],
              },
            },
          };
        },
      },
      new Registry(repo),
    );
    let calls = 0;
    const generator = new ToolGenerator(
      c,
      {
        converse: async () => {
          calls++;
          return {
            $metadata: {},
            stopReason: "tool_use",
            usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 },
            metrics: { latencyMs: 1 },
            output: {
              message: {
                role: "assistant",
                content: [
                  {
                    toolUse: {
                      name: "repair_postconditions",
                      toolUseId: "fixture-repair",
                      input: JSON.parse(
                        JSON.stringify({
                          postconditions: [
                            {
                              locator: {
                                by: "role",
                                role: "heading",
                                value: valid
                                  ? { input: "item" }
                                  : { literal: "Buckets" },
                              },
                              assert: "visible",
                            },
                          ],
                          reason: "Observed heading in TEST FIXTURE",
                        }),
                      ),
                    },
                  },
                ],
              },
            },
          };
        },
      },
      new Validator(c),
      binding.origin,
    );
    try {
      const j = repo.createJob(
        job("alice", {
          candidateId: originalTool.id,
          validationRequest: {
            sourceJobId: "prior",
            sourceInputs: { item: "old" },
            toolInputs: { item: "new-tool" },
            skillInputs: { item: "new-skill" },
          },
        }),
      );
      await c.execute(
        "alice",
        j.id,
        { kind: "navigate", path: "/list" },
        { item: "new-tool" },
        (
          originalTool.content as import("../../src/shared/asset-schema.js").Tool
        ).adapter.postconditions,
      );
      const requested = repo.updateJob(
        "alice",
        j.id,
        repo.getJob("alice", j.id).controlRevision,
        (x) => ({ ...x, validatorRepair: "requested" }),
      );
      if (!valid) {
        await expect(generator.run(requested)).rejects.toThrow("invalid_input");
        expect(seen).toHaveLength(1);
        expect(repo.assets("alice").every((a) => !a.currentVersionId)).toBe(
          true,
        );
        return;
      }
      await generator.run(requested);
      expect(calls).toBe(1);
      expect(seen).toEqual([
        { kind: "navigate", item: "new-tool" },
        { kind: "observe", item: "new-tool" },
        { kind: "navigate", item: "new-skill" },
      ]);
      expect(repo.version("alice", originalTool.id)).toEqual(originalTool);
      expect(repo.assets("alice").every((a) => a.currentVersionId)).toBe(true);
      expect(repo.actions("alice", j.id)[0]?.receipt?.outcome.status).toBe(
        "unknown",
      );
      expect(
        repo.actions("alice", j.id)[0]?.reconciliation?.outcome.status,
      ).toBe("success");
      expect(repo.getJob("alice", j.id).status).toBe("completed");
    } finally {
      db.close();
    }
  },
);
