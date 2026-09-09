import type { ReactNode } from "react";
import type { State } from "../../ui/api-client.js";

type Activity = State["jobs"][number];
const finished = (job: Activity) =>
  ["completed", "failed", "cancelled"].includes(job.status);

export function ActivityList({
  jobs,
  conversationId,
  renderJob,
}: {
  jobs: Activity[];
  conversationId: string;
  renderJob: (job: Activity) => ReactNode;
}) {
  const sorted = [...jobs].sort((a, b) => b.createdAt - a.createdAt);
  const active = sorted.filter(
    (job) => !finished(job) || job.hasUnknownActions,
  );
  const history = sorted.filter(
    (job) => finished(job) && !job.hasUnknownActions,
  );
  const conversations = history.filter(
    (job) => job.kind === "execution" && job.conversationId === conversationId,
  );
  const past = history.filter((job) => !conversations.includes(job));
  return (
    <section className="activity" aria-label="작업과 기록">
      {active.length > 0 && (
        <section aria-label="지금 진행 중인 작업">
          <h2>지금 할 일 · {active.length}</h2>
          {active.map(renderJob)}
        </section>
      )}
      <details className="history-list">
        <summary>
          대화 기록 <span>{conversations.length}</span>
        </summary>
        {conversations.length ? (
          conversations.map(renderJob)
        ) : (
          <p className="empty">이번 대화에서 완료한 요청이 여기에 모여요.</p>
        )}
      </details>
      <details className="history-list">
        <summary>
          지난 작업 <span>{past.length}</span>
        </summary>
        <p className="hint">
          현재 접근 코드에 연결된 기록입니다. 같은 코드를 공유하면 같은 사용자
          영역을 사용합니다.
        </p>
        {past.length ? (
          past.map(renderJob)
        ) : (
          <p className="empty">아직 지난 작업이 없어요.</p>
        )}
      </details>
    </section>
  );
}

export function DiscoveryGuide({
  jobs,
  assets,
  onTools,
}: {
  jobs: Activity[];
  assets: State["assets"];
  onTools: () => void;
}) {
  const latest = jobs
    .filter((job) => job.kind === "generation")
    .sort((a, b) => b.createdAt - a.createdAt)[0];
  const pending = assets.filter(
    (asset) => !asset.currentVersionId && asset.candidateVersionId,
  );
  const running = latest && !finished(latest);
  let title = "페이지를 살펴보고 도구를 준비해요";
  let description =
    "로그인된 업무 화면을 열고 ‘이 페이지 도구 준비’를 눌러주세요. 화면에서 확인한 작업을 도구 후보로 만듭니다.";
  if (running) {
    title =
      latest.status === "waiting_confirmation"
        ? "내 탭에서 시험할 변경을 확인해주세요"
        : latest.status === "waiting_connection"
          ? "대상 탭을 다시 연결해주세요"
          : latest.status === "unknown"
            ? "실행 결과를 먼저 확인해주세요"
            : "도구를 준비하고 있어요";
    description =
      "아래 ‘지금 할 일’에서 진행 상태를 확인하세요. 변경 승인이 필요하면 대상과 입력을 확인한 뒤 실행해주세요. 준비 중에는 다시 누를 필요가 없어요.";
  } else if (pending.length) {
    title = `도구·Skill 후보 ${pending.length}개를 시험해보세요`;
    description =
      "‘도구’에서 후보의 설명과 입력 항목을 확인하고, 합성 입력으로 ‘내 탭에서 시험 실행’을 누르세요. 실제 결과를 확인해야 채팅에서 사용할 수 있어요. Skill은 ‘내 Skill’에서 따로 시험합니다.";
  } else if (assets.some((asset) => asset.currentVersionId && asset.enabled)) {
    title = "준비된 도구로 요청해보세요";
    description =
      "‘도구’에서 사용할 수 있는 작업을 확인하고 채팅으로 요청하세요. 아직 관찰하지 않은 메뉴의 작업은 해당 화면을 연 뒤 준비해주세요.";
  } else if (latest && finished(latest)) {
    title = "도구 준비 결과를 확인해주세요";
    description =
      "‘지난 작업’을 열어 중단 이유를 확인하세요. 로그인된 대상 화면과 연결을 확인한 뒤 다시 준비할 수 있어요. 페이지에 없는 기능은 생성할 수 없습니다.";
  }
  return (
    <aside
      className="discovery-guide"
      aria-label="도구 준비 안내"
      aria-live="polite"
    >
      <div className="eyebrow">DISCOVER · 다음 단계</div>
      <h2>{title}</h2>
      <p>{description}</p>
      {assets.length > 0 && (
        <button className="secondary" onClick={onTools}>
          도구 목록과 입력 확인 →
        </button>
      )}
    </aside>
  );
}
