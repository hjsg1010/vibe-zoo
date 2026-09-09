# YMS 실제 검증 · Keeper 0.2.0

2026-09-09, 실제 Chrome Extension·공용 Backend·Bedrock Opus·MCP로 확인했습니다. Live Demo 시뮬레이션의 성공을 포함하지 않습니다. AI-DLC는 종료 상태이며 이번 변경은 종료 후 일반 개발입니다.

## 누구의 어떤 업무인가

대표 시나리오는 **반도체 공정 엔지니어가 계측 파라미터를 바꾸며 공정능력(Cp/Cpk), 트렌드, 알람을 확인하는 업무**입니다. 사용자가 제공한 WaferSight 합성 데모에서 구현·검증한 예시이며, 실제 사용자 조사나 시간 절감 실측으로 주장하지 않습니다. 같은 화면 조작을 매번 재해석하는 대신 검증한 원자 도구를 저장하고 Skill에서 재사용합니다.

## 설계에서 실제 결과까지

| 기존 결정 | 구현 연결 | 이번 실제 증거 |
|---|---|---|
| [FR-03 / AC-02, 미등록 사이트도 추출 경로 진입](../aidlc-docs/inception/requirements/requirements.md) | [DOM 관찰](../src/extension/observer.ts) → [다중 Discover](../src/backend/generation/discovery.ts) | YMS 첫 탐색 8개 후보, 추가 탐색 3개 후보. 기존 8개와 검증 상태 보존 |
| [US-02, 후보와 사용 가능 상태 분리](../aidlc-docs/inception/user-stories/stories.md) | [실제 MCP 검증](../src/backend/mcp/validation.ts), [사후 조건 검사](../src/shared/tool-readiness.ts) | 11개 중 4개 도구 실제 통과. 나머지 7개는 미검증 상태 유지 |
| [도구를 재사용하는 Skill](../aidlc-docs/construction/vibe-zoo-mvp/functional-design/business-logic-model.md) | [기본 Skill 생성](../src/backend/generation/basic-skill.ts) → 독립 검증 | 공정능력 조회 도구를 참조하는 기본 Skill 생성 및 실제 MCP 실행 통과 |
| [NFR-01, 요청 사용자·탭 경계](../aidlc-docs/inception/requirements/requirements.md) | Browser Bridge 바인딩·변경 확인·사후 관찰 | 실제 연결된 YMS 탭에서 필터 변경, Keeper에서 변경 승인. 별도 관리자 브라우저 사용 없음 |

`Discover`는 도구 계약·실행 어댑터·성공 조건을 생성합니다. `기본 Skill`은 사용자가 선택한 준비 도구의 버전을 참조하는 별도 실행 자산입니다. 기본 Skill 생성 자체는 검증된 도구를 감싸는 결정적 변환이며 별도 AI 학습 성공으로 계산하지 않습니다. `개인 Skill`은 Record와 명시적 의도로 여러 도구와 입력 변수를 구성하는 별도 경로입니다.

## 실제 검증 범위

| 대상 | 실제 수행과 결과 | 출처 |
|---|---|---|
| 첫 Discover | DOM 관찰 1회, Bedrock 요청 3회, 유효 후보 8개 보존. 형식이 맞지 않은 후보 1개 제외 | 제품 생성 Job → 실제 Extension 관찰·Bedrock |
| 추가 Discover | 기존 자산이 있는 상태에서 조회 도구 3개 추가. Bedrock 2회 중 뒤 응답의 형식 오류에도 앞서 얻은 3개 보존 | 제품 추가 탐색 API → 실제 Extension·Bedrock |
| `set_dashboard_filters` | 예시와 다른 `FILM_THK`·전체 제품·전체 설비로 검증. MCP → 브라우저 작업 5회, 선택값과 결과 영역 관찰 통과 | Keeper 시험 실행·변경 승인 |
| `read_capability_stats` | 공정능력·알람 배지·조회 범위 실제 관찰 통과 | 제품 검증 API → 실제 MCP·Extension |
| `read_trend_summary` | 트렌드 영역과 요약 실제 관찰 통과 | 제품 검증 API → 실제 MCP·Extension |
| `read_alarm_table` | 현재 알람 표와 관찰된 행 실제 확인 통과 | 제품 검증 API → 실제 MCP·Extension |
| `read_capability_stats 실행` | 검증 도구 버전을 참조하는 기본 Skill 생성. 별도 실제 MCP·브라우저 관찰 1회 통과 | 제품 기본 Skill 생성·검증 API |
| `set_dashboard_filters 실행` | 기본 Skill을 별도로 생성하고 `FILM_THK`·전체 제품·전체 설비로 독립 검증. 브라우저 5회 통과 | 제품 생성·검증 API, Keeper에서 변경 3회 승인 |
| 채팅에서 Skill·도구 조합 조회 | 공정능력 Skill과 트렌드 도구를 함께 요청. 모델 2회·실제 브라우저 관찰 2회 완료, 필터 유지. 당시 Cpk 0.82·Cp 0.86·트렌드 200점 응답 | 실제 Keeper 채팅 → Bedrock·MCP·Extension. 저장된 검증 보고서에서 기본 Skill과 트렌드 Tool 각각의 실행 통과 확인 |
| YMS Record 개인 Skill | 메뉴 조작 시연과 의도 제출. 실제 선택값 변경이 기록되지 않아 `not_observed`로 차단 | 실제 Keeper Record·Bedrock 1회. **완료 아님** |

입력이 없는 조회 3개와 공정능력 기본 Skill은 `state_observation` 검사입니다. 존재하지 않는 “다른 입력”을 만들어 검증했다고 기록하지 않습니다. 조회는 결과 영역의 존재를 확인하며 Cp/Cpk 계산의 수학적 정확성까지 검증하지 않습니다. 추가 탐색의 과거 결과 문구 중 기존 도구 수 표시 오류는 수정했으며, 보존 여부는 실제 자산과 버전으로 확인했습니다.

## 제한과 남은 일

- 주소 사전 등록 제한을 제거했습니다. **모든 사이트의 모든 기능을 자동 완성했다는 의미는 아닙니다.** 표준 DOM·접근 가능한 관찰 범위, 회당 후보 수와 분석 예산의 제한이 있습니다.
- 추가 도구 탐색은 작동합니다. 같은 이름의 기존 후보는 중복 방지로 유지되며, 미검증 후보 자동 재작성·수리는 별도 후속 과제입니다.
- 측정값 추가, 규격 변경, 알람 변경, 관리도 전환, 웨이퍼맵은 후보이며 이번 실행 성공 범위에 포함하지 않습니다. 관찰 부족·약한 사후 조건은 활성화 근거가 아닙니다.
- 알람 조회의 관찰 행 식별자는 동적이므로 이후 화면에서는 재검증이 필요할 수 있습니다.
- YMS 개인 Skill의 Record → 다른 입력 검증은 미완료입니다. MinIO의 이전 개인 Skill 실제 성공은 기존 기록에 보존합니다. 증거 없는 선택값을 추가하거나 검증 규칙을 완화하지 않았습니다.
- Computer Use는 이번 개발자의 Chrome 조작·캡처에 사용했습니다. 제품 Discover는 DOM·접근성 관찰과 Bedrock으로 도구를 만들며 Computer Use를 설치 전제로 요구하지 않습니다.

## 품질과 제출 일치

구현 커밋 `703b546`에서 91개 검사, 타입·린트·Backend/Extension/Store 빌드·공개 파일 검사가 통과했습니다. [원격 CI](https://github.com/hjsg1010/vibe-zoo/actions/runs/34323414734)도 통과했습니다. CI의 모델·브라우저 대역 검사와 위 실제 외부 실행은 구분합니다.

0.2.0 Release ZIP과 Backend 소스를 같은 버전으로 배포합니다. `.env`와 접근 코드·DB·원본 시연·개인 식별자는 공개하지 않습니다. 기존 MinIO·Store·개인 자산과 검증 기록은 보존했습니다.

최종 마무리에서 “전체 제품/설비”를 뜻하는 빈 문자열이 UI의 필수 입력 검사에 막히는 문제를 수정했습니다. 필수 필드 존재와 빈 문자열 허용을 Backend 계약에 맞췄고, 필수 숫자는 계속 검사합니다. 관련 회귀 검사 추가 후 총 **92개 검사·타입·린트·전체 빌드**를 다시 통과했습니다. 이 마지막 폼 수정은 자동 검사로 확인했으며 실제 YMS Skill 검증은 제품 API를 통해 수행했습니다.

## 공개 캡처와 짧은 검토 순서

1. [도구 목록](../screenshots/10-yms-multiple-tools.png): 11개 후보와 사용 가능한 4개를 확인합니다.
2. [도구 기반 기본 Skill](../screenshots/11-yms-tool-based-skills.png): 필터 기본 Skill 검증 뒤 `FILM_THK` 선택값·통계·트렌드와 의존 도구를 확인합니다. 개인 Skill의 `not_observed` 실패는 별도 기록입니다.
3. [채팅 결과](../screenshots/12-yms-chat-result.png): 기본 Skill과 다른 도구를 함께 사용한 실제 수치 응답을 확인합니다. 사이트가 주기적으로 갱신되므로 캡처 시점과 응답 당시의 최신값은 달라질 수 있습니다.
4. [애니메이션 WebP](../screenshots/13-yms-execution.webp): 위 실제 캡처 3장을 빠르게 검토하는 장면 모음입니다. 연속 녹화·실행 시간 측정이 아닙니다. 주소·프로필 영역을 잘라냈고 실행 화면·성공 문구를 합성하거나 다시 그리지 않았습니다.

최종 코드 `d056834`의 [원격 CI](https://github.com/hjsg1010/vibe-zoo/actions/runs/34324721939)에서도 92개 검사와 전체 빌드가 통과했습니다.
