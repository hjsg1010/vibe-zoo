# Vibe Zoo — Component Methods and Contracts

**상태**: 원문 재검토 후 승인된 Application Design. [컴포넌트](components.md)의 상위 인터페이스이며 구현 API·언어·전송 규격을 확정하지 않는다. 아래 계약이 공통 정의의 원본이다. 상세 필드 제약·상태 전이·원자성은 유닛별 Functional/NFR Design에서 정한다.

## 1. 공통 입출력

표의 필드는 의미상 필수 정보다. 참조값은 런타임에서 사용하되 실제 식별자·주소·인증정보를 공개 문서/로그에 넣지 않는다. 요청자가 보낸 사용자 식별자만 신뢰하지 않고 C-03에서 인증·소유권을 확인한다.

| 타입 | 의미와 주요 정보 |
|---|---|
| ActorContext | 확인된 요청 사용자와 접근 범위. 웹앱 로그인 정보·쿠키를 자산으로 복사하지 않는다. |
| BrowserTarget | 해당 사용자의 Extension 연결·탭·문서/페이지 상태·출처와 필요한 하위 관찰 범위. 자산 적용 사이트와 현재 실행 대상을 구분한다. |
| JobContext | ActorContext, 작업 참조, 선택적 대화 참조, 필요한 BrowserTarget, 고정한 자산 버전, 탐색 예산과 ExecutionControl. 생성 초기처럼 자산이 없으면 버전 미지정 사유를 명시한다. 브라우저 작업은 대상 없이 실행하지 않는다. |
| ExecutionControl | C-03이 관리하는 현재 작업 유효성·취소 상태·대상/버전·변경 확인의 검증 인터페이스. 전달 시점의 캐시만으로 실행을 허용하지 않으며 각 브라우저 동작과 결과 반영 시 현재 상태를 확인한다. |
| AssetVersionRef | 자산 식별 참조와 특정 버전. 개인 소유/설치 관계와 공유 버전의 출처를 연결하며 실행 중 최신 버전으로 바꾸지 않는다. |
| Observation | 관찰한 대상·페이지 상태·가능한 행동·관찰 한계와 최소 근거. 접근할 수 없는 영역은 관찰 사실로 만들지 않는다. |
| RecordData | Record 시작/종료 범위와 민감 입력을 제외한 시연 신호. 수집 방식은 미정이며 전체 영상을 필수로 요구하지 않는다. |
| EvidenceRef | 자산/작업/입력 사례와 연결된 관찰·검증 근거의 참조 및 공개 가능 요약. 참조가 원본 기록·개인 대화 접근 권한을 제공하지 않는다. |
| ToolBundle | 도구 계약(이름·설명·입력), 실행 어댑터, 성공 판정, 기본 Skill, 검증 근거, 버전의 여섯 요소. 검증 전에는 근거의 미완료 상태를 명시한다. |
| SkillAsset | 절차·변수·기본값·성공 조건·의존 도구의 특정 버전과 적용 대상·근거·자체 버전. 기본/개인 Skill을 구분하고 미준비 의존성을 표시한다. |
| CandidateOutput | ToolBundle 또는 SkillAsset 후보, 생성/변경 이유, 필요한 추가 관찰·누락 기능·검증 제안. 추가 관찰/변경은 실행 요청으로 조정자에게 돌려준다. |
| ChangeProposal / Confirmation | 수행 대상·변경 내용·관련 입력·작업·버전을 표시하는 제안과 사용자 응답. 확인 효력은 해당 제안에 연결되며 다른 대상·변경으로 전용하지 않는다. |
| BrowserOperation / BrowserReceipt | 어댑터에서 도출된 지정 동작과 수행 여부·관찰 상태·불확실성. 표현/전달/실행 기술은 미정이다. Receipt만으로 업무 성공을 선언하지 않는다. |
| ValidationCase / ValidationReport | 입력·기대 사후 조건·관련 자산 버전을 가진 사례와 관찰 결과·근거·통과/실패/미확인 범위. 새로운 입력 및 개선 시 실패/관련 성공 사례를 구분한다. |
| WorkOutcome | 업무 사후 상태 판정, 실제 발생한 변경 요약, 근거, 실패/중단/부분 완료/확인 불가 이유와 다음 행동. 상태 의미는 CC-02를 참조한다. |
| JobReceipt / JobView | 접수한 작업 참조와 대화·진행·상태·현재 대상·확인 요청·결과. 접수됨은 성공이 아니다. 대화/작업과 연결 상태를 별도로 표현한다. |
| AssetView / CatalogView | 자산 요약, 선택 버전·의존성·근거/검증 범위·개인 설정과 설치 상태. 현재 사용자의 실행 권한/로그인 상태는 별도 정보다. |

모든 호출은 목적에 맞는 결과 또는 원인이 있는 오류/중단 결과를 반환한다. 잘못된 대상·권한, 입력 오류, 미지원, 예산 도달, 취소, 오래된 결과, 의존성/버전 불일치, 실행 후 결과 미확인을 구분한다. UI가 실패를 성공으로 변환하지 않으며 상태·재개 규칙은 [CC-01~08](../user-stories/stories.md)을 참조한다. 오류 코드·스키마·재시도 횟수는 여기서 선확정하지 않는다.

## 2. 컴포넌트별 메서드

아래 표기에서 list는 목록, text는 텍스트, map은 계약에 맞게 검증할 이름/값 집합이다. 브라우저가 필요 없는 설정·Store 조회는 BrowserTarget을 요구하지 않는다. 모든 자산 접근에는 ActorContext 권한을 적용한다.

### C-01 — Keeper UI

| 메서드와 입출력 | 목적 |
|---|---|
| openKeeper(target: BrowserTarget) → AssetView 또는 JobReceipt | C-03에 준비 요청 후 자산 또는 생성 진행을 표시한다. |
| submitRequest(target, text, conversationRef) → JobReceipt | 같은 대화의 업무·학습·개선 요청을 C-03에 전달한다. |
| controlRecord(target, command: start/stop) → 기록 진행 상태 또는 RecordData | C-02 기록 제어와 수집 범위를 표시하고 Stop 뒤 명시적 의도를 입력받아 최소 기록과 함께 C-03에 전달한다. |
| editSettings(asset: AssetVersionRef, patch: map) → AssetView | 이름·설명·기본값·활성 상태 편집을 C-03에 요청한다. |
| respondToJob(jobRef, action: confirmation/cancel/retry) → JobView | 확인·중단·재요청을 전달하고 결과·실행 대상을 갱신한다. |

### C-02 — Browser Bridge / Recorder

| 메서드와 입출력 | 목적 |
|---|---|
| resolveTarget(actor: ActorContext, selection: map) → BrowserTarget 및 관찰 가능 범위 | 실제 연결·탭·문서·출처·권한을 확인한다. 선택값만으로 실행 권한을 부여하지 않는다. |
| observe(job: JobContext, scope: map) → Observation | 현재 페이지의 접근 가능한 최소 근거를 수집하고 전송 전 민감 입력을 제외한다. |
| record(actor, target, command: start/stop) → 기록 진행 상태 또는 RecordData | 표시된 범위의 시연을 기록·종료한다. 대상 변경·중단을 기록 상태에 반영하고 민감 입력을 제외한 기록을 반환한다. |
| execute(job, operation: BrowserOperation, confirmation: 선택적 Confirmation) → BrowserReceipt | 현재 실행 제어·대상·권한과 필요한 확인을 마지막으로 검사한 뒤 지정 동작을 수행한다. |
| inspect(job, successCondition: map) → Observation | 실행 뒤 업무 사후 상태를 관찰한다. 못 확인한 결과는 그대로 돌려준다. |

### C-03 — Keeper Orchestrator

| 메서드와 입출력 | 목적 |
|---|---|
| prepare(actor, target) → AssetView 또는 JobReceipt | 호환 자산 확인, 권한/연결 상태 분리, 없으면 중복되지 않는 생성 작업으로 연결한다. |
| submit(actor, target, request: text, conversationRef) → JobReceipt | Keeper Agent가 관련 Skill·도구를 선택하고 MCP 기반 다단계 실행을 조정한다. |
| startWorkflow(actor, kind: generation/learning/improvement/install, input: map) → JobReceipt | 근거·명시적 의도·선택 버전을 확인해 해당 서비스 작업을 시작한다. |
| checkControl(job, target, asset: 선택적 AssetVersionRef, proposal: 선택적 ChangeProposal) → 허용/중단/확인 필요 | ExecutionControl의 현재 권한·취소·대상·버전 유효성 검사를 제공한다. 검증 실행에도 동일하게 적용한다. |
| controlJob(actor, jobRef, action: confirm/cancel/retry/reconcile, input: map) → JobView | 응답·취소·단절 후 결과 확인/재개를 관리한다. 재시도는 미확인 변경의 반복 실행을 뜻하지 않는다. |
| query(actor, kind: jobs/conversation/assets/catalog, filter: map) → JobView 또는 AssetView 또는 CatalogView | 자신의 대화·작업·자산과 접근 가능한 공유 목록을 조회한다. |
| changeAsset(actor, operation: settings/publish/activate/rollback, asset, input: map) → AssetView | 개인 설정·선택 버전 게시·검증 결과에 따른 적용·복구 요청을 C-06에 연결한다. |

### C-04 — Generation / Learning

| 메서드와 입출력 | 목적 |
|---|---|
| generateTools(job, observations: list Observation, available: list AssetView) → CandidateOutput | **MCP Generator**가 실제 근거로 ToolBundle과 기본 Skill 후보를 생성한다. |
| compileSkill(job, record: RecordData, explicitIntent: text, tools: list AssetView) → CandidateOutput | 기존 도구를 조합한 개인 Skill을 만들고 누락 도구/미지원 단계를 드러낸다. |
| proposeImprovement(job, current: ToolBundle 또는 SkillAsset, failureAndSuccess: list ValidationCase, correction: 선택적 text 또는 RecordData) → CandidateOutput | 재현 실패와 관련 성공 사례에서 원인·변경 이유가 있는 새 버전 후보를 만든다. 사용자 수정·추가 시연은 선택적 보조 근거이며 없어도 후보 생성을 시작할 수 있다. |

C-04는 전달받은 최소 근거와 자산으로 후보를 만든다. 추가 관찰과 검증 제안은 C-03에 반환하며 브라우저 실행·Registry 변경·자산 활성화를 직접 수행하지 않는다. 실제 모델 공급자/엔진 연결은 후속 기술 선택이다.

### C-05 — MCP Execution / Validation

| 메서드와 입출력 | 목적 |
|---|---|
| discover(job, task: text) → 현재 작업에 적합한 도구 계약 목록 | 개인 활성 설정·적용 대상·버전에 맞는 실제 MCP 도구 검색 경로를 제공한다. 정적 JSON 목록만으로 연결 완료로 보지 않는다. |
| call(job, tool: AssetVersionRef, arguments: map) → WorkOutcome | 입력·현재 제어·버전을 확인하고 실제 MCP 호출을 해당 어댑터와 C-02 실행/관찰에 연결한다. |
| validate(job, candidate: AssetVersionRef, cases: list ValidationCase) → ValidationReport | 선택 후보에 한정한 검증 실행 권한으로 실제 실행·사후 상태를 확인한다. 미검증 후보를 일반 사용 도구로 노출하지 않는다. |

검증·일상 실행 모두 C-06에서 정확한 버전을 읽고 C-02를 통해 관찰한다. Skill 검증의 다단계 실행은 C-03의 Keeper Agent가 조정하고 C-05는 해당 MCP 호출 결과와 전체 업무 사후 관찰을 검증 보고서로 연결한다. validate 호출을 이유로 완료한 Skill 변경을 다시 실행하지 않는다. 변경 제안은 C-03/C-01 확인 경로를 사용한다. 실행 모드와 검증 모드의 노출·권한 차이는 상세 설계에서 구체화한다.

### C-06 — Asset Registry / Personal Settings

| 메서드와 입출력 | 목적 |
|---|---|
| find(actor, applicability: map, scope: personal/shared) → list AssetView | 개인/공유 호환 자산과 설정·설치 상태를 조회한다. |
| readVersion(actor, asset: AssetVersionRef) → ToolBundle 또는 SkillAsset | 권한이 있는 특정 버전과 연결된 근거를 읽는다. |
| saveCandidate(job, candidate: CandidateOutput) → AssetVersionRef | 검증할 후보를 개인 영역에 버전으로 저장한다. 활성·게시를 동반하지 않는다. |
| recordValidation(job, report: ValidationReport) → EvidenceRef | 검증 대상·입력 사례·결과를 연결해 보존한다. 취소 뒤 보존한 결과도 자동 활성화 근거가 되지 않는다. |
| updateSettings(actor, asset, patch: map, expectedRevision) → AssetView | 개인 설정을 저장하고 충돌·의존성 상태를 드러낸다. 개인 on/off는 검증·준비 상태를 승격하지 않으며 미검증 후보·설치 자산은 activate의 조건을 통과하기 전 실행할 수 없다. 공유 원본 버전을 덮어쓰지 않는다. |
| activate(job, asset, evidence: EvidenceRef, expectedCurrent) → AssetView | 현재 작업·검증 범위·버전 조건을 만족한 자산을 사용 버전으로 반영한다. |
| publish(actor, selected: AssetVersionRef, publicProjection: map) → AssetView | 선택한 버전의 공유 가능 자산·설명·근거 요약만 게시한다. |
| install(actor, shared: AssetVersionRef) → AssetView | 특정 공유 버전과 의존성을 개인 영역에 연결하고 본인 환경 검증이 필요한 상태로 기록한다. |
| rollback(actor, previous: AssetVersionRef, expectedCurrent) → AssetView | 보존한 이전 버전으로 사용 버전을 전환한다. 웹앱 변경을 되돌리는 기능은 아니다. |

C-03이 변경을 조정하고 C-05는 검증 결과를 반환한다. C-06은 접근·버전·검증 조건을 저장 경계에서도 확인한다. 취소/활성화 경합을 막는 구체적 원자성 방식은 Functional/NFR Design 대상이다.

### C-07 — Store UI

| 메서드와 입출력 | 목적 |
|---|---|
| browse(filter: map) → CatalogView | C-03을 통해 공유 자산·작성자·적용 범위·의존성·검증 범위를 표시한다. |
| publishSelected(asset: AssetVersionRef) → AssetView | 사용자가 선택한 버전을 C-03 게시 흐름에 전달한다. |
| installSelected(asset: AssetVersionRef) → JobReceipt 또는 AssetView | 설치자에게 특정 버전 설치 상태와 자기 탭에서 검증할 다음 행동을 표시한다. |

Store는 웹앱의 사용자 세션을 전달하지 않는다. 설치 후 실행 검증은 연결된 자신의 Keeper와 C-03 작업으로 이어진다.
