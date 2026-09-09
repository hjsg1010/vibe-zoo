// @vitest-environment jsdom
import { it, expect, vi } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
} from "@testing-library/react";
import { Publish } from "../../src/store/publish.js";
import { ApiClient } from "../../src/ui/api-client.js";
it("requires a preview and explicit publish action; editing public fields invalidates the prior preview", async () => {
  const api = new ApiClient("https://demo.example.org");
  const call = vi
    .spyOn(api, "call")
    .mockResolvedValue({
      publication: {
        name: "Shared",
        description: "Description",
        author: "Team",
        scope: "Demo",
        versions: [],
        validation: "Own validation required",
        limitations: "Synthetic only",
      },
      digest: "preview",
    });
  render(
    <Publish
      api={api}
      asset={{
        id: "a",
        owner: "alice",
        name: "Shared",
        description: "Description",
        siteKey: "site",
        revision: 1,
        defaults: {},
        enabled: true,
        currentVersionId: "v",
        previousVersionId: null,
      }}
    />,
  );
  fireEvent.click(screen.getByTestId("publish-open"));
  expect(call).not.toHaveBeenCalled();
  expect(screen.queryByTestId("publish-confirm")).toBeNull();
  fireEvent.click(screen.getByTestId("publish-preview"));
  await waitFor(() =>
    expect(screen.getByTestId("publish-confirm")).toBeTruthy(),
  );
  expect(call.mock.calls.some(([path]) => path.endsWith("/publish"))).toBe(
    false,
  );
  fireEvent.change(screen.getByTestId("publish-name"), {
    target: { value: "Revised" },
  });
  expect(screen.queryByTestId("publish-confirm")).toBeNull();
  cleanup();
});
