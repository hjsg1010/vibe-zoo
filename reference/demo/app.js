/* Standalone Live Demo. All state and business data are synthetic and local. */
(() => {
  const root = document.getElementById("app");
  const esc = (value) =>
    String(value).replace(
      /[&<>"']/g,
      (char) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[char],
    );
  const initial = (site) => ({
    site,
    stage: 0,
    guided: true,
    panelOpen: false,
    entryStarted: false,
    expandedTools: {},
    skills: [],
    nextSkillId: 1,
    expandedSkills: {},
    skillName: "",
    tabTip: null,
    seenTabs: ["chat"],
    tab: "chat",
    page: "buckets",
    discovered: false,
    ready: false,
    detail: false,
    recording: false,
    actions: [],
    recorded: [],
    skill: null,
    intent: "",
    buckets: [
      { name: "research-data", objects: 24, size: 128 },
      { name: "model-artifacts", objects: 8, size: 64 },
      { name: "team-reports", objects: 12, size: 32 },
    ],
    mailQuery: "",
    mailSender: "",
    mailToolResults: {},
    webFeedback: null,
    mailDraft: "",
    mailFolder: "inbox",
    mailStars: [],
    openedMail: null,
    keys: [],
    keyDraft: "",
    trialFilter: { product: "DEMO-A", tool: "ETCH-01" },
    reuseFilter: { product: "DEMO-C", tool: "ETCH-01" },
    selected: "research-data",
    messages: [],
    error: "",
    notice: "",
    validating: false,
    busy: false,
    discoveryProgress: 0,
    newBucket: "",
    trial: "keeper-trial",
    chatDraft: "launch-assets 버킷을 만들어줘",
    reuse: "next-project",
    filter: { product: "전체 제품", tool: "전체 설비" },
    parameter: "CD Line Width (nm)",
    chart: "I-MR",
    result: null,
  });
  let s = null,
    checkpoints = [],
    timer;
  const minioSteps = [
    [
      "MinIO는 파일을 모아두는 보관소예요",
      "버킷은 파일을 담는 보관함이에요. Keeper에게 새 보관함 만들기를 맡겨볼까요? Discover를 눌러 이 화면에서 할 수 있는 일을 찾아보세요.",
      "#discover",
      "Discover는 화면을 살펴보는 과정이에요. Keeper가 배운 작업이 ‘도구’ 후보로 나타납니다.",
    ],
    [
      "‘도구’는 Keeper가 대신할 수 있는 일이에요",
      "‘버킷 생성’은 새 파일 보관함을 만드는 일이에요. ‘구성 확인’을 눌러 무엇을 입력하고 어떤 순서로 실행하는지 살펴보세요.",
      "#tool-detail",
      "도구가 무엇을 하는지 이해한 뒤 시험합니다.",
    ],
    [
      "시험 실행은 작은 리허설이에요",
      "후보는 아직 한 번도 시험하지 않은 작업이에요. 새 보관함 이름을 입력하고 시험하면 왼쪽 목록에 같은 이름이 생깁니다.",
      "#validate-form",
      "왼쪽 목록에 같은 이름이 생기면 준비 완료입니다.",
    ],
    [
      "‘대화’에서는 원하는 일을 말해요",
      "이제 버튼을 직접 찾지 않아도 돼요. ‘launch-assets 버킷을 만들어줘’에서 이름을 바꿔 보내보세요. Keeper가 준비된 도구로 보관함을 만듭니다.",
      "#chat-form",
      "입력한 이름이 채팅과 버킷 목록에 함께 나타납니다.",
    ],
    [
      "‘가르치기’에서는 내 작업 방식을 보여줘요",
      "Record는 클릭과 입력 순서를 기록하는 기능이에요. 시작을 누른 뒤 왼쪽 웹앱에서 보관함을 하나 직접 만들어주세요.",
      "#record-start",
      "웹앱에서 한 행동과 바뀌는 입력을 배웁니다.",
    ],
    [
      "내가 하는 작업을 Keeper가 보고 있어요",
      "Create Bucket은 ‘새 보관함 만들기’예요. 버튼을 누르고 새 이름을 입력해 만들어보세요. 이 행동이 Record에 남습니다.",
      "#web-action",
      "내가 직접 수행한 버킷 생성이 기록됩니다.",
    ],
    [
      "시연을 마쳤다면 Record 종료",
      "아래 기록에 생성한 버킷이 보입니다. 종료해서 업무 의도를 알려주세요.",
      "#record-stop",
      "이름만 바꿔 반복할 수 있는 흐름으로 정리합니다.",
    ],
    [
      "녹화에 설명을 더하면 더 잘 배워요",
      "녹화에서 정리한 설명을 확인하고 필요한 내용을 덧붙여주세요.",
      "#intent-form",
      "도구 순서와 바뀔 입력이 Skill에 연결됩니다.",
    ],
    [
      "Skill은 내 작업을 다시 쓰는 방법이에요",
      "도구가 한 가지 일이라면 Skill은 내가 보여준 순서와 의도를 묶은 작업 방식이에요. 새 이름으로 실행해 같은 일을 다시 해보세요.",
      "#reuse-form",
      "새 버킷·Skill 입력·채팅 결과가 같은 값을 가리킵니다.",
    ],
    [
      "내 업무를 배우는 Keeper",
      "Discover부터 개인 Skill 재사용까지 완료했어요. 버킷 모니터링·키 관리도 자유롭게 둘러보세요.",
      ".keeper-brand",
      "오른쪽의 ‘다른 웹앱’을 선택해 새 환경도 체험할 수 있어요.",
    ],
  ];
  const waferSteps = [
    [
      "WaferSight는 반도체 측정 결과를 보는 곳이에요",
      "웨이퍼는 반도체를 만드는 얇은 원판이에요. 여기서는 회로 선의 폭을 측정한 결과를 봅니다. Discover로 조건 조회를 Keeper에게 가르쳐볼까요?",
      "#discover",
      "제품·설비 조건과 결과 확인을 연결합니다.",
    ],
    [
      "‘도구’는 Keeper가 대신할 수 있는 일이에요",
      "‘계측 조건 조회’는 제품·설비를 골라 측정 결과를 찾는 일이에요. 구성 확인을 눌러 어떤 조건을 입력하고 무엇을 확인하는지 보세요.",
      "#tool-detail",
      "파라미터·제품·설비와 계측 결과가 연결됩니다.",
    ],
    [
      "시험 실행으로 조건과 결과를 맞춰봐요",
      "제품은 무엇을 만들었는지, 설비는 어느 장비를 썼는지예요. 하나씩 골라 시험하면 그 조건에 해당하는 측정값만 남습니다.",
      "#validate-form",
      "왼쪽 필터·트렌드·측정 건수가 함께 바뀝니다.",
    ],
    [
      "‘대화’에서는 원하는 조건을 말해요",
      "필터를 직접 바꾸는 대신 ‘DEMO-B, ETCH-02 조건으로 조회해줘’처럼 요청하세요. Keeper가 도구를 써서 표와 요약을 함께 바꿉니다.",
      "#chat-form",
      "같은 조회 결과가 대시보드와 채팅에 표시됩니다.",
    ],
    [
      "‘가르치기’에서는 내 조회 방식을 보여줘요",
      "Record는 클릭과 선택 순서를 기록해요. 시작한 뒤 왼쪽에서 제품이나 설비를 바꾸면 Keeper가 그 조회 방법을 배웁니다.",
      "#record-start",
      "제품·설비 선택 행동을 기록합니다.",
    ],
    [
      "웹앱에서 조건을 직접 바꾸세요",
      "왼쪽 제품이나 설비를 다른 값으로 선택하세요.",
      "#web-action",
      "조건을 바꾸면 조회 결과와 기록이 함께 갱신됩니다.",
    ],
    [
      "조회 시연을 마쳤나요?",
      "기록된 제품·설비를 확인하고 Record를 종료하세요.",
      "#record-stop",
      "반복할 조회의 입력과 순서를 정리합니다.",
    ],
    [
      "녹화 내용을 함께 다듬어볼까요?",
      "녹화한 조건을 바탕으로 설명을 적어뒀어요. 목적이나 예외를 덧붙이면 더 잘 배울 수 있어요.",
      "#intent-form",
      "조건 조회와 결과 확인을 개인 Skill로 만듭니다.",
    ],
    [
      "Skill로 같은 조회를 다른 조건에 써봐요",
      "Skill은 시연한 작업 순서와 설명을 묶은 나만의 방법이에요. 다른 제품·설비로 실행해도 그 조건에 맞는 결과를 가져옵니다.",
      "#reuse-form",
      "조건에 맞는 합성 결과가 양쪽 화면에서 일치합니다.",
    ],
    [
      "새 웹앱에서도, 내 업무 방식대로",
      "조건 조회를 나만의 Skill로 재사용했어요. 관리도와 웨이퍼맵도 자유롭게 둘러보세요.",
      ".keeper-brand",
      "다른 웹앱을 선택하면 MinIO 흐름도 바로 시작할 수 있어요.",
    ],
  ];
  const mailSteps = [
    [
      "익숙한 메일함부터 시작해볼까요?",
      "왼쪽은 합성 메일함이에요. ‘회의 메일 찾기’처럼 매번 하던 일을 Keeper에게 맡겨보세요. 먼저 Discover를 눌러주세요.",
      "#discover",
      "Discover는 화면을 살펴보고 Keeper가 대신할 작업을 찾는 과정이에요.",
    ],
    [
      "‘도구’는 Keeper가 대신할 수 있는 일이에요",
      "‘메일 찾기’는 검색어로 메일을 찾는 작업이에요. 구성 확인을 눌러 필요한 입력과 실행 순서를 살펴보세요.",
      "#tool-detail",
      "어떤 작업을 맡기는지 알고 시험할 수 있어요.",
    ],
    [
      "시험 실행은 작은 리허설이에요",
      "검색어 ‘회의’로 시험해보세요. 왼쪽에 회의 관련 메일만 남으면 이 도구를 쓸 준비가 된 거예요.",
      "#validate-form",
      "시험 입력과 실제 합성 메일 검색 결과가 일치합니다.",
    ],
    [
      "‘대화’에서는 원하는 일을 말해요",
      "‘견적 메일을 찾아줘’라고 보내보세요. 검색창을 직접 만지는 대신 Keeper가 찾아줍니다.",
      "#chat-form",
      "같은 메일 제목과 검색 건수가 메일함과 채팅에 나타나요.",
    ],
    [
      "‘가르치기’에서는 내 방법을 보여줘요",
      "Record는 클릭과 입력 순서를 기록해요. 시작한 뒤 왼쪽 검색창에서 평소처럼 메일을 찾아보세요.",
      "#record-start",
      "직접 보여준 작업을 내 Skill로 재사용할 수 있어요.",
    ],
    [
      "메일함에서 직접 검색해보세요",
      "왼쪽 검색창에 ‘출장’을 입력하고 검색을 눌러주세요. Keeper가 검색 순서와 입력을 기록합니다.",
      "#web-action",
      "출장 메일이 나타나고, Record에 내 검색 행동이 남습니다.",
    ],
    [
      "보여주기가 끝났다면 Record 종료",
      "기록된 검색어를 확인하고 종료하세요. 녹화한 내용을 바탕으로 설명 초안을 만들어드려요.",
      "#record-stop",
      "아무 설명도 처음부터 작성할 필요가 없어요.",
    ],
    [
      "설명을 더하면 더 잘 배워요",
      "녹화한 검색 내용을 정리해뒀어요. ‘제목을 먼저 확인해줘’처럼 목적이나 선호를 덧붙여 Skill을 만드세요.",
      "#intent-form",
      "Skill은 내가 보여준 작업 순서와 설명을 묶은 나만의 방법이에요.",
    ],
    [
      "다른 검색어로 다시 써보세요",
      "‘일정’처럼 다른 검색어로 Skill을 실행하세요. 한 번 보여준 검색을 새 입력에 그대로 활용합니다.",
      "#reuse-form",
      "새 검색어와 메일 목록, 채팅 결과가 함께 바뀝니다.",
    ],
    [
      "익숙한 일을, 더 간단하게",
      "메일 찾기를 내 Skill로 다시 사용했어요. 메일을 열거나 별표를 눌러 자유롭게 둘러보세요.",
      ".keeper-brand",
      "다른 웹앱에서 WaferSight, 마지막으로 MinIO도 체험할 수 있어요.",
    ],
  ];
  const steps = () =>
    s.site === "mail"
      ? mailSteps
      : s.site === "wafer"
        ? waferSteps
        : minioSteps;
  const remember = () => {
    checkpoints[s.stage] = structuredClone(s);
  };
  function advance(event) {
    const expected = [
      "discover",
      "detail",
      "validate",
      "chat",
      "record",
      "web",
      "stop",
      "skill",
      "reuse",
    ];
    if (event === expected[s.stage]) {
      s.tabTip = null;
      s.stage++;
      if ([4, 5, 6, 7, 8].includes(s.stage)) s.tab = "learn";
      if (s.stage === 3) s.tab = "chat";
      remember();
    }
  }
  function choose(site) {
    clearTimeout(timer);
    s = initial(site);
    if (site === "wafer") {
      s.page = "dashboard";
      s.chatDraft = "제품 DEMO-B, 설비 ETCH-02 조건으로 조회해줘";
    }
    if (site === "mail") {
      s.page = "inbox";
      s.trial = "회의";
      s.reuse = "일정";
      s.chatDraft = "견적 메일을 찾아줘";
    }
    checkpoints = [];
    remember();
    render();
  }
  function header() {
    return `<header class="topbar"><button class="brand" data-action="home"><span>🦁</span> vibe zoo <small>LIVE DEMO</small></button><div class="top-actions"><span class="simulation">인터랙티브 시뮬레이션</span><a href="evidence.html">실제 실행 증거 ↗</a>${s ? '<button class="quiet" data-action="home">다른 웹앱</button><button class="quiet" data-action="reset">처음부터</button>' : ""}</div></header>`;
  }
  function landing() {
    return `${header()}<main class="landing"><div class="eyebrow">THE WEB YOU KNOW. A NEW WAY TO WORK.</div><h1>웹은 그대로.<br><em>일하는 방식은 새롭게.</em></h1><p>쓰던 웹앱에서 말하고, 한 번 보여주고,<br>나만의 업무 Skill로 다시 해보세요.</p><div class="site-choices"><button class="site-choice recommended" data-site="mail"><span class="site-icon mail-icon">✉</span><div><small>START HERE · 가장 쉬운 체험</small><h2>메일</h2><p>Gmail처럼 익숙한 메일함.<br>원하는 메일을 말로 찾아보세요.</p><strong>약 2분 · 여기서 시작 →</strong></div></button><button class="site-choice" data-site="wafer"><span class="site-icon wafer-icon">Si</span><div><small>SEMICONDUCTOR METROLOGY</small><h2>WaferSight</h2><p>조건을 바꾸고,<br>계측 결과를 한눈에.</p><strong>약 3분 · 체험 시작 →</strong></div></button><button class="site-choice" data-site="minio"><span class="site-icon minio-icon">M</span><div><small>OBJECT STORAGE</small><h2>MinIO</h2><p>파일 보관함을 만들고,<br>프로젝트 준비를 Skill로.</p><strong>약 3분 · 체험 시작 →</strong></div></button></div><p class="landing-note">설치·계정·API 키 없이 바로 시작합니다.<br>모든 데이터와 실행은 브라우저 안의 합성 시뮬레이션입니다.</p><div class="zoo-art" aria-hidden="true">🌳 <span>🦒</span> 🌿</div></main>`;
  }
  const tabExplanations = {
    chat: [
      "대화 · 원하는 일을 말하는 곳",
      "Keeper에게 하고 싶은 일을 문장으로 요청하세요. 준비된 도구로 실행하고, 결과를 왼쪽 웹앱과 함께 보여줘요.",
    ],
    tools: [
      "도구 · Keeper에게 맡길 수 있는 일",
      "웹앱의 버튼과 입력 순서를 Keeper가 배운 작업 목록이에요. 각 작업의 구성과 필요한 입력을 살펴보고 시험한 뒤 사용할 수 있어요.",
    ],
    learn: [
      "가르치기 · 내 업무 방식을 배우는 곳",
      "Record로 클릭·입력 순서를 보여주고 설명을 덧붙여주세요. 그 방법을 개인 Skill로 저장해 다른 입력으로 다시 쓸 수 있어요.",
    ],
  };
  function tabContext() {
    if ((s.tab === "tools" && s.discovered) || s.tab === "learn") return "";
    const [title, description] = tabExplanations[s.tab];
    return `<div class="tab-context"><strong>${title}</strong><p>${description}</p></div>`;
  }
  function welcomeCard() {
    if (!s.entryStarted)
      return `<section id="welcome-card" class="welcome-card" role="note" aria-label="다음 행동 안내"><div class="coach-top"><span>🦁 KEEPER · 1 / 11</span><button class="quiet" data-action="guide" aria-label="말풍선 안내 닫기">×</button></div><h2>먼저 Keeper를 켜볼까요?</h2><p>주소창 오른쪽의 작은 🦁 확장 아이콘을 눌러주세요. 크롬 확장처럼 옆에 도우미 패널이 열려요.</p><div class="coach-result">웹앱은 그대로 두고 Keeper에게 일을 맡길 수 있어요.</div><div class="coach-actions"><button class="quiet" data-action="focus-step">다음 단계 →</button></div></section>`;
    const [stepTitle, stepDescription, , result] = steps()[s.stage];
    const [title, description] =
      s.stage === 2 && !s.tabTip
        ? [
            "도구를 펼쳐 직접 실행해보세요",
            "첫 번째 도구를 펼치고 입력값을 확인한 뒤 실행하세요. 왼쪽 웹앱에서 바뀐 결과가 강조됩니다. 다른 도구도 지금 바로 실행할 수 있어요.",
          ]
        : s.tabTip
          ? tabExplanations[s.tabTip]
          : [stepTitle, stepDescription];
    return `<section id="welcome-card" class="welcome-card" role="note" aria-label="다음 행동 안내"><div class="coach-top"><span>🦁 KEEPER · ${s.stage + 2} / ${steps().length + 1}</span><button class="quiet" data-action="guide" aria-label="말풍선 안내 닫기">×</button></div><h2>${s.busy ? "이 페이지에서 할 수 있는 일을 찾고 있어요" : title}</h2><p>${s.busy ? "화면 관찰부터 후보 구성까지 진행 상황을 확인하세요. 완료되면 바로 대화할 수 있어요." : description}</p><div class="coach-result">${result}</div><div class="coach-actions"><button class="quiet" data-action="back" ${s.busy ? "disabled" : ""}>← 이전 단계</button><button class="quiet" data-action="focus-step" ${s.busy ? "disabled" : ""}>${s.stage === 9 ? "체험 완료 ✓" : "다음 단계 →"}</button></div></section>`;
  }
  function coachTarget() {
    if (!s.entryStarted) return root.querySelector("#keeper-toolbar-toggle");
    if (s.tabTip) return root.querySelector(`[data-tab="${s.tabTip}"]`);
    return (
      root.querySelector(
        s.stage === 8
          ? ".installed-skill"
          : s.stage === 2
            ? ".tool-catalog"
            : steps()[s.stage][2],
      ) ||
      root.querySelector(
        `[data-tab="${s.stage <= 2 ? "tools" : s.stage === 3 ? "chat" : "learn"}"]`,
      )
    );
  }
  function positionCoach() {
    const card = root.querySelector("#welcome-card"),
      target = coachTarget();
    if (!card || !target || card.classList.contains("inline-coach")) return;
    const rect = target.getBoundingClientRect(),
      gap = 16,
      width = 280;
    const height = card.getBoundingClientRect().height;
    let left, top;
    if (rect.left >= width + gap + 10) {
      left = rect.left - width - gap;
      top = Math.max(12, Math.min(innerHeight - height - 12, rect.top));
      card.dataset.arrow = "right";
    } else if (innerWidth - rect.right >= width + gap + 10) {
      left = rect.right + gap;
      top = Math.max(12, Math.min(innerHeight - height - 12, rect.top));
      card.dataset.arrow = "left";
    } else if (rect.top >= height + gap + 12) {
      left = Math.max(12, Math.min(innerWidth - width - 12, rect.left));
      top = rect.top - height - gap;
      card.dataset.arrow = "bottom";
    } else if (innerHeight - rect.bottom >= height + gap + 12) {
      left = Math.max(12, Math.min(innerWidth - width - 12, rect.left));
      top = rect.bottom + gap;
      card.dataset.arrow = "top";
    } else {
      card.classList.add("inline-coach");
      (target.closest("nav") || target).before(card);
      card.style.visibility = "visible";
      return;
    }
    card.style.left = `${left}px`;
    card.style.top = `${top}px`;
    card.style.visibility = "visible";
  }
  function bucketForm() {
    return `<form id="bucket-form" class="inline-form"><label for="bucket-name">Bucket Name</label><input id="bucket-name" name="name" placeholder="my-project" value="${esc(s.newBucket)}" required minlength="3" maxlength="63" pattern="[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]"><div class="actions"><button class="web-button">Create Bucket</button><button type="button" class="quiet" data-action="close-create">Cancel</button></div></form>`;
  }
  function minio() {
    const total = s.buckets.reduce((a, b) => a + b.objects, 0);
    return `<div class="web-app minio-app"><aside class="web-nav"><div class="minio-logo">MINIO<small>Object Storage</small></div>${[
      ["buckets", "▧", "Object Browser"],
      ["monitor", "◷", "Monitoring"],
      ["keys", "⚿", "Access Keys"],
    ]
      .map(
        ([page, icon, label]) =>
          `<button data-page="${page}" class="${s.page === page ? "selected" : ""}"><span>${icon}</span><b>${label}</b></button>`,
      )
      .join(
        "",
      )}<small class="nav-bottom">Console · demo-user<br>합성 데이터</small></aside><section class="web-main"><div class="web-heading"><div><p class="breadcrumb">Console / ${s.page === "keys" ? "Access Keys" : s.page === "monitor" ? "Monitoring" : "Object Browser"}</p><h2>${s.page === "keys" ? "Access Keys" : s.page === "monitor" ? "Bucket Monitoring" : "Object Browser"}</h2><p class="web-term">${s.page === "keys" ? "Access Key는 프로그램이 접속할 때 쓰는 출입증이에요." : s.page === "monitor" ? "보관함별로 파일 수와 사용 용량을 확인하는 화면이에요." : "버킷은 파일을 모아두는 보관함이에요. 하나 만들어볼까요?"}</p></div><span class="web-badge">DEMO</span></div>${s.page === "buckets" ? `<div class="stats"><div><span>BUCKETS</span><strong>${s.buckets.length}</strong></div><div><span>OBJECTS</span><strong>${total}</strong></div><div><span>STORAGE</span><strong>${s.buckets.reduce((a, b) => a + b.size, 0)} <small>MB</small></strong></div></div><div id="web-action" class="web-action"><div class="section-heading"><h3>보관함 · Buckets <span>${s.buckets.length}</span></h3><button class="web-button" data-action="open-create">＋ Create Bucket</button></div>${s.pageCreate ? bucketForm() : ""}</div><div class="table-wrap"><table><thead><tr><th>BUCKET NAME</th><th>ACCESS</th><th>OBJECTS</th><th>SIZE</th></tr></thead><tbody>${s.buckets.map((b) => `<tr class="${s.highlight === b.name ? "new-row" : ""}"><td><button class="bucket-link" data-bucket="${esc(b.name)}">▱ ${esc(b.name)}</button></td><td><span class="private">Private</span></td><td>${b.objects}</td><td>${b.size} MB</td></tr>`).join("")}</tbody></table></div><p class="web-footnote">버킷을 누르면 해당 버킷의 모니터링 정보를 볼 수 있어요.</p>` : s.page === "monitor" ? monitor() : keys()}</section></div>`;
  }
  function monitor() {
    const b = s.buckets.find((b) => b.name === s.selected) || s.buckets[0];
    return `<label class="field">Bucket<select id="monitor-bucket">${s.buckets.map((x) => `<option ${x.name === b.name ? "selected" : ""}>${esc(x.name)}</option>`).join("")}</select></label><div class="stats"><div><span>OBJECTS</span><strong>${b.objects}</strong></div><div><span>STORAGE</span><strong>${b.size}<small> MB</small></strong></div></div><div class="chart-card"><h3>${esc(b.name)} · 사용 현황</h3><div class="usage-bar"><span style="width:${Math.max(1, Math.min(100, b.size / 2))}%"></span></div><p>${b.objects === 0 ? "새 버킷은 아직 비어 있어요." : "합성 객체와 용량을 보여줍니다."}</p><button class="secondary" data-action="add-object">합성 객체 1개 추가 · 4 MB</button></div><p class="web-footnote">추가한 객체 수와 용량은 Object Browser에도 반영됩니다. 합성 데이터이며 실제 서버 지표가 아닙니다.</p>`;
  }
  function keys() {
    return `<p class="web-description">이 데모 안에서만 사용하는 Access Key를 만들고 삭제해보세요.</p><form id="key-form" class="inline-form"><label for="key-name">Key Name</label><input id="key-name" name="name" value="${esc(s.keyDraft)}" placeholder="demo-reader" required maxlength="40"><button class="web-button">Create Access Key</button></form><div class="table-wrap"><table><thead><tr><th>NAME</th><th>ACCESS KEY</th><th>STATUS</th><th></th></tr></thead><tbody>${s.keys.map((key, i) => `<tr><td>${esc(key.name)}</td><td><code>DEMO-ONLY-${String(key.number).padStart(3, "0")}</code></td><td>Enabled</td><td><button class="danger" data-delete-key="${i}">Delete</button></td></tr>`).join("") || '<tr><td colspan="4">아직 발급한 데모 키가 없습니다.</td></tr>'}</tbody></table></div>${s.deleteKey !== undefined ? `<div class="confirm-box"><p><strong>${esc(s.keys[s.deleteKey]?.name)}</strong> 데모 키를 삭제할까요?</p><button class="danger" data-action="confirm-delete">이 키 삭제</button><button class="quiet" data-action="cancel-delete">취소</button></div>` : ""}<p class="web-footnote">실제 인증에 쓸 수 없는 합성 키입니다. Secret Key를 발급하거나 저장하지 않습니다.</p>`;
  }

  const demoMail = [
    {
      id: "mail-1",
      from: "기획팀",
      subject: "내일 회의 일정 안내",
      body: "내일 오전 10시 프로젝트 회의가 있습니다. 안건은 새 서비스의 첫 화면입니다.",
      time: "10:24",
    },
    {
      id: "mail-2",
      from: "디자인팀",
      subject: "첫 화면 회의 자료 공유",
      body: "회의에서 함께 볼 화면 초안을 공유합니다. 사용자가 처음 해야 할 일이 잘 보이는지 확인해주세요.",
      time: "09:40",
    },
    {
      id: "mail-3",
      from: "구매팀",
      subject: "샘플 제작 견적 확인 요청",
      body: "샘플 제작 견적을 확인해주세요. 항목은 인쇄물과 전시 패널입니다. 이 메일과 금액은 합성 데모 내용입니다.",
      time: "09:12",
    },
    {
      id: "mail-4",
      from: "운영팀",
      subject: "다음 주 출장 일정",
      body: "다음 주 화요일 전시 준비를 위한 출장이 예정되어 있습니다. 준비물과 참석자를 확인해주세요.",
      time: "어제",
    },
    {
      id: "mail-5",
      from: "프로젝트팀",
      subject: "이번 주 작업 일정 정리",
      body: "월요일에는 초안 검토, 수요일에는 시연 준비, 금요일에는 결과 공유를 진행합니다.",
      time: "어제",
    },
    {
      id: "mail-6",
      from: "지원팀",
      subject: "데모 계정 사용 안내",
      body: "이 메일함은 설치 없이 사용하는 합성 체험입니다. 실제 메일을 읽거나 보내지 않습니다.",
      time: "어제",
    },
  ];
  function mailMatches(query = s.mailQuery) {
    const q = query.trim().toLowerCase();
    return demoMail
      .filter((mail) => !s.mailSender || mail.from === s.mailSender)
      .filter((mail) =>
        `${mail.from} ${mail.subject} ${mail.body}`.toLowerCase().includes(q),
      )
      .filter(
        (mail) => s.mailFolder !== "starred" || s.mailStars.includes(mail.id),
      );
  }
  function mailbox() {
    const rows = mailMatches(),
      opened = demoMail.find((mail) => mail.id === s.openedMail);
    return `<div class="web-app mail-app"><aside class="web-nav"><div class="mail-logo">✉ <b>메일</b></div><button class="${s.mailFolder === "inbox" ? "selected" : ""}" data-folder="inbox"><span>▣</span><b>받은편지함</b></button><button class="${s.mailFolder === "starred" ? "selected" : ""}" data-folder="starred"><span>☆</span><b>별표편지함</b></button><small class="nav-bottom">DEMO · 합성 메일<br>실제 계정 연결 없음</small></aside><section class="web-main"><form id="web-action" class="mail-search"><label for="mail-search" class="sr-only">메일 검색</label><input id="mail-search" name="query" placeholder="메일 검색 · 예: 회의" value="${esc(s.mailDraft)}"><button aria-label="메일 검색 실행">검색</button></form><label class="mail-sender-filter">발신자 <select id="mail-sender"><option value="">모든 발신자</option>${demoMail.map((m) => `<option ${s.mailSender === m.from ? "selected" : ""}>${esc(m.from)}</option>`).join("")}</select></label><div class="mail-heading"><h2>${s.mailFolder === "starred" ? "별표편지함" : "받은편지함"}</h2><span class="web-badge">합성 데모</span></div><p class="mail-scope">${s.mailQuery ? `‘${esc(s.mailQuery)}’ 검색 결과` : "전체 메일"} · <strong>${rows.length}건</strong></p>${opened ? `<article class="opened-mail action-highlight"><button class="quiet" data-action="mail-back">← 목록으로</button><h2>${esc(opened.subject)}</h2><p class="muted">${esc(opened.from)} → 나 · ${opened.time}</p><p>${esc(opened.body)}</p></article>` : `<div class="mail-list">${rows.map((mail) => `<article class="mail-row ${s.webFeedback?.ids?.includes(mail.id) ? "action-highlight" : ""}"><button class="star-button" aria-label="${esc(mail.subject)} 별표 ${s.mailStars.includes(mail.id) ? "해제" : "추가"}" aria-pressed="${s.mailStars.includes(mail.id)}" data-star="${mail.id}">${s.mailStars.includes(mail.id) ? "★" : "☆"}</button><button class="mail-preview" data-mail-id="${mail.id}"><strong>${mail.from}</strong><span><b>${mail.subject}</b><small>${mail.body}</small></span><time>${mail.time}</time></button></article>`).join("") || '<p class="empty-state">일치하는 메일이 없어요. 다른 검색어를 입력해보세요.</p>'}</div>`}<p class="web-footnote">Gmail처럼 익숙한 검색·목록을 담은 독립 시뮬레이션입니다. 실제 Google 서비스가 아닙니다.</p></section></div>`;
  }
  function runMailSearch(query) {
    s.mailQuery = query.trim();
    s.mailDraft = s.mailQuery;
    s.mailFolder = "inbox";
    s.mailSender = "";
    s.openedMail = null;
    const rows = mailMatches();
    s.webFeedback = {
      title: "메일 검색 완료",
      text: `${s.mailQuery || "전체"} · ${rows.length}건 표시`,
      ids: rows.map((m) => m.id),
    };
    return rows;
  }
  function mailSummary(rows) {
    return `‘${s.mailQuery}’ 메일 ${rows.length}건을 찾았어요.${rows.length ? " " + rows.map((mail) => mail.subject).join(" · ") : " 다른 검색어로 다시 찾아보세요."}`;
  }
  const mailExtraTools = [
    [
      "read",
      "메일 본문 읽기",
      "메일을 열어 발신자·제목·본문을 확인해요.",
      "예: 견적 메일 읽어줘",
    ],
    [
      "sender",
      "발신자별 모아보기",
      "선택한 팀에서 보낸 메일만 남겨요.",
      "예: 구매팀이 보낸 메일만 보여줘",
    ],
    [
      "star",
      "중요한 메일에 별표",
      "선택한 메일에 별표를 붙여요.",
      "예: 견적 메일에 별표 추가해줘",
    ],
    [
      "unstar",
      "별표 해제",
      "선택한 메일의 별표를 지워요.",
      "예: 견적 메일 별표 해제해줘",
    ],
    [
      "starred",
      "별표 메일 모아보기",
      "별표를 붙인 메일만 보여줘요.",
      "예: 별표 메일 보여줘",
    ],
  ];
  function runMailTool(kind, value) {
    const mail = demoMail.find((m) => m.id === value);
    let result;
    if (["read", "star", "unstar"].includes(kind) && !mail)
      return "메일을 하나 선택해주세요.";
    if (kind === "sender") {
      if (!demoMail.some((m) => m.from === value))
        return "목록에서 발신자를 선택해주세요.";
      runMailSearch("");
      s.mailSender = value;
      result = `${value} 메일 ${mailMatches().length}건 · ${mailMatches()
        .map((m) => m.subject)
        .join(" · ")}`;
    } else if (kind === "starred") {
      runMailSearch("");
      s.mailFolder = "starred";
      result = `별표 메일 ${mailMatches().length}건${
        mailMatches().length
          ? " · " +
            mailMatches()
              .map((m) => m.subject)
              .join(" · ")
          : " · 먼저 중요한 메일에 별표를 붙여보세요."
      }`;
    } else if (kind === "results") {
      result = `현재 목록 ${mailMatches().length}건 · ${
        mailMatches()
          .map((m) => m.subject)
          .join(" · ") || "일치하는 메일 없음"
      }`;
    } else {
      runMailSearch("");
      if (kind === "read") {
        s.openedMail = mail.id;
        result = `${mail.from} · ${mail.subject}\n${mail.body}`;
      }
      if (kind === "star") {
        if (!s.mailStars.includes(mail.id)) s.mailStars.push(mail.id);
        result = `‘${mail.subject}’ 별표 추가 완료`;
      }
      if (kind === "unstar") {
        s.mailStars = s.mailStars.filter((id) => id !== mail.id);
        result = `‘${mail.subject}’ 별표 해제 완료`;
      }
    }
    s.webFeedback = {
      title: {
        read: "메일 본문을 열었어요",
        sender: "발신자 필터를 적용했어요",
        star: "별표를 추가했어요",
        unstar: "별표를 해제했어요",
        starred: "별표 메일만 모았어요",
        results: "현재 목록을 확인했어요",
      }[kind],
      text: result,
      ids: mail ? [mail.id] : mailMatches().map((m) => m.id),
    };
    s.mailToolResults[kind] = result;
    return result;
  }
  function toolRow(id, number, name, description, contents) {
    return `<details class="capability-card compact-tool" data-tool-row="${id}" ${s.expandedTools[id] ? "open" : ""}><summary ${id === "primary" ? 'id="tool-detail"' : ""}><span class="capability-number">${String(number).padStart(2, "0")}</span><span class="tool-row-label"><strong>${name}</strong><span>${description}</span></span><span class="tool-chevron" aria-hidden="true">⌄</span></summary><div class="tool-row-details">${contents}</div></details>`;
  }
  function mailToolExtras() {
    return mailExtraTools
      .map(([id, name, desc, example], i) =>
        toolRow(
          id,
          i + 3,
          name,
          desc,
          `<p>${desc}</p><div class="capability-example">${example}</div><form class="mail-tool-form" data-mail-tool="${id}">${id === "starred" ? "" : `<label>${id === "sender" ? "발신자" : "대상 메일"}<select name="target">${demoMail.map((m) => `<option value="${id === "sender" ? esc(m.from) : m.id}">${esc(id === "sender" ? m.from : m.subject)}</option>`).join("")}</select></label>`}<button>${name} 실행</button></form>${s.mailToolResults[id] ? `<p class="tool-run-result" role="status">${esc(s.mailToolResults[id])}</p>` : ""}`,
        ),
      )
      .join("");
  }
  function mailCompoundTask(text) {
    const read = /읽|본문|열어/.test(text);
    const mark = /별표/.test(text) && /추가|붙|표시|해제|제거/.test(text);
    const gather = /별표/.test(text) && /모아|모아보기|보여/.test(text);
    if (Number(read) + Number(mark) + Number(gather) < 2) return null;
    const sender = demoMail.find((m) => text.includes(m.from));
    const selected = sender
      ? demoMail.filter((m) => m.from === sender.from)
      : demoMail.filter(
          (m) =>
            text.includes(m.subject) ||
            m.subject
              .split(/\s+/)
              .some((w) => w.length >= 2 && text.includes(w)),
        );
    if (!selected.length)
      return "어떤 메일로 작업할지 알려주세요. 예: 구매팀 메일을 읽고 별표를 붙여서 모아줘";
    const log = [];
    if (sender) log.push(runMailTool("sender", sender.from));
    else {
      runMailSearch(selected[0].subject);
      log.push(`대상 확인 · ${selected.map((m) => m.subject).join(" · ")}`);
    }
    for (const mail of selected) {
      if (read) log.push(runMailTool("read", mail.id));
      if (mark)
        log.push(
          runMailTool(/해제|제거/.test(text) ? "unstar" : "star", mail.id),
        );
    }
    if (gather) log.push(runMailTool("starred"));
    return (
      `복합 작업 완료 · ${log.length}단계\n` +
      log.map((line, i) => `${i + 1}. ${line}`).join("\n")
    );
  }
  function mailChatAction(text) {
    const compound = mailCompoundTask(text);
    if (compound !== null) return compound;
    const sender = demoMail.find((m) => text.includes(m.from));
    if (/발신자|보낸/.test(text) && sender)
      return runMailTool("sender", sender.from);
    if (
      /별표/.test(text) &&
      /모아|보여|목록/.test(text) &&
      !/추가|해제|삭제/.test(text)
    )
      return runMailTool("starred");
    const kind = /별표/.test(text)
      ? /해제|삭제|제거/.test(text)
        ? "unstar"
        : "star"
      : /읽어|본문|열어/.test(text)
        ? "read"
        : null;
    if (!kind) return null;
    const matches = demoMail.filter(
      (m) =>
        text.includes(m.subject) ||
        m.subject.split(/\s+/).some((w) => w.length >= 2 && text.includes(w)),
    );
    if (matches.length !== 1)
      return matches.length
        ? "대상 메일이 여러 개예요. 메일 제목 전체를 알려주거나 도구 탭에서 선택해주세요."
        : "대상 메일을 찾지 못했어요. 메일 제목을 알려주세요. 예: 견적 메일 읽어줘";
    return runMailTool(kind, matches[0].id);
  }
  function recordMailTool(kind, target) {
    if (!s.recording) return;
    const title =
      mailExtraTools.find((tool) => tool[0] === kind)?.[1] || "메일 목록";
    const mail = demoMail.find((mail) => mail.id === target);
    s.actions.push({
      kind: "mail_action",
      tool: kind,
      target,
      label: `${title}${target ? " · " + (mail?.subject || target) : ""}`,
    });
    advance("web");
  }
  function mailSubmit(form, data) {
    if (form.dataset.mailTool) {
      const result = runMailTool(
        form.dataset.mailTool,
        String(data.get("target") || ""),
      );
      s.messages.push({ role: "keeper", text: result });
      render();
      return true;
    }
    if (
      form.id === "reuse-form" &&
      s.skill?.recorded.some((action) => action.kind === "mail_action")
    ) {
      const query = String(data.get("name") || "").trim();
      if (
        s.skill.recorded.some((action) => action.kind === "search_mail") &&
        !query
      ) {
        fail("검색어를 입력해주세요.");
        return true;
      }
      const results = s.skill.recorded.map((action) =>
        action.kind === "search_mail"
          ? mailSummary(runMailSearch(query))
          : runMailTool(action.tool, action.target),
      );
      s.messages.push({
        role: "keeper",
        text: `${s.skill.name} 실행\n${results.join("\n")}`,
      });
      advance("reuse");
      render();
      return true;
    }
    if (form.id === "web-action") {
      const query = String(data.get("query") || "");
      const rows = runMailSearch(query);
      if (s.recording) {
        s.actions.push({
          kind: "search_mail",
          query,
          count: rows.length,
          label: `메일 검색 · ${query || "전체"} · ${rows.length}건`,
        });
        advance("web");
      }
      success(mailSummary(rows));
      render();
      return true;
    }
    if (form.id === "validate-form" || form.id === "reuse-form") {
      if (form.id === "reuse-form" && !s.skill) return true;
      const query = String(data.get("name") || "").trim();
      if (!query) {
        fail("찾을 검색어를 입력해주세요. 예: 회의");
        return true;
      }
      const rows = runMailSearch(query);
      if (form.id === "validate-form" && !rows.length) {
        fail(
          "시험할 메일을 찾지 못했어요. 회의·견적·출장 중 하나로 시험해주세요.",
        );
        return true;
      }
      s.ready = true;
      s.messages.push({ role: "keeper", text: mailSummary(rows) });
      success(
        `${form.id === "validate-form" ? "시험 실행" : "Skill 재사용"} 완료 · ${mailSummary(rows)}`,
      );
      if (form.id === "validate-form" && s.stage === 1) advance("detail");
      advance(form.id === "validate-form" ? "validate" : "reuse");
      if (form.id === "validate-form") s.tab = "chat";
      render();
      return true;
    }
    if (form.id === "chat-form") {
      const text = String(data.get("message") || "");
      const actionResult = mailChatAction(text);
      if (actionResult !== null) {
        s.messages.push(
          { role: "user", text },
          { role: "keeper", text: actionResult },
        );
        success(actionResult);
        render();
        return true;
      }
      const query = text
        .replace(/(이메일|메일)(을|를)?/g, "")
        .replace(
          /(찾아주세요|찾아줘|검색해주세요|검색해줘|보여주세요|보여줘|관련)/g,
          "",
        )
        .replace(/["'“”]/g, "")
        .trim();
      if (!query) {
        fail("찾을 내용을 알려주세요. 예: 견적 메일을 찾아줘");
        return true;
      }
      const rows = runMailSearch(query);
      s.messages.push(
        { role: "user", text },
        { role: "keeper", text: mailSummary(rows) },
      );
      success(mailSummary(rows));
      advance("chat");
      render();
      return true;
    }
    if (form.id === "intent-form") {
      const intent = String(data.get("intent") || "").trim();
      if (!intent || !s.recorded.length) {
        fail("검색 시연을 먼저 보여주세요.");
        return true;
      }
      s.learningNew = false;
      s.skill = {
        name: "나의 메일 찾기",
        intent,
        kind: "search_mail",
        steps: ["search_mail", "read_results"],
      };
      success("메일 찾기 Skill을 만들었어요. 새 검색어로 써보세요.");
      savePersonalSkill(data);
      advance("skill");
      render();
      return true;
    }
    return false;
  }

  const products = ["전체 제품", "DEMO-A", "DEMO-B", "DEMO-C"];
  const machines = ["전체 설비", "ETCH-01", "ETCH-02"];
  const measurements = Array.from({ length: 48 }, (_, i) => ({
    id: `W-${String(i + 1).padStart(3, "0")}`,
    product: products[1 + (i % 3)],
    tool: machines[1 + (Math.floor(i / 3) % 2)],
    value: +(
      43.2 +
      (i % 3) * 1.1 +
      (Math.floor(i / 3) % 2) * 0.7 +
      Math.sin(i * 1.7) * 1.7
    ).toFixed(2),
  }));
  function metric() {
    const rows = measurements.filter(
      (row) =>
        (s.filter.product === "전체 제품" ||
          row.product === s.filter.product) &&
        (s.filter.tool === "전체 설비" || row.tool === s.filter.tool),
    );
    const mean = rows.reduce((sum, row) => sum + row.value, 0) / rows.length;
    const deviation = Math.sqrt(
      rows.reduce((sum, row) => sum + (row.value - mean) ** 2, 0) / rows.length,
    );
    return {
      rows,
      mean: mean.toFixed(2),
      cpk: (Math.min(48 - mean, mean - 42) / (3 * deviation)).toFixed(2),
      alarms: rows.filter((row) => row.value > 48 || row.value < 42),
    };
  }
  function filterFields(prefix, filter) {
    return `<label for="${prefix}-product">제품</label><select id="${prefix}-product" name="product">${products.map((product) => `<option ${product === filter.product ? "selected" : ""}>${product}</option>`).join("")}</select><label for="${prefix}-tool">설비</label><select id="${prefix}-tool" name="tool">${machines.map((tool) => `<option ${tool === filter.tool ? "selected" : ""}>${tool}</option>`).join("")}</select>`;
  }
  function wafer() {
    const m = metric();
    const points = m.rows
      .map(
        (row, i) =>
          `${30 + (i * 440) / Math.max(1, m.rows.length - 1)},${165 - (row.value - 40) * 15}`,
      )
      .join(" ");
    return `<div class="web-app wafer-app"><aside class="web-nav"><div class="wafer-logo"><span>Si</span><div>WaferSight<small>Semiconductor Metrology</small></div></div><button data-page="dashboard" class="${s.page === "dashboard" ? "selected" : ""}"><span>▥</span><b>대시보드</b></button><button data-page="wafermap" class="${s.page === "wafermap" ? "selected" : ""}"><span>◉</span><b>웨이퍼맵</b></button><small class="nav-bottom">DEMO · 합성 데이터</small></aside><section class="web-main"><div class="web-heading"><div><p class="breadcrumb">WaferSight / Semiconductor Metrology</p><h2>${s.page === "wafermap" ? "웨이퍼맵" : "대시보드"} <small>계측 모니터링 · SPC</small></h2></div><span class="web-badge">DEMO</span></div><div id="web-action" class="wafer-filters"><label for="web-param">파라미터</label><select id="web-param"><option>CD Line Width (nm)</option></select>${filterFields("web", s.filter)}</div><p class="scope" id="query-scope">범위: ${esc(s.filter.product)} · ${esc(s.filter.tool)} · ${m.rows.length}건</p>${
      s.page === "wafermap"
        ? `<div class="wafer-gallery">${m.rows
            .slice(0, 12)
            .map(
              (row, i) =>
                `<div class="wafer-item"><div class="wafer-disc" style="--offset:${i * 13}deg">${Array.from({ length: 25 }, (_, j) => `<i style="background:${(i + j) % 9 === 0 ? "#df876c" : "#73bcb5"}"></i>`).join("")}</div><p>${row.id} · ${row.product}<br>${row.tool}</p></div>`,
            )
            .join(
              "",
            )}</div><p class="web-footnote">공간 결함 패턴을 표현한 합성 도식입니다. 실제 웨이퍼 이미지나 실측 결함률이 아닙니다.</p>`
        : `<div class="stats wafer-stats"><div><span>측정 건수</span><strong id="measurement-count">${m.rows.length}</strong></div><div><span>평균 · nm</span><strong id="measurement-mean">${m.mean}</strong></div><div><span>Cpk · 합성 표본</span><strong>${m.cpk}</strong></div><div><span>OOS 알람</span><strong>${m.alarms.length}</strong></div></div><div class="chart-tabs"><button data-chart="I-MR" class="${s.chart === "I-MR" ? "active" : ""}">I-MR</button><button data-chart="X-bar/R" class="${s.chart === "X-bar/R" ? "active" : ""}">X-bar/R</button></div><div class="chart-card"><h3>트렌드 (측정값 + USL/LSL)</h3><svg viewBox="0 0 500 190" role="img" aria-label="${esc(s.filter.product)} ${esc(s.filter.tool)} 합성 측정값 트렌드"><path d="M30 20V165H475" stroke="#dce2ee" fill="none"/><path d="M30 45H475 M30 135H475" stroke="#e7a08d" stroke-dasharray="5 4"/><text x="4" y="48" fill="#bc7462" font-size="9">48</text><text x="4" y="138" fill="#bc7462" font-size="9">42</text><polyline points="${
            s.chart === "I-MR"
              ? points
              : m.rows
                  .reduce((groups, row, i) => {
                    const n = Math.floor(i / 4);
                    (groups[n] ??= []).push(row.value);
                    return groups;
                  }, [])
                  .map(
                    (group, i, all) =>
                      `${30 + (i * 440) / Math.max(1, all.length - 1)},${165 - (group.reduce((a, b) => a + b, 0) / group.length - 40) * 15}`,
                  )
                  .join(" ")
          }" stroke="#6255dc" stroke-width="2" fill="none"/></svg><p>${s.chart === "I-MR" ? "개별 측정값" : "4개씩 묶은 부분군 평균"} · 합성 데이터 ${m.rows.length}건. 관리도 전체 계산을 재현한 결과는 아닙니다.</p></div><div class="table-wrap measurement-table"><table><thead><tr><th>WAFER</th><th>제품</th><th>설비</th><th>측정값 (nm)</th><th>상태</th></tr></thead><tbody>${m.rows
            .slice(0, 8)
            .map(
              (row) =>
                `<tr><td>${row.id}</td><td>${row.product}</td><td>${row.tool}</td><td>${row.value.toFixed(2)}</td><td>${row.value > 48 || row.value < 42 ? "OOS" : "정상"}</td></tr>`,
            )
            .join(
              "",
            )}</tbody></table></div><p class="web-footnote">선택한 조건으로 필터링한 합성 결과입니다. 실제 사이트의 제품명·측정값·알람을 복사하지 않았습니다.</p>`
    }</section></div>`;
  }
  function waferToolDetails() {
    return `<div class="tool-detail"><div class="detail-label">필요한 입력</div><p><code>product</code> · 제품<br><code>tool</code> · 설비<br>파라미터: CD Line Width (nm)</p><div class="detail-label">브라우저 작업 순서</div><ol><li>대시보드 열기</li><li>제품·설비 조건 선택</li><li>측정 건수·평균·목록 확인</li></ol><div class="detail-label">실행 후 확인할 결과</div><p>선택 조건과 결과 목록의 제품·설비가 일치합니다.</p></div>`;
  }
  function query(filter) {
    if (!products.includes(filter.product) || !machines.includes(filter.tool))
      return false;
    s.filter = filter;
    s.page = "dashboard";
    return true;
  }
  function summary() {
    const m = metric();
    return `${s.filter.product} / ${s.filter.tool}: 측정 ${m.rows.length}건, 평균 ${m.mean} nm, OOS ${m.alarms.length}건을 확인했어요.`;
  }
  function waferSubmit(form, data) {
    if (form.id === "validate-form" || form.id === "reuse-form") {
      if (form.id === "reuse-form" && !s.skill) return true;
      if (
        !query({
          product: String(data.get("product")),
          tool: String(data.get("tool")),
        })
      ) {
        fail("제품과 설비를 목록에서 선택해주세요.");
        return true;
      }
      s.messages.push({ role: "keeper", text: summary() });
      s.ready = true;
      success(
        `${form.id === "validate-form" ? "시험 실행" : "개인 Skill 실행"} 완료 · ${summary()}`,
      );
      if (form.id === "validate-form" && s.stage === 1) advance("detail");
      advance(form.id === "validate-form" ? "validate" : "reuse");
      if (form.id === "validate-form") s.tab = "chat";
      render();
      return true;
    }
    if (form.id === "chat-form") {
      if (!s.ready) {
        fail("먼저 도구를 시험해주세요.");
        return true;
      }
      const text = String(data.get("message"));
      const product = text.match(/DEMO-[ABC]/i)?.[0]?.toUpperCase();
      const tool = text.match(/ETCH-0[12]/i)?.[0]?.toUpperCase() || "전체 설비";
      if (!product) {
        fail("제품 이름을 포함해주세요. 예: DEMO-B, ETCH-02 조건으로 조회해줘");
        return true;
      }
      query({ product, tool });
      s.messages.push(
        { role: "user", text },
        { role: "keeper", text: summary() },
      );
      success(summary());
      advance("chat");
      render();
      return true;
    }
    if (form.id === "intent-form") {
      const intent = String(data.get("intent") || "").trim();
      if (!intent || !s.recorded.length) {
        fail("시연과 업무 의도를 먼저 입력해주세요.");
        return true;
      }
      s.learningNew = false;
      s.skill = {
        name: "제품별 계측 현황 조회",
        intent,
        kind: "query_measurements",
        steps: ["query_measurements", "summarize_measurements"],
      };
      success("조회 Skill을 만들었어요. 다른 조건으로 재사용하세요.");
      savePersonalSkill(data);
      advance("skill");
      render();
      return true;
    }
    return false;
  }

  const toolName = () => (s.site === "wafer" ? "계측 조건 조회" : "버킷 생성");
  function toolDetails() {
    if (s.site === "wafer") return waferToolDetails();
    return `<div class="tool-detail"><div class="detail-label">필요한 입력</div><p><code>bucketName</code> · 필수<br>생성할 새 버킷 이름</p><div class="detail-label">브라우저 작업 순서</div><ol><li>Create Bucket 열기</li><li>이름 입력 · 생성</li><li>Object Browser에서 이름 확인</li></ol><div class="detail-label">실행 후 확인할 결과</div><p>입력한 이름이 버킷 목록에 표시됩니다.</p></div>`;
  }
  function toolCopy() {
    return s.site === "mail"
      ? [
          "메일 찾기",
          "검색어가 들어간 메일을 찾아줍니다.",
          "예: ‘견적’ → 견적 관련 메일만 표시",
          "검색 결과 확인",
          "찾은 메일의 제목과 건수를 알려줍니다.",
          "검색 후 같은 화면에서 결과를 읽습니다.",
        ]
      : s.site === "wafer"
        ? [
            "제품·설비별 계측 조회",
            "선택한 제품과 설비의 측정 데이터만 보여줍니다.",
            "예: DEMO-A / ETCH-01 → 해당 조건의 계측 결과",
            "계측 결과 요약",
            "측정 건수·평균과 규격 밖의 표본을 확인합니다.",
            "조회한 조건의 결과를 요약합니다.",
          ]
        : [
            "파일 보관함 만들기",
            "새 버킷(파일을 담는 보관함)을 만듭니다.",
            "예: project-files → 같은 이름의 빈 보관함 생성",
            "보관함 목록 확인",
            "현재 보관함 이름과 파일 수를 확인합니다.",
            "새 보관함이 목록에 생겼는지도 확인합니다.",
          ];
  }
  function savePersonalSkill(data) {
    s.skill.id = `skill-${s.nextSkillId++}`;
    s.skill.name = String(data.get("skillName") || "").trim() || s.skill.name;
    s.skill.recorded = structuredClone(s.recorded);
    s.skill.reuse = s.reuse;
    s.skill.reuseFilter = structuredClone(s.reuseFilter);
    s.skills.push(s.skill);
    s.expandedSkills = { [s.skill.id]: true };
    s.skillName = "";
  }
  function installedSkill() {
    const copy = toolCopy();
    const input =
      s.site === "mail"
        ? "검색어"
        : s.site === "wafer"
          ? "제품·설비 조건"
          : "새 보관함 이름";
    return `<div class="skill-catalog">${s.skills.map((skill) => `<details class="compact-tool skill-card ${s.skill?.id === skill.id ? "installed-skill" : ""}" data-skill-row="${skill.id}" ${s.expandedSkills[skill.id] ? "open" : ""}><summary><span class="skill-row-icon">✦</span><span class="tool-row-label"><strong>${esc(skill.name)}</strong><span>${esc(skill.intent)}</span></span><span class="tool-chevron" aria-hidden="true">⌄</span></summary><div class="tool-row-details"><span class="skill-status">✓ 생성 완료</span><p>${esc(skill.intent)}</p>${s.site === "mail" && skill.recorded.some((action) => action.kind === "mail_action") ? '<p class="muted">메일·발신자 대상은 녹화한 값으로 실행합니다.</p>' : ""}<ol class="skill-recipe">${s.site === "mail" && skill.recorded.some((action) => action.kind === "mail_action") ? skill.recorded.map((action) => `<li>${esc(action.label)}</li>`).join("") : `<li>${copy[0]}</li><li>${copy[3]}</li>`}</ol><details><summary>녹화한 동작 ${skill.recorded.length}개</summary><ol>${skill.recorded.map((action) => `<li>${esc(action.label)}</li>`).join("")}</ol></details>${s.skill?.id === skill.id ? `<form id="reuse-form" data-skill-id="${skill.id}" class="test-form">${s.site === "mail" && !skill.recorded.some((action) => action.kind === "search_mail") ? '<p class="muted">녹화한 메일·발신자를 그대로 사용합니다.</p>' : s.site === "wafer" ? filterFields("reuse", s.reuseFilter) : `<label for="reuse-name">${input}</label><input id="reuse-name" name="name" value="${esc(s.reuse)}" required>`}<button>Skill 실행</button></form>` : ""}</div></details>`).join("")}</div>`;
  }
  function toolsPanel() {
    if (!s.discovered)
      return '<div class="empty-state"><h3>아직 도구가 없어요</h3><p>Discover로 이 페이지의 작업을 찾아보세요.</p></div>';
    const copy = toolCopy();
    const fields =
      s.site === "wafer"
        ? filterFields("trial", s.trialFilter)
        : `<label for="trial-name">${s.site === "mail" ? "검색어" : "새 보관함 이름"}</label><input id="trial-name" name="name" value="${esc(s.trial)}" required>`;
    const primary = `<p>${copy[1]}</p><div class="capability-example">${copy[2]}</div><form id="validate-form" class="test-form">${fields}<button>${copy[0]} 실행</button></form>`;
    const secondary = `<p>${copy[4]}</p><div class="capability-example">${copy[5]}</div>${s.site === "mail" ? `<form data-mail-tool="results" class="mail-tool-form"><button>현재 검색 결과 확인</button></form>${s.mailToolResults.results ? `<p role="status">${esc(s.mailToolResults.results)}</p>` : ""}` : '<button class="secondary full" data-action="tool-results">현재 결과 확인</button>'}`;
    return `<section class="tool-overview"><h2>도구 <span>${s.site === "mail" ? 7 : 2}</span></h2></section><div class="tool-catalog">${toolRow("primary", 1, copy[0], copy[1], primary)}${toolRow("results", 2, copy[3], copy[4], secondary)}${s.site === "mail" ? mailToolExtras() : ""}</div>`;
  }
  function messages() {
    return s.messages
      .slice(-5)
      .map(
        (m) =>
          `<div class="message ${m.role}"><small>${m.role === "user" ? "나" : "🦁 Keeper"}</small><p>${esc(m.text)}</p></div>`,
      )
      .join("");
  }
  function chatPanel() {
    return `${s.discovered ? "" : `<div class="welcome-art" aria-hidden="true"><span class="tree">♣</span><span>🦁</span><span class="tree small">♣</span></div><h2 class="welcome-title">이 웹에서도,<br>말로 일할 수 있을까요?</h2><p class="muted">Keeper가 현재 페이지를 살펴보고<br>반복할 일을 도구로 준비해요.</p>`}${messages()}${s.discovered && !s.ready ? `<button id="tool-detail" class="secondary full" data-action="detail">도구 후보 ${s.site === "mail" ? 7 : 2}개 · 구성 확인 →</button>` : ""}${s.discovered ? `<form id="chat-form" class="chat-form"><label for="chat-input">Keeper에게 요청하기</label><textarea id="chat-input" name="message" rows="2" required>${esc(s.chatDraft)}</textarea><div><small>${s.site === "mail" ? "예: 구매팀 메일을 읽고 별표를 붙여서 모아줘" : s.site === "wafer" ? "예: DEMO-C, ETCH-01 조건으로 조회해줘" : "예: launch-assets 버킷을 만들어줘"}</small><button aria-label="요청 보내기">보내기 ↑</button></div></form>` : ""}`;
  }
  function learnPanel() {
    return `<div class="skill-list-heading"><h2>내 Skill <span>${s.skills.length}</span></h2>${!s.recording ? `<button id="record-start" class="secondary" data-action="record" ${!s.discovered ? "disabled" : ""}>＋ 새로 가르치기</button>` : ""}</div>${s.recording ? `<section class="record-session"><div class="recording"><span class="record-dot"></span>녹화 중 · ${s.actions.length}개 동작</div><ol class="record-actions">${s.actions.map((action) => `<li>${esc(action.label)}</li>`).join("")}</ol><div class="actions"><button id="record-stop" data-action="stop" ${!s.actions.length ? "disabled" : ""}>녹화 종료</button><button class="quiet" data-action="cancel-record">취소</button></div></section>` : ""}${s.recorded.length && !s.recording && s.learningNew ? `<form id="intent-form" class="test-form skill-draft"><label for="skill-name">Skill 이름</label><input id="skill-name" name="skillName" value="${esc(s.skillName)}" maxlength="60" required><label for="intent">설명</label><textarea id="intent" name="intent" required>${esc(s.intent)}</textarea><div class="actions"><button>Skill 저장</button><button type="button" class="quiet" data-action="cancel-record">취소</button></div></form>` : ""}${installedSkill()}${!s.skills.length && !s.learningNew ? '<p class="skill-empty">아직 저장한 Skill이 없습니다.</p>' : ""}`;
  }
  function discoveryProgress() {
    const phases = [
      "현재 화면의 메뉴와 입력을 살펴보고 있어요",
      "반복할 수 있는 업무를 찾고 있어요",
      "도구의 입력과 작업 순서를 구성하고 있어요",
      "성공 확인 조건과 후보 목록을 정리하고 있어요",
    ];
    return `<section class="discovery-progress" role="status"><div class="row"><strong>Discover 진행 중</strong><span>${s.discoveryProgress + 1} / 4</span></div><progress max="4" value="${s.discoveryProgress + 1}" aria-label="Discover 진행률"></progress><p>${phases[s.discoveryProgress]}</p><small>합성 화면 관찰 → 도구 후보 구성 · 시뮬레이션</small></section>`;
  }
  function keeper() {
    return `<aside id="keeper-panel" class="keeper"><div class="keeper-brand"><span>🦁</span><div><strong>Keeper</strong><small>by vibe zoo · 시뮬레이션</small></div><span class="habitat">${s.site === "mail" ? "메일" : s.site === "minio" ? "MinIO" : "WaferSight"}</span><button class="quiet panel-toggle" data-action="panel" aria-expanded="true" aria-label="Keeper 패널 닫기">×</button></div><nav class="keeper-tabs" aria-label="Keeper 메뉴">${[
      ["chat", "대화"],
      ["tools", "도구"],
      ["learn", "가르치기"],
    ]
      .map(
        ([tab, label]) =>
          `<button data-tab="${tab}" aria-selected="${s.tab === tab}">${label}${tab === "tools" && s.discovered ? `<span>${s.site === "mail" ? 7 : 2}</span>` : tab === "learn" && s.skills.length ? `<span>Skill ${s.skills.length}</span>` : ""}</button>`,
      )
      .join(
        "",
      )}</nav><div class="keeper-body">${tabContext()}${s.error ? `<p class="error" role="alert">${esc(s.error)}</p>` : ""}${s.notice && s.tab !== "tools" && s.tab !== "learn" ? `<p class="notice" role="status">${esc(s.notice)}</p>` : ""}${!s.discovered ? `<button id="discover" class="full discover-button" data-action="discover" ${s.busy ? "disabled" : ""}>${s.busy ? "화면 관찰 → 후보 구성 중…" : s.discovered ? "Discover 다시 살펴보기" : "✧ Discover · 도구 준비"}</button>` : ""}${s.busy ? discoveryProgress() : ""}${s.tab === "tools" ? toolsPanel() : s.tab === "learn" ? learnPanel() : chatPanel()}</div></aside>`;
  }
  function webFeedback() {
    return s.webFeedback
      ? `<div class="web-execution-feedback" role="status"><strong>✓ ${esc(s.webFeedback.title)}</strong><p>${esc(s.webFeedback.text)}</p></div>`
      : "";
  }
  function browserToolbar() {
    const icon = (path) =>
      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`;
    const address =
      s.site === "mail"
        ? "mail.demo/inbox"
        : s.site === "minio"
          ? "minio.demo/browser"
          : "wafersight.demo/dashboard";
    return `<div class="browser-bar chrome-toolbar"><div class="browser-navigation" aria-hidden="true"><span class="chrome-icon unavailable">${icon('<path d="m12 5-7 7 7 7M5 12h14"/>')}</span><span class="chrome-icon unavailable">${icon('<path d="m12 5 7 7-7 7M5 12h14"/>')}</span><span class="chrome-icon">${icon('<path d="M19 8a8 8 0 1 0 1 7M19 3v5h-5"/>')}</span><span class="chrome-icon">${icon('<path d="m3 10 9-7 9 7M5 9v12h5v-7h4v7h5V9"/>')}</span></div><div class="chrome-address"><span class="site-controls" aria-hidden="true">${icon('<path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="3" fill="white"/><circle cx="15" cy="17" r="3" fill="white"/>')}</span><span class="address-text">${address}</span><span class="chrome-icon address-star" aria-hidden="true">${icon('<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9Z"/>')}</span></div><div class="chrome-extensions"><button id="keeper-toolbar-toggle" class="chrome-icon keeper-extension-icon" data-action="panel" aria-expanded="${s.panelOpen}" aria-controls="keeper-panel" aria-label="Keeper 확장 패널 ${s.panelOpen ? "닫기" : "열기"}" title="Vibe Zoo Keeper — ${s.panelOpen ? "패널 닫기" : "패널 열기"}"><span class="keeper-mini-logo" aria-hidden="true">🦁</span></button><span class="chrome-icon extension-puzzle" title="확장 프로그램 · 시뮬레이션" aria-hidden="true">${icon('<path d="M9 4H4v6h2a2 2 0 1 1 0 4H4v6h6v-2a2 2 0 1 1 4 0v2h6v-6h-2a2 2 0 1 1 0-4h2V4h-6V3a2.5 2.5 0 0 0-5 0Z"/>')}</span><button class="chrome-icon chrome-panel-icon" data-action="panel" aria-expanded="${s.panelOpen}" aria-controls="keeper-panel" aria-label="사이드 패널 ${s.panelOpen ? "닫기" : "열기"}" title="사이드 패널">${icon('<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M14 4v16m-4-11-3 3 3 3"/>')}</button></div></div>`;
  }
  function render() {
    if (!s) {
      root.innerHTML = landing();
      return;
    }
    const previousToolsScroll =
      s.tab === "tools" &&
      root.querySelector('.keeper-tabs [aria-selected="true"]')?.dataset.tab ===
        "tools"
        ? root.querySelector(".keeper-body")?.scrollTop || 0
        : 0;
    root.innerHTML = `${header()}<main class="experience"><div class="experience-caption"><p>웹은 그대로. <strong>Keeper가 업무를 배웁니다.</strong></p><button class="quiet" data-action="guide">${s.guided ? "말풍선 안내 끄기" : "말풍선 안내 켜기"}</button></div><div class="workspace ${s.panelOpen ? "" : "panel-collapsed"}">${browserToolbar()}<section class="browser" aria-label="합성 웹앱">${s.site === "mail" ? mailbox() : s.site === "wafer" ? wafer() : minio()}</section>${s.panelOpen ? keeper() : ""}</div></main>${s.guided && (s.panelOpen || !s.entryStarted) ? welcomeCard() : ""}`;
    if (s.webFeedback) {
      root
        .querySelector(".web-main")
        ?.insertAdjacentHTML("afterbegin", webFeedback());
      const web = root.querySelector(".browser");
      if (web) web.scrollTop = 0;
      const main = root.querySelector(".web-main");
      if (main) main.scrollTop = 0;
    }
    if (s.tab === "tools" && root.querySelector(".keeper-body"))
      root.querySelector(".keeper-body").scrollTop = previousToolsScroll;
    if (s.guided && (s.panelOpen || !s.entryStarted)) {
      const target = coachTarget();
      target?.classList.add("focus-target");
      if (target && s.stage !== 5 && s.tab !== "tools")
        target.scrollIntoView?.({ block: "nearest", behavior: "instant" });
      positionCoach();
    }
  }
  function fail(text) {
    s.error = text;
    s.notice = "";
    render();
  }
  function addBucket(name, source) {
    if (!/^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/.test(name))
      return "이름은 영문 소문자·숫자·점·하이픈으로 3~63자를 입력해주세요.";
    if (s.buckets.some((b) => b.name === name))
      return "같은 이름의 버킷이 있어요. 새로운 이름으로 입력해주세요.";
    s.buckets.push({ name, objects: 0, size: 0 });
    s.highlight = name;
    s.page = "buckets";
    s.pageCreate = false;
    if (s.recording && source === "web")
      s.actions.push({
        kind: "create_bucket",
        name,
        label: `버킷 생성 · ${name}`,
      });
    return null;
  }
  function success(text) {
    if (s.site !== "mail") s.webFeedback = { title: "실행 결과", text };
    s.error = "";
    s.notice = text;
  }
  root.addEventListener("click", (event) => {
    const element = event.target.closest("button");
    if (!element || element.disabled) return;
    if (element.dataset.site) {
      choose(element.dataset.site);
      return;
    }
    if (!s) return;
    if (element.dataset.mailId) {
      recordMailTool("read", element.dataset.mailId);
      s.openedMail = element.dataset.mailId;
      render();
      return;
    }
    if (element.dataset.star) {
      const id = element.dataset.star;
      recordMailTool(s.mailStars.includes(id) ? "unstar" : "star", id);
      s.mailStars = s.mailStars.includes(id)
        ? s.mailStars.filter((x) => x !== id)
        : [...s.mailStars, id];
      render();
      return;
    }
    if (element.dataset.folder) {
      if (element.dataset.folder === "starred") recordMailTool("starred", "");
      s.mailFolder = element.dataset.folder;
      s.openedMail = null;
      render();
      return;
    }
    if (element.dataset.action === "mail-back") {
      s.openedMail = null;
      render();
      return;
    }
    if (element.dataset.tab) {
      s.tab = element.dataset.tab;
      s.tabTip = s.seenTabs.includes(s.tab) ? null : s.tab;
      if (s.tabTip) s.seenTabs.push(s.tab);
      render();
      return;
    }
    if (element.dataset.page) {
      s.page = element.dataset.page;
      render();
      return;
    }
    if (element.dataset.bucket) {
      s.selected = element.dataset.bucket;
      s.page = "monitor";
      render();
      return;
    }
    if (element.dataset.deleteKey !== undefined) {
      s.deleteKey = Number(element.dataset.deleteKey);
      render();
      return;
    }
    if (element.dataset.chart) {
      s.chart = element.dataset.chart;
      render();
      return;
    }
    const action = element.dataset.action;
    if (action === "panel") {
      s.panelOpen = !s.panelOpen;
      if (s.panelOpen && !s.entryStarted) {
        s.entryStarted = true;
        remember();
      }
      render();
      return;
    }
    if (action === "home") {
      clearTimeout(timer);
      s = null;
      render();
      return;
    }
    if (action === "reset") {
      choose(s.site);
      return;
    }
    if (action === "focus-step") {
      if (!s.entryStarted) {
        root.querySelector("#keeper-toolbar-toggle").click();
        return;
      }
      if (s.busy) return;
      const explainingTab = Boolean(s.tabTip);
      s.panelOpen = true;
      s.tabTip = null;
      s.tab =
        s.stage === 0
          ? "chat"
          : s.stage <= 2
            ? "tools"
            : s.stage === 3
              ? "chat"
              : s.stage <= 8
                ? "learn"
                : "chat";
      if (s.stage === 2) {
        s.detail = true;
        s.expandedTools.primary = true;
      }
      if (s.stage === 5)
        s.page =
          s.site === "mail"
            ? "inbox"
            : s.site === "wafer"
              ? "dashboard"
              : "buckets";
      if (explainingTab) {
        render();
        return;
      }
      if (s.stage === 8 && s.skill) s.expandedSkills[s.skill.id] = true;
      if (s.stage === 9) {
        s.guided = false;
        render();
        return;
      }
      if (s.stage === 5) {
        if (s.site === "minio") s.pageCreate = true;
        s.notice =
          s.site === "minio"
            ? "왼쪽에 새 보관함 이름을 입력하고 Create Bucket을 눌러주세요. 이 동작이 녹화됩니다."
            : s.site === "mail"
              ? "왼쪽 메일 검색창에 출장처럼 다른 검색어를 입력하고 검색을 눌러주세요."
              : "왼쪽 제품 선택에서 다른 제품으로 바꿔주세요. 조회 동작이 녹화됩니다.";
        render();
        const input = root.querySelector(
          s.site === "minio"
            ? "#bucket-name"
            : s.site === "mail"
              ? "#mail-search"
              : "#web-product",
        );
        input?.focus();
        input?.select?.();
        return;
      }
      render();
      const buttons = {
        0: "#discover",
        1: "#tool-detail",
        4: "#record-start",
        6: "#record-stop",
      };
      const forms = {
        2: "#validate-form",
        3: "#chat-form",
        7: "#intent-form",
        8: "#reuse-form",
      };
      if (s.stage === 1) {
        s.detail = true;
        advance("detail");
        render();
        return;
      }
      if (buttons[s.stage]) root.querySelector(buttons[s.stage])?.click();
      else if (forms[s.stage])
        root.querySelector(forms[s.stage])?.requestSubmit();
      return;
    }
    if (action === "guide") {
      s.guided = !s.guided;
      if (s.guided && s.entryStarted) {
        s.panelOpen = true;
        s.tab =
          s.stage <= 2
            ? "tools"
            : s.stage === 3
              ? "chat"
              : s.stage <= 8
                ? "learn"
                : "chat";
        if (s.stage === 0) s.tab = "chat";
      }
      render();
      return;
    }
    if (action === "back" && s.stage === 0) {
      s.entryStarted = false;
      s.panelOpen = false;
      render();
      return;
    }
    if (action === "back" && s.stage > 0) {
      clearTimeout(timer);
      s = structuredClone(checkpoints[s.stage - 1]);
      s.guided = true;
      render();
      return;
    }
    if (action === "discover") {
      clearTimeout(timer);
      s.busy = true;
      s.discoveryProgress = 0;
      s.error = "";
      s.tab = "chat";
      const tick = () => {
        s.discoveryProgress++;
        if (s.discoveryProgress < 4) {
          render();
          timer = setTimeout(tick, 650);
          return;
        }
        s.busy = false;
        s.discovered = true;
        s.messages.push({
          role: "keeper",
          text: `현재 화면에서 도구 후보 ${s.site === "mail" ? 7 : 2}개를 찾았어요. 궁금한 점을 물어보거나 후보의 구성을 확인하고 시험해보세요.`,
        });
        success("도구 후보가 준비됐어요. 대화는 바로 시작할 수 있어요.");
        advance("discover");
        render();
      };
      render();
      timer = setTimeout(tick, 650);
      return;
    }
    if (action === "tool-results") {
      const result =
        s.site === "wafer"
          ? summary()
          : s.buckets.map((b) => `${b.name} · 파일 ${b.objects}개`).join(" · ");
      s.webFeedback = { title: "현재 결과를 확인했어요", text: result };
      s.messages.push({ role: "keeper", text: result });
      render();
      return;
    }
    if (action === "detail") {
      s.tab = "tools";
      s.tabTip = null;
      s.detail = !s.detail;
      if (s.detail) advance("detail");
      render();
      return;
    }
    if (action === "open-create") {
      s.pageCreate = true;
      s.page = "buckets";
      render();
      root.querySelector("#bucket-name")?.focus();
      return;
    }
    if (action === "close-create") {
      s.pageCreate = false;
      render();
      return;
    }
    if (action === "cancel-record") {
      s.recording = false;
      s.learningNew = false;
      s.actions = [];
      s.recorded = [];
      s.skillName = "";
      s.notice = "";
      render();
      return;
    }
    if (action === "record") {
      s.learningNew = true;
      s.recording = true;
      s.actions = [];
      s.recorded = [];
      s.expandedSkills = {};
      s.skillName = "";
      s.page =
        s.site === "mail"
          ? "inbox"
          : s.site === "wafer"
            ? "dashboard"
            : "buckets";
      success("기록을 시작했어요. 왼쪽 웹앱에서 직접 작업해주세요.");
      advance("record");
      render();
      return;
    }
    if (action === "stop") {
      if (!s.actions.length) return;
      s.recording = false;
      s.recorded = structuredClone(s.actions);
      const last = s.recorded.at(-1);
      s.skillName =
        s.site === "mail"
          ? `${s.recorded.some((action) => action.kind === "mail_action") ? "나의 메일 정리" : (last.query || "전체") + " 메일 찾기"}`
          : s.site === "wafer"
            ? `${last.filter.product} 계측 조회`
            : `${last.name} 보관함 만들기`;
      s.intent =
        s.site === "mail"
          ? s.recorded.some((action) => action.kind === "mail_action")
            ? s.recorded.map((action) => action.label).join(" → ")
            : `검색창에 ‘${last.query}’를 입력해 메일 ${last.count}건을 찾고 제목을 확인했습니다. 검색어를 바꿔 같은 방식으로 메일을 찾고 싶어요.`
          : s.site === "wafer"
            ? `${last.filter.product}, ${last.filter.tool} 조건으로 CD Line Width 계측 현황을 조회하고 결과를 확인했습니다. 제품과 설비를 바꿔 같은 조회를 반복하고 싶어요.`
            : `${s.recorded.map((action) => action.name).join(", ")} 버킷을 생성하고 목록에서 확인했습니다. 새 버킷 이름으로 같은 작업을 반복하고 싶어요.`;
      success(
        "녹화 내용을 설명으로 정리했어요. 목적이나 예외를 덧붙이면 더 잘 배울 수 있어요.",
      );
      advance("stop");
      render();
      return;
    }
    if (action === "add-object") {
      const b = s.buckets.find((b) => b.name === s.selected) || s.buckets[0];
      b.objects++;
      b.size += 4;
      success(`${b.name}에 합성 객체를 추가했어요.`);
      render();
      return;
    }
    if (action === "confirm-delete") {
      s.keys.splice(s.deleteKey, 1);
      delete s.deleteKey;
      success("선택한 데모 키를 삭제했어요.");
      render();
      return;
    }
    if (action === "cancel-delete") {
      delete s.deleteKey;
      render();
      return;
    }
  });
  root.addEventListener(
    "toggle",
    (event) => {
      const row = event.target;
      if (s && row.isConnected && row.dataset.skillRow) {
        s.expandedSkills[row.dataset.skillRow] = row.open;
        if (row.open && s.skill?.id !== row.dataset.skillRow) {
          s.skill = s.skills.find((skill) => skill.id === row.dataset.skillRow);
          s.reuse = s.skill.reuse;
          s.reuseFilter = structuredClone(s.skill.reuseFilter);
          s.expandedSkills = { [s.skill.id]: true };
          render();
        }
        return;
      }
      if (s && row.isConnected && row.dataset.toolRow)
        s.expandedTools[row.dataset.toolRow] = row.open;
    },
    true,
  );
  root.addEventListener("change", (event) => {
    if (s?.site === "mail" && event.target.id === "mail-sender") {
      if (event.target.value) recordMailTool("sender", event.target.value);
      s.mailSender = event.target.value;
      s.openedMail = null;
      render();
      return;
    }
    const draft = event.target.id.match(/^(trial|reuse)-(product|tool)$/);
    if (s && draft) {
      s[draft[1] === "trial" ? "trialFilter" : "reuseFilter"][draft[2]] =
        event.target.value;
      if (draft[1] === "reuse" && s.skill)
        s.skill.reuseFilter = structuredClone(s.reuseFilter);
      return;
    }

    if (
      s?.site === "wafer" &&
      ["web-product", "web-tool"].includes(event.target.id)
    ) {
      const key = event.target.id === "web-product" ? "product" : "tool";
      s.filter[key] = event.target.value;
      if (s.recording) {
        s.actions.push({
          kind: "query_measurements",
          label: `조건 조회 · ${s.filter.product} / ${s.filter.tool}`,
          filter: structuredClone(s.filter),
        });
        advance("web");
      }
      s.error = "";
      render();
      return;
    }
    if (s && event.target.id === "monitor-bucket") {
      s.selected = event.target.value;
      render();
    }
  });
  root.addEventListener("input", (event) => {
    if (!s) return;
    const map = {
      "bucket-name": "newBucket",
      "key-name": "keyDraft",
      "mail-search": "mailDraft",
      "trial-name": "trial",
      "chat-input": "chatDraft",
      intent: "intent",
      "skill-name": "skillName",
      "reuse-name": "reuse",
    };
    if (map[event.target.id]) s[map[event.target.id]] = event.target.value;
    if (event.target.id === "reuse-name" && s.skill)
      s.skill.reuse = event.target.value;
  });
  root.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!s) return;
    const form = event.target,
      data = new FormData(form);
    const name = String(data.get("name") || "").trim();
    if (
      form.id === "chat-form" &&
      (!s.ready ||
        /^(안녕|안녕하세요|hello|hi)[!.?\s]*$/i.test(
          String(data.get("message")).trim(),
        ))
    ) {
      s.messages.push(
        { role: "user", text: String(data.get("message")) },
        {
          role: "keeper",
          text: s.ready
            ? "안녕하세요! 준비된 도구로 요청하거나 Record로 나만의 업무를 보여주세요."
            : "대화는 바로 할 수 있어요. 웹앱 작업을 실행하려면 ‘도구 후보 · 구성 확인’에서 입력과 동작을 확인하고 한 번 시험해주세요.",
        },
      );
      s.error = "";
      s.notice = "";
      render();
      return;
    }

    if (s.site === "mail" && mailSubmit(form, data)) return;
    if (s.site === "wafer" && waferSubmit(form, data)) return;
    if (form.id === "bucket-form") {
      const error = addBucket(name, "web");
      if (error) {
        fail(error);
        return;
      }
      success(`${name} 버킷이 생성됐어요.`);
      if (s.recording) advance("web");
      render();
      return;
    }
    if (form.id === "validate-form") {
      const error = addBucket(name, "validate");
      if (error) {
        fail(error);
        return;
      }
      s.ready = true;
      s.messages.push({
        role: "keeper",
        text: `시험 실행 완료. ${name} 버킷이 목록에 표시되는 것을 확인했어요. 이제 채팅으로 요청할 수 있어요.`,
      });
      success(`시험 입력 ${name}으로 검증했어요. 도구 준비 완료!`);
      if (s.stage === 1) advance("detail");
      advance("validate");
      s.tab = "chat";
      render();
      return;
    }
    if (form.id === "chat-form") {
      if (!s.ready) {
        fail("먼저 도구 후보를 시험해주세요.");
        return;
      }
      const text = String(data.get("message")).trim();
      if (/목록|조회/.test(text)) {
        s.messages.push(
          { role: "user", text },
          {
            role: "keeper",
            text: `버킷 ${s.buckets.length}개: ${s.buckets.map((b) => b.name).join(", ")}`,
          },
        );
        render();
        return;
      }
      const matches = text.match(/[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]/g);
      if (!matches) {
        fail(
          "예: launch-assets 버킷을 만들어줘. 만들 이름을 함께 입력해주세요.",
        );
        return;
      }
      const bucket = matches.at(-1);
      const error = addBucket(bucket, "chat");
      if (error) {
        fail(error);
        return;
      }
      s.messages.push(
        { role: "user", text },
        {
          role: "keeper",
          text: `${bucket} 버킷을 만들고 목록에서 확인했어요. 현재 ${s.buckets.length}개 버킷이 있어요.`,
        },
      );
      success(`왼쪽 목록에서 ${bucket}을 확인하세요.`);
      advance("chat");
      render();
      return;
    }
    if (form.id === "intent-form") {
      const intent = String(data.get("intent") || "").trim();
      if (!intent || !s.recorded.length) {
        fail("시연과 업무 의도를 먼저 입력해주세요.");
        return;
      }
      s.learningNew = false;
      s.skill = {
        name: "프로젝트 버킷 준비",
        intent,
        kind: "create_bucket",
        steps: ["create_bucket", "list_buckets"],
      };
      success("개인 Skill을 만들었어요. 다른 이름으로 재사용해보세요.");
      savePersonalSkill(data);
      advance("skill");
      render();
      return;
    }
    if (form.id === "reuse-form") {
      if (!s.skill) return;
      const error = addBucket(name, "skill");
      if (error) {
        fail(error);
        return;
      }
      s.messages.push(
        { role: "user", text: `${s.skill.name} 실행 · ${name}` },
        {
          role: "keeper",
          text: `개인 Skill로 ${name} 버킷을 만들고 목록에서 확인했어요.`,
        },
      );
      success(`Skill 재사용 완료 · ${name}이 목록에 표시됐어요.`);
      advance("reuse");
      render();
      return;
    }
    if (form.id === "key-form") {
      if (!name || s.keys.some((key) => key.name === name)) {
        fail("중복되지 않는 데모 키 이름을 입력해주세요.");
        return;
      }
      s.keySequence = (s.keySequence || 0) + 1;
      s.keys.push({ name, number: s.keySequence });
      success(`${name} 데모 키를 만들었어요.`);
      render();
    }
  });
  root.addEventListener("scroll", positionCoach, true);
  window.addEventListener("resize", () => {
    if (s) render();
  });
  render();
})();
