# Vibe Zoo

현재 웹앱을 관찰해 도구와 Skill을 만들고, 사용자의 로그인된 탭에서 실행하는 해커톤 데모입니다. **Keeper Extension**은 Side Panel·관찰·Record·브라우저 조작을 맡고, **Backend**는 Bedrock 모델·실제 MCP·작업 조정·SQLite·자산 Store를 제공합니다.

## 바로 체험하거나 설치하기

- **평가자용 [Live Demo](https://hjsg1010.github.io/vibe-zoo/)**: 설치·계정 없이 MinIO와 WaferSight를 체험합니다. Backend를 호출하지 않는 합성 시뮬레이션입니다. 실제 실행 증거는 데모의 별도 링크에서 확인합니다.
- **실제 Extension [최신 Release 다운로드](https://github.com/hjsg1010/vibe-zoo/releases/latest)**: `vibe-zoo-keeper-*.zip`을 받아 압축을 푼 뒤 Chrome 개발자 모드에서 `manifest.json`이 있는 폴더를 로드합니다. 자동 생성 Source code ZIP은 설치용이 아닙니다. ZIP을 Chrome에 직접 끌어넣는 방식은 지원하지 않습니다.
- **Backend 운영자**: 아래 설치·설정 절차를 따릅니다. `git pull`만으로 빌드 파일이나 키·접속 환경이 준비되지는 않습니다. 설치자는 공용 Backend에 연결할 수 있고, 각자 Backend를 실행하려면 자신의 설정과 키가 필요합니다.

Release ZIP은 고정된 공개 Extension ID를 사용합니다. `npm run demo:setup`은 기존 로컬 ID와 데이터는 보존하고 이 Release ID도 허용합니다. 이미 운영 중이라면 setup 후 Backend를 재시작하세요. `VIBE_ZOO_ALLOWED_EXTENSION_IDS`를 직접 지정한 환경은 Release의 `INSTALL.txt`에 있는 ID를 목록에 추가해야 합니다.

개발용 빌드는 기존대로 `dist/extension`입니다. `npm run release:extension`은 별도 `dist/release-extension`과 `dist/releases`에 설치 ZIP·체크섬·설치 안내를 만들며 현재 설치된 개발 폴더를 덮어쓰지 않습니다. Git에는 소스만, 설치 파일은 Release에 보관합니다. 패키징 명령에는 `zip`이 필요합니다(WSL/Ubuntu: `sudo apt install zip`).

## 구현과 검증 상태

| 기능 | 구현 | 실제 검증과 출처 |
|---|---|---|
| 도구·기본 Skill 생성과 다른 입력 검증 | 완료 | 직접 수행: Opus → 실제 MCP → 기존 Chrome/합성 MinIO → 사후 상태 |
| 채팅에서 준비 자산 재사용 | 완료 | 직접 수행: 새 버킷 생성과 실제 결과 확인 |
| Record → Stop → 의도 → 개인 Skill | 완료 | 직접 수행/사용자 시연: 원본과 다른 입력으로 검증 |
| 개인 이름·기본값·on/off | 완료 | 직접 수행: 저장된 기본값을 사용한 후속 채팅 |
| Store 공유·설치·자기 환경 사용 | 완료 | 직접 수행: 게시 UI와 별도 사용자 API 설치. **사용자 전달 결과**: 동료 환경의 두 번째 사용자 검증 완료 |
| 개선 후보·두 사례 검증·적용·이전 버전 | 완료 | 직접 수행: **오류를 주입한 통제된 데모**에서 실제 실패·Bedrock 후보·두 사례·Keeper 적용·채팅·복구 통과 |

검사 대역은 실제 모델/브라우저 성공으로 계산하지 않습니다. 상세 코드·AC 연결과 증거 한계는 [공통 구현 요약](aidlc-docs/construction/vibe-zoo-mvp/code/implementation-summary.md)을 참조하세요. Code Generation 산출물 승인을 받았고, 별도 깨끗한 작업 디렉터리에서 설치·타입·린트·61개 검사·세 빌드를 재현했습니다. 정식 [Build and Test 결과](aidlc-docs/construction/build-and-test/build-and-test-summary.md)까지 사용자 승인을 받았습니다.

## 설치와 설정

개발 환경은 WSL/Linux와 Windows Chrome입니다. Node **24.20.x**(`.node-version`), npm, OpenSSL, 로그인 가능한 합성 데이터 MinIO Console, 제공받은 Bedrock API 키가 필요합니다. 일반 참여자는 별도 CLI나 Agent 앱 없이 Extension을 사용합니다. 아래 CLI는 Backend를 준비하는 개발자용입니다.

```sh
npm ci
cp config/env.example .env   # 새 환경에 .env가 없을 때만 실행
```

기존 `.env`가 있다면 복사해서 덮어쓰지 말고 로컬 편집기로 필요한 항목만 확인하세요.

| 환경변수 | 설정 |
|---|---|
| `AWS_BEARER_TOKEN_BEDROCK` | 로컬 `.env`에 제공받은 키 입력. 빈 값이면 파일에서 채우세요. 채팅/로그에 붙이지 않습니다. |
| `AWS_REGION` | `ap-northeast-2` |
| `BEDROCK_MODEL_ID` | `global.anthropic.claude-opus-4-8` |
| `VIBE_ZOO_SYNTHETIC_DEMO_ORIGIN` | 승인된 합성 MinIO Console의 정확한 origin. 경로 없이 scheme·host·port를 로컬에서 지정합니다. |
| `VIBE_ZOO_PUBLIC_ORIGIN` | 기본 `https://localhost:18443` |
| `VIBE_ZOO_BIND_HOST` / `VIBE_ZOO_PORT` | 기본 `127.0.0.1` / `18443` |
| `VIBE_ZOO_DATA_DIR` | 기본 `.local/state` |
| `VIBE_ZOO_TLS_CERT_PATH` / `VIBE_ZOO_TLS_KEY_PATH` | 기본 `.local/tls/localhost.crt` / `.local/tls/localhost.key` |
| `VIBE_ZOO_ALLOWED_EXTENSION_IDS` | 기본 빈 값: setup이 생성한 로컬 Extension ID를 사용합니다. |

`ANTHROPIC_MODEL`은 Backend가 읽지 않습니다. Claude Code용 `[1m]`을 Bedrock modelId에 넣지 마세요. 다른 모델로 자동 대체하지 않습니다. 키/모델 접근·유효기간·크레딧은 설정 존재만으로 보장되지 않습니다. 글로벌 추론에서 리전 밖 처리가 가능하며, 전송 허용 범위는 최소 필터 근거를 사용하는 합성 MinIO 데모입니다.

```sh
npm run demo:setup
npm run build
npm run demo
```

setup은 TLS와 안정된 Extension ID, 두 데모 사용자 접근 코드, DB migration을 준비합니다. 재실행해도 기존 자산·코드·설정을 초기화하지 않습니다. 사설 대상 설정은 `.env` 또는 `.local/config.json`에만 둡니다. `.env`, `.local`, `dist`, `dist.zip`은 Git에서 제외됩니다.

1. Chrome에서 `https://localhost:18443/health`를 열어 인증서 신뢰와 `status: ok`를 확인합니다. 인증서를 신뢰할지 로컬에서 직접 판단하고 등록하세요. 앱은 인증서 검증을 끄거나 OS 신뢰 저장소를 자동 변경하지 않습니다.
2. `chrome://extensions`에서 개발자 모드를 켜고 **압축해제된 확장 프로그램을 로드**하여 `dist/extension`을 선택합니다. Windows에서는 탐색기의 WSL 공유 경로에서 프로젝트의 해당 폴더를 선택할 수 있습니다.
3. 로그인한 합성 MinIO 탭에서 Vibe Zoo 아이콘으로 Keeper를 엽니다.
4. Backend 주소와 `.local/demo-access.json`의 해당 사용자 코드를 입력하고 **이 탭 연결하기**를 누릅니다. `demo-keeper`와 `demo-colleague`는 서로 다른 개인 영역입니다. 코드 값을 공유 문서/화면에 노출하지 마세요.
5. Store는 `https://localhost:18443`에서 엽니다. Store 설치는 로그인 세션을 복제하지 않습니다. 설치 자산은 설치자 자신의 Keeper 대상 탭에서 검증해야 사용 준비가 됩니다.

서버를 업데이트했다면 build 후 Backend를 재시작하고 Extension의 새로고침을 누른 뒤 대상 탭을 다시 연결하세요. 재생성은 필요하지 않습니다. 브라우저는 Chrome을 기준으로 합니다. Whale 연결 호환성은 확정되지 않았으며 시크릿 모드 Extension 실행/Chrome Web Store 배포는 MVP 범위에 없습니다.

## 대표 사용법

- **처음 도구 준비**: 준비 자산이 없는 허용된 페이지에서 `이 페이지 도구 준비` → 후보/입력 검토 → 표시된 변경 확인 → 도구와 기본 Skill의 독립 검증. 일부만 통과하면 그 상태를 구분합니다.
- **채팅**: `새 이름의 버킷 하나 만들어줘`처럼 요청합니다. 현재 대상과 실제 입력을 확인한 후 실행하며, 페이지의 사후 결과로 성공을 판정합니다. 준비 자산이 있으면 재사용합니다.
- **개인 Skill**: `내 Skill` → `Record 시작` → 웹앱에서 직접 시연 → `Stop` → 수행 의도 직접 입력 → 생성된 초안 → 원본과 다른 새 입력 검증. Stop만으로 모델 호출/재생하지 않습니다.
- **개인 설정**: 자산의 `개인 설정`에서 이름·설명·기본값·사용 여부 저장. 이후 채팅에 반영되며 이미 시작된 실행은 고정 버전을 유지합니다.
- **공유/설치**: `Store에 공유` → 공개 내용 미리보기 → `이 버전 게시`. Store에서 고정 버전을 설치한 뒤 의존 도구와 Skill에 서로 다른 새 입력을 준비해 자기 탭에서 검증합니다. 로그인·대화·시연 원본·개인 기본값은 공개하지 않습니다.
- **개선**: `개선·이전 버전`에서 같은 현재 버전의 실제 실패·관련 성공 기록을 선택하고 개선할 점을 입력합니다. 후보는 입력 계약과 업무 사후 조건을 보존합니다. 실패 상황과 성공 상황을 각각 준비하고 새 입력으로 검증한 뒤 `검증한 후보 적용`을 누릅니다. 두 사례 통과 전에는 적용할 수 없습니다. `보존한 이전 버전으로 복구`는 향후 사용 버전만 바꾸며 웹앱 변경을 되돌리지 않습니다.

이미 만든 버킷 이름을 재사용하지 마세요. 예시 입력은 `vibe-zoo-demo-<날짜>-<순번>`처럼 매번 새로운 합성 이름을 사용합니다. 촬영에 쓸 검증 자산은 그대로 보존하고 도구 전체 생성을 반복하지 않습니다.

## 실행·종료·정리와 검사

```sh
npm run demo                          # 포그라운드 실행; Ctrl+C로 종료
npm run demo:stop                     # 이 WSL 프로젝트 Backend만 정상 종료 요청
npm run demo:cleanup -- --owner demo-keeper  # 삭제 없이 영향 수량 확인
npm run typecheck
npm run lint
npm test
npm run build
npm run check:public
```

`demo:stop`과 정리의 프로세스 검사는 WSL/Linux `/proc`을 사용합니다. 종료·재시작은 DB/자산을 보존합니다. 실행 중 연결이 끊기면 결과가 미확인일 수 있으므로 실제 페이지를 확인하고 완료한 변경을 반복하지 마세요.

촬영을 마친 뒤 개인 데모 영역을 정말 비워야 할 때만 Backend를 멈추고 `npm run demo:cleanup -- --owner demo-keeper --apply`를 실행합니다. 지정 사용자 개인 자산/설치/작업/세션을 정리하며 접근 코드·다른 사용자·게시된 Store 스냅샷·MinIO 데이터는 보존합니다. **현재 데모 데이터에 이 삭제 명령을 실행하지 않았습니다.**

CI는 [공식 setup-node 사용법](https://github.com/actions/setup-node/tree/v4)에 맞춰 프로젝트 Node 버전을 선택하고 시크릿 없는 합성 단위/통합 검사와 빌드·공개 파일 점검을 수행하도록 작성했습니다. 원격 실행 결과는 [GitHub Actions](https://github.com/hjsg1010/vibe-zoo/actions)에서 확인할 수 있습니다. Bedrock 호출이나 개인 브라우저 실행은 CI에 포함하지 않습니다. `check:public`은 텍스트/파일 검사이며 스크린샷은 별도 육안 검토가 필요합니다.

## 알려진 제약과 문제 해결

| 상황 | 확인할 내용 |
|---|---|
| Backend 연결 실패 | 서버 실행, 주소/포트, `/health` 인증서 신뢰, Extension 새로고침/대상 탭 재연결 |
| 접근 코드 거절 | 로컬 `demo-access.json`의 선택 사용자 코드 확인. 키 값을 로그에 붙이지 않기 |
| setup에서 접근 파일 누락/불일치 | 기존 DB와 맞는 원래 비공개 접근 파일 복원. 기존 DB 삭제나 코드 자동 회전으로 우회하지 않음 |
| 모델 인증/권한/모델 ID/할당량 오류 | 해당 분류와 로컬 환경변수 확인. 무한 재시도나 Haiku fallback 없음 |
| Store 설치 뒤 검증 필요 | 설치자 자신의 연결·로그인·새 입력 검증 필요. 게시자 성공을 설치자 성공으로 상속하지 않음 |
| Record가 끊김 | 문서 교체·다른 탭·연결 단절·민감 영역은 기록 제한. 같은 탭에서 새 시연 필요 |
| 후보 실패/부분/미확인 | 완료된 동작과 사후 상태를 먼저 확인. 실패를 성공으로 바꾸거나 자동 재실행하지 않음 |
| 개선할 실패 사례가 없음 | 기록이 없으면 후보 생성 불가. 이미 해결한 과거 실패/의도적 잘못된 입력을 새 개선 성공으로 주장하지 않음 |

표준 DOM의 접근 가능한 요소가 초기 범위입니다. 교차 출처 iframe/canvas/비표준 UI·페이지 수명 변경은 제한이 있으며 임의 원격 JS를 실행하지 않습니다. 운영용 HA·Kubernetes·외부 서비스 접속 경로 설정은 추가하지 않았습니다.

실제 화면 증거: [도구 생성·실행](screenshots/01-generation-execution.png), [Record 학습 완료와 개인 Skill](screenshots/02-personal-skill.png). [Store 게시 자산·상세·설치 진입](screenshots/03-store-install.png). Store 화면은 설치 성공 결과가 아니라 설치 진입 증거이며, 동료 환경 검증은 사용자 전달 결과입니다. [통제된 개선 검증·적용](screenshots/04-improvement.png).


## 통제된 개선 데모의 조건

자연 발생 결함을 찾았다는 주장이 아닙니다. 기존 도구와 분리된 `통제 데모 버킷 생성` 복사본의 대기 locator 하나에 `legacyHeading` 설정 의존 오류를 주입했습니다. `Create a Bucket`은 실제 제목과 달라 실패하고 `Create Bucket`은 성공했습니다. 복사본은 미준비 상태에서 시작했고 실제 성공 보고서가 생긴 뒤 일반 규칙으로 활성화했습니다. 의존 자산이 없는 도구 복사본이라 원본 Skill/Store에 영향이 없습니다.

Bedrock이 실제 두 기록으로 locator만 수정한 후보를 만들었습니다. 입력 계약·업무 사후 조건은 그대로이며 낡은/정상 제목을 유지한 새 입력 두 사례가 실제 MCP·Extension·MinIO에서 통과했습니다. Keeper 명시 적용 후 낡은 제목을 전달한 채팅도 새 버킷을 생성했고, 이전 버전 복구를 확인했습니다. 현재는 촬영용으로 개선 버전을 다시 선택해 두었습니다. 초기 준비 스크립트와 후보/검증 접수 API 사용, Keeper에서 수행한 변경 확인·적용·채팅·복구를 [구현 기록](aidlc-docs/construction/vibe-zoo-mvp/code/implementation-summary.md)에서 구분합니다.

## 기능별 촬영 준비

실제 촬영은 정식 Build and Test 검토를 마친 뒤 시작합니다. 공통 초기 상태는 실행 중인 로컬 Backend, 신뢰한 TLS, 로그인한 합성 MinIO와 연결된 Keeper입니다. 주소 표시줄·프로필·접근 코드·키는 촬영에 포함하지 않습니다. 각 이름의 `<take>`는 촬영 회차의 고유 값으로 바꾸고 이미 생성된 이름은 재사용하지 않습니다. 아래는 **촬영 계획**이며 새 촬영/추가 모델 실행을 완료했다는 기록은 아닙니다.

| 편집 순서 / 기능 | 초기 상태 | 입력과 사용자 동작 | 화면에서 확인할 결과 |
|---|---|---|---|
| 1. 도구·기본 Skill 생성 | 보존된 실제 생성 기록과 준비 도구/기본 Skill. 새 생성 장면은 아래 별도 빈 데모 영역 사용 | `이 페이지 도구 준비` → 생성 후보 확인 → 서로 다른 `film-tool-<take>` / `film-basic-<take>` 입력·변경 확인 | 실제 생성 후보, 도구/기본 Skill 각각 검증 통과, MinIO의 새 버킷 |
| 2. 채팅 실행 | 기존 검증 자산이 준비된 원래 영역 | `film-chat-<take> 버킷 하나 만들어줘` → 대상·입력 확인 | 준비 자산 재사용, 실제 MCP 실행 결과와 버킷 목록 |
| 3. Record·개인 Skill | 내 Skill, 기록 중인 작업 없음 | Record → `film-record-<take>` 생성 시연 → Stop → “버킷 이름을 바꿔 반복 생성” 의도 → `film-learn-<take>` 검증 | Stop 후 의도 입력, 개인 Skill 초안, 시연과 다른 값의 검증 통과 |
| 4. 개인 설정 | 촬영용으로 새로 학습한 개인 Skill | 이름/기본값을 `film-default-<take>`로 저장 → 이름 없는 실행 요청 → 변경 확인 | 저장된 기본값으로 실행·실제 버킷. 기존 검증 Skill 설정은 보존 |
| 5. Store 공유·설치·사용 | 개인 Skill 공개 미리보기, 동료의 자기 로그인 탭/Extension | 선택 버전 게시 → 동료 Store 설치 → `film-store-tool-<take>` / `film-store-skill-<take>`로 본인 검증 | 고정 버전 공유, 설치자 재검증·자기 탭 실행. 동료 촬영분과 현재 환경 증거 출처 구분 |
| 6. 개선·적용·복구 | 보존된 통제 복사본과 실패/성공 기록. 화면에 “오류 주입 데모” 설명 | 기록/모델 후보/두 결과 열기 → 적용 버전 확인 → `film-improve-<take>`, 낡은 제목으로 채팅 → 이전 버전 복구 → 개선 버전 재선택 | 두 사례 통과, 명시 적용, 개선 버전의 실제 결과, 포인터 복구. 자연 발생 성과로 표현하지 않음 |

새 **개선 후보 생성부터** 라이브 촬영할 때는 복사본만 이전 버전으로 복구하고 보존된 실제 실패·성공 사례를 선택합니다. 새 후보의 두 검증에는 `film-failure-<take>` / `film-regression-<take>`와 각각 낡은/정상 제목을 사용합니다. 검증 후 Keeper 적용·채팅·복구를 이어갑니다. 원본 도구나 공유 자산은 수정하지 않습니다.

실제 촬영은 원래 영역을 사용하는 2~6번을 먼저, 신규 생성이 필요한 1번을 마지막에 진행하면 환경 전환이 적습니다. 보존된 생성 결과 설명만 촬영한다면 별도 영역은 필요 없습니다. 새 생성 장면을 촬영할 때만 아직 사용하지 않은 **별도 데이터 디렉터리**를 선택합니다. 기존 `.env`나 `.local/state`를 덮어쓰거나 삭제하지 않습니다. 영역 전환 뒤에는 Keeper의 대상 탭을 다시 연결합니다.

```sh
npm run demo:stop
VIBE_ZOO_DATA_DIR=.local/film-fresh-01 npm run demo:setup
VIBE_ZOO_DATA_DIR=.local/film-fresh-01 npm run demo
# 촬영 후 종료하고 원래 설정으로 복귀
npm run demo:stop
npm run demo
```

명령의 `film-fresh-01`은 아직 사용하지 않은 촬영 회차 디렉터리로 바꾸세요. 새 디렉터리 준비·촬영 자체는 아직 수행하지 않았습니다. 원래 검증 자산·개인 설정·Store와 이번 통제 데모 데이터는 보존되어 있습니다.
