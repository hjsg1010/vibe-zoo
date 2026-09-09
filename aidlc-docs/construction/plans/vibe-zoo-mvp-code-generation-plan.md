# U-01 — Code Generation Plan

## 1. 상태와 실행 기준

**상태**: Part 1 승인 완료 — 2026-09-09T01:46:19Z “계획 승인. 구현 시작!”에 따라 16단계 전체와 순서를 승인했다. Part 2 Step 1–13 구현을 마쳤다. Step 13은 사용자 지정 시연 범위에 따라 실제 게시 UI·Store API 설치까지 확인했고, 두 번째 사용자 브라우저 실행은 미검증이다. 다음은 Step 14 개선 후보 구현이다. 이 문서는 U-01 Code Generation의 단일 실행 기준이다.

**대상**: Greenfield / U-01 `vibe-zoo-mvp`, US-01~09 전체. 별도 선행 유닛은 없다. [유닛·내부 순서](../../inception/application-design/unit-of-work.md), [스토리 배정](../../inception/application-design/unit-of-work-story-map.md), [요구사항/AC](../../inception/requirements/requirements.md)를 따른다. 전체 유닛은 미완료이며 기능별 구현·검증 범위는 아래 단계와 공통 구현 요약을 따른다.

**선택 기준**: 현재 WSL, 프로젝트 한정 Node 24.20.0, TypeScript, Bedrock Converse/Opus, 공식 MCP v2 SDK, Node HTTPS·WSS, 내장 SQLite는 [승인 인프라](../vibe-zoo-mvp/infrastructure-design/infrastructure-design.md)를 따른다. UI는 React + CSS, 빌드는 esbuild, 테스트는 Vitest + 필요한 DOM 테스트 도구를 사용한다. 여러 Job·폼·편집 상태를 Side Panel/Store에서 다루기 위한 구현 선택이며 별도 UI 서버·SSR 프레임워크는 추가하지 않는다. 실제 패키지 버전/호환성은 Step 1에서 공식 배포 정보와 설치 결과를 확인하고 lockfile로 고정한다. [React](https://react.dev/learn/add-react-to-an-existing-project), [esbuild](https://esbuild.github.io/getting-started/), [Vitest](https://vitest.dev/guide/)의 공식 안내를 검토했다.

## 2. 유닛 문맥과 공통 경계

| 책임 / 인터페이스 | 코드 배치와 원본 계약 |
|---|---|
| C-01/02 — Keeper·관찰/실행·Record | `src/extension/`. 현재 사용자의 실제 탭과 문서 수명, 패키지 동작 해석기. [Frontend](../vibe-zoo-mvp/functional-design/frontend-components.md)와 [공통 메서드](../../inception/application-design/component-methods.md)의 C-01/02를 구현한다. |
| C-03 — API·작업·모델 조정 | `src/backend/`. prepare/submit/startWorkflow/controlJob/query/changeAsset를 인증된 HTTPS 요청에 매핑하고 WSS 전달을 조정한다. Actor·대화·Job/Attempt/Action·현재 제어/예산을 소유한다. |
| C-04/05 — 생성/학습·실제 MCP·검증 | `src/backend/generation/`, `src/backend/model/`, `src/backend/mcp/`. 후보 생성은 실행/활성화를 직접 하지 않는다. 실제 tools/list·tools/call, 고정 버전과 사후 관찰을 연결한다. |
| C-06 — 자산·설정·저장 | `src/backend/storage/`, `src/backend/assets/`. 불변 버전·개인 설정/포인터·사례/보고서·Publication/Installation을 SQLite에 저장한다. 전체 엔터티는 [도메인](../vibe-zoo-mvp/functional-design/domain-entities.md), 원자적 반영은 [NFR P-02](../vibe-zoo-mvp/nfr-design/nfr-design-patterns.md#p-02--전달취소반영의-순서)를 참조한다. |
| C-07 — 별도 Store | `src/store/`. 같은 Backend의 공개 가능한 목록과 본인 설치 상태를 사용한다. 원 작성자의 개인 근거·브라우저 접근을 제공하지 않는다. |
| 공통 타입·표현 | `src/shared/`, `src/ui/`. 검증 가능한 계약·업무 결과와 UI 표현을 공유한다. 상태/수용조건을 별도 문서에 재정의하지 않는다. |

공통 구현·검증 조건은 [BR-01~15](../vibe-zoo-mvp/functional-design/business-rules.md), [NFR P-01~07](../vibe-zoo-mvp/nfr-design/nfr-design-patterns.md), [CC-01~08](../../inception/user-stories/stories.md)만 참조한다. 아래 단계는 그 조건을 소유 코드와 검증에 연결한다.

- 저장소 루트의 `src/`, `tests/`, `config/`, `scripts/`에 코드를 둔다. 아래 경로는 모두 루트 기준이다. `aidlc-docs/`에는 Markdown만 둔다. 기존 요구사항·HTML 시안·AI-DLC 규칙 원본은 보존한다.
- 루트 .env를 읽고 AWS_BEARER_TOKEN_BEDROCK·AWS_REGION·BEDROCK_MODEL_ID를 사용한다. ANTHROPIC_MODEL은 무시한다. 키 값·실제 대상 주소·개인 경로·runtime ID는 문서/로그/Git에 쓰지 않는다. 모델 변경이나 Haiku fallback은 없다.
- 실제 MinIO 모델 입력은 승인된 합성 업무 데이터의 최소 필터 근거만 사용한다. 다른 미등록 사이트도 같은 진입점을 제공하되, 허용되지 않은 사이트 자료는 모델로 보내지 않는다. 민감 입력 제외를 단순 마스킹 한 번으로 보장하지 않는다.
- 이전 Extension 설치·Chrome/MinIO probe와 일반 모델 연결 검사는 재실행하지 않는다. Step 10 이후의 실행은 **새로 구현한 제품의 생성/학습/실행 검증**이며 과거 고정 도구 성공과 별도로 기록한다. 외부 서비스 접속 경로·DNS·Tailscale·터널·포트 공개는 이번 구현 대상이 아니다.
- 실제 웹앱 변경은 제품 UI의 대상/변경 확인을 거친다. 서로 다른 Actor 검증은 별개의 사용자/로그인 문맥으로 수행한다. 필요한 브라우저 접근이 없으면 사람의 준비를 요청하고 상세 결과를 미검증으로 남기며 대체 관리자 브라우저·가짜 성공을 사용하지 않는다.

## 3. 순차 구현·검증 단계

첫 실제 사용자 결과는 Step 10이다. Step 1~9에서 그 경로에 필요한 작은 공통 모듈을 연결하고 Step 11~14에서 개인화·공유·개선으로 확장한다. 단계별 검증은 해당 변경의 핵심 사례로 제한하고 전체 통합 재현은 후속 Build and Test에 연결한다. 테스트용 대역/합성 결과는 `tests/`에서만 사용하며 실제 모델/브라우저 성공 증거로 전용하지 않는다.

### Step 1 — 프로젝트·빌드·비공개 설정 기반

- [x] `package.json`, `package-lock.json`, `.node-version`, `tsconfig.json`, `eslint.config.mjs`, `vitest.config.ts`, `.gitignore`, `config/env.example`, `config/extension-manifest.json`, `scripts/build.mjs`를 작성한다. Node 런타임은 프로젝트 범위에 준비하고 전역 Node/Codex 환경을 바꾸지 않는다. React/TypeScript·Zod·AWS SDK·공식 MCP v2·ws·dotenv와 빌드/테스트 의존성을 필요한 범위로 고정한다.
- **확인**: .env 제외 유지, `.local/`·DB/WAL/SHM·TLS 개인키·빌드/테스트 임시 파일을 생성 전에 Git 제외. Backend/Extension/Store 출력은 `dist/backend/`, `dist/extension/`, `dist/store/`. 빌드는 명시한 대상부터 수행하고 Step 15에서 세 대상 전체를 재현한다. 설정 예시는 이름·안전한 기본값만 포함한다. (모든 US / NFR-07·08)

### Step 2 — 공통 계약과 제한 동작 표현

- [x] `src/shared/contracts.ts`, `src/shared/asset-schema.ts`, `src/shared/operation-schema.ts`, `src/shared/errors.ts`, `src/shared/redaction.ts`, `src/backend/config.ts`를 작성한다. Job/Action·binding/control revision·입력/확인·후보/버전·관찰·업무 결과와 ToolBundle 여섯 요소를 타입/스키마로 연결한다. 모델 출력은 제한된 입력 계약·DOM 계획·사후 조건만 허용한다.
- **확인**: 알 수 없는 필드·임의 코드·민감정보·실행 문맥 위조를 거절하는 사례를 이후 API/실행 테스트에서 사용한다. Node/브라우저 경계에 서버 시크릿 모듈이 bundle되지 않도록 빌드 진입점을 분리한다. (모든 US / BR-01~06·15)

### Step 3 — SQLite·마이그레이션·Repository 구현

- [x] `src/backend/storage/database.ts`, `src/backend/storage/migrate.ts`, `src/backend/storage/repository.ts`, `src/backend/storage/migrations/001-initial.sql`을 작성한다. C-03/C-06 엔터티·owner·고정 버전·제어/예산·중복 키·관계/인덱스를 저장한다. 짧은 트랜잭션과 조건부 반영을 하나의 저장 경계로 제공한다.
- **확인**: 빈 DB에 초기 migration, 기존 schema 버전 확인, WAL/foreign keys/FULL, 실행 중 전송/모델 await를 포함하지 않는 transaction. 재시작·빌드가 기존 DB를 초기화하지 않고 DB 오류가 메모리 성공으로 대체되지 않는다. (모든 US / NFR P-02·06)

### Step 4 — Repository 테스트와 계층 요약

- [x] `tests/backend/repository.test.ts`, `tests/helpers/fixtures.ts`를 작성·실행한다. owner 경계, 같은 중복 키/다른 입력 충돌, 취소/활성화 CAS, 포인터·off 보존, rollback/커밋 실패, 파일 DB 재열기와 삭제 뒤 늦은 결과를 검증한다.
- **요약**: `aidlc-docs/construction/vibe-zoo-mvp/code/implementation-summary.md`를 만들고 Repository 책임·migration·실제 검사 결과를 간결하게 기록한다. 이후 모든 계층 요약·AC 증거도 이 한 문서에 누적한다. (모든 US / BR-03·07~15)

### Step 5 — 업무 조정·현재 제어·예산과 단위 테스트

- [x] `src/backend/jobs/coordinator.ts`, `src/backend/jobs/control.ts`, `src/backend/jobs/budget.ts`, `src/backend/jobs/scheduler.ts`, `src/backend/assets/registry.ts`, `tests/backend/jobs.test.ts`를 작성한다. prepare·접수/대기·확인/취소/reconcile·입력 보완·부분 준비·고정 자산 선택을 Repository와 연결한다. 모델/브라우저 I/O는 명시 계약으로 주입한다.
- **확인/요약**: 취소 전후 전달 순서, 사용 권한 폐기, 재접속/대기 뒤 카운터 보존, usage 미확인 예약, 같은 탭/Record 충돌, 생성과 채팅의 슬롯 분리, 완료 단계 재실행 방지를 검사한다. 승인된 예산 값을 복제 문서 없이 설정에 적용하고 업무 계층 요약을 누적한다. (US-01~03·09 및 후속 공통 / BR-01~09)

### Step 6 — 인증·API·HTTPS/WSS 계층과 테스트

- [x] `src/backend/auth.ts`, `src/backend/api/router.ts`, `src/backend/api/server.ts`, `src/backend/bridge.ts`, `src/backend/logger.ts`, `src/backend/main.ts`, `tests/backend/api.test.ts`를 작성한다. 인증/세션·준비/채팅/작업 제어·상태/자산/catalog 조회를 제공하고 연결별 인증/binding과 메시지 상한을 검사한다. concrete 모델/MCP 조립은 Step 8에서 완성한다.
- **확인/요약**: 실제 로컬 HTTPS/WSS 테스트 클라이언트로 미인증·다른 Actor/연결·오래된 제어/확인·중복 요청·크기 초과·정적 경로 탈출·시크릿 포함 오류를 거절한다. 일반 health 확인은 모델을 호출하지 않는다. Node 전역 예외도 정제·종료/미확인 처리하고 API 계층 요약을 누적한다. (US-01~03·09 / BR-01~09·15)

### Step 7 — 제품 Extension의 대상 연결·관찰·실행

- [x] `src/extension/background.ts`, `src/extension/target.ts`, `src/extension/content.ts`, `src/extension/observer.ts`, `src/extension/executor.ts`, `tests/extension/bridge.test.ts`, `tests/extension/observer-executor.test.ts`를 작성한다. Service Worker가 WSS/명령을 소유하고 Content Script는 제한 관찰/패키지 동작만 수행한다. 현재 탭 권한·sender·document·origin을 확인하며 페이지 신호를 사용자 확인 명령으로 받아들이지 않는다.
- **확인**: Action 중복 소비/만료, 연결 교체, 예상 SPA/문서 이동과 임의 이동, Locator 0개/복수, 접근 불가 프레임·canvas·민감 요소를 합성 DOM/브라우저 계약 테스트로 구분한다. 현재 탭에 필요한 권한을 사용자 동작에서 얻고 원격 생성 JS/eval·쿠키/인증 헤더 읽기를 넣지 않는다. 실제 Chrome 판정은 Step 10. (US-01~03·09 / CC-01~08)

### Step 8 — Bedrock·생성기·실제 MCP·검증 루프 연결

- [x] `src/backend/model/bedrock.ts`, `src/backend/model/agent.ts`, `src/backend/generation/tools.ts`, `src/backend/generation/prompts.ts`, `src/backend/mcp/server.ts`, `src/backend/mcp/client.ts`, `src/backend/mcp/validation.ts`, `tests/backend/generation-mcp.test.ts`를 작성하고 Step 5~7을 실제 의존성으로 조립한다. 일반 생성/기본 Skill·채팅/Agent 모두 같은 Opus Gateway/예산을 사용한다.
- **확인**: MCP SDK의 실제 tools/list·tools/call, Job 한정 후보 노출과 고정 사용 버전, 업무 인자와 trusted 실행 문맥 분리, 도구 결과/toolUseId 왕복, 제한된 계획 검증·사후 판정을 연결한다. ToolBundle 여섯 요소·새 입력 사례·기능별 부분 준비와 기본 Skill의 독립 검증을 구현한다. 단위/프로토콜 테스트의 모델 대역은 대역으로 표시하고 실제 호출 성공은 Step 10에서만 기록한다. (US-01~03·09 / AC-01~04·10)

### Step 9 — Keeper 핵심 화면과 Store 공통 화면

- [x] `src/ui/api-client.ts`, `src/ui/components.tsx`, `src/ui/theme.css`, `src/extension/panel/index.html`, `src/extension/panel/main.tsx`, `src/extension/panel/app.tsx`, `src/extension/panel/chat.tsx`, `src/store/index.html`, `src/store/main.tsx`, `src/store/app.tsx`, `tests/ui/keeper.test.tsx`를 작성한다. 준비/현재 대상·같은 채팅·작업 상태·변경 확인·도구/기본 Skill 목록과 실제 catalog 조회의 Store 기본 화면을 연결한다.
- **확인**: 승인 Frontend의 필드/상태, 시안의 종이색·teal·Zoo 보조 표현, 좁은 Side Panel과 키보드 동작을 구현한다. interactive 요소는 안정된 `data-testid`/label을 갖고 모델/페이지 텍스트는 HTML로 실행하지 않는다. 자동 생성·부분 준비·취소/미확인·오래된 응답·채팅 작성값 보존을 테스트한다. 기능은 실제 읽기 모델을 사용하며 시안의 timer/고정 수량·성공 표시를 이식하지 않는다. (US-01~03·09 / NFR-05)

### Step 10 — 첫 제품 전체 흐름 검증

- [x] `scripts/demo-setup.mjs`, `scripts/demo.mjs`, `tests/integration/core-flow.test.ts`를 작성하고 필요한 로컬 설정/제품 빌드를 준비한다. 별도 실제 실행 구간에서 **새 제품**을 요청자의 로그인된 합성 MinIO 탭에 연결해 Preset 없음 → 실제 근거 기반 생성 → 다른 입력 검증 → 실제 MCP/자기 탭 실행 → 사후 상태 → 같은 채팅까지 확인한다. 도구와 기본 Skill을 각각 검증하고 준비 자산 재사용도 확인한다.
- **확인/증거**: 내부 대역 테스트와 실제 제품 실행 결과를 구분한다. 학습·생성 전송 범위를 넓히지 않고 다른 미등록 사이트의 같은 진입·관찰 한계/전송 보류를 확인한다. 잘못된 탭·취소/단절·부분 결과와 긴 생성 중 채팅도 검사한다. 최초 제품 스크린샷은 `screenshots/01-generation-execution.png`, 결과는 공통 구현 요약에 기록한다. 이 경로의 결함을 해결한 뒤 의존 기능으로 확장하며 무한 재시도·가짜 Preset·고정 MinIO 생성기로 대체하지 않는다. (US-01~03·09 / AC-01~04·06·09·10)

### Step 11 — Record·명시적 의도·개인 Skill

- [x] `src/extension/recorder.ts`, `src/extension/panel/learning.tsx`, `src/backend/generation/skills.ts`, `tests/backend/learning.test.ts`, `tests/extension/recorder.test.ts`를 작성하고 API/Panel에 연결한다. Record→Stop→직접 의도→초안→다른 입력 검증→개인 사용을 구현한다. 기존 도구 조합과 누락 도구 생성 후보/미지원 표시를 구분한다.
- **확인**: Stop만으로 학습/재생하지 않음, 범위/수명/필터·불완전 기록, 동일 대기 Job·후보·입력 revision 보완과 완료 단계 재실행 방지를 검사한다. 생성된 개인 Skill의 실제 새 입력·사후 결과를 확인하며 시연 자체의 변경을 학습 검증으로 재생하지 않는다. (US-04·09 / AC-04·05·09, BR-10)

### Step 12 — 개인 설정·후속 채팅 재사용

브라우저 패널 준비 대기 중 기존 자산 계약에만 의존하는 설정 코드·합성 검사를 먼저 연결했다. Step 11 실제 학습 검증과 Step 12 실제 후속 채팅을 순서대로 마친 뒤 각각 완료 표시한다. 사용자 지시의 구현 우선 원칙을 따른 실행 조정이며 제품 범위·단계 승인 절차는 유지한다.

- [x] `src/backend/assets/settings.ts`, `src/extension/panel/settings.tsx`, `tests/backend/settings.test.ts`, `tests/ui/personalization.test.tsx`를 작성하고 기존 API/조회/선택 경로에 연결한다. 기본/개인 Skill·의존성·적용 범위·버전과 이름/설명/기본값/on-off를 편집·저장한다.
- **확인/요약**: 저장 실패/충돌, 재접속 후 유지, off 제외, 진행 중 스냅샷 보존, 변경된 기본값의 실제 후속 채팅 결과를 확인한다. 별도 Store 게시 없이 완주하고 Frontend/개인화 구현 요약을 기록한다. 실제 실행 근거는 즉시 보존하고 `screenshots/02-personal-skill.png` 취합은 사용자 구현 우선 지시에 따라 Step 15에서 수행한다. (US-01·04·05·09 / AC-05·06)

### Step 13 — Store 게시·다른 사용자 설치/검증

- [x] `src/backend/assets/store.ts`, `src/store/catalog.tsx`, `src/store/detail.tsx`, `src/store/publish.tsx`, `tests/backend/store.test.ts`, `tests/ui/store.test.tsx`를 작성하고 Store app·API·개인 설정의 공유 진입점을 완성한다. 선택 버전·의존성·공개 투영을 게시하고 설치자 개인 영역에 연결한다.
- **확인/요약**: 자동 게시 없음, 개인 기본값/시연/비공개 사이트/자격 미공개, 게시 투영의 실행 의미 보존, 중복 설치·정확한 버전·본인 재검증을 검사한다. 실제 게시·별도 Store 화면·설치 결과를 `screenshots/03-store-install.png`에 연결한다(Step 15 취합). 사용자 후속 지시로 별도 프로필 준비가 불가능하므로 두 번째 사용자 자기 탭 실행은 보류하고 미검증으로 명시한다. 해당 실행 경계와 자체 검증 요구는 코드·합성 검사에 유지한다. 외부 접속 경로 구축은 이 검증의 선행 조건이 아니다. (US-06·07·09 / AC-07, BR-12·15)

### Step 14 — 개선 후보·회귀·명시 적용/이전 버전

**구현 진행**: Backend/API/Panel·불변 후보·새 입력 두 사례·명시 적용/복구와 11개 관련 검사를 구현했다. 실제 현재 버전의 재현 실패를 고친 제품 시연은 아직 미검증이므로 단계 완료 체크는 보류한다. 기존 입력 처리 결함의 해결 기록을 새로운 개선 성과로 재사용하지 않는다.

- [ ] `src/backend/generation/improvement.ts`, `src/extension/panel/improvement.tsx`, `tests/backend/improvement.test.ts`, `tests/ui/improvement.test.tsx`를 작성하고 기존 API/Registry·MCP·검증을 재사용한다. 재현 실패와 관련 성공 사례, 선택적 수정/추가 시연에서 이유가 있는 새 후보를 만든다.
- **확인**: 후보에 실패/관련 성공 검증 결과를 연결하고 통과 뒤 명시 ‘적용’만 향후 포인터를 바꾼다. 현재 버전 충돌·취소·off·진행 중 버전 보존과 이전 버전 복구를 테스트한다. 실제 재현 사례·후보·사후 상태의 범위를 정직하게 기록하고 `screenshots/04-improvement.png`에 연결한다. 기존 웹앱을 임의 수정하거나 테스트 대역을 실제 개선 증거로 쓰지 않는다. (US-08·09 / AC-08·09, BR-13~14)

### Step 15 — 로컬 실행·문서·간단한 CI 완성

사용자의 후속 명시 지시에 따라 Step 14 실제 개선 사례 준비와 독립적으로 진행한다. Store 두 번째 사용자 검증은 사용자에게 전달받은 동료 환경 완료 보고로 외부 대기를 해제하며 직접 검증과 구분한다.

- [ ] `scripts/demo-cleanup.mjs`, `scripts/check-public-artifacts.mjs`, `.github/workflows/ci.yml`, `README.md`를 작성하고 기존 build/demo/setup·설정 예시를 완성한다. `npm run build`, `npm run typecheck`, `npm run lint`, `npm test`, `npm run demo:setup`, `npm run demo`, `npm run demo:cleanup`을 실제 동작에 맞춰 제공한다. 정리는 소유/대상 범위를 명시하며 무조건 전체 삭제하지 않는다.
- **확인/요약**: 세 빌드·로컬 시작/종료·동일 DB 재시작·미확인 상태를 확인하고 실제 실행 결과의 `screenshots/02-personal-skill.png`, `03-store-install.png`, `04-improvement.png`를 취합한다. 촬영 준비 때문에 기능 구현을 지연하지 않는다. CI는 시크릿 없는 단위/합성 통합 검사를 수행하고 실제 Bedrock/개인 브라우저 호출은 CI에 넣지 않는다. README에 설치·환경변수·인증서/신뢰·실제 기능·API/계약 참조·제약/오류·시연 증거를 정리한다. 네 계층 요약은 공통 구현 요약에만 모으고 별도 API/화면 문서를 중복 생성하지 않는다. (모든 US / NFR-07·08)

### Step 16 — 유닛 완료 검토와 코드 산출물 제시

- [ ] 아래 스토리 표와 공통 구현 요약에 코드·필요 검사·실제 증거를 연결하고 완료된 항목만 표시한다. 바뀐 모듈의 필요한 회귀 검사와 전체 빌드/기본 품질 확인을 마친 뒤, 누락·핵심 TODO/빈 함수·성공 스텁·시크릿/비공개 자료·README/화면 불일치를 해결한다.
- **제시**: 전체 US-01~09·AC-01~10 구현/검증 결과, 실제/합성/미검증 범위, 알려진 지원 한계를 보고하고 Code Generation 산출물 승인을 요청한다. 아직 필요한 실제 검증이 남아 있으면 완료 처리하지 않는다. 전체 Build and Test 단계는 해당 코드 산출물 승인 후 진행한다.

## 4. 스토리 추적과 완료 표시

| 완료 | 스토리 | 주요 단계 | 원본 AC 연결 |
|---|---|---|---|
| [ ] | US-01 | 5~10, 12 | AC-06 |
| [ ] | US-02 | 2~10 | AC-01, AC-02, AC-04, AC-10 |
| [ ] | US-03 | 5~10 | AC-03, AC-09 |
| [ ] | US-04 | 11~12 | AC-04, AC-05 |
| [ ] | US-05 | 12 | AC-05, AC-06 |
| [ ] | US-06 | 13 | AC-07 |
| [ ] | US-07 | 13 | AC-07 |
| [ ] | US-08 | 14 | AC-08 |
| [ ] | US-09 | 2~16, 첫 실행부터 | AC-09 |

공통 CC/NFR는 개별 테스트 이름·증거 위치로 구현 요약에 연결한다. 스토리 완료는 코드 존재만으로 체크하지 않으며 첫 실제 실행 성공만으로 전체 U-01을 완료하지 않는다. 경미한 내부 리팩터링/결함 수정은 해당 단계의 기재 경로에서 수행하고, 책임·계약·의존성·순서가 달라지면 계획을 갱신한다. 승인 범위를 바꾸는 변경은 차이/영향을 설명하고 재확인한다.

## 5. 실행 환경·증거와 승인

로컬 TLS는 setup이 Git 제외 파일에 준비하며 브라우저 신뢰가 없으면 필요한 로컬 준비를 안내한다. 자동 신뢰 저장소 변경·TLS 검증 해제·다른 서비스 종료로 우회하지 않는다. 실제 확인·설치에 사람의 도움이 필요할 때만 현재 준비 상태를 설명하고 요청한다. 이전 probe 설치/검증을 반복하도록 요구하지 않는다.

실제 제품 증거는 사용자 허용 합성 데이터와 공개 가능한 화면 영역을 직접 캡처한다. 주소/자격/개인 정보가 보이면 노출되지 않는 캡처 구도를 사용한다. 이미지 생성·모의 시안으로 실행 성공 화면을 만들지 않는다. 로그/감사는 환경변수 이름·존재 여부와 정제한 결과만 남기고 원시 API/모델/페이지 응답은 기록하지 않는다.

Security Baseline / Resiliency Baseline / Property-Based Testing은 모두 Enabled No, 전문 미로드·준수 N/A다. 운영 보안 고도화·고가용성·외부 접속 구축을 추가하지 않으며 기본 시크릿·입력·오류·사용자/탭 경계는 위 구현에 포함한다.

**계획 승인 질문**: 이 16단계 Code Generation 계획을 승인하고 구현을 시작할까요?

**계획 검토**: 16개 순차 단계와 미완료 체크박스, 원본 9개 스토리의 모든 AC 연결(총 10종), 계층별 생성/테스트/요약·migration·문서·로컬 실행 산출물을 대조했다. 관련 14개 문서의 표·fence·로컬 참조/anchor, 감사 append-only, .env Git 제외를 확인했다. 제품 코드·패키지 설치·브라우저/모델 실행은 수행하지 않았다.

**승인 상태**: 승인 완료. Part 1 완료, Part 2 실행 중. 코드 산출물 승인은 구현·검증 후 별도로 받는다.
