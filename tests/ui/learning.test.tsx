// @vitest-environment jsdom
import { it, expect, vi, afterEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
} from "@testing-library/react";
import { Learning } from "../../src/extension/panel/learning.js";
import { ApiClient } from "../../src/ui/api-client.js";
import { binding } from "../helpers/fixtures.js";
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
it("Stop only exposes an empty intent form; learning requires explicit text and erases the acknowledged recording", async () => {
  const sendMessage = vi.fn(async (message: { type: string }) =>
    message.type === "record_stop"
      ? {
          ok: true,
          recording: { events: [{ kind: "click", label: "Synthetic" }] },
        }
      : { ok: true },
  );
  vi.stubGlobal("chrome", { runtime: { sendMessage } });
  const api = new ApiClient("https://demo.example.org");
  const call = vi
    .spyOn(api, "call")
    .mockImplementation(async (path) =>
      path === "/api/record/start" ? { id: "lease" } : {},
    );
  vi.spyOn(api, "state").mockResolvedValue({ binding, jobs: [], assets: [] });
  render(
    <Learning
      api={api}
      state={{ binding, jobs: [], assets: [] }}
      conversationId="conversation"
      onChange={async () => {}}
    />,
  );
  fireEvent.click(screen.getByTestId("record-start"));
  await waitFor(() => expect(screen.getByTestId("record-stop")).toBeTruthy());
  fireEvent.click(screen.getByTestId("record-stop"));
  await waitFor(() =>
    expect(screen.getByTestId("learning-intent")).toBeTruthy(),
  );
  expect(call.mock.calls.some(([path]) => path === "/api/record/submit")).toBe(
    false,
  );
  expect(
    (screen.getByTestId("learning-submit") as HTMLButtonElement).disabled,
  ).toBe(true);
  fireEvent.change(screen.getByTestId("learning-intent"), {
    target: { value: "선택한 항목 조회를 반복" },
  });
  fireEvent.click(screen.getByTestId("learning-submit"));
  await waitFor(() => expect(screen.getByTestId("record-start")).toBeTruthy());
  expect(
    call.mock.calls.filter(([path]) => path === "/api/record/submit"),
  ).toHaveLength(1);
  expect(screen.queryByTestId("learning-intent")).toBeNull();
});
