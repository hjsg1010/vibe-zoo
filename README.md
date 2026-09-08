# Vibe Zoo

**Teach your web. Work through chat.**

Vibe Zoo는 사용자가 지금 보고 있는 웹앱의 기능을 배우고, 사용자가 가르친 업무를 같은 화면에서 대화로 수행하는 브라우저 Extension이다.

사이트에 사전 제작 MCP나 WebMCP가 없어도 시작한다. Extension이 사용할 자산을 찾고, 없으면 Backend 생성기가 사용자의 현재 브라우저를 관찰해 실행 가능한 도구와 기본 Skill을 만든다. 개인 업무는 Record와 의도 입력으로 가르치고 Side Panel의 내 Skill에서 관리한다. 공유 Store는 이 경험을 확장하는 보조 공간이다.

## 현재 상태

제품 경험과 MVP 입력 요구사항을 확정하고 **AWS AI-DLC v1.0.1**을 시작할 수 있도록 준비한 새 저장소다. 실제 제품은 아직 구현하지 않았다. Backend 기술·배포 방식은 AI-DLC 설계에서 결정한다.

| 자료 | 내용 |
|---|---|
| [요구사항](requirements/vibe-zoo-requirements.md) | 확정된 경험, 기능, 수용조건, Zoo 콘셉트 |
| [제약사항](requirements/constraints.md) | 개발 방식, 실행 경계, 검증, 미정 기술 |
| [사용자 경험 시안](prototypes/vibe-zoo-experience/index.html) | 채팅·생성·Record·내 Skill·Store의 클릭 가능한 모의 화면 |
| [시스템 구조 시안](prototypes/vibe-zoo-experience/architecture.html) | 생성·실행·학습 경로와 논리 역할 |
| [기술검증 요약](docs/technical-findings.md) | 사전 관찰의 의미와 아직 검증하지 않은 부분 |
| [새 세션 시작 문구](docs/ai-dlc-kickoff.md) | Codex에 전달할 AI-DLC 시작 입력 |

HTML은 파일을 브라우저로 열어 볼 수 있으며 설치된 Extension이나 실제 Agent의 실행 결과가 아니다. 입력한 예시 URL로 실제 접속하지 않는다.

## AI-DLC 시작

개발 도구는 **Codex**, 모델은 **gpt-6-astra**, 추론 수준은 **ultra**다.

```sh
codex --model gpt-6-astra -c 'model_reasoning_effort="ultra"'
```

새 세션에 다음 요청을 전달한다.

> Vibe Zoo 서비스를 구축하고 싶습니다. `requirements/vibe-zoo-requirements.md`와 `requirements/constraints.md`에서 확정된 요구사항을 읽어주세요. `AGENTS.md`에 따라 `CLAUDE.md`와 `.aidlc-rule-details/`의 AWS AI-DLC v1.0.1을 읽고 AI-DLC 워크플로우를 시작해봅시다.

전체 인계 문구는 [ai-dlc-kickoff.md](docs/ai-dlc-kickoff.md)에 있다. 워크플로우 산출물은 `aidlc-docs/`에 생성한다.

## 규칙 출처 확인

사용자가 보유한 `ai-dlc-rules-v1.0.1.zip`에서 규칙을 설치했다. `CLAUDE.md`와 `.aidlc-rule-details/`의 31개 파일은 제공된 v1.0.1 원본과 동일하다.

```sh
python3 scripts/verify-aidlc.py
```

출처와 설치 매핑은 [규칙 설치 기록](reference/upstream/README.md), upstream 라이선스는 [third-party/aidlc-workflows-LICENSE](third-party/aidlc-workflows-LICENSE)에 있다.
