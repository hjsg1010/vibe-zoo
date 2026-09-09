// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { Recorder } from "../../src/extension/recorder.js";
import { RECORD_TTL } from "../../src/shared/recording.js";
afterEach(() => {
  vi.useRealTimers();
  document.body.innerHTML = "";
});
function syntheticTrusted(
  recorder: Recorder,
  target: Element,
  type = "change",
) {
  // Exercise filtering with explicit synthetic evidence; actual listeners additionally require isTrusted.
  recorder["captureTrusted"]({ target, type } as unknown as Event);
}
it("ignores page-dispatched events, filters sensitive/login fields, and never stores raw authentication values", () => {
  document.body.innerHTML =
    '<label for="name">Item</label><input id="name"><input type="password"><input name="api-key"><form><input type="password"><input id="login"></form>';
  const r = new Recorder();
  r.start(1);
  const input = document.querySelector<HTMLInputElement>("#name")!;
  input.value = "synthetic-item";
  input.dispatchEvent(new Event("change", { bubbles: true }));
  syntheticTrusted(r, input);
  for (const el of document.querySelectorAll("input:not(#name)"))
    syntheticTrusted(r, el);
  const stopped = r.stop();
  expect(stopped.events).toHaveLength(1);
  expect(stopped.events[0]?.value).toBe("synthetic-item");
  r.clear();
});
it("Stop freezes events without replay; clear and 30-minute expiry erase the buffer", () => {
  vi.useFakeTimers();
  document.body.innerHTML = "<button>Create</button>";
  const r = new Recorder();
  r.start(3);
  syntheticTrusted(r, document.querySelector("button")!, "click");
  const data = r.stop();
  expect(data.revision).toBe(3);
  expect(data.events).toHaveLength(1);
  expect(() => r.stop()).toThrow();
  r.clear();
  expect(() => r.stop()).toThrow();
  r.start(4);
  vi.advanceTimersByTime(RECORD_TTL);
  expect(() => r.stop()).toThrow();
});
it("document replacement or overflowing events cannot become a complete demonstration", () => {
  document.body.innerHTML = "<button>Create</button>";
  const r = new Recorder();
  r.start(1);
  window.dispatchEvent(new Event("pagehide"));
  expect(() => r.stop()).toThrow();
  r.clear();
  r.start(2);
  for (let i = 0; i < 101; i++)
    syntheticTrusted(r, document.querySelector("button")!, "click");
  expect(() => r.stop()).toThrow();
  r.clear();
});
