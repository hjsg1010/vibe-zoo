# 워크숍 가이드와 Vibe Zoo 시작 방식

[AI-DLC 1Day Workshop](https://ai-dlc-aws-ds.notion.site/AI-DLC-1Day-Workshop-f75599edf4fa839a9f03019d649c0511)의 공개 본문과 지연 로딩 코드 블록을 2026-09-08에 확인했다.

## 적용한 설치 순서

가이드 Module 2의 Step 1~3은 작업 디렉터리/Git 준비, v1.0.1 규칙 설치, 요구사항과 제약사항 준비다.

| 가이드 단계 | Vibe Zoo 적용 |
|---|---|
| 작업 디렉터리와 Git 준비 | 새 `vibe-zoo` 공개 저장소 |
| v1.0.1 설치 | 이미 보유한 압축파일에서 `CLAUDE.md`와 `.aidlc-rule-details/` 설치 |
| 요구사항 준비 | `requirements/vibe-zoo-requirements.md`, `requirements/constraints.md` 작성 |

워크숍의 서비스는 샘플이다. 이 저장소는 승인된 Vibe Zoo 요구사항을 사용하며 개발 도구는 Claude Code 대신 **Codex · gpt-6-astra · ultra**로 실행한다.

## 새 세션에서 이어갈 단계

Module 3은 요구사항 파일을 읽고 Inception을 시작한 뒤 역할을 나누고 질문 파일에 답하는 흐름을 안내한다. 여기서는 [시작 입력](ai-dlc-kickoff.md)을 새 Codex 세션에 전달한다.

팀 역할·유닛은 실제 설계를 바탕으로 정한다. 질문 파일과 단계별 진행은 설치된 v1.0.1 규칙을 따르며, 참고 가이드의 예시를 제품 요구나 사전 승인으로 처리하지 않는다.
