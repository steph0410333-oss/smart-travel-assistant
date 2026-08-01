let map = null;
let placeCatalog = [];
let merchantMarkers = [];
let stationMarkers = [];
let selectedStationMarker = null;
let trendRequestCounter = 0;
let stationCrowdRequestCounter = 0;
let hasActiveResult = false;
let lastAnalysisResult = null;
let lastRecommendationPayload = null;
let currentLanguage = "zh-Hant";
let activeMerchantCategory = "all";
const PROFILE_STORAGE_KEY = "smart-travel-companion-v2";
const PROFILE_STATE_VERSION = 2;
const defaultProfileState = {
  version: PROFILE_STATE_VERSION,
  points: 150,
  xp: 320,
  completedTasks: ["report"],
  unlockedEquipment: ["starter-bag"],
  equippedEquipment: "starter-bag",
  unlockedCards: ["metro-night"],
  selectedCard: "metro-night",
  unlockedBadges: ["crowd-observer"],
  visitedStations: [],
  visitedDistricts: [],
  postcards: [],
  fosterMode: false,
  weeklyReport: null,
};
const equipmentCatalog = [
  { id: "starter-bag", icon: "🎒", nameKey: "starterBag", unlockKey: "starterUnlocked" },
  { id: "dadaocheng-hat", icon: "🎩", nameKey: "dadaochengHat", unlockKey: "visitDadaocheng" },
  { id: "zhongshan-bag", icon: "👜", nameKey: "zhongshanBag", unlockKey: "visitZhongshan" },
  { id: "rain-umbrella", icon: "☂️", nameKey: "rainUmbrella", unlockKey: "completeRainTask" },
  { id: "night-lantern", icon: "🏮", nameKey: "nightLantern", unlockKey: "searchAfterTen" },
  { id: "balance-gift", icon: "🛍️", nameKey: "balanceGift", unlockKey: "completeBalanceTask" },
];
const cardCatalog = [
  { id: "metro-night", nameKey: "metroNightCard", unlockKey: "starterUnlocked" },
  { id: "dadaocheng", nameKey: "dadaochengCard", unlockKey: "visitDadaocheng" },
  { id: "zhongshan", nameKey: "zhongshanCard", unlockKey: "visitZhongshan" },
  { id: "rain", nameKey: "rainCard", unlockKey: "completeRainTask" },
  { id: "explorer", nameKey: "explorerCard", unlockKey: "visitThreeStations" },
];
const companionArtwork = {
  bebe: "/static/assets/companion/bebe-front.png",
  locations: {
    "taipei-metro-night": "/static/assets/companion/locations/taipei-metro-night.webp",
    dadaocheng: "/static/assets/companion/locations/dadaocheng.webp",
    zhongshan: "/static/assets/companion/locations/zhongshan.webp",
    yongkang: "/static/assets/companion/locations/yongkang.webp",
    ximending: "/static/assets/companion/locations/ximending.webp",
    beitou: "/static/assets/companion/locations/beitou.webp",
    tamsui: "/static/assets/companion/locations/tamsui.webp",
    maokong: "/static/assets/companion/locations/maokong.webp",
    jiufen: "/static/assets/companion/locations/jiufen.webp",
    shifen: "/static/assets/companion/locations/shifen.webp",
    yehliu: "/static/assets/companion/locations/yehliu.webp",
    keelung: "/static/assets/companion/locations/keelung.webp",
    pingxi: "/static/assets/companion/locations/pingxi.webp",
    "sun-moon-lake": "/static/assets/companion/locations/sun-moon-lake.webp",
    alishan: "/static/assets/companion/locations/alishan.webp",
    "tainan-anping": "/static/assets/companion/locations/tainan-anping.webp",
    "kaohsiung-pier2": "/static/assets/companion/locations/kaohsiung-pier2.webp",
    taroko: "/static/assets/companion/locations/taroko.webp",
    kenting: "/static/assets/companion/locations/kenting.webp",
    penghu: "/static/assets/companion/locations/penghu.webp",
    "taipei-rain": "/static/assets/companion/locations/taipei-rain.webp",
    "taipei-explorer": "/static/assets/companion/locations/taipei-explorer.webp",
  },
  cards: {
    "metro-night": "/static/assets/companion/locations/taipei-metro-night.webp",
    dadaocheng: "/static/assets/companion/locations/dadaocheng.webp",
    zhongshan: "/static/assets/companion/locations/zhongshan.webp",
    rain: "/static/assets/companion/locations/taipei-rain.webp",
    explorer: "/static/assets/companion/locations/taipei-explorer.webp",
  },
};
const badgeCatalog = [
  { id: "crowd-observer", icon: "⌁", nameKey: "badgeCrowdObserver", unlockKey: "completeCrowdSearch" },
  { id: "full-attendance", icon: "✓", nameKey: "badgeAttendance", unlockKey: "completeCheckin" },
  { id: "rain-commuter", icon: "☂", nameKey: "badgeRain", unlockKey: "completeRainTask" },
  { id: "night-worker", icon: "☾", nameKey: "badgeNightWorker", unlockKey: "searchAfterTen" },
  { id: "district-explorer", icon: "⌖", nameKey: "badgeDistrictExplorer", unlockKey: "visitThreeStations" },
  { id: "balance-planner", icon: "悠", nameKey: "badgeBalancePlanner", unlockKey: "completeBalanceTask" },
];
const districtRewards = [
  { match: ["大稻埕", "Dadaocheng"], district: "大稻埕", equipment: "dadaocheng-hat", card: "dadaocheng" },
  { match: ["中山", "Zhongshan"], district: "心中山", equipment: "zhongshan-bag", card: "zhongshan" },
];
const roamingDestinations = [
  { id: "dadaocheng", district: "大稻埕", station: "北門站", equipment: "dadaocheng-hat" },
  { id: "zhongshan", district: "心中山", station: "中山站", equipment: "zhongshan-bag" },
  { id: "ximending", district: "西門町", station: "西門站", equipment: "night-lantern" },
  { id: "yongkang", district: "永康街", station: "東門站", equipment: "starter-bag" },
  { id: "beitou", district: "北投", station: "新北投站", equipment: "rain-umbrella" },
  { id: "tamsui", district: "淡水", station: "淡水站", equipment: "starter-bag" },
  { id: "maokong", district: "貓空", station: "貓空纜車站", equipment: "starter-bag" },
  { id: "jiufen", district: "九份", station: "瑞芳車站", equipment: "night-lantern" },
  { id: "shifen", district: "十分", station: "十分車站", equipment: "rain-umbrella" },
  { id: "yehliu", district: "野柳", station: "野柳地質公園", equipment: "starter-bag" },
  { id: "keelung", district: "基隆", station: "基隆車站", equipment: "night-lantern" },
  { id: "pingxi", district: "平溪", station: "平溪車站", equipment: "night-lantern" },
  { id: "sun-moon-lake", district: "日月潭", station: "水社碼頭", equipment: "starter-bag" },
  { id: "alishan", district: "阿里山", station: "阿里山車站", equipment: "starter-bag" },
  { id: "tainan-anping", district: "台南安平", station: "安平古堡", equipment: "dadaocheng-hat" },
  { id: "kaohsiung-pier2", district: "高雄駁二", station: "哈瑪星站", equipment: "zhongshan-bag" },
  { id: "taroko", district: "太魯閣", station: "新城車站", equipment: "starter-bag" },
  { id: "kenting", district: "墾丁", station: "鵝鑾鼻燈塔", equipment: "starter-bag" },
  { id: "penghu", district: "澎湖", station: "馬公港", equipment: "balance-gift" },
  { id: "taipei-metro-night", district: "台北捷運夜景", station: "台北101／世貿站", equipment: "night-lantern" },
];

function loadProfileState() {
  let stored = {};
  try {
    stored = JSON.parse(window.localStorage.getItem(PROFILE_STORAGE_KEY) || "{}");
  } catch {
    stored = {};
  }
  const merged = { ...defaultProfileState, ...(stored.version === PROFILE_STATE_VERSION ? stored : {}) };
  return {
    ...merged,
    completedTasks: new Set(merged.completedTasks || []),
    unlockedEquipment: new Set(merged.unlockedEquipment || []),
    unlockedCards: new Set(merged.unlockedCards || []),
    unlockedBadges: new Set(merged.unlockedBadges || []),
    visitedStations: new Set(merged.visitedStations || []),
    visitedDistricts: new Set(merged.visitedDistricts || []),
    postcards: Array.isArray(merged.postcards) ? merged.postcards : [],
  };
}

const profileState = loadProfileState();
const merchantCategoryGroups = {
  all: null,
  drink: ["飲料", "咖啡"],
  restaurant: ["餐飲"],
  creative: ["文創選物", "生活百貨"],
  snack: ["小吃", "甜點", "便利商店"],
};
const DEFAULT_MAP_VIEW = { center: [25.0478, 121.517], zoom: 13 };

const translations = {
  "zh-Hant": {
    appTitle: "智慧出行小幫手", help: "說明", searchEntry: "搜尋地點，或告訴 AI 你想去哪裡",
    historicalEstimate: "歷史人流估算", dataGuide: "資料說明", helpTitle: "如何理解人流與舒適度？",
    helpIntro: "畫面提供的是歷史人流估算，適合用來比較不同車站與時段。",
    helpHistory: "資料期間為 2026 年 6 月，依車站、星期與小時整理歷史 OD 進出站資料。",
    helpRealtime: "結果不是即時站內人數，也不是官方容量或安全上限。",
    helpReliability: "目前只有一個月資料，同星期同時段約 4–5 筆樣本，因此仍屬初步估算。",
    helpComfort: "舒適度由歷史人流壓力反向換算，分數越高代表該時段相對舒適。",
    helpUse: "建議把結果當作錯峰與比較時段的參考，不應作為安全或營運判斷。",
    clearResult: "清除結果", defaultKicker: "尚未選擇地點", defaultTitle: "從地圖探索適合前往的時段",
    defaultDescription: "選擇目的地後，我們會依最近捷運站的歷史資料，協助你比較適合前往的時段。",
    normalSearch: "普通搜尋", aiRecommendation: "AI 推薦", startAnalysis: "開始分析",
    touristHelper: "FOR VISITORS", balanceTitle: "餘額智慧推薦",
    balanceDescription: "輸入模擬悠遊卡／悠遊付餘額，找出餘額可負擔的消費選擇。",
    balanceAction: "推薦", balanceDisclaimer: "未連接真實帳戶；餘額、商家與價格皆為 Prototype 模擬資料。",
    placePlaceholder: "輸入目的地，例如台北小巨蛋", balanceEmpty: "此餘額目前沒有可推薦的模擬消費選擇。",
    remaining: "估計消費後餘額", nearestStation: "最近捷運站", update: "更新",
    analysisContext: "分析情境", dateLabel: "日期", weatherLabel: "天氣情境",
    weatherUnknown: "未指定天氣", weatherSunny: "晴天", weatherRain: "雨天", weatherHeavyRain: "大雨",
    externalFactorToggle: "套用 Prototype 假日、天氣與活動因素",
  },
  en: {
    appTitle: "Smart Travel Assistant", help: "Help", searchEntry: "Search a place or tell AI where you want to go",
    historicalEstimate: "Historical crowd estimate", dataGuide: "ABOUT THE DATA", helpTitle: "How should I read crowd and comfort scores?",
    helpIntro: "The screen shows historical crowd estimates for comparing stations and travel times.",
    helpHistory: "The current dataset covers June 2026 and is grouped by station, weekday and hour from historical OD entries and exits.",
    helpRealtime: "Results are not real-time occupancy, official capacity or a safety limit.",
    helpReliability: "Only one month is available, with roughly 4–5 samples for the same weekday and hour, so this remains an early estimate.",
    helpComfort: "Comfort reverses historical crowd pressure: a higher score means the time is relatively more comfortable.",
    helpUse: "Use the result to compare times and avoid peaks, not for safety or operational decisions.",
    clearResult: "Clear result", defaultKicker: "No place selected", defaultTitle: "Explore a comfortable place to visit",
    defaultDescription: "Choose a destination to compare suitable travel times using historical data from its nearest metro station.",
    normalSearch: "Place Search", aiRecommendation: "AI Picks", startAnalysis: "Analyze",
    touristHelper: "FOR VISITORS", balanceTitle: "Balance-friendly picks",
    balanceDescription: "Enter a mock EasyCard/EasyWallet balance to find affordable spending ideas.",
    balanceAction: "Recommend", balanceDisclaimer: "Not connected to a real account. Balances, merchants and prices are prototype data.",
    placePlaceholder: "Enter a destination, e.g. Taipei Arena", balanceEmpty: "No prototype option is affordable with this balance.",
    remaining: "Estimated balance after spending", nearestStation: "Nearest metro", update: "updated",
    analysisContext: "Analysis context", dateLabel: "Date", weatherLabel: "Weather scenario",
    weatherUnknown: "Weather not specified", weatherSunny: "Sunny", weatherRain: "Rain", weatherHeavyRain: "Heavy rain",
    externalFactorToggle: "Apply prototype holiday, weather and event factors",
  },
  ja: {
    appTitle: "スマート移動アシスタント", help: "ヘルプ", searchEntry: "場所を検索、またはAIに希望を伝える",
    historicalEstimate: "過去データによる混雑推定", dataGuide: "データについて", helpTitle: "混雑度と快適度の見方",
    helpIntro: "駅や時間帯を比較するための、過去データに基づく混雑推定です。",
    helpHistory: "2026年6月のOD入出場データを、駅・曜日・時間ごとに集計しています。",
    helpRealtime: "リアルタイム人数、公式収容人数、安全基準ではありません。",
    helpReliability: "現在は1か月分のみで、同じ曜日・時間帯の標本は約4～5件のため、初期推定です。",
    helpComfort: "快適度は過去の混雑圧力を反転した値で、高いほど相対的に快適です。",
    helpUse: "時間帯比較やピーク回避の参考として利用し、安全・運行判断には使用しないでください。",
    clearResult: "結果をクリア", defaultKicker: "場所が選択されていません", defaultTitle: "快適に行ける場所を探す",
    defaultDescription: "目的地を選ぶと、最寄りMRT駅の過去データから行きやすい時間帯を比較できます。",
    normalSearch: "場所検索", aiRecommendation: "AIおすすめ", startAnalysis: "分析する",
    touristHelper: "旅行者向け", balanceTitle: "残高でおすすめ",
    balanceDescription: "模擬EasyCard／EasyWallet残高を入力して、利用可能な候補を探します。",
    balanceAction: "おすすめ", balanceDisclaimer: "実際の口座には接続していません。残高・店舗・価格は試作データです。",
    placePlaceholder: "目的地を入力（例：台北アリーナ）", balanceEmpty: "この残高で利用できる模擬候補はありません。",
    remaining: "利用後の推定残高", nearestStation: "最寄りMRT", update: "更新",
    analysisContext: "分析条件", dateLabel: "日付", weatherLabel: "天気シナリオ",
    weatherUnknown: "天気を指定しない", weatherSunny: "晴れ", weatherRain: "雨", weatherHeavyRain: "大雨",
    externalFactorToggle: "試作の祝日・天気・イベント要因を適用",
  },
  ko: {
    appTitle: "스마트 여행 도우미", help: "도움말", searchEntry: "장소를 검색하거나 AI에게 원하는 곳을 말해 주세요",
    historicalEstimate: "과거 혼잡도 추정", dataGuide: "데이터 안내", helpTitle: "혼잡도와 쾌적도 읽는 법",
    helpIntro: "역과 시간대를 비교하기 위한 과거 데이터 기반 혼잡도 추정입니다.",
    helpHistory: "2026년 6월 OD 승하차 데이터를 역·요일·시간별로 정리했습니다.",
    helpRealtime: "실시간 인원, 공식 수용량 또는 안전 기준이 아닙니다.",
    helpReliability: "현재 한 달치만 있으며 같은 요일·시간대 표본은 약 4–5건이므로 초기 추정치입니다.",
    helpComfort: "쾌적도는 과거 혼잡 압력을 반대로 환산하며 점수가 높을수록 상대적으로 쾌적합니다.",
    helpUse: "시간대 비교와 혼잡 회피 참고용이며 안전·운영 판단에는 사용하지 마세요.",
    clearResult: "결과 지우기", defaultKicker: "선택한 장소 없음", defaultTitle: "지금 편하게 갈 수 있는 곳 찾기",
    defaultDescription: "목적지를 선택하면 가장 가까운 MRT역의 과거 데이터로 적합한 시간대를 비교할 수 있습니다.",
    normalSearch: "장소 검색", aiRecommendation: "AI 추천", startAnalysis: "분석하기",
    touristHelper: "여행자용", balanceTitle: "잔액 맞춤 추천",
    balanceDescription: "모의 EasyCard/EasyWallet 잔액을 입력해 이용 가능한 소비 선택지를 확인하세요.",
    balanceAction: "추천", balanceDisclaimer: "실제 계정과 연결되지 않았으며 잔액, 가맹점, 가격은 프로토타입 데이터입니다.",
    placePlaceholder: "목적지 입력 (예: 타이베이 아레나)", balanceEmpty: "이 잔액으로 이용 가능한 모의 추천이 없습니다.",
    remaining: "사용 후 예상 잔액", nearestStation: "가장 가까운 MRT", update: "업데이트",
    analysisContext: "분석 조건", dateLabel: "날짜", weatherLabel: "날씨 시나리오",
    weatherUnknown: "날씨 지정 안 함", weatherSunny: "맑음", weatherRain: "비", weatherHeavyRain: "폭우",
    externalFactorToggle: "프로토타입 공휴일·날씨·행사 요인 적용",
  },
};

Object.assign(translations["zh-Hant"], {
  levelHint: "探索站點、完成餘額規劃與城市任務，都能累積經驗值。", myBadges: "榮譽徽章",
  taskReport: "完成一次人流查詢", taskWallet: "完成一次餘額智慧推薦", taskExplore: "探索三個不同捷運站",
  profilePrototypeNote: "Prototype：進度會保留在目前裝置的瀏覽器，不會寫入真實帳戶。",
  brand: "悠遊付", legendLow: "較少", legendMedium: "普通", legendHigh: "偏高", legendCritical: "擁擠",
  scoreUnit: "分", comfortScoreLabel: "出行舒適度", suitableQuestion: "查詢時段適合前往嗎？",
  defaultSummary: "完成搜尋後會在這裡顯示具體建議。", nearestCrowd: "最近捷運站人流",
  notAnalyzed: "尚未分析", dataBasis: "資料依據", aiResult: "AI 推薦結果",
  top3Title: "適合你的 Top 3", traceTitle: "查看 Travel Decision Agent 分析流程",
  nearby700: "目的地周邊 700 公尺", merchantsTitle: "悠遊付可用商家",
  merchantDisclaimer: "商家、營業時間及優惠皆為 Prototype 假設資料，不代表實際合作或活動。",
  placeLabel: "地點", timeLabel: "時間", purposeLabel: "目的", purposePlaceholder: "選擇出行目的",
  purposeEat: "吃飯", purposeShop: "逛街", purposeExhibition: "展覽", purposeDate: "約會", purposeEvent: "活動",
  otherConditions: "其他條件", multipleHint: "可複選，協助我們理解你的偏好", collapse: "收合", expand: "展開",
  prefCrowd: "不想太擠", prefMetro: "捷運方便", prefWalk: "少走路", prefIndoor: "室內為主",
  prefNature: "親近自然", prefOffer: "有悠遊付優惠", promptLabel: "描述你想去的地方",
  promptPlaceholder: "例如：今天下午想找一個不太擠、捷運可到、適合散步和喝咖啡的地方",
  interestTitle: "你可能感興趣", interestHint: "點選建議詞，快速組合需求",
  sugAvoidCrowd: "避開人潮", sugNature: "親近自然", sugPopular: "熱門景點", sugExhibition: "適合看展",
  sugDate: "適合約會", sugCoffee: "咖啡散步", sugFamily: "親子同樂", sugMetro: "捷運方便", sugRandom: "隨機推薦",
  historyTitle: "歷史搜尋", edit: "編輯", history25m: "25 分鐘前", historyYesterday: "昨天 18:20", history3d: "3 天前",
  crowdNoData: "無歷史資料", crowdVeryHigh: "非常擁擠", crowdHigh: "人流偏高", crowdMedium: "人流普通", crowdLow: "人流較少",
  decisionComfort: "適合前往", decisionOkay: "可以前往，留意人潮", decisionBusy: "建議錯峰或比較替代地點",
  decisionCrowded: "目前不建議前往", decisionNoData: "此時段沒有足夠歷史資料", viewResult: "請查看分析結果",
  resultKicker: "{place} · 最近捷運站", distanceToStation: "你搜尋的目的地距離最近捷運站約 {distance} 公尺。",
  adviceComfort: "歷史資料顯示此時段相對舒適，可依原計畫前往。",
  adviceOkay: "歷史人流屬中間區間，建議預留候車與步行時間。",
  adviceBusy: "歷史資料顯示此時段較擁擠，建議錯峰或比較鄰近替代站。",
  reasonPressure: "{weekday}{hour}:00 的歷史人流壓力為 {score} 分（{level}）",
  reasonAdjusted: "套用 Prototype 外部因素後為 {score} 分（{level}）",
  reasonPeriod: "依據 {start} 至 {end} OD 歷史資料估算", historyData: "歷史資料",
  updatedThrough: "至 {date} · {basis}",
  merchantNone: "此地點 700 公尺內目前沒有 Mock 商家資料。", nearbyFound: "附近找到 {count} 間：{categories}。",
  merchantCount: "{category} {count} 間", distanceWalk: "{distance} 公尺／步行約 {minutes} 分鐘",
  walletAvailable: "可使用悠遊付（模擬）", mockOffer: "提供 Prototype 模擬優惠",
  agentGemini: "GEMINI AI · OD 歷史人流", agentFallback: "規則備援 · OD 歷史人流",
  matchScore: "符合度 {score}", recommendationReason: "符合你選擇的條件與時段",
  topSummary: "首選為 {place}，可比較下列三個推薦地點。", traceCompleted: "已完成此步驟。",
  suggestionNearest: "最近捷運站：{station} · 約 {distance} 公尺",
  mapCrowd: "{station} · 歷史人流壓力 {score}", mapNoData: "{station} · 此時段無歷史資料",
  analysisFailed: "地點分析失敗", missingPlace: "尚未輸入地點", promptRequired: "請先描述你想去的地點或活動",
  aiFailed: "AI 推薦分析失敗",
  statusComfort: "舒適", statusOkay: "尚可", statusBusy: "偏擠", statusCrowded: "擁擠", statusNoData: "資料不足",
  categoryConvenience: "便利商店", categoryCoffee: "咖啡", categorySnack: "小吃", categoryCreative: "文創選物",
  categoryDessert: "甜點", categoryLifestyle: "生活百貨", categoryDrink: "飲料", categoryDining: "餐飲",
  historyPlaceTaipei: "台北車站", historyPlaceDaan: "大安森林公園", historyPlaceZhongshan: "中山站咖啡散步",
  mapLabel: "歷史 OD 人流推估地圖", back: "返回", switchLanguage: "切換語言", legendLabel: "人流顏色圖例",
  placeInfo: "地點資訊", sheetHandle: "拖曳或點擊調整資訊面板", travelDecision: "出行決策",
  balanceA11y: "旅客餘額推薦", mockBalance: "模擬餘額", backToMap: "返回地圖", accessibility: "輔助功能",
  searchMode: "搜尋模式", voiceUnavailable: "語音輸入，第一版尚未開放", submitAI: "送出 AI 推薦", close: "關閉",
  openProfile: "開啟個人頁", viewLevel: "查看等級進度", currentLevel: "目前等級", profileTitle: "我的探索檔案",
  settings: "設定", travelerProfile: "TRAVELER PROFILE", profileName: "旅人 01", profileRank: "台北地頭蛇",
  levelProgress: "等級進度", levelHint: "探索站點、完成餘額規劃與城市任務，都能累積經驗值。",
  achievementLabel: "ACHIEVEMENTS", myBadges: "榮譽徽章", badgeExplorer: "站點探索家",
  badgeWallet: "悠遊付新星", badgeNight: "夜行旅人", unlocked: "已解鎖", myPoints: "我的積分",
  pointsStore: "前往積分商店 →", missionsLabel: "MISSIONS", missionCenter: "任務中心",
  taskReport: "完成一次人流搜尋", taskWallet: "完成一次餘額智慧推薦", taskExplore: "探索三個不同捷運站",
  profilePrototypeNote: "Prototype：進度會保留在目前裝置的瀏覽器，不會寫入真實帳戶。",
  merchantCategories: "商家分類", filterAll: "全部", filterDrink: "手搖", filterRestaurant: "餐廳",
  filterCreative: "文創", filterSnack: "小吃", filtering: "正在篩選：{category}", tapToReset: "點此返回全部",
});

Object.assign(translations.en, {
  levelHint: "Explore stations, complete balance plans and city missions to earn XP.", myBadges: "Honor badges",
  taskReport: "Complete a crowd search", taskWallet: "Complete a smart balance recommendation", taskExplore: "Explore three different metro stations",
  profilePrototypeNote: "Prototype: progress is saved in this device's browser, not to a real account.",
  brand: "EasyWallet", legendLow: "Low", legendMedium: "Moderate", legendHigh: "High", legendCritical: "Crowded",
  scoreUnit: "pts", comfortScoreLabel: "Travel comfort", suitableQuestion: "Is this a good time to visit?",
  defaultSummary: "Your recommendation will appear here after a search.", nearestCrowd: "Nearest metro crowd",
  notAnalyzed: "Not analyzed", dataBasis: "Data basis", aiResult: "AI recommendations",
  top3Title: "Your Top 3", traceTitle: "View Travel Decision Agent workflow",
  nearby700: "Within 700 m", merchantsTitle: "EasyWallet merchants",
  merchantDisclaimer: "Merchants, hours and offers are prototype assumptions, not confirmed partnerships or promotions.",
  placeLabel: "Place", timeLabel: "Time", purposeLabel: "Purpose", purposePlaceholder: "Choose a travel purpose",
  purposeEat: "Dining", purposeShop: "Shopping", purposeExhibition: "Exhibition", purposeDate: "Date", purposeEvent: "Event",
  otherConditions: "Other preferences", multipleHint: "Choose more than one to personalize your result", collapse: "Collapse", expand: "Expand",
  prefCrowd: "Avoid crowds", prefMetro: "Metro access", prefWalk: "Less walking", prefIndoor: "Mostly indoors",
  prefNature: "Near nature", prefOffer: "EasyWallet offers", promptLabel: "Describe where you want to go",
  promptPlaceholder: "Example: a quiet, metro-accessible place for coffee and a walk this afternoon",
  interestTitle: "You may like", interestHint: "Tap keywords to build your request",
  sugAvoidCrowd: "Avoid crowds", sugNature: "Nature", sugPopular: "Popular sights", sugExhibition: "Exhibitions",
  sugDate: "Good for a date", sugCoffee: "Coffee walk", sugFamily: "Family outing", sugMetro: "Metro access", sugRandom: "Surprise me",
  historyTitle: "Recent searches", edit: "Edit", history25m: "25 min ago", historyYesterday: "Yesterday 18:20", history3d: "3 days ago",
  crowdNoData: "No historical data", crowdVeryHigh: "Very crowded", crowdHigh: "High crowd", crowdMedium: "Moderate crowd", crowdLow: "Low crowd",
  decisionComfort: "Good time to visit", decisionOkay: "Suitable, with some crowds", decisionBusy: "Consider another time or station",
  decisionCrowded: "Not recommended right now", decisionNoData: "Not enough historical data", viewResult: "View the analysis",
  resultKicker: "{place} · nearest metro", distanceToStation: "The nearest metro station is about {distance} m from your destination.",
  adviceComfort: "Historical data suggests this time is relatively comfortable.",
  adviceOkay: "Crowd pressure is moderate. Allow extra time for waiting and walking.",
  adviceBusy: "Historical data suggests a busy period. Consider traveling off-peak or using a nearby station.",
  reasonPressure: "Historical crowd pressure on {weekday} at {hour}:00 is {score} ({level}).",
  reasonAdjusted: "After prototype external factors: {score} ({level}).",
  reasonPeriod: "Estimated from OD history between {start} and {end}.", historyData: "Historical data",
  updatedThrough: "Through {date} · {basis}",
  merchantNone: "No prototype merchant data within 700 m.", nearbyFound: "{count} nearby merchants: {categories}.",
  merchantCount: "{category}: {count}", distanceWalk: "{distance} m / about {minutes} min walk",
  walletAvailable: "EasyWallet available (mock)", mockOffer: "Prototype promotional offer",
  agentGemini: "GEMINI AI · OD HISTORY", agentFallback: "RULE FALLBACK · OD HISTORY",
  matchScore: "Match {score}", recommendationReason: "Matches your selected preferences and time",
  topSummary: "Top pick: {place}. Compare the three recommendations below.", traceCompleted: "Step completed.",
  suggestionNearest: "Nearest metro: {station} · about {distance} m",
  mapCrowd: "{station} · historical crowd pressure {score}", mapNoData: "{station} · no data for this time",
  analysisFailed: "Place analysis failed", missingPlace: "No destination entered", promptRequired: "Describe a place or activity first",
  aiFailed: "AI recommendation failed",
  statusComfort: "Comfortable", statusOkay: "Fair", statusBusy: "Busy", statusCrowded: "Crowded", statusNoData: "Insufficient data",
  categoryConvenience: "Convenience store", categoryCoffee: "Coffee", categorySnack: "Snacks", categoryCreative: "Design goods",
  categoryDessert: "Dessert", categoryLifestyle: "Lifestyle retail", categoryDrink: "Drinks", categoryDining: "Dining",
  historyPlaceTaipei: "Taipei Main Station", historyPlaceDaan: "Daan Forest Park", historyPlaceZhongshan: "Zhongshan coffee walk",
  mapLabel: "Historical OD crowd estimate map", back: "Back", switchLanguage: "Switch language", legendLabel: "Crowd color legend",
  placeInfo: "Place information", sheetHandle: "Drag or tap to resize the information panel", travelDecision: "Travel decision",
  balanceA11y: "Visitor balance recommendations", mockBalance: "Mock balance", backToMap: "Back to map", accessibility: "Accessibility",
  searchMode: "Search mode", voiceUnavailable: "Voice input is not available in this prototype", submitAI: "Send AI request", close: "Close",
  openProfile: "Open profile", viewLevel: "View level progress", currentLevel: "Current level", profileTitle: "My explorer profile",
  settings: "Settings", travelerProfile: "TRAVELER PROFILE", profileName: "Traveler 01", profileRank: "Taipei Local",
  levelProgress: "Level progress", levelHint: "Explore stations, complete balance plans and city missions to earn XP.",
  achievementLabel: "ACHIEVEMENTS", myBadges: "Honor badges", badgeExplorer: "Station explorer",
  badgeWallet: "EasyWallet rising star", badgeNight: "Night traveler", unlocked: "Unlocked", myPoints: "My points",
  pointsStore: "Open points store →", missionsLabel: "MISSIONS", missionCenter: "Mission center",
  taskReport: "Complete a crowd search", taskWallet: "Complete a smart balance recommendation", taskExplore: "Explore three different metro stations",
  profilePrototypeNote: "Prototype: progress is saved in this device's browser, not to a real account.",
  merchantCategories: "Merchant categories", filterAll: "All", filterDrink: "Drinks", filterRestaurant: "Dining",
  filterCreative: "Design", filterSnack: "Snacks", filtering: "Filtering: {category}", tapToReset: "Tap to show all",
});

Object.assign(translations.ja, {
  openProfile: "個人ページを開く", viewLevel: "レベル進捗を見る", currentLevel: "現在のレベル", profileTitle: "マイ探索プロフィール",
  settings: "設定", travelerProfile: "TRAVELER PROFILE", profileName: "旅人 01", profileRank: "台北ローカル",
  levelProgress: "レベル進捗", achievementLabel: "ACHIEVEMENTS", badgeExplorer: "駅の探索者",
  badgeWallet: "残高プランナー", badgeNight: "夜の旅人", unlocked: "解除済み", myPoints: "マイポイント",
  pointsStore: "コレクションを見る →", missionsLabel: "MISSIONS", missionCenter: "ミッションセンター",
  merchantCategories: "店舗カテゴリー", filterAll: "すべて", filterDrink: "ドリンク", filterRestaurant: "レストラン",
  filterCreative: "クリエイティブ", filterSnack: "軽食", filtering: "絞り込み：{category}", tapToReset: "タップしてすべて表示",
  levelHint: "駅探索、残高プラン、街ミッションでXPを獲得します。", myBadges: "名誉バッジ",
  taskReport: "人流検索を1回完了", taskWallet: "残高おすすめを1回完了", taskExplore: "異なるMRT駅を3駅探索",
  profilePrototypeNote: "試作：進捗はこの端末のブラウザに保存され、実際のアカウントには保存されません。",
  brand: "EasyWallet", legendLow: "少ない", legendMedium: "普通", legendHigh: "多い", legendCritical: "混雑",
  scoreUnit: "点", comfortScoreLabel: "移動快適度", suitableQuestion: "この時間帯は行きやすい？",
  defaultSummary: "検索後、ここにおすすめを表示します。", nearestCrowd: "最寄りMRTの混雑",
  notAnalyzed: "未分析", dataBasis: "データ基準", aiResult: "AIおすすめ",
  top3Title: "あなた向け Top 3", traceTitle: "Travel Decision Agent の処理を見る",
  nearby700: "目的地から700m以内", merchantsTitle: "EasyWallet対応店舗",
  merchantDisclaimer: "店舗・営業時間・特典は試作上の仮定で、実際の提携やキャンペーンではありません。",
  placeLabel: "場所", timeLabel: "時間", purposeLabel: "目的", purposePlaceholder: "移動目的を選択",
  purposeEat: "食事", purposeShop: "買い物", purposeExhibition: "展示", purposeDate: "デート", purposeEvent: "イベント",
  otherConditions: "その他の条件", multipleHint: "複数選択して希望を伝えられます", collapse: "閉じる", expand: "開く",
  prefCrowd: "混雑を避ける", prefMetro: "MRTに便利", prefWalk: "歩きを少なく", prefIndoor: "屋内中心",
  prefNature: "自然に近い", prefOffer: "EasyWallet特典", promptLabel: "行きたい場所を説明",
  promptPlaceholder: "例：午後に静かでMRTから近く、散歩とコーヒーを楽しめる場所",
  interestTitle: "おすすめキーワード", interestHint: "タップして希望を組み合わせます",
  sugAvoidCrowd: "混雑回避", sugNature: "自然", sugPopular: "人気スポット", sugExhibition: "展示",
  sugDate: "デート向け", sugCoffee: "カフェ散歩", sugFamily: "家族向け", sugMetro: "MRTに便利", sugRandom: "おまかせ",
  historyTitle: "最近の検索", edit: "編集", history25m: "25分前", historyYesterday: "昨日 18:20", history3d: "3日前",
  crowdNoData: "過去データなし", crowdVeryHigh: "非常に混雑", crowdHigh: "人流多め", crowdMedium: "人流普通", crowdLow: "人流少なめ",
  decisionComfort: "行きやすい時間です", decisionOkay: "移動可能、混雑に注意", decisionBusy: "時間帯や別駅の比較を推奨",
  decisionCrowded: "現在はおすすめしません", decisionNoData: "過去データが不足", viewResult: "分析結果を確認",
  resultKicker: "{place}・最寄りMRT", distanceToStation: "目的地から最寄りMRT駅まで約{distance}mです。",
  adviceComfort: "過去データでは、この時間帯は比較的快適です。",
  adviceOkay: "混雑は中程度です。待ち時間と徒歩時間に余裕を持ってください。",
  adviceBusy: "過去データでは混雑する時間帯です。ピークを避けるか近隣駅も比較してください。",
  reasonPressure: "{weekday} {hour}:00 の過去混雑圧力は {score}（{level}）です。",
  reasonAdjusted: "試作の外部要因適用後は {score}（{level}）です。",
  reasonPeriod: "{start}〜{end} のOD履歴から推定しています。", historyData: "過去データ",
  updatedThrough: "{date}まで・{basis}",
  merchantNone: "700m以内に試作店舗データがありません。", nearbyFound: "周辺に{count}店：{categories}。",
  merchantCount: "{category} {count}店", distanceWalk: "{distance}m／徒歩約{minutes}分",
  walletAvailable: "EasyWallet利用可（模擬）", mockOffer: "試作上の模擬特典",
  agentGemini: "GEMINI AI・OD履歴", agentFallback: "ルール予備・OD履歴",
  matchScore: "一致度 {score}", recommendationReason: "選択した条件と時間帯に合っています",
  topSummary: "第一候補は{place}です。下の3件を比較できます。", traceCompleted: "この処理を完了しました。",
  suggestionNearest: "最寄りMRT：{station}・約{distance}m",
  mapCrowd: "{station}・過去混雑圧力 {score}", mapNoData: "{station}・この時間帯のデータなし",
  analysisFailed: "場所の分析に失敗しました", missingPlace: "目的地が入力されていません", promptRequired: "場所や活動を先に入力してください",
  aiFailed: "AIおすすめの分析に失敗しました",
  statusComfort: "快適", statusOkay: "まずまず", statusBusy: "混雑気味", statusCrowded: "混雑", statusNoData: "データ不足",
  categoryConvenience: "コンビニ", categoryCoffee: "カフェ", categorySnack: "軽食", categoryCreative: "デザイン雑貨",
  categoryDessert: "デザート", categoryLifestyle: "生活雑貨", categoryDrink: "ドリンク", categoryDining: "飲食",
  historyPlaceTaipei: "台北駅", historyPlaceDaan: "大安森林公園", historyPlaceZhongshan: "中山駅カフェ散歩",
  mapLabel: "過去ODデータによる混雑推定マップ", back: "戻る", switchLanguage: "言語を切り替える", legendLabel: "混雑色の凡例",
  placeInfo: "場所情報", sheetHandle: "ドラッグまたはタップして情報パネルを調整", travelDecision: "移動判断",
  balanceA11y: "旅行者向け残高おすすめ", mockBalance: "模擬残高", backToMap: "地図に戻る", accessibility: "補助機能",
  searchMode: "検索モード", voiceUnavailable: "音声入力はこの試作版では利用できません", submitAI: "AIおすすめを送信", close: "閉じる",
});

Object.assign(translations.ko, {
  openProfile: "개인 페이지 열기", viewLevel: "레벨 진행 보기", currentLevel: "현재 레벨", profileTitle: "나의 탐험 프로필",
  settings: "설정", travelerProfile: "TRAVELER PROFILE", profileName: "여행자 01", profileRank: "타이베이 로컬",
  levelProgress: "레벨 진행", achievementLabel: "ACHIEVEMENTS", badgeExplorer: "역 탐험가",
  badgeWallet: "잔액 플래너", badgeNight: "야간 여행자", unlocked: "해제됨", myPoints: "나의 포인트",
  pointsStore: "컬렉션 보기 →", missionsLabel: "MISSIONS", missionCenter: "미션 센터",
  merchantCategories: "가맹점 분류", filterAll: "전체", filterDrink: "음료", filterRestaurant: "식당",
  filterCreative: "디자인", filterSnack: "간식", filtering: "필터: {category}", tapToReset: "눌러서 전체 보기",
  levelHint: "역 탐험, 잔액 계획, 도시 미션을 완료해 XP를 모으세요.", myBadges: "명예 배지",
  taskReport: "인파 검색 1회 완료", taskWallet: "스마트 잔액 추천 1회 완료", taskExplore: "서로 다른 MRT역 3곳 탐험",
  profilePrototypeNote: "프로토타입: 진행 상황은 이 기기의 브라우저에만 저장되며 실제 계정에는 저장되지 않습니다.",
  brand: "EasyWallet", legendLow: "적음", legendMedium: "보통", legendHigh: "많음", legendCritical: "혼잡",
  scoreUnit: "점", comfortScoreLabel: "이동 쾌적도", suitableQuestion: "이 시간에 방문하기 좋을까요?",
  defaultSummary: "검색 후 이곳에 추천 결과가 표시됩니다.", nearestCrowd: "가장 가까운 MRT 혼잡도",
  notAnalyzed: "분석 전", dataBasis: "데이터 기준", aiResult: "AI 추천 결과",
  top3Title: "맞춤 Top 3", traceTitle: "Travel Decision Agent 처리 과정 보기",
  nearby700: "목적지 700m 이내", merchantsTitle: "EasyWallet 사용 가능 매장",
  merchantDisclaimer: "매장, 영업시간 및 혜택은 프로토타입 가정이며 실제 제휴나 행사와 다릅니다.",
  placeLabel: "장소", timeLabel: "시간", purposeLabel: "목적", purposePlaceholder: "이동 목적 선택",
  purposeEat: "식사", purposeShop: "쇼핑", purposeExhibition: "전시", purposeDate: "데이트", purposeEvent: "행사",
  otherConditions: "기타 조건", multipleHint: "여러 항목을 선택해 선호를 알려 주세요", collapse: "접기", expand: "펼치기",
  prefCrowd: "혼잡 피하기", prefMetro: "MRT 접근성", prefWalk: "걷기 줄이기", prefIndoor: "실내 중심",
  prefNature: "자연과 가까움", prefOffer: "EasyWallet 혜택", promptLabel: "가고 싶은 곳 설명",
  promptPlaceholder: "예: 오늘 오후 조용하고 MRT로 갈 수 있는 산책과 커피 장소",
  interestTitle: "추천 키워드", interestHint: "키워드를 눌러 요청을 조합하세요",
  sugAvoidCrowd: "혼잡 피하기", sugNature: "자연", sugPopular: "인기 명소", sugExhibition: "전시",
  sugDate: "데이트", sugCoffee: "커피 산책", sugFamily: "가족 나들이", sugMetro: "MRT 접근성", sugRandom: "무작위 추천",
  historyTitle: "최근 검색", edit: "편집", history25m: "25분 전", historyYesterday: "어제 18:20", history3d: "3일 전",
  crowdNoData: "과거 데이터 없음", crowdVeryHigh: "매우 혼잡", crowdHigh: "인파 많음", crowdMedium: "인파 보통", crowdLow: "인파 적음",
  decisionComfort: "방문하기 좋은 시간", decisionOkay: "방문 가능, 혼잡 주의", decisionBusy: "다른 시간이나 역 비교 권장",
  decisionCrowded: "현재는 권장하지 않음", decisionNoData: "과거 데이터 부족", viewResult: "분석 결과 확인",
  resultKicker: "{place} · 가장 가까운 MRT", distanceToStation: "목적지에서 가장 가까운 MRT역까지 약 {distance}m입니다.",
  adviceComfort: "과거 데이터상 이 시간대는 비교적 쾌적합니다.",
  adviceOkay: "혼잡 압력이 보통입니다. 대기와 도보 시간을 여유 있게 잡으세요.",
  adviceBusy: "과거 데이터상 혼잡한 시간입니다. 피크 시간을 피하거나 인근 역도 비교하세요.",
  reasonPressure: "{weekday} {hour}:00의 과거 혼잡 압력은 {score}({level})입니다.",
  reasonAdjusted: "프로토타입 외부 요인 적용 후 {score}({level})입니다.",
  reasonPeriod: "{start}~{end} OD 이력으로 추정했습니다.", historyData: "과거 데이터",
  updatedThrough: "{date}까지 · {basis}",
  merchantNone: "700m 이내에 프로토타입 매장 데이터가 없습니다.", nearbyFound: "주변 {count}곳: {categories}.",
  merchantCount: "{category} {count}곳", distanceWalk: "{distance}m / 도보 약 {minutes}분",
  walletAvailable: "EasyWallet 사용 가능(모의)", mockOffer: "프로토타입 모의 혜택",
  agentGemini: "GEMINI AI · OD 이력", agentFallback: "규칙 대체 · OD 이력",
  matchScore: "적합도 {score}", recommendationReason: "선택한 조건과 시간대에 적합합니다",
  topSummary: "첫 번째 추천은 {place}입니다. 아래 세 장소를 비교해 보세요.", traceCompleted: "이 단계를 완료했습니다.",
  suggestionNearest: "가장 가까운 MRT: {station} · 약 {distance}m",
  mapCrowd: "{station} · 과거 혼잡 압력 {score}", mapNoData: "{station} · 이 시간대 데이터 없음",
  analysisFailed: "장소 분석에 실패했습니다", missingPlace: "목적지를 입력하지 않았습니다", promptRequired: "장소나 활동을 먼저 입력해 주세요",
  aiFailed: "AI 추천 분석에 실패했습니다",
  statusComfort: "쾌적", statusOkay: "보통", statusBusy: "혼잡한 편", statusCrowded: "혼잡", statusNoData: "데이터 부족",
  categoryConvenience: "편의점", categoryCoffee: "커피", categorySnack: "간식", categoryCreative: "디자인 소품",
  categoryDessert: "디저트", categoryLifestyle: "생활용품", categoryDrink: "음료", categoryDining: "외식",
  historyPlaceTaipei: "타이베이 메인역", historyPlaceDaan: "다안삼림공원", historyPlaceZhongshan: "중산역 커피 산책",
  mapLabel: "과거 OD 데이터 혼잡 추정 지도", back: "뒤로", switchLanguage: "언어 전환", legendLabel: "혼잡 색상 범례",
  placeInfo: "장소 정보", sheetHandle: "드래그하거나 눌러 정보 패널 크기 조절", travelDecision: "이동 판단",
  balanceA11y: "여행자 잔액 추천", mockBalance: "모의 잔액", backToMap: "지도로 돌아가기", accessibility: "접근성",
  searchMode: "검색 모드", voiceUnavailable: "이 프로토타입에서는 음성 입력을 사용할 수 없습니다", submitAI: "AI 추천 요청 보내기", close: "닫기",
});

Object.assign(translations["zh-Hant"], {
  openWardrobe: "開啟小人衣櫃", companionFeatures: "小人功能", wardrobe: "小人衣櫃",
  cardCollection: "卡面圖鑑", postcards: "榮譽明信片", digitalCompanion: "DIGITAL COMPANION",
  myCompanion: "我的小人", digitalAvatar: "虛擬數位分身", companionHint: "完成城市任務，替小人收集地區、節慶與季節限定裝備。",
  virtualEasyCard: "VIRTUAL EASYCARD", cardCollectionHint: "選擇已解鎖的原創虛擬卡面，作為小人的旅行背景。",
  viewRewards: "查看收藏 →", rewardCrowdBadge: "解鎖：人流觀察員徽章", rewardPostcard: "解鎖：國際榮譽明信片",
  rewardExplorer: "解鎖：城市探索卡面", taskRain: "體驗雨天通勤情境", rewardRain: "Prototype 任務：雨傘裝備",
  taskCheckin: "完成本週城市簽到", rewardCheckin: "解鎖：全勤捷運族徽章",
  honorPostcardLabel: "INTERNATIONAL HONOR", postcardEmptyTitle: "完成餘額規劃，取得第一張明信片",
  postcardEmptyHint: "明信片會放入專屬小人、旅行印章、裝備與榮譽勳章。",
  roamingLabel: "WEEKLY ROAMING", roamingTitle: "小人漫遊／寄養模式", fosterMode: "寄養",
  roamingHint: "開啟後，小人會在你離開台灣後繼續虛擬探索；不會追蹤真實位置。",
  weeklyReportLabel: "本週城市探索提案", weeklyReportEmpty: "開啟寄養模式，即可生成本週漫遊故事與下次來台提案。",
  generateReport: "生成本週漫遊報告", roamingPrototypeNote: "Prototype：報告會在開啟網站時生成，不會在網站關閉時背景定位或推播。",
  postcardDialogTitle: "我的榮譽明信片", downloadPostcard: "下載 PNG", sharePostcard: "分享明信片",
  postcardPrivacy: "只顯示使用者選擇的商圈印章，不公開精確位置或完整路線。",
  starterBag: "旅行小包", starterUnlocked: "初始裝備", dadaochengHat: "復古洋行禮帽", visitDadaocheng: "探索大稻埕解鎖",
  zhongshanBag: "心中山文青包", visitZhongshan: "探索心中山解鎖", rainUmbrella: "雨天通勤傘",
  completeRainTask: "完成雨天任務解鎖", nightLantern: "夜行燈籠", searchAfterTen: "22:00 後查詢解鎖",
  balanceGift: "台灣伴手禮袋", completeBalanceTask: "完成餘額推薦解鎖",
  metroNightCard: "台北捷運夜色卡", dadaochengCard: "大稻埕復古卡", zhongshanCard: "心中山文青卡",
  rainCard: "雨天台北卡", explorerCard: "城市探索卡", visitThreeStations: "探索三個不同捷運站解鎖",
  badgeCrowdObserver: "人流觀察員", completeCrowdSearch: "完成人流查詢",
  badgeAttendance: "全勤捷運族", completeCheckin: "完成城市簽到", badgeRain: "雨天通勤達人",
  badgeNightWorker: "深夜加班庇護所", badgeDistrictExplorer: "城市探索家", badgeBalancePlanner: "餘額規劃高手",
  locked: "尚未解鎖", equipped: "使用中", equip: "點擊裝備", selectedBackground: "目前背景", useBackground: "設為背景",
  unlockedStatus: "已解鎖", achievementUnlocked: "解鎖新收藏：{reward}", postcardCreated: "已取得國際榮譽明信片！",
  shareText: "我的智慧出行國際榮譽明信片", shareCopied: "分享文字已複製",
  fosterRequired: "請先開啟寄養模式", reportGenerated: "本週小人漫遊報告已生成",
  reportTitle: "{district}週末漫遊", reportStory: "小悠本週去了{district}，從{station}展開探索。下次來台灣，要不要一起完成這條城市任務？",
  postcardTitle: "國際漫遊旅人", postcardSubtitle: "完成餘額智慧規劃", footprint: "旅行印章",
  honor: "榮譽", equipmentLabel: "裝備", none: "尚無", avatarStage1: "成長階段 1 · 初來乍到",
  avatarStage2: "成長階段 2 · 城市探索者", avatarStage3: "成長階段 3 · 國際漫遊旅人",
  districtDadaocheng: "大稻埕", districtZhongshan: "心中山", districtXimen: "西門町", districtYongkang: "永康街",
});

Object.assign(translations.en, {
  openWardrobe: "Open companion wardrobe", companionFeatures: "Companion features", wardrobe: "Wardrobe",
  cardCollection: "Card collection", postcards: "Honor postcards", digitalCompanion: "DIGITAL COMPANION",
  myCompanion: "My companion", digitalAvatar: "Virtual travel companion", companionHint: "Complete city missions to collect district, seasonal and festival gear.",
  virtualEasyCard: "VIRTUAL EASYCARD", cardCollectionHint: "Use an unlocked original virtual card as your companion's travel background.",
  viewRewards: "View collection →", rewardCrowdBadge: "Unlock: Crowd Observer badge", rewardPostcard: "Unlock: International Honor Postcard",
  rewardExplorer: "Unlock: City Explorer card", taskRain: "Try the rainy commute scenario", rewardRain: "Prototype mission: umbrella gear",
  taskCheckin: "Complete this week's city check-in", rewardCheckin: "Unlock: Metro Regular badge",
  honorPostcardLabel: "INTERNATIONAL HONOR", postcardEmptyTitle: "Complete a balance plan to earn your first postcard",
  postcardEmptyHint: "It includes your companion, travel stamps, gear and an honor medal.",
  roamingLabel: "WEEKLY ROAMING", roamingTitle: "Companion roaming / foster mode", fosterMode: "Foster",
  roamingHint: "Your companion can keep exploring Taiwan after you leave. Your real location is never tracked.",
  weeklyReportLabel: "This week's city idea", weeklyReportEmpty: "Turn on foster mode to create a roaming story and a future Taiwan idea.",
  generateReport: "Generate weekly roaming report", roamingPrototypeNote: "Prototype: reports are created when the site is open; there is no background tracking or push notification.",
  postcardDialogTitle: "My honor postcard", downloadPostcard: "Download PNG", sharePostcard: "Share postcard",
  postcardPrivacy: "Only selected district stamps are shown. Exact locations and complete routes stay private.",
  starterBag: "Travel backpack", starterUnlocked: "Starter gear", dadaochengHat: "Dadaocheng vintage hat", visitDadaocheng: "Explore Dadaocheng to unlock",
  zhongshanBag: "Zhongshan design bag", visitZhongshan: "Explore Zhongshan to unlock", rainUmbrella: "Rainy commute umbrella",
  completeRainTask: "Complete the rain mission", nightLantern: "Night traveler lantern", searchAfterTen: "Search after 22:00",
  balanceGift: "Taiwan souvenir bag", completeBalanceTask: "Complete a balance recommendation",
  metroNightCard: "Taipei Metro Night Card", dadaochengCard: "Dadaocheng Vintage Card", zhongshanCard: "Zhongshan Design Card",
  rainCard: "Rainy Taipei Card", explorerCard: "City Explorer Card", visitThreeStations: "Explore three different metro stations",
  badgeCrowdObserver: "Crowd Observer", completeCrowdSearch: "Complete a crowd search", badgeAttendance: "Metro Regular",
  completeCheckin: "Complete a city check-in", badgeRain: "Rainy Commute Pro", badgeNightWorker: "Late-night Safe Haven",
  badgeDistrictExplorer: "City Explorer", badgeBalancePlanner: "Balance Planner",
  locked: "Locked", equipped: "Equipped", equip: "Tap to equip", selectedBackground: "Current background", useBackground: "Use background",
  unlockedStatus: "Unlocked", achievementUnlocked: "New collectible unlocked: {reward}", postcardCreated: "International Honor Postcard earned!",
  shareText: "My Smart Travel International Honor Postcard", shareCopied: "Share text copied",
  fosterRequired: "Turn on foster mode first", reportGenerated: "Weekly companion report generated",
  reportTitle: "{district} weekend roaming", reportStory: "Xiao-You explored {district} this week, starting from {station}. Want to complete this city mission together on your next Taiwan trip?",
  postcardTitle: "International Roaming Traveler", postcardSubtitle: "Smart balance plan completed", footprint: "Travel stamps",
  honor: "Honor", equipmentLabel: "Gear", none: "None yet", avatarStage1: "Stage 1 · New arrival",
  avatarStage2: "Stage 2 · City explorer", avatarStage3: "Stage 3 · International roamer",
  districtDadaocheng: "Dadaocheng", districtZhongshan: "Zhongshan", districtXimen: "Ximending", districtYongkang: "Yongkang Street",
});

Object.assign(translations.ja, {
  openWardrobe: "小人のワードローブを開く", companionFeatures: "小人機能", wardrobe: "ワードローブ",
  cardCollection: "カード図鑑", postcards: "名誉ポストカード", digitalCompanion: "DIGITAL COMPANION",
  myCompanion: "マイ小人", digitalAvatar: "バーチャル分身", companionHint: "街のミッションで地域・季節・イベント限定装備を集めます。",
  virtualEasyCard: "VIRTUAL EASYCARD", cardCollectionHint: "解除したオリジナルカードを小人の旅背景に設定できます。",
  viewRewards: "コレクションを見る →", rewardCrowdBadge: "解除：人流ウォッチャー", rewardPostcard: "解除：国際名誉ポストカード",
  rewardExplorer: "解除：街探索カード", taskRain: "雨の日通勤シナリオを体験", rewardRain: "試作ミッション：傘装備",
  taskCheckin: "今週の街チェックイン", rewardCheckin: "解除：MRT皆勤バッジ",
  honorPostcardLabel: "INTERNATIONAL HONOR", postcardEmptyTitle: "残高プランを完了して最初のポストカードを獲得",
  postcardEmptyHint: "専属小人、旅スタンプ、装備、名誉メダルが入ります。",
  roamingLabel: "WEEKLY ROAMING", roamingTitle: "小人の漫遊／お預かりモード", fosterMode: "お預かり",
  roamingHint: "帰国後も小人が台湾を仮想旅行します。実際の位置は追跡しません。",
  weeklyReportLabel: "今週の街提案", weeklyReportEmpty: "お預かりモードを開くと漫遊ストーリーを生成します。",
  generateReport: "今週の漫遊レポートを生成", roamingPrototypeNote: "試作：サイトを開いた時だけ生成し、バックグラウンド追跡やプッシュ通知はしません。",
  postcardDialogTitle: "私の名誉ポストカード", downloadPostcard: "PNGを保存", sharePostcard: "ポストカードを共有",
  postcardPrivacy: "選んだ地域スタンプだけ表示し、正確な位置や全ルートは公開しません。",
  starterBag: "旅のリュック", starterUnlocked: "初期装備", dadaochengHat: "大稲埕レトロハット", visitDadaocheng: "大稲埕探索で解除",
  zhongshanBag: "中山デザインバッグ", visitZhongshan: "中山探索で解除", rainUmbrella: "雨の日通勤傘",
  completeRainTask: "雨の日ミッションで解除", nightLantern: "夜旅ランタン", searchAfterTen: "22時以降の検索で解除",
  balanceGift: "台湾お土産バッグ", completeBalanceTask: "残高おすすめ完了で解除",
  metroNightCard: "台北MRT夜景カード", dadaochengCard: "大稲埕レトロカード", zhongshanCard: "中山デザインカード",
  rainCard: "雨の台北カード", explorerCard: "街探索カード", visitThreeStations: "異なる3駅を探索",
  badgeCrowdObserver: "人流ウォッチャー", completeCrowdSearch: "人流検索を完了", badgeAttendance: "MRT皆勤族",
  completeCheckin: "街チェックインを完了", badgeRain: "雨の日通勤達人", badgeNightWorker: "深夜の避難所",
  badgeDistrictExplorer: "街探索家", badgeBalancePlanner: "残高プランナー",
  locked: "未解除", equipped: "装備中", equip: "タップして装備", selectedBackground: "使用中の背景", useBackground: "背景に設定",
  unlockedStatus: "解除済み", achievementUnlocked: "新しいコレクション：{reward}", postcardCreated: "国際名誉ポストカードを獲得！",
  shareText: "スマートトラベル国際名誉ポストカード", shareCopied: "共有テキストをコピーしました",
  fosterRequired: "先にお預かりモードを開いてください", reportGenerated: "今週の小人漫遊レポートを生成しました",
  reportTitle: "{district}週末漫遊", reportStory: "小悠は今週{station}から{district}を探索しました。次の台湾旅行で一緒に街ミッションをしませんか？",
  postcardTitle: "国際漫遊トラベラー", postcardSubtitle: "スマート残高プラン完了", footprint: "旅スタンプ",
  honor: "名誉", equipmentLabel: "装備", none: "なし", avatarStage1: "成長1・台湾へようこそ",
  avatarStage2: "成長2・街探索者", avatarStage3: "成長3・国際漫遊トラベラー",
  districtDadaocheng: "大稲埕", districtZhongshan: "中山", districtXimen: "西門町", districtYongkang: "永康街",
});

Object.assign(translations.ko, {
  openWardrobe: "캐릭터 옷장 열기", companionFeatures: "캐릭터 기능", wardrobe: "캐릭터 옷장",
  cardCollection: "카드 도감", postcards: "명예 엽서", digitalCompanion: "DIGITAL COMPANION",
  myCompanion: "나의 캐릭터", digitalAvatar: "가상 여행 분신", companionHint: "도시 미션을 완료해 지역·계절·축제 한정 장비를 모아 보세요.",
  virtualEasyCard: "VIRTUAL EASYCARD", cardCollectionHint: "해제한 오리지널 가상 카드를 캐릭터 여행 배경으로 설정할 수 있습니다.",
  viewRewards: "컬렉션 보기 →", rewardCrowdBadge: "해제: 인파 관찰자", rewardPostcard: "해제: 국제 명예 엽서",
  rewardExplorer: "해제: 도시 탐험 카드", taskRain: "비 오는 날 통근 체험", rewardRain: "프로토타입 미션: 우산 장비",
  taskCheckin: "이번 주 도시 체크인", rewardCheckin: "해제: MRT 개근 배지",
  honorPostcardLabel: "INTERNATIONAL HONOR", postcardEmptyTitle: "잔액 계획을 완료하고 첫 엽서를 받으세요",
  postcardEmptyHint: "전용 캐릭터, 여행 도장, 장비와 명예 메달이 담깁니다.",
  roamingLabel: "WEEKLY ROAMING", roamingTitle: "캐릭터 로밍／위탁 모드", fosterMode: "위탁",
  roamingHint: "귀국 후에도 캐릭터가 대만을 가상 여행합니다. 실제 위치는 추적하지 않습니다.",
  weeklyReportLabel: "이번 주 도시 제안", weeklyReportEmpty: "위탁 모드를 켜면 로밍 이야기와 다음 대만 여행 제안을 만듭니다.",
  generateReport: "주간 로밍 보고서 만들기", roamingPrototypeNote: "프로토타입: 사이트를 열 때만 생성하며 백그라운드 위치 추적이나 푸시는 하지 않습니다.",
  postcardDialogTitle: "나의 명예 엽서", downloadPostcard: "PNG 다운로드", sharePostcard: "엽서 공유",
  postcardPrivacy: "선택한 지역 도장만 표시하며 정확한 위치와 전체 경로는 공개하지 않습니다.",
  starterBag: "여행 배낭", starterUnlocked: "기본 장비", dadaochengHat: "다다오청 빈티지 모자", visitDadaocheng: "다다오청 탐험으로 해제",
  zhongshanBag: "중산 디자인 가방", visitZhongshan: "중산 탐험으로 해제", rainUmbrella: "비 오는 날 우산",
  completeRainTask: "비 미션 완료로 해제", nightLantern: "야간 여행 등불", searchAfterTen: "22시 이후 검색으로 해제",
  balanceGift: "대만 기념품 가방", completeBalanceTask: "잔액 추천 완료로 해제",
  metroNightCard: "타이베이 MRT 야경 카드", dadaochengCard: "다다오청 빈티지 카드", zhongshanCard: "중산 디자인 카드",
  rainCard: "비 오는 타이베이 카드", explorerCard: "도시 탐험 카드", visitThreeStations: "서로 다른 MRT역 3곳 탐험",
  badgeCrowdObserver: "인파 관찰자", completeCrowdSearch: "인파 검색 완료", badgeAttendance: "MRT 개근족",
  completeCheckin: "도시 체크인 완료", badgeRain: "우천 통근 달인", badgeNightWorker: "심야 안심처",
  badgeDistrictExplorer: "도시 탐험가", badgeBalancePlanner: "잔액 플래너",
  locked: "잠김", equipped: "착용 중", equip: "눌러서 착용", selectedBackground: "현재 배경", useBackground: "배경으로 설정",
  unlockedStatus: "해제됨", achievementUnlocked: "새 컬렉션 해제: {reward}", postcardCreated: "국제 명예 엽서를 받았습니다!",
  shareText: "나의 스마트 여행 국제 명예 엽서", shareCopied: "공유 문구를 복사했습니다",
  fosterRequired: "먼저 위탁 모드를 켜 주세요", reportGenerated: "이번 주 캐릭터 로밍 보고서를 만들었습니다",
  reportTitle: "{district} 주말 로밍", reportStory: "샤오요우는 이번 주 {station}에서 출발해 {district} 지역을 탐험했습니다. 다음 대만 여행에서 함께 도시 미션을 해 볼까요?",
  postcardTitle: "국제 로밍 여행자", postcardSubtitle: "스마트 잔액 계획 완료", footprint: "여행 도장",
  honor: "명예", equipmentLabel: "장비", none: "없음", avatarStage1: "성장 1 · 대만 첫 방문",
  avatarStage2: "성장 2 · 도시 탐험가", avatarStage3: "성장 3 · 국제 로밍 여행자",
  districtDadaocheng: "다다오청", districtZhongshan: "중산", districtXimen: "시먼딩", districtYongkang: "융캉제",
});

Object.assign(translations["zh-Hant"], {
  dataGuide: "APP 使用指南", helpTitle: "智慧出行小幫手完整操作說明",
  helpIntro: "這裡整理地圖、搜尋、餘額、小人與寄養模式的完整操作方式。",
  helpMapTitle: "地圖與普通搜尋", helpMapBody: "點選地圖上的捷運站，或輸入目的地並選擇日期、時間；系統會找出最近捷運站，顯示歷史人流與舒適度。下方資訊面板可拖曳縮放，清除結果可回到完整地圖。",
  helpAiTitle: "AI 推薦", helpAiBody: "切換到 AI 搜尋，用自然語言輸入活動、預算與偏好，系統會回傳三個具名地點，並比較最近捷運站的舒適度。",
  helpCrowdTitle: "人流與舒適度", helpCrowdBody: "人流顏色由綠到紅表示歷史壓力由低到高；舒適度越高代表該時段相對舒適。這是 2026 年 6 月 OD 歷史資料估算，不是即時人數、官方容量或安全上限。",
  helpBalanceTitle: "餘額智慧推薦", helpBalanceBody: "輸入模擬餘額後，系統會列出餘額可負擔的商家。此功能不連接真實悠遊卡或付款帳戶，價格與餘額均為 Prototype 資料。",
  helpCompanionTitle: "BeBe、任務與收藏", helpCompanionBody: "點右上角 BeBe 進入探索檔案。完成搜尋、雨天情境、深夜查詢、地區探索與餘額推薦，可解鎖裝備、徽章及卡面；點擊已解鎖項目即可裝備或設為背景，主頁頭像會同步。",
  helpPostcardTitle: "榮譽明信片", helpPostcardBody: "完成餘額推薦可取得明信片。打開明信片後可下載 PNG 或使用裝置分享功能；內容只呈現選擇的商圈印章，不公開完整路線。",
  helpRoamingTitle: "寄養與週末漫遊", helpRoamingBody: "開啟寄養模式後，按「生成本週漫遊報告」，BeBe 會從 20 個台灣特色地點中產生虛擬故事，文字與背景會對應同一地點。此功能不會追蹤真實位置，也不會在網站關閉時背景推播。",
  helpLanguageTitle: "切換語言", helpLanguageBody: "使用頁面右上角的語言按鈕，可切換繁體中文、English、日本語與한국어；搜尋、結果、收藏與本說明都會一起切換。",
  districtBeitou: "北投", districtTamsui: "淡水", districtMaokong: "貓空", districtJiufen: "九份", districtShifen: "十分",
  districtYehliu: "野柳", districtKeelung: "基隆", districtPingxi: "平溪", districtSunMoonLake: "日月潭", districtAlishan: "阿里山",
  districtTainanAnping: "台南安平", districtKaohsiungPier2: "高雄駁二", districtTaroko: "太魯閣", districtKenting: "墾丁", districtPenghu: "澎湖",
  districtTaipeiMetroNight: "台北捷運夜景",
  stationBeimen: "北門站", stationZhongshan: "中山站", stationXimen: "西門站", stationDongmen: "東門站", stationXinbeitou: "新北投站",
  stationTamsui: "淡水站", stationMaokong: "貓空纜車站", stationRuifang: "瑞芳車站", stationShifen: "十分車站", stationYehliu: "野柳地質公園",
  stationKeelung: "基隆車站", stationPingxi: "平溪車站", stationShuishe: "水社碼頭", stationAlishan: "阿里山車站", stationAnpingFort: "安平古堡",
  stationHamasen: "哈瑪星站", stationXincheng: "新城車站", stationEluanbi: "鵝鑾鼻燈塔", stationMagong: "馬公港", stationTaipei101: "台北101／世貿站",
});

Object.assign(translations.en, {
  dataGuide: "APP GUIDE", helpTitle: "Complete Smart Travel Assistant guide",
  helpIntro: "Learn how to use the map, searches, balance recommendations, companion and foster mode.",
  helpMapTitle: "Map and place search", helpMapBody: "Tap a metro station, or enter a destination and choose a date and time. The app finds the nearest station and shows historical crowd pressure and comfort. Drag the lower sheet to resize it, or clear the result to restore the full map.",
  helpAiTitle: "AI recommendations", helpAiBody: "Switch to AI Search and describe your activity, budget and preferences in natural language. The app returns three named places and compares comfort at their nearest metro stations.",
  helpCrowdTitle: "Crowd and comfort", helpCrowdBody: "Crowd colors run from green to red as historical pressure rises. A higher comfort score means the selected time is relatively more comfortable. Estimates use June 2026 OD history; they are not real-time counts, official capacity or a safety limit.",
  helpBalanceTitle: "Smart balance recommendations", helpBalanceBody: "Enter a mock balance to see merchants it could afford. The prototype does not connect to a real EasyCard, EasyWallet or payment account; balances and prices are simulated.",
  helpCompanionTitle: "BeBe, missions and collectibles", helpCompanionBody: "Tap BeBe at the top right to open your exploration profile. Searches, rainy-day scenarios, late-night searches, district exploration and balance recommendations unlock gear, badges and card backgrounds. Tap an unlocked item to use it; the home avatar updates too.",
  helpPostcardTitle: "Honor postcards", helpPostcardBody: "Complete a balance recommendation to earn a postcard. Open it to download a PNG or use your device's share feature. Only selected district stamps appear; your full route stays private.",
  helpRoamingTitle: "Foster and weekend roaming", helpRoamingBody: "Turn on Foster Mode and select “Generate weekly roaming report.” BeBe creates a virtual story from 20 Taiwanese destinations, with the text and illustration matched to the same place. It never tracks your real location or pushes updates while the site is closed.",
  helpLanguageTitle: "Language", helpLanguageBody: "Use the language button at the top right to switch between Traditional Chinese, English, Japanese and Korean. Search, results, collectibles and this guide change together.",
  districtBeitou: "Beitou", districtTamsui: "Tamsui", districtMaokong: "Maokong", districtJiufen: "Jiufen", districtShifen: "Shifen",
  districtYehliu: "Yehliu", districtKeelung: "Keelung", districtPingxi: "Pingxi", districtSunMoonLake: "Sun Moon Lake", districtAlishan: "Alishan",
  districtTainanAnping: "Anping, Tainan", districtKaohsiungPier2: "Pier-2, Kaohsiung", districtTaroko: "Taroko", districtKenting: "Kenting", districtPenghu: "Penghu",
  districtTaipeiMetroNight: "Taipei Metro at night",
  stationBeimen: "Beimen Station", stationZhongshan: "Zhongshan Station", stationXimen: "Ximen Station", stationDongmen: "Dongmen Station", stationXinbeitou: "Xinbeitou Station",
  stationTamsui: "Tamsui Station", stationMaokong: "Maokong Gondola Station", stationRuifang: "Ruifang Station", stationShifen: "Shifen Station", stationYehliu: "Yehliu Geopark",
  stationKeelung: "Keelung Station", stationPingxi: "Pingxi Station", stationShuishe: "Shuishe Pier", stationAlishan: "Alishan Station", stationAnpingFort: "Anping Fort",
  stationHamasen: "Hamasen Station", stationXincheng: "Xincheng Station", stationEluanbi: "Eluanbi Lighthouse", stationMagong: "Magong Harbor", stationTaipei101: "Taipei 101/World Trade Center Station",
});

Object.assign(translations.ja, {
  dataGuide: "アプリガイド", helpTitle: "スマート旅行アシスタント完全ガイド",
  helpIntro: "地図、検索、残高、小人、お預かりモードの操作方法をまとめています。",
  helpMapTitle: "地図と通常検索", helpMapBody: "地図のMRT駅をタップするか、目的地・日付・時間を入力します。最寄り駅の過去の人流と快適度を表示します。下部パネルはドラッグで調整でき、結果を消去すると全体地図に戻ります。",
  helpAiTitle: "AIおすすめ", helpAiBody: "AI検索に切り替え、やりたいこと、予算、希望を自然な文章で入力します。実名の候補を3件表示し、最寄りMRT駅の快適度を比較します。",
  helpCrowdTitle: "人流と快適度", helpCrowdBody: "人流は緑から赤になるほど過去の混雑圧力が高く、快適度は高いほど比較的快適です。2026年6月のOD履歴による推定で、リアルタイム人数・公式定員・安全基準ではありません。",
  helpBalanceTitle: "残高スマートおすすめ", helpBalanceBody: "模擬残高を入力すると、その金額で利用できる店舗を表示します。実際の悠遊カード、EasyWallet、決済口座には接続せず、残高と価格は試作データです。",
  helpCompanionTitle: "BeBe・ミッション・コレクション", helpCompanionBody: "右上のBeBeをタップして探索プロフィールを開きます。検索、雨の日、深夜検索、地域探索、残高おすすめで装備・バッジ・カード背景を解除できます。解除済み項目をタップすると装備でき、ホームのアイコンにも反映されます。",
  helpPostcardTitle: "名誉ポストカード", helpPostcardBody: "残高おすすめを完了するとポストカードを獲得できます。PNG保存または端末の共有機能を利用できます。表示するのは選んだ地域スタンプだけで、全ルートは公開しません。",
  helpRoamingTitle: "お預かりと週末漫遊", helpRoamingBody: "お預かりモードをオンにして「今週の漫遊レポートを生成」を押します。BeBeが台湾の20地域から仮想ストーリーを作り、文章と背景は同じ場所に一致します。実際の位置追跡や、サイト終了後の通知はありません。",
  helpLanguageTitle: "言語切替", helpLanguageBody: "右上の言語ボタンで繁體中文、English、日本語、한국어を切り替えられます。検索、結果、コレクション、このガイドも同時に切り替わります。",
  districtBeitou: "北投", districtTamsui: "淡水", districtMaokong: "猫空", districtJiufen: "九份", districtShifen: "十分",
  districtYehliu: "野柳", districtKeelung: "基隆", districtPingxi: "平溪", districtSunMoonLake: "日月潭", districtAlishan: "阿里山",
  districtTainanAnping: "台南・安平", districtKaohsiungPier2: "高雄・駁二", districtTaroko: "太魯閣", districtKenting: "墾丁", districtPenghu: "澎湖",
  districtTaipeiMetroNight: "台北MRT夜景",
  stationBeimen: "北門駅", stationZhongshan: "中山駅", stationXimen: "西門駅", stationDongmen: "東門駅", stationXinbeitou: "新北投駅",
  stationTamsui: "淡水駅", stationMaokong: "猫空ロープウェイ駅", stationRuifang: "瑞芳駅", stationShifen: "十分駅", stationYehliu: "野柳地質公園",
  stationKeelung: "基隆駅", stationPingxi: "平溪駅", stationShuishe: "水社埠頭", stationAlishan: "阿里山駅", stationAnpingFort: "安平古堡",
  stationHamasen: "哈瑪星駅", stationXincheng: "新城駅", stationEluanbi: "鵝鑾鼻灯台", stationMagong: "馬公港", stationTaipei101: "台北101／世貿駅",
});

Object.assign(translations.ko, {
  dataGuide: "앱 이용 가이드", helpTitle: "스마트 여행 도우미 전체 이용 방법",
  helpIntro: "지도, 검색, 잔액 추천, 캐릭터와 위탁 모드 사용법을 안내합니다.",
  helpMapTitle: "지도와 일반 검색", helpMapBody: "지도의 MRT역을 누르거나 목적지, 날짜, 시간을 입력하세요. 가장 가까운 역의 과거 혼잡도와 쾌적도를 표시합니다. 아래 정보 패널은 드래그해 크기를 조절하고, 결과 삭제로 전체 지도로 돌아갈 수 있습니다.",
  helpAiTitle: "AI 추천", helpAiBody: "AI 검색으로 전환해 활동, 예산, 선호를 자연어로 입력하세요. 이름이 있는 장소 3곳과 각 장소의 가장 가까운 MRT역 쾌적도를 비교해 줍니다.",
  helpCrowdTitle: "혼잡도와 쾌적도", helpCrowdBody: "혼잡 색상은 초록에서 빨강으로 갈수록 과거 압력이 높고, 쾌적도 점수는 높을수록 상대적으로 편안합니다. 2026년 6월 OD 이력 추정치이며 실시간 인원, 공식 수용량 또는 안전 기준이 아닙니다.",
  helpBalanceTitle: "스마트 잔액 추천", helpBalanceBody: "모의 잔액을 입력하면 해당 금액으로 이용 가능한 가게를 보여 줍니다. 실제 이지카드, EasyWallet 또는 결제 계정과 연결되지 않으며 잔액과 가격은 프로토타입 데이터입니다.",
  helpCompanionTitle: "BeBe·미션·컬렉션", helpCompanionBody: "오른쪽 위 BeBe를 눌러 탐험 프로필을 여세요. 검색, 우천 상황, 심야 검색, 지역 탐험, 잔액 추천으로 장비·배지·카드 배경을 해제합니다. 해제된 항목을 누르면 착용할 수 있고 홈 아바타에도 반영됩니다.",
  helpPostcardTitle: "명예 엽서", helpPostcardBody: "잔액 추천을 완료하면 엽서를 받습니다. PNG로 저장하거나 기기의 공유 기능을 사용할 수 있습니다. 선택한 지역 도장만 표시하고 전체 경로는 공개하지 않습니다.",
  helpRoamingTitle: "위탁과 주말 로밍", helpRoamingBody: "위탁 모드를 켜고 ‘주간 로밍 보고서 만들기’를 누르세요. BeBe가 대만의 20개 지역에서 가상 이야기를 만들며 글과 배경은 같은 장소로 연결됩니다. 실제 위치를 추적하거나 사이트 종료 후 알림을 보내지 않습니다.",
  helpLanguageTitle: "언어 전환", helpLanguageBody: "오른쪽 위 언어 버튼으로 繁體中文, English, 日本語, 한국어를 전환할 수 있습니다. 검색, 결과, 컬렉션과 이 안내도 함께 바뀝니다.",
  districtBeitou: "베이터우", districtTamsui: "단수이", districtMaokong: "마오콩", districtJiufen: "지우펀", districtShifen: "스펀",
  districtYehliu: "예류", districtKeelung: "지룽", districtPingxi: "핑시", districtSunMoonLake: "르웨탄", districtAlishan: "아리산",
  districtTainanAnping: "타이난 안핑", districtKaohsiungPier2: "가오슝 보얼", districtTaroko: "타이루거", districtKenting: "컨딩", districtPenghu: "펑후",
  districtTaipeiMetroNight: "타이베이 MRT 야경",
  stationBeimen: "베이먼역", stationZhongshan: "중산역", stationXimen: "시먼역", stationDongmen: "둥먼역", stationXinbeitou: "신베이터우역",
  stationTamsui: "단수이역", stationMaokong: "마오콩 곤돌라역", stationRuifang: "루이팡역", stationShifen: "스펀역", stationYehliu: "예류 지질공원",
  stationKeelung: "지룽역", stationPingxi: "핑시역", stationShuishe: "수이서 부두", stationAlishan: "아리산역", stationAnpingFort: "안핑고보",
  stationHamasen: "하마싱역", stationXincheng: "신청역", stationEluanbi: "어롼비 등대", stationMagong: "마궁항", stationTaipei101: "타이베이 101/세계무역센터역",
});

const stationInsightsTranslations = {
  "zh-Hant": {
    todayEstimate: "所選日期趨勢",
    crowdTrendTitle: "捷運人流趨勢",
    trendLoading: "載入趨勢中…",
    trendHistoricalNote: "歷史 OD 相對人流推估，不是即時站內人數。",
    trendSummary: "{date} {weekday} · 目前查看 {time}",
    trendUnavailable: "此日期沒有可顯示的人流趨勢。",
    weatherImpactTitle: "天氣影響度",
    impactLow: "低",
    impactMedium: "中",
    impactHigh: "高",
    viewWeatherDetails: "查看詳情",
    weatherScenarioNote: "此為使用者選擇的情境模擬，並非即時氣象。",
    weatherImpactExplanation: "影響程度依「捷運場域 × {weather}情境」的調整係數換算。",
    selectedStationMeta: "{codes} · {date} {time}",
    currentTimeLabel: "查看 {time}",
  },
  en: {
    todayEstimate: "SELECTED-DAY TREND",
    crowdTrendTitle: "Metro crowd trend",
    trendLoading: "Loading trend…",
    trendHistoricalNote: "Historical relative OD crowd estimate, not live occupancy.",
    trendSummary: "{weekday}, {date} · viewing {time}",
    trendUnavailable: "No crowd trend is available for this date.",
    weatherImpactTitle: "Weather impact",
    impactLow: "Low",
    impactMedium: "Medium",
    impactHigh: "High",
    viewWeatherDetails: "View details",
    weatherScenarioNote: "This is a selected scenario, not live weather.",
    weatherImpactExplanation: "Impact is derived from the transit × {weather} scenario coefficient.",
    selectedStationMeta: "{codes} · {date} {time}",
    currentTimeLabel: "Viewing {time}",
  },
  ja: {
    todayEstimate: "選択日の傾向",
    crowdTrendTitle: "MRT人流トレンド",
    trendLoading: "トレンドを読み込み中…",
    trendHistoricalNote: "過去ODの相対人流推定で、リアルタイムの駅構内人数ではありません。",
    trendSummary: "{date} {weekday}・{time}を表示",
    trendUnavailable: "この日付の人流トレンドはありません。",
    weatherImpactTitle: "天気の影響度",
    impactLow: "低",
    impactMedium: "中",
    impactHigh: "高",
    viewWeatherDetails: "詳細を見る",
    weatherScenarioNote: "選択したシナリオであり、リアルタイム天気ではありません。",
    weatherImpactExplanation: "「交通施設 × {weather}シナリオ」の調整係数から影響度を算出しています。",
    selectedStationMeta: "{codes}・{date} {time}",
    currentTimeLabel: "{time}を表示",
  },
  ko: {
    todayEstimate: "선택 날짜 추세",
    crowdTrendTitle: "MRT 인파 추세",
    trendLoading: "추세 불러오는 중…",
    trendHistoricalNote: "과거 OD 상대 인파 추정치이며 실시간 역사 내 인원이 아닙니다.",
    trendSummary: "{date} {weekday} · {time} 조회",
    trendUnavailable: "이 날짜에 표시할 인파 추세가 없습니다.",
    weatherImpactTitle: "날씨 영향도",
    impactLow: "낮음",
    impactMedium: "중간",
    impactHigh: "높음",
    viewWeatherDetails: "자세히 보기",
    weatherScenarioNote: "사용자가 선택한 시나리오이며 실시간 날씨가 아닙니다.",
    weatherImpactExplanation: "교통 시설 × {weather} 시나리오의 조정 계수로 영향도를 계산합니다.",
    selectedStationMeta: "{codes} · {date} {time}",
    currentTimeLabel: "{time} 조회",
  },
};
Object.entries(stationInsightsTranslations).forEach(([language, values]) => {
  Object.assign(translations[language], values);
});

function t(key) {
  return translations[currentLanguage]?.[key] || translations["zh-Hant"][key] || key;
}

function tf(key, values = {}) {
  return Object.entries(values).reduce(
    (text, [name, value]) => text.replaceAll(`{${name}}`, value),
    t(key),
  );
}

function localizedStatus(status) {
  return t({
    舒適: "statusComfort",
    尚可: "statusOkay",
    偏擠: "statusBusy",
    擁擠: "statusCrowded",
    資料不足: "statusNoData",
  }[status] || "statusNoData");
}

function localizedCategory(category) {
  return t({
    便利商店: "categoryConvenience",
    咖啡: "categoryCoffee",
    小吃: "categorySnack",
    文創選物: "categoryCreative",
    甜點: "categoryDessert",
    生活百貨: "categoryLifestyle",
    飲料: "categoryDrink",
    餐飲: "categoryDining",
  }[category] || category);
}

function localizedWeekday(number) {
  const names = {
    "zh-Hant": ["", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六", "星期日"],
    en: ["", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
    ja: ["", "月曜日", "火曜日", "水曜日", "木曜日", "金曜日", "土曜日", "日曜日"],
    ko: ["", "월요일", "화요일", "수요일", "목요일", "금요일", "토요일", "일요일"],
  };
  return names[currentLanguage]?.[number] || names["zh-Hant"][number] || "";
}

function localizedStationName(station) {
  if (currentLanguage === "zh-Hant") {
    return station.display_name || station.station_name;
  }
  return station.station_name_en || station.display_name || station.station_name;
}

function localizedPlaceName(place) {
  if (currentLanguage === "zh-Hant") return place.place_name;
  const localizedKey = { en: "place_name_en", ja: "place_name_ja", ko: "place_name_ko" }[currentLanguage];
  return place[localizedKey] || place.place_name_en || place.place_name;
}

function selectedTravelTime() {
  return document.querySelector("#time-input")?.value
    || document.querySelector('input[type="time"]')?.value
    || "19:00";
}

function selectedTravelDate() {
  const input = document.querySelector("#date-input");
  if (input?.value) return input.value;
  const today = new Date();
  const localDate = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, "0"),
    String(today.getDate()).padStart(2, "0"),
  ].join("-");
  if (input) input.value = localDate;
  return localDate;
}

function selectedWeatherType() {
  return document.querySelector("#weather-input")?.value || null;
}

function externalFactorsEnabled() {
  return Boolean(document.querySelector("#external-factor-toggle")?.checked);
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
const profileScreen = document.querySelector("#profile-screen");
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
  document.querySelectorAll("[data-i18n-aria]").forEach((element) => {
    element.setAttribute("aria-label", t(element.dataset.i18nAria));
  });
  document.querySelector('[data-mode="normal"]').textContent = t("normalSearch");
  document.querySelector('[data-mode="ai"]').textContent = t("aiRecommendation");
  document.querySelector("#normal-submit").textContent = t("startAnalysis");
  document.querySelector("#place-input").placeholder = t("placePlaceholder");
  document.querySelector("#ai-prompt").placeholder = t("promptPlaceholder");
  document.querySelectorAll("#language-menu button").forEach((button) => button.classList.toggle("is-active", button.dataset.language === currentLanguage));
  setMode(aiPanel.hidden ? "normal" : "ai");
  refreshMapTooltips();
  applyMerchantFilter(activeMerchantCategory);
  if (!hasActiveResult) {
    resetResult(false);
  } else if (lastAnalysisResult) {
    renderAnalysis(lastAnalysisResult);
    if (lastRecommendationPayload) renderRecommendations(lastRecommendationPayload);
  }
  renderProfileProgress();
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

function openProfile() {
  renderProfileProgress();
  profileScreen.classList.add("is-open");
  profileScreen.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function closeProfile() {
  profileScreen.classList.remove("is-open");
  profileScreen.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

function saveProfileState() {
  const serializable = {
    ...profileState,
    version: PROFILE_STATE_VERSION,
    completedTasks: [...profileState.completedTasks],
    unlockedEquipment: [...profileState.unlockedEquipment],
    unlockedCards: [...profileState.unlockedCards],
    unlockedBadges: [...profileState.unlockedBadges],
    visitedStations: [...profileState.visitedStations],
    visitedDistricts: [...profileState.visitedDistricts],
  };
  try {
    window.localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(serializable));
  } catch {
    // Private browsing or a full storage quota should not break the prototype.
  }
}

function profileLevel() {
  return Math.max(1, Math.floor(profileState.xp / 250) + 1);
}

function profileStage() {
  if (profileState.xp >= 500) return 3;
  if (profileState.xp >= 250) return 2;
  return 1;
}

function stageLabel() {
  return t(`avatarStage${profileStage()}`);
}

function localizedDistrict(name) {
  const key = {
    大稻埕: "districtDadaocheng",
    心中山: "districtZhongshan",
    西門町: "districtXimen",
    永康街: "districtYongkang",
    北投: "districtBeitou",
    淡水: "districtTamsui",
    貓空: "districtMaokong",
    九份: "districtJiufen",
    十分: "districtShifen",
    野柳: "districtYehliu",
    基隆: "districtKeelung",
    平溪: "districtPingxi",
    日月潭: "districtSunMoonLake",
    阿里山: "districtAlishan",
    台南安平: "districtTainanAnping",
    高雄駁二: "districtKaohsiungPier2",
    太魯閣: "districtTaroko",
    墾丁: "districtKenting",
    澎湖: "districtPenghu",
    台北捷運夜景: "districtTaipeiMetroNight",
  }[name];
  return key ? t(key) : name;
}

function localizedStation(name) {
  const key = {
    北門站: "stationBeimen",
    中山站: "stationZhongshan",
    西門站: "stationXimen",
    東門站: "stationDongmen",
    新北投站: "stationXinbeitou",
    淡水站: "stationTamsui",
    貓空纜車站: "stationMaokong",
    瑞芳車站: "stationRuifang",
    十分車站: "stationShifen",
    野柳地質公園: "stationYehliu",
    基隆車站: "stationKeelung",
    平溪車站: "stationPingxi",
    水社碼頭: "stationShuishe",
    阿里山車站: "stationAlishan",
    安平古堡: "stationAnpingFort",
    哈瑪星站: "stationHamasen",
    新城車站: "stationXincheng",
    鵝鑾鼻燈塔: "stationEluanbi",
    馬公港: "stationMagong",
    "台北101／世貿站": "stationTaipei101",
  }[name];
  return key ? t(key) : name;
}

let achievementToastTimer = null;

function showAchievementToast(message) {
  const toast = document.querySelector("#achievement-toast");
  toast.textContent = message;
  toast.hidden = false;
  window.clearTimeout(achievementToastTimer);
  achievementToastTimer = window.setTimeout(() => { toast.hidden = true; }, 2800);
}

function unlockCollection(collection, id, labelKey, silent = false) {
  if (collection.has(id)) return false;
  collection.add(id);
  if (!silent) showAchievementToast(tf("achievementUnlocked", { reward: t(labelKey) }));
  return true;
}

function applyMissionRewards(taskId, silent = false) {
  if (taskId === "report") unlockCollection(profileState.unlockedBadges, "crowd-observer", "badgeCrowdObserver", silent);
  if (taskId === "wallet") {
    unlockCollection(profileState.unlockedEquipment, "balance-gift", "balanceGift", silent);
    unlockCollection(profileState.unlockedBadges, "balance-planner", "badgeBalancePlanner", true);
  }
  if (taskId === "explore") {
    unlockCollection(profileState.unlockedCards, "explorer", "explorerCard", silent);
    unlockCollection(profileState.unlockedBadges, "district-explorer", "badgeDistrictExplorer", true);
  }
  if (taskId === "rain") {
    unlockCollection(profileState.unlockedEquipment, "rain-umbrella", "rainUmbrella", silent);
    unlockCollection(profileState.unlockedCards, "rain", "rainCard", true);
    unlockCollection(profileState.unlockedBadges, "rain-commuter", "badgeRain", true);
  }
  if (taskId === "checkin") unlockCollection(profileState.unlockedBadges, "full-attendance", "badgeAttendance", silent);
}

function completeMission(taskId, points, options = {}) {
  if (profileState.completedTasks.has(taskId)) return false;
  profileState.completedTasks.add(taskId);
  profileState.points += points;
  profileState.xp += points;
  applyMissionRewards(taskId, Boolean(options.silent));
  saveProfileState();
  renderProfileProgress();
  return true;
}

function equipItem(itemId) {
  if (!profileState.unlockedEquipment.has(itemId)) return;
  profileState.equippedEquipment = itemId;
  saveProfileState();
  renderProfileProgress();
}

function selectVirtualCard(cardId) {
  if (!profileState.unlockedCards.has(cardId)) return;
  profileState.selectedCard = cardId;
  saveProfileState();
  renderProfileProgress();
}

function renderAvatar() {
  const equipment = equipmentCatalog.find((item) => item.id === profileState.equippedEquipment) || equipmentCatalog[0];
  const artwork = companionArtwork.cards[profileState.selectedCard] || companionArtwork.cards["metro-night"];
  document.querySelectorAll(".companion-avatar").forEach((avatar) => {
    avatar.dataset.stage = String(profileStage());
    avatar.dataset.equipment = equipment.id;
    avatar.dataset.card = profileState.selectedCard;
    avatar.style.setProperty("--avatar-art", `url("${artwork}")`);
  });
  document.querySelector("#equipped-name").textContent = t(equipment.nameKey);
  document.querySelector("#avatar-stage-label").textContent = stageLabel();
}

function renderEquipmentCollection() {
  const grid = document.querySelector("#equipment-grid");
  grid.replaceChildren();
  equipmentCatalog.forEach((item) => {
    const unlocked = profileState.unlockedEquipment.has(item.id);
    const selected = profileState.equippedEquipment === item.id;
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.equipment = item.id;
    button.className = `collection-item${selected ? " is-selected" : ""}${unlocked ? "" : " is-locked"}`;
    button.disabled = !unlocked;
    button.innerHTML = `<span class="equipment-art" aria-hidden="true"><i></i></span><strong>${t(item.nameKey)}</strong><small>${selected ? t("equipped") : (unlocked ? t("equip") : t(item.unlockKey))}</small>`;
    button.addEventListener("click", () => equipItem(item.id));
    grid.append(button);
  });
  document.querySelector("#equipment-count").textContent = `${profileState.unlockedEquipment.size} / ${equipmentCatalog.length}`;
}

function renderCardCollection() {
  const grid = document.querySelector("#card-collection");
  grid.replaceChildren();
  cardCatalog.forEach((item) => {
    const unlocked = profileState.unlockedCards.has(item.id);
    const selected = profileState.selectedCard === item.id;
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.card = item.id;
    button.style.setProperty("--card-art", `url("${companionArtwork.cards[item.id]}")`);
    button.className = `virtual-card${selected ? " is-selected" : ""}${unlocked ? "" : " is-locked"}`;
    button.disabled = !unlocked;
    button.innerHTML = `<strong>${t(item.nameKey)}</strong><small>${selected ? t("selectedBackground") : (unlocked ? t("useBackground") : t(item.unlockKey))}</small>`;
    button.addEventListener("click", () => selectVirtualCard(item.id));
    grid.append(button);
  });
  document.querySelector("#card-count").textContent = `${profileState.unlockedCards.size} / ${cardCatalog.length}`;
}

function renderBadgeCollection() {
  const grid = document.querySelector("#badge-grid");
  grid.replaceChildren();
  badgeCatalog.forEach((item) => {
    const unlocked = profileState.unlockedBadges.has(item.id);
    const card = document.createElement("article");
    card.className = `badge-card${unlocked ? "" : " is-locked"}`;
    card.innerHTML = `<span aria-hidden="true">${item.icon}</span><strong>${t(item.nameKey)}</strong><small>${unlocked ? t("unlockedStatus") : t(item.unlockKey)}</small>`;
    grid.append(card);
  });
  document.querySelector("#badge-count").textContent = `${profileState.unlockedBadges.size} / ${badgeCatalog.length}`;
}

function postcardTravelStamps(postcard) {
  const districts = postcard.districts?.length ? postcard.districts : ["台北"];
  return districts.slice(0, 3).map(localizedDistrict).join(" · ");
}

function postcardMarkup(postcard) {
  const equipment = equipmentCatalog.find((item) => item.id === postcard.equipment);
  return `
    <img class="postcard-bebe" src="${companionArtwork.bebe}" alt="" />
    <i class="postcard-seal" aria-hidden="true">TAIWAN</i>
    <small>${t("honorPostcardLabel")} · ${postcard.createdAt}</small>
    <strong>${t("postcardTitle")}</strong>
    <p>${t("postcardSubtitle")} · ${t("equipmentLabel")}：${equipment ? t(equipment.nameKey) : t("none")}</p>
    <span>${t("footprint")}：${postcardTravelStamps(postcard)}</span>
  `;
}

function renderPostcards() {
  const latest = profileState.postcards.at(-1);
  const empty = document.querySelector("#postcard-empty");
  const button = document.querySelector("#latest-postcard");
  document.querySelector("#postcard-count").textContent = String(profileState.postcards.length);
  empty.hidden = Boolean(latest);
  button.hidden = !latest;
  if (latest) {
    button.dataset.card = latest.card || "metro-night";
    button.style.setProperty("--card-art", `url("${companionArtwork.cards[button.dataset.card] || companionArtwork.cards["metro-night"]}")`);
    button.innerHTML = postcardMarkup(latest);
    button.onclick = () => openPostcard(latest);
  }
}

function createHonorPostcard(balance) {
  const postcard = {
    id: `postcard-${Date.now()}`,
    createdAt: new Intl.DateTimeFormat(currentLanguage, { year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()),
    districts: [...profileState.visitedDistricts],
    stations: [...profileState.visitedStations].slice(-3),
    equipment: profileState.equippedEquipment,
    card: profileState.selectedCard,
    balance,
  };
  profileState.postcards.push(postcard);
  profileState.postcards = profileState.postcards.slice(-12);
  saveProfileState();
  renderPostcards();
  showAchievementToast(t("postcardCreated"));
  return postcard;
}

let activePostcard = null;

function openPostcard(postcard) {
  activePostcard = postcard;
  const preview = document.querySelector("#postcard-preview");
  preview.dataset.card = postcard.card || "metro-night";
  preview.style.setProperty("--card-art", `url("${companionArtwork.cards[preview.dataset.card] || companionArtwork.cards["metro-night"]}")`);
  preview.innerHTML = postcardMarkup(postcard);
  const dialog = document.querySelector("#postcard-dialog");
  if (!dialog.open) dialog.showModal();
}

function closePostcard() {
  const dialog = document.querySelector("#postcard-dialog");
  if (dialog.open) dialog.close();
}

function drawWrappedText(context, text, x, y, maxWidth, lineHeight, maxLines = 3) {
  const words = [...text];
  let line = "";
  let lineCount = 0;
  words.forEach((character, index) => {
    const test = line + character;
    if (context.measureText(test).width > maxWidth && line) {
      context.fillText(line, x, y + lineCount * lineHeight);
      line = character;
      lineCount += 1;
    } else {
      line = test;
    }
    if (index === words.length - 1 && lineCount < maxLines) context.fillText(line, x, y + lineCount * lineHeight);
  });
}

function loadArtwork(source) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = source;
  });
}

function drawCoverImage(context, image, width, height) {
  const scale = Math.max(width / image.width, height / image.height);
  const drawWidth = image.width * scale;
  const drawHeight = image.height * scale;
  context.drawImage(image, (width - drawWidth) / 2, (height - drawHeight) / 2, drawWidth, drawHeight);
}

async function postcardCanvas(postcard) {
  const canvas = document.createElement("canvas");
  canvas.width = 1200;
  canvas.height = 760;
  const context = canvas.getContext("2d");
  const cardId = postcard.card || "metro-night";
  const [background, bebe] = await Promise.all([
    loadArtwork(companionArtwork.cards[cardId] || companionArtwork.cards["metro-night"]),
    loadArtwork(companionArtwork.bebe),
  ]);
  drawCoverImage(context, background, canvas.width, canvas.height);
  const overlay = context.createLinearGradient(0, 0, canvas.width, 0);
  overlay.addColorStop(0, "rgba(22,42,37,.92)");
  overlay.addColorStop(0.55, "rgba(22,42,37,.48)");
  overlay.addColorStop(1, "rgba(22,42,37,.08)");
  context.fillStyle = overlay;
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "rgba(255,250,238,.94)";
  context.beginPath();
  context.roundRect(42, 42, 1116, 676, 34);
  context.strokeStyle = "rgba(255,255,255,.72)";
  context.lineWidth = 3;
  context.stroke();
  context.drawImage(bebe, 835, 210, 300, 420);
  context.fillStyle = "rgba(255,255,255,.72)";
  context.font = "700 25px sans-serif";
  context.fillText(`${t("honorPostcardLabel")} · ${postcard.createdAt}`, 80, 92);
  context.fillStyle = "#ffffff";
  context.font = "900 64px sans-serif";
  context.fillText(t("postcardTitle"), 80, 210);
  context.font = "600 30px sans-serif";
  drawWrappedText(context, `${t("postcardSubtitle")} · ${stageLabel()}`, 80, 285, 780, 46, 2);
  context.fillStyle = "#ffe6a8";
  context.font = "800 28px sans-serif";
  context.fillText(`${t("footprint")}：${postcardTravelStamps(postcard)}`, 80, 520);
  context.fillStyle = "rgba(255,255,255,.78)";
  context.font = "600 23px sans-serif";
  const equipment = equipmentCatalog.find((item) => item.id === postcard.equipment);
  context.fillText(`${t("equipmentLabel")}：${equipment ? t(equipment.nameKey) : t("none")}`, 80, 575);
  context.fillText("SMART TRAVEL ASSISTANT · TAIPEI", 80, 680);
  return canvas;
}

async function downloadActivePostcard() {
  if (!activePostcard) return;
  const link = document.createElement("a");
  link.download = `smart-travel-honor-${activePostcard.id}.png`;
  link.href = (await postcardCanvas(activePostcard)).toDataURL("image/png");
  link.click();
}

async function shareActivePostcard() {
  if (!activePostcard) return;
  const shareData = {
    title: t("shareText"),
    text: `${t("shareText")} · ${postcardTravelStamps(activePostcard)}`,
  };
  if (navigator.share) {
    await navigator.share(shareData);
    return;
  }
  await navigator.clipboard?.writeText(shareData.text);
  showAchievementToast(t("shareCopied"));
}

async function createWeeklyReport() {
  if (!profileState.fosterMode) {
    showAchievementToast(t("fosterRequired"));
    return;
  }
  const weekNumber = Math.floor(Date.now() / 604800000);
  const destination = roamingDestinations[weekNumber % roamingDestinations.length];
  const generateButton = document.querySelector("#generate-report");
  generateButton.disabled = true;
  profileState.weeklyReport = {
    id: `week-${weekNumber}`,
    destinationId: destination.id,
    district: destination.district,
    station: destination.station,
    equipment: destination.equipment,
    language: currentLanguage,
  };
  try {
    const response = await fetch("/api/roaming-report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        language: currentLanguage,
        district: localizedDistrict(destination.district),
        station: localizedStation(destination.station),
      }),
    });
    if (response.ok) {
      const generated = await response.json();
      profileState.weeklyReport.title = generated.title;
      profileState.weeklyReport.story = generated.story;
      profileState.weeklyReport.source = generated.source;
    }
  } catch (error) {
    console.warn("Roaming report fallback:", error);
  }
  saveProfileState();
  renderWeeklyReport();
  showAchievementToast(t("reportGenerated"));
}

function renderWeeklyReport() {
  const report = profileState.weeklyReport;
  const reportCard = document.querySelector("#weekly-report");
  const title = document.querySelector("#weekly-report-title");
  const story = document.querySelector("#weekly-report-story");
  document.querySelector("#foster-mode").checked = Boolean(profileState.fosterMode);
  document.querySelector("#generate-report").disabled = !profileState.fosterMode;
  if (!report) {
    reportCard.style.removeProperty("--roaming-art");
    title.textContent = t("weeklyReportEmpty").split("，")[0];
    story.textContent = t("weeklyReportEmpty");
    return;
  }
  const destination = roamingDestinations.find((item) => item.id === report.destinationId)
    || roamingDestinations.find((item) => item.district === report.district)
    || roamingDestinations[0];
  reportCard.dataset.destination = destination.id;
  reportCard.style.setProperty("--roaming-art", `url("${companionArtwork.locations[destination.id]}")`);
  const useGeneratedCopy = report.language === currentLanguage && report.source !== "LOCAL_TEMPLATE";
  title.textContent = (useGeneratedCopy && report.title) || tf("reportTitle", { district: localizedDistrict(report.district) });
  story.textContent = (useGeneratedCopy && report.story) || tf("reportStory", {
    district: localizedDistrict(report.district),
    station: localizedStation(report.station),
  });
}

function registerExploration(result) {
  const stationName = result.nearest_station?.station_name;
  const placeName = result.resolved_place?.place_name || "";
  if (stationName) profileState.visitedStations.add(stationName);
  completeMission("report", 10, { silent: true });
  districtRewards.forEach((reward) => {
    if (!reward.match.some((keyword) => placeName.includes(keyword) || stationName?.includes(keyword))) return;
    profileState.visitedDistricts.add(reward.district);
    unlockCollection(profileState.unlockedEquipment, reward.equipment, equipmentCatalog.find((item) => item.id === reward.equipment)?.nameKey || "unlockedStatus");
    unlockCollection(profileState.unlockedCards, reward.card, cardCatalog.find((item) => item.id === reward.card)?.nameKey || "unlockedStatus", true);
  });
  if (profileState.visitedStations.size >= 3) completeMission("explore", 50);
  const hour = Number(selectedTravelTime().split(":")[0]);
  if (hour >= 22 || hour < 5) {
    unlockCollection(profileState.unlockedEquipment, "night-lantern", "nightLantern");
    unlockCollection(profileState.unlockedBadges, "night-worker", "badgeNightWorker", true);
  }
  saveProfileState();
  renderProfileProgress();
}

function renderProfileProgress() {
  const completedCount = profileState.completedTasks.size;
  const level = profileLevel();
  const xpGoal = level * 250;
  const progress = Math.min(100, Math.round((profileState.xp / xpGoal) * 100));
  document.querySelector("#profile-points").textContent = String(profileState.points);
  document.querySelector("#profile-xp").textContent = String(profileState.xp);
  document.querySelector("#profile-xp-goal").textContent = String(xpGoal);
  document.querySelector("#profile-level").textContent = String(level);
  document.querySelector("#profile-next-level").textContent = String(level + 1);
  document.querySelector("#level-progress-fill").style.width = `${progress}%`;
  document.querySelector(".mini-progress i").style.width = `${progress}%`;
  const progressbar = document.querySelector(".level-progress");
  progressbar.setAttribute("aria-valuemax", String(xpGoal));
  progressbar.setAttribute("aria-valuenow", String(profileState.xp));
  document.querySelector("#mission-count").textContent = `${completedCount} / 5`;
  document.querySelectorAll(".mission-item").forEach((item) => {
    const isComplete = profileState.completedTasks.has(item.dataset.task);
    item.classList.toggle("is-complete", isComplete);
    item.querySelector(".mission-check").textContent = isComplete ? "✓" : "";
  });
  renderAvatar();
  renderEquipmentCollection();
  renderCardCollection();
  renderBadgeCollection();
  renderPostcards();
  renderWeeklyReport();
}

function openHelp() {
  const dialog = document.querySelector("#help-dialog");
  if (!dialog.open) dialog.showModal();
}

function closeHelp() {
  document.querySelector("#help-dialog").close();
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

function crowdColor(index, crowdLevel = null) {
  const level = crowdLevel || (
    index >= 85 ? "非常擁擠"
      : index >= 70 ? "擁擠"
        : index >= 55 ? "偏擠"
          : index >= 35 ? "普通"
            : "舒適"
  );
  if (level === "非常擁擠") return "#9f2f2f";
  if (level === "擁擠") return "#d44d3f";
  if (level === "偏擠") return "#ee9b35";
  if (level === "普通") return "#e4c34f";
  return "#39a875";
}

function crowdPresentation(index, crowdLevel = null) {
  if (!Number.isFinite(Number(index))) return { label: t("crowdNoData"), level: "level-medium", people: 0 };
  const level = crowdLevel || (
    index >= 85 ? "非常擁擠"
      : index >= 70 ? "擁擠"
        : index >= 55 ? "偏擠"
          : index >= 35 ? "普通"
            : "舒適"
  );
  if (level === "非常擁擠") return { label: t("crowdVeryHigh"), level: "level-critical", people: 4 };
  if (level === "擁擠") return { label: t("crowdHigh"), level: "level-critical", people: 4 };
  if (level === "偏擠") return { label: t("crowdHigh"), level: "level-high", people: 3 };
  if (level === "普通") return { label: t("crowdMedium"), level: "level-medium", people: 2 };
  return { label: t("crowdLow"), level: "level-low", people: 1 };
}

function comfortPresentation(status) {
  const presentations = {
    舒適: { level: "level-low" },
    尚可: { level: "level-medium" },
    偏擠: { level: "level-high" },
    擁擠: { level: "level-critical" },
    資料不足: { level: "level-medium" },
  };
  return presentations[status] || { level: "level-medium" };
}

function decisionPresentation(status) {
  const decisions = {
    舒適: t("decisionComfort"),
    尚可: t("decisionOkay"),
    偏擠: t("decisionBusy"),
    擁擠: t("decisionCrowded"),
    資料不足: t("decisionNoData"),
  };
  return decisions[status] || t("viewResult");
}

function localizedAdvice(status) {
  if (status === "舒適") return t("adviceComfort");
  if (status === "尚可") return t("adviceOkay");
  if (status === "偏擠" || status === "擁擠") return t("adviceBusy");
  return t("decisionNoData");
}

function localizedReasons(comfort) {
  const estimate = comfort.crowd_estimate;
  if (!estimate?.available) return [t("decisionNoData")];
  const reasons = [
    tf("reasonPressure", {
      weekday: localizedWeekday(estimate.weekday_num),
      hour: String(estimate.hour).padStart(2, "0"),
      score: Math.round(estimate.crowd_score),
      level: crowdPresentation(estimate.crowd_score).label,
    }),
  ];
  if (comfort.external_factors?.enabled) {
    reasons.push(tf("reasonAdjusted", {
      score: Math.round(comfort.adjusted_crowd_score),
      level: crowdPresentation(
        comfort.adjusted_crowd_score,
        comfort.adjusted_crowd_level,
      ).label,
    }));
  }
  reasons.push(tf("reasonPeriod", {
      start: estimate.data_period_start,
      end: estimate.data_period_end,
  }));
  return reasons;
}

function setMetricLevel(element, level) {
  element.classList.remove("level-low", "level-medium", "level-high", "level-critical");
  element.classList.add(level);
}

function localizedWeatherType(weatherType) {
  return t({
    sunny: "weatherSunny",
    rain: "weatherRain",
    heavy_rain: "weatherHeavyRain",
  }[weatherType] || "weatherUnknown");
}

function weatherIcon(weatherType) {
  return {
    sunny: "☀",
    rain: "🌧",
    heavy_rain: "⛈",
  }[weatherType] || "☁";
}

function renderWeatherImpact(comfort) {
  const section = document.querySelector("#weather-impact");
  const weather = comfort.external_factors?.weather;
  if (!comfort.external_factors?.enabled || !weather?.applied || !weather.weather_type) {
    section.hidden = true;
    return;
  }

  const magnitude = Math.abs(1 - Number(weather.coefficient)) * 100;
  const position = Math.min(100, (magnitude / 25) * 100);
  const levelKey = magnitude <= 7
    ? "impactLow"
    : magnitude <= 17
      ? "impactMedium"
      : "impactHigh";
  const weatherLabel = localizedWeatherType(weather.weather_type);
  const scale = document.querySelector("#weather-impact-scale");

  document.querySelector("#weather-impact-icon").textContent = weatherIcon(weather.weather_type);
  document.querySelector("#weather-impact-label").textContent = weatherLabel;
  document.querySelector("#weather-impact-explanation").textContent = tf(
    "weatherImpactExplanation",
    { weather: weatherLabel },
  );
  scale.style.setProperty("--impact-position", `${position}%`);
  scale.setAttribute(
    "aria-label",
    `${weatherLabel} · ${t("weatherImpactTitle")} ${t(levelKey)}`,
  );
  section.hidden = false;
}

function appendSvgElement(parent, name, attributes = {}, text = "") {
  const element = document.createElementNS("http://www.w3.org/2000/svg", name);
  Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, String(value)));
  if (text) element.textContent = text;
  parent.append(element);
  return element;
}

function renderTrendChart(points, currentHour) {
  const svg = document.querySelector("#trend-chart");
  svg.replaceChildren();
  const width = 640;
  const height = 220;
  const left = 44;
  const right = 16;
  const top = 18;
  const bottom = 36;
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;
  const x = (hour) => left + (hour / 23) * plotWidth;
  const y = (score) => top + (1 - score / 100) * plotHeight;

  [0, 50, 100].forEach((score) => {
    appendSvgElement(svg, "line", {
      class: "trend-grid",
      x1: left,
      x2: width - right,
      y1: y(score),
      y2: y(score),
    });
    appendSvgElement(svg, "text", {
      class: "trend-axis-label",
      x: left - 9,
      y: y(score) + 6,
      "text-anchor": "end",
    }, String(score));
  });
  [0, 6, 12, 18, 23].forEach((hour) => {
    appendSvgElement(svg, "text", {
      class: "trend-axis-label",
      x: x(hour),
      y: height - 8,
      "text-anchor": hour === 0 ? "start" : hour === 23 ? "end" : "middle",
    }, `${String(hour).padStart(2, "0")}:00`);
  });

  const available = points.filter((point) => point.available);
  if (!available.length) return false;

  appendSvgElement(svg, "line", {
    class: "trend-current-line",
    x1: x(currentHour),
    x2: x(currentHour),
    y1: top,
    y2: height - bottom,
  });

  let segment = [];
  const drawSegment = () => {
    if (!segment.length) return;
    const path = segment
      .map((point, index) => `${index ? "L" : "M"} ${x(point.hour)} ${y(point.crowd_score)}`)
      .join(" ");
    appendSvgElement(svg, "path", { class: "trend-line", d: path });
    segment = [];
  };
  points.forEach((point) => {
    if (!point.available) {
      drawSegment();
      return;
    }
    segment.push(point);
  });
  drawSegment();

  available.forEach((point) => {
    const circle = appendSvgElement(svg, "circle", {
      class: `trend-point${point.hour === currentHour ? " is-current" : ""}`,
      cx: x(point.hour),
      cy: y(point.crowd_score),
      r: point.hour === currentHour ? 7 : 4,
      tabindex: 0,
    });
    const label = crowdPresentation(point.crowd_score, point.crowd_level).label;
    appendSvgElement(
      circle,
      "title",
      {},
      `${point.time} · ${Math.round(point.crowd_score)} / 100 · ${label}`,
    );
  });
  return true;
}

async function loadStationTrend(station) {
  const requestId = ++trendRequestCounter;
  const section = document.querySelector("#station-trend");
  const loading = document.querySelector("#trend-loading");
  const chart = document.querySelector("#trend-chart");
  section.hidden = false;
  loading.hidden = false;
  loading.textContent = t("trendLoading");
  chart.replaceChildren();

  try {
    const response = await fetch(
      `/api/stations/${encodeURIComponent(station.station_id)}/trend?date=${encodeURIComponent(selectedTravelDate())}`,
    );
    const trend = await response.json();
    if (!response.ok) throw new Error(trend.detail || t("trendUnavailable"));
    if (requestId !== trendRequestCounter) return;

    const currentHour = Number(selectedTravelTime().split(":")[0]);
    const hasTrend = renderTrendChart(trend.points, currentHour);
    loading.hidden = hasTrend;
    if (!hasTrend) loading.textContent = t("trendUnavailable");
    document.querySelector("#trend-current-time").textContent = tf(
      "currentTimeLabel",
      { time: selectedTravelTime() },
    );
    document.querySelector("#trend-summary").textContent = tf("trendSummary", {
      date: trend.query_date.replaceAll("-", "/"),
      weekday: localizedWeekday(trend.weekday_num),
      time: selectedTravelTime(),
    });
  } catch (error) {
    if (requestId !== trendRequestCounter) return;
    loading.hidden = false;
    loading.textContent = error.message || t("trendUnavailable");
  }
}

function renderAnalysis(result) {
  lastAnalysisResult = result;
  const station = result.nearest_station;
  const comfort = result.comfort;
  const historicalCrowdScore = comfort.historical_crowd_score
    ?? comfort.crowd_estimate?.crowd_score;
  const crowd = crowdPresentation(
    historicalCrowdScore,
    comfort.crowd_estimate?.crowd_level,
  );
  const comfortDisplay = comfortPresentation(comfort.status);
  hasActiveResult = true;
  document.querySelector("#reset-map").hidden = false;
  document.querySelector("#sheet-kicker").textContent = tf("resultKicker", { place: localizedPlaceName(result.resolved_place) });
  document.querySelector("#sheet-title").textContent = localizedStationName(station);
  const stationMeta = document.querySelector("#station-meta");
  stationMeta.textContent = tf("selectedStationMeta", {
    codes: (station.line_station_ids || [station.station_id]).join("・"),
    date: selectedTravelDate().replaceAll("-", "/"),
    time: selectedTravelTime(),
  });
  stationMeta.hidden = false;
  document.querySelector("#sheet-description").textContent = tf("distanceToStation", { distance: station.distance_m });
  document.querySelector("#decision-label").textContent = decisionPresentation(comfort.status);
  document.querySelector("#decision-summary").textContent = currentLanguage === "zh-Hant"
    ? comfort.advice
    : localizedAdvice(comfort.status);
  const reasons = document.querySelector("#comfort-reasons");
  const userFacingReasons = currentLanguage === "zh-Hant"
    ? comfort.reasons.filter((reason) => !reason.includes("可靠度低"))
    : localizedReasons(comfort);
  reasons.replaceChildren(...userFacingReasons.slice(0, 3).map((reason) => {
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
  document.querySelector("#crowd-score").textContent = Number.isFinite(Number(historicalCrowdScore))
    ? Math.round(historicalCrowdScore)
    : "--";
  const hasComfortScore = Number.isFinite(Number(comfort.comfort_score));
  document.querySelector("#comfort-score").textContent = hasComfortScore ? comfort.comfort_score : "--";
  document.querySelector("#comfort-gauge").style.setProperty(
    "--score-angle",
    hasComfortScore ? `${comfort.comfort_score * 3.6}deg` : "0deg",
  );
  comfortCard.setAttribute(
    "aria-label",
    hasComfortScore
      ? `${t("comfortScoreLabel")} ${comfort.comfort_score} ${t("scoreUnit")} · ${localizedStatus(comfort.status)}`
      : localizedStatus(comfort.status),
  );
  crowdCard.setAttribute("aria-label", `${t("nearestCrowd")} · ${crowd.label}`);
  const estimate = comfort.crowd_estimate;
  document.querySelector("#updated-time").textContent = estimate
    ? tf("updatedThrough", {
      date: estimate.data_period_end.replaceAll("-", "/"),
      basis: t("historicalEstimate"),
    })
    : t("historyData");
  document.querySelector("#recommendation-section").hidden = true;
  renderWeatherImpact(comfort);
  loadStationTrend(station);
  renderMerchants(result.nearby_merchants || [], result.merchant_summary);
  if (map) map.setView([station.latitude, station.longitude], 15);
  setSheetState("half");
  closeSearch();
}

function resetResult(clearInputs = true) {
  hasActiveResult = false;
  lastAnalysisResult = null;
  lastRecommendationPayload = null;
  document.querySelector("#reset-map").hidden = true;
  document.querySelector("#sheet-kicker").textContent = t("defaultKicker");
  document.querySelector("#sheet-title").textContent = t("defaultTitle");
  document.querySelector("#station-meta").hidden = true;
  document.querySelector("#sheet-description").textContent = t("defaultDescription");
  document.querySelector("#decision-label").textContent = t("defaultKicker");
  document.querySelector("#decision-summary").textContent = t("defaultDescription");
  document.querySelector("#comfort-score").textContent = "--";
  document.querySelector("#comfort-gauge").style.setProperty("--score-angle", "0deg");
  document.querySelector("#crowd-visual").dataset.level = "0";
  document.querySelector("#crowd-score").textContent = "--";
  document.querySelector("#crowd-label").textContent = "--";
  document.querySelector("#updated-time").textContent = "--";
  document.querySelector("#comfort-reasons").hidden = true;
  document.querySelector("#merchant-section").hidden = true;
  document.querySelector("#recommendation-section").hidden = true;
  document.querySelector("#station-trend").hidden = true;
  document.querySelector("#weather-impact").hidden = true;
  trendRequestCounter += 1;
  if (selectedStationMarker) {
    selectedStationMarker.setRadius(7);
    selectedStationMarker.setStyle({ color: "#ffffff", weight: 2 });
    selectedStationMarker = null;
  }
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
      card.innerHTML = `<strong>${item.merchant_name}</strong><span>${localizedCategory(item.category)} · ${item.price_range}</span><span>${t("remaining")}: NT$${item.estimated_remaining}</span>`;
      results.append(card);
    });
    const newlyCompleted = completeMission("wallet", 30);
    let postcard = profileState.postcards.at(-1);
    if (newlyCompleted || !postcard) postcard = createHonorPostcard(balance);
    const postcardButton = document.createElement("button");
    postcardButton.type = "button";
    postcardButton.className = "balance-postcard-link";
    postcardButton.textContent = t("postcardCreated");
    postcardButton.addEventListener("click", () => openPostcard(postcard));
    results.append(postcardButton);
  }
  results.hidden = false;
  setSheetState("expanded");
}

function merchantSummaryText(merchants, summary) {
  if (!merchants.length) return t("merchantNone");
  const counts = summary?.category_counts || merchants.reduce((result, merchant) => {
    result[merchant.category] = (result[merchant.category] || 0) + 1;
    return result;
  }, {});
  const categoryText = Object.entries(counts)
    .map(([category, count]) => tf("merchantCount", { category: localizedCategory(category), count }))
    .join(currentLanguage === "en" ? ", " : "、");
  return tf("nearbyFound", { count: merchants.length, categories: categoryText });
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
      ? ` · ${tf("distanceWalk", { distance: merchant.distance_m, minutes: merchant.walking_minutes })}`
      : "";
    const offer = merchant.discount_available
      ? (currentLanguage === "zh-Hant" ? merchant.discount_text : t("mockOffer"))
      : t("walletAvailable");
    card.innerHTML = `
      <span class="merchant-logo" aria-hidden="true">悠</span>
      <span>
        <h4>${merchant.merchant_name}</h4>
        <p class="merchant-meta">${localizedCategory(merchant.category)}${distanceText}</p>
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
  lastRecommendationPayload = payload;
  const section = document.querySelector("#recommendation-section");
  const list = document.querySelector("#recommendation-list");
  const modeBadge = document.querySelector("#agent-mode-badge");
  modeBadge.textContent = payload.llm_enabled ? t("agentGemini") : t("agentFallback");
  modeBadge.title = currentLanguage === "zh-Hant" ? (payload.limitations || "") : t("helpUse");
  document.querySelector("#agent-summary").textContent = currentLanguage === "zh-Hant"
    ? (payload.personalized_summary || "")
    : tf("topSummary", { place: localizedPlaceName(payload.recommendations[0]?.resolved_place || { place_name: "" }) });
  const traceList = document.querySelector("#agent-trace-list");
  traceList.replaceChildren(...(payload.workflow_trace || []).map((step) => {
    const item = document.createElement("li");
    const tool = document.createElement("strong");
    tool.textContent = `${step.tool}：`;
    item.append(
      tool,
      document.createTextNode(currentLanguage === "zh-Hant" ? step.summary : t("traceCompleted")),
    );
    return item;
  }));
  list.replaceChildren();

  payload.recommendations.forEach((item, index) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = `recommendation-card${index === activeIndex ? " is-active" : ""}`;
    card.innerHTML = `
      <span class="rank">TOP ${index + 1} · ${tf("matchScore", { score: item.recommendation_score })}</span>
      <h4>${localizedPlaceName(item.resolved_place)}</h4>
      <p class="station-line">${localizedStationName(item.nearest_station)} · ${localizedStatus(item.comfort.status)}</p>
      <p class="reason-line">${currentLanguage === "zh-Hant" ? item.recommendation_reasons.slice(0, 2).join("；") : t("recommendationReason")}</p>
    `;
    card.addEventListener("click", () => {
      registerExploration(item);
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
      date: selectedTravelDate(),
      time: selectedTravelTime(),
      weather_type: selectedWeatherType(),
      enable_external_factors: externalFactorsEnabled(),
      preferences: [...document.querySelectorAll(".choice-chip.is-selected")].map((item) => item.dataset.value),
    }),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(currentLanguage === "zh-Hant" ? (result.detail || t("analysisFailed")) : t("analysisFailed"));
  lastRecommendationPayload = null;
  registerExploration(result);
  renderAnalysis(result);
}

function renderPlaceSuggestions(query = "") {
  const panel = document.querySelector("#place-suggestions");
  const normalized = query.trim().toLowerCase();
  const matches = placeCatalog
    .filter((place) => {
      const searchableNames = [
        place.place_name,
        place.place_name_en,
        place.place_name_ja,
        place.place_name_ko,
        ...(place.aliases || []),
        ...(place.aliases_en || []),
      ].filter(Boolean);
      return !normalized || searchableNames.some((name) => name.toLowerCase().includes(normalized));
    })
    .slice(0, 6);

  panel.replaceChildren();
  matches.forEach((place) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "place-suggestion";
    button.innerHTML = `<span class="place-suggestion-icon">⌖</span><span><strong>${localizedPlaceName(place)}</strong><small>${tf("suggestionNearest", {
      station: currentLanguage === "zh-Hant" ? place.nearest_station : (place.nearest_station_en || place.nearest_station),
      distance: place.station_distance_m,
    })}</small></span>`;
    button.addEventListener("click", () => {
      document.querySelector("#place-input").value = localizedPlaceName(place);
      panel.hidden = true;
    });
    panel.append(button);
  });
  panel.hidden = matches.length === 0;
}

function merchantMatchesCategory(merchant, categoryKey) {
  const categories = merchantCategoryGroups[categoryKey];
  return !categories || categories.includes(merchant.category);
}

function applyMerchantFilter(categoryKey = "all") {
  activeMerchantCategory = Object.hasOwn(merchantCategoryGroups, categoryKey) ? categoryKey : "all";
  document.querySelectorAll(".merchant-filter").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.category === activeMerchantCategory);
  });

  merchantMarkers.forEach(({ merchant, marker }) => {
    const shouldShow = merchantMatchesCategory(merchant, activeMerchantCategory);
    const isVisible = map?.hasLayer(marker);
    if (shouldShow && !isVisible) marker.addTo(map);
    if (!shouldShow && isVisible) map.removeLayer(marker);
  });

  const status = document.querySelector("#merchant-filter-status");
  if (activeMerchantCategory === "all") {
    status.hidden = true;
    status.textContent = "";
    return;
  }
  const activeButton = document.querySelector(`.merchant-filter[data-category="${activeMerchantCategory}"]`);
  status.textContent = `${tf("filtering", { category: activeButton?.textContent || "" })} · ${t("tapToReset")}`;
  status.hidden = false;
}

async function loadPrototypeData() {
  const stationQuery = new URLSearchParams({
    date: selectedTravelDate(),
    time: selectedTravelTime(),
  });
  const [placesResponse, stationsResponse, merchantsResponse] = await Promise.all([
    fetch("/api/places"),
    fetch(`/api/stations?${stationQuery}`),
    fetch("/api/merchants"),
  ]);
  const placesData = await placesResponse.json();
  const stationsData = await stationsResponse.json();
  const merchantsData = await merchantsResponse.json();
  placeCatalog = placesData.places;

  if (!map) return;
  stationsData.stations.forEach((station) => {
    const hasCrowdScore = Number.isFinite(Number(station.crowd_index));
    const color = hasCrowdScore
      ? crowdColor(station.crowd_index, station.crowd_level)
      : "#94a3b8";

    const stationMarker = L.circleMarker([station.latitude, station.longitude], {
      radius: 7,
      color: "#ffffff",
      fillColor: color,
      fillOpacity: 1,
      weight: 2,
    })
      .addTo(map)
      .on("click", () => {
        if (selectedStationMarker && selectedStationMarker !== stationMarker) {
          selectedStationMarker.setRadius(7);
          selectedStationMarker.setStyle({ color: "#ffffff", weight: 2 });
        }
        selectedStationMarker = stationMarker;
        stationMarker.setRadius(10);
        stationMarker.setStyle({ color: "#17332c", weight: 3 });
        analyzePlace(station.station_name).catch((error) => window.alert(error.message));
      });
    stationMarker.bindTooltip(
      hasCrowdScore
        ? tf("mapCrowd", { station: localizedStationName(station), score: Math.round(station.crowd_index) })
        : tf("mapNoData", { station: localizedStationName(station) }),
    );
    stationMarkers.push({ station, marker: stationMarker, hasCrowdScore });
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
      .bindTooltip(`${merchant.merchant_name} · ${localizedCategory(merchant.category)}`)
      .on("click", () => renderMerchants([merchant]));
    merchantMarkers.push({ merchantId: merchant.merchant_id, merchant, marker });
  });
  applyMerchantFilter(activeMerchantCategory);
}

function refreshMapTooltips() {
  stationMarkers.forEach(({ station, marker, hasCrowdScore }) => {
    marker.setTooltipContent(
      hasCrowdScore
        ? tf("mapCrowd", { station: localizedStationName(station), score: Math.round(station.crowd_index) })
        : tf("mapNoData", { station: localizedStationName(station) }),
    );
  });
  merchantMarkers.forEach(({ merchant, marker }) => {
    marker.setTooltipContent(`${merchant.merchant_name} · ${localizedCategory(merchant.category)}`);
  });
}

async function refreshStationCrowd() {
  const requestId = ++stationCrowdRequestCounter;
  const query = new URLSearchParams({
    date: selectedTravelDate(),
    time: selectedTravelTime(),
  });
  const response = await fetch(`/api/stations?${query}`);
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.detail || "無法更新站點人流");
  if (requestId !== stationCrowdRequestCounter) return;

  const stationsById = new Map(
    payload.stations.map((station) => [station.station_id, station]),
  );
  stationMarkers.forEach((entry) => {
    const updatedStation = stationsById.get(entry.station.station_id);
    if (!updatedStation) return;
    Object.assign(entry.station, updatedStation);
    entry.hasCrowdScore = Number.isFinite(Number(updatedStation.crowd_index));
    const color = entry.hasCrowdScore
      ? crowdColor(updatedStation.crowd_index, updatedStation.crowd_level)
      : "#94a3b8";
    entry.marker.setStyle({ fillColor: color });
  });
  refreshMapTooltips();
}

document.querySelector("#open-search").addEventListener("click", openSearch);
document.querySelector("#close-search").addEventListener("click", closeSearch);
document.querySelector("#open-profile").addEventListener("click", openProfile);
document.querySelector("#level-shortcut").addEventListener("click", openProfile);
document.querySelector("#close-profile").addEventListener("click", closeProfile);
document.querySelector("#reset-map").addEventListener("click", () => resetResult(true));
document.querySelector("#balance-submit").addEventListener("click", () => recommendBalance().catch((error) => window.alert(error.message)));
document.querySelectorAll(".help-button").forEach((button) => button.addEventListener("click", openHelp));
document.querySelector("#close-help").addEventListener("click", closeHelp);
document.querySelector("#help-dialog").addEventListener("click", (event) => {
  if (event.target === event.currentTarget) closeHelp();
});
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

document.querySelectorAll(".merchant-filter").forEach((button) => {
  button.addEventListener("click", () => applyMerchantFilter(button.dataset.category));
});
document.querySelector("#merchant-filter-status").addEventListener("click", () => applyMerchantFilter("all"));

document.querySelectorAll(".mission-item").forEach((item) => {
  item.addEventListener("click", () => {
    const points = Number(item.dataset.points);
    const newlyCompleted = completeMission(item.dataset.task, points);
    if (newlyCompleted && item.dataset.task === "wallet" && !profileState.postcards.length) {
      createHonorPostcard(Number(document.querySelector("#balance-input").value) || 300);
    }
  });
});

document.querySelectorAll("[data-profile-target]").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelector(`#${button.dataset.profileTarget}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
});
document.querySelector("#avatar-shortcut").addEventListener("click", () => {
  document.querySelector("#wardrobe-section").scrollIntoView({ behavior: "smooth", block: "start" });
});
document.querySelector("#foster-mode").addEventListener("change", (event) => {
  profileState.fosterMode = event.currentTarget.checked;
  if (!profileState.fosterMode) profileState.weeklyReport = null;
  saveProfileState();
  renderWeeklyReport();
});
document.querySelector("#generate-report").addEventListener("click", createWeeklyReport);
document.querySelector("#close-postcard").addEventListener("click", closePostcard);
document.querySelector("#postcard-dialog").addEventListener("click", (event) => {
  if (event.target === event.currentTarget) closePostcard();
});
document.querySelector("#download-postcard").addEventListener("click", downloadActivePostcard);
document.querySelector("#share-postcard").addEventListener("click", () => {
  shareActivePostcard().catch(() => showAchievementToast(t("shareCopied")));
});

document.querySelector("#place-input").addEventListener("focus", (event) => renderPlaceSuggestions(event.target.value));
document.querySelector("#place-input").addEventListener("input", (event) => renderPlaceSuggestions(event.target.value));
document.querySelector("#date-input").addEventListener("change", () => {
  refreshStationCrowd().catch((error) => console.error("無法更新站點日期人流", error));
});
document.querySelector("#time-input").addEventListener("change", () => {
  refreshStationCrowd().catch((error) => console.error("無法更新站點時段人流", error));
});

document.querySelectorAll(".suggestion-chip").forEach((chip) => {
  chip.addEventListener("click", () => {
    chip.classList.toggle("is-selected");
    const selected = [...document.querySelectorAll(".suggestion-chip.is-selected")].map((item) => item.textContent);
    document.querySelector("#ai-prompt").value = selected.join(currentLanguage === "en" ? ", " : "、");
  });
});

document.querySelector("#toggle-conditions").addEventListener("click", (event) => {
  const chips = document.querySelector("#condition-chips");
  const shouldHide = !chips.hidden;
  chips.hidden = shouldHide;
  event.currentTarget.textContent = shouldHide ? t("expand") : t("collapse");
});

document.querySelector("#normal-submit").addEventListener("click", async () => {
  const place = document.querySelector("#place-input").value.trim();
  if (!place) {
    window.alert(t("missingPlace"));
    return;
  }
  try {
    await analyzePlace(place);
  } catch (error) {
    window.alert(error.message);
  }
});

document.querySelector("#ai-submit").addEventListener("click", async () => {
  const prompt = document.querySelector("#ai-prompt").value.trim();
  if (!prompt) {
    window.alert(t("promptRequired"));
    return;
  }

  try {
    const response = await fetch("/api/agent/recommend", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt,
        date: selectedTravelDate(),
        time: selectedTravelTime(),
        weather_type: selectedWeatherType(),
        enable_external_factors: externalFactorsEnabled(),
      }),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(currentLanguage === "zh-Hant" ? (payload.detail || t("aiFailed")) : t("aiFailed"));
    registerExploration(payload.recommendations[0]);
    renderAnalysis(payload.recommendations[0]);
    renderRecommendations(payload);
  } catch (error) {
    window.alert(error.message);
  }
});

setupSheetDrag();
renderProfileProgress();
selectedTravelDate();
applyLanguage("zh-Hant");
loadPrototypeData().catch((error) => console.error("無法載入 Prototype 資料", error));
