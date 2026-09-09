import type { BrowserCommand, Outcome } from "../shared/contracts.js";
import {
  resolveValue,
  type Locator,
  type Inputs,
} from "../shared/operation-schema.js";
import { AppError } from "../shared/errors.js";
import {
  observe,
  visible,
  sensitive,
  label,
  role,
  normalizeLabel,
} from "./observer.js";
export function find(
  locator: Locator,
  inputs: Inputs,
  doc: Document,
): Element[] {
  const value = resolveValue(locator.value, inputs).trim();
  return Array.from(doc.querySelectorAll("body *"))
    .filter((el) => visible(el) && !sensitive(el))
    .filter((el) => {
      if (locator.by === "label")
        return normalizeLabel(label(el)) === normalizeLabel(value);
      if (locator.by === "placeholder")
        return el.getAttribute("placeholder") === value;
      if (locator.by === "testid")
        return el.getAttribute("data-testid") === value;
      if (locator.by === "role")
        return (
          role(el) === (locator.role ?? "button") &&
          (label(el).trim() || el.textContent?.trim()) === value
        );
      return (
        el.textContent?.trim() === value &&
        !Array.from(el.children).some((c) => c.textContent?.trim() === value)
      );
    });
}
function unique(
  locator: Locator,
  inputs: Inputs,
  doc: Document,
  clickable = false,
): HTMLElement {
  let matches = find(locator, inputs, doc);
  if (clickable) {
    // Text locators can also match headings or a button's nested text span.
    // Resolve only actual interactive ancestors; never guess between two controls.
    const selector =
      "button,a[href],input[type=button],input[type=submit],[role=button],[role=link],[role=checkbox]";
    matches = [
      ...new Set(
        matches
          .map((el) => el.closest(selector))
          .filter((el): el is Element => !!el && visible(el) && !sensitive(el)),
      ),
    ];
  }
  if (!matches.length) throw new AppError("not_observed");
  if (matches.length > 1) throw new AppError("ambiguous");
  return matches[0] as HTMLElement;
}
export async function execute(
  command: BrowserCommand,
  doc: Document = document,
): Promise<Outcome> {
  if (Date.now() > command.expiresAt) throw new AppError("target_changed");
  const op = command.operation;
  const inputs = command.inputs;
  try {
    if (op.kind === "input") {
      const el = unique(op.locator, inputs, doc);
      if (!(
        el instanceof doc.defaultView!.HTMLInputElement ||
        el instanceof doc.defaultView!.HTMLTextAreaElement
      ))
        throw new AppError("unsupported");
      const descriptor = Object.getOwnPropertyDescriptor(
        Object.getPrototypeOf(el),
        "value",
      );
      if (el.disabled || el.readOnly) throw new AppError("unsupported");
      el.focus();
      // The side panel may retain browser focus; still deliver the input focus lifecycle.
      el.dispatchEvent(
        new doc.defaultView!.FocusEvent("focusin", {
          bubbles: true,
          composed: true,
        }),
      );
      const value = resolveValue(op.value, inputs);
      if (
        !el.dispatchEvent(
          new doc.defaultView!.InputEvent("beforeinput", {
            bubbles: true,
            cancelable: true,
            inputType: "insertReplacementText",
            data: value,
          }),
        )
      )
        throw new AppError("unsupported");
      descriptor?.set?.call(el, value);
      el.dispatchEvent(
        new doc.defaultView!.InputEvent("input", {
          bubbles: true,
          inputType: "insertReplacementText",
          data: value,
        }),
      );
      el.dispatchEvent(new doc.defaultView!.Event("change", { bubbles: true }));
      el.blur();
    }
    if (op.kind === "select") {
      const el = unique(op.locator, inputs, doc);
      if (!(el instanceof doc.defaultView!.HTMLSelectElement))
        throw new AppError("unsupported");
      el.value = resolveValue(op.value, inputs);
      el.dispatchEvent(new doc.defaultView!.Event("change", { bubbles: true }));
    }
    if (op.kind === "click") {
      const el = unique(op.locator, inputs, doc, true);
      if (
        el.matches(":disabled") ||
        el.getAttribute("aria-disabled") === "true"
      )
        throw new AppError("unsupported");
      el.click();
    }
    if (op.kind === "navigate") {
      const url = new URL(op.path, doc.location.origin);
      if (url.origin !== doc.location.origin)
        throw new AppError("target_changed");
      if (url.href !== doc.location.href) doc.location.assign(url.href);
    }
    if (op.kind === "wait") {
      const end = Math.min(command.expiresAt, Date.now() + op.timeoutMs);
      while (!find(op.locator, inputs, doc).length && Date.now() < end)
        await new Promise((r) => setTimeout(r, 100));
      unique(op.locator, inputs, doc);
    }
    const end = Math.min(command.expiresAt, Date.now() + 4000);
    let passed = false;
    do {
      passed = command.postconditions.every((p) => {
        const found = find(p.locator, inputs, doc);
        if (p.assert === "absent") return found.length === 0;
        if (found.length !== 1) return false;
        if (p.assert === "visible") return true;
        return (
          p.value !== undefined &&
          (found[0] as HTMLInputElement).value === resolveValue(p.value, inputs)
        );
      });
      if (passed) break;
      await new Promise((r) => setTimeout(r, 100));
    } while (Date.now() < end);
    return {
      status: passed ? "success" : "unknown",
      completed: [0],
      reason: passed
        ? "동작 후 상태를 관찰했습니다."
        : "동작 후 조건을 확인하지 못했습니다.",
      observation: observe(doc),
    };
  } catch (error) {
    return {
      status: "failure",
      completed: [],
      reason: error instanceof AppError ? error.code : "unsupported",
      observation: observe(doc),
    };
  }
}
