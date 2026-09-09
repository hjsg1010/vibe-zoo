import { type Recording, RECORD_TTL } from "../shared/recording.js";
import { cleanText, assertSafeData } from "../shared/redaction.js";
import { observe, label, role, sensitive, visible } from "./observer.js";
/** Raw events exist only in the current isolated document's memory. */
export class Recorder {
  private data?: Recording;
  private timer?: ReturnType<typeof setTimeout>;
  private active = false;
  private path = "";
  constructor(private doc: Document = document) {}
  start(revision: number): void {
    this.clear();
    this.path = this.doc.location.pathname;
    const initial = observe(this.doc);
    this.data = {
      revision,
      startedAt: Date.now(),
      stoppedAt: 0,
      complete: true,
      limitations: [],
      initial,
      final: initial,
      events: [],
    };
    this.active = true;
    this.doc.addEventListener("click", this.capture, true);
    this.doc.addEventListener("change", this.capture, true);
    this.doc.defaultView?.addEventListener("pagehide", this.incomplete);
    this.timer = setTimeout(() => this.clear(), RECORD_TTL);
  }
  private incomplete = () => {
    if (this.data) {
      this.data.complete = false;
      this.data.limitations.push("document_replaced");
    }
    this.detach();
  };
  private capture = (event: Event) => {
    // Script-dispatched events, including product executions, are never user demonstrations.
    if (!event.isTrusted) return;
    this.captureTrusted(event);
  };
  private captureTrusted(event: Event): void {
    if (!this.active || !this.data) return;
    const target = event.target;
    if (!(target instanceof this.doc.defaultView!.Element)) return;
    const el = target.closest(
      "button,a,input,textarea,select,[role=button],[role=checkbox]",
    );
    if (
      !el ||
      !visible(el) ||
      sensitive(el) ||
      el.closest("form")?.querySelector('input[type="password"]')
    )
      return;
    if (this.data.events.length >= 98) {
      this.data.complete = false;
      this.data.limitations.push("event_limit");
      this.detach();
      return;
    }
    const path = cleanText(this.doc.location.pathname, 500);
    if (path !== this.path) {
      this.data.events.push({
        kind: "navigation",
        path,
        role: "page",
        label: "페이지 이동",
      });
      this.path = path;
    }
    const value =
      event.type === "change" && el.matches("input,textarea,select")
        ? el.matches('input[type="checkbox"],input[type="radio"]')
          ? (el as HTMLInputElement).checked
          : cleanText((el as HTMLInputElement).value, 200)
        : undefined;
    const entry = {
      kind: event.type as "click" | "change",
      path,
      role: role(el),
      label: cleanText(
        label(el) ||
          (el.matches("input,textarea,select")
            ? (el.getAttribute("placeholder") ?? "")
            : (el.textContent ?? "")),
        200,
      ),
      ...(value !== undefined ? { value } : {}),
    };
    try {
      assertSafeData(entry);
      this.data.events.push(entry);
    } catch {
      this.data.complete = false;
      if (!this.data.limitations.includes("sensitive_input"))
        this.data.limitations.push("sensitive_input");
    }
  }
  stop(): Recording {
    if (!this.data || !this.active) throw Error("recording_incomplete");
    this.detach();
    this.data.stoppedAt = Date.now();
    this.data.final = observe(this.doc);
    if (this.data.final.path !== this.path)
      this.data.events.push({
        kind: "navigation",
        path: this.data.final.path,
        role: "page",
        label: "페이지 이동",
      });
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.clear(), RECORD_TTL);
    return structuredClone(this.data);
  }
  clear(): void {
    this.detach();
    clearTimeout(this.timer);
    this.data = undefined;
  }
  private detach(): void {
    this.active = false;
    this.doc.removeEventListener("click", this.capture, true);
    this.doc.removeEventListener("change", this.capture, true);
    this.doc.defaultView?.removeEventListener("pagehide", this.incomplete);
  }
}
