# Vibe Zoo — developer workflow poster

- [Download PNG](vibe-zoo-process-developer.png)
- Based on the user-provided process poster and supplied product design summary.
- Describes the product design, not a claim that all sites or the Live Demo implement every validation.
- Built-in imagegen edit; compact heading, nine process sections, shared execution pipeline.
- Original artwork preserved separately. New filename used for this revision.

## Generation prompt

Use case: precise-object-edit. Redesign the supplied Vibe Zoo process poster as a polished Korean DEVELOPER-ORIENTED technical workflow infographic. This is one complete finished poster, not an animation. Use the reference as visual identity: ivory/cream paper, deep forest green type, mint/teal accents, rounded white cards, restrained forest foliage, a small cute 3D fox and owl. Keep those mascots but shrink them dramatically to small corner accents, NEVER overlapping text. Remove the gigantic slogan and huge illustrations; devote 80% of area to readable technical content. Landscape 16:9, highest available resolution, ideally 3072x1728 or 3840x2160. Crisp expertly typeset Korean, no nonsense letters. Text accuracy is paramount. No extra invented facts. Clearly describe product DESIGN, not claim all sites are verified.

LAYOUT: compact header at most 10% of page with small VIBE ZOO logo on left and title "개발자 관점의 동작 흐름", small tag "제품 설계 기준". Under header a slim preconditions strip. Main area: clean aligned 3 columns × 3 rows of content cards, read left-to-right row by row, numbered 01–09 with modest colored circles. Each card uses a bold concise Korean title, small component label, and the exact concise body specified below; illustrations should be tiny functional icons taking less than 12% of each card, not giant pictures. Clear hierarchy, spacious line height, balanced padding. Do NOT turn the cards into images of a webpage. Each numbered card is a process section. Indicate 01→02→03→04 as initial preparation and show small "준비된 자산은 생성 생략" branch label in 01. This is NOT nine mandatory serial steps: cards 06–09 are subsequent optional capabilities after ready/execution. The card numbering and optional badges make this clear. Use small "선택" badge on cards 06,07,08,09. Bottom 12–15%: full-width common execution pipeline strip, then two concise footnote lines. Keep all supplied content legible.

HEADER PRECONDITIONS (exact Korean):
"로그인한 사용자 탭에서 시작 · 별도 CLI·실행환경 선택 없음"
"Native WebMCP 없이도 페이지 관찰로 생성 · WebMCP 등록은 선택"

CARD 01 title "진입 · 기존 자산 확인"
component label "Keeper · Preset"
body lines:
"현재 URL·사이트 인식 → 사용자·사이트 호환 자산 조회"
"준비됨: 도구·기본 Skill 표시 → 생성 생략"
"공유 자산만 있음: 08 설치 경로"
"자산 없음: 생성 Job 시작 → 02"

CARD 02 title "페이지 관찰"
component label "Browser Bridge → Backend"
body:
"현재 탭의 DOM·접근성 정보 관찰"
"도구 생성에 필요한 근거만 Backend로 전달"
"실행 대상은 요청한 사용자의 로그인된 탭"

CARD 03 title "도구 + 기본 Skill 생성"
component label "MCP Generator · AI Agent · Bedrock Opus"
body:
"페이지 관찰 근거로 가능한 도구 후보 파악"
Make four compact labeled output chips:
"도구 정의(계약)" "실행 어댑터" "성공 판정(validator)" "기본 Skill"
Highlight note:
"계약 JSON만 생성한 상태는 미검증"

CARD 04 title "실제 검증 → 활성화"
component label "MCP → 사용자 탭 → Validator"
body:
"관찰과 다른 유효 입력으로 실제 MCP 호출"
"사용자 탭 실행 → 사후 상태 관찰 → 성공 판정"
"통과한 기능만 활성화 · 부분 준비 구분"

CARD 05 title "채팅으로 업무 실행"
component label "S-02 · Keeper Agent"
body:
"자연어 해석 → 입력 확정(부족하면 질문)"
"변경이면 확인 → MCP 호출 → 탭 실행"
"사후 관찰 → 완료 / 부분 / 미확인 응답"

CARD 06 title "시연 학습 → 개인 Skill"
component label "S-03 · Skill Compiler"
body:
"Record → 직접 시연 → Stop → 명시적 의도 입력"
"절차·변수·성공조건 초안 생성"
"시연과 다른 입력으로 검증 → 저장·활성화"

CARD 07 title "개인 설정"
component label "S-04 · Personal Settings"
body:
"이름·기본값·on/off 편집 → 저장"
"변경한 설정은 다음 채팅 실행에 반영"

CARD 08 title "선택 공유 · 설치"
component label "S-05 · Store"
body:
"특정 버전만 게시 · 개인 기록·인증정보 제외"
"다른 사용자 설치 → 설치자 본인 탭에서 재검증"
"재검증을 통과해야 사용 가능"

CARD 09 title "실패 기반 개선"
component label "S-06 · Improvement"
body:
"재현된 실패 + 관련 성공 사례 → 개선 후보"
"실패 해결 + 성공 사례 회귀: 둘 다 실제 검증"
"모두 통과 → 사용자 명시 적용 · 이전 버전 복구"

BOTTOM COMMON PIPELINE heading "모든 단계의 공통 실행 원칙"
pipeline exact:
"접수 → 계획 고정 → 동작 준비(변경 시 확인) → 실제 실행 → 사후 관찰 → 결과 반영"
safety line:
"취소·로그인 만료·탭 이동·미확인 결과는 자동 성공 처리하지 않고 재확인"

FOOTNOTE:
"MVP 실제 전체 흐름 검증 기준: MinIO Console"
"다른 미등록 사이트도 같은 추출 요청 경로 · 요청 가능 ≠ 실제 추출 성공"

Do not add long marketing slogans, huge characters, source file paths, fake metrics, or service provider logos. Preserve readable hierarchy and accurate Korean wording. Clean premium forest/zoo brand aesthetic, technical clarity rather than a children's comic. Small teal arrows and concise highlight pills, predominantly text and clear structural icons.

