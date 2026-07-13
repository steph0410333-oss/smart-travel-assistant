let map = null;
let placeCatalog = [];
let merchantMarkers = [];
let hasActiveResult = false;
let currentLanguage = "zh-Hant";
const DEFAULT_MAP_VIEW = { center: [25.0478, 121.517], zoom: 13 };

const translations = {
  "zh-Hant": {
    appTitle: "智慧出行小幫手", help: "說明", searchEntry: "搜尋地點，或告訴 AI 你想去哪裡",
    clearResult: "清除結果", defaultKicker: "尚未選擇地點", defaultTitle: "從地圖探索現在適合去哪裡",
    defaultDescription: "選擇目的地後，我們會分析最近捷運站的人流，協助你判斷現在是否適合前往。",
    normalSearch: "普通搜尋", aiRecommendation: "AI 推薦", startAnalysis: "開始分析",
    touristHelper: "FOR VISITORS", balanceTitle: "餘額智慧推薦",
    balanceDescription: "輸入模擬悠遊卡／悠遊付餘額，找出餘額可負擔的消費選擇。",
    balanceAction: "推薦", balanceDisclaimer: "未連接真實帳戶；餘額、商家與價格皆為 Prototype 模擬資料。",
    placePlaceholder: "輸入目的地，例如台北小巨蛋", balanceEmpty: "此餘額目前沒有可推薦的模擬消費選擇。",
    remaining: "估計消費後餘額", nearestStation: "最近捷運站", update: "更新",
  },
  en: {
    appTitle: "Smart Travel Assistant", help: "Help", searchEntry: "Search a place or tell AI where you want to go",
    clearResult: "Clear result", defaultKicker: "No place selected", defaultTitle: "Explore a comfortable place to visit",
    defaultDescription: "Choose a destination to check crowd conditions near its closest metro station.",
    normalSearch: "Place Search", aiRecommendation: "AI Picks", startAnalysis: "Analyze",
    touristHelper: "FOR VISITORS", balanceTitle: "Balance-friendly picks",
    balanceDescription: "Enter a mock EasyCard/EasyWallet balance to find affordable spending ideas.",
    balanceAction: "Recommend", balanceDisclaimer: "Not connected to a real account. Balances, merchants and prices are prototype data.",
    placePlaceholder: "Enter a destination, e.g. Taipei Arena", balanceEmpty: "No prototype option is affordable with this balance.",
    remaining: "Estimated balance after spending", nearestStation: "Nearest metro", update: "updated",
  },
  ja: {
    appTitle: "スマート移動アシスタント", help: "ヘルプ", searchEntry: "場所を検索、またはAIに希望を伝える",
    clearResult: "結果をクリア", defaultKicker: "場所が選択されていません", defaultTitle: "快適に行ける場所を探す",
    defaultDescription: "目的地を選ぶと、最寄りのMRT駅周辺の混雑状況を確認できます。",
    normalSearch: "場所検索", aiRecommendation: "AIおすすめ", startAnalysis: "分析する",
    touristHelper: "旅行者向け", balanceTitle: "残高でおすすめ",
    balanceDescription: "模擬EasyCard／EasyWallet残高を入力して、利用可能な候補を探します。",
    balanceAction: "おすすめ", balanceDisclaimer: "実際の口座には接続していません。残高・店舗・価格は試作データです。",
    placePlaceholder: "目的地を入力（例：台北アリーナ）", balanceEmpty: "この残高で利用できる模擬候補はありません。",
    remaining: "利用後の推定残高", nearestStation: "最寄りMRT", update: "更新",
  },
  ko: {
    appTitle: "스마트 여행 도우미", help: "도움말", searchEntry: "장소를 검색하거나 AI에게 원하는 곳을 말해 주세요",
    clearResult: "결과 지우기", defaultKicker: "선택한 장소 없음", defaultTitle: "지금 편하게 갈 수 있는 곳 찾기",
    defaultDescription: "목적지를 선택하면 가장 가까운 MRT역 주변의 혼잡도를 분석합니다.",
    normalSearch: "장소 검색", aiRecommendation: "AI 추천", startAnalysis: "분석하기",
    touristHelper: "여행자용", balanceTitle: "잔액 맞춤 추천",
    balanceDescription: "모의 EasyCard/EasyWallet 잔액을 입력해 이용 가능한 소비 선택지를 확인하세요.",
    balanceAction: "추천", balanceDisclaimer: "실제 계정과 연결되지 않았으며 잔액, 가맹점, 가격은 프로토타입 데이터입니다.",
    placePlaceholder: "목적지 입력 (예: 타이베이 아레나)", balanceEmpty: "이 잔액으로 이용 가능한 모의 추천이 없습니다.",
    remaining: "사용 후 예상 잔액", nearestStation: "가장 가까운 MRT", update: "업데이트",
  },
};

function t(key) {
  return translations[currentLanguage]?.[key] || translations["zh-Hant"][key] || key;
}

if (typeof L !== "undefined") {
  map = L.map("map", { zoomControl: false }).setView([25.0478, 121.517], 13);

  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap contributors",
  }).addTo(map);

  L.control.zoom({ position: "bottomright" }).addTo(map);
}

const searchScreen = document.querySelector("#search-screen");
const searchTitle = document.querySelector("#search-title");
const normalPanel = document.querySelector("#normal-panel");
const aiPanel = document.querySelector("#ai-panel");
const bottomSheet = document.querySelector(".bottom-sheet");
const sheetHandle = document.querySelector("#sheet-handle");

function setSheetState(state) {
  bottomSheet.classList.remove("is-collapsed", "is-half", "is-expanded");
  bottomSheet.classList.add(`is-${state}`);
  bottomSheet.dataset.sheetState = state;
  sheetHandle.setAttribute("aria-expanded", String(state !== "collapsed"));
  if (state !== "collapsed") bottomSheet.style.height = "";
  window.setTimeout(() => map?.invalidateSize(), 260);
}

function cycleSheetState() {
  const next = { collapsed: "half", half: "expanded", expanded: "collapsed" }[bottomSheet.dataset.sheetState] || "half";
  setSheetState(next);
}

function setupSheetDrag() {
  let startY = 0;
  let startHeight = 0;
  let moved = false;
  sheetHandle.addEventListener("pointerdown", (event) => {
    startY = event.clientY;
    startHeight = bottomSheet.getBoundingClientRect().height;
    moved = false;
    bottomSheet.classList.add("is-dragging");
    sheetHandle.setPointerCapture(event.pointerId);
  });
  sheetHandle.addEventListener("pointermove", (event) => {
    if (!bottomSheet.classList.contains("is-dragging")) return;
    const delta = startY - event.clientY;
    if (Math.abs(delta) > 4) moved = true;
    const minHeight = 150;
    const maxHeight = window.innerHeight - 150;
    bottomSheet.style.height = `${Math.max(minHeight, Math.min(maxHeight, startHeight + delta))}px`;
  });
  sheetHandle.addEventListener("pointerup", (event) => {
    bottomSheet.classList.remove("is-dragging");
    sheetHandle.releasePointerCapture(event.pointerId);
    const height = bottomSheet.getBoundingClientRect().height;
    bottomSheet.style.height = "";
    if (!moved) return cycleSheetState();
    if (height < window.innerHeight * 0.3) setSheetState("collapsed");
    else if (height > window.innerHeight * 0.62) setSheetState("expanded");
    else setSheetState("half");
  });
}

function applyLanguage(language) {
  currentLanguage = translations[language] ? language : "zh-Hant";
  document.documentElement.lang = currentLanguage;
  document.title = t("appTitle");
  document.querySelector(".top-bar h1").textContent = t("appTitle");
  document.querySelector("#open-search span:last-child").textContent = t("searchEntry");
  document.querySelector("#map-language-button").textContent = { "zh-Hant": "繁中", en: "EN", ja: "日本語", ko: "한국어" }[currentLanguage];
  document.querySelectorAll("[data-i18n]").forEach((element) => { element.textContent = t(element.dataset.i18n); });
  document.querySelector('[data-mode="normal"]').textContent = t("normalSearch");
  document.querySelector('[data-mode="ai"]').textContent = t("aiRecommendation");
  document.querySelector("#normal-submit").textContent = t("startAnalysis");
  document.querySelector("#place-input").placeholder = t("placePlaceholder");
  document.querySelectorAll("#language-menu button").forEach((button) => button.classList.toggle("is-active", button.dataset.language === currentLanguage));
  if (!hasActiveResult) resetResult(false);
  setMode(aiPanel.hidden ? "normal" : "ai");
}

function toggleLanguageMenu() {
  const menu = document.querySelector("#language-menu");
  menu.hidden = !menu.hidden;
}

function openSearch() {
  searchScreen.classList.add("is-open");
  searchScreen.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function closeSearch() {
  searchScreen.classList.remove("is-open");
  searchScreen.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

function setMode(mode) {
  const isAiMode = mode === "ai";
  searchTitle.textContent = isAiMode ? t("aiRecommendation") : t("normalSearch");
  normalPanel.hidden = isAiMode;
  aiPanel.hidden = !isAiMode;

  document.querySelectorAll(".mode-tab").forEach((tab) => {
    const isActive = tab.dataset.mode === mode;
    tab.classList.toggle("is-active", isActive);
    tab.setAttribute("aria-selected", String(isActive));
  });
}

function showPrototypeResult(title, description) {
  document.querySelector("#sheet-kicker").textContent = "PROTOTYPE RESULT";
  document.querySelector("#sheet-title").textContent = title;
  document.querySelector("#sheet-description").textContent = description;
  closeSearch();
}

function crowdColor(index) {
  if (index >= 75) return "#d44d3f";
  if (index >= 55) return "#ee9b35";
  if (index >= 35) return "#e4c34f";
  return "#39a875";
}

function crowdPresentation(index) {
  if (index >= 80) return { label: "非常擁擠", level: "level-critical", people: 4 };
  if (index >= 60) return { label: "人流偏高", level: "level-high", people: 3 };
  if (index >= 40) return { label: "人流普通", level: "level-medium", people: 2 };
  return { label: "人流較少", level: "level-low", people: 1 };
}

function comfortPresentation(status) {
  const presentations = {
    舒適: { level: "level-low" },
    尚可: { level: "level-medium" },
    偏擠: { level: "level-high" },
    擁擠: { level: "level-critical" },
  };
  return presentations[status] || { level: "level-medium" };
}

function decisionPresentation(status) {
  const decisions = {
    舒適: "適合前往",
    尚可: "可以前往，留意人潮",
    偏擠: "建議錯峰或比較替代地點",
    擁擠: "目前不建議前往",
  };
  return decisions[status] || "請查看分析結果";
}

function setMetricLevel(element, level) {
  element.classList.remove("level-low", "level-medium", "level-high", "level-critical");
  element.classList.add(level);
}

function renderAnalysis(result) {
  const station = result.nearest_station;
  const comfort = result.comfort;
  const crowd = crowdPresentation(comfort.factors.effective_crowd_index);
  const comfortDisplay = comfortPresentation(comfort.status);
  hasActiveResult = true;
  document.querySelector("#reset-map").hidden = false;
  document.querySelector("#sheet-kicker").textContent = `${result.resolved_place.place_name} · 最近捷運站`;
  document.querySelector("#sheet-title").textContent = station.station_name;
  document.querySelector("#sheet-description").textContent = `你搜尋的目的地距離最近捷運站約 ${station.distance_m} 公尺。`;
  document.querySelector("#decision-label").textContent = decisionPresentation(comfort.status);
  document.querySelector("#decision-summary").textContent = comfort.advice;
  const reasons = document.querySelector("#comfort-reasons");
  reasons.replaceChildren(...comfort.reasons.slice(0, 3).map((reason) => {
    const item = document.createElement("li");
    item.textContent = reason;
    return item;
  }));
  reasons.hidden = false;
  const crowdCard = document.querySelector("#crowd-status");
  const comfortCard = document.querySelector("#comfort-status");
  setMetricLevel(crowdCard, crowd.level);
  setMetricLevel(comfortCard, comfortDisplay.level);
  document.querySelector("#crowd-visual").dataset.level = String(crowd.people);
  document.querySelector("#crowd-label").textContent = crowd.label;
  document.querySelector("#comfort-score").textContent = comfort.comfort_score;
  document.querySelector("#comfort-gauge").style.setProperty("--score-angle", `${comfort.comfort_score * 3.6}deg`);
  comfortCard.setAttribute("aria-label", `舒適度 ${comfort.comfort_score} 分，${comfort.status}`);
  crowdCard.setAttribute("aria-label", `人流狀態 ${crowd.label}`);
  document.querySelector("#updated-time").textContent = station.updated_at.slice(11, 16) + " 更新";
  document.querySelector("#recommendation-section").hidden = true;
  renderMerchants(result.nearby_merchants || [], result.merchant_summary);
  if (map) map.setView([station.latitude, station.longitude], 15);
  setSheetState("half");
  closeSearch();
}

function resetResult(clearInputs = true) {
  hasActiveResult = false;
  document.querySelector("#reset-map").hidden = true;
  document.querySelector("#sheet-kicker").textContent = t("defaultKicker");
  document.querySelector("#sheet-title").textContent = t("defaultTitle");
  document.querySelector("#sheet-description").textContent = t("defaultDescription");
  document.querySelector("#decision-label").textContent = t("defaultKicker");
  document.querySelector("#decision-summary").textContent = t("defaultDescription");
  document.querySelector("#comfort-score").textContent = "--";
  document.querySelector("#comfort-gauge").style.setProperty("--score-angle", "0deg");
  document.querySelector("#crowd-visual").dataset.level = "0";
  document.querySelector("#crowd-label").textContent = "--";
  document.querySelector("#updated-time").textContent = "--";
  document.querySelector("#comfort-reasons").hidden = true;
  document.querySelector("#merchant-section").hidden = true;
  document.querySelector("#recommendation-section").hidden = true;
  if (clearInputs) {
    document.querySelector("#place-input").value = "";
    document.querySelector("#ai-prompt").value = "";
    document.querySelectorAll(".choice-chip.is-selected, .suggestion-chip.is-selected").forEach((item) => item.classList.remove("is-selected"));
  }
  map?.setView(DEFAULT_MAP_VIEW.center, DEFAULT_MAP_VIEW.zoom);
  setSheetState("collapsed");
}

async function recommendBalance() {
  const balance = Number(document.querySelector("#balance-input").value);
  if (!Number.isFinite(balance) || balance < 0) return;
  const response = await fetch("/api/balance-recommend", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ balance, limit: 3 }),
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.detail || "Balance recommendation failed");
  const results = document.querySelector("#balance-results");
  results.replaceChildren();
  if (!payload.recommendations.length) {
    const empty = document.createElement("p");
    empty.className = "balance-result";
    empty.textContent = t("balanceEmpty");
    results.append(empty);
  } else {
    payload.recommendations.forEach((item) => {
      const card = document.createElement("div");
      card.className = "balance-result";
      card.innerHTML = `<strong>${item.merchant_name}</strong><span>${item.category} · ${item.price_range}</span><span>${t("remaining")}: NT$${item.estimated_remaining}</span>`;
      results.append(card);
    });
  }
  results.hidden = false;
  setSheetState("expanded");
}

function merchantSummaryText(merchants, summary) {
  if (!merchants.length) return "此地點 700 公尺內目前沒有 Mock 商家資料。";
  const counts = summary?.category_counts || merchants.reduce((result, merchant) => {
    result[merchant.category] = (result[merchant.category] || 0) + 1;
    return result;
  }, {});
  const categoryText = Object.entries(counts).map(([category, count]) => `${category} ${count} 間`).join("、");
  return `附近找到 ${merchants.length} 間：${categoryText}。`;
}

function renderMerchants(merchants, summary = null) {
  const section = document.querySelector("#merchant-section");
  const list = document.querySelector("#merchant-list");
  document.querySelector("#merchant-summary").textContent = merchantSummaryText(merchants, summary);
  list.replaceChildren();

  merchants.forEach((merchant) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "merchant-card";
    const distanceText = Number.isFinite(merchant.distance_m)
      ? ` · ${merchant.distance_m} 公尺／步行約 ${merchant.walking_minutes} 分鐘`
      : "";
    const offer = merchant.discount_available
      ? merchant.discount_text
      : "可使用悠遊付（模擬）";
    card.innerHTML = `
      <span class="merchant-logo" aria-hidden="true">悠</span>
      <span>
        <h4>${merchant.merchant_name}</h4>
        <p class="merchant-meta">${merchant.category}${distanceText}</p>
        <p class="merchant-meta">${merchant.price_range} · ${merchant.business_hours}</p>
        <p class="merchant-offer">${offer}</p>
      </span>
    `;
    card.addEventListener("click", () => {
      if (map) map.setView([merchant.latitude, merchant.longitude], 17);
      const marker = merchantMarkers.find((item) => item.merchantId === merchant.merchant_id);
      marker?.marker.openTooltip();
    });
    list.append(card);
  });
  section.hidden = false;
}

function renderRecommendations(payload, activeIndex = 0) {
  const section = document.querySelector("#recommendation-section");
  const list = document.querySelector("#recommendation-list");
  const modeBadge = document.querySelector("#agent-mode-badge");
  modeBadge.textContent = payload.llm_enabled ? "GEMINI AI · 模擬資料" : "規則備援 · 模擬資料";
  modeBadge.title = payload.limitations || "";
  document.querySelector("#agent-summary").textContent = payload.personalized_summary || "";
  const traceList = document.querySelector("#agent-trace-list");
  traceList.replaceChildren(...(payload.workflow_trace || []).map((step) => {
    const item = document.createElement("li");
    const tool = document.createElement("strong");
    tool.textContent = `${step.tool}：`;
    item.append(tool, document.createTextNode(step.summary));
    return item;
  }));
  list.replaceChildren();

  payload.recommendations.forEach((item, index) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = `recommendation-card${index === activeIndex ? " is-active" : ""}`;
    card.innerHTML = `
      <span class="rank">TOP ${index + 1} · 符合度 ${item.recommendation_score}</span>
      <h4>${item.resolved_place.place_name}</h4>
      <p class="station-line">${item.nearest_station.station_name} · ${item.comfort.status}</p>
      <p class="reason-line">${item.recommendation_reasons.slice(0, 2).join("；")}</p>
    `;
    card.addEventListener("click", () => {
      renderAnalysis(item);
      renderRecommendations(payload, index);
    });
    list.append(card);
  });
  section.hidden = false;
}

async function analyzePlace(placeName) {
  const response = await fetch("/api/analyze-place", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      place: placeName,
      time: document.querySelector('input[type="time"]').value,
      preferences: [...document.querySelectorAll(".choice-chip.is-selected")].map((item) => item.textContent),
    }),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.detail || "地點分析失敗");
  renderAnalysis(result);
}

function renderPlaceSuggestions(query = "") {
  const panel = document.querySelector("#place-suggestions");
  const normalized = query.trim().toLowerCase();
  const matches = placeCatalog
    .filter((place) => !normalized || place.place_name.toLowerCase().includes(normalized) || place.aliases.some((alias) => alias.toLowerCase().includes(normalized)))
    .slice(0, 6);

  panel.replaceChildren();
  matches.forEach((place) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "place-suggestion";
    button.innerHTML = `<span class="place-suggestion-icon">⌖</span><span><strong>${place.place_name}</strong><small>最近捷運站：${place.nearest_station} · 約 ${place.station_distance_m} 公尺</small></span>`;
    button.addEventListener("click", () => {
      document.querySelector("#place-input").value = place.place_name;
      panel.hidden = true;
    });
    panel.append(button);
  });
  panel.hidden = matches.length === 0;
}

async function loadPrototypeData() {
  const [placesResponse, stationsResponse, merchantsResponse] = await Promise.all([
    fetch("/api/places"),
    fetch("/api/stations"),
    fetch("/api/merchants"),
  ]);
  const placesData = await placesResponse.json();
  const stationsData = await stationsResponse.json();
  const merchantsData = await merchantsResponse.json();
  placeCatalog = placesData.places;

  if (!map) return;
  stationsData.stations.forEach((station) => {
    const color = crowdColor(station.crowd_index);
    L.circle([station.latitude, station.longitude], {
      radius: 280 + station.crowd_index * 5,
      color,
      fillColor: color,
      fillOpacity: 0.22,
      weight: 1,
    }).addTo(map);

    L.circleMarker([station.latitude, station.longitude], {
      radius: 7,
      color: "#ffffff",
      fillColor: color,
      fillOpacity: 1,
      weight: 2,
    })
      .addTo(map)
      .bindTooltip(`${station.station_name} · 人流 ${station.crowd_index}`)
      .on("click", () => analyzePlace(station.station_name).catch((error) => window.alert(error.message)));
  });

  merchantsData.merchants.forEach((merchant) => {
    const icon = L.divIcon({
      className: "",
      html: '<span class="merchant-map-icon">悠</span>',
      iconSize: [28, 28],
      iconAnchor: [14, 28],
    });
    const marker = L.marker([merchant.latitude, merchant.longitude], { icon })
      .addTo(map)
      .bindTooltip(`${merchant.merchant_name} · ${merchant.category}`)
      .on("click", () => renderMerchants([merchant]));
    merchantMarkers.push({ merchantId: merchant.merchant_id, marker });
  });
}

document.querySelector("#open-search").addEventListener("click", openSearch);
document.querySelector("#close-search").addEventListener("click", closeSearch);
document.querySelector("#reset-map").addEventListener("click", () => resetResult(true));
document.querySelector("#balance-submit").addEventListener("click", () => recommendBalance().catch((error) => window.alert(error.message)));
document.querySelector("#map-language-button").addEventListener("click", toggleLanguageMenu);
document.querySelector("#search-language-button").addEventListener("click", toggleLanguageMenu);
document.querySelectorAll("#language-menu button").forEach((button) => {
  button.addEventListener("click", () => {
    applyLanguage(button.dataset.language);
    document.querySelector("#language-menu").hidden = true;
  });
});

document.querySelectorAll(".mode-tab").forEach((tab) => {
  tab.addEventListener("click", () => setMode(tab.dataset.mode));
});

document.querySelectorAll(".choice-chip").forEach((chip) => {
  chip.addEventListener("click", () => chip.classList.toggle("is-selected"));
});

document.querySelector("#place-input").addEventListener("focus", (event) => renderPlaceSuggestions(event.target.value));
document.querySelector("#place-input").addEventListener("input", (event) => renderPlaceSuggestions(event.target.value));

document.querySelectorAll(".suggestion-chip").forEach((chip) => {
  chip.addEventListener("click", () => {
    chip.classList.toggle("is-selected");
    const selected = [...document.querySelectorAll(".suggestion-chip.is-selected")].map((item) => item.textContent);
    document.querySelector("#ai-prompt").value = selected.join("、");
  });
});

document.querySelector("#toggle-conditions").addEventListener("click", (event) => {
  const chips = document.querySelector("#condition-chips");
  const shouldHide = !chips.hidden;
  chips.hidden = shouldHide;
  event.currentTarget.textContent = shouldHide ? "展開" : "收合";
});

document.querySelector("#normal-submit").addEventListener("click", async () => {
  const place = document.querySelector("#place-input").value.trim() || "尚未輸入地點";
  try {
    await analyzePlace(place);
  } catch (error) {
    window.alert(error.message);
  }
});

document.querySelector("#ai-submit").addEventListener("click", async () => {
  const prompt = document.querySelector("#ai-prompt").value.trim();
  if (!prompt) {
    window.alert("請先描述你想去的地點或活動");
    return;
  }

  try {
    const response = await fetch("/api/agent/recommend", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.detail || "AI 推薦分析失敗");
    renderAnalysis(payload.recommendations[0]);
    renderRecommendations(payload);
  } catch (error) {
    window.alert(error.message);
  }
});

setupSheetDrag();
applyLanguage("zh-Hant");
loadPrototypeData().catch((error) => console.error("無法載入 Prototype 資料", error));

