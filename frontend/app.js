let map = null;
let placeCatalog = [];
let merchantMarkers = [];

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
  searchTitle.textContent = isAiMode ? "AI 推薦" : "普通搜尋";
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
  closeSearch();
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

loadPrototypeData().catch((error) => console.error("無法載入 Prototype 資料", error));
