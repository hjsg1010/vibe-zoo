// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { afterEach, it, expect, vi } from "vitest";
import { fireEvent } from "@testing-library/react";
const click = (selector: string) => {
  const element = document.querySelector(selector);
  expect(element, selector).toBeTruthy();
  fireEvent.click(element!);
};
const fill = (selector: string, value: string) => {
  const element = document.querySelector(selector)!;
  fireEvent.input(element, { target: { value } });
};
const submit = (selector: string) =>
  fireEvent.submit(document.querySelector(selector)!);
function start() {
  document.body.innerHTML = '<div id="app"></div>';
  window.eval(readFileSync("reference/demo/app.js", "utf8"));
  click('[data-site="minio"]');
}
afterEach(() => {
  vi.useRealTimers();
  document.body.innerHTML = "";
});
it("completes Discover, trial, chat, Record and Skill reuse with matching business state", () => {
  vi.useFakeTimers();
  start();
  click("#discover");
  vi.advanceTimersByTime(2700);
  click("#tool-detail");
  fill("#trial-name", "test-trial");
  submit("#validate-form");
  expect(document.querySelector(".table-wrap")!.textContent).toContain(
    "test-trial",
  );
  fill("#chat-input", "launch-one 버킷을 만들어줘");
  submit("#chat-form");
  expect(document.querySelector(".table-wrap")!.textContent).toContain(
    "launch-one",
  );
  click("#record-start");
  click('[data-action="open-create"]');
  fill("#bucket-name", "record-project");
  submit("#bucket-form");
  expect(document.querySelector(".record-actions")!.textContent).toContain(
    "record-project",
  );
  click("#record-stop");
  fill("#intent", "프로젝트마다 새 버킷을 만들고 싶어요");
  submit("#intent-form");
  fill("#reuse-name", "second-project");
  submit("#reuse-form");
  expect(document.querySelector(".table-wrap")!.textContent).toContain(
    "second-project",
  );
  expect(document.querySelector("#welcome-card")!.textContent).toContain(
    "체험 완료",
  );
  click('[data-tab="chat"]');
  expect(
    document.querySelector(".message.keeper:last-of-type")?.textContent ??
      document.querySelector(".keeper-body")!.textContent,
  ).toContain("second-project");
  click('[data-action="reset"]');
  expect(document.querySelector(".table-wrap")!.textContent).not.toContain(
    "second-project",
  );
  expect(document.querySelectorAll("iframe")).toHaveLength(0);
});
it("rejects duplicate names, supports previous checkpoints and keeps keys scoped to the demo", () => {
  vi.useFakeTimers();
  start();
  click("#discover");
  vi.advanceTimersByTime(2700);
  click("#tool-detail");
  fill("#trial-name", "research-data");
  submit("#validate-form");
  expect(document.querySelector('[role="alert"]')!.textContent).toContain(
    "같은 이름",
  );
  click('[data-action="back"]');
  expect(document.querySelector("#validate-form")).toBeNull();
  click('[data-action="guide"]');
  click('[data-page="keys"]');
  fill("#key-name", "demo-reader");
  submit("#key-form");
  expect(document.querySelector(".web-main")!.textContent).toContain(
    "DEMO-ONLY-001",
  );
  click('[data-delete-key="0"]');
  click('[data-action="confirm-delete"]');
  expect(document.querySelector(".web-main")!.textContent).not.toContain(
    "DEMO-ONLY-001",
  );
});

it("reuses a recorded wafer query with new product and equipment and matching measured results", () => {
  vi.useFakeTimers();
  document.body.innerHTML = '<div id="app"></div>';
  window.eval(readFileSync("reference/demo/app.js", "utf8"));
  click('[data-site="wafer"]');
  expect(document.querySelector("#measurement-count")!.textContent).toBe("48");
  click("#discover");
  vi.advanceTimersByTime(2700);
  click("#tool-detail");
  submit("#validate-form");
  expect(document.querySelector("#query-scope")!.textContent).toContain(
    "DEMO-A · ETCH-01 · 8건",
  );
  fill("#chat-input", "DEMO-B, ETCH-02 조건으로 조회해줘");
  submit("#chat-form");
  expect(document.querySelector("#query-scope")!.textContent).toContain(
    "DEMO-B · ETCH-02 · 8건",
  );
  const mean = document.querySelector("#measurement-mean")!.textContent;
  expect(document.querySelector('[role="status"]')!.textContent).toContain(
    mean,
  );
  click("#record-start");
  fireEvent.change(document.querySelector("#web-product")!, {
    target: { value: "DEMO-C" },
  });
  expect(document.querySelector(".record-actions")!.textContent).toContain(
    "DEMO-C",
  );
  click("#record-stop");
  fill("#intent", "매일 제품별 계측 현황을 확인하고 싶어요");
  submit("#intent-form");
  fireEvent.change(document.querySelector("#reuse-product")!, {
    target: { value: "DEMO-A" },
  });
  submit("#reuse-form");
  expect(document.querySelector("#query-scope")!.textContent).toContain(
    "DEMO-A · ETCH-01 · 8건",
  );
  expect(document.querySelector("#welcome-card")!.textContent).toContain(
    "체험 완료",
  );
  click('[data-action="guide"]');
  click('[data-page="wafermap"]');
  expect(document.querySelectorAll(".wafer-item")).toHaveLength(8);
  click('[data-action="reset"]');
  expect(document.querySelector("#measurement-count")!.textContent).toBe("48");
  expect(document.querySelector("#discover")).toBeTruthy();
});

it("returns to the guided action after tab exploration and resumes after skipping guidance", () => {
  vi.useFakeTimers();
  start();
  click('[data-action="guide"]');
  click("#discover");
  vi.advanceTimersByTime(2700);
  click('[data-action="guide"]');
  expect(document.querySelector("#welcome-card h2")!.textContent).toContain(
    "‘도구’",
  );
  click('[data-tab="learn"]');
  expect(document.querySelector("#tool-detail")).toBeNull();
  click('[data-action="focus-step"]');
  expect(
    document.querySelector("#tool-detail")!.classList.contains("focus-target"),
  ).toBe(true);
});

it("shows Discover phases and opens conversation before trial, and drafts Record notes from actual actions", () => {
  vi.useFakeTimers();
  start();
  click("#discover");
  expect(document.querySelector("progress")?.getAttribute("value")).toBe("1");
  vi.advanceTimersByTime(650);
  expect(document.querySelector("progress")?.getAttribute("value")).toBe("2");
  vi.advanceTimersByTime(2050);
  expect(document.querySelector("#chat-form")).toBeTruthy();
  fill("#chat-input", "안녕");
  submit("#chat-form");
  expect(document.querySelector(".keeper-body")!.textContent).toContain(
    "대화는 바로",
  );
  click("#tool-detail");
  submit("#validate-form");
  click('[data-tab="learn"]');
  click("#record-start");
  click('[data-action="open-create"]');
  fill("#bucket-name", "record-notes");
  submit("#bucket-form");
  click("#record-stop");
  expect(
    (document.querySelector("#intent") as HTMLTextAreaElement).value,
  ).toContain("record-notes");
  submit("#intent-form");
  expect(document.querySelector(".skill-card")!.textContent).toContain(
    "record-notes",
  );
});

it("replaces the fixed tour with numbered welcome cards and preserves state while collapsing Keeper", () => {
  vi.useFakeTimers();
  start();
  expect(document.querySelector(".guide")).toBeNull();
  expect(document.querySelector("#extras")).toBeNull();
  expect(document.querySelector("#welcome-card")!.textContent).toContain(
    "1 / 10",
  );
  click("#discover");
  vi.advanceTimersByTime(2700);
  fill("#chat-input", "보존할 초안");
  click('[data-action="panel"]');
  expect(document.querySelector(".keeper")).toBeNull();
  expect(document.querySelector("#welcome-card")).toBeNull();
  click('[data-action="panel"]');
  expect(
    (document.querySelector("#chat-input") as HTMLTextAreaElement).value,
  ).toBe("보존할 초안");
  expect(document.querySelector("#welcome-card")!.textContent).toContain(
    "2 / 10",
  );
});

it("explains unfamiliar tabs on first visit without losing the guided action", () => {
  vi.useFakeTimers();
  start();
  expect(document.querySelector("#welcome-card")!.textContent).toContain(
    "버킷은 파일을 담는 보관함",
  );
  click('[data-tab="tools"]');
  expect(document.querySelector("#welcome-card h2")!.textContent).toContain(
    "Keeper에게 맡길 수 있는 일",
  );
  click('[data-action="focus-step"]');
  expect(
    document.querySelector("#discover")!.classList.contains("focus-target"),
  ).toBe(true);
  click('[data-tab="learn"]');
  expect(document.querySelector("#welcome-card")!.textContent).toContain(
    "클릭·입력 순서",
  );
});

it("preserves pending wafer filter choices when the panel closes", () => {
  vi.useFakeTimers();
  document.body.innerHTML = '<div id="app"></div>';
  window.eval(readFileSync("reference/demo/app.js", "utf8"));
  click('[data-site="wafer"]');
  click("#discover");
  vi.advanceTimersByTime(2700);
  click("#tool-detail");
  fireEvent.change(document.querySelector("#trial-product")!, {
    target: { value: "DEMO-C" },
  });
  click('[data-action="panel"]');
  click('[data-action="panel"]');
  expect(
    (document.querySelector("#trial-product") as HTMLSelectElement).value,
  ).toBe("DEMO-C");
});

it("puts mail first and completes search, Record, prefilled notes and reuse with changed input", () => {
  vi.useFakeTimers();
  document.body.innerHTML = '<div id="app"></div>';
  window.eval(readFileSync("reference/demo/app.js", "utf8"));
  expect(
    Array.from(document.querySelectorAll("[data-site]")).map(
      (e) => (e as HTMLElement).dataset.site,
    ),
  ).toEqual(["mail", "wafer", "minio"]);
  click('[data-site="mail"]');
  click("#discover");
  vi.advanceTimersByTime(2700);
  expect(document.querySelector("#chat-form")).toBeTruthy();
  click("#tool-detail");
  submit("#validate-form");
  expect(document.querySelector(".mail-scope")!.textContent).toContain("회의");
  expect(document.querySelectorAll(".mail-row")).toHaveLength(2);
  fill("#chat-input", "견적 메일을 찾아줘");
  submit("#chat-form");
  expect(document.querySelectorAll(".mail-row")).toHaveLength(1);
  expect(document.querySelector(".mail-list")!.textContent).toContain("견적");
  click("#record-start");
  fill("#mail-search", "출장");
  submit("#web-action");
  click("#record-stop");
  expect(
    (document.querySelector("#intent") as HTMLTextAreaElement).value,
  ).toContain("출장");
  submit("#intent-form");
  fill("#reuse-name", "일정");
  submit("#reuse-form");
  expect(document.querySelectorAll(".mail-row")).toHaveLength(3);
  expect(document.querySelector("#welcome-card")!.textContent).toContain(
    "체험 완료",
  );
  click('[data-action="panel"]');
  click('[data-action="panel"]');
  expect(document.querySelector(".mail-scope")!.textContent).toContain("일정");
  click('[data-action="reset"]');
  expect(document.querySelectorAll(".mail-row")).toHaveLength(6);
});

it("next-step buttons execute real demo actions and wait for a recorded user input", () => {
  vi.useFakeTimers();
  start();
  const next = () => click('[data-action="focus-step"]');
  expect(document.querySelector('[data-action="focus-step"]')!.textContent).toBe("다음 단계 →");
  next();
  expect(document.querySelector("progress")).toBeTruthy();
  expect(document.querySelector('[data-action="focus-step"]')).toHaveProperty("disabled", true);
  vi.advanceTimersByTime(2700);
  next();
  expect(document.querySelector("#validate-form")).toBeTruthy();
  fill("#trial-name", "research-data");
  next();
  expect(document.querySelector('[role="alert"]')!.textContent).toContain("같은 이름");
  fill("#trial-name", "next-trial");
  next();
  expect(document.querySelector(".table-wrap")!.textContent).toContain("next-trial");
  next();
  next();
  next();
  expect(document.activeElement?.id).toBe("bucket-name");
  expect(document.querySelector("#record-stop")).toHaveProperty("disabled", true);
  fill("#bucket-name", "next-record");
  submit("#bucket-form");
  next();
  expect(document.querySelector<HTMLTextAreaElement>("#intent")!.value).toContain("next-record");
  next();
  fill("#reuse-name", "next-reuse");
  next();
  expect(document.querySelector(".table-wrap")!.textContent).toContain("next-reuse");
  next();
  expect(document.querySelector("#welcome-card")).toBeNull();
});
