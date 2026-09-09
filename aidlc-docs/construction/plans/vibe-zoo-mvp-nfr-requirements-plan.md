# U-01 — NFR Requirements Plan

## 1. 범위와 진행 방식

- **상태**: 2026-09-08T11:39:23Z [Functional Design 산출물 승인](vibe-zoo-mvp-functional-design-plan.md)으로 NFR Requirements를 시작했다. 2026-09-09 Q1~Q3 답변을 완료했고 사용자가 기본 모델을 Opus 4.8로 의도 변경했다. 추천 조합의 제한 통합 검증을 명시 허용받아 수행한다. 과거 Haiku 검증은 보존한다. 기존 요청자 Chrome/MinIO 탭의 제한된 실제 읽기 왕복을 통과해 기술 추천과 두 산출물을 정리했다. 공용 서버·제품 생성/학습은 미검증이며 NFR 산출물은 2026-09-09T01:15:35Z 승인됐으며 이후 산출물 승인은 별도다.
- **유닛/깊이**: U-01 / vibe-zoo-mvp, Standard. 1박 2일·5명의 실제 MVP 완주에 필요한 비기능 조건·기술 결정만 다룬다. 참여자 수를 동시 사용자 수나 서버 용량으로 환산하지 않는다.
- **기준선**: [최초 제약](../../../requirements/constraints.md), [requirements.md](../../inception/requirements/requirements.md), [스토리](../../inception/user-stories/stories.md), [유닛](../../inception/application-design/unit-of-work.md), [실행 계획](../../inception/plans/execution-plan.md), 승인된 [도메인](../vibe-zoo-mvp/functional-design/domain-entities.md)·[BR-01~15](../vibe-zoo-mvp/functional-design/business-rules.md)·[흐름](../vibe-zoo-mvp/functional-design/business-logic-model.md)·[Frontend](../vibe-zoo-mvp/functional-design/frontend-components.md).
- **원칙**: FR/AC/NFR·CC·BR 정의는 참조하고 같은 요구를 재작성하지 않는다. 사용자만 아는 접근·환경 제약을 확인한 뒤 에이전트가 언어·엔진·전송·저장 등 기술 조합과 대안을 구체화한다. 라이브러리·서버 사양·보존기간 숫자를 사용자에게 하나씩 정하게 하지 않는다.

## 2. 질문 범주 평가

| 범주 | 이미 결정된 조건 / 이번 단계에서 구체화할 내용 | 사용자 확인 |
|---|---|---|
| Scalability | AC-07의 다른 사용자/세션, CC-08의 긴 생성 중 일반 채팅을 확인한다. 요청별 제한·같은 탭 동작 조정에 필요한 최소 동시성만 정한다. 조직 규모·자동 확장 계획은 추가하지 않는다. | 별도 규모 질문 없음 |
| Performance | 탐색 시간·행동·토큰·재시도 상한, 준비 자산 재사용, 대표 흐름 지연·토큰 기록은 확정이다. 초기 설정값과 실제 측정 후 조정 기준을 제안하되 성능 보장·별도 부하 시험을 만들지 않는다. | Q1의 알려진 API 제한·비용 조건 반영 |
| Availability | HA/DR는 제외한다. 대화·작업·자산·설정의 재조회와 연결 복구 후 상태 일관성을 확인한다. 서비스 무중단·운영 SLA는 묻지 않는다. | Q2의 데모 접속 조건 반영 |
| Security | 최소 인증·소유권·대상/입력 검증, 민감 입력 제외·개인/공유 분리는 확정이다. 데모 신원 확인, 전송/저장/삭제 경계와 최소 근거의 수명을 구체화한다. | Q3의 모델 전송 제약 |
| Tech Stack Selection | 사용자가 변경한 Bedrock / Claude Opus 4.8을 기준으로 Backend 언어·Agent 엔진/SDK·MCP transport·Bridge·어댑터·Recorder·저장·작업 처리·Store를 비교한다. 요청한 TS/Node 조합의 작은 검증 결과를 기술 결정에 연결한다. | Q1~Q3 완료; 실제 검증 환경의 준비 여부만 확인 |
| Reliability | BR-02~09·13의 대상 확인·취소·제한 관찰·미확인 변경·반영 경합을 충족할 제어/저장 조건을 정한다. 이미 승인된 업무 정책은 다시 묻지 않는다. | 새 업무 질문 없음 |
| Maintainability | 최소 모듈·설정 분리·간단한 로그·핵심 테스트·CI·README·실제 스크린샷은 확정이다. 선택 기술의 실행/의존성 관리와 검증 경로에 연결한다. | 별도 운영 체계 질문 없음 |
| Usability | 승인 Keeper/Store 구성과 상태별 다음 행동을 유지한다. 필요한 권한 요청·연결/로그인 복구·대기/취소 피드백을 선택 기술과 연결한다. | Q2의 설치 경험 반영 |

## 3. 결정할 기술과 필수 산출물

| 필수 산출물 | 이 문서가 소유할 내용 |
|---|---|
| construction/vibe-zoo-mvp/nfr-requirements/nfr-requirements.md | NFR-01~08의 유닛 적용 조건·확인 방법, 데이터 전송/저장/삭제 경계, 탐색/작업 예산, 사용자/대상·취소·재접속·부분 결과, 최소 품질·관찰 범위. 구체 구조는 NFR Design에서 이어간다. |
| construction/vibe-zoo-mvp/nfr-requirements/tech-stack-decisions.md | 기술별 선택·대안·근거·가정·미검증 위험과 실제 검증 조건. 언어/Frontend/엔진/제품 모델, MCP/Bridge/어댑터/Recorder, 저장·작업 처리·Store를 한 문서에 연결한다. |

답변과 공식 문서 근거를 바탕으로 하나의 최소 조합을 제안한다. MCP의 실제 검색/호출, 지정 사용자 탭 실행, 변경 입력 검증·취소를 충족해야 하며 모델 생성의 품질이나 배포 적합성을 문서 조사만으로 검증 완료 처리하지 않는다. NFR 단계의 비교/선택과 승인된 Code Generation에서의 실행 검증을 구분한다. 실제 설치 장소·접속 설정·배포 자원은 Infrastructure Design에서 구체화한다.

## 4. 선행 기술 근거

2026-09-08 공식 Chrome 문서를 확인했다. 이는 선택을 제한하는 근거이며 특정 실행 어댑터·배포의 채택 또는 런타임 검증 결과가 아니다.

| 근거 | 기술 선택에 주는 제약 |
|---|---|
| [Extension CSP](https://developer.chrome.com/docs/extensions/reference/manifest/content-security-policy) | 일반 Extension 페이지의 최소 CSP에 unsafe-eval을 추가할 수 없다. 서버 생성 JavaScript를 그대로 평가하는 방식을 기본안으로 고정하지 않는다. |
| [MV3 Store 요구사항](https://developer.chrome.com/docs/webstore/program-policies/mv3-requirements) | Q2 답변으로 Chrome Web Store 배포는 MVP 제외다. 이 심사 정책을 이번 데모의 완료 조건으로 추가하지 않는다. 추후 공개 배포 적합성은 미검증으로 남기며 실제 Extension의 MV3/CSP 제약은 계속 적용한다. |
| [개발자 모드 설치](https://developer.chrome.com/docs/extensions/get-started/tutorial/hello-world#load-unpacked) | unpacked 패키지를 로컬 개발용으로 설치할 수 있다. 개발 설치의 실행 증거와 공개 배포 적합성을 구분한다는 것은 위 문서들을 함께 적용한 설계 판단이다. |

Side Panel·탭/문서 권한·프레임 접근에 대한 공식 자료도 독립 검토했다. 사용할 API와 최소 Chrome 버전, 실제 관찰/실행 지원 범위는 기술안을 작성할 때 직접 근거와 연결한다. 제한을 우회하거나 다른 브라우저로 대체하는 설계는 제안하지 않는다.

## 5. Question 1 — 실제 사용할 모델 API 접근

제품 Backend에서 실제 호출에 쓸 수 있는 모델 API 계정이나 크레딧이 이미 준비되어 있나요?

**추천 방향**: 이미 접근 가능한 모델 API가 있다면 한 공급자를 우선 사용해 첫 생성·도구 호출 흐름을 검증한다. 계정 준비와 초기 연동 범위를 줄이기 위한 제안이며 특정 모델의 품질·지원·비용을 검증했다는 뜻은 아니다. 개발용 Codex 지정으로 제품 모델 접근이 확보됐다고 판단하지 않는다.

A) 사용 가능한 API가 있음 — 공급자와 알고 있는 사용 가능 모델명을 알려준다. 이미 정해진 비용·네트워크 제한이 있으면 그 조건만 덧붙인다.

B) 아직 준비된 API가 없음 — 접근 가능한 후보·설정과 비용 조건을 비교해 추천받는다.

X) 기타 — 조직의 승인 모델 서비스 등 별도 조건을 설명한다.

[Answer]: A — 2026-09-09T00:20:50Z 사용자가 해커톤 제공 Amazon Bedrock / Anthropic Claude Haiku 4.5를 초기 제품 모델로 지정했다. AWS_BEARER_TOKEN_BEDROCK, AWS_REGION, BEDROCK_MODEL_ID를 루트 .env에 제공했으며 세 설정은 비어 있지 않다. Git 제외·미추적 상태를 확인했다. 이후 일반 응답·도구 호출 응답 각 1회가 HTTP 200과 해당 형식 검증을 통과했다(9절). 키 만료일·잔여 크레딧은 미확인이다. Backend 언어·SDK·엔진·하네스·배포는 미정이다.

**의도적 변경 — 2026-09-09T00:39:01Z**: 기본 모델을 Claude Opus 4.8로 변경한다. 모든 제품 생성/학습/채팅·Agent 호출은 BEDROCK_MODEL_ID를 읽는다. ANTHROPIC_MODEL과 [1m]은 Backend API modelId에 반영하지 않는다. 기존 Haiku 결과는 당시 결과로만 보존하며 자동 fallback하지 않는다. 요청한 기술 조합은 작은 검증안이며 전체 제품 기술 선택/이후 단계 승인은 아직 아니다.

실제 키·계정 식별자·비공개 endpoint 값은 요청하거나 이 문서에 기록하지 않는다. 일반 공급자/모델명과 접근 가능 여부로 시작하고, 실행에 필요한 값은 이후 저장소 밖에서 주입한다. ‘추천대로’라는 답변만으로 실제 계정·과금 권한이 있다고 추정하지 않는다.

## 6. Question 2 — 첫 데모 설치·접속 범위

첫 데모는 개발자 모드로 설치한 Extension과 참여자들이 접속할 수 있는 팀 운영 Backend를 기준으로 진행할까요?

**추천: A.** 해커톤의 실제 두 사용자 검증과 핵심 흐름을 준비할 최소 출발점이다. 사용자에게 CLI·Agent 앱 실행을 맡기지 않는다. Backend의 실제 운영 장소·접속 가능 여부는 답변의 제약을 확인한 뒤 구체화한다.

A) 팀 데모 환경 — 개발자 모드 Extension 설치와 팀이 준비하는 공용 데모 Backend를 기준으로 한다. 사용할 수 있는 네트워크/실행 환경의 제한이 있으면 설명한다.

B) 공개 Chrome Web Store 배포까지 필요 — 심사·배포 조건을 MVP 기술 선택에 포함한다. Vibe Zoo의 자산 공유 Store와는 별개다.

X) 기타 — 별도 설치 방식 또는 실행 환경 제약을 설명한다.

[Answer]: A — 2026-09-09T00:32:12Z 개발자 모드 Extension과 참여자가 접속하는 팀 공용 Backend를 첫 데모 기준으로 지정했다. Extension은 Side Panel·관찰·시연 기록·실제 브라우저 조작, Backend는 preset 조회·도구/MCP/Skill 생성·모델/Agent 흐름·자산 저장/공유를 맡는다. 실행은 요청한 사용자의 로그인 세션과 대상 탭에 한정하며 별도 사용자 CLI/하네스 실행을 요구하지 않는다. Chrome Web Store 배포는 MVP 제외, Vibe Zoo 자산 Store는 유지한다.

실제 서버 자원·주소·참여자 연결은 아직 미확인이다. Backend 언어·엔진·구체 배포는 미정이며 사용자는 가벼운 추천안을 요청했다. 승인된 C-01~07·CC/BR 경계와 충돌하지 않으므로 중복 확인은 하지 않는다. 팀 공용이라는 조건을 사용자별 컨테이너/Kubernetes 필요성이나 물리 인스턴스 수 확정으로 해석하지 않는다.

## 7. Question 3 — 데모 데이터와 모델 전송

첫 MinIO 데모는 합성 업무 데이터로 구성하고, 민감정보를 제외한 최소 관찰·시연 근거만 글로벌 추론을 사용하는 Bedrock 모델로 전송해도 될까요?

**추천: A.** 합성 버킷·파일·업무명으로 실제 생성·호출·브라우저 실행을 검증한다. 비밀번호·토큰·쿠키·인증 헤더를 제외한 필요한 DOM/행동 요약만 전송한다. 요청 리전 밖에서 처리될 수 있는 글로벌 추론을 해당 합성 데모 범위에서 허용하는 선택이며 실제 사내 데이터·전체 DOM·관찰 원본·전체 녹화의 포괄 전송 허용은 아니다.

A) 합성 데모 데이터와 최소 모델 전송 — 해당 데모 범위에서 글로벌 Bedrock 추론에 필요한 필터된 근거만 전송한다.

B) 별도 전송 제한이 있음 — 허용된 모델 환경/데이터 종류/망 제약의 유형을 설명하고 그 조건 안에서 기술을 선택한다.

X) 기타 — 데모 데이터나 처리 경계에 필요한 다른 조건을 설명한다.

[Answer]: A — 2026-09-09T00:39:01Z 합성 업무 데이터로 구성한 MinIO 데모에서 도구/MCP 생성·Skill 학습·실행 검증에 필요한 최소 페이지 관찰/시연 근거를 글로벌 Bedrock 모델로 전송하도록 명시 승인했다. 요청 리전 밖 처리 가능성을 이해했고 비밀번호·토큰·쿠키·인증 헤더 등 민감정보는 제외한다. 다른 사이트나 실제 사내 자료의 전송은 이번 허용 범위가 아니다.

사용자/개인/공유 분리와 민감정보 제외를 유지한다. 보존·삭제의 최소 구현 조건은 두 필수 NFR 산출물에 정리한다. 데이터 전송 범위의 추가 모호성은 없다.

선택한 모델의 글로벌 추론은 요청 리전 밖에서 처리될 수 있으므로 리전 설정만으로 처리 위치를 고정했다고 보지 않는다. 이번 합성 문자열 두 요청의 허용을 사내 페이지·Record 자료의 전송 허용으로 전용하지 않는다. Q3에서는 이 차이를 설명하고 데모 데이터 범위의 제약을 확인한다. 근거: [글로벌 추론](https://docs.aws.amazon.com/bedrock/latest/userguide/global-cross-region-inference.html).

## 8. 수행 체크리스트와 승인 경계

- [x] Functional Design 산출물 승인을 원문·시각과 함께 기록하고 NFR Requirements로 전환한다.
- [x] 적용 규칙·승인 Functional Design·최초 요구사항/제약을 읽고 기술 미결정 사항을 확인한다.
- [x] 질문 8개 범주와 사용자만 제공할 수 있는 정보를 독립 평가한다.
- [x] 필수 산출물 두 개와 기술 비교·실행 검증의 경계를 계획한다.
- [x] 사용자 답변과 독립적인 Chrome 공식 문서 제약을 확인한다.
- [x] 계획·상태·승인 메타데이터의 문서 구조/참조를 검증하고 첫 질문을 감사 기록에 남긴다.
- [x] Q1 모델 API 접근 답변을 확인하고 필요하면 모델/엔진 후보를 조사한다 — 초기 Bedrock/Haiku 지정과 검증 요청 수신; 다른 모델로 자동 대체하지 않음.
- [x] Q2 데모 설치·접속 범위를 확인한다 — developer mode + 팀 공용 Backend; 실제 자원/주소/연결은 후속 검증 필요.
- [x] Q3 데모 데이터·모델 전송 제약을 확인한다.
- [x] 답변 간 모호성·충돌을 해소한다 — Opus 변경 의도 명시, 추천 조합은 검증안 허용이며 후속 단계 승인은 아님.
- [x] nfr-requirements.md 검토안을 생성한다.
- [x] tech-stack-decisions.md 검토안을 생성한다 — 실제 사용자 탭 증거가 필요한 선택은 조건부로 구분.
- [x] NFR/기술/기능 설계·기존 AC/CC/BR 연결과 실제 검증 조건을 검토한다 — 제한된 실제 읽기 왕복 PASS와 제품 미검증 범위를 대조했고 최신 상태 문구를 정리했다.
- [x] 상태·감사 기록·NFR Requirements 산출물 승인 질문을 갱신한다 — 실제 제한 검증과 산출물 승인 완료.
- [x] 명시적 산출물 승인 후 NFR Design으로 진행한다 — 2026-09-09T01:15:35Z.

[NFR Requirements 규칙 Step 5](../../../.aidlc-rule-details/construction/nfr-requirements.md)의 “Do not proceed until ALL ambiguities are resolved”에 따라 필요한 답변을 확인한 뒤 두 필수 산출물을 생성한다. 이 계획 자체의 별도 승인 gate는 추가하지 않는다. 단계 완료 후 새 NFR 산출물의 명시적 승인은 Step 8에 따라 받는다. 질문은 사용자의 요청대로 대화에서 하나씩 추천과 함께 제시하고 에이전트가 답변을 기록한다.

Security Baseline / Resiliency Baseline / Property-Based Testing은 모두 Enabled No, 전문 미로드·미적용, 준수 N/A다. 기존 기본 인증·권한·입력·오류·핵심 테스트는 유지한다.

계획 독립 검토에서 실질적 지적은 없었다. 8개 질문 범주·질문 순서·범위와 미정 기술을 확인했고 표·링크/앵커·코드 블록·개인 절대경로 부재를 검증했다. Q1~Q4 답변과 새 모델·제한 통합 검증 결과를 반영한 두 NFR 산출물은 명시적으로 승인됐다.

## 9. 과거 이력 — Haiku의 제한적 Bedrock 연결 확인

이 절은 모델 변경 전 요청·결과를 보존한다. 당시 미해결 질문과 검증 범위는 당시 상태를 뜻한다. 최신 Opus 변경·Q3 승인·확대된 통합 검증은 11절과 기술 결정 문서를 따른다.

2026-09-09 요청으로 이번 NFR 단계에서 설정·인증·모델 API 응답만 확인한다. [실행 계획의 제한 예외](../../inception/plans/execution-plan.md)에 따른다. 제품 Backend는 아직 없으므로 이후 구현이 아래 환경변수 계약을 따르도록 기술/NFR 산출물에 연결한다. 임시 검증 도구의 언어·라이브러리를 제품 SDK나 Agent 엔진으로 채택하지 않는다.

- 루트 .env에서 AWS_BEARER_TOKEN_BEDROCK, AWS_REGION, BEDROCK_MODEL_ID를 읽는다. 키가 비었으면 실제 값을 묻지 않고 로컬 파일 보완을 안내한다. .env를 Git에서 제외하고 브라우저/Store에 키를 보내지 않는다.
- 설정값은 요청 인증·라우팅에만 사용한다. 출력/문서에는 변수 이름·존재 여부·정제된 결과만 남긴다. 원시 오류·헤더·응답/요청 식별자도 기록하지 않는다.
- 공식 [Bedrock API 키 사용](https://docs.aws.amazon.com/bedrock/latest/userguide/api-keys-use.html)과 [Converse](https://docs.aws.amazon.com/bedrock/latest/APIReference/API_runtime_Converse.html)에 따라 HTTPS Bearer 요청을 보낸다. 짧은 일반 응답 1회, 합성 도구의 [toolChoice any](https://docs.aws.amazon.com/bedrock/latest/APIReference/API_runtime_ToolChoice.html) 응답 1회만 확인한다. 실제 도구를 실행하거나 도구 결과 후속 호출은 보내지 않는다.
- 자동 재시도는 하지 않는다. 입력/인증/권한/리전·모델/할당량·서비스/네트워크 오류를 구분하고 선행 실패로 의미 없는 후속 요청이 되면 중단한다. 네트워크 sandbox에서 DNS 등 전송 전 차단이면 승인된 네트워크 경로에서 그 미전송 요청만 다시 시도한다.
- API 성공은 그 시점·선택 모델의 두 응답 검증에만 한정한다. 키 유효기간·잔여 크레딧·지속 사용 가능량·실제 MCP/Extension 웹앱 실행은 별도 검증이다. Q2 설치 범위 답변 이후에도 Q3와 이후 단계 승인은 미해결로 유지한다.

- [x] 변수 존재/비어 있지 않음, .env Git 제외·미추적 상태를 확인한다.
- [x] 모델 선택 범위와 이번 제한 확인 예외를 계획·감사 기록에 연결한다.
- [x] 비밀값을 출력하지 않는 임시 검증 프로세스로 일반 응답을 확인한다.
- [x] 선행 연결이 유효하면 합성 도구 호출 응답의 구조·인자를 확인한다.
- [x] 오류/권한·만료/크레딧의 확인 범위와 미검증 항목을 정리한다.
- [x] 검증 결과·상태·감사 기록을 갱신하고 미해결 Q2를 한 번에 하나씩 이어간다.

### 연결 확인 결과 — 2026-09-09T00:25:25Z

| 검증 | 실제 API 요청 / HTTP | 판정과 한계 |
|---|---|---|
| 일반 응답 | 1회 / 200 | assistant의 비어 있지 않은 짧은 텍스트와 정상 종료 확인 PASS. 부가 점검인 지정 문구의 문자 단위 일치는 불충족이며 이를 일반 응답 실패나 품질 보증으로 확대하지 않는다. |
| 도구 호출 응답 | 1회 / 200 | tool_use 종료, 단일 toolUse, 기대 도구 이름·합성 인자·식별자 존재 확인 PASS. 식별자 값과 응답 원문은 보존하지 않는다. |
| 도구 실행·결과 왕복 / MCP·Extension 웹앱 실행 | 미실행 | 위 응답 검증과 별개다. 제품 통합은 승인된 Code Generation 이후 실제 사후 상태로 검증한다. |
| 키 만료일 / 잔여 크레딧 | 미확인 | 성공한 두 요청은 현재 호출 권한의 증거일 뿐이다. 키 발급 정보·운영자/Billing의 확인이 별도로 필요하며 추가 관리 API를 호출하지 않았다. |

검증은 루트 .env를 읽는 임시 프로세스의 직접 HTTPS Converse 요청으로 수행했다. 첫 sandbox DNS 실패는 HTTP 전송 전 차단으로 분류했으며 승인된 네트워크에서 미전송 요청을 이어갔다. Bedrock에 도달한 요청은 총 2회, 자동 재시도·실제 도구 실행·후속 모델 요청은 없었다. 응답의 usage 합계는 입력 679 / 출력 44 / 총 723 토큰이다. 잔여 크레딧·요금·운영 성능으로 환산하지 않는다.

.env는 계속 ignored/untracked이며 Git 대상 파일과 임시 검증 산출물에서 키 값이 발견되지 않았음을 값 출력 없이 검사했다. 일반/도구 응답·헤더·원시 예외·런타임 ID는 기록하지 않았다. 제공 설정의 모델/리전 조합은 [공식 모델별 지원표](https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-anthropic-claude-haiku-4-5.html)와 검증 범위에서 일치하며 다른 모델로 교체하지 않았다. [API 키 적용 범위](https://docs.aws.amazon.com/bedrock/latest/userguide/api-keys-use.html)는 Bedrock 계열 호출용으로 설명되어 있으므로 관리/Billing 접근까지 확보했다고 해석하지 않는다.

## 10. 기술검증안과 산출물

Q2 당시 추천 비교는 Q3에서 초기 기술검증안으로 사용하도록 허용받았다. 중복을 줄이기 위해 선택·대안·버전·근거·실행 결과의 원본을 [tech-stack-decisions.md](../vibe-zoo-mvp/nfr-requirements/tech-stack-decisions.md)로 옮겼다. [nfr-requirements.md](../vibe-zoo-mvp/nfr-requirements/nfr-requirements.md)는 데이터 경계·초기 예산·확인 방법을 소유한다. 두 문서는 2026-09-09T01:15:35Z 승인됐다. 제한된 실제 사용자 탭 검증과 제품 구현/이후 단계 승인 경계는 구분해 유지한다.

## 11. Q3 요청 — Opus와 작은 통합 검증

[실행 계획의 확대된 예외](../../inception/plans/execution-plan.md)에 따라 저장소 밖 임시 코드로 수행한다. 최신 명시 요청은 제한 검증을 허용하며 일반 제품 Code Generation 시작이나 NFR 산출물 승인은 아니다. 현재 선택 모델은 Opus 4.8이고 9절 Haiku 결과는 과거 이력이다.

- [x] Q3 원문·의도적 모델 변경·검증 허용 범위를 감사 기록에 보존한다.
- [x] 새 설정의 존재·사용자 지정 일치·Backend 모델 ID의 suffix 제외·Git 제외를 값 출력 없이 확인한다.
- [x] 공식 Opus/Converse·SDK 지원과 실제 설치 패키지 버전을 확인한다.
- [x] Node.js SDK로 Opus 일반/도구 응답을 각각 최소 요청으로 확인하고 기존 Haiku와 분리한다.
- [x] 실제 MCP tools/list·tools/call → HTTPS/WSS → 합성 클라이언트 → SQLite 및 재시작 조회를 검증한다.
- [x] 합성 사용자/세션/탭 불일치·중복·취소/늦은 결과의 경계를 검사한다.
- [x] 실제 탭 검증용 최소 MV3 패키지를 준비하고 접근 환경의 존재를 확인한다 — 패키지 준비와 실행 성공은 별개.
- [x] 요청자의 로그인된 합성 MinIO Chrome 탭과 연결해 실제 읽기 전용 화면 이동·사후 상태와 원래 화면 복귀를 확인한다.
- [x] 실제 MCP/브라우저 결과를 Opus toolResult와 이어 제한된 도구 실행 왕복을 확인한다 — 추가 모델 요청 2회, 자동 재시도 없음.
- [x] 실행 결과와 미검증 조건을 근거로 두 NFR 검토안을 생성한다.
- [x] 독립 검토·문서/시크릿 검증을 완료하고 상태·감사 기록을 갱신한다.
- [x] 제한 검증·미확인 조건을 반영한 기술안과 NFR 산출물의 명시적 승인을 받았다 — 2026-09-09T01:15:35Z.

Opus 초기 2회는 응답 형식 PASS이며, 후속 2회는 실제 MCP·기존 Chrome의 MinIO 읽기 전용 화면 이동·사후 관찰·모델 결과 왕복 PASS다. 이전 합성 클라이언트 검사는 별도 증거로 보존한다. API 키 만료/크레딧, ToolBundle 생성·Skill 학습·다른 입력 변경 실행·제품 수용조건과 공용 Backend 접속은 미검증이다. 상세 결과·토큰·검증 한계는 기술 결정 문서 3~5절만 참조한다.

### 실행 환경 확인 — Question 4

실제 MCP·브라우저 검증에 사용할 합성 MinIO 데모가 본인 계정으로 로그인된 Chrome 탭에 준비되어 있나요?

**질문 당시 추천**: 실제 요청자 탭을 준비한 뒤 그 세션에서 검증한다. 당시 데스크톱 제어는 접근 가능했지만 앱 목록에서 Chrome을 찾지 못했다. 다른 브라우저나 임의 테스트 세션을 요청자의 Chrome·MinIO 결과로 대체하지 않는다.

A) 준비되어 있음 — 현재 사용자 Chrome의 합성 MinIO 탭을 확인해 연결한다.

B) 아직 준비되지 않음 — 실제 탭 검증을 외부 조건 대기로 기록하고 구성요소 검증 결과와 NFR 검토안을 제시한다.

X) 기타 — 다른 접속 환경이나 준비 조건을 설명한다.

[Answer]: A — 2026-09-09T00:52:35Z 요청자가 합성 MinIO 데모의 로그인된 탭을 Chrome·Orca·Whale에 준비했고 접속 대상을 제공했다. 비공개 주소는 이 문서에 기록하지 않는다. 기존 Chrome 탭을 우선 확인해 연결하며 현재 로그인·대상 일치와 실제 MCP/브라우저 실행은 직접 검증한다.

실제 대상의 준비 여부 답변을 받았다. 이 답변은 기술 선택·NFR 산출물·후속 단계 승인이 아니며 Q3의 제한 검증을 계속할 입력이다. 데이터 변경 없는 UI 동작·관찰과 실제 사후 상태부터 확인하고 필요 범위를 넘어 자료를 수집하지 않는다.

실행 완료: 사용자가 설치한 임시 Extension에서 기존 Chrome MinIO 탭을 명시적으로 연결했다. 공식 MCP 검색/호출에서 Buckets 이동·사후 관찰·Opus toolResult 응답·Object Browser 복귀까지 확인했다. 같은 사용자·연결·탭·문서·출처를 유지했고 데이터 생성/삭제/수정은 하지 않았다. 이 제한 검증 결과를 근거로 NFR 기술안을 검토하며 제품 구현·이후 단계 승인은 별도로 받는다.
