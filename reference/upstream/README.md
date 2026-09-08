# AWS AI-DLC v1.0.1 설치 출처

- Upstream: [awslabs/aidlc-workflows v1.0.1](https://github.com/awslabs/aidlc-workflows/tree/v1.0.1)
- 설치 입력: 사용자가 보유한 `ai-dlc-rules-v1.0.1.zip`
- 압축파일 내부 VERSION: `1.0.1`
- 압축파일 SHA-256: `ac0601544b6c7ba41b541a7a96259d6ea3995ea0b94b2a58a333ae7898e22b39`
- 설치일: 2026-09-08
- [Upstream 라이선스](../../third-party/aidlc-workflows-LICENSE)

## 설치 매핑

| 압축파일 내부 경로 | 설치 경로 |
|---|---|
| `aidlc-rules/aws-aidlc-rules/core-workflow.md` | `CLAUDE.md` |
| `aidlc-rules/aws-aidlc-rule-details/**` | `.aidlc-rule-details/**` |
| `aidlc-rules/VERSION` | `reference/upstream/VERSION` |

핵심 워크플로우 1개와 규칙 상세 31개는 원본 바이트를 보존한다. 개발 도구가 Codex여도 `AGENTS.md`에서 `CLAUDE.md`를 읽도록 연결하므로 원본 워크플로우를 수정하지 않는다.

`ai-dlc-rules-v1.0.1.sha256`은 설치 검증에 사용하는 원본 파일별 체크섬이다. 압축파일을 다시 다운로드하지 않고도 루트에서 다음 명령으로 검증할 수 있다.

```sh
python3 scripts/verify-aidlc.py
```

라이선스는 동일 upstream 태그의 `LICENSE`를 보존한 것이다. 프로젝트 보완 지침은 upstream 상세 규칙 디렉터리 밖에 둔다.
