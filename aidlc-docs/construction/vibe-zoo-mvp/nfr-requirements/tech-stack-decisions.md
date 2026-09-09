# U-01 — Tech Stack Decisions

## 1. 상태와 결정 범위

2026-09-09T01:15:35Z 명시적으로 승인된 NFR Requirements 기술 기준이다. [NFR 적용 조건](nfr-requirements.md), [기능 설계](../functional-design/business-rules.md), [계획과 사용자 답변](../../plans/vibe-zoo-mvp-nfr-requirements-plan.md)을 참조한다. 사용자 결정, 실행으로 확인한 사실, 검증 조건이 남은 추천을 구분한다. 제품 코드 생성이나 후속 단계 승인을 뜻하지 않는다.

- **사용자 확정**: Bedrock / Claude Opus 4.8, 개발자 모드 Chrome Extension + 팀 공용 Backend, 합성 MinIO의 최소 필터 근거 전송. Chrome Web Store 배포 제외, Vibe Zoo 자산 Store 유지.
- **검증안 사용 허용**: TypeScript/Node.js 단일 공유 애플리케이션, Converse 도구 루프, 공식 MCP SDK, HTTPS/WSS, 단일 호스트 SQLite.
- **현재 증거**: 초기 Opus 응답 검사와 합성 MCP·HTTPS/WSS·SQLite 검증에 이어, 실제 요청자의 로그인된 Chrome MinIO 탭에서 관찰 → 모델 도구 요청 → MCP 화면 이동 → 사후 관찰 → 모델 결과의 제한된 읽기 전용 전체 흐름이 통과했다. Object Browser 복귀도 확인했다.
- **승인된 초기 선택**: 실제 읽기 전용 연결 근거에 따라 아래 TypeScript/Node.js·Converse·공식 MCP·HTTPS/WSS·SQLite 조합을 설계 기준으로 사용한다. 생성 ToolBundle·Skill·다른 입력·실제 데이터 변경·제품 인증·공용 배포는 미검증이며, 제한 검증 결과와 별도로 NFR 산출물 승인을 받았으며 제품 구현 완료를 뜻하지 않는다.

**후속 환경 지시**: Infrastructure Design에서 사용자는 현재 WSL의 개발/데모를 우선하고 실제 서비스의 외부 접속 경로 설정을 보류했다. 아래 NFR 당시 배포 후보와 검증 기록은 보존한다. 최신 로컬 자원 배치/런타임 제안은 [승인된 인프라 설계](../infrastructure-design/infrastructure-design.md)를 참조한다. 2026-09-09T01:37:45Z 인프라 산출물 승인 후 Code Generation 계획 수립을 시작했다.

## 2. 기술별 선택·대안·확인 조건

| 영역 | 현재 선택 또는 우선안 | 대안과 판단 / 남은 조건 |
|---|---|---|
| 제품 모델 | 사용자 확정: Amazon Bedrock Claude Opus 4.8. 생성·기본/개인 Skill·채팅·Agent에 같은 Backend 설정 사용 | 기존 Haiku 4.5는 과거 검증 이력이며 fallback이 아니다. 초기 응답과 실제 읽기 전용 도구 결과 왕복은 3~4절 PASS, 실제 생성/학습 품질과 지속 사용량은 미확인. |
| Backend 언어·모듈 | 승인된 초기안: TypeScript/Node.js 애플리케이션 하나에서 C-03~06 분리. Node HTTP 서버·스키마 입력 검증·비동기 작업 루프 | Python/FastAPI도 가능하나 현재 검증안은 Extension과 계약/검증 타입 공유에 유리하다는 판단이다. 별도 서버/사용자별 컨테이너·Kubernetes는 필요 조건이 아니다. 실제 긴 생성 중 채팅 확인 필요. |
| Agent 엔진·SDK | 승인된 초기안: AWS SDK for JavaScript v3 + 제한된 Converse 도구 호출 루프. BR 제어는 모델 밖의 Orchestrator가 소유 | 지정 도구 1개의 실제 MinIO 화면 이동·결과 왕복은 확인했다. 자율 도구 선택·생성·다단계 Skill 실행은 미검증이다. 관리형 Bedrock Agents 권한이나 Claude Code 실행을 전제하지 않으며, 프레임워크는 확인/취소/재접속·Skill 실행을 줄여주는 실제 이점이 있을 때만 재비교한다. |
| MCP transport | 승인된 초기안: 공식 SDK Client/Server, 내부 로컬 Streamable HTTP. 실제 tools/list·tools/call로 고정 버전 계약 실행 | 이름만 MCP인 직접 함수 호출로 대체하지 않는다. 같은 애플리케이션 안에 둘 수 있고 참여자가 별도 MCP CLI를 켜지 않는다. 도구 노출/실행의 owner·Job·버전 경계는 BR-01·04 적용. |
| Extension/UI | 승인된 초기안: Chrome MV3, 로컬 패키지의 TypeScript UI·Side Panel·Service Worker·Content Script. Store는 같은 Backend를 쓰는 별도 웹 화면 | UI 렌더링 프레임워크는 이번 연결 검증으로 선택된 것이 아니다. 승인 화면·상태 흐름을 유지하는 최소 구현을 코드 계획에서 구체화한다. 임시 probe의 단순 HTML을 제품 UI로 채택하지 않는다. |
| Browser Bridge | 승인된 초기안: Extension이 시작하는 HTTPS/WSS. Backend 인증 신원과 Extension·탭/문서·origin·Job·제어 개정 결합 | 실제 요청자 Chrome과 로컬 검증 Backend의 연결·동일 탭/문서 실행을 확인했다. 브라우저 WSS는 내부 MCP transport와 별개다. 공용 서버의 참여자 접속·장기 연결·재접속은 남아 있으며 저장 상태가 살아 있는 브라우저 연결을 대신하지 않는다. |
| 생성 어댑터 / Recorder | 승인된 초기안: 패키지 내 제한된 DOM 동작/관찰 기능 + 모델이 제안한 구조화된 계약·실행/검증 계획. Record는 필요한 DOM/행동 신호만 정제 | 임의 생성 JavaScript eval·원격 코드 주입은 기본안이 아니다. 여섯 요소 ToolBundle 및 Skill의 독립 검증을 충족해야 한다. MinIO의 다른 입력과 미등록 사이트 관찰 범위에서 실제 검증 전. 고정 probe DOM은 생성 능력 증거가 아니다. |
| 저장 / 작업 처리 | 승인된 초기안: 한 서버의 지속 디스크 SQLite, 짧은 트랜잭션·조건부 개정/버전 반영, 메모리의 비동기 실행과 DB의 지속 Job 상태 분리 | SQLite 재시작 조회와 일부 경합은 4절에서 확인했다. 분산 큐·Redis를 추가하지 않는다. 지속 디스크를 제공하지 않는 환경이라면 이미 이용 가능한 PostgreSQL 등 최소 대안을 재검토한다. |
| 자산 Store | 승인된 초기안: 같은 DB와 API에 개인 자산·게시 스냅샷·설치자 설정을 구분해 저장 | 별도 Git/Marketplace 인프라는 불필요한 출발점이다. 게시 버전과 설치자 자체 검증은 BR-12, 개선·적용·이전 버전은 BR-13~14를 따른다. 실제 두 사용자 흐름 미검증. |
| 배포 | 후보: HTTPS/WSS와 지속 디스크가 있는 팀 서버/VM 한 곳 | 실제 공급자·서버 자원·주소·TLS 종료·프로세스/단일 컨테이너 실행은 미정이다. Bedrock 키가 서버 배포나 관리 API 권한을 제공한다고 가정하지 않는다. Infrastructure Design에서 실제 자원과 연결한다. |

**임시 검증의 실제 버전**: Node.js 22.14.0, TypeScript 5.9.3, AWS Bedrock Runtime SDK 3.1128.0, MCP client/server/node SDK 2.0.0, ws 8.21.3, dotenv 17.4.2, Zod 4.5.4. 임시 lockfile로 고정하고 패키지 설치 스크립트는 실행하지 않았다. 이 버전 목록을 제품 의존성 설치·업데이트 정책 승인으로 해석하지 않는다.

SQLite 확인에는 Node의 내장 node:sqlite를 사용했고 해당 런타임에서 실험적 API 경고가 있었다. DB 선택의 근거와 드라이버 안정성은 별개다. 제품 런타임/드라이버 버전은 실행 환경에 맞춰 고정하고 같은 저장·경합 검증을 유지한다. SQLite 파일은 서버 로컬 지속 디스크에서만 접근하며 참여자에게 파일을 공유하거나 네트워크 파일시스템에서 다중 서버가 직접 쓰지 않는다.

## 3. 모델 설정과 실제 Opus 검증

Backend와 모델 연결 검증 프로세스는 루트 .env의 AWS_BEARER_TOKEN_BEDROCK, AWS_REGION, BEDROCK_MODEL_ID를 읽는다. 배포 시 같은 이름의 설정을 서버에 비공개로 주입한다. 실제 값은 문서·로그·응답에 기록하지 않는다. 키가 비었으면 값을 채팅으로 요청하지 않고 운영자가 로컬 설정을 보완하도록 안내한다.

ANTHROPIC_MODEL은 Claude Code용이며 Backend의 모델 선택 입력이 아니다. [1m]을 API modelId에 넣지 않고 BEDROCK_MODEL_ID를 그대로 사용한다. 이 검증에서는 Backend 모델 식별자에 bracket suffix가 없고 요청된 Opus/리전 설정과 일치함을 값 출력 없이 확인했다. Codex / gpt-6-astra / ultra 개발 설정은 변경하지 않았다.

| 확인 | 결과 | 판정 범위 |
|---|---|---|
| 설정 / Git 제외 | 네 환경변수 present/nonempty; .env ignored/untracked | 존재 확인과 사용자 설정 일치. 파일·키 값은 수정/출력하지 않음. |
| Opus 일반 응답 | 실제 요청 1회, HTTP 200; assistant 짧은 텍스트·end_turn 및 지정 문구 일치 PASS | 입력 15 / 출력 4 / 총 19 토큰, 984ms. 일반 합성 문자열만 사용. |
| Opus 도구 호출 응답 | 실제 요청 1회, HTTP 200; tool_use·단일 도구·이름/합성 인자·식별자 존재 PASS | 입력 511 / 출력 37 / 총 548 토큰, 1173ms. 도구 실행·toolResult 후속 요청은 보내지 않음. |
| 실제 MinIO 도구 요청 | 추가 요청 1회, HTTP 200; tool_use·지정 도구 1개·빈 인자 검증 PASS | 입력 832 / 출력 11 / 총 843 토큰, 1263ms. 사전 관찰 후 open_minio_buckets를 toolChoice로 지정. |
| 실제 MinIO toolResult 완료 응답 | 추가 요청 1회, HTTP 200; end_turn·관찰 결과에 맞는 짧은 완료 응답 PASS | 입력 887 / 출력 10 / 총 897 토큰, 2170ms. 실제 MCP의 정제 결과를 같은 대화의 toolResult로 전달. |
| 이전 Haiku 검증 | 일반·도구 응답 각각 HTTP 200이었던 이력을 보존 | [계획 9절](../../plans/vibe-zoo-mvp-nfr-requirements-plan.md)의 당시 결과. 일반 응답의 부가 지정 문구 일치는 불충족이었음. Opus 증거로 전용하지 않음. |
| 만료 / 크레딧 / 지속 사용 | UNKNOWN | 응답 성공을 충분한 잔여 크레딧·유효기간·지속 용량으로 해석하지 않음. |

초기 모델 연결 검사는 2회, 입력 526 / 출력 41 / 총 567 토큰이다. 추가 실제 MinIO 검증은 정확히 2회, 입력 1719 / 출력 21 / 총 1740 토큰이며 두 요청 모두 SDK attempts=1, HTTP 200이었다. 두 검증의 누적 Opus 요청은 4회, 총 2307 토큰이다. 자동 재시도와 다른 모델 대체는 없었다. 지연은 단일 요청 관측값이며 성능 목표·모델 비교·비용 보장이 아니다. 응답·헤더·원시 오류·식별자는 보존하지 않고 정제 결과만 기록했다.

초기 SDK 검사에서 인증 우선순위 이름을 잘못 지정해 서비스 요청 전에 자격정보 선택이 실패했다. 설치된 SDK의 설정 형식에 맞게 수정하고, 네트워크를 차단한 로컬 직렬화 검사에서 Bearer가 로컬 키와 일치함을 불리언으로 확인했다. 이후 sandbox DNS 차단은 전송 전 오류로 구분해 정식 네트워크 승인 후 미전송 요청을 수행했다. 이 두 선행 환경/설정 문제를 Opus의 권한 거부나 서비스 실패로 기록하지 않는다.

제품 오류 처리는 인증/만료, 모델 접근 권한, 리전·모델 식별자/요청 검증, 할당량·서비스·네트워크/결과 미확인을 구분한다. 인증·권한·입력 오류를 자동 반복하거나 Haiku로 대체하지 않는다. 키 만료·크레딧은 제공 키만으로 확인된 항목이 아니며 추가 관리 API를 호출하지 않았다.

## 4. MCP·연결·저장 기술검증과 증거 경계

검증은 저장소 밖 임시 TypeScript 애플리케이션으로 수행했다. 먼저 합성 프로토콜 클라이언트에서 공식 MCP SDK의 실제 HTTP 프로토콜, TLS 검증이 켜진 HTTPS/WSS와 SQLite를 확인했다. 이어 사용자가 기존 Chrome에 설치한 MV3 Extension을 실제 로그인된 합성 MinIO 탭에 결합해 제한된 읽기 전용 흐름을 실행했다.

Chrome 프로필에 가져온 로컬 서버 leaf 인증서의 해시가 실제 서버 인증서와 일치함을 확인했다. 인증서는 명시적 CA:FALSE와 localhost/loopback SAN을 포함하며, 해당 프로필에서 HTTPS/WSS 연결이 성공했다. Node 검증 클라이언트는 임시 로컬 CA를 명시적으로 신뢰했다. 신뢰 범위는 해당 Chrome 프로필이며 시스템 전역 신뢰 변경 없이 TLS 검증을 유지했다. 공용 서버·다른 참여자 환경의 인증서 신뢰는 아직 확인하지 않았다.

| 확인 | 판정 | 실제 확인한 범위 |
|---|---|---|
| MCP tools/list·tools/call | PASS — 실제 연결 | 공식 SDK Client/Server 검색 후 실제 MinIO 도구 호출 4회: 사전 inspect → 모델이 요청한 Buckets 이동 → 복귀 전 inspect → Object Browser 복귀. 고정 검증 도구이며 생성된 제품 자산은 아님. |
| MCP → WSS → 결과 → SQLite | PASS — 합성 프로토콜 | 합성 클라이언트의 값 변경 응답·기대값 비교와 저장을 확인. DOM·MinIO·로그인 세션은 사용하지 않음. |
| 실제 MinIO 작업 저장 | PASS — 지정 탭 실행 근거 | 저장된 실제 작업 4개가 각각 1회 전달·completed·사후 조건 통과. Actor/세션과 연결/탭/문서/origin이 동일하며 관찰 화면은 browser → buckets → buckets → browser였다. 제품 자산 활성화 검증은 아님. |
| 사용자/세션/탭 불일치 | PASS — 합성 프로토콜 | 고정된 합성 자격과 binding이 다르면 명령 전달 전 차단. 제품 인증 발급/폐기나 실제 Chrome 권한 검증은 아님. |
| 중복 / 취소·늦은 결과 | PASS — 합성 상태 | 동일 요청 재전달 차단, 취소 유지, 늦은 근거 보존과 완료/반영 차단. 실제 자산 버전 활성화 구현은 아님. |
| SQLite 재시작 | PASS — 구성요소 | 합성 검증에서 실제 서버 재시작 후 성공/취소 상태 조회. 이전 live binding은 복원하지 않음. 실제 MinIO 실패·취소의 재시작 복구까지 검증한 것은 아님. |
| MV3 Extension | PASS — 지정 Chrome 탭 | 기존 요청자 Chrome의 Side Panel에서 HTTPS/WSS 연결. 실제 tab/documentId와 허용 대상에 결합해 화면 이동 후 가시 표제를 관찰하고 일치한 SPA 이동의 binding revision을 갱신. |
| Opus → MCP → 요청자 MinIO 탭 → 사후 상태 → 모델 결과 | PASS — 제한된 읽기 전용 전체 흐름 | 로그인된 Object Browser를 사전 확인하고 지정 도구로 Buckets 화면 이동. 실제 표제·Sign Out 존재와 사후 조건이 통과한 정제 결과를 Opus에 전달해 짧은 완료 응답을 확인. 정확히 모델 요청 2회이며 원래 Object Browser 복귀도 통과. |
| 참여자 → 팀 공용 Backend | NOT VERIFIED | 실제 서버·주소·네트워크/지속 디스크 미확보. localhost 결과를 공용 배포 성공으로 확대하지 않음. |

실제 실행은 요청자가 준비한 기존 Chrome 탭에서 수행했다. 관찰은 화면 enum·요소 개수·허용된 일반 레이블·Sign Out 존재 불리언으로 제한했다. 비공개 origin/path·신원·탭/문서/Job binding은 실행 대상 결합·검사에만 쓰고 모델 schema·toolResult·공개 기록에 포함하지 않았다. 인증정보·전체 DOM·버킷/객체명은 전송하지 않았다. 첫 모델 요청은 open_minio_buckets를 강제 지정했고, 모델의 단일 빈 인자를 검증한 후 호출했다. 따라서 이번 통과는 자율 도구 선택이나 생성 능력의 증거가 아니다.

MinIO 버튼·표제 관찰과 이동은 직접 작성한 고정 probe다. Side Panel로 좁아진 실제 화면에서 관찰된 object-browser·buckets·sign-out aria-label 변형만 추가했고, 고유한 가시 버튼·허용 경로·실제 표제 일치 조건은 유지했다. 생성 어댑터가 자동으로 변화를 학습한 결과로 기록하지 않는다. Backend 신원도 합성 fixture이므로 제품 인증 발급/폐기를 검증한 것이 아니다. 버킷/객체 생성·삭제·업로드 등 데이터 변경, 생성 ToolBundle·기본/개인 Skill·다른 입력·자산 Store·공용 Backend 및 AC-01~10 전체 충족은 남아 있다.

실제 사후 조건과 모델 완료 응답의 일치를 별도로 기록했고, 원래 화면 복귀도 독립 확인했다. 체크포인트로 같은 runner의 재실행을 차단했다. 원시 모델/MCP 응답과 모델의 toolUseId는 별도 로그·문서로 보존하지 않고 정제 결과만 기록했다. 로컬 임시 DB의 실행 대상·Job 결합 정보는 공개 산출물에 포함하지 않았다. 검증 후 같은 인증서 해시의 임시 Chrome 신뢰 항목을 삭제하고 인증서 목록에서 제거됨을 확인했으며, 실행 프로세스를 대조해 로컬 probe 서버 종료도 확인했다. 임시 Extension은 사용 안함 상태를 확인했고 Side Panel을 닫아 원래 MinIO 탭으로 돌아왔다.

## 5. 미확인 조건과 다음 검증

| 조건 | 확보할 증거 | 기술 결정에 주는 영향 |
|---|---|---|
| 생성·학습·다른 입력 | ToolBundle 여섯 요소와 Skill 절차/의존 버전을 실제 새 입력·사후 조건에 연결 | 미검증 모델 품질 또는 어댑터 제한이 MVP를 막는지 판단. 모델 변경이 필요하면 이유와 영향 제시 후 확인. |
| 실제 변경·실패·취소·재접속 | 사용자 확인이 필요한 실제 변경, 결과 미확인 후 중복 방지, 실제 탭의 취소·복구와 긴 작업 중 채팅 | 읽기 전용 화면 이동과 합성 경합 검증으로 대체할 수 없는 BR 제어·작업 처리의 근거. |
| 제품 신원·공용 서버·참여자 접속 | 제품 인증·권한·실제 HTTPS/WSS·두 사용자 라우팅·지속 저장 및 재조회 | 합성 fixture와 요청자 1명의 로컬 연결을 넘어 배포 방식·접근 경계·SQLite/드라이버 가정 확정. 자원 확보 없이 서버 사양을 만들어 기록하지 않음. |
| 예산·개인/공유·정리 | NFR 문서의 상한·재접속·필터·삭제 및 AC-06~09 실제 확인 | 최소 구현 품질의 증거이며 운영 체계 확장 사유로 사용하지 않음. |

합성 MinIO 외 사이트도 같은 진입점을 유지하되 모델 전송 허용 범위를 넘는 자료는 전송하지 않는다. 현재 전송 경계를 전 사이트 지원 확정이나 MinIO 전용 제품으로 해석하지 않는다. NFR/기술안은 이 검증 상태와 함께 검토하며 이후 단계는 AI-DLC의 명시적 산출물 승인에 따라 진행한다.

## 6. 공식 근거

- [AWS Opus 4.8 모델 카드](https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-anthropic-claude-opus-4-8.html): 모델/Converse·서울의 글로벌 추론 지원을 확인했다. API 키의 실제 권한은 위 호출 결과 범위만 확인했다.
- [Bedrock API 키 지원 범위](https://docs.aws.amazon.com/bedrock/latest/userguide/api-keys-supported.html), [API 키 사용](https://docs.aws.amazon.com/bedrock/latest/userguide/api-keys-use.html), [Converse 도구 사용](https://docs.aws.amazon.com/bedrock/latest/userguide/tool-use-client-side.html): JavaScript SDK 및 애플리케이션의 도구 실행/결과 전달 책임을 확인했다.
- [공식 MCP TypeScript SDK](https://ts.sdk.modelcontextprotocol.io/v2/): Client/Server·transport의 SDK 세대를 구분했고 실제 npm 배포 버전도 확인했다. v1과 v2 예제를 혼합하지 않는다.
- [Chrome WebSocket 수명](https://developer.chrome.com/docs/extensions/how-to/web-platform/websockets), [scripting API](https://developer.chrome.com/docs/extensions/reference/api/scripting), [Extension CSP](https://developer.chrome.com/docs/extensions/reference/manifest/content-security-policy): 최소 버전·문서 대상·패키지 코드 실행 제약의 근거이며 실제 어댑터 성공 증거는 아니다.
- [SQLite 사용 범위](https://sqlite.org/whentouse.html), [WAL 제약](https://sqlite.org/wal.html): 단일 호스트·짧은 쓰기 트랜잭션의 근거다. 운영 HA·장기 확장 설계로 확대하지 않는다.
