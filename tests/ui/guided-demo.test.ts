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
  click("#keeper-toolbar-toggle");
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
  click("#keeper-toolbar-toggle");
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
  click("#keeper-toolbar-toggle");
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
  click("#keeper-toolbar-toggle");
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
    "2 / 11",
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
    "3 / 11",
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
  click("#keeper-toolbar-toggle");
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
  click("#keeper-toolbar-toggle");
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
  click("#keeper-toolbar-toggle");
  expect(document.querySelectorAll(".mail-row")).toHaveLength(6);
});

it("next-step buttons execute real demo actions and wait for a recorded user input", () => {
  vi.useFakeTimers();
  start();
  const next = () => click('[data-action="focus-step"]');
  expect(
    document.querySelector('[data-action="focus-step"]')!.textContent,
  ).toBe("다음 단계 →");
  next();
  expect(document.querySelector("progress")).toBeTruthy();
  expect(document.querySelector('[data-action="focus-step"]')).toHaveProperty(
    "disabled",
    true,
  );
  vi.advanceTimersByTime(2700);
  next();
  expect(document.querySelector("#validate-form")).toBeTruthy();
  fill("#trial-name", "research-data");
  next();
  expect(document.querySelector('[role="alert"]')!.textContent).toContain(
    "같은 이름",
  );
  fill("#trial-name", "next-trial");
  next();
  expect(document.querySelector(".table-wrap")!.textContent).toContain(
    "next-trial",
  );
  next();
  next();
  next();
  expect(document.activeElement?.id).toBe("bucket-name");
  expect(document.querySelector("#record-stop")).toHaveProperty(
    "disabled",
    true,
  );
  fill("#bucket-name", "next-record");
  submit("#bucket-form");
  next();
  expect(
    document.querySelector<HTMLTextAreaElement>("#intent")!.value,
  ).toContain("next-record");
  next();
  fill("#reuse-name", "next-reuse");
  next();
  expect(document.querySelector(".table-wrap")!.textContent).toContain(
    "next-reuse",
  );
  next();
  expect(document.querySelector("#welcome-card")).toBeNull();
});

it("shows capability meanings together and keeps a generated Skill visible across tabs", () => {
  vi.useFakeTimers();
  start();
  click("#discover");
  vi.advanceTimersByTime(2700);
  click("#tool-detail");
  const cards = document.querySelectorAll(".capability-card");
  expect(cards).toHaveLength(2);
  expect(cards[0]!.textContent).toContain("파일 보관함 만들기");
  expect(cards[1]!.textContent).toContain("보관함 목록 확인");
  expect(document.querySelector("#validate-form")!.textContent).toContain(
    "두 작업을 함께 확인",
  );
  expect(document.querySelector(".keeper-body")!.textContent).not.toMatch(
    /시험 필요|MCP TOOL/,
  );
  submit("#validate-form");
  submit("#chat-form");
  click("#record-start");
  click('[data-action="open-create"]');
  fill("#bucket-name", "skill-visible");
  submit("#bucket-form");
  click("#record-stop");
  submit("#intent-form");
  expect(document.querySelector(".installed-skill")!.textContent).toContain(
    "생성 완료",
  );
  expect(document.querySelector("#intent-form")).toBeNull();
  expect(
    document.querySelector(".installed-skill .skill-recipe")!.textContent,
  ).toContain("보관함 목록 확인");
  expect(document.querySelector('[data-tab="learn"]')!.textContent).toContain(
    "Skill 1",
  );
  click('[data-tab="tools"]');
  expect(document.querySelector(".installed-skill")!.textContent).toContain(
    "내 Skill 열고 실행하기",
  );
  click('.installed-skill [data-tab="learn"]');
  fill("#reuse-name", "skill-visible-again");
  submit("#reuse-form");
  expect(document.querySelector(".table-wrap")!.textContent).toContain(
    "skill-visible-again",
  );
});

it("keeps the browser extension button available to close and reopen Keeper", () => {
  start();
  expect(
    document.querySelector(".workspace > .browser-bar #keeper-toolbar-toggle"),
  ).toBeTruthy();
  expect(
    document
      .querySelector("#keeper-toolbar-toggle")!
      .getAttribute("aria-expanded"),
  ).toBe("true");
  click("#keeper-toolbar-toggle");
  expect(document.querySelector("#keeper-panel")).toBeNull();
  expect(
    document
      .querySelector("#keeper-toolbar-toggle")!
      .getAttribute("aria-expanded"),
  ).toBe("false");
  click("#keeper-toolbar-toggle");
  expect(document.querySelector("#keeper-panel")).toBeTruthy();
  expect(
    document
      .querySelector("#keeper-toolbar-toggle")!
      .getAttribute("aria-expanded"),
  ).toBe("true");
});

it("executes mail tools and composes sender filtering, reading and starring with matching state", () => {
  vi.useFakeTimers();
  document.body.innerHTML = '<div id="app"></div>';
  window.eval(readFileSync("reference/demo/app.js", "utf8"));
  click('[data-site="mail"]');
  click("#keeper-toolbar-toggle");
  click("#discover");
  vi.advanceTimersByTime(2700);
  click("#tool-detail");
  expect(document.querySelectorAll(".capability-card")).toHaveLength(7);
  submit("#validate-form");
  fill("#chat-input", "구매팀 메일을 읽고 별표를 붙여서 모아줘");
  submit("#chat-form");
  expect(document.querySelector(".mail-list")!.textContent).toContain("견적");
  expect(document.querySelectorAll(".mail-row")).toHaveLength(1);
  expect(
    document
      .querySelector('[data-star="mail-3"]')!
      .getAttribute("aria-pressed"),
  ).toBe("true");
  expect(
    document.querySelector(".message.keeper:last-of-type")!.textContent,
  ).toContain("복합 작업 완료 · 4단계");
  click('[data-tab="tools"]');
  const target = document.querySelector<HTMLSelectElement>(
    '[data-mail-tool="unstar"] select',
  )!;
  target.value = "mail-3";
  submit('[data-mail-tool="unstar"]');
  submit('[data-mail-tool="starred"]');
  expect(document.querySelectorAll(".mail-row")).toHaveLength(0);
  const reader = document.querySelector<HTMLSelectElement>(
    '[data-mail-tool="read"] select',
  )!;
  reader.value = "mail-3";
  submit('[data-mail-tool="read"]');
  expect(document.querySelector(".opened-mail")!.textContent).toContain(
    "샘플 제작 견적",
  );
  submit('[data-mail-tool="sender"]');
  expect(document.querySelectorAll(".mail-row")).toHaveLength(1);
  expect(document.querySelector<HTMLSelectElement>("#mail-sender")!.value).toBe(
    "기획팀",
  );
});

it("starts the tutorial with the closed extension and only discovers after opening it", () => {
  document.body.innerHTML = '<div id="app"></div>';
  window.eval(readFileSync("reference/demo/app.js", "utf8"));
  click('[data-site="mail"]');
  expect(document.querySelector("#keeper-panel")).toBeNull();
  expect(document.querySelector("#welcome-card")!.textContent).toContain(
    "1 / 11",
  );
  expect(
    document
      .querySelector("#keeper-toolbar-toggle")!
      .classList.contains("focus-target"),
  ).toBe(true);
  click("#keeper-toolbar-toggle");
  expect(document.querySelector("#discover")).toBeTruthy();
  expect(document.querySelector("progress")).toBeNull();
  expect(document.querySelector("#welcome-card")!.textContent).toContain(
    "2 / 11",
  );
  click('[data-action="back"]');
  expect(document.querySelector("#keeper-panel")).toBeNull();
  click('[data-action="focus-step"]');
  expect(document.querySelector("#discover")).toBeTruthy();
});

it("keeps all mail tools in one collapsed list and preserves expanded details after execution", async () => {
  vi.useFakeTimers();
  document.body.innerHTML = '<div id="app"></div>';
  window.eval(readFileSync("reference/demo/app.js", "utf8"));
  click('[data-site="mail"]');
  click("#keeper-toolbar-toggle");
  click("#discover");
  vi.advanceTimersByTime(2700);
  click("#tool-detail");
  const catalog = document.querySelector(".tool-catalog")!;
  expect(catalog.querySelectorAll(":scope > details")).toHaveLength(7);
  expect(catalog.querySelectorAll("details[open]")).toHaveLength(0);
  expect(catalog.querySelector("#validate-form")).toBeNull();
  expect(document.querySelector(".tool-setup #validate-form")).toBeTruthy();
  submit("#validate-form");
  click('[data-tab="tools"]');
  const row = document.querySelector<HTMLDetailsElement>(
    '[data-tool-row="read"]',
  )!;
  row.open = true;
  fireEvent(row, new Event("toggle"));
  submit('[data-mail-tool="read"]');
  expect(
    document.querySelector<HTMLDetailsElement>('[data-tool-row="read"]')!.open,
  ).toBe(true);
  expect(
    document.querySelector('[data-tool-row="read"] [role="status"]'),
  ).toBeTruthy();
});
