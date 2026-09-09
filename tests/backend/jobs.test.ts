import { it, expect } from "vitest";
import {
  reserveModel,
  settleModel,
  reserveBrowser,
} from "../../src/backend/jobs/budget.js";
import { ModelScheduler } from "../../src/backend/jobs/scheduler.js";
import { SerialControl, TargetSlots } from "../../src/backend/jobs/control.js";
import {
  Coordinator,
  type BrowserPort,
} from "../../src/backend/jobs/coordinator.js";
import { Repository } from "../../src/backend/storage/repository.js";
import { openDatabase } from "../../src/backend/storage/database.js";
import { migrate } from "../../src/backend/storage/migrate.js";
import { Registry } from "../../src/backend/assets/registry.js";
import { job, binding } from "../helpers/fixtures.js";
import type { BrowserCommand, Receipt } from "../../src/shared/contracts.js";
it("settles lost discovery retries without the original tab and releases its slot", async () => {
  const db = openDatabase(":memory:");
  migrate(db);
  const repo = new Repository(db);
  repo.actor("alice", "hash");
  let current: typeof binding | undefined = binding;
  let dispatches = 0;
  let lose = true;
  const browser: BrowserPort = {
    current: () => current,
    enqueue: async (_owner, command) => {
      dispatches++;
      if (lose) throw Error("disconnected");
      return {
        type: "receipt",
        actionId: command.actionId,
        jobId: command.jobId,
        controlRevision: command.controlRevision,
        binding,
        outcome: { status: "success", completed: [], reason: "observed" },
      };
    },
  };
  const c = new Coordinator(repo, browser, new Registry(repo));
  try {
    const a = repo.createJob(job());
    for (let i = 0; i < 3; i++) {
      await expect(
        c.execute("alice", a.id, { kind: "observe" }, {}, [], i > 0),
      ).rejects.toThrow("disconnected");
    }
    const cancelled = await c.cancel(
      "alice",
      a.id,
      repo.getJob("alice", a.id).controlRevision,
    );
    current = undefined;
    await expect(
      c.reconcile("bob", a.id, cancelled.controlRevision),
    ).rejects.toThrow();
    await expect(
      c.reconcile("alice", a.id, cancelled.controlRevision - 1),
    ).rejects.toThrow("conflict");
    const result = await c.reconcile("alice", a.id, cancelled.controlRevision);
    expect(result.status).toBe("cancelled");
    expect(result.outcome?.status).toBe("interrupted");
    expect(
      repo
        .actions("alice", a.id)
        .every(
          (a) =>
            a.state === "observed" &&
            a.reconciliation?.outcome.status === "interrupted",
        ),
    ).toBe(true);
    expect(dispatches).toBe(3);
    current = binding;
    lose = false;
    const b = repo.createJob(job());
    expect(
      (await c.execute("alice", b.id, { kind: "observe" }, {})).status,
    ).toBe("success");
  } finally {
    db.close();
  }
});

it("keeps unknown token reservations and the browser reconciliation reserve", () => {
  const b = reserveModel(job().budget, 100);
  expect(settleModel(b, 4196)).toEqual(b);
  expect(settleModel(b, 4196, 45).tokens).toBe(45);
  expect(() => reserveModel({ ...b, modelRequests: 8 }, 1)).toThrow(
    "budget_exhausted",
  );
  expect(() => reserveBrowser({ ...b, browserOps: 55 })).toThrow(
    "budget_exhausted",
  );
  expect(reserveBrowser({ ...b, browserOps: 55 }, true).reconcileOps).toBe(1);
});
it("serializes commit/enqueue decisions and isolates Record target slots", async () => {
  const c = new SerialControl();
  const order: number[] = [];
  await Promise.all([
    c.run("j", () => order.push(1)),
    c.run("j", () => order.push(2)),
  ]);
  expect(order).toEqual([1, 2]);
  const slots = new TargetSlots();
  expect(slots.acquire("target", "record")).toBe(true);
  expect(slots.acquire("target", "job")).toBe(false);
  slots.release("target", "wrong");
  expect(slots.acquire("target", "job")).toBe(false);
});
it("lets interactive work proceed during generation and rotates owners", async () => {
  const s = new ModelScheduler();
  let done!: () => void;
  const background = s.submit(
    "background",
    "a",
    () =>
      new Promise<void>((r) => {
        done = r;
      }),
  );
  expect(await s.submit("interactive", "a", async () => "chat")).toBe("chat");
  const order: string[] = [];
  const a = s.submit("background", "a", async () => {
    order.push("a");
  });
  const b = s.submit("background", "b", async () => {
    order.push("b");
  });
  done();
  await Promise.all([background, a, b]);
  expect(order).toEqual(["b", "a"]);
});
it("does not dispatch after cancel and preserves late observed evidence", async () => {
  const db = openDatabase(":memory:");
  migrate(db);
  const repo = new Repository(db);
  repo.actor("alice", "hash");
  let resolve!: (r: Receipt) => void;
  let sent: BrowserCommand | undefined;
  const browser: BrowserPort = {
    current: () => binding,
    enqueue: (_o, c) => {
      sent = c;
      return new Promise((r) => {
        resolve = r;
      });
    },
  };
  const c = new Coordinator(repo, browser, new Registry(repo));
  const j = repo.createJob(job());
  const work = c.execute("alice", j.id, { kind: "observe" }, {});
  await new Promise((r) => setTimeout(r, 0));
  expect(sent).toBeDefined();
  await c.cancel("alice", j.id, repo.getJob("alice", j.id).controlRevision);
  resolve({
    type: "receipt",
    actionId: sent!.actionId,
    jobId: j.id,
    controlRevision: sent!.controlRevision,
    binding,
    outcome: { status: "success", completed: [0], reason: "합성 관찰" },
  });
  await work;
  expect(repo.getJob("alice", j.id).cancelled).toBe(true);
  expect(repo.actions("alice", j.id)[0]?.state).toBe("observed");
  await expect(
    c.execute("alice", j.id, { kind: "observe" }, {}),
  ).rejects.toThrow("cancelled");
  db.close();
});
it("requires current UI confirmation and rejects target change", async () => {
  const db = openDatabase(":memory:");
  migrate(db);
  const repo = new Repository(db);
  repo.actor("alice", "hash");
  let current = { ...binding };
  let dispatched = false;
  const c = new Coordinator(
    repo,
    {
      current: () => current,
      enqueue: async () => {
        dispatched = true;
        throw Error();
      },
    },
    new Registry(repo),
  );
  const j = repo.createJob(job());
  const work = c.execute(
    "alice",
    j.id,
    {
      kind: "click",
      locator: { by: "text", value: { literal: "생성" } },
      changesData: true,
    },
    {},
  );
  const rejected = expect(work).rejects.toThrow("cancelled");
  await new Promise((r) => setTimeout(r, 0));
  const confirmation = c.confirmation("alice", j.id)!;
  current = { ...binding, tabId: 2 };
  await expect(
    c.confirm(
      "alice",
      j.id,
      confirmation.controlRevision,
      confirmation.actionId,
    ),
  ).rejects.toThrow("target_changed");
  await c.cancel("alice", j.id, confirmation.controlRevision);
  await rejected;
  expect(dispatched).toBe(false);
  db.close();
});

it("holds the target after a lost action and reconciles only its recorded postconditions after cancellation", async () => {
  const db = openDatabase(":memory:");
  migrate(db);
  const repo = new Repository(db);
  repo.actor("alice", "hash");
  let fail = true;
  const c = new Coordinator(
    repo,
    {
      current: () => binding,
      enqueue: async (_o, command) => {
        if (fail) throw Error("lost_response");
        return {
          type: "receipt",
          actionId: command.actionId,
          jobId: command.jobId,
          controlRevision: command.controlRevision,
          binding,
          outcome: {
            status: "success",
            completed: [0],
            reason: "합성 사후 관찰",
          },
        };
      },
    },
    new Registry(repo),
  );
  try {
    const a = repo.createJob(job());
    await expect(
      c.execute("alice", a.id, { kind: "observe" }, {}, [
        {
          locator: { by: "text", value: { literal: "완료" } },
          assert: "visible",
        },
      ]),
    ).rejects.toThrow();
    const b = repo.createJob(job());
    await expect(
      c.execute("alice", b.id, { kind: "observe" }, {}),
    ).rejects.toThrow("conflict");
    const cancelled = await c.cancel(
      "alice",
      a.id,
      repo.getJob("alice", a.id).controlRevision,
    );
    fail = false;
    await c.reconcile("alice", a.id, cancelled.controlRevision);
    expect(repo.getJob("alice", a.id).cancelled).toBe(true);
    expect(repo.actions("alice", a.id)).toHaveLength(2);
    expect(repo.actions("alice", a.id)[1]?.command.operation.kind).toBe(
      "observe",
    );
    expect(
      (await c.execute("alice", b.id, { kind: "observe" }, {})).status,
    ).toBe("success");
  } finally {
    db.close();
  }
});

it("preserves an explicitly unknown postcondition receipt and blocks further execution", async () => {
  const db = openDatabase(":memory:");
  migrate(db);
  const repo = new Repository(db);
  repo.actor("alice", "hash");
  const c = new Coordinator(
    repo,
    {
      current: () => binding,
      enqueue: async (_o, command) => ({
        type: "receipt",
        actionId: command.actionId,
        jobId: command.jobId,
        controlRevision: command.controlRevision,
        binding,
        outcome: {
          status: "unknown",
          completed: [0],
          reason: "TEST FIXTURE: postcondition not observed",
        },
      }),
    },
    new Registry(repo),
  );
  try {
    const j = repo.createJob(job());
    await c.execute("alice", j.id, { kind: "observe" }, {});
    expect(repo.actions("alice", j.id)[0]?.state).toBe("unknown");
    expect(repo.getJob("alice", j.id).status).toBe("unknown");
    await expect(
      c.execute("alice", j.id, { kind: "observe" }, {}),
    ).rejects.toThrow("conflict");
  } finally {
    db.close();
  }
});

it("requires fresh read-only evidence for nonexecution review and never marks the old work successful", async () => {
  const db = openDatabase(":memory:");
  migrate(db);
  const repo = new Repository(db);
  repo.actor("alice", "hash");
  const c = new Coordinator(
    repo,
    {
      current: () => binding,
      enqueue: async (_o, command) => ({
        type: "receipt",
        actionId: command.actionId,
        jobId: command.jobId,
        controlRevision: command.controlRevision,
        binding,
        outcome: {
          status: "unknown",
          completed: [0],
          reason: "TEST FIXTURE: insufficient postcondition evidence",
        },
      }),
    },
    new Registry(repo),
  );
  try {
    const j = repo.createJob(job());
    await c.execute("alice", j.id, { kind: "observe" }, {}, [
      {
        locator: { by: "text", value: { literal: "Result" } },
        assert: "visible",
      },
    ]);
    await expect(
      c.reviewNotExecuted(
        "alice",
        j.id,
        repo.getJob("alice", j.id).controlRevision,
        "TEST FIXTURE: button was disabled",
      ),
    ).rejects.toThrow("not_observed");
    // Compatibility with receipts saved by the earlier observed/unknown classification bug.
    const legacy = repo.actions("alice", j.id)[0]!;
    repo.saveAction({ ...legacy, state: "observed" });
    const observed = await c.reconcile(
      "alice",
      j.id,
      repo.getJob("alice", j.id).controlRevision,
    );
    await expect(
      c.reviewNotExecuted(
        "alice",
        j.id,
        observed.controlRevision - 1,
        "TEST FIXTURE: button was disabled",
      ),
    ).rejects.toThrow("conflict");
    const reviewed = await c.reviewNotExecuted(
      "alice",
      j.id,
      observed.controlRevision,
      "TEST FIXTURE: button was disabled",
    );
    expect(reviewed.status).toBe("failed");
    expect(reviewed.outcome?.status).toBe("interrupted");
    expect(repo.actions("alice", j.id)).toHaveLength(2);
    expect(repo.actions("alice", j.id)[0]?.receipt?.outcome.status).toBe(
      "unknown",
    );
    expect(repo.assets("alice")).toEqual([]);
  } finally {
    db.close();
  }
});
