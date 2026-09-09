# U-01 — Functional Design Plan

## 1. 범위와 상태

- **유닛**: U-01 / vibe-zoo-mvp. [유닛 정의](../../inception/application-design/unit-of-work.md)·[스토리 맵](../../inception/application-design/unit-of-work-story-map.md)의 US-01~09 전체를 다룬다.
- **상태**: 2026-09-08T10:50:12Z 유닛 산출물 승인으로 Functional Design을 시작했다. Question 1 정책 답변에 따라 필수 네 설계를 생성·검토했으며 2026-09-08T11:39:23Z Question 2 산출물 승인을 확인했다. Functional Design 완료, NFR Requirements로 진행한다.
- **깊이**: Standard. 실행 대상·취소·재개·버전 경합은 상세히 다루고 공통 정의는 참조한다. 특정 언어·엔진·DB·MCP transport·어댑터 표현·배포를 선택하지 않는다.
- **기준선**: [requirements.md](../../inception/requirements/requirements.md), [stories.md](../../inception/user-stories/stories.md), [Application Design](../../inception/application-design/application-design.md), [실행 계획](../../inception/plans/execution-plan.md), [최초 제약사항](../../../requirements/constraints.md).

## 2. 설계할 내용과 필수 산출물

산출물 위치는 aidlc-docs/construction/vibe-zoo-mvp/functional-design/다. 아래 네 문서가 각 내용의 원본이며 별도 종합·질문·추적 문서를 추가하지 않는다. 필요한 후속 질문은 이 계획에서 이어간다.

| 파일 | 작성할 내용 |
|---|---|
| domain-entities.md | 대화·연결·실행 대상·작업/시도·개별 동작·확인·관찰/시연·자산/버전·검증 사례/결과·개인 설정·게시/설치의 관계, 식별·소유권·수명, 서로 독립인 상태 축 |
| business-rules.md | 실행 허용·입력/의존성 검증·중복 생성 방지·취소/늦은 결과·단절 후 재개·검증/활성/버전 반영의 불변 조건과 경합 시 판단, 개인/공유 접근, 개선 적용 정책 |
| business-logic-model.md | S-01~06과 공통 작업 제어의 단계·분기·입출력·오류 복귀, 다른 입력 검증, 부분 준비/부분 완료, 고정 버전과 결과 반영 알고리즘 |
| frontend-components.md | Keeper·Store 컴포넌트 계층, 입력/상태·상호작용·폼 검증·상태별 다음 행동, 기존 Backend 메서드와 연결 |

업무 규칙에는 BR 식별자를 두고 흐름·UI가 이를 참조한다. 엔터티·상태 의미는 domain-entities.md에서 한 번 정의한다. [기존 공통 계약](../../inception/application-design/component-methods.md)을 정교화하되 기존 타입 표와 CC-01~08의 수용조건 전문을 복제하지 않는다. Frontend의 API 연결은 기존 메서드 계약 기준으로 작성하며 미정인 HTTP 경로나 UI 프레임워크를 고정하지 않는다.

## 3. 분석 결과와 질문 범주

| 범주 | 처리와 근거 |
|---|---|
| Business Logic Modeling | 승인된 S-01~06을 상태·업무 판단으로 구체화한다. 기본 생성과 개인 Skill에 새 필수 승인 단계를 추가하지 않는다. |
| Domain Model | Application Design의 사용자·대상·작업·자산·버전·근거·설정 계약을 상세 관계로 연결한다. 논리 소유권은 C-03/C-06 구분을 유지한다. |
| Business Rules | Question 1의 A 답변으로 검증된 개선 후보의 명시적 사용자 적용을 결정했다. 그 외 허용/금지 조건은 FR/CC를 구체화한다. |
| Data Flow | 시연→명시적 의도→초안→검증→개인 저장, 개인/공유 투영과 근거 참조를 모델링한다. 수집 신호·모델 전송·보존기간/삭제 방식의 NFR 결정은 후속 단계에 둔다. |
| Integration Points | 실제 MCP·현재 사용자의 Bridge 계약과 결과 일치 조건을 유지한다. 공급자·SDK·전송·배포는 질문하지 않는다. |
| Error Handling | CC-01~06·08의 오류·거절·중단·사후 상태 재확인과 재개 판단을 상세화한다. 불확실한 변경을 자동 반복하거나 취소를 자동 롤백으로 해석하지 않는다. |
| Business Scenarios | 다른 입력·다른 설치자·일부 기능만 준비·실행 후 결과 미확인·탭/문서 변화·취소/완료/활성화 경합을 원래 AC에 연결한다. |
| Frontend Components | 같은 Panel과 별도 Store, Record→Stop→의도, 이름/설명/기본값/on-off 폼, 실행 대상·확인·오류·다음 행동을 설계한다. 개선 적용 조작은 Question 1 결과에 따른다. |

8개 범주와 독립 검토에서 선행 사용자 질문은 아래 한 개로 좁혔다. 기존에 승인된 제품 범위를 재질문하거나 해커톤 운영 범위를 늘리지 않는다. 새로운 모호성이 발견되면 그 영향에 필요한 질문만 하나씩 제시한다.

## 4. Question 1 — 검증된 개선 후보의 적용

개선 후보가 재현 실패와 관련 성공 사례의 검증을 모두 통과한 뒤, 사용자가 ‘적용’을 선택하면 현재 사용 버전을 바꾸도록 할까요?

**추천: A.** 변경 이유와 검증 결과를 확인한 뒤 다음 업무에 쓸 버전을 선택할 수 있다. 기존 후보/현재 버전 구분을 활용하므로 별도 운영 체계를 추가할 필요가 없다. 자동 적용은 다음 업무에서 쓰는 버전을 사용자의 추가 선택 없이 변경하는 대안이다.

A) 사용자가 적용 — 통과한 후보와 변경·검증 요약을 보여준다. 기존 버전을 유지하다가 사용자가 적용을 선택할 때 이후 실행의 기본 버전을 바꾼다.

B) 검증 후 자동 적용 — 유효한 검증이 끝나면 이후 실행의 기본 버전을 바꾸고 변경 결과를 표시한다. 이전 버전은 보존한다.

X) 기타 — 원하는 적용 조건을 설명한다.

[Answer]: A — 2026-09-08T11:05:09Z 사용자 원문: “추천안대로 적용해줘.” 검증 후에도 현재 버전을 유지하고, 사용자가 특정 개선 후보의 ‘적용’을 선택하면 이후 업무의 기본 버전을 바꾼다. 진행 중 고정 버전과 개인 on/off는 유지한다. 답변은 명확하며 후속 업무 질문은 없다.

질문 범위는 FR-08 / US-08 / S-06의 **현재 버전을 대체하는 개선 후보**다. 두 방식 모두 진행 중 작업의 고정 버전, 취소·늦은 결과 처리, 이전 버전 보존, 검증 전 적용 금지를 유지한다. 기본 생성·개인 Skill의 최초 저장/사용 가능 전환이나 선택 버전의 공유 설치에 이 정책을 일괄 확대하지 않는다.

[Functional Design 규칙 Step 5](../../../.aidlc-rule-details/construction/functional-design.md)는 “Do not proceed until ALL ambiguities are resolved”를 요구한다. 답변 전 개선 적용 정책을 확정하거나 Step 6의 설계 산출물을 생성하지 않는다. 사용자는 대화로 답하고 에이전트가 원문과 해석을 기록한다. 이는 별도 단계 진행 승인 요청이 아니라 미결정 업무 규칙의 선택이다.

## 5. 수행 체크리스트

- [x] 유닛 산출물 승인을 기록하고 Construction / U-01 Functional Design으로 전환한다.
- [x] 승인 유닛·요구사항·스토리·상위 계약과 해당 규칙을 읽는다.
- [x] 질문 8개 범주와 사용자에게 필요한 업무 결정을 독립 검토한다.
- [x] 필수 4개 산출물·정의의 원본·설계 범위를 계획한다.
- [x] 계획 콘텐츠·참조를 검증하고 질문 1개를 감사 기록에 남겨 이번 응답에서 제시한다.
- [x] 답변을 수집·분석하고 미결정·모호성·충돌을 해소한다.
- [x] domain-entities.md를 생성한다.
- [x] business-rules.md를 생성한다.
- [x] business-logic-model.md를 생성한다.
- [x] frontend-components.md를 생성한다.
- [x] 전체 US/AC/CC 연결·엔터티/규칙/흐름/UI 간 일관성과 오류·경합 시나리오를 검토한다.
- [x] 문서 구조·표·로컬 참조와 필요한 다이어그램을 검증한다.
- [x] 상태·감사 기록과 Functional Design 완료 메시지/산출물 승인 질문을 갱신한다.
- [x] 명시적 Functional Design 산출물 승인을 기록한 뒤 NFR Requirements로 진행한다 — 2026-09-08T11:39:23Z.

질문 답변 이후 생성은 위 순서로 수행한다. 별도 Functional Design 계획 승인 단계를 신설하지 않으며, 생성 설계의 명시적 승인은 규칙 Step 8에 따라 유지한다.

Security Baseline / Resiliency Baseline / Property-Based Testing은 모두 Enabled No, N/A다. 전체 규칙 미로드·적용 건너뜀이며 기본 FR/AC/NFR·CC와 실제 실행 검증 요구는 유지한다.

## 6. 생성 결과와 검토

[domain-entities.md](../vibe-zoo-mvp/functional-design/domain-entities.md), [business-rules.md](../vibe-zoo-mvp/functional-design/business-rules.md), [business-logic-model.md](../vibe-zoo-mvp/functional-design/business-logic-model.md), [frontend-components.md](../vibe-zoo-mvp/functional-design/frontend-components.md)를 위 순서로 생성했다. 엔터티/상태, BR-01~15, S-01~06/US-09 흐름, UI 계층·props/state·폼·기존 API 연결을 각각 한 곳에서 정의한다.

9개 스토리의 기존 AC 연결을 그대로 보존하고 전체 AC-01~10·CC-01~08 연결을 확인했다. 독립 검토 후 취소한 동작의 제한된 결과 관찰, Record의 허용 범위 내부 페이지 이동, 도구/Skill별 준비 요건, 같은 학습 Job의 검증 입력 보완 계약을 명확히 했다. 수정 지점을 재확인했으며 남은 검토 지적은 없다. Markdown 표·코드 블록·로컬 링크/앵커·BR 참조와 개인 절대경로 부재를 검사했다. 업무 전이와 관계는 표/텍스트로 표현하여 별도 다이어그램은 추가하지 않았다. 제품 구현·실행 테스트는 아직 시작하지 않았다.

## 7. Question 2 — Functional Design 산출물 승인

이 Functional Design 산출물을 승인하고 NFR Requirements로 진행할까요?

**추천: A.** 핵심 흐름·상태·버전의 업무 조건과 기존 수용조건 연결을 정리했다. 다음 단계에서 해커톤 범위의 비기능 요구와 미정 기술의 선택 근거를 구체화한다.

A) 승인 후 다음 단계 — 네 산출물을 승인하고 U-01 NFR Requirements를 시작한다.

B) 변경 요청 — 수정할 업무 규칙·흐름·화면 내용을 설명한다.

[Answer]: A — 2026-09-08T11:39:23Z 사용자 원문: “승인하자.” 직전 네 산출물 승인 질문에 대한 명확한 긍정 답변으로 Functional Design 완료와 U-01 NFR Requirements 시작을 승인했다.

[Functional Design 규칙 Step 8~9](../../../.aidlc-rule-details/construction/functional-design.md)의 명시적 산출물 승인 gate를 통과했다. 이번 Question 2 답변을 감사 기록·상태에 반영했으며, 후속 기술 결정이나 새 NFR 산출물이 승인된 것으로 확대하지 않는다.
