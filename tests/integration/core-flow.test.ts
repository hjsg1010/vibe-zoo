import { it, expect } from "vitest";
import { openDatabase } from "../../src/backend/storage/database.js";
import { migrate } from "../../src/backend/storage/migrate.js";
import { Repository } from "../../src/backend/storage/repository.js";
import { Registry } from "../../src/backend/assets/registry.js";
import { Coordinator } from "../../src/backend/jobs/coordinator.js";
import { ToolGenerator } from "../../src/backend/generation/tools.js";
import { Validator } from "../../src/backend/mcp/validation.js";
import { job, binding } from "../helpers/fixtures.js";
it("uses the same preparation entry for an unregistered site but blocks model transmission outside the approved scope", async () => {
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
      enqueue: async () => {
        observed = true;
        throw Error();
      },
    },
    new Registry(repo),
  );
  const generator = new ToolGenerator(
    c,
    {
      converse: async () => {
        sent = true;
        throw Error();
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
    await expect(generator.run(created)).rejects.toThrow("forbidden");
    expect(sent).toBe(false);
    expect(observed).toBe(false);
    expect(repo.jobs("alice")).toHaveLength(1);
  } finally {
    db.close();
  }
});
