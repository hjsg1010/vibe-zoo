# Vibe Zoo Keeper 0.2.0

현재 사이트의 여러 MCP 도구를 Discover하고, 검증한 도구를 별도 Skill로 재사용합니다. MinIO 전용 모델 전송 제한을 제거했습니다. 기존 자산을 보존하며 추가 탐색할 수 있고, 전체 후보와 실제 사용 가능한 도구를 구분합니다.

실제 YMS 결과: 후보 11개(8개 + 추가 3개), 도구 4개와 기본 Skill 2개 실제 MCP·Extension 검증 통과. YMS 개인 Skill은 녹화된 입력 근거 부족으로 차단되어 미완료입니다. 모든 후보나 모든 사이트 기능의 성공을 의미하지 않습니다. 실제 결과·대역 검사·시뮬레이션은 [검증 기록](https://github.com/hjsg1010/vibe-zoo/blob/main/docs/yms-discovery-0.2.md)에서 구분합니다.

92개 검사, 타입·린트·Backend/Extension/Store 빌드와 공개 파일 검사 통과. 기존 MinIO·Store·개인 자산과 검증 기록을 보존합니다.

## 설치

1. `vibe-zoo-keeper-v0.2.0.zip`을 다운로드해 압축을 풉니다. 자동 생성 Source code ZIP과 구분해주세요.
2. Chrome `chrome://extensions`에서 개발자 모드 → **압축해제된 확장 프로그램을 로드** → `manifest.json`이 있는 폴더를 선택합니다.
3. Backend 주소와 본인의 접근 코드로 연결합니다. 먼저 Backend의 `/health`에서 인증서 신뢰와 응답을 확인하세요.
4. 기존 설치는 새 파일로 교체하고 확장 프로그램을 새로고침한 뒤 대상 탭을 다시 연결합니다.

Backend는 이 태그 소스에서 `npm ci` → `.env` 설정 → `npm run demo:setup` → `npm run build` → `npm run demo` 순서로 실행합니다. Node 24.20.x, npm, OpenSSL, Bedrock API 키와 관찰할 웹앱이 필요합니다. 키·계정·DB는 배포에 포함하지 않습니다.

기존 Backend도 setup을 다시 실행하면 Release Extension ID를 허용합니다. 로컬 ID·자산·데이터는 보존됩니다. `VIBE_ZOO_ALLOWED_EXTENSION_IDS`를 직접 지정했다면 `INSTALL.txt`의 공개 ID를 추가해주세요. 폐기된 `VIBE_ZOO_SYNTHETIC_DEMO_ORIGIN`은 남아 있어도 사이트를 제한하지 않습니다.

[설치 없는 Live Demo](https://hjsg1010.github.io/vibe-zoo/)는 별도의 합성 시뮬레이션입니다. [실제 Extension 증거](https://hjsg1010.github.io/vibe-zoo/evidence.html)와 구분합니다.
