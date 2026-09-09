import { it, expect } from "vitest";
import {
  assertTarget,
  ActionLedger,
} from "../../src/extension/target.js";
import { bindingSchema } from "../../src/shared/contracts.js";
import { binding } from "../helpers/fixtures.js";
import type { BrowserCommand } from "../../src/shared/contracts.js";
it("rejects changed user-tab-document connection, expired actions and duplicate consumption", () => {
  const c: BrowserCommand = {
    type: "action",
    actionId: "fixture-action",
    jobId: "fixture-job",
    binding,
    controlRevision: 1,
    expiresAt: Date.now() + 10000,
    operation: { kind: "observe" },
    inputs: {},
    postconditions: [],
  };
  expect(() =>
    assertTarget(c, { ...binding, documentId: "other-document" }),
  ).toThrow("target_changed");
  expect(() =>
    assertTarget(c, { ...binding, connection: "new-connection" }),
  ).toThrow("target_changed");
  expect(() => assertTarget({ ...c, expiresAt: 0 }, binding)).toThrow(
    "target_changed",
  );
  const ledger = new ActionLedger();
  ledger.begin(c.actionId);
  expect(() => ledger.begin(c.actionId)).toThrow("conflict");
});

it("accepts an action-caused same-origin checkpoint, rejects unrelated navigation", async () => {
  const { nextBinding } = await import("../../src/extension/target.js");
  const c: BrowserCommand = {
    type: "action",
    actionId: "fixture-nav",
    jobId: "fixture-job",
    binding,
    controlRevision: 1,
    expiresAt: Date.now() + 10000,
    operation: {
      kind: "click",
      locator: { by: "label", value: { literal: "목록" } },
      changesData: false,
    },
    inputs: {},
    postconditions: [],
  };
  expect(
    nextBinding(c, {
      documentId: "next-document",
      origin: binding.origin,
      path: "/list",
    })?.revision,
  ).toBe(1);
  expect(() =>
    nextBinding(
      { ...c, operation: { kind: "observe" } },
      {
        documentId: binding.documentId,
        origin: binding.origin,
        path: "/other",
      },
    ),
  ).toThrow("target_changed");
  expect(() =>
    nextBinding(c, {
      documentId: "other",
      origin: "https://other.example.org",
      path: "/",
    }),
  ).toThrow("target_changed");
  const observedCheckpoint = {
    documentId: "next-document",
    origin: binding.origin,
    path: "/list",
    href: binding.origin + "/list",
    ready: "complete",
  };
  expect(
    bindingSchema.safeParse(nextBinding(c, observedCheckpoint)).success,
  ).toBe(true);
});
