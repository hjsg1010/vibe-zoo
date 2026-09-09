import { useEffect, useRef, useState } from "react";
import {
  type ApiClient,
  type State,
  errorMessage,
} from "../../ui/api-client.js";
import { Card, AssetValidationForm } from "../../ui/components.js";
import { type Recording, RECORD_TTL } from "../../shared/recording.js";
import type { Binding } from "../../shared/contracts.js";
export function Learning({
  api,
  state,
  conversationId,
  onChange,
}: {
  api: ApiClient;
  state: State;
  conversationId: string;
  onChange: () => Promise<void>;
}) {
  const [stage, setStage] = useState<"idle" | "recording" | "stopped">("idle");
  const [intent, setIntent] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const draft = useRef<
    | { id: string; recording?: Recording; binding?: Binding; key: string }
    | undefined
  >(undefined);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const clear = async () => {
    clearTimeout(timer.current);
    const old = draft.current;
    draft.current = undefined;
    await chrome.runtime
      .sendMessage({ type: "record_clear" })
      .catch(() => undefined);
    if (old)
      await api
        .call("/api/record/cancel", { id: old.id })
        .catch(() => undefined);
    setStage("idle");
    setIntent("");
  };
  useEffect(
    () => () => {
      clearTimeout(timer.current);
      const old = draft.current;
      draft.current = undefined;
      void chrome.runtime
        .sendMessage({ type: "record_clear" })
        .catch(() => undefined);
      if (old)
        void api
          .call("/api/record/cancel", { id: old.id })
          .catch(() => undefined);
    },
    [api],
  );
  const act = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  const start = () =>
    act(async () => {
      if (!state.binding) throw Error("disconnected");
      const lease = await api.call<{ id: string }>("/api/record/start", {
        binding: state.binding,
      });
      draft.current = { id: lease.id, key: crypto.randomUUID() };
      const result = await chrome.runtime.sendMessage({ type: "record_start" });
      if (!result?.ok) {
        await clear();
        throw Error("recording_incomplete");
      }
      setStage("recording");
      timer.current = setTimeout(() => {
        void clear();
        setError("기록 시간이 만료되었습니다. 다시 Record를 시작해주세요.");
      }, RECORD_TTL);
    });
  const stop = () =>
    act(async () => {
      const result = await chrome.runtime.sendMessage({ type: "record_stop" });
      if (!result?.ok || !draft.current) {
        await clear();
        throw Error("recording_incomplete");
      }
      const current = await api.state();
      if (!current.binding) {
        await clear();
        throw Error("disconnected");
      }
      await api.call("/api/record/stop", {
        id: draft.current.id,
        binding: current.binding,
      });
      draft.current.recording = result.recording;
      draft.current.binding = current.binding;
      // Only the mounted panel holds the stopped buffer; clear the isolated content buffer now.
      await chrome.runtime.sendMessage({ type: "record_clear" });
      clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        void clear();
        setError("멈춘 기록의 보관 시간이 만료되었습니다.");
      }, RECORD_TTL);
      setStage("stopped");
      await onChange();
    });
  const submit = () =>
    act(async () => {
      const d = draft.current;
      if (!d?.recording || !d.binding || !intent.trim()) return;
      await api.call("/api/record/submit", {
        id: d.id,
        recording: d.recording,
        request: {
          requestKey: d.key,
          conversationId,
          binding: d.binding,
          purpose: intent.trim(),
          inputs: {},
        },
      });
      // Backend acknowledged the learning Job; discard all raw events immediately.
      await clear();
      await onChange();
    });
  return (
    <Card title="내 업무 가르치기">
      <p>
        현재 연결한 탭의 클릭·입력·같은 문서 안의 이동을 기록해요. 비밀번호와
        인증 정보는 제외합니다. 다른 문서·출처로 이동하면 재시연이 필요할 수
        있어요.
      </p>
      <p className="hint">
        합성 MinIO 데모에만 사용해주세요. 기록 중 자동 브라우저 작업은 대기하며,
        Stop만으로 학습하거나 재생하지 않아요.
      </p>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {stage === "idle" && (
        <button
          data-testid="record-start"
          disabled={busy || !state.binding}
          onClick={() => void start()}
        >
          Record 시작
        </button>
      )}
      {stage === "recording" && (
        <>
          <p role="status">기록 중 · 업무 탭에서 직접 시연해주세요.</p>
          <button
            data-testid="record-stop"
            disabled={busy}
            onClick={() => void stop()}
          >
            Stop
          </button>
        </>
      )}
      {stage === "stopped" && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <p>기록을 멈췄습니다. 무엇을 반복하고 싶은지 직접 설명해주세요.</p>
          <label htmlFor="learning-intent">시연한 업무의 의도</label>
          <textarea
            id="learning-intent"
            data-testid="learning-intent"
            required
            maxLength={2000}
            value={intent}
            onChange={(e) => setIntent(e.target.value)}
          />
          <button
            data-testid="learning-submit"
            disabled={busy || !intent.trim()}
          >
            이 의도로 Skill 초안 만들기
          </button>
        </form>
      )}
      {stage !== "idle" && (
        <button
          className="secondary"
          data-testid="record-cancel"
          disabled={busy}
          onClick={() => void act(clear)}
        >
          기록 버리기
        </button>
      )}
      {state.jobs
        .filter((j) => j.kind === "learning")
        .map((j) => (
          <article className="asset" key={j.id}>
            <h3>{j.purpose}</h3>
            <p>
              {j.outcome?.reason ??
                "시연 근거와 의도를 연결해 초안을 만드는 중입니다."}
            </p>
            {j.status === "waiting_input" && j.candidateId && (
              <>
                <p>
                  시연과 다른 새 입력을 사용하세요. 변경 전 확인은 채팅의 진행
                  상황에 표시됩니다.
                </p>
                <AssetValidationForm
                  contract={
                    state.assets.find(
                      (a) => a.candidateVersionId === j.candidateId,
                    )?.inputContract ?? []
                  }
                  onSubmit={async (inputs) => {
                    await api.call(`/api/learning/${j.id}/validate`, {
                      revision: j.controlRevision,
                      inputRevision: j.inputRevision,
                      candidateId: j.candidateId,
                      inputs,
                    });
                    await onChange();
                  }}
                />
              </>
            )}
          </article>
        ))}
    </Card>
  );
}
