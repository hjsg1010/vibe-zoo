# U-01 — Infrastructure Design Plan

## 1. 시작과 범위

- **시작**: 2026-09-09T01:27:56Z, “검토 완료. 진행하자.”로 NFR Design 두 산출물과 Infrastructure Design 진행을 승인받았다.
- **상세 수준**: Minimal. [승인된 논리 구성](../vibe-zoo-mvp/nfr-design/logical-components.md)을 사용자가 지정한 현재 WSL의 로컬 데모 실행·HTTPS/WSS·지속 디스크에 배치한다. 기능/상태는 [BR](../vibe-zoo-mvp/functional-design/business-rules.md), 공통 실행·보존 조건은 [NFR 패턴](../vibe-zoo-mvp/nfr-design/nfr-design-patterns.md)을 참조한다.
- **현재 사실**: Q1 답변으로 개발 서버는 현재 WSL이며 후속 지시로 실제 서비스의 외부 접속 경로 설정은 보류됐다. Ubuntu 24.04.1 LTS·systemd·Node 22.14.0·쓰기 가능한 ext4를 읽기 전용으로 확인했다. 제품 소스·배포 manifest는 없고 루트 .env에는 모델 관련 변수 이름 네 개만 확인했다. 이 환경 확인을 제품 연결/실행 성공으로 확대하지 않는다.
- **진행 방식**: 기존 승인은 재질문하지 않는다. 실제 환경 질문은 대화로 하나씩 묻고 추천 이유를 설명한다. 사용자가 문서를 편집할 필요는 없다. 실제 주소·접속 키·비공개 경로는 공개 문서에 쓰지 않는다.
- **제외**: 이전 Extension 설치·Chrome/MinIO 실행 재검증, 추가 모델 호출, 제품 코드·클라우드 자원 생성·실제 배포, 외부 참여자 접속 경로·Tailscale/터널·공용 DNS·포트 공개 설정, 운영 HA/DR·Kubernetes·사용자별 컨테이너·별도 모니터링 플랫폼.

## 2. 일곱 질문 범주 평가

| 범주 | 적용 근거 / 현재 처리 |
|---|---|
| Deployment Environment | 사용자 Q1과 후속 지시로 현재 WSL의 데모 우선으로 해결. 외부 서비스 배포/참여자 접속 확인을 선행 조건으로 요구하지 않는다. Bedrock은 외부 모델 API만 사용. |
| Compute Infrastructure | 현재 WSL에 Node 앱 하나를 개발자 터미널에서 실행/종료하는 최소 방식. 프로젝트 런타임은 LTS/내장 SQLite 지원을 근거로 설계안에서 고정하고 전역 환경을 변경하지 않는다. 운영 서비스 등록·CPU/RAM 목표 질문 없음. |
| Storage Infrastructure | 쓰기 가능한 WSL ext4를 확인했다. SQLite/개인 근거는 빌드 산출물과 분리된 Git 제외 디렉터리에 저장한다. NFR 보존 정책 유지, 네트워크 공유 디스크나 새 DB 선택 질문 없음. |
| Messaging Infrastructure | 내부 실제 MCP Streamable HTTP와 Extension WSS, DB Job/Action 및 메모리 스케줄러를 유지한다. Redis·SQS·외부 worker 필요 근거가 없으므로 추가 선택 질문 없음. |
| Networking Infrastructure | 후속 지시로 외부 경로 질문을 종료. Node의 loopback HTTPS/WSS와 Windows Chrome의 localhost 접근으로 설계한다. 로컬 인증서/브라우저 신뢰는 새 제품 구현의 연결 조건이며 이전 probe 재검증은 하지 않는다. |
| Monitoring Infrastructure | 정제 로그·작업 상태·핵심 오류·간단한 실행 확인만 필요하다. 기존 서버 로그 수단을 우선 쓰며 외부 대시보드·알림·부하 시험을 요구하지 않는다. 실제 ID·주소·인증값·요청 원문을 프록시 로그에도 기록하지 않도록 배치한다. |
| Shared Infrastructure | 로컬 데모에서도 Actor들이 하나의 Backend·DB·모델 설정을 사용한다. 소유/수명은 짧은 shared-infrastructure.md에 한 번만 두고 개인 자산·자기 브라우저 경계는 NFR을 참조한다. 외부 여러 기기 접속을 검증 완료로 쓰지 않는다. |

## 3. Question 1 — 사용 가능한 공용 서버

Vibe Zoo Backend를 실행할 팀 공용 서버가 이미 준비돼 있나요? 사용할 수 있다면 기존 Linux 서버 1대를 재사용하는 방향을 추천합니다. 승인된 Node.js·SQLite 구성을 유지하면서 새 인프라 준비를 줄일 수 있습니다. 실제 주소나 접속 키 없이 준비 상태만 알려주세요.

A) 사용 가능한 기존 Linux 서버가 있음 — 추천. 실제 가용 자원과 기존 연결 구성을 확인해 재사용한다.

B) 새 서버를 준비해야 함 — 이용 가능한 계정·실행 환경과 추가 비용 조건을 확인한 뒤 가벼운 후보를 제시한다.

C) 서버 준비 상태를 아직 모름 — 확보 가능한 환경부터 확인하며 로컬 개발 환경을 공용 서버로 확정하지 않는다.

D) 기타 — 사용 가능한 환경을 자유롭게 설명한다. 비공개 주소·자격정보는 쓰지 않는다.

[Answer]: 2026-09-09T01:30:57Z, 자유 답변 “개발 서버는 지금 이 환경(wsl)에서 진행.” — 현재 WSL을 개발 서버로 지정. 이후 “실제 서비스보다는 이 환경에서 데모 구현이 우선이기 때문에 실제 서비스를 위한 접속경로 설정은진행하지않아도됨.”으로 외부 접속 경로 설정을 보류했다. 원문과 시각은 audit.md에 보존한다.

**후속 질문 처리**: 준비했던 Tailscale 참여자 접근 Q2는 제시 전 받은 후속 지시로 불필요해졌다. Serve 제안을 채택하지 않고 네트워크 설정을 바꾸지 않는다. 현재 설계에 필요한 추가 사용자 질문은 없다. 공용 배포 보류를 Store/공유·사용자 구분 기능 삭제나 HTTPS/WSS 변경으로 해석하지 않는다.

## 4. 답변과 독립적으로 유지할 배치 기준

| 자원 | 확정 기준과 환경에 맞춰 정할 부분 |
|---|---|
| 사용자 Chrome | C-01/02는 개발자 모드 Extension. 배포 패키지에는 접속 설정과 패키지 코드만 포함하고 모델/참여자 키는 넣지 않는다. 사용자별 CLI·Backend 브라우저를 추가하지 않는다. |
| 공용 앱 | C-03~06과 C-07 Store 정적 화면은 같은 Node 앱. 공식 MCP 내부 listener는 loopback으로 제한하고 외부 프록시에 노출하지 않는다. 스케줄러의 동시 슬롯은 NFR 패턴을 참조한다. |
| 로컬 진입점 | Store·API·WSS는 Node가 제공하는 하나의 localhost HTTPS origin. 내부 MCP는 별도 loopback listener. 로컬 인증서/신뢰를 구현 시 준비하고 검증 해제·공용 DNS·프록시 설정으로 우회하지 않는다. |
| 지속 저장·설정 | 앱 배포 파일과 분리한 단일 호스트 SQLite 및 필요한 private 설정. 재시작·교체가 Job/개인 자산/공유 버전을 초기화하지 않도록 한다. 보존/삭제 값은 NFR 원본 참조. |
| 외부 모델 | 기존 Bedrock/Opus 설정 이름과 Gateway 유지. 서버의 outbound API 연결 조건을 설계하며 이번 단계에 재호출하지 않는다. 다른 모델·공급자는 자동 대체하지 않는다. |

**공식 근거 확인**: [Node 릴리스 표](https://nodejs.org/en/about/previous-releases), [Node 24.20.0 SQLite](https://raw.githubusercontent.com/nodejs/node/v24.20.0/doc/api/sqlite.md), [SQLite WAL](https://www.sqlite.org/wal.html), [Windows→WSL localhost](https://learn.microsoft.com/en-us/windows/wsl/networking)를 설계 근거로 사용한다. 검토했던 Caddy/Tailscale 외부 진입점은 이번 범위에서 채택하지 않는다. 자료 확인은 서버 설치·연결 검증이 아니다.

## 5. 수행 체크리스트와 산출물

- [x] NFR Design 명시적 승인과 새 단계 시작을 감사·상태에 기록한다.
- [x] 단계/공통 규칙과 승인된 기능·NFR·기술 문서를 확인한다.
- [x] 일곱 질문 범주를 평가하고 중복 질문 없이 수행 계획을 작성한다.
- [x] 값 출력 없이 기존 배포 설정 유무를 확인하고 공용 서버 준비 상태 Q1을 제시한다.
- [x] 답변과 독립적인 컴포넌트·설정·저장·연결 기준과 공식 근거를 정리한다.
- [x] Q1과 데모 우선 후속 지시를 반영했다. 외부 경로는 보류하며 로컬 환경의 읽기 전용 확인으로 설계 입력을 확보했다.
- [x] 공용 자원/소유·수명은 construction/shared-infrastructure.md에 간결하게 작성한다.
- [x] infrastructure-design/infrastructure-design.md에 환경·자원 매핑과 남은 검증 조건을 작성한다.
- [x] infrastructure-design/deployment-architecture.md에 진입점·프로세스·배포/시작/정지·확인 흐름을 작성한다.
- [x] 승인 NFR/BR·로컬 데모 우선·환경 근거를 대조했다. 관련 13개 문서의 참조/anchor·표·코드 블록, 배포 Mermaid 제한 구문·대체 설명, .env Git 제외와 키 부재, 감사 append-only 및 계획/상태 일관성을 확인하고 검토 요청을 준비했다.
- [x] 인프라 산출물의 명시적 승인을 받은 뒤 Code Generation Part 1 계획 수립으로 진행한다 — 2026-09-09T01:37:45Z, “code generation 계획 수립 진행.”

Infrastructure Design [Step 8](../../../.aidlc-rule-details/construction/infrastructure-design.md)의 산출물 승인과 이후 Code Generation 계획 승인은 별개다. Security Baseline / Resiliency Baseline / Property-Based Testing은 모두 Enabled No, 전문 미로드·준수 N/A다.
