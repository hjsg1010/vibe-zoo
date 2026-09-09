# Vibe Zoo Live Demo

평가자가 설치·로그인·키·서버 없이 체험하는 독립 정적 웹앱입니다. 실제 Backend·Bedrock·MCP를 호출하지 않습니다. Discover, 시험 실행, 채팅, Record와 개인 Skill은 브라우저 메모리의 합성 상태로 연결됩니다. 실제 Extension 증거는 `evidence.html`에서 구분해 제공합니다.

로컬: `python3 -m http.server 18762 --directory reference/demo` 후 localhost:18762에 접속합니다.

MinIO 권장 순서: Discover → 도구 구성 보기 → 새 이름으로 시험 실행 → 채팅으로 다른 버킷 생성 → Record 시작 → 웹앱의 Create Bucket에서 직접 생성 → Record 종료 → 의도 입력 → 개인 Skill 생성 → 다른 이름으로 재사용. 추가 체험은 버킷별 모니터링과 Access Key 발급·명시적 삭제입니다.

가이드의 강조 대상은 실제 버튼과 입력 폼입니다. 이전 단계는 해당 시점의 합성 상태를 복원하며, 안내 건너뛰기·자유 탐색·가이드 재개·처음부터 다시 체험을 지원합니다. 초기화는 Live Demo의 메모리만 지웁니다. 실제 자산·데이터에 접근하지 않습니다.

반도체 체험은 실제 제공된 WaferSight의 대시보드, 파라미터·제품·설비 선택, 관리도와 OOC/OOS 알람을 참고합니다. 모든 수치·제품·설비 데이터는 독립 합성 데이터이며 실측이 아닙니다.

GitHub Actions **Deploy guided experience**를 수동 실행하면 `reference/demo`만 Pages에 배포합니다. 워크플로우에서 기존 공개 스크린샷을 배포용 `evidence/`에 복사합니다. `.env`, `.local`, Backend와 계정은 포함하지 않습니다. 영상은 아직 공개 파일·링크가 없습니다.

실제 Extension의 새 사이트 모델 전송 범위, 참여자별 계정 구분, 다중 도구 Discover 확장은 후속 작업으로 남아 있습니다. Live Demo의 기능 범위를 실제 Extension 검증 완료로 해석하지 않습니다.
