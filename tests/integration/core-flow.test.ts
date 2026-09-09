import { it, expect } from "vitest";
import { openDatabase } from "../../src/backend/storage/database.js";
import { migrate } from "../../src/backend/storage/migrate.js";
import { Repository } from "../../src/backend/storage/repository.js";
import { Registry } from "../../src/backend/assets/registry.js";
import { Coordinator } from "../../src/backend/jobs/coordinator.js";
import { ToolGenerator } from "../../src/backend/generation/tools.js";
import { Validator } from "../../src/backend/mcp/validation.js";
import { job, binding } from "../helpers/fixtures.js";
it("uses the same preparation entry for an unregistered site and sends filtered evidence without an origin allowlist", async () => {
  const db = openDatabase(":memory:");
  migrate(db);
  const repo = new Repository(db);
  repo.actor("alice", "hash");
  const unknown = { ...binding, origin: "https://unregistered.example.org" };
  let observed = false;
  let sent = false;
  const c = new Coordinator(
    repo,
    {
      current: () => unknown,
      enqueue: async (_owner, command) => {
        observed = true;
        return {
          type: "receipt",
          actionId: command.actionId,
          jobId: command.jobId,
          controlRevision: command.controlRevision,
          binding: command.binding,
          outcome: {
            status: "success",
            completed: [],
            reason: "Synthetic observation",
            observation: {
              title: "Synthetic unsupported site",
              path: "/",
              elements: [],
              limitations: ["canvas"],
            },
          },
        };
      },
    },
    new Registry(repo),
  );
  const generator = new ToolGenerator(
    c,
    {
      converse: async () => {
        sent = true;
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
                    input: {
                      tools: [],
                      remaining: [],
                      unsupported: ["canvas"],
                      inspect: null,
                    },
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
    const request = job("alice", { binding: unknown });
    const created = c.prepare("alice", {
      requestKey: request.requestKey,
      conversationId: request.conversationId,
      binding: unknown,
      purpose: "페이지 도구 준비",
      inputs: {},
    });
    await generator.run(created);
    expect(repo.getJob("alice", created.id).outcome?.reason).toContain(
      "canvas",
    );
    expect(repo.getJob("alice", created.id).status).toBe("completed");
    expect(sent).toBe(true);
    expect(observed).toBe(true);
    expect(repo.jobs("alice")).toHaveLength(1);
  } finally {
    db.close();
  }
});
