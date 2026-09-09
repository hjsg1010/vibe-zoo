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
  vi.advanceTimersByTime(600);
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
  expect(document.querySelector(".guide")!.textContent).toContain("체험 완료");
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
  vi.advanceTimersByTime(600);
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
