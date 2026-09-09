import { expect, it, vi } from "vitest";
import { SkillLearner } from "../../src/backend/generation/skills.js";
import { Coordinator } from "../../src/backend/jobs/coordinator.js";
import { Registry } from "../../src/backend/assets/registry.js";
import { Validator } from "../../src/backend/mcp/validation.js";
import { openDatabase } from "../../src/backend/storage/database.js";
import { migrate } from "../../src/backend/storage/migrate.js";
import {
  Repository,
  fingerprint,
} from "../../src/backend/storage/repository.js";
import { binding, job } from "../helpers/fixtures.js";
import type { Recording } from "../../src/shared/recording.js";
import type { Tool, Version } from "../../src/shared/asset-schema.js";
const tool: Tool = {
  name: "find_item",
  description: "합성 항목 조회",
  inputContract: [
    { name: "item", description: "이름", type: "string", required: true },
  ],
  adapter: {
    operations: [{ kind: "observe" }],
    postconditions: [
      { locator: { by: "text", value: { input: "item" } }, assert: "visible" },
    ],
  },
};
function setup() {
  const db = openDatabase(":memory:");
  migrate(db);
  const repo = new Repository(db);
  repo.actor("alice", "hash");
  const seen: string[] = [];
  const c = new Coordinator(
    repo,
    {
      current: () => binding,
      enqueue: async (_owner, command) => {
        seen.push(String(command.inputs.item));
        return {
          type: "receipt",
          actionId: command.actionId,
          jobId: command.jobId,
          controlRevision: command.controlRevision,
          binding: command.binding,
          outcome: {
            status: "success",
            completed: [0],
            reason: "explicit synthetic observation",
          },
        };
      },
    },
    new Registry(repo),
  );
  const siteKey = fingerprint(binding.origin);
  repo.createAsset({
    id: "tool",
    owner: "alice",
    name: tool.name,
    description: tool.description,
    siteKey,
    currentVersionId: null,
    previousVersionId: null,
    defaults: {},
    enabled: true,
    revision: 0,
  });
  const version: Version = {
    id: "tool-version",
    assetId: "tool",
    owner: "alice",
    kind: "tool",
    siteKey,
    content: tool,
    evidence: "synthetic",
    createdAt: Date.now(),
  };
  repo.saveVersion(version);
  const proposal = {
    name: "개인 조회",
    description: "내 항목 조회",
    evidenceSummary: "합성 시연",
    inputContract: tool.inputContract,
    sourceInputs: { item: "old" },
    steps: [{ toolName: tool.name, arguments: {}, bindings: { item: "item" } }],
    missingTools: [],
    unsupported: [],
  };
  const converse = vi.fn(async () => ({
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
              toolUseId: "fixture",
              name: "freeze_personal_skill",
              input: proposal,
            },
          },
        ],
      },
    },
  }));
  const learner = new SkillLearner(
    c,
    { converse },
    new Validator(c),
    binding.origin,
  );
  return { db, repo, c, learner, converse, seen, proposal };
}
function evidence(): Recording {
  const now = Date.now();
  return {
    revision: 1,
    startedAt: now,
    stoppedAt: now,
    complete: true,
    limitations: [],
    initial: { title: "Synthetic", path: "/", elements: [], limitations: [] },
    final: { title: "Synthetic", path: "/", elements: [], limitations: [] },
    events: [
      {
        kind: "change",
        path: "/",
        role: "textbox",
        label: "Item",
        value: "old",
      },
    ],
  };
}
it("Record takes the target slot; Stop never calls a model and rejects another tab/owner", async () => {
  const s = setup();
  const lease = s.learner.start("alice", binding);
  const j = s.repo.createJob(job());
  await expect(
    s.c.execute("alice", j.id, { kind: "observe" }, {}),
  ).rejects.toThrow();
  expect(() =>
    s.learner.stop("alice", lease.id, { ...binding, tabId: 2 }),
  ).toThrow();
  expect(() => s.learner.stop("bob", lease.id, binding)).toThrow();
  s.learner.stop("alice", lease.id, binding);
  expect(s.converse).not.toHaveBeenCalled();
  s.learner.cancel("alice", lease.id);
  s.db.close();
});
it("freezes once, requires new inputs, binds supplements to the same candidate/revisions, and never replays completed validation", async () => {
  const s = setup();
  const j = s.repo.createJob(
    job("alice", {
      kind: "learning",
      snapshots: [
        {
          assetId: "tool",
          versionId: "tool-version",
          defaults: {},
          settingsRevision: 0,
        },
      ],
    }),
  );
  await s.learner.compile(j, evidence());
  const draft = s.repo.getJob("alice", j.id);
  expect(draft.status).toBe("waiting_input");
  expect(s.seen).toEqual([]);
  expect(s.converse).toHaveBeenCalledTimes(1);
  const input = {
    revision: draft.controlRevision,
    inputRevision: draft.inputRevision,
    candidateId: draft.candidateId!,
    inputs: { item: "new" },
  };
  expect(() =>
    s.learner.supplement("alice", j.id, { ...input, inputs: { item: "old" } }),
  ).toThrow();
  expect(() =>
    s.learner.supplement("alice", j.id, { ...input, candidateId: "stale" }),
  ).toThrow();
  const accepted = s.learner.supplement("alice", j.id, input);
  await s.learner.validate(accepted);
  expect(s.learner.supplement("alice", j.id, input).status).toBe("completed");
  await expect(
    s.learner.validate(s.repo.getJob("alice", j.id)),
  ).rejects.toThrow();
  expect(s.seen).toEqual(["new"]);
  expect(s.converse).toHaveBeenCalledTimes(1);
  expect(
    s.repo.assets("alice").find((a) => a.id !== "tool")?.currentVersionId,
  ).toBe(draft.candidateId);
  s.db.close();
});
it("requires explicit intent, complete unexpired record and matching lease; duplicate submit does not compile twice", () => {
  const s = setup();
  const lease = s.learner.start("alice", binding);
  s.learner.stop("alice", lease.id, binding);
  const request = {
    requestKey: "record-fixture",
    conversationId: "conversation",
    binding,
    purpose: "내 항목 조회를 반복",
    inputs: {},
  };
  const ev = evidence();
  expect(() =>
    s.learner.submit("alice", lease.id, { ...request, purpose: " " }, ev),
  ).toThrow();
  expect(() =>
    s.learner.submit("alice", lease.id, request, { ...ev, complete: false }),
  ).toThrow();
  const first = s.learner.submit("alice", lease.id, request, ev);
  const again = s.learner.submit("alice", lease.id, request, ev);
  expect(again.job.id).toBe(first.job.id);
  expect(again.evidence).toBeUndefined();
  s.learner.cancel("alice", lease.id);
  s.db.close();
});
it("missing atomic capabilities remain unready candidates with an explicit unsupported result", async () => {
  const s = setup();
  s.proposal.missingTools.push(tool as never);
  s.proposal.unsupported.push("추가 기능 검증이 필요합니다." as never);
  const j = s.repo.createJob(job("alice", { kind: "learning" }));
  await s.learner.compile(j, evidence());
  expect(s.repo.getJob("alice", j.id).outcome?.status).toBe("partial");
  expect(s.repo.assets("alice").every((a) => !a.currentVersionId)).toBe(true);
  expect(s.seen).toEqual([]);
  s.db.close();
});
