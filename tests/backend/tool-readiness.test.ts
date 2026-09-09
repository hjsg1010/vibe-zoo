import { it, expect } from "vitest";
import { toolReadinessIssue } from "../../src/shared/tool-readiness.js";
import type { Tool } from "../../src/shared/asset-schema.js";
const tab = { by: "testid" as const, value: { literal: "tab-results" } };
it("rejects a tab button as proof of opened content but accepts an observed result table", () => {
  const tool: Tool = {
    name: "open_results",
    description: "fixture",
    inputContract: [],
    adapter: {
      operations: [{ kind: "click", locator: tab, changesData: false }],
      postconditions: [{ locator: tab, assert: "visible" }],
    },
  };
  expect(toolReadinessIssue(tool)).toContain("버튼 자체");
  tool.adapter.postconditions = [
    {
      locator: { by: "testid", value: { literal: "results-table" } },
      assert: "visible",
    },
  ];
  expect(toolReadinessIssue(tool)).toBeUndefined();
});
it("does not accept a still visible form as proof that its submitted business value was saved", () => {
  const tool: Tool = {
    name: "create_item",
    description: "fixture",
    inputContract: [
      { name: "item", description: "item", type: "string", required: true },
    ],
    adapter: {
      operations: [
        {
          kind: "input",
          locator: { by: "label", value: { literal: "Name" } },
          value: { input: "item" },
        },
        {
          kind: "click",
          locator: { by: "text", value: { literal: "Save" } },
          changesData: true,
        },
      ],
      postconditions: [
        {
          locator: { by: "text", value: { literal: "Form" } },
          assert: "visible",
        },
      ],
    },
  };
  expect(toolReadinessIssue(tool)).toContain("업무 값");
  tool.adapter.postconditions = [
    {
      locator: { by: "role", role: "row", value: { input: "item" } },
      assert: "visible",
    },
  ];
  expect(toolReadinessIssue(tool)).toBeUndefined();
});
