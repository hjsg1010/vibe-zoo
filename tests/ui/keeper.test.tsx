// @vitest-environment jsdom
import { it, expect, vi } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { Chat } from "../../src/extension/panel/chat.js";
import { JobCard, AssetValidationForm } from "../../src/ui/components.js";
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

it("opens Store in an explicit new tab instead of navigating the connected business tab", async () => {
  const { Keeper } = await import("../../src/extension/panel/app.js");
  const { ApiClient } = await import("../../src/ui/api-client.js");
  const create = vi.fn().mockResolvedValue({});
  vi.stubGlobal("chrome", {
    storage: {
      session: {
        get: vi.fn().mockResolvedValue({
          token: "synthetic-token",
          backendOrigin: "https://demo.example.org",
        }),
        set: vi.fn().mockResolvedValue(undefined),
      },
    },
    tabs: { create },
    runtime: { sendMessage: vi.fn().mockResolvedValue(undefined) },
  });
  const state = vi
    .spyOn(ApiClient.prototype, "state")
    .mockResolvedValue({ binding: null, jobs: [], assets: [] });
  try {
    render(<Keeper />);
    fireEvent.click(await screen.findByRole("tab", { name: "설정" }));
    fireEvent.click(screen.getByTestId("open-store"));
    expect(create).toHaveBeenCalledWith({ url: "https://demo.example.org" });
  } finally {
    cleanup();
    state.mockRestore();
    vi.unstubAllGlobals();
  }
});

it("keeps confirmations and uncertain results visible while completed history is collapsed", async () => {
  const { ActivityList } =
    await import("../../src/extension/panel/activity.js");
  const jobs = [
    job("alice", {
      conversationId: "older",
      status: "completed",
      purpose: "지난 작업",
    }),
    job("alice", {
      conversationId: "older",
      status: "waiting_confirmation",
      purpose: "승인 대기",
    }),
    job("alice", {
      conversationId: "older",
      status: "unknown",
      purpose: "결과 미확인",
    }),
    job("alice", {
      conversationId: "current",
      kind: "execution",
      status: "completed",
      purpose: "현재 대화",
    }),
  ];
  render(
    <ActivityList
      jobs={jobs}
      conversationId="current"
      renderJob={(j) => <p key={j.id}>{j.purpose}</p>}
    />,
  );
  expect(screen.getByText("승인 대기").closest("details")).toBeNull();
  expect(screen.getByText("결과 미확인").closest("details")).toBeNull();
  expect(screen.getByText("현재 대화").closest("details")?.open).toBe(false);
  expect(document.querySelectorAll("details")).toHaveLength(2);
  cleanup();
});

it("explains how to validate candidates and does not claim discovery success while running", async () => {
  const { DiscoveryGuide } =
    await import("../../src/extension/panel/activity.js");
  const onTools = vi.fn();
  const asset = {
    id: "candidate",
    name: "합성 도구",
    candidateVersionId: "v1",
  } as import("../../src/ui/api-client.js").State["assets"][number];
  const view = render(
    <DiscoveryGuide jobs={[]} assets={[asset]} onTools={onTools} />,
  );
  expect(screen.getByText(/시험할 입력으로/)).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: /도구 목록/ }));
  expect(onTools).toHaveBeenCalledOnce();
  view.rerender(
    <DiscoveryGuide
      jobs={[job("alice", { status: "running" })]}
      assets={[asset]}
      onTools={onTools}
    />,
  );
  expect(screen.getByText("도구를 준비하고 있어요")).toBeTruthy();
  expect(screen.queryByText(/후보 1개를 시험/)).toBeNull();
  cleanup();
});

it("submits an empty all-products filter as a present string while preserving required numeric validation", async () => {
  const send = vi.fn(async () => {});
  render(
    <AssetValidationForm
      contract={[
        {
          name: "product",
          description: "제품 (빈 값은 전체)",
          type: "string",
          required: true,
        },
        {
          name: "limit",
          description: "조회 수",
          type: "number",
          required: true,
        },
      ]}
      onSubmit={send}
    />,
  );
  const product = screen.getByLabelText(
    "제품 (빈 값은 전체)",
  ) as HTMLInputElement;
  const limit = screen.getByLabelText("조회 수") as HTMLInputElement;
  expect(product.checkValidity()).toBe(true);
  expect(limit.checkValidity()).toBe(false);
  fireEvent.change(limit, { target: { value: "5" } });
  fireEvent.click(screen.getByTestId("validate-asset"));
  expect(send).toHaveBeenCalledWith({ product: "", limit: 5 });
  cleanup();
});
