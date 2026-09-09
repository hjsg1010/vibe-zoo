# Build Instructions — U-01

환경·키/계정·TLS·Extension 설치는 [README](../../../README.md)의 설치·설정 절차를 따른다. 기존 `.env`를 예시로 덮어쓰지 않는다. Node 24.20.x와 npm, 데모 setup/TLS 검사에는 OpenSSL을 사용한다. 패키지 버전은 `package-lock.json`이 기준이다. 추가 서버·컨테이너나 운영 사양은 요구하지 않는다.

저장소 루트에서 실행한다.

```sh
npm ci
npm run typecheck
npm run lint
npm run build
npm run check:public
```

`npm ci`는 해당 작업 디렉터리의 의존성을 설치한다. 실행 중인 데모를 보존하려면 별도 깨끗한 작업 디렉터리에서 검사한다. 비공개 `.env`·`.local`·DB·기존 `dist`는 빌드/합성 검사에 필요하지 않다. Backend·Extension·Store 세 출력의 `Built` 메시지와 종료 코드 0을 확인한다. 산출물은 `dist/backend/main.js` 및 migrations, `dist/extension/manifest.json`과 스크립트/Panel, `dist/store/index.html`과 bundle이다. 실제 설치용 Extension의 안정된 ID는 원래 환경에서 `demo:setup` 후 build해야 한다.

의존성 오류는 Node 버전·lockfile·registry 접근을 확인한다. 오프라인 캐시가 없는 새 환경에서 `--offline`을 사용하지 않는다. 컴파일 오류는 출력된 원본 파일에서 수정하고 관련 검사 후 다시 빌드한다. 앱의 연결/TLS 오류와 빌드 성공은 별개이며 문제 해결은 README를 참조한다.

이번 별도 재현 검사는 로컬 npm 캐시를 사용한 `npm ci --offline --no-audit --no-fund`까지 통과했다. 인터넷에서 빈 캐시로 설치하는 실험이나 원격 CI 성공을 주장하지 않는다. 측정 결과는 [단계 요약](build-and-test-summary.md)에만 기록한다.
