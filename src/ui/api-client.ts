import type { Job, Binding, Confirmation } from "../shared/contracts.js";
import type { PersonalAsset } from "../shared/asset-schema.js";
export type State = {
  binding: Binding | null;
  jobs: (Job & {
    confirmation?: Confirmation;
    hasUnknownActions?: boolean;
    canReviewNonExecution?: boolean;
    validationInputs?: Record<string, string | number | boolean>;
  })[];
  assets: (PersonalAsset & {
    kind?: string;
    suggestedInputs?: import("../shared/operation-schema.js").Inputs;
    validationStatus?: string;
    readinessIssue?: string;
    validationReason?: string;
    candidateVersionId?: string;
    inputContract?: import("../shared/asset-schema.js").Tool["inputContract"];
  })[];
};
export class ApiClient {
  constructor(
    readonly origin: string,
    public token = "",
  ) {}
  async call<T>(
    path: string,
    body?: unknown,
    method?: "GET" | "POST" | "DELETE",
  ): Promise<T> {
    let response: Response;
    try {
      response = await fetch(this.origin + path, {
        method: method ?? (body === undefined ? "GET" : "POST"),
        credentials: "include",
        signal: AbortSignal.timeout(15000),
        headers: {
          "Content-Type": "application/json",
          ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
        },
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      });
    } catch {
      throw Error("backend_unreachable");
    }
    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      throw Error(data.error ?? "connection_failed");
    }
    if (response.status === 204) return undefined as T;
    return (await response.json()) as T;
  }
  state(): Promise<State> {
    return this.call("/api/state");
  }
}
export function errorMessage(error: unknown): string {
  const code = error instanceof Error ? error.message : "";
  return (
    {
      recording_incomplete:
        "기록이 끊겼거나 접근 범위를 벗어났습니다. 같은 탭에서 다시 시연해주세요.",
      backend_unreachable:
        "Backend에 접속할 수 없습니다. 주소의 /health를 열어 인증서 신뢰와 서버 연결을 확인해주세요.",
      permission_denied: "Extension의 연결 권한을 허용해주세요.",
      bridge_connection_failed:
        "브라우저 연결을 완료하지 못했습니다. Extension 새로고침과 대상 탭 권한을 확인해주세요.",
      unsupported_page: "일반 웹앱 탭에서 Keeper를 열어주세요.",
      unauthorized: "데모 접근 코드로 다시 연결해주세요.",
      forbidden: "현재 연결 또는 데이터 전송 범위가 허용되지 않았습니다.",
      target_changed: "대상 탭이 바뀌었습니다. 현재 탭을 다시 연결해주세요.",
      conflict: "작업 상태가 바뀌었습니다. 최신 상태를 확인해주세요.",
      disconnected:
        "브라우저 연결이 끊겼습니다. 실행 결과를 먼저 확인해주세요.",
      model_auth: "모델 인증 설정을 로컬에서 확인해주세요.",
      model_permission: "이 모델에 접근할 권한을 확인해주세요.",
      model_not_found: "모델 ID와 리전을 확인해주세요.",
      model_quota: "모델 할당량 또는 사용 한도를 확인해주세요.",
      budget_exhausted: "이번 작업의 실행 한도에 도달했습니다.",
      not_observed: "이 후보는 먼저 새 입력으로 시험 실행해야 합니다.",
      invalid_input: "입력값이 올바르지 않거나 이전 검증과 같은 값입니다.",
    }[code] ?? "요청을 완료하지 못했습니다. 연결과 입력을 확인해주세요."
  );
}
