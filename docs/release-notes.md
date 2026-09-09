Keeper Extension 설치용 ZIP입니다. GitHub 자동 생성 Source code ZIP과 구분해주세요.

1. `vibe-zoo-keeper-*.zip`을 다운로드하고 압축을 풉니다.
2. Chrome의 `chrome://extensions`에서 개발자 모드를 켭니다.
3. **압축해제된 확장 프로그램을 로드** → `manifest.json`이 있는 폴더를 선택합니다.
4. Backend 운영자가 제공한 주소와 개인 접근 코드로 연결합니다. 인증서의 `/health` 확인이 먼저 필요합니다.

Backend는 같은 태그의 소스에서 `npm ci` → `.env` 설정 → `npm run demo:setup` → `npm run build` → `npm run demo`로 실행합니다. Node 24.20.x, npm, OpenSSL, Bedrock API 키와 합성 MinIO 환경이 필요합니다. 키나 계정은 배포 파일에 포함하지 않습니다.

기존 Backend도 `demo:setup`을 다시 실행하면 Release Extension ID를 추가 허용합니다. 기존 로컬 ID·자산·데이터는 보존됩니다. `VIBE_ZOO_ALLOWED_EXTENSION_IDS`를 직접 지정했다면 `INSTALL.txt`의 공개 ID도 추가해주세요.

버전 내용: Discover 다음 행동 안내, 지난 작업 접기, 도구·Skill 구성 상세 보기. 실제 모델·브라우저 기능 검증의 범위와 제한은 README를 참고하세요. 새 사이트 지원 확대는 아직 포함하지 않습니다.

설치 없는 평가자 체험: https://hjsg1010.github.io/vibe-zoo/ — 별도의 합성 Live Demo입니다.
