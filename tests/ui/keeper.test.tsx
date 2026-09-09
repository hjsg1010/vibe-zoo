// @vitest-environment jsdom
import { it, expect, vi } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { Chat } from "../../src/extension/panel/chat.js";
import { JobCard } from "../../src/ui/components.js";
import { job, binding } from "../helpers/fixtures.js";
it("preserves chat draft while other jobs render and displays model strings as text", () => {
  const send = vi.fn(async () => {});
  const view = render(<Chat disabled={false} onSend={send} />);
  fireEvent.change(screen.getByLabelText("Keeper에게 요청하기"), {
    target: { value: "내 초안" },
  });
  view.rerender(<Chat disabled={false} onSend={send} />);
  expect((screen.getByTestId("chat-input") as HTMLTextAreaElement).value).toBe(
    "내 초안",
  );
  cleanup();
  const j = job("alice", {
    status: "unknown",
    outcome: {
      status: "unknown",
      completed: [],
      reason: "<script>example</script>",
    },
  });
  render(<JobCard job={j} onControl={() => {}} />);
  expect(screen.getByText("결과 미확인")).toBeTruthy();
  expect(document.querySelector("script")).toBeNull();
  cleanup();
});
it("shows scoped confirmation with the exact latest revision", () => {
  const control = vi.fn();
  const j = job("alice", {
    status: "waiting_confirmation",
    controlRevision: 3,
  });
  render(
    <JobCard
      job={{
        ...j,
        confirmation: {
          actionId: "proposal",
          jobId: j.id,
          controlRevision: 3,
          inputRevision: 0,
          binding,
          operation: {
            kind: "input",
            locator: { by: "label", value: { literal: "이름" } },
            value: { input: "name" },
          },
          inputs: { name: "synthetic" },
          versionIds: [],
        },
      }}
      onControl={control}
    />,
  );
  fireEvent.click(screen.getByTestId("confirm-change"));
  expect(control).toHaveBeenCalledWith(
    expect.objectContaining({ controlRevision: 3 }),
    "confirm",
    "proposal",
  );
  cleanup();
});
