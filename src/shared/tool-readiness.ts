import type { Tool } from "./asset-schema.js";

/** A visible control is not evidence that clicking it completed a business task. */
export function toolReadinessIssue(tool: Tool): string | undefined {
  const clicks = tool.adapter.operations.filter((op) => op.kind === "click");
  const sameLocator = (a: unknown, b: unknown) =>
    JSON.stringify(a) === JSON.stringify(b);
  if (
    clicks.length &&
    tool.adapter.postconditions.every(
      (p) =>
        p.assert === "visible" &&
        clicks.some((op) => sameLocator(op.locator, p.locator)),
    )
  )
    return "클릭할 버튼 자체만 성공 조건으로 되어 있습니다. 이동 후 결과 화면을 열고 추가 탐색해주세요.";
  if (
    clicks.some((op) => op.changesData) &&
    tool.adapter.operations.some((op) => op.kind === "input") &&
    !tool.adapter.postconditions.some(
      (p) => p.assert !== "value" && "input" in p.locator.value,
    )
  )
    return "입력한 업무 값이 반영된 결과를 확인할 조건이 부족합니다. 결과 화면을 관찰해 도구를 보완해주세요.";
  return undefined;
}
