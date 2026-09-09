// @vitest-environment jsdom
import { it, expect, vi } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
} from "@testing-library/react";
import { AssetSettings } from "../../src/extension/panel/settings.js";
import { ApiClient } from "../../src/ui/api-client.js";
it("retains an unsaved edit on conflict and submits the revision that was displayed when editing started", async () => {
  const api = new ApiClient("https://demo.example.org");
  const call = vi.spyOn(api, "call").mockImplementation(async (_path, body) => {
    if (body) throw Error("conflict");
    return { versions: [] };
  });
  const asset = {
    id: "asset",
    owner: "alice",
    name: "original",
    description: "description",
    siteKey: "site",
    currentVersionId: null,
    previousVersionId: null,
    defaults: {},
    enabled: true,
    revision: 2,
  };
  const view = render(
    <AssetSettings asset={asset} api={api} onSaved={async () => {}} />,
  );
  fireEvent.click(screen.getByTestId("asset-settings-open"));
  fireEvent.change(screen.getByTestId("asset-name"), {
    target: { value: "my draft" },
  });
  view.rerender(
    <AssetSettings
      asset={{ ...asset, revision: 3, name: "newer" }}
      api={api}
      onSaved={async () => {}}
    />,
  );
  fireEvent.click(screen.getByTestId("asset-settings-save"));
  await waitFor(() => expect(screen.getByRole("alert")).toBeTruthy());
  expect((screen.getByTestId("asset-name") as HTMLInputElement).value).toBe(
    "my draft",
  );
  expect(call.mock.calls.at(-1)?.[1]).toMatchObject({
    revision: 2,
    name: "my draft",
  });
  cleanup();
});
