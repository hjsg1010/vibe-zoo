import { it, expect } from "vitest";
import { createServer } from "node:http";
import { openDatabase } from "../../src/backend/storage/database.js";
import { migrate } from "../../src/backend/storage/migrate.js";
import {
  Repository,
  fingerprint,
} from "../../src/backend/storage/repository.js";
import { Auth } from "../../src/backend/auth.js";
import { Coordinator } from "../../src/backend/jobs/coordinator.js";
import { Registry } from "../../src/backend/assets/registry.js";
import { Router } from "../../src/backend/api/router.js";
import { publicError } from "../../src/shared/errors.js";
import { binding, job } from "../helpers/fixtures.js";
import type { Job } from "../../src/shared/contracts.js";

it("accepts first validation without a report only from a settled generation, keeping input and owner boundaries", async () => {
  const db = openDatabase(":memory:");
  migrate(db);
  const repo = new Repository(db);
  const credential = "synthetic-wrapup-access-credential";
  repo.actor("alice", Auth.credentialHash(credential));
  repo.actor("bob", "synthetic-bob-hash");
  const auth = new Auth(repo);
  const token = auth.issue(credential);
  const coordinator = new Coordinator(
    repo,
    {
      current: () => binding,
      enqueue: async () => {
        throw Error(
          "This API acceptance check must not execute a browser action",
        );
      },
    },
    new Registry(repo),
  );
  const router = new Router(
    auth,
    coordinator,
    "https://demo.example.org",
    () => [],
  );
  const server = createServer((req, res) => {
    void router.handle(req, res, req.url!).catch((error) => {
      const failure = publicError(error);
      res.writeHead(failure.status, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: failure.code }));
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string")
    throw Error("server not listening");
  const call = (path: string, method: string, body?: unknown) =>
    fetch(`http://127.0.0.1:${address.port}${path}`, {
      method,
      headers: {
        Origin: "https://demo.example.org",
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
  const siteKey = fingerprint(binding.origin);
  for (const owner of ["alice", "bob"]) {
    repo.createAsset({
      id: owner,
      owner,
      currentVersionId: null,
      previousVersionId: null,
      name: "합성 조회",
      description: "API 회귀 검사",
      defaults: {},
      enabled: true,
      revision: 0,
      siteKey,
    });
    repo.saveVersion({
      id: `${owner}-version`,
      assetId: owner,
      owner,
      kind: "tool",
      siteKey,
      evidence: "synthetic test only",
      createdAt: 0,
      content: {
        name: "inspect",
        description: "합성 조회",
        inputContract: [
          { name: "name", description: "이름", type: "string", required: true },
        ],
        adapter: {
          operations: [{ kind: "observe" }],
          postconditions: [
            {
              locator: { by: "text", value: { input: "name" } },
              assert: "visible",
            },
          ],
        },
      },
    });
  }
  const validate = (name: string) =>
    call("/api/assets/alice/validate", "POST", {
      versionId: "alice-version",
      inputs: { name },
      request: {
        requestKey: crypto.randomUUID(),
        conversationId: "fixture",
        binding,
        purpose: "합성 후보 검증",
        inputs: {},
      },
    });
  try {
    expect(await (await validate("new")).json()).toEqual({
      error: "not_observed",
    });
    let source = repo.createJob(
      job("alice", {
        candidateId: "alice-version",
        status: "running",
        validationRequest: {
          sourceJobId: "fixture",
          sourceInputs: { name: "old" },
          toolInputs: { name: "tool" },
          skillInputs: { name: "skill" },
        },
      }),
    );
    expect(await (await validate("new")).json()).toEqual({ error: "conflict" });
    source = repo.updateJob(
      "alice",
      source.id,
      source.controlRevision,
      (j) => ({ ...j, status: "failed" }),
    );
    expect(await (await validate("old")).json()).toEqual({
      error: "invalid_input",
    });
    const accepted = await validate("new");
    expect(accepted.status).toBe(202);
    const created = ((await accepted.json()) as { job: Job }).job;
    expect(created.assetValidation).toMatchObject({
      sourceJobId: source.id,
      sourceInputs: { name: "old" },
    });
    expect(repo.asset("alice", "alice").currentVersionId).toBeNull();
    expect(repo.reports("alice", "alice-version")).toHaveLength(0);
    expect((await call("/api/assets/bob", "DELETE")).status).toBe(404);
    expect(repo.asset("bob", "bob").id).toBe("bob");
    expect(await (await call("/api/assets/alice", "DELETE")).json()).toEqual({
      error: "conflict",
    });
    repo.cancel("alice", created.id, created.controlRevision);
    const deleted = await call("/api/assets/alice", "DELETE");
    expect(deleted.status).toBe(204);
    expect(await deleted.text()).toBe("");
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
    db.close();
  }
});
