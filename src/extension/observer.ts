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
      INPUT:
        (el as HTMLInputElement).type === "checkbox" ? "checkbox" : "textbox",
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
      "button,a,input,textarea,select,[role],[data-testid],[aria-label],h1,h2,h3,td,th,label,p,dt,dd,table",
    ),
  ).filter(visible);
  if (candidates.some(sensitive)) limitations.push("sensitive_fields");
  const safe = candidates.filter(
    (el) =>
      !sensitive(el) &&
      !el.closest("form")?.querySelector("input[type=password]"),
  );
  // Keep controls before repeated table cells so large dashboards do not hide navigation/forms.
  const controls = safe.filter((el) =>
    el.matches(
      "button,a,input,textarea,select,[role=button],[role=tab],[role=checkbox],h1,h2,h3",
    ),
  );
  const results = safe.filter(
    (el) => !controls.includes(el) && el.matches("[data-testid],table,dt,dd"),
  );
  const selected = [
    ...controls,
    ...results,
    ...safe.filter((el) => !controls.includes(el) && !results.includes(el)),
  ];
  const elements = selected.slice(0, 180).map((el) => ({
    role: role(el),
    ...(el.matches("a[href]")
      ? (() => {
          const url = new URL(el.getAttribute("href")!, doc.location.href);
          return url.origin === doc.location.origin &&
            !url.search &&
            !sensitiveName.test(url.pathname)
            ? { href: url.pathname + url.hash }
            : {};
        })()
      : {}),
    ...(el.matches("select")
      ? {
          value: cleanText((el as HTMLSelectElement).value, 200),
          options: Array.from((el as HTMLSelectElement).options)
            .slice(0, 40)
            .map((o) => ({
              text: cleanText(o.text, 100),
              value: cleanText(o.value, 100),
            })),
        }
      : {}),
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
