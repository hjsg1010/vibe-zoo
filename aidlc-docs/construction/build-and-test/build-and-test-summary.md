# Build and Test Summary — U-01

**결과: 통과.** Code Generation 산출물 승인 후 별도 작업 디렉터리에서 의존성 설치부터 검사했다. 현재 소스/설정/lockfile과 검사 복사본이 동일함을 확인했다. 구현된 해커톤 제품과 필수 대표 흐름 근거는 [공통 구현 요약](../vibe-zoo-mvp/code/implementation-summary.md)을 참조한다.

## 재현 검사

Node 24.20.x / npm / TypeScript / ESLint / Vitest / esbuild. 비공개 설정·DB·기존 빌드·데모 자산을 복사하지 않았다. 로컬 캐시의 lockfile 설치, 타입·린트, 전체 테스트 및 세 대상 빌드가 모두 종료 코드 0으로 완료됐다. Backend/Extension/Store 진입 산출물 존재도 확인했다. 실행 중인 원래 데모는 변경하지 않았다.

이번 한 번의 관측 시간: install 3.98초 / typecheck 3.17초 / lint 1.95초 / tests 2.72초 / build 0.32초. 캐시가 있는 현재 WSL의 측정값이며 성능 보장이나 사용자 응답 시간은 아니다.

| 검사 디렉터리 | 파일 | 통과 | 실패 |
|---|---:|---:|---:|
| backend | 9 | 41 | 0 |
| extension | 3 | 11 | 0 |
| integration | 1 | 1 | 0 |
| ui | 5 | 8 | 0 |
| 합계 | 18 | 61 | 0 |

위 분류는 디렉터리 기준이며 Backend에도 HTTPS/WSS·MCP·SQLite 통합 검사가 포함된다. 통합을 별도 수량으로 더해 이중 계산하지 않는다. 코드 커버리지 비율 미측정. JSON 결과와 명령 출력은 Git 제외 로컬 검사 디렉터리에 보존했다.

## 실제 근거와 범위

- 기존 실제 생성·새 입력·MCP/자기 탭·채팅·Record·설정·AC-10 관찰 근거를 재사용했다. 이번 단계에서는 모델/브라우저 성공 실험을 반복하지 않았다.
- 개선은 **오류를 주입한 통제된 데모**에서 실제 실패 → 모델 후보 → 두 사례 → Keeper 적용 → 개선 버전 채팅/사후 확인 → 복구까지 확인한 근거다. 자연 발생 결함 해결로 주장하지 않는다.
- Store 두 번째 사용자 검증은 **사용자 전달 동료 결과**이며 직접 실행한 게시/API 근거와 구분한다. 원격 GitHub CI·Whale 호환성·외부 참가자 접속 경로는 미확인이다.
- 계약/인증/사용자·탭/입력/취소 경계는 기존 검사에 포함한다. 공개 파일·시크릿 제외 검사(176파일), diff 공백, 8문서의 로컬 참조·fence 검사가 통과했다. 운영 부하·침투·가용성 시험은 승인 범위상 N/A. 세 확장 규칙도 기존 비활성/N/A다.
- 실제 키 만료/잔여 크레딧은 미확인이고 모델 누계는 기존 13회 / 49,352 tokens 그대로다. 원본 자산/설정/Store와 합성 MinIO 데이터는 보존한다.

## 재현 지침과 다음 상태

[빌드](build-instructions.md), [단위/전체 suite](unit-test-instructions.md), [통합·실제 근거](integration-test-instructions.md). 공통 설치/설정/오류 처리와 여섯 기능의 촬영 순서·초기 상태·입력·확인 결과는 [README](../../../README.md)에만 유지한다.

Build and Test 실행 및 사용자 결과 승인 완료. 로컬 데모 촬영 준비는 완료했으며 실제 영상 촬영은 아직 하지 않았다. AWS AI-DLC v1.0.1의 Operations는 placeholder로, 이 버전의 실질 워크플로우는 Construction의 Build and Test에서 끝난다. 결과 승인 이후 범위는 준비된 데모 촬영이며 운영 배포·접속 경로 구축을 새로 시작하지 않는다.
