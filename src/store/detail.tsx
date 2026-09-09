import { useState } from "react";
import { type ApiClient, errorMessage } from "../ui/api-client.js";
import { Card, AssetValidationForm } from "../ui/components.js";
import type { Inputs } from "../shared/operation-schema.js";
import type { CatalogItem } from "./catalog.js";
export function Detail({
  item,
  api,
  onRefresh,
}: {
  item: CatalogItem;
  api: ApiClient;
  onRefresh: () => Promise<void>;
}) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [dependencies, setDependencies] = useState<Record<string, Inputs>>({});
  const [started, setStarted] = useState(false);
  const main = item.versions.find((v) => v.ref === item.mainRef)!;
  return (
    <Card title={item.name}>
      <p>{item.description}</p>
      <p>
        {item.author} · {item.scope}
      </p>
      <p>{item.validation}</p>
      <p className="hint">{item.limitations}</p>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {!item.installation ? (
        <button
          data-testid="store-install"
          disabled={busy}
          onClick={() => {
            setBusy(true);
            void api
              .call(`/api/publications/${item.id}/install`, {})
              .then(onRefresh)
              .catch((e) => setError(errorMessage(e)))
              .finally(() => setBusy(false));
          }}
        >
          이 고정 버전 설치
        </button>
      ) : (
        <>
          <p>
            내 영역에 설치됐습니다. 로그인한 MinIO 탭의 Keeper를 연결하고, 아래
            새 입력으로 도구와 Skill을 각각 검증해주세요.
          </p>
          {item.versions
            .filter((v) => v.ref !== item.mainRef)
            .map((v) => (
              <section key={v.ref}>
                <h3>의존 도구: {v.content.name}</h3>
                <AssetValidationForm
                  submitLabel="이 도구 입력 준비"
                  guidance="전체 검증에 사용할 새 값을 준비합니다. 이 버튼은 아직 실행하지 않습니다."
                  contract={v.content.inputContract}
                  onSubmit={async (inputs) => {
                    setDependencies((old) => ({
                      ...old,
                      [item.installation!.versions[v.ref]!]: inputs,
                    }));
                  }}
                />
                {dependencies[item.installation!.versions[v.ref]!] && (
                  <p>이 도구의 검증 입력을 준비했습니다.</p>
                )}
              </section>
            ))}
          <h3>선택한 자산의 새 입력</h3>
          {!started && (
            <AssetValidationForm
              submitLabel="내 탭에서 전체 검증"
              disabled={item.versions.some(
                (v) =>
                  v.ref !== item.mainRef &&
                  !dependencies[item.installation!.versions[v.ref]!],
              )}
              contract={main.content.inputContract}
              onSubmit={async (inputs) => {
                const state = await api.state();
                if (!state.binding) throw Error("disconnected");
                await api.call("/api/installation/validate", {
                  request: {
                    requestKey: crypto.randomUUID(),
                    conversationId: crypto.randomUUID(),
                    binding: state.binding,
                    purpose: "Store 설치 자산을 내 탭에서 검증",
                    inputs,
                  },
                  validation: {
                    publicationId: item.id,
                    dependencyInputs: dependencies,
                  },
                });
                setStarted(true);
              }}
            />
          )}
          <p>
            변경 확인과 실행 결과는 로그인한 업무 탭의 Keeper 채팅에서
            확인해주세요.
          </p>
        </>
      )}
    </Card>
  );
}
