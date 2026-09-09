// @vitest-environment jsdom
import { it, expect, vi, afterEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
} from "@testing-library/react";
import { AssetImprovement } from "../../src/extension/panel/improvement.js";
import { ApiClient, type State } from "../../src/ui/api-client.js";
import { job } from "../helpers/fixtures.js";
afterEach(cleanup);
const asset = {
  id: "asset",
  owner: "alice",
  name: "Lookup",
  description: "Synthetic",
  siteKey: "site",
  revision: 2,
  currentVersionId: "base",
  previousVersionId: null,
  enabled: true,
  defaults: {},
};
it("does not invent a failure or make a model request just by opening improvement", async () => {
  const api = new ApiClient("https://demo.example.org");
  const call = vi.spyOn(api, "call").mockResolvedValue({ cases: [] });
  render(
    <AssetImprovement
      api={api}
      asset={asset}
      state={{ assets: [asset], jobs: [], binding: null }}
      onChanged={async () => {}}
    />,
  );
  fireEvent.click(screen.getByTestId("improvement-open"));
  await waitFor(() => expect(call).toHaveBeenCalled());
  expect(screen.getByTestId("improvement-no-failure")).toBeTruthy();
  expect(screen.queryByTestId("improvement-propose")).toBeNull();
  expect(call.mock.calls.every(([p]) => p.endsWith("improvement-cases"))).toBe(
    true,
  );
});
it("requires explicit apply of the reviewed digest and both reports; does not auto-apply passed validation", async () => {
  const api = new ApiClient("https://demo.example.org");
  const j = job("alice", {
    id: "improve",
    kind: "improvement",
    status: "completed",
    candidateId: "candidate",
    improvement: {
      assetId: "asset",
      baseVersionId: "base",
      failureReportId: "f",
      successReportId: "s",
      phase: "review",
      reason: "Evidence-grounded change",
    },
  });
  const detail = {
    job: j,
    candidate: {
      id: "candidate",
      content: {
        name: "lookup",
        adapter: { operations: [], postconditions: [] },
      },
    },
    reports: [
      {
        id: "f2",
        caseKind: "failure_reproduction",
        status: "passed",
        inputs: { item: "new-f" },
      },
      {
        id: "s2",
        caseKind: "success_regression",
        status: "passed",
        inputs: { item: "new-s" },
      },
    ],
    digest: "reviewed-digest",
  };
  const call = vi
    .spyOn(api, "call")
    .mockResolvedValueOnce({ cases: [] })
    .mockResolvedValue(detail);
  const state: State = { assets: [asset], jobs: [j], binding: null };
  render(
    <AssetImprovement
      api={api}
      asset={asset}
      state={state}
      onChanged={async () => {}}
    />,
  );
  fireEvent.click(screen.getByTestId("improvement-open"));
  await waitFor(() =>
    expect(screen.getByTestId("improvement-apply")).toBeTruthy(),
  );
  expect(call.mock.calls.some(([p]) => p.endsWith("/apply"))).toBe(false);
  fireEvent.click(screen.getByTestId("improvement-apply"));
  await waitFor(() =>
    expect(call).toHaveBeenCalledWith(
      "/api/improvement/improve/apply",
      expect.objectContaining({
        candidateId: "candidate",
        expectedCurrent: "base",
        digest: "reviewed-digest",
        assetRevision: 2,
      }),
    ),
  );
});
