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
    keys: [],
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
      "새 웹앱도 Keeper와 함께",
      "Discover를 눌러 이 페이지에서 반복할 수 있는 일을 찾아보세요.",
      "#discover",
      "현재 화면을 관찰해 도구 후보를 만듭니다.",
    ],
    [
      "어떤 도구인지 먼저 살펴봐요",
      "‘구성 보기’를 눌러 입력, 작업 순서, 성공 확인 조건을 확인하세요.",
      "#tool-detail",
      "도구가 무엇을 하는지 이해한 뒤 시험합니다.",
    ],
    [
      "내 입력으로 시험해보세요",
      "새 버킷 이름을 입력하고 ‘내 탭에서 시험 실행’을 누르세요.",
      "#validate-form",
      "왼쪽 목록에 같은 이름이 생기면 준비 완료입니다.",
    ],
    [
      "이제 말로 요청해보세요",
      "아래 예시의 이름을 바꿔도 좋아요. 채팅을 전송하면 목록도 함께 바뀝니다.",
      "#chat-form",
      "입력한 이름이 채팅과 버킷 목록에 함께 나타납니다.",
    ],
    [
      "한 번 보여주면 다음엔 Skill로",
      "Record 시작을 누른 뒤 웹앱에서 버킷 하나를 직접 만들어보세요.",
      "#record-start",
      "웹앱에서 한 행동과 바뀌는 입력을 배웁니다.",
    ],
    [
      "평소처럼 웹앱을 사용하세요",
      "왼쪽 Create Bucket을 누르고, 새로운 이름으로 버킷을 만드세요.",
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
      "다른 이름으로 다시 해보세요",
      "새 이름을 넣고 Skill을 실행하세요. 방금 보여준 작업을 재사용합니다.",
      "#reuse-form",
      "새 버킷·Skill 입력·채팅 결과가 같은 값을 가리킵니다.",
    ],
    [
      "내 업무를 배우는 Keeper",
      "Discover부터 개인 Skill 재사용까지 완료했어요. 버킷 모니터링·키 관리도 자유롭게 둘러보세요.",
      "#extras",
      "오른쪽의 ‘다른 웹앱’을 선택해 새 환경도 체험할 수 있어요.",
    ],
  ];
  const waferSteps = [
    [
      "새 업무 화면을 발견해요",
      "Discover를 눌러 계측 대시보드의 조회 도구를 준비하세요.",
      "#discover",
      "제품·설비 조건과 결과 확인을 연결합니다.",
    ],
    [
      "조회 도구의 구성을 확인하세요",
      "입력 조건과 결과 확인 방법을 ‘구성 보기’에서 살펴보세요.",
      "#tool-detail",
      "파라미터·제품·설비와 계측 결과가 연결됩니다.",
    ],
    [
      "합성 조건으로 시험해보세요",
      "제품과 설비를 고르고 시험 실행을 누르세요.",
      "#validate-form",
      "왼쪽 필터·트렌드·측정 건수가 함께 바뀝니다.",
    ],
    [
      "다른 조건을 말로 요청하세요",
      "예시의 제품을 DEMO-B 또는 DEMO-C로 바꾸고 보내보세요.",
      "#chat-form",
      "같은 조회 결과가 대시보드와 채팅에 표시됩니다.",
    ],
    [
      "내 조회 방법을 보여주세요",
      "Record를 시작해 반복할 조건 설정을 보여주세요.",
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
      "새 조건으로 Skill을 실행하세요",
      "시연과 다른 제품·설비로 다시 조회하세요.",
      "#reuse-form",
      "조건에 맞는 합성 결과가 양쪽 화면에서 일치합니다.",
    ],
    [
      "새 웹앱에서도, 내 업무 방식대로",
      "조건 조회를 나만의 Skill로 재사용했어요. 관리도와 웨이퍼맵도 자유롭게 둘러보세요.",
      "#extras",
      "다른 웹앱을 선택하면 MinIO 흐름도 바로 시작할 수 있어요.",
    ],
  ];
  const steps = () => (s.site === "wafer" ? waferSteps : minioSteps);
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
    checkpoints = [];
    remember();
    render();
  }
  function header() {
    return `<header class="topbar"><button class="brand" data-action="home"><span>🦁</span> vibe zoo <small>LIVE DEMO</small></button><div class="top-actions"><span class="simulation">인터랙티브 시뮬레이션</span><a href="evidence.html">실제 실행 증거 ↗</a>${s ? '<button class="quiet" data-action="home">다른 웹앱</button><button class="quiet" data-action="reset">처음부터</button>' : ""}</div></header>`;
  }
  function landing() {
    return `${header()}<main class="landing"><div class="eyebrow">THE WEB YOU KNOW. A NEW WAY TO WORK.</div><h1>웹은 그대로.<br><em>일하는 방식은 새롭게.</em></h1><p>쓰던 웹앱에서 말하고, 한 번 보여주고,<br>나만의 업무 Skill로 다시 해보세요.</p><div class="site-choices"><button class="site-choice" data-site="minio"><span class="site-icon minio-icon">M</span><div><small>OBJECT STORAGE</small><h2>MinIO</h2><p>버킷을 만들고, 프로젝트 준비를 Skill로.</p><strong>약 3분 · 체험 시작 →</strong></div></button><button class="site-choice" data-site="wafer"><span class="site-icon wafer-icon">Si</span><div><small>SEMICONDUCTOR METROLOGY</small><h2>WaferSight</h2><p>조건을 바꾸고, 계측 결과를 한눈에.</p><strong>약 3분 · 체험 시작 →</strong></div></button></div><p class="landing-note">설치·계정·API 키 없이 바로 시작합니다.<br>모든 데이터와 실행은 브라우저 안의 합성 시뮬레이션입니다.</p><div class="zoo-art" aria-hidden="true">🌳 <span>🦒</span> 🌿</div></main>`;
  }
  function guide() {
    const [title, description, target, result] = steps()[s.stage];
    return `<section class="guide ${s.guided ? "" : "free-guide"}" aria-label="체험 안내"><div class="guide-head"><span class="eyebrow">${s.guided ? `GUIDED TOUR · ${String(s.stage + 1).padStart(2, "0")} / ${steps().length}` : "FREE EXPLORATION"}</span><button class="quiet" data-action="guide">${s.guided ? "안내 건너뛰기" : "가이드 이어가기"}</button></div><h2>${s.guided ? title : "내 방식대로 둘러보세요"}</h2><p>${s.guided ? description : "Discover로 도구를 준비하고 채팅·Record·Skill을 자유롭게 사용하세요. 왼쪽 웹앱도 직접 조작할 수 있어요."}</p>${s.guided ? `<div class="expected"><span>확인할 결과</span> ${result}</div><div class="guide-footer"><button class="quiet" data-action="back" ${s.stage === 0 || s.busy ? "disabled" : ""}>← 이전 단계</button><button class="quiet" data-action="focus-step">${s.stage === 9 ? "체험 완료 ✓" : "할 일 위치로 →"}</button></div>` : ""}</section>`;
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
      )}<small class="nav-bottom">Console · demo-user<br>합성 데이터</small></aside><section class="web-main"><div class="web-heading"><div><p class="breadcrumb">Console / ${s.page === "keys" ? "Access Keys" : s.page === "monitor" ? "Monitoring" : "Object Browser"}</p><h2>${s.page === "keys" ? "Access Keys" : s.page === "monitor" ? "Bucket Monitoring" : "Object Browser"}</h2></div><span class="web-badge">DEMO</span></div>${s.page === "buckets" ? `<div class="stats"><div><span>BUCKETS</span><strong>${s.buckets.length}</strong></div><div><span>OBJECTS</span><strong>${total}</strong></div><div><span>STORAGE</span><strong>${s.buckets.reduce((a, b) => a + b.size, 0)} <small>MB</small></strong></div></div><div id="web-action" class="web-action"><div class="section-heading"><h3>Buckets <span>${s.buckets.length}</span></h3><button class="web-button" data-action="open-create">＋ Create Bucket</button></div>${s.pageCreate ? bucketForm() : ""}</div><div class="table-wrap"><table><thead><tr><th>BUCKET NAME</th><th>ACCESS</th><th>OBJECTS</th><th>SIZE</th></tr></thead><tbody>${s.buckets.map((b) => `<tr class="${s.highlight === b.name ? "new-row" : ""}"><td><button class="bucket-link" data-bucket="${esc(b.name)}">▱ ${esc(b.name)}</button></td><td><span class="private">Private</span></td><td>${b.objects}</td><td>${b.size} MB</td></tr>`).join("")}</tbody></table></div><p class="web-footnote">버킷을 누르면 해당 버킷의 모니터링 정보를 볼 수 있어요.</p>` : s.page === "monitor" ? monitor() : keys()}</section></div>`;
  }
  function monitor() {
    const b = s.buckets.find((b) => b.name === s.selected) || s.buckets[0];
    return `<label class="field">Bucket<select id="monitor-bucket">${s.buckets.map((x) => `<option ${x.name === b.name ? "selected" : ""}>${esc(x.name)}</option>`).join("")}</select></label><div class="stats"><div><span>OBJECTS</span><strong>${b.objects}</strong></div><div><span>STORAGE</span><strong>${b.size}<small> MB</small></strong></div></div><div class="chart-card"><h3>${esc(b.name)} · 사용 현황</h3><div class="usage-bar"><span style="width:${Math.max(1, Math.min(100, b.size / 2))}%"></span></div><p>${b.objects === 0 ? "새 버킷은 아직 비어 있어요." : "합성 객체와 용량을 보여줍니다."}</p><button class="secondary" data-action="add-object">합성 객체 1개 추가 · 4 MB</button></div><p class="web-footnote">추가한 객체 수와 용량은 Object Browser에도 반영됩니다. 합성 데이터이며 실제 서버 지표가 아닙니다.</p>`;
  }
  function keys() {
    return `<p class="web-description">이 데모 안에서만 사용하는 Access Key를 만들고 삭제해보세요.</p><form id="key-form" class="inline-form"><label for="key-name">Key Name</label><input id="key-name" name="name" placeholder="demo-reader" required maxlength="40"><button class="web-button">Create Access Key</button></form><div class="table-wrap"><table><thead><tr><th>NAME</th><th>ACCESS KEY</th><th>STATUS</th><th></th></tr></thead><tbody>${s.keys.map((key, i) => `<tr><td>${esc(key.name)}</td><td><code>DEMO-ONLY-${String(key.number).padStart(3, "0")}</code></td><td>Enabled</td><td><button class="danger" data-delete-key="${i}">Delete</button></td></tr>`).join("") || '<tr><td colspan="4">아직 발급한 데모 키가 없습니다.</td></tr>'}</tbody></table></div>${s.deleteKey !== undefined ? `<div class="confirm-box"><p><strong>${esc(s.keys[s.deleteKey]?.name)}</strong> 데모 키를 삭제할까요?</p><button class="danger" data-action="confirm-delete">이 키 삭제</button><button class="quiet" data-action="cancel-delete">취소</button></div>` : ""}<p class="web-footnote">실제 인증에 쓸 수 없는 합성 키입니다. Secret Key를 발급하거나 저장하지 않습니다.</p>`;
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
  function waferTools() {
    return `<div class="asset-card"><div class="asset-top"><span class="tool-icon">▥</span><div><h3>계측 조건 조회</h3><small>MCP TOOL · browser</small></div><span class="pill ${s.ready ? "ready" : ""}">${s.ready ? "준비 완료" : "시험 필요"}</span></div><p>제품·설비 조건을 적용하고 계측 결과를 확인합니다.</p><button id="tool-detail" class="text-button" data-action="detail" aria-expanded="${s.detail}">도구·Skill 구성 보기 ${s.detail ? "−" : "＋"}</button>${s.detail ? waferToolDetails() : ""}${!s.ready && s.detail ? `<form id="validate-form" class="test-form">${filterFields("trial", { product: "DEMO-A", tool: "ETCH-01" })}<p>조건과 합성 조회 결과를 함께 확인합니다.</p><button>내 탭에서 시험 실행</button></form>` : ""}</div><details class="asset-card"><summary>계측 결과 요약 <span class="pill">읽기</span></summary><p>현재 조건의 측정 건수와 평균, 규격 범위 밖의 OOS 표본을 요약합니다.</p></details>`;
  }
  function waferLearn() {
    return `<div class="learn-intro"><span>◉</span><h3>매일 하던 조회를 나만의 Skill로.</h3><p>제품·설비를 바꾸는 시연과 조회 목적을 연결합니다.</p></div>${!s.recording ? `<button id="record-start" class="secondary full" data-action="record" ${!s.ready ? "disabled" : ""}>● Record 시작</button>` : `<div class="recording"><span class="record-dot"></span>기록 중 · ${s.actions.length}개 행동</div><ol class="record-actions">${s.actions.map((action) => `<li>${esc(action.label)}</li>`).join("") || "<li>왼쪽 제품이나 설비를 다른 값으로 바꾸세요.</li>"}</ol><button id="record-stop" class="full" data-action="stop" ${!s.actions.length ? "disabled" : ""}>■ Record 종료</button>`}${s.recorded.length && !s.recording ? `<form id="intent-form" class="test-form"><label for="intent">녹화 내용을 정리했어요. 설명을 덧붙여주세요.</label><textarea id="intent" name="intent" required placeholder="매일 제품별 계측 현황을 확인하고 싶어요.">${esc(s.intent)}</textarea><p>시연 ${s.recorded.length}개 행동 · 제품과 설비를 바뀌는 입력으로 연결합니다.</p><button>개인 Skill 만들기</button></form>` : ""}${s.skill ? `<div class="asset-card skill-card"><span class="eyebrow">MY SKILL</span><h3>${esc(s.skill.name)}</h3><p>${esc(s.skill.intent)}</p><details><summary>Skill 구성 보기</summary><ol><li>입력: product, tool</li><li>계측 조건 조회 도구에 연결</li><li>선택 조건과 결과 목록 확인</li></ol></details><form id="reuse-form" class="test-form">${filterFields("reuse", { product: "DEMO-C", tool: "ETCH-01" })}<button>이 입력으로 Skill 실행</button></form></div>` : ""}`;
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
      s.skill = {
        name: "제품별 계측 현황 조회",
        intent,
        kind: "query_measurements",
        steps: ["query_measurements", "summarize_measurements"],
      };
      success("조회 Skill을 만들었어요. 다른 조건으로 재사용하세요.");
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
  function toolsPanel() {
    if (s.site === "wafer" && s.discovered) return waferTools();
    if (!s.discovered)
      return `<div class="empty-state"><span>🌿</span><h3>아직 도구가 없어요</h3><p>Discover로 이 페이지의 업무를 찾아보세요.</p></div>`;
    return `<div class="asset-card"><div class="asset-top"><span class="tool-icon">⚒</span><div><h3>${toolName()}</h3><small>MCP TOOL · browser</small></div><span class="pill ${s.ready ? "ready" : ""}">${s.ready ? "준비 완료" : "시험 필요"}</span></div><p>새 이름으로 버킷을 만들고 목록에서 결과를 확인합니다.</p><button id="tool-detail" class="text-button" data-action="detail" aria-expanded="${s.detail}">도구·Skill 구성 보기 ${s.detail ? "−" : "＋"}</button>${s.detail ? toolDetails() : ""}${!s.ready && s.detail ? `<form id="validate-form" class="test-form"><label for="trial-name">시험할 버킷 이름</label><input id="trial-name" name="name" value="${esc(s.trial)}" required><p>시험 실행도 왼쪽 합성 데이터에 반영됩니다.</p><button ${s.busy ? "disabled" : ""}>내 탭에서 시험 실행</button></form>` : ""}</div><details class="asset-card"><summary>버킷 목록 조회 <span class="pill">읽기</span></summary><p>추가 입력 없이 현재 버킷 이름·객체 수를 확인합니다.</p></details>`;
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
    return `${s.ready ? "" : `<div class="welcome-art" aria-hidden="true"><span class="tree">♣</span><span>🦁</span><span class="tree small">♣</span></div><h2 class="welcome-title">이 웹에서도,<br>말로 일할 수 있을까요?</h2><p class="muted">Keeper가 현재 페이지를 살펴보고<br>반복할 일을 도구로 준비해요.</p>`}${messages()}${s.discovered && !s.ready ? '<button id="tool-detail" class="secondary full" data-action="detail">도구 후보 2개 · 구성 확인 →</button>' : ""}${s.discovered ? `<form id="chat-form" class="chat-form"><label for="chat-input">Keeper에게 요청하기</label><textarea id="chat-input" name="message" rows="2" required>${esc(s.chatDraft)}</textarea><div><small>${s.site === "wafer" ? "예: DEMO-C, ETCH-01 조건으로 조회해줘" : "예: launch-assets 버킷을 만들어줘"}</small><button aria-label="요청 보내기">보내기 ↑</button></div></form>` : ""}`;
  }
  function learnPanel() {
    if (s.site === "wafer") return waferLearn();
    return `<div class="learn-intro"><span>◉</span><h3>한 번 보여주면, 다음엔 Skill로.</h3><p>웹앱에서 시연하고 반복하려는 의도를 알려주세요.</p></div>${!s.recording ? `<button id="record-start" class="secondary full" data-action="record" ${!s.ready ? "disabled" : ""}>● Record 시작</button>${!s.ready ? '<p class="muted">먼저 Discover에서 도구를 시험해주세요.</p>' : ""}` : `<div class="recording"><span class="record-dot"></span>기록 중 · ${s.actions.length}개 행동</div><ol class="record-actions">${s.actions.map((a) => `<li>${esc(a.label)}</li>`).join("") || "<li>왼쪽 웹앱에서 업무를 수행해주세요.</li>"}</ol><button id="record-stop" class="full" data-action="stop" ${!s.actions.length ? "disabled" : ""}>■ Record 종료</button>`}${s.recorded.length && !s.recording ? `<form id="intent-form" class="test-form"><label for="intent">녹화 내용을 정리했어요. 설명을 덧붙여주세요.</label><textarea id="intent" name="intent" required placeholder="프로젝트마다 새 버킷을 만들고 확인하고 싶어요.">${esc(s.intent)}</textarea><p>시연 ${s.recorded.length}개 행동 · 이름은 매번 바뀌는 입력으로 연결합니다.</p><button>개인 Skill 만들기</button></form>` : ""}${s.skill ? `<div class="asset-card skill-card"><span class="eyebrow">MY SKILL</span><h3>${esc(s.skill.name)}</h3><p>${esc(s.skill.intent)}</p><details><summary>Skill 구성 보기</summary><ol><li>입력: bucketName</li><li>버킷 생성 도구에 연결</li><li>목록에 입력한 이름이 있는지 확인</li></ol></details><form id="reuse-form" class="test-form"><label for="reuse-name">이번에 사용할 새 버킷 이름</label><input id="reuse-name" name="name" value="${esc(s.reuse)}" required><button>이 입력으로 Skill 실행</button></form></div>` : ""}`;
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
    return `<aside class="keeper"><div class="keeper-brand"><span>🦁</span><div><strong>Keeper</strong><small>by vibe zoo · 시뮬레이션</small></div><span class="habitat">${s.site === "minio" ? "MinIO" : "WaferSight"}</span></div>${guide()}<nav class="keeper-tabs" aria-label="Keeper 메뉴">${[
      ["chat", "대화"],
      ["tools", "도구"],
      ["learn", "가르치기"],
    ]
      .map(
        ([tab, label]) =>
          `<button data-tab="${tab}" aria-selected="${s.tab === tab}">${label}${tab === "tools" && s.discovered ? "<span>2</span>" : ""}</button>`,
      )
      .join(
        "",
      )}</nav><div class="keeper-body">${s.error ? `<p class="error" role="alert">${esc(s.error)}</p>` : ""}${s.notice ? `<p class="notice" role="status">${esc(s.notice)}</p>` : ""}${!s.discovered ? `<button id="discover" class="full discover-button" data-action="discover" ${s.busy ? "disabled" : ""}>${s.busy ? "화면 관찰 → 후보 구성 중…" : s.discovered ? "Discover 다시 살펴보기" : "✧ Discover · 도구 준비"}</button>` : ""}${s.busy ? discoveryProgress() : ""}${s.tab === "tools" ? toolsPanel() : s.tab === "learn" ? learnPanel() : chatPanel()}<div id="extras" class="extras"><span class="eyebrow">EXPLORE MORE</span>${s.site === "wafer" ? '<button data-page="dashboard">계측 대시보드 ↗</button><button data-page="wafermap">웨이퍼맵 ↗</button>' : '<button data-page="monitor">버킷별 모니터링 ↗</button><button data-page="keys">Access Key 발급·삭제 ↗</button>'}</div></div></aside>`;
  }
  function render() {
    if (!s) {
      root.innerHTML = landing();
      return;
    }
    root.innerHTML = `${header()}<main class="experience"><div class="experience-caption"><p>웹은 그대로. <strong>Keeper가 업무를 배웁니다.</strong></p><span>데이터·도구·Skill이 연결된 합성 체험</span></div><div class="workspace"><section class="browser" aria-label="합성 웹앱"><div class="browser-bar"><div class="lights" aria-hidden="true"><i></i><i></i><i></i></div><span class="address">◈ ${s.site === "minio" ? "minio.demo / browser" : "wafersight.demo / dashboard"}</span><span class="browser-status">${s.ready ? "● 도구 준비 완료" : s.discovered ? "◐ 후보 시험 필요" : "○ 첫 방문 · 도구 없음"}</span></div>${s.site === "wafer" ? wafer() : minio()}</section>${keeper()}</div></main>`;
    if (s.guided) {
      const target = root.querySelector(steps()[s.stage][2]);
      target?.classList.add("focus-target");
      if (target && s.stage !== 5)
        target.scrollIntoView?.({ block: "nearest", behavior: "instant" });
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
    if (element.dataset.tab) {
      s.tab = element.dataset.tab;
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
      if (s.stage === 2) s.detail = true;
      if (s.stage === 5) s.page = s.site === "wafer" ? "dashboard" : "buckets";
      render();
      return;
    }
    if (action === "guide") {
      s.guided = !s.guided;
      if (s.guided) {
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
          text: "현재 화면에서 도구 후보 2개를 찾았어요. 궁금한 점을 물어보거나 후보의 구성을 확인하고 시험해보세요.",
        });
        success("도구 후보가 준비됐어요. 대화는 바로 시작할 수 있어요.");
        advance("discover");
        render();
      };
      render();
      timer = setTimeout(tick, 650);
      return;
    }
    if (action === "detail") {
      s.tab = "tools";
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
    if (action === "record") {
      s.recording = true;
      s.actions = [];
      s.recorded = [];
      s.page = s.site === "wafer" ? "dashboard" : "buckets";
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
      s.intent =
        s.site === "wafer"
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
  root.addEventListener("change", (event) => {
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
      "trial-name": "trial",
      "chat-input": "chatDraft",
      intent: "intent",
      "reuse-name": "reuse",
    };
    if (map[event.target.id]) s[map[event.target.id]] = event.target.value;
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
      s.skill = {
        name: "프로젝트 버킷 준비",
        intent,
        kind: "create_bucket",
        steps: ["create_bucket", "list_buckets"],
      };
      success("개인 Skill을 만들었어요. 다른 이름으로 재사용해보세요.");
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
  render();
})();
