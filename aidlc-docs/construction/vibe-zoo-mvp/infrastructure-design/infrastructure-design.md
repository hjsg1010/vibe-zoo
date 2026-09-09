# U-01 — Infrastructure Design

## 1. 환경과 결정 범위

**상태**: 2026-09-09T01:37:45Z 사용자 승인 완료, 구현 전. 사용자가 현재 WSL을 개발 서버로 지정했고 실제 서비스의 접속 경로 설정을 보류했다. 이 환경에서 핵심 데모를 구현하는 최소 배치를 정한다. [승인 논리 구성](../nfr-design/logical-components.md)의 책임·[NFR 패턴](../nfr-design/nfr-design-patterns.md)의 공통 조건을 반복 정의하지 않는다.

읽기 전용 확인: WSL Ubuntu 24.04.1 LTS / Linux x64, PID 1 systemd, 현재 Node 22.14.0와 내장 SQLite 3.47.2, 쓰기 가능한 ext4. 현재 자원 존재를 확인했으며 제품 최소 사양·성능·디스크 장애 복구를 검증한 것은 아니다. 설치·모델 호출·브라우저 재검증·네트워크 설정 변경은 하지 않았다.

## 2. 논리 구성의 자원 배치

| 논리 요소 | 이번 데모의 실제 배치 / 선택 근거 |
|---|---|
| C-01 Keeper / C-02 Browser Bridge | Windows Chrome의 개발자 모드 MV3 Extension. 기존 사용자 탭에서 관찰·Record·동작·사후 상태를 처리한다. WSL에 실행용 브라우저를 만들지 않는다. |
| C-03 Orchestrator / C-04 Generation | 현재 WSL의 Node 프로세스 하나. API·Job/예산·모델 Gateway·비동기 스케줄러를 함께 실행한다. 시작/종료는 개발자 터미널 명령으로 충분하며 systemd 서비스·컨테이너는 선행하지 않는다. |
| C-05 MCP / Validation | 같은 Node 프로세스의 공식 SDK Client/Server. 내부 Streamable HTTP listener는 127.0.0.1의 OS 할당 포트를 쓰고 앱 내부에만 전달한다. 외부 API나 임의 모델 인자에서 이 listener를 선택할 수 없다. |
| C-06 Registry / Settings | WSL ext4의 SQLite 한 개. 앱 배포/빌드와 분리한 Git 제외 데이터 디렉터리, 연결 한 개와 짧은 조건부 쓰기로 시작한다. 데이터 보존·버전/취소 반영은 NFR 패턴 참조. |
| C-07 Store | 같은 Backend가 Store 빌드 결과만 정적 제공한다. API·WSS와 하나의 로컬 HTTPS origin을 사용한다. 저장소 루트·.env·데이터 파일을 정적 경로에 노출하지 않는다. |
| 제품 모델 | 기존 Bedrock / Opus 설정으로 Backend가 outbound HTTPS 요청. 웹앱 관찰은 Extension 경로로 받으며 Backend가 MinIO 계정/쿠키를 받아 대신 접속하지 않는다. |

**승인된 프로젝트 런타임**: Node **24.20.0 LTS**와 내장 `node:sqlite`를 고정한다. [Node 릴리스 표](https://nodejs.org/en/about/previous-releases)와 [해당 버전 SQLite 문서](https://raw.githubusercontent.com/nodejs/node/v24.20.0/doc/api/sqlite.md)에 근거한다. 추가 네이티브 DB 패키지/서버 없이 시작할 수 있고, 이 버전의 SQLite API는 Release candidate이며 안정화 완료로 표현하지 않는다. Code Generation에서 프로젝트 실행 명령에만 적용하고 현재 전역 Node·Codex 환경은 교체하지 않는다. 설치·의존성 호환·저장/경합 검증은 아직 수행하지 않았다. 패키지 정확한 버전과 lockfile은 코드 계획/구현에서 고정하며 공식 MCP v2와 v1 예제를 혼합하지 않는다.

## 3. 로컬 연결·저장 설정

| 설정 | 설계 기준 |
|---|---|
| 앱 진입점 | Node의 HTTPS 서버가 loopback에서 Store·API·WSS를 제공한다. 기본 제안은 `https://localhost:18443`; 실제 사용 전 포트 충돌과 Windows→WSL 접근을 확인한다. 포트 변경 시 하나의 설정에서 Extension·Store origin을 함께 맞춘다. 외부 listen/포트 공개는 하지 않는다. |
| 로컬 TLS | `VIBE_ZOO_TLS_CERT_PATH` / `VIBE_ZOO_TLS_KEY_PATH`로 Git 제외 파일을 읽는다. localhost/loopback에 맞는 서버 인증서와 해당 Chrome의 신뢰가 필요하다. 코드 구현 시 준비/오류 안내를 만들며 현재 인증서 신뢰 확보나 HTTPS/WSS 성공을 주장하지 않는다. TLS 검증 해제·HTTP/WS 자동 강등은 없다. |
| 신원/출처 | `VIBE_ZOO_ALLOWED_EXTENSION_IDS`와 `VIBE_ZOO_PUBLIC_ORIGIN` 등 환경 설정에서 허용 출처를 읽는다. 개발자 모드 ID/연결값은 비공개 로컬 설정이며 참여자 세션 인증과 별도로 검사한다. 실행/공유 경계는 NFR P-01·06. |
| 데이터 디렉터리 | `VIBE_ZOO_DATA_DIR`의 기본 제안은 저장소 내 `.local/state/`; Code Generation에서 먼저 Git 제외한다. 빌드 디렉터리나 임시 디렉터리에 DB를 두지 않는다. 디렉터리/DB/WAL/SHM을 WSL ext4에 함께 두고 Windows 공유 경로·네트워크 파일시스템에 직접 쓰지 않는다. |
| 모델 설정 | AWS_BEARER_TOKEN_BEDROCK·AWS_REGION·BEDROCK_MODEL_ID를 루트 .env에서 로드하고 명시 환경변수가 우선한다. ANTHROPIC_MODEL은 무시한다. 필수값 누락은 설정 필요로 표시하고 키 입력은 로컬 파일에서 받는다. 값·원시 SDK 오류는 출력하지 않는다. |

Windows에서 WSL 앱에 localhost로 접근하는 것은 [Microsoft 공식 문서](https://learn.microsoft.com/en-us/windows/wsl/networking)의 지원 경로다. 실제 이 제품 포트/인증서 연결은 구현 후 확인 조건이다. 공개 DNS·Tailscale·터널·프록시·방화벽 구성은 이번 데모의 선행 작업에서 제외한다.

SQLite는 WAL·foreign keys·짧은 `BEGIN IMMEDIATE` 쓰기를 사용한다. 한 연결의 동기 쿼리에 대량 조회/긴 lock 대기를 넣지 않고, busy/저장 실패는 해당 요청에 반환한다. 동작 전달 전 커밋과 장애 후 기록 보존을 위해 `synchronous=FULL`로 시작한다. WAL의 로컬 파일 조건과 지속성 차이는 [SQLite 문서](https://www.sqlite.org/wal.html)에 따른다. DB 오류를 비어 있는 새 DB 생성이나 메모리 성공 상태로 덮어쓰지 않는다.

## 4. 검증 범위와 다음 단계

프로세스 시작/정지·TLS/설정 오류·SQLite 재시작 보존·내부 MCP 제한·새 제품 연결/핵심 흐름은 [배포 구조](deployment-architecture.md)의 확인 순서를 코드 계획에 연결한다. 예산·경합·다른 입력·두 Actor·공유/개선 조건은 기존 NFR/BR/AC 참조를 유지한다. 과거 Haiku/Opus와 제한된 Chrome/MinIO probe는 [기술 결정](../nfr-requirements/tech-stack-decisions.md)의 당시 증거이며 이번 단계에서 반복하지 않는다.

공유 자원의 설정·정리는 [shared-infrastructure.md](../../shared-infrastructure.md)가 소유한다. 외부 참여자 접속은 보류·미검증이며 기능 Store/공유를 삭제하지 않는다. 세 설계 문서를 2026-09-09T01:37:45Z 승인받아 Code Generation **계획**을 작성한다. 코드 계획/구현 승인은 별도다. Security Baseline / Resiliency Baseline / Property-Based Testing은 Enabled No, 전문 미로드·준수 N/A다.
