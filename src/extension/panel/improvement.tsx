import { useEffect, useState } from "react";
import {
  type ApiClient,
  type State,
  errorMessage,
} from "../../ui/api-client.js";
import { AssetValidationForm } from "../../ui/components.js";
import type { Inputs } from "../../shared/operation-schema.js";
import type { Job } from "../../shared/contracts.js";
import type { Version, ValidationReport } from "../../shared/asset-schema.js";
type Case = {
  id: string;
  status: "passed" | "failed";
  inputs: Inputs;
  reason?: string;
  createdAt: number;
};
type Detail = {
  job: Job;
  candidate?: Version;
  reports: ValidationReport[];
  digest: string;
};
export function AssetImprovement({
  asset,
  api,
  state,
  onChanged,
}: {
  asset: State["assets"][number];
  api: ApiClient;
  state: State;
  onChanged: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [cases, setCases] = useState<Case[]>([]);
  const [failure, setFailure] = useState("");
  const [success, setSuccess] = useState("");
  const [purpose, setPurpose] = useState("");
  const [error, setError] = useState("");
  const [detail, setDetail] = useState<Detail>();
  const [failureInputs, setFailureInputs] = useState<Inputs>();
  const [busy, setBusy] = useState(false);
  const latest = state.jobs.find((j) => j.improvement?.assetId === asset.id);
  useEffect(() => {
    if (!open) return;
    let active = true;
    void api
      .call<{ cases: Case[] }>(`/api/assets/${asset.id}/improvement-cases`)
      .then((r) => {
        if (active) setCases(r.cases);
      })
      .catch((e) => {
        if (active) setError(errorMessage(e));
      });
    if (latest)
      void api
        .call<Detail>(`/api/improvement/${latest.id}`)
        .then((r) => {
          if (active) setDetail(r);
        })
        .catch((e) => {
          if (active) setError(errorMessage(e));
        });
    return () => {
      active = false;
    };
  }, [
    open,
    api,
    asset.id,
    asset.currentVersionId,
    latest?.id,
    latest?.controlRevision,
  ]);
  if (!asset.currentVersionId) return null;
  const act = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError("");
    try {
      await fn();
      await onChanged();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  const failures = cases.filter((c) => c.status === "failed");
  const successes = cases.filter((c) => c.status === "passed");
  const pending =
    latest && !["completed", "failed", "cancelled"].includes(latest.status);
  const candidate = detail?.candidate;
  const valid =
    detail &&
    !detail.job.cancelled &&
    detail.job.status === "completed" &&
    ["failure_reproduction", "success_regression"].every((kind) =>
      detail.reports.some((r) => r.caseKind === kind && r.status === "passed"),
    );
  return (
    <section>
      <button
        className="secondary"
        data-testid="improvement-open"
        onClick={() => setOpen(!open)}
      >
        개선·이전 버전
      </button>
      {open && (
        <>
          <p>
            현재 버전의 실패와 관련 성공 사례를 비교합니다. 후보 검증만으로 사용
            버전을 바꾸지 않습니다.
          </p>
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
          {!failures.length && (
            <p data-testid="improvement-no-failure">
              재현 근거가 있는 실패 기록이 아직 없습니다. 정상 업무를 일부러
              실패시키지 않아도 됩니다.
            </p>
          )}
          {!!failures.length && !!successes.length && !pending && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void act(async () => {
                  if (!state.binding) throw Error("disconnected");
                  await api.call("/api/improvement", {
                    assetId: asset.id,
                    expectedCurrent: asset.currentVersionId,
                    failureReportId: failure,
                    successReportId: success,
                    request: {
                      requestKey: crypto.randomUUID(),
                      conversationId: crypto.randomUUID(),
                      binding: state.binding,
                      purpose,
                      inputs: {},
                    },
                  });
                  setFailureInputs(undefined);
                });
              }}
            >
              <label>
                실패 사례
                <select
                  data-testid="improvement-failure"
                  required
                  value={failure}
                  onChange={(e) => setFailure(e.target.value)}
                >
                  <option value="">선택해주세요</option>
                  {failures.map((c) => (
                    <option key={c.id} value={c.id}>
                      {JSON.stringify(c.inputs)} · {c.reason}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                관련 성공 사례
                <select
                  data-testid="improvement-success"
                  required
                  value={success}
                  onChange={(e) => setSuccess(e.target.value)}
                >
                  <option value="">선택해주세요</option>
                  {successes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {JSON.stringify(c.inputs)} · {c.reason}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                개선할 점
                <textarea
                  data-testid="improvement-purpose"
                  required
                  maxLength={2000}
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                />
              </label>
              <button
                data-testid="improvement-propose"
                disabled={busy || !state.binding}
              >
                이 사례로 개선 후보 만들기
              </button>
            </form>
          )}
          {detail && (
            <article>
              <h4>최근 개선 후보</h4>
              <p>
                {detail.job.improvement?.reason ?? "사례를 분석하고 있습니다."}
              </p>
              {candidate && (
                <details>
                  <summary>후보 동작과 검증 조건 확인</summary>
                  <pre>
                    {JSON.stringify(
                      "adapter" in candidate.content
                        ? candidate.content.adapter
                        : {
                            steps: candidate.content.steps.map((s) => ({
                              arguments: s.arguments,
                              bindings: s.bindings,
                            })),
                            dependencies: "기존 고정 도구 사용",
                          },
                      null,
                      2,
                    )}
                  </pre>
                </details>
              )}
              {detail.job.improvement?.phase === "draft" &&
                !detail.job.cancelled &&
                candidate && (
                  <>
                    <h4>실패 상황을 검증할 새 입력</h4>
                    <p>
                      실패 당시의 화면 조건을 준비하고 새 값을 사용해주세요.
                      원래 입력으로 완료된 동작을 반복하지 않습니다.
                    </p>
                    <AssetValidationForm
                      contract={candidate.content.inputContract}
                      submitLabel="실패 사례 입력 준비"
                      guidance="입력 준비만 수행하며 아직 실행하지 않습니다."
                      onSubmit={async (inputs) => setFailureInputs(inputs)}
                    />
                    {failureInputs && (
                      <p>실패 사례의 새 입력을 준비했습니다.</p>
                    )}
                    <h4>관련 성공 사례의 새 입력</h4>
                    <AssetValidationForm
                      contract={candidate.content.inputContract}
                      submitLabel="두 사례 검증 시작"
                      guidance="각 변경은 채팅의 대상·입력 확인을 거칩니다. 첫 사례가 통과해야 다음 사례를 실행합니다."
                      disabled={!failureInputs || busy}
                      onSubmit={async (successInputs) => {
                        await api.call(
                          `/api/improvement/${detail.job.id}/validate`,
                          {
                            revision: detail.job.controlRevision,
                            candidateId: candidate.id,
                            failureInputs,
                            successInputs,
                          },
                        );
                        await onChanged();
                      }}
                    />
                  </>
                )}
              {detail.reports.map((r) => (
                <p key={r.id}>
                  {r.caseKind === "failure_reproduction"
                    ? "실패 사례 재검증"
                    : "관련 성공 사례 회귀"}
                  :{" "}
                  {r.status === "passed"
                    ? "통과"
                    : r.status === "unknown"
                      ? "미확인"
                      : "실패"}{" "}
                  · {JSON.stringify(r.inputs)}
                </p>
              ))}
              {detail.job.improvement?.appliedDigest ? (
                <p role="status">
                  이 후보의 적용이 기록됐습니다. 이후 버전 선택은 현재 자산
                  상태를 따릅니다.
                </p>
              ) : (
                valid && (
                  <button
                    data-testid="improvement-apply"
                    disabled={
                      busy ||
                      asset.currentVersionId !==
                        detail.job.improvement?.baseVersionId
                    }
                    onClick={() =>
                      void act(() =>
                        api.call(`/api/improvement/${detail.job.id}/apply`, {
                          revision: detail.job.controlRevision,
                          assetRevision: asset.revision,
                          candidateId: candidate!.id,
                          expectedCurrent:
                            detail.job.improvement!.baseVersionId,
                          digest: detail.digest,
                        }),
                      )
                    }
                  >
                    검증한 후보 적용
                  </button>
                )
              )}
              <p className="hint">
                변경 확인·취소와 실행 결과는 채팅의 진행 상황에서 확인합니다.
              </p>
            </article>
          )}
          {asset.previousVersionId && (
            <button
              className="secondary"
              data-testid="improvement-rollback"
              disabled={busy}
              onClick={() =>
                void act(() =>
                  api.call(`/api/assets/${asset.id}/rollback`, {
                    revision: asset.revision,
                    expectedCurrent: asset.currentVersionId,
                    versionId: asset.previousVersionId,
                  }),
                )
              }
            >
              보존한 이전 버전으로 복구
            </button>
          )}
          <p className="hint">
            적용·복구는 이후 요청의 사용 버전만 바꿉니다. 진행 중 실행과 개인
            설정은 유지하며 웹앱 변경을 되돌리지는 않습니다.
          </p>
        </>
      )}
    </section>
  );
}
