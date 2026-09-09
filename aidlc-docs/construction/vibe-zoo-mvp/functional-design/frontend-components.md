# U-01 — Frontend Components

**상태**: 2026-09-08T11:39:23Z Functional Design 사용자 승인 완료. Chrome Side Panel Keeper와 별도 Store 웹 UI의 논리 구성이다. [사용자 경험 시안](../../../../reference/mockups/index.html)·[구조 시안](../../../../reference/mockups/architecture.html)의 흐름을 실제 상태 계약으로 구체화하며 UI 프레임워크·통신 방식을 선택하지 않는다. 상태 의미는 [도메인](domain-entities.md), 판단은 [업무 규칙](business-rules.md), 순서는 [업무 흐름](business-logic-model.md)에만 정의한다.

## 1. 컴포넌트 계층과 props/state

props는 상위 화면이 전달하는 읽기 모델, 로컬 state는 작성 중 값·화면 선택 등 임시 UI 상태다. 이름은 개념 표기다. 권한·준비·성공·현재 버전은 Backend의 JobView/AssetView/검증 결과를 기준으로 표시한다.

| 부모 → 컴포넌트 | props / 표시 데이터 | 로컬 state와 사용자 행동 |
|---|---|---|
| 루트 → KeeperShell | 현재 사이트·탭 요약, 연결/실행 조건, 선택 대화, 자산 요약 | 채팅/도구/내 Skill/설정 선택. 열기 시 현재 대상 확인·prepare, 대화·자산 조회 |
| KeeperShell → TargetStatus | 화면의 현재 대상, 작업에 고정된 대상, 로그인/권한/단절 이유 | 연결/로그인 복구 후 재확인. 기존 작업의 원래 대상과 새 활성 탭이 다르면 둘을 구분 |
| KeeperShell → PreparationCard | 호환 자산, 기능별 준비, 생성 JobView, 지원 범위/이유, 요청 예시 | 취소·재요청·필요한 설치 진입. 검증된 기능은 전체 생성이 끝나기 전에도 사용 |
| KeeperShell → ChatPane | 대화 메시지, 관련 JobView, 현재 사용 가능 자산 | 작성 중 요청, 제출 오류/전송 중. 동일 대화로 요청을 보내고 관련 결과 표시 |
| ChatPane/PreparationCard → JobStatusCard | 진행 단계, 결과, 발생한 변경, 남은/미확인 범위, 가능한 다음 행동 | 취소·결과 확인·허용된 재요청. 장기 작업 카드와 채팅 입력을 독립 유지 |
| JobStatusCard → ChangeConfirmation | 고정된 대상·변경·입력·범위, 제안 유효성 | 확인/거절 전송 중. 제안이 바뀌면 오래된 확인 조작을 비활성화하고 새 내용을 표시 |
| KeeperShell → RecordSkillPane | 기록 범위/상태, 종료한 기록 참조, 학습 JobView | Record/Stop, Stop 후 직접 입력한 의도, 입력 오류. 시연 종류와 무관하게 Stop 가능 |
| RecordSkillPane → SkillDraftCard | 초안 절차·변수·기본값·성공 조건·의존 버전, 누락 기능, 검증 결과 | 다른 입력의 검증값, 생성/시연 필요 항목 선택. 검증 후 개인 저장·사용 결과 표시 |
| KeeperShell → PersonalSettings | 기본/개인 Skill·현재 사이트 자산, 적용 범위·의존성·준비·사용/이전 버전, 설정 revision | 선택 자산·편집값·저장 오류/충돌·저장 중. 이름/설명/기본값/on-off 저장, 선택 버전 공유 진입 |
| ChatPane/PersonalSettings → ImprovementCandidateCard | 기준 현재/후보 버전, 변경 이유, 실패·관련 성공 검증 요약, 적용 가능 여부 | 개선 요청, 통과 후보 ‘적용’, 보존한 이전 버전 복구. 요청 중 표시와 충돌 안내 |
| 루트 → StoreShell | 공유 목록, 현재 사용자 설치 상태 | 검색/필터, 선택 자산/버전. Keeper 개인 설정과 별개 화면 |
| StoreShell → AssetDetail | 설명·작성자·선택 버전·적용 대상·의존성·검증 범위/한계 | 특정 버전 설치 선택 |
| StoreShell → PublishForm | 공유할 개인 자산의 특정 버전, 공개 가능한 항목 | 게시 버전·공개 항목 선택, 오류/전송 중, 명시적 게시 |
| StoreShell → InstallStatus | 선택 버전·의존성·설치됨 여부·자체 검증 상태, 연결 다음 행동 | 자신의 Keeper에서 연결/로그인/검증으로 이어가기, 설치/검증 결과 재조회 |

## 2. API 통합 경계

아래는 [기존 컴포넌트 메서드](../../../inception/application-design/component-methods.md)에 대한 연결이다. HTTP URL·SSE/WebSocket·SDK 등 실제 endpoint/transport는 후속 기술 선택 후 구체화한다. UI가 C-04/C-05/C-06의 내부 메서드를 직접 호출하지 않는다.

| UI 진입점 | 기존 메서드와 요청 의미 | 응답 처리 |
|---|---|---|
| KeeperShell / PreparationCard | C-01 openKeeper → C-03 prepare(actor, target); C-03 query(assets/jobs/conversation). 대상은 C-02 resolveTarget으로 확인 | AssetView면 준비/권한을 나눠 표시, JobReceipt면 해당 생성 카드에 연결 |
| ChatPane | C-01 submitRequest → C-03 submit(actor, target, text, conversationRef) | 접수 참조를 같은 대화에 연결하고 JobView/WorkOutcome으로 갱신 |
| JobStatusCard / ChangeConfirmation | C-01 respondToJob → C-03 controlJob(confirm/cancel/retry); 결과 확인은 C-03 controlJob(reconcile) | Backend가 허용한 다음 행동·제안만 표시. 취소 접수만으로 외부 변경 없음 처리 금지 |
| RecordSkillPane / SkillDraftCard | C-01 controlRecord → C-02 record(start/stop); 최초 startWorkflow(learning)은 기록+명시 의도. 초안 후 보완은 기존 Job+고정 후보 버전+기대 입력 revision+검증 입력으로 BR-10의 같은 대기 작업을 이어감 | 기록/학습 참조와 revision이 맞는 초안·진행만 표시. 오래된 후보·취소 Job 보완은 거절하고 새 학습/재컴파일/완료 변경 재실행을 만들지 않음 |
| PersonalSettings | C-01 editSettings → C-03 changeAsset(settings, asset, patch + expectedRevision); query(assets) | 성공한 저장값/revision을 반영. 충돌 시 최신값과 미저장값을 구분 |
| ImprovementCandidateCard | C-03 startWorkflow(improvement); changeAsset(activate, 후보 + 보고서 + expectedCurrent); changeAsset(rollback, 이전 버전 + expectedCurrent) | 검증 성공은 ‘적용 가능’ 표시만. 적용 성공 조회 후 현재 버전을 갱신 |
| Store 목록/상세 | C-07 browse → C-03 query(catalog/assets, filter) | 공개 요약·버전과 자신의 설치 관계를 표시 |
| PublishForm / InstallStatus | C-07 publishSelected → C-03 changeAsset(publish); C-07 installSelected → C-03 startWorkflow(install) | Store에서 게시/설치 결과 표시. 본인 검증 Job은 자신의 Keeper로 연결 |

모든 요청은 확인된 사용자 문맥을 사용하고 선택한 대상·Job·자산·버전·revision을 연결한다. 전송 실패로 응답이 없으면 같은 접수/변경의 상태부터 조회한다. 기능별 오류 코드는 미정이지만 [BR-01~15](business-rules.md)의 거절 이유를 잃지 않아야 한다. 화면에는 사이트·탭 이름·업무·버전·이유를 표시하고 원시 런타임 식별자·내부 연결 정보를 사용자 선택 항목으로 노출하지 않는다.

## 3. 폼 검증과 상호작용

| 입력/조작 | 제출 전 검증·연결 | 오류·복귀 |
|---|---|---|
| 채팅 요청 | 공백뿐인 요청은 보내지 않는다. 도구 입력은 BR-04의 실제 계약을 따르며 필요한 값을 구체적으로 입력받는다. | 작성 중 내용 유지, 실행 전 누락 항목 안내 |
| Record/Stop/의도 | 기록 중 표시·범위를 유지한다. 같은 탭·허용 출처 내 페이지 시연은 BR-10으로 기록한다. Stop 후 같은 기록에 직접 입력한 비어 있지 않은 의도가 있어야 학습 제출 가능하다. | 범위 이탈·관찰 불가 등 불완전 이유와 재시연 안내. 이전 기록 응답으로 현재 의도 초기화 금지 |
| Skill 검증 입력 | 초안 변수 계약에 맞고 시연과 다른 판별 가능한 입력을 사용한다. 누락 의존성은 준비되지 않은 것으로 표시한다. | 필드 오류·누락 도구를 안내. 실제 변경 확인은 JobStatusCard 경로 사용 |
| 개인 설정 | 이름·설명, 기본값, on/off는 BR-11/04로 검사한다. 의미 있는 편집값과 expectedRevision을 함께 보낸다. | 해당 필드 오류 표시. 충돌 시 저장 성공 처리하거나 최신 편집을 자동 덮어쓰지 않음 |
| 변경 확인 | BR-05의 고정 제안과 현재 유효성을 표시한다. 적용 범위·입력 변경 시 이전 확인을 재사용하지 않는다. | 취소/거절/대상 변경 이유와 다시 확인할 내용 표시 |
| 개선 적용/복구 | 정확한 후보·검증 요약·기준 현재 버전 또는 선택한 이전 버전을 보낸다. BR-13/14 조건을 Backend에서도 검사한다. | 현재 버전 충돌·검증 부족을 표시하고 최신 상태 재조회. 자동 재적용 금지 |
| 게시/설치 | 게시할 특정 버전·공개 항목, 설치할 특정 버전 선택이 필요하다. 개인 기본값을 자동 공개하지 않는다. | 공개 불가 내용은 수정 안내. 설치와 로그인/호환성/검증 부족을 따로 표시 |

검증은 사용자의 수정 지점 가까이에 표시하고 Backend에서도 같은 의미를 검사한다. 범용 폼에 MinIO 전용 이름 규칙을 강제하지 않는다. 요청 중 중복 클릭을 제어하되 Backend의 중복 판정을 대신하지 않는다. 값의 길이 한도 등 미정 수치는 NFR/구현 계약에서 정한다.

## 4. 상태별 표시와 다음 행동

| 읽기 모델의 상태 | 사용자에게 표시할 내용 | 다음 행동 |
|---|---|---|
| 최초 빈 상태 / 호환 자산 없음 | 현재 사이트와 시작된 생성 단계 | 자동 생성 진행 확인. 별도 관리자 등록·필수 매뉴얼 폼 없음 |
| 진행 / 부분 준비 | 실제 단계·기능별 검증 결과·이미 준비된 기능 | 취소, 채팅, 준비된 기능 사용. 같은 탭 동작 충돌은 Backend 대기 사유 표시 |
| 로그인 필요 / 권한 부족 / 단절 | 자산 설치·준비 상태와 현재 실행 불가 이유를 분리 | 사용자 웹앱의 로그인/권한·연결 복구 후 대상과 결과 재확인 |
| 탭·문서 불일치 | 원래 작업 대상과 현재 선택 대상, 중단 이유 | 원래 대상 재확인 또는 새 요청. 기존 작업의 대상을 조용히 교체하지 않음 |
| 확인 대기 | 고정 대상·변경·입력·범위 | 확인 또는 거절. 응답이 늦으면 최신 제안 상태 확인 |
| 취소 요청 / 중단 | 새 전달 중단 여부와 이미 전달된 동작의 확인 상태 | 결과 확인. 즉시 ‘변경 없음’이나 자동 롤백 완료로 표시하지 않음 |
| 결과 미확인 | ‘실행 결과를 확인하지 못함’, 알려진 변경과 미확인 범위 | 결과 확인. 변경 업무 전체를 곧바로 재실행하는 버튼으로 연결하지 않음 |
| 실패 / 부분 완료 | 원인, 완료/남은 단계와 불확실성 | Backend가 허용한 범위의 재요청·재개 또는 수정 |
| 후보 / 미지원 / 의존 도구 미준비 | 실제 준비 범위·누락 기능·검증 실패 이유 | 입력 보완·생성·시연·재검증. on으로 준비 상태를 바꾸지 않음 |
| 검증된 개선 후보 | 변경 이유와 실패·관련 성공 검증 요약, 현재/후보 구분 | 명시적 ‘적용’. 성공 응답 후 향후 업무 버전 표시 |
| 게시됨 / 설치됨 | 선택 게시 버전, 본인의 설치와 자체 검증 상태 | 별도 Store에서 조회, 자기 Keeper 검증/사용으로 이동 |

## 5. 화면 일관성과 MVP 경계

- 최초 도구/기본 Skill과 개인 Skill은 승인된 검증·저장 흐름을 유지한다. 개선 후보에만 명시 ‘적용’을 둔다. 실제 웹앱 변경 확인은 별도 공통 조건이다.
- 대화·작업·개인 설정은 재접속 후 조회해 복원한다. 초안 편집은 저장된 값과 구분하고 연결 복구를 기존 실행 허가로 표시하지 않는다. 오래된 Job/기록/설정 응답은 최신 revision을 덮어쓰지 않는다.
- 도구·내 Skill·설정의 일반 기능명을 유지한다. Zoo 캐릭터/문구는 보조 표현이며 사용자는 사육사, 중앙 Agent는 훈련사다. 내부 엔진·배포 선택을 제품 시작 화면에 요구하지 않는다.
- 시안의 타이머·고정 도구 수·즉시 성공을 실제 진행으로 이식하지 않는다. 지원/미지원은 관찰·실행 근거를 표시하며 일반화된 전 사이트 지원을 주장하지 않는다.
- [수용조건 연결표](business-logic-model.md#8-수용조건-연결과-검토-시나리오)를 그대로 사용한다. 별도 화면별 AC 문서를 추가하지 않는다. 실제 제품 화면과 스크린샷 증거는 구현 이후에 만든다.
