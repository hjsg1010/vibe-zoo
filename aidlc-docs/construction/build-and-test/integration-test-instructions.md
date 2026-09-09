# Integration Test Instructions — U-01

단일 유닛 내부의 실제 저장소·프로토콜과 모델/브라우저 대역 경계를 검사한다. 별도 외부 Backend나 Bedrock 키가 필요하지 않다. 아래 검사는 전체 `npm test`에 이미 포함되므로 전체 suite 통과 후 변경이 없으면 다시 실행하지 않는다.

```sh
npm test -- tests/backend/api.test.ts tests/backend/generation-mcp.test.ts tests/backend/demo-commands.test.ts tests/backend/improvement.test.ts tests/integration/core-flow.test.ts
```

| 경계 | 준비·동작·기대 결과 |
|---|---|
| 인증 → HTTPS/WSS → 대상 | 테스트가 임시 TLS 인증서/서버/DB 준비. 세션·Origin·실제 연결·사이트 자산 필터·본문 제한·정적 경로 검사. 잘못된 요청 거절, 종료 시 임시 자원 정리 |
| 생성/검증 → MCP → 실행 계약 | 공식 SDK의 실제 tools/list·tools/call, 모델/브라우저는 합성 대역. 별도 입력·사후 조건·고정 버전·이름 충돌을 검증 |
| 실패/성공 → 개선 → 적용/복구 | 실제 SQLite와 합성 실행 근거. 두 사례·변경 확인·버전 충돌·중복 요청·취소/설정 보존을 검사. 대역 성공을 실제 모델 결과로 세지 않음 |
| setup/stop/cleanup → 저장소 | 임시 프로젝트의 migration·접근 코드 재사용·소유자별 정리 검사. 실제 데모에는 삭제 적용하지 않음 |
| 미등록 사이트 → 관찰 제한 | 같은 prepare 경로의 합성 관찰 후 모델 전송 차단 확인. 모델 호출 0회 |

실제 전체 흐름은 승인된 [구현·검증 기록](../vibe-zoo-mvp/code/implementation-summary.md)의 AC 표와 단계별 근거를 재사용한다. 도구/Skill·채팅·Record·설정·통제 개선은 실제 실행, Store 두 번째 사용자는 사용자 전달 동료 검증이다. 최초 개선 오류 주입과 실제 모델 수정·브라우저 검증을 구분한다. 이미 검증된 브라우저/모델 연결이나 전체 자산 생성을 이 단계에서 반복하지 않았다.

변경으로 실제 재검증이 필요하면 [README 촬영/대표 시나리오](../../../README.md)를 따라 본인 로그인 탭과 새 합성 입력을 사용하고 변경 확인·사후 상태를 보존한다. 미확인 결과는 완료한 업무를 재실행하기 전에 관찰한다. 민감정보 전송·원본 자산/데모 데이터 삭제는 허용하지 않는다.

계약·인증/권한·입력/시크릿 경계 검사는 위 suite와 `check:public`에 포함한다. 별도 마이크로서비스 계약 문서·침투 테스트·운영 부하/스트레스 시험은 이번 승인 범위에 없다. 예산·슬롯·취소는 기존 jobs/bridge 검사와 실제 실행 기록을 참조하며 별도 SLA나 처리량을 만들지 않는다.
