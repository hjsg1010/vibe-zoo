import { it, expect, vi } from "vitest";
import { Improvement } from "../../src/backend/generation/improvement.js";
import { openDatabase } from "../../src/backend/storage/database.js";
import { migrate } from "../../src/backend/storage/migrate.js";
import {
  Repository,
  fingerprint,
} from "../../src/backend/storage/repository.js";
import { Coordinator } from "../../src/backend/jobs/coordinator.js";
import { Registry } from "../../src/backend/assets/registry.js";
import { Validator } from "../../src/backend/mcp/validation.js";
import type { Tool, Version } from "../../src/shared/asset-schema.js";
import { binding, job } from "../helpers/fixtures.js";
import { serveJobTools } from "../../src/backend/mcp/server.js";
import { connectJobMcp } from "../../src/backend/mcp/client.js";
async function setup() {
  const db = openDatabase(":memory:");
  migrate(db);
  const repo = new Repository(db);
  repo.actor("alice", "a");
  repo.actor("bob", "b");
  const seen: string[] = [];
  let failCandidate = false;
  const c = new Coordinator(
    repo,
    {
      current: () => binding,
      enqueue: async (owner, command) => {
        seen.push(String(command.inputs.item));
        const failure =
          command.inputs.item === "original-fail" ||
          (failCandidate && command.inputs.item === "new-fail");
        return {
          type: "receipt",
          actionId: command.actionId,
          jobId: command.jobId,
          controlRevision: command.controlRevision,
          binding: command.binding,
          outcome: {
            status: failure ? "failure" : "success",
            completed: [],
            reason: failure
              ? "synthetic locator failure"
              : "synthetic observed result",
            observation: {
              title: "Synthetic list",
              path: "/",
              elements: [{ role: "heading", label: "List", text: "List" }],
              limitations: [],
            },
          },
        };
      },
    },
    new Registry(repo),
  );
  const content: Tool = {
    name: "inspect",
    description: "Synthetic lookup",
    inputContract: [
      { name: "item", type: "string", required: true, description: "Name" },
    ],
    adapter: {
      operations: [{ kind: "observe" }],
      postconditions: [
        {
          assert: "visible",
          locator: { by: "text", value: { input: "item" } },
        },
      ],
    },
  };
  const base: Version = {
    id: "base",
    assetId: "asset",
    owner: "alice",
    kind: "tool",
    siteKey: fingerprint(binding.origin),
    content,
    evidence: "synthetic",
    createdAt: 0,
  };
  repo.createAsset({
    id: base.assetId,
    owner: base.owner,
    name: content.name,
    description: content.description,
    siteKey: base.siteKey,
    currentVersionId: base.id,
    previousVersionId: null,
    defaults: {},
    enabled: true,
    revision: 0,
  });
  repo.saveVersion(base);
  const validator = new Validator(c);
  const source = repo.createJob(job());
  const failure = await validator.run(
    "alice",
    source.id,
    base,
    { item: "original-fail" },
    {},
    "execution",
  );
  const success = await validator.run(
    "alice",
    source.id,
    base,
    { item: "original-success" },
    {},
    "execution",
  );
  const proposed = {
    ...content,
    adapter: {
      ...content.adapter,
      operations: [{ kind: "navigate" as const, path: "/list" }],
    },
  };
  const converse = vi.fn(async () => ({
    stopReason: "tool_use" as const,
    usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 },
    metrics: { latencyMs: 1 },
    output: {
      message: {
        role: "assistant" as const,
        content: [
          {
            toolUse: {
              toolUseId: "test",
              name: "propose_improvement",
              input: {
                reason:
                  "Open the synthetic list before observing the same business condition.",
                content: proposed,
              },
            },
          },
        ],
      },
    },
    $metadata: {},
  }));
  const service = new Improvement(c, { converse }, validator, binding.origin);
  const request = {
    assetId: base.assetId,
    expectedCurrent: base.id,
    failureReportId: failure.id,
    successReportId: success.id,
    request: {
      requestKey: "improve",
      conversationId: "improvement",
      binding,
      purpose: "Fix synthetic list state",
      inputs: {},
    },
  };
  const start = () => service.start("alice", request);
  const draft = async () => {
    const j = start();
    await service.run(j);
    return repo.getJob("alice", j.id);
  };
  const validate = async () => {
    const j = await draft();
    const q = service.queue("alice", j.id, {
      revision: j.controlRevision,
      candidateId: j.candidateId,
      failureInputs: { item: "new-fail" },
      successInputs: { item: "new-success" },
    });
    await service.run(q);
    return service.detail("alice", j.id);
  };
  const apply = (id: string) => {
    const d = service.detail("alice", id);
    return {
      revision: d.job.controlRevision,
      assetRevision: repo.asset("alice", "asset").revision,
      candidateId: d.candidate!.id,
      expectedCurrent: base.id,
      digest: d.digest,
    };
  };
  return {
    db,
    repo,
    c,
    service,
    base,
    request,
    converse,
    seen,
    draft,
    validate,
    apply,
    start,
    fail: () => {
      failCandidate = true;
    },
  };
}
it("keeps immutable versions until explicit reviewed apply; preserves off/defaults/running snapshots; rollback and lost apply response do not replay", async () => {
  const s = await setup();
  try {
    const running = s.c.prepare(
      "alice",
      { ...s.request.request, requestKey: "running" },
      "execution",
    );
    const d = await s.validate();
    expect(d.job.status).toBe("completed");
    expect(s.converse).toHaveBeenCalledTimes(1);
    expect(s.repo.version("alice", "base")).toEqual(s.base);
    expect(s.repo.asset("alice", "asset").currentVersionId).toBe("base");
    expect(s.seen).toEqual([
      "original-fail",
      "original-success",
      "new-fail",
      "new-success",
    ]);
    s.repo.editAsset("alice", "asset", 0, (a) => ({
      ...a,
      enabled: false,
      defaults: { item: "private" },
    }));
    const apply = s.apply(d.job.id);
    const activated = s.service.apply("alice", d.job.id, apply);
    expect(activated.currentVersionId).toBe(d.candidate!.id);
    expect(activated.enabled).toBe(false);
    expect(activated.defaults).toEqual({ item: "private" });
    expect(s.repo.getJob("alice", running.id).snapshots[0]!.versionId).toBe(
      "base",
    );
    expect(s.service.apply("alice", d.job.id, apply)).toEqual(activated);
    const rolled = s.service.rollback("alice", "asset", {
      revision: activated.revision,
      expectedCurrent: activated.currentVersionId,
      versionId: "base",
    });
    expect(rolled.currentVersionId).toBe("base");
    expect(rolled.enabled).toBe(false);
    expect(s.service.apply("alice", d.job.id, apply).currentVersionId).toBe(
      "base",
    );
  } finally {
    s.db.close();
  }
});
it("rejects unrelated/unknown/foreign source evidence and reused business inputs", async () => {
  const s = await setup();
  try {
    expect(() => s.service.start("bob", s.request)).toThrow();
    expect(() =>
      s.service.start("alice", {
        ...s.request,
        failureReportId: s.request.successReportId,
      }),
    ).toThrow("not_observed");
    const d = await s.draft();
    expect(() =>
      s.service.queue("alice", d.id, {
        revision: d.controlRevision,
        candidateId: d.candidateId,
        failureInputs: { item: "original-fail" },
        successInputs: { item: "new-success" },
      }),
    ).toThrow("invalid_input");
    expect(s.service.cases("alice", "asset").cases).toHaveLength(2);
  } finally {
    s.db.close();
  }
});
it("failed candidate retains current pointer and never starts regression or automatically retries", async () => {
  const s = await setup();
  try {
    s.fail();
    const d = await s.validate();
    expect(d.job.status).toBe("failed");
    expect(d.reports).toHaveLength(1);
    expect(s.seen).not.toContain("new-success");
    expect(() =>
      s.service.apply("alice", d.job.id, s.apply(d.job.id)),
    ).toThrow();
    expect(s.repo.asset("alice", "asset").currentVersionId).toBe("base");
  } finally {
    s.db.close();
  }
});
it("rejects stale review, changed current, cancellation, and incomplete regression", async () => {
  const s = await setup();
  try {
    const d = await s.validate();
    const a = s.apply(d.job.id);
    expect(() =>
      s.service.apply("alice", d.job.id, { ...a, digest: "stale" }),
    ).toThrow("conflict");
    s.repo.editAsset("alice", "asset", 0, (x) => ({
      ...x,
      currentVersionId: null,
    }));
    expect(() =>
      s.service.apply("alice", d.job.id, { ...a, assetRevision: 1 }),
    ).toThrow("conflict");
    s.repo.editAsset("alice", "asset", 1, (x) => ({
      ...x,
      currentVersionId: "base",
    }));
    await s.c.cancel("alice", d.job.id, d.job.controlRevision);
    expect(() =>
      s.service.apply("alice", d.job.id, { ...a, assetRevision: 2 }),
    ).toThrow("cancelled");
  } finally {
    s.db.close();
  }
});
it("supports exact pinned MCP versions with colliding names after a pointer change", async () => {
  const s = await setup();
  const server = await serveJobTools(
    [s.base, { ...s.base, id: "new" }],
    async (v) => ({ status: "success", completed: [], reason: v.id }),
  );
  const client = await connectJobMcp(server);
  try {
    const tools = await client.listTools();
    expect(new Set(tools.tools.map((t) => t.name)).size).toBe(2);
    const result = await client.callTool({
      name: tools.tools[1]!.name,
      arguments: { item: "new-input" },
    });
    expect(JSON.stringify(result.content)).toContain("new");
  } finally {
    await client.close();
    await server.close();
    s.db.close();
  }
});
it("captures an Agent failure as evidence and stops before a later call can hide or repeat it", async () => {
  const { Agent } = await import("../../src/backend/model/agent.js");
  const s = await setup();
  const model = {
    converse: vi.fn(async () => ({
      stopReason: "tool_use" as const,
      usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 },
      metrics: { latencyMs: 1 },
      $metadata: {},
      output: {
        message: {
          role: "assistant" as const,
          content: [
            {
              toolUse: {
                toolUseId: "bad",
                name: "inspect",
                input: { item: "original-fail" },
              },
            },
            {
              toolUse: {
                toolUseId: "next",
                name: "inspect",
                input: { item: "must-not-run" },
              },
            },
          ],
        },
      },
    })),
  };
  try {
    const j = s.c.prepare(
      "alice",
      { ...s.request.request, requestKey: "agent-failure" },
      "execution",
    );
    await new Agent(s.c, model, new Validator(s.c)).run(j);
    expect(s.repo.getJob("alice", j.id).status).toBe("failed");
    expect(s.seen).not.toContain("must-not-run");
    expect(model.converse).toHaveBeenCalledTimes(1);
    expect(
      s.service
        .cases("alice", "asset")
        .cases.filter((c) => c.status === "failed"),
    ).toHaveLength(2);
  } finally {
    s.db.close();
  }
});
it("rolls back the version pointer and apply marker together if the job update cannot commit", async () => {
  const s = await setup();
  try {
    const d = await s.validate();
    s.db.exec(
      "CREATE TRIGGER deny_apply BEFORE UPDATE ON jobs BEGIN SELECT RAISE(ABORT,'synthetic disk failure'); END",
    );
    expect(() =>
      s.service.apply("alice", d.job.id, s.apply(d.job.id)),
    ).toThrow();
    expect(s.repo.asset("alice", "asset").currentVersionId).toBe("base");
    expect(
      s.repo.getJob("alice", d.job.id).improvement!.appliedDigest,
    ).toBeUndefined();
  } finally {
    s.db.close();
  }
});
it("does not save or activate a model candidate received after cancellation", async () => {
  const s = await setup();
  try {
    const response = await s.converse();
    let release!: (value: typeof response) => void;
    s.converse.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          release = resolve;
        }),
    );
    const j = s.start();
    const running = s.service.run(j);
    await s.c.cancel(
      "alice",
      j.id,
      s.repo.getJob("alice", j.id).controlRevision,
    );
    release(response);
    await expect(running).rejects.toThrow("cancelled");
    expect(s.repo.versions("alice", "asset")).toHaveLength(1);
  } finally {
    s.db.close();
  }
});
it("keeps the same accepted validation request and rejects replay or changing its inputs", async () => {
  const s = await setup();
  try {
    const j = await s.draft();
    const data = {
      revision: j.controlRevision,
      candidateId: j.candidateId,
      failureInputs: { item: "new-fail" },
      successInputs: { item: "new-success" },
    };
    const q = s.service.queue("alice", j.id, data);
    expect(q.snapshots[0]!.versionId).toBe(j.candidateId);
    expect(s.service.queue("alice", j.id, data)).toEqual(q);
    await s.service.run(q);
    expect(s.service.queue("alice", j.id, data).status).toBe("completed");
    expect(() =>
      s.service.queue("alice", j.id, {
        ...data,
        failureInputs: { item: "changed" },
      }),
    ).toThrow("conflict");
    await expect(s.service.run(s.repo.getJob("alice", j.id))).rejects.toThrow(
      "conflict",
    );
    expect(s.seen).toEqual([
      "original-fail",
      "original-success",
      "new-fail",
      "new-success",
    ]);
  } finally {
    s.db.close();
  }
});
