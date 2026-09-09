// @vitest-environment jsdom
import { it, expect } from "vitest";
import { observe } from "../../src/extension/observer.js";
import { execute } from "../../src/extension/executor.js";
import { binding } from "../helpers/fixtures.js";
import type { BrowserCommand } from "../../src/shared/contracts.js";
const command = (operation: BrowserCommand["operation"]): BrowserCommand => ({
  type: "action",
  actionId: "fixture-action",
  jobId: "fixture-job",
  controlRevision: 1,
  binding,
  expiresAt: Date.now() + 10000,
  operation,
  inputs: { bucket: "new-synthetic-bucket" },
  postconditions: [],
});
it("resolves text clicks to interactive controls without clicking matching headings", async () => {
  document.body.innerHTML =
    "<h1>Create Bucket</h1><button><span>Create Bucket</span></button>";
  let clicks = 0;
  document.querySelector("button")!.addEventListener("click", () => clicks++);
  const result = await execute(
    command({
      kind: "click",
      locator: { by: "text", value: { literal: "Create Bucket" } },
      changesData: true,
    }),
  );
  expect(result.status).toBe("success");
  expect(clicks).toBe(1);
  document.body.insertAdjacentHTML(
    "beforeend",
    "<button>Create Bucket</button>",
  );
  const duplicate = await execute(
    command({
      kind: "click",
      locator: { by: "text", value: { literal: "Create Bucket" } },
      changesData: true,
    }),
  );
  expect(duplicate.reason).toBe("ambiguous");
  expect(clicks).toBe(1);
});
it("collects bounded public controls, never password values, auth labels or hidden fields", () => {
  document.body.innerHTML =
    '<input type="password" value="private"><input name="api_token" value="private"><button>목록</button><iframe></iframe><canvas></canvas>';
  const o = observe();
  expect(JSON.stringify(o)).not.toContain("private");
  expect(o.elements.some((e) => e.text === "목록")).toBe(true);
  expect(o.limitations).toEqual(
    expect.arrayContaining(["frame", "canvas", "sensitive_fields"]),
  );
});
it("stops on ambiguous or absent locators and applies changed input with DOM events", async () => {
  document.body.innerHTML =
    '<button>생성</button><button>생성</button><label for="name">이름</label><input id="name">';
  const ambiguous = await execute(
    command({
      kind: "click",
      locator: { by: "text", value: { literal: "생성" } },
      changesData: true,
    }),
  );
  expect(ambiguous.reason).toBe("ambiguous");
  const missing = await execute(
    command({
      kind: "click",
      locator: { by: "text", value: { literal: "없음" } },
      changesData: false,
    }),
  );
  expect(missing.reason).toBe("not_observed");
  const input = await execute(
    command({
      kind: "input",
      locator: { by: "label", value: { literal: "이름" } },
      value: { input: "bucket" },
    }),
  );
  expect(input.status).toBe("success");
  expect((document.querySelector("input") as HTMLInputElement).value).toBe(
    "new-synthetic-bucket",
  );
});

it("matches an accessible required-field label without its decorative asterisk, while retaining ambiguity protection", async () => {
  document.body.innerHTML =
    '<label for="required">Bucket Name <span>*</span></label><input id="required" required>';
  const result = await execute(
    command({
      kind: "input",
      locator: { by: "label", value: { literal: "Bucket Name" } },
      value: { input: "bucket" },
    }),
  );
  expect(result.status).toBe("success");
  expect((document.querySelector("input") as HTMLInputElement).value).toBe(
    "new-synthetic-bucket",
  );
  document.body.insertAdjacentHTML(
    "beforeend",
    '<label for="other">Bucket Name</label><input id="other">',
  );
  const ambiguous = await execute(
    command({
      kind: "input",
      locator: { by: "label", value: { literal: "Bucket Name" } },
      value: { input: "bucket" },
    }),
  );
  expect(ambiguous.reason).toBe("ambiguous");
});

it("delivers focused input/commit events and never reports a disabled click as executed", async () => {
  document.body.innerHTML =
    '<label for="name">Name</label><input id="name"><button disabled>Create</button>';
  const field = document.querySelector("input")!;
  const button = document.querySelector("button")!;
  const phases: string[] = [];
  field.addEventListener("input", (e) => {
    expect(document.activeElement).toBe(field);
    expect(e).toBeInstanceOf(InputEvent);
    phases.push("input");
  });
  field.addEventListener("blur", () => {
    phases.push("blur");
    button.disabled = false;
  });
  const blocked = await execute(
    command({
      kind: "click",
      locator: { by: "text", value: { literal: "Create" } },
      changesData: true,
    }),
  );
  expect(blocked.completed).toEqual([]);
  expect(blocked.status).toBe("failure");
  await execute(
    command({
      kind: "input",
      locator: { by: "label", value: { literal: "Name" } },
      value: { input: "bucket" },
    }),
  );
  expect(phases).toEqual(["input", "blur"]);
  expect(button.disabled).toBe(false);
});

it("delivers focusin when a side panel prevents native document focus", async () => {
  document.body.innerHTML =
    '<label for="name">Name</label><input id="name"><button disabled>Create</button>';
  const field = document.querySelector("input")!;
  const button = document.querySelector("button")!;
  field.focus = () => {};
  field.addEventListener("focusin", () => {
    button.disabled = false;
  });
  await execute(
    command({
      kind: "input",
      locator: { by: "label", value: { literal: "Name" } },
      value: { input: "bucket" },
    }),
  );
  expect(button.disabled).toBe(false);
  expect(field.value).toBe("new-synthetic-bucket");
});
