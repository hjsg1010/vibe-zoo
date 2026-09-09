# Vibe Zoo — Application Design Plan

## 1. 범위와 승인 상태

- **상태**: 필수 설계 생성·검토 및 최초 요구사항 재검토 완료. 2026-09-08T09:51:33Z 사용자의 조건부 설계 승인 충족을 확인하여 Units Generation으로 진행한다. 별도 설계 계획 승인을 받은 것으로 기록하지 않는다.
- **근거**: [실행 계획](execution-plan.md), [요구사항](../requirements/requirements.md), [스토리](../user-stories/stories.md), [페르소나](../user-stories/personas.md).
- **깊이**: Standard. 책임·입출력·서비스 조정·의존성을 정하며 상세 상태 전이·알고리즘은 유닛별 Functional Design에서 다룬다.
- **제약**: 1박 2일·5명. Backend 언어·엔진·제품 모델·MCP transport·어댑터·저장소·worker·배포는 미정이다. 논리 컴포넌트 수는 서버·개발 유닛·담당자 수가 아니다.

## 2. 수행 체크리스트

- [x] 승인된 요구사항·스토리·실행 계획과 두 시안의 논리 경계를 분석한다.
- [x] 컴포넌트·메서드·서비스·의존성·설계 방식의 질문 범주를 모두 평가한다.
- [x] 기존 승인으로 답이 정해진 사항과 후속 기술 선택을 구분하고 독립 검토한다.
- [x] 미해결 질문·모호성·충돌 여부를 확인한다. 현재 선행 질문은 없다.
- [x] components.md에 컴포넌트 목적·책임·인터페이스와 US/CC 연결을 작성한다.
- [x] component-methods.md에 공통 계약을 한 번 정의하고 컴포넌트별 메서드·입출력·목적을 작성한다.
- [x] services.md에 사용자 흐름별 서비스 책임·상호작용·조정 방식을 작성한다.
- [x] component-dependency.md에 의존성 행렬·통신 경계·데이터 흐름도와 텍스트 대안을 작성한다.
- [x] application-design.md에 위 문서의 핵심 결정과 연결을 종합한다. 표·계약 전문을 복제하지 않는다.
- [x] 전체 US/AC/CC 연결과 책임 누락·계약/의존성 모순을 검토한다.
- [x] 작성 전 콘텐츠 검증 및 작성 후 링크·표·다이어그램·공개 데이터 경계를 확인한다.
- [x] 상태·감사 기록과 단계 완료 승인 질문을 갱신한다.
- [x] 생성된 Application Design에 대한 사용자 승인을 기록한 뒤 Units Generation으로 진행한다 — 원문 재검토 조건 충족, 2026-09-08T09:51:33Z.

## 3. 설계할 논리 책임

| ID | 컴포넌트 후보 | 작성할 책임 |
|---|---|---|
| C-01 | Keeper UI | 준비·채팅·Record 제어·개인 설정·작업 상태·변경 확인 |
| C-02 | Browser Bridge / Recorder | 현재 탭 관찰·최소 시연 기록·지정 실행·사후 상태 회신·마지막 실행 대상 확인 |
| C-03 | Keeper Orchestrator | 요청 해석/Agent, 대화·연결·작업 조정, 진행·취소·재접속, 서비스 흐름 관리 |
| C-04 | Generation / Learning | 명시적 MCP Generator, 기본·개인 Skill 초안, 실패 기반 개선 후보 |
| C-05 | MCP Execution / Validation | 실제 MCP 검색·호출 연결, 버전 지정 어댑터 실행, 업무 사후 상태·검증 근거 |
| C-06 | Asset Registry / Personal Settings | 도구·Skill·의존성·검증·버전·개인 설정·공유/설치 자산 |
| C-07 | Store UI | 별도 웹 화면의 탐색·특정 버전 게시·설치 |

생성·학습이 직접 브라우저를 실행하거나 자체 판단만으로 자산을 활성화하지 않도록 책임을 연결한다. 실제 실행·검증은 공통 경로를 사용한다. 논리 서비스는 도구 준비, 채팅 실행, 시연 학습, 개인 설정, 공유·설치, 개선의 여섯 흐름으로 설명한다.

## 4. 질문 범주 검토와 처리

| 규칙의 질문 범주 | 확인 결과와 처리 |
|---|---|
| Component Identification | Extension·Backend·Store 경계는 승인됐으며 위 내부 책임 분해는 이 단계의 설계 작업이다. 제품 범위 변경 없이 초안을 작성·검토한다. |
| Component Methods | 사용자·연결·탭·문서·출처·작업·버전과 실제 결과라는 입출력 의미는 FR/CC로 정해져 있다. 언어 중립 계약으로 작성한다. |
| Service Layer Design | 생성·학습·실행·공유·개선 흐름은 스토리에 명확하다. 공통 작업 제어와 검증 책임을 정의한다. |
| Component Dependencies | 현재 사용자의 브라우저 실행, 설치자의 자체 검증, Store 비의존 개인 사용을 유지한다. 전송 기술은 후속 결정이다. |
| Design Patterns | 가벼운 논리 모듈 분해는 제약과 일치한다. 마이크로서비스·배포 형태·특정 엔진을 선확정하지 않는다. |

설계 생성 전 평가에서 작성을 막는 미해결 선택이나 모호한 답변은 없었다. 따라서 선행 질문과 미응답 [Answer] 항목 없이 생성했으며 이미 승인된 실행 계획의 재승인은 요청하지 않았다. 생성 후 단계 승인 질문은 6절에 둔다. 새로운 모호성이 발견되면 추천·영향과 함께 질문 하나를 제시하고, 답변은 에이전트가 감사 기록과 이 계획에 반영한다.

[Application Design 규칙](../../../.aidlc-rule-details/inception/application-design.md) Step 6~9의 질문 수집·분석은 위 평가로 처리한다. Step 10의 설계 생성은 승인된 실행 계획과 명시적 진행 지시 범위에서 수행한다. 이 규칙은 User Stories처럼 별도 계획 승인 단계를 명시하지 않으며, Step 13의 **생성 설계에 대한 명시적 승인**은 반드시 유지한다.

## 5. 중복 방지와 후속 결정

- 컴포넌트 책임·US/CC 연결은 components.md, 공통 계약·입출력은 component-methods.md, 서비스 조정은 services.md, 의존성·흐름은 component-dependency.md가 각각 원본이다.
- application-design.md는 전체 구조·핵심 흐름·후속 결정의 연결을 읽을 수 있는 종합 문서로 작성한다.
- 공통 수용조건은 stories.md의 CC-01~08을 참조한다. 새 테스트 시나리오·추적 행렬을 별도 문서로 추가하지 않는다.
- 기술 후보 비교·데이터 보존/삭제 세부·상태 전이·초기 지원 범위·물리 배치는 해당 Construction 설계에서 다룬다. 실제 실험은 승인된 Code Generation 계획에서 수행한다.
- Security Baseline / Resiliency Baseline / Property-Based Testing: 모두 Enabled No, 준수 N/A. 전체 규칙 미로드·적용 건너뜀. 기본 FR/AC/NFR·CC는 유지한다.

## 6. 생성 설계 검토와 승인

7개 컴포넌트·메서드 묶음과 6개 서비스, US-01~09 및 공통 조건의 연결을 검토했다. 직접 관찰과 MCP 실행의 호출 경로, Record 전달, Skill 검증의 다단계 조정, 개인 on/off와 검증 완료 상태 전환을 명확히 했다. Markdown·링크·표·다이어그램의 정적 검사와 독립 검토를 완료했으며 제품 실행 검증은 아직 수행하지 않았다.

### Question 1 — Application Design 산출물 승인

이 설계를 승인하고 Units Generation으로 진행할까요?

**추천: A.** 책임·공통 계약·검증 경계를 기준으로 구현 단위와 의존 순서를 정할 준비가 됐다. 첫 실제 전체 흐름을 우선하는 유닛을 다음 단계에서 구체화할 수 있다. 기술·배포 선택은 미정으로 유지한다.

A) 승인 — 생성된 설계를 승인하고 Units Generation을 시작한다.

B) 변경 요청 — 수정할 책임·계약·흐름을 설명한다.

X) 기타 — 원하는 검토·진행 방식을 설명한다.

[Answer]: A — 사용자의 “첫 requirement랑 부합하는지  다시 한번 확인하고 이상없으면 Unit generation 진행해줘” 지시에 따라 원문을 재검토했다. 개선 입력의 추가 시연/수정을 선택적으로 명확히 한 뒤 미해결 누락·충돌이 없음을 확인하여 2026-09-08T09:51:33Z 조건부 설계 승인을 확정했다. 원문과 검토 근거는 감사 기록에 보존했다.

승인 근거: [Application Design 규칙 Step 13](../../../.aidlc-rule-details/inception/application-design.md)의 명시적 승인 조건을 사용자의 조건부 진행 지시와 적합성 확인으로 충족했다. Units Generation Part 1을 시작하며 그 단계의 새 계획·산출물 승인은 별도로 다룬다.
