import { it, expect, vi } from "vitest";
import { BedrockRuntimeClient } from "@aws-sdk/client-bedrock-runtime";
import { BedrockGateway } from "../../src/backend/model/bedrock.js";
import { openDatabase } from "../../src/backend/storage/database.js";
import { migrate } from "../../src/backend/storage/migrate.js";
import { Repository } from "../../src/backend/storage/repository.js";
import { Registry } from "../../src/backend/assets/registry.js";
import { Coordinator } from "../../src/backend/jobs/coordinator.js";
import { binding, job } from "../helpers/fixtures.js";

it("allows model analysis on an unregistered HTTP(S) site, still fences moved tabs (SDK stub; no real model)", async () => {
  const send = vi
    .spyOn(BedrockRuntimeClient.prototype, "send")
    .mockImplementation(async () => ({
      $metadata: {},
      stopReason: "end_turn",
      usage: { totalTokens: 2 },
      metrics: { latencyMs: 1 },
      output: {
        message: { role: "assistant", content: [{ text: "fixture" }] },
      },
    }));
  const db = openDatabase(":memory:");
  migrate(db);
  const repo = new Repository(db);
  repo.actor("alice", "hash");
  let target = { ...binding, origin: "https://another-webapp.example.org" };
  const c = new Coordinator(
    repo,
    {
      current: () => target,
      enqueue: async () => {
        throw Error("No browser actions in this test");
      },
    },
    new Registry(repo),
  );
  const gateway = new BedrockGateway(
    {
      host: "127.0.0.1",
      port: 18443,
      origin: "https://localhost:18443",
      dataDir: ".local/fixture",
      cert: "fixture.crt",
      key: "fixture.key",
      extensionIds: [],
      region: "ap-northeast-2",
      modelId: "fixture-model",
      bearer: "synthetic-test-credential",
    },
    c,
  );
  try {
    const j = repo.createJob(job("alice", { binding: target }));
    await gateway.converse("alice", j.id, {
      inferenceConfig: { maxTokens: 8192 },
      messages: [{ role: "user", content: [{ text: "Synthetic DOM only ".repeat(1500) }] }],
    });
    expect(send).toHaveBeenCalledOnce();
    target = { ...target, tabId: 2 };
    await expect(
      gateway.converse("alice", j.id, { messages: [] }),
    ).rejects.toThrow("target_changed");
    expect(send).toHaveBeenCalledOnce();
  } finally {
    send.mockRestore();
    db.close();
  }
});
