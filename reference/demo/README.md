# Vibe Zoo Live Demo

평가자가 설치·로그인·키·서버 없이 체험하는 독립 정적 웹앱입니다. 실제 Backend·Bedrock·MCP를 호출하지 않습니다. Discover, 시험 실행, 채팅, Record와 개인 Skill은 브라우저 메모리의 합성 상태로 연결됩니다. 실제 Extension 증거는 `evidence.html`에서 구분해 제공합니다.

로컬: `python3 -m http.server 18762 --directory reference/demo` 후 localhost:18762에 접속합니다.

MinIO 권장 순서: Discover → 도구 구성 보기 → 새 이름으로 시험 실행 → 채팅으로 다른 버킷 생성 → Record 시작 → 웹앱의 Create Bucket에서 직접 생성 → Record 종료 → 의도 입력 → 개인 Skill 생성 → 다른 이름으로 재사용. 추가 체험은 버킷별 모니터링과 Access Key 발급·명시적 삭제입니다.

가이드의 강조 대상은 실제 버튼과 입력 폼입니다. 이전 단계는 해당 시점의 합성 상태를 복원하며, 안내 건너뛰기·자유 탐색·가이드 재개·처음부터 다시 체험을 지원합니다. 초기화는 Live Demo의 메모리만 지웁니다. 실제 자산·데이터에 접근하지 않습니다.

WaferSight 권장 순서: Discover → 구성 보기 → DEMO-A / ETCH-01 시험 → 채팅으로 DEMO-B / ETCH-02 조회 → Record → 웹앱에서 제품 변경 → 종료·의도 입력 → Skill 생성 → DEMO-C 등 다른 조건으로 재사용. 추가로 I-MR/부분군 평균 표현과 웨이퍼맵을 탐색할 수 있습니다. 표본·Cpk는 합성 데이터에서 계산하며 관리도 전체 기능을 재현하지 않습니다.

반도체 체험은 실제 제공된 WaferSight의 대시보드, 파라미터·제품·설비 선택, 관리도와 OOC/OOS 알람을 참고합니다. 모든 수치·제품·설비 데이터는 독립 합성 데이터이며 실측이 아닙니다.

GitHub Actions **Deploy guided experience**를 수동 실행하면 `reference/demo`만 Pages에 배포합니다. 워크플로우에서 기존 공개 스크린샷을 배포용 `evidence/`에 복사합니다. `.env`, `.local`, Backend와 계정은 포함하지 않습니다. 영상은 아직 공개 파일·링크가 없습니다.

실제 Extension의 새 사이트 모델 전송 범위, 참여자별 계정 구분, 다중 도구 Discover 확장은 후속 작업으로 남아 있습니다. Live Demo의 기능 범위를 실제 Extension 검증 완료로 해석하지 않습니다.

## 공개 배포 검증

2026-09-09, 공개 주소 https://hjsg1010.github.io/vibe-zoo/ 를 Orca 내장 브라우저에서 직접 열어 두 체험의 최초 진입, 도구 시험 입력, 채팅 결과 변화, Record·의도·다른 입력의 Skill 실행, 자유 탐색, 초기화를 확인했습니다(14개 확인 항목). 테스트는 DOM의 실제 버튼 클릭·폼 제출·선택 변경을 사용했고 상태 객체를 주입하지 않았습니다. 838px 너비 화면을 육안 확인했으며 가이드와 시험 폼의 위치가 겹치지 않고 조작 영역이 뷰포트 안에 있음을 확인했습니다. 실제 Extension 스크린샷 4개와 증거 페이지의 공개 응답도 확인했습니다. 이는 Live Demo 검증이며 실제 모델·브라우저 자동화 성공으로 계산하지 않습니다.
