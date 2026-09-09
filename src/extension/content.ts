import { Recorder } from "./recorder.js";
import { commandSchema } from "../shared/contracts.js";
import { execute } from "./executor.js";
import { observe } from "./observer.js";
// Isolated-world listener: no window.postMessage or page-provided confirmation channel.
const runtimeGlobal = globalThis as typeof globalThis & {
  vibeZooListenerInstalled?: boolean;
};
if (!runtimeGlobal.vibeZooListenerInstalled) {
  runtimeGlobal.vibeZooListenerInstalled = true;
  const recorder = new Recorder();
  chrome.runtime.onMessage.addListener((message: unknown, sender, respond) => {
    if (sender.id !== chrome.runtime.id) return false;
    if (
      typeof message === "object" &&
      message !== null &&
      "type" in message &&
      message.type === "observe"
    ) {
      respond(observe());
      return false;
    }
    if (
      typeof message === "object" &&
      message &&
      "type" in message &&
      ["record_start", "record_stop", "record_clear"].includes(
        String(message.type),
      )
    ) {
      try {
        if (message.type === "record_start") recorder.start(Date.now());
        if (message.type === "record_stop")
          respond({ ok: true, recording: recorder.stop() });
        else {
          if (message.type === "record_clear") recorder.clear();
          respond({ ok: true });
        }
      } catch {
        respond({ ok: false, error: "recording_incomplete" });
      }
      return false;
    }
    const parsed = commandSchema.safeParse(message);
    if (!parsed.success) return false;
    void execute(parsed.data).then(respond, () =>
      respond({
        status: "unknown",
        completed: [],
        reason: "관찰 연결을 확인해주세요.",
      }),
    );
    return true;
  });
}
