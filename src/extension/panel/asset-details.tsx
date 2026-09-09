import { useState } from "react";
import { ApiClient, errorMessage } from "../../ui/api-client.js";
import type { Version } from "../../shared/asset-schema.js";

type Detail = {
  version: Version;
  active: boolean;
  dependencies: { versionId: string; name: string; description: string }[];
};
export function AssetDetails({
  assetId,
  api,
}: {
  assetId: string;
  api: ApiClient;
}) {
  const [detail, setDetail] = useState<Detail>();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const inspect = async () => {
    if (open) {
      setOpen(false);
      return;
    }
    setOpen(true);
    setLoading(true);
    setError("");
    setDetail(undefined);
    try {
      setDetail(
        await api.call<Detail>(
          `/api/assets/${encodeURIComponent(assetId)}/details`,
        ),
      );
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  };
  return (
    <section className="asset-details">
      <button
        className="secondary"
        aria-expanded={open}
        onClick={() => void inspect()}
      >
        도구·Skill 구성 보기
      </button>
      {open && (
        <div>
          {loading && <p role="status">구성을 불러오고 있어요…</p>}
          {error && <p role="alert">{error}</p>}
          {detail && (
            <>
              <p className="hint">
                {detail.active ? "현재 적용된 버전" : "아직 적용되지 않은 후보"}{" "}
                ·{" "}
                {detail.version.kind === "tool"
                  ? "브라우저 MCP 도구"
                  : "도구를 조합한 Skill"}
              </p>
              <h3>필요한 입력</h3>
              {detail.version.content.inputContract.length ? (
                <ul>
                  {detail.version.content.inputContract.map((field) => (
                    <li key={field.name}>
                      <strong>{field.name}</strong> ·{" "}
                      {field.required ? "필수" : "선택"}
                      <p>{field.description}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>추가 입력 없이 실행합니다.</p>
              )}
              {"adapter" in detail.version.content ? (
                <>
                  <h3>브라우저 작업 순서</h3>
                  <ol>
                    {detail.version.content.adapter.operations.map(
                      (operation, i) => (
                        <li key={i}>
                          {
                            {
                              observe: "현재 화면 관찰",
                              navigate: "페이지 이동",
                              click: "버튼·항목 클릭",
                              input: "값 입력",
                              select: "항목 선택",
                              wait: "화면 요소 대기",
                            }[operation.kind]
                          }
                          {"locator" in operation &&
                            ` · ${"literal" in operation.locator.value ? operation.locator.value.literal : `입력 ${operation.locator.value.input}`}`}
                        </li>
                      ),
                    )}
                  </ol>
                  <h3>실행 후 확인할 결과</h3>
                  <ul>
                    {detail.version.content.adapter.postconditions.map(
                      (condition, i) => (
                        <li key={i}>
                          {"literal" in condition.locator.value
                            ? condition.locator.value.literal
                            : `입력 ${condition.locator.value.input}`}{" "}
                          ·{" "}
                          {
                            {
                              visible: "화면에 표시",
                              absent: "화면에서 사라짐",
                              value: "입력값 일치",
                            }[condition.assert]
                          }
                        </li>
                      ),
                    )}
                  </ul>
                </>
              ) : (
                <>
                  <h3>Skill의 도구 실행 순서</h3>
                  <ol>
                    {detail.version.content.steps.map((step, i) => (
                      <li key={i}>
                        {detail.dependencies.find(
                          (dependency) =>
                            dependency.versionId === step.toolVersionId,
                        )?.name ?? "연결된 도구"}
                        <p>
                          {Object.entries(step.bindings)
                            .map(
                              ([argument, input]) => `${argument} ← ${input}`,
                            )
                            .join(", ") || "저장된 입력 사용"}
                        </p>
                      </li>
                    ))}
                  </ol>
                </>
              )}
            </>
          )}
        </div>
      )}
    </section>
  );
}
