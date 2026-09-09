# Vibe Zoo — Application Design

**상태**: 2026-09-08T09:51:33Z 최초 요구사항 재검토 조건을 충족하여 사용자 설계 승인을 확인했다. [승인된 실행 계획](../plans/execution-plan.md)에 따라 [설계 수행 계획](../plans/application-design-plan.md)을 실행했다. 제품 코드·실행 검증·기술 채택을 완료한 상태는 아니다.

## 1. 종합 구조

사용자가 이미 로그인한 현재 탭을 Extension이 관찰·기록·실행하고, Backend가 생성·학습·Agent 요청 처리와 실제 MCP 연결·검증·자산 관리를 조정한다. 별도 Store는 선택 버전의 공유·설치를 제공한다. 개인 생성·학습·설정·채팅은 Store 게시 없이 완결된다.

논리 책임은 Keeper UI, Browser Bridge/Recorder, Keeper Orchestrator, Generation/Learning, MCP Execution/Validation, Asset Registry/Personal Settings, Store UI의 **7개**로 나눈다. Keeper Agent와 MCP Generator 역할을 각각 조정자와 생성 컴포넌트 안에 명시한다. 이는 서버·컨테이너·개발 유닛 수의 결정이 아니다.

현재 탭에서 호환 자산을 찾고, 없으면 관찰 근거로 후보를 만든다. 후보를 특정 버전으로 저장한 뒤 공통 MCP 실행·검증 경로로 다른 입력과 실제 업무 결과를 확인한다. 작업 제어와 검증 조건을 만족한 결과를 사용 가능 상태에 반영하고 같은 Panel에서 사용한다. 기록과 의도로 만든 개인 Skill, 설치 자산, 개선 후보도 이 경로에 연결한다.

## 2. 문서별 원본과 연결

| 문서 | 여기서 정의한 설계 |
|---|---|
| [components.md](components.md) | 7개 컴포넌트의 목적·책임·인터페이스와 스토리/공통 조건 연결 |
| [component-methods.md](component-methods.md) | 사용자·대상·작업·버전·근거·후보·검증 결과 공통 타입과 컴포넌트 메서드 입출력 |
| [services.md](services.md) | 도구 준비·채팅·시연 학습·개인 설정·공유/설치·개선의 6개 서비스와 공통 중단/복구 조정 |
| [component-dependency.md](component-dependency.md) | 의존성 행렬, 데이터 소유와 통신 경계, 흐름도와 텍스트 대안 |

이 문서는 위 책임·계약·서비스·의존성을 연결한 종합 설명이다. 정의 표를 다시 복제하지 않는다. 기능·수용조건의 기준선은 [requirements.md](../requirements/requirements.md), 공통 Given/When/Then은 [stories.md](../user-stories/stories.md)의 CC-01~08이다.

## 3. 설계의 핵심 경계

- **생성과 검증**: C-04는 후보·추가 근거/검증 제안을 반환한다. 실제 MCP 실행·업무 사후 상태는 C-05/C-02가 확인하고 C-03/C-06이 유효한 결과만 자산에 반영한다.
- **실행 대상과 제어**: 사용자·Extension·탭·문서/페이지 상태·출처·작업·자산 버전을 연결한다. C-03의 현재 작업 제어와 C-02의 최종 확인을 생성 검증과 일상 실행에 공통 적용한다.
- **상태와 버전**: 대화·장기 작업·브라우저 연결을 C-03에서 구분하고 자산·검증 근거·개인 설정은 C-06에서 관리한다. 취소된 결과의 보존과 활성화를 구분하며 실행 중 버전이 바뀌지 않게 한다.
- **개인과 공유**: 관찰/시연·대화와 공유 가능 자산 투영을 분리한다. 설치한 특정 버전은 설치자 자신의 환경에서 검증한다. 자산 설치와 웹앱 로그인·권한은 별개다.
- **해커톤 범위**: 첫 실제 경로부터 취소·잘못된 대상 방지·다른 입력·사후 상태 검증을 포함하고, 개인화·공유·개선으로 이어간다. 운영 고도화나 새로운 MVP 기능을 추가하지 않는다.

## 4. 후속 단계의 결정과 검증

| 다음 단계 | 이 설계를 바탕으로 정할 사항 |
|---|---|
| Units Generation | 실제 전체 흐름을 이른 완료 지점으로 갖는 구현 단위·의존 순서·스토리 연결. 컴포넌트나 참여자 수를 그대로 유닛 수로 쓰지 않는다. |
| 유닛별 Functional Design | 상태 전이, 중복 식별, 실행 허가/취소 경합, 단절 후 결과 확인, 자산 적용·설정 변경·버전 전환 조건, 상세 데이터 모델 |
| 유닛별 NFR Requirements/Design | Backend 언어·엔진·모델·MCP/Bridge·어댑터 후보 비교, 최소 인증/입력·권한, 데이터 수집·전송·보존·삭제, 동시 처리/탐색 예산 |
| 유닛별 Infrastructure Design | 실제 데모 설치·접속·저장·배포와 설정, MV3 환경의 어댑터 표현/실행 제약. 프로세스·worker·자원 구성은 필요한 근거로 정한다. |
| 승인된 Code Generation 및 전체 Build and Test | 실제 생성→MCP→사용자 탭 실행, 다른 입력, AC-01~10 및 관련 CC 검증, README·실제 스크린샷·간단한 CI |

첫 전체 흐름 대상은 MinIO Console이며 다른 미등록 사이트도 같은 생성 요청 경로를 사용한다. 지원 범위·MV3/배포 적합성·성능은 실제 관찰·실행 후 주장한다. OpenTabs·특정 하네스·사용자별 컨테이너·원격 코드 실행을 채택하지 않았다.

## 5. 검토와 승인

문서 생성과 검토 결과는 [수행 계획](../plans/application-design-plan.md)과 [감사 기록](../../audit.md)에 남겼다. [최초 요구사항](../../../requirements/vibe-zoo-requirements.md)·[제약사항](../../../requirements/constraints.md)과 FR-01~09·AC-01~10 및 NFR 연결을 다시 대조했다. 개선의 수정·추가 시연 입력이 필수처럼 읽히던 한 곳을 선택적 보조 근거로 바로잡았으며, 보완 후 미해결 누락·충돌을 발견하지 못했다. 최초 요구사항이나 MVP 범위는 변경하지 않았다.

사용자의 적합성 확인 후 진행 지시에 따라 상위 설계 승인을 기록하고 Units Generation으로 진행한다. 제품 구현은 Construction의 승인된 계획에서 시작한다.

확장 준수: Security Baseline / Resiliency Baseline / Property-Based Testing 모두 Enabled No, N/A. 전체 규칙 미로드·적용 건너뜀이며 기존 기본 FR/AC/NFR·CC는 유지한다.
