# 새 Codex 세션 시작 입력

실행 모델은 **gpt-6-astra**, 추론 수준은 **ultra**로 설정한다. 아래 문구는 확정 입력을 새 워크플로우에 전달하는 시작 요청이다.

---

Vibe Zoo 서비스를 구축하고 싶습니다. 다음 파일들에서 확정된 요구사항과 제약사항을 읽어주세요:

- requirements/vibe-zoo-requirements.md
- requirements/constraints.md

AGENTS.md에 따라 CLAUDE.md, .aidlc-rule-details/, docs/team-rules.md를 읽고 AWS AI-DLC v1.0.1 워크플로우를 시작해봅시다.

우리는 OpenAI Codex, gpt-6-astra, ultra로 개발합니다. 이 선택은 개발 에이전트에 대한 것이며 제품 Backend의 모델·엔진·하네스·서버 구조는 아직 확정하지 않았습니다.

핵심은 사용자가 현재 웹앱에서 Extension을 여는 경험입니다. 호환되는 preset이 없으면 Backend MCP 생성기가 사용자의 현재 브라우저를 통해 실행 가능한 도구와 기본 Skill을 만들고, 같은 Side Panel의 채팅에서 사용합니다. Record와 사용자 의도로 개인 Skill을 만들고, 개인 설정에서 편집·재사용합니다. Store 공유는 보조 기능입니다.

제품 경험과 MVP 범위는 사용자가 승인했습니다. 이 방향을 반복해서 재질문하지 말고, 남은 기술 선택과 앞으로 생성할 단계별 산출물은 구분해서 AI-DLC 절차를 진행해주세요. 규칙상 필요한 질문·opt-in·승인을 미리 승인된 것으로 처리하지 마세요.

다음 두 파일은 승인된 기능 검토용 HTML 시안입니다:

- prototypes/vibe-zoo-experience/index.html
- prototypes/vibe-zoo-experience/architecture.html

현재 저장소는 규칙·요구사항·모의 시안으로 준비된 새 제품 프로젝트입니다. 시안을 실제 Extension/MCP/Agent 구현으로 간주하지 마세요. docs/technical-findings.md의 사전 관찰도 자동 생성 플랫폼 완성의 증거는 아닙니다.

먼저 초기 사용자 요청을 기록하고 워크스페이스를 확인한 뒤 요구사항 분석부터 진행해주세요. aidlc-docs/의 새 상태·감사 기록과 이후 질문·산출물은 v1.0.1 방식으로 관리해주세요. 공개 저장소에는 인증 정보나 사내 환경·원본 업무 기록을 포함하지 마세요.
