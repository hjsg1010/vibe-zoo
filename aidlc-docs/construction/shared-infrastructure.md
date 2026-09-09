# Vibe Zoo — Shared Demo Infrastructure

**상태**: 2026-09-09T01:37:45Z Infrastructure Design 사용자 승인 완료. 현재 WSL에서 구현/시연을 우선하며 외부 서비스 접속 경로 설정은 사용자 지시로 보류했다. 공유 인프라는 U-01의 Backend·SQLite·모델 설정 한 벌을 뜻한다. 자원 배치는 [유닛 설계](vibe-zoo-mvp/infrastructure-design/infrastructure-design.md), 실행 순서는 [배포 구조](vibe-zoo-mvp/infrastructure-design/deployment-architecture.md)를 참조한다.

| 자원 / 담당 역할 | 공통 소유·수명 |
|---|---|
| 개발자 — WSL 앱 프로세스 | 데모 시작/종료와 비공개 설정 준비를 담당한다. 참여자는 자기 Chrome의 Extension과 Store를 사용하며 별도 Backend·CLI·하네스를 실행하지 않는다. |
| C-03 / C-06 — SQLite | 같은 서버 파일과 짧은 트랜잭션을 공유한다. owner·Job·버전 검사는 [승인 NFR 패턴](vibe-zoo-mvp/nfr-design/nfr-design-patterns.md)을 따르며 사용자별 서버나 DB를 만들지 않는다. 빌드/프로세스 재시작은 데이터를 삭제하지 않는다. |
| 개발자 — 모델/로컬 TLS 설정 | 루트 .env의 모델 변수와 Git 제외 파일의 인증서/키 경로로 주입한다. 키·인증서 개인키·참여자 자격을 로그·Extension·Store·공유 자산·Git에 복사하지 않는다. |
| C-03 — 참여자 접근 | 데모용 Actor 자격을 발급·폐기하고 같은 Backend에서 개인 자료를 구분한다. localhost 접속이나 프록시 헤더가 다른 Actor·브라우저 권한을 부여하지 않는다. |
| 개발자 — 보존/정리 | 개인 자료·Record·명시 공유본의 수명은 [승인 NFR 보존 표](vibe-zoo-mvp/nfr-requirements/nfr-requirements.md#보존과-삭제의-초기-제안)를 한 번만 정의한다. 정리는 소유 범위를 확인한 명시적 명령으로 수행하며 demo 시작/재시작에 전체 DB를 초기화하지 않는다. |

공유 Store의 게시·설치와 사용자별 검증은 로컬 데모에서도 구현 대상이다. 서로 다른 Actor·로그인된 브라우저 문맥의 검증과 원격 여러 기기의 접속 성공은 구분한다. 기존 MinIO·다른 개발 서버의 데이터/설정은 Vibe Zoo의 초기화·정리 대상이 아니다.

이번 설계는 새로운 클라우드 자원·공용 DNS·Tailscale Serve/Funnel·방화벽 변경·백그라운드 운영 서비스 등록을 요구하지 않는다. 이후 외부 접속이 필요해지면 진입점 설정을 별도로 검토하며, 현재 로컬 데모 구현을 그 확인에 종속시키지 않는다.
