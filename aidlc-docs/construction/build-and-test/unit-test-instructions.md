# Unit Test Instructions — U-01

[빌드 전제](build-instructions.md)를 준비한 뒤 저장소 루트에서 실행한다.

```sh
npm test
# 변경 기능만 확인할 때의 예
npm test -- tests/backend/improvement.test.ts tests/ui/improvement.test.tsx
```

전체 기본 suite에는 단위 검사와 합성 UI/통합 검사가 함께 들어 있다. 기대 결과는 18개 파일·61개 검사 통과, 실패 0개다. 분류별 수량은 [단계 요약](build-and-test-summary.md)을 따른다. 코드 커버리지 비율은 측정하지 않았으므로 수치를 제시하지 않는다.

기계 판독 결과가 필요하면 Git 제외 경로에 저장한다.

```sh
mkdir -p .local
npm test -- --reporter=json --outputFile=.local/test-results.json
```

검사 실패 시 해당 assertion과 테스트 환경을 확인하고 핵심 동작/계약을 수정한다. 실패 검사를 먼저 재실행하고 영향 범위가 해결되면 전체 suite를 실행한다. 실제 모델 호출·자기 로그인 탭 실행을 테스트 대역으로 대체해 통과 처리하지 않는다. 합성 fixture와 임시 DB는 테스트가 정리하며 실제 데모 정리 명령을 실행하지 않는다.
