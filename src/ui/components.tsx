import { useState, type PropsWithChildren } from "react";
import type { Job, Confirmation } from "../shared/contracts.js";
export function Card({
  title,
  children,
}: PropsWithChildren<{ title: string }>) {
  return (
    <section className="card">
      <h2>{title}</h2>
      {children}
    </section>
  );
}
export function Empty({ children }: PropsWithChildren) {
  return <p className="empty">{children}</p>;
}
const states: Record<Job["status"], string> = {
  queued: "접수됨",
  running: "진행 중",
  waiting_input: "입력이 필요해요",
  waiting_confirmation: "변경 확인을 기다려요",
  waiting_connection: "연결을 기다려요",
  completed: "작업 종료",
  failed: "확인이 필요해요",
  cancelled: "취소됨",
  unknown: "결과 미확인",
};
export function JobCard({
  job,
  onControl,
  onValidate,
  onReview,
  onRepair,
}: {
  job: Job & {
    confirmation?: Confirmation;
    hasUnknownActions?: boolean;
    canReviewNonExecution?: boolean;
    validationInputs?: Record<string, string | number | boolean>;
  };
  onValidate?: (
    job: Job,
    toolInputs: Record<string, string | number | boolean>,
    skillInputs: Record<string, string | number | boolean>,
  ) => Promise<void>;
  onReview?: (job: Job, reason: string) => Promise<void>;
  onRepair?: (job: Job) => Promise<void>;
  onControl: (
    job: Job,
    action: "cancel" | "confirm" | "reconcile",
    actionId?: string,
  ) => void;
}) {
  const [validationDraft, setValidationDraft] = useState("");
  const [reviewReason, setReviewReason] = useState("");
  const [validationError, setValidationError] = useState("");
  const terminal = ["completed", "failed", "cancelled"].includes(job.status);
  return (
    <article className="job" data-testid="job-card">
      <div className="row">
        <strong>{states[job.status]}</strong>
        <span className="tag">
          {
            {
              generation: "도구 준비",
              execution: "채팅",
              learning: "Skill 학습",
              install: "설치 검증",
              improvement: "개선 검증",
            }[job.kind]
          }
        </span>
      </div>
      <p>{job.purpose}</p>
      {job.outcome && (
        <p className="result" aria-live="polite">
          {job.outcome.reason}
        </p>
      )}
      {job.confirmation && (
        <div className="confirmation">
          <strong>이 탭에서 변경할까요?</strong>
          <p>대상 페이지: {job.confirmation.binding.path}</p>
          <p>
            {job.confirmation.operation.kind === "input"
              ? "값 입력"
              : job.confirmation.operation.kind === "select"
                ? "항목 선택"
                : "버튼 실행"}
            {"locator" in job.confirmation.operation &&
              ("literal" in job.confirmation.operation.locator.value
                ? ` · ${job.confirmation.operation.locator.value.literal}`
                : ` · ${String(job.confirmation.inputs[job.confirmation.operation.locator.value.input] ?? "")}`)}
          </p>
          <pre>{JSON.stringify(job.confirmation.inputs, null, 2)}</pre>
          <p className="hint">
            이미 수행한 변경은 취소해도 되돌아가지 않습니다.
          </p>
          <button
            data-testid="confirm-change"
            onClick={() =>
              onControl(job, "confirm", job.confirmation!.actionId)
            }
          >
            이 변경 실행
          </button>
        </div>
      )}
      {(job.status === "unknown" || job.hasUnknownActions) && (
        <button
          className="secondary"
          data-testid="reconcile-job"
          onClick={() => onControl(job, "reconcile")}
        >
          현재 사후 상태만 확인
        </button>
      )}
      {!terminal && (
        <button
          className="secondary"
          data-testid="cancel-job"
          onClick={() => onControl(job, "cancel")}
        >
          새 실행 중단
        </button>
      )}
      {job.status === "unknown" &&
        job.validationRequest &&
        !job.validatorRepair &&
        onRepair && (
          <button
            data-testid="repair-validator"
            onClick={() => {
              void onRepair(job).catch(() =>
                setValidationError("현재 대상과 작업 상태를 확인해주세요."),
              );
            }}
          >
            실제 결과로 검증 조건 수정
          </button>
        )}
      {job.hasUnknownActions && job.canReviewNonExecution && onReview && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void onReview(job, reviewReason).catch(() =>
              setValidationError("현재 대상과 검토 근거를 확인해주세요."),
            );
          }}
        >
          <p>
            사후 관찰만으로 이전 실행을 확정하지 못했습니다. 실제로 실행되지
            않았음을 확인한 경우에만 근거를 작성해주세요. 이전 성공으로
            표시하거나 자동 반복하지 않습니다.
          </p>
          <label htmlFor={`review-${job.id}`}>미실행 확인 근거</label>
          <textarea
            id={`review-${job.id}`}
            data-testid="non-execution-reason"
            value={reviewReason}
            onChange={(e) => setReviewReason(e.target.value)}
          />
          <button
            data-testid="review-not-executed"
            disabled={reviewReason.trim().length < 10}
          >
            미실행 근거를 확인했습니다
          </button>
        </form>
      )}
      {job.candidateId &&
        !job.assetValidation &&
        ["failed", "unknown"].includes(job.status) &&
        onValidate && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setValidationError("");
              try {
                const data = JSON.parse(validationDraft) as {
                  tool: Record<string, string | number | boolean>;
                  skill: Record<string, string | number | boolean>;
                };
                void onValidate(job, data.tool, data.skill).catch(() =>
                  setValidationError(
                    "입력과 미확인 동작의 상태를 확인해주세요.",
                  ),
                );
              } catch {
                setValidationError(
                  "도구와 Skill 검증 입력을 JSON으로 작성해주세요.",
                );
              }
            }}
          >
            <label htmlFor={`validate-${job.id}`}>
              고정 후보를 검증할 새 입력
            </label>
            {job.nonExecutionReview && (
              <p>
                이전 기록은 보존하고 서로 다른 새 입력으로 별도 검증을
                시작합니다. 이미 완료한 업무를 같은 입력으로 반복하지 마세요.
              </p>
            )}
            <p className="hint">
              새로 생성하지 않고 같은 후보를 사용합니다. 이전 입력:{" "}
              {JSON.stringify(job.validationInputs ?? {})}
            </p>
            <textarea
              id={`validate-${job.id}`}
              data-testid="validation-inputs"
              placeholder={
                '{"tool": {"입력명": "새 값"}, "skill": {"입력명": "다른 새 값"}}'
              }
              value={validationDraft}
              onChange={(e) => setValidationDraft(e.target.value)}
            />
            {validationError && <p role="alert">{validationError}</p>}
            <button
              data-testid="validate-candidate"
              disabled={!validationDraft.trim() || job.hasUnknownActions}
            >
              이 입력으로 후보 검증
            </button>
          </form>
        )}
      <div className="metrics">
        브라우저 {job.budget.browserOps}회 · 모델 {job.budget.modelRequests}회
      </div>
    </article>
  );
}

export function AssetValidationForm({
  contract,
  onSubmit,
  submitLabel = "이 자산만 검증",
  guidance = "이 자산만 새로운 입력으로 검증합니다. 이미 완료한 작업과 다른 값을 사용해주세요.",
  disabled = false,
}: {
  contract: import("../shared/asset-schema.js").Tool["inputContract"];
  submitLabel?: string;
  guidance?: string;
  disabled?: boolean;
  onSubmit: (
    inputs: Record<string, string | number | boolean>,
  ) => Promise<void>;
}) {
  const [values, setValues] = useState<
    Record<string, string | number | boolean>
  >({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setBusy(true);
        setError("");
        void onSubmit({
          ...Object.fromEntries(
            contract
              .filter((f) => f.type === "boolean" && f.required)
              .map((f) => [f.name, false]),
          ),
          ...values,
        })
          .catch(() => setError("필수 입력과 이전 검증 상태를 확인해주세요."))
          .finally(() => setBusy(false));
      }}
    >
      <p>{guidance}</p>
      {contract.map((field) => (
        <label key={field.name}>
          {field.description || field.name}
          <input
            data-testid={`asset-validation-${field.name}`}
            type={
              field.type === "boolean"
                ? "checkbox"
                : field.type === "number"
                  ? "number"
                  : "text"
            }
            required={field.required && field.type !== "boolean"}
            {...(field.type === "boolean"
              ? { checked: values[field.name] === true }
              : { value: String(values[field.name] ?? "") })}
            onChange={(e) =>
              setValues((v) => ({
                ...v,
                [field.name]:
                  field.type === "boolean"
                    ? e.target.checked
                    : field.type === "number"
                      ? Number(e.target.value)
                      : e.target.value,
              }))
            }
          />
        </label>
      ))}
      {error && <p role="alert">{error}</p>}
      <button data-testid="validate-asset" disabled={busy || disabled}>
        {submitLabel}
      </button>
    </form>
  );
}
