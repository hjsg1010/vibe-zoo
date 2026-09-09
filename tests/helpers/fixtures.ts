import { newId } from "../../src/backend/storage/repository.js";
import type { Job, Binding } from "../../src/shared/contracts.js";
export const binding: Binding = {
  instance: "fixture-extension",
  connection: "fixture-connection",
  tabId: 1,
  documentId: "fixture-document",
  origin: "https://demo.example.org",
  path: "/",
  revision: 0,
};
export function job(owner = "alice", overrides: Partial<Job> = {}): Job {
  return {
    id: newId(),
    owner,
    kind: "generation",
    requestKey: newId(),
    fingerprint: "fixture",
    conversationId: "conversation",
    binding,
    status: "queued",
    cancelled: false,
    controlRevision: 0,
    inputRevision: 0,
    inputs: {},
    purpose: "합성 목록 확인",
    snapshots: [],
    budget: {
      activeMs: 0,
      browserOps: 0,
      reconcileOps: 0,
      modelRequests: 0,
      tokens: 0,
      reservedTokens: 0,
    },
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  };
}
