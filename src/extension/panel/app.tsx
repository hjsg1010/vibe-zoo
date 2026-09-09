import { AssetDetails } from "./asset-details.js";
import { ActivityList, DiscoveryGuide } from "./activity.js";
import { AssetImprovement } from "./improvement.js";
import { Publish } from "../../store/publish.js";
import { AssetSettings } from "./settings.js";
import { Learning } from "./learning.js";
import { useEffect, useRef, useState } from "react";
import { ApiClient, errorMessage, type State } from "../../ui/api-client.js";
import {
  Card,
  Empty,
  JobCard,
  AssetValidationForm,
} from "../../ui/components.js";
import { Chat } from "./chat.js";
import type { Job } from "../../shared/contracts.js";
export function Keeper() {
  const [origin, setOrigin] = useState("https://localhost:18443");
  const [credential, setCredential] = useState("");
  const [api, setApi] = useState<ApiClient>();
  const [state, setState] = useState<State>({
    binding: null,
    jobs: [],
    assets: [],
  });
  const [tab, setTab] = useState("채팅");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [connectionStage, setConnectionStage] = useState("연결 중…");
  const conversation = useRef<string>(crypto.randomUUID());
  const generation = useRef(0);
  const prepared = useRef(new Set<string>());
  useEffect(() => {
    void chrome.storage.session
      .get(["token", "backendOrigin", "conversationId"])
      .then((saved) => {
        if (typeof saved.conversationId === "string")
          conversation.current = saved.conversationId;
        else
          void chrome.storage.session.set({
            conversationId: conversation.current,
          });
        if (
          typeof saved.token === "string" &&
          typeof saved.backendOrigin === "string"
        ) {
          setOrigin(saved.backendOrigin);
          setApi(new ApiClient(saved.backendOrigin, saved.token));
        }
      });
  }, []);
  useEffect(() => {
    if (!api) return;
    let stopped = false;
    const id = ++generation.current;
    const refresh = () => {
      void api
        .state()
        .then((next) => {
          if (!stopped && id === generation.current)
            setState((previous) => ({
              ...next,
              jobs: next.jobs.map((j) => {
                const old = previous.jobs.find((x) => x.id === j.id);
                return old && old.controlRevision > j.controlRevision ? old : j;
              }),
            }));
        })
        .catch((e) => {
          if (!stopped) setError(errorMessage(e));
        });
    };
    refresh();
    const timer = setInterval(refresh, 1200);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [api]);
  useEffect(() => {
    if (!api || !state.binding) return;
    const target = state.binding;
    const key = target.origin;
    if (prepared.current.has(key) || state.assets.length) return;
    prepared.current.add(key);
    void api
      .call("/api/prepare", {
        requestKey: crypto.randomUUID(),
        conversationId: conversation.current,
        binding: target,
        purpose:
          "현재 페이지의 합성 업무 데이터에서 반복 가능한 작은 작업을 도구로 준비해주세요.",
        inputs: {},
      })
      .then(() => api.state())
      .then(setState)
      .catch((e) => setError(errorMessage(e)));
  }, [api, state.binding, state.assets.length]);
  const connect = async () => {
    setBusy(true);
    setError("");
    try {
      const url = new URL(origin);
      if (url.protocol !== "https:") throw Error();
      setConnectionStage("연결 권한 확인 중…");
      const granted = ["localhost", "127.0.0.1"].includes(url.hostname)
        ? true
        : await chrome.permissions.request({
            origins: [`${url.protocol}//${url.hostname}/*`],
          });
      if (!granted) throw Error("permission_denied");
      setConnectionStage("Backend 인증 중…");
      const client = new ApiClient(url.origin);
      const session = await client.call<{ token: string }>("/api/session", {
        credential,
      });
      client.token = session.token;
      const saved = await chrome.storage.session.get("selectedTab");
      const tabs = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      const tabId =
        typeof saved.selectedTab === "number" ? saved.selectedTab : tabs[0]?.id;
      if (tabId === undefined) throw Error();
      setConnectionStage("대상 탭 연결 중…");
      const response = (await chrome.runtime.sendMessage({
        type: "connect",
        tabId,
        origin: url.origin,
        token: session.token,
      })) as { ok: boolean; error?: string };
      if (!response.ok)
        throw Error(response.error ?? "bridge_connection_failed");
      setCredential("");
      setApi(client);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  const submit = async (path: string, purpose: string) => {
    if (!api || !state.binding) return;
    setError("");
    try {
      await api.call(path, {
        requestKey: crypto.randomUUID(),
        conversationId: conversation.current,
        binding: state.binding,
        purpose,
        inputs: {},
      });
      setState(await api.state());
    } catch (e) {
      setError(errorMessage(e));
      throw e;
    }
  };
  const control = async (
    job: Job,
    action: "cancel" | "confirm" | "reconcile",
    actionId?: string,
  ) => {
    try {
      await api?.call(`/api/jobs/${job.id}/control`, {
        revision: job.controlRevision,
        action,
        actionId,
      });
      if (api) setState(await api.state());
    } catch (e) {
      setError(errorMessage(e));
    }
  };
  return (
    <main className="shell keeper">
      <header className="brand">
        <div className="brandmark" aria-hidden="true">
          🦁
        </div>
        <div>
          <div className="eyebrow">VIBE ZOO</div>
          <h1>Keeper</h1>
          <p className="subtitle">당신의 업무를 배우는 작은 동물원</p>
        </div>
      </header>
      <div
        className={`target ${state.binding ? "" : "offline"}`}
        data-testid="target-status"
      >
        <span className="dot" />
        {state.binding
          ? "현재 탭에 연결되어 있어요"
          : "대상 탭 연결이 필요해요"}
      </div>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {api && !state.binding && (
        <button
          className="secondary"
          data-testid="reconnect-target"
          disabled={busy}
          onClick={() => {
            setBusy(true);
            void chrome.storage.session
              .get("selectedTab")
              .then(async (saved) => {
                const tabs = await chrome.tabs.query({
                  active: true,
                  currentWindow: true,
                });
                const tabId =
                  typeof saved.selectedTab === "number"
                    ? saved.selectedTab
                    : tabs[0]?.id;
                const result = (await chrome.runtime.sendMessage({
                  type: "connect",
                  tabId,
                  origin: api.origin,
                  token: api.token,
                })) as { ok: boolean; error?: string };
                if (!result.ok)
                  throw Error(result.error ?? "bridge_connection_failed");
                setState(await api.state());
                setError("");
              })
              .catch((e) => setError(errorMessage(e)))
              .finally(() => setBusy(false));
          }}
        >
          현재 탭 다시 연결
        </button>
      )}
      {!api ? (
        <Card title="데모에 연결하기">
          <p>로그인한 업무 탭에서 Keeper를 열어주세요.</p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void connect();
            }}
          >
            <label htmlFor="backend-origin">Backend 주소</label>
            <input
              id="backend-origin"
              data-testid="backend-origin"
              value={origin}
              onChange={(e) => setOrigin(e.target.value)}
            />
            <label htmlFor="demo-code">데모 접근 코드</label>
            <input
              id="demo-code"
              data-testid="demo-code"
              type="password"
              autoComplete="off"
              value={credential}
              onChange={(e) => setCredential(e.target.value)}
            />
            <button
              data-testid="connect-backend"
              disabled={busy || !credential}
            >
              {busy ? connectionStage : "이 탭 연결하기"}
            </button>
          </form>
        </Card>
      ) : (
        <>
          <nav aria-label="Keeper 메뉴" role="tablist">
            {["채팅", "도구", "내 Skill", "설정"].map((name) => (
              <button
                key={name}
                role="tab"
                aria-selected={tab === name}
                data-testid={`nav-${name}`}
                onClick={() => setTab(name)}
              >
                {name}
              </button>
            ))}
          </nav>
          {tab === "채팅" && (
            <>
              {!state.assets.some((a) => a.currentVersionId) && (
                <section className="hero">
                  <div className="hero-icon" aria-hidden="true">
                    🦒
                  </div>
                  <h2>
                    처음 만난 페이지도
                    <br />
                    함께 배워볼까요?
                  </h2>
                  <p>
                    현재 화면을 살펴보고 사용할 도구와 기본 Skill을 준비해요.
                  </p>
                  <button
                    data-testid="prepare-tools"
                    disabled={
                      !state.binding ||
                      state.jobs.some(
                        (job) =>
                          job.kind === "generation" &&
                          !["completed", "failed", "cancelled"].includes(
                            job.status,
                          ),
                      )
                    }
                    onClick={() => {
                      void submit(
                        "/api/prepare",
                        "현재 페이지의 합성 업무 데이터에서 반복 가능한 작은 작업을 도구로 준비해주세요.",
                      ).catch(() => undefined);
                    }}
                  >
                    이 페이지 도구 준비
                  </button>
                  <p className="hint">
                    모델 전송은 허용된 합성 MinIO 데모 범위로 제한됩니다.
                  </p>
                </section>
              )}
              <DiscoveryGuide
                jobs={state.jobs.filter(
                  (job) => job.conversationId === conversation.current,
                )}
                assets={state.assets}
                onTools={() => setTab("도구")}
              />
              <Card title="Keeper와 대화">
                <Chat
                  disabled={!state.binding}
                  onSend={(text) => submit("/api/chat", text)}
                />
              </Card>
              <ActivityList
                jobs={state.jobs}
                conversationId={conversation.current}
                renderJob={(job) => (
                  <JobCard
                    key={job.id}
                    job={job}
                    onRepair={async (source) => {
                      await api.call(
                        `/api/jobs/${source.id}/repair-validator`,
                        { revision: source.controlRevision },
                      );
                      setState(await api.state());
                    }}
                    onReview={async (source, reason) => {
                      await api.call(`/api/jobs/${source.id}/control`, {
                        action: "review_not_executed",
                        revision: source.controlRevision,
                        reviewReason: reason,
                      });
                      setState(await api.state());
                    }}
                    onValidate={async (source, toolInputs, skillInputs) => {
                      if (!api || !state.binding) throw Error("disconnected");
                      await api.call("/api/validate-candidate", {
                        sourceJobId: source.id,
                        revision: source.controlRevision,
                        request: {
                          requestKey: crypto.randomUUID(),
                          conversationId: conversation.current,
                          binding: state.binding,
                          purpose: "고정 후보를 새 입력으로 검증",
                          inputs: {},
                        },
                        toolInputs,
                        skillInputs,
                        newCase: true,
                      });
                      setState(await api.state());
                    }}
                    onControl={(j, a, id) => {
                      void control(j, a, id);
                    }}
                  />
                )}
              />
            </>
          )}
          <div hidden={tab !== "내 Skill"}>
            <Learning
              api={api}
              state={state}
              conversationId={conversation.current}
              onChange={async () => setState(await api.state())}
            />
          </div>
          {(tab === "도구" || tab === "내 Skill") && (
            <Card title={tab === "도구" ? "이 페이지의 도구" : "나의 Skill"}>
              {state.assets.length ? (
                state.assets
                  .filter((a) =>
                    tab === "도구" ? a.kind === "tool" : a.kind !== "tool",
                  )
                  .map((a) => (
                    <article className="asset" key={a.id}>
                      <div className="row">
                        <h3>{a.name}</h3>
                        <span className="tag">
                          {!a.enabled
                            ? "꺼짐"
                            : a.currentVersionId
                              ? "검증 통과"
                              : "검증 필요"}
                        </span>
                      </div>
                      <p>{a.description}</p>
                      <AssetDetails assetId={a.id} api={api} />
                      <AssetSettings
                        asset={a}
                        api={api}
                        onSaved={async () => setState(await api.state())}
                      />
                      <Publish asset={a} api={api} />
                      <AssetImprovement
                        asset={a}
                        api={api}
                        state={state}
                        onChanged={async () => setState(await api.state())}
                      />
                      {!a.currentVersionId &&
                        a.candidateVersionId &&
                        a.kind !== "personal_skill" && (
                          <AssetValidationForm
                            submitLabel="내 탭에서 시험 실행"
                            contract={a.inputContract ?? []}
                            onSubmit={async (inputs) => {
                              if (!state.binding) throw Error("disconnected");
                              await api.call(`/api/assets/${a.id}/validate`, {
                                versionId: a.candidateVersionId,
                                inputs,
                                request: {
                                  requestKey: crypto.randomUUID(),
                                  conversationId: conversation.current,
                                  binding: state.binding,
                                  purpose: "선택 자산의 독립 검증",
                                  inputs: {},
                                },
                              });
                              setState(await api.state());
                              setTab("채팅");
                            }}
                          />
                        )}
                    </article>
                  ))
              ) : (
                <Empty>
                  아직 준비한 자산이 없어요. 채팅에서 도구 준비를 시작해주세요.
                </Empty>
              )}
            </Card>
          )}
          {tab === "설정" && (
            <Card title="연결 설정">
              <p>브라우저 작업은 연결한 내 로그인 탭에서 실행됩니다.</p>
              <button
                className="secondary"
                data-testid="disconnect"
                onClick={() => {
                  void api.call("/api/logout", {}).finally(() => {
                    void chrome.storage.session.remove([
                      "token",
                      "binding",
                      "conversationId",
                    ]);
                    conversation.current = crypto.randomUUID();
                    prepared.current.clear();
                    setApi(undefined);
                    setState({ binding: null, jobs: [], assets: [] });
                  });
                }}
              >
                연결 해제
              </button>
              <p className="hint">
                데모 데이터는 개인 영역에 저장됩니다. Store 게시 전에는 공유하지
                않아요.
              </p>
              <a
                data-testid="open-store"
                onClick={(event) => {
                  event.preventDefault();
                  void chrome.tabs
                    .create({ url: origin })
                    .catch((e) => setError(errorMessage(e)));
                }}
                href={origin}
                target="_blank"
                rel="noreferrer"
              >
                Vibe Zoo Store 열기 ↗
              </a>
            </Card>
          )}
        </>
      )}
      <footer className="footer">관찰 → 배우기 → 검증 → 함께 쓰기</footer>
    </main>
  );
}
