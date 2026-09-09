# Vibe Zoo — Unit of Work

- **산출물 상태**: 승인된 [분해 계획](../plans/unit-of-work-plan.md)에 따라 생성·검토하고 2026-09-08T10:50:12Z 산출물 사용자 승인을 확인했다. Functional Design을 시작하며 구현은 아직 시작하지 않았다.
- **정의 원본**: 이 문서는 유닛의 범위·책임·완료 조건·코드 조직을 정의한다. [의존성](unit-of-work-dependency.md)과 [스토리 배정](unit-of-work-story-map.md)은 각각의 문서를 참조한다.

## 1. U-01 — Vibe Zoo MVP

| 항목 | 정의 |
|---|---|
| ID / 이름 | U-01 / vibe-zoo-mvp |
| 목적 | 사용자가 현재 웹앱에서 도구를 준비해 대화로 실행하고, 개인 업무를 가르쳐 저장·재사용·공유·개선하는 전체 MVP를 완성한다. |
| 포함 범위 | US-01~09 전체, C-01~07 전체, S-01~06 및 공통 중단·복구. FR-01~09·AC-01~10과 적용 NFR/CC를 유지한다. |
| 분해 기준 | 공통 실행·검증·상태·자산 계약을 공유하는 전체 사용자 흐름을 하나의 개발 유닛에서 조정한다. |
| 상태 소유권 | C-03: 대화·장기 작업·브라우저 연결 관계. C-06: 자산·개인 설정·검증 근거·버전·공유/설치 관계. 상세 계약은 승인된 Application Design을 따른다. |
| 구현 상태 | 미시작. 유닛 정의가 준비된 것과 제품 기능·실행 검증이 완료된 것은 별개다. |

유닛 하나는 서버·프로세스 하나나 Backend 물리 모놀리스 채택을 뜻하지 않는다. Chrome Side Panel Extension, Backend, 별도 Store UI의 제품 경계를 유지한다. 기술·엔진·제품 모델·MCP transport·어댑터·저장·worker·배포 방식은 후속 설계와 실제 검증 근거로 정한다.

## 2. 내부 논리 모듈과 책임

| 영역 | 포함 컴포넌트 | 유닛 안의 역할 |
|---|---|---|
| Extension | C-01 Keeper UI, C-02 Browser Bridge / Recorder | 같은 Panel의 준비·채팅·Record·개인 설정, 현재 사용자 탭의 관찰·기록·지정 실행과 결과 전달 |
| Backend | C-03 Orchestrator, C-04 Generation / Learning, C-05 MCP Execution / Validation, C-06 Asset Registry / Personal Settings | 요청·작업 조정, MCP Generator와 Skill 후보 생성, 실제 MCP 실행·검증, 자산·설정·버전 관리 |
| Store | C-07 Store UI | 별도 웹 화면에서 명시적 게시·특정 버전 설치와 검증 상태 안내 |

상세 책임은 [components.md](components.md), 공통 입출력은 [component-methods.md](component-methods.md), 업무 조정은 [services.md](services.md)를 참조한다. 위 모듈은 추가 개발 유닛이나 독립 배포 서비스의 선언이 아니다. 후보 생성·실행 검증·자산 반영과 개인 on/off·준비 상태의 구분도 기존 계약을 유지한다.

## 3. 같은 유닛 안의 구현·검증 순서

아래는 향후 승인할 Code Generation 계획의 내부 순서다. 각 항목을 별도 AI-DLC 단계나 완료한 개발 유닛으로 기록하지 않는다.

| 순서 | 확인할 사용자 결과 |
|---|---|
| 1 — 실제 실행 | Preset 없는 MinIO Console에서 관찰 → 도구와 기본 Skill 생성 → 다른 입력 검증 → 실제 MCP 검색/호출 → 현재 사용자 탭 실행 → 사후 상태 확인 → 같은 채팅 응답. 준비 자산 재사용과 다른 미등록 사이트의 동일 요청 경로를 포함한다. |
| 2 — 개인화 | Record → Stop → 명시적 의도 → 개인 Skill → 다른 입력 검증 → 개인 설정 저장·재접속·재사용 |
| 3 — 공유·설치 | 선택 버전 게시 → 서로 다른 사용자의 설치 → 설치자 자신의 탭에서 호환성과 실행 검증 |
| 4 — 개선 | 재현 실패와 관련 성공 사례 → 이유가 설명된 새 후보 → 실패/관련 성공 재검증 → 현재·이전 버전 보존. 수정·추가 시연은 선택적 보조 근거다. |

US-09와 해당 CC-01~08은 첫 관찰·실행부터 관련 경로에 적용한다. 최소 인증·권한·입력 검증·민감 입력 제외·변경 확인·취소·재접속·탐색 상한·채팅 동시 사용을 마지막 통합 작업으로 미루지 않는다. 초기 연동 검증이 실패하면 영향받는 설계·코드 계획을 갱신한 뒤 의존 기능을 확대한다.

## 4. Greenfield 코드 조직과 협업

| 위치 전략 | 용도 |
|---|---|
| 루트 src/ | Extension·Backend·Store의 논리 모듈을 구분하는 제품 코드 |
| 루트 tests/ | 핵심 경로·입력 변경·실패/취소·사용자/탭 경계 및 모듈 상호작용의 필요한 검증 |
| 루트 config/ | 환경별 설정과 값이 없는 설정 예시. 실제 주소·계정·키는 저장소 밖에서 주입 |
| 루트 README 및 screenshots/ 또는 result/ | 구현된 기능의 재현 안내와 실제 제품 실행 이후 수집한 화면 증거 |
| aidlc-docs/ | AI-DLC 문서만 보관. U-01 Construction 문서의 기준 경로는 construction/vibe-zoo-mvp/ |

이는 승인된 단일 유닛의 코드 조직 전략이며 파일·디렉터리는 아직 만들지 않는다. 언어·빌드·패키징·배포를 정한 뒤 정확한 제품 경로를 Code Generation 계획에 명시한다. 설정 파일·구조 예시가 시크릿 저장 허가를 뜻하지 않는다.

5명은 현재 유닛의 승인된 계약을 기준으로 독립 구현·검토·검증 작업을 병행할 수 있다. 담당자나 고정 시간 배분을 새로 가정하지 않으며 공통 계약 변경과 통합은 이 유닛에서 조정한다.

## 5. 완료 조건과 다음 단계

- **유닛 산출물 완료**: 정의·의존성·스토리 배정 세 문서가 승인된 계획과 일치하고 전체 스토리에 담당 유닛이 있다. 이번 단계가 확인하는 대상이다.
- **유닛 구현 완료**: 적용 설계·승인된 코드 계획을 실행하여 전체 US-01~09·AC-01~10과 필요한 공통 조건의 구현·검증을 끝낸다. 순서 1의 성공만으로 U-01을 완료 처리하지 않는다.
- **최종 제품 검증**: 단일 유닛의 코드·필요 검증 완료 후 전체 Build and Test에서 설치부터 공유·개선까지 통합 재현과 제출 증거를 확인한다. 구체 기준은 [requirements.md 6절](../requirements/requirements.md#6-수용조건과-완료-증거)을 참조한다.

산출물 승인 후 U-01의 Functional Design → NFR Requirements → NFR Design → Infrastructure Design → Code Generation을 [실행 계획](../plans/execution-plan.md)에 따라 진행한다. 첫 단계는 상태·업무 규칙의 Functional Design이다. 새 스파이크 단계를 추가하거나 기간을 이유로 공유·개선을 제외하지 않는다.

Security Baseline / Resiliency Baseline / Property-Based Testing은 모두 Enabled No, N/A다. 기본 FR/AC/NFR·CC는 유지한다.
