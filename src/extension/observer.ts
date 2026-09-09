import type { Observation } from "../shared/contracts.js";
import { sensitiveName, cleanText } from "../shared/redaction.js";
export function visible(el: Element): boolean {
  const style = el.ownerDocument.defaultView?.getComputedStyle(el);
  return (
    !el.closest('[hidden],[aria-hidden="true"]') &&
    style?.display !== "none" &&
    style?.visibility !== "hidden"
  );
}
export function normalizeLabel(value: string): string {
  return value
    .replace(/\s+/g, " ")
    .replace(/\s*\*+\s*$/, " ")
    .trim();
}
export function label(el: Element): string {
  const aria = el.getAttribute("aria-label");
  if (aria) return normalizeLabel(aria);
  const labelled = el.getAttribute("aria-labelledby");
  if (labelled)
    return labelled
      .split(/\s+/)
      .map((id) => el.ownerDocument.getElementById(id)?.textContent ?? "")
      .join(" ");
  const labels = (el as HTMLInputElement).labels;
  if (labels?.length)
    return normalizeLabel(
      Array.from(labels)
        .map((l) => l.textContent ?? "")
        .join(" "),
    );
  return el.getAttribute("title") ?? "";
}
export function sensitive(el: Element): boolean {
  return (
    el.matches("input[type=password],input[type=hidden],input[type=file]") ||
    sensitiveName.test(
      [
        el.getAttribute("name"),
        el.id,
        el.getAttribute("autocomplete"),
        label(el),
        el.getAttribute("placeholder"),
        el.matches("button,a,[role=button]") ? el.textContent : "",
      ].join(" "),
    )
  );
}
export function role(el: Element): string {
  return (
    el.getAttribute("role") ??
    {
      BUTTON: "button",
      A: "link",
      INPUT: "textbox",
      TEXTAREA: "textbox",
      SELECT: "combobox",
      OPTION: "option",
      TR: "row",
      TD: "cell",
      TH: "cell",
      H1: "heading",
      H2: "heading",
      H3: "heading",
    }[el.tagName] ??
    "text"
  );
}
export function observe(doc: Document = document): Observation {
  const limitations: Observation["limitations"] = [];
  if (doc.querySelector("iframe")) limitations.push("frame");
  if (doc.querySelector("canvas")) limitations.push("canvas");
  const candidates = Array.from(
    doc.querySelectorAll(
      "button,a,input,textarea,select,[role],h1,h2,h3,td,th,label,p",
    ),
  ).filter(visible);
  if (candidates.some(sensitive)) limitations.push("sensitive_fields");
  const elements = candidates
    .filter(
      (el) =>
        !sensitive(el) &&
        !el.closest("form")?.querySelector("input[type=password]"),
    )
    .slice(0, 180)
    .map((el) => ({
      role: role(el),
      ...(el.matches("button,input,textarea,select,[role=button]")
        ? {
            disabled:
              el.matches(":disabled") ||
              el.getAttribute("aria-disabled") === "true",
          }
        : {}),
      label: cleanText(label(el), 200),
      text: cleanText(
        el.matches("input,textarea,select") ? "" : (el.textContent ?? ""),
        300,
      ),
      ...(el.getAttribute("placeholder")
        ? { placeholder: cleanText(el.getAttribute("placeholder")!, 100) }
        : {}),
      ...(el.getAttribute("data-testid")
        ? { testid: cleanText(el.getAttribute("data-testid")!, 100) }
        : {}),
    }));
  if (candidates.length > 180) limitations.push("truncated");
  return {
    title: cleanText(doc.title, 200),
    path: cleanText(doc.location?.pathname ?? "/", 500),
    elements,
    limitations,
  };
}
